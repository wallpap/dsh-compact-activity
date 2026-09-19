import type { LocaleDictOf, LocaleNamespaceMap } from '@deepseek-ai/dsh-client-ui-slots'

/** 插件在 DSH Locale 注册表中的命名空间。 */
export const ACTIVITY_NS = 'compact-activity' as const

/** 插件使用的全部文案键。 */
export type CompactActivityKey =
  | 'status.running'
  | 'status.done'
  | 'status.error'
  | 'status.thinking'
  | 'status.toolRunning'
  | 'count.thought'
  | 'count.thoughts'
  | 'count.toolCall'
  | 'count.toolCalls'
  | 'count.failure'
  | 'count.failures'
  | 'count.image'
  | 'count.images'

/** 将插件私有文案键并入 slot 的类型注册表，使 t(...) 只能使用已声明的键。 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'compact-activity': CompactActivityKey
  }
}

/** 中文文案。 */
export const zh: LocaleDictOf<typeof ACTIVITY_NS> = {
  'status.running': '进行中...',
  'status.done': '已完成',
  'status.error': '执行错误',
  'status.thinking': '正在思考',
  'status.toolRunning': '工具执行中',
  'count.thought': '{count} 段思考',
  'count.thoughts': '{count} 段思考',
  'count.toolCall': '{count} 次工具调用',
  'count.toolCalls': '{count} 次工具调用',
  'count.failure': '{count} 个失败步骤',
  'count.failures': '{count} 个失败步骤',
  'count.image': '{count} 张图片',
  'count.images': '{count} 张图片',
}

/** 英文文案，作为未匹配中文环境时的回退。 */
export const en: LocaleDictOf<typeof ACTIVITY_NS> = {
  'status.running': 'In progress...',
  'status.done': 'Done',
  'status.error': 'Execution error',
  'status.thinking': 'Thinking',
  'status.toolRunning': 'Tool running',
  'count.thought': '{count} thought',
  'count.thoughts': '{count} thoughts',
  'count.toolCall': '{count} tool call',
  'count.toolCalls': '{count} tool calls',
  'count.failure': '{count} failed step',
  'count.failures': '{count} failed steps',
  'count.image': '{count} image',
  'count.images': '{count} images',
}
