<script setup lang="ts">
/**
 * HorizonUI · ClientOnly —— 只客户端渲染的插槽包裹。
 *
 * ⚠️ 必须 onMounted 置位，不能用 onBeforeMount：早一帧渲染会先于 Nuxt 内置
 *    ClientOnly 产出内容，重新引入水合不一致（服务端 HTML 与客户端首帧不一致）。
 * 未挂载前渲染 `fallback` 插槽（默认空）。
 *
 * 不输出任何包装元素，因此没有 unstyled / as。
 */
import { onMounted, ref } from 'vue'

const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <slot v-if="mounted" />
  <slot v-else name="fallback" />
</template>