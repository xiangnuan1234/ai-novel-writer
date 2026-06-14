mysql -u root -p123456 < E:\项目\ai-novel-writer\db\init.sql
# AI 小说创作平台

基于 Spring Boot + Vue.js 的 AI 辅助小说创作平台，支持接入多种大模型服务商，根据作者的写作风格自动生成小说内容。

## 技术栈

- **后端**: Spring Boot 3.2 + Spring Security + JWT + JPA + MySQL
- **前端**: Vue 3 + Vite + Element Plus + Pinia + Vue Router
- **AI**: 支持 OpenAI 兼容接口（DeepSeek、OpenAI、Moonshot 等）+ 自定义服务商

## 功能特性

1. **用户系统** - 注册登录、JWT 认证
2. **作者风格配置** - 设置笔名、写作风格、创作偏好、语调文风、角色塑造风格等
3. **小说管理** - 创建、编辑、删除小说，管理章节
4. **AI 生成** - 根据作者风格生成章节大纲、章节全文、续写内容
5. **多模型支持** - 可自由添加和切换 AI 模型服务商

## 快速启动

### 1. 数据库配置

创建 MySQL 数据库：

```bash
mysql -u root -p < db/init.sql
```

或者直接创建数据库：
```sql
CREATE DATABASE ai_novel_writer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 启动后端

```bash
cd backend
# 修改 application.yml 中的数据库连接信息
mvn spring-boot:run
```

后端启动在 `http://localhost:8080`

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端启动在 `http://localhost:5173`

### 4. 配置 AI 模型

1. 注册登录后，进入「模型服务商」页面
2. 添加 AI 模型服务商（如 DeepSeek、OpenAI）
3. 将其中一家设为默认

### 5. 开始创作

1. 设置您的「写作风格」
2. 创建新小说
3. 进入小说详情，使用 AI 生成大纲或章节
4. 在章节编辑器中查看和修改生成的內容

## 模型服务商配置参考

| 服务商 | API 地址 | 推荐模型 |
|--------|---------|---------|
| DeepSeek | https://api.deepseek.com | deepseek-chat |
| OpenAI | https://api.openai.com | gpt-4o-mini |
| Moonshot | https://api.moonshot.cn | moonshot-v1-8k |
| 通义千问 | https://dashscope.aliyuncs.com/compatible-mode/v1 | qwen-turbo |
| 智谱 GLM | https://open.bigmodel.cn/api/paas/v4 | glm-4-flash |

## 项目结构

```
ai-novel-writer/
├── backend/                    # Spring Boot 后端
│   ├── pom.xml
│   └── src/main/java/com/ainovel/
│       ├── controller/         # REST API 控制器
│       ├── service/            # 业务逻辑层
│       │   └── ai/            # AI 生成服务
│       ├── entity/             # 数据实体
│       ├── repository/         # 数据访问层
│       ├── dto/                # 数据传输对象
│       ├── security/           # JWT 安全认证
│       ├── config/             # 配置类
│       └── exception/          # 统一异常处理
├── frontend/                   # Vue.js 前端
│   ├── src/
│   │   ├── views/              # 页面组件
│   │   ├── api/                # API 接口
│   │   ├── stores/             # 状态管理
│   │   ├── router/             # 路由配置
│   │   └── utils/              # 工具函数
│   └── package.json
└── db/                         # 数据库脚本
    └── init.sql
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 登录 |
| POST | /api/auth/register | 注册 |
| GET | /api/novel/list | 小说列表 |
| POST | /api/novel | 创建小说 |
| GET | /api/novel/{id} | 小说详情 |
| PUT | /api/novel/{id} | 更新小说 |
| DELETE | /api/novel/{id} | 删除小说 |
| GET | /api/chapter/list/{novelId} | 章节列表 |
| POST | /api/chapter/{novelId} | 创建章节 |
| PUT | /api/chapter/{id} | 更新章节 |
| POST | /api/ai/generate-outline | AI 生成大纲 |
| POST | /api/ai/generate-chapter | AI 生成章节 |
| POST | /api/ai/continue-writing | AI 续写 |
| GET | /api/profile | 获取写作风格 |
| PUT | /api/profile | 更新写作风格 |
| GET | /api/provider/list | 模型服务商列表 |
| POST | /api/provider | 添加服务商 |

## 自定义模型服务商

系统支持接入任何兼容 OpenAI Chat Completion API 的服务商，只需提供：
- 服务商名称
- API 地址
- API 密钥
- 模型名称
