<p align="center">
<a href="https://www.roidmc.com">
<img src="./.github/static/brand/logo-full.svg" alt="HorizonUI" width="250px" />
</a>
<p>

<p align="center">
<img src="https://img.shields.io/badge/License-MPL%202.0-blue.svg?style=flat-square" alt="License">
</p>

# HorizonUI

> Vue 3 UI Library & Source-Distributed & Pure ESM — Built on [Reka UI](https://reka-ui.com/)

该UI组件库目前仅用于RoidMC内部项目

使用MPL2.0许可证开源发布，对内使用想用随意，但是不保证兼容性，也无任何支持

## 前置条件

这三条是硬性的，不满足就用不了：

1. 纯 ESM 环境（无 CJS 产物）
2. 宿主构建链能编译 `.vue` SFC + TS + SCSS（Vite / Nuxt / webpack + sass 均可）
3. 浏览器支持 CSS `@layer` / `oklch` / `@property`（现代浏览器均支持）

## 接入

### Nuxt

```ts
export default defineNuxtConfig({
  modules: ['@roidmc/horizon-ui/nuxt']
})
```

模块负责四件事：注册全局组件（`UIButton` / `UIInput` / `UIPanelCard` …）、自动导入 composable、注入皮肤 CSS、把 `vue` / `reka-ui` 钉成单实例

选项（默认全开）：`{ skin, components, autoImports, singleInstance }`。宿主自己管理 CSS 时传 `{ skin: false }`

### 其他构建器

node_modules 默认不进转译，需要把库排除出预打包、再交给自己的构建链编译：

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ['@roidmc/horizon-ui'] },
  ssr: { noExternal: ['@roidmc/horizon-ui'] }
})
```

## 入口

| 入口 | 内容 |
| --- | --- |
| `@roidmc/horizon-ui` | 组件 + composable，带库自带皮肤 |
| `@roidmc/horizon-ui/unstyled` | 同上，不带任何 CSS |
| `@roidmc/horizon-ui/styles` | 只有皮肤 SCSS |
| `@roidmc/horizon-ui/nuxt` | Nuxt 模块 |

`createHorizon({ unstyled: true })` 可全局关掉类名输出；单个组件也支持 `unstyled` prop

## 主题

- 令牌全是 CSS 变量 `--h-*`，默认值写在 `:root`。宿主覆盖同名变量即可换肤，无需改库
- 皮肤全部装在 `@layer horizon` 内。宿主样式不加层，按 CSS 规范天然压过分层样式 —— **覆盖方向不依赖加载顺序**
- 库不绑定任何品牌字体：`--h-font-family` 是中性栈，品牌字体由宿主设置并自行加载

### 令牌分两层

| 层 | 位置 | 内容 |
| --- | --- | --- |
| 全局令牌 | `src/styles/themes/variables/abstracts/_vars.scss` | 调色盘种子、语义色（`color-mix` 推导）、圆角 / 间距 / 字号 / 字重 / 行高 / 动效 / 层级等跨组件档位 |
| 组件旋钮 | `src/styles/themes/variables/components/ui/_*.scss` | 单个组件的外观开口，命名 `--h-<组件>-<部位>`（`--h-button-border-radius`、`--h-input-bg`、`--h-toast-shadow` …） |

组件旋钮的默认值优先引用全局令牌（`var(--h-...)`），宿主改全局档位即可整体联动；只有确实要偏离全局的组件才写自己的值。

其中 `--h-toast-exit-duration` 比较特殊：它是唯一会被 JS 读取的令牌 —— Toast 用它的计算值决定 DOM 卸载时机，好和 CSS 的退出动画同源（原先 CSS 写 0.32s、JS 写 220ms，动画会在播完前被卸载截断）。改值安全，删掉会退回库内置的 320ms 兜底。

几个有代表性的全局旋钮：

- `--h-border-radius`（0.75rem）—— 圆角基准，`xs` / `sm` / `base` 由它 `calc()` 推导，改一个变量整套组件一起变圆或变方；`none`（0）是绝对值，表示「直角」这一设计语言，有意不参与缩放
- `--h-palette-*` —— 主题色种子（primary / success / warning / error / info / neutral），改种子即切换整套配色，语义色与 hover / active / soft 变体全部自动重算
- `--h-z-*` —— 统一叠层顺序，组件内禁止硬编码 `z-index`

宿主覆盖示例（不加 `@layer` 即可盖住库皮肤）：

```css
:root {
  --h-border-radius: 0.25rem;       /* 全局：整套圆角一起变小 */
  --h-panel-card-border-radius: 0;  /* 组件：卡片单独改直角 */
}
```

### 令牌准入规则

新增令牌须三条全满足，否则不进库：

1. **有消费者** —— 库内或宿主确实在 `var()` 引用它。不做「以后可能会用」的预留变种
2. **有注释写明用途** —— 尤其是值看起来怪的（绝对值、刻意偏离全局档位、与其他档位不成比例）
3. **是偏差点** —— 组件默认值确有理由与全局档位不同；相等的就直接 `var()` 引用全局令牌，不另立一份

## 约定

- 组件只输出语义类名（`h-` 前缀）+ `data-*` 状态属性（`data-state` / `data-disabled` / `data-invalid`），视觉一律在 SCSS
- 组件样式不写在 SFC 里，统一放在 `src/styles/themes/`
- 不内置文案、图标、路由。图标交给宿主注入的渲染器（`HIcon`：URL 直出 `<img>`，其余名字转交宿主）。
- 不依赖 Nuxt / UnoCSS，核心依赖只有 Vue 3 与 reka-ui

## 目录

```
src/
  index.ts          # styled 入口
  unstyled.ts       # unstyled 入口
  nuxt.ts           # Nuxt 模块
  exports.ts        # 公共 API（两个入口共用，避免漂移）
  components/UI/    # 组件
  composables/      # useToast / useSkin / useUnstyled / useDirection …
  config.ts         # createHorizon / provideHorizon
  styles/           # 皮肤（SCSS 源码）
```

## 发布

源码直发，不发 `dist`。`pnpm build:css` 只用于本地查看编译产物，**不是交付物**，发布时需排除（例如 package.json 的 `"files": ["src"]`）

开发命令：`pnpm typecheck`（vue-tsc）、`pnpm build:css`（本地编译皮肤）

## License

2026 © [RoidMC Studios](https://www.roidmc.com) | [MPL-2.0 License](./LICENSE)
