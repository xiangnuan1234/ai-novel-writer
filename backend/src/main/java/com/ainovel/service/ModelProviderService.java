package com.ainovel.service;

import com.ainovel.dto.request.ModelProviderRequest;
import com.ainovel.dto.response.ModelProviderResponse;
import com.ainovel.entity.ModelProvider;
import com.ainovel.repository.ModelProviderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModelProviderService {

    private final ModelProviderRepository modelProviderRepository;

    public List<ModelProviderResponse> getUserProviders(Long userId) {
        return modelProviderRepository.findByUserIdOrderBySortOrderAsc(userId)
                .stream()
                .map(ModelProviderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public ModelProvider getProviderById(Long providerId, Long userId) {
        return modelProviderRepository.findByIdAndUserId(providerId, userId)
                .orElseThrow(() -> new RuntimeException("模型服务商不存在"));
    }

    public ModelProviderResponse addProvider(Long userId, ModelProviderRequest request) {
        // If setting as default, clear other defaults
        if (Boolean.TRUE.equals(request.getIsDefault())) {
            clearDefaultProviders(userId);
        }

        ModelProvider provider = new ModelProvider();
        provider.setUserId(userId);
        provider.setProviderName(request.getProviderName());
        provider.setProviderType(request.getProviderType());
        provider.setBaseUrl(request.getBaseUrl());
        provider.setApiKey(request.getApiKey());
        provider.setModelName(request.getModelName());
        provider.setIsDefault(request.getIsDefault() != null && request.getIsDefault());
        provider.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);

        return ModelProviderResponse.fromEntity(modelProviderRepository.save(provider));
    }

    public ModelProviderResponse updateProvider(Long providerId, Long userId, ModelProviderRequest request) {
        ModelProvider provider = getProviderById(providerId, userId);

        if (Boolean.TRUE.equals(request.getIsDefault()) && !Boolean.TRUE.equals(provider.getIsDefault())) {
            clearDefaultProviders(userId);
        }

        if (request.getProviderName() != null) provider.setProviderName(request.getProviderName());
        if (request.getProviderType() != null) provider.setProviderType(request.getProviderType());
        if (request.getBaseUrl() != null) provider.setBaseUrl(request.getBaseUrl());
        if (request.getApiKey() != null) provider.setApiKey(request.getApiKey());
        if (request.getModelName() != null) provider.setModelName(request.getModelName());
        if (request.getIsDefault() != null) provider.setIsDefault(request.getIsDefault());
        if (request.getSortOrder() != null) provider.setSortOrder(request.getSortOrder());

        return ModelProviderResponse.fromEntity(modelProviderRepository.save(provider));
    }

    @Transactional
    public void deleteProvider(Long providerId, Long userId) {
        ModelProvider provider = getProviderById(providerId, userId);
        modelProviderRepository.delete(provider);
    }

    public ModelProvider getDefaultProvider(Long userId) {
        return modelProviderRepository.findByUserIdAndIsDefaultTrue(userId)
                .orElseThrow(() -> new RuntimeException("请先配置默认模型服务商"));
    }

    private void clearDefaultProviders(Long userId) {
        List<ModelProvider> providers = modelProviderRepository.findByUserIdOrderBySortOrderAsc(userId);
        providers.forEach(p -> {
            p.setIsDefault(false);
            modelProviderRepository.save(p);
        });
    }
}
