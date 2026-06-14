package com.ainovel.controller;

import com.ainovel.dto.request.AuthorProfileRequest;
import com.ainovel.dto.response.ApiResponse;
import com.ainovel.entity.AuthorProfile;
import com.ainovel.service.AuthorProfileService;
import com.ainovel.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
public class AuthorProfileController {

    private final AuthorProfileService authorProfileService;

    @GetMapping
    public ResponseEntity<ApiResponse<AuthorProfile>> getProfile() {
        Long userId = SecurityUtil.getCurrentUserId();
        AuthorProfile profile = authorProfileService.getProfileByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<AuthorProfile>> updateProfile(@RequestBody AuthorProfileRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        AuthorProfile profile = authorProfileService.saveOrUpdateProfile(userId, request);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
}
