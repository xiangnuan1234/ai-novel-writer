package com.ainovel.repository;

import com.ainovel.entity.ReadingProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ReadingProgressRepository extends JpaRepository<ReadingProgress, Long> {
    Optional<ReadingProgress> findByUserIdAndNovelId(Long userId, Long novelId);
}
