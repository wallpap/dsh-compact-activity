import { useEffect, useRef } from 'react'
import type { PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import {
  activityGroups, type ActivityGroup, type ActivityMemberState,
} from '../activity-group.ts'
import { ACTIVITY_NS } from '../locales.ts'

type ActivityTranslate = TranslateNS<typeof ACTIVITY_NS>
type ControllerProps = PropsRuntime<'conversation.session.header.actions'> & { t: ActivityTranslate }

const MARKER_ATTRIBUTE = 'data-dca-activity-group'
const CHILD_CLASS = 'dca-activity-child'
const REASONING_CHILD_CLASS = 'dca-activity-reasoning-child'
const MEMBER_CLASS = 'dca-activity-member'
const MEMBER_FIRST_CLASS = 'dca-activity-member-first'
const MEMBER_LAST_CLASS = 'dca-activity-member-last'

interface MemberElement {
  readonly element: HTMLElement
  readonly state: ActivityMemberState
}

function resolvedMemberState(element: HTMLElement, state: ActivityMemberState): ActivityMemberState {
  const official = element.dataset['state']
  if (state === 'error' || official === 'error' || official === 'stopped') return 'error'
  if (state === 'running' || official === 'running') return 'running'
  return 'done'
}

function rowsIn(container: HTMLElement): Map<string, HTMLElement> {
  return new Map([...container.querySelectorAll<HTMLElement>('[data-chat-flow-key]')]
    .map(row => [row.dataset['chatFlowKey'] ?? '', row]))
}

function markerIn(container: HTMLElement, firstKey: string): HTMLDetailsElement | null {
  return [...container.querySelectorAll<HTMLDetailsElement>(`details[${MARKER_ATTRIBUTE}]`)]
    .find(marker => marker.dataset['dcaActivityGroup'] === firstKey) ?? null
}

function memberElementsIn(rows: ReadonlyMap<string, HTMLElement>, group: ActivityGroup): MemberElement[] {
  const result: MemberElement[] = []
  for (const key of group.keys) {
    const row = rows.get(key)
    if (row === undefined) continue
    const members = group.members.filter(member => member.rowKey === key)
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

function clearMemberPresentation(element: HTMLElement): void {
  element.classList.remove(MEMBER_CLASS, MEMBER_FIRST_CLASS, MEMBER_LAST_CLASS)
  delete element.dataset['dcaMemberState']
}

function syncGroupMembers(
  rows: ReadonlyMap<string, HTMLElement>,
  group: ActivityGroup,
  liveMembers: Set<HTMLElement>,
): void {
  const members = memberElementsIn(rows, group)
  for (const [index, member] of members.entries()) {
    liveMembers.add(member.element)
    member.element.classList.add(MEMBER_CLASS)
    member.element.classList.toggle(MEMBER_FIRST_CLASS, index === 0)
    member.element.classList.toggle(MEMBER_LAST_CLASS, index === members.length - 1)
    if (member.element.dataset['dcaMemberState'] !== member.state) {
      member.element.dataset['dcaMemberState'] = member.state
    }
  }
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
  reasoning: '<path d="M7.06431 5.93342C7.68763 5.93342 8.19307 6.43904 8.19322 7.06233C8.19322 7.68573 7.68772 8.19123 7.06431 8.19123C6.44099 8.19113 5.9354 7.68567 5.9354 7.06233C5.93555 6.43911 6.44108 5.93353 7.06431 5.93342Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M8.6815 0.963693C10.1169 0.447019 11.6266 0.374829 12.5633 1.31135C13.5 2.24805 13.4277 3.75776 12.911 5.19319C12.7126 5.74431 12.4386 6.31796 12.0965 6.89729C12.4969 7.54638 12.8141 8.19018 13.036 8.80647C13.5527 10.2419 13.6251 11.7516 12.6883 12.6883C11.7516 13.625 10.242 13.5527 8.8065 13.036C8.19022 12.8141 7.54641 12.4969 6.89732 12.0965C6.31797 12.4386 5.74435 12.7125 5.19322 12.911C3.75777 13.4276 2.2481 13.5 1.31138 12.5633C0.374859 11.6266 0.447049 10.1168 0.963724 8.68147C1.17185 8.10338 1.46321 7.50063 1.82896 6.8924C1.52182 6.35711 1.27235 5.82825 1.08872 5.31819C0.572068 3.88278 0.499714 2.37306 1.43638 1.43635C2.37308 0.499655 3.8828 0.572044 5.31822 1.08869C5.82828 1.27232 6.35715 1.5218 6.89243 1.82893C7.50066 1.46318 8.10341 1.17181 8.6815 0.963693ZM11.3573 8.01154C10.9083 8.62253 10.3901 9.22873 9.80943 9.8094C9.22877 10.3901 8.62255 10.9083 8.01158 11.3572C8.4257 11.5841 8.8287 11.7688 9.21275 11.9071C10.5456 12.3868 11.4246 12.2547 11.8397 11.8397C12.2548 11.4246 12.3869 10.5456 11.9071 9.21272C11.7688 8.82866 11.5841 8.42568 11.3573 8.01154ZM2.56529 8.02912C2.37344 8.39322 2.21495 8.74796 2.09263 9.08772C1.61291 10.4204 1.74512 11.2995 2.16001 11.7147C2.57505 12.1297 3.45415 12.2618 4.78697 11.7821C5.11057 11.6656 5.44786 11.5164 5.7938 11.3367C5.249 10.9223 4.70922 10.4533 4.19029 9.9344C3.57578 9.31987 3.03169 8.67633 2.56529 8.02912ZM6.90708 3.2469C6.24065 3.70479 5.5646 4.26321 4.91392 4.91389C4.26325 5.56456 3.70482 6.24063 3.24693 6.90705C3.72674 7.63325 4.32777 8.37459 5.03892 9.08576C5.64943 9.69627 6.28183 10.2265 6.90806 10.6678C7.59368 10.2025 8.2908 9.63076 8.96079 8.96076C9.6308 8.29075 10.2025 7.59366 10.6678 6.90803C10.2265 6.2818 9.69631 5.6494 9.08579 5.03889C8.37462 4.32773 7.63328 3.72672 6.90708 3.2469ZM11.7147 2.15998C11.2996 1.74509 10.4204 1.61288 9.08775 2.0926C8.74835 2.21479 8.39382 2.37271 8.03013 2.56428C8.67728 3.03065 9.31995 3.5758 9.93443 4.19026C10.4534 4.7092 10.9223 5.24896 11.3368 5.79377C11.5164 5.44785 11.6656 5.11052 11.7821 4.78694C12.2618 3.45416 12.1297 2.57502 11.7147 2.15998ZM4.91197 2.2176C3.57922 1.73788 2.70004 1.86995 2.28501 2.28498C1.87001 2.70003 1.73791 3.5792 2.21763 4.91194C2.31709 5.18822 2.44112 5.47427 2.58677 5.7674C3.01931 5.1887 3.51474 4.6158 4.06529 4.06526C4.61584 3.5147 5.18872 3.01928 5.76743 2.58674C5.47431 2.4411 5.18824 2.31706 4.91197 2.2176Z"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94L14.7 6.3Z"/>',
  failure: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
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

  const stateRail = document.createElement('span')
  stateRail.className = 'dca-state-rail'
  stateRail.setAttribute('aria-hidden', 'true')

  const arrow = document.createElement('span')
  arrow.className = 'dca-marker'
  arrow.setAttribute('aria-hidden', 'true')

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

function syncContainer(container: HTMLElement, groups: readonly ActivityGroup[], t: ActivityTranslate): void {
  const rows = rowsIn(container)
  const visibleGroups = groups.filter(group => group.keys.every(key => rows.has(key)))
  const liveMarkers = new Set(visibleGroups.map(group => group.firstKey))
  const liveMembers = new Set<HTMLElement>()

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
    syncGroupMembers(rows, group, liveMembers)
    setGroupOpen(rows, group, marker.open)
  }
  for (const member of container.querySelectorAll<HTMLElement>(`.${MEMBER_CLASS}`)) {
    if (!liveMembers.has(member)) clearMemberPresentation(member)
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
  for (const member of document.querySelectorAll<HTMLElement>(`.${MEMBER_CLASS}`)) {
    clearMemberPresentation(member)
  }
  for (const marker of document.querySelectorAll<HTMLElement>(`[${MARKER_ATTRIBUTE}]`)) marker.remove()
}

/**
 * 只向 DOM 添加总折叠。官方 DSH 过程行仍是实际内容，展开后的子项继续使用
 * 官方渲染器、样式及交互。
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
