<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { renderSVG } from 'uqr'
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
// uqr 的 renderSVG 是同步纯函数（无需 await，也不返回 Promise），与旧 qrcode.toString 的
// 异步签名不同，故这里不再是 async。
const generateQR = () => {
  if (!props.value) return

  svgContent.value = renderSVG(props.value, {
    // pixelSize 决定 SVG 的 viewBox 坐标尺度；实际显示尺寸由 .h-qrcode 的 CSS（宽高 100%）定，
    // 这里取 props.size 与旧的 width: props.size 对齐，让 SVG 固有尺寸也等于 size。
    pixelSize: props.size,
    border: props.margin,
    blackColor: props.color,
    whiteColor: props.bgColor,
    ecc: props.errorCorrectionLevel
  })
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
