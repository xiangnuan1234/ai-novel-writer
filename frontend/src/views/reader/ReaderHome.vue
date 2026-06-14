<template>
  <div class="reader-home">
    <header class="hero">
      <h1>字里行间，自有天地</h1>
      <p class="subtitle">AI 与作者共创的文学世界</p>
      <div class="search-wrap">
        <input v-model="keyword" placeholder="搜索书名、笔名..." @keyup.enter="doSearch" />
        <button @click="doSearch" class="search-btn">→</button>
      </div>
    </header>

    <nav class="genre-nav">
      <button :class="{ active: !activeGenre }" @click="filterGenre('')">全部作品</button>
      <button v-for="g in genres" :key="g" :class="{ active: activeGenre === g }" @click="filterGenre(g)">{{ g }}</button>
      <button v-if="token" :class="{ active: activeGenre === 'followed' }" @click="filterGenre('followed')" style="border-color:var(--accent);">★ 关注更新</button>
    </nav>

    <section class="books" v-loading="loading">
      <h2>{{ activeGenre || '推荐' }}</h2>
      <div class="book-grid">
        <div class="book-card" v-for="book in novels" :key="book.id" @click="$router.push(`/read/${book.id}`)">
          <div class="book-cover">
            <img v-if="book.coverImage" :src="book.coverImage" />
            <span v-else>{{ book.title?.charAt(0) }}</span>
          </div>
          <div class="book-body">
            <h3>{{ book.title }}</h3>
            <div class="author">{{ book.authorName }}</div>
            <div class="book-tags">
              <span class="tag">{{ book.genre }}</span>
              <span class="chapters">{{ book.chapterCount||0 }}章</span>
            </div>
          </div>
        </div>
      </div>
      <div class="empty" v-if="!loading && !novels.length">还没有作品发布，去写作后台创建第一本吧</div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
const loading=ref(false),keyword=ref(''),activeGenre=ref(''),novels=ref([]),genres=ref([])
const token = !!localStorage.getItem('token')
const load=async()=>{
  loading.value=true
  try {
    let r
    if (activeGenre.value === 'followed') {
      r = await request.get('/reader/followed-novels')
    } else if (activeGenre.value) {
      r = await request.get(`/reader/genre/${activeGenre.value}`)
    } else {
      r = await request.get('/reader/browse')
    }
    if (r.code===200) novels.value = r.data
  } finally { loading.value=false }
}
const doSearch=async()=>{if(!keyword.value.trim()){load();return}loading.value=true;try{const r=await request.get('/reader/search',{params:{q:keyword.value}});if(r.code===200)novels.value=r.data}finally{loading.value=false}}
const filterGenre=g=>{activeGenre.value=g;load()}
onMounted(async()=>{try{const r=await request.get('/reader/genres');if(r.code===200)genres.value=r.data}catch(e){};load()})
</script>

<style scoped>
.reader-home { padding-bottom:60px; }
.hero { text-align:center; padding:60px 16px 44px; background:var(--primary); color:#fff; }
.hero h1 { font-family:var(--font-display); font-size:40px; font-weight:900; margin-bottom:12px; letter-spacing:-0.03em; }
.subtitle { font-size:15px; color:rgba(255,255,255,.65); margin-bottom:28px; }
.search-wrap { display:flex; max-width:460px; margin:0 auto; background:rgba(255,255,255,.12); border-radius:var(--radius); overflow:hidden; border:1px solid rgba(255,255,255,.15); }
.search-wrap input { flex:1; border:none; padding:14px 20px; font-size:15px; background:transparent; color:#fff; outline:none; font-family:var(--font-body); }
.search-wrap input::placeholder { color:rgba(255,255,255,.4); }
.search-btn { border:none; background:var(--accent); color:#fff; padding:0 24px; font-size:20px; cursor:pointer; transition:var(--transition); }
.search-btn:hover { background:var(--accent-dark); }
.genre-nav { display:flex; flex-wrap:wrap; gap:6px; padding:20px 16px; max-width:1200px; margin:0 auto; }
.genre-nav button { padding:6px 16px; border:1px solid var(--border); border-radius:20px; background:var(--surface); cursor:pointer; font-size:13px; transition:var(--transition); font-family:var(--font-body); }
.genre-nav button.active,.genre-nav button:hover { background:var(--accent); color:#fff; border-color:var(--accent); }
.books { max-width:1200px; margin:0 auto; padding:0 16px; }
.books h2 { font-family:var(--font-display); font-size:20px; margin-bottom:20px; }
.empty { text-align:center; padding:60px 0; color:var(--text-muted); font-size:14px; }
@media(max-width:768px){ .hero h1 { font-size:26px; } .hero { padding:40px 12px 32px; } }
@media(max-width:480px){ .hero h1 { font-size:20px; } }
</style>
