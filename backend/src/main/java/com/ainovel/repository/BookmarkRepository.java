package com.ainovel.repository;

import com.ainovel.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    List<Bookmark> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Bookmark> findByUserIdAndNovelId(Long userId, Long novelId);
    boolean existsByUserIdAndNovelId(Long userId, Long novelId);
}
