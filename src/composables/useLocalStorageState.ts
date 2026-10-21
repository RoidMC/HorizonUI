/**
 * localStorage 响应式状态。
 *
 * SSR 直接返回 `ref(initial)`，不读 localStorage（服务端没有 localStorage，
 * 且现有用户偏好不该影响服务端首帧）。客户端读取后 watch 写回。
 *
 * 写回用 try/catch 包住：隐私模式 / 配额满时 localStorage 会抛错，
 * 不该因为「存不下偏好」而中断组件逻辑。
 *
 * 同 key 必须是**模块级单例**：一个偏好往往被多方持有（如 nav 的
 * hover 开关，壳要读它决定展开行为，宿主要读它显示 active 图标）。
 * 若每次调用都新建 `ref`，各方就各持一份内存态、互不感知——宿主改了值，
 * 只有自己那份变，壳的那份不动，于是必须刷新页面（壳重新从 localStorage 读）
 * 才生效。单例化后各方共享同一 ref，改动立刻广播。
 */
import { ref, watch } from 'vue'
import type { Ref } from 'vue'

export interface UseLocalStorageStateOptions<T> {
  serializer?: (value: T) => string
  deserializer?: (raw: string) => T
}

const cache = new Map<string, Ref<unknown>>()

export function useLocalStorageState<T>(
  key: string,
  initial: T,
  options: UseLocalStorageStateOptions<T> = {}
): Ref<T> {
  // SSR 分支**不进缓存**：模块级表会在多次服务端渲染请求间复用并泄漏状态，
  // 且服务端本就无偏好可读，各自返回一次性 ref 即可。
  if (typeof window === 'undefined') return ref(initial) as Ref<T>

  // 命中即直接返回：同一 key 只有一份内存态，首个调用方读取并建立 watch 后，
  // 后续调用方（含 initial/options 不同者）共享它——同 key 本就该是同一份偏好。
  const cached = cache.get(key)
  if (cached) return cached as Ref<T>

  const serialize = options.serializer ?? ((value: T) => JSON.stringify(value))
  const deserialize = options.deserializer ?? ((raw: string) => JSON.parse(raw) as T)

  let stored: T = initial
  try {
    const raw = window.localStorage.getItem(key)
    if (raw !== null) stored = deserialize(raw)
  } catch {
    // 读取失败（隐私模式 / 脏数据）静默退回 initial
  }

  const state = ref(stored) as Ref<T>

  watch(
    state,
    (value) => {
      try {
        if (value === null || value === undefined) {
          window.localStorage.removeItem(key)
        } else {
          window.localStorage.setItem(key, serialize(value))
        }
      } catch {
        // 写入失败不影响内存态，本次会话内仍生效
      }
    },
    { deep: true }
  )

  cache.set(key, state)
  return state
}
