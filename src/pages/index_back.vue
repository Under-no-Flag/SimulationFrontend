<!--
 * @De								<div class="nav-links">
					<button @click="showShanghai = true" class="nav-btn">上海建筑物展示</button>
					<button @click="showShanghai = false" class="nav-btn">返回首页</button>
					<button @click="toggleHeatmap" class="nav-btn">切换热力图</button>
					<button @click="goToSimulation" class="nav-btn simulation-btn">🏙️ 人群仿真可视化</button>
					<button @click="goToSimulationTest" class="nav-btn test-btn">🧪 测试仿真路由</button>
					<button @click="goToDebug" class="nav-btn debug-btn">🔧 路由调试</button>
					<div class="memory-warning" v-if="showShanghai && heatmapState.show">
						⚠️ 热力图已优化，如遇内存不足请关闭热力图
					</div>
				</div>n: 首页 - 集成上海建筑物展示
 * @Version: 1.0
 * @Author: 二次开发
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
						<button @click="toggleHeatmap" class="nav-btn">切换热力图</button>
						<div class="memory-warning" v-if="showShanghai && heatmapState.show">
							⚠️ 热力图已优化，如遇内存不足请关闭热力图
						</div>
						<button @click="goToSimulation" class="nav-btn simulation-btn">🏙️ 人群仿真可视化</button>
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
						<TresPerspectiveCamera ref="perspectiveCameraRef" :position="fixedViewState.enabled ? [fixedViewState.positionX, fixedViewState.positionY, fixedViewState.positionZ] : [-410, 1450, 59]" :fov="45" :near="1" :far="100000" />
						<OrbitControls v-bind="controlsState" :target="fixedViewState.enabled ? [fixedViewState.targetX, fixedViewState.targetY, fixedViewState.targetZ] : [0, 0, 0]" />
						<TresAmbientLight color="#ffffff" />
						<TresDirectionalLight :position="[100, 100, 0]" :intensity="0.5" color="#ffffff" />

						<!-- 建筑物模型 -->
						<primitive v-if="buildingState.show && cityModel" :object="cityModel" />

						<!-- 热力图 -->
						<heatmapMesh v-if="heatmapState.show" v-bind="heatmapState" />

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

					<button @click="showShanghai = true" class="cta-button">
						开始体验上海建筑物展示
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted, ref, watchEffect, markRaw, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'
import { Pane } from 'tweakpane'
import { SRGBColorSpace, BasicShadowMap, NoToneMapping, Group, DoubleSide, Texture } from 'three'
import { OrbitControls } from '@tresjs/cientos'
import { useFBX } from '@tresjs/cientos'
import h337 from 'heatmap.js-fix'

// 获取路由器实例
const router = useRouter()

// 控制显示状态
const showShanghai = ref(false)

// 响应式状态
const tcRef = ref()
const perspectiveCameraRef = ref()
const cityModel = ref<Group | null>(null)
const isLoading = ref(false)

