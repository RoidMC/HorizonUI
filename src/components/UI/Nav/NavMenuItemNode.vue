<script lang="ts" setup>
/**
 * HorizonUI · NavMenuItemNode —— 子菜单节点（普通链接 / 嵌套子菜单）
 *
 * 由 NavMenuItem 在 drawer / float 两种模式下复用。从 rmc-website 宿主版摘录，
 * 状态机与交互逐条对齐原版（嵌套展开动画、箭头方向、模式差异均未改动），
 * 仅做库化改造：
 *   - label 支持 string | (() => string)（去 i18n 假设）
 *   - 链接经 linkAs 注入（默认 'a'；传路由组件时 href 映射为 to）
 *   - 图标走库内 HIcon
 *   - class 前缀 h-nav-*（与原宿主的 horizon-* 并存不冲突）
 */
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import { useAnimatedSize } from '../../../utils/animated-size'
import HIcon from '../../internal/HIcon.vue'
import { resolveText, type NavSubItem } from './nav-types'

const props = defineProps<{
  item: NavSubItem
  index: number
  mode: 'drawer' | 'float'
  nestedOpen: boolean
  /** 链接组件：'a'（默认）或宿主路由组件（如 NuxtLink） */
  linkAs?: string | Component
}>()

const emit = defineEmits<{
  (e: 'toggle', item: NavSubItem, index: number): void
}>()

// 嵌套子项的渲染 key（与父级 getUniqueKey 同构，仅用于本层 v-for）
const subKey = (subItem: NavSubItem, subIndex: number) =>
  `${resolveText(subItem.label)}-${subIndex}-${subItem.href || ''}`

// 链接属性：原生 a 用 href/target；路由组件（NuxtLink 等）用 to/target
const isNativeLink = computed(() => typeof props.linkAs === 'string' && props.linkAs === 'a')
const linkProps = (href: string | undefined, target: string | undefined) =>
  isNativeLink.value
    ? { href: href || '#', target }
    : { to: href || '#', target }

// 嵌套子菜单开合高度动画（两种模式统一），接入 animated-size
const nestedContentRef = ref<HTMLElement | null>(null)
const {
  preOpen: nestedPreOpen,
  open: nestedEnter,
  postOpen: nestedPostOpen,
  preClose: nestedPreClose,
  close: nestedLeave,
  postClose: nestedPostClose,
} = useAnimatedSize(nestedContentRef)
</script>

<template>
  <div>
    <!-- 普通子菜单项 -->
    <component :is="linkAs || 'a'" v-if="!item.subItems" v-bind="linkProps(item.href, item.linkTarget)"
      class="h-nav-item-dropdown-link">
      <HIcon v-if="item.icon" class="h-nav-item-dropdown-link-icon" :name="item.icon" />
      <span>{{ resolveText(item.label) }}</span>
    </component>

    <!-- 嵌套子菜单项 -->
    <div v-else class="h-nav-item-nested" :class="{ 'h-nav-item-nested--float': mode === 'float' }">
      <div class="h-nav-item-nested-title" @click="emit('toggle', item, index)">
        <HIcon v-if="item.icon" class="h-nav-item-dropdown-link-icon" :name="item.icon" />
        <span>{{ resolveText(item.label) }}</span>
        <span class="h-nav-item-nested-arrow" :data-rotated="nestedOpen ? '' : undefined">
          <HIcon :name="mode === 'float' ? 'tdesign:chevron-right' : 'tdesign:chevron-down'" />
        </span>
      </div>
      <Transition
        :css="false"
        @before-enter="nestedPreOpen"
        @enter="nestedEnter"
        @after-enter="nestedPostOpen"
        @before-leave="nestedPreClose"
        @leave="nestedLeave"
        @after-leave="nestedPostClose"
      >
        <div
          v-if="nestedOpen"
          ref="nestedContentRef"
          class="h-nav-item-nested-content"
        >
        <component
          :is="linkAs || 'a'"
          v-for="(subItem, subIndex) in item.subItems"
          :key="subKey(subItem, subIndex)"
          v-bind="linkProps(subItem.href, subItem.linkTarget)"
          class="h-nav-item-nested-link"
        >
          <HIcon v-if="subItem.icon" class="h-nav-item-dropdown-link-icon" :name="subItem.icon" />
          <span>{{ resolveText(subItem.label) }}</span>
        </component>
      </div>
      </Transition>
    </div>
  </div>
</template>
