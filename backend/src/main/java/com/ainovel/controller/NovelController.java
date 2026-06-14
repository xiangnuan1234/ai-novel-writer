package com.ainovel.controller;

import com.ainovel.dto.request.NovelRequest;
import com.ainovel.dto.response.ApiResponse;
import com.ainovel.entity.Novel;
import com.ainovel.service.NovelService;
import com.ainovel.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/novel")
@RequiredArgsConstructor
public class NovelController {

    private final NovelService novelService;

    @GetMapping("/list")
    public ResponseEntity<ApiResponse<List<Novel>>> listNovels() {
        Long userId = SecurityUtil.getCurrentUserId();
        List<Novel> novels = novelService.getUserNovels(userId);
        return ResponseEntity.ok(ApiResponse.success(novels));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Novel>> getNovel(@PathVariable Long id) {
        Long userId = SecurityUtil.getCurrentUserId();
        Novel novel = novelService.getNovelById(id, userId);
        return ResponseEntity.ok(ApiResponse.success(novel));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Novel>> createNovel(@RequestBody NovelRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        Novel novel = novelService.createNovel(userId, request);
        return ResponseEntity.ok(ApiResponse.success("创建成功", novel));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Novel>> updateNovel(@PathVariable Long id,
                                                           @RequestBody NovelRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        Novel novel = novelService.updateNovel(id, userId, request);
        return ResponseEntity.ok(ApiResponse.success("更新成功", novel));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNovel(@PathVariable Long id) {
        Long userId = SecurityUtil.getCurrentUserId();
        novelService.deleteNovel(id, userId);
        return ResponseEntity.ok(ApiResponse.success("删除成功", null));
    }
}
