import { useEffect, useRef } from 'react'
import type { PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ChatNode, ChatNodeStore } from '@deepseek-ai/dsh-client-ui-chat/client'
import {
  activityGroups, type ActivityGroup, type ActivityMemberState,
} from '../activity-group.ts'
import { ACTIVITY_NS } from '../locales.ts'

type ActivityTranslate = TranslateNS<typeof ACTIVITY_NS>
/** 会话头部动作 slot 向控制器提供的运行时属性和本地化函数。 */
type ControllerProps = PropsRuntime<'conversation.session.header.actions'> & { t: ActivityTranslate }

const MARKER_ATTRIBUTE = 'data-dca-activity-group'
const CHILD_CLASS = 'dca-activity-child'
const REASONING_CHILD_CLASS = 'dca-activity-reasoning-child'
const ROW_CLASS = 'dca-activity-row'
const AFTER_CLASS = 'dca-activity-after'
const INLINE_BODY_CLASS = 'dca-activity-inline-body'
const MEMBER_CLASS = 'dca-activity-member'
const MEMBER_FIRST_CLASS = 'dca-activity-member-first'
const MEMBER_LAST_CLASS = 'dca-activity-member-last'
const MEMBER_COLLAPSED_ATTRIBUTE = 'data-dca-member-collapsed'
const PLUGIN_HIDDEN_ATTRIBUTE = 'data-dca-hidden'
const PLUGIN_HIDDEN_DATASET = 'dcaHidden'
const OFFICIAL_HIDDEN_DATASET = 'dcaOfficialHidden'
const PLUGIN_MARKER_HIDDEN_DATASET = 'dcaMarkerHidden'
const IMAGE_MARKER_ATTRIBUTE = 'data-dca-image-group'
const IMAGE_TARGET_ATTRIBUTE = 'data-dca-image-target'
const IMAGE_CONTAINER_ATTRIBUTE = 'data-dca-image-container'
const IMAGE_CONTAINER_DATASET = 'dcaImageContainer'
const IMAGE_CAPTION_CLASS = 'dca-image-details'
const IMAGE_HIDDEN_DATASET = 'dcaImageHidden'
const IMAGE_MARKER_SIGNATURE_DATASET = 'dcaImageSignature'
const IMAGE_MARKER_LABELS_DATASET = 'dcaImageLabels'
const IMAGE_REPAIR_ATTRIBUTE = 'data-dca-image-repair'
const IMAGE_REPAIR_DATASET = 'dcaImageRepair'
const IMAGE_REPAIR_FALLBACK_ATTRIBUTE = 'data-dca-image-repair-fallback'
const IMAGE_REPAIR_FALLBACK_DATASET = 'dcaImageRepairFallback'
const IMAGE_REPAIR_FAILED_DATASET = 'dcaImageRepairFailed'
const IMAGE_REPAIR_SOURCE_DATASET = 'dcaImageRepairSource'
const IMAGE_REPAIR_ORIGINAL_SOURCE_DATASET = 'dcaImageRepairOriginalSource'
const IMAGE_TRANSITION_ATTRIBUTE = 'data-dca-image-transition'
const IMAGE_TRANSITION_DATASET = 'dcaImageTransition'
const IMAGE_TRANSITION_ACTIVE = 'active'
const IMAGE_CAPTION_TRANSITION_DATASET = 'dcaImageCaptionTransition'
const IMAGE_CAPTION_HIDDEN_DATASET = 'dcaImageCaptionHidden'
const IMAGE_TRANSITION_DURATION_MS = 160
const IMAGE_BUTTON_SELECTOR = [
  'button[data-variant="single"]',
  'button[data-variant="tile"]',
  'button[data-variant="thumbnail"]',
].join(',')
const MARKDOWN_IMAGE_SELECTOR = 'img[loading="lazy"][decoding="async"][referrerpolicy="no-referrer"]'
// dsh-client-ui-primitives 会将被拒绝或加载失败的 Markdown 图片替换为
// CSS Module span，而不是保留 <img>。类名哈希不是不同 DSH 构建版本间的
// 稳定宿主契约，因此类选择器只作为快速路径；isMarkdownImageFallback
// 还会识别渲染器使用的语义化 <p><span> 回退结构。
const MARKDOWN_IMAGE_ALT_SELECTOR = 'span[class*="imageAlt"]'
type ImageTransitionKind = 'enter' | 'leave'

/** 单个图片或标题过渡的可取消状态。 */
interface ImageTransitionState {
  readonly kind: ImageTransitionKind
  readonly token: number
  frame?: number
  timer?: ReturnType<typeof setTimeout>
}

const imageTransitions = new WeakMap<HTMLElement, ImageTransitionState>()
const imageCaptionTransitions = new WeakMap<HTMLElement, ImageTransitionState>()
const imageCaptions = new WeakMap<HTMLDetailsElement, HTMLElement>()
let nextImageTransitionToken = 0

const IMAGE_RELEVANT_ATTRIBUTES = new Set([
  'data-align',
  'data-chat-flow-kind',
  'data-message-attachments',
  'data-variant',
  'decoding',
  'loading',
  'referrerpolicy',
])

/** 一个官方过程成员对应的 DOM 元素及其合并后的状态。 */
interface MemberElement {
  readonly element: HTMLElement
  readonly state: ActivityMemberState
}

/** 一组应由同一个图片折叠标记控制的图片显示。 */
interface ImageTarget {
  readonly element: HTMLElement
  readonly elements: readonly HTMLElement[]
  readonly count: number
  readonly inline: boolean
  readonly labels: readonly ImageLabel[]
}

/** 图片标题及其可选的原始路径。 */
interface ImageLabel {
  readonly name: string
  readonly path: string | undefined
}

/** 从 assistant 正文中解析出的 Markdown 图片引用。 */
interface MarkdownImageReference {
  readonly source: string
  readonly alt: string
}

/** 按聊天行键保存的 Markdown 图片引用集合。 */
type MarkdownImageReferences = ReadonlyMap<string, readonly MarkdownImageReference[]>

