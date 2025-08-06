<!--
 * @Description: 环形图组件 - 无需外部库的纯CSS+Canvas实现
 * @Version: 1.0
 * @Author: 仿真系统开发
 * @Date: 2024-12-19
-->
<template>
  <div class="pie-chart" :style="{ height: height + 'px' }">
    <div class="chart-header" v-if="title">
      <h6>{{ title }}</h6>
    </div>
    <div class="chart-container" ref="chartContainer">
      <canvas 
        ref="chartCanvas" 
        :width="canvasWidth" 
        :height="canvasHeight"
        @mousemove="onMouseMove"
        @mouseleave="onMouseLeave"
        @click="onClick"
      ></canvas>
      
      <!-- 图例 -->
      <div class="legend">
        <div 
          v-for="(item, index) in legendItems" 
          :key="index"
          class="legend-item"
          :class="{ highlighted: highlightedIndex === index }"
          @mouseenter="highlightSegment(index)"
          @mouseleave="clearHighlight"
        >
          <div class="legend-color" :style="{ backgroundColor: item.color }"></div>
          <span class="legend-label">{{ item.label }}</span>
          <span class="legend-value">{{ item.value }}{{ showPercentage ? '%' : '' }}</span>
        </div>
      </div>
      
      <!-- 工具提示 -->
      <div 
        v-if="tooltip.show" 
        class="tooltip" 
        :style="{ 
          left: tooltip.x + 'px', 
          top: tooltip.y + 'px' 
        }"
      >
        <div class="tooltip-title">{{ tooltip.label }}</div>
        <div class="tooltip-value">{{ tooltip.value }}{{ showPercentage ? '%' : '' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'

interface ChartData {
  labels: string[]
  datasets: Array<{
    data: number[]
    backgroundColor: string[]
  }>
}

interface Props {
  data: ChartData
  height: number
  title?: string
  showPercentage?: boolean
  innerRadius?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 300,
  title: '',
  showPercentage: true,
  innerRadius: 0.5
})

const emit = defineEmits<{
  'segment-click': [data: { label: string, value: number, index: number }]
}>()

const chartContainer = ref<HTMLDivElement>()
const chartCanvas = ref<HTMLCanvasElement>()
const canvasWidth = ref(400)
const canvasHeight = ref(300)
const highlightedIndex = ref(-1)

const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  label: '',
  value: ''
})

let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null
let segments: Array<{
  startAngle: number
  endAngle: number
  color: string
  value: number
  label: string
  index: number
}> = []

const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    updateCanvasSize()
    drawChart()
  }
})

// 计算图例数据
const legendItems = computed(() => {
  if (!props.data.labels.length || !props.data.datasets.length) return []
  
  const dataset = props.data.datasets[0]
  const total = dataset.data.reduce((sum, val) => sum + val, 0)
  
  return props.data.labels.map((label, index) => {
    const value = dataset.data[index]
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0
    
    return {
      label,
      value: props.showPercentage ? percentage : value,
      color: dataset.backgroundColor[index] || '#ccc'
    }
  })
})

const updateCanvasSize = () => {
  if (chartContainer.value && chartCanvas.value) {
    const rect = chartContainer.value.getBoundingClientRect()
    const size = Math.min(rect.width * 0.6, props.height - 80) // 给图例留空间
    canvasWidth.value = size
    canvasHeight.value = size
    
    // 设置高DPI支持
    const dpr = window.devicePixelRatio || 1
    chartCanvas.value.width = canvasWidth.value * dpr
    chartCanvas.value.height = canvasHeight.value * dpr
    chartCanvas.value.style.width = canvasWidth.value + 'px'
    chartCanvas.value.style.height = canvasHeight.value + 'px'
    
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
  }
}

const drawChart = () => {
  if (!ctx || !props.data.labels.length || !props.data.datasets.length) return

  // 清空画布
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  const dataset = props.data.datasets[0]
  const total = dataset.data.reduce((sum, val) => sum + val, 0)
  
  if (total === 0) return

  const centerX = canvasWidth.value / 2
  const centerY = canvasHeight.value / 2
  const outerRadius = Math.min(centerX, centerY) - 20
  const innerRadius = outerRadius * props.innerRadius

  let currentAngle = -Math.PI / 2 // 从顶部开始
  segments = []

  dataset.data.forEach((value, index) => {
    const sliceAngle = (value / total) * 2 * Math.PI
    const endAngle = currentAngle + sliceAngle
    const color = dataset.backgroundColor[index] || '#ccc'
    const label = props.data.labels[index]

    // 存储分段信息
    segments.push({
      startAngle: currentAngle,
      endAngle,
      color,
      value,
      label,
      index
    })

    // 绘制扇形
    if (ctx) {
      drawSegment(ctx, centerX, centerY, innerRadius, outerRadius, currentAngle, endAngle, color, index === highlightedIndex.value)
    }

    currentAngle = endAngle
  })

  // 绘制中心文本
  if (props.innerRadius > 0) {
    drawCenterText(ctx, centerX, centerY, total)
  }
}

