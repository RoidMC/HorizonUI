/**
 * HorizonUI · 全局配置
 *
 * 库不依赖任何宿主框架能力（路由 / i18n / 图标集 / Nuxt 自动导入），
 * 需要宿主提供的东西统一从这里注入：
 *   - unstyled：全局关皮肤，组件不再输出语义类名 → 库自带 CSS 自然不命中。
 *     单个实例可用同名 prop 覆盖（prop 传了就以 prop 为准）。
 *   - icon：图标渲染器。库不内置任何图标集，宿主把自己那套 <Icon> 传进来即可。
 *
 * 用法（Nuxt）：
 *   nuxtApp.vueApp.use(createHorizon({ icon: Icon }))
 * 用法（局部子树，例如预览沙箱里强制脱皮）：
 *   provideHorizon({ unstyled: true })
 */
import type { App, Component, InjectionKey, MaybeRefOrGetter } from 'vue'
import { inject, provide } from 'vue'
import { createToastStore, TOAST_KEY } from './composables/useToast'

export interface HorizonConfig {
  /** 全局不输出语义类名（库自带 CSS 不再命中）。默认 false */
  unstyled?: boolean
  /** 图标组件；需接受 name 属性。未提供时图标插槽留空（不报错、不产出无意义节点） */
  icon?: Component
  /**
   * 阅读方向。默认 'ltr'。
   *
   * 库不认识 i18n 框架，所以方向由宿主下发而不是库自己查 locale：
   * 需要跟随运行时语言切换时传 ref 或 getter（`() => locale.dir`），库内部每次求值都重新读。
   */
  dir?: MaybeRefOrGetter<'ltr' | 'rtl'>
  /** 默认头像地址（Avatar 的 src 为空时兜底）。未提供且无 placeholder 插槽时什么都不渲染 */
  defaultAvatar?: string
}

/** 未安装配置时的兜底：空对象，等价于「全默认」 */
const DEFAULT_CONFIG: HorizonConfig = Object.freeze({})

export const HORIZON_CONFIG: InjectionKey<HorizonConfig> = Symbol('horizon:config')

/** 在 setup 里给子树覆盖配置（比 app 级更近的 provide 优先） */
export function provideHorizon(config: HorizonConfig): HorizonConfig {
  provide(HORIZON_CONFIG, config)
  return config
}

export function useHorizonConfig(): HorizonConfig {
  return inject(HORIZON_CONFIG, DEFAULT_CONFIG)
}

/** Vue 插件形态 */
export function createHorizon(config: HorizonConfig = {}): { install: (app: App) => void } {
  return {
    install(app: App) {
      app.provide(HORIZON_CONFIG, config)
      // toast 状态挂在插件安装上，而不是模块顶层：app.provide 是「每个 app 实例一份」，
      // 而每个 SSR 请求都会创建一个新 app —— 于是天然做到「每请求一份」隔离。
      // 若把 store 放模块顶层（旧的模块级单例），同一进程内所有请求共享同一份队列，
      // A 用户的 toast 会漏进 B 用户的响应里。
      app.provide(TOAST_KEY, createToastStore())
    },
  }
}
