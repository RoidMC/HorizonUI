<script lang="ts" setup>
/**
 * HorizonUI · NavShell —— 导航应用骨架（Nav 套件的容器层）
 *
 * 把「断点驱动的导航布局」收成一个组件：宿主给零件（items / actions / logo）
 * 和内容（default slot），布局行为全部内置——这正是把 rmc-website 与
 * KexCore frontend 各自会复制一遍的容器逻辑关进笼子。
 *
 * 内置行为（从宿主 Navmenu 摘录，时序与老版一致）：
 *   1. 断点驱动：isBelow(breakpoint)（默认 lg ⟺ width < 1024）+ forceView 强制覆盖
 *   2. 视图切换状态机：displayMobileView + switchView + isNavAnimating
 *   3. 移动→桌面：h5menu 先收回（等 height 过渡的 finished）再切视图
 *   4. containerDirection：保持旧布局方向直到「窗口」全部关闭——窗口有两个：
 *      nav 自身 Transition 的播放期间（isNavAnimating）与上述收抽屉的等待期间
 *      （isCollapsingDrawer）。这是「丝滑」的关键：窗口内翻转会让内容在 nav 退场
 *      前硬跳，收抽屉期间更会让 fixed menubar 压住已变全宽/顶部对齐的内容
 *   5. 桌面 hover 展开：always-expanded 持久化 + hover 150ms 防抖 + 触屏失效
 *   6. data-input：指针类型判定，挂容器属性（触屏防护规则的选择器根）
 *   7. 触屏语义：触摸 logo/空白区折叠、触摸内容区不收（鼠标端由 mouseleave 防抖收起）
 *
 * 数据归属：items / actions / logo / linkAs 全部经 props 注入，库不预设任何
 * 站点内容——两个宿的信息架构不同，但布局行为共通。
 *
 * 状态归属：断点形态 / 动画窗口 / 内容列方向 / 抽屉开合都归壳，经 useNavShell()
 * 向内容插槽内的组件暴露（见 useNavShell.ts）。
 *
 * 用法（Nuxt）：
 *   <UNavShell :items="navItems" :actions="actions" :logo="logoUrl" :link-as="NuxtLink">
 *     <YourPageContent />
 *   </UNavShell>
 */
import { computed, nextTick, onUnmounted, provide, ref, watch } from 'vue'
import type { Component } from 'vue'
import NavMenuItem from './NavMenuItem.vue'
import WidgetActions from './WidgetActions.vue'
// 库自己的 ClientOnly（不是 Nuxt 的）——库零 Nuxt 依赖
import ClientOnly from '../ClientOnly.vue'
import HIcon from '../../internal/HIcon.vue'
import { useBreakpoint } from '../../../composables/useBreakpoint'
import { useLocalStorageState } from '../../../composables/useLocalStorageState'
import { type NavItem, type NavText, type WidgetAction } from './nav-types'
import { NAV_SHELL_KEY, NAV_STORAGE_KEYS, type NavShellContext } from './useNavShell'

interface Props {
  /** 菜单数据；label 支持 string | (() => string)（去 i18n 假设） */
  items?: NavItem[]
  /** logo 图片地址；不传则不渲染 logo 区 */
  logo?: string
  /** 操作区按钮；不传则不渲染 widgets 区 */
  actions?: WidgetAction[]
  /** 链接组件：'a'（默认）或宿主路由组件（如 NuxtLink，href 映射为 to） */
  linkAs?: string | Component
  /** 移动/桌面分界断点：视口宽小于该断点即移动态。默认 'lg'（<1024） */
  breakpoint?: string
  /** 操作区右下角装饰文本 */
  decorText?: string
  /** 「更多」按钮文案，默认 'More' */
  moreLabel?: NavText
  /** 操作区轮播页码无障碍标签生成器（默认英文），宿主可注入本地化文案 */
  pageLabel?: (current: number, total: number) => string
  /** 强制视图形态（验收/调试用）：'mobile' | 'desktop'；不传则按 breakpoint 自动判定 */
  forceView?: 'mobile' | 'desktop'
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  logo: undefined,
  actions: () => [],
  linkAs: 'a',
  breakpoint: 'lg',
  decorText: 'HORIZON',
  moreLabel: 'More',
  pageLabel: undefined
})

