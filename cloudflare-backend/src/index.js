import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt, sign } from 'hono/jwt'
import bcrypt from 'bcryptjs'

const app = new Hono()
const api = new Hono()

// ========== 中间件 ==========
app.use('/*', cors({ origin: '*', credentials: true }))

// 错误处理中间件
api.onError((err, c) => {
  console.error('API Error:', err.message)
  return c.json({ code: 500, message: err.message }, 500)
})

const JWT_SECRET = 'ai-novel-writer-secret-key-2025'

const auth = jwt({ secret: JWT_SECRET, alg: 'HS256' })

function hash(str) { return bcrypt.hashSync(str, 10) }
async function verifyHash(str, hashStr) {
  if (hashStr.startsWith('$2a$') || hashStr.startsWith('$2b$')) {
    return bcrypt.compareSync(str, hashStr)
  }
  // fallback SHA-256
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const sha256 = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('')
  return sha256 === hashStr
}
function now() { return new Date().toISOString().replace('T',' ').substring(0,19) }

// ========== 公开接口 ==========

// 健康检查
api.get('/health', async (c) => {
  try {
    const db = c.env.DB
    if (!db) {
      return c.json({ code: 500, message: '数据库未绑定' }, 500)
    }
    const result = await db.prepare('SELECT 1 as test').first()
    return c.json({ code: 200, data: 'ok', db: !!result })
  } catch(e) {
    return c.json({ code: 500, message: e.message }, 500)
  }
})

// 添加缺失的 is_published 列
api.get('/add-published-column', async (c) => {
  try {
    const db = c.env.DB
    await db.prepare(`ALTER TABLE novel ADD COLUMN IF NOT EXISTS is_published INTEGER DEFAULT 0`).run()
    await db.prepare(`UPDATE novel SET is_published = 0 WHERE is_published IS NULL`).run()
    return c.json({ code: 200, message: 'is_published 列添加成功' })
  } catch(e) {
    return c.json({ code: 500, message: e.message }, 500)
  }
})

// 数据库初始化（仅用于首次部署）
api.get('/init-db', async (c) => {
  try {
    const db = c.env.DB
    
    await db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT,
      nickname TEXT,
      role TEXT DEFAULT 'READER',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`).run()
    
    await db.prepare(`CREATE TABLE IF NOT EXISTS writing_style (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      writing_style_desc TEXT,
      writing_preferences TEXT,
      genre_preferences TEXT,
      tone TEXT,
      character_style TEXT,
      plot_style TEXT,
      other_settings TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`).run()
    
    await db.prepare(`CREATE TABLE IF NOT EXISTS novel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      genre TEXT,
      tags TEXT,
      style_id INTEGER,
      outline TEXT,
      status TEXT DEFAULT 'DRAFT',
      chapter_count INTEGER DEFAULT 0,
      word_count INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`).run()
    
    await db.prepare(`CREATE TABLE IF NOT EXISTS chapter (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novel_id INTEGER NOT NULL,
      chapter_number INTEGER NOT NULL,
      title TEXT,
      content TEXT,
      outline TEXT,
      status TEXT DEFAULT 'DRAFT',
      word_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (novel_id) REFERENCES novel(id)
    )`).run()
    
    await db.prepare(`CREATE TABLE IF NOT EXISTS model_provider (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider_name TEXT NOT NULL,
      provider_type TEXT DEFAULT 'OPENAI_COMPATIBLE',
      base_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      model_name TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`).run()
    
    await db.prepare(`CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(follower_id, following_id)
    )`).run()
    
    await db.prepare(`CREATE TABLE IF NOT EXISTS bookmark (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      novel_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, novel_id)
    )`).run()
    
    return c.json({ code: 200, message: '数据库初始化成功' })
  } catch(e) {
    return c.json({ code: 500, message: e.message }, 500)
  }
})

// 数据导入（用于迁移数据）
api.post('/import-data', async (c) => {
  try {
    const data = await c.req.json()
    const db = c.env.DB
    
    if (data.users) {
      for (const user of data.users) {
        await db.prepare(
          'INSERT OR IGNORE INTO users(id,username,password,email,nickname,role,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)'
        ).bind(user.id, user.username, user.password, user.email, user.nickname, user.role, user.created_at, user.updated_at).run()
      }
    }
    
    if (data.novels) {
      for (const novel of data.novels) {
        await db.prepare(
          'INSERT OR IGNORE INTO novel(id,user_id,title,description,cover_image,genre,tags,style_id,status,chapter_count,word_count,is_published,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        ).bind(novel.id, novel.user_id, novel.title, novel.description, novel.cover_image, novel.genre, novel.tags, novel.style_id, novel.status, novel.chapter_count, novel.word_count, novel.is_published, novel.created_at, novel.updated_at).run()
      }
    }
    
    if (data.chapters) {
      for (const chapter of data.chapters) {
        await db.prepare(
          'INSERT OR IGNORE INTO chapter(id,novel_id,chapter_number,title,content,outline,status,word_count,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)'
        ).bind(chapter.id, chapter.novel_id, chapter.chapter_number, chapter.title, chapter.content, chapter.outline, chapter.status, chapter.word_count, chapter.created_at, chapter.updated_at).run()
      }
    }
    
    return c.json({ code: 200, message: '数据导入成功' })
  } catch(e) {
    return c.json({ code: 500, message: e.message }, 500)
  }
})

// 添加示例数据
api.get('/add-sample-data', async (c) => {
  try {
    const db = c.env.DB
    
    const pw = await hash('123456')
    await db.prepare('INSERT OR IGNORE INTO users(username,password,nickname,role) VALUES(?,?,?,?)').bind('demo', pw, '演示用户', 'AUTHOR').run()
    await db.prepare('INSERT OR IGNORE INTO novel(user_id,title,description,genre,tags,status,is_published) VALUES(?,?,?,?,?,?,?)').bind(1, 'AI 时代的爱情故事', '这是一个关于人工智能与人类之间情感的科幻小说...', '科幻', 'AI,爱情,未来', 'PUBLISHED', 1).run()
    await db.prepare('INSERT OR IGNORE INTO chapter(novel_id,chapter_number,title,content) VALUES(?,?,?,?)').bind(1, 1, '第一章：相遇', '2045年，人工智能已经普及到了生活的方方面面...').run()
    await db.prepare('INSERT OR IGNORE INTO chapter(novel_id,chapter_number,title,content) VALUES(?,?,?,?)').bind(1, 2, '第二章：对话', '林晓第一次与AI助手"晓云"进行深度对话...').run()
    await db.prepare('UPDATE novel SET chapter_count=2 WHERE id=1').run()
    
    return c.json({ code: 200, message: '示例数据添加成功' })
  } catch(e) {
    return c.json({ code: 500, message: e.message }, 500)
  }
})

// 注册
api.post('/auth/register', async (c) => {
  try {
    const { username, password, email, role } = await c.req.json()
    const db = c.env.DB
    const exist = await db.prepare('SELECT id FROM users WHERE username=?').bind(username).first()
    if (exist) return c.json({ code: 400, message: '用户名已存在' })
    const pw = hash(password)
    const result = await db.prepare(
      'INSERT INTO users(username,password,email,nickname,role) VALUES(?,?,?,?,?)'
    ).bind(username, pw, email||null, username, role||'READER').run()
    const uid = result.meta.last_row_id
    const token = await sign({ userId: uid, username, role: role||'READER' }, JWT_SECRET)
    return c.json({ code: 200, data: { token, userId: uid, username, nickname: username, role: role||'READER' } })
  } catch(e) { return c.json({ code: 400, message: e.message }) }
})

// 登录
api.post('/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    const db = c.env.DB
    const user = await db.prepare('SELECT * FROM users WHERE username=?').bind(username).first()
    if (!user || !(await verifyHash(password, user.password))) return c.json({ code: 400, message: '用户名或密码错误' })
    const token = await sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET)
    return c.json({ code: 200, data: { token, userId: user.id, username: user.username, nickname: user.nickname, role: user.role } })
  } catch(e) { return c.json({ code: 400, message: e.message }) }
})

// 读者大厅 - 浏览（只显示已发布的小说）
api.get('/reader/browse', async (c) => {
  const db = c.env.DB
  const novels = await db.prepare(
    'SELECT n.*, u.nickname as author_name FROM novel n JOIN users u ON n.user_id=u.id WHERE n.is_published=1 ORDER BY n.updated_at DESC LIMIT 50'
  ).all()
  return c.json({ code: 200, data: novels.results.map(n => ({...n, authorName: n.author_name, chapterCount: n.chapter_count })) })
})

// 搜索（只搜索已发布的小说）
api.get('/reader/search', async (c) => {
  const q = c.req.query('q') || ''
  const db = c.env.DB
  const novels = await db.prepare(
    `SELECT n.*, u.nickname as author_name FROM novel n JOIN users u ON n.user_id=u.id
     WHERE n.is_published=1
     AND (n.title LIKE ? OR n.description LIKE ? OR n.tags LIKE ? OR u.nickname LIKE ? OR u.username LIKE ?)
     ORDER BY n.updated_at DESC LIMIT 30`
  ).bind(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`).all()
  return c.json({ code: 200, data: novels.results.map(n => ({...n, authorName: n.author_name, chapterCount: n.chapter_count })) })
})

