/**
 * localStorage 响应式状态。
 *
 * SSR 直接返回 `ref(initial)`，不读 localStorage（服务端没有 localStorage，
 * 且现有用户偏好不该影响服务端首帧）。客户端读取后 watch 写回。
 *
 * 写回用 try/catch 包住：隐私模式 / 配额满时 localStorage 会抛错，
 * 不该因为「存不下偏好」而中断组件逻辑。
 */
import { ref, watch } from 'vue'
import type { Ref } from 'vue'

export interface UseLocalStorageStateOptions<T> {
  serializer?: (value: T) => string
  deserializer?: (raw: string) => T
}

export function useLocalStorageState<T>(
  key: string,
  initial: T,
  options: UseLocalStorageStateOptions<T> = {}
): Ref<T> {
  if (typeof window === 'undefined') return ref(initial) as Ref<T>

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

  return state
}