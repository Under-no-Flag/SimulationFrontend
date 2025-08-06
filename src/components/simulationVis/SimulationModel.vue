<!--
 * @Description: 仿真3D模型组件
 * @Version: 1.0
 * @Author: 仿真系统开发
 * @Date: 2024-12-19
-->
<template>
  <div class="simulation-model">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>正在加载仿真模型...</p>
      </div>
    </div>

    <TresCanvas ref="tcRef" v-bind="state" window-size>
      <TresPerspectiveCamera 
        ref="perspectiveCameraRef" 
        :position="cameraPosition" 
        :fov="45" 
        :near="1" 
        :far="100000" 
      />
      <OrbitControls 
        v-bind="controlsState" 
        :target="cameraTarget"
        ref="controlsRef"
      />
      <TresAmbientLight color="#ffffff" :intensity="0.6" />
      <TresDirectionalLight :position="[100, 100, 0]" :intensity="0.8" color="#ffffff" />

      <!-- 建筑物模型 -->
      <primitive v-if="buildingState.show && cityModel" :object="cityModel" />

      <!-- 热力图 -->
      <heatmapMesh v-if="heatmapEnabled && heatmapState.show" v-bind="heatmapState" />

      <!-- 仿真数据可视化 -->
      <group v-if="simulationData && showSimulationElements">
        <!-- 人群轨迹 -->
        <template v-if="visualOptions.showTrajectories">
          <TresLine
            v-for="(trajectory, index) in trajectories"
            :key="`trajectory-${index}`"
            :points="trajectory.points"
            :color="trajectory.color"
            :line-width="2"
          />
        </template>
        
        <!-- 密度点 -->
        <template v-if="visualOptions.showDensity">
          <TresMesh
            v-for="(point, index) in densityPoints"
            :key="`density-${index}`"
            :position="point.position"
          >
            <TresSphereGeometry :args="[point.radius, 8, 6]" />
            <TresMeshBasicMaterial 
              :color="point.color" 
              :transparent="true" 
              :opacity="0.6" 
            />
          </TresMesh>
        </template>
      </group>

      <TresAxesHelper v-if="showAxesHelper" :args="[1000]" :position="[0, 19, 0]" />
      <TresGridHelper v-if="showGridHelper" :args="[6000, 100]" :position="[0, 19, 0]" />
    </TresCanvas>

    <!-- 仿真控制面板 -->
    <div class="simulation-controls">
      <div class="time-control">
        <button @click="playPause" :class="{ playing: isPlaying }" class="play-btn">
          {{ isPlaying ? '⏸️' : '▶️' }}
        </button>
        <div class="time-slider">
          <input 
            v-model="currentTime" 
            type="range" 
            :min="0" 
            :max="maxTime" 
            :step="1"
            class="slider"
            @input="onTimeChange"
          />
          <div class="time-display">
            {{ formatTime(currentTime) }} / {{ formatTime(maxTime) }}
          </div>
        </div>
        <button @click="resetSimulation" class="reset-btn">🔄</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted, ref, watchEffect, markRaw, defineComponent, h, watch } from 'vue'
import { SRGBColorSpace, BasicShadowMap, NoToneMapping, Group, DoubleSide, Texture, Color } from 'three'
import { OrbitControls } from '@tresjs/cientos'
import { useFBX } from '@tresjs/cientos'
import h337 from 'heatmap.js-fix'

// Props
interface Props {
  heatmapEnabled: boolean
  simulationData: any
}

const props = withDefaults(defineProps<Props>(), {
  heatmapEnabled: false,
  simulationData: () => ({})
})

// Emits
const emit = defineEmits<{
  'model-loaded': []
}>()

// 响应式状态
const tcRef = ref()
const perspectiveCameraRef = ref()
const controlsRef = ref()
const cityModel = ref<Group | null>(null)
const isLoading = ref(false)

// 相机状态
const cameraPosition = ref([-410, 1450, 59])
const cameraTarget = ref([0, 0, 0])