// 分类浏览（只显示已发布的小说）
api.get('/reader/genre/:genre', async (c) => {
  const g = c.req.param('genre')
  const db = c.env.DB
  const novels = await db.prepare(
    'SELECT n.*, u.nickname as author_name FROM novel n JOIN users u ON n.user_id=u.id WHERE n.is_published=1 AND n.genre=? ORDER BY updated_at DESC LIMIT 30'
  ).bind(g).all()
  return c.json({ code: 200, data: novels.results.map(n => ({...n, authorName: n.author_name, chapterCount: n.chapter_count })) })
})

// 分类列表（只显示已发布小说的分类）
api.get('/reader/genres', async (c) => {
  try {
    const db = c.env.DB
    const rows = await db.prepare('SELECT DISTINCT genre FROM novel WHERE genre IS NOT NULL AND is_published=1').all()
    if (!rows || !rows.results) {
      return c.json({ code: 200, data: [] })
    }
    return c.json({ code: 200, data: rows.results.map(r => r.genre) })
  } catch(e) {
    console.error('genres error:', e.message)
    return c.json({ code: 500, message: e.message }, 500)
  }
})

// 发布小说（需要登录）
api.put('/reader/novel/:id/publish', auth, async (c) => {
  try {
    const uid = c.get('jwtPayload').userId
    const { isPublished } = await c.req.json()
    const db = c.env.DB
    
    const novel = await db.prepare('SELECT * FROM novel WHERE id=? AND user_id=?').bind(c.req.param('id'), uid).first()
    if (!novel) return c.json({ code: 400, message: '无权操作' })
    
    await db.prepare('UPDATE novel SET is_published=?, updated_at=? WHERE id=?').bind(isPublished ? 1 : 0, now(), c.req.param('id')).run()
    
    const updated = await db.prepare('SELECT * FROM novel WHERE id=?').bind(c.req.param('id')).first()
    return c.json({ code: 200, data: {...updated, chapterCount: updated.chapter_count} })
  } catch(e) {
    console.error('发布小说错误:', e.message)
    return c.json({ code: 500, message: e.message })
  }
})

// 小说详情（公开只能看已发布的，作者可以看自己所有的）
api.get('/reader/novel/:id', async (c) => {
  const db = c.env.DB
  const novel = await db.prepare('SELECT * FROM novel WHERE id=?').bind(c.req.param('id')).first()
  if (!novel) return c.json({ code: 400, message: '小说不存在' })
  
  // 未发布的小说只有作者能看
  if (novel.is_published !== 1) {
    return c.json({ code: 400, message: '小说未发布，暂不可查看' })
  }
  
  const chapters = await db.prepare('SELECT * FROM chapter WHERE novel_id=? ORDER BY chapter_number').bind(novel.id).all()
  return c.json({ code: 200, data: { novel: {...novel, chapterCount: novel.chapter_count}, chapters: chapters.results.filter(ch => !ch.title?.includes('大纲')) } })
})

// 章节列表（公开）
api.get('/chapter/list/:novelId', async (c) => {
  const db = c.env.DB
  const chapters = await db.prepare('SELECT * FROM chapter WHERE novel_id=? ORDER BY chapter_number').bind(c.req.param('novelId')).all()
  return c.json({ code: 200, data: chapters.results })
})

// 章节详情（公开）
api.get('/chapter/:id', async (c) => {
  const db = c.env.DB
  const chapter = await db.prepare('SELECT * FROM chapter WHERE id=?').bind(c.req.param('id')).first()
  if (!chapter) return c.json({ code: 400, message: '章节不存在' })
  return c.json({ code: 200, data: chapter })
})

// ========== 需要登录的接口 ==========

