<!--
 * @Description: 折线图组件 - 无需外部库的纯CSS+Canvas实现
 * @Version: 1.0
 * @Author: 仿真系统开发
 * @Date: 2024-12-19
-->
<template>
  <div class="line-chart" :style="{ height: height + 'px' }">
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
      ></canvas>

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
        <div class="tooltip-value">{{ tooltip.value }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    borderColor: string
    backgroundColor?: string
    tension?: number
  }>
}

interface Props {
  data: ChartData
  height: number
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: 300,
  title: ''
})

const emit = defineEmits<{
  'point-hover': [data: { label: string, value: number, datasetIndex: number, pointIndex: number }]
}>()

const chartContainer = ref<HTMLDivElement>()
const chartCanvas = ref<HTMLCanvasElement>()
const canvasWidth = ref(800)
const canvasHeight = ref(300)

const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  label: '',
  value: ''
})

let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null

const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    updateCanvasSize()
    drawChart()
  }
})

const updateCanvasSize = () => {
  if (chartContainer.value && chartCanvas.value) {
    const rect = chartContainer.value.getBoundingClientRect()
    canvasWidth.value = rect.width
    canvasHeight.value = props.height - 40 // 减去标题高度

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
  if (!ctx || !props.data.labels.length) return

  // 清空画布
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  // 计算边距
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const chartWidth = canvasWidth.value - padding.left - padding.right
  const chartHeight = canvasHeight.value - padding.top - padding.bottom

  // 计算数据范围
  const allValues = props.data.datasets.flatMap(dataset => dataset.data)
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const valueRange = maxValue - minValue || 1

  // 绘制网格线
  drawGrid(ctx, padding, chartWidth, chartHeight, minValue, maxValue)

  // 绘制坐标轴
  drawAxes(ctx, padding, chartWidth, chartHeight)

  // 绘制数据线
  props.data.datasets.forEach((dataset, datasetIndex) => {
    if (ctx) {
      drawLine(ctx, dataset, padding, chartWidth, chartHeight, minValue, valueRange, datasetIndex)
    }
  })

  // 绘制标签
  drawLabels(ctx, padding, chartWidth, chartHeight, minValue, maxValue)
}

const drawGrid = (
  context: CanvasRenderingContext2D,
  padding: any,
  chartWidth: number,
  chartHeight: number,
  minValue: number,
  maxValue: number
) => {
  context.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  context.lineWidth = 1

  // 垂直网格线
  const stepX = chartWidth / (props.data.labels.length - 1)
  for (let i = 0; i < props.data.labels.length; i++) {
    const x = padding.left + i * stepX
    context.beginPath()
    context.moveTo(x, padding.top)
    context.lineTo(x, padding.top + chartHeight)
    context.stroke()
  }

  // 水平网格线
  const gridLines = 5
  const stepY = chartHeight / gridLines
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + i * stepY
    context.beginPath()
    context.moveTo(padding.left, y)
    context.lineTo(padding.left + chartWidth, y)
    context.stroke()
  }
}

const drawAxes = (
  context: CanvasRenderingContext2D,
  padding: any,
  chartWidth: number,
  chartHeight: number
) => {
  context.strokeStyle = 'rgba(0, 212, 255, 0.5)'
  context.lineWidth = 2

  // X轴
  context.beginPath()
  context.moveTo(padding.left, padding.top + chartHeight)
  context.lineTo(padding.left + chartWidth, padding.top + chartHeight)
  context.stroke()

  // Y轴
  context.beginPath()
  context.moveTo(padding.left, padding.top)
  context.lineTo(padding.left, padding.top + chartHeight)
  context.stroke()
}

