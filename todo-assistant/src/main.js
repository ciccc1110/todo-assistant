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
