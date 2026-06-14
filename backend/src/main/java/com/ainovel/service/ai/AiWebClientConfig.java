package com.ainovel.service.ai;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AiWebClientConfig {

    @Bean
    public RestTemplate aiRestTemplate() {
        return new RestTemplate();
    }
}
