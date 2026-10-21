<script lang="ts" setup>
/**
 * HorizonUI · NavMenuItem —— 导航菜单项（drawer / float 双模式 + 嵌套子树）
 *
 * 从 rmc-website 宿主的 NavMenuItem 摘录。**状态机与原宿主版逐行对齐，未做任何
 * “顺手优化”**——这片区域的交互规则是被真实问题打磨出来的，改动前先读
 * rmc-website/app/components/Layout/Nav/ 的原版与验收清单：
 *   1. drawer 模式刻意不响应点击外部关闭（否则多个顶级菜单只能开一个）
 *   2. float 模式 hover 进入立即展开、离开延迟 50ms（等 leave 动画）
 *   3. Esc 关 float / drawer；外部点击只关 float
 *   4. 主链接有子菜单时阻止默认跳转，仅 drawer 模式额外切换下拉开合
 *   5. 父级 isExpanded 变 false 时延迟收起 float；快速再展开取消待定隐藏
 *   6. mode 切换时隐藏 float、drawer 关下拉
 *
 * 库化改造点（仅这些，别多改）：
 *   - label 支持 string | (() => string)；链接经 linkAs 注入（NuxtLink 时 href→to）
 *   - Icon → HIcon；horizon-* class → h-nav-*；useSkin 脱皮开关
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import type { Component } from 'vue'
import NavMenuItemNode from './NavMenuItemNode.vue'
import HIcon from '../../internal/HIcon.vue'
import { useSkin } from '../../../composables/useUnstyled'
import { useAnimatedSize } from '../../../utils/animated-size'
import { useFloatingPosition } from '../../../composables/useFloatingPosition'
import { useDismissable } from '../../../composables/useDismissable'
import { resolveText, type NavSubItem } from './nav-types'

interface Props {
  icon: string
  label: string | (() => string)
  href?: string
  subItems?: NavSubItem[]
  isExpanded: boolean
  mode: 'drawer' | 'float'
  linkTarget?: string
  /** 链接组件：'a'（默认）或宿主路由组件（如 NuxtLink，此时 href 映射为 to） */
  linkAs?: string | Component
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  href: '#',
  subItems: () => [],
  mode: 'drawer',
  linkTarget: undefined,
  linkAs: 'a'
})

const { skin } = useSkin(() => props.unstyled)

const isOpen = ref(false)
const menuItemRef = ref<HTMLElement | null>(null)
const expandMenuRef = ref<HTMLElement | null>(null)
const nestedOpenState = ref<Record<string, boolean>>({}) // 使用唯一键存储嵌套子菜单状态
const floatMenuRef = ref<HTMLElement | null>(null)
const hideTimer = ref<ReturnType<typeof setTimeout> | null>(null) // 延迟隐藏定时器
// 收起浮层前的预延迟（ms）：触发 Vue Transition 的 leave 动画前先等一拍；
// 真正的淡出时长由 .h-nav-item-menu--float 的 CSS 决定，这里只控制「何时开始隐藏」。
const FLOAT_MENU_HIDE_DELAY = 50

// 悬浮菜单定位交给库原语：RTL 镜像、翻转、钳制、resize/transitionend 重算全部内建。
// z-index 覆盖回 --h-z-nav（原实现用值），保持与导航容器的层叠关系不变。
const {
  style: floatStyle,
  visible: isFloatVisible,
  show: showFloatMenuAt,
  hide: hideFloatMenuNow,
  update: updateFloatPosition,
} = useFloatingPosition(menuItemRef, floatMenuRef, { side: 'right', align: 'start', gap: 4, padding: 8 })

const floatMenuStyle = computed(() => ({ ...floatStyle.value, zIndex: 'var(--h-z-nav)' }))

const hasSubMenu = computed(() => props.subItems && props.subItems.length > 0)

// drawer 模式：内嵌抽屉菜单（当前仅移动端 h5menu 使用，需 isExpanded 配合）
const isDrawerMode = computed(() => props.mode === 'drawer' && props.isExpanded)

// 悬浮模式：只要 mode 为 float，无论 isExpanded 是什么值
const isFloatMode = computed(() => props.mode === 'float')

