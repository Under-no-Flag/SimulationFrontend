<!--
 * @Description: 
 * @Version: 1.668
 * @Autor: 地虎降天龙
 * @Date: 2023-11-09 09:33:51
 * @LastEditors: 地虎降天龙
 * @LastEditTime: 2023-12-13 19:57:41
-->
<script setup lang="ts">
import { initHeatmap, setData, getData } from 'PLS/heatMap/common/utils'
import { resetUV } from '../../common/utils'
import { watchEffect, onUnmounted } from 'vue'
import * as THREE from 'three'
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'

const initMeshBvh = () => {
	THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
	THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
	THREE.Mesh.prototype.raycast = acceleratedRaycast;
}
initMeshBvh()

const props = withDefaults(defineProps<{
	model: any,
	opacity?: Number,
	heatmapData?: { max: number, min: number, data: { x: number, y: number, value: number }[] }
}>(), {
	opacity: 1.0,
	heatmapData: undefined
})

const heatmap = initHeatmap()
// 移除 setData(heatmap)
const heatmapTexture = new THREE.Texture(heatmap._renderer.canvas)
heatmapTexture.needsUpdate = true

const creatShaderMaterial = (texture: THREE.Texture) => {
	return new THREE.ShaderMaterial({
		vertexShader: `
		varying vec2 vUv;
		void main() {
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			vUv = uv;
		}
		`,
		fragmentShader: `
		uniform sampler2D heightMap;
		uniform float uOpacity;
		varying vec2 vUv;
		void main() {
			gl_FragColor = vec4(texture2D(heightMap, vUv.xy).rgb, uOpacity);
    }
		`,
		uniforms: {
			uOpacity: {
				value: props.opacity
			},
			heightMap: {
				type: 't',
				value: texture
			},
		},
		depthWrite: true,
		depthTest: true,
		transparent: true,			//如果材质透明，那么楼宇就被渲染到后面了
		side: THREE.DoubleSide,//双面渲染
	})
}
const CITY_UNTRIANGULATED = props.model.city.clone()
delete CITY_UNTRIANGULATED.geometry.attributes.normal
delete CITY_UNTRIANGULATED.geometry.attributes.uv
const geometry1 = CITY_UNTRIANGULATED.geometry.clone().applyMatrix4(CITY_UNTRIANGULATED.matrix)
const LANDMASS = props.model.land.clone()
delete LANDMASS.geometry.attributes.normal
const geometry2 = LANDMASS.geometry.clone().applyMatrix4(LANDMASS.matrix)
//合并
const bufferGeometries = BufferGeometryUtils.mergeGeometries([geometry1, geometry2])
bufferGeometries.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2))
resetUV(bufferGeometries)
bufferGeometries.computeBoundsTree()
const material = creatShaderMaterial(heatmapTexture)
const meshObj = new THREE.Mesh(bufferGeometries, material)

// 创建道路对象
const roadObj = props.model.model.children[0].clone()

// 保存所有需要清理的对象引用
const objectsToDispose = [meshObj, roadObj]

// 监听 heatmapData 变化，动态渲染热力图
watchEffect(() => {
	if (props.heatmapData && Array.isArray(props.heatmapData.data)) {
		setData(heatmap, props.heatmapData.data)
		heatmapTexture.needsUpdate = true
	}
})

import { useDigitalCityStore } from 'PLS/digitalCity/stores/digitalCity'
const buildingsHeatmap = useDigitalCityStore()
const onPointerMove = (ev) => {
	if (ev) {
		// console.log(ev)
		// uv坐标转canvas坐标
		const valueUV = { x: ev.uv.x * heatmap._config.width, y: (1 - ev.uv.y) * heatmap._config.height }
		buildingsHeatmap.setTemperature(getData(heatmap, valueUV))
	}
}
const onPointerEnter = (ev) => {
	if (ev) {
		buildingsHeatmap.$patch({ showDiv: true })
	}
}
const onPointerLeave = (ev) => {
	if (ev) {
		buildingsHeatmap.setShowDiv(false)
	}
}

// 组件卸载时清理资源
onUnmounted(() => {
	try {
		// 清理几何体
		if (bufferGeometries) {
			bufferGeometries.dispose()
		}
		
		// 清理材质
		if (material) {
			material.dispose()
		}
		
		// 清理纹理
		if (heatmapTexture) {
			heatmapTexture.dispose()
		}
		
		// 清理所有对象
		objectsToDispose.forEach((obj, index) => {
			if (obj) {
				if (obj.geometry) {
					obj.geometry.dispose()
				}
				if (obj.material) {
					if (Array.isArray(obj.material)) {
						obj.material.forEach((mat: any) => mat.dispose())
					} else {
						obj.material.dispose()
					}
				}
			}
		})
		
		// 清理热力图实例
		if (heatmap && heatmap._renderer) {
			heatmap._renderer.canvas?.remove()
		}
		
		// 清理热力图对象
		if (meshObj) {
			if (meshObj.geometry) {
				meshObj.geometry.dispose()
			}
			if (meshObj.material) {
				meshObj.material.dispose()
			}
		}
		
		console.log('buildingsHeatmap 组件卸载完成')
	} catch (error) {
		console.error('清理 buildingsHeatmap 资源失败:', error)
	}
})

</script>

<template>
	<primitive :object="meshObj" :rotation-x="-Math.PI / 2" @pointer-move="onPointerMove" @pointer-enter="onPointerEnter"
		@pointer-leave="onPointerLeave" />
	<!-- 道路 -->
	<primitive :object="props.model.model.children[0].clone()" />
</template>