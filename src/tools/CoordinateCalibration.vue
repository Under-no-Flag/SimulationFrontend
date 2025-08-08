<template>
  <div class="calibration-tool">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-header">
        <h2>FBX模型经纬度校准工具</h2>
        <div class="toolbar-info">
          <span class="info-badge">已预加载{{ calibrationPoints.length }}个校准点</span>
          <span class="info-badge" :class="{ 'success': calibrationPoints.filter(p => p.lat != null && p.lon != null).length >= 3 }">
            有效点: {{ calibrationPoints.filter(p => p.lat != null && p.lon != null).length }}/3
          </span>
          <span class="info-text">可直接计算转换参数或添加新的校准点</span>
        </div>
      </div>
      <div class="toolbar-buttons">
        <button class="btn primary" @click="addCalibrationPoint" :disabled="!selectedPoint">
          添加校准点
        </button>
        <button class="btn secondary" @click="clearAllPoints">
          清空所有点
        </button>
        <button class="btn info" @click="resetToDefaultPoints">
          重置为默认点
        </button>
        <button class="btn success" @click="calculateTransformation" :disabled="calibrationPoints.filter(p => p.lat != null && p.lon != null).length < 3">
          计算转换参数 ({{ calibrationPoints.filter(p => p.lat != null && p.lon != null).length }}/3)
        </button>
        <button class="btn info" @click="exportCalibration" :disabled="!transformationMatrix">
          导出校准数据
        </button>
        <div class="heatmap-config">
          <label>热力图尺寸:</label>
          <input type="number" v-model.number="heatmapWidth" min="50" max="2048" placeholder="宽度" class="size-input" />
          <span>×</span>
          <input type="number" v-model.number="heatmapHeight" min="50" max="2048" placeholder="高度" class="size-input" />
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 3D模型显示区域 -->
      <div class="model-section">
        <div class="section-header">
          <h3>3D模型 - 点击选择校准点</h3>
          <div class="model-info">
            <div v-if="selectedPoint">
              <div class="coord-display">
                <span class="coord-label">模型坐标:</span>
                <span>X={{ selectedPoint.x.toFixed(2) }}, Y={{ selectedPoint.y.toFixed(2) }}, Z={{ selectedPoint.z.toFixed(2) }}</span>
              </div>
              <div v-if="selectedPointHeatmapCoords" class="coord-display">
                <span class="coord-label">热力图坐标:</span>
                <span>UV({{ selectedPointHeatmapCoords.u.toFixed(4) }}, {{ selectedPointHeatmapCoords.v.toFixed(4) }}), Canvas({{ selectedPointHeatmapCoords.canvasX.toFixed(0) }}, {{ selectedPointHeatmapCoords.canvasY.toFixed(0) }}) [{{ selectedPointHeatmapCoords.heatmapWidth }}×{{ selectedPointHeatmapCoords.heatmapHeight }}]</span>
              </div>
              <div v-if="transformationMatrix && transformationMatrix.affineCoeffs" class="coord-display">
                <span class="coord-label">预测经纬度:</span>
                <span>{{ (transformationMatrix.affineCoeffs.a1 * selectedPoint.x + transformationMatrix.affineCoeffs.b1 * selectedPoint.z + transformationMatrix.affineCoeffs.c1).toFixed(6) }}, {{ (transformationMatrix.affineCoeffs.a2 * selectedPoint.x + transformationMatrix.affineCoeffs.b2 * selectedPoint.z + transformationMatrix.affineCoeffs.c2).toFixed(6) }}</span>
              </div>
            </div>
            <span v-else>请在模型上点击选择校准点</span>
          </div>
        </div>
        <div class="model-container" ref="sceneContainer">
          <!-- 加载状态 -->
          <div v-if="isLoading" class="loading-overlay">
            <div class="loading-spinner">
              <div class="spinner"></div>
              <p>正在加载模型...</p>
            </div>
          </div>

          <!-- 3D场景 -->
          <TresCanvas v-if="cityFBX && cityFBX.model" ref="tcRef" v-bind="gl" :antialias="true">
            <TresPerspectiveCamera 
              :position="[600, 750, -1221]" 
              :fov="45" 
              :near="1" 
              :far="100000" 
            />
            <OrbitControls 
              :auto-rotate="false" 
              :enable-damping="true"
              :enable-rotate="true"
              :enable-pan="true"
              :enable-zoom="true"
            />
            <TresAmbientLight color="#ffffff" :intensity="0.6" />
            <TresDirectionalLight :position="[100, 100, 0]" :intensity="0.8" color="#ffffff" />
            
            <!-- 基础地图模型 -->
            <primitive 
              v-if="cityFBX.model" 
              :object="cityFBX.model" 
              @click="onModelClick"
            />
            
            <!-- 校准点标记 -->
            <TresGroup v-for="(point, index) in calibrationPoints" :key="index">
              <!-- 标记球体 -->
              <TresMesh :position="[point.modelX, point.modelY, point.modelZ]">
                <TresSphereGeometry :args="[20, 16, 16]" />
                <TresMeshBasicMaterial :color="point.color" />
              </TresMesh>
              <!-- 标记文字 -->
              <Html :position="[point.modelX, point.modelY + 50, point.modelZ]">
                <div class="point-label">
                  <div class="point-name">{{ point.name }}</div>
                  <div class="point-coords">
                    模型: ({{ point.modelX.toFixed(1) }}, {{ point.modelY.toFixed(1) }}, {{ point.modelZ.toFixed(1) }})
                  </div>
                  <div class="point-coords" v-if="point.lat && point.lon">
                    经纬度: ({{ point.lat }}, {{ point.lon }})
                  </div>
                </div>
              </Html>
            </TresGroup>
          </TresCanvas>

          <!-- 占位符 -->
          <div v-if="!cityFBX && !isLoading" class="model-placeholder">
            <div class="placeholder-content">
              <div class="placeholder-icon">🗺️</div>
              <h3>模型加载区域</h3>
              <p>点击下方按钮加载FBX模型</p>
              <button class="btn primary" @click="loadCityModel">加载模型</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 控制面板 -->
      <div class="control-panel">
        <!-- 校准点列表 -->
        <div class="panel-section">
          <div class="section-header">
            <h4>校准点列表 ({{ calibrationPoints.length }}/10)</h4>
          </div>
          <div class="points-list">
            <div v-if="calibrationPoints.length === 0" class="empty-state">
              <p>暂无校准点，请在模型上点击添加</p>
            </div>
            <div 
              v-for="(point, index) in calibrationPoints" 
              :key="index"
              class="point-item"
              :class="{ editing: editingIndex === index }"
            >
              <div class="point-header">
                <div class="point-info">
                  <span class="point-color" :style="{ backgroundColor: point.color }"></span>
                  <span class="point-name">{{ point.name }}</span>
                </div>
                <div class="point-actions">
                  <button class="btn-small" @click="editPoint(index)" v-if="editingIndex !== index">
                    编辑
                  </button>
                  <button class="btn-small success" @click="savePoint(index)" v-if="editingIndex === index">
                    保存
                  </button>
                  <button class="btn-small danger" @click="deletePoint(index)">
                    删除
                  </button>
                </div>
              </div>
              
              <div class="point-details">
                <div class="coord-group">
                  <label>模型坐标:</label>
                  <span>X: {{ point.modelX.toFixed(2) }}, Y: {{ point.modelY.toFixed(2) }}, Z: {{ point.modelZ.toFixed(2) }}</span>
                </div>
                
                <div class="coord-group" v-if="editingIndex !== index">
                  <label>经纬度:</label>
                  <span v-if="point.lat && point.lon">
                    纬度: {{ point.lat }}, 经度: {{ point.lon }}
                  </span>
                  <span v-else class="missing-coords">请编辑添加经纬度</span>
                </div>
                
                <!-- 编辑模式 -->
                <div class="coord-edit" v-if="editingIndex === index">
                  <div class="input-group">
                    <label>点名称:</label>
                    <input 
                      type="text" 
                      v-model="editingPoint.name" 
                      placeholder="如: 外滩入口"
                      class="coord-input"
                    />
                  </div>
                  <div class="input-group">
                    <label>纬度 (Latitude):</label>
                    <input 
                      type="number" 
                      v-model.number="editingPoint.lat" 
                      step="0.000001"
                      placeholder="如: 31.240000"
                      class="coord-input"
                    />
                  </div>
                  <div class="input-group">
                    <label>经度 (Longitude):</label>
                    <input 
                      type="number" 
                      v-model.number="editingPoint.lon" 
                      step="0.000001"
                      placeholder="如: 121.490000"
                      class="coord-input"
                    />
                  </div>
                  <div class="input-group">
                    <label>备注:</label>
                    <textarea 
                      v-model="editingPoint.description" 
                      placeholder="描述这个点的特征..."
                      class="coord-textarea"
                      rows="2"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 转换参数显示 -->
        <div class="panel-section" v-if="transformationMatrix">
          <div class="section-header">
            <h4>计算得到的转换参数</h4>
          </div>
          <div class="transformation-result">
            <div class="param-group">
              <label>仿射变换系数 (核心映射关系):</label>
              <div class="bounds-info">
                <div><strong>纬度计算:</strong> lat = {{ transformationMatrix.affineCoeffs.a1.toFixed(8) }} * X + {{ transformationMatrix.affineCoeffs.b1.toFixed(8) }} * Z + {{ transformationMatrix.affineCoeffs.c1.toFixed(8) }}</div>
                <div><strong>经度计算:</strong> lon = {{ transformationMatrix.affineCoeffs.a2.toFixed(8) }} * X + {{ transformationMatrix.affineCoeffs.b2.toFixed(8) }} * Z + {{ transformationMatrix.affineCoeffs.c2.toFixed(8) }}</div>
              </div>
            </div>
            
            <div class="param-group">
              <label>校准范围 (仅供参考):</label>
              <div class="bounds-info">
                <div>模型坐标范围: X({{ modelBounds.minX.toFixed(1) }}~{{ modelBounds.maxX.toFixed(1) }}), Z({{ modelBounds.minZ.toFixed(1) }}~{{ modelBounds.maxZ.toFixed(1) }})</div>
                <div>地理坐标范围: 纬度({{ geoBounds.minLat.toFixed(6) }}~{{ geoBounds.maxLat.toFixed(6) }}), 经度({{ geoBounds.minLon.toFixed(6) }}~{{ geoBounds.maxLon.toFixed(6) }})</div>
              </div>
            </div>
            
            <div class="param-group">
              <label>转换函数 (JavaScript代码):</label>
              <pre class="code-block">{{ transformationCode }}</pre>
            </div>
            
            <div class="param-group">
              <label>精度评估:</label>
              <div class="accuracy-info">
                <div>平均误差: {{ averageError.toFixed(4) }} 米</div>
                <div>最大误差: {{ maxError.toFixed(4) }} 米</div>
                <div>校准点数量: {{ calibrationPoints.length }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, markRaw } from 'vue'
