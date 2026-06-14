<template>
  <div class="chapter-edit" v-loading="loading">
    <div class="edit-header">
      <el-button text @click="goBack">
        <el-icon><ArrowLeft /></el-icon>返回
      </el-button>
      <div class="header-center">
        <h2 v-if="!editingTitle">{{ chapter?.title || '加载中...' }}</h2>
        <el-input
          v-else
          ref="titleInput"
          v-model="editTitle"
          size="large"
          @blur="saveTitle"
          @keyup.enter="saveTitle"
        />
        <el-button text @click="editingTitle = true" v-if="!editingTitle">
          <el-icon><Edit /></el-icon>
        </el-button>
      </div>
      <div class="header-actions">
        <el-dropdown trigger="click" v-if="providers.length > 0">
          <el-button type="primary" :loading="generating">
            <el-icon><Lightning /></el-icon>AI 生成
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="showGenerateDialog = true">生成全文</el-dropdown-item>
              <el-dropdown-item @click="showGenerateDialog = true">⚡ 流式生成</el-dropdown-item>
              <el-dropdown-item @click="showContinueDialog = true">续写内容</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="success" :loading="saving" @click="handleSave">
          <el-icon><Check /></el-icon>保存
        </el-button>
      </div>
    </div>

    <!-- Editor -->
    <div class="editor-container">
      <div v-if="streaming" class="streaming-bar">
        <el-icon class="is-loading"><Loading /></el-icon> AI 正在创作中...（可实时看到内容）
      </div>
      <el-input
        v-model="content"
        type="textarea"
        :rows="30"
        placeholder="在此编写章节内容……或使用 AI 生成"
        class="content-editor"
      />
    </div>

    <!-- Generate dialog -->
    <el-dialog v-model="showGenerateDialog" title="AI 生成章节" width="550px">
      <el-form :model="genForm" label-width="90px">
        <el-form-item label="生成模式">
          <el-radio-group v-model="genForm.streamMode">
            <el-radio-button :value="false">普通生成（等结果）</el-radio-button>
            <el-radio-button :value="true">⚡ 流式生成（边写边看）</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="章节大纲">
          <el-input
            v-model="genForm.outline"
            type="textarea"
            :rows="5"
            placeholder="输入这一章的大纲或要点（可选）"
          />
        </el-form-item>
        <el-form-item label="目标字数">
          <el-input-number v-model="genForm.wordCount" :min="500" :max="10000" :step="500" />
        </el-form-item>
        <el-form-item label="AI模型">
          <el-select v-model="genForm.providerId" style="width: 100%">
            <el-option
              v-for="p in providers"
              :key="p.id"
              :label="`${p.providerName} - ${p.modelName}`"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGenerateDialog = false">取消</el-button>
        <el-button type="primary" :loading="generating||streaming" @click="genForm.streamMode ? handleStreamGenerate() : handleGenerate()">
          {{ genForm.streamMode ? '⚡ 流式生成' : '生成' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Continue writing dialog -->
    <el-dialog v-model="showContinueDialog" title="AI 续写" width="550px">
      <el-form :model="continueForm" label-width="90px">
        <el-form-item label="续写字数">
          <el-input-number v-model="continueForm.wordCount" :min="200" :max="5000" :step="200" />
        </el-form-item>
        <el-form-item label="AI模型">
          <el-select v-model="continueForm.providerId" style="width: 100%">
            <el-option
              v-for="p in providers"
              :key="p.id"
              :label="`${p.providerName} - ${p.modelName}`"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showContinueDialog = false">取消</el-button>
        <el-button type="primary" :loading="continuing" @click="handleContinue">
          续写
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { chapterApi, providerApi, aiApi } from '@/api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const novelId = Number(route.params.novelId)
const chapterId = Number(route.params.chapterId)

const loading = ref(false)
const saving = ref(false)
const generating = ref(false)
const continuing = ref(false)
const streaming = ref(false)
const chapter = ref(null)
const content = ref('')
const providers = ref([])
const editingTitle = ref(false)
const editTitle = ref('')
const showGenerateDialog = ref(false)
const showContinueDialog = ref(false)

const genForm = reactive({
  outline: '',
  wordCount: 3000,
  providerId: null,
  streamMode: true
})

const continueForm = reactive({
  wordCount: 1000,
  providerId: null
})

const loadData = async () => {
  loading.value = true
  try {
    const [chRes, provRes] = await Promise.all([
      chapterApi.get(chapterId),
      providerApi.list()
    ])
    if (chRes.code === 200) {
      chapter.value = chRes.data
      content.value = chRes.data.content || ''
      editTitle.value = chRes.data.title
    }
    if (provRes.code === 200) {
      providers.value = provRes.data
      const defaultP = provRes.data.find(p => p.isDefault) || provRes.data[0]
      if (defaultP) {
        genForm.providerId = defaultP.id
        continueForm.providerId = defaultP.id
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push(`/writer/novel/${novelId}`)
}

const saveTitle = async () => {
  editingTitle.value = false
  if (editTitle.value && editTitle.value !== chapter.value.title) {
    try {
      await chapterApi.update(chapterId, { title: editTitle.value })
      chapter.value.title = editTitle.value
    } catch (e) {
      console.error(e)
    }
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const res = await chapterApi.update(chapterId, { content: content.value })
    if (res.code === 200) {
      chapter.value = res.data
      ElMessage.success('保存成功')
    }
  } finally {
    saving.value = false
  }
}

const handleGenerate = async () => {
  generating.value = true
  try {
    const res = await aiApi.generateChapter({
      novelId,
      chapterId,
      providerId: genForm.providerId,
      outline: genForm.outline,
      wordCount: genForm.wordCount
    })
    if (res.code === 200) {
      content.value = res.data.content || ''
      chapter.value = res.data
      showGenerateDialog.value = false
      ElMessage.success('章节生成完成')
    }
  } catch (e) {
    console.error(e)
  } finally {
    generating.value = false
  }
}

const handleContinue = async () => {
  continuing.value = true
  try {
    const res = await aiApi.continueWriting({
      chapterId,
      providerId: continueForm.providerId,
      previousContent: content.value,
      wordCount: continueForm.wordCount
    })
    if (res.code === 200) {
      content.value += '\n' + res.data
      showContinueDialog.value = false
      ElMessage.success('续写完成')
    }
  } catch (e) { console.error(e) }
  finally { continuing.value = false }
}

// ===== 流式生成 =====
const handleStreamGenerate = async () => {
  const token = localStorage.getItem('token')
  content.value = ''
  streaming.value = true

  try {
    const resp = await fetch('/api/ai/generate-chapter-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        novelId,
        chapterId,
        providerId: genForm.providerId,
        wordCount: genForm.wordCount,
        outline: genForm.outline
      })
    })

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      let currentEvent = ''
      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.substring(6).trim()
        } else if (line.startsWith('data:')) {
          const text = line.substring(5).trim()
          if (currentEvent === 'done') { /* completed, will save after loop */ }
          else if (currentEvent === 'error') { ElMessage.error(text) }
          else { content.value += text }
          currentEvent = ''
        }
      }
    }
    ElMessage.success('流式生成完成')
    await handleSave()
  } catch (e) {
    ElMessage.error('流式生成失败: ' + e.message)
  } finally {
    streaming.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.chapter-edit {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
}
.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.header-center {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}
.header-center h2 {
  font-size: 18px;
  color: #303133;
}
.header-actions {
  display: flex;
  gap: 12px;
}
.editor-container {
  flex: 1;
  overflow: hidden;
}
.content-editor {
  height: 100%;
}
.content-editor :deep(.el-textarea__inner) {
  height: 100% !important;
  min-height: 500px;
  font-size: 16px;
  line-height: 1.8;
  padding: 20px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  resize: none;
}
@media (max-width: 768px) {
  .edit-header { flex-wrap: wrap; gap: 8px; }
  .header-center { order: 3; width: 100%; }
  .header-center h2 { font-size: 14px; }
  .header-actions { gap: 6px; }
  .header-actions .el-button { padding: 6px 10px; font-size: 12px; }
  .content-editor :deep(.el-textarea__inner) { min-height: 350px; font-size: 14px; padding: 12px; }
}
.streaming-bar { padding: 8px 16px; background: #f0f5ff; border-radius: 8px; color: #409eff; font-size: 13px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
</style>
