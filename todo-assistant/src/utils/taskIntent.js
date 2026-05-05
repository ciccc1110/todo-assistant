/**
 * taskIntent.js
 * 用户消息意图检测工具
 *
 * 用于判断用户在对话页面的操作是否触发了任务的增删改，
 * 从而决定是否需要让本地缓存失效，保证列表页/统计页数据实时。
 */

/**
 * 用户消息中表示"写操作"的关键词
 * 覆盖：增 / 删 / 改 / 状态变更
 */
const USER_MUTATING_KEYWORDS = [
  // 新增
  '添加', '新增', '创建', '加一个', '帮我加', '记录', '加个', '记一下', '新建',
  // 删除
  '删除', '移除', '取消', '删掉', '去掉', '清除',
  // 修改
  '修改', '更新', '改成', '改为', '推迟', '提前', '延期', '调整', '换成',
  // 状态
  '完成', '标记', '关闭', '标为', '设置'
]

/**
 * Bot 回复中表示"操作已执行成功"的关键词
 * 只有 Bot 确认了操作，才真正触发缓存失效
 */
const BOT_SUCCESS_KEYWORDS = [
  '已添加', '添加成功', '已创建', '创建成功',
  '已删除', '删除成功', '已移除',
  '已修改', '修改成功', '已更新', '更新成功',
  '已完成', '已标记', '标记成功',
  '任务已', '操作成功', '已为您'
]

/**
 * 判断本次对话是否触发了任务数据变更
 *
 * 策略：
 *   - 用户消息命中写操作关键词  AND/OR
 *   - Bot 回复命中成功关键词
 *   只要其中一个命中，即视为任务发生了变更
 *
 * @param {string} userMessage - 用户发送的消息
 * @param {string} [botReply=''] - Bot 的回复内容
 * @returns {boolean}
 */
export function isTaskMutation(userMessage, botReply = '') {
  const msg = userMessage || ''
  const reply = botReply || ''

  const userHit = USER_MUTATING_KEYWORDS.some(k => msg.includes(k))
  const botHit = BOT_SUCCESS_KEYWORDS.some(k => reply.includes(k))

  if (userHit || botHit) {
    console.log(
      `🔍 检测到任务操作意图 — 用户命中: ${userHit}, Bot确认: ${botHit}`
    )
  }

  return userHit || botHit
}