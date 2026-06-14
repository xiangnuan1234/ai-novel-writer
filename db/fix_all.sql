-- 一键修复：添加发布列 + 默认发布所有已有小说
ALTER TABLE novel ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
ALTER TABLE novel ADD COLUMN tags VARCHAR(255);
UPDATE novel SET is_published = TRUE WHERE is_published IS NULL;
