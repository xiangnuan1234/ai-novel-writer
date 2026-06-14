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
@Table(name = "novel")
public class Novel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "cover_image", length = 255)
    private String coverImage;

    @Column(length = 50)
    private String genre;

    @Column(length = 255)
    private String tags;

    @Column(name = "style_id")
    private Long styleId;

    @Column(name = "is_published")
    private Boolean isPublished = true;  // 默认发布

    @Column(length = 20)
    private String status = "DRAFT";

    @Column(name = "word_count")
    private Integer wordCount = 0;

    @Column(name = "chapter_count")
    private Integer chapterCount = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (wordCount == null) wordCount = 0;
        if (chapterCount == null) chapterCount = 0;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
