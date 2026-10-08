/**
 * @roidmc/horizon-ui · Nuxt 模块
 *
 * 把「接入宿主」这件事从宿主的 nuxt.config 里收回来，宿主只需一行：
 *   modules: ['@roidmc/horizon-ui/nuxt']
 *
 * 做五件事：
 *   1. 组件：把 src/components/UI 注册成全局组件，名字与旧宿主组件一致（UIButton…UIToast），
 *      因为目录名 UI + 文件名 Button + pathPrefix:false → UIButton。
 *   2. 自动导入：useToast / useHorizonConfig / useSkin / useUnstyled / createHorizon / provideHorizon
 *      / useAnimatedSize 无需手动 import（宿主旧 composable 删掉后仍能直接用）。
 *   3. 皮肤：把库自带皮肤 CSS 插到宿主 css 列表最前 —— 宿主令牌/覆盖必须排在后面才生效。
 *   4. 单实例：把 vue / reka-ui 钉在宿主的那一份实体上（库只声明 peerDependency，
 *      源码直发时裸模块名会被按「导入方所在目录」解析成库自己 node_modules 里的第二份副本）。
 *   5. Toast 宿主：注册客户端插件全局挂载 <UIToast>，宿主不必再自己挂 ——
 *      漏挂时 useToast() 有 store 却没有 viewport，提示等于石沉大海。
 *
 * ⚠️ 刻意零依赖：本文件被 Nuxt 用 jiti 直接加载，而 @nuxt/kit 从库目录里解析不到
 *    （库不是 Nuxt 工程、没有 node_modules/@nuxt/kit）。所以只用 Nuxt 传进来的 nuxt 实例 +
 *    Node 内建模块，不 import 任何第三方包。
 *
 * ⚠️ 刻意不导出 useDirection：宿主已有自己那份「消费 i18n localeProperties」的 useDirection，
 *    两边同名会打架。库内部组件用的是库自己的那份，不需要宿主自动导入。
 */

import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface HorizonUINuxtOptions {
  /** 是否注入库自带皮肤 CSS（默认 true）。关掉后宿主需自己提供 .h-* 皮肤 */
  skin?: boolean
  /** 是否把 src/components/UI 注册为全局组件（默认 true） */
  components?: boolean
  /** 是否自动导入 useToast 等 composable（默认 true） */
  autoImports?: boolean
  /** 是否强制 vue / reka-ui 单实例（默认 true） */
  singleInstance?: boolean
  /** 是否自动注册全局 Toast 宿主插件（默认 true）。关掉后宿主需自己挂 <UIToast /> */
  toast?: boolean
}

/** src/ 目录（本文件所在目录）；组件目录相对它定位 */
const srcDir = dirname(fileURLToPath(import.meta.url))

/** 解析包根目录：优先 package.json 所在目录，退化到入口文件所在目录 */
function packageRoot(req: NodeJS.Require, spec: string): string {
  try {
    return dirname(req.resolve(`${spec}/package.json`))
  } catch {
    return dirname(req.resolve(spec))
  }
}

