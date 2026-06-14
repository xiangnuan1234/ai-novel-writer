-- ============================================
-- AI Novel Writer 数据库初始化脚本
-- 数据库: ai_novel_writer
-- ============================================

CREATE DATABASE IF NOT EXISTS ai_novel_writer
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE ai_novel_writer;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    role VARCHAR(20) DEFAULT 'USER',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 作者风格配置表
CREATE TABLE IF NOT EXISTS author_profile (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    pen_name VARCHAR(50) COMMENT '笔名',
    writing_style TEXT COMMENT '写作风格描述',
    writing_preferences TEXT COMMENT '创作偏好',
    genre_preferences VARCHAR(255) COMMENT '题材偏好',
    tone VARCHAR(100) COMMENT '语调/文风',
    character_style TEXT COMMENT '角色塑造风格',
    plot_style TEXT COMMENT '情节构建风格',
    other_settings TEXT COMMENT '其他设置',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 小说表
CREATE TABLE IF NOT EXISTS novel (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    cover_image VARCHAR(255),
    genre VARCHAR(50) COMMENT '题材/类型',
    status VARCHAR(20) DEFAULT 'DRAFT' COMMENT 'DRAFT-草稿, ONGOING-连载中, COMPLETED-已完成, ABANDONED-弃坑',
    word_count INT DEFAULT 0,
    chapter_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 章节表
CREATE TABLE IF NOT EXISTS chapter (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    novel_id BIGINT NOT NULL,
    chapter_number INT NOT NULL,
    title VARCHAR(200),
    content LONGTEXT,
    status VARCHAR(20) DEFAULT 'DRAFT' COMMENT 'DRAFT-草稿, COMPLETED-已完成',
    word_count INT DEFAULT 0,
    outline TEXT COMMENT '章节大纲',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE,
    INDEX idx_novel_chapter (novel_id, chapter_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 模型服务商配置表
CREATE TABLE IF NOT EXISTS model_provider (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider_name VARCHAR(100) NOT NULL COMMENT '服务商名称',
    provider_type VARCHAR(50) NOT NULL COMMENT '类型: OPENAI_COMPATIBLE, DEEPSEEK, CUSTOM 等',
    base_url VARCHAR(500) NOT NULL COMMENT 'API地址',
    api_key VARCHAR(500) NOT NULL COMMENT 'API密钥',
    model_name VARCHAR(100) NOT NULL COMMENT '模型名称',
    is_default BOOLEAN DEFAULT FALSE COMMENT '是否默认',
    sort_order INT DEFAULT 0 COMMENT '排序',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 写作风格预设表
CREATE TABLE IF NOT EXISTS writing_style (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    writing_style_desc TEXT,
    writing_preferences TEXT,
    genre_preferences VARCHAR(255),
    tone VARCHAR(100),
    character_style TEXT,
    plot_style TEXT,
    other_settings TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认数据: DeepSeek 模型配置模板
INSERT INTO model_provider (user_id, provider_name, provider_type, base_url, api_key, model_name, is_default, sort_order)
VALUES
(1, 'DeepSeek', 'OPENAI_COMPATIBLE', 'https://api.deepseek.com', 'your-api-key-here', 'deepseek-chat', TRUE, 1),
(1, 'OpenAI', 'OPENAI_COMPATIBLE', 'https://api.openai.com', 'your-api-key-here', 'gpt-4o-mini', FALSE, 2);
