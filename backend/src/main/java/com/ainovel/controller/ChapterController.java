package com.ainovel.controller;

import com.ainovel.dto.response.ApiResponse;
import com.ainovel.entity.Chapter;
import com.ainovel.service.ChapterService;
import com.ainovel.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/chapter")
@RequiredArgsConstructor
public class ChapterController {

    private final ChapterService chapterService;

    @GetMapping("/list/{novelId}")
    public ResponseEntity<ApiResponse<List<Chapter>>> listChapters(@PathVariable Long novelId) {
        Long userId = SecurityUtil.getCurrentUserId();
        List<Chapter> chapters = chapterService.getChaptersByNovelId(novelId, userId);
        return ResponseEntity.ok(ApiResponse.success(chapters));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Chapter>> getChapter(@PathVariable Long id) {
        Long userId = SecurityUtil.getCurrentUserId();
        Chapter chapter = chapterService.getChapterById(id, userId);
        return ResponseEntity.ok(ApiResponse.success(chapter));
    }

    @PostMapping("/{novelId}")
    public ResponseEntity<ApiResponse<Chapter>> createChapter(@PathVariable Long novelId,
                                                               @RequestBody Map<String, String> body) {
        Long userId = SecurityUtil.getCurrentUserId();
        Chapter chapter = chapterService.createChapter(novelId, userId,
                body.get("title"), body.get("outline"));
        return ResponseEntity.ok(ApiResponse.success("创建成功", chapter));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Chapter>> updateChapter(@PathVariable Long id,
                                                               @RequestBody Map<String, String> body) {
        Long userId = SecurityUtil.getCurrentUserId();
        Chapter chapter = chapterService.updateChapter(id, userId,
                body.get("title"), body.get("content"), body.get("status"));
        return ResponseEntity.ok(ApiResponse.success("更新成功", chapter));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteChapter(@PathVariable Long id) {
        Long userId = SecurityUtil.getCurrentUserId();
        chapterService.deleteChapter(id, userId);
        return ResponseEntity.ok(ApiResponse.success("删除成功", null));
    }
}
