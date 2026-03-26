<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
// App根组件，负责路由渲染
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