// 生成唯一键（label 可能是函数，先求值再参与 key）
const getUniqueKey = (item: NavSubItem, index: number) => {
  return `${resolveText(item.label)}-${index}-${item.href || ''}`
}

// 展开菜单开合高度动画（丝滑 0 ↔ auto），接入 animated-size
const {
  preOpen: expandPreOpen,
  open: expandOpen,
  postOpen: expandPostOpen,
  preClose: expandPreClose,
  close: expandClose,
  postClose: expandPostClose,
} = useAnimatedSize(expandMenuRef)

// 立即隐藏并清理悬浮菜单状态（供 hideFloatMenu / Esc / 外部点击复用）
const resetFloatMenu = () => {
  hideFloatMenuNow()
  nestedOpenState.value = {}
  if (hideTimer.value) {
    clearTimeout(hideTimer.value)
    hideTimer.value = null
  }
}

const showFloatMenu = () => {
  if (!isFloatMode.value || !hasSubMenu.value) return

  // 取消任何待定的隐藏
  if (hideTimer.value) {
    clearTimeout(hideTimer.value)
    hideTimer.value = null
  }

  showFloatMenuAt()
}

// 延迟隐藏：先等一拍让 leave 动画有缓冲，真正的淡出由 CSS 控制
const hideFloatMenu = () => {
  if (hideTimer.value) clearTimeout(hideTimer.value)
  hideTimer.value = setTimeout(resetFloatMenu, FLOAT_MENU_HIDE_DELAY)
}

const toggleDropdown = () => {
  if (!hasSubMenu.value || isFloatMode.value) return

  isOpen.value = !isOpen.value

  if (!isOpen.value) {
    // 重置嵌套子菜单状态
    nestedOpenState.value = {}
  }
}

const toggleNestedDropdown = (item: NavSubItem, index: number) => {
  const key = getUniqueKey(item, index)
  nestedOpenState.value[key] = !nestedOpenState.value[key]
  // 嵌套菜单展开/收起时更新位置
  nextTick(() => {
    if (isFloatVisible.value) updateFloatPosition()
  })
}

const closeDropdown = () => {
  if (isDrawerMode.value) {
    isOpen.value = false
    nestedOpenState.value = {}
  }
}

// 仅悬浮模式才需要 hover 触发，展开模式直接 no-op（避免无谓监听副作用）
const onItemEnter = () => {
  if (isFloatMode.value) showFloatMenu()
}
const onItemLeave = () => {
  if (isFloatMode.value) hideFloatMenu()
}

// 链接属性：原生 a 用 href/target；路由组件（NuxtLink 等）用 to/target
const isNativeLink = computed(() => typeof props.linkAs === 'string' && props.linkAs === 'a')
const linkProps = computed(() =>
  isNativeLink.value
    ? { href: props.href, target: props.linkTarget }
    : { to: props.href, target: props.linkTarget }
)

// 主链接点击：有子菜单时一律阻止默认跳转（float 模式下 href 默认 '#'，点击会滚回页顶），
// 仅展开模式额外切换下拉开合
const onLinkClick = (e: MouseEvent) => {
  if (hasSubMenu.value) {
    e.preventDefault()
    if (isDrawerMode.value) {
      toggleDropdown()
    }
  }
}

// 点击组件外部关闭悬浮菜单（菜单本身是 menuItemRef 的子节点，不受影响）。
// ⚠️ drawer 模式刻意不响应点击外部：否则点开另一个顶级菜单项时会把已展开的一起收起，
// 导致「同时只能开一个」。drawer 改为仅靠再次点击同一项 / 收起整个菜单 / 切换视图关闭。
useDismissable(
  menuItemRef,
  () => {
    if (isFloatVisible.value) resetFloatMenu()
  },
  { outside: true, escape: false }
)

// Esc 关闭悬浮菜单与展开下拉
useDismissable(
  menuItemRef,
  () => {
    if (isFloatVisible.value) resetFloatMenu()
    if (isDrawerMode.value && isOpen.value) closeDropdown()
  },
  { outside: false, escape: true }
)

