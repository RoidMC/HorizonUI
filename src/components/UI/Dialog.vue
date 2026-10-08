<script setup lang="ts">
// HorizonUI · Dialog —— 弹窗外壳（reka-ui 装配 + 标题 + 关闭按钮 + 可选的内容尺寸过渡）。
//
// 为什么抽它：原先 LanguageDialog / MFAStepDialog / NotificationDialog / PaletteDialog
// 四个弹窗各自手抄同一段 reka 装配（客户端包裹组件 → DialogRoot → DialogPortal →
// DialogOverlay → DialogContent → DialogTitle → DialogClose，约 15 行 × 4），
// 而且已经漂了：
//   - DialogClose 一处直接给 class、一处用 as-child；
//   - 关闭按钮 aria-label 一处英文 "Close"、一处中文 "关闭"；
//   - 宽度策略两套（一个用 useMediaQuery 算 min/max，一个写死 width）；
//   - `@open-auto-focus.prevent` 这个明确决策复制了 4 份 —— 新弹窗漏加就会"打开即抢焦点"。
// 封装后这些只存在一次。皮肤不在这里：`h-dialog-*` 全在 themes/components/ui/_dialog.scss
// （含居中、padding、圆角、overlay 与 scale 进出场动效），本组件只负责装配与契约。
//
// 独立成 HorizonUI 的前提：不依赖 branding / 路由；
//   文案一律由 props 传入（关闭按钮的 aria-label 由 closeLabel 覆盖，默认英文 'Close'）。
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed, onMounted, ref, useSlots } from 'vue'
import HIcon from '../internal/HIcon.vue'
import UIAutoSize from './AutoSize.vue'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  open?: boolean
  /** 标题文案；不传（且没有 #title 插槽）则不渲染标题行 */
  title?: string
  /**
   * 标题下方的说明文案。
   * ⚠️ 无论传不传都会渲染一个 DialogDescription：reka 的 DialogContent 会把
   *    aria-describedby 指到 descriptionId，若 DOM 里找不到带该 id 的元素就会
   *    dev 告警（Missing `Description`…）。不传时用修饰类把空描述收起 ——
   *    元素留在 DOM 里满足查表，视觉上不存在。
   */
  description?: string
  /** 标题左侧图标（图标名：先查库内置图标集，未命中再交给宿主注入的渲染器）。
   *  不传则标题无图标 —— 默认就是「只有文字 + 右上角关闭」，符合常规弹窗习惯。 */
  icon?: string
  /** 尺寸：不传则不写内联尺寸，由皮肤给的默认宽度 `min(90vw, 28rem)` 自适应；
   *  传了则内联覆盖（min/maxWidth 仍按 CSS 盒模型参与夹取）。 */
  width?: string
  minWidth?: string
  maxWidth?: string
  height?: string
  /** 加在 DialogContent 上的类（各弹窗自己的皮肤/布局，例如 .mfa-step-dialog） */
  contentClass?: string
  /** 打开时是否阻止自动聚焦。默认 true —— 与现有 4 个弹窗的历史行为一致
   *  （防止打开就把焦点塞进搜索框）。确实需要自动聚焦的场景显式传 false。 */
  preventAutoFocus?: boolean
  /** 关闭按钮的无障碍名；不传则用默认英文 'Close' */
  closeLabel?: string
  /**
   * 内容切换键：传了就给 body 套一层 AutoSize，内容切换时宽高平滑过渡。
   * ⚠️ 它会**重建 slot 内容**（Vue 按 key 换元素）：含输入框且要保持焦点的弹窗别用，
   *    那种请用 useAnimatedSize 的「开合模式」逐块做（参考 MFAStepDialog 的错误提示）。
   *    不传则原样渲染 slot，不额外插一层 div —— 老弹窗迁移后布局零变化。
   */
  contentKey?: string | number
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  title: '',
  description: '',
  icon: '',
  width: '',
  minWidth: '',
  maxWidth: '',
  height: '',
  contentClass: '',
  preventAutoFocus: true,
  closeLabel: '',
  contentKey: undefined,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { skin } = useSkin(() => props.unstyled)

const slots = useSlots()
/** 是否有真正的描述内容；没有时仍渲染空 DialogDescription，只收起不显示 */
const hasDescription = computed(() => Boolean(props.description || slots.description))

// 关闭按钮的无障碍名：库不下发 i18n，默认英文常量，宿主用 closeLabel 覆盖成自己的语言。
const DEFAULT_CLOSE_LABEL = 'Close'

// 替代 Nuxt 的「仅客户端渲染」包裹组件：reka 的 Portal 依赖 document，SSR 下产不出内容。
// 用组件内部的 mounted 标志达到等价语义 —— 首屏（SSR）不渲染 portal，
// 客户端挂载后再渲染，行为与原包裹组件一致，且不引入任何 Nuxt 依赖。
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const sizeStyle = computed(() => ({
  ...(props.width ? { width: props.width } : {}),
  ...(props.minWidth ? { minWidth: props.minWidth } : {}),
  ...(props.maxWidth ? { maxWidth: props.maxWidth } : {}),
  ...(props.height ? { height: props.height } : {}),
}))

// 不写 `.prevent` 修饰符是为了让它可配置（preventAutoFocus 为 false 时放行）
const onOpenAutoFocus = (e: Event) => {
  if (props.preventAutoFocus) e.preventDefault()
}
</script>

<template>
  <!-- 根是 DialogRoot（renderless），真正落到 DOM 的可见根是 DialogContent；
       inheritAttrs: false 后把宿主属性透传到内容节点，才是「加到弹窗上」的直觉行为。 -->
  <DialogRoot v-if="mounted" :open="props.open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay :class="skin('h-dialog-overlay')" />
      <!-- 尺寸过渡不用内联写：.h-dialog-content 自带
           `transition: min-width/max-width/width/height 0.3s ease`（见 _dialog.scss） -->
      <DialogContent v-bind="$attrs" :class="[skin('h-dialog-content'), props.contentClass]" :style="sizeStyle"
        @open-auto-focus="onOpenAutoFocus">
        <DialogTitle v-if="props.title || $slots.title" :class="skin('h-dialog-title')">
          <slot name="title">
            <HIcon v-if="props.icon" :name="props.icon" :class="skin('h-dialog-title-icon')" />
            <span>{{ props.title }}</span>
            <slot name="title-extra" />
          </slot>
        </DialogTitle>

        <!-- 无论有没有内容都渲染：满足 reka 对 descriptionId 的查表（否则 dev 告警）；
             空描述靠 --empty 修饰类收起，视觉上不占位。 -->
        <DialogDescription
          :class="[skin('h-dialog-description'), hasDescription ? undefined : skin('h-dialog-description--empty')]"
        >
          <slot name="description">{{ props.description }}</slot>
        </DialogDescription>

        <UIAutoSize v-if="props.contentKey !== undefined" :content-key="props.contentKey">
          <slot />
        </UIAutoSize>
        <template v-else>
          <slot />
        </template>

        <DialogClose :class="skin('h-dialog-close')" :aria-label="props.closeLabel || DEFAULT_CLOSE_LABEL">
          <HIcon name="tdesign:close" :class="skin('h-dialog-close-icon')" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
