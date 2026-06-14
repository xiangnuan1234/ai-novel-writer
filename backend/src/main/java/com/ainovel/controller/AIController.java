package com.ainovel.controller;

import com.ainovel.dto.request.ContinueWritingRequest;
import com.ainovel.dto.request.GenerateChapterRequest;
import com.ainovel.dto.response.ApiResponse;
import com.ainovel.entity.*;
import com.ainovel.service.*;
import com.ainovel.service.ai.AiGenerationService;
import com.ainovel.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AIController {

    private final AiGenerationService aiGenerationService;
    private final NovelService novelService;
    private final ChapterService chapterService;
    private final WritingStyleService writingStyleService;
    private final ModelProviderService modelProviderService;

    /**
     * 生成并保存大纲
     */
    @PostMapping("/generate-outline")
    public ResponseEntity<ApiResponse<Chapter>> generateOutline(@RequestBody Map<String, Object> body) {
        Long userId = SecurityUtil.getCurrentUserId();
        try {
            Long novelId = Long.valueOf(body.get("novelId").toString());
            Long providerId = body.get("providerId") != null
                    ? Long.valueOf(body.get("providerId").toString()) : null;
            String prompt = (String) body.getOrDefault("prompt", "请为这部小说生成完整的大纲");

            Novel novel = novelService.getNovelById(novelId, userId);
            WritingStyle style = getStyleForNovel(novel, userId);
            ModelProvider provider = getProvider(providerId, userId);

            String content = aiGenerationService.generateOutline(novel, style, provider, prompt);

            // 总是新建一个独立的大纲章节
            Chapter outlineChapter = chapterService.createChapter(novelId, userId, "【大纲】" + novel.getTitle(), content);
            outlineChapter = chapterService.updateChapter(outlineChapter.getId(), userId,
                    outlineChapter.getTitle(), "AI 生成的大纲：\n\n" + content, "DRAFT");

            return ResponseEntity.ok(ApiResponse.success("大纲已生成并保存", outlineChapter));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 生成章节（含大纲上下文）
     */
    @PostMapping("/generate-chapter")
    public ResponseEntity<ApiResponse<Chapter>> generateChapter(@RequestBody GenerateChapterRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        try {
            Novel novel = novelService.getNovelById(request.getNovelId(), userId);
            WritingStyle style = getStyleForNovel(novel, userId);
            ModelProvider provider = getProvider(request.getProviderId(), userId);

            // 获取小说大纲（第一章的内容或所有章节的大纲汇总）
            String novelOutline = getNovelOutline(novel.getId(), userId);

            // 获取前几章的概要
            String prevSummary = getPreviousSummary(novel.getId(), request.getChapterId(), userId);

            Chapter chapter;
            if (request.getChapterId() != null) {
                chapter = chapterService.getChapterById(request.getChapterId(), userId);
            } else {
                chapter = chapterService.createChapter(request.getNovelId(), userId, null, request.getOutline());
            }

            int targetWords = request.getWordCount() != null ? request.getWordCount() : 2000;

            String content = aiGenerationService.generateChapterContent(
                    novel, style, provider,
                    chapter.getTitle(),
                    request.getOutline() != null ? request.getOutline() : chapter.getOutline(),
                    novelOutline, prevSummary, targetWords);

            chapter.setContent(content);
            chapter.setWordCount(content.replaceAll("\\s", "").length());
            chapterService.saveGeneratedContent(chapter.getId(), userId, content);

            return ResponseEntity.ok(ApiResponse.success("章节生成成功", chapter));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 流式生成章节（SSE）
     */
    @PostMapping("/generate-chapter-stream")
    public SseEmitter generateChapterStream(@RequestBody GenerateChapterRequest request) {
        SseEmitter emitter = new SseEmitter(180000L); // 3分钟超时
        Long userId = SecurityUtil.getCurrentUserId();

        new Thread(() -> {
            try {
                Novel novel = novelService.getNovelById(request.getNovelId(), userId);
                WritingStyle style = getStyleForNovel(novel, userId);
                ModelProvider provider = getProvider(request.getProviderId(), userId);
                String novelOutline = getNovelOutline(novel.getId(), userId);
                String prevSummary = getPreviousSummary(novel.getId(), request.getChapterId(), userId);

                Chapter chapter;
                if (request.getChapterId() != null) {
                    chapter = chapterService.getChapterById(request.getChapterId(), userId);
                } else {
                    chapter = chapterService.createChapter(request.getNovelId(), userId, null, request.getOutline());
                }
                int targetWords = request.getWordCount() != null ? request.getWordCount() : 2000;

                String sp = aiGenerationService.buildNovelContext(novel, style, novelOutline);
                String up = aiGenerationService.buildChapterUserPrompt(
                        chapter.getTitle(),
                        request.getOutline() != null ? request.getOutline() : chapter.getOutline(),
                        prevSummary, targetWords);

                final Long chapterId = chapter.getId();
                final StringBuilder fullContent = new StringBuilder();

                aiGenerationService.streamCall(provider, sp, up,
                    token -> {
                        try { emitter.send(SseEmitter.event().data(token)); } catch (Exception e) {}
                    },
                    complete -> {
                        try {
                            fullContent.append(complete);
                            chapterService.saveGeneratedContent(chapterId, userId, complete);
                            emitter.send(SseEmitter.event().name("done").data(complete));
                            emitter.complete();
                        } catch (Exception e) { emitter.completeWithError(e); }
                    },
                    error -> {
                        try { emitter.send(SseEmitter.event().name("error").data(error)); emitter.completeWithError(new RuntimeException(error)); }
                        catch (Exception e) { emitter.completeWithError(e); }
                    }
                );
            } catch (Exception e) {
                try { emitter.send(SseEmitter.event().name("error").data(e.getMessage())); emitter.completeWithError(e); }
                catch (Exception ex) { emitter.completeWithError(ex); }
            }
        }).start();

        return emitter;
    }
    @PostMapping("/continue-writing")
    public ResponseEntity<ApiResponse<String>> continueWriting(@RequestBody ContinueWritingRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        try {
            Chapter chapter = chapterService.getChapterById(request.getChapterId(), userId);
            Novel novel = novelService.getNovelById(chapter.getNovelId(), userId);
            WritingStyle style = getStyleForNovel(novel, userId);
            ModelProvider provider = getProvider(request.getProviderId(), userId);

            String prevContent = request.getPreviousContent() != null ? request.getPreviousContent() : chapter.getContent();
            int targetWords = request.getWordCount() != null ? request.getWordCount() : 2000;

            String newContent = aiGenerationService.continueWriting(provider, style, prevContent, targetWords);
            String updated = (chapter.getContent() != null ? chapter.getContent() : "") + "\n" + newContent;
            chapterService.saveGeneratedContent(chapter.getId(), userId, updated);

            return ResponseEntity.ok(ApiResponse.success("续写成功", newContent));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ========== 辅助方法 ==========

    private WritingStyle getStyleForNovel(Novel novel, Long userId) {
        if (novel.getStyleId() != null) {
            try {
                return writingStyleService.getStyleById(novel.getStyleId(), userId);
            } catch (Exception ignored) {}
        }
        // 回退到默认风格
        List<WritingStyle> styles = writingStyleService.getUserStyles(userId);
        return styles.stream().filter(s -> Boolean.TRUE.equals(s.getIsDefault())).findFirst()
                .orElse(styles.isEmpty() ? null : styles.get(0));
    }

    private ModelProvider getProvider(Long providerId, Long userId) {
        return (providerId != null)
                ? modelProviderService.getProviderById(providerId, userId)
                : modelProviderService.getDefaultProvider(userId);
    }

    private String getNovelOutline(Long novelId, Long userId) {
        try {
            List<Chapter> chapters = chapterService.getChaptersByNovelId(novelId, userId);
            for (Chapter c : chapters) {
                if (c.getTitle() != null && c.getTitle().contains("大纲") && c.getContent() != null) {
                    return c.getContent();
                }
            }
            // 汇总所有章节名称作为大纲
            if (!chapters.isEmpty()) {
                return chapters.stream()
                        .map(c -> c.getTitle())
                        .collect(Collectors.joining(" → "));
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String getPreviousSummary(Long novelId, Long excludeChapterId, Long userId) {
        try {
            List<Chapter> chapters = chapterService.getChaptersByNovelId(novelId, userId);
            StringBuilder sb = new StringBuilder();
            int count = 0;
            for (int i = chapters.size() - 1; i >= 0 && count < 2; i--) {
                Chapter c = chapters.get(i);
                if (excludeChapterId != null && c.getId().equals(excludeChapterId)) continue;
                if (c.getContent() != null && c.getContent().length() > 50) {
                    // 取章节末尾（承上启下的关键），而不是开头
                    int start = Math.max(0, c.getContent().length() - 800);
                    String tail = c.getContent().substring(start);
                    // 从第一个完整句子开始
                    int firstPeriod = tail.indexOf('。');
                    if (firstPeriod > 0 && firstPeriod < 50) tail = tail.substring(firstPeriod + 1);
                    sb.insert(0, "【" + c.getTitle() + "结尾】" + tail + "\n");
                    count++;
                }
            }
            // 也包含大纲
            for (Chapter c : chapters) {
                if (c.getTitle() != null && c.getTitle().contains("大纲") && c.getContent() != null) {
                    String outline = c.getContent().length() > 500 ? c.getContent().substring(0, 500) : c.getContent();
                    sb.insert(0, "【小说大纲】" + outline + "\n");
                    break;
                }
            }
            return sb.length() > 0 ? sb.toString() : null;
        } catch (Exception ignored) {}
        return null;
    }
}
