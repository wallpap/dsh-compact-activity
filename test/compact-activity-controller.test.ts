import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { AssistantBlock, ChatNodeStore, ToolResultNode } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { CompactActivityController } from '../src/client/components/CompactActivityController.tsx'
import { en, zh } from '../src/client/locales.ts'

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

function render(nodes: readonly ChatNode[], dictionary: typeof en = en): HTMLElement {
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
    t: (key: string, params?: Record<string, unknown>) => {
      const template = dictionary[key as keyof typeof dictionary] ?? key
      return params === undefined
        ? template
        : template.replace(/\{(\w+)\}/g, (match, name: string) => name in params ? String(params[name]) : match)
    },
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
  assert.match(marker.textContent ?? '', /Done/)
  assert.equal(marker.querySelector('[data-dca-count="reasoning"]')?.textContent, '×2')
  assert.equal(marker.querySelector('[data-dca-count="reasoning"]')?.getAttribute('aria-label'), '2 thoughts')

  marker.open = true
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(flow.querySelector('[data-chat-flow-key="reason"]')?.classList.contains('dca-activity-child'), false)
  assert.equal(flow.querySelector('[data-chat-flow-key="answer"] [data-variant="think"]')?.classList.contains('dca-activity-reasoning-child'), false)
})

test('shows running tool summary and cleans up on unmount', async () => {
  const flow = render([
    assistant('reason', [{ kind: 'reasoning', text: '执行' }]),
    tool('run', true),
  ], zh)
  const marker = flow.querySelector<HTMLDetailsElement>('details[data-dca-activity-group]')
  assert.ok(marker)
  assert.equal(marker.dataset['running'], 'true')
  assert.match(marker.textContent ?? '', /进行中/)
  assert.match(marker.textContent ?? '', /读取 · 文件/)

  act(() => { root?.unmount() })
  root = undefined
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(flow.querySelector('details[data-dca-activity-group]'), null)
  assert.equal(flow.querySelector('[data-chat-flow-key="reason"]')?.classList.contains('dca-activity-child'), false)
})

test('announces terminal errors and renders icon counts with accessible labels', () => {
  const flow = render([
    assistant('reason', [{ kind: 'reasoning', text: 'Check' }]),
    tool('failed', false, true),
  ])
  const marker = flow.querySelector<HTMLDetailsElement>('details[data-dca-activity-group]')
  assert.ok(marker)
  assert.equal(marker.dataset['error'], 'true')
  assert.match(marker.textContent ?? '', /Execution error/)
  assert.equal(marker.querySelector('[data-dca-count="reasoning"]')?.textContent, '×1')
  assert.equal(marker.querySelector('[data-dca-count="reasoning"]')?.getAttribute('aria-label'), '1 thought')
  assert.ok(marker.querySelector('[data-dca-count="reasoning"] svg.dca-count-icon'))
  assert.equal(marker.querySelector('[data-dca-count="tool"]')?.textContent, '×1')
  assert.equal(marker.querySelector('[data-dca-count="tool"]')?.getAttribute('aria-label'), '1 tool call')
  assert.ok(marker.querySelector('[data-dca-count="tool"] svg.dca-count-icon'))
  assert.equal(marker.querySelector('[data-dca-count="failure"]')?.textContent, '×1')
  assert.equal(marker.querySelector('[data-dca-count="failure"]')?.getAttribute('aria-label'), '1 failed step')
  assert.ok(marker.querySelector('[data-dca-count="failure"] svg.dca-count-icon'))
  assert.equal(marker.querySelector('[role="status"]')?.getAttribute('aria-live'), 'polite')
})

test('shows completed after recovery while retaining the failure count', () => {
  const flow = render([
    assistant('reason', [{ kind: 'reasoning', text: 'Check' }]),
    tool('failed', false, true),
    tool('recovered'),
  ])
  const marker = flow.querySelector<HTMLDetailsElement>('details[data-dca-activity-group]')
  assert.ok(marker)
  assert.equal(marker.dataset['error'], 'false')
  assert.match(marker.textContent ?? '', /Done/)
  assert.equal(marker.querySelector('[data-dca-count="tool"]')?.textContent, '×2')
  assert.equal(marker.querySelector('[data-dca-count="failure"]')?.textContent, '×1')
})

test('keeps execution error when model output follows the failed final tool', () => {
  const flow = render([
    assistant('reason', [{ kind: 'reasoning', text: 'Check' }]),
    tool('failed', false, true),
    assistant('answer', [{ kind: 'text', text: 'Visible answer' }]),
  ])
  const marker = flow.querySelector<HTMLDetailsElement>('details[data-dca-activity-group]')
  assert.ok(marker)
  assert.equal(marker.dataset['error'], 'true')
  assert.match(marker.textContent ?? '', /Execution error/)
  assert.equal(flow.querySelector('[data-chat-flow-key="answer"]')?.classList.contains('dca-activity-child'), false)
  assert.match(flow.querySelector('[data-chat-flow-key="answer"]')?.textContent ?? '', /Visible answer/)
})

test('keeps the locale dictionaries bilingual and complete', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort())
  assert.equal(en['status.running'], 'In progress...')
  assert.equal(zh['status.running'], '进行中...')
  assert.equal(en['status.error'], 'Execution error')
  assert.equal(zh['status.error'], '执行错误')
})
