import { useEffect, useRef } from 'react'
import type { PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { activityGroups, type ActivityGroup } from '../activity-group.ts'
import { ACTIVITY_NS } from '../locales.ts'

type ActivityTranslate = TranslateNS<typeof ACTIVITY_NS>
type ControllerProps = PropsRuntime<'conversation.session.header.actions'> & { t: ActivityTranslate }

const MARKER_ATTRIBUTE = 'data-dca-activity-group'
const CHILD_CLASS = 'dca-activity-child'
const REASONING_CHILD_CLASS = 'dca-activity-reasoning-child'

function rowsIn(container: HTMLElement): Map<string, HTMLElement> {
  return new Map([...container.querySelectorAll<HTMLElement>('[data-chat-flow-key]')]
    .map(row => [row.dataset['chatFlowKey'] ?? '', row]))
}

function markerIn(container: HTMLElement, firstKey: string): HTMLDetailsElement | null {
  return [...container.querySelectorAll<HTMLDetailsElement>(`details[${MARKER_ATTRIBUTE}]`)]
    .find(marker => marker.dataset['dcaActivityGroup'] === firstKey) ?? null
}

function setGroupOpen(rows: ReadonlyMap<string, HTMLElement>, group: ActivityGroup, open: boolean): void {
  for (const key of group.keys) {
    const row = rows.get(key)
    if (row === undefined) continue
    if (key === group.partialKey) {
      for (const reasoning of row.querySelectorAll<HTMLElement>('[data-variant="think"]')) {
        reasoning.classList.toggle(REASONING_CHILD_CLASS, !open)
      }
    } else {
      row.classList.toggle(CHILD_CLASS, !open)
    }
  }
}

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

function liveSummary(rows: ReadonlyMap<string, HTMLElement>, group: ActivityGroup, t: ActivityTranslate): string {
  if (!group.running) return ''
  return group.latestKind === 'reasoning' ? t('status.thinking') : officialToolSummary(rows, group, t)
}

type CountKind = 'reasoning' | 'tool' | 'failure'

interface CountItem {
  readonly kind: CountKind
  readonly count: number
  readonly label: string
}

const COUNT_ICON_MARKUP: Readonly<Record<CountKind, string>> = {
  reasoning: '<path d="M2.2 6.4a4.6 4.6 0 1 1 2.1 3.85L2 11l.75-2.1A4.55 4.55 0 0 1 2.2 6.4Z"/><path d="M4.7 6.5h.01M7 6.5h.01M9.3 6.5h.01"/>',
  tool: '<circle cx="7" cy="7" r="2.1"/><path d="M7 1.5v1.2M7 11.3v1.2M1.5 7h1.2M11.3 7h1.2M3.1 3.1l.85.85M10.05 10.05l.85.85M10.9 3.1l-.85.85M3.95 10.05l-.85.85"/>',
  failure: '<circle cx="7" cy="7" r="5.25"/><path d="M7 4.2v3.4M7 9.8h.01"/>',
}

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

function countIcon(kind: CountKind): SVGSVGElement {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  icon.classList.add('dca-count-icon')
  icon.setAttribute('viewBox', '0 0 14 14')
  icon.setAttribute('fill', 'none')
  icon.setAttribute('stroke', 'currentColor')
  icon.setAttribute('stroke-width', '1.25')
  icon.setAttribute('stroke-linecap', 'round')
  icon.setAttribute('stroke-linejoin', 'round')
  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('focusable', 'false')
  icon.innerHTML = COUNT_ICON_MARKUP[kind]
  return icon
}

function setMarkerText(
  marker: HTMLDetailsElement,
  group: ActivityGroup,
  summaryText: string,
  t: ActivityTranslate,
): void {
  const labelText = t(group.running ? 'status.running' : group.error ? 'status.error' : 'status.done')
  const counts = countItems(group, t)
  const signature = JSON.stringify([labelText, counts, summaryText, group.running, group.error])
  if (marker.dataset['signature'] === signature) return
  marker.dataset['signature'] = signature
  marker.dataset['running'] = String(group.running)
  marker.dataset['error'] = String(group.error)
  marker.replaceChildren()

  const summary = document.createElement('summary')
  summary.className = 'dca-activity-summary'
  summary.title = summaryText

  const arrow = document.createElement('span')
  arrow.className = 'dca-marker'
  arrow.setAttribute('aria-hidden', 'true')
  arrow.textContent = '>'

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

  summary.append(arrow, label, countSeparator, count)
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

function syncContainer(container: HTMLElement, groups: readonly ActivityGroup[], t: ActivityTranslate): void {
  const rows = rowsIn(container)
  const visibleGroups = groups.filter(group => group.keys.every(key => rows.has(key)))
  const liveMarkers = new Set(visibleGroups.map(group => group.firstKey))

  for (const row of rows.values()) {
    row.classList.remove(CHILD_CLASS)
    for (const reasoning of row.querySelectorAll<HTMLElement>(`.${REASONING_CHILD_CLASS}`)) {
      reasoning.classList.remove(REASONING_CHILD_CLASS)
    }
  }
  for (const marker of [...container.querySelectorAll<HTMLDetailsElement>(`details[${MARKER_ATTRIBUTE}]`)]) {
    if (!liveMarkers.has(marker.dataset['dcaActivityGroup'] ?? '')) marker.remove()
  }

  for (const group of visibleGroups) {
    const first = rows.get(group.firstKey)
    if (first === undefined) continue
    let marker = markerIn(container, group.firstKey)
    if (marker === null) {
      marker = document.createElement('details')
      marker.className = 'dca-activity-group'
      marker.dataset['dcaActivityGroup'] = group.firstKey
      first.before(marker)
    } else if (marker.nextElementSibling !== first) {
      first.before(marker)
    }
    marker.ontoggle = () => {
      setGroupOpen(rowsIn(container), group, marker.open)
    }
    setMarkerText(marker, group, liveSummary(rows, group, t), t)
    setGroupOpen(rows, group, marker.open)
  }
}

function sync(groups: readonly ActivityGroup[], t: ActivityTranslate): void {
  for (const container of document.querySelectorAll<HTMLElement>('[data-chat-flow]')) {
    syncContainer(container, groups, t)
  }
}

function cleanup(): void {
  for (const row of document.querySelectorAll<HTMLElement>(`.${CHILD_CLASS}`)) row.classList.remove(CHILD_CLASS)
  for (const reasoning of document.querySelectorAll<HTMLElement>(`.${REASONING_CHILD_CLASS}`)) {
    reasoning.classList.remove(REASONING_CHILD_CLASS)
  }
  for (const marker of document.querySelectorAll<HTMLElement>(`[${MARKER_ATTRIBUTE}]`)) marker.remove()
}

/**
 * 只向 DOM 添加总折叠。官方 DSH 过程行仍是实际内容，因此单条消息和展开后的
 * 子项继续使用官方渲染器、样式及交互。
 */
export function CompactActivityController({ useSession, t }: ControllerProps): null {
  const chat = useSession(snapshot => snapshot.chat)
  const groups = activityGroups(chat.order, chat.nodes)
  const groupsRef = useRef<readonly ActivityGroup[]>(groups)
  groupsRef.current = groups
  const syncRef = useRef<() => void>(() => {})

  useEffect(() => {
    syncRef.current = () => { sync(groupsRef.current, t) }
    syncRef.current()
  }, [groups, t])

  useEffect(() => {
    let queued = false
    let active = true
    const schedule = (): void => {
      if (queued) return
      queued = true
      queueMicrotask(() => {
        queued = false
        if (active) syncRef.current()
      })
    }
    // ponytail: DSH 当前只通过稳定 DOM 标记暴露跨行分组能力；若官方增加过程组
    // slot，应删除此观察器并直接接入该 slot。
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    schedule()
    return () => {
      active = false
      observer.disconnect()
    }
  }, [])

  useEffect(() => cleanup, [])
  return null
}
