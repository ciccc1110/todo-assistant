<template>
  <div class="bot-message">
    <div class="message-header">
      <div class="avatar">
        <img src="@/assets/images/bot-avatar.png" alt="Bot" />
      </div>
      <div class="title">华泰股市助手</div>
    </div>
    <div class="message-content">
      <div class="text" v-html="parsedContent"></div>
      <div v-if="quickQuestions && quickQuestions.length > 0" class="quick-questions">
        <div class="questions-title">可尝试问我：</div>
        <div v-for="(question, index) in quickQuestions" :key="index" class="question-item">
          <span class="arrow">↑</span>
          <span>{{ question }}</span>
        </div>
      </div>
      <div v-if="quickButtons && quickButtons.length > 0" class="quick-buttons">
        <el-button
          v-for="(button, index) in quickButtons"
          :key="index"
          class="quick-btn"
          @click="$emit('quick-click', button.action)"
        >
          {{ button.text }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  content: {
    type: String,
    required: true
  },
  quickQuestions: {
    type: Array,
    default: () => []
  },
  quickButtons: {
    type: Array,
    default: () => []
  }
})

defineEmits(['quick-click'])

// 解析 Markdown 内容
const parsedContent = computed(() => {
  try {
    return marked(props.content)
  } catch (error) {
    console.error('Markdown 解析失败:', error)
    return props.content
  }
})
</script>

<style scoped lang="scss">
.bot-message {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  max-width: 80%;
  margin-bottom: 16px;

  .message-header {
    display: flex;
    align-items: center;
    gap: 12px;

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #F56C6C;
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        width: 36px;
        height: 36px;
        border-radius: 50%;
      }
    }

    .title {
      font-size: 16px;
      font-weight: bold;
      color: #303133;
    }
  }

  .message-content {
    .text {
      font-size: 14px;
      color: #606266;
      line-height: 1.6;

      /* Markdown 表格样式 */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        font-size: 13px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }

      thead {
        background-color: #f5f7fa;
        font-weight: bold;
        color: #303133;
      }

      th, td {
        border: 1px solid #e4e7ed;
        padding: 12px 16px;
        text-align: left;
      }

      th {
        background-color: #f5f7fa;
        font-weight: 600;
        color: #303133;
      }

      tbody tr {
        &:hover {
          background-color: #f9fafb;
        }

        &:nth-child(odd) {
          background-color: #ffffff;
        }

        &:nth-child(even) {
          background-color: #fafbfc;
        }
      }

      /* Markdown 其他元素 */
      h1, h2, h3, h4, h5, h6 {
        margin: 16px 0 8px 0;
        font-weight: 600;
        color: #303133;
      }

      h1 { font-size: 20px; }
      h2 { font-size: 18px; }
      h3 { font-size: 16px; }

      p {
        margin: 8px 0;
      }

      ul, ol {
        margin: 8px 0;
        padding-left: 24px;
      }

      li {
        margin: 4px 0;
      }

      code {
        background-color: #f5f7fa;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        color: #e63c3c;
      }

      blockquote {
        border-left: 4px solid #409eff;
        padding-left: 12px;
        margin: 8px 0;
        color: #909399;
      }
    }

    .quick-questions {
      margin-top: 12px;

      .questions-title {
        font-size: 14px;
        font-weight: bold;
        color: #303133;
        margin-bottom: 8px;
      }

      .question-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #606266;
        margin-bottom: 4px;

        .arrow {
          color: #E6A23C;
        }
      }
    }

    .quick-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;

      .quick-btn {
        padding: 10px 16px;
        border: 1px solid #DCDFE6;
        border-radius: 8px;
        background: #fff;
        color: #303133;
        font-size: 14px;
        transition: all 0.3s;

        &:hover {
          border-color: #409EFF;
          color: #409EFF;
        }
      }
    }
  }
}
</style>