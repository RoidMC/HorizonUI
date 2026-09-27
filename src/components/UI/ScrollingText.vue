<script lang="ts" setup>
// HorizonUI · ScrollingText —— 无限循环跑马灯。
//
// ⚠️ JS 只能靠 data 属性找节点（data-h-scroll-content / data-h-scroll-item），
//    不能靠语义类名：unstyled 时 skin() 返回 undefined、语义类名被摘掉，
//    若还按类名 querySelector，脱皮模式下组件会直接失效。
import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  text: string
  speed?: number // 滚动速度(px/s)
  repeatCount?: number // 重复次数(0表示无限)
  separator?: string // 自定义分隔符
  enableWordSplit?: boolean // 是否启用空格分词
  textClass?: string // 文本CSS类名
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  speed: 30,
  repeatCount: 0, // 0表示无限滚动
  separator: ' • ', // 默认分隔符
  enableWordSplit: true, // 默认启用分词
  textClass: '' // 默认空类名
})

const { skin } = useSkin(() => props.unstyled)

const containerRef = ref<HTMLElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)
const animationRef = ref<number | null>(null)
const isReady = ref(false)

// 每个组件实例的动画状态
const animationState = reactive({
  currentPosition: 0,
  itemWidth: 0
})

// 创建文本项：语义类名走 skin（unstyled 时为空串），data-h-scroll-item 供 JS 查找
const createTextItem = (content: string) => {
  const item = document.createElement('div')
  item.className = skin('h-scrolling-text-item') ?? ''
  item.setAttribute('data-h-scroll-item', '')
  // 自定义文本类名照旧挂上（供宿主样式计算）
  if (props.textClass) {
    item.classList.add(...props.textClass.split(' ').filter(cls => cls))
  }
  item.textContent = content
  item.style.whiteSpace = 'pre' // 确保保持空格
  return item
}

// 更新现有文本项的内容和样式
const updateTextItems = (contentWrapper: HTMLElement, processedText: string) => {
  const items = contentWrapper.querySelectorAll('[data-h-scroll-item]')
  items.forEach(item => {
    const textItem = item as HTMLElement
    textItem.textContent = processedText
  })
}

// 调整副本数量以适应容器宽度
const adjustCopyCount = (contentWrapper: HTMLElement, wrapper: HTMLElement, processedText: string) => {
  // 计算单个项目的宽度（临时元素：脱流 + 隐藏，保持原有内联样式）
  const tempItem = createTextItem(processedText)
  tempItem.style.position = 'absolute'
  tempItem.style.visibility = 'hidden'

  document.body.appendChild(tempItem)
  const itemWidth = tempItem.offsetWidth
  document.body.removeChild(tempItem)

  if (itemWidth === 0) return

  // 获取容器宽度并计算所需副本数
  const containerWidth = wrapper.clientWidth
  const minCopies = Math.ceil(containerWidth / itemWidth) + 2 // 多加2个确保充足
  const targetCopies = Math.max(4, minCopies) // 至少4个副本

  const currentItems = contentWrapper.querySelectorAll('[data-h-scroll-item]')
  const currentCount = currentItems.length

  if (currentCount < targetCopies) {
    // 需要添加更多副本
    for (let i = currentCount; i < targetCopies; i++) {
      contentWrapper.appendChild(createTextItem(processedText))
    }
  } else if (currentCount > targetCopies) {
    // 需要移除多余副本（保留前targetCopies个）
    for (let i = currentCount - 1; i >= targetCopies; i--) {
      const item = currentItems[i]
      if (item) {
        item.remove()
      }
    }
  }
}

// 处理文本内容
const processText = () => {
  const originalText = props.text

  // 根据分词开关处理文本
  let processedText: string
  if (props.enableWordSplit) {
    // 启用分词：在每个词组后添加自定义分隔符，但保留原始空格结构
    const parts = originalText.split(/(\s+)/) // 按空格分割，但保留空格作为独立元素
    processedText = parts
      .map(part => {
        if (part.trim() === '') {
          // 如果是纯空格，保持原样
          return part
        } else {
          // 如果是非空格内容，在后面添加分隔符
          return part + props.separator
        }
      })
      .join('')
  } else {
    // 不分词：直接在整个文本后添加分隔符
    processedText = originalText + props.separator
  }

  return processedText
}