import { SRGBColorSpace, BasicShadowMap, NoToneMapping, Matrix4 } from 'three'
import { OrbitControls, Html } from '@tresjs/cientos'
import { loadCityFBX } from '../plugins/digitalCity/common/loadCity'
import { resetUV } from '../plugins/digitalCity/common/utils'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Three.js GL配置
const gl = {
  clearColor: '#0c1426',
  outputColorSpace: SRGBColorSpace,
  shadowMapType: BasicShadowMap,
  toneMapping: NoToneMapping,
  useLegacyLights: false
}

// 响应式状态
const sceneContainer = ref()
const tcRef = ref()
const cityFBX = ref<any>(null)
const isLoading = ref(false)

// 校准点相关状态
const selectedPoint = ref<{x: number, y: number, z: number} | null>(null)

// 热力图相关状态
const selectedPointHeatmapCoords = ref<{u: number, v: number, canvasX: number, canvasY: number, heatmapWidth: number, heatmapHeight: number} | null>(null)
const heatmapWidth = ref(250)  // 默认热力图宽度
const heatmapHeight = ref(250) // 默认热力图高度

// 缓存合并后的几何体边界框（与buildingsHeatmap.vue完全一致的处理结果）
const mergedGeometryBounds = ref<any>(null)
// 缓存处理后的几何体实例，用于直接复用buildingsHeatmap.vue的逻辑
const processedGeometry = ref<any>(null)

