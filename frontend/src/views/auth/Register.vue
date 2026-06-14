<template>
  <div class="register-container">
    <div class="register-card">
      <h2 class="title">创建账号</h2>
      <p class="subtitle">加入 AI 小说创作平台</p>
      <div class="role-select">
        <div class="role-option" :class="{ active: registerForm.role === 'READER' }" @click="registerForm.role = 'READER'">
          <div class="role-icon">📖</div>
          <div class="role-label">读者</div>
          <div class="role-desc">浏览、阅读、收藏小说</div>
        </div>
        <div class="role-option" :class="{ active: registerForm.role === 'AUTHOR' }" @click="registerForm.role = 'AUTHOR'">
          <div class="role-icon">✍️</div>
          <div class="role-label">作者</div>
          <div class="role-desc">创作、发布、AI写作</div>
        </div>
      </div>
      <el-form
        ref="formRef"
        :model="registerForm"
        :rules="rules"
        label-width="0"
        size="large"
        @keyup.enter="handleRegister"
      >
        <el-form-item prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="用户名"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="email">
          <el-input
            v-model="registerForm.email"
            placeholder="邮箱（选填）"
            :prefix-icon="Message"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="确认密码"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            class="submit-btn"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-link">
        已有账号？<router-link to="/login">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Message } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref(null)
const loading = ref(false)

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'READER'
})

const validatePass2 = (rule, value, callback) => {
  if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度需在3-50之间', trigger: 'blur' }
  ],
  email: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validatePass2, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const success = await userStore.register({
      username: registerForm.username,
      password: registerForm.password,
      email: registerForm.email || undefined,
      role: registerForm.role
    })
    if (success) {
      const role = registerForm.role || 'READER'
      router.push(role === 'AUTHOR' ? '/writer/dashboard' : '/reader')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.register-card {
  width: 420px;
  padding: 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}
.title {
  text-align: center;
  font-size: 28px;
  color: #303133;
  margin-bottom: 8px;
}
.subtitle {
  text-align: center;
  color: #909399;
  margin-bottom: 32px;
  font-size: 14px;
}
.submit-btn {
  width: 100%;
}
.login-link {
  text-align: center;
  font-size: 14px;
  color: #909399;
}
.login-link a {
  color: #409eff;
  text-decoration: none;
}
.role-select { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
.role-option { border: 2px solid #e8e8f0; border-radius: 12px; padding: 16px; text-align: center; cursor: pointer; transition: all .2s; }
.role-option:hover { border-color: #a29bfe; }
.role-option.active { border-color: #6c5ce7; background: #f8f7ff; }
.role-icon { font-size: 28px; margin-bottom: 6px; }
.role-label { font-size: 15px; font-weight: 600; color: #303133; margin-bottom: 4px; }
.role-desc { font-size: 12px; color: #909399; }
</style>
