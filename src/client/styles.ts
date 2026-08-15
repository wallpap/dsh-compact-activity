export const STYLE_ID = 'dsh-compact-activity'

/** 仅定义 Codex 风格的总折叠；展开后的 DSH 官方过程行沿用原样式。 */
export const STYLE_TEXT = String.raw`
.dca-activity-child,
.dca-activity-reasoning-child {
  display: none !important;
}

.dca-activity-group {
  min-width: 0;
  color: var(--dsw-alias-label-secondary);
}

.dca-activity-summary {
  position: relative;
  display: flex;
  min-width: 0;
  height: 28px;
  align-items: center;
  overflow: hidden;
  list-style: none;
  border-radius: 7px;
  cursor: pointer;
  user-select: none;
}

.dca-activity-summary::-webkit-details-marker {
  display: none;
}

.dca-activity-summary:hover,
.dca-activity-summary:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover);
  outline: none;
}

.dca-activity-group[data-running='true'] > summary::after {
  content: '';
  position: absolute;
  inset-block: 0;
  left: -220px;
  width: 220px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--dsw-alias-bg-base) 62%, transparent) 55%,
    transparent 100%
  );
  animation: dca-sweep 2.6s ease-out infinite;
  pointer-events: none;
}

@keyframes dca-sweep {
  0% { left: -220px; }
  90%, 100% { left: 100%; }
}

.dca-marker {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: 24px;
  flex: 0 0 24px;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-primary);
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  transition: transform 120ms ease;
}

.dca-activity-group[open] .dca-marker {
  transform: rotate(90deg);
}

.dca-label {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 24px;
  white-space: nowrap;
}

.dca-separator {
  position: relative;
  z-index: 1;
  width: 2px;
  height: 2px;
  flex: 0 0 2px;
  margin: 0 8px;
  border-radius: 50%;
  background: var(--dsw-alias-label-caption);
}

.dca-summary {
  position: relative;
  z-index: 1;
  min-width: 0;
  overflow: hidden;
  flex: 1 1 auto;
  color: var(--dsw-alias-label-tertiary);
  font-size: 14px;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dca-count {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  color: var(--dsw-alias-label-tertiary);
  font-size: 14px;
  line-height: 24px;
  white-space: nowrap;
}

.dca-activity-group[data-error='true'] .dca-label,
.dca-activity-group[data-error='true'] .dca-count,
.dca-activity-group[data-error='true'] .dca-summary {
  color: var(--dsw-alias-state-error-primary);
}

@media (prefers-reduced-motion: reduce) {
  .dca-activity-group[data-running='true'] > summary::after {
    animation: none;
  }

  .dca-marker {
    transition: none;
  }
}
`
