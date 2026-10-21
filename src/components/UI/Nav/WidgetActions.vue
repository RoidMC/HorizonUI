<script lang="ts" setup>
/**
 * HorizonUI · WidgetActions —— 导航操作区（三形态：收起堆叠 / 展开轮播 / 移动横条）
 *
 * 从 rmc-website 宿主的 WidgetActions 摘录，KexCore frontend 亦有一份同源实现——
 * 本组件是两份孪生实现的正式归并入口。**三形态的状态机与原版逐行对齐**：
 *   - 收起态：前 CORE 个直出 + 「更多」收进 Popover；槽位 transform 来自 CSS 变量
 *   - 展开态：分页轮播（手机桌面式），支持滑动 / 拖拽 / 滚轮，两端时滚轮交还页面
 *   - 拖拽后抑制 click（suppressClick 与 dragMoved 解耦，见 endDrag 注释）
 *   - 移动端：ResizeObserver 动态算可见按钮数；hover 类 action 在触屏过滤
 *
 * 库化改造点（仅这些）：
 *   - i18n：「更多」文案经 moreLabel 注入；页码 aria-label 经 pageLabel 注入
 *   - Icon → HIcon；horizon-widget-* → h-nav-widget-*
 *   - useSkin 脱皮开关；reka-ui 为库 peerDependency，直接用
 *   - ResizeObserver 刻意保持手写（原版逻辑）：切到库 useResizeObserver 需单独验证
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { PopoverRoot, PopoverPortal, PopoverTrigger, PopoverContent } from 'reka-ui'
import HIcon from '../../internal/HIcon.vue'
import { useSkin } from '../../../composables/useUnstyled'
import { resolveText, type NavText, type WidgetAction } from './nav-types'

interface Props {
  /** 操作按钮数据源：图标 / 标题 / 点击回调全部由调用方提供 */
  actions: WidgetAction[]
  /** 是否处于展开态（横排）：由宿主的展开状态传入 */
  expanded?: boolean
  /** 是否以移动端底部横条模式渲染（全屏抽屉底部固定条） */
  mobile?: boolean
  /** 装饰文本（显示在操作区右下角） */
  decorText?: string
  /** 「更多」按钮文案，默认 'More' */
  moreLabel?: NavText
  /** 页码无障碍标签生成器，默认英文 "第 x 页 / Page x of y" */
  pageLabel?: (current: number, total: number) => string
  /** 单实例覆盖全局皮肤开关 */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  expanded: false,
  mobile: false,
  decorText: 'HORIZON',
  moreLabel: 'More',
  pageLabel: (current: number, total: number) => `Page ${current + 1} of ${total}`
})

const { skin } = useSkin(() => props.unstyled)

// ============ 数据驱动 ============
// 收起态只展示前 CORE 个核心按钮，其余收进「更多」弹出菜单（方案 C）。
// 高度由运行时变量 --widget-btn-count = min(total, CORE+1) 驱动，避免写死 4 在 ≤3 时留空。
const CORE = 3
// 展开态分页轮播每页最多按钮数（类手机桌面）
const PAGE_SIZE = 5

// ===== 收起态（纵向堆叠 + 更多） =====
const coreItems = computed(() => props.actions.slice(0, CORE))
const restItems = computed(() => props.actions.slice(CORE))

// 收起态可见：核心 CORE 个 + （若有剩余）1 个「更多」
// 展开态走轮播，不依赖此值，故恒为收起态计数。
const visibleCount = computed(() => Math.min(props.actions.length, CORE + 1))

// 当前渲染列表：收起态 = 核心 + 更多(若有剩余)；展开态交给轮播，不在此渲染
const visibleItems = computed<(WidgetAction | 'more')[]>(() => {
  const list: (WidgetAction | 'more')[] = [...coreItems.value]
  if (restItems.value.length) list.push('more')
  return list
})

// 移动端底部条：hover 在触屏无意义，过滤掉
const mobileActions = computed(() => props.actions.filter(a => a.key !== 'hover'))

// ============ 移动端响应式：动态计算可容纳按钮数 ============
// 移动端按钮尺寸常量（与 SCSS 保持一致）
const MOBILE_BTN_SIZE = 32 // 2rem = 32px（按钮宽度）
const MOBILE_BTN_GAP = 8   // 0.5rem = 8px（按钮间距）
const MOBILE_DECOR_RESERVED = 96 // 装饰文本 "//HORIZON" 预留空间（约 6rem，含 gap）
const MOBILE_SIDE_PADDING = 16 // 容器 padding（1rem 左右各 8px）

