package com.ainovel.controller;

import com.ainovel.dto.response.ApiResponse;
import com.ainovel.entity.WritingStyle;
import com.ainovel.service.WritingStyleService;
import com.ainovel.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/style")
@RequiredArgsConstructor
public class WritingStyleController {

    private final WritingStyleService writingStyleService;

    @GetMapping("/list")
    public ResponseEntity<ApiResponse<List<WritingStyle>>> listStyles() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(writingStyleService.getUserStyles(userId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WritingStyle>> createStyle(@RequestBody WritingStyle style) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("创建成功", writingStyleService.createStyle(userId, style)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<WritingStyle>> updateStyle(@PathVariable Long id, @RequestBody WritingStyle style) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success("更新成功", writingStyleService.updateStyle(id, userId, style)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStyle(@PathVariable Long id) {
        Long userId = SecurityUtil.getCurrentUserId();
        writingStyleService.deleteStyle(id, userId);
        return ResponseEntity.ok(ApiResponse.success("删除成功", null));
    }
}
