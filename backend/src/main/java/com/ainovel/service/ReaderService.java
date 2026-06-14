package com.ainovel.service;

import com.ainovel.entity.*;
import com.ainovel.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReaderService {
    private final NovelRepository novelRepository;
    private final FollowRepository followRepository;
    private final ReadingProgressRepository readingProgressRepository;
    private final BookmarkRepository bookmarkRepository;
    private final UserService userService;

    // ===== 浏览 =====
    public List<Map<String, Object>> browseNovels() {
        return enrichNovels(novelRepository.findPublishedNovels());
    }

    public List<Map<String, Object>> searchNovels(String keyword) {
        return enrichNovels(novelRepository.searchPublished(keyword));
    }

    public List<Map<String, Object>> novelsByGenre(String genre) {
        return enrichNovels(novelRepository.findByGenrePublished(genre));
    }

    public List<String> getGenres() {
        return novelRepository.findDistinctGenres();
    }

    private List<Map<String, Object>> enrichNovels(List<Novel> novels) {
        return novels.stream().map(n -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", n.getId()); m.put("title", n.getTitle());
            m.put("description", n.getDescription());
            m.put("genre", n.getGenre()); m.put("coverImage", n.getCoverImage());
            m.put("wordCount", n.getWordCount()); m.put("chapterCount", n.getChapterCount());
            m.put("tags", n.getTags()); m.put("updatedAt", n.getUpdatedAt());
            try {
                User author = userService.getUserById(n.getUserId());
                m.put("authorName", author.getNickname() != null ? author.getNickname() : author.getUsername());
                m.put("authorId", author.getId());
                m.put("followers", followRepository.countByFollowingId(author.getId()));
            } catch (Exception e) { m.put("authorName", "未知"); m.put("followers", 0); }
            return m;
        }).collect(Collectors.toList());
    }

    // ===== 关注 =====
    @Transactional
    public boolean toggleFollow(Long followerId, Long followingId) {
        if (followerId.equals(followingId)) throw new RuntimeException("不能关注自己");
        Optional<Follow> existing = followRepository.findByFollowerIdAndFollowingId(followerId, followingId);
        if (existing.isPresent()) {
            followRepository.delete(existing.get());
            return false;
        }
        Follow f = new Follow(); f.setFollowerId(followerId); f.setFollowingId(followingId);
        followRepository.save(f);
        return true;
    }

    public boolean isFollowing(Long followerId, Long followingId) {
        return followRepository.existsByFollowerIdAndFollowingId(followerId, followingId);
    }

    public List<Map<String, Object>> getFollowedAuthors(Long followerId) {
        return followRepository.findByFollowerId(followerId).stream().map(f -> {
            try {
                User u = userService.getUserById(f.getFollowingId());
                Map<String, Object> m = new HashMap<>();
                m.put("id", u.getId()); m.put("name", u.getNickname() != null ? u.getNickname() : u.getUsername());
                m.put("followers", followRepository.countByFollowingId(u.getId()));
                m.put("novelCount", novelRepository.countByUserId(u.getId()));
                return m;
            } catch (Exception e) { return null; }
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }

    // ===== 阅读进度 =====
    public void saveProgress(Long userId, Long novelId, Long chapterId, int progress) {
        ReadingProgress rp = readingProgressRepository.findByUserIdAndNovelId(userId, novelId)
                .orElseGet(() -> { ReadingProgress r = new ReadingProgress(); r.setUserId(userId); r.setNovelId(novelId); return r; });
        rp.setChapterId(chapterId); rp.setProgress(progress);
        readingProgressRepository.save(rp);
    }

    public ReadingProgress getProgress(Long userId, Long novelId) {
        return readingProgressRepository.findByUserIdAndNovelId(userId, novelId).orElse(null);
    }

    // ===== 书架 =====
    @Transactional
    public boolean toggleBookmark(Long userId, Long novelId) {
        Optional<Bookmark> existing = bookmarkRepository.findByUserIdAndNovelId(userId, novelId);
        if (existing.isPresent()) { bookmarkRepository.delete(existing.get()); return false; }
        Bookmark b = new Bookmark(); b.setUserId(userId); b.setNovelId(novelId); bookmarkRepository.save(b); return true;
    }

    public boolean isBookmarked(Long userId, Long novelId) {
        return bookmarkRepository.existsByUserIdAndNovelId(userId, novelId);
    }

    public List<Map<String, Object>> getBookmarks(Long userId) {
        return bookmarkRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(b -> {
            Novel n = novelRepository.findById(b.getNovelId()).orElse(null);
            if (n == null) return null;
            Map<String, Object> m = new HashMap<>();
            m.put("id", n.getId()); m.put("title", n.getTitle());
            m.put("genre", n.getGenre()); m.put("coverImage", n.getCoverImage());
            m.put("chapterCount", n.getChapterCount()); m.put("updatedAt", n.getUpdatedAt());
            return m;
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getFollowedAuthorNovels(Long userId) {
        return followRepository.findByFollowerId(userId).stream()
            .flatMap(f -> {
                List<Novel> novels = novelRepository.findByUserIdOrderByUpdatedAtDesc(f.getFollowingId());
                return novels.stream().filter(n -> !Boolean.FALSE.equals(n.getIsPublished()));
            })
            .sorted((a, b) -> b.getUpdatedAt().compareTo(a.getUpdatedAt()))
            .limit(12)
            .map(n -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", n.getId()); m.put("title", n.getTitle());
                m.put("genre", n.getGenre()); m.put("coverImage", n.getCoverImage());
                m.put("chapterCount", n.getChapterCount()); m.put("updatedAt", n.getUpdatedAt());
                return m;
            }).collect(Collectors.toList());
    }
}
