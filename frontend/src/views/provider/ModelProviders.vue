<template>
  <div class="providers-page">
    <div class="page-header">
      <div>
        <el-button text @click="$router.push('/writer/dashboard')" class="back-btn-mob">← 返回</el-button>
        <h2>模型服务商管理</h2>
        <p class="subtitle">配置 AI 模型服务商，支持 OpenAI 兼容接口 (如 DeepSeek、OpenAI、Moonshot 等)</p>
      </div>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>添加服务商
      </el-button>
    </div>

    <!-- Presets hint -->
    <el-alert
      title="常见服务商配置参考"
      type="info"
      :closable="true"
      show-icon
      class="preset-alert"
    >
      <template #default>
        <div class="preset-list">
          <div><strong>DeepSeek：</strong> https://api.deepseek.com / deepseek-chat</div>
          <div><strong>OpenAI：</strong> https://api.openai.com / gpt-4o-mini</div>
          <div><strong>Moonshot（月之暗面）：</strong> https://api.moonshot.cn / moonshot-v1-8k</div>
          <div><strong>通义千问：</strong> https://dashscope.aliyuncs.com/compatible-mode/v1 / qwen-turbo</div>
          <div><strong>智谱 GLM：</strong> https://open.bigmodel.cn/api/paas/v4 / glm-4-flash</div>
        </div>
      </template>
    </el-alert>

    <!-- Provider list -->
    <el-card v-loading="loading">
      <template v-if="providers.length === 0">
        <el-empty description="还没有配置模型服务商，点击上方按钮添加" />
      </template>

      <div v-else class="provider-list">
        <div
          v-for="provider in providers"
          :key="provider.id"
          class="provider-item"
        >
          <div class="provider-header">
            <div class="provider-name">
              <el-tag v-if="provider.isDefault" type="success" size="small">默认</el-tag>
              <strong>{{ provider.providerName }}</strong>
            </div>
            <div class="provider-actions">
              <el-button text type="primary" @click="editProvider(provider)">
                <el-icon><Edit /></el-icon>编辑
              </el-button>
              <el-popconfirm title="确定删除此服务商？" @confirm="handleDelete(provider.id)">
                <template #reference>
                  <el-button text type="danger">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
          <div class="provider-detail">
            <div><span class="label">模型：</span>{{ provider.modelName }}</div>
            <div><span class="label">接口地址：</span><code>{{ provider.baseUrl }}</code></div>
            <div><span class="label">类型：</span>{{ providerTypeLabel(provider.providerType) }}</div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- Add/Edit dialog -->
    <el-dialog
      v-model="showAddDialog"
      :title="isEditing ? '编辑服务商' : '添加服务商'"
      width="550px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="服务商名称" prop="providerName">
          <el-input v-model="form.providerName" placeholder="例如：DeepSeek、OpenAI" />
        </el-form-item>
        <el-form-item label="服务商类型" prop="providerType">
          <el-select v-model="form.providerType" style="width: 100%">
            <el-option label="OpenAI 兼容接口" value="OPENAI_COMPATIBLE" />
            <el-option label="自定义" value="CUSTOM" />
          </el-select>
        </el-form-item>
        <el-form-item label="API地址" prop="baseUrl">
          <el-input v-model="form.baseUrl" placeholder="例如：https://api.deepseek.com" />
        </el-form-item>
        <el-form-item label="API密钥" prop="apiKey">
          <el-input v-model="form.apiKey" type="password" show-password placeholder="sk-..." />
        </el-form-item>
        <el-form-item label="模型名称" prop="modelName">
          <el-input v-model="form.modelName" placeholder="例如：deepseek-chat、gpt-4o-mini" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleAdd">
          {{ isEditing ? '保存修改' : '添加' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { providerApi } from '@/api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const submitting = ref(false)
const showAddDialog = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const formRef = ref(null)
const providers = ref([])

const defaultForm = {
  providerName: '',
  providerType: 'OPENAI_COMPATIBLE',
  baseUrl: '',
  apiKey: '',
  modelName: '',
  isDefault: false,
  sortOrder: 0
}

const form = reactive({ ...defaultForm })

const rules = {
  providerName: [{ required: true, message: '请输入服务商名称', trigger: 'blur' }],
  providerType: [{ required: true, message: '请选择服务商类型', trigger: 'change' }],
  baseUrl: [{ required: true, message: '请输入API地址', trigger: 'blur' }],
  apiKey: [{ required: true, message: '请输入API密钥', trigger: 'blur' }],
  modelName: [{ required: true, message: '请输入模型名称', trigger: 'blur' }]
}

const providerTypeLabel = (type) => {
  const map = { OPENAI_COMPATIBLE: 'OpenAI 兼容接口', CUSTOM: '自定义' }
  return map[type] || type
}

const loadProviders = async () => {
  loading.value = true
  try {
    const res = await providerApi.list()
    if (res.code === 200) providers.value = res.data
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, defaultForm)
  isEditing.value = false
  editingId.value = null
}

const editProvider = (provider) => {
  isEditing.value = true
  editingId.value = provider.id
  form.providerName = provider.providerName
  form.providerType = provider.providerType
  form.baseUrl = provider.baseUrl
  form.apiKey = provider.apiKey
  form.modelName = provider.modelName
  form.isDefault = provider.isDefault
  form.sortOrder = provider.sortOrder
  showAddDialog.value = true
}

const handleAdd = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    let res
    if (isEditing.value) {
      res = await providerApi.update(editingId.value, { ...form })
    } else {
      res = await providerApi.add({ ...form })
    }
    if (res.code === 200) {
      ElMessage.success(isEditing.value ? '更新成功' : '添加成功')
      showAddDialog.value = false
      resetForm()
      await loadProviders()
    }
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (id) => {
  try {
    const res = await providerApi.delete(id)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      await loadProviders()
    }
  } catch (e) {
    console.error(e)
  }
}

onMounted(loadProviders)
</script>

<style scoped>
.providers-page {
  max-width: 900px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.page-header h2 {
  font-size: 24px;
  color: #303133;
  margin-bottom: 8px;
}
.subtitle {
  color: #909399;
  font-size: 14px;
}
.preset-alert {
  margin-bottom: 20px;
}
.preset-list {
  line-height: 2;
  font-size: 13px;
}
.provider-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.provider-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  transition: box-shadow 0.2s;
}
.provider-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.provider-name {
  display: flex;
  align-items: center;
  gap: 8px;
}
.provider-name strong {
  font-size: 16px;
}
.provider-actions {
  display: flex;
  gap: 8px;
}
.provider-detail {
  font-size: 14px;
  color: #606266;
  line-height: 2;
}
.provider-detail code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: #409eff;
}
.label {
  color: #909399;
  display: inline-block;
  width: 70px;
}
.back-btn-mob { display:none; }
@media (max-width:768px) { .back-btn-mob { display:inline-flex; } }
</style>
