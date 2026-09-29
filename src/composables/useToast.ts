/**
 * HorizonUI · Toast 状态
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
 *
 * ⚠️ 状态不再放在模块顶层：模块级单例在同一进程内被所有请求共享，SSR 下会跨请求泄漏
 *    （A 用户的 toast 出现在 B 用户的响应里）。改为每个 app 实例一份，由 createHorizon()
 *    在 install 时 app.provide(TOAST_KEY, createToastStore())；每个 SSR 请求一个新的 app，
 *    于是天然隔离。
 */

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
  /** 自动关闭毫秒数；0 或 Infinity 表示常驻（需手动 dismiss）。默认 4000，loading 为 Infinity。 */
  duration?: number
  /** 覆盖图标（iconify 名称），不传则按 type 取默认图标。 */
  icon?: string
  action?: ToastAction
  class?: string
}

export interface ToastItem extends ToastOptions {
  id: string
  type: ToastType
  duration: number
  open: boolean
  /** 退出动画进行中（Vue 卸载前先标记，保证 CSS 动画播完）。 */
  exiting: boolean
}

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
/** 读不到 --h-toast-exit-duration 时的兜底，与该令牌的默认值保持一致 */
const FALLBACK_EXIT_MS = 320

/**
 * 退出动画时长。单一来源是皮肤里的 --h-toast-exit-duration —— CSS 的 animation / transition
 * 用的也是它。这里刻意不写死数值：两处各写一份的话，改了皮肤时长而卸载时机没跟上，
 * DOM 就会在动画播完前被卸载，退出动画被截断。
 *
 * 读 documentElement 而不是某个容器：toast viewport 是 portal 到 body 的，只继承 :root
 * 上的变量。皮肤没注入（unstyled / SSR）时退回 FALLBACK_EXIT_MS。
 */
function exitMs(): number {
  if (typeof document === 'undefined') return FALLBACK_EXIT_MS
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--h-toast-exit-duration').trim()
  if (!raw) return FALLBACK_EXIT_MS
  const value = raw.endsWith('ms') ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000
  return Number.isFinite(value) && value > 0 ? value : FALLBACK_EXIT_MS
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
  /** 设置同时最多显示条数（0 = 不限制） */
  maxCount: (n: number) => void
}

/** Toast 的完整状态与操作；每个 app 实例一份（见文件头说明） */
export interface ToastStore {
  /** 当前队列（响应式） */
  toasts: Ref<ToastItem[]>
  /** 全局堆叠位置（运行时可切换） */
  position: Ref<ToastPosition>
  /** 同时最多显示条数（超出丢弃最旧）。默认 3，0 = 不限制 */
  maxCount: Ref<number>
  /** 命令式调用入口：toast('…') / toast.success('…') / … */
  toast: ToastAPI
  push: (opts: ToastOptions) => string
  update: (id: string, partial: Partial<ToastItem>) => void
  remove: (id: string) => void
  /** 触发关闭动画，动画结束后从队列移除。安全可重入 */
  scheduleRemove: (id: string) => void
  dismiss: (id?: string) => void
  setPosition: (p: ToastPosition) => void
  setMaxCount: (n: number) => void
}

/**
 * 创建一个独立的 toast store。请交给 createHorizon() 在 install 时 provide，
 * 不要在模块顶层 new 一个 —— 那就是旧的跨请求泄漏单例。
 */
export function createToastStore(): ToastStore {
  const toasts = ref<ToastItem[]>([])
  const position = ref<ToastPosition>('top-right')
  const maxCount = ref(3)
  // 已进入「退出动画」的 id：防止重复触发 scheduleRemove
  const closing = new Set<string>()
  let seq = 0

  function setPosition(p: ToastPosition): void {
    position.value = p
  }

  function setMaxCount(n: number): void {
    maxCount.value = n
  }

  function push(opts: ToastOptions): string {
    const id = `toast-${++seq}`
    const type = opts.type ?? 'default'
    const duration =
      opts.duration ??
      (type === 'loading' ? LOADING_DURATION : type === 'error' ? ERROR_DURATION : DEFAULT_DURATION)

    const item: ToastItem = {
      id,
      type,
      title: opts.title,
      description: opts.description,
      duration,
      icon: opts.icon,
      action: opts.action,
      class: opts.class,
      open: true,
      exiting: false,
    }

    const next = [item, ...toasts.value]
    toasts.value = next

    // 超出 maxCount：被挤掉的旧 toast 先走退出动画（保留在数组内播放，动画结束后 remove 清出）
    // 不能直接 slice 砍数组——那样 Vue 会立即卸载 DOM，看不到关闭动画
    if (maxCount.value && next.length > maxCount.value) {
      next.slice(maxCount.value).forEach((t) => scheduleRemove(t.id))
    }

    if (Number.isFinite(duration) && duration > 0) {
      window.setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  function update(id: string, partial: Partial<ToastItem>): void {
    toasts.value = toasts.value.map((t) => (t.id === id ? { ...t, ...partial } : t))
    if (partial.duration != null && Number.isFinite(partial.duration) && (partial.duration as number) > 0) {
      window.setTimeout(() => dismiss(id), partial.duration as number)
    }
  }

  function remove(id: string): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
    closing.delete(id)
  }

  function scheduleRemove(id: string): void {
    if (closing.has(id)) return
    closing.add(id)
    // 先标记 exiting → 触发 CSS 退出动画
    const t = toasts.value.find((x) => x.id === id)
    if (t) t.exiting = true
    // 动画播完后再从数组移除（Vue 才会卸载 DOM）；时长取自皮肤令牌，与 CSS 同源
    window.setTimeout(() => remove(id), exitMs())
  }

  function dismiss(id?: string): void {
    if (!id) {
      toasts.value.forEach((t) => {
        t.open = false
        scheduleRemove(t.id)
      })
      return
    }
    const t = toasts.value.find((x) => x.id === id)
    if (t) {
      t.open = false
      scheduleRemove(id)
    }
  }

  const toast = ((message: string, opts?: ToastOptions) =>
    push({ description: message, ...opts })) as ToastAPI

  toast.show = (message, opts) => push({ description: message, ...opts })
  toast.success = (message, opts) => push({ type: 'success', description: message, ...opts })
  toast.error = (message, opts) => push({ type: 'error', description: message, ...opts })
  toast.warning = (message, opts) => push({ type: 'warning', description: message, ...opts })
  toast.info = (message, opts) => push({ type: 'info', description: message, ...opts })
  toast.loading = (message, opts) => push({ type: 'loading', description: message, ...opts })
  toast.dismiss = dismiss
  toast.position = setPosition
  toast.maxCount = setMaxCount
  toast.promise = <T>(
    p: Promise<T>,
    msgs: { loading: string; success: (data: T) => string; error: (err: unknown) => string },
    opts?: ToastOptions
  ): Promise<T> => {
    const id = push({ type: 'loading', description: msgs.loading, ...opts })
    return p.then(
      (data) => {
        update(id, { type: 'success', description: msgs.success(data), duration: DEFAULT_DURATION })
        return data
      },
      (err) => {
        update(id, { type: 'error', description: msgs.error(err), duration: ERROR_DURATION })
        throw err
      }
    )
  }

  return {
    toasts,
    position,
    maxCount,
    toast,
    push,
    update,
    remove,
    scheduleRemove,
    dismiss,
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
