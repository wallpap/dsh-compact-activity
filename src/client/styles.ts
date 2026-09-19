/** 注入宿主页面的样式元素标识。 */
export const STYLE_ID = 'dsh-compact-activity'

/**
 * 仅定义插件添加的总折叠、图片折叠和成员标记；展开后的 DSH 官方内容沿用原样式。
 * hidden 属性负责布局可见性；class 仅保留为插件成员的展示标记。
 */
export const STYLE_TEXT = String.raw`
.dca-activity-child,
.dca-activity-reasoning-child {
  display: none !important;
}

/* hidden=until-found 会保留布局盒。该标记由插件所有，因此插件可以移除
   布局盒，而不接管宿主的 hidden 属性。 */
[data-dca-hidden] {
  display: none !important;
}

/* 图片折叠只管理这一对标记和目标。宿主图片子树保持原位，使加载器和
   灯箱交互继续由 DSH 控制。 */
[data-dca-image-hidden],
[data-dca-image-caption-hidden] {
  display: none !important;
}

/* 图片目标保留在宿主 DOM 中。用户触发切换时，控制器会等离场过渡结束后
   再设置 hidden=display:none。 */
[data-dca-image-transition] {
  pointer-events: none;
  transition:
    opacity 160ms ease,
    transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

[data-dca-image-transition='enter'],
[data-dca-image-transition='leave'] {
  opacity: 0;
  transform: translateY(-4px) scale(0.985);
}

/* 标题是插件所有的兄弟节点，放在宿主图片目标之后，使其与图片在同一阶段
   离开布局，而不是提前离开。 */
[data-dca-image-caption-transition] {
  pointer-events: none;
  transition:
    opacity 160ms ease,
    transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

[data-dca-image-caption-transition='enter'],
[data-dca-image-caption-transition='leave'] {
  opacity: 0;
  transform: translateY(-4px) scale(0.985);
}

.dca-markdown-image-repair {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.dca-image-group {
  --dca-state-accent: #39c5bb;
  --dca-state-ink: color-mix(
    in srgb,
    var(--dca-state-accent) 56%,
    var(--dsw-alias-label-primary)
  );
  display: block;
  min-width: 0;
  margin: 8px 0;
  color: var(--dsw-alias-label-secondary);
}

.dca-image-group-inline {
  /* 保持折叠标记紧凑，避免标题在折叠状态下与标记并排布局。 */
  display: inline-block;
  max-width: 100%;
  margin: 0;
  vertical-align: top;
}

/* Markdown 会将独立图片渲染在段落中，并应用宿主的 16px 间距。
   只有图片的段落改用插件的 8px 间距；包含正文的段落保留宿主间距。 */
[data-dca-image-container] {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

[data-dca-image-container] + [data-dca-image-container] {
  margin-top: 8px !important;
}

[data-dca-image-container] > .dca-image-group-inline {
  display: block;
  width: max-content;
}

[data-dca-image-container] > .dca-image-group-inline[open] {
  width: 100%;
}

[data-dca-image-container] > .dca-image-details {
  box-sizing: border-box;
  width: 100%;
  margin-left: 0;
  padding-right: 0;
  padding-left: 0;
}

.dca-image-group-inline[open] {
  margin-bottom: 8px;
}

.dca-image-summary {
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
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  user-select: none;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.dca-image-group-inline .dca-image-summary {
  display: inline-flex;
  max-width: 100%;
}

.dca-image-summary::-webkit-details-marker {
  display: none;
}

.dca-image-summary:hover,
.dca-image-group[open] > .dca-image-summary {
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

.dca-image-summary:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--dca-state-accent) 42%, transparent);
  outline-offset: 2px;
}

.dca-image-label {
  min-width: 0;
  overflow: hidden;
  flex: 1 1 auto;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dca-image-details {
  min-width: 0;
  margin: 6px 0 0 10px;
  padding: 0 6px 4px 14px;
}

.dca-image-caption {
  overflow-wrap: anywhere;
  color: var(--dsw-alias-label-secondary);
  text-align: center;
  font-size: 13px;
  font-style: italic;
  font-weight: 700;
  line-height: 20px;
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

/* 插件过程流比宿主的 16px 对话间距更紧凑。标记、第一条过程行、连续过程行
   以及隐藏组之后的第一条外部行统一使用 8px 间距。 */
.dca-activity-group[data-dca-spaced],
.dca-activity-group + .dca-activity-row,
.dca-activity-row + .dca-activity-row,
.dca-activity-after {
  margin-top: 8px !important;
}

/* DSH 会对内联 Think 块使用 hidden=until-found。该状态会保留布局盒；
   总折叠关闭时不能继续占用这个布局盒。 */
.dca-activity-group:not([open]) ~ .dca-activity-row [data-turn-process-inline][hidden] {
  display: none !important;
}

/* 混合官方 assistant 行会在此 body 中并列放置 Think 和正文。
   该边界与折叠过程行保持相同的 8px 间距。 */
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

.dca-marker,
.dca-image-marker-icon {
  display: block;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  color: var(--dsw-alias-label-secondary);
  transition: transform 140ms ease;
}

.dca-activity-group[open] .dca-marker,
.dca-image-group[open] .dca-image-marker-icon {
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

/* DSH 的折叠过程根节点保持固定的 24px 宿主高度。卡片上下各增加 4px
   内边距，因此需要预留完整的 32px 盒子，确保官方 24px 折叠行保持居中，
   不会溢出卡片底部。由于同一根节点的 24px 高度由 DSH 控制，这里使用
   min-height。插件自有标记可避免依赖 CSS Module 的类名。 */
.dca-activity-member[data-dca-member-collapsed] {
  min-height: calc(32px + var(--dsh-content-font-delta, 0px)) !important;
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
  .dca-marker,
  .dca-image-summary,
  .dca-image-marker-icon,
  [data-dca-image-transition],
  [data-dca-image-caption-transition] {
    transition: none;
  }

  [data-dca-image-transition='enter'],
  [data-dca-image-transition='leave'],
  [data-dca-image-caption-transition='enter'],
  [data-dca-image-caption-transition='leave'] {
    opacity: 1;
    transform: none;
  }
}
`