export default function horizonUINuxtModule(
  options: HorizonUINuxtOptions = {},
  nuxt: { options: Record<string, any>; hook: (name: string, cb: (arg: any) => void) => void }
): void {
  const opts: Required<HorizonUINuxtOptions> = {
    skin: true,
    components: true,
    autoImports: true,
    singleInstance: true,
    toast: true,
    ...options
  }

  // 1) 全局组件：目录名 + 文件名 → UIButton / UIToast …（与旧宿主组件同名，业务模板零改动）
  if (opts.components) {
    nuxt.hook('components:dirs', (dirs: unknown[]) => {
      dirs.push({
        path: join(srcDir, 'components/UI'),
        prefix: 'UI',
        pathPrefix: false,
        // 只扫 .vue：套件目录里的 index.ts 是出口 barrel，不是组件。
        // 若把 .ts 也算候选，Layout/index.ts 会按「目录名即组件名」解析成 UILayout，
        // 与 Layout/Layout.vue 争抢同一个名字（NUXT_B3011）。
        extensions: ['.vue']
      })
    })
  }

  // 2) 自动导入 composable（走 unstyled 入口：只提供逻辑，不把皮肤 CSS 带进全局）
  if (opts.autoImports) {
    const imports = (nuxt.options.imports ??= {})
    imports.presets ??= []
    imports.presets.push({
      from: '@roidmc/horizon-ui/unstyled',
      imports: [
        'useToast',
        'useHorizonConfig',
        'useSkin',
        'useUnstyled',
        'createHorizon',
        'provideHorizon',
        // AutoSize 内部用它做内容替换模式的动画；开合模式（0↔auto）由宿主自己接六个钩子
        'useAnimatedSize',
        // 通用交互原语：断点 / 偏好持久化 / 浮层定位 / 尺寸观察 / 点外部与 Esc 关闭
        'useBreakpoint',
        'useLocalStorageState',
        'useFloatingPosition',
        'useResizeObserver',
        'useDismissable'
      ]
    })
  }

  // 3) 皮肤：插到最前，宿主 css 排在后面才能覆盖库令牌。
  //    放在 modules:done 里做：其他模块（i18n 等）也会往 css 里塞条目，
  //    等它们都插完再 unshift，才能保证库皮肤真的排在宿主 css 之前。
  if (opts.skin) {
    nuxt.hook('modules:done', () => {
      const css: string[] = (nuxt.options.css ??= [])
      if (!css.includes('@roidmc/horizon-ui/styles')) {
        css.unshift('@roidmc/horizon-ui/styles')
      }
    })
  }

  // 4) vue / reka-ui 单实例
  if (opts.singleInstance) {
    const rootDir: string = nuxt.options.rootDir ?? process.cwd()
    const projectRequire = createRequire(join(rootDir, 'package.json'))
    // vue 不一定是宿主的直依赖（通常由 Nuxt 传递引入），以 nuxt 所在目录为锚点解析
    const fromNuxtDir = createRequire(
      join(dirname(projectRequire.resolve('nuxt/package.json')), 'noop.js')
    )

    const vite = (nuxt.options.vite ??= {})
    const resolve = (vite.resolve ??= {})
    const current = resolve.alias
    const list: Array<{ find: RegExp | string; replacement: string }> = Array.isArray(current)
      ? current
      : Object.entries(current ?? {}).map(([find, replacement]) => ({ find, replacement: replacement as string }))

    list.unshift(
      // 正则锚定，避免误伤 vuetify / reka-ui-xxx 之类前缀相同的包
      { find: /^vue$/, replacement: packageRoot(fromNuxtDir, 'vue') },
      { find: /^reka-ui$/, replacement: packageRoot(projectRequire, 'reka-ui') }
    )
    resolve.alias = list
  }

  // 5) 全局 Toast 宿主：推一个客户端插件，宿主不必再自己挂 <UIToast />。
  //    只能直接改 nuxt.options.plugins（不用 kit 的 addPlugin，见文件头「刻意零依赖」）。
  //    去重是为了应对模块被注册两次 / 宿主手写同一路径的情况，避免挂出两个 viewport。
  if (opts.toast) {
    const plugins = (nuxt.options.plugins ??= [])
    const toastPlugin = join(srcDir, 'runtime/global-toast.ts')
    const registered = plugins.some((p: unknown) =>
      (typeof p === 'string' ? p : (p as { src?: string } | undefined)?.src) === toastPlugin
    )
    if (!registered) {
      plugins.push({ src: toastPlugin, mode: 'client' })
    }
  }

  // 6) 源码直发：库里的 .vue/.ts/.scss 必须由宿主构建链编译，不能被当成外部依赖交给 Node require
  const build = (nuxt.options.build ??= {})
  build.transpile ??= []
  if (!build.transpile.includes('@roidmc/horizon-ui')) {
    build.transpile.push('@roidmc/horizon-ui')
  }
}
