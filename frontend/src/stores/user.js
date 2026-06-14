import { defineStore } from 'pinia'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: JSON.parse(localStorage.getItem('user') || '{}')
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    userId: (state) => state.userInfo.userId || 0,
    username: (state) => state.userInfo.username || '',
    nickname: (state) => state.userInfo.nickname || ''
  },

  actions: {
    async login(loginForm) {
      const res = await request.post('/auth/login', loginForm)
      if (res.code === 200) {
        this.token = res.data.token
        this.userInfo = res.data
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data))
        ElMessage.success('登录成功')
        return true
      }
      return false
    },

    async register(registerForm) {
      const res = await request.post('/auth/register', registerForm)
      if (res.code === 200) {
        this.token = res.data.token
        this.userInfo = res.data
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data))
        ElMessage.success('注册成功')
        return true
      }
      return false
    },

    logout() {
      this.token = ''
      this.userInfo = {}
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/reader'
    },

    async fetchUserInfo() {
      try {
        const res = await request.get('/user/info')
        if (res.code === 200) {
          this.userInfo = { ...this.userInfo, ...res.data }
        }
      } catch (e) {
        console.error('Failed to fetch user info', e)
      }
    }
  }
})