// ============ 断点 ============
const bp = useBreakpoint()
// forceView 优先于断点：用于强制复现边界形态（与老 Navmenu 的 dev 强制开关等价）
const isMobileView = computed(() =>
  props.forceView ? props.forceView === 'mobile' : bp.isBelow(props.breakpoint).value
)

// ============ 视图切换状态机 ============
const displayMobileView = ref(isMobileView.value)
// 动画窗口：nav 自身的进/出场过渡播放期间为 true，用于「其间保持旧布局方向」
const isNavAnimating = ref(false)
const h5MenuRef = ref<HTMLElement | null>(null)

const switchView = (mobile: boolean) => {
  if (displayMobileView.value === mobile) return
  displayMobileView.value = mobile
  isNavAnimating.value = true
}

// 动画窗口的终点：时长归 CSS 所有（.h-nav-transition-* 持 --h-nav-transition-duration），
// Vue 从 computedStyle 探测真实时长，JS 不再读变量、也不再持 400ms 常量。
// 语义终点是 after-leave——旧元素退场完毕即可翻转布局方向（与老版定时等价）；
// after-enter 仅作兜底清位，避免 leave 未触发时窗口永久为真。
const endNavAnimation = () => { isNavAnimating.value = false }

// 移动→桌面：先把移动抽屉收回，等收回真正结束（不是猜时长）再切视图
let pendingSwitchSeq = 0
let pendingSwitchTo: boolean | null = null

// 「先收抽屉、再切视图」这条路径自带的等待窗口：抽屉开始收到收完为止。
// 它与 isNavAnimating（Vue 过渡窗口）并列，都是「壳保持旧布局方向」的窗口——
// 这段窗口里 isMobileView 已翻成 false、displayMobileView 却仍是 mobile，若不
// 计入，containerDirection 会立刻返回 row：内容区瞬间变全宽 + 顶部对齐（row 分支
// 的 height:100dvh / overflow-y:auto），而仍在渲染的 fixed menubar 就压在内容顶上
// （内容标题被 bar 遮住），抽屉收起动画也会在错误的布局里播。
const isCollapsingDrawer = ref(false)

/**
 * 等元素上「正在播放的 height 过渡」结束：时长由 CSS 拥有，JS 只等 finished。
 * 只认 height —— 收回同时带 opacity 0.35s（更短），等 height 才等于「完全收回」
 * （与老版 transitionend 只响应 height 同理，但不再需要时长兜底）。
 * 无过渡可等（reduced-motion / 元素不在 DOM）时立即返回。
 */
const waitForHeightTransition = async (el: HTMLElement | null): Promise<void> => {
  if (!el) return
  await nextTick()
  // 类刚翻转时样式未必已提交，过渡可能尚未开始；等一帧再取
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  const heightAnims = el.getAnimations().filter(
    (a): a is CSSTransition => a instanceof CSSTransition && a.transitionProperty === 'height'
  )
  await Promise.allSettled(heightAnims.map((a) => a.finished))
}

const cancelPendingSwitch = () => {
  // 序号前进即让在途的切换作废（switchToDesktopAfterMenuCollapse 里比对序号）
  pendingSwitchSeq += 1
  pendingSwitchTo = null
  // 本次「收抽屉」窗口一并作废并归还布局方向：断点又变回移动态时不会再有 Vue 过渡
  // 来收尾（displayMobileView 本来就是 mobile，switchView 会提前 return），窗口若
  // 留着就会让方向永久停在 column。
  isCollapsingDrawer.value = false
}

const finishPendingSwitch = () => {
  const target = pendingSwitchTo
  pendingSwitchTo = null
  // 收起已结束，窗口交接给 switchView 打开的 Vue 过渡窗口
  isCollapsingDrawer.value = false
  if (target !== null) switchView(target)
}

const switchToDesktopAfterMenuCollapse = (desktop: boolean) => {
  drawerOpen.value = false
  pendingSwitchTo = desktop
  isCollapsingDrawer.value = true
  const seq = ++pendingSwitchSeq
  void waitForHeightTransition(h5MenuRef.value).then(() => {
    // 收回期间断点又变了 → 本次切换作废，以最新一次为准
    if (seq !== pendingSwitchSeq) return
    finishPendingSwitch()
  })
}

watch(isMobileView, (newVal, oldVal) => {
  if (newVal === oldVal) return
  // 断点再变化时，取消尚未完成的延迟切换
  cancelPendingSwitch()

  // 从移动端切到桌面端：若 h5menu 展开，先收回、收回完成后再切换；否则直接切换
  if (!newVal && oldVal && drawerOpen.value) {
    switchToDesktopAfterMenuCollapse(newVal)
  } else {
    switchView(newVal)
  }
})