// 仿真播放控制
const isPlaying = ref(false)
const currentTime = ref(0)
const maxTime = ref(3600) // 1小时的秒数
const playbackSpeed = ref(1) // 播放速度倍数

// 可视化选项
const visualOptions = reactive({
  showTrajectories: true,
  showDensity: true,
  showFlowField: false
})

const showSimulationElements = ref(true)

// 轨迹数据
const trajectories = ref<Array<{points: number[][], color: Color}>>([])

// 密度点数据
const densityPoints = ref<Array<{position: number[], radius: number, color: Color}>>([])

// 存储模型部分的引用
const modelParts = reactive({
  cityBuildings: null as any,
  landMass: null as any,
  roads: null as any
})

// 热力图组件 - 使用heatmap.js-fix库
const heatmapMesh = defineComponent({
  name: 'HeatmapMesh',
  props: {
    position: {
      type: Array,
      default: () => [0, 0, 0]
    },
    Plane: {
      type: Array,
      default: () => [50, 50, 1000, 1000]
    },
    show2dCanvas: {
      type: Boolean,
      default: false
    },
    heightRatio: {
      type: Number,
      default: 20
    }
  },
  setup(props: any) {
    let heatmap: any = null
    let heatmapCanvas: any = null
    let texture: Texture | null = null
    let material: any = null

    const cleanup = () => {
      if (heatmapCanvas && heatmapCanvas.parentNode) {
        heatmapCanvas.parentNode.removeChild(heatmapCanvas)
        heatmapCanvas = null
      }
      if (texture) {
        texture.dispose()
        texture = null
      }
      heatmap = null
      material = null
    }

    const getRandom = (max: number, min: number) => {
      return Math.round((Math.random() * (max - min + 1) + min) * 10) / 10
    }

    const initHeatmap = () => {
      if (heatmapCanvas && heatmapCanvas.parentNode) {
        heatmapCanvas.parentNode.removeChild(heatmapCanvas)
      }

      heatmapCanvas = document.createElement("div")
      heatmapCanvas.style.width = '100px'
      heatmapCanvas.style.height = '100px'
      heatmapCanvas.style.position = 'absolute'
      heatmapCanvas.style.top = '20px'
      heatmapCanvas.style.right = '20px'
      heatmapCanvas.style.zIndex = '1000'
      heatmapCanvas.style.border = '2px solid #00d4ff'
      heatmapCanvas.style.borderRadius = '8px'
      heatmapCanvas.style.display = props.show2dCanvas ? 'block' : 'none'
      document.body.appendChild(heatmapCanvas)

      heatmap = h337.create({
        container: heatmapCanvas,
        width: 256,
        height: 256,
        blur: '.8',
        radius: 10
      })

      return heatmap
    }

    const setData = (data?: Array<any>) => {
      const max = 12
      if (!data) {
        let i = 0
        data = []
        while (i < 1000) {
          data.push({
            x: getRandom(1, 256),
            y: getRandom(1, 256),
            value: getRandom(1, 6)
          })
          i++
        }
      }
      if (heatmap) {
        heatmap.setData({
          max,
          data
        })
        if (texture) {
          texture.needsUpdate = true
        }
      }
    }

    const createTextureAndMaterial = () => {
      const heatmapInstance = initHeatmap()
      if (!heatmapInstance) return null

      if (texture) {
        texture.dispose()
      }

      texture = new Texture(heatmapInstance._renderer.canvas)
      setData()

      material = {
        transparent: true,
        side: DoubleSide,
        vertexShader: `
          uniform sampler2D heightMap;
          uniform float heightRatio;
          varying vec2 vUv;
          varying float hValue;
          varying vec3 cl;
          void main() {
            vUv = uv;
            vec3 pos = position;
            cl = texture2D(heightMap, vUv).rgb;
            hValue = texture2D(heightMap, vUv).r;
            pos.y = hValue * heightRatio;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
          }`,
        fragmentShader: `
          varying float hValue;
          varying vec3 cl;
          void main() {
            float v = abs(hValue - 1.);
            gl_FragColor = vec4(cl, .6 - v * v*0.8); 
          }`,
        uniforms: {
          heightMap: {
            type: 't',
            value: texture
          },
          heightRatio: { value: props.heightRatio }
        },
      }

      return material
    }

    const shaderMaterial = createTextureAndMaterial()

    watchEffect(() => {
      if (heatmapCanvas && heatmapCanvas.style) {
        heatmapCanvas.style.display = `${props.show2dCanvas ? 'block' : 'none'}`
      }
      if (shaderMaterial && shaderMaterial.uniforms && shaderMaterial.uniforms.heightRatio) {
        shaderMaterial.uniforms.heightRatio.value = props.heightRatio
      }
    })

    onUnmounted(() => {
      cleanup()
    })

    return () => h('TresMesh', { position: props.position }, [
      h('TresPlaneGeometry', { args: props.Plane, 'rotate-x': -Math.PI * 0.5 }),
      h('TresShaderMaterial', shaderMaterial)
    ])
  }
})

