package com.ainovel.dto.request;

import lombok.Data;

@Data
public class GenerateChapterRequest {
    private Long novelId;
    private Long chapterId;
    private Long providerId;
    private String prompt;
    private String outline;
    private Integer wordCount;
}
