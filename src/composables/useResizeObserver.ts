/**
 * ResizeObserver 生命周期封装。
 *
 * 存在的理由：手写 `new ResizeObserver(...)` + `disconnect()` 时，最容易漏掉
 * 「target 变化要重新 observe」和「卸载要 disconnect」。这里把两件事都收口，
 * 调用方只关心回调。
 */
import { onMounted, onUnmounted, watch } from 'vue'
import type { Ref } from 'vue'

export interface UseResizeObserverOptions {
  /** 观察盒模型，默认 content-box（与读 contentRect 的直觉一致） */
  box?: ResizeObserverBoxOptions
  /** 是否在组合式函数求值时就开始观察（默认 true）；关掉则等 onMounted */
  immediate?: boolean
}

export function useResizeObserver(
  target: Ref<HTMLElement | null>,
  callback: (entry: ResizeObserverEntry) => void,
  options: UseResizeObserverOptions = {}
): { stop: () => void } {
  const { box = 'content-box', immediate = true } = options

  let observer: ResizeObserver | null = null

  const stop = () => {
    observer?.disconnect()
    observer = null
  }

  const start = (el: HTMLElement | null) => {
    stop()
    if (!el || typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) callback(entry)
    })
    observer.observe(el, { box })
  }

  if (immediate && typeof window !== 'undefined') {
    start(target.value)
  } else {
    onMounted(() => start(target.value))
  }

  watch(target, (el) => start(el))

  onUnmounted(stop)

  return { stop }
}