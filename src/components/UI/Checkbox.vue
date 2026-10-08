<script setup lang="ts">
// UICheckbox —— 勾选框原语。
//
// 为什么不用原生渲染 + accent-color：暗色主题下 `accent-color` 会得到一个「死白实心方块」，
// 没有边界、没有层级，跟本套设计语言（直角 + 1px --h-border + surface 阶梯）不是一回事。
// 这里把原生 input 视觉隐藏（但保留键盘可达与语义），用 span 画盒子。
//
// 选中信号的取色：**勾用 --h-primary，盒子只走 surface 阶梯**，不用 --h-surface-inverse 反相填充。
// 理由：主色在这套语言里就是「信号色」（`//` deco、focus ring），而反相填充已经是「当前选中页签」
// 的专用语义，勾选框再占一遍会让两种含义打架；也避免暗色下又出现一块白。
//
// 共用底层：放进 UIForm/UIField 里时自动接入字段 —— id / name / aria-* / data-* 落到内层
// 原生 input 上，勾选变化上报给字段参与校验与值收集；独立使用时没有字段上下文，
// 全部退化为空操作，行为与以前完全一致。
//
// 为什么不走 reka FieldControl：它取的是原生 `.value`，而 checkbox 的 `.value` 恒为 "on"，
// 照搬会把「已填」与校验全算错。所以走 composables/useField 的自定义取值控件路径
//（reka 自带的 CheckboxRoot.vue 也是这么做的）。
//
// 局部 CSS 变量默认值已挪到 variables/components/ui/_checkbox.scss，消费方按需覆盖。
import { computed, ref, useSlots, watch } from 'vue'
import HIcon from '../internal/HIcon.vue'
import { useField } from '../../composables/useField'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  modelValue?: boolean
  disabled?: boolean
  /** 无默认插槽（无可见文案）时的无障碍名称 */
  ariaLabel?: string
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  ariaLabel: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { skin } = useSkin(() => props.unstyled)

const slots = useSlots()
const hasLabel = computed(() => !!slots.default?.())

const input = ref<HTMLInputElement | null>(null)

// 字段接线：根节点是 <label>，真正参与字段的是内层原生 input，所以注册的是它。
// 取值用勾选态而非原生 .value；isFilled 按「勾了才算填」判定。
const { disabled, controlAttrs, onFocus, onBlur, reportChange, reportFilled } = useField({
  disabled: () => props.disabled,
  control: {
    element: () => input.value,
    getValue: () => props.modelValue,
    isFilled: value => value === true
  }
})

// 父级驱动的勾选变化只更新「已填」，不算交互、不置脏
watch(() => props.modelValue, (value) => {
  reportFilled(value === true)
})

const onChange = (event: Event) => {
  if (disabled.value) return
  const next = (event.target as HTMLInputElement).checked
  emit('update:modelValue', next)
  reportChange(next)
}
</script>

<template>
  <label v-bind="$attrs" :class="skin('h-checkbox')"
    :data-checked="props.modelValue ? '' : undefined"
    :data-disabled="disabled ? '' : undefined">
    <input ref="input" v-bind="controlAttrs" :class="skin('h-checkbox-input')" type="checkbox"
      :checked="props.modelValue" :disabled="disabled"
      :aria-label="hasLabel ? undefined : (props.ariaLabel || undefined)"
      @change="onChange" @focus="onFocus" @blur="onBlur" />
    <!-- 勾常驻渲染，只用 opacity 隐显：不要用 v-if，否则"盒子里有没有子元素"会变成两种几何 -->
    <span :class="skin('h-checkbox-box')" aria-hidden="true">
      <HIcon name="tdesign:check" :class="skin('h-checkbox-icon')" />
    </span>
    <span v-if="hasLabel" :class="skin('h-checkbox-text')">
      <slot />
    </span>
  </label>
</template>
