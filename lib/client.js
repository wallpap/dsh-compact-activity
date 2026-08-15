window.__ModuleLoader__.load({
	id: "dsh-compact-activity",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region src/client/activity-group.ts
		function nodeAt(store, key) {
			return store.get(key);
		}
		function reasoningBlocks(blocks) {
			return blocks.filter((block) => block.kind === "reasoning" && block.text.trim() !== "");
		}
		/** 含可见正文的 assistant 消息是过程列表边界。 */
		function hasAssistantOutput(blocks) {
			return blocks.some((block) => block.kind === "text" ? block.text.trim() !== "" : block.kind === "image" || block.kind === "other");
		}
		/** 纯思考消息才是完整过程行；含正文的混合消息保留官方整行渲染。 */
		function isActivityNode(node) {
			if (node?.kind === "tool-call") return true;
			return node?.kind === "assistant-step" && reasoningBlocks(node.data.blocks).length > 0 && !hasAssistantOutput(node.data.blocks);
		}
		function reasoningEntries(node) {
			const blocks = reasoningBlocks(node.data.blocks);
			const last = blocks.at(-1);
			return blocks.map((block) => ({
				rowKey: node.key,
				running: node.data.status === "running" && block === last && node.data.blocks.at(-1) === block,
				error: false,
				kind: "reasoning"
			}));
		}
		function toolEntries(block, rowKey) {
			return [{
				rowKey,
				running: !("kind" in block),
				error: "kind" in block && block.isError === true,
				kind: "tool"
			}, ...block.subCalls.flatMap((child) => toolEntries(child, rowKey))];
		}
		function countSummary(entries) {
			const reasoning = entries.filter((entry) => entry.kind === "reasoning").length;
			const tools = entries.length - reasoning;
			return [reasoning > 0 ? `${reasoning} 段思考` : "", tools > 0 ? `${tools} 次工具调用` : ""].filter(Boolean).join(" · ");
		}
		function groupFrom(order, store, start, end, partialKey) {
			const keys = [...order.slice(start, end), ...partialKey === void 0 ? [] : [partialKey]];
			const entries = keys.flatMap((key) => {
				const node = nodeAt(store, key);
				if (node?.kind === "tool-call") return toolEntries(node.data.root, node.key);
				return node?.kind === "assistant-step" ? reasoningEntries(node) : [];
			});
			const running = entries.findLast((entry) => entry.running);
			const latest = running ?? entries.at(-1);
			if (latest === void 0) throw new Error("activity group requires at least one activity entry");
			return {
				firstKey: keys[0] ?? "",
				keys,
				...partialKey === void 0 ? {} : { partialKey },
				latestKey: latest.rowKey,
				latestKind: latest.kind,
				count: countSummary(entries),
				running: running !== void 0,
				error: running === void 0 && latest.error
			};
		}
		/** 只为至少包含两个过程项的连续列表创建总折叠。 */
		function activityGroups(order, store) {
			const groups = [];
			let index = 0;
			while (index < order.length) {
				if (!isActivityNode(nodeAt(store, order[index] ?? ""))) {
					index++;
					continue;
				}
				const start = index;
				while (index < order.length && isActivityNode(nodeAt(store, order[index] ?? ""))) index++;
				const boundary = nodeAt(store, order[index] ?? "");
				const partialNode = boundary?.kind === "assistant-step" && hasAssistantOutput(boundary.data.blocks) && reasoningBlocks(boundary.data.blocks).length > 0 ? boundary : void 0;
				const partialKey = partialNode?.key;
				if (index - start + (partialNode === void 0 ? 0 : reasoningBlocks(partialNode.data.blocks).length) >= 2) groups.push(groupFrom(order, store, start, index, partialKey));
				if (partialKey !== void 0) index++;
			}
			return groups;
		}
		//#endregion
		//#region src/client/components/CompactActivityController.tsx
		const MARKER_ATTRIBUTE = "data-dca-activity-group";
		const CHILD_CLASS = "dca-activity-child";
		const REASONING_CHILD_CLASS = "dca-activity-reasoning-child";
		function rowsIn(container) {
			return new Map([...container.querySelectorAll("[data-chat-flow-key]")].map((row) => [row.dataset["chatFlowKey"] ?? "", row]));
		}
		function markerIn(container, firstKey) {
			return [...container.querySelectorAll(`details[${MARKER_ATTRIBUTE}]`)].find((marker) => marker.dataset["dcaActivityGroup"] === firstKey) ?? null;
		}
		function setGroupOpen(rows, group, open) {
			for (const key of group.keys) {
				const row = rows.get(key);
				if (row === void 0) continue;
				if (key === group.partialKey) for (const reasoning of row.querySelectorAll("[data-variant=\"think\"]")) reasoning.classList.toggle(REASONING_CHILD_CLASS, !open);
				else row.classList.toggle(CHILD_CLASS, !open);
			}
		}
		function oneLine(value) {
			return (value ?? "").replace(/\s+/g, " ").trim();
		}
		/** 按可视顺序读取官方 DisclosureRow 的类型和折叠摘要。 */
		function officialToolSummary(rows, group) {
			const row = rows.get(group.latestKey);
			const tools = row === void 0 ? [] : [...row.querySelectorAll("[data-tool]")];
			const disclosure = (tools.findLast((item) => item.dataset["state"] === "running") ?? tools.at(-1))?.querySelector("[data-disclosure-row]");
			if (disclosure === null || disclosure === void 0) return "工具执行中";
			const [title, ...summary] = [...disclosure.children].slice(1).map((child) => oneLine(child.textContent)).filter(Boolean);
			if (title === void 0) return "工具执行中";
			return summary.length === 0 ? title : `${title} · ${summary.join(" ")}`;
		}
		function liveSummary(rows, group) {
			if (!group.running) return "";
			return group.latestKind === "reasoning" ? "正在思考" : officialToolSummary(rows, group);
		}
		function setMarkerText(marker, group, summaryText) {
			const labelText = group.running ? "进行中..." : "已完成";
			const signature = JSON.stringify([
				labelText,
				group.count,
				summaryText,
				group.running,
				group.error
			]);
			if (marker.dataset["signature"] === signature) return;
			marker.dataset["signature"] = signature;
			marker.dataset["running"] = String(group.running);
			marker.dataset["error"] = String(group.error);
			marker.replaceChildren();
			const summary = document.createElement("summary");
			summary.className = "dca-activity-summary";
			summary.title = summaryText;
			const arrow = document.createElement("span");
			arrow.className = "dca-marker";
			arrow.setAttribute("aria-hidden", "true");
			arrow.textContent = ">";
			const label = document.createElement("span");
			label.className = "dca-label";
			label.textContent = labelText;
			if (group.running) {
				label.setAttribute("role", "status");
				label.setAttribute("aria-live", "polite");
			}
			const countSeparator = document.createElement("span");
			countSeparator.className = "dca-separator";
			countSeparator.setAttribute("aria-hidden", "true");
			const count = document.createElement("span");
			count.className = "dca-count";
			count.textContent = group.count;
			summary.append(arrow, label, countSeparator, count);
			if (summaryText !== "") {
				const separator = document.createElement("span");
				separator.className = "dca-separator";
				separator.setAttribute("aria-hidden", "true");
				const details = document.createElement("span");
				details.className = "dca-summary";
				details.textContent = summaryText;
				summary.append(separator, details);
			}
			marker.append(summary);
		}
		function syncContainer(container, groups) {
			const rows = rowsIn(container);
			const visibleGroups = groups.filter((group) => group.keys.every((key) => rows.has(key)));
			const liveMarkers = new Set(visibleGroups.map((group) => group.firstKey));
			for (const row of rows.values()) {
				row.classList.remove(CHILD_CLASS);
				for (const reasoning of row.querySelectorAll(`.${REASONING_CHILD_CLASS}`)) reasoning.classList.remove(REASONING_CHILD_CLASS);
			}
			for (const marker of [...container.querySelectorAll(`details[${MARKER_ATTRIBUTE}]`)]) if (!liveMarkers.has(marker.dataset["dcaActivityGroup"] ?? "")) marker.remove();
			for (const group of visibleGroups) {
				const first = rows.get(group.firstKey);
				if (first === void 0) continue;
				let marker = markerIn(container, group.firstKey);
				if (marker === null) {
					marker = document.createElement("details");
					marker.className = "dca-activity-group";
					marker.dataset["dcaActivityGroup"] = group.firstKey;
					first.before(marker);
				} else if (marker.nextElementSibling !== first) first.before(marker);
				marker.ontoggle = () => {
					setGroupOpen(rowsIn(container), group, marker.open);
				};
				setMarkerText(marker, group, liveSummary(rows, group));
				setGroupOpen(rows, group, marker.open);
			}
		}
		function sync(groups) {
			for (const container of document.querySelectorAll("[data-chat-flow]")) syncContainer(container, groups);
		}
		function cleanup() {
			for (const row of document.querySelectorAll(`.${CHILD_CLASS}`)) row.classList.remove(CHILD_CLASS);
			for (const reasoning of document.querySelectorAll(`.${REASONING_CHILD_CLASS}`)) reasoning.classList.remove(REASONING_CHILD_CLASS);
			for (const marker of document.querySelectorAll(`[${MARKER_ATTRIBUTE}]`)) marker.remove();
		}
		/**
		* 只向 DOM 添加总折叠。官方 DSH 过程行仍是实际内容，因此单条消息和展开后的
		* 子项继续使用官方渲染器、样式及交互。
		*/
		function CompactActivityController({ useSession }) {
			const chat = useSession((snapshot) => snapshot.chat);
			const groups = activityGroups(chat.order, chat.nodes);
			const groupsRef = (0, react.useRef)(groups);
			groupsRef.current = groups;
			const syncRef = (0, react.useRef)(() => {});
			(0, react.useEffect)(() => {
				syncRef.current = () => {
					sync(groupsRef.current);
				};
				syncRef.current();
			}, [groups]);
			(0, react.useEffect)(() => {
				let queued = false;
				const schedule = () => {
					if (queued) return;
					queued = true;
					queueMicrotask(() => {
						queued = false;
						syncRef.current();
					});
				};
				const observer = new MutationObserver(schedule);
				observer.observe(document.body, {
					childList: true,
					subtree: true,
					characterData: true
				});
				schedule();
				return () => {
					observer.disconnect();
				};
			}, []);
			(0, react.useEffect)(() => cleanup, []);
			return null;
		}
		//#endregion
		//#region src/client/styles.ts
		const STYLE_ID = "dsh-compact-activity";
		/** 仅定义 Codex 风格的总折叠；展开后的 DSH 官方过程行沿用原样式。 */
		const STYLE_TEXT = String.raw`
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
`;
		//#endregion
		//#region src/client/index.ts
		const inject = ["slots"];
		function apply(ctx) {
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset["plugin"] = STYLE_ID;
				style.textContent = STYLE_TEXT;
				document.head.appendChild(style);
				return () => {
					style.remove();
				};
			}, "dsh-compact-activity: styles");
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "dsh-compact-activity-controller",
				order: -100
			}, CompactActivityController));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map