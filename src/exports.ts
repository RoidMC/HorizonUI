// 库的公共 API（不含样式副作用）—— styled / unstyled 两个入口共用同一份，避免漂移。
export * from './components/UI'
export { useSkin, useUnstyled } from './composables/useUnstyled'
export { useDirection } from './composables/useDirection'
export { createHorizon, provideHorizon, useHorizonConfig, HORIZON_CONFIG } from './config'
export type { HorizonConfig } from './config'
export { useToast, createToastStore, TOAST_KEY } from './composables/useToast'
export { useAnimatedSize } from './utils/animated-size'
export type { AnimatedSizeOptions } from './utils/animated-size'
export { useBreakpoint, BREAKPOINTS } from './composables/useBreakpoint'
export type { BreakpointKey, UseBreakpointOptions, UseBreakpointReturn } from './composables/useBreakpoint'
export { useLocalStorageState } from './composables/useLocalStorageState'
export type { UseLocalStorageStateOptions } from './composables/useLocalStorageState'
export { useResizeObserver } from './composables/useResizeObserver'
export type { UseResizeObserverOptions } from './composables/useResizeObserver'
export { useDismissable } from './composables/useDismissable'
export type { UseDismissableOptions } from './composables/useDismissable'
export { useFloatingPosition, computeFloatingPlacement } from './composables/useFloatingPosition'
export type {
  FloatingPositionOptions,
  FloatingPlacement,
  UseFloatingPositionReturn,
} from './composables/useFloatingPosition'
export type {
  ToastStore,
  ToastAPI,
  ToastType,
  ToastAction,
  ToastOptions,
  ToastItem,
  ToastPosition,
} from './composables/useToast'