// 存储模型部分的引用
const modelParts = reactive({
	cityBuildings: null as any,
	landMass: null as any,
	roads: null as any
})

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
					// 查找特定命名的模型部分
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

					console.log('=== 模型结构分析 ===')
					console.log('建筑物模型:', cityBuildings)
					console.log('地面模型:', landMass)
					console.log('道路模型:', roads)

					// 设置建筑物材质
					if (cityBuildings && (cityBuildings as any).material) {
						const material = (cityBuildings as any).material
						material.transparent = true
						material.opacity = buildingState.opacity
						material.color.setHex(buildingState.buildingsColor.replace('#', '0x'))
						console.log('建筑物材质已设置')
					}

					// 设置地面材质
					if (landMass) {
						const landMaterial = (landMass as any).material
						const materials = Array.isArray(landMaterial) ? landMaterial : [landMaterial]
						materials.forEach((material: any) => {
							if (material) {
								material.color.setHex(buildingState.landColor.replace('#', '0x'))
								material.side = 2 // THREE.DoubleSide 双面渲染
								console.log('地面材质已设置')
							}
						})
					}

					// 设置道路材质（如果需要）
					if (roads && (roads as any).material) {
						const roadMaterial = (roads as any).material
						roadMaterial.color.setHex(buildingState.landColor.replace('#', '0x'))
						console.log('道路材质已设置')
					}

					// 保存模型部分的引用以便后续更新
					modelParts.cityBuildings = cityBuildings
					modelParts.landMass = landMass
					modelParts.roads = roads
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
			default: true
		},
		heightRatio: {
			type: Number,
			default: 6
		}
	},
	setup(props: any) {
		let heatmap: any = null
		let heatmapCanvas: any = null
		let texture: Texture | null = null
		let material: any = null

		// 清理函数
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
			// 如果已经存在 canvas，先清理
			if (heatmapCanvas && heatmapCanvas.parentNode) {
				heatmapCanvas.parentNode.removeChild(heatmapCanvas)
			}

			heatmapCanvas = document.createElement("div")
			heatmapCanvas.style.width = '100px'
			heatmapCanvas.style.height = '100px'
			heatmapCanvas.style.position = 'absolute'
			heatmapCanvas.style.top = '20px'
			heatmapCanvas.style.left = '20px'
			heatmapCanvas.style.zIndex = '1000'
			heatmapCanvas.style.border = '2px solid white'
			heatmapCanvas.style.borderRadius = '8px'
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
				while (i < 2000) {
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

		// 创建纹理和材质
		const createTextureAndMaterial = () => {
			const heatmapInstance = initHeatmap()
			if (!heatmapInstance) return null

			// 清理之前的纹理
			if (texture) {
				texture.dispose()
			}

			texture = new Texture(heatmapInstance._renderer.canvas)
			setData() // 设置初始数据

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
						gl_FragColor = vec4(cl, .8 - v * v*1.1); 
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

		// 初始化
		const shaderMaterial = createTextureAndMaterial()

		// 监听属性变化
		watchEffect(() => {
			if (heatmapCanvas && heatmapCanvas.style) {
				heatmapCanvas.style.display = `${props.show2dCanvas ? 'block' : 'none'}`
			}
			if (shaderMaterial && shaderMaterial.uniforms && shaderMaterial.uniforms.heightRatio) {
				shaderMaterial.uniforms.heightRatio.value = props.heightRatio
			}
		})

		// 组件卸载时清理资源
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
	autoRotate: false,
	enableDamping: true
})

// 辅助工具显示状态
const showAxesHelper = ref(true)
const showGridHelper = ref(true)

// 建筑物状态控制
const buildingState = reactive({
	opacity: 0.9,
	show: true,
	buildingsColor: '#e523ff', // 使用与原插件相同的默认颜色
	landColor: '#112233'
})

// 热力图状态
const heatmapState = reactive({
	show: true, // 默认开启
	show2dCanvas: true,
	heightRatio: 20, // 调整为与原插件相同的默认值
	position: [0, 20, 0], // 调整位置与原插件相同
	Plane: [1000, 1000, 1000, 1000] // 保持平面尺寸
})

// 固定视角设置
const fixedViewState = reactive({
	enabled: true,
	positionX: -410,
	positionY: 1450,
	positionZ: 59,
	targetX: 0,
	targetY: 0,
	targetZ: 0
})

// 切换热力图显示
const toggleHeatmap = () => {
	heatmapState.show = !heatmapState.show
	console.log('热力图状态:', heatmapState.show ? '开启' : '关闭')

	// 内存使用监控
	if ('memory' in performance) {
		const memory = (performance as any).memory
		console.log('内存使用情况:', {
			usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
			totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
			jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
		})
	}
}

// 跳转到仿真可视化页面
const goToSimulation = () => {
	try {
		router.push('/simulation')
	} catch (error) {
		console.error('路由跳转失败:', error)
		// 降级方案：使用 window.location
		window.location.href = '/simulation'
	}
}

const goToSimulationTest = () => {
	try {
		router.push('/simulation-test')
	} catch (error) {
		console.error('路由跳转失败:', error)
		// 降级方案：使用 window.location
		window.location.href = '/simulation-test'
	}
}

const goToDebug = () => {
	try {
		router.push('/debug')
	} catch (error) {
		console.error('路由跳转失败:', error)
		// 降级方案：使用 window.location
		window.location.href = '/debug'
	}
}

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
		title: '建筑物',
	})
	f1.addBinding(buildingState, 'show', { label: '显示' })
	f1.addBinding(buildingState, 'opacity', {
		label: '透明度',
		min: 0,
		max: 1,
		step: 0.1,
	})
	f1.addBinding(buildingState, 'buildingsColor', {
		label: '楼宇颜色',
		view: 'color',
	})
	f1.addBinding(buildingState, 'landColor', {
		label: '地面颜色',
		view: 'color',
	})

	// 场景控制文件夹
	const f2 = paneControl.addFolder({
		title: '场景控制',
	})
	f2.addBinding(controlsState, 'autoRotate', { label: '自动旋转' })
	f2.addBinding(showAxesHelper, 'value', { label: '显示坐标轴' })
	f2.addBinding(showGridHelper, 'value', { label: '显示网格' })

	// 视角控制文件夹
	const f3 = paneControl.addFolder({
		title: '视角控制',
	})
	f3.addBinding(fixedViewState, 'enabled', { label: '启用固定视角' })

	// 相机位置控制
	const positionFolder = f3.addFolder({
		title: '相机位置',
	})
	positionFolder.addBinding(fixedViewState, 'positionX', {
		label: 'X',
		min: -2000,
		max: 2000,
		step: 10,
	})
	positionFolder.addBinding(fixedViewState, 'positionY', {
		label: 'Y',
		min: 0,
		max: 2000,
		step: 10,
	})
	positionFolder.addBinding(fixedViewState, 'positionZ', {
		label: 'Z',
		min: -2000,
		max: 2000,
		step: 10,
	})

	// 观察目标控制
	const targetFolder = f3.addFolder({
		title: '观察目标',
	})
	targetFolder.addBinding(fixedViewState, 'targetX', {
		label: 'X',
		min: -1000,
		max: 1000,
		step: 10,
	})
	targetFolder.addBinding(fixedViewState, 'targetY', {
		label: 'Y',
		min: -1000,
		max: 1000,
		step: 10,
	})
	targetFolder.addBinding(fixedViewState, 'targetZ', {
		label: 'Z',
		min: -1000,
		max: 1000,
		step: 10,
	})

	// 热力图控制文件夹
	const f4 = paneControl.addFolder({
		title: '热力图控制',
	})
	f4.addBinding(heatmapState, 'show', { label: '显示热力图' })
	f4.addBinding(heatmapState, 'show2dCanvas', { label: '显示二维图' })
	f4.addBinding(heatmapState, 'heightRatio', {
		label: '高度',
		min: 10,
		max: 100,
		step: 10,
	})

	// 内存监控文件夹
	const f5 = paneControl.addFolder({
		title: '内存监控',
	})

	// 添加内存使用显示
	if ('memory' in performance) {
		const memoryInfo = reactive({
			usedJSHeapSize: '0 MB',
			totalJSHeapSize: '0 MB',
			jsHeapSizeLimit: '0 MB'
		})

		f5.addBinding(memoryInfo, 'usedJSHeapSize', { label: '已用内存', readonly: true })
		f5.addBinding(memoryInfo, 'totalJSHeapSize', { label: '总内存', readonly: true })
		f5.addBinding(memoryInfo, 'jsHeapSizeLimit', { label: '内存限制', readonly: true })

		// 定期更新内存信息
		setInterval(() => {
			const memory = (performance as any).memory
			memoryInfo.usedJSHeapSize = Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB'
			memoryInfo.totalJSHeapSize = Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB'
			memoryInfo.jsHeapSizeLimit = Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
		}, 2000)

		// 添加清理内存按钮
		f5.addButton({
			title: '清理内存',
			label: '强制垃圾回收',
		}).on('click', () => {
			if ('gc' in window) {
				(window as any).gc()
				console.log('已执行垃圾回收')
			} else {
				console.log('浏览器不支持手动垃圾回收')
			}
		})
	}

	// 监听透明度和颜色变化
	watchEffect(() => {
		// 更新建筑物材质
		if (modelParts.cityBuildings && (modelParts.cityBuildings as any).material) {
			const material = (modelParts.cityBuildings as any).material
			material.opacity = buildingState.opacity
			material.color.setHex(buildingState.buildingsColor.replace('#', '0x'))
		}

		// 更新地面材质
		if (modelParts.landMass) {
			const landMaterial = (modelParts.landMass as any).material
			const materials = Array.isArray(landMaterial) ? landMaterial : [landMaterial]
			materials.forEach((material: any) => {
				if (material) {
					material.color.setHex(buildingState.landColor.replace('#', '0x'))
				}
			})
		}

		// 更新道路材质
		if (modelParts.roads && (modelParts.roads as any).material) {
			const roadMaterial = (modelParts.roads as any).material
			roadMaterial.color.setHex(buildingState.landColor.replace('#', '0x'))
		}
	})

	// 监听调试参数变化时的重新应用逻辑已移除，因为现在使用名称匹配
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

