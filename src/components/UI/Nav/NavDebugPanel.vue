<script setup lang="ts">
/**
 * HorizonUI · NavDebugPanel —— Nav 套件的开发期调试面板（不进生产产物）。
 *
 * 定位：把壳里「看不见但决定行为」的状态摊开，并给少量就地操作，省掉
 * 「拖窗口 / 反复刷新 / 翻 localStorage」这类调试动作。它只消费壳
 * defineExpose 的公开状态（NavShellDebugTarget），不碰壳内部变量，
 * 因此壳重构时这里不必跟着改。
 *
 * 归属库内而不是宿主：它观测的正是壳的 expose 契约，就近维护；nav-test 与
 * 真实站点因此共用同一实现，不必各写一份。
 *
 * 默认隐藏，Shift+Alt+X 唤出（选这一族的原因见「唤出快捷键」一节）。位置 / 显隐 /
 * 展开状态一起持久化到 localStorage（horizon-nav-debug-panel），刷新后仍在原处。
 *
 * 生产构建裁掉：宿主必须 **dev 门控地动态 import** 本组件，而不是引用 Nuxt
 * 自动注册的全局 <UINavDebugPanel> —— 后者会被编译成静态 import 进产物。
 * 见 rmc-website LayoutNav.vue 顶部的 NavDebugPanel 常量。
 *
 * 样式刻意自带 scoped（而非库惯例的 themes/components/ui/nav/*.scss）：那份皮肤是
 * 宿主**无条件**引入的，写进去等于生产环境的 CSS 里留一整段用不到的规则。自带 scoped
 * 后，样式随组件 chunk 一起被裁掉；面板又不需要主题令牌变种或宿主覆盖（它是浮层、
 * 类名独有），离开主题体系没有代价。
 *
 * 文案刻意不接 i18n：它只活到开发期为止，为它再开一道注入缝只会给库多一个 API。
 * 图标走 HIcon（宿主管线已注册 tdesign 集）。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import HIcon from '../../internal/HIcon.vue'
import { useBreakpoint } from '../../../composables/useBreakpoint'
import { useLocalStorageState } from '../../../composables/useLocalStorageState'
import { NAV_STORAGE_KEYS, type NavShellDebugTarget } from './useNavShell'

interface Props {
  /** 被观测的壳实例（NavShell 的 expose 结果）；模板 ref 未就绪时为 undefined */
  target?: NavShellDebugTarget | null
  /** 强制渲染形态，透传给壳的 force-view prop；undefined = 按断点自动 */
  forceView?: 'mobile' | 'desktop'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:forceView': [value: 'mobile' | 'desktop' | undefined]
}>()

// ============ 面板自身的 UI 状态（一个键装全套，刷新后接着上次） ============
// 拖出屏幕 / 夹在边角的值在拖动时钳制，这里不再重复校验。
const panel = useLocalStorageState('horizon-nav-debug-panel', {
  x: 24,
  y: 96,
  visible: false,
  collapsed: false
})

const bp = useBreakpoint()

const panelStyle = computed(() => ({
  insetInlineEnd: `${panel.value.x}px`,
  insetBlockEnd: `${panel.value.y}px`
}))

// ============ 拖动 / 点击收起（与 nav-test 控制台同一手感） ============
// 胶囊是唯一可抓的地方：拖动移动、原地点一下开合。空白处点击不参与，
// 避免调试时误收面板。
const dragging = ref(false)
let moved = false
let startX = 0
let startY = 0
let originX = 0
let originY = 0

