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
  dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', { url: 'http://127.0.0.1:43120/' })
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    MutationObserver: dom.window.MutationObserver,
    HTMLElement: dom.window.HTMLElement,
    HTMLDetailsElement: dom.window.HTMLDetailsElement,
    Node: dom.window.Node,
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

function imageGallery(count = 1): HTMLDivElement {
  const gallery = document.createElement('div')
  gallery.dataset['align'] = 'start'
  for (let index = 0; index < count; index++) {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset['variant'] = 'tile'
    const image = document.createElement('img')
    image.alt = `image-${index}`
    button.append(image)
    gallery.append(button)
  }
  return gallery
}

function markdownImage(): HTMLImageElement {
  const image = document.createElement('img')
  image.setAttribute('loading', 'lazy')
  image.setAttribute('decoding', 'async')
  image.setAttribute('referrerpolicy', 'no-referrer')
  image.alt = 'markdown image'
  return image
}

function markdownImageFallback(): HTMLSpanElement {
  const fallback = document.createElement('span')
  // dsh-client-ui-primitives renders failed or rejected Markdown images as
  // a CSS-module span instead of leaving an <img> in the DOM. The production
  // hash differs between DSH bundles, so this fixture intentionally does not
  // rely on the source class name.
  fallback.className = '_fallback_404681'
  fallback.textContent = 'markdown image fallback'
  return fallback
}

function imageCaptionForMarker(marker: HTMLDetailsElement): HTMLElement | null {
  let sibling = marker.nextElementSibling
  while (sibling !== null) {
    if (sibling instanceof HTMLElement && sibling.classList.contains('dca-image-details')) return sibling
    sibling = sibling.nextElementSibling
  }
  return null
}

function waitForMutationFlush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