// 预设的校准点数据（来自fbx-coordinate-calibration-2025-08-08.json）
const defaultCalibrationPoints = [
  {
    name: "校准点1",
    modelX: -72.40295394451705,
    modelY: 19.66554549619716,
    modelZ: 812.9764577390581,
    color: "#ff4444",
    description: "",
    lat: 31.242242,
    lon: 121.491427
  },
  {
    name: "校准点2",
    modelX: 106.19976971292328,
    modelY: 19.068050175905064,
    modelZ: 796.4236809332394,
    color: "#44ff44",
    description: "",
    lat: 31.244036,
    lon: 121.490378
  },
  {
    name: "校准点3",
    modelX: -71.62023352807236,
    modelY: 19.068050175905157,
    modelZ: 411.37663393355365,
    color: "#4444ff",
    description: "",
    lat: 31.240711,
    lon: 121.486782
  },
  {
    name: "校准点4",
    modelX: -3.9125294271554765,
    modelY: 19.068050175905196,
    modelZ: 176.27897770367957,
    color: "#ffff44",
    description: "",
    lat: 31.240478,
    lon: 121.483794
  },
  {
    name: "校准点5",
    modelX: -292.64232281821876,
    modelY: 19.06805017590515,
    modelZ: 403.9310224900924,
    color: "#ff44ff",
    description: "",
    lat: 31.238495,
    lon: 121.487661
  },
  {
    name: "校准点6",
    modelX: -288.3651172141807,
    modelY: 19.0680501759052,
    modelZ: 160.30996285669252,
    color: "#44ffff",
    description: "",
    lat: 31.237553,
    lon: 121.484886
  }
]

const calibrationPoints = ref<Array<{
  name: string
  modelX: number
  modelY: number
  modelZ: number
  lat?: number
  lon?: number
  color: string
  description?: string
}>>(defaultCalibrationPoints)

// 编辑状态
const editingIndex = ref(-1)
const editingPoint = ref({
  name: '',
  lat: null as number | null,
  lon: null as number | null,
  description: ''
})

// 转换参数
const transformationMatrix = ref<any>(null)
const modelBounds = ref({
  minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0
})
const geoBounds = ref({
  minLat: 0, maxLat: 0, minLon: 0, maxLon: 0
})
const averageError = ref(0)
const maxError = ref(0)



// 颜色数组用于区分不同的校准点
const pointColors = [
  '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', 
  '#44ffff', '#ff8844', '#88ff44', '#4488ff', '#ff4488'
]

// 创建与buildingsHeatmap.vue完全一致的合并几何体边界框
const createMergedGeometryBounds = () => {
  if (!cityFBX.value || !cityFBX.value.city || !cityFBX.value.land) {
    console.warn('城市模型未加载完成')
    return null
  }
  
  try {
    // 完全按照buildingsHeatmap.vue的流程处理
    // 第70-80行的逻辑
    const CITY_UNTRIANGULATED = cityFBX.value.city.clone()
    delete CITY_UNTRIANGULATED.geometry.attributes.normal
    delete CITY_UNTRIANGULATED.geometry.attributes.uv
    const geometry1 = CITY_UNTRIANGULATED.geometry.clone().applyMatrix4(CITY_UNTRIANGULATED.matrix)
    
    const LANDMASS = cityFBX.value.land.clone()
    delete LANDMASS.geometry.attributes.normal
    const geometry2 = LANDMASS.geometry.clone().applyMatrix4(LANDMASS.matrix)
    
    // 合并几何体
    const bufferGeometries = BufferGeometryUtils.mergeGeometries([geometry1, geometry2])
    
    // 应用X轴90度旋转
    bufferGeometries.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2))
    
    // 调用resetUV函数（与buildingsHeatmap.vue第80行完全一致）
    resetUV(bufferGeometries)
    
    // resetUV函数内部会调用computeBoundingBox，所以这里的边界框是最终正确的
    if (!bufferGeometries.boundingBox) {
      throw new Error('几何体边界框计算失败')
    }
    const bounds = bufferGeometries.boundingBox.clone()
    
    console.log('=== 创建合并几何体边界框 ===')
    console.log('最终边界框:', bounds)
    
    // 保存处理后的几何体实例，用于后续坐标转换
    processedGeometry.value = bufferGeometries
    
    // 清理临时几何体
    geometry1.dispose()
    geometry2.dispose()
    // 注意：不要dispose bufferGeometries，因为我们需要保留它
    
    return bounds
  } catch (error) {
    console.error('创建合并几何体边界框失败:', error)
    return null
  }
}

