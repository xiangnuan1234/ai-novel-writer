<template>
  <div class="novel-detail" v-loading="loading">
    <!-- Header -->
    <div class="detail-header">
      <el-button text @click="$router.push('/writer/novel')" style="font-size:16px;padding:8px 0;">
        ← 返回列表
      </el-button>
    </div>

    <template v-if="novel">
      <!-- Novel info -->
      <el-card class="info-card">
        <div class="novel-header">
          <div class="novel-cover-area">
            <div class="cover-img" v-if="novel.coverImage"><img :src="novel.coverImage" /></div>
            <div class="cover-img placeholder" v-else>{{ novel.title?.charAt(0) }}</div>
          </div>
          <div class="novel-info">
            <h2>{{ novel.title }}</h2>
            <div class="tags">
              <el-tag>{{ novel.genre || '未分类' }}</el-tag>
              <el-tag :type="statusType(novel.status)">{{ statusLabel(novel.status) }}</el-tag>
            </div>
            <p class="desc">{{ novel.description || '暂无简介' }}</p>
            <div class="stats">
              <span>{{ novel.chapterCount || 0 }} 章</span>
            </div>
          </div>
          <div class="actions">
            <el-button :type="novel.isPublished ? 'warning' : 'success'" size="small" @click="togglePublish">
              {{ novel.isPublished ? '已发布' : '发布' }}
            </el-button>
            <el-dropdown trigger="click">
              <el-button type="primary">
                <el-icon><Lightning /></el-icon>AI 创作<el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="generateOutline">
                    <el-icon><List /></el-icon>生成大纲
                  </el-dropdown-item>
                  <el-dropdown-item @click="createAndGenerate">
                    <el-icon><Plus /></el-icon>新建章节并生成
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button @click="showEditDialog = true">
              <el-icon><Edit /></el-icon>编辑信息
            </el-button>
            <el-popconfirm title="确定删除这部小说吗？" @confirm="handleDelete">
              <template #reference>
                <el-button type="danger">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </el-card>

      <!-- Chapter list -->
      <el-card class="chapter-card">
        <template #header>
          <div class="card-header">
            <span>章节列表</span>
            <el-button type="primary" size="small" @click="createAndGenerate">
              <el-icon><Plus /></el-icon>新建章节
            </el-button>
          </div>
        </template>

        <div v-if="chapters.length === 0" class="empty-chapters">
          <el-empty description="还没有章节，点击上方按钮创建">
            <el-button type="primary" @click="createAndGenerate">新建章节</el-button>
          </el-empty>
        </div>

        <div v-else class="chapter-list">
          <div
            v-for="(chapter, index) in chapters"
            :key="chapter.id"
            class="chapter-item"
            @click="$router.push(`/writer/novel/${novelId}/chapter/${chapter.id}`)"
          >
            <div class="chapter-index">{{ index + 1 }}</div>
            <div class="chapter-info">
              <div class="chapter-title">{{ chapter.title }}</div>
              <div class="chapter-meta">
                <span :class="{ 'status-draft': chapter.status === 'DRAFT', 'status-completed': chapter.status === 'COMPLETED' }">
                  {{ chapter.status === 'DRAFT' ? '草稿' : '已完成' }}
                </span>
                <span>{{ chapter.wordCount || 0 }} 字</span>
              </div>
            </div>
            <el-popconfirm title="确定删除？" @confirm.stop="handleDeleteChapter(chapter.id)">
              <template #reference>
                <el-button text type="danger" size="small" @click.stop><el-icon><Delete /></el-icon></el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </el-card>
    </template>

    <!-- Edit dialog -->
    <el-dialog v-model="showEditDialog" title="编辑小说信息" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="封面">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="cover-thumb">
              <img v-if="editForm.coverImage" :src="editForm.coverImage" style="width:60px;height:80px;object-fit:cover;border-radius:4px;" />
              <span v-else style="font-size:32px;color:#ccc;">📖</span>
            </div>
            <input ref="coverInputRef" type="file" accept="image/*" hidden @change="handleCoverChange" />
            <el-button size="small" @click="coverInputRef.click()" :loading="uploadingCover">更换封面</el-button>
          </div>
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item label="题材">
          <el-select v-model="editForm.genre" style="width: 100%">
            <el-option label="玄幻" value="玄幻" />
            <el-option label="仙侠" value="仙侠" />
            <el-option label="都市" value="都市" />
            <el-option label="言情" value="言情" />
            <el-option label="历史" value="历史" />
            <el-option label="科幻" value="科幻" />
            <el-option label="悬疑" value="悬疑" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" style="width: 100%">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="连载中" value="ONGOING" />
            <el-option label="已完成" value="COMPLETED" />
          </el-select>
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="editForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleUpdate">保存</el-button>
      </template>
    </el-dialog>

    <!-- Outline dialog -->
    <el-dialog v-model="showOutlineDialog" title="AI 生成大纲" width="600px">
      <el-form :model="outlineForm">
        <el-form-item label="提示词">
          <el-input
            v-model="outlineForm.prompt"
            type="textarea"
            :rows="6"
            placeholder="请输入对大纲的要求，比如：&#10;- 主角的成长路线&#10;- 故事的世界观设定&#10;- 想要突出的主题"
          />
        </el-form-item>
        <el-form-item v-if="providers.length > 0" label="AI模型">
          <el-select v-model="outlineForm.providerId" style="width: 100%">
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
        <el-button @click="showOutlineDialog = false">取消</el-button>
        <el-button type="primary" :loading="generatingOutline" @click="handleGenerateOutline">
          生成
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { novelApi, chapterApi, providerApi, aiApi, readerApi } from '@/api'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const novelId = Number(route.params.id)

