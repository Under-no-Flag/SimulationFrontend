# 热力图播放功能说明

## 功能概述

本功能实现了3D场景中热力图的动态播放和进度条控制，支持以下特性：

- ✅ 热力图时间序列数据管理
- ✅ 播放/暂停/停止控制
- ✅ 进度条拖动控制
- ✅ 播放速度调节（0.5x - 3x）
- ✅ 循环播放设置
- ✅ 实时热力图渲染
- ✅ 3D场景集成

## 文件结构

```
src/
├── models/
│   └── heatmapData.js          # 热力图数据管理器
├── components/
│   └── simulationVis/
│       ├── HeatmapPlayer.vue   # 热力图播放控制器
│       └── HeatmapRenderer.vue # 热力图渲染组件
├── pages/
│   ├── simulation.vue          # 主仿真页面（已集成）
│   └── test-heatmap.vue       # 测试页面
```

## 核心组件

### 1. HeatmapDataManager (src/models/heatmapData.js)

热力图数据管理器，负责：
- 时间序列数据管理
- 播放控制逻辑
- 数据更新回调

```javascript
// 使用示例
import { heatmapDataManager } from '@/models/heatmapData.js'

// 生成模拟数据
heatmapDataManager.generateMockData(120, 60) // 120帧，每帧60个点

// 播放控制
heatmapDataManager.play()
heatmapDataManager.pause()
heatmapDataManager.stop()

// 设置时间索引
heatmapDataManager.setTimeIndex(50)

// 设置播放速度
heatmapDataManager.setPlaybackSpeed(2.0)
```

### 2. HeatmapPlayer (src/components/simulationVis/HeatmapPlayer.vue)

热力图播放控制器组件，提供：
- 播放控制按钮
- 进度条
- 播放速度选择
- 循环播放设置

```vue
<template>
  <HeatmapPlayer 
    ref="heatmapPlayerRef"
    @data-update="onHeatmapDataUpdate"
  />
</template>

<script setup>
const onHeatmapDataUpdate = (data) => {
  // 处理热力图数据更新
  console.log('热力图数据更新:', data)
}
</script>
```

### 3. HeatmapRenderer (src/components/simulationVis/HeatmapRenderer.vue)

热力图渲染组件，负责：
- 热力图canvas渲染
- Three.js网格创建
- 实时数据更新

## 使用方法

### 1. 在主页面中集成

在 `src/pages/simulation.vue` 中已经集成了热力图播放功能：

1. 开启热力图显示（点击"热力图"按钮）
2. 在控制面板中会出现热力图播放控制器
3. 使用播放控制按钮和进度条控制播放

### 2. 测试页面

访问 `src/pages/test-heatmap.vue` 可以单独测试热力图功能：

```bash
# 启动开发服务器
npm run dev

# 访问测试页面
http://localhost:3000/test-heatmap
```

## 数据格式

热力图数据格式如下：

```javascript
{
  time: 0,           // 时间索引
  timestamp: 0,      // 时间戳（毫秒）
  points: [          // 热力图点数据
    {
      x: -10.5,      // X坐标（世界坐标）
      y: 8.2,        // Y坐标（世界坐标）
      value: 0.8,    // 密度值（0-1）
      intensity: 0.6 // 强度值（0-1）
    },
    // ... 更多点
  ]
}
```

## 坐标系统

- **世界坐标**: 3D场景中的坐标系统，范围通常为 [-25, 25]
- **画布坐标**: 热力图canvas的坐标系统，范围为 [0, 512]
- **坐标转换**: 自动将世界坐标转换为画布坐标进行热力图渲染

## 自定义配置

### 热力图样式配置

```javascript
const heatmapConfig = {
  maxOpacity: 0.8,    // 最大透明度
  minOpacity: 0.1,    // 最小透明度
  blur: 0.75,         // 模糊程度
  gradient: {          // 颜色渐变
    '0.0': '#313695',
    '0.5': '#ffffbf',
    '1.0': '#a50026'
  }
}
```

### 播放控制配置

```javascript
// 设置播放速度
heatmapDataManager.setPlaybackSpeed(2.0) // 2倍速

// 设置循环播放
heatmapDataManager.loopEnabled = true

// 设置数据更新回调
heatmapDataManager.onDataUpdate = (data) => {
  // 处理数据更新
}
```

## 性能优化

1. **内存管理**: 自动清理旧的Three.js网格和材质
2. **渲染优化**: 使用 `markRaw` 避免Vue响应式代理
3. **数据缓存**: 热力图数据按需生成和更新

## 扩展功能

### 1. 真实数据集成

替换模拟数据为真实仿真数据：

```javascript
// 从API获取仿真数据
const loadSimulationData = async (eventId) => {
  const response = await fetch(`/api/simulation/${eventId}`)
  const data = await response.json()
  
  // 转换数据格式
  const timeSeriesData = data.frames.map(frame => ({
    time: frame.time,
    timestamp: frame.timestamp,
    points: frame.people.map(person => ({
      x: person.x,
      y: person.y,
      value: person.density,
      intensity: person.intensity
    }))
  }))
  
  return timeSeriesData
}
```

### 2. 多热力图支持

支持同时显示多个热力图（如密度、速度、压力等）：

```javascript
// 创建多个热力图管理器
const densityManager = new HeatmapDataManager()
const speedManager = new HeatmapDataManager()
const pressureManager = new HeatmapDataManager()

// 分别加载不同类型的数据
densityManager.loadData(densityData)
speedManager.loadData(speedData)
pressureManager.loadData(pressureData)
```

### 3. 热力图叠加

支持热力图的叠加显示和混合模式：

```javascript
// 创建叠加热力图
const createOverlayHeatmap = (baseData, overlayData) => {
  // 合并两个热力图数据
  const combinedPoints = [...baseData.points, ...overlayData.points]
  
  return {
    time: baseData.time,
    timestamp: baseData.timestamp,
    points: combinedPoints
  }
}
```

## 故障排除

### 常见问题

1. **热力图不显示**
   - 检查 `heatmapEnabled` 是否为 `true`
   - 确认数据格式是否正确
   - 检查控制台是否有错误信息

2. **播放卡顿**
   - 降低播放速度
   - 减少每帧的点数
   - 检查浏览器性能

3. **内存泄漏**
   - 确保在组件卸载时调用 `dispose()`
   - 检查Three.js资源的清理

### 调试技巧

```javascript
// 启用调试模式
const DEBUG = true

if (DEBUG) {
  console.log('热力图数据:', data)
  console.log('播放状态:', heatmapDataManager.getPlaybackInfo())
}
```

## 更新日志

- **v1.0.0**: 基础热力图播放功能
- **v1.1.0**: 添加进度条和播放速度控制
- **v1.2.0**: 集成到主仿真页面
- **v1.3.0**: 添加测试页面和文档 