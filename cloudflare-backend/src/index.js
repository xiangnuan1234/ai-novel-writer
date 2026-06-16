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
      status TEXT DEFAULT 'DRAFT',
      chapter_count INTEGER DEFAULT 0,
      word_count INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
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
    const { title, description, genre, status, coverImage, tags, styleId } = body
    const db = c.env.DB
    
    const novel = await db.prepare('SELECT * FROM novel WHERE id=? AND user_id=?').bind(c.req.param('id'), uid).first()
    if (!novel) return c.json({ code: 400, message: '无权操作' })
    
    console.log('更新小说参数:', JSON.stringify(body))
    
    await db.prepare(
      'UPDATE novel SET title=COALESCE(?,title),description=COALESCE(?,description),genre=COALESCE(?,genre),status=COALESCE(?,status),cover_image=COALESCE(?,cover_image),tags=COALESCE(?,tags),style_id=COALESCE(?,style_id),updated_at=? WHERE id=?'
    ).bind(title, description, genre, status, coverImage, tags, styleId, now(), c.req.param('id')).run()
    
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

// ========== AI 生成（透传） ==========
api.post('/ai/generate-outline', auth, async (c) => {
  try {
    const { novelId, providerId, prompt } = await c.req.json()
    const uid = c.get('jwtPayload').userId
    const db = c.env.DB
    
    console.log('AI生成大纲请求:', { novelId, providerId })
    
    const novel = await db.prepare('SELECT * FROM novel WHERE id=? AND user_id=?').bind(novelId, uid).first()
    if (!novel) return c.json({ code: 400, message: '小说不存在或无权访问' })
    
    const max = await db.prepare('SELECT MAX(chapter_number) as m FROM chapter WHERE novel_id=?').bind(novelId).first()
    const num = (max?.m||0) + 1
    const title = `【大纲】${novel.title}`
    const result = await db.prepare(
      'INSERT INTO chapter(novel_id,chapter_number,title,content) VALUES(?,?,?,?)'
    ).bind(novelId, num, title, 'AI 生成中...').run()

    let provider = null
    if (providerId) {
      provider = await db.prepare('SELECT * FROM model_provider WHERE id=? AND user_id=?').bind(providerId, uid).first()
    }
    
    if (!provider) {
      provider = await db.prepare('SELECT * FROM model_provider WHERE user_id=? AND is_default=1 LIMIT 1').bind(uid).first()
    }
    
    if (!provider) {
      await db.prepare('UPDATE chapter SET content=? WHERE id=?').bind('错误：请先在"模型管理"中配置AI模型服务商', result.meta.last_row_id).run()
      return c.json({ code: 400, message: '请先在"模型管理"中配置AI模型服务商' })
    }

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

    console.log('调用AI服务:', provider.base_url, provider.model_name)
    
    const aiResp = await fetch(provider.base_url + '/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: provider.model_name,
        messages: [{ role: 'system', content: '你是一位专业的小说作家和编辑，擅长创作各种类型的小说大纲。' }, { role: 'user', content: finalPrompt }],
        temperature: 0.7,
        max_tokens: 4096
      }),
      keepalive: true
    })

    if (!aiResp.ok) {
      const errorText = await aiResp.text()
      console.error('AI API Error:', aiResp.status, errorText)
      const errorMsg = `AI服务调用失败 (${aiResp.status}): ${errorText.substring(0, 200)}`
      await db.prepare('UPDATE chapter SET content=? WHERE id=?').bind(errorMsg, result.meta.last_row_id).run()
      return c.json({ code: 500, message: `AI服务调用失败: ${aiResp.status}` })
    }

    const aiJson = await aiResp.json()
    console.log('AI响应:', JSON.stringify(aiJson).substring(0, 500))
    
    let content = '大纲生成失败'
    if (aiJson?.choices?.[0]?.message?.content) {
      content = aiJson.choices[0].message.content
    } else if (aiJson?.result) {
      content = aiJson.result
    } else if (aiJson?.output) {
      content = aiJson.output
    }

    await db.prepare('UPDATE chapter SET content=?,word_count=? WHERE id=?').bind(content, content.replace(/\s/g,'').length, result.meta.last_row_id).run()
    await db.prepare('UPDATE novel SET chapter_count=chapter_count+1,updated_at=? WHERE id=?').bind(now(), novelId).run()

    const chapter = await db.prepare('SELECT * FROM chapter WHERE id=?').bind(result.meta.last_row_id).first()
    return c.json({ code: 200, data: chapter })
  } catch(e) { 
    console.error('AI生成错误:', e.message, e.stack)
    return c.json({ code: 500, message: `生成失败: ${e.message}` }) 
  }
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

api.delete('/provider/:id', auth, async (c) => {
  const uid = c.get('jwtPayload').userId
  await c.env.DB.prepare('DELETE FROM model_provider WHERE id=? AND user_id=?').bind(c.req.param('id'), uid).run()
  return c.json({ code: 200, message: '已删除' })
})

// 挂载子应用到根路径
app.route('/', api)

export default app
