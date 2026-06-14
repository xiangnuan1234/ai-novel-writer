package com.ainovel.entity;

import javax.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "author_profile")
public class AuthorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "pen_name", length = 50)
    private String penName;

    @Column(name = "writing_style", columnDefinition = "TEXT")
    private String writingStyle;

    @Column(name = "writing_preferences", columnDefinition = "TEXT")
    private String writingPreferences;

    @Column(name = "genre_preferences", length = 255)
    private String genrePreferences;

    @Column(length = 100)
    private String tone;

    @Column(name = "character_style", columnDefinition = "TEXT")
    private String characterStyle;

    @Column(name = "plot_style", columnDefinition = "TEXT")
    private String plotStyle;

    @Column(name = "other_settings", columnDefinition = "TEXT")
    private String otherSettings;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
