// 重新计算仿射变换参数
const fs = require('fs');

// 读取原始校准数据
const originalData = JSON.parse(fs.readFileSync('fbx-coordinate-calibration-2025-08-08.json', 'utf8'));
const points = originalData.calibrationPoints;

console.log('=== 重新计算仿射变换参数 ===');
console.log(`使用 ${points.length} 个校准点`);

// 显示校准点数据
points.forEach((p, i) => {
  console.log(`点${i+1}: 模型(${p.modelX.toFixed(2)}, ${p.modelZ.toFixed(2)}) -> 经纬度(${p.lat}, ${p.lon})`);
});

// 矩阵运算工具函数
function multiplyMatrix(A, B) {
  const result = Array(A.length).fill(null).map(() => Array(B[0].length).fill(0));
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B[0].length; j++) {
      for (let k = 0; k < B.length; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

function transposeMatrix(matrix) {
  return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
}

function invertMatrix(matrix) {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
  
  // 高斯-约旦消元法
  for (let i = 0; i < n; i++) {
    // 找到主元
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    // 归一化主元行
    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-10) throw new Error('矩阵奇异，无法求逆');
    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= pivot;
    }
    
    // 消元
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }
  
  return augmented.map(row => row.slice(n));
}

// 仿射变换计算
function calculateAffineTransformation(points) {
  const n = points.length;
  
  // 构建系数矩阵 A = [x, z, 1]
  const A = points.map(p => [p.modelX, p.modelZ, 1]);
  
  // 目标向量
  const latVector = points.map(p => p.lat);
  const lonVector = points.map(p => p.lon);
  
  console.log('\n=== 矩阵计算 ===');
  console.log('系数矩阵 A (前3行):');
  A.slice(0, 3).forEach((row, i) => {
    console.log(`  [${row[0].toFixed(2)}, ${row[1].toFixed(2)}, ${row[2]}]`);
  });
  
  try {
    // 计算 (A^T * A)^(-1) * A^T （最小二乘法）
    const At = transposeMatrix(A);
    const AtA = multiplyMatrix(At, A);
    
    console.log('\nA^T * A:');
    AtA.forEach(row => {
      console.log(`  [${row.map(v => v.toFixed(8)).join(', ')}]`);
    });
    
    const AtA_inv = invertMatrix(AtA);
    const pseudoInverse = multiplyMatrix(AtA_inv, At);
    
    // 计算仿射变换系数
    const latCoeffs = multiplyMatrix(pseudoInverse, latVector.map(v => [v])).map(row => row[0]);
    const lonCoeffs = multiplyMatrix(pseudoInverse, lonVector.map(v => [v])).map(row => row[0]);
    
    const result = {
      // lat = a1 * x + b1 * z + c1
      a1: latCoeffs[0], b1: latCoeffs[1], c1: latCoeffs[2],
      // lon = a2 * x + b2 * z + c2  
      a2: lonCoeffs[0], b2: lonCoeffs[1], c2: lonCoeffs[2]
    };
    
    console.log('\n=== 仿射变换系数 ===');
    console.log(`a1 (X->纬度): ${result.a1.toFixed(12)}`);
    console.log(`b1 (Z->纬度): ${result.b1.toFixed(12)}`);
    console.log(`c1 (纬度常数): ${result.c1.toFixed(12)}`);
    console.log(`a2 (X->经度): ${result.a2.toFixed(12)}`);
    console.log(`b2 (Z->经度): ${result.b2.toFixed(12)}`);
    console.log(`c2 (经度常数): ${result.c2.toFixed(12)}`);
    
    // 验证系数的合理性
    const det = result.a1 * result.b2 - result.a2 * result.b1;
    console.log(`\n变换矩阵行列式: ${det.toFixed(15)}`);
    
    if (Math.abs(det) < 1e-15) {
      throw new Error('变换矩阵奇异，行列式接近零');
    }
    
    return result;
    
  } catch (error) {
    console.error('仿射变换计算失败:', error);
    throw error;
  }
}