// 小说列表（作者自己）
api.get('/novel/list', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const db = c.env.DB
  const novels = await db.prepare('SELECT * FROM novel WHERE user_id=? ORDER BY updated_at DESC').bind(uid).all()
  return c.json({ code: 200, data: novels.results })
})

// 创建小说
api.post('/novel', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const { title, description, genre, tags, coverImage, styleId } = await c.req.json()
  const db = c.env.DB
  const result = await db.prepare(
    'INSERT INTO novel(user_id,title,description,genre,tags,cover_image,style_id) VALUES(?,?,?,?,?,?,?)'
  ).bind(uid, title, description||null, genre||null, tags||null, coverImage||null, styleId||null).run()
  const novel = await db.prepare('SELECT * FROM novel WHERE id=?').bind(result.meta.last_row_id).first()
  return c.json({ code: 200, data: novel })
})

// 获取小说
api.get('/novel/:id', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const db = c.env.DB
  const novel = await db.prepare('SELECT * FROM novel WHERE id=? AND user_id=?').bind(c.req.param('id'), uid).first()
  if (!novel) return c.json({ code: 400, message: '无权访问' })
  return c.json({ code: 200, data: novel })
})

// 更新小说
api.put('/novel/:id', auth, async (c) => {
  try {
    const uid = c.get('jwtPayload').userId
    const body = await c.req.json()
    const { title, description, genre, status, coverImage, tags, styleId, outline } = body
    const db = c.env.DB
    
    const novel = await db.prepare('SELECT * FROM novel WHERE id=? AND user_id=?').bind(c.req.param('id'), uid).first()
    if (!novel) return c.json({ code: 400, message: '无权操作' })
    
    console.log('更新小说参数:', JSON.stringify(body))
    
    await db.prepare(
      'UPDATE novel SET title=COALESCE(?,title),description=COALESCE(?,description),genre=COALESCE(?,genre),status=COALESCE(?,status),cover_image=COALESCE(?,cover_image),tags=COALESCE(?,tags),style_id=COALESCE(?,style_id),outline=COALESCE(?,outline),updated_at=? WHERE id=?'
    ).bind(title, description, genre, status, coverImage, tags, styleId, outline, now(), c.req.param('id')).run()
    
    const updated = await db.prepare('SELECT * FROM novel WHERE id=?').bind(c.req.param('id')).first()
    return c.json({ code: 200, data: {...updated, chapterCount: updated.chapter_count} })
  } catch(e) {
    console.error('更新小说错误:', e.message, e.stack)
    return c.json({ code: 500, message: `更新失败: ${e.message}` })
  }
})

// 删除小说
api.delete('/novel/:id', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const db = c.env.DB
  await db.prepare('DELETE FROM chapter WHERE novel_id=?').bind(c.req.param('id')).run()
  await db.prepare('DELETE FROM novel WHERE id=? AND user_id=?').bind(c.req.param('id'), uid).run()
  return c.json({ code: 200, message: '已删除' })
})

// 创建章节
api.post('/chapter/:novelId', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const { title, outline } = await c.req.json()
  const db = c.env.DB
  const novel = await db.prepare('SELECT * FROM novel WHERE id=? AND user_id=?').bind(c.req.param('novelId'), uid).first()
  if (!novel) return c.json({ code: 400, message: '无权操作' })
  const max = await db.prepare('SELECT MAX(chapter_number) as m FROM chapter WHERE novel_id=?').bind(novel.id).first()
  const num = (max?.m||0) + 1
  const result = await db.prepare(
    'INSERT INTO chapter(novel_id,chapter_number,title,outline) VALUES(?,?,?,?)'
  ).bind(novel.id, num, title||`第${num}章`, outline||null).run()
  await db.prepare('UPDATE novel SET chapter_count=chapter_count+1,updated_at=? WHERE id=?').bind(now(), novel.id).run()
  const chapter = await db.prepare('SELECT * FROM chapter WHERE id=?').bind(result.meta.last_row_id).first()
  return c.json({ code: 200, data: chapter })
})

// 更新章节（保存内容）
api.put('/chapter/:id', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const { title, content, status } = await c.req.json()
  const db = c.env.DB
  const chapter = await db.prepare('SELECT * FROM chapter WHERE id=?').bind(c.req.param('id')).first()
  if (!chapter) return c.json({ code: 400, message: '章节不存在' })
  const novel = await db.prepare('SELECT * FROM novel WHERE id=? AND user_id=?').bind(chapter.novel_id, uid).first()
  if (!novel) return c.json({ code: 400, message: '无权操作' })
  let wc = 0
  if (content) wc = content.replace(/\s/g,'').length
  await db.prepare(
    'UPDATE chapter SET title=COALESCE(?,title),content=COALESCE(?,content),status=COALESCE(?,status),word_count=?,updated_at=? WHERE id=?'
  ).bind(title, content, status, wc, now(), c.req.param('id')).run()
  if (content) {
    const total = await db.prepare('SELECT SUM(word_count) as w FROM chapter WHERE novel_id=?').bind(chapter.novel_id).first()
    await db.prepare('UPDATE novel SET word_count=? WHERE id=?').bind(total?.w||0, chapter.novel_id).run()
  }
  const updated = await db.prepare('SELECT * FROM chapter WHERE id=?').bind(c.req.param('id')).first()
  return c.json({ code: 200, data: updated })
})

// 删除章节
api.delete('/chapter/:id', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const db = c.env.DB
  const chapter = await db.prepare('SELECT * FROM chapter WHERE id=?').bind(c.req.param('id')).first()
  if (!chapter) return c.json({ code: 400, message: '章节不存在' })
  const novel = await db.prepare('SELECT * FROM novel WHERE id=? AND user_id=?').bind(chapter.novel_id, uid).first()
  if (!novel) return c.json({ code: 400, message: '无权操作' })
  await db.prepare('DELETE FROM chapter WHERE id=?').bind(c.req.param('id')).run()
  await db.prepare('UPDATE novel SET chapter_count=MAX(0,chapter_count-1) WHERE id=?').bind(chapter.novel_id).run()
  return c.json({ code: 200, message: '已删除' })
})

// ========== 风格管理 ==========
api.get('/style/list', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const db = c.env.DB
  const styles = await db.prepare('SELECT * FROM writing_style WHERE user_id=? ORDER BY is_default DESC, id ASC').bind(uid).all()
  return c.json({ code: 200, data: styles.results.map(s => ({...s, isDefault: !!s.is_default})) })
})

