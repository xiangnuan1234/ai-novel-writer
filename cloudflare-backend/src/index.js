import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt, sign } from 'hono/jwt'

const app = new Hono()
const api = new Hono()

// ========== 中间件 ==========
app.use('/*', cors({ origin: '*', credentials: true }))

const JWT_SECRET = 'ai-novel-writer-secret-key-2025'

const auth = jwt({ secret: JWT_SECRET, alg: 'HS256' })

async function hash(str) {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('')
}
function now() { return new Date().toISOString().replace('T',' ').substring(0,19) }

// ========== 公开接口 ==========

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
    if (!user || user.password !== hash(password)) return c.json({ code: 400, message: '用户名或密码错误' })
    const token = await sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET)
    return c.json({ code: 200, data: { token, userId: user.id, username: user.username, nickname: user.nickname, role: user.role } })
  } catch(e) { return c.json({ code: 400, message: e.message }) }
})

// 读者大厅 - 浏览
api.get('/reader/browse', async (c) => {
  const db = c.env.DB
  const novels = await db.prepare(
    'SELECT n.*, u.nickname as author_name FROM novel n JOIN users u ON n.user_id=u.id WHERE n.is_published=1 OR n.is_published IS NULL ORDER BY n.updated_at DESC LIMIT 50'
  ).all()
  return c.json({ code: 200, data: novels.results.map(n => ({...n, authorName: n.author_name, chapterCount: n.chapter_count })) })
})

// 搜索
api.get('/reader/search', async (c) => {
  const q = c.req.query('q') || ''
  const db = c.env.DB
  const novels = await db.prepare(
    `SELECT n.*, u.nickname as author_name FROM novel n JOIN users u ON n.user_id=u.id
     WHERE (n.is_published=1 OR n.is_published IS NULL)
     AND (n.title LIKE ? OR n.description LIKE ? OR n.tags LIKE ? OR u.nickname LIKE ? OR u.username LIKE ?)
     ORDER BY n.updated_at DESC LIMIT 30`
  ).bind(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`).all()
  return c.json({ code: 200, data: novels.results.map(n => ({...n, authorName: n.author_name, chapterCount: n.chapter_count })) })
})

// 分类浏览
api.get('/reader/genre/:genre', async (c) => {
  const g = c.req.param('genre')
  const db = c.env.DB
  const novels = await db.prepare(
    'SELECT n.*, u.nickname as author_name FROM novel n JOIN users u ON n.user_id=u.id WHERE (n.is_published=1 OR n.is_published IS NULL) AND n.genre=? ORDER BY updated_at DESC LIMIT 30'
  ).bind(g).all()
  return c.json({ code: 200, data: novels.results.map(n => ({...n, authorName: n.author_name, chapterCount: n.chapter_count })) })
})

// 分类列表
api.get('/reader/genres', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare('SELECT DISTINCT genre FROM novel WHERE genre IS NOT NULL AND (is_published=1 OR is_published IS NULL)').all()
  return c.json({ code: 200, data: rows.results.map(r => r.genre) })
})

// 小说详情（公开）
api.get('/reader/novel/:id', async (c) => {
  const db = c.env.DB
  const novel = await db.prepare('SELECT * FROM novel WHERE id=?').bind(c.req.param('id')).first()
  if (!novel) return c.json({ code: 400, message: '小说不存在' })
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
  const uid = c.get('jwtPayload').userId
  const { title, description, genre, status, coverImage, tags } = await c.req.json()
  const db = c.env.DB
  await db.prepare(
    'UPDATE novel SET title=COALESCE(?,title),description=COALESCE(?,description),genre=COALESCE(?,genre),status=COALESCE(?,status),cover_image=COALESCE(?,cover_image),tags=COALESCE(?,tags),updated_at=? WHERE id=? AND user_id=?'
  ).bind(title, description, genre, status, coverImage, tags, now(), c.req.param('id'), uid).run()
  const novel = await db.prepare('SELECT * FROM novel WHERE id=?').bind(c.req.param('id')).first()
  return c.json({ code: 200, data: novel })
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
    const db = c.env.DB
    const novel = await db.prepare('SELECT * FROM novel WHERE id=?').bind(novelId).first()
    if (!novel) return c.json({ code: 400, message: '小说不存在' })
    // 创建大纲章节
    const max = await db.prepare('SELECT MAX(chapter_number) as m FROM chapter WHERE novel_id=?').bind(novelId).first()
    const num = (max?.m||0) + 1
    const title = `【大纲】${novel.title}`
    const result = await db.prepare(
      'INSERT INTO chapter(novel_id,chapter_number,title,content) VALUES(?,?,?,?)'
    ).bind(novelId, num, title, 'AI 生成中...').run()

    // 调用 AI（同步生成）
    let provider = await db.prepare('SELECT * FROM model_provider WHERE id=?').bind(providerId||1).first()
    if (!provider) {
      const def = await db.prepare('SELECT * FROM model_provider WHERE is_default=1 LIMIT 1').first()
      if (!def) return c.json({ code: 400, message: '请先配置模型服务商' })
      provider = def
    }

    const aiResp = await fetch(provider.base_url + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.api_key}` },
      body: JSON.stringify({
        model: provider.model_name,
        messages: [{ role: 'user', content: prompt || '请为小说生成详细大纲' }],
        temperature: 0.8, max_tokens: 4096
      })
    })
    const aiJson = await aiResp.json()
    const content = aiJson?.choices?.[0]?.message?.content || '大纲生成失败'

    await db.prepare('UPDATE chapter SET content=?,word_count=? WHERE id=?').bind(content, content.length, result.meta.last_row_id).run()
    await db.prepare('UPDATE novel SET chapter_count=chapter_count+1 WHERE id=?').bind(novelId).run()

    const chapter = await db.prepare('SELECT * FROM chapter WHERE id=?').bind(result.meta.last_row_id).first()
    return c.json({ code: 200, data: chapter })
  } catch(e) { return c.json({ code: 400, message: e.message }) }
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
