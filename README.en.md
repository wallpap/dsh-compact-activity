# dsh-compact-activity

[![npm version](https://img.shields.io/npm/v/dsh-compact-activity)](https://www.npmjs.com/package/dsh-compact-activity)
[![license](https://img.shields.io/npm/l/dsh-compact-activity)](./LICENSE)

[简体中文](./README.md) | English

Make DeepSeek Harness thinking and tool calls more compact and easier to browse.

The plugin groups consecutive thinking and tool calls into a single-line collapsible item. It stays collapsed by default; expand it when you need details. The model's final output always displays normally.

```text
> In progress...  [thought icon]×2  [tool icon]×3  Code · Reading project files...
> Done            [thought icon]×2  [tool icon]×3  [failure icon]×1
> Execution error [thought icon]×2  [tool icon]×3  [failure icon]×1
```

The actual UI uses monochrome SVG icons; brackets identify their meaning in this text example.

## Why use it

- **Less scrolling**: consecutive thinking and tool calls collapse into one item.
- **Official content unchanged**: expanding still uses DSH's official Think, Code, and tool components.
- **Message boundaries preserved**: the next model message is never folded into the process list.
- **Live status**: while running, it shows `In progress...`, counts, and the latest activity summary.
- **Failure history retained**: failed process steps have a separate count; a later successful recovery still ends as `Done`.
- **Accurate terminal state**: when the final process item fails or is interrupted, it shows `Execution error`; later model output does not clear that state.
- **Single messages unaffected**: with only one thinking or tool call, DSH's official behavior is kept.

The plugin only adjusts the Web UI presentation. It does not modify model context, session logs, or tool execution.

The top-level disclosure's status and counts follow DSH's language setting, with `中文` and `English` dictionaries. When no explicit preference is stored, DSH derives the initial language from the browser; switching the DSH language updates existing disclosure rows. Official tool titles and summaries remain unchanged.

## Installation

### DSH Desktop 2.0.x

Open the DSH Terminal from the system tray and run, against the current profile:

```powershell
dsh plugin add dsh-compact-activity@latest
dsh --dump-config
pnpm list dsh-compact-activity --depth 0
```

The config output should contain `id: ui-compact-activity` and `name: dsh-compact-activity`. After verifying, restart DSH Desktop.

Desktop already bundles Node.js, pnpm, and DSH. You don't need to install these globally for this plugin, and you should not use npm in place of pnpm. Commands in the DSH Terminal operate on the Desktop's current profile by default; don't add `--profile web`.

Desktop applies a 24-hour minimum publish time policy to freshly published npm packages. Prefer `@latest` when installing, then compare the npm latest version with the version actually installed in the profile:

```powershell
$latest = pnpm view dsh-compact-activity dist-tags.latest
pnpm list dsh-compact-activity --depth 0
```

If the installed version is not `$latest`, explicitly install the queried version to confirm the user's choice:

```powershell
dsh plugin add "dsh-compact-activity@$latest"
```

`dsh plugin update dsh-compact-activity --latest` can also keep the old version and show `Already up to date` because of the security window, so always check the actual version instead of relying on the command's exit status.

Each Desktop profile has its own plugin manifest and build config. After switching from `desktop` to `web` in the tray, plugins installed in `desktop` do not automatically appear in `web`. Switch to the target profile first, then run the install, update, and verification commands again in that profile's DSH Terminal. The same applies when switching back to another profile.

### Plain DSH CLI/Web

For Linux, macOS, and Windows environments that already have `dsh` and `pnpm` in the terminal. Node.js and npm alone cannot install DSH plugins; configure pnpm and DSH using the official DSH method first.

```sh
dsh plugin --profile web add dsh-compact-activity@latest
dsh --profile web --dump-config
```

The config output should contain `id: ui-compact-activity` and `name: dsh-compact-activity`. After verifying, run `dsh --profile web`. The plugin is enabled by default.

### Ask an agent to install it

If your agent can use a terminal, send it the following:

```text
Please install and verify the latest version of dsh-compact-activity.

1. If the target is DSH Desktop 2.0.x, locate and use the DSH Terminal program or launch entry provided by Desktop. Don't use plain PowerShell, CMD, or another terminal instead. If you can't find DSH Terminal, stop and report; don't guess paths.
2. In DSH Terminal, prefer running `dsh plugin add dsh-compact-activity@latest`, `dsh --dump-config`, and `pnpm list dsh-compact-activity --depth 0`. These operate on Desktop's current profile; don't add `--profile web`.
3. Query the npm latest version with `pnpm view dsh-compact-activity dist-tags.latest`. If the installed version differs, run `dsh plugin add "dsh-compact-activity@<queried version>"`; don't hardcode a version.
4. Use `--profile web` commands only when the target is clearly a plain DSH CLI/Web setup. That path requires `dsh` and `pnpm`; npm can't replace pnpm.
5. The config output must contain `id: ui-compact-activity` and `name: dsh-compact-activity`. Read the installed package's `package.json` and report the npm latest version, installed version, install path, and verification result.
6. If locating or launching the terminal, running commands, downloading over the network, or reading verification results requires permissions you don't have, tell the user immediately which operation is blocked, what permission is needed and why, and ask for authorization. Don't continue before authorization; don't escalate privileges or bypass restrictions.
7. Don't install global tools, inspect paths inside app.asar, edit profile manifests, modify Desktop app files, or copy plugin files manually.
```

## Usage

The plugin has no separate settings page. After installation, restart DSH Web or Desktop and it takes effect automatically; DSH's Language setting controls the copy:

| Scenario | Display behavior |
| ------------------ | --------------------------------------- |
| Multiple consecutive process messages | Grouped into one collapsed top-level item |
| Thinking in progress | Shows `In progress...`, counts, and `Thinking` |
| Calling a tool | Shows the last official tool's type and summary |
| Work finished | Shows `Done` and counts, with no summary |
| An earlier step fails and later recovers | Shows `Done` and retains the failed-step count |
| The final process item ends abnormally | Shows `Execution error` with the same icon-count layout |
| Model output follows an execution error | The process group remains `Execution error`; model output stays visible |
| Switching the DSH language | Status and counts switch between Chinese and English |
| Top-level item expanded | Shows the original Think and tool components with official interactions |
| Single process message | No grouping; DSH official display is kept |
| Thinking followed by a model message | Only the Think is collapsed; the message still displays |

Overly long live summaries are truncated automatically and never squeeze the layout.

## Screenshots

<img width="1263" height="810" alt="image" src="https://github.com/user-attachments/assets/444d9b55-dca7-4d61-82ed-aab6bddf95ff" />

---

<img width="1228" height="299" alt="image" src="https://github.com/user-attachments/assets/90fdc15b-d58d-41f3-954c-68a751fc7ee8" />

---

<img width="1034" height="548" alt="image" src="https://github.com/user-attachments/assets/8b3b8d68-59fa-425f-8f2b-ea0d03c6e37d" />

## Updating and uninstalling

Desktop 2.0.x, in the DSH Terminal:

```powershell
dsh plugin update dsh-compact-activity --latest
dsh plugin remove dsh-compact-activity
```

After updating, compare versions with `pnpm view dsh-compact-activity dist-tags.latest` and `pnpm list dsh-compact-activity --depth 0`. If the versions differ, install the queried explicit version with `dsh plugin add "dsh-compact-activity@<version>"`.

Plain CLI/Web:

```sh
dsh plugin --profile web update dsh-compact-activity --latest
dsh plugin --profile web remove dsh-compact-activity
```

Restart DSH Desktop or DSH Web afterwards.

### Plugin not working after switching profiles on Desktop

Troubleshoot in this order:

1. Switch to the target profile that needs the plugin from the tray.
2. Open the DSH Terminal for that profile and run:

   ```powershell
   dsh plugin add dsh-compact-activity@latest
   dsh --dump-config
   $latest = pnpm view dsh-compact-activity dist-tags.latest
   pnpm list dsh-compact-activity --depth 0
   ```

3. Confirm the output contains both `id: ui-compact-activity` and `name: dsh-compact-activity`, and compare the npm latest version with the installed version.
4. If the versions differ, run `dsh plugin add "dsh-compact-activity@$latest"`, then re-check the installed version and config.
5. Restart DSH Desktop, then check the top-level process grouping.

`pnpm peers check` may report missing React, DSH Client, or Locale peer dependencies for older plugin versions. These modules are provided by the DSH host and should not be manually installed into the profile; the current version marks them as optional peers. If the target profile still has no effect despite the config above, record the DSH/Desktop version, launch method, npm latest version, installed plugin version, install path, and browser console errors. Don't edit profile manifests, copy plugin files, or inspect `app.asar`; those actions bypass Desktop's normal plugin loading flow.

## Installing from local source

The project uses strict-mode TypeScript and requires Node.js `22.19+` or `24+`:

```sh
npm install
npm run check
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

If you use the Harness source build, run `pnpm dsh ...` from the Harness source root and replace `.` with this plugin directory's absolute path.

### Installing from a tarball

```sh
npm pack
dsh plugin --profile web add ./dsh-compact-activity-<version>.tgz
```

Replace `<version>` with the actual version from the `npm pack` output. The tarball contains the prebuilt `lib/`, so no rebuild is needed at install time.

## Development and verification

```sh
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

`npm run check` runs strict type checking, tests, and a production build in order. `prepack` regenerates `lib/` before publishing or packing, so stale build artifacts are never released.

Tests use the dev dependencies `jsdom`, `react-dom`, and `tsx` to verify the core grouping logic and browser controller behavior. They never enter the npm tarball; `npm test` auto-discovers `test/*.test.ts`.

```text
scripts/
└── clean.ts                         # Cleans the build directory with Node's native TypeScript support
src/
├── index.ts                         # Host entry that lets the Loader discover the browser plugin
└── client/
    ├── index.ts                     # Registers the controller and manages style lifecycle
    ├── activity-group.ts            # Process grouping, boundaries, states, and counts
    ├── locales.ts                   # Chinese and English dictionaries for the DSH Locale namespace
    ├── styles.ts                    # Styles for the top-level collapsed row and hidden states
    └── components/
        └── CompactActivityController.tsx # Controls the top-level collapse state of official process rows
```

`tsconfig.json` enables `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`, and checks source, tests, build config, and scripts.

## Compatibility

Compatibility status:

| Environment | Version | Result |
| ------------------------- | ------------------------------------ | ---------------------------------------- |
| DeepSeek Harness official Web | `0.1.0-rc.6` | Type checking, build, and real UI tests pass |
| DSH Desktop (Windows) | `2.0.0`, bundled DSH `0.1.0-rc.6` | On-device install, update, config, and UI verification pass |
| DSH Desktop (Windows) | `2.0.1`, bundled DSH `0.1.0-rc.6` | Source compatibility reviewed; real UI not yet verified |

Linux and macOS users can also use the plugin through the official CLI/Web.

The plugin relies on the following DSH Web extension points and stable markers:

- `conversation.session.header.actions`
- The `locale` service and slot `t` translation seat from `@deepseek-ai/dsh-client-locale`
- Chat Flow's `data-chat-flow` and `data-chat-flow-key`
- The official process items' `data-variant="think"`, `data-tool`, `data-state`, and `data-disclosure-row`
- `assistant-step` and `tool-call` Chat Node data

The dictionaries register in the plugin-owned `compact-activity` namespace, and statuses and counts render through DSH's injected `t` translator; the plugin does not read or guess DOM/browser languages. The other markers are provided by DSH and are not a public API controlled by this plugin. After upgrading DSH, manually check top-level grouping, official sub-item interactions, language switching, and live tool summaries.

### DSH Desktop service boundary

This plugin is a cross-environment Web UI plugin. It does not switch profiles, install/update/uninstall plugins, or fix dependencies, so it does not use Desktop-specific `desktopProfiles`, `desktopPnpm`, `desktopRuntime`, or Electron IPC. Desktop still loads this plugin through the normal DSH Web Client module path; don't add Desktop Host services as required injections for this plugin, and don't access `app.asar` or other Desktop-private paths.

Real Desktop verification should use the DSH Terminal provided by Desktop and confirm that the current profile's config contains `id: ui-compact-activity` and `name: dsh-compact-activity`. The jsdom tests in this repo cannot replace real Desktop/Web host regression checks.

## Feedback

For compatibility issues, file a report on [GitHub Issues](https://github.com/wallpap/dsh-compact-activity/issues) with:

- DSH version and launch method;
- plugin version;
- browser console errors;
- screenshots that reproduce the issue.

Don't include model context, tokens, or other sensitive information in issues.

## License

[MIT](./LICENSE) © 2026 wallpap