watch(() => props.isExpanded, (newVal) => {
  if (!newVal && isDrawerMode.value) {
    closeDropdown()
  }

  // 快速重新展开时取消待定的隐藏，避免悬浮菜单被旧定时器关闭
  if (newVal && hideTimer.value) {
    clearTimeout(hideTimer.value)
    hideTimer.value = null
  }

  // 收回时延迟隐藏，让菜单跟随过渡完成
  if (isFloatVisible.value && !newVal && !hideTimer.value) {
    hideTimer.value = setTimeout(resetFloatMenu, FLOAT_MENU_HIDE_DELAY)
  }
})

watch(() => props.mode, () => {
  // 切换模式时隐藏悬浮菜单
  hideFloatMenu()
  // 切换到 drawer 模式时关闭下拉菜单
  if (isDrawerMode.value) {
    closeDropdown()
  }
})

onUnmounted(() => {
  if (hideTimer.value) {
    clearTimeout(hideTimer.value)
    hideTimer.value = null
  }
})
</script>

<template>
  <div ref="menuItemRef" :data-open="isDrawerMode && isOpen ? '' : undefined" :class="[skin('h-nav-item'), {
    // --has-submenu：无 CSS 样式，但作为 JS 调试/hook 锚点保留
    'h-nav-item--has-submenu': hasSubMenu,
    'h-nav-item--float': isFloatMode
  }]" @mouseenter="onItemEnter" @mouseleave="onItemLeave">
    <!-- 主菜单项 -->
    <component :is="isNativeLink ? 'a' : linkAs" v-bind="linkProps" class="h-nav-item-link"
      @click="onLinkClick">
      <HIcon class="h-nav-item-icon" :name="icon" />
      <span v-if="isExpanded" class="h-nav-item-text">{{ resolveText(label) }}</span>
      <span v-if="hasSubMenu && isDrawerMode" class="h-nav-item-dropdown-icon"
        :data-rotated="isOpen ? '' : undefined">
        <HIcon name="tdesign:chevron-down" />
      </span>
    </component>

    <!-- drawer 模式：内嵌下拉菜单（丝滑高度开合，由 animated-size 驱动） -->
    <Transition
      :css="false"
      @before-enter="expandPreOpen"
      @enter="expandOpen"
      @after-enter="expandPostOpen"
      @before-leave="expandPreClose"
      @leave="expandClose"
      @after-leave="expandPostClose"
    >
      <div
        v-if="isOpen && hasSubMenu && isDrawerMode"
        ref="expandMenuRef"
        class="h-nav-item-menu h-nav-item-menu--drawer"
      >
        <!-- 内层承接 padding/背景：border-box 下 height 动画容器若自带 padding，
             height 小于 padding 之和时会被钳制在 padding 高度（content 压缩为 0），
             表现为开合首尾先蹦出一条 padding 底色条。动画层必须保持纯高度。 -->
        <div class="h-nav-item-menu--drawer-inner">
          <!-- 子菜单项 -->
          <NavMenuItemNode
            v-for="(item, index) in subItems"
            :key="getUniqueKey(item, index)"
            :item="item"
            :index="index"
            mode="drawer"
            :nested-open="nestedOpenState[getUniqueKey(item, index)] ?? false"
            :link-as="linkAs"
            @toggle="toggleNestedDropdown"
          />
        </div>
      </div>
    </Transition>

    <!-- 悬浮模式：固定定位下拉菜单 -->
    <Transition name="h-nav-float-menu">
      <div ref="floatMenuRef" v-show="isFloatVisible" class="h-nav-item-menu h-nav-item-menu--float" :style="floatMenuStyle"
        @mouseenter="showFloatMenu" @mouseleave="hideFloatMenu">
        <!-- 下拉菜单标题 -->
        <div class="h-nav-item-title">{{ resolveText(label) }}</div>

        <!-- 子菜单项 -->
        <NavMenuItemNode
          v-for="(item, index) in subItems"
          :key="getUniqueKey(item, index)"
          :item="item"
          :index="index"
          mode="float"
          :nested-open="nestedOpenState[getUniqueKey(item, index)] ?? false"
          :link-as="linkAs"
          @toggle="toggleNestedDropdown"
        />
      </div>
    </Transition>
  </div>
</template>
