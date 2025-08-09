/*
 * @Description: 
 * @Version: 1.668
 * @Autor: 地虎降天龙
 * @Date: 2023-10-20 10:13:19
 * @LastEditors: 地虎降天龙
 * @LastEditTime: 2023-12-27 14:57:03
 */
import { useFBX } from '@tresjs/cientos'
import { markRaw } from 'vue'

export const loadCityFBX = async () => {
	try {
		const path = '/plugins/digitalCity/model/shanghai.FBX'
		const model = await useFBX(path)
		
		let CITY_UNTRIANGULATED = null
		let LANDMASS = null
		let roads = null
		
		model.traverse((child) => {
			if (child.name === 'CITY_UNTRIANGULATED') {
				CITY_UNTRIANGULATED = child
			}
			if (child.name === 'LANDMASS') {
				LANDMASS = child
			}
			if (child.name === 'ROADS') {
				roads = child
			}
		})
		return markRaw({
			model,
			city: CITY_UNTRIANGULATED,
			land: LANDMASS,
			roads
		})
	} catch (error) {
		console.error('FBX模型加载失败，尝试使用GLTF模型:', error)
		
		// 尝试加载GLTF模型作为备用
		try {
			const { useGLTF } = await import('@tresjs/cientos')
			const gltfPath = '/plugins/digitalCity/model/shanghaiDraco/shanghaiDraco.gltf'
			console.log('尝试加载GLTF模型:', gltfPath)
			
			const gltfModel = await useGLTF(gltfPath)
			console.log('GLTF模型加载成功')
			
			return markRaw({
				model: gltfModel,
				city: gltfModel,
				land: gltfModel,
				roads: null
			})
		} catch (gltfError) {
			console.error('GLTF模型也加载失败:', gltfError)
			throw new Error('所有模型加载都失败了')
		}
	}
}