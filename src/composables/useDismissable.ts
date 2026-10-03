/**
 * 「点外部 / Esc 关闭」行为封装。
 *
 * `outside` 默认开着，但**必须允许关掉**：抽屉类界面里，点另一个顶级菜单
 * 会把已展开的那个一起收起 —— 那种场景只该靠「再点同一项」或「切视图」关闭。
 */
import { onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

export interface UseDismissableOptions {
  /** 点击 el 之外时触发 onDismiss，默认 true */
  outside?: boolean
  /** 按 Esc 时触发 onDismiss，默认 true */
  escape?: boolean
}

export function useDismissable(
  elRef: Ref<HTMLElement | null>,
  onDismiss: () => void,
  options: UseDismissableOptions = {}
): void {
  const { outside = true, escape = true } = options

  const onDocumentClick = (event: MouseEvent) => {
    const el = elRef.value
    if (!el) return
    if (el.contains(event.target as Node)) return
    onDismiss()
  }

  const onDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    onDismiss()
  }

  onMounted(() => {
    if (outside) document.addEventListener('click', onDocumentClick)
    if (escape) document.addEventListener('keydown', onDocumentKeydown)
  })

  onUnmounted(() => {
    if (outside) document.removeEventListener('click', onDocumentClick)
    if (escape) document.removeEventListener('keydown', onDocumentKeydown)
  })
}