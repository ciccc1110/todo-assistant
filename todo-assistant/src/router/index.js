import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    redirect: '/chat'
  },
  // ── 登录页（保留定义，自动登录时不使用）────────────────────────
  // 【可扩展】取消下方注释即可恢复登录页路由
  // {
  //   path: '/login',
  //   name: 'Login',
  //   component: () => import('../views/Login.vue'),
  //   meta: { title: '登录', requiresAuth: false }
  // },
  {
    path: '/chat',
    name: 'BotChat',
    component: () => import('../views/BotChat.vue'),
    meta: { title: 'Bot对话', requiresAuth: true }
  },
  {
    path: '/tasks',
    name: 'TaskList',
    component: () => import('../views/TaskList.vue'),
    meta: { title: '任务列表', requiresAuth: true }
  },
  {
  path: '/statistics',
  name: 'Statistics',
  component: () => import('../views/Statistics.vue'),
  meta: { title: '统计看板', requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// ── 全局前置守卫 ────────────────────────────────────────────────
router.beforeEach((to) => {
  document.title = to.meta.title || '待办助手';
 
  // 自动登录模式：requiresAuth 的页面无需跳转登录页，
  // 因为 main.js 中已在应用启动时完成自动登录。
  // 【可扩展】恢复多用户登录时取消下方注释，并注释掉 return true
  // if (to.meta.requiresAuth) {
  //   const userInfo = localStorage.getItem('user_info');
  //   if (!userInfo) {
  //     return '/login';
  //   }
  // }

  // 允许导航通过
  return true
});

export default router;
