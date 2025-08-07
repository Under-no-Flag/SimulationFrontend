<!--
 * @Author: AI Assistant
 * @Description: 人群仿真结果可视化页面 - 南京东路-外滩客流仿真
 * @Date: 2024-12-14
-->
<template>
	<div class="simulation-page">
		<!-- 顶部导航 -->
		<div class="top-navbar">
			<div class="nav-content">
				<div class="logo-section">
					<div class="logo-icon">🏙️</div>
					<h1 class="logo-text">上海外滩人群仿真平台</h1>
				</div>
				<div class="nav-buttons">
					<button class="nav-btn home-btn" @click="goHome">
						<span class="btn-icon">🏠</span>
						首页
					</button>
					<button class="nav-btn active">
						<span class="btn-icon">📊</span>
						仿真可视化
					</button>
					<button class="nav-btn">
						<span class="btn-icon">⚙️</span>
						设置
					</button>
				</div>
			</div>
		</div>

		<!-- 主要内容容器 -->
		<div class="main-container">
			<!-- 可视化布局 -->
			<div class="visualization-layout">
				<!-- 3D模型区域 -->
				<div class="model-section">
					<div class="section-header">
						<h3>3D场景可视化</h3>
						<div class="model-controls">
							<button class="control-btn" :class="{ active: heatmapEnabled }" @click="toggleHeatmap">
								热力图
							</button>
							<button class="control-btn" @click="resetView">
								重置视角
							</button>
						</div>
					</div>
					<div class="model-container" ref="sceneContainer">
						<!-- 加载状态 -->
						<div v-if="isLoading" class="loading-overlay">
							<div class="loading-spinner">
								<div class="spinner"></div>
								<p>正在加载上海建筑物模型...</p>
							</div>
						</div>

						<TresCanvas ref="tcRef" v-bind="gl" :antialias="true">
							<!-- 正交相机 -->
							<TresOrthographicCamera
								v-if="cameraSettings.type === 'orthographic'"
								ref="orthographicCameraRef"
								:position="[cameraSettings.position.x, cameraSettings.position.y, cameraSettings.position.z]"
								:zoom="cameraSettings.zoom"
								:near="0.01"
								:far="100000"
							/>

							<!-- 透视相机 -->
							<TresPerspectiveCamera
								v-if="cameraSettings.type === 'perspective'"
								ref="perspectiveCameraRef"
								:position="[cameraSettings.position.x, cameraSettings.position.y, cameraSettings.position.z]"
								:fov="cameraSettings.fov"
								:near="0.01"
								:far="100000"
							/>
							<TresAmbientLight :intensity="1.2" />
							<TresDirectionalLight
								:position="[15, 20, 15]"
								:intensity="0.8"
								:cast-shadow="true"
							/>
							<TresDirectionalLight
								:position="[-10, 20, -10]"
								:intensity="0.4"
							/>
							<OrbitControls
								ref="orbitControlsRef"
								:enableRotate="false"
								:enablePan="false"
								:enableZoom="false"
								:target="[cameraSettings.target.x, cameraSettings.target.y, cameraSettings.target.z]"
								:enableDamping="false"
							/>

							<!-- 加载并显示上海建筑物模型 -->
							<primitive v-if="buildingState.show && cityModel" :object="cityModel" />

							<!-- 注释掉重复的FBX模型显示，避免重复渲染 -->
							<!-- <TresGroup v-if="modelParts">
								<primitive
									v-if="modelParts.cityBuildings"
									:object="modelParts.cityBuildings"
								/>
								<primitive
									v-if="modelParts.landMass"
									:object="modelParts.landMass"
								/>
								<primitive
									v-if="modelParts.roads"
									:object="modelParts.roads"
								/>
							</TresGroup> -->

							<!-- 热力图网格 -->
							<TresGroup v-if="heatmapEnabled && heatmapMesh">
								<primitive :object="heatmapMesh" />
							</TresGroup>
						</TresCanvas>
					</div>
				</div>

				<!-- 控制面板 -->
				<div class="control-panel">
					<!-- 面板标签 -->
					<div class="panel-tabs">
						<button
							class="panel-tab"
							:class="{ active: activePanel === 'data' }"
							@click="activePanel = 'data'"
						>
							数据可视化
						</button>
						<button
							class="panel-tab"
							:class="{ active: activePanel === 'settings' }"
							@click="activePanel = 'settings'"
						>
							可视化设置
						</button>
					</div>

					<!-- 数据可视化面板 -->
					<div v-if="activePanel === 'data'" class="panel-content">
						<!-- 事件选择 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>仿真事件</h4>
							</div>
							<div class="option-group">
								<label class="option-label">选择事件</label>
								<select v-model="selectedEvent" class="select-input" @change="loadSimulationEvent">
									<option value="">请选择事件</option>
									<option value="rush_hour">早高峰</option>
									<option value="evening_rush">晚高峰</option>
									<option value="weekend">周末购物</option>
									<option value="holiday">节假日</option>
									<option value="emergency">紧急疏散</option>
								</select>
							</div>
							<div class="option-group">
								<label class="option-label">时间范围</label>
								<div class="time-controls">
									<input
										type="time"
										v-model="startTime"
										class="time-input"
									/>
									<span class="time-separator">-</span>
									<input
										type="time"
										v-model="endTime"
										class="time-input"
									/>
								</div>
							</div>
						</div>

						<!-- 上海建筑物控制 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>上海建筑物控制</h4>
							</div>
							<div class="option-group">
								<div class="checkbox-group">
									<label class="checkbox-item">
										<input type="checkbox" v-model="buildingState.show" />
										显示上海建筑物
									</label>
									<label class="checkbox-item">
										<input type="checkbox" v-model="buildingState.showRoads" @change="toggleRoads" />
										显示道路
									</label>
								</div>
								<div class="slider-group">
									<label class="slider-label">建筑物透明度</label>
									<input
										type="range"
										v-model="buildingState.opacity"
										min="0"
										max="1"
										step="0.1"
										class="slider-input"
									/>
									<span class="slider-value">{{ buildingState.opacity }}</span>
								</div>
							</div>
						</div>

						<!-- 可视化选项 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>可视化选项</h4>
							</div>
							<div class="option-group">
								<div class="checkbox-group">
									<label class="checkbox-item">
										<input type="checkbox" v-model="showDensityHeatmap" />
										人群密度热力图
									</label>
									<label class="checkbox-item">
										<input type="checkbox" v-model="showSpeedVectors" />
										速度向量场
									</label>
									<label class="checkbox-item">
										<input type="checkbox" v-model="showBottlenecks" />
										瓶颈区域标识
									</label>
									<label class="checkbox-item">
										<input type="checkbox" v-model="showEvacuationRoutes" />
										疏散路径
									</label>
									<label class="checkbox-item">
										<input type="checkbox" v-model="isRealTimeUpdate" />
										实时更新
									</label>
								</div>
							</div>
						</div>

						<!-- 数据可视化 -->
						<div class="panel-section data-visualization">
							<div class="section-header">
								<h5>实时数据</h5>
							</div>
							<div class="chart-container">
								<h6>人群密度趋势</h6>
								<canvas ref="lineChart" width="350" height="150"></canvas>
							</div>
							<div class="chart-container">
								<h6>区域分布</h6>
								<canvas ref="pieChart" width="350" height="200"></canvas>
							</div>
						</div>
					</div>

					<!-- 可视化设置面板 -->
					<div v-if="activePanel === 'settings'" class="panel-content">
						<!-- 相机设置 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>相机设置</h4>
							</div>
							<div class="option-group">
								<!-- 相机类型 -->
								<div class="control-row">
									<label class="control-label">相机类型</label>
									<select v-model="cameraSettings.type" class="select-input" @change="changeCameraType">
										<option value="orthographic">正交相机</option>
										<option value="perspective">透视相机</option>
									</select>
								</div>

								<!-- 相机位置 -->
								<div class="slider-group">
									<label class="slider-label">X 位置</label>
									<input
										type="range"
										v-model.number="cameraSettings.position.x"
										min="-1000"
										max="1000"
										step="1"
										class="slider-input"
										@input="delayedUpdateCameraPosition"
									/>
									<span class="slider-value">{{ cameraSettings.position.x }}</span>
								</div>

								<div class="slider-group">
									<label class="slider-label">Y 位置 (高度)</label>
									<input
										type="range"
										v-model.number="cameraSettings.position.y"
										min="-1000"
										max="1000"
										step="1"
										class="slider-input"
										@input="delayedUpdateCameraPosition"
									/>
									<span class="slider-value">{{ cameraSettings.position.y }}</span>
								</div>

								<div class="slider-group">
									<label class="slider-label">Z 位置</label>
									<input
										type="range"
										v-model.number="cameraSettings.position.z"
										min="-1000"
										max="1000"
										step="1"
										class="slider-input"
										@input="delayedUpdateCameraPosition"
									/>
									<span class="slider-value">{{ cameraSettings.position.z }}</span>
								</div>

								<!-- 观察目标 -->
								<div class="slider-group">
									<label class="slider-label">观察目标 X</label>
									<input
										type="range"
										v-model.number="cameraSettings.target.x"
										min="-2000"
										max="2000"
										step="1"
										class="slider-input"
										@input="delayedUpdateCameraTarget"
									/>
									<span class="slider-value">{{ cameraSettings.target.x }}</span>
								</div>

								<div class="slider-group">
									<label class="slider-label">观察目标 Y</label>
									<input
										type="range"
										v-model.number="cameraSettings.target.y"
										min="-2000"
										max="2000"
										step="1"
										class="slider-input"
										@input="delayedUpdateCameraTarget"
									/>
									<span class="slider-value">{{ cameraSettings.target.y }}</span>
								</div>

								<div class="slider-group">
									<label class="slider-label">观察目标 Z</label>
									<input
										type="range"
										v-model.number="cameraSettings.target.z"
										min="-2000"
										max="2000"
										step="1"
										class="slider-input"
										@input="delayedUpdateCameraTarget"
									/>
									<span class="slider-value">{{ cameraSettings.target.z }}</span>
								</div>

								<!-- 相机参数 -->
								<div v-if="cameraSettings.type === 'orthographic'" class="slider-group">
									<label class="slider-label">缩放 (正交)</label>
									<input
										type="range"
										v-model.number="cameraSettings.zoom"
										min="0.01"
										max="50"
										step="0.01"
										class="slider-input"
										@input="delayedUpdateCameraZoom"
									/>
									<span class="slider-value">{{ Math.round(cameraSettings.zoom * 100) / 100 }}</span>
								</div>

								<div v-if="cameraSettings.type === 'perspective'" class="slider-group">
									<label class="slider-label">视野角度 (透视)</label>
									<input
										type="range"
										v-model.number="cameraSettings.fov"
										min="1"
										max="179"
										step="1"
										class="slider-input"
										@input="delayedUpdateCameraFov"
									/>
									<span class="slider-value">{{ cameraSettings.fov }}°</span>
									<div class="fov-presets">
										<button class="fov-preset-btn" @click="setFov(15)">望远 15°</button>
										<button class="fov-preset-btn" @click="setFov(45)">标准 45°</button>
										<button class="fov-preset-btn" @click="setFov(75)">普通 75°</button>
										<button class="fov-preset-btn" @click="setFov(120)">广角 120°</button>
									</div>
								</div>

																<!-- 预设视角 -->
								<div class="preset-buttons">
									<button class="preset-btn" @click="setPresetView('top')">俯视</button>
									<button class="preset-btn" @click="setPresetView('perspective')">透视</button>
									<button class="preset-btn" @click="setPresetView('side')">侧视</button>
									<button class="preset-btn" @click="resetView">重置</button>
								</div>

								<!-- 视角管理 -->
								<div class="preset-buttons">
									<button class="preset-btn active" @click="resetView">恢复最佳视角</button>
									<button class="preset-btn" @click="showCurrentSettings">显示当前设置</button>
								</div>

								<!-- 当前相机信息 -->
								<div class="camera-info">
									<div class="info-row">
										<span class="info-label">当前位置:</span>
										<span class="info-value">
											X: {{ Math.round(cameraSettings.position.x) }},
											Y: {{ Math.round(cameraSettings.position.y) }},
											Z: {{ Math.round(cameraSettings.position.z) }}
										</span>
									</div>
									<div class="info-row">
										<span class="info-label">观察目标:</span>
										<span class="info-value">
											X: {{ Math.round(cameraSettings.target.x) }},
											Y: {{ Math.round(cameraSettings.target.y) }},
											Z: {{ Math.round(cameraSettings.target.z) }}
										</span>
									</div>
									<div class="info-row" v-if="cameraSettings.type === 'orthographic'">
										<span class="info-label">缩放:</span>
										<span class="info-value">{{ cameraSettings.zoom }}</span>
									</div>
									<div class="info-row" v-if="cameraSettings.type === 'perspective'">
										<span class="info-label">视野角度:</span>
										<span class="info-value">{{ cameraSettings.fov }}°</span>
									</div>
								</div>

								<!-- 操作提示 -->
								<div class="camera-tips">
									<p><strong>固定视角模式：</strong></p>
									<p>当前使用最佳观察视角，确保画面显示稳定</p>
									<p>• 可通过滑块微调相机参数</p>
									<p>• 点击"重置"恢复到最佳视角</p>
									<p class="tip-action">鼠标操作已禁用以防止画面异常</p>
								</div>
							</div>
						</div>

						<!-- 渲染设置 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>渲染设置</h4>
							</div>
							<div class="option-group">
								<div class="checkbox-group">
									<label class="checkbox-item">
										<input type="checkbox" v-model="renderSettings.shadows" />
										启用阴影
									</label>
									<label class="checkbox-item">
										<input type="checkbox" v-model="renderSettings.antialiasing" />
										抗锯齿
									</label>
								</div>
								<div class="slider-group">
									<label class="slider-label">光照强度</label>
									<input
										type="range"
										v-model="renderSettings.lightIntensity"
										min="0"
										max="2"
										step="0.1"
										class="slider-input"
										@input="updateLighting"
									/>
									<span class="slider-value">{{ renderSettings.lightIntensity }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- 状态栏 -->
		<div class="status-bar">
			<div class="status-item">
				<span class="status-label">连接状态:</span>
				<span class="status-indicator connected">
					已连接
				</span>
			</div>
			<div class="status-item">
				<span class="status-label">当前时间:</span>
				<span class="status-value">{{ currentTime }}</span>
			</div>
			<div class="status-item">
				<span class="status-label">内存使用:</span>
				<span class="status-value">{{ memoryUsage }}</span>
			</div>
			<div class="status-item">
				<span class="status-label">实时更新:</span>
				<span class="status-value active">{{ isRealTimeUpdate ? '🔄 进行中' : '⏸️ 暂停' }}</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted, ref, watchEffect, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import { SRGBColorSpace, BasicShadowMap, NoToneMapping, DoubleSide, Texture, PlaneGeometry, MeshBasicMaterial, Mesh, Group } from 'three'
import { OrbitControls } from '@tresjs/cientos'
import { useFBX } from '@tresjs/cientos'
import h337 from 'heatmap.js-fix'

// 响应式状态
const tcRef = ref()
const orthographicCameraRef = ref()
const perspectiveCameraRef = ref()
const orbitControlsRef = ref()
const sceneContainer = ref()
const lineChart = ref()
const pieChart = ref()

// 路由
const router = useRouter()

// Three.js GL配置
const gl = {
	clearColor: '#0c1426',
	outputColorSpace: SRGBColorSpace,
	shadowMapType: BasicShadowMap,
	toneMapping: NoToneMapping,
	useLegacyLights: false
}

// 已删除 modelParts 和 fbxModel，因为现在统一使用 cityModel

// 建筑状态
const buildingState = reactive({
	opacity: 0.9,
	buildingsColor: '#4a90e2',
	landColor: '#2c5530',
	show: true,
	showRoads: true  // 默认显示道路
})

// 上海建筑物模型
const cityModel = ref<Group | null>(null)
const isLoading = ref(false)

// 热力图状态
const heatmapEnabled = ref(false)
const heatmapMesh = ref<any>(null)

// 可视化选项
const showDensityHeatmap = ref(true)
const showSpeedVectors = ref(false)
const showBottlenecks = ref(false)
const showEvacuationRoutes = ref(false)
const isRealTimeUpdate = ref(true)

// 事件选择
const selectedEvent = ref('')
const startTime = ref('08:00')
const endTime = ref('18:00')

// 面板状态
const activePanel = ref('data')

// 相机设置（基于最佳视角参数）
const cameraSettings = reactive({
	type: 'orthographic', // 'orthographic' 或 'perspective'
	position: {
		x: 12,
		y: 760,
		z: -471
	},
	target: {
		x: -227,
		y: 287,
		z: -555
	},
	zoom: 1.3, // 正交相机缩放
	fov: 57    // 透视相机视野角度（最佳视角）
})

// 渲染设置
const renderSettings = reactive({
	shadows: true,
	antialiasing: true,
	lightIntensity: 1.2
})

// 相机更新现在只在用户手动操作时触发

// 状态信息
const currentTime = ref('')
const memoryUsage = ref('--')

// 定时器
let timeInterval: NodeJS.Timeout | null = null
let memoryInterval: NodeJS.Timeout | null = null

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

// 图表绘制函数
const drawLineChart = (canvas: HTMLCanvasElement) => {
	if (!canvas) return

	const ctx = canvas.getContext('2d')
	if (!ctx) return

	const width = canvas.width
	const height = canvas.height

	// 清除画布
	ctx.clearRect(0, 0, width, height)

	// 背景
	ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
	ctx.fillRect(0, 0, width, height)

	// 数据
	const data = [20, 45, 78, 92, 65, 88, 95, 87, 72, 58, 35]

	const padding = 40
	const chartWidth = width - padding * 2
	const chartHeight = height - padding * 2

	// 绘制坐标轴
	ctx.strokeStyle = '#444'
	ctx.lineWidth = 1
	ctx.beginPath()
	ctx.moveTo(padding, padding)
	ctx.lineTo(padding, height - padding)
	ctx.lineTo(width - padding, height - padding)
	ctx.stroke()

	// 绘制数据线
	ctx.strokeStyle = '#00d4ff'
	ctx.lineWidth = 2
	ctx.beginPath()

	data.forEach((value, index) => {
		const x = padding + (index / (data.length - 1)) * chartWidth
		const y = height - padding - (value / 100) * chartHeight

		if (index === 0) {
			ctx.moveTo(x, y)
		} else {
			ctx.lineTo(x, y)
		}
	})

	ctx.stroke()

	// 绘制数据点
	ctx.fillStyle = '#00d4ff'
	data.forEach((value, index) => {
		const x = padding + (index / (data.length - 1)) * chartWidth
		const y = height - padding - (value / 100) * chartHeight

		ctx.beginPath()
		ctx.arc(x, y, 3, 0, Math.PI * 2)
		ctx.fill()
	})
}

const drawPieChart = (canvas: HTMLCanvasElement) => {
	if (!canvas) return

	const ctx = canvas.getContext('2d')
	if (!ctx) return

	const width = canvas.width
	const height = canvas.height
	const centerX = width / 2
	const centerY = height / 2 - 20
	const radius = Math.min(width, height) / 3

	// 清除画布
	ctx.clearRect(0, 0, width, height)

	// 数据
	const data = [25, 35, 20, 10, 10]
	const labels = ['入口区域', '中央大厅', '商铺区', '休息区', '出口区域']
	const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']

	const total = data.reduce((sum, value) => sum + value, 0)
	let currentAngle = 0

	// 绘制饼图
	data.forEach((value, index) => {
		const sliceAngle = (value / total) * Math.PI * 2

		ctx.fillStyle = colors[index]
		ctx.beginPath()
		ctx.moveTo(centerX, centerY)
		ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
		ctx.closePath()
		ctx.fill()

		// 绘制标签
		const labelAngle = currentAngle + sliceAngle / 2
		const labelX = centerX + Math.cos(labelAngle) * (radius + 20)
		const labelY = centerY + Math.sin(labelAngle) * (radius + 20)

		ctx.fillStyle = '#ffffff'
		ctx.font = '12px Microsoft YaHei'
		ctx.textAlign = 'center'
		ctx.fillText(`${labels[index]}`, labelX, labelY)
		ctx.fillText(`${value}%`, labelX, labelY + 15)

		currentAngle += sliceAngle
	})
}

// 更新图表
const updateCharts = () => {
	if (lineChart.value) {
		drawLineChart(lineChart.value)
	}
	if (pieChart.value) {
		drawPieChart(pieChart.value)
	}
}

// 时间和内存更新
const updateTime = () => {
	const now = new Date()
	currentTime.value = now.toLocaleTimeString()
}

const updateMemoryUsage = () => {
	if ('memory' in performance) {
		const memory = (performance as any).memory
		const used = Math.round(memory.usedJSHeapSize / 1024 / 1024)
		memoryUsage.value = `${used} MB`
	}
}

// 方法
const goHome = () => {
	router.push('/')
}

const toggleHeatmap = () => {
	heatmapEnabled.value = !heatmapEnabled.value
}

// 切换道路显示
const toggleRoads = () => {
	if (cityModel.value) {
		let roadCount = 0
		cityModel.value.traverse((child: any) => {
			if (child.isMesh) {
				const name = child.name.toLowerCase()

				// 识别道路相关的mesh
				if (name.includes('road') ||
					name.includes('street') ||
					name.includes('path') ||
					name.includes('ground') ||
					name.includes('land') ||
					name.includes('floor')) {
					child.visible = buildingState.showRoads
					roadCount++
				}
			}
		})
		console.log(`切换道路显示: ${buildingState.showRoads ? '显示' : '隐藏'}, 找到${roadCount}个路面mesh`)
	}
}

// 已删除调试函数，因为现在有了更好的相机控制方案

const resetView = () => {
	// 重置相机设置到最佳视角
	cameraSettings.position.x = 12
	cameraSettings.position.y = 760
	cameraSettings.position.z = -471
	cameraSettings.target.x = -227
	cameraSettings.target.y = 287
	cameraSettings.target.z = -555
	cameraSettings.zoom = 1.3
	cameraSettings.fov = 57
	cameraSettings.type = 'orthographic'

	// 应用设置
	setTimeout(() => {
		updateCameraPosition()
		updateCameraTarget()
		if (cameraSettings.type === 'orthographic') {
			updateCameraZoom()
		} else {
			updateCameraFov()
		}
	}, 50)
}

const loadSimulationEvent = () => {
	if (selectedEvent.value) {

		// 这里可以根据事件类型加载不同的仿真数据
	}
}



// 相机控制函数
const getCurrentCamera = () => {
	return cameraSettings.type === 'orthographic' ? orthographicCameraRef.value : perspectiveCameraRef.value
}

const updateCameraPosition = () => {
	const camera = getCurrentCamera()
	if (camera) {
		camera.position.set(
			cameraSettings.position.x,
			cameraSettings.position.y,
			cameraSettings.position.z
		)
		updateOrbitControls()
	}
}

const updateCameraTarget = () => {
	if (orbitControlsRef.value && orbitControlsRef.value.target) {
		try {
			orbitControlsRef.value.target.set(
				cameraSettings.target.x,
				cameraSettings.target.y,
				cameraSettings.target.z
			)
			orbitControlsRef.value.update()
		} catch (error) {
			console.warn('更新相机目标失败:', error)
		}
	}
}

const updateCameraZoom = () => {
	if (cameraSettings.type === 'orthographic' && orthographicCameraRef.value) {
		try {
			orthographicCameraRef.value.zoom = cameraSettings.zoom
			orthographicCameraRef.value.updateProjectionMatrix()
		} catch (error) {
			console.warn('更新相机缩放失败:', error)
		}
	}
}

const updateCameraFov = () => {
	if (cameraSettings.type === 'perspective' && perspectiveCameraRef.value) {
		try {
			perspectiveCameraRef.value.fov = cameraSettings.fov
			perspectiveCameraRef.value.updateProjectionMatrix()
		} catch (error) {
			console.warn('更新相机视野角度失败:', error)
		}
	}
}

const changeCameraType = () => {
	// 切换相机类型时，保持当前位置和目标
	setTimeout(() => {
		updateCameraPosition()
		updateCameraTarget()
		if (cameraSettings.type === 'orthographic') {
			updateCameraZoom()
		} else {
			updateCameraFov()
		}
	}, 100)
}

const updateOrbitControls = () => {
	if (orbitControlsRef.value && typeof orbitControlsRef.value.update === 'function') {
		try {
			orbitControlsRef.value.update()
		} catch (error) {
			console.warn('更新OrbitControls失败:', error)
		}
	}
}

const setPresetView = (viewType: string) => {
	switch (viewType) {
		case 'top':
			cameraSettings.position.x = 0
			cameraSettings.position.y = 100
			cameraSettings.position.z = 0
			cameraSettings.target.x = 0
			cameraSettings.target.y = 0
			cameraSettings.target.z = 0
			break
		case 'perspective':
			cameraSettings.position.x = 50
			cameraSettings.position.y = 80
			cameraSettings.position.z = 50
			cameraSettings.target.x = 0
			cameraSettings.target.y = 0
			cameraSettings.target.z = 0
			break
		case 'side':
			cameraSettings.position.x = 100
			cameraSettings.position.y = 50
			cameraSettings.position.z = 0
			cameraSettings.target.x = 0
			cameraSettings.target.y = 0
			cameraSettings.target.z = 0
			break
	}

	setTimeout(() => {
		updateCameraPosition()
		updateCameraTarget()
	}, 50)
}

// 已移除鼠标操作监听函数，现在使用固定的最佳视角

// 防止循环更新的标志
const isUpdatingCamera = ref(false)

// 读取当前相机设置
const getCurrentCameraSettings = () => {
	const camera = getCurrentCamera()
	if (camera) {
		const currentSettings = {
			type: cameraSettings.type,
			position: {
				x: Math.round(camera.position.x),
				y: Math.round(camera.position.y),
				z: Math.round(camera.position.z)
			},
			target: {
				x: 0,
				y: 0,
				z: 0
			},
			zoom: cameraSettings.type === 'orthographic' ? (camera.zoom || 1) : undefined,
			fov: cameraSettings.type === 'perspective' ? (camera.fov || 75) : undefined
		}

		if (orbitControlsRef.value && orbitControlsRef.value.target) {
			currentSettings.target.x = Math.round(orbitControlsRef.value.target.x)
			currentSettings.target.y = Math.round(orbitControlsRef.value.target.y)
			currentSettings.target.z = Math.round(orbitControlsRef.value.target.z)
		}

		return currentSettings
	}
	return null
}

// 显示当前设置
const showCurrentSettings = () => {
	const current = getCurrentCameraSettings()
	if (current) {
		console.log('当前相机设置:', current)
		alert(`当前相机设置：
位置: (${current.position.x}, ${current.position.y}, ${current.position.z})
目标: (${current.target.x}, ${current.target.y}, ${current.target.z})
${current.fov ? `视野角度: ${current.fov}°` : `缩放: ${current.zoom}`}`)
	}
}

// 延迟更新函数（避免模板中直接使用setTimeout）
const delayedUpdateCameraPosition = () => {
	isUpdatingCamera.value = true
	setTimeout(() => {
		updateCameraPosition()
		isUpdatingCamera.value = false
	}, 10)
}

const delayedUpdateCameraTarget = () => {
	isUpdatingCamera.value = true
	setTimeout(() => {
		updateCameraTarget()
		isUpdatingCamera.value = false
	}, 10)
}

const delayedUpdateCameraZoom = () => {
	isUpdatingCamera.value = true
	setTimeout(() => {
		updateCameraZoom()
		isUpdatingCamera.value = false
	}, 10)
}

const delayedUpdateCameraFov = () => {
	isUpdatingCamera.value = true
	setTimeout(() => {
		updateCameraFov()
		isUpdatingCamera.value = false
	}, 10)
}

// 快速设置视野角度
const setFov = (fov: number) => {
	cameraSettings.fov = fov
	delayedUpdateCameraFov()
}

// 更新光照设置
const updateLighting = () => {
	// 这里可以更新场景中的光照强度
}

// 创建热力图网格
const createHeatmapMesh = () => {
	if (!heatmapEnabled.value) return

	try {
		const canvas = document.createElement('canvas')
		canvas.width = 512
		canvas.height = 512

		const heatmapInstance = h337.create({
			...heatmapConfig,
			container: canvas,
			width: 512,
			height: 512
		})

		// 生成示例热力图数据
		const points = []
		for (let i = 0; i < 50; i++) {
			points.push({
				x: Math.random() * 512,
				y: Math.random() * 512,
				value: Math.random()
			})
		}

		heatmapInstance.setData({
			max: 1,
			data: points
		})

		// 创建Three.js材质和网格
		const texture = new Texture(canvas)
		texture.needsUpdate = true

		const geometry = new PlaneGeometry(50, 50)
		const material = new MeshBasicMaterial({
			map: texture,
			transparent: true,
			opacity: 0.7,
			side: DoubleSide
		})

		const mesh = new Mesh(geometry, material)
		mesh.rotation.x = -Math.PI / 2
		mesh.position.y = 0.1

		heatmapMesh.value = markRaw(mesh)
	} catch (error) {
		console.warn('热力图创建失败:', error)
	}
}

// 加载上海建筑物模型
const loadCityModel = async () => {
	if (isLoading.value) return // 防止重复加载

	isLoading.value = true
	try {
		const path = '/plugins/digitalCity/model/shanghai.FBX'
		// useFBX 直接返回一个 Group 对象
		const model = await useFBX(path)

		// 确保模型正确加载
		if (model) {
			// 按照XZ平面顺时针旋转90度（绕Y轴旋转-90度）
			model.rotation.y = -Math.PI / 2

			// 使用 markRaw 避免 Vue 的响应式代理
			cityModel.value = markRaw(model)

			// 延迟设置材质，避免渲染时的代理冲突
			setTimeout(() => {
				if (model) {
					model.traverse((child: any) => {
						if (child.isMesh && child.material) {
							const name = child.name.toLowerCase()

							// 识别路面相关的mesh
							if (name.includes('road') ||
								name.includes('street') ||
								name.includes('path') ||
								name.includes('ground') ||
								name.includes('land') ||
								name.includes('floor')) {
								// 根据设置决定是否显示路面
								child.visible = buildingState.showRoads
								// 设置路面材质
								child.material.transparent = true
								child.material.opacity = 0.8 // 路面稍微透明一些
								return
							}

							// 建筑物相关的mesh
							child.material.transparent = true
							child.material.opacity = buildingState.opacity
						}
					})
				}
			}, 100)
		}
	} catch (error: any) {
		console.error('加载上海建筑物模型失败:', error)
		console.error('错误详情:', error?.message || '未知错误')
	} finally {
		isLoading.value = false
	}
}

// 已删除 processFBXModel 函数，因为现在统一在 loadCityModel 中处理模型加载和过滤

// 统计更新
const updateStats = () => {
	updateTime()
	updateMemoryUsage()
	updateCharts()
}

// 生命周期
onMounted(async () => {
	// 初始化
	await loadCityModel() // 加载上海建筑物模型
	// 注释掉重复的模型处理，避免重复加载
	// await processFBXModel()

	// 初始化相机设置
	setTimeout(() => {
		updateCameraPosition()
		updateCameraTarget()
		if (cameraSettings.type === 'orthographic') {
			updateCameraZoom()
		}
	}, 200)

	updateStats()

	// 启动定时器
	timeInterval = setInterval(updateTime, 1000);
	memoryInterval = setInterval(updateMemoryUsage, 5000);

	// 定期更新图表 - 移除这个定时器，它可能导致过度更新
	// const updateInterval = setInterval(() => {
	// 	if (isRealTimeUpdate.value) {
	// 		updateStats()
	// 	}
	// }, 3000)
})

// 正确放置 onUnmounted 在 setup 函数顶层
onUnmounted(() => {
	if (timeInterval) clearInterval(timeInterval)
	if (memoryInterval) clearInterval(memoryInterval)
})

// 监听材质变化 - 简化版本，减少不必要的更新
watchEffect(() => {
	// 只监听建筑物透明度变化，避免颜色更新导致的频繁重绘
	if (cityModel.value && buildingState.opacity !== undefined) {
		cityModel.value.traverse((child: any) => {
			if (child.isMesh && child.material) {
				try {
					child.material.opacity = buildingState.opacity
				} catch (e) {
					console.warn('更新透明度失败:', e)
				}
			}
		})
	}
})

// 移除复杂的材质颜色监听，避免过度更新
// 如果需要更新颜色，可以通过手动调用函数实现

// 监听热力图状态变化 - 简化版本
watchEffect(() => {
	if (heatmapEnabled.value) {
		// 延迟创建热力图，避免频繁更新
		setTimeout(() => {
			if (heatmapEnabled.value) { // 双重检查
				createHeatmapMesh()
			}
		}, 100)
	} else {
		heatmapMesh.value = null
	}
})

// 移除自动watchEffect，改为手动调用更新函数，避免递归调用和初始化错误


</script>

<style scoped>
.simulation-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0c1426 0%, #1a1f35 50%, #2a2d47 100%);
  color: #ffffff;
  font-family: 'Microsoft YaHei', 'Arial', sans-serif;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.top-navbar {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 212, 255, 0.3);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-icon {
  font-size: 2rem;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  background: linear-gradient(45deg, #00d4ff, #0099cc);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.nav-buttons {
  display: flex;
  gap: 1rem;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.nav-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
}

.nav-btn.active {
  background: linear-gradient(45deg, #00d4ff, #0099cc);
  color: #ffffff;
  border-color: #00d4ff;
}

.home-btn {
  background: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.5);
}

.home-btn:hover {
  background: rgba(255, 107, 107, 0.3);
  border-color: #ff6b6b;
}

.btn-icon {
  font-size: 1.1rem;
}

/* 主要内容容器 */
.main-container {
  flex: 1;
  padding: 2rem;
  max-width: 2400px;
  margin: 0 auto;
  width: 100%;
}

/* 可视化布局 */
.visualization-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  height: calc(100vh - 200px);
}

/* 模型区域 */
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

.section-header h5 {
  margin: 0 0 1rem 0;
  color: #00d4ff;
  font-size: 1rem;
}

.section-header h6 {
  margin: 0 0 0.5rem 0;
  color: #ffffff;
  font-size: 0.9rem;
}

.model-controls {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
}

.control-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  transform: translateY(-1px);
}