api.post('/style', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const { name, writingStyleDesc, writingPreferences, genrePreferences, tone, characterStyle, plotStyle, otherSettings, isDefault } = await c.req.json()
  const db = c.env.DB
  if (isDefault) await db.prepare('UPDATE writing_style SET is_default=0 WHERE user_id=?').bind(uid).run()
  const result = await db.prepare(
    'INSERT INTO writing_style(user_id,name,writing_style_desc,writing_preferences,genre_preferences,tone,character_style,plot_style,other_settings,is_default) VALUES(?,?,?,?,?,?,?,?,?,?)'
  ).bind(uid, name, writingStyleDesc, writingPreferences, genrePreferences, tone, characterStyle, plotStyle, otherSettings, isDefault?1:0).run()
  const style = await db.prepare('SELECT * FROM writing_style WHERE id=?').bind(result.meta.last_row_id).first()
  return c.json({ code: 200, data: {...style, isDefault: !!style.is_default} })
})

// ========== 收藏/关注 ==========
api.post('/reader/follow/:authorId', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const aid = c.req.param('authorId')
  const db = c.env.DB
  const exist = await db.prepare('SELECT id FROM follows WHERE follower_id=? AND following_id=?').bind(uid, aid).first()
  if (exist) { await db.prepare('DELETE FROM follows WHERE id=?').bind(exist.id).run(); return c.json({ code: 200, data: false }) }
  await db.prepare('INSERT INTO follows(follower_id,following_id) VALUES(?,?)').bind(uid, aid).run()
  return c.json({ code: 200, data: true })
})

api.post('/reader/bookmark/:novelId', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const nid = c.req.param('novelId')
  const db = c.env.DB
  const exist = await db.prepare('SELECT id FROM bookmark WHERE user_id=? AND novel_id=?').bind(uid, nid).first()
  if (exist) { await db.prepare('DELETE FROM bookmark WHERE id=?').bind(exist.id).run(); return c.json({ code: 200, data: false }) }
  await db.prepare('INSERT INTO bookmark(user_id,novel_id) VALUES(?,?)').bind(uid, nid).run()
  return c.json({ code: 200, data: true })
})

api.get('/reader/bookmarks', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const db = c.env.DB
  const novels = await db.prepare(
    'SELECT n.* FROM bookmark b JOIN novel n ON b.novel_id=n.id WHERE b.user_id=? ORDER BY b.created_at DESC'
  ).bind(uid).all()
  return c.json({ code: 200, data: novels.results.map(n => ({...n, chapterCount: n.chapter_count})) })
})

api.get('/reader/followed-novels', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const db = c.env.DB
  const novels = await db.prepare(
    'SELECT DISTINCT n.*, u.nickname as author_name FROM follows f JOIN novel n ON f.following_id=n.user_id JOIN users u ON n.user_id=u.id WHERE f.follower_id=? AND (n.is_published=1 OR n.is_published IS NULL) ORDER BY n.updated_at DESC LIMIT 20'
  ).bind(uid).all()
  return c.json({ code: 200, data: novels.results.map(n => ({...n, authorName: n.author_name, chapterCount: n.chapter_count})) })
})

// ========== 上传封面 ==========
api.post('/upload/cover', auth, async (c) => {
  try {
    const form = await c.req.formData()
    const file = form.get('file')
    if (!file) return c.json({ code: 400, message: '未选择文件' })
    const key = `covers/${Date.now()}-${file.name}`
    await c.env.COVERS.put(key, file.stream())
    return c.json({ code: 200, data: `/api/uploads/${key}` })
  } catch(e) { return c.json({ code: 400, message: e.message }) }
})

// 封面图片访问
api.get('/uploads/covers/:name', async (c) => {
  const obj = await c.env.COVERS.get(`covers/${c.req.param('name')}`)
  if (!obj) return c.notFound()
  return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000' } })
})

// ========== AI 公开测试接口 ==========
api.get('/ai/test', async (c) => {
  try {
    const db = c.env.DB
    const providers = await db.prepare('SELECT * FROM model_provider WHERE is_default = 1 LIMIT 1').all()
    if (!providers.results.length) {
      return c.json({ code: 400, message: '请先配置默认模型服务商' })
    }
    
    const provider = providers.results[0]
    const headers = {
      'Content-Type': 'application/json'
    }
    
    if (provider.api_key && provider.api_key.trim()) {
      headers['Authorization'] = `Bearer ${provider.api_key}`
    }
    
    const isDashScope = provider.base_url.includes('dashscope') || provider.base_url.includes('aliyuncs')
    const isModelScope = provider.base_url.includes('modelscope')
    
    let aiUrl
    if (isDashScope) {
      aiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    } else if (isModelScope) {
      aiUrl = 'https://api-inference.modelscope.cn/v1/chat/completions'
    } else {
      aiUrl = (provider.base_url.endsWith('/') ? provider.base_url.slice(0, -1) : provider.base_url) + '/chat/completions'
    }
    
    let modelName = provider.model_name
    if (isModelScope && !modelName.includes('/')) {
      modelName = 'qwen/' + modelName
    }
    
    const aiRequest = {
      model: modelName,
      messages: [
        { role: 'user', content: '你好' }
      ],
      temperature: 0.7,
      max_tokens: 100
    }
    
    const aiResp = await fetch(aiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(aiRequest)
    })
    
    const aiJson = await aiResp.json()
    
    if (!aiResp.ok) {
      return c.json({ 
        code: 500, 
        message: 'AI服务调用失败',
        status: aiResp.status,
        error: aiJson 
      })
    }
    
    return c.json({ 
      code: 200, 
      message: 'AI服务连接成功',
      provider: provider.name,
      model: modelName,
      response: aiJson
    })
  } catch (error) {
    console.error('AI测试错误:', error)
    return c.json({ code: 500, message: '测试失败: ' + error.message })
  }
})

