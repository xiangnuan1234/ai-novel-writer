<template>
  <div class="reader-novel" v-loading="loading">
    <div class="back-btn" @click="$router.push('/reader')">← 返回</div>
    <template v-if="novel">
      <div class="novel-header">
        <div class="cover-area">
          <div class="cover"><span v-if="!novel.coverImage">{{ novel.title?.charAt(0) }}</span><img v-else :src="novel.coverImage" /></div>
        </div>
        <div class="info">
          <h2>{{ novel.title }}</h2>
          <p class="author-line">作者 ID: {{ novel.userId }}</p>
          <div class="tags"><el-tag size="small">{{ novel.genre }}</el-tag></div>
          <p class="desc">{{ novel.description }}</p>
          <div class="stats">{{ novel.chapterCount }}章 · {{ novel.wordCount || 0 }}字</div>
          <div class="actions">
            <el-button type="primary" @click="startRead">开始阅读</el-button>
            <el-button :type="bookmarked ? 'warning' : ''" @click="toggleBookmark">{{ bookmarked ? '★ 已收藏' : '☆ 收藏' }}</el-button>
            <el-button :type="following ? 'success' : ''" @click="toggleFollow">{{ following ? '✓ 已关注' : '+ 关注作者' }}</el-button>
          </div>
        </div>
      </div>

      <div class="chapter-section">
        <h3>目录</h3>
        <div class="chapter-list">
          <div class="chapter-item" v-for="(ch, i) in chapters" :key="ch.id" @click="$router.push(`/read/${novelId}/chapter/${ch.id}`)">
            <span class="ch-num">{{ i + 1 }}</span>
            <span class="ch-title">{{ ch.title }}</span>
            <span class="ch-info">{{ ch.wordCount || 0 }}字 · {{ ch.status === 'COMPLETED' ? '已完成' : '草稿' }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'

const route = useRoute(); const router = useRouter()
const novelId = Number(route.params.id)
const loading = ref(false)
const novel = ref(null)
const chapters = ref([])
const bookmarked = ref(false)
const following = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const [nr, cr] = await Promise.all([
      request.get(`/reader/novel/${novelId}`),
      request.get(`/chapter/list/${novelId}`)
    ])
    if (nr.code === 200) { novel.value = nr.data.novel; document.title = nr.data.novel.title }
    if (cr.code === 200) chapters.value = cr.data.filter(c => !c.title?.includes('大纲'))
    try { const br = await request.get(`/reader/bookmark/${novelId}`); bookmarked.value = br.data }
      catch(e){}
  } finally { loading.value = false }
})

const startRead = () => { if (chapters.value.length) router.push(`/read/${novelId}/chapter/${chapters.value[0].id}`) }

const toggleBookmark = async () => {
  try { const r = await request.post(`/reader/bookmark/${novelId}`); bookmarked.value = r.data }
  catch(e){}
}

const toggleFollow = async () => {
  try { const r = await request.post(`/reader/follow/${novel.value.userId}`); following.value = r.data }
  catch(e){}
}
</script>

<style scoped>
.reader-novel { max-width: 800px; margin: 0 auto; padding: 16px; }
.back-btn { color: #409eff; cursor: pointer; margin-bottom: 20px; font-size: 14px; }
.novel-header { display: flex; gap: 24px; margin-bottom: 32px; }
.cover { width: 140px; height: 190px; background: linear-gradient(135deg, #e8f4ff, #f0f0ff); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px; color: #409eff; overflow: hidden; }
.cover img { width: 100%; height: 100%; object-fit: cover; }
.info h2 { font-size: 24px; margin-bottom: 8px; }
.author-line { color: #606266; margin-bottom: 8px; }
.tags { margin-bottom: 12px; }
.desc { color: #606266; font-size: 14px; margin-bottom: 12px; line-height: 1.6; }
.stats { color: #909399; font-size: 13px; margin-bottom: 16px; }
.actions { display: flex; gap: 12px; flex-wrap: wrap; }
.chapter-section h3 { font-size: 18px; margin-bottom: 12px; }
.chapter-item { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; cursor: pointer; gap: 12px; }
.chapter-item:hover { color: #409eff; }
.ch-num { width: 24px; height: 24px; border-radius: 50%; background: #409eff; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
.ch-title { flex: 1; font-size: 15px; }
.ch-info { color: #909399; font-size: 12px; flex-shrink: 0; }
@media (max-width: 600px) {
  .novel-header { flex-direction: column; align-items: center; text-align: center; }
  .actions { justify-content: center; }
}
</style>