// 画布状态
const state = reactive({
  clearColor: '#0c1426',
  shadows: true,
  alpha: false,
  useLegacyLights: true,
  shadowMapType: BasicShadowMap,
  outputColorSpace: SRGBColorSpace,
  toneMapping: NoToneMapping,
  disableRender: false,
})

// 控制器状态
const controlsState = reactive({
  autoRotate: false,
  enableDamping: true
})

// 辅助工具显示状态
const showAxesHelper = ref(false)
const showGridHelper = ref(false)

// 建筑物状态控制
const buildingState = reactive({
  opacity: 0.7,
  show: true,
  buildingsColor: '#00d4ff',
  landColor: '#1a1f35'
})

// 热力图状态
const heatmapState = reactive({
  show: true,
  show2dCanvas: false,
  heightRatio: 15,
  position: [0, 20, 0],
  Plane: [800, 800, 800, 800]
})

// 方法
const loadCityModel = async () => {
  if (isLoading.value) return

  isLoading.value = true
  try {
    const path = '/plugins/digitalCity/model/shanghai.FBX'
    const model = await useFBX(path)

    if (model) {
      cityModel.value = markRaw(model)

      setTimeout(() => {
        if (model) {
          let cityBuildings = null
          let landMass = null
          let roads = null

          model.traverse((child: any) => {
            if (child.name === 'CITY_UNTRIANGULATED') {
              cityBuildings = child
            }
            if (child.name === 'LANDMASS') {
              landMass = child
            }
            if (child.name === 'ROADS') {
              roads = child
            }
          })

          // 设置建筑物材质
          if (cityBuildings && (cityBuildings as any).material) {
            const material = (cityBuildings as any).material
            material.transparent = true
            material.opacity = buildingState.opacity
            material.color.setHex(buildingState.buildingsColor.replace('#', '0x'))
          }

          // 设置地面材质
          if (landMass) {
            const landMaterial = (landMass as any).material
            const materials = Array.isArray(landMaterial) ? landMaterial : [landMaterial]
            materials.forEach((material: any) => {
              if (material) {
                material.color.setHex(buildingState.landColor.replace('#', '0x'))
                material.side = 2
              }
            })
          }

          modelParts.cityBuildings = cityBuildings
          modelParts.landMass = landMass
          modelParts.roads = roads

          emit('model-loaded')
        }
      }, 100)
    }
  } catch (error: any) {
    console.error('加载模型失败:', error)
  } finally {
    isLoading.value = false
  }
}

