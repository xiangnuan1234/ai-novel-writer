package com.ainovel.controller;

import com.ainovel.dto.request.ModelProviderRequest;
import com.ainovel.dto.response.ApiResponse;
import com.ainovel.dto.response.ModelProviderResponse;
import com.ainovel.service.ModelProviderService;
import com.ainovel.util.SecurityUtil;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/provider")
@RequiredArgsConstructor
public class ModelProviderController {

    private final ModelProviderService modelProviderService;

    @GetMapping("/list")
    public ResponseEntity<ApiResponse<List<ModelProviderResponse>>> listProviders() {
        Long userId = SecurityUtil.getCurrentUserId();
        List<ModelProviderResponse> providers = modelProviderService.getUserProviders(userId);
        return ResponseEntity.ok(ApiResponse.success(providers));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ModelProviderResponse>> addProvider(
            @Valid @RequestBody ModelProviderRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        ModelProviderResponse response = modelProviderService.addProvider(userId, request);
        return ResponseEntity.ok(ApiResponse.success("添加成功", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ModelProviderResponse>> updateProvider(
            @PathVariable Long id, @Valid @RequestBody ModelProviderRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        ModelProviderResponse response = modelProviderService.updateProvider(id, userId, request);
        return ResponseEntity.ok(ApiResponse.success("更新成功", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProvider(@PathVariable Long id) {
        Long userId = SecurityUtil.getCurrentUserId();
        modelProviderService.deleteProvider(id, userId);
        return ResponseEntity.ok(ApiResponse.success("删除成功", null));
    }
}
