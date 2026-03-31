
# 个人日常待办事项智能管理助手

## 项目简介

本项目基于扣子（Coze）平台，设计并实现一款面向个人用户的智能待办事项管理助手。系统以 AI 智能体为核心，结合大语言模型（LLM）与工作流编排技术，实现对用户日常事务的智能化管理。

项目涵盖待办事项的模糊表述识别、智能录入、分类筛选、分级提醒、任务状态管理与统计可视化等核心功能，旨在打造一款轻量化、智能化、贴合用户使用习惯的个人事务管理工具。

---

## 主要功能

### 🤖 AI 对话驱动的任务管理
- 通过自然语言与 Coze Bot 交互，支持模糊表述识别（如"明天下午三点开会"）
- 支持通过对话完成任务的智能录入、修改与删除
- Bot 响应支持 Markdown 渲染，快捷提问引导用户操作

### 📋 任务列表管理
- 多维度筛选：按日期、状态（进行中/已完成/已过期）、优先级（高/中/低）、分类（工作/学习/生活/出行/其他）、关键词筛选
- 多字段排序：支持按创建时间、截止时间、优先级、状态、分类排序，可切换升降序
- 任务卡片展示：颜色标识优先级，醒目提示即将到期与已逾期任务
- 单条任务操作：编辑、删除、一键切换完成状态

### 📊 统计看板
- 时间维度切换：本周 / 当月 / 自定义日期范围
- 总览卡片：总任务数、已完成、待办数、已过期
- 完成率 / 准时完成率 / 逾期率三项核心指标
- ECharts 可视化图表：
  - 完成率趋势与任务增长率折线+柱状图
  - 任务分类饼图
  - 优先级分布柱状图

### 📄 智能复盘报告
- 基于指定时间段，调用 Coze 工作流生成 Markdown 格式复盘报告
- 生成进度动画展示（含步骤指示器与进度条）
- 支持在线预览（自定义 Markdown 渲染器，完整支持表格、代码块、列表、引用等）
- 支持导出为 PDF（浏览器打印窗口）或下载 Markdown 文件
- 报告自动写入本地日志，支持历史记录查看、搜索、删除与清空（最多保留 20 条，按用户隔离）

### 👤 用户系统（当前：自动登录模式）
- 当前版本采用自动登录，用户 ID 与用户名在 `main.js` 中统一配置，无需手动登录
- 已完整保留多用户登录框架（登录页、路由守卫、`userStore`），注释中标注了恢复步骤，可随时切换为多用户模式

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Vue 3（Composition API + `<script setup>`）|
| 构建工具 | Vite 8 |
| UI 组件库 | Element Plus 2 |
| 状态管理 | Pinia 3 |
| 路由 | Vue Router 5 |
| HTTP 请求 | Axios 1 |
| 图表 | ECharts 6 |
| Markdown 渲染 | 自定义状态机解析器（Statistics.vue 内置）+ marked（BotMessage.vue）|
| CSS 预处理器 | Sass（SCSS）|
| 大数字处理 | json-bigint（解决任务 ID 精度丢失问题）|
| AI 能力 | 扣子（Coze）平台 Bot API v2 |
| 其他工具 | uuid、dayjs |

---

## 项目结构

```
todo-assistant/
├── public/
│   ├── favicon.svg              # 应用图标（SVG 格式）
│   └── icons.svg                # 通用图标集合（社交平台等）
├── src/
│   ├── api/
│   │   ├── coze.js              # Coze Bot API 调用封装（含重试、解析逻辑）
│   │   └── task.js              # 任务相关 API（查询/增/改/删/报告生成）
│   ├── assets/
│   │   └── styles/
│   │       └── main.scss        # 全局样式（颜色变量、Element Plus 覆盖、工具类）
│   ├── components/
│   │   ├── BotMessage.vue       # Bot 消息气泡（Markdown 渲染、快捷问题、快捷按钮）
│   │   ├── UserMessage.vue      # 用户消息气泡
│   │   └── StatCard.vue         # 统计数字卡片（总任务数/已完成等）
│   ├── router/
│   │   └── index.js             # 路由配置（/chat、/tasks、/statistics）
│   ├── stores/
│   │   ├── chat.js              # 对话消息状态管理（Pinia）
│   │   ├── task.js              # 任务列表状态管理（Pinia，含本地缓存）
│   │   └── user.js              # 用户状态管理（Pinia，含固定 ID 生成逻辑）
│   ├── utils/
│   │   ├── format.js            # 日期格式化、优先级/分类颜色工具函数
│   │   ├── request.js           # Axios 实例封装（拦截器、Token 注入）
│   │   └── storage.js           # localStorage 任务读写工具（支持用户隔离）
│   ├── views/
│   │   ├── BotChat.vue          # AI 对话页面（主入口）
│   │   ├── TaskList.vue         # 任务列表页面
│   │   ├── Statistics.vue       # 统计看板与复盘报告页面
│   │   └── Login.vue            # 登录页面（当前未启用，保留供多用户模式恢复）
│   ├── App.vue                  # 根组件（router-view 挂载点）
│   ├── main.js                  # 应用入口（自动登录配置、插件注册）
│   └── style.css                # 基础 CSS 变量与全局排版样式
├── index.html                   # HTML 入口模板
├── vite.config.js               # Vite 配置（代理 Coze API、路径别名）
├── package.json                 # 项目依赖与脚本
└── vercel.json                  # Vercel 部署配置（SPA History 路由重写）
```

