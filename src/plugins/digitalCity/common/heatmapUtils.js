/*
 * @Description: 统一的热力图坐标转换工具函数
 * @Version: 2.0
 * @Date: 2025-08-08
 * @Note: 基于统一的XZ→UV映射，解决坐标空间不一致问题
 */

import { BufferAttribute } from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Matrix4 } from 'three'

/**
 * 统一的 XZ → UV 转换（基于校准边界 & 变换后包围盒）
 * @param {number} x - X坐标
 * @param {number} z - Z坐标  
 * @param {Object} bounds - 边界框 {minX, maxX, minZ, maxZ}
 * @returns {{u: number, v: number}} UV坐标
 */
export const xzToUV = (x, z, bounds) => {
  const u = (x - bounds.minX) / (bounds.maxX - bounds.minX)
  const v = 1 - (z - bounds.minZ) / (bounds.maxZ - bounds.minZ) // Y翻转
  return { 
    u: Math.max(0, Math.min(1, u)), 
    v: Math.max(0, Math.min(1, v)) 
  }
}

/**
 * 经纬度 → UV 转换
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @param {Function} latLonToModelCoords - 经纬度转模型坐标的函数
 * @param {Object} modelBounds - 模型边界框
 * @returns {{u: number, v: number}} UV坐标
 */
export const latLonToUV = (lat, lon, latLonToModelCoords, modelBounds) => {
  const { x, z } = latLonToModelCoords(lat, lon)
  return xzToUV(x, z, modelBounds)
}

/**
 * 创建统一UV坐标的热力图几何体（不使用resetUV）
 * @param {Object} cityFBX - 城市模型对象，包含city和land
 * @param {Object} transformedBounds - 变换后的边界框 {minX, maxX, minZ, maxZ}
 * @returns {Object} 处理后的几何体和边界框
 */
export const createUnifiedHeatmapGeometry = (cityFBX) => {
  if (!cityFBX || !cityFBX.city || !cityFBX.land) {
    throw new Error('城市模型数据不完整')
  }
  
  try {
    console.log('=== 创建统一UV坐标的热力图几何体 ===')
    
    // 按照buildingsHeatmap.vue的流程处理几何体
    const CITY_UNTRIANGULATED = cityFBX.city.clone()
    delete CITY_UNTRIANGULATED.geometry.attributes.normal
    delete CITY_UNTRIANGULATED.geometry.attributes.uv
    const geometry1 = CITY_UNTRIANGULATED.geometry.clone().applyMatrix4(CITY_UNTRIANGULATED.matrix)
    
    const LANDMASS = cityFBX.land.clone()
    delete LANDMASS.geometry.attributes.normal
    const geometry2 = LANDMASS.geometry.clone().applyMatrix4(LANDMASS.matrix)
    
    // 合并几何体
    const bufferGeometries = BufferGeometryUtils.mergeGeometries([geometry1, geometry2])
    
    // 应用X轴90度旋转（与几何体完全相同的变换）
    const worldMat = new Matrix4().makeRotationX(Math.PI / 2)
    bufferGeometries.applyMatrix4(worldMat)
    
    // 计算变换后的边界框（与几何体使用同一坐标系、同一变换）
    bufferGeometries.computeBoundingBox()
    const bb = bufferGeometries.boundingBox // Box3
    const transformedBounds = {
      minX: bb.min.x, maxX: bb.max.x,
      minZ: bb.min.z, maxZ: bb.max.z  // 切记：用Z轴范围，不能混进Y轴
    }
    
    console.log('计算得到的变换后边界框:', transformedBounds)
    
    // 使用统一的UV生成（基于变换后的边界框）
    generateUnifiedUV(bufferGeometries, transformedBounds)
    
    // 清理临时几何体
    geometry1.dispose()
    geometry2.dispose()
    
    return {
      geometry: bufferGeometries,
      bounds: bufferGeometries.boundingBox,
      transformedBounds: transformedBounds  // 返回计算得到的变换后边界框
    }
  } catch (error) {
    console.error('创建统一热力图几何体失败:', error)
    throw error
  }
}

/**
 * 生成统一的UV坐标（基于变换后包围盒，不使用resetUV）
 * @param {Object} geometry - 几何体对象
 * @param {Object} transformedBounds - 变换后的边界框 {minX, maxX, minZ, maxZ}
 */
const generateUnifiedUV = (geometry, transformedBounds) => {
  console.log('=== 生成统一UV坐标（基于XZ→UV映射） ===')
  
  // 删除现有的UV属性
  geometry.deleteAttribute('uv')
  
  const uvArray = []
  const positionAttribute = geometry.attributes.position
  
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i)
    const z = positionAttribute.getZ(i) // 注意：使用XZ坐标
    
    // 使用统一的XZ→UV转换
    const { u, v } = xzToUV(x, z, transformedBounds)
    
    uvArray[i * 2] = u
    uvArray[i * 2 + 1] = v
  }
  
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvArray), 2))
  console.log('统一UV坐标生成完成，顶点数量:', positionAttribute.count)
}

/**
 * 统一的模型坐标转热力图像素坐标（基于XZ→UV映射）
 * @param {number} modelX - 模型X坐标
 * @param {number} modelZ - 模型Z坐标
 * @param {Object} modelBounds - 模型边界框 {minX, maxX, minZ, maxZ}
 * @param {number} canvasWidth - 热力图画布宽度
 * @param {number} canvasHeight - 热力图画布高度
 * @returns {{x: number, y: number}} 热力图像素坐标
 */
export const modelCoordsToHeatmapCoords = (modelX, modelZ, modelBounds, canvasWidth = 250, canvasHeight = 250) => {
  // 用于第一段：生成 2D 画布像素点
  const { u, v } = xzToUV(modelX, modelZ, modelBounds)
  const x = u * canvasWidth
  const y = v * canvasHeight
  
  return {
    x: Math.floor(Math.max(0, Math.min(canvasWidth - 1, x))),
    y: Math.floor(Math.max(0, Math.min(canvasHeight - 1, y)))
  }
}

/**
 * 经纬度直接转热力图像素坐标
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @param {Function} latLonToModelCoords - 经纬度转模型坐标的函数
 * @param {Object} modelBounds - 模型边界框
 * @param {number} canvasWidth - 画布宽度
 * @param {number} canvasHeight - 画布高度
 * @returns {{x: number, y: number}} 热力图像素坐标
 */
export const latLonToHeatmapCoords = (lat, lon, latLonToModelCoords, modelBounds, canvasWidth = 250, canvasHeight = 250) => {
  const { u, v } = latLonToUV(lat, lon, latLonToModelCoords, modelBounds)
  const x = u * canvasWidth
  const y = v * canvasHeight
  
  return {
    x: Math.floor(Math.max(0, Math.min(canvasWidth - 1, x))),
    y: Math.floor(Math.max(0, Math.min(canvasHeight - 1, y)))
  }
}

/**
 * 清理几何体资源
 * @param {Object} geometryInfo - 几何体信息对象
 */
export const disposeHeatmapGeometry = (geometryInfo) => {
  if (geometryInfo && geometryInfo.geometry) {
    try {
      geometryInfo.geometry.dispose()
    } catch (error) {
      console.error('清理几何体失败:', error)
    }
  }
}

// 向后兼容的导出（保持原有接口）
export const createHeatmapGeometry = createUnifiedHeatmapGeometry
