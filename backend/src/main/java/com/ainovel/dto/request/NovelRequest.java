package com.ainovel.dto.request;

import lombok.Data;

@Data
public class NovelRequest {
    private String title;
    private String description;
    private String genre;
    private String tags;
    private String coverImage;
    private String status;
    private Long styleId;
}
