package com.ainovel.dto.request;

import lombok.Data;

@Data
public class AuthorProfileRequest {
    private String penName;
    private String writingStyle;
    private String writingPreferences;
    private String genrePreferences;
    private String tone;
    private String characterStyle;
    private String plotStyle;
    private String otherSettings;
}