const MARKDOWN_IMAGE_REFERENCE_PATTERN = /!\[([^\]\n]*)\]\(\s*(?:<([^>\n]*)>|([^\s)\n]+))(?:\s+["'][^)]*["'])?\s*\)/gu

/** 宿主 DOM 的实时状态优先，避免快照尚未刷新时将官方错误／停止状态覆盖为完成。 */
function resolvedMemberState(element: HTMLElement, state: ActivityMemberState): ActivityMemberState {
  const official = element.dataset['state']
  if (state === 'error' || official === 'error' || official === 'stopped') return 'error'
  if (state === 'running' || official === 'running') return 'running'
  return 'done'
}

/** 收集容器内的官方聊天行，并按稳定的 Chat Flow 键索引。 */
function rowsIn(container: HTMLElement): Map<string, HTMLElement> {
  return new Map([...container.querySelectorAll<HTMLElement>('[data-chat-flow-key]')]
    .map(row => [row.dataset['chatFlowKey'] ?? '', row]))
}

/** 读取当前容器已经创建的总折叠标记，并按分组键建立索引。 */
function markersIn(container: HTMLElement): Map<string, HTMLDetailsElement> {
  return new Map([...container.querySelectorAll<HTMLDetailsElement>(`details[${MARKER_ATTRIBUTE}]`)]
    .map(marker => [marker.dataset['dcaActivityGroup'] ?? '', marker]))
}

/**
 * 同一 assistant 行可有多个 Think，按 DSH 的 DOM 顺序与分组条目一一对应。
 * 工具行只取根 [data-tool]，因为嵌套调用仍由官方工具组件在该根行内部展示。
 */
function memberElementsIn(
  rows: ReadonlyMap<string, HTMLElement>,
  group: ActivityGroup,
  membersByRow: ReadonlyMap<string, readonly ActivityGroup['members'][number][]>,
): MemberElement[] {
  const result: MemberElement[] = []
  for (const key of group.keys) {
    const row = rows.get(key)
    if (row === undefined) continue
    const members = membersByRow.get(key) ?? []
    const reasoning = [...row.querySelectorAll<HTMLElement>('[data-variant="think"]')]
    const tool = row.querySelector<HTMLElement>('[data-tool]')
    let reasoningIndex = 0
    for (const member of members) {
      const element = member.kind === 'reasoning' ? reasoning[reasoningIndex++] : tool
      if (element !== null && element !== undefined) {
        result.push({ element, state: resolvedMemberState(element, member.state) })
      }
    }
  }
  return result
}

/** 移除插件添加到过程成员上的样式类、状态和布局标记。 */
function clearMemberPresentation(element: HTMLElement): void {
  element.classList.remove(MEMBER_CLASS, MEMBER_FIRST_CLASS, MEMBER_LAST_CLASS)
  element.removeAttribute(MEMBER_COLLAPSED_ATTRIBUTE)
  delete element.dataset['dcaMemberState']
}

/** 只管理插件写入的隐藏状态，避免覆盖宿主或其他插件的 hidden 属性。 */
function setPluginHidden(element: HTMLElement, hidden: boolean): void {
  if (hidden) {
    element.dataset[PLUGIN_HIDDEN_DATASET] = ''
    if (!element.hasAttribute('hidden')) element.setAttribute('hidden', '')
    return
  }
  if (element.dataset[PLUGIN_HIDDEN_DATASET] === undefined) return
  delete element.dataset[PLUGIN_HIDDEN_DATASET]
  if (element.getAttribute('hidden') === '') element.removeAttribute('hidden')
}

/** 读取图片折叠标记，并清理同一标识下多余的重复标记。 */
function imageMarkersIn(container: HTMLElement): Map<string, HTMLDetailsElement> {
  const markers = new Map<string, HTMLDetailsElement>()
  for (const marker of container.querySelectorAll<HTMLDetailsElement>(`details[${IMAGE_MARKER_ATTRIBUTE}]`)) {
    const id = marker.dataset['dcaImageGroup'] ?? ''
    if (markers.has(id)) {
      removeImageMarker(marker)
    } else markers.set(id, marker)
  }
  return markers
}

/** 写入图片目标的即时隐藏状态，并保留该状态的所有权标记。 */
function setImageHiddenState(element: HTMLElement, hidden: boolean): void {
  if (hidden) {
    element.dataset[IMAGE_HIDDEN_DATASET] = ''
    if (!element.hasAttribute('hidden')) element.setAttribute('hidden', '')
    return
  }
  if (element.dataset[IMAGE_HIDDEN_DATASET] === undefined) return
  delete element.dataset[IMAGE_HIDDEN_DATASET]
  if (element.getAttribute('hidden') === '') element.removeAttribute('hidden')
}

/** 取消图片目标正在进行的动画帧和定时器。 */
function cancelImageTransition(element: HTMLElement): void {
  const state = imageTransitions.get(element)
  if (state === undefined) {
    delete element.dataset[IMAGE_TRANSITION_DATASET]
    return
  }
  if (state.frame !== undefined && typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(state.frame)
  }
  if (state.timer !== undefined) clearTimeout(state.timer)
  imageTransitions.delete(element)
  delete element.dataset[IMAGE_TRANSITION_DATASET]
}

/** 立即设置图片目标的隐藏状态，并先终止未完成的过渡。 */
function setImageHidden(element: HTMLElement, hidden: boolean): void {
  cancelImageTransition(element)
  setImageHiddenState(element, hidden)
}

/** 根据宿主媒体查询判断是否应禁用图片过渡动画。 */
function prefersReducedMotion(): boolean {
  return globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** 完成图片目标过渡；离场过渡结束后才真正移出布局。 */
function finishImageTransition(element: HTMLElement, state: ImageTransitionState): void {
  if (imageTransitions.get(element)?.token !== state.token) return
  imageTransitions.delete(element)
  delete element.dataset[IMAGE_TRANSITION_DATASET]
  if (state.kind === 'leave') setImageHiddenState(element, true)
}

/** 在保持 DOM 原位的前提下，启动图片目标的进入或离场过渡。 */
function transitionImageVisibility(element: HTMLElement, visible: boolean): void {
  const current = imageTransitions.get(element)
  const targetKind: ImageTransitionKind = visible ? 'enter' : 'leave'
  const pluginHidden = element.dataset[IMAGE_HIDDEN_DATASET] !== undefined
  if (current?.kind === targetKind) return
  if (current === undefined && (visible ? !pluginHidden : pluginHidden)) return

  if (prefersReducedMotion()) {
    cancelImageTransition(element)
    setImageHiddenState(element, !visible)
    return
  }

  cancelImageTransition(element)
  const state: ImageTransitionState = { kind: targetKind, token: ++nextImageTransitionToken }
  imageTransitions.set(element, state)
  element.dataset[IMAGE_TRANSITION_DATASET] = targetKind

  const startVisiblePhase = (): void => {
    if (imageTransitions.get(element)?.token !== state.token) return
    element.dataset[IMAGE_TRANSITION_DATASET] = IMAGE_TRANSITION_ACTIVE
    state.timer = setTimeout(() => finishImageTransition(element, state), IMAGE_TRANSITION_DURATION_MS)
  }

  if (visible) {
    setImageHiddenState(element, false)
    if (typeof globalThis.requestAnimationFrame === 'function') state.frame = globalThis.requestAnimationFrame(startVisiblePhase)
    else queueMicrotask(startVisiblePhase)
    return
  }

  state.timer = setTimeout(() => finishImageTransition(element, state), IMAGE_TRANSITION_DURATION_MS)
}

/** 写入图片标题的即时隐藏状态。标题使用独立标记，便于与图片同步过渡。 */
function setImageCaptionHiddenState(element: HTMLElement, hidden: boolean): void {
  if (hidden) element.dataset[IMAGE_CAPTION_HIDDEN_DATASET] = ''
  else delete element.dataset[IMAGE_CAPTION_HIDDEN_DATASET]
}

/** 取消图片标题正在进行的动画帧和定时器。 */
function cancelImageCaptionTransition(element: HTMLElement): void {
  const state = imageCaptionTransitions.get(element)
  if (state === undefined) {
    delete element.dataset[IMAGE_CAPTION_TRANSITION_DATASET]
    return
  }
  if (state.frame !== undefined && typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(state.frame)
  }
  if (state.timer !== undefined) clearTimeout(state.timer)
  imageCaptionTransitions.delete(element)
  delete element.dataset[IMAGE_CAPTION_TRANSITION_DATASET]
}

/** 完成图片标题过渡，并在离场后将标题从布局中移除。 */
function finishImageCaptionTransition(element: HTMLElement, state: ImageTransitionState): void {
  if (imageCaptionTransitions.get(element)?.token !== state.token) return
  imageCaptionTransitions.delete(element)
  delete element.dataset[IMAGE_CAPTION_TRANSITION_DATASET]
  if (state.kind === 'leave') setImageCaptionHiddenState(element, true)
}

/** 启动图片标题的进入或离场过渡，并处理用户快速反复切换的情况。 */
function transitionImageCaption(element: HTMLElement, open: boolean): void {
  const current = imageCaptionTransitions.get(element)
  const targetKind: ImageTransitionKind = open ? 'enter' : 'leave'
  const captionHidden = element.dataset[IMAGE_CAPTION_HIDDEN_DATASET] !== undefined
  if (current?.kind === targetKind) return
  if (current === undefined && (open ? !captionHidden : captionHidden)) return

  if (prefersReducedMotion()) {
    cancelImageCaptionTransition(element)
    setImageCaptionHiddenState(element, !open)
    return
  }

  cancelImageCaptionTransition(element)
  const state: ImageTransitionState = { kind: targetKind, token: ++nextImageTransitionToken }
  imageCaptionTransitions.set(element, state)
  element.dataset[IMAGE_CAPTION_TRANSITION_DATASET] = targetKind

  const startVisiblePhase = (): void => {
    if (imageCaptionTransitions.get(element)?.token !== state.token) return
    element.dataset[IMAGE_CAPTION_TRANSITION_DATASET] = IMAGE_TRANSITION_ACTIVE
    state.timer = setTimeout(() => finishImageCaptionTransition(element, state), IMAGE_TRANSITION_DURATION_MS)
  }

  if (open) {
    setImageCaptionHiddenState(element, false)
    if (typeof globalThis.requestAnimationFrame === 'function') state.frame = globalThis.requestAnimationFrame(startVisiblePhase)
    else queueMicrotask(startVisiblePhase)
    return
  }

  state.timer = setTimeout(() => finishImageCaptionTransition(element, state), IMAGE_TRANSITION_DURATION_MS)
}

/** 将图片标题的实际隐藏状态同步到目标值；必要时继续未完成的过渡。 */
function syncImageCaptionVisibility(element: HTMLElement, hidden: boolean): void {
  const transition = imageCaptionTransitions.get(element)
  const expectedKind: ImageTransitionKind = hidden ? 'leave' : 'enter'
  if (transition?.kind === expectedKind) return
  if (transition !== undefined) {
    transitionImageCaption(element, !hidden)
    return
  }
  const captionHidden = element.dataset[IMAGE_CAPTION_HIDDEN_DATASET] !== undefined
  if (captionHidden !== hidden) setImageCaptionHiddenState(element, hidden)
}

/** 删除图片折叠标记及其插件生成的标题节点。 */
function removeImageMarker(marker: HTMLDetailsElement): void {
  const caption = imageCaptions.get(marker)
  if (caption !== undefined) {
    cancelImageCaptionTransition(caption)
    caption.remove()
    imageCaptions.delete(marker)
  }
  marker.remove()
}

/** 判断节点是否属于图片段落，并允许其参与图片容器识别。 */
function isImageContainerChild(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.trim() === ''
  if (!(node instanceof HTMLElement)) return false
  if (isMarkdownImageFallback(node)) return true
  if (node.matches(`.${IMAGE_CAPTION_CLASS}`)) return true
  return node.matches(`[${IMAGE_MARKER_ATTRIBUTE}]`)
    || node.matches(MARKDOWN_IMAGE_SELECTOR)
    || node.matches(`[${IMAGE_REPAIR_FALLBACK_ATTRIBUTE}]`)
    || node.matches('a') && node.querySelector(MARKDOWN_IMAGE_SELECTOR) !== null
}

/** 返回只有图片的 Markdown 段落，使插件可以将宿主边距替换为 8px 图片间距，
 * 同时不改变包含混合正文的段落。 */
function imageContainerFor(element: HTMLElement): HTMLElement | undefined {
  const parent = element.parentElement
  if (parent === null || parent.localName !== 'p') return undefined
  const children = [...parent.childNodes]
  return children.length > 0 && children.every(isImageContainerChild) ? parent : undefined
}

/** 识别 DSH 为失败 Markdown 图片生成的替代文本节点。 */
function isMarkdownImageFallback(element: Element): boolean {
  if (element.matches(MARKDOWN_IMAGE_ALT_SELECTOR)) return true
  if (!(element instanceof HTMLElement) || element.localName !== 'span') return false
  const paragraph = element.parentElement
  if (paragraph === null || paragraph.localName !== 'p') return false
  // 被拒绝的 Markdown 图片会渲染为 <p><span>alt</span></p>。回退结构检查必须
  // 保持足够严格，避免将普通的内联 span 误折叠。
  return [...paragraph.childNodes].every(node => node === element
    || node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === ''
    || node instanceof HTMLElement && node.matches(`[${IMAGE_MARKER_ATTRIBUTE}], .${IMAGE_CAPTION_CLASS}`))
}

/** 从 assistant 节点的文本块中提取 Markdown 图片引用，并按聊天行归类。 */
function markdownImageReferencesIn(
  rows: ReadonlyMap<string, HTMLElement>,
  chat: Readonly<{ nodes: ChatNodeStore }>,
): MarkdownImageReferences {
  const references = new Map<string, readonly MarkdownImageReference[]>()
  for (const row of rows.values()) {
    if (row.dataset['chatFlowKind'] !== 'assistant-step') continue
    const node = chat.nodes.get(row.dataset['chatFlowKey'] ?? '') as ChatNode | undefined
    if (node?.kind !== 'assistant-step') continue
    const blocks = node.data.blocks
    const values: MarkdownImageReference[] = []
    for (const block of blocks) {
      if (block.kind !== 'text') continue
      MARKDOWN_IMAGE_REFERENCE_PATTERN.lastIndex = 0
      for (const match of block.text.matchAll(MARKDOWN_IMAGE_REFERENCE_PATTERN)) {
        const source = match[2] ?? match[3]
        if (source === undefined || source.length === 0) continue
        values.push({ source, alt: match[1] ?? '' })
      }
    }
    if (values.length > 0) references.set(row.dataset['chatFlowKey'] ?? '', values)
  }
  return references
}

/** 读取 Windows 当前工作目录中的盘符，用于区分 Windows 和 POSIX 路径。 */
function windowsDrive(cwd: string | undefined): string | undefined {
  const drive = cwd === undefined ? undefined : /^([A-Za-z]:)[\\/]/u.exec(cwd)?.[1]
  return drive
}

/** 规范化 Windows 路径，并处理当前目录和父目录片段。 */
function normalizeWindowsPath(value: string): string {
  const normalized = value.replaceAll('/', '\\')
  const drive = /^[A-Za-z]:/u.exec(normalized)?.[0] ?? ''
  const parts = normalized.slice(drive.length).split('\\')
  const stack: string[] = []
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      stack.pop()
      continue
    }
    stack.push(part)
  }
  return `${drive}\\${stack.join('\\')}`
}

/** 规范化 POSIX 路径，并处理当前目录和父目录片段。 */
function normalizePosixPath(value: string): string {
  const absolute = value.startsWith('/')
  const stack: string[] = []
  for (const part of value.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      stack.pop()
      continue
    }
    stack.push(part)
  }
  return `${absolute ? '/' : ''}${stack.join('/')}` || (absolute ? '/' : '.')
}

