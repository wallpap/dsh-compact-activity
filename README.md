# dsh-compact-activity

[![npm version](https://img.shields.io/npm/v/dsh-compact-activity)](https://www.npmjs.com/package/dsh-compact-activity)
[![license](https://img.shields.io/npm/l/dsh-compact-activity)](./LICENSE)

让 DeepSeek Harness 的思考与工具调用更紧凑、更容易浏览。

插件会把连续的思考和工具调用收进一个单行折叠项。默认保持收起，需要查看细节时再展开；模型最终输出始终正常显示。

```text
> 进行中...  2 段思考 · 3 次工具调用  Code · 正在读取项目文件...
> 已完成    2 段思考 · 3 次工具调用
```

## 为什么使用它

- **减少滚动距离**：连续的思考和工具调用合并为一个折叠项。
- **不改变官方内容**：展开后仍使用 DSH 官方 Think、Code 和工具组件。
- **保留正文边界**：下一条模型正文不会被折叠进过程列表。
- **实时显示状态**：执行期间显示 `进行中...`、计数和最后一项活动摘要。
- **完成后保持简洁**：完成时只显示 `已完成` 和计数，不再显示过期摘要。
- **单条消息不受影响**：只有一条思考或工具调用时，继续使用 DSH 官方行为。

插件只调整 Web 界面的展示方式，不修改模型上下文、会话日志或工具执行。

## 安装

### DSH Desktop 2.0.0

从系统托盘打开 DSH Terminal，针对当前 profile 运行：

```powershell
dsh plugin add dsh-compact-activity@1.0.4
dsh --dump-config
```

配置输出应包含 `id: ui-compact-activity` 和 `name: dsh-compact-activity`。验证后重启 DSH Desktop。

Desktop 已内置 Node.js、pnpm 和 DSH。无需为本插件全局安装这些工具，也不要使用 npm 代替 pnpm。DSH Terminal 中的命令默认操作 Desktop 当前 profile，不要添加 `--profile web`。

Desktop 对刚发布的 npm 包默认应用 24 小时最短发布时间策略。`dsh plugin update dsh-compact-activity --latest` 可能因此继续保留旧版本并显示 `Already up to date`。需要立即安装新版本时，必须像上面一样明确指定完整版本号；这是用户对该版本的显式选择。普通更新可以在发布时间超过 24 小时后再使用 `update --latest`。

Desktop 的每个 profile 有独立的插件清单和构建配置。托盘从 `desktop` 切换到 `web` 后，之前安装在 `desktop` 的插件不会自动出现在 `web`；必须切换到目标 profile 后，在该 profile 的 DSH Terminal 中再次执行上面的安装、更新和验证命令。切回其他 profile 时同理。

### 普通 DSH CLI/Web

适用于终端中已有 `dsh` 和 `pnpm` 的 Linux、macOS 和 Windows 环境。只有 Node.js 和 npm 无法安装 DSH 插件；请先按 DSH 官方方式配置 pnpm 和 DSH。

```sh
dsh plugin --profile web add dsh-compact-activity@1.0.4
dsh --profile web --dump-config
```

配置输出应包含 `id: ui-compact-activity` 和 `name: dsh-compact-activity`。验证后运行 `dsh --profile web`。插件默认启用。

### 让 Agent 帮你安装

如果你的 Agent 可以使用终端，把下面这段话直接发给它：

```text
请安装并验证最新版 dsh-compact-activity。

1. 如果目标是 DSH Desktop 2.0.0，直接定位并使用 Desktop 提供的 DSH Terminal 程序或启动入口。不要用普通 PowerShell、CMD 或其他终端代替。找不到 DSH Terminal 时停止并报告，不要猜测路径。
2. 在 DSH Terminal 中运行 `dsh plugin add dsh-compact-activity@1.0.4` 和 `dsh --dump-config`。这些命令操作 Desktop 当前 profile，不要添加 `--profile web`。明确版本号用于绕过刚发布版本的 24 小时最短发布时间限制。完成后提示用户重启 Desktop。
3. 只有目标明确是普通 DSH CLI/Web 时，才运行 `dsh plugin --profile web add dsh-compact-activity@1.0.4` 和 `dsh --profile web --dump-config`。此路径需要 `dsh` 和 `pnpm`；npm 不能代替 pnpm。
4. 配置输出必须包含 `id: ui-compact-activity` 和 `name: dsh-compact-activity`。读取已安装包的 `package.json` 并报告实际版本、安装路径和验证结果。
5. 如果定位或启动终端、执行命令、联网下载或读取验证结果需要当前没有的权限，立即向用户说明受阻操作、所需权限和用途，并请求授权。得到授权前不要继续，不要自行提权或绕过限制。
6. 不要安装全局工具，不要检查 app.asar 内部路径，也不要编辑 profile 清单、修改 Desktop 应用文件或手动复制插件。
```

## 使用方式

插件没有设置页面。安装后重启 DSH Web 或 Desktop，插件会自动生效：

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

Desktop 2.0.0 在 DSH Terminal 中更新或卸载：

```powershell
dsh plugin update dsh-compact-activity --latest
dsh plugin remove dsh-compact-activity
```

刚发布的版本在 24 小时安全窗口内不会被 `update --latest` 自动选择。需要立即更新时运行 `dsh plugin add dsh-compact-activity@1.0.4`。

普通 CLI/Web 更新或卸载：

```sh
dsh plugin --profile web update dsh-compact-activity --latest
dsh plugin --profile web remove dsh-compact-activity
```

操作后请重启 DSH Desktop 或 DSH Web。

### Desktop 切换 profile 后插件不生效

按以下顺序排查：

1. 从托盘切换到需要使用插件的目标 profile。
2. 从该 profile 打开 DSH Terminal，运行：

   ```powershell
   dsh plugin add dsh-compact-activity@1.0.4
   dsh --dump-config
   ```

3. 确认输出同时包含 `id: ui-compact-activity`、`name: dsh-compact-activity`，并读取已安装包的实际版本和路径。安装结果必须是 `1.0.4`；如果仍是旧版本，不要把 `Already up to date` 当作已安装最新版。
4. 重启 DSH Desktop，再检查总过程折叠。

`pnpm peers check` 对旧版插件可能报告缺少 React 和 DSH peer dependencies。这些模块由 DSH 宿主提供，不应手动安装到 profile；`1.0.4` 已将它们标记为 optional peer。若目标 profile 已包含上述配置但仍无效果，记录 DSH/Desktop 版本、启动方式、实际插件版本、安装路径和浏览器控制台错误。不要编辑 profile 清单、复制插件文件或检查 `app.asar`；这些操作会绕过 Desktop 的正常插件加载流程。

## 从本地源码安装

项目使用严格模式 TypeScript。需要 Node.js `22.19+` 或 `24+`：

```sh
npm install
npm run check
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

如果使用 Harness 源码版，请在 Harness 源码根目录执行 `pnpm dsh ...`，并把 `.` 换成本插件目录的绝对路径。

### 从 tarball 安装

```sh
npm pack
dsh plugin --profile web add ./dsh-compact-activity-<version>.tgz
```

请将 `<version>` 替换为 `npm pack` 输出中的实际版本。tarball 已包含预构建的 `lib/`，安装时不需要再次构建。

## 开发与验证

```sh
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

`npm run check` 会依次执行严格类型检查、测试和生产构建。`prepack` 会在发布或打包前重新生成 `lib/`，避免发布过期构建产物。

测试使用开发依赖 `jsdom`、`react-dom` 和 `tsx`，用于验证核心分组逻辑及浏览器控制器行为。这些依赖不会进入 npm tarball；`npm test` 会自动发现 `test/*.test.ts`。

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

`tsconfig.json` 开启 `strict`、`noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes`，并检查源码、测试、构建配置及脚本。

## 兼容性

兼容性状态：

| 运行环境                  | 版本                                 | 结果                                     |
| ------------------------- | ------------------------------------ | ---------------------------------------- |
| DeepSeek Harness 官方 Web | `0.1.0-rc.6`                         | 类型检查、构建和真实 UI 测试通过         |
| DSH Desktop（Windows）     | `2.0.0`，内置 DSH `0.1.0-rc.6`       | 实机安装、更新、配置和 UI 验证通过       |

Linux 和 macOS 用户也可通过官方 CLI/Web 使用插件。

插件依赖以下 DSH Web 扩展点和稳定标记：

- `conversation.session.header.actions`
- Chat Flow 的 `data-chat-flow` 与 `data-chat-flow-key`
- 官方过程项的 `data-variant="think"`、`data-tool`、`data-state` 和 `data-disclosure-row`
- `assistant-step` 与 `tool-call` Chat Node 数据

这些标记由 DSH 提供，不属于本插件控制的公共 API。升级 DSH 后，建议人工检查总过程折叠、官方子项交互和工具实时摘要。

### DSH Desktop 服务边界

本插件是跨环境 Web UI 插件，不执行 profile 切换、插件安装/更新/卸载或依赖修复，因此不使用 Desktop 专用的 `desktopProfiles`、`desktopPnpm`、`desktopRuntime` 或 Electron IPC。Desktop 仍通过普通 DSH Web Client 模块加载本插件；不要为本插件添加 Desktop Host 服务作为必需注入，也不要访问 `app.asar` 或其他 Desktop 私有路径。

Desktop 真实环境验证应使用 Desktop 提供的 DSH Terminal，并确认当前 profile 的配置包含 `id: ui-compact-activity` 和 `name: dsh-compact-activity`。仓库中的 jsdom 测试不能替代真实 Desktop/Web 宿主回归检查。

## 问题反馈

遇到兼容性问题时，请在 [GitHub Issues](https://github.com/wallpap/dsh-compact-activity/issues) 提交：

- DSH 版本和启动方式；
- 插件版本；
- 浏览器控制台错误；
- 能复现问题的界面截图。

请勿在 issue 中提交模型上下文、令牌或其他敏感信息。

## 许可证

[MIT](./LICENSE) © 2026 wallpap
