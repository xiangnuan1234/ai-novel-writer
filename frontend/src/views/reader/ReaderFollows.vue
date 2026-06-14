<template>
  <div class="page">
    <h2>我的关注</h2>
    <div v-loading="loading">
      <div class="author-card" v-for="a in authors" :key="a.id">
        <div class="author-info">
          <div class="avatar">{{ a.name?.charAt(0) }}</div>
          <div>
            <div class="name">{{ a.name }}</div>
            <div class="stats">{{ a.followers }} 粉丝 · {{ a.novelCount }} 部作品</div>
          </div>
        </div>
      </div>
    </div>
    <el-empty v-if="!loading && authors.length===0" description="还没有关注任何作者" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
const loading = ref(false), authors = ref([])
onMounted(async () => {
  loading.value = true
  try { const r = await request.get('/reader/follows'); if (r.code===200) authors.value = r.data }
  finally { loading.value = false }
})
</script>

<style scoped>
.page { max-width: 800px; margin: 0 auto; padding: 0 16px; }
.page h2 { font-size: 24px; margin-bottom: 20px; }
.author-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.author-info { display: flex; align-items: center; gap: 16px; }
.avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #a29bfe, #6c5ce7); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; }
.name { font-size: 16px; font-weight: 600; }
.stats { font-size: 13px; color: #909399; }
</style>
