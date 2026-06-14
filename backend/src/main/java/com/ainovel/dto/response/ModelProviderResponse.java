package com.ainovel.dto.response;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import com.ainovel.entity.ModelProvider;

@Data
@Builder
@AllArgsConstructor
public class ModelProviderResponse {
    private Long id;
    private String providerName;
    private String providerType;
    private String baseUrl;
    private String modelName;
    private Boolean isDefault;
    private Integer sortOrder;

    public static ModelProviderResponse fromEntity(ModelProvider provider) {
        return ModelProviderResponse.builder()
                .id(provider.getId())
                .providerName(provider.getProviderName())
                .providerType(provider.getProviderType())
                .baseUrl(provider.getBaseUrl())
                .modelName(provider.getModelName())
                .isDefault(provider.getIsDefault())
                .sortOrder(provider.getSortOrder())
                .build();
    }
}
