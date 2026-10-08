<script setup lang="ts">
/**
 * HorizonUI · 图标占位（内部组件，不对外导出）
 *
 * 一个「图标名」按下面的顺序解释，先命中先赢：
 *   1. 图片地址（/、http、data: 开头）→ 直接 <img>，零依赖；
 *   2. 库内置图标集（assets/imgs 的 HORIZON_ICONS）→ 内联 <svg>，库自带的那几个，
 *      保证库组件在宿主没注入渲染器时也有图标可显示（如 Dialog 的关闭按钮）；
 *   3. 宿主注入的图标渲染器（createHorizon({ icon })）→ 其余名字都交给它；
 *   4. 都没命中 → 内联 file-unknown 占位图。宁缺毋滥，但不至于空得莫名其妙。
 *
 * 第 2/4 步内联而不是 <img>：只有内联的 <svg> 才能让 `stroke="currentColor"`
 * 跟随宿主 CSS 的 `color`（主题色），`<img>` 里的 SVG 是隔离文档、继承不到。
 */
import { computed } from 'vue'
import { useHorizonConfig } from '../../config'
import { HORIZON_ICONS, ICON_FALLBACK_BODY, getHorizonIcon } from '../../assets/imgs'

// 显式透传而不是靠自动继承：模板根是多个分支，自动继承在多根下不可靠，
// 宿主给 <HIcon class="..."> 传的类名会丢。
defineOptions({ inheritAttrs: false })

const props = defineProps<{ name?: string }>()

const config = useHorizonConfig()

const isImageUrl = computed(() => {
  const name = props.name ?? ''
  return name.startsWith('/') || name.startsWith('http') || name.startsWith('data:')
})

const renderer = computed(() => config.icon)

/** 库内置图标集命中的图标 */
const builtin = computed(() => (props.name ? getHorizonIcon(props.name) : undefined))

/** 需要内联的 SVG body：内置命中 / 兜底占位；为 undefined 时才交给宿主渲染器 */
const inlineBody = computed(() => {
  if (isImageUrl.value) return undefined
  if (builtin.value) return builtin.value.body
  if (props.name && renderer.value) return undefined
  return ICON_FALLBACK_BODY
})

const viewBox = `0 0 ${HORIZON_ICONS.width} ${HORIZON_ICONS.height}`
</script>

<template>
  <img v-if="isImageUrl" v-bind="$attrs" :src="props.name" alt="" >
  <svg v-else-if="inlineBody" v-bind="$attrs" xmlns="http://www.w3.org/2000/svg" :viewBox="viewBox" width="1em"
    height="1em" v-html="inlineBody" />
  <component :is="renderer" v-else v-bind="$attrs" :name="props.name" />
</template>