// 热力图坐标转换函数 - 直接使用与buildingsHeatmap.vue相同的几何体和resetUV逻辑
const modelCoordsToHeatmapCoords = (x: number, z: number, heatmapWidth: number = 250, heatmapHeight: number = 250) => {
  // 确保处理后的几何体已创建
  if (!processedGeometry.value || !mergedGeometryBounds.value) {
    mergedGeometryBounds.value = createMergedGeometryBounds()
    if (!mergedGeometryBounds.value || !processedGeometry.value) {
      console.warn('无法创建处理后的几何体')
      return null
    }
  }
  
  const geometry = processedGeometry.value
  const bounds = geometry.boundingBox
  
  // 直接使用resetUV函数中的逻辑
  // 注意：此时的几何体已经经过了完整的变换流程（包括旋转和resetUV）
  const roomX = bounds.max.x - bounds.min.x
  const roomY = bounds.max.y - bounds.min.y
  
  console.log("=== 使用处理后的几何体进行坐标转换 ===")
  console.log("几何体边界框:", bounds)
  console.log("roomX (X轴范围):", roomX)
  console.log("roomY (Y轴范围):", roomY)
  console.log("输入坐标 (x,z):", x, z)
  
  // 对输入坐标应用相同的X轴90度旋转变换
  // makeRotationX(Math.PI / 2): (x,y,z) -> (x,z,-y)
  // 所以输入的(x,z)坐标需要变换为旋转后坐标系中的坐标
  const transformedX = x  // X轴不变
  const transformedY = z  // 原来的Z轴变为新的Y轴
  
  console.log("变换后坐标 (transformedX,transformedY):", transformedX, transformedY)
  
  // 使用与resetUV函数完全相同的逻辑计算UV
  // 这里直接复用resetUV函数中第45-46行的逻辑
  const u = roomX > 0 ? (transformedX - bounds.min.x) / roomX : 0
  const v = roomY > 0 ? (transformedY - bounds.min.y) / roomY : 0
  
  console.log("计算得到的UV:", u, v)
  
  // 转换为canvas坐标（与buildingsHeatmap.vue第105行完全一致）
  const canvasX = u * heatmapWidth
  const canvasY = (1 - v) * heatmapHeight // Y轴翻转
  
  console.log("Canvas坐标:", canvasX, canvasY)
  
  return {
    u: Math.max(0, Math.min(1, u)), // 确保在0-1范围内
    v: Math.max(0, Math.min(1, v)),
    canvasX: Math.max(1, Math.min(heatmapWidth, canvasX)),     // 热力图坐标从1开始，不是0
    canvasY: Math.max(1, Math.min(heatmapHeight, canvasY)),   // 热力图坐标从1开始，不是0
    heatmapWidth,
    heatmapHeight
  }
}

