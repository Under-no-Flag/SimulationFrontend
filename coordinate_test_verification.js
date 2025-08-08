// 验证仿射变换逆运算的正确性

const coeffs = {
  a1: 0.000010058368001095164,
  b1: 0.000003897104413334851,
  c1: 31.239836286743987,
  a2: -0.00000447792356275678,
  b2: 0.000011466107186733354,
  c2: 121.48174634639462
}

// 测试点1: 模型坐标(-72.40, 812.98) 对应 经纬度(31.242242, 121.491427)
const testPoint = {
  modelX: -72.40295394451705,
  modelZ: 812.9764577390581,
  lat: 31.242242,
  lon: 121.491427
}

console.log('=== 验证仿射变换 ===')
console.log('测试点:', testPoint)

// 1. 正向变换：模型坐标 -> 经纬度
const forwardLat = coeffs.a1 * testPoint.modelX + coeffs.b1 * testPoint.modelZ + coeffs.c1
const forwardLon = coeffs.a2 * testPoint.modelX + coeffs.b2 * testPoint.modelZ + coeffs.c2

console.log('\n正向变换结果:')
console.log(`计算得到的经纬度: (${forwardLat.toFixed(6)}, ${forwardLon.toFixed(6)})`)
console.log(`实际经纬度: (${testPoint.lat}, ${testPoint.lon})`)
console.log(`误差: 纬度${Math.abs(forwardLat - testPoint.lat).toFixed(6)}, 经度${Math.abs(forwardLon - testPoint.lon).toFixed(6)}`)

// 2. 逆变换：经纬度 -> 模型坐标
const det = coeffs.a1 * coeffs.b2 - coeffs.a2 * coeffs.b1
console.log(`\n行列式: ${det}`)

const latDiff = testPoint.lat - coeffs.c1
const lonDiff = testPoint.lon - coeffs.c2

const reverseX = (latDiff * coeffs.b2 - lonDiff * coeffs.b1) / det
const reverseZ = (lonDiff * coeffs.a1 - latDiff * coeffs.a2) / det

console.log('\n逆变换结果:')
console.log(`计算得到的模型坐标: (${reverseX.toFixed(6)}, ${reverseZ.toFixed(6)})`)
console.log(`实际模型坐标: (${testPoint.modelX.toFixed(6)}, ${testPoint.modelZ.toFixed(6)})`)
console.log(`误差: X=${Math.abs(reverseX - testPoint.modelX).toFixed(6)}, Z=${Math.abs(reverseZ - testPoint.modelZ).toFixed(6)}`)

// 3. 测试用户提到的坐标 (31.2382, 121.486697)
console.log('\n=== 测试用户坐标 ===')
const userLat = 31.2382
const userLon = 121.486697

const userLatDiff = userLat - coeffs.c1
const userLonDiff = userLon - coeffs.c2

const userX = (userLatDiff * coeffs.b2 - userLonDiff * coeffs.b1) / det
const userZ = (userLonDiff * coeffs.a1 - userLatDiff * coeffs.a2) / det

console.log(`用户坐标 (${userLat}, ${userLon}) 转换为模型坐标:`)
console.log(`X: ${userX.toFixed(2)}, Z: ${userZ.toFixed(2)}`)

// 4. 计算热力图坐标
const modelBounds = {
  minX: -292.64232281821876,
  maxX: 106.19976971292328,
  minZ: 160.30996285669252,
  maxZ: 812.9764577390581
}

const xRatio = (userX - modelBounds.minX) / (modelBounds.maxX - modelBounds.minX)
const zRatio = (userZ - modelBounds.minZ) / (modelBounds.maxZ - modelBounds.minZ)

const heatmapX = Math.floor(xRatio * 250)
const heatmapY = Math.floor(250 - (zRatio * 250)) // Y轴翻转

console.log(`热力图坐标: (${heatmapX}, ${heatmapY})`)

// 5. 反向验证
const verifyLat = coeffs.a1 * userX + coeffs.b1 * userZ + coeffs.c1
const verifyLon = coeffs.a2 * userX + coeffs.b2 * userZ + coeffs.c2

console.log(`反向验证: (${verifyLat.toFixed(6)}, ${verifyLon.toFixed(6)})`)
console.log(`原始坐标: (${userLat}, ${userLon})`)

const latError = Math.abs(verifyLat - userLat) * 111000
const lonError = Math.abs(verifyLon - userLon) * 111000 * Math.cos(userLat * Math.PI / 180)
const totalError = Math.sqrt(latError * latError + lonError * lonError)

console.log(`转换误差: ${totalError.toFixed(2)}米`)
