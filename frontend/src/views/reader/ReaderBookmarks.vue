<template>
  <div class="shelf">
    <h2>我的书架</h2>
    <div class="book-grid" v-loading="loading">
      <div class="book-card" v-for="n in novels" :key="n.id" @click="$router.push(`/read/${n.id}`)">
        <div class="book-cover">
          <img v-if="n.coverImage" :src="n.coverImage" />
          <span v-else>{{ n.title?.charAt(0) }}</span>
        </div>
        <div class="book-body">
          <h3>{{ n.title }}</h3>
          <div class="book-tags">
            <span class="tag">{{ n.genre }}</span>
            <span class="chapters">{{ n.chapterCount }}章</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!loading && !novels.length" style="text-align:center;padding:60px;color:var(--text-muted);">书架空空，去发现好文吧</div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import request from '@/utils/request'
const loading=ref(false),novels=ref([])
onMounted(async()=>{loading.value=true;try{const r=await request.get('/reader/bookmarks');if(r.code===200)novels.value=r.data}finally{loading.value=false}})
</script>
<style scoped>
.shelf { max-width:1200px; margin:0 auto; padding:0 16px; }
.shelf h2 { font-family:var(--font-display); font-size:22px; margin-bottom:20px; }
</style>