// 计算转换代码
const transformationCode = computed(() => {
  if (!transformationMatrix.value || !transformationMatrix.value.affineCoeffs) return ''
  
  const coeffs = transformationMatrix.value.affineCoeffs
  
  return `// 仿射变换坐标转换（基于${transformationMatrix.value.pointCount}个校准点）
// 平均误差: ${transformationMatrix.value.averageError.toFixed(2)}米

// 模型坐标转经纬度（仿射变换）
function modelCoordsToLatLon(x, z) {
  const lat = ${coeffs.a1.toFixed(8)} * x + ${coeffs.b1.toFixed(8)} * z + ${coeffs.c1.toFixed(8)}
  const lon = ${coeffs.a2.toFixed(8)} * x + ${coeffs.b2.toFixed(8)} * z + ${coeffs.c2.toFixed(8)}
  return { lat, lon }
}

// 经纬度转模型坐标（仿射变换逆运算）
function latLonToModelCoords(lat, lon) {
  // 解线性方程组：
  // lat = a1*x + b1*z + c1  =>  (lat - c1) = a1*x + b1*z
  // lon = a2*x + b2*z + c2  =>  (lon - c2) = a2*x + b2*z
  // 使用克拉默法则求解
  const det = ${coeffs.a1.toFixed(8)} * ${coeffs.b2.toFixed(8)} - ${coeffs.a2.toFixed(8)} * ${coeffs.b1.toFixed(8)}
  const latDiff = lat - ${coeffs.c1.toFixed(8)}
  const lonDiff = lon - ${coeffs.c2.toFixed(8)}
  const x = (latDiff * ${coeffs.b2.toFixed(8)} - lonDiff * ${coeffs.b1.toFixed(8)}) / det
  const z = (lonDiff * ${coeffs.a1.toFixed(8)} - latDiff * ${coeffs.a2.toFixed(8)}) / det
  return { x, y: 0, z }
}

// 模型坐标转热力图坐标 (完全按照buildingsHeatmap.vue的逻辑)
function modelCoordsToHeatmapCoords(x, z, mergedGeometryBounds, heatmapWidth = 250, heatmapHeight = 250) {
  // 注意：mergedGeometryBounds 是经过完整变换流程后的最终边界框
  // 包括：1. 应用各自变换矩阵 2. 合并几何体 3. X轴90度旋转
  
  const bounds = mergedGeometryBounds
  const roomX = bounds.max.x - bounds.min.x
  const roomY = bounds.max.y - bounds.min.y
  
  // 对输入坐标应用相同的X轴90度旋转变换
  // makeRotationX(Math.PI / 2): (x,y,z) -> (x,z,-y)
  const transformedX = x  // X轴不变
  const transformedY = -z  // 原来的Z轴变为新的Y轴
  
  // 使用resetUV函数的完全相同逻辑计算UV
  const u = roomX > 0 ? (transformedX - bounds.min.x) / roomX : 0
  const v = roomY > 0 ? (transformedY - bounds.min.y) / roomY : 0
  
  // 转换为canvas坐标（与buildingsHeatmap.vue第105行完全一致）
  const canvasX = u * heatmapWidth
  const canvasY = (1 - v) * heatmapHeight // Y轴翻转
  
  return { 
    u: Math.max(0, Math.min(1, u)), 
    v: Math.max(0, Math.min(1, v)),
    canvasX: Math.max(1, Math.min(heatmapWidth, canvasX)),     // 热力图坐标从1开始
    canvasY: Math.max(1, Math.min(heatmapHeight, canvasY)),   // 热力图坐标从1开始
    heatmapWidth, 
    heatmapHeight 
  }
}

// 仿射变换系数
const affineCoeffs = {
  a1: ${coeffs.a1.toFixed(8)}, b1: ${coeffs.b1.toFixed(8)}, c1: ${coeffs.c1.toFixed(8)},
  a2: ${coeffs.a2.toFixed(8)}, b2: ${coeffs.b2.toFixed(8)}, c2: ${coeffs.c2.toFixed(8)}
}`
})

// 加载城市模型
const loadCityModel = async () => {
  if (isLoading.value) return
  
  isLoading.value = true
  try {
    console.log('开始加载模型...')
    const model = await loadCityFBX()
    cityFBX.value = markRaw(model)
    console.log('模型加载成功')
    
    // 模型加载完成后，创建合并几何体边界框
    setTimeout(() => {
      console.log('开始创建合并几何体边界框...')
      mergedGeometryBounds.value = createMergedGeometryBounds()
      if (mergedGeometryBounds.value) {
        console.log('合并几何体边界框创建成功')
      }
    }, 100)
    
  } catch (error: any) {
    console.error('加载模型失败:', error)
    alert(`模型加载失败：${error?.message || '未知错误'}`)
  } finally {
    isLoading.value = false
  }
}

// 模型点击事件
const onModelClick = (event: any) => {
  if (event.point) {
    selectedPoint.value = {
      x: event.point.x,
      y: event.point.y,
      z: event.point.z
    }
    
    // 计算热力图坐标
    const heatmapCoords = modelCoordsToHeatmapCoords(event.point.x, event.point.z)
    selectedPointHeatmapCoords.value = heatmapCoords
    
    console.log('选中点:', selectedPoint.value)
    console.log('热力图坐标:', heatmapCoords)
    
    // 如果已有转换参数，计算经纬度
    if (transformationMatrix.value && transformationMatrix.value.affineCoeffs) {
      const coeffs = transformationMatrix.value.affineCoeffs
      const lat = coeffs.a1 * event.point.x + coeffs.b1 * event.point.z + coeffs.c1
      const lon = coeffs.a2 * event.point.x + coeffs.b2 * event.point.z + coeffs.c2
      console.log('预测经纬度:', { lat, lon })
    }
  }
}

// 添加校准点
const addCalibrationPoint = () => {
  if (!selectedPoint.value || calibrationPoints.value.length >= 10) return
  
  const pointIndex = calibrationPoints.value.length
  const newPoint = {
    name: `校准点${pointIndex + 1}`,
    modelX: selectedPoint.value.x,
    modelY: selectedPoint.value.y,
    modelZ: selectedPoint.value.z,
    color: pointColors[pointIndex % pointColors.length],
    description: ''
  }
  
  calibrationPoints.value.push(newPoint)
  selectedPoint.value = null
  
  // 自动进入编辑模式
  editPoint(pointIndex)
}

// 编辑校准点
const editPoint = (index: number) => {
  const point = calibrationPoints.value[index]
  editingIndex.value = index
  editingPoint.value = {
    name: point.name,
    lat: point.lat || null,
    lon: point.lon || null,
    description: point.description || ''
  }
}

// 保存校准点
const savePoint = (index: number) => {
  const point = calibrationPoints.value[index]
  point.name = editingPoint.value.name || `校准点${index + 1}`
  point.lat = editingPoint.value.lat || undefined
  point.lon = editingPoint.value.lon || undefined
  point.description = editingPoint.value.description || ''
  
  editingIndex.value = -1
  editingPoint.value = { name: '', lat: null, lon: null, description: '' }
}