// ============ 布局方向：nav 过渡期间保持旧方向，结束后才翻转 ============
// 断点切换时 nav 自身的 Transition 要播完 leave，若 flex 方向立即翻转，
// 内容区会在 nav 退场动画还没播完时就硬跳。两个窗口期间（nav 过渡的
// isNavAnimating、收抽屉的 isCollapsingDrawer）都故意返回「反向」——保持旧布局，
// 等窗口全部关闭后才真正切换。
//   - 移动→桌面：isMobileView 已变 false 但仍在窗口内 → 返回 column（保持旧布局）
//   - 桌面→移动：isMobileView 已变 true 但仍在窗口内 → 返回 row（保持旧布局）
const containerDirection = computed<'row' | 'column'>(() => {
  if (isNavAnimating.value || isCollapsingDrawer.value) {
    return isMobileView.value ? 'row' : 'column'
  }
  return isMobileView.value ? 'column' : 'row'
})

// ============ 桌面 hover 展开（从宿主 Navmenu 摘录，键名与老版共享） ============
const isAlwaysExpanded = useLocalStorageState(NAV_STORAGE_KEYS.alwaysExpanded, false)
const isHoverEnabled = useLocalStorageState(NAV_STORAGE_KEYS.hoverEnabled, true)
const isHovered = ref(false)
const debouncedIsHovered = ref(false)
let hoverTimer: ReturnType<typeof setTimeout> | null = null
const inputType = ref<'mouse' | 'touch' | 'pen'>('mouse')

const handleMouseEnter = () => {
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null }
  isHovered.value = true
  debouncedIsHovered.value = true
}
const handleMouseLeave = () => {
  isHovered.value = false
  hoverTimer = setTimeout(() => { debouncedIsHovered.value = false }, 150)
}
// 与老版同一优先级链：always 压倒 hover；触屏输入时 hover 失效
const isExpanded = computed(() =>
  isAlwaysExpanded.value || (isHoverEnabled.value && inputType.value === 'mouse' && debouncedIsHovered.value)
)
const handlePointerDown = (e: PointerEvent) => { inputType.value = e.pointerType as typeof inputType.value }
const toggleExpand = () => { isAlwaysExpanded.value = !isAlwaysExpanded.value }

// ============ 触屏语义：触摸非交互区域时切换展开/收起 ============
// 展开按钮自身由 click 处理，touchstart 不再折叠它（data-action 守卫）。
// 触屏没有 mouseleave，点空白是唯一的折叠入口。
const NavDataActions = { DesktopExpand: 'desktop-nav-expand' } as const
const handleTouch = (e: TouchEvent) => {
  inputType.value = 'touch'
  const target = e.target as HTMLElement
  if (target.closest(`[data-action="${NavDataActions.DesktopExpand}"]`)) return

  // 收起态：触摸任意位置先展开，方便触屏用户取用
  if (!isAlwaysExpanded.value) {
    isAlwaysExpanded.value = true
    return
  }

  // 展开态：触摸内容区（菜单项 / widget）不收起；触摸 logo / 空白区收起
  if (!target.closest('.h-nav-content')) {
    isAlwaysExpanded.value = false
  }
}

// ============ 抽屉开合 ============
// 初始收起：跨断点进入移动态时抽屉关闭，点 menubar 才展开
const drawerOpen = ref(false)
const toggleDrawer = () => { drawerOpen.value = !drawerOpen.value }

// ============ 抽屉展开时的页面滚动 ============
// 壳不再插手：移动态的滚动链由样式层就地吸收 —— menubar / 展开抽屉的内容区 / 底部 widget
// 条各自声明 overscroll-behavior: contain（见 _navmenu-mobile.scss 文件头「滚动根与滚动链」），
// 文档保持整页滚动、滚动条恒定可见。这里刻意不放任何锁（锁页面会让滚动条消失/闪现）。
// 新增固定层时改样式，不要在壳里加 JS 锁。

onUnmounted(() => {
  // 使在途的 pending switch 作废；hover 防抖定时器一并清掉
  cancelPendingSwitch()
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null }
})

