# dsh-compact-activity

[![npm version](https://img.shields.io/npm/v/dsh-compact-activity)](https://www.npmjs.com/package/dsh-compact-activity)
[![license](https://img.shields.io/npm/l/dsh-compact-activity)](./LICENSE)

让 DeepSeek Harness 的思考与工具调用更紧凑、更容易浏览。

插件会把一段连续的模型工作过程收进一个 Codex 风格的单行折叠项。默认保持收起，
需要查看细节时再展开；模型最终输出始终正常显示。

```text
> 进行中...  2 段思考 · 3 次工具调用  Code · 正在读取项目文件...
> 已完成    2 段思考 · 3 次工具调用
```

## 为什么使用它

- **减少滚动距离**：连续的思考和工具调用合并为一个总过程列表。
- **不改变官方内容**：展开后仍使用 DSH 官方 Think、Code 和工具组件。
- **保留正文边界**：下一条模型 output 不会被折叠进过程列表。
- **实时显示状态**：执行期间显示 `进行中...`、计数和最后一项活动摘要。
- **完成后保持简洁**：完成时只显示 `已完成` 和计数，不再显示过期摘要。
- **单条消息不受影响**：只有一条思考或工具调用时，继续使用 DSH 官方行为。

插件只调整 Web 界面的展示方式，不修改模型上下文、会话日志或工具执行。

## 一条命令安装

在终端中运行：

```sh
dsh plugin --profile web add dsh-compact-activity
```

然后重新启动 DSH Web：

```sh
dsh --profile web
```

插件默认启用，不需要额外配置。

### 让 Agent 帮你安装

如果你的 Agent 可以使用终端，把下面这段话直接发给它：

```text
请为当前用户安装 dsh-compact-activity 插件：

1. 确认 dsh 命令可用。
2. 运行：dsh plugin --profile web add dsh-compact-activity
3. 运行：dsh --profile web --dump-config
4. 确认输出包含 ui-compact-activity。
5. 如果 DSH Web 已经运行，只提醒我重启，不要终止未知进程。

不要修改当前项目源码，也不要安装全局 npm 包。
完成后告诉我执行结果和人工检查地址。
```

### 验证安装

```sh
dsh --profile web --dump-config
```

配置中应包含：

```yaml
- id: ui-compact-activity
  name: dsh-compact-activity
```

打开一个包含多次思考和工具调用的会话。过程列表应默认折叠；展开后，内部官方工具项
仍可单独展开。

## 使用方式

插件没有设置页面，安装并重启 DSH Web 后自动生效：

| 场景 | 显示行为 |
| --- | --- |
| 多条连续过程消息 | 合并为一个默认收起的总折叠项 |
| 正在思考 | 显示 `进行中...`、计数和 `正在思考` |
| 正在调用工具 | 显示最后一个官方工具的类型和摘要 |
| 工作完成 | 显示 `已完成` 和计数，不显示摘要 |
| 展开总过程 | 显示原版 Think 和工具组件，保留官方交互 |
| 单条过程消息 | 不分组，保持 DSH 官方显示 |
| 思考后紧接模型正文 | 只折叠 Think，正文继续显示 |

过长的实时摘要会自动截断，不会挤压页面布局。

## 更新与卸载

更新到 npm 上的最新版本：

```sh
dsh plugin --profile web add dsh-compact-activity
```

卸载：

```sh
dsh plugin --profile web remove dsh-compact-activity
```

更新或卸载后请重新启动 DSH Web。

## 从本地源码安装

项目使用严格模式 TypeScript。需要 Node.js `22.19+` 或 `24+`：

```sh
npm install
npm run check
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

如果使用 Harness 源码版，请在 Harness 源码根目录执行 `pnpm dsh ...`，并把 `.`
换成本插件目录的绝对路径。

### 从 tarball 安装

```sh
npm pack
dsh plugin --profile web add ./dsh-compact-activity-<version>.tgz
```

请将 `<version>` 替换为 `npm pack` 输出中的实际版本。tarball 已包含预构建的
`lib/`，安装时不需要再次构建。

## 开发与验证

```sh
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

`npm run check` 会依次执行严格类型检查、测试和生产构建。`prepack` 会在发布或
打包前重新生成 `lib/`，避免发布过期构建产物。

```text
scripts/
└── clean.ts                         # 使用 Node 原生 TypeScript 清理构建目录
src/
├── index.ts                         # Host 入口，让 Loader 发现浏览器插件
└── client/
    ├── index.ts                     # 注册控制器并管理样式生命周期
    ├── activity-group.ts            # 过程分组、边界、状态和计数
    ├── styles.ts                    # 总折叠行及隐藏状态样式
    └── components/
        └── CompactActivityController.tsx # 控制官方过程行的总折叠状态
```

`tsconfig.json` 开启 `strict`、`noUncheckedIndexedAccess` 和
`exactOptionalPropertyTypes`，并检查源码、测试、构建配置及脚本。

## 兼容性

类型检查基线为 DSH `0.1.0-rc.6`。插件依赖以下 DSH Web 扩展点和稳定标记：

- `conversation.session.header.actions`
- Chat Flow 的 `data-chat-flow` 与 `data-chat-flow-key`
- 官方过程项的 `data-variant="think"`、`data-tool`、`data-state` 和
  `data-disclosure-row`
- `assistant-step` 与 `tool-call` Chat Node 数据

这些标记由 DSH 提供，不属于本插件控制的公共 API。升级 DSH 后，建议人工检查总过程
折叠、官方子项交互和工具实时摘要。

## 问题反馈

遇到兼容性问题时，请在
[GitHub Issues](https://github.com/wallpap/dsh-compact-activity/issues) 提交：

- DSH 版本和启动方式；
- 插件版本；
- 浏览器控制台错误；
- 能复现问题的界面截图。

请勿在 issue 中提交模型上下文、令牌或其他敏感信息。

## 许可证

[MIT](./LICENSE) © 2026 wallpap
