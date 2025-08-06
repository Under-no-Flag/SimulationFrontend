<!--
 * @Description: 上海建筑物展示页面
 * @Version: 1.0
 * @Autor: 二次开发
 * @Date: 2024-12-19
-->
<template>
	<div class="shanghai-page">
		<!-- 顶部导航栏 -->
		<div class="top-nav">
			<h1>🏙️ 上海建筑物展示</h1>
			<div class="nav-buttons">
				<button @click="goHome" class="nav-btn">🏠 返回首页</button>
				<button @click="goToSimulation" class="nav-btn">👥 人群仿真</button>
				<button @click="resetCamera" class="nav-btn">📷 重置视角</button>
			</div>
		</div>

		<!-- 加载状态 -->
		<div v-if="isLoading" class="loading-overlay">
			<div class="loading-spinner">
				<div class="spinner"></div>
				<p>正在加载上海建筑3D模型...</p>
			</div>
		</div>

		<!-- 状态显示栏 -->
		<div class="status-bar">
			<div class="status-item">
				<span class="status-label">模型状态:</span>
				<span class="status-value" :class="{ loaded: cityModel }">
					{{ cityModel ? '✅ 已加载' : '⏳ 加载中' }}
				</span>
			</div>
			<div class="status-item">
				<span class="status-label">自动旋转:</span>
				<span class="status-value" :class="{ active: controlsState.autoRotate }">
					{{ controlsState.autoRotate ? '🔄 开启' : '⏸️ 关闭' }}
				</span>
			</div>
			<div class="status-item">
				<span class="status-label">透明度:</span>
				<span class="status-value">{{ Math.round(buildingState.opacity * 100) }}%</span>
			</div>
		</div>

		<TresCanvas ref="tcRef" v-bind="state" window-size>
			<TresPerspectiveCamera ref="perspectiveCameraRef" :position="[600, 750, -1221]" :fov="45" :near="1" :far="100000" />
			<OrbitControls v-bind="controlsState" />
			<TresAmbientLight color="#ffffff" />
			<TresDirectionalLight :position="[100, 100, 0]" :intensity="0.5" color="#ffffff" />

			<!-- 建筑物模型 -->
			<primitive v-if="buildingState.show && cityModel" :object="cityModel" />

			<TresAxesHelper v-if="showAxesHelper" :args="[1000]" :position="[0, 19, 0]" />
			<TresGridHelper v-if="showGridHelper" :args="[6000, 100]" :position="[0, 19, 0]" />
		</TresCanvas>
	</div>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref, watchEffect } from 'vue'
import { Pane } from 'tweakpane'
import { SRGBColorSpace, BasicShadowMap, NoToneMapping, Group } from 'three'
import { OrbitControls } from '@tresjs/cientos'
import { useFBX } from '@tresjs/cientos'

// 响应式状态
const tcRef = ref()
const perspectiveCameraRef = ref()
const cityModel = ref<Group | null>(null)
const isLoading = ref(false)

// 加载城市模型
const loadCityModel = async () => {
	if (isLoading.value) return // 防止重复加载

	isLoading.value = true
	try {
		const path = '/plugins/digitalCity/model/shanghai.FBX'
		const model = await useFBX(path)

		// 确保模型正确加载
		if (model) {
			cityModel.value = model

			// 简化材质设置，避免代理问题
			model.traverse((child: any) => {
				if (child.isMesh && child.material) {
					// 只设置基本属性，避免复杂的材质操作
					child.material.transparent = true
					child.material.opacity = buildingState.opacity
				}
			})
		}
	} catch (error: any) {
		console.error('加载模型失败:', error)
		console.error('错误详情:', error?.message || '未知错误')
	} finally {
		isLoading.value = false
	}
}

// 导航方法
const goHome = () => {
	window.location.href = '/'
}

const goToSimulation = () => {
	window.location.href = '/simulation'
}

const resetCamera = () => {
	if (perspectiveCameraRef.value) {
		// 重置相机位置到初始位置
		perspectiveCameraRef.value.position.set(600, 750, -1221)
		console.log('相机位置已重置')
	}
}