const drawLine = (
  context: CanvasRenderingContext2D,
  dataset: any,
  padding: any,
  chartWidth: number,
  chartHeight: number,
  minValue: number,
  valueRange: number,
  datasetIndex: number
) => {
  const stepX = chartWidth / (props.data.labels.length - 1)

  // 绘制线条
  context.strokeStyle = dataset.borderColor
  context.lineWidth = 3
  context.lineCap = 'round'
  context.lineJoin = 'round'

  context.beginPath()
  dataset.data.forEach((value: number, index: number) => {
    const x = padding.left + index * stepX
    const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight

    if (index === 0) {
      context.moveTo(x, y)
    } else {
      if (dataset.tension && dataset.tension > 0) {
        // 平滑曲线
        const prevX = padding.left + (index - 1) * stepX
        const prevY = padding.top + chartHeight - ((dataset.data[index - 1] - minValue) / valueRange) * chartHeight
        const cp1x = prevX + stepX * dataset.tension
        const cp1y = prevY
        const cp2x = x - stepX * dataset.tension
        const cp2y = y
        context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
      } else {
        context.lineTo(x, y)
      }
    }
  })
  context.stroke()

  // 绘制区域填充
  if (dataset.backgroundColor) {
    const gradient = context.createLinearGradient(0, padding.top, 0, padding.top + chartHeight)
    gradient.addColorStop(0, dataset.backgroundColor)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

    context.fillStyle = gradient
    context.lineTo(padding.left + chartWidth, padding.top + chartHeight)
    context.lineTo(padding.left, padding.top + chartHeight)
    context.fill()
  }

  // 绘制数据点
  context.fillStyle = dataset.borderColor
  dataset.data.forEach((value: number, index: number) => {
    const x = padding.left + index * stepX
    const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight

    context.beginPath()
    context.arc(x, y, 4, 0, 2 * Math.PI)
    context.fill()

    // 添加发光效果
    context.shadowColor = dataset.borderColor
    context.shadowBlur = 10
    context.beginPath()
    context.arc(x, y, 2, 0, 2 * Math.PI)
    context.fill()
    context.shadowBlur = 0
  })
}

const drawLabels = (
  context: CanvasRenderingContext2D,
  padding: any,
  chartWidth: number,
  chartHeight: number,
  minValue: number,
  maxValue: number
) => {
  context.fillStyle = 'rgba(255, 255, 255, 0.8)'
  context.font = '12px Arial'
  context.textAlign = 'center'

  // X轴标签
  const stepX = chartWidth / (props.data.labels.length - 1)
  props.data.labels.forEach((label, index) => {
    const x = padding.left + index * stepX
    const y = padding.top + chartHeight + 20
    context.fillText(label, x, y)
  })

  // Y轴标签
  context.textAlign = 'right'
  const gridLines = 5
  const stepY = chartHeight / gridLines
  const stepValue = (maxValue - minValue) / gridLines

  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + chartHeight - i * stepY + 5
    const value = minValue + i * stepValue
    context.fillText(Math.round(value).toString(), padding.left - 10, y)
  }
}

const onMouseMove = (event: MouseEvent) => {
  const rect = chartCanvas.value?.getBoundingClientRect()
  if (!rect) return

  const x = event.clientX - rect.left

  // 计算最近的数据点
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const chartWidth = canvasWidth.value - padding.left - padding.right
  const stepX = chartWidth / (props.data.labels.length - 1)

  const pointIndex = Math.round((x - padding.left) / stepX)

  if (pointIndex >= 0 && pointIndex < props.data.labels.length) {
    const label = props.data.labels[pointIndex]
    const dataset = props.data.datasets[0] // 取第一个数据集
    const value = dataset.data[pointIndex]

    tooltip.value = {
      show: true,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top - 40,
      label,
      value: value.toString()
    }

    emit('point-hover', {
      label,
      value,
      datasetIndex: 0,
      pointIndex
    })
  }
}

const onMouseLeave = () => {
  tooltip.value.show = false
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
.line-chart {
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
  width: 100%;
  overflow: hidden;
}

canvas {
  display: block;
  cursor: crosshair;
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
  .chart-header {
    padding: 0.75rem 1rem 0;
  }

  .chart-header h6 {
    font-size: 0.9rem;
  }
}
</style>