// 移动端容器 ref + ResizeObserver
const mobileContainerRef = ref<HTMLElement | null>(null)
const mobileBarWidth = ref(0)
let resizeObserver: ResizeObserver | null = null

function calculateMobileVisibleCount(): number {
  const total = mobileActions.value.length
  if (total === 0) return 0

  const availableWidth = mobileBarWidth.value - MOBILE_DECOR_RESERVED - MOBILE_SIDE_PADDING
  const btnSlot = MOBILE_BTN_SIZE + MOBILE_BTN_GAP // 每个按钮占的槽位
  const maxBtns = Math.floor(availableWidth / btnSlot)

  // 至少显示 1 个，最多不超过总数
  return Math.max(1, Math.min(maxBtns, total))
}

// 移动端可见按钮数（动态计算）
const mobileVisibleCount = computed(() => calculateMobileVisibleCount())

// 移动端可见按钮 + "更多"按钮
const mobileVisibleItems = computed<(WidgetAction | 'more')[]>(() => {
  const total = mobileActions.value.length
  const visible = mobileVisibleCount.value
  const list: (WidgetAction | 'more')[] = mobileActions.value.slice(0, visible)

  // 若有更多按钮被隐藏，添加"更多"入口
  if (visible < total) {
    list.push('more')
  }
  return list
})

// 移动端收进"更多"菜单的按钮
const mobileRestItems = computed(() => {
  const visible = mobileVisibleCount.value
  return mobileActions.value.slice(visible)
})

// 移动端"更多"弹窗状态
const mobileMoreOpen = ref(false)

// 初始化 ResizeObserver 监听宽度变化
function initMobileResizeObserver() {
  if (!mobileContainerRef.value) return

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      mobileBarWidth.value = entry.contentRect.width
    }
  })
  resizeObserver.observe(mobileContainerRef.value)
  mobileBarWidth.value = mobileContainerRef.value.clientWidth
}

onMounted(() => {
  nextTick(() => {
    if (props.mobile) {
      initMobileResizeObserver()
    }
  })
})

// 当 mobile prop 变化时，重新设置观察器
watch(() => props.mobile, (isMobile) => {
  if (resizeObserver && mobileContainerRef.value) {
    resizeObserver.disconnect()
  }
  if (isMobile) {
    nextTick(() => {
      initMobileResizeObserver()
    })
  }
})

// 按钮纵向偏移量：单一来源来自 SCSS 定义的 --h-nav-widget-btn-offset（按钮尺寸 + 间距），
// 不在 TS 内重复硬编码 calc，避免与样式 token 漂移。
const OFFSET = 'var(--h-nav-widget-btn-offset)'
function slotTransform(i: number): string {
  return `translateY(calc(${i} * ${OFFSET}))`
}

// ===== 展开态（分页轮播，类手机桌面） =====
const moreOpen = ref(false)
const currentPage = ref(0)
// 滑动/拖动时关闭 snap 过场，交给 instant 跟手；松手/翻页后再开 snap 吸附到整页
const pageTransition = ref(true)

const pages = computed<WidgetAction[][]>(() => {
  const arr = props.actions
  const out: WidgetAction[][] = []
  for (let i = 0; i < arr.length; i += PAGE_SIZE) out.push(arr.slice(i, i + PAGE_SIZE))
  return out
})

const carouselRef = ref<HTMLElement | null>(null)

// 进入展开态：关闭「更多」弹窗，并复位轮播到第一页、恢复 snap 过场
watch(() => props.expanded, (v) => {
  if (v) {
    moreOpen.value = false
    currentPage.value = 0
    pageTransition.value = true
  }
})

function setTransition(on: boolean) {
  pageTransition.value = on
  const el = carouselRef.value
  if (el) el.style.scrollSnapType = on ? '' : 'none'
}

function onScroll() {
  const el = carouselRef.value
  if (!el || el.clientWidth === 0) return
  currentPage.value = Math.round(el.scrollLeft / el.clientWidth)
}
function goToPage(i: number) {
  const el = carouselRef.value
  if (!el) return
  const target = Math.max(0, Math.min(i, pages.value.length - 1))
  // 翻页用 instant（指向整页，无内部吸附抖动；snap 仅在跟手拖动时关闭）
  el.scrollTo({ left: target * el.clientWidth, behavior: 'auto' })
  currentPage.value = target
}