/** 按当前 Session 的执行环境解析 Markdown 中记录的图片路径。 */
function resolveMarkdownImagePath(source: string, cwd: string | undefined): string | undefined {
  const value = source.trim()
  if (value === '' || /^\/\//u.test(value) || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)) return undefined
  const drive = windowsDrive(cwd)
  if (drive !== undefined && cwd !== undefined) {
    if (/^[A-Za-z]:[\\/]/u.test(value)) return normalizeWindowsPath(value)
    if (value.startsWith('/') || value.startsWith('\\')) return normalizeWindowsPath(`${drive}${value}`)
    return normalizeWindowsPath(`${cwd}\\${value}`)
  }
  if (value.startsWith('/')) return normalizePosixPath(value)
  return cwd === undefined ? undefined : normalizePosixPath(`${cwd}/${value}`)
}

/** 根据当前页面地址构造宿主提供的文件 API 地址。 */
function fileApiUrl(path: string): string | undefined {
  const location = globalThis.window?.location
  if (location === undefined || (location.protocol !== 'http:' && location.protocol !== 'https:')) return undefined
  const url = new URL('/api/file', location.href)
  url.searchParams.set('path', path)
  return url.href
}

/** 从宿主图片元素的 /api/file 地址中取回原始图片路径。 */
function authoredPathFromImage(image: HTMLImageElement): string | undefined {
  const source = image.getAttribute('src')
  if (source === null || source === '') return undefined
  try {
    const url = new URL(source, globalThis.window?.location.href)
    return url.pathname === '/api/file' ? url.searchParams.get('path') ?? undefined : undefined
  } catch {
    return undefined
  }
}

/** 将宿主图片的原始路径修复为当前会话可访问的文件 API 地址。 */
function repairMarkdownImageElement(image: HTMLImageElement, cwd: string | undefined): void {
  const authored = authoredPathFromImage(image)
  if (authored === undefined) return
  const resolved = resolveMarkdownImagePath(authored, cwd)
  const url = resolved === undefined ? undefined : fileApiUrl(resolved)
  if (url === undefined) return
  if (image.dataset[IMAGE_REPAIR_SOURCE_DATASET] === resolved && image.src === url) return
  image.dataset[IMAGE_REPAIR_DATASET] = ''
  image.dataset[IMAGE_REPAIR_SOURCE_DATASET] = resolved
  image.dataset[IMAGE_REPAIR_ORIGINAL_SOURCE_DATASET] ??= image.getAttribute('src') ?? ''
  image.src = url
}

/** 找出聊天行中的宿主 Markdown 图片元素和图片失败回退节点。 */
function markdownDisplaysIn(row: HTMLElement): HTMLElement[] {
  return [...row.querySelectorAll<HTMLElement>(`${MARKDOWN_IMAGE_SELECTOR}, span`)]
    .filter(element => element.matches(MARKDOWN_IMAGE_SELECTOR)
      || isMarkdownImageFallback(element)
        && element.dataset[IMAGE_REPAIR_FALLBACK_DATASET] === undefined)
}

/** 从图片显示节点中读取实际的 img 元素。 */
function imageElementFromDisplay(element: HTMLElement): HTMLImageElement | undefined {
  if (element.localName === 'img') return element as HTMLImageElement
  return element.querySelector<HTMLImageElement>('img') ?? undefined
}

/** 读取图片的替代文本，并在没有替代文本时回退到节点文本。 */
function imageNameFromDisplay(element: HTMLElement): string {
  const image = imageElementFromDisplay(element)
  if (image !== undefined && image.alt.trim() !== '') return image.alt.trim()
  return oneLine(element.textContent) || 'image'
}

/** 从图片显示节点中读取宿主保留的原始路径。 */
function imagePathFromDisplay(element: HTMLElement): string | undefined {
  const image = imageElementFromDisplay(element)
  return image === undefined ? undefined : authoredPathFromImage(image)
}

/** 生成 Markdown 引用用于匹配图片显示的路径键。 */
function imageReferencePathKey(reference: MarkdownImageReference, cwd: string | undefined): string {
  return resolveMarkdownImagePath(reference.source, cwd) ?? reference.source.trim()
}

/** 生成已渲染图片用于匹配 Markdown 引用的路径键。 */
function imageDisplayPathKey(display: HTMLElement, cwd: string | undefined): string | undefined {
  const path = imagePathFromDisplay(display)
  return path === undefined ? undefined : resolveMarkdownImagePath(path, cwd) ?? path
}

/** 一组与同一个原始 Markdown 引用关联的宿主图片显示。 */
interface MarkdownImageDisplayGroup {
  readonly key: string
  readonly displays: readonly HTMLElement[]
  readonly reference: MarkdownImageReference | undefined
}

/** 将每个已渲染的 Markdown 图片显示对应到一个原始引用；同时将流式渲染期间
 * 暂时重复的 DOM 显示合并为一个逻辑图片目标。 */
function markdownDisplayGroupsIn(
  row: HTMLElement,
  references: readonly MarkdownImageReference[],
  cwd: string | undefined,
): readonly MarkdownImageDisplayGroup[] {
  const displays = markdownDisplaysIn(row)
  if (references.length === 0) {
    return displays.map((display, index) => ({ key: `display:${index}`, displays: [display], reference: undefined }))
  }

  const remaining = new Set(displays)
  const groups: MarkdownImageDisplayGroup[] = []
  for (const [index, reference] of references.entries()) {
    const pathKey = imageReferencePathKey(reference, cwd)
    const alt = oneLine(reference.alt)
    const matches = [...remaining].filter(display => {
      const displayPath = imageDisplayPathKey(display, cwd)
      return displayPath === pathKey
        || displayPath === undefined && alt !== '' && imageNameFromDisplay(display) === alt
    })
    const selected = matches.length > 0 ? matches : [...remaining].slice(0, 1)
    if (selected.length === 0) continue
    for (const display of selected) remaining.delete(display)
    groups.push({ key: `markdown:${pathKey}:${index}`, displays: selected, reference })
  }
  return groups
}

/** 选择图片折叠实际控制的 DOM 目标；纯图片链接使用链接本身作为目标。 */
function imageTargetElement(display: HTMLElement): HTMLElement {
  const image = imageElementFromDisplay(display)
  if (image === null || image === undefined) return display
  const anchor = image.closest<HTMLElement>('a')
  const anchorImages = anchor?.querySelectorAll('img')
  return anchor !== null
    && anchorImages !== undefined
    && anchorImages.length === 1
    && anchor.textContent?.trim() === ''
    ? anchor
    : display
}

/** 在 DSH 将 Windows 根相对路径的图片替换为替代文本前，修复其图片地址。 */
function repairMarkdownImages(
  rows: ReadonlyMap<string, HTMLElement>,
  references: MarkdownImageReferences,
  cwd: string | undefined,
): void {
  for (const [rowKey, rowReferences] of references) {
    const row = rows.get(rowKey)
    if (row === undefined) continue
    for (const group of markdownDisplayGroupsIn(row, rowReferences, cwd)) {
      const reference = group.reference
      if (reference === undefined) continue
      const resolved = resolveMarkdownImagePath(reference.source, cwd)
      const url = resolved === undefined ? undefined : fileApiUrl(resolved)
      if (url === undefined) continue
      for (const display of group.displays) {
        if (display.matches(MARKDOWN_IMAGE_SELECTOR)) {
          repairMarkdownImageElement(display as HTMLImageElement, cwd)
          continue
        }
        const fallback = display
        if (fallback.dataset[IMAGE_REPAIR_FALLBACK_DATASET] === resolved) continue
        if (fallback.dataset[IMAGE_REPAIR_FAILED_DATASET] === 'true'
          && fallback.dataset[IMAGE_REPAIR_SOURCE_DATASET] === resolved) continue

        const image = document.createElement('img')
        image.className = 'dca-markdown-image-repair'
        image.src = url
        image.alt = reference.alt
        image.setAttribute('loading', 'lazy')
        image.setAttribute('decoding', 'async')
        image.setAttribute('referrerpolicy', 'no-referrer')
        image.dataset[IMAGE_REPAIR_DATASET] = ''
        image.dataset[IMAGE_REPAIR_SOURCE_DATASET] = resolved
        image.addEventListener('error', () => {
          image.remove()
          delete fallback.dataset[IMAGE_REPAIR_FALLBACK_DATASET]
          fallback.dataset[IMAGE_REPAIR_FAILED_DATASET] = 'true'
          setImageHidden(fallback, false)
        }, { once: true })
        fallback.dataset[IMAGE_REPAIR_FALLBACK_DATASET] = resolved
        fallback.dataset[IMAGE_REPAIR_SOURCE_DATASET] = resolved
        delete fallback.dataset[IMAGE_REPAIR_FAILED_DATASET]
        fallback.before(image)
        setImageHidden(fallback, true)
      }
    }
  }
}

/** 图片目标在同一聊天行内的合并键，可以是 DOM 元素或解析出的引用键。 */
type ImageTargetKey = string | HTMLElement

/** 收集每个聊天行中的官方图片画廊和 Markdown 图片目标。 */
function imageTargetsIn(
  container: HTMLElement,
  rows: ReadonlyMap<string, HTMLElement>,
  referencesByRow: MarkdownImageReferences,
  cwd: string | undefined,
): ReadonlyMap<HTMLElement, readonly ImageTarget[]> {
  const targetsByRow = new Map<HTMLElement, Map<ImageTargetKey, ImageTarget>>()
  const rowFor = (element: Element): HTMLElement | undefined => {
    const row = element.closest<HTMLElement>('[data-chat-flow-key]')
    if (row === null) return undefined
    const key = row.dataset['chatFlowKey'] ?? ''
    return rows.get(key) === row ? row : undefined
  }
  const acceptsImages = (row: HTMLElement, element: Element): boolean => {
    const rowKind = row.dataset['chatFlowKind']
    if (rowKind === 'user' || rowKind === 'steering') return false
    return element.closest('[data-message-attachments]') === null
  }
  const add = (row: HTMLElement, key: ImageTargetKey, target: ImageTarget): void => {
    const targets = targetsByRow.get(row) ?? new Map<ImageTargetKey, ImageTarget>()
    const current = targets.get(key)
    if (current === undefined) targets.set(key, target)
    else {
      targets.set(key, {
        ...current,
        elements: [...new Set([...current.elements, ...target.elements])],
        count: current.count + target.count,
        labels: [...current.labels, ...target.labels],
      })
    }
    targetsByRow.set(row, targets)
  }

  // 每轮同步只查询一次 Chat Flow，不在每条聊天行上重复查询。这样在高频流式
  // 更新且大多数行没有图片时，图片扫描的成本更低。
  for (const button of container.querySelectorAll<HTMLElement>(IMAGE_BUTTON_SELECTOR)) {
    const row = rowFor(button)
    if (row === undefined || !acceptsImages(row, button)) continue
    const gallery = button.closest<HTMLElement>('[data-align]') ?? button
    const buttons = [...gallery.querySelectorAll<HTMLElement>(IMAGE_BUTTON_SELECTOR)]
    if (buttons.length === 0 || button !== buttons[0]) continue
    add(row, gallery, {
      element: gallery,
      elements: [gallery],
      count: buttons.length,
      inline: false,
      labels: buttons.map(item => ({ name: imageNameFromDisplay(item), path: imagePathFromDisplay(item) })),
    })
  }

  for (const row of rows.values()) {
    const rowKey = row.dataset['chatFlowKey'] ?? ''
    const references = referencesByRow.get(rowKey) ?? []
    for (const group of markdownDisplayGroupsIn(row, references, cwd)) {
      const firstDisplay = group.displays[0]
      if (firstDisplay === undefined || !acceptsImages(row, firstDisplay)) continue
      const elements = [...new Set(group.displays.map(imageTargetElement))]
      const element = elements[0]
      if (element === undefined) continue
      const reference = group.reference
      const label = reference === undefined
        ? { name: imageNameFromDisplay(element), path: imagePathFromDisplay(element) }
        : { name: oneLine(reference.alt) || imageNameFromDisplay(element), path: reference.source }
      add(row, group.key, { element, elements, count: 1, inline: true, labels: [label] })
    }
  }

  return new Map([...targetsByRow.entries()].map(([row, targets]) => [
    row,
    [...targets.values()].sort((left, right) => {
      const position = left.element.compareDocumentPosition(right.element)
      return position & 4 /* Node.DOCUMENT_POSITION_FOLLOWING：当前节点之后的节点 */ ? -1 : 1
    }),
  ]))
}

/** 根据图片数量选择带单复数的本地化文案。 */
function imageLabel(count: number, t: ActivityTranslate): string {
  return t(count === 1 ? 'count.image' : 'count.images', { count })
}

/** 生成图片折叠标记上的摘要；单图优先显示图片名称。 */
function imageSummaryLabel(target: ImageTarget, t: ActivityTranslate): string {
  const first = target.labels[0]
  if (target.count === 1 && first !== undefined) {
    return oneLine(first.name) || first.path || imageLabel(target.count, t)
  }
  return imageLabel(target.count, t)
}

/** 生成图片展开后的标题，并在可用时附带原始路径。 */
function imageCaption(label: ImageLabel, fallback: string): string {
  const name = oneLine(label.name) || label.path || fallback
  return label.path === undefined ? name : `${name}（${label.path}）`
}

/** 从图片标记的数据属性中解析标题列表，异常数据按空列表处理。 */
function imageLabelsFromMarker(marker: HTMLDetailsElement): readonly ImageLabel[] {
  const raw = marker.dataset[IMAGE_MARKER_LABELS_DATASET]
  if (raw === undefined) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap(item => {
      if (typeof item !== 'object' || item === null) return []
      const value = item as { name?: unknown; path?: unknown }
      const name = typeof value.name === 'string' ? value.name : ''
      const path = typeof value.path === 'string' ? value.path : undefined
      return name !== '' || path !== undefined ? [{ name, path }] : []
    })
  } catch {
    return []
  }
}

