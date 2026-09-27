<script setup lang="ts">
// HorizonUI · AutoSize —— 内容切换时「容器尺寸平滑过渡 + 内容淡入淡出」。
//
// 为什么必须抽成组件（而不是各处自己写一遍）：
//   它背后是 useAnimatedSize 的内容替换模式，那个模式有**三条铁律**
//   （ResizeObserver 跟随内容高度 / 兜底定时器保证释放 / 用 offsetHeight 而非
//   getBoundingClientRect，因为进场带 scale 时 rect 会读到缩放后的尺寸）。
//   只要复制一份，这三条就迟早漏掉一条 —— 漏的后果是"锁定高度比真实内容矮一行,
//   最后一行被裁掉且不会自动恢复"。所以只允许存在这一份实现。
//
// 用法：
//   <UIAutoSize :content-key="someKey"><!-- 内容 --></UIAutoSize>
//   contentKey 变化 → 容器宽高过渡 + 内容交叉淡入淡出；
//   contentKey 恒定时 <Transition> 与钩子都不触发，零开销（不需要动画就别传）。
//
// ⚠️ contentKey 变化会**重建 slot 内容**（Vue 按 key 换元素）。
//    含输入框且需要保持焦点的场景不要用 —— 那种应该用 useAnimatedSize 的
//    「开合模式」逐块做（见 MFAStepDialog 里错误提示的写法）。
//
// 独立成 HorizonUI 的前提：本组件不依赖任何业务（无 branding / 无 i18n / 无路由），
//   只吃 contentKey 与 duration。
import { ref } from 'vue'
import { useAnimatedSize } from '../../utils/animated-size'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /** 内容切换键：值一变就触发过渡。不传 = 静态内容，不产生任何动画与内联样式 */
  contentKey?: string | number
  /** 过渡时长（毫秒）。⚠️ 与下方 CSS 的「进场时长 + 延迟」是配套的，改一个要改另一个 */
  duration?: number
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}>(), {
  contentKey: undefined,
  duration: 320,
})

const { unstyled, skin } = useSkin(() => props.unstyled)

const wrapRef = ref<HTMLElement | null>(null)
// 缓动不传：走工具默认值（长高 = --h-motion-ease-ios 那条 iOS 减速曲线；收短 = 对称曲线）。
// 高度**不能**用带过冲的曲线 —— 收起时会先缩到比内容更矮，末行会被裁。
const { beforeLeave, enter, afterEnter } = useAnimatedSize(wrapRef, { duration: props.duration })

// ⚠️ 脱皮模式：库自带的 fade CSS 不存在，Vue 读不到 transition-duration 会**立刻**触发
//    after-enter，从而在 JS 尺寸过渡（duration，默认 320ms）走完之前就 clearSize()，
//    把平滑变形掐掉。这里直接 return，交给 useAnimatedSize 内部的兜底定时器
//    （本就晚于 CSS 时长）单独负责收尾。
const onAfterEnter = () => {
  if (unstyled.value) return
  afterEnter()
}
</script>

<template>
  <div ref="wrapRef" v-bind="$attrs" :class="skin('h-auto-size')">
    <Transition name="h-auto-size-fade" @before-leave="beforeLeave" @enter="enter"
      @after-enter="onAfterEnter">
      <div :key="props.contentKey ?? 'static'" :class="skin('h-auto-size-inner')">
        <slot />
      </div>
    </Transition>
  </div>
</template>