const drawSegment = (
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  color: string,
  isHighlighted: boolean
) => {
  const radius = isHighlighted ? outerRadius + 10 : outerRadius

  // 绘制扇形
  context.beginPath()
  context.arc(centerX, centerY, radius, startAngle, endAngle)
  context.arc(centerX, centerY, innerRadius, endAngle, startAngle, true)
  context.closePath()

  // 填充颜色
  context.fillStyle = color
  context.fill()

  // 添加边框
  context.strokeStyle = '#0c1426'
  context.lineWidth = 2
  context.stroke()

  // 高亮效果
  if (isHighlighted) {
    context.shadowColor = color
    context.shadowBlur = 20
    context.fill()
    context.shadowBlur = 0
  }
}

const drawCenterText = (
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  total: number
) => {
  context.fillStyle = '#ffffff'
  context.font = 'bold 16px Arial'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  
  const text = props.showPercentage ? '100%' : total.toString()
  context.fillText(text, centerX, centerY - 5)
  
  context.font = '12px Arial'
  context.fillStyle = 'rgba(255, 255, 255, 0.8)'
  context.fillText('总计', centerX, centerY + 15)
}

const getSegmentFromPosition = (x: number, y: number) => {
  const centerX = canvasWidth.value / 2
  const centerY = canvasHeight.value / 2
  const dx = x - centerX
  const dy = y - centerY
  const distance = Math.sqrt(dx * dx + dy * dy)
  const outerRadius = Math.min(centerX, centerY) - 20
  const innerRadius = outerRadius * props.innerRadius

  // 检查是否在环形区域内
  if (distance < innerRadius || distance > outerRadius + 10) {
    return null
  }

  // 计算角度
  let angle = Math.atan2(dy, dx) + Math.PI / 2
  if (angle < 0) angle += 2 * Math.PI

  // 查找对应的分段
  return segments.find(segment => 
    angle >= segment.startAngle && angle <= segment.endAngle
  )
}

const onMouseMove = (event: MouseEvent) => {
  const rect = chartCanvas.value?.getBoundingClientRect()
  if (!rect) return

  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const segment = getSegmentFromPosition(x, y)
  
  if (segment) {
    highlightedIndex.value = segment.index
    
    tooltip.value = {
      show: true,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top - 40,
      label: segment.label,
      value: segment.value.toString()
    }
    
    drawChart() // 重绘以显示高亮
  } else {
    highlightedIndex.value = -1
    tooltip.value.show = false
    drawChart()
  }
}

const onMouseLeave = () => {
  highlightedIndex.value = -1
  tooltip.value.show = false
  drawChart()
}

const onClick = (event: MouseEvent) => {
  const rect = chartCanvas.value?.getBoundingClientRect()
  if (!rect) return

  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const segment = getSegmentFromPosition(x, y)
  
  if (segment) {
    emit('segment-click', {
      label: segment.label,
      value: segment.value,
      index: segment.index
    })
  }
}

const highlightSegment = (index: number) => {
  highlightedIndex.value = index
  drawChart()
}

const clearHighlight = () => {
  highlightedIndex.value = -1
  drawChart()
}

watch(() => props.data, () => {
  nextTick(() => {
    drawChart()
  })
}, { deep: true })

onMounted(async () => {
  await nextTick()
  
  if (chartCanvas.value) {
    ctx = chartCanvas.value.getContext('2d')
    if (ctx) {
      updateCanvasSize()
      drawChart()
    }
  }

  if (chartContainer.value) {
    resizeObserver.observe(chartContainer.value)
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  resizeObserver.disconnect()
})
</script>

<style scoped>
.pie-chart {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  overflow: hidden;
}

.chart-header {
  padding: 1rem 1.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-header h6 {
  margin: 0;
  color: #00d4ff;
  font-size: 1rem;
  font-weight: 500;
}

.chart-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1rem;
}

canvas {
  display: block;
  cursor: pointer;
  flex-shrink: 0;
}

.legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 150px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.legend-item:hover {
  background: rgba(0, 212, 255, 0.1);
  transform: translateX(5px);
}

.legend-item.highlighted {
  background: rgba(0, 212, 255, 0.2);
  border: 1px solid rgba(0, 212, 255, 0.5);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
}

.legend-label {
  color: #ffffff;
  flex: 1;
}

.legend-value {
  color: #00d4ff;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: #ffffff;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #00d4ff;
  font-size: 0.8rem;
  pointer-events: none;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.tooltip-title {
  color: #00d4ff;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.tooltip-value {
  color: #ffffff;
  font-weight: bold;
}

@media (max-width: 768px) {
  .chart-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .legend {
    min-width: auto;
    width: 100%;
  }
  
  .chart-header {
    padding: 0.75rem 1rem 0;
  }
  
  .chart-header h6 {
    font-size: 0.9rem;
  }
}
</style>
