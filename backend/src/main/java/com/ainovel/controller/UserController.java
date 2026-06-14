package com.ainovel.controller;

import com.ainovel.dto.response.ApiResponse;
import com.ainovel.entity.User;
import com.ainovel.service.UserService;
import com.ainovel.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/info")
    public ResponseEntity<ApiResponse<User>> getUserInfo() {
        Long userId = SecurityUtil.getCurrentUserId();
        User user = userService.getUserById(userId);
        user.setPassword(null); // Don't expose password
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PutMapping("/info")
    public ResponseEntity<ApiResponse<User>> updateUserInfo(@RequestBody Map<String, String> body) {
        Long userId = SecurityUtil.getCurrentUserId();
        User user = userService.updateUser(userId, body.get("nickname"), body.get("email"));
        user.setPassword(null);
        return ResponseEntity.ok(ApiResponse.success(user));
    }
}