/** 创建或更新图片折叠标记的 summary 和展开标题节点。 */
function setImageMarkerText(
  marker: HTMLDetailsElement,
  target: ImageTarget,
  t: ActivityTranslate,
): HTMLElement {
  const label = imageSummaryLabel(target, t)
  const labels = target.labels.length > 0 ? target.labels : [{ name: label, path: undefined }]
  const captionText = labels.map(item => imageCaption(item, label)).join(' / ')
  const signature = JSON.stringify([label, captionText, target.inline, labels])
  let details = imageCaptions.get(marker)
  if (details === undefined) {
    details = document.createElement('div')
    details.className = IMAGE_CAPTION_CLASS
    setImageCaptionHiddenState(details, true)
    imageCaptions.set(marker, details)
  }
  if (marker.dataset[IMAGE_MARKER_SIGNATURE_DATASET] === signature) return details
  marker.dataset[IMAGE_MARKER_SIGNATURE_DATASET] = signature
  marker.dataset[IMAGE_MARKER_LABELS_DATASET] = JSON.stringify(labels)
  marker.dataset['dcaImageCount'] = String(target.count)
  marker.dataset['dcaImageInline'] = String(target.inline)
  marker.classList.toggle('dca-image-group-inline', target.inline)
  marker.replaceChildren()

  const summary = document.createElement('summary')
  summary.className = 'dca-image-summary'
  summary.title = captionText

  const stateRail = document.createElement('span')
  stateRail.className = 'dca-state-rail'
  stateRail.setAttribute('aria-hidden', 'true')

  const arrow = disclosureIcon('dca-image-marker-icon')
  const text = document.createElement('span')
  text.className = 'dca-label dca-image-label'
  text.textContent = label
  summary.append(stateRail, arrow, text)
  marker.append(summary)

  details.replaceChildren(...labels.map(item => {
    const caption = document.createElement('div')
    caption.className = 'dca-image-caption'
    caption.textContent = imageCaption(item, label)
    return caption
  }))
  return details
}