// 删除校准点
const deletePoint = (index: number) => {
  if (confirm('确定要删除这个校准点吗？')) {
    calibrationPoints.value.splice(index, 1)
    if (editingIndex.value === index) {
      editingIndex.value = -1
    }
  }
}

// 清空所有点
const clearAllPoints = () => {
  if (confirm('确定要清空所有校准点吗？')) {
    calibrationPoints.value = []
    selectedPoint.value = null
    editingIndex.value = -1
    transformationMatrix.value = null
  }
}

// 重置为默认校准点
const resetToDefaultPoints = () => {
  if (confirm('确定要重置为默认校准点吗？这将覆盖当前所有校准点。')) {
    calibrationPoints.value = [...defaultCalibrationPoints]
    selectedPoint.value = null
    editingIndex.value = -1
    transformationMatrix.value = null
    
    // 自动重新计算转换参数
    setTimeout(() => {
      calculateTransformation()
    }, 100)
  }
}

// 矩阵运算工具函数（基于Java GeoUtil算法）
const multiplyMatrix = (A: number[][], B: number[][]) => {
  const result = Array(A.length).fill(null).map(() => Array(B[0].length).fill(0))
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B[0].length; j++) {
      for (let k = 0; k < B.length; k++) {
        result[i][j] += A[i][k] * B[k][j]
      }
    }
  }
  return result
}

const transposeMatrix = (matrix: number[][]) => {
  return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]))
}

const invertMatrix = (matrix: number[][]) => {
  const n = matrix.length
  const augmented = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)])
  
  // 高斯-约旦消元法
  for (let i = 0; i < n; i++) {
    // 找到主元
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]]
    
    // 归一化主元行
    const pivot = augmented[i][i]
    if (Math.abs(pivot) < 1e-10) throw new Error('矩阵奇异，无法求逆')
    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= pivot
    }
    
    // 消元
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i]
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j]
        }
      }
    }
  }
  
  return augmented.map(row => row.slice(n))
}

// 计算两个数组的相关系数
const calculateCorrelation = (x: number[], y: number[]) => {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)
  
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  
  return denominator === 0 ? 0 : numerator / denominator
}

// 仿射变换校准（基于Java GeoUtil的算法，修正坐标系映射）
const calculateAffineTransformation = (points: any[]) => {
  
  console.log('校准点数据分析:')
  points.forEach((p, i) => {
    console.log(`点${i+1}: 模型(${p.modelX.toFixed(2)}, ${p.modelZ.toFixed(2)}) -> 经纬度(${p.lat}, ${p.lon})`)
  })
  
  // 分析坐标范围，确定正确的映射关系
  const xRange = Math.max(...points.map(p => p.modelX)) - Math.min(...points.map(p => p.modelX))
  const zRange = Math.max(...points.map(p => p.modelZ)) - Math.min(...points.map(p => p.modelZ))
  const latRange = Math.max(...points.map(p => p.lat!)) - Math.min(...points.map(p => p.lat!))
  const lonRange = Math.max(...points.map(p => p.lon!)) - Math.min(...points.map(p => p.lon!))
  
  console.log(`坐标范围分析: X=${xRange.toFixed(2)}, Z=${zRange.toFixed(2)}, Lat=${latRange.toFixed(6)}, Lon=${lonRange.toFixed(6)}`)
  
  // 分析坐标轴对应关系
  // 计算每个轴与经纬度的相关性
  const xLonCorr = calculateCorrelation(points.map(p => p.modelX), points.map(p => p.lon!))
  const xLatCorr = calculateCorrelation(points.map(p => p.modelX), points.map(p => p.lat!))
  const zLonCorr = calculateCorrelation(points.map(p => p.modelZ), points.map(p => p.lon!))
  const zLatCorr = calculateCorrelation(points.map(p => p.modelZ), points.map(p => p.lat!))
  
  console.log(`相关性分析:`)
  console.log(`X-经度相关性: ${xLonCorr.toFixed(4)}, X-纬度相关性: ${xLatCorr.toFixed(4)}`)
  console.log(`Z-经度相关性: ${zLonCorr.toFixed(4)}, Z-纬度相关性: ${zLatCorr.toFixed(4)}`)
  
  // 根据相关性确定最佳映射
  let useXForLon = Math.abs(xLonCorr) > Math.abs(zLonCorr)
  let useZForLat = Math.abs(zLatCorr) > Math.abs(xLatCorr)
  
  console.log(`建议映射: X轴->${useXForLon ? '经度' : '纬度'}, Z轴->${useZForLat ? '纬度' : '经度'}`)
  
  // 注意：对于仿射变换，我们总是使用标准形式 [x, z, 1]
  // 相关性分析主要用于诊断，实际的映射关系由仿射变换系数自动确定
  console.log('使用标准仿射变换形式: lat = a1*x + b1*z + c1, lon = a2*x + b2*z + c2')
  
  // 构建系数矩阵 A = [x, z, 1]
  const A = points.map(p => [p.modelX, p.modelZ, 1])
  
  // 目标向量
  const latVector = points.map(p => p.lat!)
  const lonVector = points.map(p => p.lon!)
  
  try {
    // 计算 (A^T * A)^(-1) * A^T （最小二乘法）
    const At = transposeMatrix(A)
    const AtA = multiplyMatrix(At, A)
    const AtA_inv = invertMatrix(AtA)
    const pseudoInverse = multiplyMatrix(AtA_inv, At)
    
    // 计算仿射变换系数
    const latCoeffs = multiplyMatrix(pseudoInverse, latVector.map(v => [v])).map(row => row[0])
    const lonCoeffs = multiplyMatrix(pseudoInverse, lonVector.map(v => [v])).map(row => row[0])
    
    const result = {
      // lat = a1 * x + b1 * z + c1
      a1: latCoeffs[0], b1: latCoeffs[1], c1: latCoeffs[2],
      // lon = a2 * x + b2 * z + c2  
      a2: lonCoeffs[0], b2: lonCoeffs[1], c2: lonCoeffs[2]
    }
    
    console.log('仿射变换系数:', result)
    
    // 验证系数的合理性
    const det = result.a1 * result.b2 - result.a2 * result.b1
    console.log(`变换矩阵行列式: ${det}`)
    
    if (Math.abs(det) < 1e-15) {
      throw new Error('变换矩阵奇异，行列式接近零')
    }
    
    return result
    
  } catch (error) {
    console.error('仿射变换计算失败:', error)
    throw error
  }
}

