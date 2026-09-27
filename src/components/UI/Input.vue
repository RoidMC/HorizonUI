<script setup lang="ts">
// UIInput —— 单行文本输入框。
//
// 契约同 Button：只输出语义类名（h-input-wrapper / h-input-label / h-input-container /
// h-input-icon / h-input），视觉全在 styles/themes/components/ui/_input.scss，
// 令牌走 themes/variables/components/ui/_input.scss 的 --h-input-*；组件内不写样式块。
// 图标一律交给 HIcon：图片地址直出 <img>，其余名字交给宿主注入的渲染器。
import HIcon from '../internal/HIcon.vue'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  modelValue?: string
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url'
  placeholder?: string
  label?: string
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
  label: '',
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
</script>

<template>
  <div v-bind="$attrs" :class="skin('h-input-wrapper')">
    <label v-if="props.label" :class="skin('h-input-label')">
      {{ props.label }}
    </label>
    <div :class="skin('h-input-container')">
      <span v-if="props.prefixIcon" :class="[skin('h-input-icon'), skin('h-input-icon--prefix')]">
        <HIcon :name="props.prefixIcon" />
      </span>
      <input :type="props.type" :value="props.modelValue" :placeholder="props.placeholder" :disabled="props.disabled"
        :readonly="props.readonly" :class="skin('h-input')" @input="handleInput" />
      <span v-if="props.suffixIcon" :class="[skin('h-input-icon'), skin('h-input-icon--suffix')]">
        <HIcon :name="props.suffixIcon" />
      </span>
    </div>
  </div>
</template>
