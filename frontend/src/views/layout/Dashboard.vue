<template>
  <div class="dashboard">
    <h2 class="page-title">工作台</h2>

    <!-- Stats cards -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="8">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">我的小说</div>
              <div class="stat-value">{{ stats.novelCount }}</div>
            </div>
            <el-icon :size="48" color="#409eff"><Reading /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">总章节数</div>
              <div class="stat-value">{{ stats.chapterCount }}</div>
            </div>
            <el-icon :size="48" color="#67c23a"><Document /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">AI模型</div>
              <div class="stat-value">{{ stats.providerCount }}</div>
            </div>
            <el-icon :size="48" color="#e6a23c"><Lightning /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Quick actions -->
    <el-card class="quick-actions">
      <template #header>
        <span>快捷操作</span>
      </template>
      <el-row :gutter="20">
        <el-col :span="6">
          <el-button type="primary" size="large" class="action-btn" @click="$router.push('/writer/novel/create')">
            <el-icon><Plus /></el-icon>创建新小说
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button type="success" size="large" class="action-btn" @click="$router.push('/writer/novel')">
            <el-icon><Reading /></el-icon>继续创作
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button type="warning" size="large" class="action-btn" @click="$router.push('/writer/styles')">
            <el-icon><EditPen /></el-icon>设置写作风格
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button type="info" size="large" class="action-btn" @click="$router.push('/writer/providers')">
            <el-icon><Setting /></el-icon>配置AI模型
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- Recent novels -->
    <el-card class="recent-novels">
      <template #header>
        <div class="card-header">
          <span>最近作品</span>
          <el-button text type="primary" @click="$router.push('/writer/novel')">查看全部</el-button>
        </div>
      </template>
      <el-table :data="recentNovels" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="title" label="小说名称" min-width="200" />
        <el-table-column prop="genre" label="题材" width="120" />
        <el-table-column prop="chapterCount" label="章节数" width="100" align="center" />
        <el-table-column prop="status" label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="$router.push(`/writer/novel/${row.id}`)">
              进入
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && recentNovels.length === 0" description="还没有小说，开始创建第一本吧！" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { novelApi, providerApi } from '@/api'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const recentNovels = ref([])
const stats = ref({
  novelCount: 0,
  chapterCount: 0,
  providerCount: 0
})

const statusType = (status) => {
  const map = { DRAFT: 'info', ONGOING: 'success', COMPLETED: 'primary', ABANDONED: 'danger' }
  return map[status] || 'info'
}
const statusLabel = (status) => {
  const map = { DRAFT: '草稿', ONGOING: '连载中', COMPLETED: '已完成', ABANDONED: '弃坑' }
  return map[status] || status
}

onMounted(async () => {
  loading.value = true
  try {
    const [novelRes, providerRes] = await Promise.all([
      novelApi.list(),
      providerApi.list()
    ])
    if (novelRes.code === 200) {
      recentNovels.value = novelRes.data.slice(0, 10)
      stats.value.novelCount = novelRes.data.length
      stats.value.chapterCount = novelRes.data.reduce((sum, n) => sum + (n.chapterCount || 0), 0)
    }
    if (providerRes.code === 200) {
      stats.value.providerCount = providerRes.data.length
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}
.page-title {
  font-size: 24px;
  color: #303133;
  margin-bottom: 24px;
}
.stats-row {
  margin-bottom: 24px;
}
.stat-card {
  .stat-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .stat-label {
    font-size: 14px;
    color: #909399;
    margin-bottom: 8px;
  }
  .stat-value {
    font-size: 32px;
    font-weight: bold;
    color: #303133;
  }
}
.quick-actions {
  margin-bottom: 24px;
}
.action-btn {
  width: 100%;
  height: 60px;
  font-size: 16px;
}
.recent-novels {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
@media (max-width: 768px) {
  .stats-row .el-col { width: 100% !important; max-width: 100% !important; flex: none; margin-bottom: 12px; }
  .action-btns .el-col { width: 50% !important; max-width: 50% !important; flex: none; margin-bottom: 8px; }
  .action-btn { height: 48px; font-size: 14px; }
}
</style>
