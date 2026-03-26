<template>
  <div class="stat-card">
    <div class="stat-title">{{ title }}</div>
    <div class="stat-value">{{ value }}</div>
    <div class="stat-unit">{{ unit }}</div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    default: ''
  }
})
</script>

<style scoped lang="scss">
.stat-card {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;

  .stat-title {
    font-size: 14px;
    color: #909399;
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 32px;
    font-weight: bold;
    color: #409EFF;
  }

  .stat-unit {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}
</style>