.control-btn.active {
  background: #00d4ff;
  color: #0c1426;
}

.model-container {
  flex: 1;
  position: relative;
}

/* 加载状态样式 */
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

.loading-spinner p {
  margin: 0;
  font-size: 16px;
  opacity: 0.8;
}

/* 控制面板 */
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
}

.panel-tab {
  flex: 1;
  text-align: center;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  color: #ffffff;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 500;
}

.panel-tab:hover {
  background: rgba(0, 212, 255, 0.1);
}

.panel-tab.active {
  border-bottom-color: #00d4ff;
  color: #00d4ff;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

.panel-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  overflow: hidden;
}

.panel-section .section-header {
  padding: 1rem 1.5rem;
}

.option-group {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.option-group:last-child {
  border-bottom: none;
}

/* 预设按钮样式 */
.preset-buttons {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.preset-btn {
  flex: 1;
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
  text-align: center;
}

.preset-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  transform: translateY(-1px);
}

.preset-btn.active {
  background: #00d4ff;
  color: #0c1426;
}

/* 相机信息显示 */
.camera-info {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #00d4ff;
  font-size: 0.85rem;
  font-weight: 500;
  min-width: 80px;
}

.info-value {
  color: #ffffff;
  font-size: 0.85rem;
  font-family: 'Courier New', monospace;
  text-align: right;
}

/* 操作提示 */
.camera-tips {
  background: rgba(0, 212, 255, 0.05);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
  font-size: 0.8rem;
  line-height: 1.4;
}

.camera-tips p {
  margin: 0 0 0.5rem 0;
  color: #ffffff;
}

.camera-tips p:last-child {
  margin-bottom: 0;
}

.tip-highlight {
  color: #00d4ff;
  font-weight: 600;
}

.tip-action {
  color: #00d4ff;
  font-weight: 500;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 212, 255, 0.2);
}

