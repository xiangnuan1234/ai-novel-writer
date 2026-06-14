package com.ainovel.repository;

import com.ainovel.entity.Novel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface NovelRepository extends JpaRepository<Novel, Long> {
    List<Novel> findByUserIdOrderByUpdatedAtDesc(Long userId);
    long countByUserId(Long userId);

    @Query("SELECT n FROM Novel n WHERE n.isPublished = true OR n.isPublished IS NULL ORDER BY n.updatedAt DESC")
    List<Novel> findPublishedNovels();

    @Query("SELECT n FROM Novel n, User u WHERE n.userId = u.id AND (n.isPublished = true OR n.isPublished IS NULL) AND " +
           "(n.title LIKE %:kw% OR n.description LIKE %:kw% OR n.tags LIKE %:kw% " +
           "OR u.nickname LIKE %:kw% OR u.username LIKE %:kw%) ORDER BY n.updatedAt DESC")
    List<Novel> searchPublished(@Param("kw") String kw);

    @Query("SELECT n FROM Novel n WHERE (n.isPublished = true OR n.isPublished IS NULL) AND n.genre = :genre ORDER BY n.updatedAt DESC")
    List<Novel> findByGenrePublished(@Param("genre") String genre);

    @Query("SELECT DISTINCT n.genre FROM Novel n WHERE (n.isPublished = true OR n.isPublished IS NULL) AND n.genre IS NOT NULL")
    List<String> findDistinctGenres();
}
