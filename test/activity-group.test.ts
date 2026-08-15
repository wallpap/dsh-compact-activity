import assert from 'node:assert/strict'
import test from 'node:test'
import type { AssistantBlock, ChatNodeStore, RunningToolCall } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { activityGroups } from '../src/client/activity-group.ts'

function assistant(key: string, blocks: readonly AssistantBlock[]): ChatNode<'assistant-step'> {
  return {
    key,
    id: key,
    kind: 'assistant-step',
    target: 'chat',
    anchorSeq: 0,
    location: { kind: 'unresolved' },
    visibility: 'visible',
    data: { status: 'settled', turn: 1, step: 1, blocks, time: 0 },
  }
}

function tool(key: string, name: string): ChatNode<'tool-call'> {
  const root: RunningToolCall = {
    callId: key,
    name,
    argsRaw: '{}',
    turn: 1,
    step: 1,
    time: 0,
    callView: null,
    subCalls: [],
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

test('groups multiple process rows but leaves output and a single process row official', () => {
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

  assert.equal(groups.length, 1)
  assert.deepEqual(groups[0]?.keys, ['reason', 'read', 'answer'])
  assert.equal(groups[0]?.partialKey, 'answer')
  assert.equal(groups[0]?.latestKey, 'answer')
  assert.equal(groups[0]?.latestKind, 'reasoning')
  assert.equal(groups[0]?.count, '2 段思考 · 1 次工具调用')
  assert.equal(groups[0]?.running, false)
  assert.equal(activityGroups(['answer'], nodeStore([nodes[2] as ChatNode])).length, 0)
})