/* FOV预设按钮 */
.fov-presets {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.fov-preset-btn {
  flex: 1;
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.4rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.7rem;
  text-align: center;
  min-width: 0;
}

.fov-preset-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  transform: translateY(-1px);
}

.fov-preset-btn:active {
  background: #00d4ff;
  color: #0c1426;
}

/* 控制行样式 */
.control-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.control-row:last-child {
  margin-bottom: 0;
}

.control-label {
  min-width: 80px;
  color: #00d4ff;
  font-size: 0.9rem;
  font-weight: 500;
}

.control-value {
  min-width: 40px;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: bold;
}

.option-label {
  display: block;
  color: #00d4ff;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.select-input, .time-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  color: #ffffff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
}

.select-input:focus, .time-input:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

.time-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-separator {
  color: #888;
  font-size: 0.9rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  color: #ffffff;
  font-size: 0.9rem;
}

.checkbox-item input[type="checkbox"] {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(0, 212, 255, 0.5);
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  position: relative;
}

.checkbox-item input[type="checkbox"]:checked {
  background: #00d4ff;
  border-color: #00d4ff;
}

.checkbox-item input[type="checkbox"]:checked::after {
  content: '✓';
  position: absolute;
  top: -2px;
  left: 2px;
  color: #0c1426;
  font-size: 12px;
  font-weight: bold;
}

/* 滑块组样式 */
.slider-group {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.slider-label {
  display: block;
  color: #00d4ff;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.slider-input {
  width: 100%;
  height: 6px;
  background: rgba(0, 212, 255, 0.2);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  margin-bottom: 0.5rem;
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #00d4ff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.slider-input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #00d4ff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.slider-value {
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: bold;
}

/* 数据可视化区域 */
.data-visualization {
  flex: 1;
  min-height: 400px;
}

.chart-container {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-container:last-child {
  border-bottom: none;
}

.chart-container canvas {
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
}

/* 状态栏 */
.status-bar {
  background: rgba(0, 0, 0, 0.8);
  border-top: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.75rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  color: #888;
}

.status-value {
  color: #ffffff;
}

.status-value.active {
  color: #00d4ff;
}

.status-indicator {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
}

.status-indicator.connected {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-indicator.connecting {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.status-indicator.disconnected {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .visualization-layout {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }

  .control-panel {
    max-height: 400px;
  }
}

@media (max-width: 768px) {
  .nav-content {
    flex-direction: column;
    gap: 1rem;
  }

  .nav-buttons {
    flex-wrap: wrap;
    justify-content: center;
  }

  .main-container {
    padding: 1rem;
  }

  .status-bar {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}
</style>