const onPointerDown = (e: PointerEvent) => {
  if (e.button !== 0) return
  dragging.value = true
  moved = false
  startX = e.clientX
  startY = e.clientY
  originX = panel.value.x
  originY = panel.value.y
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

const onPointerMove = (e: PointerEvent) => {
  if (!dragging.value) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true
  // 屏距用「内边距」表达，故拖动位移取反；钳制保留 80px 让胶囊不会完全出界
  panel.value.x = Math.max(8, Math.min(window.innerWidth - 80, originX - dx))
  panel.value.y = Math.max(8, Math.min(window.innerHeight - 80, originY - dy))
}

const onPointerUp = () => {
  if (!dragging.value) return
  dragging.value = false
  if (!moved) panel.value.collapsed = !panel.value.collapsed
}

// ============ 唤出快捷键 ============
// Shift+Alt+X：与 Nuxt DevTools 的 Shift+Alt+D 同族，实测这一族不会被输入法 / 扩展 /
// 浏览器绑定在事件到达页面之前吃掉（Ctrl+Shift+字母、Ctrl+Alt+字母都会，后者在 Windows
// 上还等同 AltGr —— 这也是自动化测试全过、真实浏览器无反应的原因）。
// 判定用 e.code 而不是 e.key：输入法与非美式布局会把 e.key 换成别的字符，e.code 是物理键位。
const onKeydown = (e: KeyboardEvent) => {
  if (e.code !== 'KeyX' || !e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return
  // 捕获阶段监听（见 onMounted）：window 捕获是事件链最早的一站，元素级 stopPropagation
  // 拦不到它；这里只管按下，不需要再考虑冒泡被截。
  e.preventDefault()
  panel.value.visible = !panel.value.visible
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown, true)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown, true))

// ============ 观测 ============
// 全量读 target（模板里逐项取），target 未就绪时只显示一行提示，
// 免得整屏「—」看不出是「壳没挂上」还是「值真的是空」。
const rows = computed<{ k: string; v: string; on?: boolean }[]>(() => {
  const s = props.target
  if (!s) return [{ k: '壳实例', v: '未就绪（ref 尚未赋值）' }]

  return [
    { k: '渲染形态', v: s.displayMobileView ? '移动（抽屉）' : '桌面（侧栏）' },
    {
      k: '断点判定',
      v: (s.isMobileView ? '移动' : '桌面') + (props.forceView ? '（forceView 覆盖）' : '')
    },
    { k: '视口', v: `${bp.width.value}×${bp.height.value} @ ${bp.current.value}` },
    { k: '内容列方向', v: s.containerDirection },
    {
      k: '过渡窗口',
      v: s.isNavAnimating ? '播放中（保持旧形态 / 旧方向）' : '空闲',
      on: s.isNavAnimating
    },
    { k: '抽屉', v: s.drawerOpen ? '展开' : '收起' },
    {
      k: '指针类型',
      v: s.inputType + (s.inputType === 'mouse' ? '' : '（触屏防护压制 3D Push）')
    },
    {
      k: 'hover 链',
      v: `${s.isHovered} → ${s.debouncedIsHovered} → ${s.isExpanded}`,
      on: s.isExpanded
    }
  ]
})

// ============ 操作 ============
const setForceView = (value: 'mobile' | 'desktop' | undefined) => emit('update:forceView', value)

// 触屏防护一旦被判成 touch，桌面端 3D Push 就被压制；用鼠标在导航区点一下才能复位。
// 这一条把「复位」变成一次点击。
const resetInputType = () => {
  if (props.target) props.target.inputType = 'mouse'
}

// 偏好键与壳共用（NAV_STORAGE_KEYS），且 useLocalStorageState 同 key 单例 ——
// 这里一改，壳与 nav 内操作按钮同步生效，无需刷新。
const alwaysExpanded = useLocalStorageState(NAV_STORAGE_KEYS.alwaysExpanded, false)
const hoverEnabled = useLocalStorageState(NAV_STORAGE_KEYS.hoverEnabled, true)

const toggleAlwaysExpanded = () => { alwaysExpanded.value = !alwaysExpanded.value }
const toggleHoverEnabled = () => { hoverEnabled.value = !hoverEnabled.value }
const resetPrefs = () => {
  alwaysExpanded.value = false
  hoverEnabled.value = true
  resetInputType()
}
</script>

