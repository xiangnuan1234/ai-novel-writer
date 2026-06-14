# 部署指南 · 全部免费 · 全 Cloudflare

## 架构

```
用户 → Cloudflare CDN
        │
        ├── Cloudflare Pages（前端 Vue.js）
        └── Cloudflare Workers（后端 API）
                │
                ├── Cloudflare D1（数据库 SQLite）
                └── Cloudflare R2（封面上传存储）
```

## 一、上传 GitHub

```bash
cd E:\项目\ai-novel-writer
git init && git add . && git commit -m "v1"
git remote add origin https://github.com/你的用户名/ai-novel-writer.git
git push -u origin main
```

## 二、创建 D1 数据库

```bash
cd cloudflare-backend
npm install
npx wrangler d1 create ai-novel-db
```

复制输出的 `database_id`，填入 `wrangler.toml` 的 `database_id`。

初始化数据库：
```bash
npx wrangler d1 execute ai-novel-db --file=src/schema.sql
```

## 三、创建 R2 存储桶

```bash
npx wrangler r2 bucket create novel-covers
```

## 四、部署 Workers 后端

```bash
npx wrangler deploy
```

得到后端地址：`https://ai-novel-api.你的用户名.workers.dev`

## 五、部署 Pages 前端

1. Cloudflare 面板 → Workers & Pages → 创建 Pages → 连 GitHub
2. 构建设置：
   - 命令：`npm run build`
   - 输出目录：`frontend/dist`
   - 根目录：`frontend`
3. 环境变量：`VITE_API_URL` = `https://ai-novel-api.你的用户名.workers.dev`

## 六、后续更新

```bash
git add . && git commit -m "更新" && git push
# Cloudflare Pages 自动重新部署
```

## 七、本地开发

```bash
cd cloudflare-backend
npm run dev    # 启动 Workers 本地模拟
```
