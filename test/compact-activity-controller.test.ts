import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { AssistantBlock, ChatNodeStore, ToolResultNode } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { CompactActivityController } from '../src/client/components/CompactActivityController.tsx'

let dom: JSDOM | undefined
let root: Root | undefined

function installDom(): HTMLElement {
  dom = new JSDOM('<!doctype html><body><div id="root"></div></body>')
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    MutationObserver: dom.window.MutationObserver,
    HTMLElement: dom.window.HTMLElement,
    HTMLDetailsElement: dom.window.HTMLDetailsElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  return dom.window.document.querySelector<HTMLElement>('#root') as HTMLElement
}

afterEach(() => {
  act(() => { root?.unmount() })
  root = undefined
  dom?.window.close()
  dom = undefined
})

function assistant(key: string, blocks: readonly AssistantBlock[], status: 'running' | 'settled' = 'settled'): ChatNode<'assistant-step'> {
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

function toolResult(callId: string, isError = false): ToolResultNode {
  return {
    kind: 'tool-result',
    seq: 0,
    time: 0,
    callId,
    call: { name: 'read', argsRaw: '{}' },
    callTime: 0,
    content: [],
    isError,
    callView: null,
    resultView: null,
    subCalls: [],
  }
}

function tool(key: string, running = false, isError = false): ChatNode<'tool-call'> {
  return {
    key,
    id: key,
    kind: 'tool-call',
    target: 'chat',
    anchorSeq: 0,
    location: { kind: 'unresolved' },
    visibility: 'visible',
    data: running
      ? {
          root: {
            callId: key,
            name: 'read',
            argsRaw: '{}',
            turn: 1,
            step: 1,
            time: 0,
            callView: null,
            subCalls: [],
          },
        }
      : { root: toolResult(key, isError) },
  }
}

function store(nodes: readonly ChatNode[]): ChatNodeStore {
  const byKey = new Map(nodes.map(node => [node.key, node]))
  return { get: key => byKey.get(key), values: () => [...nodes] }
}

function render(nodes: readonly ChatNode[]): HTMLElement {
  const container = installDom()
  const flow = document.createElement('div')
  flow.dataset['chatFlow'] = ''
  for (const node of nodes) {
    const row = document.createElement('div')
    row.dataset['chatFlowKey'] = node.key
    if (node.kind === 'assistant-step') {
      for (const block of node.data.blocks) {
        const blockElement = document.createElement('div')
        blockElement.dataset['variant'] = block.kind === 'reasoning' ? 'think' : 'text'
        blockElement.textContent = block.kind === 'reasoning' || block.kind === 'text' ? block.text : ''
        row.append(blockElement)
      }
    } else {
      const toolNode = node as ChatNode<'tool-call'>
      const toolElement = document.createElement('div')
      toolElement.dataset['tool'] = ''
      toolElement.dataset['state'] = 'kind' in toolNode.data.root ? 'settled' : 'running'
      const disclosure = document.createElement('div')
      disclosure.dataset['disclosureRow'] = ''
      const icon = document.createElement('span')
      const title = document.createElement('span')
      title.textContent = '读取'
      const summary = document.createElement('span')
      summary.textContent = '文件'
      disclosure.append(icon, title, summary)
      toolElement.append(disclosure)
      row.append(toolElement)
    }
    flow.append(row)
  }
  document.body.append(flow)

  const snapshot = { chat: { order: nodes.map(node => node.key), nodes: store(nodes) } }
  const props = {
    useSession: (select: (value: typeof snapshot) => unknown) => select(snapshot),
  } as never
  root = createRoot(container)
  act(() => { root?.render(React.createElement(CompactActivityController, props)) })
  return flow
}

test('inserts a collapsed marker, preserves mixed output, and expands children', () => {
  const flow = render([
    assistant('reason', [{ kind: 'reasoning', text: '检查' }]),
    assistant('answer', [
      { kind: 'reasoning', text: '完成' },
      { kind: 'text', text: '正文' },
    ]),
  ])
  const marker = flow.querySelector<HTMLDetailsElement>('details[data-dca-activity-group]')
  assert.ok(marker)
  assert.equal(marker.open, false)
  assert.equal(flow.querySelector('[data-chat-flow-key="reason"]')?.classList.contains('dca-activity-child'), true)
  assert.equal(flow.querySelector('[data-chat-flow-key="answer"] [data-variant="think"]')?.classList.contains('dca-activity-reasoning-child'), true)
  assert.match(marker.textContent ?? '', /已完成/)
  assert.match(marker.textContent ?? '', /2 段思考/)

  marker.open = true
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(flow.querySelector('[data-chat-flow-key="reason"]')?.classList.contains('dca-activity-child'), false)
  assert.equal(flow.querySelector('[data-chat-flow-key="answer"] [data-variant="think"]')?.classList.contains('dca-activity-reasoning-child'), false)
})

test('shows running tool summary and cleans up on unmount', () => {
  const flow = render([
    assistant('reason', [{ kind: 'reasoning', text: '执行' }]),
    tool('run', true),
  ])
  const marker = flow.querySelector<HTMLDetailsElement>('details[data-dca-activity-group]')
  assert.ok(marker)
  assert.equal(marker.dataset['running'], 'true')
  assert.match(marker.textContent ?? '', /进行中/)
  assert.match(marker.textContent ?? '', /读取 · 文件/)

  act(() => { root?.unmount() })
  root = undefined
  assert.equal(flow.querySelector('details[data-dca-activity-group]'), null)
  assert.equal(flow.querySelector('[data-chat-flow-key="reason"]')?.classList.contains('dca-activity-child'), false)
})
