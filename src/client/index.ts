import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { CompactActivityController } from './components/CompactActivityController.tsx'
import { ACTIVITY_NS, en, zh } from './locales.ts'
import { STYLE_ID, STYLE_TEXT } from './styles.ts'
import type {} from '@deepseek-ai/dsh-client-locale/client'

export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(ACTIVITY_NS, { zh, en }), 'dsh-compact-activity: locale')
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset['plugin'] = STYLE_ID
    style.textContent = STYLE_TEXT
    document.head.appendChild(style)
    return () => { style.remove() }
  }, 'dsh-compact-activity: styles')

  // 以 Header slot 作为持久的 React 生命周期挂载点；控制器自身不输出 Header 内容，
  // 只附加总折叠标记，不覆盖官方 assistant 或 Tool 渲染器。
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'dsh-compact-activity-controller',
    order: -100,
    locale: ACTIVITY_NS,
  }, CompactActivityController))
}