// 计算转换参数
const calculateTransformation = () => {
  const validPoints = calibrationPoints.value.filter(p => p.lat != null && p.lon != null)
  
  if (validPoints.length < 3) {
    alert('仿射变换至少需要3个有效的校准点（包含经纬度信息）')
    return
  }
  
  // 计算模型边界
  modelBounds.value = {
    minX: Math.min(...validPoints.map(p => p.modelX)),
    maxX: Math.max(...validPoints.map(p => p.modelX)),
    minY: Math.min(...validPoints.map(p => p.modelY)),
    maxY: Math.max(...validPoints.map(p => p.modelY)),
    minZ: Math.min(...validPoints.map(p => p.modelZ)),
    maxZ: Math.max(...validPoints.map(p => p.modelZ))
  }
  
  // 计算地理边界
  geoBounds.value = {
    minLat: Math.min(...validPoints.map(p => p.lat!)),
    maxLat: Math.max(...validPoints.map(p => p.lat!)),
    minLon: Math.min(...validPoints.map(p => p.lon!)),
    maxLon: Math.max(...validPoints.map(p => p.lon!))
  }
  
  try {
    // 使用仿射变换计算转换参数
    const affineCoeffs = calculateAffineTransformation(validPoints)
    
    // 计算转换精度（使用仿射变换）
    let totalError = 0
    let maxErr = 0
    
    validPoints.forEach((point, index) => {
      // 使用仿射变换计算预测经纬度
      const predictedLat = affineCoeffs.a1 * point.modelX + affineCoeffs.b1 * point.modelZ + affineCoeffs.c1
      const predictedLon = affineCoeffs.a2 * point.modelX + affineCoeffs.b2 * point.modelZ + affineCoeffs.c2
      
      // 计算地理距离误差（使用Haversine公式近似）
      const latError = Math.abs(predictedLat - point.lat!) * 111000 // 1度纬度约111km
      const lonError = Math.abs(predictedLon - point.lon!) * 111000 * Math.cos(point.lat! * Math.PI / 180)
      const error = Math.sqrt(latError * latError + lonError * lonError)
      
      console.log(`校准点${index + 1} 仿射变换精度验证:`)
      console.log(`  实际经纬度: (${point.lat!.toFixed(6)}, ${point.lon!.toFixed(6)})`)
      console.log(`  预测经纬度: (${predictedLat.toFixed(6)}, ${predictedLon.toFixed(6)})`)
      console.log(`  误差: 纬度=${(latError/1000).toFixed(3)}km, 经度=${(lonError/1000).toFixed(3)}km, 总误差=${error.toFixed(2)}米`)
      
      totalError += error
      maxErr = Math.max(maxErr, error)
    })
    
    averageError.value = totalError / validPoints.length
    maxError.value = maxErr
    
    transformationMatrix.value = {
      modelBounds: modelBounds.value,
      geoBounds: geoBounds.value,
      affineCoeffs: affineCoeffs,
      pointCount: validPoints.length,
      averageError: averageError.value,
      maxError: maxError.value,
      method: 'affine'
    }
    
    console.log('仿射变换参数计算完成:', transformationMatrix.value)
    
  } catch (error) {
    console.error('仿射变换计算失败:', error)
    alert('仿射变换计算失败，请检查校准点数据')
  }
}

