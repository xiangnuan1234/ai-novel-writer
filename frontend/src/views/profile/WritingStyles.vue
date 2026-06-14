<template>
  <div class="styles-page">
    <div class="page-header">
      <div>
        <el-button text @click="$router.push('/writer/dashboard')" class="back-btn-mob">← 返回</el-button>
        <h2>写作风格预设</h2>
        <p class="subtitle">创建多套写作风格，创建小说时选择一套，AI 将按该风格生成内容</p>
      </div>
      <el-button type="primary" @click="openAdd">
        <el-icon><Plus /></el-icon>新增风格
      </el-button>
    </div>

    <el-row :gutter="20" v-loading="loading">
      <el-col :span="8" v-for="style in styles" :key="style.id">
        <el-card shadow="hover" class="style-card" :class="{ 'is-default': style.isDefault }">
          <template #header>
            <div class="card-header">
              <span class="style-name">{{ style.name }}</span>
              <el-tag v-if="style.isDefault" type="success" size="small">默认</el-tag>
            </div>
          </template>
          <div class="style-detail" v-if="style.writingStyleDesc">
            <span class="label">写作风格：</span>{{ style.writingStyleDesc }}
          </div>
          <div class="style-detail" v-if="style.tone">
            <span class="label">语调：</span>{{ style.tone }}
          </div>
          <div class="style-detail" v-if="style.genrePreferences">
            <span class="label">题材：</span>{{ style.genrePreferences }}
          </div>
          <div class="style-detail" v-if="style.writingPreferences">
            <span class="label">偏好：</span>{{ style.writingPreferences }}
          </div>
          <div class="style-actions">
            <el-button text type="primary" size="small" @click="openEdit(style)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="handleDelete(style.id)">
              <template #reference>
                <el-button text type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="!loading && styles.length === 0" description="还没有创建写作风格预设">
      <el-button type="primary" @click="openAdd">创建第一个风格</el-button>
    </el-empty>

    <!-- Add/Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑风格' : '新增风格'" width="560px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="风格名称" required>
          <el-input v-model="form.name" placeholder="如：古风诗意、现代简洁" maxlength="50" />
        </el-form-item>
        <el-form-item label="写作风格">
          <el-input v-model="form.writingStyleDesc" type="textarea" :rows="2"
            placeholder="如：擅长细腻环境描写、注重人物心理刻画" />
        </el-form-item>
        <el-form-item label="语调文风">
          <el-select v-model="form.tone" style="width:100%" clearable>
            <el-option v-for="t in tones" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="题材偏好">
          <el-select v-model="genreList" multiple filterable allow-create style="width:100%" placeholder="选择或输入题材">
            <el-option v-for="g in genreOptions" :key="g" :label="g" :value="g" />
          </el-select>
        </el-form-item>
        <el-form-item label="创作偏好">
          <el-input v-model="form.writingPreferences" type="textarea" :rows="2"
            placeholder="如：偏爱第一人称、多线叙事、大量对话" />
        </el-form-item>
        <el-form-item label="角色塑造">
          <el-input v-model="form.characterStyle" type="textarea" :rows="2"
            placeholder="如：注重成长弧光、角色性格鲜明" />
        </el-form-item>
        <el-form-item label="情节构建">
          <el-input v-model="form.plotStyle" type="textarea" :rows="2"
            placeholder="如：层层递进、善于设置悬念和反转" />
        </el-form-item>
        <el-form-item label="其他设置">
          <el-input v-model="form.otherSettings" type="textarea" :rows="2"
            placeholder="其他要求..." />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { styleApi } from '@/api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref(null)
const styles = ref([])
const genreList = ref([])

const tones = ['轻松幽默', '严肃深沉', '文艺优美', '简洁明快', '华丽绚烂', '朴实自然', '冷峻犀利', '温暖治愈', '沉稳内敛']
const genreOptions = ['玄幻', '仙侠', '都市', '言情', '历史', '科幻', '悬疑', '武侠', '奇幻', '游戏', '轻小说']

const defaultForm = {
  name: '', writingStyleDesc: '', tone: '', writingPreferences: '',
  characterStyle: '', plotStyle: '', otherSettings: '', isDefault: false
}
const form = reactive({ ...defaultForm })

watch(() => form.isDefault, (val) => {
  if (val) styles.value.forEach(s => s.isDefault = false)
})

const loadStyles = async () => {
  loading.value = true
  try {
    const res = await styleApi.list()
    if (res.code === 200) styles.value = res.data
  } finally { loading.value = false }
}

const openAdd = () => {
  isEdit.value = false; editingId.value = null
  Object.assign(form, defaultForm); genreList.value = []
  dialogVisible.value = true
}

const openEdit = (style) => {
  isEdit.value = true; editingId.value = style.id
  form.name = style.name; form.writingStyleDesc = style.writingStyleDesc || ''
  form.tone = style.tone || ''; form.writingPreferences = style.writingPreferences || ''
  form.characterStyle = style.characterStyle || ''; form.plotStyle = style.plotStyle || ''
  form.otherSettings = style.otherSettings || ''; form.isDefault = style.isDefault || false
  genreList.value = style.genrePreferences ? style.genrePreferences.split(',').filter(Boolean) : []
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.name) { ElMessage.warning('请输入风格名称'); return }
  saving.value = true
  try {
    const data = { ...form, genrePreferences: genreList.value.join(',') }
    const res = isEdit.value
      ? await styleApi.update(editingId.value, data)
      : await styleApi.create(data)
    if (res.code === 200) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      await loadStyles()
    }
  } finally { saving.value = false }
}

const handleDelete = async (id) => {
  try {
    await styleApi.delete(id)
    ElMessage.success('删除成功')
    await loadStyles()
  } catch (e) { console.error(e) }
}

onMounted(loadStyles)
</script>

<style scoped>
.styles-page { max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-header h2 { font-size: 24px; color: #303133; margin-bottom: 6px; }
.subtitle { color: #909399; font-size: 14px; }
.style-card { margin-bottom: 16px; position: relative; }
.style-card.is-default { border-color: #67c23a; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.style-name { font-size: 16px; font-weight: 600; }
.style-detail { font-size: 13px; color: #606266; margin-bottom: 6px; line-height: 1.6; }
.style-detail .label { color: #909399; }
.style-actions { margin-top: 12px; padding-top: 12px; border-top: 1px solid #ebeef5; display: flex; gap: 8px; }
.back-btn-mob { display:none; }
@media (max-width:768px) { .back-btn-mob { display:inline-flex; } }
</style>
