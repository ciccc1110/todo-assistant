import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [],
  }),

  actions: {
    /**
     * 添加用户消息
     */
    addUserMessage(content, quickQuestions = [], quickButtons = []) {
      this.messages.push({
        id: uuidv4(),
        role: 'user',
        content,
        quickQuestions,
        quickButtons,
        timestamp: new Date().toISOString(),
      });
    },

    /**
     * 添加Bot消息
     */
    addBotMessage(content, quickQuestions = [], quickButtons = []) {
      this.messages.push({
        id: uuidv4(),
        role: 'bot',
        content,
        quickQuestions,
        quickButtons,
        timestamp: new Date().toISOString(),
      });
    },

    /**
     * 移除消息
     */
    removeMessage(messageId) {
      const index = this.messages.findIndex(msg => msg.id === messageId);
      if (index !== -1) {
        this.messages.splice(index, 1);
      }
    },

    /**
     * 清空所有消息
     */
    clearMessages() {
      this.messages = [];
    },

    /**
     * 保存到本地存储
     */
    saveToStorage() {
      try {
        localStorage.setItem('chat_messages', JSON.stringify(this.messages));
      } catch (error) {
        console.error('保存对话历史失败:', error);
      }
    },

    /**
     * 从本地存储加载
     */
    loadFromStorage() {
      try {
        const stored = localStorage.getItem('chat_messages');
        if (stored) {
          this.messages = JSON.parse(stored);
        }
      } catch (error) {
        console.error('加载对话历史失败:', error);
      }
    },
  },
});