// ========== AI 测试接口（需要认证）==========
api.post('/ai/test', auth, async (c) => {
  try {
    const uid = c.get('jwtPayload').userId
    const db = c.env.DB
    const provider = await db.prepare('SELECT * FROM model_provider WHERE user_id=? AND is_default=1 LIMIT 1').bind(uid).first()
    if (!provider) return c.json({ code: 400, message: '请先配置模型服务商' })

    const headers = { 'Content-Type': 'application/json' }
    if (provider.api_key) headers['Authorization'] = `Bearer ${provider.api_key}`

    // 根据服务商类型选择正确的API地址
    const baseUrl = provider.base_url.replace(/\/$/, '')
    const isModelScope = baseUrl.includes('modelscope')
    const isDashScope = baseUrl.includes('dashscope') || baseUrl.includes('aliyun')
    
    let testUrl
    if (isModelScope) {
      // 魔搭社区使用API-Inference地址
      testUrl = 'https://api-inference.modelscope.cn/v1/chat/completions'
    } else if (isDashScope) {
      // DashScope使用兼容模式地址
      testUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    } else {
      // 其他服务商使用用户配置的地址
      testUrl = baseUrl + '/chat/completions'
    }

    // 处理模型名称
    let modelName = provider.model_name
    if (isModelScope && !modelName.includes('/')) {
      modelName = 'qwen/' + modelName
    }

    console.log('测试接口:', { testUrl, modelName, apiKey: provider.api_key ? '已配置' : '未配置' })

    const resp = await fetch(testUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: '你好，请回复"测试成功"' }],
        max_tokens: 50
      })
    })
    
    const text = await resp.text()
    console.log('API响应:', text.substring(0, 500))
    
    return c.json({ 
      code: 200, 
      data: { 
        provider: provider.provider_name, 
        model: modelName,
        url: testUrl,
        status: resp.status,
        response: text.substring(0, 500)
      } 
    })
  } catch(e) {
    console.error('测试接口错误:', e.message)
    return c.json({ code: 500, message: e.message })
  }
})