// 加载模型
loadCityModel()

// 画布状态
const state = reactive({
	clearColor: '#000000',
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
	autoRotate: true,
	enableDamping: true
})

// 辅助工具显示状态
const showAxesHelper = ref(true)
const showGridHelper = ref(true)

// 建筑物状态控制
const buildingState = reactive({
	opacity: 0.9,
	show: true
})

onMounted(() => {
	// 创建控制面板
	const paneControl = new Pane({
		title: '上海建筑效果控制',
		expanded: true,
	})

	// 建筑物控制文件夹
	const f1 = paneControl.addFolder({
		title: '建筑物效果',
	})
	f1.addBinding(buildingState, 'show', { label: '显示建筑物' })
	f1.addBinding(buildingState, 'opacity', {
		label: '建筑物透明度',
		min: 0,
		max: 1,
		step: 0.1,
	})

	// 场景控制文件夹
	const f2 = paneControl.addFolder({
		title: '场景控制',
	})
	f2.addBinding(controlsState, 'autoRotate', { label: '自动旋转' })
	f2.addBinding(showAxesHelper, 'value', { label: '显示坐标轴' })
	f2.addBinding(showGridHelper, 'value', { label: '显示网格' })

	// 监听透明度变化
	watchEffect(() => {
		if (cityModel.value) {
			cityModel.value.traverse((child: any) => {
				if (child.isMesh && child.material) {
					// 只更新透明度，避免颜色更新导致的代理问题
					try {
						child.material.opacity = buildingState.opacity
					} catch (e) {
						console.warn('更新透明度失败:', e)
					}
				}
			})
		}
	})
})
</script>

<style scoped>
.shanghai-page {
	width: 100%;
	height: 100vh;
	position: relative;
	background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

/* 顶部导航栏 */
.top-nav {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	background: rgba(0, 0, 0, 0.8);
	backdrop-filter: blur(10px);
	border-bottom: 1px solid rgba(255, 255, 255, 0.2);
	padding: 1rem 2rem;
	display: flex;
	justify-content: space-between;
	align-items: center;
	z-index: 1000;
}

.top-nav h1 {
	color: white;
	font-size: 1.5rem;
	font-weight: bold;
	margin: 0;
	background: linear-gradient(45deg, #3498db, #2ecc71);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	text-shadow: none;
}

.nav-buttons {
	display: flex;
	gap: 1rem;
}

.nav-btn {
	background: rgba(255, 255, 255, 0.1);
	color: white;
	border: 1px solid rgba(255, 255, 255, 0.3);
	padding: 0.5rem 1rem;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.3s ease;
	font-size: 0.9rem;
	font-weight: 500;
}

.nav-btn:hover {
	background: rgba(52, 152, 219, 0.3);
	border-color: #3498db;
	transform: translateY(-2px);
}

/* 状态栏 */
.status-bar {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	background: rgba(0, 0, 0, 0.8);
	backdrop-filter: blur(10px);
	border-top: 1px solid rgba(255, 255, 255, 0.2);
	padding: 0.75rem 2rem;
	display: flex;
	gap: 2rem;
	align-items: center;
	z-index: 1000;
	font-size: 0.9rem;
}

.status-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.status-label {
	color: #bdc3c7;
}

.status-value {
	color: #ecf0f1;
	font-weight: 500;
}

.status-value.loaded {
	color: #2ecc71;
}

.status-value.active {
	color: #3498db;
}

/* 加载状态样式 */
.loading-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.9);
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
	width: 60px;
	height: 60px;
	border: 4px solid rgba(52, 152, 219, 0.3);
	border-top: 4px solid #3498db;
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
	opacity: 0.9;
	color: #3498db;
}

/* 响应式设计 */
@media (max-width: 768px) {
	.top-nav {
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}
	
	.nav-buttons {
		flex-wrap: wrap;
		justify-content: center;
	}
	
	.status-bar {
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		text-align: center;
	}
	
	.top-nav h1 {
		font-size: 1.2rem;
	}
}
</style>