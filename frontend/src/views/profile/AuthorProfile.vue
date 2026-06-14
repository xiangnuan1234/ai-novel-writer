<template>
  <div class="profile-page">
    <h2>写作风格设置</h2>
    <p class="subtitle">设置您的写作风格和偏好，AI 将根据这些设定生成符合您风格的小说内容</p>

    <el-card v-loading="loading">
      <el-form :model="form" label-width="120px" size="large">
        <el-form-item label="笔名">
          <el-input v-model="form.penName" placeholder="您的笔名" maxlength="50" />
        </el-form-item>

        <el-divider content-position="left">写作风格</el-divider>

        <el-form-item label="写作风格">
          <el-input
            v-model="form.writingStyle"
            type="textarea"
            :rows="3"
            placeholder="描述您的整体写作风格，例如：喜欢细腻的环境描写、擅长刻画人物心理、文风简洁明快..."
          />
        </el-form-item>

        <el-form-item label="创作偏好">
          <el-input
            v-model="form.writingPreferences"
            type="textarea"
            :rows="3"
            placeholder="描述您的创作偏好，例如：喜欢第一人称视角、偏爱多线叙事、注重对话描写..."
          />
        </el-form-item>

        <el-form-item label="题材偏好">
          <el-select v-model="form.genrePreferences" multiple filterable allow-create default-first-option style="width: 100%">
            <el-option label="玄幻" value="玄幻" />
            <el-option label="仙侠" value="仙侠" />
            <el-option label="都市" value="都市" />
            <el-option label="言情" value="言情" />
            <el-option label="历史" value="历史" />
            <el-option label="科幻" value="科幻" />
            <el-option label="悬疑" value="悬疑" />
            <el-option label="武侠" value="武侠" />
            <el-option label="奇幻" value="奇幻" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">风格细节</el-divider>

        <el-form-item label="语调文风">
          <el-select v-model="form.tone" style="width: 100%">
            <el-option label="轻松幽默" value="轻松幽默" />
            <el-option label="严肃深沉" value="严肃深沉" />
            <el-option label="文艺优美" value="文艺优美" />
            <el-option label="简洁明快" value="简洁明快" />
            <el-option label="华丽绚烂" value="华丽绚烂" />
            <el-option label="朴实自然" value="朴实自然" />
            <el-option label="冷峻犀利" value="冷峻犀利" />
            <el-option label="温暖治愈" value="温暖治愈" />
          </el-select>
        </el-form-item>

        <el-form-item label="角色塑造">
          <el-input
            v-model="form.characterStyle"
            type="textarea"
            :rows="2"
            placeholder="描述角色塑造风格，例如：注重角色的成长弧光、擅长塑造反派、角色形象鲜明..."
          />
        </el-form-item>

        <el-form-item label="情节构建">
          <el-input
            v-model="form.plotStyle"
            type="textarea"
            :rows="2"
            placeholder="描述情节构建风格，例如：擅长设置悬念、节奏紧凑明快、层层递进..."
          />
        </el-form-item>

        <el-divider content-position="left">其他</el-divider>

        <el-form-item label="其他设置">
          <el-input
            v-model="form.otherSettings"
            type="textarea"
            :rows="3"
            placeholder="其他任何您想告诉 AI 的写作习惯和要求..."
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            保存设置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { profileApi } from '@/api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const submitting = ref(false)

const form = reactive({
  penName: '',
  writingStyle: '',
  writingPreferences: '',
  genrePreferences: [],
  tone: '',
  characterStyle: '',
  plotStyle: '',
  otherSettings: ''
})

onMounted(async () => {
  loading.value = true
  try {
    const res = await profileApi.get()
    if (res.code === 200) {
      const data = res.data
      form.penName = data.penName || ''
      form.writingStyle = data.writingStyle || ''
      form.writingPreferences = data.writingPreferences || ''
      form.genrePreferences = data.genrePreferences ? data.genrePreferences.split(',').filter(Boolean) : []
      form.tone = data.tone || ''
      form.characterStyle = data.characterStyle || ''
      form.plotStyle = data.plotStyle || ''
      form.otherSettings = data.otherSettings || ''
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

const handleSubmit = async () => {
  submitting.value = true
  try {
    const res = await profileApi.update({
      ...form,
      genrePreferences: form.genrePreferences.join(',')
    })
    if (res.code === 200) {
      ElMessage.success('保存成功')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.profile-page {
  max-width: 900px;
  margin: 0 auto;
}
.profile-page h2 {
  font-size: 24px;
  color: #303133;
  margin-bottom: 8px;
}
.subtitle {
  color: #909399;
  font-size: 14px;
  margin-bottom: 24px;
}
</style>
