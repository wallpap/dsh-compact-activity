import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  AssistantBlock, ChatNodeStore, RunningToolCall, ToolCallBlock, ToolResultNode,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { activityGroups } from '../src/client/activity-group.ts'

function assistant(
  key: string,
  blocks: readonly AssistantBlock[],
  status: 'running' | 'settled' | 'interrupted' = 'settled',
): ChatNode<'assistant-step'> {
  return {
    key,
    id: key,
    kind: 'assistant-step',
    target: 'chat',
    anchorSeq: 0,
    location: { kind: 'unresolved' },
    visibility: 'visible',
    data: { status, turn: 1, step: 1, blocks, time: 0 },
  }
}

function settledTool(callId: string, name: string, subCalls: readonly ToolCallBlock[] = []): ToolResultNode {
  return {
    kind: 'tool-result',
    seq: 0,
    time: 0,
    callId,
    call: { name, argsRaw: '{}' },
    callTime: 0,
    content: [],
    isError: false,
    callView: null,
    resultView: null,
    subCalls,
  }
}

function errorTool(callId: string, name: string, subCalls: readonly ToolCallBlock[] = []): ToolResultNode {
  return { ...settledTool(callId, name, subCalls), isError: true }
}

function tool(key: string, name: string): ChatNode<'tool-call'> {
  return {
    key,
    id: key,
    kind: 'tool-call',
    target: 'chat',
    anchorSeq: 0,
    location: { kind: 'unresolved' },
    visibility: 'visible',
    data: { root: settledTool(key, name) },
  }
}

function errorResultTool(key: string, name: string): ChatNode<'tool-call'> {
  return {
    ...tool(key, name),
    data: { root: errorTool(key, name) },
  }
}

function failedTerminalTool(key: string, name: string, exitCode = 1): ChatNode<'tool-call'> {
  return {
    ...tool(key, name),
    data: { root: { ...settledTool(key, name), resultView: { card: 'terminal', exitCode } } },
  }
}

function runningTool(key: string, name: string, subCalls: readonly ToolCallBlock[] = []): ChatNode<'tool-call'> {
  const root: RunningToolCall = {
    callId: key,
    name,
    argsRaw: '{}',
    turn: 1,
    step: 1,
    time: 0,
    callView: null,
    subCalls,
  }
  return {
    key,
    id: key,
    kind: 'tool-call',
    target: 'chat',
    anchorSeq: 0,
    location: { kind: 'unresolved' },
    visibility: 'visible',
    data: { root },
  }
}

function nodeStore(nodes: readonly ChatNode[]): ChatNodeStore {
  const values = [...nodes]
  const byKey = new Map(values.map(node => [node.key, node]))
  return { get: key => byKey.get(key), values: () => values }
}

test('groups single process rows and preserves mixed assistant output', () => {
  const nodes = [
    assistant('reason', [{ kind: 'reasoning', text: '检查目录' }]),
    tool('read', 'read'),
    assistant('answer', [
      { kind: 'reasoning', text: '完成' },
      { kind: 'text', text: '模型正文' },
    ]),
    tool('single', 'web_search'),
  ] satisfies readonly ChatNode[]
  const groups = activityGroups(nodes.map(node => node.key), nodeStore(nodes))

  assert.equal(groups.length, 2)
  assert.deepEqual(groups[0]?.keys, ['reason', 'read', 'answer'])
  assert.equal(groups[0]?.partialKey, 'answer')
  assert.equal(groups[0]?.latestKey, 'answer')
  assert.equal(groups[0]?.latestKind, 'reasoning')
  assert.equal(groups[0]?.reasoningCount, 2)
  assert.equal(groups[0]?.toolCount, 1)
  assert.deepEqual(groups[0]?.members, [
    { rowKey: 'reason', kind: 'reasoning', state: 'done' },
    { rowKey: 'read', kind: 'tool', state: 'done' },
    { rowKey: 'answer', kind: 'reasoning', state: 'done' },
  ])
  assert.equal(groups[0]?.running, false)
  assert.deepEqual(groups[1]?.keys, ['single'])
  assert.equal(groups[1]?.toolCount, 1)

  const partial = activityGroups(['answer'], nodeStore([nodes[2] as ChatNode]))[0]
  assert.deepEqual(partial?.keys, ['answer'])
  assert.equal(partial?.partialKey, 'answer')
  assert.equal(partial?.reasoningCount, 1)

  const nested = runningTool('nested', 'run_code', [settledTool('child', 'read')])
  const running = activityGroups(['reason', 'nested'], nodeStore([nodes[0] as ChatNode, nested]))[0]
  assert.equal(running?.running, true)
  assert.equal(running?.latestKind, 'tool')
  assert.equal(running?.reasoningCount, 1)
  assert.equal(running?.toolCount, 2)
})

