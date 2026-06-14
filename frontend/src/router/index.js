import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login', name: 'Login',
    component: () => import('../views/auth/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register', name: 'Register',
    component: () => import('../views/auth/Register.vue'),
    meta: { requiresAuth: false }
  },
  // === 读者端（独立布局） ===
  {
    path: '/',
    component: () => import('../views/reader/ReaderLayout.vue'),
    children: [
      { path: 'reader', name: 'ReaderHome', component: () => import('../views/reader/ReaderHome.vue'), meta: { requiresAuth: false } },
      { path: 'read/:id', name: 'ReaderNovel', component: () => import('../views/reader/ReaderNovel.vue'), meta: { requiresAuth: false } },
      { path: 'read/:novelId/chapter/:chapterId', name: 'ReaderChapter', component: () => import('../views/reader/ReaderChapter.vue'), meta: { requiresAuth: false } },
      { path: 'bookmarks', name: 'Bookmarks', component: () => import('../views/reader/ReaderBookmarks.vue'), meta: { requiresAuth: true } },
      { path: 'follows', name: 'Follows', component: () => import('../views/reader/ReaderFollows.vue'), meta: { requiresAuth: true } },
      { path: '', redirect: '/reader' }
    ]
  },
  // === 作家端（侧边栏布局） ===
  {
    path: '/writer',
    component: () => import('../views/layout/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/layout/Dashboard.vue') },
      { path: 'novel', name: 'NovelList', component: () => import('../views/novel/NovelList.vue') },
      { path: 'novel/create', name: 'CreateNovel', component: () => import('../views/novel/NovelCreate.vue') },
      { path: 'novel/:id', name: 'NovelDetail', component: () => import('../views/novel/NovelDetail.vue') },
      { path: 'novel/:novelId/chapter/:chapterId', name: 'ChapterEdit', component: () => import('../views/chapter/ChapterEdit.vue') },
      { path: 'profile', name: 'Profile', component: () => import('../views/profile/AuthorProfile.vue') },
      { path: 'styles', name: 'WritingStyles', component: () => import('../views/profile/WritingStyles.vue') },
      { path: 'providers', name: 'Providers', component: () => import('../views/provider/ModelProviders.vue') }
    ]
  }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth !== false && !token) {
    next('/login')
  } else if ((to.name === 'Login' || to.name === 'Register') && token) {
    next('/reader')
  } else {
    next()
  }
})

export default router