// ===== 鼠标滚轮：直接跟手平移（无 snap/animation，避免胶囊闪烁） =====
function onWheel(e: WheelEvent) {
  if (pages.value.length <= 1) return
  // ctrl+滚轮是浏览器缩放（macOS 触控板捏合），不拦截
  if (e.ctrlKey) return
  // 只处理纵向滚轮；横向滚轮/触控板自然横向滑动交给原生 overflow-x
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
  const el = carouselRef.value
  if (!el) return
  const atStart = el.scrollLeft <= 0
  const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
  // 已滚动到两端时把纵向滚轮交还给页面，避免吞掉整页滚动
  if ((e.deltaY > 0 && atEnd) || (e.deltaY < 0 && atStart)) return
  e.preventDefault()
  el.scrollLeft += e.deltaY
}

// ===== 鼠标拖拽滑动（按住拖动切换页面；与点击区分开） =====
const isDragging = ref(false)
let dragStartX = 0
let dragStartScroll = 0
let dragMoved = false
// 拖拽结束后是否吞掉紧随的 click（与 dragMoved 解耦，避免指针移出 carousel 时标记残留）
let suppressClick = false

function onPointerDown(e: PointerEvent) {
  if (pages.value.length <= 1) return
  if (e.button !== 0) return
  // 复位上一次拖拽残留的抑制标记（任何新指针按下都意味着新的交互周期）
  suppressClick = false
  isDragging.value = true
  dragMoved = false
  dragStartX = e.clientX
  dragStartScroll = carouselRef.value?.scrollLeft ?? 0
  setTransition(false)
  document.addEventListener('pointermove', onPointerMoveDoc)
  document.addEventListener('pointerup', endDrag)
  document.addEventListener('pointercancel', endDrag)
}
function onPointerMoveDoc(e: PointerEvent) {
  if (!isDragging.value) return
  const el = carouselRef.value
  if (!el) return
  const dx = e.clientX - dragStartX
  if (Math.abs(dx) > 8) dragMoved = true
  el.scrollLeft = dragStartScroll - dx
}
function endDrag() {
  if (!isDragging.value) return
  isDragging.value = false
  document.removeEventListener('pointermove', onPointerMoveDoc)
  document.removeEventListener('pointerup', endDrag)
  document.removeEventListener('pointercancel', endDrag)
  setTransition(true)
  const el = carouselRef.value
  if (el && el.clientWidth > 0) {
    goToPage(Math.round(el.scrollLeft / el.clientWidth))
  }
  // 本次拖拽若发生过移动，则抑制紧随的 click；下一次 pointerdown 会复位该标记，
  // 无需 setTimeout 兜底（避免宏任务时序依赖导致偶发误吞/漏吞）
  suppressClick = dragMoved
  dragMoved = false
}
// 拖拽后抑制误触发的按钮 click
function suppressClickIfDragged(e: MouseEvent) {
  if (suppressClick) {
    e.stopPropagation()
    e.preventDefault()
    suppressClick = false
  }
}

