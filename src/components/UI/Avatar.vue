<script setup lang="ts">
// HorizonUI · Avatar —— 头像。
//
// 兜底图不再取业务常量，改读全局配置 createHorizon({ defaultAvatar })。
import { useHorizonConfig } from '../../config'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  /** 头像 URL */
  src?: string
  /** 替代文本 */
  alt?: string
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  alt: 'Avatar'
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const { skin } = useSkin(() => props.unstyled)
const config = useHorizonConfig()

// mouseenter / mouseleave 不声明成 emit：让它们作为原生监听器经 $attrs 落到根元素。
const onClick = (event: MouseEvent) => {
  emit('click', event)
}
</script>

<template>
  <div v-bind="$attrs" :class="skin('h-avatar')" @click="onClick">
    <img v-if="props.src" :src="props.src" :alt="props.alt" :class="skin('h-avatar-img')" />
    <img v-else-if="config.defaultAvatar" :src="config.defaultAvatar" alt="Default avatar"
      :class="skin('h-avatar-img')" />
    <slot v-else name="placeholder" />
    <slot />
  </div>
</template>
