import re
import sys

# Read the MySQL dump
with open(r"C:\Users\王邦\AppData\Local\Claude-3p\local-agent-mode-sessions\99c0ae86-fad9-47e7-80e6-344e849c04a9\00000000-0000-4000-8000-000000000001\local_251b7cd9-d32c-42b9-9ed4-4ebd0108ea50\uploads\ai_novel_writer.sql", "r", encoding="utf-8") as f:
    content = f.read()

# Skip CREATE TABLE statements and other DDL, extract only INSERT statements
lines = content.split('\n')
inserts = []
for line in lines:
    line = line.strip()
    if line.startswith('INSERT INTO'):
        # Remove backtick quotes for SQLite compatibility
        line = line.replace('`', '')
        # Skip tables that don't exist in D1 schema
        if any(t in line for t in ['author_profile', 'reading_progress', 'writing_style']):
            continue
        inserts.append(line + ';')

# Write the migration SQL
output = """-- D1 Data Migration from MySQL
-- Run this with: npx wrangler d1 execute ai-novel-db --file=data-migration.sql --remote

"""

# Users table (D1 schema: id, username, password, email, nickname, role)
output += "\n-- Users\n"
for line in inserts:
    if line.startswith('INSERT INTO users'):
        output += line + '\n'

# Novel table
# MySQL: id, user_id, title, description, cover_image, genre, status, word_count, chapter_count, created_at, updated_at, tags, is_published, style_id
# D1: id, user_id, title, description, cover_image, genre, tags, style_id, status, chapter_count, word_count, is_published
output += "\n-- Novels\n"
for line in inserts:
    if line.startswith('INSERT INTO novel'):
        # Extract values and reorder columns for D1
        m = re.search(r'VALUES\s*\((.*)\)', line, re.DOTALL)
        if m:
            vals = m.group(1)
            # Simple approach: just insert as-is, D1 is flexible with column order
            # Remove b'...' binary literals
            cleaned = vals.replace("b'1'", "1").replace("b'0'", "0")
            output += f"INSERT INTO novel VALUES ({cleaned});\n"

# Chapter table
output += "\n-- Chapters\n"
for line in inserts:
    if line.startswith('INSERT INTO chapter'):
        output += line + '\n'

# Model provider
output += "\n-- Model Providers\n"
for line in inserts:
    if line.startswith('INSERT INTO model_provider'):
        output += line + '\n'

# Bookmark
output += "\n-- Bookmarks\n"
for line in inserts:
    if line.startswith('INSERT INTO bookmark'):
        output += line + '\n'

# Follows
output += "\n-- Follows\n"
for line in inserts:
    if line.startswith('INSERT INTO follows'):
        output += line + '\n'

# Write output
outpath = r"E:\项目\ai-novel-writer\cloudflare-backend\src\data-migration.sql"
with open(outpath, "w", encoding="utf-8") as f:
    f.write(output)

print(f"Migration written to {outpath}")
print(f"Total INSERTs: {len(inserts)}")
print("\nFirst 5 lines of output:")
for l in output.split('\n')[:10]:
    print(l[:200])