function render(nodes: readonly ChatNode[], dictionary: typeof en = en, officialOpen?: boolean, cwd?: string): HTMLElement {
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
    row.dataset['chatFlowKind'] = node.kind
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
    sessionId: 'session',
    useSessions: (select: (value: { byId: Record<string, { cwd?: string }> }) => unknown) => select({
      byId: cwd === undefined ? {} : { session: { cwd } },
    }),
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

test('folds non-user image displays while preserving user input images', async () => {
  const flow = render([
    assistant('answer', [{ kind: 'text', text: '正文' }]),
    tool('tool'),
  ])
  const answer = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"]')
  const toolRow = flow.querySelector<HTMLElement>('[data-chat-flow-key="tool"]')
  assert.ok(answer)
  assert.ok(toolRow)

  const assistantGallery = imageGallery(1)
  answer.append(assistantGallery, markdownImage())
  const toolGallery = imageGallery(2)
  toolRow.append(toolGallery)

  const userRow = document.createElement('div')
  userRow.dataset['chatFlowKey'] = 'user-input'
  userRow.dataset['chatFlowKind'] = 'user'
  const userAttachments = document.createElement('div')
  userAttachments.dataset['messageAttachments'] = ''
  const userGallery = imageGallery(1)
  userAttachments.append(userGallery)
  userRow.append(userAttachments)
  flow.append(userRow)
  await waitForMutationFlush()

  const markers = flow.querySelectorAll<HTMLDetailsElement>('details[data-dca-image-group]')
  assert.equal(markers.length, 3)
  assert.equal(assistantGallery.hidden, true)
  assert.equal(toolGallery.hidden, true)
  assert.equal(userGallery.hidden, false)
  assert.equal(userRow.querySelector('details[data-dca-image-group]'), null)
  assert.equal(flow.querySelectorAll('[data-dca-image-target]').length, 3)
  assert.match(toolRow.querySelector('details[data-dca-image-group]')?.textContent ?? '', /2 images/)

  const assistantMarker = answer.querySelector<HTMLDetailsElement>('details[data-dca-image-group]')
  assert.ok(assistantMarker)
  assistantMarker.open = true
  assistantMarker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(assistantGallery.hidden, false)
})

test('folds Markdown image fallback text when the host renders no img element', async () => {
  const flow = render([
    assistant('answer', [{ kind: 'text', text: '正文' }]),
  ])
  const answer = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"]')
  assert.ok(answer)

  const fallback = markdownImageFallback()
  const fallbackParagraph = document.createElement('p')
  fallbackParagraph.append(fallback)
  answer.append(fallbackParagraph)
  await waitForMutationFlush()

  const marker = answer.querySelector<HTMLDetailsElement>('details[data-dca-image-group]')
  assert.ok(marker)
  assert.equal(marker.querySelector('.dca-image-label')?.textContent, 'markdown image fallback')
  assert.equal(imageCaptionForMarker(marker)?.querySelector('.dca-image-caption')?.textContent, 'markdown image fallback')
  assert.equal(fallback.hidden, true)
  assert.equal(fallback.dataset['dcaImageTarget'], 'answer:image:0')

  marker.open = true
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(fallback.hidden, false)
})

test('deduplicates repeated Markdown image displays and labels each image', async () => {
  const firstSource = '/Code/dsh-plugin2/img-0D6FFE13.jpg'
  const secondSource = '/Code/dsh-plugin2/img-DAC5337D.jpg'
  const firstAlt = '银白发红瞳角色特写'
  const secondAlt = 'Cure Arcana 魔法少女立绘'
  const flow = render([
    assistant('answer', [{
      kind: 'text',
      text: `![${firstAlt}](${firstSource})\n\n![${secondAlt}](${secondSource})`,
    }]),
  ], en, undefined, 'E:\\Code\\dsh-plugin2')
  const answer = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"]')
  assert.ok(answer)

  for (const [alt, source] of [[firstAlt, firstSource], [secondAlt, secondSource]] as const) {
    for (let copy = 0; copy < 2; copy++) {
      const image = markdownImage()
      image.alt = alt
      image.src = `http://127.0.0.1:43120/api/file?path=${encodeURIComponent(source)}`
      answer.append(image)
    }
  }
  await waitForMutationFlush()

  const markers = [...answer.querySelectorAll<HTMLDetailsElement>('details[data-dca-image-group]')]
  assert.equal(markers.length, 2)
  assert.deepEqual(markers.map(marker => marker.querySelector('.dca-image-label')?.textContent), [firstAlt, secondAlt])
  assert.equal(markers.every(marker => marker.querySelector('svg.dca-image-marker-icon') !== null), true)
  assert.deepEqual(
    markers.map(marker => imageCaptionForMarker(marker)?.querySelector('.dca-image-caption')?.textContent),
    [`${firstAlt}（${firstSource}）`, `${secondAlt}（${secondSource}）`],
  )
  assert.equal([...answer.querySelectorAll<HTMLImageElement>('img')].every(image => image.hidden), true)

  const firstMarker = markers[0]
  assert.ok(firstMarker)
  firstMarker.open = true
  firstMarker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal([...answer.querySelectorAll<HTMLImageElement>(`img[alt="${firstAlt}"]`)].every(image => !image.hidden), true)
  assert.equal([...answer.querySelectorAll<HTMLImageElement>(`img[alt="${secondAlt}"]`)].every(image => image.hidden), true)

  answer.append(firstMarker.cloneNode(true))
  await waitForMutationFlush()
  assert.equal(answer.querySelectorAll('details[data-dca-image-group]').length, 2)
})

test('keeps Markdown image disclosures vertical, 8px apart, and edge-aligned', async () => {
  const flow = render([
    assistant('answer', [{ kind: 'text', text: '正文' }]),
  ])
  const answer = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"]')
  assert.ok(answer)

  const image = markdownImage()
  const paragraph = document.createElement('p')
  paragraph.append(image)
  const secondImage = markdownImage()
  const secondParagraph = document.createElement('p')
  secondParagraph.append(secondImage)
  answer.append(paragraph, secondParagraph)
  await waitForMutationFlush()

  const markers = [...answer.querySelectorAll<HTMLDetailsElement>('details[data-dca-image-group]')]
  assert.equal(markers.length, 2)
  const marker = markers[0]
  assert.ok(marker)
  const style = dom!.window.getComputedStyle(marker)
  assert.equal(style.display, 'block')
  assert.equal(style.marginLeft, '0px')
  assert.equal(style.marginRight, '0px')
  assert.equal(style.marginBottom, '0px')
  assert.equal(marker.nextElementSibling, image)
  assert.equal(paragraph.dataset['dcaImageContainer'], '')
  assert.equal(secondParagraph.dataset['dcaImageContainer'], '')
  assert.equal(dom!.window.getComputedStyle(secondParagraph).marginTop, '8px')

  marker.open = true
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  const details = imageCaptionForMarker(marker)
  assert.ok(details)
  assert.equal(image.nextElementSibling, details)
  const caption = details.querySelector('.dca-image-caption') as HTMLElement
  assert.equal(dom!.window.getComputedStyle(details).display, 'block')
  assert.equal(dom!.window.getComputedStyle(details).width, '100%')
  assert.equal(dom!.window.getComputedStyle(caption).display, 'block')
  assert.equal(dom!.window.getComputedStyle(caption).textAlign, 'center')
  assert.equal(dom!.window.getComputedStyle(marker).marginBottom, '8px')
})
test('animates image visibility and cancels stale transitions', async () => {
  const flow = render([
    assistant('answer', [{ kind: 'text', text: '正文' }]),
  ])
  const answer = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"]')
  assert.ok(answer)

  const image = markdownImage()
  answer.append(image)
  await waitForMutationFlush()

  const marker = answer.querySelector<HTMLDetailsElement>('details[data-dca-image-group]')
  assert.ok(marker)
  const caption = imageCaptionForMarker(marker)
  assert.ok(caption)
  assert.equal(image.hidden, true)

  marker.open = true
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(image.hidden, false)
  assert.equal(image.dataset['dcaImageTransition'], 'enter')
  assert.equal(caption.dataset['dcaImageCaptionTransition'], 'enter')
  await waitForMutationFlush()
  assert.equal(image.dataset['dcaImageTransition'], 'active')
  assert.equal(caption.dataset['dcaImageCaptionTransition'], 'active')

  marker.open = false
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(image.hidden, false)
  assert.equal(image.dataset['dcaImageTransition'], 'leave')
  assert.equal(caption.dataset['dcaImageCaptionTransition'], 'leave')
  assert.equal(dom!.window.getComputedStyle(caption).display, 'block')

  marker.open = true
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(image.dataset['dcaImageTransition'], 'enter')
  assert.equal(caption.dataset['dcaImageCaptionTransition'], 'enter')
  await waitForMutationFlush()
  await new Promise(resolve => setTimeout(resolve, 200))
  assert.equal(image.hidden, false)
  assert.equal(image.dataset['dcaImageTransition'], undefined)
  assert.equal(caption.dataset['dcaImageCaptionTransition'], undefined)

  Object.defineProperty(dom!.window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: true }),
  })
  marker.open = false
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(image.hidden, true)
  assert.equal(image.dataset['dcaImageTransition'], undefined)
  assert.equal(caption.dataset['dcaImageCaptionTransition'], undefined)
})