// ============ 上下文：暴露给内容插槽内的组件（正式通道，见 useNavShell.ts） ============
const shellContext: NavShellContext = {
  isMobileView,
  displayMobileView,
  isNavAnimating,
  containerDirection,
  isExpanded,
  drawerOpen,
  toggleDrawer
}
provide(NAV_SHELL_KEY, shellContext)

// 对外暴露（模板 ref 通道，与上面的 provide 同源）= 上下文（形态 / 动画窗口 / 方向 /
// 抽屉）+ 展开链（hovered → 防抖 → isExpanded）+ inputType。调试面板（NavDebugPanel）
// 观测这几项，形状即 NavShellDebugTarget；上下文本就该对插槽内组件可见，扩到实例上
// 不额外泄内部变量。
defineExpose({
  ...shellContext,
  isHovered,
  debouncedIsHovered,
  inputType
})
</script>

<template>
  <div class="h-nav-shell" :data-direction="containerDirection">
    <!-- 容器外层与 data-input：触屏防护规则挂在这两层上 -->
    <div class="h-nav-container" :data-input="inputType" @pointerdown="handlePointerDown">
      <ClientOnly>
        <Transition name="h-nav-transition" mode="out-in" @after-leave="endNavAnimation"
          @after-enter="endNavAnimation">
          <!-- ============ 移动态：抽屉 ============ -->
          <div v-if="displayMobileView" key="mobile" class="h-nav-wrapper-mobile"
            :data-drawer-open="drawerOpen ? '' : undefined">
            <div class="h-nav-mobile">
              <div class="h-nav-section-mobile menubar">
                <div v-if="logo" class="h-nav-logo-mobile">
                  <img class="h-nav-logo-img" :src="logo" alt="Logo">
                </div>
                <div class="menubar-actions">
                  <div class="menu-toggle" @click="toggleDrawer">
                    <HIcon :name="drawerOpen ? 'tdesign:close' : 'tdesign:menu-application'" />
                  </div>
                </div>
              </div>
              <div ref="h5MenuRef" class="h-nav-section-mobile h5menu"
                :data-expanded="drawerOpen ? '' : undefined">
                <div class="h5menu-content">
                  <NavMenuItem v-for="(item, index) in items" :key="index" :icon="item.icon"
                    :label="item.label" :href="item.href" :sub-items="item.subItems" :is-expanded="true"
                    :link-target="item.linkTarget" mode="drawer" :link-as="linkAs" />
                </div>
                <WidgetActions v-if="actions.length" mobile :actions="actions" :decor-text="decorText"
                  :more-label="moreLabel" :page-label="pageLabel" />
              </div>
            </div>
          </div>

          <!-- ============ 桌面态：侧栏 ============ -->
          <div v-else key="desktop" class="h-nav-wrapper-desktop">
            <div class="h-nav-desktop" :data-expanded="isExpanded ? '' : undefined"
              :data-always-expanded="isAlwaysExpanded ? '' : undefined"
              @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave" @pointerdown="handlePointerDown"
              @touchstart="handleTouch">
              <div class="h-nav-section-desktop">
                <div v-if="logo" class="h-nav-logo-desktop">
                  <img class="h-nav-logo-img" :src="logo" alt="Logo">
                </div>
                <div class="h-nav-content">
                  <div class="h-nav-items">
                    <NavMenuItem v-for="(item, index) in items" :key="index" :icon="item.icon"
                      :label="item.label" :href="item.href" :sub-items="item.subItems" :is-expanded="isExpanded"
                      :link-target="item.linkTarget" mode="float" :link-as="linkAs" />
                  </div>
                  <div v-if="actions.length" class="h-nav-widgets">
                    <div class="h-nav-widget-container">
                      <WidgetActions :actions="actions" :expanded="isExpanded" :decor-text="decorText"
                        :more-label="moreLabel" :page-label="pageLabel" />
                    </div>
                  </div>
                  <button class="h-nav-utils-desktop-scale-switcher" :data-action="NavDataActions.DesktopExpand"
                    @click="toggleExpand">
                    <HIcon class="h-nav-utils-desktop-scale-switcher-icon"
                      :name="isAlwaysExpanded ? 'tdesign:component-breadcrumb-filled' : 'tdesign:component-breadcrumb'"
                      :style="isAlwaysExpanded ? 'transform: scaleX(-1);' : ''" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </ClientOnly>
    </div>

    <!-- ============ 内容区：布局属性由壳管，内容样式归站点 ============ -->
    <div class="h-nav-shell__content">
      <slot />
    </div>
  </div>
</template>
