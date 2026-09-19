# dsh-compact-activity

[![npm version](https://img.shields.io/npm/v/dsh-compact-activity)](https://www.npmjs.com/package/dsh-compact-activity)
[![license](https://img.shields.io/npm/l/dsh-compact-activity)](./LICENSE)

[简体中文](./README.md) | English

Make DeepSeek Harness thinking, tool calls, and image output easier to browse.

The plugin puts consecutive thinking and tool calls into one collapsed top-level item. Expanding it still uses DSH's official components, and model output remains visible.

## Feature overview

- **Process folding**: consecutive or single thinking and tool calls can share one top-level item.
- **Live state**: shows running, done, or execution error, with counts for thoughts, tools, and failed steps; running tools reuse the official summary.
- **Failure detection**: counts structured tool errors, interrupted reasoning, and non-zero exit codes or terminating signals from Bash, PWSH, and similar terminal tools.
- **Output preserved**: when one step contains both thinking and output, only Think is folded.
- **Image folding**: non-user images are collapsed by default; images in user and steering messages stay unchanged.
- **Official behavior unchanged**: the plugin does not replace official renderers or modify model context, session logs, or tool execution.

Status, counts, and image labels follow DSH's language setting with `中文` and `English` dictionaries. Switching languages updates existing process and image markers.

## Screenshots

<img width="1124" height="201" alt="image" src="https://github.com/user-attachments/assets/ee50fdb0-82d1-4493-9342-788a4b985ab4" />

----------

<img width="1124" height="201" alt="image" src="https://github.com/user-attachments/assets/df69b7d5-a87b-4ff6-9bab-b6067bc1583e" />

----------

<img width="1176" height="604" alt="image" src="https://github.com/user-attachments/assets/8ecbd9f3-696b-40db-8532-e255dc0ae4e4" />

-----------

<img width="1149" height="603" alt="image" src="https://github.com/user-attachments/assets/a9fcdba8-c72c-4b79-9171-225b9a2f1e3a" />

-----------

<img width="974" height="773" alt="image" src="https://github.com/user-attachments/assets/2dfd9d9b-ab21-4dd2-8387-416a54577cd3" />

-----------

<img width="998" height="1815" alt="image" src="https://github.com/user-attachments/assets/bcc67898-c5f7-4e80-9fd2-498e93c76ec2" />

## Installation

### DSH Desktop 2.0.12 (Beta: 2.0.12-beta.1)

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

1. If the target is DSH Desktop (stable 2.0.12 or Beta 2.0.12-beta.1), locate and use the DSH Terminal program or launch entry provided by Desktop. Don't use plain PowerShell, CMD, or another terminal instead. If you can't find DSH Terminal, stop and report; don't guess paths.
2. In DSH Terminal, prefer running `dsh plugin add dsh-compact-activity@latest`, `dsh --dump-config`, and `pnpm list dsh-compact-activity --depth 0`. These operate on Desktop's current profile; don't add `--profile web`.
3. Query the npm latest version with `pnpm view dsh-compact-activity dist-tags.latest`. If the installed version differs, run `dsh plugin add "dsh-compact-activity@<queried version>"`; don't hardcode a version.
4. Use `--profile web` commands only when the target is clearly a plain DSH CLI/Web setup. That path requires `dsh` and `pnpm`; npm can't replace pnpm.
5. The config output must contain `id: ui-compact-activity` and `name: dsh-compact-activity`. Read the installed package's `package.json` and report the npm latest version, installed version, install path, and verification result.
6. If locating or launching the terminal, running commands, downloading over the network, or reading verification results requires permissions you don't have, tell the user immediately which operation is blocked, what permission is needed and why, and ask for authorization. Don't continue before authorization; don't escalate privileges or bypass restrictions.
7. Don't install global tools, inspect paths inside app.asar, edit profile manifests, modify Desktop app files, or copy plugin files manually.
```

## Usage

The plugin has no separate settings page. Restart DSH Web or Desktop after installation; DSH's Language setting controls the copy:

| Scenario | Display behavior |
| -------- | -------- |
| Consecutive or single process messages | Grouped into one collapsed top-level item |
| Thinking in progress | Shows `In progress...`, counts, and `Thinking` |
| Calling a tool | Shows the last official tool's type and summary |
| Normal completion | Shows `Done` and counts; earlier failures remain in the failure count |
| The final process item fails or is interrupted | Shows `Execution error`; later model output does not clear it |
| Thinking and output in one step | Only Think is collapsed; output stays visible |
| Top-level item expanded | Continues to use official Think and tool components, with member states |
| Switching the DSH language | Process and image markers switch between Chinese and English |

Overly long live summaries are truncated automatically and never squeeze the layout.

## Updating and uninstalling

In the DSH Desktop DSH Terminal:

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
pnpm install
npm run check
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

The current DSH alpha client packages are not published to npm yet; this branch
uses `link:` development dependencies to the local alpha checkout at
`../clone/deepseek-harness`. Adjust those paths in `package.json` if the two
repositories are located elsewhere.

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

`npm run check` runs strict type checking, tests, and a production build in order. `lib/` is generated locally and is not tracked by Git; `prepack` rebuilds it before publishing or packing and includes it in the npm package.

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

As of September 19, 2026, the results below are based on the local source checkouts and Desktop's vendored runtime archives; a real Electron/Desktop window has not yet been launched for manual regression.

| Environment | Version | Result |
| ----------- | ------- | ------ |
| DeepSeek Harness official Web | `0.1.6-alpha.2` (commit `ddefc45f`) | Dev dependencies link to the local source; `npm run typecheck`, `npm test`, and `npm run build` pass. A real Web window has not been manually regressed. |
| Community DSH Desktop stable | `2.0.12`, bundled DSH `0.1.5-rc.2` | The `vendor/dsh-runtime/0.1.5-rc.2` Client bundle still contains the Chat Flow, Think, Tool, and Turn-process markers; no source-contract conflict was found, but real Desktop startup and profile composition were not run. |
| Community DSH Desktop Beta | `2.0.12-beta.1`, bundled DSH `0.1.6-alpha.2` | Uses the same Client contract as the current official Web source; the Beta runtime version matches the local source checkout. Real Desktop startup and profile composition were not run. |

Linux and macOS users can also use the plugin through the official CLI/Web.

The plugin relies on the following DSH Web extension points and stable markers:

- `conversation.session.header.actions`
- The `locale` service and slot `t` translation seat from `@deepseek-ai/dsh-client-locale`
- Chat Flow's `data-chat-flow` and `data-chat-flow-key`
- The official process items' `data-variant="think"`, `data-tool`, `data-state`, and `data-disclosure-row`
- `assistant-step` and `tool-call` Chat Node data

The dictionaries register in the plugin-owned `compact-activity` namespace, and statuses and counts render through DSH's injected `t` translator; the other markers are provided by DSH and are not a public API controlled by this plugin. After upgrading DSH, manually check top-level grouping, official sub-item interactions, language switching, and live tool summaries.

### Image folding

Non-user-input images are collapsed by default, including:

- attachment images and Markdown images in Assistant messages;
- image galleries returned by tools;
- image displays in other Chat Flow rows that are not `user` or `steering` messages.

Images in user and steering messages remain unchanged. The plugin uses independent markers: `data-dca-image-group`, `data-dca-image-target`, and `data-dca-image-hidden`. It inserts only native `<details>/<summary>` markers and hides the original image target; it does not move or replace DSH's image DOM subtree.

Image folding uses short enter/leave transitions and honors `prefers-reduced-motion`. Detection reuses DSH's image buttons, Markdown-image attributes, and semantic failed-image fallback shape. One marker is created per Markdown image reference, with the image name and path shown when expanded. On Windows Desktop, local Markdown paths are resolved against the current Session working directory and remounted through the authenticated `/api/file` route; unresolved or missing files keep DSH's fallback text. After upgrading DSH, manually check Assistant images, tool images, multi-image galleries, failed-image fallback text, user-input images, and lightbox expansion.

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