<template>
  <!-- 穿到 body：面板是浮层，宿主页面链路上任何 transform 都会把 fixed 变成
       「相对最近祖先」定位，挂在里面会被带去别处。 -->
  <Teleport to="body">
    <div v-if="panel.visible" class="h-nav-debug" :class="{ dragging }" :style="panelStyle">
      <div class="h-nav-debug__pill" title="拖动移动 · 点击展开/收起 · Shift+Alt+X 隐藏"
        @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp">
        <HIcon name="tdesign:setting" />
      </div>

      <div v-if="!panel.collapsed" class="h-nav-debug__body">
        <div class="h-nav-debug__title">
          Nav 调试面板
          <span class="h-nav-debug__hint">开发期 · Shift+Alt+X</span>
        </div>

        <dl class="h-nav-debug__rows">
          <div v-for="row in rows" :key="row.k" class="h-nav-debug__row">
            <dt>{{ row.k }}</dt>
            <dd :class="{ on: row.on }">{{ row.v }}</dd>
          </div>
        </dl>

        <div class="h-nav-debug__ops">
          <div class="h-nav-debug__group">
            <span class="h-nav-debug__k">强制形态</span>
            <div class="h-nav-debug__seg">
              <button type="button" :class="{ active: !forceView }" @click="setForceView(undefined)">自动</button>
              <button type="button" :class="{ active: forceView === 'mobile' }"
                @click="setForceView('mobile')">移动</button>
              <button type="button" :class="{ active: forceView === 'desktop' }"
                @click="setForceView('desktop')">桌面</button>
            </div>
          </div>

          <div class="h-nav-debug__group">
            <span class="h-nav-debug__k">偏好</span>
            <div class="h-nav-debug__seg">
              <button type="button" :class="{ active: alwaysExpanded }"
                @click="toggleAlwaysExpanded">常驻展开</button>
              <button type="button" :class="{ active: hoverEnabled }"
                @click="toggleHoverEnabled">hover 展开</button>
            </div>
          </div>

          <button type="button" class="h-nav-debug__action" @click="resetPrefs">
            复位默认（偏好 + 指针类型）
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
/* 只用通用面层令牌（--h-surface / --h-border / --h-text / --h-primary）与
   --h-z-debug，不立 --h-nav-debug-* 令牌：面板不进生产产物，没有「宿主可覆盖」这个诉求。
   布局：胶囊 + 面板主体横排（同 nav-test 控制台的手感），整块 fixed 到视口角，
   位置由 JS 用 inset-inline-end / inset-block-end 下发（写成内边距而非坐标，
   面板宽度变化时也贴得住对应边）。 */
.h-nav-debug {
    position: fixed;
    // 盖住 nav 自己的固定层（menubar / 抽屉）：debug 层再加偏移，保证调试浮层在最上面
    z-index: calc(var(--h-z-debug) + 10);
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--h-text);

    &.dragging {
        user-select: none;
    }
}

.h-nav-debug__pill {
    flex: none;
    width: 2.5rem;
    height: 2.5rem;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: var(--h-surface-sunken);
    border: 1px solid var(--h-border);
    cursor: grab;
    // 指针拖动时不要触发页面滚动 / 手势缩放
    touch-action: none;

    &:active {
        cursor: grabbing;
    }
}

.h-nav-debug__body {
    width: 17rem;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border-radius: 0.75rem;
    background: var(--h-surface);
    border: 1px solid var(--h-border);
    box-shadow: 0 12px 32px rgb(0 0 0 / 25%);
}

.h-nav-debug__title {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    font-weight: 600;
}

.h-nav-debug__hint {
    font-weight: 400;
    opacity: 0.55;
}

.h-nav-debug__rows {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.h-nav-debug__row {
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;

    dt {
        flex: none;
        opacity: 0.6;
    }

    dd {
        margin: 0;
        text-align: end;
        font-variant-numeric: tabular-nums;

        // 高亮「正在生效 / 正在播放」的项：扫一眼就知道状态机停在哪
        &.on {
            color: var(--h-primary);
        }
    }
}

.h-nav-debug__ops {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--h-border);
}

.h-nav-debug__group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.h-nav-debug__k {
    flex: none;
    opacity: 0.6;
}

.h-nav-debug__seg {
    flex: 1;
    display: flex;
    border: 1px solid var(--h-border);
    border-radius: 999px;
    overflow: hidden;

    button {
        flex: 1;
        padding: 0.15rem 0.25rem;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        cursor: pointer;

        & + button {
            border-inline-start: 1px solid var(--h-border);
        }

        &.active {
            background: var(--h-primary);
            color: var(--h-surface);
        }
    }
}

.h-nav-debug__action {
    padding: 0.25rem;
    border: 1px solid var(--h-border);
    border-radius: 0.375rem;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;

    &:hover {
        background: var(--h-surface-sunken);
    }
}
</style>