test('ignores blank reasoning and blank text, but treats visible output as a boundary', () => {
  const nodes = [
    assistant('blank', [{ kind: 'reasoning', text: '  ' }]),
    assistant('reason', [{ kind: 'reasoning', text: '有效' }]),
    assistant('image', [
      { kind: 'reasoning', text: '准备' },
      { kind: 'other', block: { source: 'test' } },
    ]),
    assistant('text-blank', [
      { kind: 'reasoning', text: '继续' },
      { kind: 'text', text: '\n  ' },
    ]),
    tool('single', 'read'),
  ] satisfies readonly ChatNode[]

  const groups = activityGroups(nodes.map(node => node.key), nodeStore(nodes))
  assert.equal(groups.length, 2)
  assert.deepEqual(groups.map(group => group.keys), [
    ['reason', 'image'],
    ['text-blank', 'single'],
  ])
  assert.equal(groups[0]?.partialKey, 'image')
  assert.equal(groups[0]?.reasoningCount, 2)
  assert.equal(groups[0]?.toolCount, 0)
})

test('creates separate groups around non-activity nodes', () => {
  const nodes = [
    assistant('first', [{ kind: 'reasoning', text: '一' }]),
    tool('first-tool', 'read'),
    assistant('answer', [{ kind: 'text', text: '正文' }]),
    assistant('second', [{ kind: 'reasoning', text: '二' }]),
    tool('second-tool', 'write'),
    assistant('single', [{ kind: 'reasoning', text: '单条' }]),
  ] satisfies readonly ChatNode[]

  const groups = activityGroups(nodes.map(node => node.key), nodeStore(nodes))
  assert.equal(groups.length, 2)
  assert.deepEqual(groups.map(group => group.keys), [
    ['first', 'first-tool'],
    ['second', 'second-tool', 'single'],
  ])
  assert.equal(groups[0]?.latestKind, 'tool')
  assert.equal(groups[1]?.latestKind, 'reasoning')
})

test('marks only the final running reasoning block as active', () => {
  const nodes = [
    assistant('running', [
      { kind: 'reasoning', text: '先前' },
      { kind: 'reasoning', text: '当前' },
    ], 'running'),
    tool('done', 'read'),
  ] satisfies readonly ChatNode[]

  const group = activityGroups(nodes.map(node => node.key), nodeStore(nodes))[0]
  assert.equal(group?.running, true)
  assert.equal(group?.latestKey, 'running')
  assert.equal(group?.latestKind, 'reasoning')
  assert.equal(group?.reasoningCount, 2)
  assert.equal(group?.toolCount, 1)
  assert.deepEqual(group?.members, [
    { rowKey: 'running', kind: 'reasoning', state: 'done' },
    { rowKey: 'running', kind: 'reasoning', state: 'running' },
    { rowKey: 'done', kind: 'tool', state: 'done' },
  ])
})

