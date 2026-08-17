import type { LocaleDictOf, LocaleNamespaceMap } from '@deepseek-ai/dsh-client-ui-slots'

export const ACTIVITY_NS = 'compact-activity' as const

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

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'compact-activity': CompactActivityKey
  }
}

export const zh: LocaleDictOf<typeof ACTIVITY_NS> = {
  'status.running': '进行中...',
  'status.done': '已完成',
  'status.error': '执行失败',
  'status.thinking': '正在思考',
  'status.toolRunning': '工具执行中',
  'count.thought': '{count} 段思考',
  'count.thoughts': '{count} 段思考',
  'count.toolCall': '{count} 次工具调用',
  'count.toolCalls': '{count} 次工具调用',
}

export const en: LocaleDictOf<typeof ACTIVITY_NS> = {
  'status.running': 'In progress...',
  'status.done': 'Done',
  'status.error': 'Error',
  'status.thinking': 'Thinking',
  'status.toolRunning': 'Tool running',
  'count.thought': '{count} thought',
  'count.thoughts': '{count} thoughts',
  'count.toolCall': '{count} tool call',
  'count.toolCalls': '{count} tool calls',
}
