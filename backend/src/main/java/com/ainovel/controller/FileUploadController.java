package com.ainovel.controller;

import com.ainovel.dto.response.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.PostConstruct;
import java.io.File;
import java.util.*;

@RestController
@RequestMapping("/upload")
public class FileUploadController {

    @Value("${upload.path:E:/项目/ai-novel-writer/backend/uploads}")
    private String uploadPath;

    @PostConstruct
    public void init() {
        new File(uploadPath + "/covers").mkdirs();
    }

    @PostMapping("/cover")
    public ResponseEntity<ApiResponse<String>> uploadCover(@RequestParam("file") MultipartFile file) {
        try {
            File dir = new File(uploadPath + "/covers");
            if (!dir.exists()) dir.mkdirs();
            String ext = file.getOriginalFilename() != null
                    ? file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf("."))
                    : ".jpg";
            String filename = UUID.randomUUID().toString() + ext;
            file.transferTo(new File(dir, filename));
            return ResponseEntity.ok(ApiResponse.success("/api/uploads/covers/" + filename));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("上传失败: " + e.getMessage()));
        }
    }
}
