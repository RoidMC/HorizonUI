<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  value: string
  size?: number
  margin?: number
  color?: string
  bgColor?: string
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  logo?: string
  logoSize?: number
  logoMargin?: number
  logoRadius?: number
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 200,
  margin: 2,
  color: '#000000',
  bgColor: '#ffffff',
  errorCorrectionLevel: 'M',
  logoSize: 0.2,
  logoMargin: 2,
  logoRadius: 1
})

const { skin } = useSkin(() => props.unstyled)

const svgContent = ref('')

// onMounted 只在客户端执行：SSR 期间 svgContent 为空、根节点不渲染，行为不变。
const generateQR = async () => {
  if (!props.value) return

  const svg = await QRCode.toString(props.value, {
    type: 'svg',
    width: props.size,
    margin: props.margin,
    color: {
      dark: props.color,
      light: props.bgColor
    },
    errorCorrectionLevel: props.errorCorrectionLevel
  })
  svgContent.value = svg
}

onMounted(generateQR)

watch(() => [props.value, props.size, props.color, props.bgColor], generateQR)
</script>

<template>
  <div v-if="svgContent" v-bind="$attrs" :class="skin('h-qrcode')"
    :style="{ width: props.size + 'px', height: props.size + 'px' }">
    <div :class="skin('h-qrcode-svg')" v-html="svgContent" />
    <div v-if="props.logo" :class="skin('h-qrcode-logo')" :style="{
      padding: props.logoMargin + 'px',
      backgroundColor: props.bgColor,
      borderRadius: props.logoRadius + 'px'
    }">
      <img :src="props.logo"
        :style="{ width: props.size * props.logoSize + 'px', height: props.size * props.logoSize + 'px' }" />
    </div>
  </div>
</template>
