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

### 官方 CLI / Web（Linux、macOS、Windows）

在终端中运行：

```sh
dsh plugin --profile web add dsh-compact-activity
```

然后重新启动 DSH Web：

```sh
dsh --profile web
```

插件默认启用，不需要额外配置。

### DeepSeek Harness Desktop（Windows）

Desktop 与官方 Web 版共用 `~/.dsh/profiles/web`，插件包和 profile 配置完全兼容。
安装完成后，Desktop 会从同一个 Web profile 加载本插件。

只安装了 Desktop 时，可以使用项目提供的 PowerShell 安装脚本。它复用 Desktop 自带的
Electron/Node 和 DSH CLI，因此不需要额外安装 Node.js、npm、全局 pnpm 或全局 DSH。
安装前请从系统托盘完全退出 Desktop。

先下载并检查脚本：

```powershell
$installer = Join-Path $env:TEMP 'install-dsh-compact-activity.ps1'
Invoke-WebRequest `
  'https://raw.githubusercontent.com/wallpap/dsh-compact-activity/main/scripts/install-desktop.ps1' `
  -OutFile $installer
Get-Content -LiteralPath $installer
Unblock-File -LiteralPath $installer
```

然后传入 Desktop 安装目录：

```powershell
& $installer -DesktopRoot 'D:\DSH\DeepSeek Harness'
```

脚本会根据 Windows 架构下载 pnpm 官方便携版，校验固定的 SHA-256，并缓存到
`%LOCALAPPDATA%\dsh-compact-activity\tools`。随后它通过 Desktop 内置的 DSH CLI 执行官方
`dsh plugin` 安装流程并检查配置树。脚本不会修改 Desktop 安装目录，也不会手动编辑 profile。
安装完成后重新打开 Desktop。GitHub 下载需要代理时，可设置 `HTTPS_PROXY`，或向脚本传入
`-Proxy 'http://127.0.0.1:端口'`。脚本不会保存代理设置。

卸载时复用已经下载的脚本：

```powershell
& $installer -DesktopRoot 'D:\DSH\DeepSeek Harness' -Remove
```

如果终端中已经可以运行 `dsh` 和 `pnpm`，也可以直接使用上方官方 CLI 命令；Windows
Desktop 用户不需要为了运行或安装本插件而额外安装这些工具。

### DeepSeek Harness Desktop（macOS）

当前 PowerShell helper 仅支持 Windows，不能在 macOS 上运行。macOS Desktop 用户目前请使用
上方官方 CLI 命令安装插件；Node.js 和 pnpm 只用于管理插件，Desktop 运行本身不依赖用户安装的
Node.js。安装前完全退出 Desktop，安装后重新打开。

macOS 免 Node helper 尚未经过真实设备、应用包内部路径、签名和 Gatekeeper 环境验证，因此
当前版本不宣称支持。不要把 Windows 脚本转换后直接执行，也不要手动修改 `.app` 内容或 profile。

### 让 Agent 帮你安装

如果你的 Agent 可以使用终端，把下面这段话直接发给它：

```text
请为当前用户安装 dsh-compact-activity 插件：

目标：把插件安装到当前用户的 DSH web profile，并验证它已经进入配置树。

1. 先判断用户使用哪种运行方式：
   - Linux、macOS 或 Windows 上的官方 DSH CLI/Web；
   - Windows DeepSeek Harness Desktop；或
   - macOS DeepSeek Harness Desktop。
2. 官方 CLI/Web：
   - 确认 dsh 和 pnpm 可用；
   - 运行：dsh plugin --profile web add dsh-compact-activity
   - 运行：dsh --profile web --dump-config
3. Windows Desktop：
   - 定位安装目录，并确认存在 DeepSeek Harness.exe 和
     resources/host/node_modules/@deepseek-ai/dsh/lib/bin.js；
   - 不要安装 Node.js、npm、全局 pnpm 或全局 DSH；
   - 从以下地址下载脚本到临时目录，并在执行前读取内容：
     https://raw.githubusercontent.com/wallpap/dsh-compact-activity/main/scripts/install-desktop.ps1
   - 请用户从系统托盘完全退出 Desktop；不要强制结束进程；
   - 运行脚本并通过 -DesktopRoot 传入安装目录；脚本会完成安装和配置验证。
4. macOS Desktop：
   - 当前没有经过验证的免 Node helper，不要运行或转换 Windows PowerShell 脚本；
   - 如果 dsh 和 pnpm 已可用，按官方 CLI/Web 流程安装；
   - 如果命令不可用，先说明安装插件需要 Node.js 和 pnpm，并在安装这些工具前获得用户许可；
   - 不要修改应用包内容或手动编辑 profile。
5. 验证安装：
   - 官方 CLI 的配置输出应同时包含 # == dsh-compact-activity、
     id: ui-compact-activity 和 name: dsh-compact-activity；
   - Windows Desktop helper 应以退出码 0 结束，并显示“安装和配置验证完成”。helper 内部会检查
     id: ui-compact-activity 和 name: dsh-compact-activity。
6. 告诉用户重新启动：
   - Desktop 用户重新打开对应的 Desktop；
   - CLI/Web 用户运行 dsh --profile web。

不要修改当前项目源码、~/.dsh/profiles/web/package.json，或 Desktop 安装目录中的
resources/host。不要手动复制插件文件。Desktop helper 内部也必须通过 dsh plugin 完成安装。
完成后报告执行过的命令、版本、验证结果和启动方式。
```

### 验证安装

Windows Desktop helper 已自动完成等价验证。使用官方 CLI 时可以手动运行：

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

插件没有设置页面，安装并重启 DSH Web 或 Desktop 后自动生效：

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

## 效果展示
<img width="1263" height="810" alt="image" src="https://github.com/user-attachments/assets/444d9b55-dca7-4d61-82ed-aab6bddf95ff" />
--------
<img width="1228" height="299" alt="image" src="https://github.com/user-attachments/assets/90fdc15b-d58d-41f3-954c-68a751fc7ee8" />
--------
<img width="1034" height="548" alt="image" src="https://github.com/user-attachments/assets/8b3b8d68-59fa-425f-8f2b-ea0d03c6e37d" />


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

| 运行环境 | 版本 | 结果 |
| --- | --- | --- |
| DeepSeek Harness 官方 Web | `0.1.0-rc.6` | 类型检查、构建和真实 UI 测试通过 |
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
