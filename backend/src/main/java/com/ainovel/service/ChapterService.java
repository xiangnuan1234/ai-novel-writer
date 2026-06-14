package com.ainovel.service;

import com.ainovel.entity.Chapter;
import com.ainovel.entity.Novel;
import com.ainovel.repository.ChapterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChapterService {

    private final ChapterRepository chapterRepository;
    private final NovelService novelService;

    public List<Chapter> getChaptersByNovelId(Long novelId, Long userId) {
        // 只读：不验证所有权
        return chapterRepository.findByNovelIdOrderByChapterNumberAsc(novelId);
    }

    public Chapter getChapterById(Long chapterId, Long userId) {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("章节不存在"));
        // 只读访问不验证所有权
        return chapter;
    }

    public Chapter getChapterPublic(Long chapterId) {
        return chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("章节不存在"));
    }

    @Transactional
    public Chapter createChapter(Long novelId, Long userId, String title, String outline) {
        Novel novel = novelService.getNovelById(novelId, userId);

        // Get next chapter number
        int maxNumber = chapterRepository.findMaxChapterNumberByNovelId(novelId);
        int chapterNumber = maxNumber + 1;

        Chapter chapter = new Chapter();
        chapter.setNovelId(novelId);
        chapter.setChapterNumber(chapterNumber);
        chapter.setTitle(title != null ? title : "第" + chapterNumber + "章");
        chapter.setOutline(outline);
        chapter.setStatus("DRAFT");
        chapter.setContent("");
        chapter.setWordCount(0);

        chapter = chapterRepository.save(chapter);

        // Update novel chapter count
        novel.setChapterCount((int) chapterRepository.countByNovelId(novelId));
        novelService.updateWordCount(novelId);

        return chapter;
    }

    public Chapter updateChapter(Long chapterId, Long userId, String title, String content, String status) {
        Chapter chapter = getChapterById(chapterId, userId);
        if (title != null) chapter.setTitle(title);
        if (content != null) {
            chapter.setContent(content);
            chapter.setWordCount(content.replaceAll("\\s", "").length());
        }
        if (status != null) chapter.setStatus(status);
        return chapterRepository.save(chapter);
    }

    @Transactional
    public void deleteChapter(Long chapterId, Long userId) {
        Chapter chapter = getChapterById(chapterId, userId);
        Long novelId = chapter.getNovelId();
        chapterRepository.delete(chapter);
        novelService.updateWordCount(novelId);
    }

    public Chapter saveGeneratedContent(Long chapterId, Long userId, String content) {
        return updateChapter(chapterId, userId, null, content, "DRAFT");
    }
}
