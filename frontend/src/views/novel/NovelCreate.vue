<template>
  <div class="novel-create">
    <div class="page-header"><h2>创建新小说</h2></div>
    <div class="card form-card">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" size="large">
        <el-row :gutter="24">
          <el-col :span="16">
            <el-form-item label="小说名称" prop="title">
              <el-input v-model="form.title" placeholder="给你的小说取个名字" maxlength="100" />
            </el-form-item>
            <el-form-item label="题材类型" prop="genre">
              <el-select v-model="form.genre" placeholder="选择题材" style="width:100%">
                <el-option v-for="g in genres" :key="g" :label="g" :value="g" />
              </el-select>
            </el-form-item>
            <el-form-item label="写作风格" prop="styleId">
              <el-select v-model="form.styleId" placeholder="选择风格预设" style="width:100%" clearable>
                <el-option v-for="s in styles" :key="s.id" :label="s.name+(s.isDefault?' (默认)':'')" :value="s.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="标签">
              <el-input v-model="form.tags" placeholder="如：热血, 穿越, 系统流（逗号分隔）" />
            </el-form-item>
            <el-form-item label="简介">
              <el-input v-model="form.description" type="textarea" :rows="4" placeholder="写下小说的简介..." maxlength="500" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <div class="cover-upload">
              <div class="cover-preview" @click="triggerUpload">
                <img v-if="coverUrl" :src="coverUrl" />
                <div v-else class="cover-placeholder">
                  <el-icon :size="40"><Plus /></el-icon>
                  <p>添加封面</p>
                </div>
              </div>
              <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
              <p class="hint">{{ uploading ? '上传中...' : '点击上传封面图片' }}</p>
            </div>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">创建小说</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { novelApi, styleApi } from '@/api'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const router = useRouter(); const formRef = ref(null); const fileInput = ref(null)
const submitting = ref(false); const uploading = ref(false)
const styles = ref([]); const coverUrl = ref('')

const genres = ['玄幻','仙侠','都市','言情','历史','科幻','悬疑','武侠','奇幻','游戏','轻小说','末世','无限流']
const form = reactive({ title:'', genre:'', styleId:null, tags:'', description:'' })
const rules = {
  title: [{ required: true, message: '请输入小说名称', trigger: 'blur' }],
  genre: [{ required: true, message: '请选择题材', trigger: 'change' }]
}

const triggerUpload = () => fileInput.value?.click()

const handleFile = async (e) => {
  const file = e.target.files?.[0]; if (!file) return
  uploading.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const res = await request.post('/upload/cover', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.code === 200) coverUrl.value = res.data
  } finally { uploading.value = false }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  if (!(await formRef.value.validate().catch(()=>false))) return
  submitting.value = true
  try {
    const res = await novelApi.create({ ...form, coverImage: coverUrl.value })
    if (res.code === 200) { ElMessage.success('创建成功'); router.push(`/writer/novel/${res.data.id}`) }
  } finally { submitting.value = false }
}

onMounted(async () => {
  try { const r = await styleApi.list(); if (r.code===200) styles.value = r.data } catch(e){}
})
</script>

<style scoped>
.novel-create { max-width: 960px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { font-size: 24px; }
.form-card { padding: 8px; }
.cover-upload { text-align: center; }
.cover-preview { width: 100%; aspect-ratio: 3/4; border-radius: 12px; overflow: hidden; cursor: pointer; background: #f5f6fa; display: flex; align-items: center; justify-content: center; border: 2px dashed #dcdfe6; transition: all .2s; }
.cover-preview:hover { border-color: var(--primary, #6c5ce7); }
.cover-preview img { width: 100%; height: 100%; object-fit: cover; }
.cover-placeholder { color: #909399; text-align: center; }
.cover-placeholder p { margin-top: 8px; font-size: 13px; }
.hint { font-size: 12px; color: #909399; margin-top: 8px; }
@media (max-width:768px) { .page-header h2 { font-size: 20px; } }
</style>
