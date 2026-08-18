import type { AssistantBlock, ChatNodeStore, ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-conversation/client'

export type ActivityMemberState = 'running' | 'done' | 'error'

export interface ActivityMember {
  readonly rowKey: string
  readonly kind: 'reasoning' | 'tool'
  readonly state: ActivityMemberState
}

/** 一组连续的 DSH 官方过程行。 */
export interface ActivityGroup {
  readonly firstKey: string
  /** 所有包含过程项的行；可能包含同时承载正文的边界行。 */
  readonly keys: readonly string[]
  /** 此行的模型正文保持可见，只折叠其中的官方 Think 子项。 */
  readonly partialKey?: string
  /** 最新过程项所在行；进行中时从该行复用官方摘要。 */
  readonly latestKey: string
  readonly latestKind: 'reasoning' | 'tool'
  readonly reasoningCount: number
  readonly toolCount: number
  /** 过程内失败或中断的思考／工具步骤数。 */
  readonly failureCount: number
  /** 展开后可见的顶层官方过程项及各自状态；嵌套工具继续使用 DSH 官方层级。 */
  readonly members: readonly ActivityMember[]
  readonly running: boolean
  /** 仅表示最后一个过程项异常结束；历史失败由 failureCount 保留。 */
  readonly error: boolean
}

type ActivityNode = ChatNode<'assistant-step' | 'tool-call'>

function nodeAt(store: ChatNodeStore, key: string): ChatNode | undefined {
  return store.get(key) as ChatNode | undefined
}

function reasoningBlocks(blocks: readonly AssistantBlock[]): readonly Extract<AssistantBlock, { kind: 'reasoning' }>[] {
  return blocks.filter(
    (block): block is Extract<AssistantBlock, { kind: 'reasoning' }> =>
      block.kind === 'reasoning' && block.text.trim() !== '',
  )
}

/** 含可见正文的 assistant 消息是过程列表边界。 */
function hasAssistantOutput(blocks: readonly AssistantBlock[]): boolean {
  return blocks.some(block => block.kind === 'text'
    ? block.text.trim() !== ''
    : block.kind === 'image' || block.kind === 'other')
}

/** 纯思考消息才是完整过程行；含正文的混合消息保留官方整行渲染。 */
function isActivityNode(node: ChatNode | undefined): node is ActivityNode {
  if (node?.kind === 'tool-call') return true
  return node?.kind === 'assistant-step'
    && reasoningBlocks(node.data.blocks).length > 0
    && !hasAssistantOutput(node.data.blocks)
}

interface ActivityEntry {
  readonly rowKey: string
  readonly running: boolean
  readonly error: boolean
  /** 此项代表所在官方过程行的最终结果。 */
  readonly terminal: boolean
  readonly kind: 'reasoning' | 'tool'
}

function memberState(entry: ActivityEntry): ActivityMemberState {
  if (entry.running) return 'running'
  return entry.error ? 'error' : 'done'
}

function reasoningEntries(node: ChatNode<'assistant-step'>): ActivityEntry[] {
  const blocks = reasoningBlocks(node.data.blocks)
  const last = blocks.at(-1)
  return blocks.map(block => {
    const terminal = block === last
    const isFinalBlock = terminal && node.data.blocks.at(-1) === block
    return {
      rowKey: node.key,
      running: node.data.status === 'running' && isFinalBlock,
      error: node.data.status === 'interrupted' && isFinalBlock,
      terminal,
      kind: 'reasoning',
    }
  })
}

function toolEntries(block: ToolCallBlock, rowKey: string, terminal = true): ActivityEntry[] {
  const failed = 'kind' in block && (block.isError
    || (block.resultView?.card === 'terminal'
      && ((block.resultView.exitCode !== undefined && block.resultView.exitCode !== 0)
        || block.resultView.signal !== undefined)))
  return [
    {
      rowKey,
      running: !('kind' in block),
      error: failed,
      terminal,
      kind: 'tool',
    },
    ...block.subCalls.flatMap(child => toolEntries(child, rowKey, false)),
  ]
}

function groupFrom(
  order: readonly string[],
  store: ChatNodeStore,
  start: number,
  end: number,
  partialKey?: string,
): ActivityGroup {
  const keys = [...order.slice(start, end), ...(partialKey === undefined ? [] : [partialKey])]
  const entries = keys.flatMap(key => {
    const node = nodeAt(store, key)
    if (node?.kind === 'tool-call') return toolEntries(node.data.root, node.key)
    return node?.kind === 'assistant-step' ? reasoningEntries(node) : []
  })
  // 父工具可以仍在运行，而其最后一个子工具已经结束。此时应继续显示进行中，
  // 并以最后一个运行项作为实时状态来源；全部结束后才回退到最后一个过程项。
  const running = entries.findLast(entry => entry.running)
  const latest = running ?? entries.findLast(entry => entry.terminal)
  if (latest === undefined) throw new Error('activity group requires at least one activity entry')
  const reasoningCount = entries.filter(entry => entry.kind === 'reasoning').length
  const failureCount = entries.filter(entry => entry.error).length
  const members = entries
    .filter(entry => entry.kind === 'reasoning' || entry.terminal)
    .map(entry => ({ rowKey: entry.rowKey, kind: entry.kind, state: memberState(entry) }))
  return {
    firstKey: keys[0] ?? '',
    keys,
    ...(partialKey === undefined ? {} : { partialKey }),
    latestKey: latest.rowKey,
    latestKind: latest.kind,
    reasoningCount,
    toolCount: entries.length - reasoningCount,
    failureCount,
    members,
    running: running !== undefined,
    error: running === undefined && latest.error,
  }
}

/** 只为至少包含两个过程项的连续列表创建总折叠。 */
export function activityGroups(order: readonly string[], store: ChatNodeStore): readonly ActivityGroup[] {
  const groups: ActivityGroup[] = []
  let index = 0
  while (index < order.length) {
    if (!isActivityNode(nodeAt(store, order[index] ?? ''))) {
      index++
      continue
    }
    const start = index
    while (index < order.length && isActivityNode(nodeAt(store, order[index] ?? ''))) index++
    const boundary = nodeAt(store, order[index] ?? '')
    // 最后一条 assistant 可能先完成思考再输出正文。它的思考仍属于前一过程列表，
    // 但正文必须留在总折叠之外，因此记录为 partialKey，而不是吞掉整行。
    const partialNode = boundary?.kind === 'assistant-step'
      && hasAssistantOutput(boundary.data.blocks)
      && reasoningBlocks(boundary.data.blocks).length > 0
      ? boundary
      : undefined
    const partialKey = partialNode?.key
    const processCount = index - start
      + (partialNode === undefined ? 0 : reasoningBlocks(partialNode.data.blocks).length)
    if (processCount >= 2) groups.push(groupFrom(order, store, start, index, partialKey))
    if (partialKey !== undefined) index++
  }
  return groups
}
