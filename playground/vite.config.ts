import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Horizon UI Vue3 Playground
//
// 它既是 @roidmc/horizon-ui 的用法示例，也是「组件层零 Nuxt 依赖」的哨兵：
// 这里能跑通，就说明宿主换成任何 Vue 3 应用（Vite / 原生 / 其它框架）都能用，
// 而不是只能在 Nuxt 里。
export default defineConfig({
  plugins: [vue()],
  // 库是源码直发（exports 指向 src/*.ts / src/*.scss），必须由本工程的构建链编译，
  // 不能被 optimizeDeps 当成第三方包预打包。
  optimizeDeps: { exclude: ['@roidmc/horizon-ui'] },
})