/** 当语言切换时，仅更新现有图片标记的本地化文案。 */
function syncImageLabelsIn(container: HTMLElement, t: ActivityTranslate): void {
  for (const marker of imageMarkersIn(container).values()) {
    const count = Number(marker.dataset['dcaImageCount'])
    if (!Number.isInteger(count) || count < 1) continue
    setImageMarkerText(marker, {
      element: marker,
      elements: [marker],
      count,
      inline: marker.dataset['dcaImageInline'] === 'true',
      labels: imageLabelsFromMarker(marker),
    }, t)
  }
}

/** 同时隐藏或显示一个图片目标包含的全部宿主元素。 */
function setImageTargetHidden(target: ImageTarget, hidden: boolean): void {
  for (const element of target.elements) setImageHidden(element, hidden)
}

/** 为图片目标中的全部宿主元素启动相同方向的过渡。 */
function transitionImageTarget(target: ImageTarget, open: boolean): void {
  for (const element of target.elements) transitionImageVisibility(element, open)
}

/** 将图片目标的可见性同步到目标状态，并衔接已有的中断过渡。 */
function syncImageTargetVisibility(target: ImageTarget, hidden: boolean): void {
  for (const element of target.elements) {
    const transition = imageTransitions.get(element)
    const expectedKind: ImageTransitionKind = hidden ? 'leave' : 'enter'
    if (transition?.kind === expectedKind) continue
    if (transition !== undefined) {
      transitionImageVisibility(element, !hidden)
      continue
    }
    const currentlyHidden = element.dataset[IMAGE_HIDDEN_DATASET] !== undefined
    if (currentlyHidden !== hidden) setImageHidden(element, hidden)
  }
}

/**
 * 折叠非用户消息中的图片，但不移动或替换宿主的图片子树。
 * 标记是独立的 details 元素；原始画廊或图片仍保留在 React 的 DOM 位置，
 * 仅在标记展开前保持隐藏。
 */
function syncImageGroups(
  container: HTMLElement,
  rows: ReadonlyMap<string, HTMLElement>,
  t: ActivityTranslate,
  referencesByRow: MarkdownImageReferences,
  cwd: string | undefined,
): void {
  const targetsByRow = imageTargetsIn(container, rows, referencesByRow, cwd)
  const candidates = [...rows.values()].flatMap(row => {
    const rowKey = row.dataset['chatFlowKey'] ?? ''
    return (targetsByRow.get(row) ?? []).map((target, index) => ({
      id: `${rowKey}:image:${index}`,
      target,
    }))
  })
  const activeIds = new Set(candidates.map(candidate => candidate.id))
  const activeTargets = new Set(candidates.flatMap(candidate => candidate.target.elements))
  const activeContainers = new Set<HTMLElement>()
  for (const candidate of candidates) {
    const imageContainer = imageContainerFor(candidate.target.element)
    if (imageContainer !== undefined) activeContainers.add(imageContainer)
  }
  for (const imageContainer of container.querySelectorAll<HTMLElement>(`[${IMAGE_CONTAINER_ATTRIBUTE}]`)) {
    if (!activeContainers.has(imageContainer)) delete imageContainer.dataset[IMAGE_CONTAINER_DATASET]
  }
  for (const imageContainer of activeContainers) imageContainer.dataset[IMAGE_CONTAINER_DATASET] = ''

  const markers = imageMarkersIn(container)

  for (const target of container.querySelectorAll<HTMLElement>(`[${IMAGE_TARGET_ATTRIBUTE}]`)) {
    if (!activeTargets.has(target)) {
      setImageHidden(target, false)
      delete target.dataset['dcaImageTarget']
    }
  }
  for (const [id, marker] of markers) {
    if (!activeIds.has(id)) removeImageMarker(marker)
  }

  for (const candidate of candidates) {
    const { id, target } = candidate
    for (const element of target.elements) element.dataset['dcaImageTarget'] = id
    let marker = markers.get(id)
    const markerCreated = marker === undefined
    if (marker === undefined) {
      marker = document.createElement('details')
      marker.className = 'dca-image-group'
      marker.dataset['dcaImageGroup'] = id
      markers.set(id, marker)
    }
    const currentMarker = marker
    const details = setImageMarkerText(currentMarker, target, t)
    const lastTarget = target.elements.at(-1) ?? target.element
    currentMarker.ontoggle = () => {
      transitionImageCaption(details, currentMarker.open)
      transitionImageTarget(target, currentMarker.open)
    }
    if (currentMarker.nextElementSibling !== target.element) target.element.before(currentMarker)
    if (lastTarget.nextElementSibling !== details) lastTarget.after(details)
    if (markerCreated) {
      setImageTargetHidden(target, !currentMarker.open)
      setImageCaptionHiddenState(details, true)
    } else {
      syncImageTargetVisibility(target, !currentMarker.open)
      syncImageCaptionVisibility(details, !currentMarker.open)
    }
  }
}

/** 判断官方 Think 或工具过程项当前是否处于展开状态。 */
function memberDisclosureOpen(element: HTMLElement): boolean {
  if (element.dataset['variant'] === 'think') return element.hasAttribute('data-expanded')
  return element.querySelector('[data-open]') !== null
}

/**
 * 为本组的官方过程项附加展示标记。嵌套工具调用只参与计数，仍由根工具组件
 * 保持自己的官方层级，因此不会在这里生成第二个顶层子项。
 */
function syncGroupMembers(
  rows: ReadonlyMap<string, HTMLElement>,
  group: ActivityGroup,
  liveMembers: Set<HTMLElement>,
): void {
  const membersByRow = new Map<string, ActivityGroup['members'][number][]>()
  for (const member of group.members) {
    const rowMembers = membersByRow.get(member.rowKey)
    if (rowMembers === undefined) membersByRow.set(member.rowKey, [member])
    else rowMembers.push(member)
  }
  const members = memberElementsIn(rows, group, membersByRow)
  for (const [index, member] of members.entries()) {
    liveMembers.add(member.element)
    member.element.classList.add(MEMBER_CLASS)
    member.element.classList.toggle(MEMBER_FIRST_CLASS, index === 0)
    member.element.classList.toggle(MEMBER_LAST_CLASS, index === members.length - 1)
    if (member.element.dataset['dcaMemberState'] !== member.state) {
      member.element.dataset['dcaMemberState'] = member.state
    }
    member.element.toggleAttribute(MEMBER_COLLAPSED_ATTRIBUTE, !memberDisclosureOpen(member.element))
  }
}

/** 混合正文行只能折叠 Think 子项；其余过程行可整体隐藏。 */
function setGroupOpen(rows: ReadonlyMap<string, HTMLElement>, group: ActivityGroup, open: boolean): void {
  for (const key of group.keys) {
    const row = rows.get(key)
    if (row === undefined) continue
    row.classList.add(ROW_CLASS)
    if (key === group.partialKey) {
      for (const reasoning of row.querySelectorAll<HTMLElement>('[data-variant="think"]')) {
        reasoning.classList.toggle(REASONING_CHILD_CLASS, !open)
        // DSH 仅在官方总过程折叠关闭时添加 data-turn-process-inline。
        // 官方折叠展开后，同一个包装节点不会保留该属性；此时也要隐藏它，
        // 否则空的 flex 项仍会在官方 16px 正文间距两侧占位。
        const parent = reasoning.parentElement
        const inlineProcess = reasoning.closest<HTMLElement>('[data-turn-process-inline]')
          ?? (parent?.childElementCount === 1 && parent.firstElementChild === reasoning ? parent : undefined)
        inlineProcess?.parentElement?.classList.add(INLINE_BODY_CLASS)
        setPluginHidden(inlineProcess ?? reasoning, !open)
      }
    } else {
      row.classList.toggle(CHILD_CLASS, !open)
      setPluginHidden(row, !open)
    }
  }
}

