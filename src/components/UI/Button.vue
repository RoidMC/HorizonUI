<script setup lang="ts">
/**
 * HorizonUI · Button —— 按钮 / 链接的统一外壳（本库的参考实现）
 *
 * 契约（其余组件照此迁移）：
 *   1. 组件只输出语义类名（h-button / h-button-icon / h-button-text / h-button-spinner）
 *      与 data-* 状态（data-loading / data-disabled / data-icon-only）；
 *      样式一律在 styles/themes/components/ui/_button.scss，组件内不写 <style>。
 *   2. unstyled: true（或全局 createHorizon({ unstyled: true })）时不输出语义类名，
 *      库自带 CSS 自然命中不到；DOM 结构与 data-* 保留，宿主可自行接管皮肤。
 *   3. 不依赖 Nuxt：链接/路由由 `as` 注入（`:as="NuxtLink" to="/x"`），
 *      图标走 prefix/suffix（图片地址或宿主注入的图标渲染器）或同名插槽。
 *   4. 未声明的属性（to / href / target / aria-* …）原样透传到根元素。
 *
 * 与旧实现的差异（迁移时注意）：
 *   - 根元素从 `<button>` 变为可选（`as`），`type`/`disabled` 只对原生 button 输出；
 *   - 只要没 disabled/loading 就 emit click（旧实现对带 to 的链接从不 emit）；
 *   - loading 图标由 iconify 换成纯 CSS 圆环，库因此不再依赖图标集。
 */
import { computed, useSlots } from 'vue'
import type { Component } from 'vue'
import HIcon from '../internal/HIcon.vue'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  /** 根元素：原生标签名（默认 'button'）或组件（例如宿主的路由 Link / NuxtLink） */
  as?: string | Component
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  /** 前置图标：图片地址（/、http、data: 开头）直出 <img>，其余交给宿主的图标渲染器 */
  prefixIcon?: string
  suffixIcon?: string
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  type: 'button',
  disabled: false,
  loading: false,
  prefixIcon: '',
  suffixIcon: ''
})

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const { skin } = useSkin(() => props.unstyled)

const slots = useSlots()
const hasContent = computed(() => !!slots.default?.())

// type/disabled 是原生 <button> 的概念：换成 <a> 或路由组件后写上去只是脏属性
const isNativeButton = computed(() => typeof props.as === 'string' && props.as === 'button')
const inactive = computed(() => props.disabled || props.loading)

function onClick(event: MouseEvent) {
  // loading 期间连链接一起拦住 —— 提交中的按钮不该还能再导航一次
  if (inactive.value) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <component :is="props.as" v-bind="$attrs" :class="skin('h-button')"
    :type="isNativeButton ? props.type : undefined"
    :disabled="isNativeButton ? inactive : undefined"
    :data-loading="props.loading ? '' : undefined"
    :data-disabled="inactive ? '' : undefined"
    :data-icon-only="hasContent ? undefined : ''"
    @click="onClick">
    <span v-if="props.loading" :class="skin('h-button-spinner')" aria-hidden="true" />

    <template v-else>
      <span v-if="props.prefixIcon || $slots.prefix" :class="skin('h-button-icon')">
        <slot name="prefix">
          <HIcon :name="props.prefixIcon" />
        </slot>
      </span>

      <span v-if="hasContent" :class="skin('h-button-text')">
        <slot />
      </span>

      <span v-if="props.suffixIcon || $slots.suffix" :class="skin('h-button-icon')">
        <slot name="suffix">
          <HIcon :name="props.suffixIcon" />
        </slot>
      </span>
    </template>
  </component>
</template>