const generateSimulationData = () => {
  // 生成轨迹数据
  trajectories.value = []
  for (let i = 0; i < 20; i++) {
    const points = []
    const startX = (Math.random() - 0.5) * 1000
    const startZ = (Math.random() - 0.5) * 1000
    const endX = (Math.random() - 0.5) * 1000
    const endZ = (Math.random() - 0.5) * 1000
    
    for (let j = 0; j <= 50; j++) {
      const t = j / 50
      points.push([
        startX + (endX - startX) * t,
        20 + Math.sin(t * Math.PI * 2) * 10,
        startZ + (endZ - startZ) * t
      ])
    }
    
    trajectories.value.push({
      points,
      color: new Color().setHSL(Math.random(), 0.8, 0.6)
    })
  }

  // 生成密度点数据
  densityPoints.value = []
  for (let i = 0; i < 100; i++) {
    const density = Math.random()
    densityPoints.value.push({
      position: [
        (Math.random() - 0.5) * 800,
        20,
        (Math.random() - 0.5) * 800
      ],
      radius: 5 + density * 15,
      color: new Color().setHSL(0.1 - density * 0.1, 0.8, 0.6)
    })
  }
}

const playPause = () => {
  isPlaying.value = !isPlaying.value
}

const resetSimulation = () => {
  isPlaying.value = false
  currentTime.value = 0
}

const onTimeChange = () => {
  // 根据时间更新仿真显示
  updateSimulationDisplay()
}

const updateSimulationDisplay = () => {
  // 根据当前时间更新仿真元素的显示
  const progress = currentTime.value / maxTime.value
  
  // 更新轨迹显示
  trajectories.value.forEach((trajectory, index) => {
    const visiblePoints = Math.floor(trajectory.points.length * progress)
    if (visiblePoints > 0) {
      trajectory.points = trajectory.points.slice(0, visiblePoints)
    }
  })
}

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const resetView = () => {
  cameraPosition.value = [-410, 1450, 59]
  cameraTarget.value = [0, 0, 0]
  if (controlsRef.value) {
    controlsRef.value.reset()
  }
}

// 定时器
let animationTimer: NodeJS.Timeout | null = null

// 监听播放状态
watch(isPlaying, (playing) => {
  if (playing) {
    animationTimer = setInterval(() => {
      if (currentTime.value < maxTime.value) {
        currentTime.value += playbackSpeed.value
      } else {
        isPlaying.value = false
      }
    }, 1000 / 60) // 60 FPS
  } else {
    if (animationTimer) {
      clearInterval(animationTimer)
      animationTimer = null
    }
  }
})

// 监听仿真数据变化
watch(() => props.simulationData, () => {
  generateSimulationData()
}, { deep: true })

// 暴露方法给父组件
defineExpose({
  resetView,
  playPause,
  resetSimulation
})

onMounted(() => {
  loadCityModel()
  generateSimulationData()
})

onUnmounted(() => {
  if (animationTimer) {
    clearInterval(animationTimer)
  }
})
</script>

<style scoped>
.simulation-model {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.loading-spinner {
  text-align: center;
  color: #00d4ff;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(0, 212, 255, 0.3);
  border-top: 3px solid #00d4ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner p {
  margin: 0;
  font-size: 16px;
  opacity: 0.8;
}

.simulation-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 1rem;
  z-index: 1000;
}

.time-control {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.play-btn, .reset-btn {
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.5);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1.2rem;
  min-width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-btn:hover, .reset-btn:hover {
  background: rgba(0, 212, 255, 0.3);
  transform: translateY(-2px);
}

.play-btn.playing {
  background: #00d4ff;
  color: #0c1426;
}

.time-slider {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #00d4ff;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #00d4ff;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.time-display {
  color: #00d4ff;
  font-size: 0.9rem;
  text-align: center;
  font-family: 'Courier New', monospace;
}

@media (max-width: 768px) {
  .simulation-controls {
    bottom: 10px;
    left: 10px;
    right: 10px;
    padding: 0.75rem;
  }
  
  .time-control {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .play-btn, .reset-btn {
    font-size: 1rem;
    min-width: 40px;
    height: 40px;
  }
}
</style>