/** 为总折叠标记和组前后的可见过程行同步间距类。 */
function syncGroupSpacing(
  marker: HTMLDetailsElement,
  group: ActivityGroup,
  orderedRows: readonly HTMLElement[],
): void {
  if (marker.previousElementSibling !== null) marker.dataset['dcaSpaced'] = ''
  else delete marker.dataset['dcaSpaced']

  // DOM 中标记后面仍跟着隐藏的过程行。第一条可见行也需要补间距，
  // 包括保留正文的部分 assistant 行。
  let sibling = marker.nextElementSibling
  while (sibling !== null) {
    if (sibling instanceof HTMLElement && sibling.matches('[data-chat-flow-key]') && !sibling.hidden) {
      sibling.classList.add(AFTER_CLASS)
      break
    }
    sibling = sibling.nextElementSibling
  }

  const lastKey = group.keys.at(-1)
  const lastIndex = lastKey === undefined
    ? -1
    : orderedRows.findIndex(row => row.dataset['chatFlowKey'] === lastKey)
  for (let index = lastIndex + 1; index < orderedRows.length; index++) {
    const next = orderedRows[index]
    if (next === undefined || next.hidden) continue
    next.classList.add(AFTER_CLASS)
    break
  }
}

/** 移除 DSH 为支持搜索而保留的隐藏过程行布局盒。 */
function syncOfficialHiddenRows(rows: ReadonlyMap<string, HTMLElement>): void {
  for (const row of rows.values()) {
    if (row.hasAttribute('data-turn-process-hidden')) {
      row.dataset[OFFICIAL_HIDDEN_DATASET] = ''
      setPluginHidden(row, true)
      continue
    }
    if (row.dataset[OFFICIAL_HIDDEN_DATASET] === undefined) continue
    delete row.dataset[OFFICIAL_HIDDEN_DATASET]
    // 插件总折叠关闭时，该行的隐藏状态仍由插件管理。
    if (!row.classList.contains(CHILD_CLASS)) setPluginHidden(row, false)
  }
}

/** 查找与过程组首行属于同一会话轮次的官方折叠控制。 */
function officialTurnControl(
  container: HTMLElement,
  group: ActivityGroup,
  rows: ReadonlyMap<string, HTMLElement>,
): HTMLElement | undefined {
  const turn = rows.get(group.firstKey)?.dataset['chatTurn']
  if (turn === undefined) return undefined
  return [...container.querySelectorAll<HTMLElement>('[data-turn-process]')]
    .find(control => control.dataset['turnProcess'] === turn)
}

/** 将官方总过程折叠状态同步到插件自己的总折叠标记。 */
function syncOfficialTurnVisibility(
  container: HTMLElement,
  marker: HTMLDetailsElement,
  group: ActivityGroup,
  rows: ReadonlyMap<string, HTMLElement>,
): void {
  const control = officialTurnControl(container, group, rows)
  const hidden = control?.getAttribute('aria-expanded') === 'false'
  if (hidden) {
    marker.dataset[PLUGIN_MARKER_HIDDEN_DATASET] = ''
    marker.hidden = true
  } else if (marker.dataset[PLUGIN_MARKER_HIDDEN_DATASET] !== undefined) {
    delete marker.dataset[PLUGIN_MARKER_HIDDEN_DATASET]
    marker.hidden = false
  }
}

