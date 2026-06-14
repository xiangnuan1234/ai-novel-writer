package com.ainovel.repository;

import com.ainovel.entity.WritingStyle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WritingStyleRepository extends JpaRepository<WritingStyle, Long> {
    List<WritingStyle> findByUserIdOrderByIsDefaultDescCreatedAtDesc(Long userId);
    Optional<WritingStyle> findByIdAndUserId(Long id, Long userId);
}