// 验证转换精度
function validateTransformation(points, coeffs) {
  console.log('\n=== 精度验证 ===');
  
  let totalError = 0;
  let maxErr = 0;
  
  points.forEach((point, index) => {
    // 正向变换：模型坐标 -> 经纬度
    const predictedLat = coeffs.a1 * point.modelX + coeffs.b1 * point.modelZ + coeffs.c1;
    const predictedLon = coeffs.a2 * point.modelX + coeffs.b2 * point.modelZ + coeffs.c2;
    
    // 逆向变换：经纬度 -> 模型坐标
    const det = coeffs.a1 * coeffs.b2 - coeffs.a2 * coeffs.b1;
    const latDiff = point.lat - coeffs.c1;
    const lonDiff = point.lon - coeffs.c2;
    const reverseX = (latDiff * coeffs.b2 - lonDiff * coeffs.b1) / det;
    const reverseZ = (lonDiff * coeffs.a1 - latDiff * coeffs.a2) / det;
    
    // 计算地理距离误差
    const latError = Math.abs(predictedLat - point.lat) * 111000; // 1度纬度约111km
    const lonError = Math.abs(predictedLon - point.lon) * 111000 * Math.cos(point.lat * Math.PI / 180);
    const geoError = Math.sqrt(latError * latError + lonError * lonError);
    
    // 计算模型坐标误差
    const modelXError = Math.abs(reverseX - point.modelX);
    const modelZError = Math.abs(reverseZ - point.modelZ);
    const modelError = Math.sqrt(modelXError * modelXError + modelZError * modelZError);
    
    console.log(`\n校准点${index + 1} (${point.name}):`);
    console.log(`  实际经纬度: (${point.lat.toFixed(6)}, ${point.lon.toFixed(6)})`);
    console.log(`  预测经纬度: (${predictedLat.toFixed(6)}, ${predictedLon.toFixed(6)})`);
    console.log(`  地理误差: ${geoError.toFixed(2)}米`);
    console.log(`  实际模型坐标: (${point.modelX.toFixed(2)}, ${point.modelZ.toFixed(2)})`);
    console.log(`  逆向模型坐标: (${reverseX.toFixed(2)}, ${reverseZ.toFixed(2)})`);
    console.log(`  模型坐标误差: ${modelError.toFixed(2)}`);
    
    totalError += geoError;
    maxErr = Math.max(maxErr, geoError);
  });
  
  const averageError = totalError / points.length;
  console.log(`\n总体精度:`);
  console.log(`  平均误差: ${averageError.toFixed(2)}米`);
  console.log(`  最大误差: ${maxErr.toFixed(2)}米`);
  
  return { averageError, maxError: maxErr };
}

// 测试用户坐标
function testUserCoordinate(coeffs, modelBounds) {
  console.log('\n=== 测试用户坐标 ===');
  const userLat = 31.2382;
  const userLon = 121.486697;
  
  // 经纬度 -> 模型坐标
  const det = coeffs.a1 * coeffs.b2 - coeffs.a2 * coeffs.b1;
  const latDiff = userLat - coeffs.c1;
  const lonDiff = userLon - coeffs.c2;
  const userX = (latDiff * coeffs.b2 - lonDiff * coeffs.b1) / det;
  const userZ = (lonDiff * coeffs.a1 - latDiff * coeffs.a2) / det;
  
  console.log(`用户坐标 (${userLat}, ${userLon}) 转换结果:`);
  console.log(`  模型坐标: (${userX.toFixed(2)}, 0, ${userZ.toFixed(2)})`);
  
  // 计算热力图坐标
  const xRatio = (userX - modelBounds.minX) / (modelBounds.maxX - modelBounds.minX);
  const zRatio = (userZ - modelBounds.minZ) / (modelBounds.maxZ - modelBounds.minZ);
  
  const heatmapX = Math.floor(xRatio * 250);
  const heatmapY = Math.floor(250 - (zRatio * 250)); // Y轴翻转
  
  console.log(`  热力图坐标: (${heatmapX}, ${heatmapY})`);
  
  // 反向验证
  const verifyLat = coeffs.a1 * userX + coeffs.b1 * userZ + coeffs.c1;
  const verifyLon = coeffs.a2 * userX + coeffs.b2 * userZ + coeffs.c2;
  
  console.log(`  反向验证: (${verifyLat.toFixed(6)}, ${verifyLon.toFixed(6)})`);
  
  const latError = Math.abs(verifyLat - userLat) * 111000;
  const lonError = Math.abs(verifyLon - userLon) * 111000 * Math.cos(userLat * Math.PI / 180);
  const totalError = Math.sqrt(latError * latError + lonError * lonError);
  
  console.log(`  转换误差: ${totalError.toFixed(2)}米`);
  
  return { userX, userZ, heatmapX, heatmapY, verifyLat, verifyLon, totalError };
}