/** 将文本压缩为单行，供摘要、标题和路径匹配使用。 */
function oneLine(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

/** 按可视顺序读取官方 DisclosureRow 的类型和折叠摘要。 */
function officialToolSummary(
  rows: ReadonlyMap<string, HTMLElement>,
  group: ActivityGroup,
  t: ActivityTranslate,
): string {
  const row = rows.get(group.latestKey)
  const tools = row === undefined ? [] : [...row.querySelectorAll<HTMLElement>('[data-tool]')]
  const tool = tools.findLast(item => item.dataset['state'] === 'running') ?? tools.at(-1)
  const disclosure = tool?.querySelector<HTMLElement>('[data-disclosure-row]')
  if (disclosure === null || disclosure === undefined) return t('status.toolRunning')
  const parts = [...disclosure.children]
    .slice(1)
    .map(child => oneLine(child.textContent))
    .filter(Boolean)
  const [title, ...summary] = parts
  if (title === undefined) return t('status.toolRunning')
  return summary.length === 0 ? title : `${title} · ${summary.join(' ')}`
}

/** 读取当前组的实时摘要；思考使用固定文案，工具复用官方摘要。 */
function liveSummary(rows: ReadonlyMap<string, HTMLElement>, group: ActivityGroup, t: ActivityTranslate): string {
  if (!group.running) return ''
  return group.latestKind === 'reasoning' ? t('status.thinking') : officialToolSummary(rows, group, t)
}

type CountKind = 'reasoning' | 'tool' | 'failure'

/** 总折叠中一个计数项的类型、数量和本地化标签。 */
interface CountItem {
  readonly kind: CountKind
  readonly count: number
  readonly label: string
}

const COUNT_ICON_MARKUP: Readonly<Record<CountKind, string>> = {
  reasoning: '<path d="M7.06431 5.93342C7.68763 5.93342 8.19307 6.43904 8.19322 7.06233C8.19322 7.68573 7.68772 8.19123 7.06431 8.19123C6.44099 8.19113 5.9354 7.68567 5.9354 7.06233C5.93555 6.43911 6.44108 5.93353 7.06431 5.93342Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M8.6815 0.963693C10.1169 0.447019 11.6266 0.374829 12.5633 1.31135C13.5 2.24805 13.4277 3.75776 12.911 5.19319C12.7126 5.74431 12.4386 6.31796 12.0965 6.89729C12.4969 7.54638 12.8141 8.19018 13.036 8.80647C13.5527 10.2419 13.6251 11.7516 12.6883 12.6883C11.7516 13.625 10.242 13.5527 8.8065 13.036C8.19022 12.8141 7.54641 12.4969 6.89732 12.0965C6.31797 12.4386 5.74435 12.7125 5.19322 12.911C3.75777 13.4276 2.2481 13.5 1.31138 12.5633C0.374859 11.6266 0.447049 10.1168 0.963724 8.68147C1.17185 8.10338 1.46321 7.50063 1.82896 6.8924C1.52182 6.35711 1.27235 5.82825 1.08872 5.31819C0.572068 3.88278 0.499714 2.37306 1.43638 1.43635C2.37308 0.499655 3.8828 0.572044 5.31822 1.08869C5.82828 1.27232 6.35715 1.5218 6.89243 1.82893C7.50066 1.46318 8.10341 1.17181 8.6815 0.963693ZM11.3573 8.01154C10.9083 8.62253 10.3901 9.22873 9.80943 9.8094C9.22877 10.3901 8.62255 10.9083 8.01158 11.3572C8.4257 11.5841 8.8287 11.7688 9.21275 11.9071C10.5456 12.3868 11.4246 12.2547 11.8397 11.8397C12.2548 11.4246 12.3869 10.5456 11.9071 9.21272C11.7688 8.82866 11.5841 8.42568 11.3573 8.01154ZM2.56529 8.02912C2.37344 8.39322 2.21495 8.74796 2.09263 9.08772C1.61291 10.4204 1.74512 11.2995 2.16001 11.7147C2.57505 12.1297 3.45415 12.2618 4.78697 11.7821C5.11057 11.6656 5.44786 11.5164 5.7938 11.3367C5.249 10.9223 4.70922 10.4533 4.19029 9.9344C3.57578 9.31987 3.03169 8.67633 2.56529 8.02912ZM6.90708 3.2469C6.24065 3.70479 5.5646 4.26321 4.91392 4.91389C4.26325 5.56456 3.70482 6.24063 3.24693 6.90705C3.72674 7.63325 4.32777 8.37459 5.03892 9.08576C5.64943 9.69627 6.28183 10.2265 6.90806 10.6678C7.59368 10.2025 8.2908 9.63076 8.96079 8.96076C9.6308 8.29075 10.2025 7.59366 10.6678 6.90803C10.2265 6.2818 9.69631 5.6494 9.08579 5.03889C8.37462 4.32773 7.63328 3.72672 6.90708 3.2469ZM11.7147 2.15998C11.2996 1.74509 10.4204 1.61288 9.08775 2.0926C8.74835 2.21479 8.39382 2.37271 8.03013 2.56428C8.67728 3.03065 9.31995 3.5758 9.93443 4.19026C10.4534 4.7092 10.9223 5.24896 11.3368 5.79377C11.5164 5.44785 11.6656 5.11052 11.7821 4.78694C12.2618 3.45416 12.1297 2.57502 11.7147 2.15998ZM4.91197 2.2176C3.57922 1.73788 2.70004 1.86995 2.28501 2.28498C1.87001 2.70003 1.73791 3.5792 2.21763 4.91194C2.31709 5.18822 2.44112 5.47427 2.58677 5.7674C3.01931 5.1887 3.51474 4.6158 4.06529 4.06526C4.61584 3.5147 5.18872 3.01928 5.76743 2.58674C5.47431 2.4411 5.18824 2.31706 4.91197 2.2176Z"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94L14.7 6.3Z"/>',
  failure: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
}

/** 生成总折叠中需要展示的思考、工具和失败计数。 */
function countItems(group: ActivityGroup, t: ActivityTranslate): readonly CountItem[] {
  const items: CountItem[] = []
  if (group.reasoningCount > 0) {
    items.push({
      kind: 'reasoning',
      count: group.reasoningCount,
      label: t(group.reasoningCount === 1 ? 'count.thought' : 'count.thoughts', { count: group.reasoningCount }),
    })
  }
  if (group.toolCount > 0) {
    items.push({
      kind: 'tool',
      count: group.toolCount,
      label: t(group.toolCount === 1 ? 'count.toolCall' : 'count.toolCalls', { count: group.toolCount }),
    })
  }
  if (group.failureCount > 0) {
    items.push({
      kind: 'failure',
      count: group.failureCount,
      label: t(group.failureCount === 1 ? 'count.failure' : 'count.failures', { count: group.failureCount }),
    })
  }
  return items
}

/** 创建总折叠和图片折叠共用的右向箭头 SVG。 */
function disclosureIcon(className: string): SVGSVGElement {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  icon.classList.add(className)
  icon.setAttribute('viewBox', '0 0 20 20')
  icon.setAttribute('fill', 'none')
  icon.setAttribute('stroke', 'currentColor')
  icon.setAttribute('stroke-width', '1.8')
  icon.setAttribute('stroke-linecap', 'round')
  icon.setAttribute('stroke-linejoin', 'round')
  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('focusable', 'false')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M7 4.5 13 10l-6 5.5')
  icon.append(path)
  return icon
}

/** 创建计数项使用的 SVG 图标，并按计数类型选择路径。 */
function countIcon(kind: CountKind): SVGSVGElement {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const outline = kind !== 'reasoning'
  icon.classList.add('dca-count-icon')
  icon.setAttribute('viewBox', outline ? '0 0 24 24' : '0 0 14 14')
  icon.setAttribute('fill', outline ? 'none' : 'currentColor')
  if (outline) {
    icon.setAttribute('stroke', 'currentColor')
    icon.setAttribute('stroke-width', '2')
    icon.setAttribute('stroke-linecap', 'round')
    icon.setAttribute('stroke-linejoin', 'round')
  }
  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('focusable', 'false')
  icon.innerHTML = COUNT_ICON_MARKUP[kind]
  return icon
}

/** 根据分组状态和实时摘要更新总折叠标记，避免无变化时重建 DOM。 */
function setMarkerText(
  marker: HTMLDetailsElement,
  group: ActivityGroup,
  summaryText: string,
  t: ActivityTranslate,
): void {
  const labelText = t(group.running ? 'status.running' : group.error ? 'status.error' : 'status.done')
  const counts = countItems(group, t)
  const signature = JSON.stringify([labelText, counts, summaryText, group.running, group.error])
  // MutationObserver 会因官方行的内部更新频繁触发；内容未变时保留 summary，
  // 以免无意义地重建节点并打断焦点或原生 details 状态。
  if (marker.dataset['signature'] === signature) return
  marker.dataset['signature'] = signature
  marker.dataset['running'] = String(group.running)
  marker.dataset['error'] = String(group.error)
  marker.replaceChildren()

  const summary = document.createElement('summary')
  summary.className = 'dca-activity-summary'
  summary.title = summaryText

  const stateRail = document.createElement('span')
  stateRail.className = 'dca-state-rail'
  stateRail.setAttribute('aria-hidden', 'true')

  const arrow = disclosureIcon('dca-marker')

  const label = document.createElement('span')
  label.className = 'dca-label'
  label.textContent = labelText
  if (group.running || group.error) {
    label.setAttribute('role', 'status')
    label.setAttribute('aria-live', 'polite')
  }

  const countSeparator = document.createElement('span')
  countSeparator.className = 'dca-separator'
  countSeparator.setAttribute('aria-hidden', 'true')

  const count = document.createElement('span')
  count.className = 'dca-count'
  for (const item of counts) {
    const countItem = document.createElement('span')
    countItem.className = 'dca-count-item'
    countItem.dataset['dcaCount'] = item.kind
    countItem.setAttribute('aria-label', item.label)

    const value = document.createElement('span')
    value.setAttribute('aria-hidden', 'true')
    value.textContent = `×${item.count}`
    countItem.append(countIcon(item.kind), value)
    count.append(countItem)
  }

  summary.append(stateRail, arrow, label, countSeparator, count)
  if (summaryText !== '') {
    const separator = document.createElement('span')
    separator.className = 'dca-separator'
    separator.setAttribute('aria-hidden', 'true')

    const details = document.createElement('span')
    details.className = 'dca-summary'
    details.textContent = summaryText
    summary.append(separator, details)
  }
  marker.append(summary)
}

/**
 * 只同步一个可见 Chat Flow。完整组必须都位于该流中，避免在保留的其他会话流
 * 插入跨会话的总折叠。
 */
function syncContainer(
  container: HTMLElement,
  groups: readonly ActivityGroup[],
  t: ActivityTranslate,
  syncImages: boolean,
  syncImageLabels: boolean,
  chat: Readonly<{ nodes: ChatNodeStore }>,
  sessionCwd: string | undefined,
): void {
  const rows = rowsIn(container)
  const orderedRows = [...rows.values()]
  const visibleGroups = groups.filter(group => group.keys.every(key => rows.has(key)))
  const activeKeys = new Set(visibleGroups.flatMap(group => group.keys))
  const liveMarkers = new Set(visibleGroups.map(group => group.firstKey))
  const liveMembers = new Set<HTMLElement>()
  const markers = markersIn(container)

  // 宿主可能复用或移除行。先撤销上一轮标记，避免过期分组继续隐藏新内容。
  for (const [key, row] of rows) {
    row.classList.remove(CHILD_CLASS)
    row.classList.remove(ROW_CLASS)
    row.classList.remove(AFTER_CLASS)
    if (!activeKeys.has(key) && row.dataset[PLUGIN_HIDDEN_DATASET] !== undefined) {
      setPluginHidden(row, false)
    }
  }
  for (const reasoning of container.querySelectorAll<HTMLElement>(`.${REASONING_CHILD_CLASS}`)) {
    reasoning.classList.remove(REASONING_CHILD_CLASS)
  }
  for (const body of container.querySelectorAll<HTMLElement>(`.${INLINE_BODY_CLASS}`)) {
    body.classList.remove(INLINE_BODY_CLASS)
  }
  for (const [firstKey, marker] of markers) {
    if (!liveMarkers.has(firstKey)) {
      marker.remove()
      markers.delete(firstKey)
    }
  }

  for (const group of visibleGroups) {
    const first = rows.get(group.firstKey)
    if (first === undefined) continue
    let marker = markers.get(group.firstKey)
    if (marker === undefined) {
      marker = document.createElement('details')
      marker.className = 'dca-activity-group'
      marker.dataset['dcaActivityGroup'] = group.firstKey
      first.before(marker)
      markers.set(group.firstKey, marker)
    } else if (marker.nextElementSibling !== first) {
      first.before(marker)
    }
    marker.ontoggle = () => {
      syncContainer(container, groups, t, false, false, chat, sessionCwd)
    }
    setMarkerText(marker, group, liveSummary(rows, group, t), t)
    syncOfficialTurnVisibility(container, marker, group, rows)
    syncGroupMembers(rows, group, liveMembers)
    setGroupOpen(rows, group, marker.open)
    syncGroupSpacing(marker, group, orderedRows)
  }
  syncOfficialHiddenRows(rows)
  if (syncImages) {
    const imageReferences = markdownImageReferencesIn(rows, chat)
    repairMarkdownImages(rows, imageReferences, sessionCwd)
    syncImageGroups(container, rows, t, imageReferences, sessionCwd)
  } else if (syncImageLabels) syncImageLabelsIn(container, t)
  for (const member of container.querySelectorAll<HTMLElement>(`.${MEMBER_CLASS}`)) {
    if (!liveMembers.has(member)) clearMemberPresentation(member)
  }
}

/** 将当前 React 快照同步到页面中的每个可见 Chat Flow。 */
function sync(
  groups: readonly ActivityGroup[],
  t: ActivityTranslate,
  syncImages: boolean,
  syncImageLabels: boolean,
  chat: Readonly<{ nodes: ChatNodeStore }>,
  sessionCwd: string | undefined,
): void {
  // 页面可以同时保留多个会话流；每个流按自己的可见行独立同步。
  for (const container of document.querySelectorAll<HTMLElement>('[data-chat-flow]')) {
    syncContainer(container, groups, t, syncImages, syncImageLabels, chat, sessionCwd)
  }
}

/** 判断 MutationObserver 节点是否为 Element。 */
function isElement(node: Node): node is Element {
  return node.nodeType === 1
}

/** 判断节点本身或其祖先是否位于 DSH Chat Flow 中。 */
function isInChatFlow(node: Node): boolean {
  const element = isElement(node) ? node : node.parentElement
  return element !== null && element !== undefined && element.closest('[data-chat-flow]') !== null
}

/** 判断节点的新增或移除子树中是否包含 Chat Flow。 */
function containsChatFlow(node: Node): boolean {
  return isElement(node) && (node.matches('[data-chat-flow]') || node.querySelector('[data-chat-flow]') !== null)
}

/** 判断节点本身或其子树中是否包含需要折叠的图片显示。 */
function containsImageDisplay(node: Node): boolean {
  if (!isElement(node)) return false
  return node.matches(`[${IMAGE_MARKER_ATTRIBUTE}]`)
    || node.matches(IMAGE_BUTTON_SELECTOR)
    || node.matches(MARKDOWN_IMAGE_SELECTOR)
    || isMarkdownImageFallback(node)
    || node.querySelector(IMAGE_BUTTON_SELECTOR) !== null
    || node.querySelector(MARKDOWN_IMAGE_SELECTOR) !== null
    || [...node.querySelectorAll('span')].some(isMarkdownImageFallback)
}

/** 判断 MutationObserver 记录是否需要重新扫描图片目标。 */
function affectsImages(records: readonly MutationRecord[]): boolean {
  return records.some(record => {
    if (record.type === 'childList') {
      // 标记自身拥有 summary 和标题子树。这些子树的内部更新不属于图片显示
      // 变化；只有标记本身的挂载或移除才需要重新扫描图片。
      if (isElement(record.target) && record.target.matches(`[${IMAGE_MARKER_ATTRIBUTE}]`)) return false
      return [...record.addedNodes, ...record.removedNodes].some(containsImageDisplay)
    }
    return record.type === 'attributes'
      && record.attributeName !== null
      && IMAGE_RELEVANT_ATTRIBUTES.has(record.attributeName)
  })
}

/**
 * React 快照决定分组；观察器仅补获流式内容、官方状态和新挂载流程的 DOM 更新，
 * 避免页面其他区域变动触发整轮同步。
 */
function affectsChatFlow(records: readonly MutationRecord[]): boolean {
  return records.some(record => isInChatFlow(record.target)
    || (record.type === 'childList'
      && [...record.addedNodes, ...record.removedNodes].some(containsChatFlow)))
}

/** 清理插件写入的过程、图片、隐藏和过渡状态。 */
function cleanup(): void {
  for (const row of document.querySelectorAll<HTMLElement>(`.${CHILD_CLASS}`)) row.classList.remove(CHILD_CLASS)
  for (const row of document.querySelectorAll<HTMLElement>(`.${ROW_CLASS}`)) row.classList.remove(ROW_CLASS)
  for (const reasoning of document.querySelectorAll<HTMLElement>(`.${REASONING_CHILD_CLASS}`)) {
    reasoning.classList.remove(REASONING_CHILD_CLASS)
  }
  for (const body of document.querySelectorAll<HTMLElement>(`.${INLINE_BODY_CLASS}`)) {
    body.classList.remove(INLINE_BODY_CLASS)
  }
  for (const element of document.querySelectorAll<HTMLElement>(`[${PLUGIN_HIDDEN_ATTRIBUTE}]`)) {
    delete element.dataset[PLUGIN_HIDDEN_DATASET]
    delete element.dataset[OFFICIAL_HIDDEN_DATASET]
    if (element.getAttribute('hidden') === '') element.removeAttribute('hidden')
  }
  for (const member of document.querySelectorAll<HTMLElement>(`.${MEMBER_CLASS}`)) {
    clearMemberPresentation(member)
  }
  for (const element of document.querySelectorAll<HTMLElement>(`[${IMAGE_CONTAINER_ATTRIBUTE}]`)) {
    delete element.dataset[IMAGE_CONTAINER_DATASET]
  }
  for (const element of document.querySelectorAll<HTMLElement>(`[${IMAGE_TRANSITION_ATTRIBUTE}]`)) {
    cancelImageTransition(element)
  }
  for (const details of document.querySelectorAll<HTMLElement>('.dca-image-details')) {
    cancelImageCaptionTransition(details)
    details.remove()
  }
  for (const target of document.querySelectorAll<HTMLElement>(`[${IMAGE_TARGET_ATTRIBUTE}]`)) {
    setImageHidden(target, false)
    delete target.dataset['dcaImageTarget']
  }
  for (const image of document.querySelectorAll<HTMLImageElement>(`img[${IMAGE_REPAIR_ATTRIBUTE}]`)) {
    if (image.classList.contains('dca-markdown-image-repair')) image.remove()
    else {
      const original = image.dataset[IMAGE_REPAIR_ORIGINAL_SOURCE_DATASET]
      if (original !== undefined) image.setAttribute('src', original)
    }
    delete image.dataset[IMAGE_REPAIR_DATASET]
    delete image.dataset[IMAGE_REPAIR_SOURCE_DATASET]
    delete image.dataset[IMAGE_REPAIR_ORIGINAL_SOURCE_DATASET]
  }
  for (const fallback of document.querySelectorAll<HTMLElement>(`[${IMAGE_REPAIR_FALLBACK_ATTRIBUTE}]`)) {
    setImageHidden(fallback, false)
    delete fallback.dataset[IMAGE_REPAIR_FALLBACK_DATASET]
    delete fallback.dataset[IMAGE_REPAIR_SOURCE_DATASET]
    delete fallback.dataset[IMAGE_REPAIR_FAILED_DATASET]
  }
  for (const marker of document.querySelectorAll<HTMLElement>(`[${MARKER_ATTRIBUTE}]`)) marker.remove()
  for (const marker of document.querySelectorAll<HTMLDetailsElement>(`[${IMAGE_MARKER_ATTRIBUTE}]`)) removeImageMarker(marker)
}

/**
 * 只向 DOM 添加总折叠和图片折叠标记。官方 DSH 内容仍是实际内容，展开后的子项继续使用
 * 官方渲染器、样式及交互。
 */
export function CompactActivityController(props: ControllerProps): null {
  const { sessionId, useChat, useSessions, t } = props
  const chat = useChat(snapshot => snapshot)
  const sessionCwd = useSessions(snapshot => snapshot.byId[sessionId]?.cwd)
  const groups = activityGroups(chat.order, chat.nodes)
  const groupsRef = useRef<readonly ActivityGroup[]>(groups)
  const chatRef = useRef(chat)
  const sessionCwdRef = useRef<string | undefined>(sessionCwd)
  const tRef = useRef(t)
  const imageLocaleSignature = `${t('count.image', { count: 1 })}\u0000${t('count.images', { count: 2 })}`
  const imageLocaleRef = useRef(imageLocaleSignature)
  const imageLocaleChanged = imageLocaleRef.current !== imageLocaleSignature
  groupsRef.current = groups
  chatRef.current = chat
  sessionCwdRef.current = sessionCwd
  tRef.current = t
  imageLocaleRef.current = imageLocaleSignature
  const scheduleRef = useRef<((imagesDirty?: boolean, imageLabelsDirty?: boolean) => void) | undefined>(undefined)
  const imageDirtyRef = useRef(true)
  const imageLabelsDirtyRef = useRef(true)

  useEffect(() => {
    const schedule = scheduleRef.current
    if (schedule === undefined) {
      sync(groupsRef.current, tRef.current, true, true, chat, sessionCwd)
      imageDirtyRef.current = false
      imageLabelsDirtyRef.current = false
    } else schedule(false, imageLocaleChanged)
  }, [chat, groups, imageLocaleChanged, sessionCwd, t])

  useEffect(() => {
    let queued = false
    let active = true
    let frame: number | undefined
    const flush = (): void => {
      queued = false
      frame = undefined
      const syncImages = imageDirtyRef.current
      const syncImageLabels = imageLabelsDirtyRef.current
      imageDirtyRef.current = false
      imageLabelsDirtyRef.current = false
      if (active) sync(groupsRef.current, tRef.current, syncImages, syncImageLabels, chatRef.current, sessionCwdRef.current)
    }
    const schedule = (imagesDirty = false, imageLabelsDirty = false): void => {
      if (imagesDirty) imageDirtyRef.current = true
      if (imageLabelsDirty) imageLabelsDirtyRef.current = true
      if (queued) return
      queued = true
      // 同一帧的流式 DOM 变更合并处理，并经由 ref 读取最新 React 快照和本地化函数。
      if (typeof globalThis.requestAnimationFrame === 'function') frame = globalThis.requestAnimationFrame(flush)
      else queueMicrotask(flush)
    }
    scheduleRef.current = schedule
    // 预留：DSH 当前只通过稳定 DOM 标记暴露跨行分组能力；若官方增加过程组
    // slot，应删除此观察器并直接接入该 slot。
    const observer = new MutationObserver(records => {
      if (affectsChatFlow(records)) schedule(affectsImages(records))
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'aria-expanded',
        'data-expanded',
        'data-open',
        'data-align',
        'data-chat-flow-kind',
        'data-message-attachments',
        'data-state',
        'data-turn-process-hidden',
        'data-variant',
        'decoding',
        'hidden',
        'loading',
        'referrerpolicy',
      ],
    })
    return () => {
      active = false
      observer.disconnect()
      if (scheduleRef.current === schedule) scheduleRef.current = undefined
      if (frame !== undefined && typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(frame)
      }
    }
  }, [])

  useEffect(() => cleanup, [])
  return null
}
