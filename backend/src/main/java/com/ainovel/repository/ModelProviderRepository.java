package com.ainovel.repository;

import com.ainovel.entity.ModelProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ModelProviderRepository extends JpaRepository<ModelProvider, Long> {
    List<ModelProvider> findByUserIdOrderBySortOrderAsc(Long userId);
    Optional<ModelProvider> findByUserIdAndIsDefaultTrue(Long userId);
    Optional<ModelProvider> findByIdAndUserId(Long id, Long userId);
}
