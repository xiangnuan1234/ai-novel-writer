<template>
  <div class="login-page">
    <div class="card-wrapper">
      <h1>文渊</h1>
      <p class="sub">AI 驱动的文学创作平台</p>
      <el-form ref="f" :model="form" :rules="rules" label-width="0" size="large" @keyup.enter="handleLogin">
        <el-form-item prop="username"><el-input v-model="form.username" placeholder="用户名" /></el-form-item>
        <el-form-item prop="password"><el-input v-model="form.password" type="password" placeholder="密码" show-password /></el-form-item>
        <el-button type="primary" :loading="loading" class="submit" @click="handleLogin">登录</el-button>
      </el-form>
      <div class="alt">没有账号？<router-link to="/register">注册</router-link></div>
    </div>
  </div>
</template>
<script setup>
import {ref,reactive} from 'vue';import {useRouter} from 'vue-router';import {useUserStore} from '@/stores/user'
const router=useRouter();const userStore=useUserStore();const loading=ref(false)
const form=reactive({username:'',password:''})
const rules={username:[{required:true,message:'请输入用户名'}],password:[{required:true,message:'请输入密码'}]}
const handleLogin=async()=>{if(!await document.querySelector('form').reportValidity())return;loading.value=true
try{const ok=await userStore.login(form);if(ok){const role=userStore.userInfo.role||'READER';router.push(role==='AUTHOR'?'/writer/dashboard':'/reader')}}finally{loading.value=false}}
</script>
<style scoped>
.login-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--primary); }
.card-wrapper { width:380px; background:var(--surface); padding:40px 36px; border-radius:var(--radius-lg); box-shadow:0 20px 60px rgba(0,0,0,.2); }
h1 { font-family:var(--font-display); font-size:32px; text-align:center; color:var(--accent); margin-bottom:4px; }
.sub { text-align:center; color:var(--text-muted); font-size:13px; margin-bottom:28px; }
.submit { width:100%; margin-top:4px; background:var(--accent)!important; border-color:var(--accent)!important; }
.alt { text-align:center; margin-top:16px; font-size:13px; color:var(--text-muted); }
.alt a { color:var(--accent); text-decoration:none; }
@media(max-width:480px){ .card-wrapper { width:90%; padding:28px 24px; } }
</style>
