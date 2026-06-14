<template>
  <div class="novel-list">
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px;">
        <el-button text @click="$router.push('/writer/dashboard')" class="back-btn-mob">← 返回</el-button>
        <h2>我的小说</h2>
      </div>
      <el-button type="primary" @click="$router.push('/writer/novel/create')">+ 创建新小说</el-button>
    </div>
    <div class="book-grid" v-loading="loading">
      <div class="book-card" v-for="novel in novels" :key="novel.id" @click="$router.push(`/writer/novel/${novel.id}`)">
        <div class="book-cover">
          <img v-if="novel.coverImage" :src="novel.coverImage" />
          <span v-else>{{ novel.title?.charAt(0) }}</span>
        </div>
        <div class="book-body">
          <h3>{{ novel.title }}</h3>
          <div class="meta-row">
            <span class="tag">{{ novel.genre || '未分类' }}</span>
            <span class="chapters">{{ novel.chapterCount || 0 }}章</span>
          </div>
          <div class="status-row">
            <span class="status">{{ statusLabel(novel.status) }}</span>
          </div>
        </div>
      </div>
    </div>
    <el-empty v-if="!loading && novels.length === 0" description="还没有创作任何小说">
      <el-button type="primary" @click="$router.push('/writer/novel/create')">开始创作</el-button>
    </el-empty>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { novelApi } from '@/api'
const loading=ref(false),novels=ref([])
const statusLabel=(s)=>({DRAFT:'草稿',ONGOING:'连载中',COMPLETED:'已完成',ABANDONED:'弃坑'}[s]||s)
onMounted(async()=>{loading.value=true;try{const r=await novelApi.list();if(r.code===200)novels.value=r.data}finally{loading.value=false}})
</script>
<style scoped>
.novel-list { max-width:1200px; margin:0 auto; padding:0 16px; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
.page-header h2 { font-family:var(--font-display); font-size:24px; }
.status-row { margin-top:6px; }
.status { font-size:11px; color:var(--text-muted); background:#f0ede6; padding:2px 8px; border-radius:3px; }
.meta-row { display:flex; gap:6px; align-items:center; }
.chapters { font-size:11px; color:var(--text-muted); }
.back-btn-mob { display: none; }
@media (max-width: 768px) {
  .back-btn-mob { display: inline-flex; font-size: 14px; }
  .page-header { flex-wrap: wrap; }
}
</style>