// 组件卸载时清理 document 拖拽监听 + ResizeObserver，避免监听泄漏
onUnmounted(() => {
  document.removeEventListener('pointermove', onPointerMoveDoc)
  document.removeEventListener('pointerup', endDrag)
  document.removeEventListener('pointercancel', endDrag)
  isDragging.value = false
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<template>
  <div
    :class="[skin('h-nav-widget-section'), skin('h-nav-widget-section--actions'), { 'is-mobile': mobile }]"
    :style="{ '--widget-btn-count': visibleCount }">

    <!-- 移动端：h5menu 底部固定横条（动态计算可见按钮数 + 更多折叠） -->
    <template v-if="mobile">
      <div ref="mobileContainerRef" class="h-nav-widget-mobile-bar">
        <template v-for="item in mobileVisibleItems" :key="item === 'more' ? 'more' : item.key">
          <PopoverRoot
            v-if="item === 'more'"
            v-model:open="mobileMoreOpen">
            <PopoverTrigger as-child>
              <div
                class="h-nav-widget-button h-nav-widget-button--mobile h-nav-widget-button--more"
                :title="resolveText(moreLabel)">
                <HIcon name="tdesign:more" />
              </div>
            </PopoverTrigger>
            <PopoverPortal>
              <PopoverContent
                class="h-nav-widget__more-popup h-nav-widget__more-popup--mobile"
                side="top"
                :side-offset="8"
                align="center">
                <div
                  v-for="ritem in mobileRestItems"
                  :key="ritem.key"
                  class="h-nav-widget__more-item"
                  :title="resolveText(ritem.title)"
                  @click="ritem.onClick?.()">
                  <HIcon :name="typeof ritem.icon === 'function' ? ritem.icon() : ritem.icon" />
                  <span>{{ resolveText(ritem.title) }}</span>
                </div>
              </PopoverContent>
            </PopoverPortal>
          </PopoverRoot>
          <div
            v-else
            class="h-nav-widget-button h-nav-widget-button--mobile"
            :class="{ active: item.active ? item.active() : false }"
            :title="resolveText(item.title)"
            @click="item.onClick?.()">
            <Transition name="h-nav-widget-icon" mode="out-in">
              <HIcon
                :key="typeof item.icon === 'function' ? item.icon() : item.icon"
                :name="typeof item.icon === 'function' ? item.icon() : item.icon" />
            </Transition>
          </div>
        </template>
      </div>
    </template>

    <!-- 收起态：纵向堆叠 + 更多（reka-ui Popover portal 到 body，避免被父级容器裁剪） -->
    <template v-else-if="!expanded">
      <template v-for="(item, i) in visibleItems" :key="item === 'more' ? 'more' : item.key">
        <PopoverRoot
          v-if="item === 'more'"
          v-model:open="moreOpen">
          <PopoverTrigger as-child>
            <div
              class="h-nav-widget-button h-nav-widget-button--more"
              :style="{ transform: slotTransform(CORE) }"
              :title="resolveText(moreLabel)">
              <HIcon name="tdesign:more" />
            </div>
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent
              class="h-nav-widget__more-popup"
              side="right"
              :side-offset="8"
              align="end">
              <div
                v-for="ritem in restItems"
                :key="ritem.key"
                class="h-nav-widget__more-item"
                :title="resolveText(ritem.title)"
                @click="ritem.onClick?.()">
                <HIcon :name="typeof ritem.icon === 'function' ? ritem.icon() : ritem.icon" />
                <span>{{ resolveText(ritem.title) }}</span>
              </div>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
        <div
          v-else
          class="h-nav-widget-button"
          :class="{ active: item.active ? item.active() : false }"
          :style="{ transform: slotTransform(i) }"
          :title="resolveText(item.title)"
          @click="item.onClick?.()">
          <Transition name="h-nav-widget-icon" mode="out-in">
            <HIcon
              :key="typeof item.icon === 'function' ? item.icon() : item.icon"
              :name="typeof item.icon === 'function' ? item.icon() : item.icon" />
          </Transition>
        </div>
      </template>
    </template>

    <!-- 展开态：分页轮播（类手机桌面，每页最多 5 个，下方小点指示当前页，可滑动/拖动/滚轮切换） -->
    <template v-else>
      <div
        ref="carouselRef"
        class="h-nav-widget-carousel"
        :class="{ 'can-drag': pages.length > 1, 'page-transition': pageTransition, dragging: isDragging }"
        @scroll="onScroll"
        @wheel="onWheel"
        @pointerdown="onPointerDown"
        @click.capture="suppressClickIfDragged">
        <div
          v-for="(page, pi) in pages"
          :key="pi"
          class="h-nav-widget-page">
          <div
            v-for="item in page"
            :key="item.key"
            class="h-nav-widget-button h-nav-widget-button--paged"
            :class="{ active: item.active ? item.active() : false }"
            :title="resolveText(item.title)"
            @click="item.onClick?.()">
            <Transition name="h-nav-widget-icon" mode="out-in">
              <HIcon
                :key="typeof item.icon === 'function' ? item.icon() : item.icon"
                :name="typeof item.icon === 'function' ? item.icon() : item.icon" />
            </Transition>
          </div>
        </div>
      </div>
      <div
        v-if="pages.length > 1"
        class="h-nav-widget-dots">
        <button
          v-for="(_, i) in pages"
          :key="i"
          type="button"
          class="h-nav-widget-dot"
          :class="{ active: i === currentPage }"
          :aria-label="pageLabel(i, pages.length)"
          @click="goToPage(i)" />
      </div>
    </template>

    <!-- 装饰文本：绝对定位钉死在 section 右下角（收起态隐藏，展开态显示） -->
    <span class="h-nav-widget__actions-decor">
      <span class="h-nav-widget__actions-decor-slash">//</span>
      <span class="h-nav-widget__actions-decor-text">{{ decorText }}</span>
    </span>
  </div>
</template>
