import tdesign from '@iconify-json/tdesign/icons.json'
import { addCollection, Icon } from '@iconify/vue'
import { createHorizon } from '@roidmc/horizon-ui/unstyled'
import '@roidmc/horizon-ui/styles'
import { createApp, defineComponent, h } from 'vue'
import App from './App.vue'

// 图标离线化：把 tdesign 集合注册进 Iconify，免得运行时再去 api.iconify.design 拉。
// 走 icons.json 而不是包入口：包入口的具名导出是 info/metadata/chars/… 的元信息组合，
// 没有默认导出，直接 import 会被 Vite 判成 MISSING_EXPORT。
addCollection(tdesign)

// 库不内置图标集：宿主把自己那套渲染器注入进来。接口约定只有一个 name 属性，
// 组件名 / 库名都不关心。这里用 @iconify/vue，一般 Vue 项目用 @nuxt/icon 或自绘 svg 同理。
const IconRenderer = defineComponent({
  name: 'HorizonIconRenderer',
  props: { name: { type: String, required: true } },
  setup: (props) => () => h(Icon, { icon: props.name }),
})

createApp(App)
  .use(
    createHorizon({
      icon: IconRenderer,
      // 换主题：给 <html> 加 dark 类即可（皮肤里 :root.dark 那段）
      // dir: () => 'rtl',
    })
  )
  .mount('#app')