// ========== AI 生成（透传） ==========
api.post('/ai/generate-outline', auth, async (c) => {
  try {
    const { novelId, providerId, prompt } = await c.req.json()
    const uid = c.get('jwtPayload').userId
    const db = c.env.DB
    
    console.log('AI生成大纲请求:', { novelId, providerId, userId: uid })
    
    const novel = await db.prepare('SELECT * FROM novel WHERE id=? AND user_id=?').bind(novelId, uid).first()
    if (!novel) {
      console.error('小说不存在或无权访问:', { novelId, userId: uid })
      return c.json({ code: 400, message: '小说不存在或无权访问' })
    }
    
    let provider = null
    if (providerId) {
      provider = await db.prepare('SELECT * FROM model_provider WHERE id=? AND user_id=?').bind(providerId, uid).first()
      console.log('按providerId查找:', providerId, provider ? '找到' : '未找到')
    }
    
    if (!provider) {
      provider = await db.prepare('SELECT * FROM model_provider WHERE user_id=? AND is_default=1 LIMIT 1').bind(uid).first()
      console.log('按默认查找:', provider ? '找到' : '未找到')
    }
    
    if (!provider) {
      const errorMsg = '错误：请先在"模型管理"中配置AI模型服务商'
      console.error(errorMsg)
      return c.json({ code: 400, message: errorMsg })
    }

    console.log('使用服务商:', provider.provider_name, provider.base_url, provider.model_name)

    const finalPrompt = prompt || `请为小说《${novel.title}》生成详细大纲，包含：
1. 故事背景设定
2. 主要人物介绍
3. 故事主线与冲突
4. 章节梗概（建议10-20章）
请用中文详细描述。`
    
    const headers = { 'Content-Type': 'application/json' }
    if (provider.api_key && provider.api_key.trim()) {
      headers['Authorization'] = `Bearer ${provider.api_key}`
    }

    let aiRequest, aiUrl
    const isDashScope = provider.base_url.includes('dashscope') || provider.base_url.includes('aliyuncs')
    const isModelScope = provider.base_url.includes('modelscope')
    
    // 构建API地址
    if (isDashScope) {
      // DashScope 使用兼容模式地址
      aiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    } else if (isModelScope) {
      // 魔搭社区API - 使用正确的API-Inference地址
      aiUrl = 'https://api-inference.modelscope.cn/v1/chat/completions'
    } else {
      // 其他模型：使用用户配置的地址（支持自定义模型等）
      aiUrl = (provider.base_url.endsWith('/') ? provider.base_url.slice(0, -1) : provider.base_url) + '/chat/completions'
    }
    
    // 处理模型名称格式
    let modelName = provider.model_name
    if (isModelScope && !modelName.includes('/')) {
      // 魔搭社区需要完整模型ID：用户名/模型名
      modelName = 'qwen/' + modelName
    }
    
    // 构建请求体（通用格式）
    aiRequest = {
      model: modelName,
      messages: [
        { role: 'system', content: '你是一位专业的小说作家和编辑，精通创作各类小说大纲。你的任务是根据用户提供的小说名称和要求，直接生成详细的小说大纲。不要问候，不要寒暄，不要提问，不要反问，不要解释，直接输出大纲内容。' },
        { role: 'user', content: finalPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4096
    }
    
    console.log('AI请求URL:', aiUrl)
    console.log('AI请求数据:', JSON.stringify(aiRequest))
    console.log('完整prompt内容:', finalPrompt)
    
    const aiResp = await fetch(aiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(aiRequest),
      keepalive: true,
      signal: AbortSignal.timeout(120000)
    })

    console.log('AI响应状态:', aiResp.status)
    
    if (!aiResp.ok) {
      const errorText = await aiResp.text()
      console.error('AI API Error:', aiResp.status, errorText)
      return c.json({ code: 500, message: `AI服务调用失败: ${aiResp.status}` })
    }

    const aiJson = await aiResp.json()
    console.log('AI响应数据:', JSON.stringify(aiJson).substring(0, 1000))
    console.log('AI响应choices长度:', aiJson?.choices?.length)
    console.log('AI响应choices[0]:', JSON.stringify(aiJson?.choices?.[0]).substring(0, 500))
    console.log('AI响应choices[0].message:', JSON.stringify(aiJson?.choices?.[0]?.message).substring(0, 500))
    
    let content = '大纲生成失败'
    if (aiJson?.choices?.[0]?.message?.content) {
      content = aiJson.choices[0].message.content
      console.log('解析成功: choices[0].message.content')
    } else if (aiJson?.choices?.[0]?.delta?.content) {
      content = aiJson.choices[0].delta.content
      console.log('解析成功: choices[0].delta.content')
    } else if (aiJson?.choices?.[0]?.text) {
      content = aiJson.choices[0].text
      console.log('解析成功: choices[0].text')
    } else if (aiJson?.output?.text) {
      content = aiJson.output.text
      console.log('解析成功: output.text')
    } else if (aiJson?.result) {
      content = aiJson.result
      console.log('解析成功: result')
    } else if (aiJson?.output) {
      content = typeof aiJson.output === 'string' ? aiJson.output : JSON.stringify(aiJson.output)
      console.log('解析成功: output')
    } else if (aiJson?.text) {
      content = aiJson.text
      console.log('解析成功: text')
    } else if (aiJson?.data?.choices?.[0]?.message?.content) {
      content = aiJson.data.choices[0].message.content
      console.log('解析成功: data.choices[0].message.content')
    } else if (aiJson?.response) {
      content = typeof aiJson.response === 'string' ? aiJson.response : JSON.stringify(aiJson.response)
      console.log('解析成功: response')
    } else {
      console.error('无法解析AI响应:', JSON.stringify(aiJson))
      // 尝试更深入的调试
      const choicesStr = JSON.stringify(aiJson?.choices || 'undefined')
      console.error('choices详细内容:', choicesStr.substring(0, 1000))
      content = `无法解析AI响应，请检查服务商配置。响应格式: ${JSON.stringify(Object.keys(aiJson || {})).substring(0, 100)}`
    }

    // 将大纲保存到novel表（不创建章节）
    const wordCount = content.length
    await db.prepare('UPDATE novel SET outline=?, updated_at=? WHERE id=?').bind(content, now(), novelId).run()

    console.log('大纲生成成功:', novelId, '内容长度:', content.length)
    
    return c.json({ code: 200, data: {
      novelId: novelId,
      outline: content,
      wordCount: wordCount
    } })
  } catch(e) { 
    console.error('AI生成大纲错误:', e.message, e.stack)
    return c.json({ code: 500, message: `生成失败: ${e.message}` })
  }
})

// AI 普通生成章节（带记忆功能）
api.post('/ai/generate-chapter', auth, async (c) => {
  try {
    const { novelId, chapterId, providerId, outline, wordCount } = await c.req.json()
    const uid = c.get('jwtPayload').userId
    const db = c.env.DB

    const novel = await db.prepare('SELECT * FROM novel WHERE id=? AND user_id=?').bind(novelId, uid).first()
    if (!novel) return c.json({ code: 400, message: '小说不存在或无权访问' })

    const chapter = await db.prepare('SELECT * FROM chapter WHERE id=? AND novel_id=?').bind(chapterId, novelId).first()
    if (!chapter) return c.json({ code: 400, message: '章节不存在' })

    let provider = null
    if (providerId) {
      provider = await db.prepare('SELECT * FROM model_provider WHERE id=? AND user_id=?').bind(providerId, uid).first()
    }
    if (!provider) {
      provider = await db.prepare('SELECT * FROM model_provider WHERE user_id=? AND is_default=1 LIMIT 1').bind(uid).first()
    }
    if (!provider) return c.json({ code: 400, message: '请先配置AI模型服务商' })

    // 构建上下文：小说信息 + 大纲 + 前文内容
    let contextPrompt = ''
    
    // 1. 小说基本信息
    if (novel.description || novel.genre || novel.tags) {
      contextPrompt += `【小说信息】\n`
      if (novel.genre) contextPrompt += `类型：${novel.genre}\n`
      if (novel.tags) contextPrompt += `标签：${novel.tags}\n`
      if (novel.description) contextPrompt += `简介：${novel.description}\n`
      contextPrompt += '\n'
    }
    
    // 2. 小说大纲（如果有）
    if (novel.outline) {
      // 只取大纲的前1000字，避免token过多
      const outlinePreview = novel.outline.length > 1000 ? novel.outline.substring(0, 1000) + '...' : novel.outline
      contextPrompt += `【小说大纲】\n${outlinePreview}\n\n`
    }
    
    // 3. 前文内容（获取前一章或前几章的结尾部分）
    const prevChapters = await db.prepare(
      'SELECT content FROM chapter WHERE novel_id=? AND chapter_number<? ORDER BY chapter_number DESC LIMIT 2'
    ).bind(novelId, chapter.chapter_number).all()
    
    if (prevChapters.results && prevChapters.results.length > 0) {
      let previousContent = ''
      prevChapters.results.reverse().forEach(ch => {
        if (ch.content && ch.content.length > 0) {
          // 每章只取最后500字
          const endPart = ch.content.length > 500 ? ch.content.substring(ch.content.length - 500) : ch.content
          previousContent += endPart + '\n'
        }
      })
      // 总上下文限制在1500字以内
      if (previousContent.length > 1500) {
        previousContent = previousContent.substring(previousContent.length - 1500)
      }
      if (previousContent.trim()) {
        contextPrompt += `【前文回顾】\n${previousContent}\n\n`
      }
    }
    
    // 4. 本章大纲（如果有）
    if (outline) {
      contextPrompt += `【本章大纲】\n${outline}\n\n`
    }
    
    // 最终prompt
    const finalPrompt = `${contextPrompt}请为小说《${novel.title}》撰写第${chapter.chapter_number}章"${chapter.title}"。
要求：${wordCount ? `字数约${wordCount}字。` : '字数约3000字。'}
请保持与前文风格一致，注意故事连贯性和人物性格的一致性。`

    const headers = { 'Content-Type': 'application/json' }
    if (provider.api_key && provider.api_key.trim()) headers['Authorization'] = `Bearer ${provider.api_key}`

    const isDashScope = provider.base_url.includes('dashscope') || provider.base_url.includes('aliyuncs')
    const isModelScope = provider.base_url.includes('modelscope')
    
    let aiUrl
    if (isDashScope) {
      aiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    } else if (isModelScope) {
      aiUrl = 'https://api-inference.modelscope.cn/v1/chat/completions'
    } else {
      aiUrl = (provider.base_url.endsWith('/') ? provider.base_url.slice(0, -1) : provider.base_url) + '/chat/completions'
    }
    
    let modelName = provider.model_name
    if (isModelScope && !modelName.includes('/')) {
      modelName = 'qwen/' + modelName
    }

    const aiResp = await fetch(aiUrl, {
      method: 'POST', headers,
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: '你是一位专业的小说作家，擅长创作高质量的中文小说内容。' },
          { role: 'user', content: finalPrompt }
        ],
        temperature: 0.8,
        max_tokens: Math.min(Math.ceil((wordCount || 3000) * 1.5), 8192)
      }),
      keepalive: true,
      signal: AbortSignal.timeout(120000)
    })

    if (!aiResp.ok) {
      const errorText = await aiResp.text()
      return c.json({ code: 500, message: `AI服务调用失败: ${aiResp.status}` })
    }

    const aiJson = await aiResp.json()
    let content = aiJson?.choices?.[0]?.message?.content || aiJson?.output?.text || '生成失败'

    const wc = content.length
    await db.prepare('UPDATE chapter SET content=?, word_count=?, status=? WHERE id=?').bind(content, wc, 'COMPLETED', chapterId).run()
    await db.prepare('UPDATE novel SET updated_at=? WHERE id=?').bind(now(), novelId).run()

    const updated = await db.prepare('SELECT * FROM chapter WHERE id=?').bind(chapterId).first()
    return c.json({ code: 200, data: { id: updated.id, novelId: updated.novel_id, chapterNumber: updated.chapter_number, title: updated.title, content: updated.content, outline: updated.outline || '', status: updated.status, wordCount: updated.word_count, createdAt: updated.created_at, updatedAt: updated.updated_at } })
  } catch(e) {
    console.error('AI生成章节错误:', e.message)
    return c.json({ code: 500, message: `生成失败: ${e.message}` })
  }
})

