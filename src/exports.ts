// 库的公共 API（不含样式副作用）—— styled / unstyled 两个入口共用同一份，避免漂移。
export * from './components/UI'
export { useSkin, useUnstyled } from './composables/useUnstyled'
export { useDirection } from './composables/useDirection'
export { createHorizon, provideHorizon, useHorizonConfig, HORIZON_CONFIG } from './config'
export type { HorizonConfig } from './config'
export { useToast, createToastStore, TOAST_KEY } from './composables/useToast'
export type {
  ToastStore,
  ToastAPI,
  ToastType,
  ToastAction,
  ToastOptions,
  ToastItem,
  ToastPosition,
} from './composables/useToast'
