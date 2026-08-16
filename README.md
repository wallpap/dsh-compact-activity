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

## 安装

### 已有 DSH CLI

适用于 Linux、macOS、Windows，以及终端中可运行 `dsh` 和 `pnpm` 的 Desktop 用户。
仅有 Node.js/npm 不够，DSH 使用 pnpm 管理插件。

```sh
dsh plugin --profile web add dsh-compact-activity@latest
dsh --profile web --dump-config
```

配置输出应包含 `id: ui-compact-activity` 和 `name: dsh-compact-activity`。验证后运行
`dsh --profile web`，或重新打开 Desktop。插件默认启用。

### Windows Desktop helper

缺少 `dsh` 或 `pnpm` 时使用此方式；只有 npm 时也使用此方式。脚本复用 Desktop 自带的
Electron/Node 和 DSH CLI，并自动下载经过 SHA-256 校验的便携版 pnpm。执行前请从系统托盘
完全退出 Desktop。

```powershell
$installer = Join-Path $env:TEMP 'install-dsh-compact-activity.ps1'
Invoke-WebRequest `
  'https://raw.githubusercontent.com/wallpap/dsh-compact-activity/main/scripts/install-desktop.ps1' `
  -OutFile $installer
Get-Content -LiteralPath $installer
Unblock-File -LiteralPath $installer
& $installer -DesktopRoot 'D:\DSH\DeepSeek Harness'
```

脚本会安装最新版本并验证配置，不修改 Desktop 安装目录或手动编辑 profile。完成后重新打开
Desktop。需要代理时设置 `HTTPS_PROXY`，或传入 `-Proxy 'http://127.0.0.1:端口'`。

卸载：

```powershell
& $installer -DesktopRoot 'D:\DSH\DeepSeek Harness' -Remove
```

### macOS Desktop

使用上方 DSH CLI 流程。当前 helper 仅支持 Windows；不要转换脚本、修改 `.app` 或手动编辑
profile。安装前完全退出 Desktop，完成后重新打开。

### 让 Agent 帮你安装

如果你的 Agent 可以使用终端，把下面这段话直接发给它：

```text
请把 dsh-compact-activity@latest 安装到当前用户的 DSH web profile，并完成验证。

1. 检查操作系统、是否使用 Desktop，以及 dsh、pnpm 是否可用。npm 不能替代 pnpm。
2. 只选择一条安装路径：
  - dsh 和 pnpm 均可用：
    Desktop 用户先从系统托盘完全退出，然后运行`dsh plugin --profile web add dsh-compact-activity@latest`。
  - Windows Desktop 缺少任一命令：
    定位 Desktop 安装目录，确认其中存在`DeepSeek Harness.exe` 和 `resources/host/node_modules/@deepseek-ai/dsh/lib/bin.js`；
    下载并阅读 `https://raw.githubusercontent.com/wallpap/dsh-compact-activity/main/scripts/install-desktop.ps1`，请用户从系统托盘完全退出 Desktop，再通过 `-DesktopRoot` 运行；
    不要强制结束进程，也不要安装全局 Node.js、npm、pnpm 或 dsh。
  - macOS Desktop 缺少任一命令：
    停止安装，说明需要 dsh 和 pnpm，并在安装依赖前取得用户许可。
    不要运行或转换 Windows helper。
3. CLI 路径运行 `dsh --profile web --dump-config`；
  输出必须包含 `id: ui-compact-activity` 和 `name: dsh-compact-activity`。Windows helper 必须以退出码 0 完成并显示“安装和配置验证完成”。
4. 不要手动编辑 `~/.dsh/profiles/web/package.json`、Desktop 文件或应用包，也不要手动复制插件。
5. 从 web profile 中已安装包的 `package.json` 读取实际版本。报告版本、安装路径、验证结果，以及用户应重新打开 Desktop 还是运行 `dsh --profile web`。
```

## 使用方式

插件没有设置页面，安装并重启 DSH Web 或 Desktop 后自动生效：

| 场景               | 显示行为                                |
| ------------------ | --------------------------------------- |
| 多条连续过程消息   | 合并为一个默认收起的总折叠项            |
| 正在思考           | 显示 `进行中...`、计数和 `正在思考`     |
| 正在调用工具       | 显示最后一个官方工具的类型和摘要        |
| 工作完成           | 显示 `已完成` 和计数，不显示摘要        |
| 展开总过程         | 显示原版 Think 和工具组件，保留官方交互 |
| 单条过程消息       | 不分组，保持 DSH 官方显示               |
| 思考后紧接模型正文 | 只折叠 Think，正文继续显示              |

过长的实时摘要会自动截断，不会挤压页面布局。

## 效果展示

<img width="1263" height="810" alt="image" src="https://github.com/user-attachments/assets/444d9b55-dca7-4d61-82ed-aab6bddf95ff" />

---

<img width="1228" height="299" alt="image" src="https://github.com/user-attachments/assets/90fdc15b-d58d-41f3-954c-68a751fc7ee8" />

---

<img width="1034" height="548" alt="image" src="https://github.com/user-attachments/assets/8b3b8d68-59fa-425f-8f2b-ea0d03c6e37d" />

## 更新与卸载

更新到 npm 上的最新版本：

```sh
dsh plugin --profile web add dsh-compact-activity@latest
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
├── clean.ts                         # 使用 Node 原生 TypeScript 清理构建目录
└── install-desktop.ps1              # Windows Desktop 免 Node 安装与卸载 helper
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

已验证环境：

| 运行环境                            | 版本                  | 结果                                                   |
| ----------------------------------- | --------------------- | ------------------------------------------------------ |
| DeepSeek Harness 官方 Web           | `0.1.0-rc.6`          | 类型检查、构建和真实 UI 测试通过                       |
| DeepSeek Harness Desktop（Windows） | 内置 DSH `0.1.0-rc.5` | 与 `dsh-better-sidebar` 同时加载及真实会话折叠测试通过 |

macOS Desktop 尚未进行真实设备和应用包测试，因此不列入已验证环境。Linux 和 macOS 用户
可以通过官方 CLI/Web 使用插件。

插件依赖以下 DSH Web 扩展点和稳定标记：

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
