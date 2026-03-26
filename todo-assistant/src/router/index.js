import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
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

// 全局前置守卫 - 不使用 next 参数
router.beforeEach((to) => {
  // 设置页面标题
  document.title = to.meta.title || '待办助手'

  // 访问需要认证的页面（如 /chat）
  if (to.meta.requiresAuth) {
    const userInfo = localStorage.getItem('user_info')
    if (!userInfo) {
      // 重定向到登录页（返回路径字符串）
      return '/login'
    }
  }

  // 允许导航通过
  return true
});

export default router;
