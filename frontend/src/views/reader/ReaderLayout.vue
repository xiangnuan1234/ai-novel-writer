<template>
  <div class="reader-layout">
    <header class="top-nav">
      <div class="nav-inner">
        <span class="brand" @click="$router.push('/reader')">文渊</span>
        <nav class="links">
          <router-link to="/reader">发现</router-link>
          <router-link v-if="token" to="/bookmarks">书架</router-link>
          <router-link v-if="token" to="/writer/dashboard">写作</router-link>
          <router-link v-if="!token" to="/login">登录</router-link>
          <router-link v-if="!token" to="/register">注册</router-link>
        </nav>
      </div>
    </header>
    <main class="main"><router-view /></main>
    <footer class="ft">© 2026 文渊 · AI 小说平台</footer>
  </div>
</template>
<script setup>
const token = !!localStorage.getItem('token')
</script>
<style scoped>
.reader-layout { min-height:100vh; display:flex; flex-direction:column; background:var(--bg); }
.top-nav { background:var(--surface); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:100; backdrop-filter:blur(8px); }
.nav-inner { max-width:1200px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; padding:0 20px; height:52px; }
.brand { font-family:var(--font-display); font-size:22px; font-weight:900; color:var(--accent); cursor:pointer; letter-spacing:-0.02em; }
.links { display:flex; gap:24px; }
.links a { font-size:13px; color:var(--text-muted); text-decoration:none; font-weight:500; transition:var(--transition); }
.links a:hover,.links a.router-link-active { color:var(--accent); }
.main { flex:1; }
.ft { text-align:center; padding:16px; font-size:12px; color:var(--text-muted); opacity:.5; }
@media(max-width:768px){ .brand { font-size:18px; } .links { gap:14px; } }
</style>
