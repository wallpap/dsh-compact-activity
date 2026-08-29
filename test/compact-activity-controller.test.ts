import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { AssistantBlock, ToolResultNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatNode, ChatNodeStore } from '@deepseek-ai/dsh-client-ui-chat/client'
import { CompactActivityController } from '../src/client/components/CompactActivityController.tsx'
import { en, zh } from '../src/client/locales.ts'
import { STYLE_TEXT } from '../src/client/styles.ts'

let dom: JSDOM | undefined
let root: Root | undefined

function installDom(): HTMLElement {
  // jsdom 不会自动暴露控制器依赖的浏览器全局对象，测试仅安装这几个 API。
  dom = new JSDOM('<!doctype html><body><div id="root"></div></body>')
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    MutationObserver: dom.window.MutationObserver,
    HTMLElement: dom.window.HTMLElement,
    HTMLDetailsElement: dom.window.HTMLDetailsElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const style = dom.window.document.createElement('style')
  style.textContent = STYLE_TEXT
  dom.window.document.head.append(style)
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

function render(nodes: readonly ChatNode[], dictionary: typeof en = en, officialOpen?: boolean): HTMLElement {
  const container = installDom()
  const flow = document.createElement('div')
  flow.dataset['chatFlow'] = ''
  if (officialOpen !== undefined) {
    const control = document.createElement('button')
    control.dataset['turnProcess'] = '1'
    control.setAttribute('aria-expanded', String(officialOpen))
    flow.append(control)
  }
  for (const node of nodes) {
    const row = document.createElement('div')
    row.dataset['chatFlowKey'] = node.key
    row.dataset['chatTurn'] = '1'
    if (officialOpen === false && (node.kind === 'tool-call'
      || node.kind === 'assistant-step' && node.data.blocks.every(block => block.kind === 'reasoning'))) {
      row.setAttribute('hidden', 'until-found')
    }
    if (node.kind === 'assistant-step') {
      const assistantRoot = document.createElement('div')
      const assistantBody = document.createElement('div')
      assistantRoot.append(assistantBody)
      row.append(assistantRoot)
      for (const block of node.data.blocks) {
        const blockElement = document.createElement('div')
        blockElement.dataset['variant'] = block.kind === 'reasoning' ? 'think' : 'text'
        blockElement.textContent = block.kind === 'reasoning' || block.kind === 'text' ? block.text : ''
        if (block.kind === 'reasoning') {
          const inlineProcess = document.createElement('div')
          if (officialOpen === false && node.data.blocks.some(item => item.kind === 'text')) {
            inlineProcess.dataset['turnProcessInline'] = ''
            inlineProcess.setAttribute('hidden', 'until-found')
          }
          inlineProcess.append(blockElement)
          assistantBody.append(inlineProcess)
        } else {
          assistantBody.append(blockElement)
        }
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

  // 夹具只复现插件依赖的稳定 DSH DOM 标记，不复制官方过程行的渲染实现。
  const snapshot = { order: nodes.map(node => node.key), nodes: store(nodes) }
  const props = {
    useChat: (select: (value: typeof snapshot) => unknown) => select(snapshot),
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

test('mirrors the official Turn disclosure and uses native hidden ownership', async () => {
  const flow = render([
    assistant('reason', [{ kind: 'reasoning', text: '检查' }]),
  ], en, false)
  const marker = flow.querySelector<HTMLDetailsElement>('details[data-dca-activity-group]')
  const row = flow.querySelector<HTMLElement>('[data-chat-flow-key="reason"]')
  assert.ok(marker)
  assert.ok(row)
  assert.equal(marker.hidden, true)
  assert.equal(row.hidden, true)
  assert.equal(row.dataset['dcaHidden'], '')
  assert.equal(dom?.window.getComputedStyle(row).display, 'none')

  const control = flow.querySelector<HTMLElement>('[data-turn-process]')
  control?.setAttribute('aria-expanded', 'true')
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  assert.equal(marker.hidden, false)
  assert.equal(row.hidden, true)

  row.removeAttribute('hidden')
  marker.open = true
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(row.hidden, false)
  assert.equal(row.dataset['dcaHidden'], undefined)
})

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
  assert.ok(marker.querySelector('.dca-state-rail'))
  const firstMember = flow.querySelector<HTMLElement>('[data-chat-flow-key="reason"] [data-variant="think"]')
  const lastMember = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"] [data-variant="think"]')
  const answerBody = lastMember?.parentElement?.parentElement
  assert.equal(firstMember?.dataset['dcaMemberState'], 'done')
  assert.equal(firstMember?.classList.contains('dca-activity-member-first'), true)
  assert.equal(lastMember?.dataset['dcaMemberState'], 'done')
  assert.equal(lastMember?.classList.contains('dca-activity-member-last'), true)
  assert.equal(flow.querySelector('[data-chat-flow-key="reason"]')?.classList.contains('dca-activity-child'), true)
  assert.equal(flow.querySelector('[data-chat-flow-key="answer"] [data-variant="think"]')?.classList.contains('dca-activity-reasoning-child'), true)
  assert.equal(flow.querySelector('[data-chat-flow-key="answer"]')?.classList.contains('dca-activity-after'), true)
  assert.equal(answerBody?.classList.contains('dca-activity-inline-body'), true)
  assert.match(marker.textContent ?? '', /Done/)
  assert.equal(marker.querySelector('[data-dca-count="reasoning"]')?.textContent, '×2')
  assert.equal(marker.querySelector('[data-dca-count="reasoning"]')?.getAttribute('aria-label'), '2 thoughts')

  marker.open = true
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(flow.querySelector('[data-chat-flow-key="reason"]')?.classList.contains('dca-activity-child'), false)
  assert.equal(flow.querySelector('[data-chat-flow-key="reason"]')?.classList.contains('dca-activity-after'), true)
  assert.equal(flow.querySelector('[data-chat-flow-key="answer"]')?.classList.contains('dca-activity-after'), false)
  assert.equal(flow.querySelector('[data-chat-flow-key="answer"] [data-variant="think"]')?.classList.contains('dca-activity-reasoning-child'), false)
  assert.equal(answerBody?.classList.contains('dca-activity-inline-body'), true)
  assert.equal(firstMember?.classList.contains('dca-activity-member'), true)
  assert.equal(lastMember?.classList.contains('dca-activity-member'), true)
})

test('keeps the visible partial output on the same rhythm after hidden rows', () => {
  const flow = render([
    assistant('reason', [{ kind: 'reasoning', text: '检查' }]),
    assistant('answer', [
      { kind: 'reasoning', text: '完成' },
      { kind: 'text', text: '正文' },
    ]),
    assistant('reason-2', [{ kind: 'reasoning', text: '再次检查' }]),
    assistant('answer-2', [
      { kind: 'reasoning', text: '再次完成' },
      { kind: 'text', text: '正文二' },
    ]),
  ])
  const markers = flow.querySelectorAll<HTMLDetailsElement>('details[data-dca-activity-group]')
  const marker = markers[0]
  const answer = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"]')
  const answer2 = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer-2"]')
  assert.ok(marker)
  assert.ok(answer)
  assert.ok(answer2)
  assert.equal(answer.classList.contains('dca-activity-after'), true)
  assert.equal(answer2.classList.contains('dca-activity-after'), true)
  assert.equal(answer.querySelector('[data-variant="think"]')?.parentElement?.hasAttribute('hidden'), true)

  marker.open = true
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(flow.querySelector('[data-chat-flow-key="reason"]')?.classList.contains('dca-activity-after'), true)
  assert.equal(answer.classList.contains('dca-activity-after'), false)
  assert.equal(answer2.classList.contains('dca-activity-after'), true)
})

test('does not remove official searchable-hidden ownership from inline reasoning', () => {
  const flow = render([
    assistant('reason', [{ kind: 'reasoning', text: '检查' }]),
    assistant('answer', [
      { kind: 'reasoning', text: '完成' },
      { kind: 'text', text: '正文' },
    ]),
  ], en, false)
  const marker = flow.querySelector<HTMLDetailsElement>('details[data-dca-activity-group]')
  const inlineProcess = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"] [data-turn-process-inline]')
  assert.ok(marker)
  assert.ok(inlineProcess)

  assert.equal(inlineProcess.getAttribute('hidden'), 'until-found')
  assert.equal(inlineProcess.dataset['dcaHidden'], '')
  assert.equal(dom?.window.getComputedStyle(inlineProcess).display, 'none')

  marker.open = true
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(inlineProcess.getAttribute('hidden'), 'until-found')
})

test('removes layout reservation from an official hidden row outside an activity group', async () => {
  const flow = render([
    assistant('answer', [{ kind: 'text', text: '正文' }]),
  ], en, false)
  const row = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"]')
  assert.ok(row)
  row.setAttribute('data-turn-process-hidden', 'true')
  row.setAttribute('hidden', 'until-found')
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(row.dataset['dcaHidden'], '')
  assert.equal(dom?.window.getComputedStyle(row).display, 'none')
})

test('hides the attribute-less inline wrapper when the official process is open', () => {
  const flow = render([
    assistant('reason', [{ kind: 'reasoning', text: '检查' }]),
    assistant('answer', [
      { kind: 'reasoning', text: '完成' },
      { kind: 'text', text: '正文' },
    ]),
  ])
  const marker = flow.querySelector<HTMLDetailsElement>('details[data-dca-activity-group]')
  const reasoning = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"] [data-variant="think"]')
  const wrapper = reasoning?.parentElement
  assert.ok(marker)
  assert.ok(reasoning)
  assert.ok(wrapper)
  assert.equal(wrapper.hasAttribute('data-turn-process-inline'), false)
  assert.equal(wrapper.hidden, true)
  assert.equal(wrapper.dataset['dcaHidden'], '')
})

test('collapses a single thought and a single tool call', () => {
  const flow = render([
    assistant('reason', [{ kind: 'reasoning', text: '检查' }]),
    assistant('answer', [{ kind: 'text', text: '正文' }]),
    tool('read'),
  ])
  const markers = flow.querySelectorAll<HTMLDetailsElement>('details[data-dca-activity-group]')
  assert.equal(markers.length, 2)
  assert.equal(markers[0]?.querySelector('[data-dca-count="reasoning"]')?.textContent, '×1')
  assert.equal(markers[1]?.querySelector('[data-dca-count="tool"]')?.textContent, '×1')
  assert.equal(flow.querySelector('[data-chat-flow-key="reason"]')?.classList.contains('dca-activity-child'), true)
  assert.equal(flow.querySelector('[data-chat-flow-key="read"]')?.classList.contains('dca-activity-child'), true)
  assert.match(flow.querySelector('[data-chat-flow-key="answer"]')?.textContent ?? '', /正文/)
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
  assert.deepEqual(
    [...flow.querySelectorAll<HTMLElement>('.dca-activity-member')]
      .map(member => member.dataset['dcaMemberState']),
    ['done', 'running'],
  )

  act(() => { root?.unmount() })
  root = undefined
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(flow.querySelector('details[data-dca-activity-group]'), null)
  assert.equal(flow.querySelector('[data-chat-flow-key="reason"]')?.classList.contains('dca-activity-child'), false)
  assert.equal(flow.querySelector('.dca-activity-member'), null)
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
  const reasoningIcon = marker.querySelector<SVGSVGElement>('[data-dca-count="reasoning"] svg.dca-count-icon')
  assert.equal(reasoningIcon?.getAttribute('viewBox'), '0 0 14 14')
  assert.ok(reasoningIcon?.querySelector('path[fill-rule="evenodd"]'))
  assert.equal(marker.querySelector('[data-dca-count="tool"]')?.textContent, '×1')
  assert.equal(marker.querySelector('[data-dca-count="tool"]')?.getAttribute('aria-label'), '1 tool call')
  const toolIcon = marker.querySelector<SVGSVGElement>('[data-dca-count="tool"] svg.dca-count-icon')
  assert.equal(toolIcon?.getAttribute('viewBox'), '0 0 24 24')
  assert.equal(toolIcon?.querySelector('circle'), null)
  assert.equal(marker.querySelector('[data-dca-count="failure"]')?.textContent, '×1')
  assert.equal(marker.querySelector('[data-dca-count="failure"]')?.getAttribute('aria-label'), '1 failed step')
  const failureIcon = marker.querySelector<SVGSVGElement>('[data-dca-count="failure"] svg.dca-count-icon')
  assert.equal(failureIcon?.getAttribute('viewBox'), '0 0 24 24')
  assert.ok(failureIcon?.querySelector('circle'))
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
  assert.deepEqual(
    [...flow.querySelectorAll<HTMLElement>('.dca-activity-member')]
      .map(member => member.dataset['dcaMemberState']),
    ['done', 'error', 'done'],
  )
})

test('uses the official row error state for the child surface', async () => {
  const flow = render([
    assistant('reason', [{ kind: 'reasoning', text: 'Check' }]),
    tool('official-error'),
  ])
  const toolElement = flow.querySelector<HTMLElement>('[data-chat-flow-key="official-error"] [data-tool]')
  assert.ok(toolElement)
  assert.equal(toolElement.dataset['dcaMemberState'], 'done')

  toolElement.dataset['state'] = 'error'
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(toolElement.dataset['dcaMemberState'], 'error')
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
  const answer = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"]')
  assert.equal(answer?.classList.contains('dca-activity-child'), false)
  assert.equal(answer?.classList.contains('dca-activity-after'), true)
  assert.match(answer?.textContent ?? '', /Visible answer/)
})

test('keeps the locale dictionaries bilingual and complete', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort())
  assert.equal(en['status.running'], 'In progress...')
  assert.equal(zh['status.running'], '进行中...')
  assert.equal(en['status.error'], 'Execution error')
  assert.equal(zh['status.error'], '执行错误')
})
