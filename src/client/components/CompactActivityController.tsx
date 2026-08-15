import { useEffect, useRef } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { activityGroups, type ActivityGroup } from '../activity-group.ts'

type ControllerProps = PropsRuntime<'conversation.session.header.actions'>

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
function officialToolSummary(rows: ReadonlyMap<string, HTMLElement>, group: ActivityGroup): string {
  const row = rows.get(group.latestKey)
  const tools = row === undefined ? [] : [...row.querySelectorAll<HTMLElement>('[data-tool]')]
  const disclosure = tools.at(-1)?.querySelector<HTMLElement>('[data-disclosure-row]')
  if (disclosure === null || disclosure === undefined) return '工具执行中'
  const parts = [...disclosure.children]
    .slice(1)
    .map(child => oneLine(child.textContent))
    .filter(Boolean)
  const [title, ...summary] = parts
  if (title === undefined) return '工具执行中'
  return summary.length === 0 ? title : `${title} · ${summary.join(' ')}`
}

function liveSummary(rows: ReadonlyMap<string, HTMLElement>, group: ActivityGroup): string {
  if (!group.running) return ''
  return group.latestKind === 'reasoning' ? '正在思考' : officialToolSummary(rows, group)
}

function setMarkerText(marker: HTMLDetailsElement, group: ActivityGroup, summaryText: string): void {
  const labelText = group.running ? '进行中...' : '已完成'
  const signature = JSON.stringify([labelText, group.count, summaryText, group.running, group.error])
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
  if (group.running) {
    label.setAttribute('role', 'status')
    label.setAttribute('aria-live', 'polite')
  }

  const countSeparator = document.createElement('span')
  countSeparator.className = 'dca-separator'
  countSeparator.setAttribute('aria-hidden', 'true')

  const count = document.createElement('span')
  count.className = 'dca-count'
  count.textContent = group.count

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

function syncContainer(container: HTMLElement, groups: readonly ActivityGroup[]): void {
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
    setMarkerText(marker, group, liveSummary(rows, group))
    setGroupOpen(rows, group, marker.open)
  }
}

function sync(groups: readonly ActivityGroup[]): void {
  for (const container of document.querySelectorAll<HTMLElement>('[data-chat-flow]')) {
    syncContainer(container, groups)
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
export function CompactActivityController({ useSession }: ControllerProps): null {
  const chat = useSession(snapshot => snapshot.chat)
  const groups = activityGroups(chat.order, chat.nodes)
  const groupsRef = useRef<readonly ActivityGroup[]>(groups)
  groupsRef.current = groups
  const syncRef = useRef<() => void>(() => {})

  useEffect(() => {
    syncRef.current = () => { sync(groupsRef.current) }
    syncRef.current()
  }, [groups])

  useEffect(() => {
    let queued = false
    const schedule = (): void => {
      if (queued) return
      queued = true
      queueMicrotask(() => {
        queued = false
        syncRef.current()
      })
    }
    // ponytail: DSH 当前只通过稳定 DOM 标记暴露跨行分组能力；若官方增加过程组
    // slot，应删除此观察器并直接接入该 slot。
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    schedule()
    return () => { observer.disconnect() }
  }, [])

  useEffect(() => cleanup, [])
  return null
}
