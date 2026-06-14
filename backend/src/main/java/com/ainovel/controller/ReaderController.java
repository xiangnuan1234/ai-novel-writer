package com.ainovel.controller;

import com.ainovel.dto.response.ApiResponse;
import com.ainovel.entity.*;
import com.ainovel.repository.NovelRepository;
import com.ainovel.service.*;
import com.ainovel.util.SecurityUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/reader")
public class ReaderController {
    private final ReaderService readerService;
    private final NovelService novelService;
    private final ChapterService chapterService;
    private final NovelRepository novelRepository;

    public ReaderController(ReaderService readerService, NovelService novelService,
                            ChapterService chapterService, NovelRepository novelRepository) {
        this.readerService = readerService;
        this.novelService = novelService;
        this.chapterService = chapterService;
        this.novelRepository = novelRepository;
    }

    @GetMapping("/browse")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> browse() {
        return ResponseEntity.ok(ApiResponse.success(readerService.browseNovels()));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> search(@RequestParam String q) {
        return ResponseEntity.ok(ApiResponse.success(readerService.searchNovels(q)));
    }

    @GetMapping("/genre/{genre}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> byGenre(@PathVariable String genre) {
        return ResponseEntity.ok(ApiResponse.success(readerService.novelsByGenre(genre)));
    }

    @GetMapping("/genres")
    public ResponseEntity<ApiResponse<List<String>>> genres() {
        return ResponseEntity.ok(ApiResponse.success(readerService.getGenres()));
    }

    @GetMapping("/novel/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> novelDetail(@PathVariable Long id) {
        Novel novel = novelService.getNovelPublic(id);
        List<Chapter> chapters = chapterService.getChaptersByNovelId(id, SecurityUtil.getCurrentUserId())
                .stream().filter(c -> {
                    String t = c.getTitle();
                    if (t == null) return true;
                    return !t.contains("大纲") && !t.contains("【大纲】");
                })
                .collect(java.util.stream.Collectors.toList());
        Map<String, Object> m = new HashMap<>();
        m.put("novel", novel);
        m.put("chapters", chapters);
        return ResponseEntity.ok(ApiResponse.success(m));
    }

    @PostMapping("/follow/{authorId}")
    public ResponseEntity<ApiResponse<Boolean>> follow(@PathVariable Long authorId) {
        Long uid = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(readerService.toggleFollow(uid, authorId)));
    }

    @GetMapping("/follow/{authorId}")
    public ResponseEntity<ApiResponse<Boolean>> isFollow(@PathVariable Long authorId) {
        return ResponseEntity.ok(ApiResponse.success(readerService.isFollowing(SecurityUtil.getCurrentUserId(), authorId)));
    }

    @GetMapping("/follows")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> follows() {
        return ResponseEntity.ok(ApiResponse.success(readerService.getFollowedAuthors(SecurityUtil.getCurrentUserId())));
    }

    @PostMapping("/progress")
    public ResponseEntity<ApiResponse<Void>> progress(@RequestBody Map<String, Object> body) {
        readerService.saveProgress(SecurityUtil.getCurrentUserId(),
                Long.valueOf(body.get("novelId").toString()),
                body.get("chapterId") != null ? Long.valueOf(body.get("chapterId").toString()) : null,
                Integer.parseInt(body.getOrDefault("progress", "0").toString()));
        return ResponseEntity.ok(ApiResponse.success("ok", null));
    }

    @GetMapping("/progress/{novelId}")
    public ResponseEntity<ApiResponse<ReadingProgress>> getProgress(@PathVariable Long novelId) {
        return ResponseEntity.ok(ApiResponse.success(readerService.getProgress(SecurityUtil.getCurrentUserId(), novelId)));
    }

    @PostMapping("/bookmark/{novelId}")
    public ResponseEntity<ApiResponse<Boolean>> bookmark(@PathVariable Long novelId) {
        return ResponseEntity.ok(ApiResponse.success(readerService.toggleBookmark(SecurityUtil.getCurrentUserId(), novelId)));
    }

    @GetMapping("/bookmark/{novelId}")
    public ResponseEntity<ApiResponse<Boolean>> isBookmark(@PathVariable Long novelId) {
        return ResponseEntity.ok(ApiResponse.success(readerService.isBookmarked(SecurityUtil.getCurrentUserId(), novelId)));
    }

    @GetMapping("/bookmarks")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> bookmarks() {
        return ResponseEntity.ok(ApiResponse.success(readerService.getBookmarks(SecurityUtil.getCurrentUserId())));
    }

    @GetMapping("/followed-novels")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> followedNovels() {
        return ResponseEntity.ok(ApiResponse.success(readerService.getFollowedAuthorNovels(SecurityUtil.getCurrentUserId())));
    }

    @PutMapping("/novel/{id}/publish")
    public ResponseEntity<ApiResponse<Novel>> publish(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long uid = SecurityUtil.getCurrentUserId();
        Novel novel = novelService.getNovelById(id, uid);
        Boolean pub = Boolean.valueOf(body.getOrDefault("published", "true").toString());
        novel.setIsPublished(pub);
        novelRepository.save(novel);  // 必须手动保存
        return ResponseEntity.ok(ApiResponse.success(novel.getId().toString() + " 状态已更新", novel));
    }
}
