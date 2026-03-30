import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import App from './App.vue';

// 导入全局样式 - 极简扁平化设计
import './assets/styles/main.scss';

// 创建应用实例
const app = createApp(App);

// 先注册 Pinia（必须）
app.use(createPinia());
 
// ════════════════════════════════════════════════════════════════
//  ★ 自动登录配置
//  修改下方两个常量即可切换固定用户，无需改动其他任何代码。
// ════════════════════════════════════════════════════════════════
const AUTO_LOGIN_USER_ID   = 'user_cc';   // ← 用户 ID，可随时修改
const AUTO_LOGIN_USER_NAME = 'cc';        // ← 前端展示名，可随时修改

// 自动登录：直接写入 localStorage，与 userStore.login() 数据结构完全一致。
// 每次启动都刷新 loginTime，保证会话信息新鲜。
(function autoLogin() {
  const userInfo = {
    userId:    AUTO_LOGIN_USER_ID,
    userName:  AUTO_LOGIN_USER_NAME,
    loginTime: new Date().toISOString(),
  };
  localStorage.setItem('user_info', JSON.stringify(userInfo));
}());
 
// ── 【可扩展】多用户登录框架（已注释，恢复时取消即可）────────────────
//
// 恢复多用户登录的完整步骤：
//   1. 删除上方两个 AUTO_LOGIN_* 常量及 autoLogin 立即执行函数
//   2. 取消下方两行 import + loadFromStorage 的注释
//   3. src/router/index.js：
//      - '/' 的 redirect 改回 '/login'
//      - 取消 Login 路由定义的注释
//      - 取消 beforeEach 中多用户守卫的注释
//
// import { useUserStore } from './stores/user';
// useUserStore().loadFromStorage();   // 恢复已有会话；未登录时由路由守卫跳转登录页

// 同步导入路由
import router from './router';
app.use(router);

// 注册 Element Plus
app.use(ElementPlus);

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 挂载应用
app.mount('#app');
