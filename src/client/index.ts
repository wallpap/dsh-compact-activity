import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { CompactActivityController } from './components/CompactActivityController.tsx'
import { STYLE_ID, STYLE_TEXT } from './styles.ts'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset['plugin'] = STYLE_ID
    style.textContent = STYLE_TEXT
    document.head.appendChild(style)
    return () => { style.remove() }
  }, 'dsh-compact-activity: styles')

  // 只附加总折叠控制器，不覆盖官方 assistant 或 Tool 渲染器。
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'dsh-compact-activity-controller',
    order: -100,
  }, CompactActivityController))
}
