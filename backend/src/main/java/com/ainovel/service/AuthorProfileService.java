package com.ainovel.service;

import com.ainovel.dto.request.AuthorProfileRequest;
import com.ainovel.entity.AuthorProfile;
import com.ainovel.repository.AuthorProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthorProfileService {

    private final AuthorProfileRepository authorProfileRepository;

    public AuthorProfile getProfileByUserId(Long userId) {
        return authorProfileRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultProfile(userId));
    }

    public AuthorProfile saveOrUpdateProfile(Long userId, AuthorProfileRequest request) {
        AuthorProfile profile = authorProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    AuthorProfile p = new AuthorProfile();
                    p.setUserId(userId);
                    return p;
                });

        if (request.getPenName() != null) profile.setPenName(request.getPenName());
        if (request.getWritingStyle() != null) profile.setWritingStyle(request.getWritingStyle());
        if (request.getWritingPreferences() != null) profile.setWritingPreferences(request.getWritingPreferences());
        if (request.getGenrePreferences() != null) profile.setGenrePreferences(request.getGenrePreferences());
        if (request.getTone() != null) profile.setTone(request.getTone());
        if (request.getCharacterStyle() != null) profile.setCharacterStyle(request.getCharacterStyle());
        if (request.getPlotStyle() != null) profile.setPlotStyle(request.getPlotStyle());
        if (request.getOtherSettings() != null) profile.setOtherSettings(request.getOtherSettings());

        return authorProfileRepository.save(profile);
    }

    private AuthorProfile createDefaultProfile(Long userId) {
        AuthorProfile profile = new AuthorProfile();
        profile.setUserId(userId);
        return authorProfileRepository.save(profile);
    }
}