// 导出校准数据
const exportCalibration = () => {
  if (!transformationMatrix.value) return
  
  const exportData = {
    calibrationPoints: calibrationPoints.value,
    transformationMatrix: transformationMatrix.value,
    modelBounds: modelBounds.value,
    geoBounds: geoBounds.value,
    transformationCode: transformationCode.value,
    exportTime: new Date().toISOString(),
    version: '1.0'
  }
  
  const dataStr = JSON.stringify(exportData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `fbx-coordinate-calibration-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  console.log('校准数据已导出')
}



// 组件挂载时自动加载模型和计算转换参数
onMounted(() => {
  console.log('组件挂载，预加载校准点数量:', calibrationPoints.value.length)
  console.log('有效校准点数量:', calibrationPoints.value.filter(p => p.lat != null && p.lon != null).length)
  
  // 详细检查每个校准点
  calibrationPoints.value.forEach((point, index) => {
    console.log(`校准点${index + 1}:`, {
      name: point.name,
      hasLat: point.lat != null,
      hasLon: point.lon != null,
      lat: point.lat,
      lon: point.lon
    })
  })
  
  loadCityModel()
  
  // 自动计算转换参数（因为已经有预设的校准点）
  setTimeout(() => {
    console.log('开始自动计算转换参数')
    calculateTransformation()
  }, 100) // 减少延迟时间
})

// 组件卸载时清理资源
onUnmounted(() => {
  try {
    // 清理处理后的几何体
    if (processedGeometry.value) {
      processedGeometry.value.dispose()
      processedGeometry.value = null
    }
    
    // 清理边界框引用
    mergedGeometryBounds.value = null
    
    console.log('CoordinateCalibration 组件卸载完成')
  } catch (error) {
    console.error('清理 CoordinateCalibration 资源失败:', error)
  }
})
</script>

<style scoped>
.calibration-tool {
  min-height: 100vh;
  background: linear-gradient(135deg, #0c1426 0%, #1a1f35 50%, #2a2d47 100%);
  color: #ffffff;
  font-family: 'Microsoft YaHei', 'Arial', sans-serif;
}

.toolbar {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 212, 255, 0.3);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toolbar h2 {
  margin: 0;
  color: #00d4ff;
  font-size: 1.5rem;
}

.toolbar-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.info-badge {
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid rgba(0, 212, 255, 0.3);
}

.info-badge.success {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.info-text {
  color: #ffffff;
  opacity: 0.7;
  font-size: 0.9rem;
}

.toolbar-buttons {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: linear-gradient(45deg, #00d4ff, #0099cc);
  color: white;
}

.btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn.success {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.5);
}

.btn.info {
  background: rgba(33, 150, 243, 0.2);
  color: #2196f3;
  border: 1px solid rgba(33, 150, 243, 0.5);
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 500px;
  gap: 2rem;
  padding: 2rem;
  min-height: calc(100vh - 100px);
}

.model-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
}

.section-header h3, .section-header h4 {
  margin: 0;
  color: #00d4ff;
  font-size: 1.2rem;
}

.model-info {
  font-size: 0.9rem;
  color: #ffffff;
  opacity: 0.8;
}

.coord-display {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.coord-label {
  color: #00d4ff;
  font-weight: 500;
  min-width: 80px;
}

.model-container {
  flex: 1;
  position: relative;
  min-height: 600px;
}

.model-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
}

.placeholder-content {
  text-align: center;
  color: #ffffff;
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.6;
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
  z-index: 1000;
}

.loading-spinner {
  text-align: center;
  color: white;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.control-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
}

.panel-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  overflow: hidden;
}

.points-list {
  max-height: 400px;
  overflow-y: auto;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #888;
}

.point-item {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.3s ease;
}

.point-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.point-item.editing {
  background: rgba(0, 212, 255, 0.1);
}

.point-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.point-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.point-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.point-name {
  font-weight: 500;
  color: #00d4ff;
}

.point-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-small {
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-small.success {
  background: #4caf50;
  color: white;
}

.btn-small.danger {
  background: #f44336;
  color: white;
}

.btn-small:not(.success):not(.danger) {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.point-details {
  font-size: 0.9rem;
}

.coord-group {
  margin-bottom: 0.5rem;
}

.coord-group label {
  color: #00d4ff;
  font-weight: 500;
  margin-right: 0.5rem;
}

.missing-coords {
  color: #ff9800;
  font-style: italic;
}

.coord-edit {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.input-group {
  margin-bottom: 1rem;
}

.input-group label {
  display: block;
  color: #00d4ff;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.coord-input, .coord-textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.9rem;
}

.coord-input:focus, .coord-textarea:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

.transformation-result {
  padding: 1.5rem;
}

.param-group {
  margin-bottom: 1.5rem;
}

.param-group label {
  display: block;
  color: #00d4ff;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.bounds-info, .accuracy-info {
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.9rem;
}

.code-block {
  background: rgba(0, 0, 0, 0.5);
  padding: 1rem;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  overflow-x: auto;
  white-space: pre-wrap;
  color: #e0e0e0;
}

.instructions {
  padding: 1.5rem;
}

.quick-start {
  background: rgba(76, 175, 80, 0.1);
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid rgba(76, 175, 80, 0.3);
  margin-bottom: 1rem;
}

.quick-start h5 {
  margin: 0 0 0.5rem 0;
  color: #4caf50;
}

.quick-start p {
  margin: 0;
  color: #ffffff;
  opacity: 0.9;
}

.instructions ol, .instructions ul {
  padding-left: 1.5rem;
}

.instructions li {
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.tips {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 193, 7, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.tips h5 {
  margin: 0 0 0.5rem 0;
  color: #ffc107;
}

.point-label {
  background: rgba(0, 0, 0, 0.8);
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(0, 212, 255, 0.3);
  font-size: 0.8rem;
  color: white;
  pointer-events: none;
  min-width: 200px;
}

.point-name {
  font-weight: bold;
  color: #00d4ff;
  margin-bottom: 0.25rem;
}

.point-coords {
  font-family: monospace;
  font-size: 0.7rem;
  opacity: 0.8;
  margin-bottom: 0.1rem;
}



/* 响应式设计 */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }
  
  .control-panel {
    max-height: 600px;
  }
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .toolbar-buttons {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .main-content {
    padding: 1rem;
    gap: 1rem;
  }
}
</style>