test('repairs a Windows root-relative Markdown image fallback with the Session cwd', async () => {
  const flow = render([
    assistant('answer', [{
      kind: 'text',
      text: '![东雪莲 30 万粉纪念新形象](/Code/dsh-plugin2/dongxuelian-30w.png)',
    }]),
  ], en, undefined, 'E:\\Code\\dsh-plugin2')
  const answer = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"]')
  assert.ok(answer)

  const fallback = markdownImageFallback()
  fallback.textContent = '东雪莲 30 万粉纪念新形象'
  const paragraph = document.createElement('p')
  paragraph.append(fallback)
  answer.append(paragraph)
  await waitForMutationFlush()

  const image = answer.querySelector<HTMLImageElement>('.dca-markdown-image-repair')
  assert.ok(image)
  assert.equal(
    image.getAttribute('src'),
    'http://127.0.0.1:43120/api/file?path=E%3A%5CCode%5Cdsh-plugin2%5Cdongxuelian-30w.png',
  )
  assert.equal(fallback.hidden, true)
  assert.equal(fallback.dataset['dcaImageRepairFallback'], 'E:\\Code\\dsh-plugin2\\dongxuelian-30w.png')
  assert.equal(answer.querySelectorAll('details[data-dca-image-group]').length, 1)
})

test('keeps the image marker when a failed Markdown img becomes the host fallback span', async () => {
  const flow = render([
    assistant('answer', [{ kind: 'text', text: '正文' }]),
  ])
  const answer = flow.querySelector<HTMLElement>('[data-chat-flow-key="answer"]')
  assert.ok(answer)

  const image = markdownImage()
  answer.append(image)
  await waitForMutationFlush()
  assert.equal(answer.querySelectorAll('details[data-dca-image-group]').length, 1)
  assert.equal(image.hidden, true)

  const fallback = markdownImageFallback()
  const fallbackParagraph = document.createElement('p')
  fallbackParagraph.append(fallback)
  image.replaceWith(fallbackParagraph)
  await waitForMutationFlush()

  const marker = answer.querySelector<HTMLDetailsElement>('details[data-dca-image-group]')
  assert.ok(marker)
  assert.equal(answer.querySelectorAll('details[data-dca-image-group]').length, 1)
  assert.equal(fallback.hidden, true)
  assert.equal(fallback.dataset['dcaImageTarget'], 'answer:image:0')

  marker.open = true
  marker.ontoggle?.(new dom!.window.Event('toggle') as unknown as ToggleEvent)
  assert.equal(fallback.hidden, false)
})

test('inserts a collapsed marker, preserves mixed output, and expands children', async () => {
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
  assert.equal(firstMember?.hasAttribute('data-dca-member-collapsed'), true)
  assert.equal(dom!.window.getComputedStyle(firstMember!).minHeight, 'calc(32px + var(--dsh-content-font-delta, 0px))')
  assert.equal(dom!.window.getComputedStyle(firstMember!).flexDirection, '')
  const thinkRow = document.createElement('div')
  thinkRow.dataset['disclosureRow'] = ''
  firstMember?.append(thinkRow)
  await waitForMutationFlush()
  assert.equal(dom!.window.getComputedStyle(thinkRow).transform, '')

  firstMember?.setAttribute('data-expanded', 'true')
  await waitForMutationFlush()
  assert.equal(firstMember?.hasAttribute('data-dca-member-collapsed'), false)
  firstMember?.removeAttribute('data-expanded')
  await waitForMutationFlush()
  assert.equal(firstMember?.hasAttribute('data-dca-member-collapsed'), true)
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
