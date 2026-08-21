import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { AssistantBlock, ChatNodeStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { CompactActivityController } from '../src/client/components/CompactActivityController.tsx'
import { en } from '../src/client/locales.ts'

const STREAM_DURATION_MS = 1_000
const STREAM_RATES = [100, 200, 300] as const
const HISTORY_ROWS = 250

let dom: JSDOM | undefined
let root: Root | undefined
let observerCallbacks = 0
let observerRecords = 0
let observerWorkMs = 0
let syncPasses = 0
let frameCallbacks: Map<number, FrameRequestCallback> | undefined
let nextFrameId = 0
let previousMutationObserver: typeof globalThis.MutationObserver | undefined
let previousRequestAnimationFrame: typeof globalThis.requestAnimationFrame | undefined
let previousCancelAnimationFrame: typeof globalThis.cancelAnimationFrame | undefined

function installDom(controlFrames = false): HTMLElement {
  dom = new JSDOM('<!doctype html><body><div id="root"></div></body>')
  previousMutationObserver = globalThis.MutationObserver
  previousRequestAnimationFrame = globalThis.requestAnimationFrame
  previousCancelAnimationFrame = globalThis.cancelAnimationFrame
  observerCallbacks = 0
  observerRecords = 0
  observerWorkMs = 0
  syncPasses = 0
  frameCallbacks = controlFrames ? new Map() : undefined
  nextFrameId = 0

  const NativeMutationObserver = dom.window.MutationObserver
  class CountingMutationObserver extends NativeMutationObserver {
    constructor(callback: MutationCallback) {
      super((records, observer) => {
        const started = performance.now()
        observerCallbacks++
        observerRecords += records.length
        try {
          callback(records, observer)
        } finally {
          observerWorkMs += performance.now() - started
        }
      })
    }
  }

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    MutationObserver: CountingMutationObserver,
    HTMLElement: dom.window.HTMLElement,
    HTMLDetailsElement: dom.window.HTMLDetailsElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const querySelectorAll = dom.window.document.querySelectorAll.bind(dom.window.document)
  dom.window.document.querySelectorAll = ((selectors: string) => {
    if (selectors === '[data-chat-flow]') syncPasses++
    return querySelectorAll(selectors)
  }) as typeof dom.window.document.querySelectorAll
  if (controlFrames) {
    globalThis.requestAnimationFrame = callback => {
      const id = ++nextFrameId
      frameCallbacks?.set(id, callback)
      return id
    }
    globalThis.cancelAnimationFrame = id => { frameCallbacks?.delete(id) }
  }
  return dom.window.document.querySelector<HTMLElement>('#root') as HTMLElement
}

function flushFrames(): number {
  const pending = frameCallbacks
  if (pending === undefined) return 0
  frameCallbacks = new Map()
  for (const callback of pending.values()) callback(performance.now())
  return pending.size
}

afterEach(() => {
  act(() => { root?.unmount() })
  root = undefined
  dom?.window.close()
  dom = undefined
  if (previousMutationObserver === undefined) delete (globalThis as { MutationObserver?: unknown }).MutationObserver
  else globalThis.MutationObserver = previousMutationObserver
  if (previousRequestAnimationFrame === undefined) {
    delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  } else globalThis.requestAnimationFrame = previousRequestAnimationFrame
  if (previousCancelAnimationFrame === undefined) {
    delete (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame
  } else globalThis.cancelAnimationFrame = previousCancelAnimationFrame
  frameCallbacks = undefined
  previousMutationObserver = undefined
  previousRequestAnimationFrame = undefined
  previousCancelAnimationFrame = undefined
})

function assistant(
  key: string,
  text: string,
  status: 'running' | 'settled' = 'settled',
): ChatNode<'assistant-step'> {
  const blocks: readonly AssistantBlock[] = [{ kind: 'reasoning', text }]
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

function nodeStore(nodes: readonly ChatNode[]): ChatNodeStore {
  const byKey = new Map(nodes.map(node => [node.key, node]))
  return { get: key => byKey.get(key), values: () => nodes }
}

interface StreamingFixture {
  readonly flow: HTMLElement
  readonly textNode: Text
  rerender(text: string): void
}

function renderFixture(historyRows = HISTORY_ROWS, controlFrames = false): StreamingFixture {
  const container = installDom(controlFrames)
  const flow = document.createElement('div')
  flow.dataset['chatFlow'] = ''
  const nodes: ChatNode<'assistant-step'>[] = []

  for (let index = 0; index < historyRows; index++) {
    const key = `history-${index}`
    const node = assistant(key, `历史思考 ${index}`)
    nodes.push(node)
    const row = document.createElement('div')
    row.dataset['chatFlowKey'] = key
    const think = document.createElement('div')
    think.dataset['variant'] = 'think'
    think.textContent = `历史思考 ${index}`
    row.append(think)
    flow.append(row)
  }

  const running = assistant('running', 'x', 'running')
  const runningRow = document.createElement('div')
  runningRow.dataset['chatFlowKey'] = running.key
  const think = document.createElement('div')
  think.dataset['variant'] = 'think'
  const textNode = document.createTextNode('x')
  think.append(textNode)
  runningRow.append(think)
  flow.append(runningRow)
  document.body.append(flow)

  root = createRoot(container)
  const rerender = (text: string): void => {
    const currentNodes = [...nodes, assistant(running.key, text, 'running')]
    const snapshot = { chat: { order: currentNodes.map(node => node.key), nodes: nodeStore(currentNodes) } }
    const props = {
      useSession: (select: (value: typeof snapshot) => unknown) => select(snapshot),
      t: (key: string, params?: Record<string, unknown>) => {
        const template = en[key as keyof typeof en] ?? key
        return params === undefined
          ? template
          : template.replace(/\{(\w+)\}/g, (match, name: string) => name in params ? String(params[name]) : match)
      },
    } as never
    act(() => { root?.render(React.createElement(CompactActivityController, props)) })
  }
  rerender('x')
  return { flow, textNode, rerender }
}

function waitForMutationFlush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

interface StreamingMetrics {
  readonly tops: number
  readonly updates: number
  readonly elapsedMs: number
  readonly observerCallbacks: number
  readonly observerRecords: number
  readonly observerWorkMs: number
  readonly syncPasses: number
  readonly effectiveTops: number
}

async function simulateStreaming(fixture: StreamingFixture, tops: number, durationMs: number): Promise<StreamingMetrics> {
  const updates = Math.round(tops * durationMs / 1_000)
  const started = performance.now()
  const startedCallbacks = observerCallbacks
  const startedRecords = observerRecords
  const startedWorkMs = observerWorkMs
  const startedSyncPasses = syncPasses
  const periodMs = 1_000 / tops
  const frameBatch = frameCallbacks === undefined ? 1 : Math.max(1, Math.round(tops / 60))
  let nextUpdate = started

  for (let index = 0; index < updates; index++) {
    nextUpdate += periodMs
    const delayMs = nextUpdate - performance.now()
    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs))
    const text = 'x'.repeat(index + 1)
    fixture.rerender(text)
    fixture.textNode.data = text
    if (frameCallbacks !== undefined && ((index + 1) % frameBatch === 0 || index === updates - 1)) {
      await waitForMutationFlush()
      flushFrames()
    }
  }
  await waitForMutationFlush()

  const elapsedMs = performance.now() - started
  return {
    tops,
    updates,
    elapsedMs,
    observerCallbacks: observerCallbacks - startedCallbacks,
    observerRecords: observerRecords - startedRecords,
    observerWorkMs: observerWorkMs - startedWorkMs,
    syncPasses: syncPasses - startedSyncPasses,
    effectiveTops: updates / (elapsedMs / 1_000),
  }
}

test('handles a 2,000-row history benchmark input', t => {
  const started = performance.now()
  const fixture = renderFixture(2_000)
  const elapsedMs = performance.now() - started
  const marker = fixture.flow.querySelector<HTMLDetailsElement>('details[data-dca-activity-group]')
  assert.ok(marker)
  t.diagnostic(JSON.stringify({ historyRows: 2_000, elapsedMs: Number(elapsedMs.toFixed(1)) }))
  assert.equal(fixture.flow.querySelectorAll('[data-chat-flow-key]').length, 2_001)
  assert.equal(marker.querySelector('[data-dca-count="reasoning"]')?.textContent, '×2001')
})

for (const tops of STREAM_RATES) {
  test(`handles simulated streaming reasoning at ${tops} tops`, async t => {
    const fixture = renderFixture(HISTORY_ROWS, true)
    await waitForMutationFlush()
    const metrics = await simulateStreaming(fixture, tops, STREAM_DURATION_MS)

    t.diagnostic(JSON.stringify({
      ...metrics,
      elapsedMs: Number(metrics.elapsedMs.toFixed(1)),
      observerWorkMs: Number(metrics.observerWorkMs.toFixed(1)),
      effectiveTops: Number(metrics.effectiveTops.toFixed(1)),
    }))
    assert.equal(fixture.textNode.data.length, metrics.updates)
    assert.ok(metrics.observerCallbacks > 0)
    assert.ok(metrics.observerRecords >= metrics.updates)
    assert.ok(metrics.observerCallbacks <= metrics.updates + 2)
    const expectedFrames = Math.ceil(metrics.updates / Math.max(1, Math.round(tops / 60)))
    assert.ok(metrics.syncPasses <= expectedFrames + 1)
    assert.ok(metrics.effectiveTops >= tops * 0.5)
    assert.equal(fixture.flow.querySelectorAll('details[data-dca-activity-group]').length, 1)
    assert.equal(fixture.flow.querySelector('[data-chat-flow-key="running"]')?.classList.contains('dca-activity-child'), true)
  })
}

test('coalesces same-frame chat mutations and ignores unrelated body mutations', async () => {
  const fixture = renderFixture(HISTORY_ROWS, true)
  await waitForMutationFlush()
  assert.equal(syncPasses, 1)
  assert.equal(frameCallbacks?.size, 0)

  fixture.rerender('abcde')
  fixture.textNode.data = 'a'
  fixture.textNode.data = 'ab'
  fixture.textNode.data = 'abc'
  fixture.textNode.data = 'abcd'
  fixture.textNode.data = 'abcde'
  await waitForMutationFlush()
  assert.equal(syncPasses, 1)
  assert.equal(frameCallbacks?.size, 1)
  assert.equal(flushFrames(), 1)
  assert.equal(syncPasses, 2)

  const unrelated = document.createElement('div')
  document.body.append(unrelated)
  unrelated.textContent = 'notification'
  await waitForMutationFlush()
  assert.equal(frameCallbacks?.size, 0)
})
