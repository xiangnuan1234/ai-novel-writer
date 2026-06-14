<template>
  <div class="reader-view">
    <div class="top-bar">
      <span class="back" @click="$router.push(`/read/${novelId}`)">← 目录</span>
      <span class="title">{{ chapter?.title }}</span>
      <div class="nav">
        <el-button size="small" :disabled="!prevId" @click="goChapter(prevId)">上一章</el-button>
        <el-button size="small" :disabled="!nextId" @click="goChapter(nextId)">下一章</el-button>
      </div>
    </div>
    <div class="content" v-loading="loading">
      <pre v-if="chapter?.content">{{ chapter.content }}</pre>
      <el-empty v-else description="暂无内容" />
    </div>
    <div class="bottom-bar">
      <el-button size="small" :disabled="!prevId" @click="goChapter(prevId)">上一章</el-button>
      <el-button size="small" :disabled="!nextId" @click="goChapter(nextId)">下一章</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'

const route = useRoute(); const router = useRouter()
const novelId = Number(route.params.novelId)
const chapterId = Number(route.params.chapterId)
const loading = ref(false)
const chapter = ref(null)
const chapters = ref([])

const prevId = computed(() => {
  const idx = chapters.value.findIndex(c => c.id === chapterId)
  return idx > 0 ? chapters.value[idx - 1].id : null
})
const nextId = computed(() => {
  const idx = chapters.value.findIndex(c => c.id === chapterId)
  return idx < chapters.value.length - 1 ? chapters.value[idx + 1].id : null
})

const goChapter = (id) => router.push(`/read/${novelId}/chapter/${id}`)

onMounted(async () => {
  loading.value = true
  try {
    const [cr, lr] = await Promise.all([
      request.get(`/chapter/${chapterId}`),
      request.get(`/chapter/list/${novelId}`)
    ])
    if (cr.code === 200) { chapter.value = cr.data; document.title = cr.data.title }
    if (lr.code === 200) chapters.value = lr.data
    request.post('/reader/progress', { novelId, chapterId, progress: 50 }).catch(()=>{})
  } finally { loading.value = false }
})
</script>

<style scoped>
.reader-view { max-width: 720px; margin: 0 auto; padding: 16px; }
.top-bar, .bottom-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; }
.back { color: #409eff; cursor: pointer; font-size: 14px; }
.title { font-size: 16px; font-weight: 600; flex: 1; text-align: center; }
.content { padding: 24px 0; }
.content pre { font-family: 'Microsoft YaHei','PingFang SC',sans-serif; font-size: 17px; line-height: 2; white-space: pre-wrap; color: #303133; }
@media (max-width: 600px) {
  .reader-view { padding: 8px; }
  .content pre { font-size: 15px; }
}
</style>
