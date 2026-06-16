import re

# 读取 MySQL 导出文件
src = r"C:\Users\王邦\AppData\Local\Claude-3p\local-agent-mode-sessions\99c0ae86-fad9-47e7-80e6-344e849c04a9\00000000-0000-4000-8000-000000000001\local_251b7cd9-d32c-42b9-9ed4-4ebd0108ea50\uploads\ai_novel_writer.sql"
dst = r"E:\项目\ai-novel-writer\cloudflare-backend\src\data-migration.sql"

with open(src, "r", encoding="utf-8") as f:
    content = f.read()

# 提取所有 INSERT 语句
lines = content.split('\n')
inserts = {'users': [], 'novel': [], 'chapter': [], 'model_provider': [], 'bookmark': [], 'follows': []}

for line in lines:
    line = line.strip()
    if not line.startswith('INSERT INTO'):
        continue
    # 去掉反引号
    line = line.replace('`', '')
    for table in inserts:
        if line.startswith(f'INSERT INTO {table}'):
            # 去掉 b'1', b'0' 这种 MySQL 二进制语法
            cleaned = line.replace("b'1'", "1").replace("b'0'", "0")
            inserts[table].append(cleaned + ';')
            break

# 生成 D1 兼容的 SQL
output = """-- D1 数据迁移 (自动从 MySQL 转换)
-- 执行命令: npx wrangler d1 execute ai-novel-db --file=src/data-migration.sql --remote

"""

# 用户表: D1 列序 = id, username, password, email, nickname, role
# MySQL 列序 = id, username, password, email, nickname, avatar, role, created_at, updated_at
output += "-- 用户\n"
for line in inserts['users']:
    # 重新映射列顺序
    m = re.search(r'VALUES\s*\((.*)\)', line, re.DOTALL)
    if m:
        vals = m.group(1)
        # 提取前6个值 (跳过 avatar)
        # MySQL: id, username, password, email, nickname, avatar, role, ...
        parts = []
        depth = 0
        current = ''
        in_str = False
        for c in vals:
            if c == "'" and (len(current) == 0 or current[-1] != '\\'):
                in_str = not in_str
            if c == '(' and not in_str:
                depth += 1
            if c == ')' and not in_str:
                depth -= 1
            if c == ',' and depth == 0 and not in_str:
                parts.append(current.strip())
                current = ''
            else:
                current += c
        parts.append(current.strip())
        # 取 id, username, password, email, nickname, role (跳过 index 5=avatar)
        if len(parts) >= 7:
            new_vals = ','.join([parts[0], parts[1], parts[2], parts[3], parts[4], parts[6]])
        else:
            new_vals = vals
        output += f"INSERT INTO users VALUES ({new_vals});\n"

# 小说表: D1列 = id, user_id, title, description, cover_image, genre, tags, style_id, status, chapter_count, word_count, is_published, created_at, updated_at
# MySQL列 = id, user_id, title, description, cover_image, genre, status, word_count, chapter_count, created_at, updated_at, tags, is_published, style_id
output += "\n-- 小说\n"
for line in inserts['novel']:
    m = re.search(r'VALUES\s*\((.*)\)', line, re.DOTALL)
    if m:
        vals = m.group(1)
        parts = []
        depth = 0
        current = ''
        in_str = False
        for c in vals:
            if c == "'" and (len(current) == 0 or current[-1] != '\\'):
                in_str = not in_str
            if c == '(' and not in_str:
                depth += 1
            if c == ')' and not in_str:
                depth -= 1
            if c == ',' and depth == 0 and not in_str:
                parts.append(current.strip())
                current = ''
            else:
                current += c
        parts.append(current.strip())

        # MySQL 列序: id(0), user_id(1), title(2), desc(3), cover(4), genre(5), status(6), word_count(7), chapter_count(8), created_at(9), updated_at(10), tags(11), is_published(12), style_id(13)
        # D1 列序: id, user_id, title, description, cover_image, genre, tags, style_id, status, chapter_count, word_count, is_published
        if len(parts) >= 14:
            new_vals = ','.join([
                parts[0],   # id
                parts[1],   # user_id
                parts[2],   # title
                parts[3],   # description
                parts[4],   # cover_image
                parts[5],   # genre
                parts[11] if len(parts) > 11 else 'NULL',  # tags
                parts[13] if len(parts) > 13 else 'NULL',  # style_id
                parts[6],   # status
                parts[8],   # chapter_count
                parts[7],   # word_count
                parts[12] if len(parts) > 12 else '1',     # is_published
            ])
        else:
            new_vals = vals
        output += f"INSERT INTO novel VALUES ({new_vals});\n"

# 章节表: 列序相同
output += "\n-- 章节\n"
for line in inserts['chapter']:
    output += line + '\n'

# 模型服务商: 列序相同
output += "\n-- 模型服务商\n"
for line in inserts['model_provider']:
    output += line + '\n'

# 收藏: D1 列 = id, user_id, novel_id
# MySQL 列 = id, created_at, novel_id, user_id
output += "\n-- 收藏\n"
for line in inserts['bookmark']:
    m = re.search(r'VALUES\s*\((.*)\)', line, re.DOTALL)
    if m:
        vals = m.group(1)
        parts = []
        depth = 0
        current = ''
        in_str = False
        for c in vals:
            if c == "'" and (len(current) == 0 or current[-1] != '\\'):
                in_str = not in_str
            if c == '(' and not in_str:
                depth += 1
            if c == ')' and not in_str:
                depth -= 1
            if c == ',' and depth == 0 and not in_str:
                parts.append(current.strip())
                current = ''
            else:
                current += c
        parts.append(current.strip())
        # MySQL: id(0), created_at(1), novel_id(2), user_id(3)
        # D1: id, user_id, novel_id
        if len(parts) >= 4:
            new_vals = f"{parts[0]},{parts[3]},{parts[2]}"
            output += f"INSERT INTO bookmark VALUES ({new_vals});\n"

# 关注: D1 列 = id, follower_id, following_id
# MySQL 列 = id, created_at, following_id, follower_id
output += "\n-- 关注\n"
for line in inserts['follows']:
    m = re.search(r'VALUES\s*\((.*)\)', line, re.DOTALL)
    if m:
        vals = m.group(1)
        parts = []
        depth = 0
        current = ''
        in_str = False
        for c in vals:
            if c == "'" and (len(current) == 0 or current[-1] != '\\'):
                in_str = not in_str
            if c == '(' and not in_str:
                depth += 1
            if c == ')' and not in_str:
                depth -= 1
            if c == ',' and depth == 0 and not in_str:
                parts.append(current.strip())
                current = ''
            else:
                current += c
        parts.append(current.strip())
        # MySQL: id(0), created_at(1), following_id(2), follower_id(3)
        # D1: id, follower_id, following_id
        if len(parts) >= 4:
            new_vals = f"{parts[0]},{parts[3]},{parts[2]}"
            output += f"INSERT INTO follows VALUES ({new_vals});\n"

with open(dst, "w", encoding="utf-8") as f:
    f.write(output)

print(f"迁移文件已生成: {dst}")
print(f"统计: 用户{len(inserts['users'])}条, 小说{len(inserts['novel'])}条, 章节{len(inserts['chapter'])}条, 模型{len(inserts['model_provider'])}条, 收藏{len(inserts['bookmark'])}条, 关注{len(inserts['follows'])}条")
