package com.ainovel.service;

import com.ainovel.entity.WritingStyle;
import com.ainovel.repository.WritingStyleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WritingStyleService {

    private final WritingStyleRepository writingStyleRepository;

    public List<WritingStyle> getUserStyles(Long userId) {
        return writingStyleRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
    }

    public WritingStyle getStyleById(Long styleId, Long userId) {
        return writingStyleRepository.findByIdAndUserId(styleId, userId)
                .orElseThrow(() -> new RuntimeException("写作风格不存在"));
    }

    @Transactional
    public WritingStyle createStyle(Long userId, WritingStyle style) {
        if (Boolean.TRUE.equals(style.getIsDefault())) {
            clearDefaults(userId);
        }
        style.setUserId(userId);
        return writingStyleRepository.save(style);
    }

    @Transactional
    public WritingStyle updateStyle(Long styleId, Long userId, WritingStyle updates) {
        WritingStyle style = getStyleById(styleId, userId);
        if (Boolean.TRUE.equals(updates.getIsDefault()) && !Boolean.TRUE.equals(style.getIsDefault())) {
            clearDefaults(userId);
        }
        if (updates.getName() != null) style.setName(updates.getName());
        if (updates.getWritingStyleDesc() != null) style.setWritingStyleDesc(updates.getWritingStyleDesc());
        if (updates.getWritingPreferences() != null) style.setWritingPreferences(updates.getWritingPreferences());
        if (updates.getGenrePreferences() != null) style.setGenrePreferences(updates.getGenrePreferences());
        if (updates.getTone() != null) style.setTone(updates.getTone());
        if (updates.getCharacterStyle() != null) style.setCharacterStyle(updates.getCharacterStyle());
        if (updates.getPlotStyle() != null) style.setPlotStyle(updates.getPlotStyle());
        if (updates.getOtherSettings() != null) style.setOtherSettings(updates.getOtherSettings());
        if (updates.getIsDefault() != null) style.setIsDefault(updates.getIsDefault());
        return writingStyleRepository.save(style);
    }

    @Transactional
    public void deleteStyle(Long styleId, Long userId) {
        WritingStyle style = getStyleById(styleId, userId);
        writingStyleRepository.delete(style);
    }

    private void clearDefaults(Long userId) {
        writingStyleRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId)
                .forEach(s -> { s.setIsDefault(false); writingStyleRepository.save(s); });
    }
}
