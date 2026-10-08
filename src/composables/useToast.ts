/**
 * HorizonUI · Toast 状态
 *
 * 落地 reka-ui 2.11 的 Toast Manager：状态的唯一真相源是 reka 的 GlobalToastManager
 * （createToastManager()），由 <UIToast> 交给 ToastProvider 的 toastManager prop。
 * 本文件只做两件事：
 *   1. 把 HorizonUI 的命令式语法糖（toast.success / toast.promise / …）翻译成 manager.add/update/close；
 *   2. 保留 reka 没覆盖的能力：堆叠位置（viewport 角落）与 limit（同时可见条数）。
 * 退出动画的时序不再由本文件管：reka 的 ToastRoot + Presence 会等 CSS 动画播完才卸载，
 * 因此原先读 --h-toast-exit-duration 决定卸载时机的逻辑已删除。
 *
 * 用法（宿主装过 createHorizon 插件后，在 setup 里取用）：
 *   const { toast } = useToast()
 *   toast('已保存')
 *   toast.success('创建成功')
 *   toast.error('出错了', { description: '详情…' })
 *   toast.warning('注意')
 *   toast.info('提示')
 *   const id = toast.loading('上传中…')
 *   toast.promise(upload(), { loading: '上传中…', success: () => '上传完成', error: () => '上传失败' })
 *   toast.dismiss(id)
 *
 * ⚠️ 状态不放在模块顶层：manager 由 createHorizon() 在 install 时 app.provide(TOAST_KEY, …)，
 *    每个 SSR 请求一个新的 app → 天然隔离（模块级单例会跨请求泄漏）。
 */

import { createToastManager } from 'reka-ui'
import type {
  GlobalToastManager,
  ToastAddOptions,
  ToastObject,
  ToastUpdateOptions,
} from 'reka-ui'
import { inject, ref } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  title?: string
  description?: string
  type?: ToastType
  /** 自动关闭毫秒数；0 或 Infinity 表示常驻（需手动 dismiss）。默认 4000，loading 为 Infinity，error 为 6000。 */
  duration?: number
  /** 覆盖图标（iconify 名称），不传则按 type 取默认图标。 */
  icon?: string
  action?: ToastAction
  class?: string
}

/** 挂在 reka ToastObject.data 上的 Horizon 扩展字段 */
export interface HorizonToastData {
  /** 覆盖图标（iconify 名称） */
  icon?: string
  /** 宿主自定义类名 */
  class?: string
}

/** 队列里的一条（reka 的 ToastObject + Horizon 扩展 data） */
export type ToastItem = ToastObject<HorizonToastData>

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

const DEFAULT_DURATION = 4000
const LOADING_DURATION = Infinity
const ERROR_DURATION = 6000

/** 无障碍播报敏感度：用户动作触发的用 foreground（立即播报），后台任务用 background。 */
function sensitivityOf(type: ToastType): 'foreground' | 'background' {
  return type === 'error' || type === 'loading' ? 'foreground' : 'background'
}

function durationOf(type: ToastType, override?: number): number {
  if (override != null) return override
  if (type === 'loading') return LOADING_DURATION
  if (type === 'error') return ERROR_DURATION
  return DEFAULT_DURATION
}

export interface ToastAPI {
  (message: string, opts?: ToastOptions): string
  show: (message: string, opts?: ToastOptions) => string
  success: (message: string, opts?: ToastOptions) => string
  error: (message: string, opts?: ToastOptions) => string
  warning: (message: string, opts?: ToastOptions) => string
  info: (message: string, opts?: ToastOptions) => string
  loading: (message: string, opts?: ToastOptions) => string
  promise: <T>(
    p: Promise<T>,
    msgs: { loading: string; success: (data: T) => string; error: (err: unknown) => string },
    opts?: ToastOptions
  ) => Promise<T>
  dismiss: (id?: string) => void
  /** 切换全局堆叠位置 */
  position: (p: ToastPosition) => void
  /** 设置同时最多显示条数（0 = 不限制）。对应 ToastProvider 的 limit。 */
  maxCount: (n: number) => void
}

/** Toast 的完整状态与操作；每个 app 实例一份（见文件头说明） */
export interface ToastStore {
  /** reka 的全局 manager：交给 <UIToast> 内部的 ToastProvider */
  manager: GlobalToastManager<HorizonToastData>
  /** 全局堆叠位置（运行时可切换） */
  position: Ref<ToastPosition>
  /** 同时最多显示条数：超出时关掉最旧的（轮播），语义等价于「最多显示 N 条」。默认 3，0 = 不限制 */
  maxCount: Ref<number>
  /** 命令式调用入口：toast('…') / toast.success('…') / … */
  toast: ToastAPI
  setPosition: (p: ToastPosition) => void
  setMaxCount: (n: number) => void
}

