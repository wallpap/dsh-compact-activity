import { defineConfig } from 'tsdown'

const PACKAGE_NAME = 'dsh-compact-activity'

/**
 * DSH 通过浏览器模块表共享这些模块。保持 external 可复用宿主拥有的 React、
 * UI 基础组件实例，避免插件打入私有副本后破坏上下文和组件身份。
 */
const CLIENT_EXTERNALS = [
  'react',
] as const

export default defineConfig([
  {
    name: PACKAGE_NAME,
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
  {
    name: `${PACKAGE_NAME}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    deps: { neverBundle: [...CLIENT_EXTERNALS] },
    sourcemap: true,
    dts: false,
    clean: false,
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_NAME)}, factory: (require) => {`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
])
