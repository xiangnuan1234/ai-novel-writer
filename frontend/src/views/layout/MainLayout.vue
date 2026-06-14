<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar" :class="{ 'mobile-open': showMobileMenu }">
      <div class="logo" @click="$router.push('/reader')">文渊</div>
      <el-menu :default-active="activeMenu" :collapse="isCollapse" background-color="#2c2416" text-color="#c4b99a" active-text-color="#c8952c" router @select="showMobileMenu=false">
        <el-menu-item index="/reader" style="background:#2d2d2d;font-weight:bold;"><el-icon><Reading /></el-icon><template #title>读者大厅</template></el-menu-item>
        <el-menu-item index="/writer/dashboard" style="margin-top:8px;"><el-icon><HomeFilled /></el-icon><template #title>工作台</template></el-menu-item>
        <el-menu-item index="/writer/novel"><el-icon><Document /></el-icon><template #title>我的小说</template></el-menu-item>
        <el-menu-item index="/writer/styles"><el-icon><EditPen /></el-icon><template #title>写作风格</template></el-menu-item>
        <el-menu-item index="/writer/profile"><el-icon><UserFilled /></el-icon><template #title>我的资料</template></el-menu-item>
        <el-menu-item index="/writer/providers"><el-icon><Setting /></el-icon><template #title>模型服务商</template></el-menu-item>
      </el-menu>
    </el-aside>
    <div v-if="showMobileMenu" class="overlay" @click="showMobileMenu=false"></div>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" :size="20" @click="isCollapse=!isCollapse"><Fold v-if="!isCollapse"/><Expand v-else/></el-icon>
          <el-icon class="hamburger-btn" :size="22" @click="showMobileMenu=!showMobileMenu"><Menu/></el-icon>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click">
            <span class="user-info"><el-avatar :size="32" icon="UserFilled"/><span class="username">{{ userStore.nickname||userStore.username }}</span></span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="$router.push('/writer/profile')"><el-icon><UserFilled/></el-icon>我的资料</el-dropdown-item>
                <el-dropdown-item @click="$router.push('/writer/providers')"><el-icon><Setting/></el-icon>模型设置</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout"><el-icon><SwitchButton/></el-icon>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main-content"><router-view/></el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
const route = useRoute(); const userStore = useUserStore()
const isCollapse = ref(false); const showMobileMenu = ref(false)
const activeMenu = computed(() => {
  const p = route.path
  if (p.startsWith('/writer/novel')) return '/writer/novel'
  if (p.startsWith('/writer/styles')) return '/writer/styles'
  if (p.startsWith('/writer/profile')) return '/writer/profile'
  if (p.startsWith('/writer/providers')) return '/writer/providers'
  return '/writer/dashboard'
})
const handleLogout = () => { userStore.logout() }
</script>

<style scoped>
.layout-container { height:100vh; }
.sidebar { background-color:#2c2416; transition:width .3s; overflow:hidden; z-index:300; }
.logo { height:60px; display:flex; align-items:center; justify-content:center; color:#c8952c; font-size:18px; font-weight:bold; cursor:pointer; border-bottom:1px solid #3d3220; font-family:var(--font-display); }
.header { background:#fff; border-bottom:1px solid #e4e7ed; display:flex; align-items:center; justify-content:space-between; padding:0 20px; height:60px; }
.header-left { display:flex; align-items:center; gap:12px; }
.collapse-btn { cursor:pointer; color:#606266; }
.hamburger-btn { display:none; cursor:pointer; color:#606266; }
.header-right { display:flex; align-items:center; }
.user-info { display:flex; align-items:center; gap:8px; cursor:pointer; }
.username { font-size:14px; color:#303133; }
.main-content { background-color:#f5f7fa; padding:20px; overflow-y:auto; }
.el-menu { border-right:none; }
.overlay { display:none; position:fixed; top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.3);z-index:200; }
@media (max-width:768px) {
  .sidebar { position:fixed; left:-220px; top:0; bottom:0; }
  .sidebar.mobile-open { left:0; }
  .sidebar.mobile-open + .overlay, .overlay { display:block; }
  .collapse-btn { display:none; }
  .hamburger-btn { display:block; }
  .main-content { padding:12px; }
  .username { display:none; }
}
@media (max-width:480px) {
  .header { padding:0 12px; }
}
</style>
