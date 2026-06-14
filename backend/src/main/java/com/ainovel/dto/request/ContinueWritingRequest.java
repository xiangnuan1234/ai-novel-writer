package com.ainovel.dto.request;

import lombok.Data;

@Data
public class ContinueWritingRequest {
    private Long chapterId;
    private Long providerId;
    private String previousContent;
    private Integer wordCount;
}
