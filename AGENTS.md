# 项目级 Agent 指导

## 项目定位

- 本仓库是 `dsh-compact-activity`，用于 DeepSeek Harness（DSH）Web 界面，将连续的思考和工具调用收进一个默认折叠的总过程项。
- 插件只改变界面呈现，不修改模型上下文、会话日志、工具执行或 DSH 官方过程项的语义。
- 目标运行环境是 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)；同时必须兼容 [deepseek-harness-desktop](https://github.com/anywhere-labs/deepseek-harness-desktop) 内置的 DSH。
- 以仓库 `README.md`、`package.json` 和源码中的实际 API 为准；不要凭猜测扩展未公开的 Harness 能力。

## 目录与边界

- `src/index.ts` 是 Host 入口，保持无副作用的 `apply()`；不要在 Host 入口访问 DOM、React 或浏览器全局对象。
- `src/client/index.ts` 是浏览器入口，只通过 DSH 的 `ClientContext`、slot 和 effect 注册插件行为。
- `src/client/activity-group.ts` 负责纯的过程分组、边界判定、状态和计数；可测试逻辑优先放在这里，不把 DOM 细节混入其中。
- `src/client/components/CompactActivityController.tsx` 只负责总折叠控制和 DOM 同步；展开后必须继续使用 DSH 官方 Think、工具组件和交互。
- `src/client/styles.ts` 只提供插件自己的样式。不要覆盖官方过程行的基础样式或复制官方渲染器。
- `cordis.patch.yml` 负责插件声明的安装补丁；保持 `id: ui-compact-activity` 与包名一致。
- `lib/` 是构建产物，不直接手改；由 `npm run build` 或 `npm run check` 生成。

## TypeScript 与依赖

- 使用严格模式 TypeScript。所有源码、测试、脚本和构建配置必须通过根 `tsconfig.json`。
- 必须保持现有严格选项：`strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`useUnknownInCatchVariables`、`noImplicitOverride`、`noFallthroughCasesInSwitch`、`noPropertyAccessFromIndexSignature`、`verbatimModuleSyntax`。
- 使用 ESM、Node 22.19+ 或 24+，遵循现有 `.ts` 扩展名导入风格。
- 优先复用已安装的 DSH 类型和运行时 API；不得为简单逻辑新增依赖、框架、抽象层或兼容分支。
- React、JSX runtime、DSH UI 基础包由宿主提供并在 `tsdown.config.ts` 中保持 external；不要把它们打进客户端 bundle。
- 修改 peer/dev 依赖、Node 版本、构建目标或发布配置前，先说明兼容性影响并取得用户确认。

## DSH 兼容约束

- 只依赖当前 DSH 暴露的稳定扩展点：`conversation.session.header.actions`、`data-chat-flow`、`data-chat-flow-key`、`data-variant="think"`、`data-tool`、`data-state`、`data-disclosure-row`、`assistant-step` 和 `tool-call`。
- 这些 DOM 标记属于宿主兼容面。升级 DSH 或 Desktop 后，必须人工验证总折叠、展开后的官方子项、实时工具摘要和正文边界。
- 不修改模型数据结构，不拦截工具调用，不替换官方渲染器，不依赖 `app.asar` 内部路径或 Desktop 私有文件。
- 本插件是跨环境 Web UI 插件，不执行 profile 切换、插件安装/更新/卸载或依赖修复；不要把 Desktop 专用的 `desktopProfiles`、`desktopPnpm`、`desktopRuntime` 或 Electron IPC 加入必需注入。
- 只有确实执行 Desktop Host 操作的插件才使用 `desktopProfiles.current` 和 `desktopPnpm.runPlugin()`；本项目保持普通 DSH Web Client 路径，不声明 `dsh-plugin-desktop` 运行时依赖。
- 当前没有官方过程分组 slot 时，允许使用已有的 `MutationObserver` 同步 DOM；若未来 DSH 提供正式 slot，应移除观察器并接入官方扩展点。
- 必须保留无障碍基础行为：原生 `<details>/<summary>`、键盘可操作性、`aria-live` 状态提示和 `prefers-reduced-motion` 支持。
- 单条过程消息、含模型正文的边界消息和错误工具调用必须保持现有语义，不得因折叠而隐藏正文或错误状态。

## 开发与验证

- 常规改动至少运行：
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
- 发布或打包相关改动还要运行 `npm pack --dry-run`，确认 tarball 包含 `lib/`、`src/`、`cordis.patch.yml`、`README.md` 和许可证，并且没有无关文件。
- 测试开发依赖（包括 `jsdom`、`react-dom`、`tsx`）不得进入 npm tarball；通过 `npm pack --dry-run` 检查发布文件清单。
- `npm run check` 是默认的完整本地检查；修复本次改动产生的错误和警告后再结束。
- 新增非平凡分支、解析或状态逻辑时，在现有 `node:test` 测试中补一个最小回归用例；简单一行改动不新增测试框架或样板。
- 不以修改快照、放宽 TypeScript、跳过测试或提交构建产物来掩盖失败。区分代码回归、宿主版本差异和本地环境问题并报告。

## 安装、发布与安全

- Desktop 用户必须使用 Desktop 提供的 DSH Terminal，操作当前 profile，不要额外添加 `--profile web`。
- Desktop profile 之间的插件清单和构建配置彼此独立；切换 profile 后不得假设插件会自动迁移，必须在目标 profile 重新安装、更新并通过 `dsh --dump-config` 验证。
- Desktop 对新发布 npm 版本应用 24 小时最短发布时间策略；发布后立即验证必须使用明确版本号的 `dsh plugin add dsh-compact-activity@<version>`，不要用 `update --latest` 判断新版本是否可用。
- React 和 DSH Client peer dependencies 由宿主模块加载器提供，必须在 `peerDependenciesMeta` 中保持 optional；不要指导用户把它们手动安装到 profile。
- 普通 DSH CLI/Web 才使用 `dsh plugin --profile web ...`；`npm` 不能替代 DSH 所需的 `pnpm`。
- 不安装全局工具，不编辑 profile 清单，不修改 Desktop 应用文件，不检查或改写 `app.asar`，不手动复制插件。
- 任何联网下载、终端定位、文件写入、权限提升或发布操作遇到权限不足时立即报告并请求用户授权；不得自行提权或绕过限制。
- 不在日志、issue、测试夹具或回复中提交模型上下文、令牌、API key、私钥或其他敏感信息。
- 未经用户明确许可，不提交、推送、改写 Git 历史、删除重要文件、变更生产配置或修改远程资源。

## 修改原则

- 先追踪实际调用链和所有调用方，再在根因位置做最小修改。
- 优先删除和复用，避免为单一实现增加接口、工厂、配置项或“以后可能用到”的扩展点。
- 保持现有中文面向用户文案和项目风格；无明确需求不做无关重构、格式化或 README 改写。
- 每次改动说明受影响的宿主版本、验证范围和未验证的真实 UI 风险。
