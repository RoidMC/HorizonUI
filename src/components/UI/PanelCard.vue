<script lang="ts" setup>
import { ref } from 'vue'
import HIcon from '../internal/HIcon.vue'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  title?: string
  icon?: string
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'sm' | 'md' | 'lg'
  collapsible?: boolean
  defaultExpanded?: boolean
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  collapsible: false,
  defaultExpanded: true
})

const { skin } = useSkin(() => props.unstyled)

const isExpanded = ref(props.defaultExpanded)

const toggleExpand = () => {
  if (props.collapsible) {
    isExpanded.value = !isExpanded.value
  }
}

const paddingVarMap = {
  sm: 'var(--h-panel-card-padding-sm)',
  md: 'var(--h-panel-card-padding-md)',
  lg: 'var(--h-panel-card-padding-lg)'
}
</script>

<template>
  <div v-bind="$attrs" :class="[skin('h-panel-card'), skin(`h-panel-card--${props.variant}`)]"
    :data-collapsible="props.collapsible ? '' : undefined"
    :data-collapsed="isExpanded ? undefined : ''">
    <div v-if="props.title || $slots.header" :class="skin('h-panel-card__header')" @click="toggleExpand">
      <slot name="header">
        <div :class="skin('h-panel-card__header-content')">
          <HIcon v-if="props.icon" :name="props.icon" :class="skin('h-panel-card__icon')" />
          <h3 v-if="props.title" :class="skin('h-panel-card__title')">{{ props.title }}</h3>
        </div>
        <div :class="skin('h-panel-card__header-right')">
          <div v-if="$slots.actions" :class="skin('h-panel-card__actions')" @click.stop>
            <slot name="actions" />
          </div>
          <HIcon v-if="props.collapsible" name="tdesign:chevron-down"
            :class="skin('h-panel-card__expand-icon')" :data-expanded="isExpanded ? '' : undefined" />
        </div>
      </slot>
    </div>
    <div v-if="props.title || $slots.header" :class="skin('h-panel-card__divider')" />
    <div :class="skin('h-panel-card__body-wrapper')">
      <div :class="skin('h-panel-card__body')">
        <div :class="skin('h-panel-card__body-inner')" :style="{ padding: paddingVarMap[props.padding] }">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