// 主计算流程
try {
  // 1. 计算仿射变换参数
  const affineCoeffs = calculateAffineTransformation(points);
  
  // 2. 验证精度
  const accuracy = validateTransformation(points, affineCoeffs);
  
  // 3. 计算边界
  const modelBounds = {
    minX: Math.min(...points.map(p => p.modelX)),
    maxX: Math.max(...points.map(p => p.modelX)),
    minY: Math.min(...points.map(p => p.modelY)),
    maxY: Math.max(...points.map(p => p.modelY)),
    minZ: Math.min(...points.map(p => p.modelZ)),
    maxZ: Math.max(...points.map(p => p.modelZ))
  };
  
  const geoBounds = {
    minLat: Math.min(...points.map(p => p.lat)),
    maxLat: Math.max(...points.map(p => p.lat)),
    minLon: Math.min(...points.map(p => p.lon)),
    maxLon: Math.max(...points.map(p => p.lon))
  };
  
  // 4. 测试用户坐标
  const userTest = testUserCoordinate(affineCoeffs, modelBounds);
  
  // 5. 生成正确的转换代码
  const transformationCode = `// 仿射变换坐标转换（基于${points.length}个校准点）
// 平均误差: ${accuracy.averageError.toFixed(2)}米

// 模型坐标转经纬度（仿射变换）
function modelCoordsToLatLon(x, z) {
  const lat = ${affineCoeffs.a1.toFixed(12)} * x + ${affineCoeffs.b1.toFixed(12)} * z + ${affineCoeffs.c1.toFixed(12)}
  const lon = ${affineCoeffs.a2.toFixed(12)} * x + ${affineCoeffs.b2.toFixed(12)} * z + ${affineCoeffs.c2.toFixed(12)}
  return { lat, lon }
}

// 经纬度转模型坐标（仿射变换逆运算）
function latLonToModelCoords(lat, lon) {
  // 解线性方程组：
  // lat = a1*x + b1*z + c1  =>  (lat - c1) = a1*x + b1*z
  // lon = a2*x + b2*z + c2  =>  (lon - c2) = a2*x + b2*z
  // 使用克拉默法则求解
  const det = ${affineCoeffs.a1.toFixed(12)} * ${affineCoeffs.b2.toFixed(12)} - ${affineCoeffs.a2.toFixed(12)} * ${affineCoeffs.b1.toFixed(12)}
  const latDiff = lat - ${affineCoeffs.c1.toFixed(12)}
  const lonDiff = lon - ${affineCoeffs.c2.toFixed(12)}
  const x = (latDiff * ${affineCoeffs.b2.toFixed(12)} - lonDiff * ${affineCoeffs.b1.toFixed(12)}) / det
  const z = (lonDiff * ${affineCoeffs.a1.toFixed(12)} - latDiff * ${affineCoeffs.a2.toFixed(12)}) / det
  return { x, y: 0, z }
}

// 仿射变换系数
const affineCoeffs = {
  a1: ${affineCoeffs.a1.toFixed(12)}, b1: ${affineCoeffs.b1.toFixed(12)}, c1: ${affineCoeffs.c1.toFixed(12)},
  a2: ${affineCoeffs.a2.toFixed(12)}, b2: ${affineCoeffs.b2.toFixed(12)}, c2: ${affineCoeffs.c2.toFixed(12)}
}`;
  
  // 6. 生成新的校准文件
  const newCalibrationData = {
    calibrationPoints: points,
    transformationMatrix: {
      modelBounds: modelBounds,
      geoBounds: geoBounds,
      affineCoeffs: affineCoeffs,
      pointCount: points.length,
      averageError: accuracy.averageError,
      maxError: accuracy.maxError,
      method: 'affine'
    },
    modelBounds: modelBounds,
    geoBounds: geoBounds,
    transformationCode: transformationCode,
    exportTime: new Date().toISOString(),
    version: '2.0',
    recalculated: true,
    userTestResult: userTest
  };
  
  // 7. 保存新文件
  const newFileName = `fbx-coordinate-calibration-corrected-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(newFileName, JSON.stringify(newCalibrationData, null, 2));
  
  console.log(`\n=== 完成 ===`);
  console.log(`新校准文件已保存: ${newFileName}`);
  console.log(`用户坐标 (31.2382, 121.486697) 的正确转换结果:`);
  console.log(`  模型坐标: (${userTest.userX.toFixed(2)}, 0, ${userTest.userZ.toFixed(2)})`);
  console.log(`  热力图坐标: (${userTest.heatmapX}, ${userTest.heatmapY})`);
  console.log(`  转换误差: ${userTest.totalError.toFixed(2)}米`);
  
} catch (error) {
  console.error('计算失败:', error);
}
