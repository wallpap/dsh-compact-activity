# dsh-compact-activity

为 DeepSeek Harness Web 界面提供 Codex 风格的单行活动折叠。

- 默认启用。连续两条及以上过程消息合并为一个总折叠行。
- 展开后，每条思考和工具调用仍使用 DSH 官方组件、样式与交互。
- 单条思考或单次工具调用不分组，完整保持 DSH 官方行为。
- 如果最后一条 assistant 同时包含思考和正文，只折叠其中官方 Think 子项，正文仍单独可见。
- 使用醒目的粗体 `>` 标记。
- 左侧状态只显示 `进行中...` 或 `已完成`。
- 思考段数和工具调用次数始终保留。
- 进行中思考显示 `正在思考`；进行中工具直接复用最后一条官方工具类型和摘要。
- 已完成的折叠行不显示摘要。
- 下一条模型正文是分组边界，不会被折叠到过程列表中。
- 不覆盖 Chat Node 渲染器，不修改会话日志、模型上下文或工具执行。

## 从 npm 安装

发布后，直接把预构建包加入 Web profile：

```sh
dsh plugin --profile web add dsh-compact-activity
dsh --profile web --dump-config
dsh --profile web
```

`--dump-config` 输出中应包含 `ui-compact-activity`。

## 从本地源码安装

先安装开发依赖并生成严格模式 TypeScript 构建产物：

```sh
pnpm install --ignore-scripts
pnpm --config.ignore-scripts=true run check
```

然后在本目录安装到 Web profile：

```sh
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

如果使用 Harness 源码版，请在 Harness 源码根目录执行 `pnpm dsh ...`，并把上面
的 `.` 换成本插件目录的实际路径。

## 从 tarball 安装

```sh
pnpm pack
dsh plugin --profile web add ./dsh-compact-activity-1.0.0.tgz
```

tarball 已包含预构建的 `lib/`，安装时不需要执行构建脚本。

## 卸载

```sh
dsh plugin --profile web remove dsh-compact-activity
```

## 验证

```sh
pnpm --config.ignore-scripts=true run check
pnpm pack --dry-run
```

如果你的 pnpm 没有启用依赖脚本审批策略，也可以直接使用
`pnpm install` 和 `pnpm run check`。这里使用 `--ignore-scripts`，避免为构建工具
`esbuild` 自动放开安装脚本权限；本插件的构建已验证不依赖该脚本。

`prepack` 会在发布或打包前重新生成 `lib/`，避免发布过期构建产物。

## 代码结构

```text
src/
├── index.ts                         # Host 空壳；让 Loader 发现浏览器插件
└── client/
    ├── index.ts                     # 注册会话控制器并管理样式生命周期
    ├── activity-group.ts            # 分组边界、计数和单条保留规则
    ├── styles.ts                    # 总折叠行与隐藏状态样式
    └── components/
        └── CompactActivityController.tsx # 控制官方过程行的总折叠状态
```

`tsconfig.json` 开启 `strict`、`noUncheckedIndexedAccess` 和
`exactOptionalPropertyTypes`。`tsconfig.build.json` 只生成声明文件，
`tsdown.config.ts` 生成 DSH 可加载的 Host 与浏览器入口。

## 兼容性

需要提供以下 Web 扩展点的 DSH 版本：

- `conversation.session.header.actions`
- Chat Flow 的 `data-chat-flow` 与 `data-chat-flow-key` 稳定标记
- 官方过程子项的 `data-variant="think"`、`data-tool` 和 `data-disclosure-row` 标记
- `assistant-step` 与 `tool-call` Chat Node 数据

类型检查基线为 DSH `0.1.0-rc.6`；上述 DOM 标记已按 2026-08-13 的官方
主分支源码核对。它们不是本插件控制的 API，升级 DSH 后应先人工检查折叠、
官方子项交互和工具摘要。

## 许可证

[MIT](./LICENSE) © 2026 wallpap