/**
 * 创建一个独立的 toast store。请交给 createHorizon() 在 install 时 provide，
 * 不要在模块顶层 new 一个 —— 那就是旧的跨请求泄漏单例。
 */
export function createToastStore(): ToastStore {
  const manager = createToastManager<HorizonToastData>()
  const position = ref<ToastPosition>('top-right')
  const maxCount = ref(3)

  function setPosition(p: ToastPosition): void {
    position.value = p
  }

  function setMaxCount(n: number): void {
    maxCount.value = n
  }

  /** HorizonUI 语法糖 → reka 的 add 选项（type/status/duration/图标/动作都在这映射） */
  function addOptions(type: ToastType, opts: ToastOptions): ToastAddOptions<HorizonToastData> {
    return {
      title: opts.title,
      description: opts.description,
      // status 是 reka 暴露到 data-status 的字段，也是 loading 常驻与类型皮肤的判定依据
      status: type,
      type: sensitivityOf(type),
      duration: durationOf(type, opts.duration),
      data: { icon: opts.icon, class: opts.class },
      actionProps: opts.action
        ? { label: opts.action.label, altText: opts.action.label, onClick: opts.action.onClick }
        : undefined,
    }
  }

  /** 更新（promise 的 success/error 落点）：只改状态与文案，不动 data/action */
  function updateOptions(type: ToastType, opts: ToastOptions): ToastUpdateOptions<HorizonToastData> {
    return {
      description: opts.description,
      status: type,
      type: sensitivityOf(type),
      duration: durationOf(type, opts.duration),
    }
  }

  function push(type: ToastType, message: string, opts?: ToastOptions): string {
    return manager.add(addOptions(type, { ...opts, description: opts?.description ?? message }))
  }

  const toast = ((message: string, opts?: ToastOptions) =>
    push(opts?.type ?? 'default', message, opts)) as ToastAPI

  toast.show = (message, opts) => push(opts?.type ?? 'default', message, opts)
  toast.success = (message, opts) => push('success', message, opts)
  toast.error = (message, opts) => push('error', message, opts)
  toast.warning = (message, opts) => push('warning', message, opts)
  toast.info = (message, opts) => push('info', message, opts)
  toast.loading = (message, opts) => push('loading', message, opts)
  toast.dismiss = (id?: string) => manager.close(id)
  toast.position = setPosition
  toast.maxCount = setMaxCount
  toast.promise = <T>(
    p: Promise<T>,
    msgs: { loading: string; success: (data: T) => string; error: (err: unknown) => string },
    opts?: ToastOptions
  ): Promise<T> =>
    manager.promise(p, {
      loading: addOptions('loading', { ...opts, description: msgs.loading }),
      success: (data: T) => updateOptions('success', { ...opts, description: msgs.success(data) }),
      error: (err: unknown) => updateOptions('error', { ...opts, description: msgs.error(err) }),
    })

  return {
    manager,
    position,
    maxCount,
    toast,
    setPosition,
    setMaxCount,
  }
}

/** Toast store 的注入键；由 createHorizon() 在 install 时 provide（每个 app 实例一份） */
export const TOAST_KEY: InjectionKey<ToastStore> = Symbol('horizon:toast')

// 仅用于「宿主忘了装插件」时的兜底告警去重；不是响应式状态，放模块层无副作用。
let warnedMissingProvider = false
let fallbackStore: ToastStore | null = null

function isProduction(): boolean {
  // 不用打包器专属的环境变量、也不用「是否客户端」标志：库不绑定具体打包器，
  // 也不该依赖「当前是不是客户端」。
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return env?.NODE_ENV === 'production'
}

/**
 * 取出当前 app 的 toast store。
 *
 * 注入缺失（宿主没 app.use(createHorizon())）时不抛错 —— 抛错会让整页崩掉；
 * 改为非生产环境警告一次，并返回一个惰性本地 store（功能可用，只是不跨组件共享）。
 */
export function useToast(): ToastStore {
  const injected = inject(TOAST_KEY, null)
  if (injected) return injected

  if (!isProduction() && !warnedMissingProvider) {
    warnedMissingProvider = true
    console.warn(
      '[HorizonUI] useToast() 未找到 TOAST_KEY：宿主可能忘了 app.use(createHorizon())。已回退到本地 store，toast 不会跨组件共享。'
    )
  }

  if (!fallbackStore) fallbackStore = createToastStore()
  return fallbackStore
}