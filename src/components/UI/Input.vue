<script setup lang="ts">
// UIInput —— 单行文本输入框。
//
// 契约同 Button：只输出语义类名（h-input-wrapper / h-input-container /
// h-input-icon / h-input），视觉全在 styles/themes/components/ui/_input.scss，
// 令牌走 themes/variables/components/ui/_input.scss 的 --h-input-*；组件内不写样式块。
// 图标一律交给 HIcon：图片地址直出 <img>，其余名字交给宿主注入的渲染器。
//
// 共用底层：放进 UIForm/UIField 里时，内层 <input> 交给 reka FieldControl（asChild）注入
// id / name / required / aria-labelledby / aria-describedby / aria-invalid 与字段的 data-*；
// 独立使用时没有字段上下文，照旧渲染原生 <input>，行为与以前完全一致。
// 字段上下文的存在性探测与 disabled 合并统一走 composables/useField（表单控件的共用底层）。
//
// 标签不再由本组件负责 —— 统一用 UIField + UIFieldLabel（见 Form 套件），
// 否则会与 Field 上下文的 id/label 接线抢同一个 for。
import { FieldControl } from 'reka-ui'
import { computed } from 'vue'
import HIcon from '../internal/HIcon.vue'
import { useField } from '../../composables/useField'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  modelValue?: string
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url'
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  prefixIcon?: string
  suffixIcon?: string
  iconSize?: string
  iconColor?: string
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

// 注意：class 不在这里声明 —— class / style 属于透传属性，一旦声明成 prop 就会被从 $attrs 里吃掉，
// 根元素上的 v-bind="$attrs" 就再也收不到宿主给的 class 了。
const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  disabled: false,
  readonly: false,
  prefixIcon: '',
  suffixIcon: '',
  iconSize: '18px',
  iconColor: 'var(--h-text-secondary)'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const { skin } = useSkin(() => props.unstyled)

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

// 字段接线：Input 是原生取值控件，内层 <input> 的注入全交给 FieldControl，
// 这里只用共用底层判断「有没有字段上下文」并合并 disabled。
const { present, disabled } = useField({ disabled: () => props.disabled })

// 内层 input 的绑定收敛成一处，两个分支共用，行为只有一份事实源。
// 刻意不把 modelValue 交给 FieldControl：它只在拿到 modelValue 时才接管 value 绑定，
// 这里由 UIInput 自己管 v-model；字段提交时读的是 DOM 上的 .value，照样取得到。
const inputAttrs = computed(() => ({
  class: skin('h-input'),
  type: props.type,
  value: props.modelValue,
  placeholder: props.placeholder || undefined,
  disabled: disabled.value || undefined,
  readonly: props.readonly || undefined,
  onInput: handleInput
}))
</script>

<template>
  <div v-bind="$attrs" :class="skin('h-input-wrapper')">
    <div :class="skin('h-input-container')">
      <span v-if="props.prefixIcon" :class="[skin('h-input-icon'), skin('h-input-icon--prefix')]">
        <HIcon :name="props.prefixIcon" />
      </span>

      <!-- 有字段上下文：交给 reka 注入 id / name / aria-* / data-*。
           asChild 会把这些并到内层 <input> 上，不产生额外的 DOM 层。 -->
      <FieldControl v-if="present" as-child>
        <input v-bind="inputAttrs" />
      </FieldControl>
      <input v-else v-bind="inputAttrs" />

      <span v-if="props.suffixIcon" :class="[skin('h-input-icon'), skin('h-input-icon--suffix')]">
        <HIcon :name="props.suffixIcon" />
      </span>
    </div>
  </div>
</template>