---

## 快速开始

### 环境要求

- Node.js `>= 20.19.0`（由 Vite 8 及部分依赖强制要求）
- npm `>= 9`（或其他包管理器）

### 安装步骤

```bash
# 1. 克隆仓库
git clone <your-repo-url>

# 2. 进入前端项目目录
cd todo-assistant

# 3. 安装依赖
npm install
```

### 运行项目

```bash
# 启动开发服务器（默认端口 3000）
npm run dev
```

启动后访问 [http://localhost:3000](http://localhost:3000)，页面将自动以配置的自动登录用户进入 AI 对话页面。

```bash
# 构建生产包
npm run build

# 本地预览生产包
npm run preview
```

---

## 配置说明

### 自动登录用户配置

在 `src/main.js` 中修改以下两个常量即可切换当前登录用户，无需改动其他代码：

```js
const AUTO_LOGIN_USER_ID   = 'user_cc';   // 用户 ID（对应 Coze 数据库中的用户标识）
const AUTO_LOGIN_USER_NAME = 'cc';        // 前端展示名称
```

### Coze Bot 配置

在 `src/api/coze.js` 中配置 Bot 信息：

```js
const COZE_CONFIG = {
  bot_id:  '7610285463999381558',   // Coze 平台的 Bot ID
  api_url: 'https://api.coze.cn/open_api/v2/chat',
  api_key: 'pat_xxxxxx...'          // Coze 平台的 Personal Access Token
}
```

> ⚠️ **注意**：`api_key` 为敏感凭证，请勿将真实密钥提交至公开代码仓库。建议通过环境变量注入或在部署平台配置 Secret。

### Vite 开发代理

`vite.config.js` 已配置开发环境下的 API 代理，将 `/api` 前缀请求转发至 `https://api.coze.cn`，避免跨域问题：

```js
proxy: {
  '/api': {
    target: 'https://api.coze.cn',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

### 生产部署（Vercel）

项目根目录已包含 `vercel.json`，配置了 SPA History 路由重写，直接连接 Vercel 仓库即可部署：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 注意事项 / 已知限制

### API 密钥安全
`src/api/coze.js` 中的 `api_key` 当前为硬编码形式，在前端代码中直接可见。生产环境建议通过后端代理转发请求，避免密钥暴露。

### 任务 ID 精度问题
Coze 数据库返回的任务 ID 为大整数，超出 JavaScript `Number` 安全范围，项目已引入 `json-bigint` 解析，并在所有 API 调用处统一将 ID 转换为字符串处理。

### Bot 响应耗时
Coze API 单次请求超时设置为 120 秒，含最多 2 次自动重试（指数退避）。复盘报告生成通常需要 30–60 秒，期间显示动画进度提示。

### 本地数据持久化
任务数据由 Coze 平台数据库存储，对话历史与报告日志存储于浏览器 `localStorage`，清除浏览器数据后会丢失。报告日志按用户 ID 隔离，最多保留 20 条。

### 多用户登录（预留扩展）
当前版本为单用户自动登录模式。代码中已完整保留多用户登录所需的全部模块（`Login.vue`、`userStore`、路由守卫），相关代码以注释形式保留，并在注释中标注了完整的恢复步骤，涉及 `main.js`、`router/index.js`、各视图组件的守卫逻辑，可按需启用。

### 构建环境限制
Vite 8 要求 Node.js `>= 20.19.0`，低版本 Node 将导致安装或构建失败，请确认本地 Node 版本后再操作。