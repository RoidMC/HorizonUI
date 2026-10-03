/**
 * 浮层定位（fixed 定位 + 视口内翻转/钳制）。
 *
 * 定位算法本身是纯函数 {@link computeFloatingPlacement}：只吃 DOMRect 与视口尺寸，
 * 不碰 DOM、不读全局状态，因此可以脱离浏览器单测边界用例（翻转 / 钳制 / RTL）。
 *
 * ⚠️ RTL 走库自己的 `useDirection()`（真相源是 createHorizon({ dir })），
 * **不读** `<html dir>` —— 那通常是宿主在 onMounted 里兜底写回的，拿它当源是循环依赖。
 *
 * 重算时机：window resize + trigger 尺寸变化 + transitionend（展开动画会改变
 * 触发器宽度，动画结束需要一个最终对齐）。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { CSSProperties, ComputedRef, Ref } from 'vue'
import { useDirection } from './useDirection'
import { useResizeObserver } from './useResizeObserver'

export interface FloatingPositionOptions {
  /** 优先侧，默认 'right' */
  side?: 'right' | 'left' | 'top' | 'bottom'
  /** 交叉轴对齐，默认 'start'（与触发器起始边齐平） */
  align?: 'start' | 'end' | 'center'
  /** 与触发器的间距，默认 4 */
  gap?: number
  /** 视口内边距，默认 8 */
  padding?: number
  /** 放不下时翻到另一侧，默认 true */
  flip?: boolean
  /** 仍越界则钳制并限宽/限高，默认 true */
  clamp?: boolean
}

export interface FloatingPlacement {
  left?: number
  top?: number
  bottom?: number
  maxWidth?: number
  maxHeight?: number
  /** 实际落位侧（翻转后可能与优先侧不同） */
  side: 'right' | 'left' | 'top' | 'bottom'
}

const opposite = (side: NonNullable<FloatingPositionOptions['side']>) =>
  side === 'right' ? 'left' : side === 'left' ? 'right' : side === 'top' ? 'bottom' : 'top'

const isVertical = (side: FloatingPositionOptions['side']) => side === 'top' || side === 'bottom'

/** 纯几何计算：无 DOM 依赖，可单测 */
export function computeFloatingPlacement(
  trigger: DOMRect,
  content: { width: number; height: number },
  viewport: { width: number; height: number },
  isRtl: boolean,
  options: FloatingPositionOptions = {}
): FloatingPlacement {
  const { gap = 4, padding = 8, flip = true, clamp = true, align = 'start' } = options
  // 水平优先侧按阅读方向镜像：LTR 优先右侧（阅读结束方向），RTL 优先左侧
  const preferred = options.side ?? 'right'
  const primary = isVertical(preferred)
    ? preferred
    : isRtl
      ? preferred === 'right'
        ? 'left'
        : 'right'
      : preferred

  const result: FloatingPlacement = { side: primary }

  if (!isVertical(primary)) {
    const fits = (side: 'left' | 'right') =>
      side === 'right'
        ? trigger.right + gap + content.width <= viewport.width - padding
        : trigger.left - gap - content.width >= padding

    let side: 'left' | 'right' = primary as 'left' | 'right'
    if (!fits(side) && flip) {
      const alt = opposite(side) as 'left' | 'right'
      if (fits(alt)) side = alt
    }
    result.side = side

    let left = side === 'right' ? trigger.right + gap : trigger.left - gap - content.width

    // 交叉轴对齐：与触发器起始/结束/中心边对齐，再整体钳制进视口
    let top: number
    if (align === 'end') top = trigger.bottom - content.height
    else if (align === 'center') top = trigger.top + (trigger.height - content.height) / 2
    else top = trigger.top

    if (clamp) {
      if (left < padding) {
        left = padding
        result.maxWidth = viewport.width - padding * 2
      } else if (left + content.width > viewport.width - padding) {
        left = viewport.width - padding - content.width
      }
      if (top < padding) top = padding
      if (top + content.height > viewport.height - padding) {
        top = Math.max(padding, viewport.height - padding - content.height)
      }
      result.maxHeight = viewport.height - padding * 2
    }

    result.left = left
    result.top = top
    return result
  }

  // 上下侧：垂直翻转 + 水平对齐，再钳制
  const fitsVertical = (side: 'top' | 'bottom') =>
    side === 'bottom'
      ? trigger.bottom + gap + content.height <= viewport.height - padding
      : trigger.top - gap - content.height >= padding

  let side = primary as 'top' | 'bottom'
  if (!fitsVertical(side) && flip) {
    const alt = opposite(side) as 'top' | 'bottom'
    if (fitsVertical(alt)) side = alt
  }
  result.side = side

  let left: number
  if (align === 'end') left = trigger.right - content.width
  else if (align === 'center') left = trigger.left + (trigger.width - content.width) / 2
  else left = trigger.left

  const top = side === 'bottom' ? trigger.bottom + gap : trigger.top - gap - content.height

  if (clamp) {
    if (left < padding) {
      left = padding
      result.maxWidth = viewport.width - padding * 2
    } else if (left + content.width > viewport.width - padding) {
      result.maxWidth = viewport.width - padding * 2
      left = Math.max(padding, viewport.width - padding - content.width)
    }
    if (top < padding) {
      result.maxHeight = viewport.height - padding * 2
    }
  }

  result.left = left
  result.top = top
  return result
}

export interface UseFloatingPositionReturn {
  style: ComputedRef<CSSProperties>
  visible: Ref<boolean>
  show: () => void
  hide: () => void
  /** 手动重算（如嵌套菜单展开后内容变高） */
  update: () => void
}

export function useFloatingPosition(
  triggerRef: Ref<HTMLElement | null>,
  contentRef: Ref<HTMLElement | null>,
  options: FloatingPositionOptions = {}
): UseFloatingPositionReturn {
  const { isRtl } = useDirection()

  const visible = ref(false)
  // 版本号驱动：DOMRect / offsetWidth 不是响应式的，靠手动 bump 触发 computed 重算
  const version = ref(0)

  const style = computed<CSSProperties>(() => {
    void version.value
    const trigger = triggerRef.value
    const content = contentRef.value
    if (!trigger || !content || typeof window === 'undefined') {
      return { position: 'fixed', zIndex: 'var(--h-z-popover, 800)' }
    }

    const placement = computeFloatingPlacement(
      trigger.getBoundingClientRect(),
      { width: content.offsetWidth, height: content.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      isRtl.value,
      options
    )

    const out: CSSProperties = { position: 'fixed', zIndex: 'var(--h-z-popover, 800)' }
    if (placement.left !== undefined) out.left = `${placement.left}px`
    if (placement.top !== undefined) out.top = `${placement.top}px`
    if (placement.maxWidth !== undefined) out.maxWidth = `${placement.maxWidth}px`
    if (placement.maxHeight !== undefined) out.maxHeight = `${placement.maxHeight}px`
    return out
  })

  const update = () => {
    version.value += 1
  }

  const show = () => {
    visible.value = true
    nextTick(update)
  }

  const hide = () => {
    visible.value = false
  }

  // 触发器尺寸变化（展开动画会改宽）与过渡结束后的最终对齐
  useResizeObserver(triggerRef, () => {
    if (visible.value) update()
  })

  onMounted(() => {
    window.addEventListener('resize', update)
    window.addEventListener('transitionend', update, true)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
    window.removeEventListener('transitionend', update, true)
  })

  watch(visible, (v) => {
    if (v) nextTick(update)
  })

  return { style, visible, show, hide, update }
}