// AI 续写
api.post('/ai/continue-writing', auth, async (c) => {
  try {
    const { chapterId, providerId, previousContent, wordCount } = await c.req.json()
    const uid = c.get('jwtPayload').userId
    const db = c.env.DB

    const chapter = await db.prepare('SELECT c.*, n.title as novel_title, n.user_id, n.description, n.genre, n.tags, n.outline FROM chapter c JOIN novel n ON c.novel_id=n.id WHERE c.id=?').bind(chapterId).first()
    if (!chapter || chapter.user_id !== uid) return c.json({ code: 400, message: '无权操作' })

    let provider = null
    if (providerId) provider = await db.prepare('SELECT * FROM model_provider WHERE id=? AND user_id=?').bind(providerId, uid).first()
    if (!provider) provider = await db.prepare('SELECT * FROM model_provider WHERE user_id=? AND is_default=1 LIMIT 1').bind(uid).first()
    if (!provider) return c.json({ code: 400, message: '请先配置AI模型服务商' })

    // 构建上下文
    let contextPrompt = ''
    
    // 1. 小说基本信息
    if (chapter.description || chapter.genre || chapter.tags) {
      contextPrompt += `【小说信息】\n`
      if (chapter.genre) contextPrompt += `类型：${chapter.genre}\n`
      if (chapter.tags) contextPrompt += `标签：${chapter.tags}\n`
      if (chapter.description) contextPrompt += `简介：${chapter.description}\n`
      contextPrompt += '\n'
    }
    
    // 2. 小说大纲（如果有）
    if (chapter.outline) {
      const outlinePreview = chapter.outline.length > 800 ? chapter.outline.substring(0, 800) + '...' : chapter.outline
      contextPrompt += `【小说大纲】\n${outlinePreview}\n\n`
    }
    
    // 3. 当前章节前文内容
    const context = (previousContent || chapter.content || '').slice(-2000)
    contextPrompt += `【前文内容】\n${context}\n\n`
    
    const finalPrompt = `${contextPrompt}请续写小说《${chapter.novel_title}》第${chapter.chapter_number}章的内容。
请从以上内容继续往下写，保持风格一致，字数约${wordCount || 1000}字。`

    const headers = { 'Content-Type': 'application/json' }
    if (provider.api_key && provider.api_key.trim()) headers['Authorization'] = `Bearer ${provider.api_key}`

    const isDashScope = provider.base_url.includes('dashscope') || provider.base_url.includes('aliyuncs')
    const isModelScope = provider.base_url.includes('modelscope')
    
    let aiUrl
    if (isDashScope) {
      aiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    } else if (isModelScope) {
      aiUrl = 'https://api-inference.modelscope.cn/v1/chat/completions'
    } else {
      aiUrl = (provider.base_url.endsWith('/') ? provider.base_url.slice(0, -1) : provider.base_url) + '/chat/completions'
    }
    
    let modelName = provider.model_name
    if (isModelScope && !modelName.includes('/')) {
      modelName = 'qwen/' + modelName
    }

    const aiResp = await fetch(aiUrl, {
      method: 'POST', headers,
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: '你是一位专业的小说作家，擅长续写高质量的中文小说内容。' },
          { role: 'user', content: finalPrompt }
        ],
        temperature: 0.8,
        max_tokens: Math.min(Math.ceil((wordCount || 1000) * 1.5), 8192)
      }),
      keepalive: true,
      signal: AbortSignal.timeout(120000)
    })

    if (!aiResp.ok) {
      const errorText = await aiResp.text()
      return c.json({ code: 500, message: `AI服务调用失败: ${aiResp.status}` })
    }

    const aiJson = await aiResp.json()
    const continuation = aiJson?.choices?.[0]?.message?.content || aiJson?.output?.text || ''
    return c.json({ code: 200, data: continuation })
  } catch(e) {
    console.error('AI续写错误:', e.message)
    return c.json({ code: 500, message: `续写失败: ${e.message}` })
  }
})