.simulation-btn {
	background: linear-gradient(45deg, #00d4ff, #0099cc) !important;
	color: #ffffff !important;
	border: 1px solid #00d4ff !important;
	font-weight: 500;
}

.simulation-btn:hover {
	background: linear-gradient(45deg, #00b8e6, #007ba8) !important;
	box-shadow: 0 4px 15px rgba(0, 212, 255, 0.4);
	transform: translateY(-3px);
}

.test-btn {
	background: linear-gradient(45deg, #ff9800, #f57c00) !important;
	color: #ffffff !important;
	border: 1px solid #ff9800 !important;
	font-weight: 500;
}

.test-btn:hover {
	background: linear-gradient(45deg, #ff8f00, #e65100) !important;
	box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);
	transform: translateY(-3px);
}

.debug-btn {
	background: linear-gradient(45deg, #9c27b0, #673ab7) !important;
	color: #ffffff !important;
	border: 1px solid #9c27b0 !important;
	font-weight: 500;
}

.debug-btn:hover {
	background: linear-gradient(45deg, #8e24aa, #5e35b1) !important;
	box-shadow: 0 4px 15px rgba(156, 39, 176, 0.4);
	transform: translateY(-3px);
}

.memory-warning {
	color: #ff6b6b;
	font-size: 0.8rem;
	margin-top: 0.5rem;
	text-align: center;
	background: rgba(255, 107, 107, 0.1);
	padding: 0.3rem 0.5rem;
	border-radius: 3px;
	border: 1px solid rgba(255, 107, 107, 0.3);
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
}
</style>