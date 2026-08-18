# dsh-compact-activity

[![npm version](https://img.shields.io/npm/v/dsh-compact-activity)](https://www.npmjs.com/package/dsh-compact-activity)
[![license](https://img.shields.io/npm/l/dsh-compact-activity)](./LICENSE)

简体中文 | [English](./README.en.md)

让 DeepSeek Harness 的思考与工具调用更紧凑、更容易浏览。

插件会把连续的思考和工具调用收进一个单行折叠项。默认保持收起，需要查看细节时再展开；模型最终输出始终正常显示。


## 为什么使用它

- **减少滚动距离**：连续的思考和工具调用合并为一个折叠项。
- **柔和底板外观**：轻量底色、细边框和状态轨迹增强层次；紫色表示运行中、Miku 绿表示完成、红色表示执行错误。
- **展开归属清晰**：中性过程轨道从折叠条平直下沿连接官方子项；统一圆角的子项底板分别使用淡紫、淡绿或淡红表示运行、完成或错误。
- **不改变官方内容**：展开后仍使用 DSH 官方 Think、Code 和工具组件。
- **保留正文边界**：下一条模型正文不会被折叠进过程列表。
- **实时显示状态**：执行期间显示 `进行中...`、计数和最后一项活动摘要。
- **保留失败统计**：过程中的失败步骤单独计数；后续步骤恢复成功时仍显示 `已完成`。
- **识别命令退出失败**：PWSH、Bash 等终端工具的非零退出码或终止信号也计入失败步骤，即使 DSH 的 `isError` 仍为 `false`。
- **准确显示终态**：最后一个过程项失败或中断时显示 `执行错误`，后续模型正文不会覆盖该状态。
- **单条消息不受影响**：只有一条思考或工具调用时，继续使用 DSH 官方行为。

插件只调整 Web 界面的展示方式，不修改模型上下文、会话日志或工具执行。

总折叠的状态和计数文案跟随 DSH 的语言设置，支持 `中文` 和 `English`。未设置显式语言时由 DSH 使用浏览器语言；在 DSH 中切换语言后，已显示的总过程项会同步更新。官方工具的标题和摘要仍原样复用。

## 安装

### DSH Desktop 2.0.x

从系统托盘打开 DSH Terminal，针对当前 profile 运行：

```powershell
dsh plugin add dsh-compact-activity@latest
dsh --dump-config
pnpm list dsh-compact-activity --depth 0
```

配置输出应包含 `id: ui-compact-activity` 和 `name: dsh-compact-activity`。验证后重启 DSH Desktop。

Desktop 已内置 Node.js、pnpm 和 DSH。无需为本插件全局安装这些工具，也不要使用 npm 代替 pnpm。DSH Terminal 中的命令默认操作 Desktop 当前 profile，不要添加 `--profile web`。

Desktop 对刚发布的 npm 包默认应用 24 小时最短发布时间策略。安装时应优先使用 `@latest`，然后比较 npm 的最新版本和 profile 实际安装版本：

```powershell
$latest = pnpm view dsh-compact-activity dist-tags.latest
pnpm list dsh-compact-activity --depth 0
```

如果实际版本不是 `$latest`，再显式安装查询到的版本以确认用户选择：

```powershell
dsh plugin add "dsh-compact-activity@$latest"
```

`dsh plugin update dsh-compact-activity --latest` 也可能因安全窗口继续保留旧版本并显示 `Already up to date`，因此必须核对实际版本，不能只看命令是否成功。

Desktop 的每个 profile 有独立的插件清单和构建配置。托盘从 `desktop` 切换到 `web` 后，之前安装在 `desktop` 的插件不会自动出现在 `web`；必须切换到目标 profile 后，在该 profile 的 DSH Terminal 中再次执行上面的安装、更新和验证命令。切回其他 profile 时同理。

### 普通 DSH CLI/Web

适用于终端中已有 `dsh` 和 `pnpm` 的 Linux、macOS 和 Windows 环境。只有 Node.js 和 npm 无法安装 DSH 插件；请先按 DSH 官方方式配置 pnpm 和 DSH。

```sh
dsh plugin --profile web add dsh-compact-activity@latest
dsh --profile web --dump-config
```

配置输出应包含 `id: ui-compact-activity` 和 `name: dsh-compact-activity`。验证后运行 `dsh --profile web`。插件默认启用。

### 让 Agent 帮你安装

如果你的 Agent 可以使用终端，把下面这段话直接发给它：

```text
请安装并验证最新版 dsh-compact-activity。

1. 如果目标是 DSH Desktop 2.0.x，直接定位并使用 Desktop 提供的 DSH Terminal 程序或启动入口。不要用普通 PowerShell、CMD 或其他终端代替。找不到 DSH Terminal 时停止并报告，不要猜测路径。
2. 在 DSH Terminal 中优先运行 `dsh plugin add dsh-compact-activity@latest`、`dsh --dump-config` 和 `pnpm list dsh-compact-activity --depth 0`。这些命令操作 Desktop 当前 profile，不要添加 `--profile web`。
3. 用 `pnpm view dsh-compact-activity dist-tags.latest` 查询 npm 最新版本。如果实际安装版本不一致，再运行 `dsh plugin add "dsh-compact-activity@<查询到的版本>"`，不要预先写死版本号。
4. 只有目标明确是普通 DSH CLI/Web 时，才使用带 `--profile web` 的插件命令。此路径需要 `dsh` 和 `pnpm`；npm 不能代替 pnpm。
5. 配置输出必须包含 `id: ui-compact-activity` 和 `name: dsh-compact-activity`。读取已安装包的 `package.json` 并报告 npm 最新版本、实际版本、安装路径和验证结果。
6. 如果定位或启动终端、执行命令、联网下载或读取验证结果需要当前没有的权限，立即向用户说明受阻操作、所需权限和用途，并请求授权。得到授权前不要继续，不要自行提权或绕过限制。
7. 不要安装全局工具，不要检查 app.asar 内部路径，也不要编辑 profile 清单、修改 Desktop 应用文件或手动复制插件。
```

## 使用方式

插件没有独立的设置页面。安装后重启 DSH Web 或 Desktop，插件会自动生效；语言由 DSH 的 Language 设置统一控制：

| 场景               | 显示行为                                |
| ------------------ | --------------------------------------- |
| 多条连续过程消息   | 合并为一个默认收起的总折叠项            |
| 正在思考           | 显示 `进行中...`、计数和 `正在思考`     |
| 正在调用工具       | 显示最后一个官方工具的类型和摘要        |
| 工作完成           | 显示 `已完成` 和计数，不显示摘要        |
| 中间步骤失败后恢复 | 显示 `已完成`，并保留失败步骤计数        |
| 最后过程项异常结束 | 显示 `执行错误`，并复用相同的图标计数    |
| 执行错误后输出正文 | 过程组仍显示 `执行错误`，正文保持可见    |
| 下一轮独立工具调用失败 | 保持 DSH 官方独立错误行，不归入上一过程组 |
| 切换 DSH 语言      | 总过程状态和计数同步切换中文或英文      |
| 展开总过程         | 用过程轨道连接原版 Think 和工具组件，并按子项状态显示淡色底板 |
| 单条过程消息       | 不分组，保持 DSH 官方显示               |
| 思考后紧接模型正文 | 只折叠 Think，正文继续显示              |

过长的实时摘要会自动截断，不会挤压页面布局。

## 效果展示

<img width="1124" height="201" alt="image" src="https://github.com/user-attachments/assets/ee50fdb0-82d1-4493-9342-788a4b985ab4" />

----------

<img width="1124" height="201" alt="image" src="https://github.com/user-attachments/assets/df69b7d5-a87b-4ff6-9bab-b6067bc1583e" />

----------

<img width="1191" height="886" alt="image" src="https://github.com/user-attachments/assets/b03645eb-fe2e-4c10-a0cc-fdc80d0e93dd" />

-----------

<img width="1190" height="722" alt="image" src="https://github.com/user-attachments/assets/57e2924a-a2eb-4a80-8a03-984173bb0a80" />



## 更新与卸载

Desktop 2.0.x 在 DSH Terminal 中更新或卸载：

```powershell
dsh plugin update dsh-compact-activity --latest
dsh plugin remove dsh-compact-activity
```

更新后运行 `pnpm view dsh-compact-activity dist-tags.latest` 和 `pnpm list dsh-compact-activity --depth 0` 对比版本。若版本不一致，再使用查询到的明确版本执行 `dsh plugin add "dsh-compact-activity@<version>"`。

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
   dsh plugin add dsh-compact-activity@latest
   dsh --dump-config
   $latest = pnpm view dsh-compact-activity dist-tags.latest
   pnpm list dsh-compact-activity --depth 0
   ```

3. 确认输出同时包含 `id: ui-compact-activity`、`name: dsh-compact-activity`，并比较 npm 最新版本和实际安装版本。
4. 如果版本不一致，运行 `dsh plugin add "dsh-compact-activity@$latest"`，然后重新检查实际版本和配置。
5. 重启 DSH Desktop，再检查总过程折叠。

`pnpm peers check` 对旧版插件可能报告缺少 React、DSH Client 或 Locale peer dependencies。这些模块由 DSH 宿主提供，不应手动安装到 profile；当前版本已将它们标记为 optional peer。若目标 profile 已包含上述配置但仍无效果，记录 DSH/Desktop 版本、启动方式、npm 最新版本、实际插件版本、安装路径和浏览器控制台错误。不要编辑 profile 清单、复制插件文件或检查 `app.asar`；这些操作会绕过 Desktop 的正常插件加载流程。

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

`npm run check` 会依次执行严格类型检查、测试和生产构建。`lib/` 是本地生成且不纳入 Git 的构建产物；`prepack` 会在发布或打包前重新生成它，并将其包含在 npm 包中。

测试使用开发依赖 `jsdom`、`react-dom` 和 `tsx`，用于验证核心分组逻辑及浏览器控制器行为。这些依赖不会进入 npm tarball；`npm test` 会自动发现 `test/*.test.ts`。

```text
scripts/
└── clean.ts                         # 使用 Node 原生 TypeScript 清理构建目录
src/
├── index.ts                         # Host 入口，让 Loader 发现浏览器插件
└── client/
    ├── index.ts                     # 注册控制器并管理样式生命周期
    ├── activity-group.ts            # 过程分组、边界、状态和计数
    ├── locales.ts                   # DSH Locale namespace 的中英文词典
    ├── styles.ts                    # 总折叠行及隐藏状态样式
    └── components/
        └── CompactActivityController.tsx # 控制官方过程行的总折叠状态
```

`tsconfig.json` 开启 `strict`、`noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes`，并检查源码、测试、构建配置及脚本。

## 兼容性

兼容性状态：

| 运行环境                  | 版本                                 | 结果                                     |
| ------------------------- | ------------------------------------ | ---------------------------------------- |
| DeepSeek Harness 官方 Web | `master`，提交 `99f6f02`（发布线 `0.1.0-rc.7`） | 稳定标记和扩展点核对通过                 |
| DSH Desktop（Windows）     | `2.0.0`，内置 DSH `0.1.0-rc.6`       | 本地 profile 安装和真实 UI 基础交互验证通过 |

Linux 和 macOS 用户也可通过官方 CLI/Web 使用插件。

插件依赖以下 DSH Web 扩展点和稳定标记：

- `conversation.session.header.actions`
- `@deepseek-ai/dsh-client-locale` 的 `locale` service 与 slot `t` 翻译 seat
- Chat Flow 的 `data-chat-flow` 与 `data-chat-flow-key`
- 官方过程项的 `data-variant="think"`、`data-tool`、`data-state` 和 `data-disclosure-row`
- `assistant-step` 与 `tool-call` Chat Node 数据

语言词典注册到插件自有的 `compact-activity` namespace，状态和计数通过 DSH 注入的 `t` 翻译函数呈现；其余标记由 DSH 提供，不属于本插件控制的公共 API。升级 DSH 后，建议人工检查总过程折叠、官方子项交互、语言切换和工具实时摘要。

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