// 初始化滚动内容 - 创建基础副本
const initScrollContent = () => {
  const wrapper = wrapperRef.value
  const container = containerRef.value

  if (!wrapper || !container) return

  const processedText = processText()

  // 如果还没有内容容器，则创建基础结构
  let contentWrapper = container.querySelector('[data-h-scroll-content]') as HTMLElement | null
  if (!contentWrapper) {
    // 立即隐藏容器以防止闪烁
    wrapper.style.opacity = '0'
    wrapper.style.transition = 'opacity 0s'

    // 清空现有内容
    container.innerHTML = ''

    // 创建内容容器（语义类名走 skin，data-h-scroll-content 供 JS 查找）
    contentWrapper = document.createElement('div')
    contentWrapper.className = skin('h-scrolling-text-content') ?? ''
    contentWrapper.setAttribute('data-h-scroll-content', '')
    contentWrapper.style.display = 'flex'
    contentWrapper.style.width = 'fit-content'
    container.appendChild(contentWrapper)

    // 标记准备就绪并淡入显示
    isReady.value = true
    nextTick(() => {
      wrapper.style.transition = 'var(--h-scrolling-text-opacity-transition)'
      wrapper.style.opacity = '1'
    })
  }

  // 更新文本内容和样式
  updateTextItems(contentWrapper, processedText)

  // 调整副本数量
  adjustCopyCount(contentWrapper, wrapper, processedText)

  // 启动或重启JS动画
  startJSAnimation()
}

// 重新计算动画参数
const recalculateAnimationParams = () => {
  const container = containerRef.value
  if (!container) return

  const contentWrapper = container.querySelector('[data-h-scroll-content]') as HTMLElement | null
  if (!contentWrapper) return

  // 获取单个内容项的宽度
  const firstItem = contentWrapper.querySelector('[data-h-scroll-item]') as HTMLElement | null
  if (!firstItem) return

  animationState.itemWidth = firstItem.offsetWidth
  if (animationState.itemWidth === 0) return

  // 设置容器宽度为两个内容项的总宽度
  contentWrapper.style.width = (animationState.itemWidth * 2) + 'px'
}

// JS动画实现 - 核心逻辑
const startJSAnimation = () => {
  const container = containerRef.value
  if (!container) return

  // 重新计算动画参数
  recalculateAnimationParams()
  if (animationState.itemWidth === 0) return

  // 使用requestAnimationFrame实现流畅动画
  const pixelsPerFrame = props.speed / 60 // 60fps下的每帧移动距离

  const animate = () => {
    animationState.currentPosition -= pixelsPerFrame

    // 关键：当移动到一半位置时重置位置，实现无缝循环
    if (Math.abs(animationState.currentPosition) >= animationState.itemWidth) {
      animationState.currentPosition = animationState.currentPosition + animationState.itemWidth
    }

    // 重新获取contentWrapper以防DOM变化
    const currentContainer = containerRef.value
    if (currentContainer) {
      const currentContentWrapper = currentContainer.querySelector('[data-h-scroll-content]') as HTMLElement | null
      if (currentContentWrapper) {
        currentContentWrapper.style.transform = `translateX(${animationState.currentPosition}px)`
      }
    }

    animationRef.value = requestAnimationFrame(animate)
  }

  // 启动动画循环
  animate()
}

// 停止动画
const stopAnimation = () => {
  if (animationRef.value) {
    cancelAnimationFrame(animationRef.value)
    animationRef.value = null
  }
}

// 监听内容、分隔符和分词开关变化
watch([() => props.text, () => props.separator, () => props.enableWordSplit, () => props.speed], () => {
  nextTick(() => {
    stopAnimation()
    initScrollContent()
  })
})

// 监听窗口大小变化
const handleResize = () => {
  nextTick(() => {
    // 只调整副本数量，不中断动画
    const wrapper = wrapperRef.value
    const container = containerRef.value
    if (!wrapper || !container) return

    const contentWrapper = container.querySelector('[data-h-scroll-content]') as HTMLElement | null
    if (!contentWrapper) return

    const processedText = processText()
    adjustCopyCount(contentWrapper, wrapper, processedText)

    // 重新计算动画参数但不停止现有动画
    recalculateAnimationParams()
  })
}

onMounted(async () => {
  await nextTick()
  initScrollContent()

  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  stopAnimation()
  // 重置动画参数
  animationState.currentPosition = 0
  animationState.itemWidth = 0
  // 移除事件监听
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div ref="wrapperRef" v-bind="$attrs" :class="skin('h-scrolling-text')"
    :style="{ opacity: isReady ? 1 : 0, transition: 'var(--h-scrolling-text-opacity-transition)' }">
    <div ref="containerRef" :class="skin('h-scrolling-text-container')">
      <!-- 内容将在脚本中动态生成 -->
    </div>
  </div>
</template>
