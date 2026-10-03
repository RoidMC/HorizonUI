// UI 组件出口。
//
// 只导出「已去 Nuxt 化」的组件：从 @roidmc/horizon-ui 导入的组件不得依赖 Nuxt 自动导入
//（图标组件 / 仅客户端包裹 / 翻译函数 / 路由组件），否则会把耦合带进包。
export { default as UIButton } from './Button.vue'
export { default as UIDivider } from './Divider.vue'
export { default as UICheckbox } from './Checkbox.vue'
export { default as UIAvatar } from './Avatar.vue'
export { default as UIQRCode } from './QRCode.vue'
export { default as UIScrollingText } from './ScrollingText.vue'
export { default as UIPanelCard } from './PanelCard.vue'
export { default as UITriangleMask } from './TriangleMask.vue'
export { default as UIAutoSize } from './AutoSize.vue'
export { default as UIInput } from './Input.vue'
export { default as UIDialog } from './Dialog.vue'
export { default as UIHoverCard } from './HoverCard.vue'
export { default as UIToast } from './Toast.vue'
export { default as UIClientOnly } from './ClientOnly.vue'

// 多组件套件走各自目录 + 目录内 index.ts 出口，避免本文件堆成平铺清单
export * from './Layout'
