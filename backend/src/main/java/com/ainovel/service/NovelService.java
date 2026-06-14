package com.ainovel.service;

import com.ainovel.dto.request.NovelRequest;
import com.ainovel.entity.Novel;
import com.ainovel.repository.ChapterRepository;
import com.ainovel.repository.NovelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NovelService {

    private final NovelRepository novelRepository;
    private final ChapterRepository chapterRepository;

    public List<Novel> getUserNovels(Long userId) {
        return novelRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public Novel getNovelById(Long novelId, Long userId) {
        Novel novel = novelRepository.findById(novelId)
                .orElseThrow(() -> new RuntimeException("小说不存在"));
        if (!novel.getUserId().equals(userId)) {
            throw new RuntimeException("无权访问这部小说");
        }
        return novel;
    }

    public Novel getNovelPublic(Long novelId) {
        Novel novel = novelRepository.findById(novelId)
                .orElseThrow(() -> new RuntimeException("小说不存在"));
        // isPublished 为 null (旧数据) 或 true → 可见；false → 仅作者可见
        if (Boolean.FALSE.equals(novel.getIsPublished())) {
            throw new RuntimeException("该小说尚未发布");
        }
        return novel;
    }

    public Novel createNovel(Long userId, NovelRequest request) {
        Novel novel = new Novel();
        novel.setUserId(userId);
        novel.setTitle(request.getTitle());
        novel.setDescription(request.getDescription());
        novel.setGenre(request.getGenre());
        novel.setTags(request.getTags());
        novel.setCoverImage(request.getCoverImage());
        novel.setStyleId(request.getStyleId());
        novel.setStatus("DRAFT");
        novel.setWordCount(0);
        novel.setChapterCount(0);
        return novelRepository.save(novel);
    }

    public Novel updateNovel(Long novelId, Long userId, NovelRequest request) {
        Novel novel = getNovelById(novelId, userId);
        if (request.getTitle() != null) novel.setTitle(request.getTitle());
        if (request.getDescription() != null) novel.setDescription(request.getDescription());
        if (request.getGenre() != null) novel.setGenre(request.getGenre());
        if (request.getStatus() != null) novel.setStatus(request.getStatus());
        if (request.getCoverImage() != null) novel.setCoverImage(request.getCoverImage());
        if (request.getTags() != null) novel.setTags(request.getTags());
        return novelRepository.save(novel);
    }

    @Transactional
    public void deleteNovel(Long novelId, Long userId) {
        Novel novel = getNovelById(novelId, userId);
        chapterRepository.findByNovelIdOrderByChapterNumberAsc(novelId)
                .forEach(chapter -> chapterRepository.delete(chapter));
        novelRepository.delete(novel);
    }

    @Transactional
    public void updateWordCount(Long novelId) {
        Novel novel = novelRepository.findById(novelId).orElse(null);
        if (novel == null) return;
        long chapterCount = chapterRepository.countByNovelId(novelId);
        novel.setChapterCount((int) chapterCount);
        novelRepository.save(novel);
    }
}
