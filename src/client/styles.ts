export const STYLE_ID = 'dsh-compact-activity'

/**
 * 仅定义插件添加的总折叠和成员标记；展开后的 DSH 官方过程行沿用原样式。
 * hidden 属性负责布局可见性；class 仅保留为插件成员的展示标记。
 */
export const STYLE_TEXT = String.raw`
.dca-activity-child,
.dca-activity-reasoning-child {
  display: none !important;
}

/* hidden=until-found intentionally retains a layout box. This marker is
   plugin-owned, so it can remove that box without taking ownership of the
   host's hidden attribute. */
[data-dca-hidden] {
  display: none !important;
}

.dca-activity-group {
  --dca-state-accent: #39c5bb;
  --dca-error-accent: color-mix(
    in srgb,
    var(--dsw-alias-state-error-primary) 60%,
    var(--dsw-alias-label-secondary)
  );
  --dca-state-ink: color-mix(
    in srgb,
    var(--dca-state-accent) 56%,
    var(--dsw-alias-label-primary)
  );
  position: relative;
  min-width: 0;
  color: var(--dsw-alias-label-secondary);
}

/* Keep the plugin flow denser than the host's 16px transcript rhythm. The
   marker, its first row, consecutive process rows, and the first external row
   after a hidden group all use one 8px rhythm. */
.dca-activity-group[data-dca-spaced],
.dca-activity-group + .dca-activity-row,
.dca-activity-row + .dca-activity-row,
.dca-activity-after {
  margin-top: 8px !important;
}

/* DSH uses hidden=until-found for inline Think blocks. That state keeps the
   block's layout box; while our group is closed it must not reserve that box. */
.dca-activity-group:not([open]) ~ .dca-activity-row [data-turn-process-inline][hidden] {
  display: none !important;
}

/* A mixed official assistant row has Think and正文 as siblings in this body.
   Keep that boundary on the same 8px rhythm as the collapsed flow rows. */
.dca-activity-inline-body {
  row-gap: 8px !important;
}

.dca-activity-group[data-running='true'] {
  --dca-state-accent: #8d78d6;
}

.dca-activity-group[data-error='true'] {
  --dca-state-accent: var(--dca-error-accent);
}

.dca-activity-summary {
  position: relative;
  z-index: 1;
  display: flex;
  box-sizing: border-box;
  min-width: 0;
  height: 30px;
  align-items: center;
  overflow: hidden;
  padding-right: 8px;
  list-style: none;
  border: 1px solid color-mix(
    in srgb,
    var(--dca-state-accent) 22%,
    var(--dsw-alias-label-caption)
  );
  border-radius: 9px;
  background: color-mix(
    in srgb,
    var(--dca-state-accent) 4%,
    var(--dsw-alias-interactive-bg-hover)
  );
  cursor: pointer;
  user-select: none;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.dca-activity-summary::-webkit-details-marker {
  display: none;
}

.dca-activity-summary:hover,
.dca-activity-group[open] > .dca-activity-summary {
  border-color: color-mix(
    in srgb,
    var(--dca-state-accent) 34%,
    var(--dsw-alias-label-caption)
  );
  background: color-mix(
    in srgb,
    var(--dca-state-accent) 7%,
    var(--dsw-alias-interactive-bg-hover)
  );
}

.dca-activity-summary:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--dca-state-accent) 42%, transparent);
  outline-offset: 2px;
}

.dca-state-rail {
  position: relative;
  align-self: stretch;
  width: 3px;
  flex: 0 0 3px;
  margin-right: 7px;
  overflow: hidden;
  border-radius: 3px;
  background: color-mix(
    in srgb,
    var(--dca-state-accent) 70%,
    var(--dsw-alias-label-caption)
  );
  opacity: 0.9;
}

.dca-activity-group[data-running='true'] .dca-state-rail::after {
  content: '';
  position: absolute;
  inset: -65% 0 auto;
  height: 65%;
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 72%, transparent);
  animation: dca-rail-run 1.8s ease-in-out infinite;
}

@keyframes dca-rail-run {
  0% { transform: translateY(0); }
  80%, 100% { transform: translateY(255%); }
}

.dca-marker {
  position: relative;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  color: var(--dsw-alias-label-secondary);
  transition: transform 140ms ease;
}

.dca-marker::before,
.dca-marker::after {
  content: '';
  position: absolute;
  left: 6px;
  width: 7px;
  height: 1.5px;
  border-radius: 2px;
  background: currentColor;
  transform-origin: right center;
}

.dca-marker::before {
  top: 6px;
  transform: rotate(45deg);
}

.dca-marker::after {
  top: 11px;
  transform: rotate(-45deg);
}

.dca-activity-group[open] .dca-marker {
  transform: rotate(90deg);
}

.dca-label {
  flex: 0 0 auto;
  color: var(--dca-state-ink);
  font-size: 14px;
  font-weight: 500;
  line-height: 24px;
  white-space: nowrap;
}

.dca-separator {
  width: 3px;
  height: 3px;
  flex: 0 0 3px;
  margin: 0 8px;
  border-radius: 50%;
  background: var(--dsw-alias-label-caption);
}

.dca-summary {
  min-width: 0;
  overflow: hidden;
  flex: 1 1 auto;
  color: var(--dsw-alias-label-secondary);
  font-size: 14px;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dca-count {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 14px;
  line-height: 24px;
  white-space: nowrap;
}

.dca-count-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-variant-numeric: tabular-nums;
}

.dca-count-icon {
  display: block;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
}

.dca-count-item[data-dca-count='failure'] {
  color: var(--dca-error-accent);
}

.dca-activity-group[data-error='true'] .dca-summary {
  color: var(--dca-state-ink);
}

.dca-activity-member {
  --dca-member-accent: #39c5bb;
  --dca-member-spine: color-mix(
    in srgb,
    var(--dsw-alias-label-caption) 54%,
    transparent
  );
  position: relative;
  box-sizing: border-box;
  margin-left: 10px;
  padding: 4px 6px 4px 14px;
  border-radius: 9px;
  background-color: color-mix(
    in srgb,
    var(--dca-member-accent) 7%,
    var(--dsw-alias-interactive-bg-hover)
  );
  transition: background-color 120ms ease;
}

.dca-activity-member[data-dca-member-state='running'] {
  --dca-member-accent: #8d78d6;
}

.dca-activity-member[data-dca-member-state='error'] {
  --dca-member-accent: color-mix(
    in srgb,
    var(--dsw-alias-state-error-primary) 60%,
    var(--dsw-alias-label-secondary)
  );
}

.dca-activity-member:hover {
  background-color: color-mix(
    in srgb,
    var(--dca-member-accent) 10%,
    var(--dsw-alias-interactive-bg-hover)
  );
}

.dca-activity-member::before {
  content: '';
  position: absolute;
  top: -8px;
  bottom: -8px;
  left: 0;
  width: 2px;
  border-radius: 2px;
  background: var(--dca-member-spine);
  pointer-events: none;
}

.dca-activity-member-first::before {
  top: -16px;
}

.dca-activity-member-last::before {
  bottom: 50%;
}

.dca-activity-member::after {
  content: '';
  position: absolute;
  top: calc(50% - 3px);
  left: 0;
  width: 14px;
  height: 6px;
  background:
    linear-gradient(to right, var(--dca-member-accent), var(--dca-member-accent)) left center / 10px 2px no-repeat,
    radial-gradient(circle at right center, var(--dca-member-accent) 0 2.5px, transparent 3px);
  opacity: 0.78;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .dca-activity-group[data-running='true'] .dca-state-rail::after {
    animation: none;
  }

  .dca-activity-summary,
  .dca-activity-member,
  .dca-marker {
    transition: none;
  }
}
`
