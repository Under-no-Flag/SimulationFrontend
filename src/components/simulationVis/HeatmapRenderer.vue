<template>
  <div class="heatmap-renderer">
    <!-- 热力图渲染区域 -->
    <div class="renderer-container">
      <canvas ref="heatmapCanvas" width="512" height="512" class="heatmap-canvas"></canvas>
    </div>
    
    <!-- 渲染控制 -->
    <div class="renderer-controls">
      <div class="control-group">
        <label class="control-label">热力图透明度</label>
        <input
          type="range"
          v-model="opacity"
          min="0.1"
          max="1.0"
          step="0.1"
          class="control-slider"
        />
        <span class="control-value">{{ opacity }}</span>
      </div>
      
      <div class="control-group">
        <label class="control-label">热力图大小</label>
        <input
          type="range"
          v-model="size"
          min="10"
          max="100"
          step="5"
          class="control-slider"
        />
        <span class="control-value">{{ size }}m</span>
      </div>
      
      <div class="control-group">
        <label class="control-label">模糊程度</label>
        <input
          type="range"
          v-model="blur"
          min="0.1"
          max="1.0"
          step="0.1"
          class="control-slider"
        />
        <span class="control-value">{{ blur }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Texture, PlaneGeometry, MeshBasicMaterial, Mesh, DoubleSide } from 'three'
import { markRaw } from 'vue'
import h337 from 'heatmap.js-fix'

// Props
const props = defineProps({
  data: {
    type: Object,
    default: null
  },
  enabled: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['mesh-updated'])

// 响应式状态
const heatmapCanvas = ref(null)
const opacity = ref(0.7)
const size = ref(50)
const blur = ref(0.75)

// 热力图实例
let heatmapInstance = null
let heatmapMesh = null

// 热力图配置
const heatmapConfig = {
  container: null,
  maxOpacity: 0.8,
  minOpacity: 0.1,
  blur: 0.75,
  gradient: {
    '0.0': '#313695',
    '0.1': '#4575b4',
    '0.2': '#74add1',
    '0.3': '#abd9e9',
    '0.4': '#e0f3f8',
    '0.5': '#ffffbf',
    '0.6': '#fee090',
    '0.7': '#fdae61',
    '0.8': '#f46d43',
    '0.9': '#d73027',
    '1.0': '#a50026'
  }
}

// 初始化热力图
const initHeatmap = () => {
  if (!heatmapCanvas.value) return

  try {
    heatmapInstance = h337.create({
      ...heatmapConfig,
      container: heatmapCanvas.value,
      width: 512,
      height: 512,
      blur: blur.value
    })
  } catch (error) {
    console.error('热力图初始化失败:', error)
  }
}

// 创建Three.js网格
const createHeatmapMesh = () => {
  if (!heatmapCanvas.value) return

  try {
    // 创建纹理
    const texture = new Texture(heatmapCanvas.value)
    texture.needsUpdate = true

    // 创建几何体和材质
    const geometry = new PlaneGeometry(size.value, size.value)
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: opacity.value,
      side: DoubleSide
    })

    // 创建网格
    const mesh = new Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2 // 水平放置
    mesh.position.y = 0.1 // 稍微抬高避免z-fighting

    heatmapMesh = markRaw(mesh)
    emit('mesh-updated', heatmapMesh)
  } catch (error) {
    console.error('热力图网格创建失败:', error)
  }
}

// 更新热力图数据
const updateHeatmapData = (data) => {
  if (!heatmapInstance || !data) return

  try {
    // 转换坐标系统（从世界坐标到画布坐标）
    const canvasWidth = 512
    const canvasHeight = 512
    const worldBounds = { x: [-25, 25], y: [-25, 25] }
    
    const points = data.points.map(point => {
      // 将世界坐标转换为画布坐标
      const canvasX = ((point.x - worldBounds.x[0]) / (worldBounds.x[1] - worldBounds.x[0])) * canvasWidth
      const canvasY = ((point.y - worldBounds.y[0]) / (worldBounds.y[1] - worldBounds.y[0])) * canvasHeight
      
      return {
        x: Math.max(0, Math.min(canvasX, canvasWidth)),
        y: Math.max(0, Math.min(canvasY, canvasHeight)),
        value: point.value || point.intensity || 0.5
      }
    })

    // 设置热力图数据
    heatmapInstance.setData({
      max: 1,
      data: points
    })

    // 更新纹理
    if (heatmapMesh && heatmapMesh.material.map) {
      heatmapMesh.material.map.needsUpdate = true
    }
  } catch (error) {
    console.error('热力图数据更新失败:', error)
  }
}

// 更新网格属性
const updateMeshProperties = () => {
  if (!heatmapMesh) return

  // 更新透明度
  if (heatmapMesh.material) {
    heatmapMesh.material.opacity = opacity.value
  }

  // 更新大小
  if (heatmapMesh.geometry) {
    heatmapMesh.geometry.dispose()
    heatmapMesh.geometry = new PlaneGeometry(size.value, size.value)
  }
}

// 监听数据变化
watch(() => props.data, (newData) => {
  if (newData && props.enabled) {
    updateHeatmapData(newData)
  }
}, { deep: true })

// 监听启用状态
watch(() => props.enabled, (enabled) => {
  if (enabled) {
    nextTick(() => {
      initHeatmap()
      createHeatmapMesh()
      if (props.data) {
        updateHeatmapData(props.data)
      }
    })
  } else {
    // 清理资源
    if (heatmapInstance) {
      heatmapInstance = null
    }
    if (heatmapMesh) {
      heatmapMesh.geometry?.dispose()
      heatmapMesh.material?.dispose()
      heatmapMesh = null
    }
    emit('mesh-updated', null)
  }
})

// 监听控制参数变化
watch([opacity, size, blur], () => {
  if (props.enabled) {
    updateMeshProperties()
    
    // 重新创建热力图实例以更新模糊设置
    if (blur.value !== heatmapConfig.blur) {
      heatmapConfig.blur = blur.value
      if (heatmapInstance) {
        initHeatmap()
        if (props.data) {
          updateHeatmapData(props.data)
        }
      }
    }
  }
})

// 生命周期
onMounted(() => {
  if (props.enabled) {
    nextTick(() => {
      initHeatmap()
      createHeatmapMesh()
    })
  }
})

onUnmounted(() => {
  // 清理资源
  if (heatmapInstance) {
    heatmapInstance = null
  }
  if (heatmapMesh) {
    heatmapMesh.geometry?.dispose()
    heatmapMesh.material?.dispose()
    heatmapMesh = null
  }
})

// 暴露方法
defineExpose({
  getMesh: () => heatmapMesh,
  updateData: updateHeatmapData,
  updateProperties: updateMeshProperties
})
</script>

<style scoped>
.heatmap-renderer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.renderer-container {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  justify-content: center;
}

.heatmap-canvas {
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.5);
}

.renderer-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-label {
  min-width: 100px;
  color: #00d4ff;
  font-size: 0.9rem;
  font-weight: 500;
}

.control-slider {
  flex: 1;
  height: 6px;
  background: rgba(0, 212, 255, 0.2);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.control-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #00d4ff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.control-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #00d4ff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.control-value {
  min-width: 40px;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: bold;
  text-align: right;
}
</style> 