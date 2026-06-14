# GitHub 自动部署配置指南

## 📋 配置步骤

### 1. 在 GitHub 仓库中配置 Secrets

打开你的 GitHub 仓库：`https://github.com/你的用户名/ai-novel-writer`

1. 点击 **Settings** → **Secrets and variables** → **Actions**
2. 点击 **"New repository secret"**
3. 添加以下 Secrets：

| Secret Name | Value | 说明 |
|------------|-------|------|
| `CLOUDFLARE_API_TOKEN` | 你的 Cloudflare API Token | 从 Cloudflare Dashboard 创建 |
| `VITE_API_URL` | `https://ai-novel-api.你的用户名.workers.dev` | 后端 API 地址（部署后获取） |

### 2. 提交代码到 GitHub

```powershell
cd E:\项目\ai-novel-writer
git add .
git commit -m "添加 GitHub Actions 自动部署配置"
git push
```

### 3. 自动部署流程

推送代码后，GitHub Actions 会自动执行：

- **后端部署**：当 `cloudflare-backend/` 目录有更新时触发
- **前端部署**：当 `frontend/` 目录有更新时触发

### 4. 查看部署状态

1. 打开 GitHub 仓库
2. 点击 **Actions** 标签页
3. 查看部署进度和日志

### 5. 获取部署地址

部署成功后：

- **后端地址**：`https://ai-novel-api.你的用户名.workers.dev`
- **前端地址**：`https://ai-novel-writer.pages.dev`

---

## 🔧 手动触发部署

如果需要手动触发部署：

1. 打开 GitHub 仓库 → **Actions**
2. 选择对应的 workflow
3. 点击 **"Run workflow"**

---

## ⚠️ 注意事项

### 首次部署

首次部署时，GitHub Actions 会自动创建 D1 数据库和 R2 存储桶。但是需要手动初始化数据库表：

1. 等待后端部署成功
2. 在 GitHub Actions 中找到 D1 Database ID
3. 更新 `wrangler.toml` 中的 `database_id`
4. 手动执行数据库初始化（通过 Cloudflare Dashboard）

### 更新 API 地址

部署后端成功后，需要更新 `VITE_API_URL` Secret：

1. GitHub → Settings → Secrets → Actions
2. 更新 `VITE_API_URL` 为实际的后端地址
3. 重新部署前端

---

## 📝 部署文件说明

### `.github/workflows/deploy-backend.yml`
- 自动部署后端到 Cloudflare Workers
- 监听 `cloudflare-backend/` 目录变化

### `.github/workflows/deploy-frontend.yml`
- 自动部署前端到 Cloudflare Pages
- 监听 `frontend/` 目录变化

---

## 🎯 快速开始

1. ✅ GitHub Actions 文件已创建
2. ⏳ 配置 GitHub Secrets（需要手动）
3. ⏳ 提交代码到 GitHub
4. ⏳ 等待自动部署完成

**下一步：配置 GitHub Secrets**