const loading = ref(false)
const saving = ref(false)
const novel = ref(null)
const chapters = ref([])
const providers = ref([])
const showEditDialog = ref(false)
const showOutlineDialog = ref(false)
const uploadingCover = ref(false)
const coverInputRef = ref(null)

const handleCoverChange = async (e) => {
  const file = e.target.files?.[0]; if (!file) return
  uploadingCover.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const res = await request.post('/upload/cover', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.code === 200) { editForm.coverImage = res.data; novel.value.coverImage = res.data }
  } finally { uploadingCover.value = false }
}
const generatingOutline = ref(false)

const editForm = reactive({
  title: '',
  genre: '',
  status: '',
  description: ''
})

const outlineForm = reactive({
  prompt: '请为这部小说生成一份详细的大纲，包括主要角色设定、世界观、情节走向和关键转折点。',
  providerId: null
})

const statusType = (s) => ({ DRAFT: 'info', ONGOING: 'success', COMPLETED: 'primary', ABANDONED: 'danger' }[s] || 'info')
const statusLabel = (s) => ({ DRAFT: '草稿', ONGOING: '连载中', COMPLETED: '已完成', ABANDONED: '弃坑' }[s] || s)

const loadData = async () => {
  loading.value = true
  try {
    const [novelRes, chapterRes, providerRes] = await Promise.all([
      novelApi.get(novelId),
      chapterApi.list(novelId),
      providerApi.list()
    ])
    if (novelRes.code === 200) {
      novel.value = novelRes.data
      editForm.title = novelRes.data.title
      editForm.genre = novelRes.data.genre
      editForm.status = novelRes.data.status
      editForm.description = novelRes.data.description
    }
    if (chapterRes.code === 200) chapters.value = chapterRes.data
    if (providerRes.code === 200) {
      providers.value = providerRes.data
      const defaultProvider = providerRes.data.find(p => p.isDefault)
      outlineForm.providerId = defaultProvider?.id || providerRes.data[0]?.id || null
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleUpdate = async () => {
  saving.value = true
  try {
    const res = await novelApi.update(novelId, editForm)
    if (res.code === 200) {
      novel.value = res.data
      showEditDialog.value = false
      ElMessage.success('更新成功')
    }
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  try {
    const res = await novelApi.delete(novelId)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      router.push('/writer/novel')
    }
  } catch (e) {
    console.error(e)
  }
}

const generateOutline = () => {
  showOutlineDialog.value = true
}

const handleGenerateOutline = async () => {
  generatingOutline.value = true
  try {
    const res = await aiApi.generateOutline({
      novelId,
      providerId: outlineForm.providerId,
      prompt: outlineForm.prompt
    })
    if (res.code === 200) {
      showOutlineDialog.value = false
      // res.data 现在是 Chapter 对象，content 是大纲内容
      const outlineText = res.data.content || JSON.stringify(res.data)
      ElMessageBox.alert(outlineText, 'AI 生成的大纲', {
        confirmButtonText: '知道了',
        width: '700px'
      })
      // 刷新章节列表
      const chRes = await chapterApi.list(novelId)
      if (chRes.code === 200) chapters.value = chRes.data
    }
  } catch (e) {
    console.error(e)
  } finally {
    generatingOutline.value = false
  }
}

const createAndGenerate = async () => {
  const { value: title } = await ElMessageBox.prompt('请输入章节标题', '新建章节', {
    confirmButtonText: '创建',
    inputValue: `第${(chapters.value.length + 1)}章`
  }).catch(() => ({ value: null }))
  if (title === null) return
  try {
    const res = await chapterApi.create(novelId, { title, outline: '' })
    if (res.code === 200) {
      ElMessage.success('章节已创建')
      await loadData()
      router.push(`/writer/novel/${novelId}/chapter/${res.data.id}`)
    }
  } catch (e) { console.error(e) }
}

const togglePublish = async () => {
  try {
    const res = await readerApi.publish(novelId, !novel.value.isPublished)
    if (res.code === 200) { novel.value.isPublished = !novel.value.isPublished; ElMessage.success(novel.value.isPublished ? '已发布' : '已下架') }
  } catch(e){ console.error(e) }
}

const handleDeleteChapter = async (chapterId) => {
  try {
    await chapterApi.delete(chapterId)
    ElMessage.success('章节已删除')
    await loadData()
  } catch(e) { console.error(e) }
}

onMounted(loadData)
</script>

<style scoped>
.novel-detail {
  max-width: 1000px;
  margin: 0 auto;
}
.detail-header {
  margin-bottom: 16px;
}
.info-card {
  margin-bottom: 24px;
}
.novel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}
.novel-cover-area { flex-shrink: 0; }
.cover-img { width: 120px; height: 170px; border-radius: 10px; overflow: hidden; background: linear-gradient(135deg, #a29bfe, #6c5ce7); display: flex; align-items: center; justify-content: center; font-size: 44px; color: rgba(255,255,255,0.7); font-weight: bold; }
.cover-img img { width: 100%; height: 100%; object-fit: cover; }
.novel-info h2 {
  font-size: 24px;
  color: #303133;
  margin-bottom: 12px;
}
.tags {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.desc {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 12px;
}
.stats {
  color: #909399;
  font-size: 13px;
}
.actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.chapter-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid #ebeef5;
}
.chapter-item:hover {
  background: #f5f7fa;
}
.chapter-index {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  color: white;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  margin-right: 16px;
  flex-shrink: 0;
}
.chapter-info {
  flex: 1;
}
.chapter-title {
  font-size: 16px;
  color: #303133;
  margin-bottom: 4px;
}
.chapter-meta {
  font-size: 12px;
  color: #909399;
  display: flex;
  gap: 12px;
}
.status-draft { color: #e6a23c; }
.status-completed { color: #67c23a; }
.empty-chapters {
  padding: 40px 0;
}
@media (max-width: 768px) {
  .novel-header { flex-direction: column; gap: 12px; }
  .novel-cover-area { align-self: center; }
  .actions { flex-wrap: wrap; }
  .actions .el-button { font-size: 12px; padding: 6px 10px; }
  .chapter-item { font-size: 13px; }
}
</style>