test('counts failures but only reports an error when the final process item fails', () => {
  const failed = errorResultTool('failed', 'read')
  const nodes = [
    assistant('reason', [{ kind: 'reasoning', text: '检查' }]),
    failed,
  ] satisfies readonly ChatNode[]
  const errorGroup = activityGroups(nodes.map(node => node.key), nodeStore(nodes))[0]
  assert.equal(errorGroup?.running, false)
  assert.equal(errorGroup?.error, true)
  assert.equal(errorGroup?.failureCount, 1)
  assert.equal(errorGroup?.latestKey, 'failed')

  const recovered = tool('recovered', 'write')
  const recoveredGroup = activityGroups(
    ['reason', 'failed', 'recovered'],
    nodeStore([nodes[0] as ChatNode, failed, recovered]),
  )[0]
  assert.equal(recoveredGroup?.error, false)
  assert.equal(recoveredGroup?.failureCount, 1)
  assert.equal(recoveredGroup?.latestKey, 'recovered')
  assert.deepEqual(recoveredGroup?.members.map(member => member.state), ['done', 'error', 'done'])

  const nested = runningTool('parent', 'run_code', [errorTool('child', 'read')])
  const runningGroup = activityGroups(['reason', 'parent'], nodeStore([
    nodes[0] as ChatNode,
    nested,
  ]))[0]
  assert.equal(runningGroup?.running, true)
  assert.equal(runningGroup?.error, false)
  assert.equal(runningGroup?.failureCount, 1)
  assert.equal(runningGroup?.reasoningCount, 1)
  assert.equal(runningGroup?.toolCount, 2)

  const recoveredParent = {
    ...tool('parent-done', 'run_code'),
    data: { root: settledTool('parent-done', 'run_code', [errorTool('failed-child', 'read')]) },
  } satisfies ChatNode<'tool-call'>
  const recoveredParentGroup = activityGroups(['reason', 'parent-done'], nodeStore([
    nodes[0] as ChatNode,
    recoveredParent,
  ]))[0]
  assert.equal(recoveredParentGroup?.error, false)
  assert.equal(recoveredParentGroup?.failureCount, 1)
})

test('treats an interrupted final reasoning block as an execution error', () => {
  const nodes = [
    assistant('reason', [{ kind: 'reasoning', text: '准备' }]),
    assistant('stopped', [{ kind: 'reasoning', text: '未完成' }], 'interrupted'),
  ] satisfies readonly ChatNode[]

  const group = activityGroups(nodes.map(node => node.key), nodeStore(nodes))[0]
  assert.equal(group?.running, false)
  assert.equal(group?.error, true)
  assert.equal(group?.failureCount, 1)
  assert.equal(group?.latestKey, 'stopped')
  assert.equal(group?.latestKind, 'reasoning')
  assert.deepEqual(group?.members.map(member => member.state), ['done', 'error'])
})

test('keeps a final tool error when the next node is only model output', () => {
  const nodes = [
    assistant('reason', [{ kind: 'reasoning', text: '准备' }]),
    errorResultTool('failed', 'read'),
    assistant('answer', [{ kind: 'text', text: '仍然回复正文' }]),
  ] satisfies readonly ChatNode[]

  const groups = activityGroups(nodes.map(node => node.key), nodeStore(nodes))
  assert.equal(groups.length, 1)
  assert.deepEqual(groups[0]?.keys, ['reason', 'failed'])
  assert.equal(groups[0]?.error, true)
  assert.equal(groups[0]?.failureCount, 1)
  assert.equal(groups[0]?.latestKey, 'failed')
})

test('counts nonzero terminal exits as tool failures', () => {
  const nodes = [
    assistant('reason', [{ kind: 'reasoning', text: '执行命令' }]),
    failedTerminalTool('pwsh', 'pwsh', 1),
  ] satisfies readonly ChatNode[]

  const group = activityGroups(nodes.map(node => node.key), nodeStore(nodes))[0]
  assert.equal(group?.failureCount, 1)
  assert.equal(group?.error, true)
  assert.deepEqual(group?.members.map(member => member.state), ['done', 'error'])
})

test('counts deeply nested and sibling tool calls', () => {
  const nested = runningTool('root', 'run_code', [
    settledTool('child-1', 'read', [settledTool('grandchild', 'parse')]),
    settledTool('child-2', 'write'),
  ])
  const nodes = [
    assistant('reason', [{ kind: 'reasoning', text: '执行' }]),
    nested,
  ] satisfies readonly ChatNode[]

  const group = activityGroups(nodes.map(node => node.key), nodeStore(nodes))[0]
  assert.equal(group?.reasoningCount, 1)
  assert.equal(group?.toolCount, 4)
  assert.equal(group?.running, true)
  assert.equal(group?.latestKind, 'tool')
})

test('returns no groups for empty, unknown, or non-process order entries', () => {
  const answer = assistant('answer', [{ kind: 'text', text: '正文' }])
  const nodes = [answer]
  const store = nodeStore(nodes)
  assert.deepEqual(activityGroups([], store), [])
  assert.deepEqual(activityGroups(['missing'], store), [])
  assert.deepEqual(activityGroups(['answer'], store), [])
})
