package com.ainovel.dto.request;

import javax.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModelProviderRequest {
    @NotBlank(message = "服务商名称不能为空")
    private String providerName;

    @NotBlank(message = "服务商类型不能为空")
    private String providerType;

    @NotBlank(message = "API地址不能为空")
    private String baseUrl;

    @NotBlank(message = "API密钥不能为空")
    private String apiKey;

    @NotBlank(message = "模型名称不能为空")
    private String modelName;

    private Boolean isDefault = false;
    private Integer sortOrder = 0;
}
