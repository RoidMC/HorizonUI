<script setup lang="ts">
// UIFieldValidity —— 无渲染的字段状态出口（reka FieldValidity）。
//
// 不产出任何元素、不挂类名，故没有 unstyled 开关：只把同字段的
// { validity, errors, error, value, initialValue } 通过作用域插槽交出来，
// 供宿主在字段内做自定义展示（自己画错误文案、把错误映射成色条等）。
import { FieldValidity } from 'reka-ui'

// 无根元素，透传属性无处安放：关掉继承以免 Vue 抛「组件有多个根节点」类告警。
defineOptions({ inheritAttrs: false })
</script>

<template>
  <FieldValidity v-bind="$attrs">
    <template #default="scope">
      <slot v-bind="scope" />
    </template>
  </FieldValidity>
</template>