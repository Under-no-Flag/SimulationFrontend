<!--
 * @Description: 首页 - 集成上海建筑物展示
 * @Version: 1.0
 * @Autor: 二次开发
 * @Date: 2024-12-19
-->
<template>
	<div class="index-page">
		<!-- 导航栏 -->
		<nav class="navbar">
			<div class="nav-content">
				<h1 class="logo">THREE-VUE-TRES</h1>
				<div class="nav-links">
					<button @click="showShanghai = true" class="nav-btn">上海建筑物展示</button>
					<button @click="showShanghai = false" class="nav-btn">返回首页</button>
					<button @click="goToSimulation" class="nav-btn">仿真系统</button>
				</div>
			</div>
		</nav>

		<!-- 主要内容区域 -->
		<div class="main-content">
			<!-- 上海建筑物展示组件 -->
			<div v-if="showShanghai" class="shanghai-container">
				<div class="shanghai-page">
					<h1>上海建筑物展示</h1>

					<!-- 加载状态 -->
					<div v-if="isLoading" class="loading-overlay">
						<div class="loading-spinner">
							<div class="spinner"></div>
							<p>正在加载模型...</p>
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
			</div>

			<!-- 首页内容 -->
			<div v-else class="home-content">
				<div class="welcome-section">
					<h2>欢迎使用 THREE-VUE-TRES</h2>
					<p>这是一个基于 Three.js 和 Vue 3 的 3D 可视化框架</p>

					<div class="feature-cards">
						<div class="feature-card">
							<h3>3D 场景展示</h3>
							<p>支持各种 3D 模型的加载和展示</p>
						</div>
						<div class="feature-card">
							<h3>实时交互</h3>
							<p>提供完整的鼠标和触摸交互支持</p>
						</div>
						<div class="feature-card">
							<h3>参数控制</h3>
							<p>实时调整模型材质和场景参数</p>
						</div>
					</div>

					<div class="action-buttons">
						<button @click="showShanghai = true" class="cta-button">
							开始体验上海建筑物展示
						</button>
						<button @click="goToSimulation" class="cta-button secondary">
							进入仿真系统
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref, watchEffect, markRaw } from 'vue'
import { Pane } from 'tweakpane'
import { SRGBColorSpace, BasicShadowMap, NoToneMapping, Group } from 'three'
import { OrbitControls } from '@tresjs/cientos'
import { useFBX } from '@tresjs/cientos'

// 控制显示状态
const showShanghai = ref(false)

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
			// 使用 markRaw 避免 Vue 的响应式代理
			cityModel.value = markRaw(model)

			// 延迟设置材质，避免渲染时的代理冲突
			setTimeout(() => {
				if (model) {
					model.traverse((child: any) => {
						if (child.isMesh && child.material) {
							// 只设置基本属性，避免复杂的材质操作
							child.material.transparent = true
							child.material.opacity = buildingState.opacity
						}
					})
				}
			}, 100)
		}
	} catch (error: any) {
		console.error('加载模型失败:', error)
		console.error('错误详情:', error?.message || '未知错误')
	} finally {
		isLoading.value = false
	}
}

// 跳转到仿真系统
const goToSimulation = () => {
	// 使用 Vue Router 进行跳转，确保在 hash 模式下正常工作
	if ((window as any).$vue && (window as any).$vue.$router) {
		(window as any).$vue.$router.push('/simulation')
	} else {
		// 备用方案：使用 hash 模式的正确格式
		window.location.href = '/#/simulation'
	}
}

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

// 监听显示状态变化，加载模型
watchEffect(() => {
	if (showShanghai.value && !cityModel.value) {
		loadCityModel()
	}
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
.index-page {
	min-height: 100vh;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	font-family: 'Arial', sans-serif;
}

/* 导航栏样式 */
.navbar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	background: rgba(0, 0, 0, 0.8);
	backdrop-filter: blur(10px);
	z-index: 1000;
	padding: 1rem 0;
}

.nav-content {
	max-width: 1200px;
	margin: 0 auto;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 2rem;
}

.logo {
	color: white;
	font-size: 1.5rem;
	font-weight: bold;
	margin: 0;
}

.nav-links {
	display: flex;
	gap: 1rem;
}

.nav-btn {
	background: rgba(255, 255, 255, 0.1);
	color: white;
	border: 1px solid rgba(255, 255, 255, 0.2);
	padding: 0.5rem 1rem;
	border-radius: 5px;
	cursor: pointer;
	transition: all 0.3s ease;
}

.nav-btn:hover {
	background: rgba(255, 255, 255, 0.2);
	transform: translateY(-2px);
}

/* 主要内容区域 */
.main-content {
	padding-top: 80px;
	height: calc(100vh - 80px);
}

/* 上海建筑物展示容器 */
.shanghai-container {
	width: 100%;
	height: 100%;
	position: relative;
}

.shanghai-page {
	width: 100%;
	height: 100vh;
	position: relative;
}

.shanghai-page h1 {
	position: absolute;
	top: 20px;
	left: 20px;
	color: white;
	z-index: 1000;
	font-size: 24px;
	font-weight: bold;
	text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
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

/* 首页内容样式 */
.home-content {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100%;
	padding: 2rem;
}

.welcome-section {
	text-align: center;
	color: white;
	max-width: 800px;
}

.welcome-section h2 {
	font-size: 3rem;
	margin-bottom: 1rem;
	text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.welcome-section p {
	font-size: 1.2rem;
	margin-bottom: 3rem;
	opacity: 0.9;
}

/* 功能卡片 */
.feature-cards {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: 2rem;
	margin-bottom: 3rem;
}

.feature-card {
	background: rgba(255, 255, 255, 0.1);
	backdrop-filter: blur(10px);
	border-radius: 10px;
	padding: 2rem;
	border: 1px solid rgba(255, 255, 255, 0.2);
	transition: transform 0.3s ease;
}

.feature-card:hover {
	transform: translateY(-5px);
}

.feature-card h3 {
	font-size: 1.5rem;
	margin-bottom: 1rem;
	color: #fff;
}

.feature-card p {
	opacity: 0.8;
	line-height: 1.6;
}

/* 按钮样式 */
.action-buttons {
	display: flex;
	gap: 1rem;
	justify-content: center;
	flex-wrap: wrap;
}

.cta-button {
	background: linear-gradient(45deg, #ff6b6b, #ee5a24);
	color: white;
	border: none;
	padding: 1rem 2rem;
	font-size: 1.1rem;
	border-radius: 50px;
	cursor: pointer;
	transition: all 0.3s ease;
	box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.cta-button:hover {
	transform: translateY(-3px);
	box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.cta-button.secondary {
	background: linear-gradient(45deg, #4ECDC4, #44A08D);
}

/* 响应式设计 */
@media (max-width: 768px) {
	.nav-content {
		flex-direction: column;
		gap: 1rem;
	}

	.nav-links {
		flex-wrap: wrap;
		justify-content: center;
	}

	.welcome-section h2 {
		font-size: 2rem;
	}

	.feature-cards {
		grid-template-columns: 1fr;
	}

	.action-buttons {
		flex-direction: column;
		align-items: center;
	}
}
</style>
