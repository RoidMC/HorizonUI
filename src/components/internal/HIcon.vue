<script setup lang="ts">
/**
 * HorizonUI · 图标占位（内部组件，不对外导出）
 *
 * 库不内置图标集。一个「图标名」只有两种合法解释：
 *   - 图片地址（/、http、data: 开头）→ 直接 <img>，零依赖；
 *   - 其余交给宿主注入的图标渲染器（createHorizon({ icon })），库不认识 iconify 之类的名字。
 * 宿主没注入渲染器时什么都不渲染：宁缺毋滥，不抛错也不塞占位节点。
 */
import { computed } from 'vue'
import { useHorizonConfig } from '../../config'

// 显式透传而不是靠自动继承：模板根是 v-if / v-else 两个分支，
// 自动继承在多根下不可靠，宿主给 <HIcon class="..."> 传的类名会丢。
defineOptions({ inheritAttrs: false })

const props = defineProps<{ name?: string }>()

const config = useHorizonConfig()

const isImageUrl = computed(() => {
  const name = props.name ?? ''
  return name.startsWith('/') || name.startsWith('http') || name.startsWith('data:')
})

const renderer = computed(() => config.icon)
</script>

<template>
  <img v-if="props.name && isImageUrl" v-bind="$attrs" :src="props.name" alt="" />
  <component :is="renderer" v-else-if="props.name && renderer" v-bind="$attrs" :name="props.name" />
</template>
