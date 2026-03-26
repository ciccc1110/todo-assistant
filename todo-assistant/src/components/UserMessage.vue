<template>
  <div class="user-message">
    <div class="message-content">{{ content }}</div>
  </div>
</template>

<script setup>
defineProps({
  content: {
    type: String,
    required: true
  }
})
</script>

<style scoped lang="scss">
.user-message {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;

  .message-content {
    padding: 12px 16px;
    background: #409EFF;
    color: #fff;
    border-radius: 12px;
    max-width: 70%;
    font-size: 14px;
    line-height: 1.6;
  }
}
</style>