// AI 流式生成章节
api.post('/ai/generate-chapter-stream', auth, async (c) => {
  const { novelId, chapterId, providerId, outline, wordCount } = await c.req.json()
  const uid = c.get('jwtPayload').userId
  const db = c.env.DB

  const novel = await db.prepare('SELECT * FROM novel WHERE id=? AND user_id=?').bind(novelId, uid).first()
  if (!novel) return c.json({ code: 400, message: '小说不存在或无权访问' })

  const chapter = await db.prepare('SELECT * FROM chapter WHERE id=? AND novel_id=?').bind(chapterId, novelId).first()
  if (!chapter) return c.json({ code: 400, message: '章节不存在' })

  let provider = null
  if (providerId) provider = await db.prepare('SELECT * FROM model_provider WHERE id=? AND user_id=?').bind(providerId, uid).first()
  if (!provider) provider = await db.prepare('SELECT * FROM model_provider WHERE user_id=? AND is_default=1 LIMIT 1').bind(uid).first()
  if (!provider) return c.json({ code: 400, message: '请先配置AI模型服务商' })

  // 构建上下文：小说信息 + 大纲 + 前文内容
  let contextPrompt = ''
  
  // 1. 小说基本信息
  if (novel.description || novel.genre || novel.tags) {
    contextPrompt += `【小说信息】\n`
    if (novel.genre) contextPrompt += `类型：${novel.genre}\n`
    if (novel.tags) contextPrompt += `标签：${novel.tags}\n`
    if (novel.description) contextPrompt += `简介：${novel.description}\n`
    contextPrompt += '\n'
  }
  
  // 2. 小说大纲（如果有）
  if (novel.outline) {
    const outlinePreview = novel.outline.length > 1000 ? novel.outline.substring(0, 1000) + '...' : novel.outline
    contextPrompt += `【小说大纲】\n${outlinePreview}\n\n`
  }
  
  // 3. 前文内容（获取前一章或前几章的结尾部分）
  const prevChapters = await db.prepare(
    'SELECT content FROM chapter WHERE novel_id=? AND chapter_number<? ORDER BY chapter_number DESC LIMIT 2'
  ).bind(novelId, chapter.chapter_number).all()
  
  if (prevChapters.results && prevChapters.results.length > 0) {
    let previousContent = ''
    prevChapters.results.reverse().forEach(ch => {
      if (ch.content && ch.content.length > 0) {
        const endPart = ch.content.length > 500 ? ch.content.substring(ch.content.length - 500) : ch.content
        previousContent += endPart + '\n'
      }
    })
    if (previousContent.length > 1500) {
      previousContent = previousContent.substring(previousContent.length - 1500)
    }
    if (previousContent.trim()) {
      contextPrompt += `【前文回顾】\n${previousContent}\n\n`
    }
  }
  
  // 4. 本章大纲（如果有）
  if (outline) {
    contextPrompt += `【本章大纲】\n${outline}\n\n`
  }
  
  // 最终prompt
  const finalPrompt = `${contextPrompt}请为小说《${novel.title}》撰写第${chapter.chapter_number}章"${chapter.title}"。
要求：${wordCount ? `字数约${wordCount}字。` : '字数约3000字。'}
请保持与前文风格一致，注意故事连贯性和人物性格的一致性。`

  const headers = { 'Content-Type': 'application/json' }
  if (provider.api_key && provider.api_key.trim()) headers['Authorization'] = `Bearer ${provider.api_key}`

  const isDashScope = provider.base_url.includes('dashscope') || provider.base_url.includes('aliyuncs')
  const isModelScope = provider.base_url.includes('modelscope')
  
  let aiUrl
  if (isDashScope) {
    aiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
  } else if (isModelScope) {
    aiUrl = 'https://api-inference.modelscope.cn/v1/chat/completions'
  } else {
    aiUrl = (provider.base_url.endsWith('/') ? provider.base_url.slice(0, -1) : provider.base_url) + '/chat/completions'
  }
  
  let modelName = provider.model_name
  if (isModelScope && !modelName.includes('/')) {
    modelName = 'qwen/' + modelName
  }

  const aiResp = await fetch(aiUrl, {
    method: 'POST', headers,
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: '你是一位专业的小说作家，擅长创作高质量的中文小说内容。' },
        { role: 'user', content: finalPrompt }
      ],
      temperature: 0.8,
      max_tokens: Math.min(Math.ceil((wordCount || 3000) * 1.5), 8192),
      stream: true
    }),
    keepalive: true,
    signal: AbortSignal.timeout(120000)
  })

  if (!aiResp.ok) {
    const errorText = await aiResp.text()
    return c.json({ code: 500, message: `AI服务调用失败: ${aiResp.status}` })
  }

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  c.executionCtx.waitUntil((async () => {
    let fullContent = ''
    try {
      const reader = aiResp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            const delta = parsed?.choices?.[0]?.delta?.content
            if (delta) {
              fullContent += delta
              await writer.write(encoder.encode(`data:${delta}\n\n`))
            }
          } catch(e) { /* skip unparseable lines */ }
        }
      }
      const wc = fullContent.replace(/\s/g, '').length
      await db.prepare('UPDATE chapter SET content=?, word_count=?, status=? WHERE id=?').bind(fullContent, wc, 'COMPLETED', chapterId).run()
      await db.prepare('UPDATE novel SET updated_at=? WHERE id=?').bind(now(), novelId).run()
      await writer.write(encoder.encode('event:done\ndata:ok\n\n'))
    } catch(e) {
      console.error('流式生成错误:', e.message)
      await writer.write(encoder.encode(`event:error\ndata:${e.message}\n\n`))
    } finally {
      await writer.close()
    }
  })())

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
  })
})

// 模型服务商列表
api.get('/provider/list', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const db = c.env.DB
  const providers = await db.prepare('SELECT * FROM model_provider WHERE user_id=? ORDER BY sort_order').bind(uid).all()
  return c.json({ code: 200, data: providers.results.map(p => ({
    id: p.id, providerName: p.provider_name, providerType: p.provider_type,
    baseUrl: p.base_url, modelName: p.model_name, isDefault: !!p.is_default, sortOrder: p.sort_order
  })) })
})

api.post('/provider', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const { providerName, providerType, baseUrl, apiKey, modelName, isDefault } = await c.req.json()
  const db = c.env.DB
  if (isDefault) await db.prepare('UPDATE model_provider SET is_default=0 WHERE user_id=?').bind(uid).run()
  const result = await db.prepare(
    'INSERT INTO model_provider(user_id,provider_name,provider_type,base_url,api_key,model_name,is_default) VALUES(?,?,?,?,?,?,?)'
  ).bind(uid, providerName, providerType, baseUrl, apiKey, modelName, isDefault?1:0).run()
  const p = await db.prepare('SELECT * FROM model_provider WHERE id=?').bind(result.meta.last_row_id).first()
  return c.json({ code: 200, data: { id: p.id, providerName: p.provider_name, providerType: p.provider_type, baseUrl: p.base_url, modelName: p.model_name, isDefault: !!p.is_default } })
})

api.put('/provider/:id', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  const { providerName, providerType, baseUrl, apiKey, modelName, isDefault } = await c.req.json()
  const db = c.env.DB
  
  if (isDefault) await db.prepare('UPDATE model_provider SET is_default=0 WHERE user_id=?').bind(uid).run()
  
  await db.prepare(
    'UPDATE model_provider SET provider_name=?,provider_type=?,base_url=?,api_key=?,model_name=?,is_default=? WHERE id=? AND user_id=?'
  ).bind(providerName, providerType, baseUrl, apiKey, modelName, isDefault?1:0, c.req.param('id'), uid).run()
  
  const p = await db.prepare('SELECT * FROM model_provider WHERE id=?').bind(c.req.param('id')).first()
  return c.json({ code: 200, data: { id: p.id, providerName: p.provider_name, providerType: p.provider_type, baseUrl: p.base_url, modelName: p.model_name, isDefault: !!p.is_default } })
})

api.delete('/provider/:id', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  await c.env.DB.prepare('DELETE FROM model_provider WHERE id=? AND user_id=?').bind(c.req.param('id'), uid).run()
  return c.json({ code: 200, message: '已删除' })
})

// 挂载子应用到根路径
app.route('/', api)

export default app
