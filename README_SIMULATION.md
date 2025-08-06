# 人群仿真可视化系统 API 接口文档

## 项目概述

人群仿真可视化系统是一个基于 Three.js 和 Vue 3 的 3D 可视化平台，用于展示和分析人群仿真数据。系统支持多种仿真场景，包括人群仿真、疏散仿真、交通流仿真和行为分析。

## 技术栈

- **前端框架**: Vue 3 + TypeScript + Vite
- **3D引擎**: Three.js + TresJS
- **UI组件**: 自定义组件 (科技风格)
- **图表库**: 自研Canvas图表组件
- **数据处理**: 自研仿真数据服务
- **样式**: CSS3 + 响应式设计

## 目录结构

```
src/
├── pages/
│   ├── index.vue              # 原有首页 (上海建筑物展示)
│   └── simulation.vue         # 仿真可视化主页
├── components/
│   └── simulationVis/         # 仿真可视化组件
│       ├── SimulationModel.vue    # 3D模型组件
│       ├── LineChart.vue          # 折线图组件
│       ├── PieChart.vue           # 环形图组件
│       ├── SimulationTasks.vue    # 任务管理组件
│       └── SimulationSettings.vue # 设置组件
└── common/
    └── simulationService.ts   # 仿真数据服务
```

## 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | index.vue | 原有首页，上海建筑物3D展示 |
| `/simulation` | simulation.vue | 仿真可视化主页 |

## 核心功能模块

### 1. 仿真结果可视化页面

#### 1.1 三维场景组件 (SimulationModel.vue)

**功能特性:**
- 集成上海建筑物FBX模型
- 支持热力图3D渲染
- 实时人群轨迹可视化
- 密度点可视化
- 相机控制和视角重置

**主要API:**
```typescript
interface SimulationModelProps {
  heatmapEnabled: boolean    // 是否启用热力图
  simulationData: any        // 仿真数据
}

// 组件方法
resetView(): void           // 重置视角
playPause(): void          // 播放/暂停仿真
resetSimulation(): void    // 重置仿真
```

**事件:**
```typescript
// 模型加载完成
emit('model-loaded')
```

#### 1.2 数据可视化组件

##### LineChart.vue - 折线图组件
```typescript
interface LineChartProps {
  data: ChartData          // 图表数据
  height: number           // 图表高度
  title?: string           // 图表标题
}

interface ChartData {
  labels: string[]         // X轴标签
  datasets: Array<{
    label: string          // 数据集标签
    data: number[]         // 数据值
    borderColor: string    // 线条颜色
    backgroundColor?: string // 背景颜色
    tension?: number       // 平滑度
  }>
}

// 事件
emit('point-hover', { label, value, datasetIndex, pointIndex })
```

##### PieChart.vue - 环形图组件
```typescript
interface PieChartProps {
  data: PieChartData       // 图表数据
  height: number           // 图表高度
  title?: string           // 图表标题
  showPercentage?: boolean // 显示百分比
  innerRadius?: number     // 内圆半径比例
}

interface PieChartData {
  labels: string[]         // 标签
  datasets: Array<{
    data: number[]         // 数据值
    backgroundColor: string[] // 颜色数组
  }>
}

// 事件
emit('segment-click', { label, value, index })
```

### 2. 仿真模型任务管理 (SimulationTasks.vue)

**功能特性:**
- 任务创建、启动、暂停、删除
- 任务状态监控和进度显示
- 任务筛选和搜索
- 任务统计信息

**任务数据结构:**
```typescript
interface Task {
  id: string                   // 任务ID
  name: string                 // 任务名称
  type: 'crowd_simulation'     // 仿真类型
    | 'evacuation'
    | 'traffic_flow'
    | 'behavior_analysis'
  status: 'pending'            // 任务状态
    | 'running'
    | 'completed'
    | 'failed'
  progress: number             // 进度 (0-100)
  participants: number         // 参与人数
  estimatedDuration: number    // 预计时长 (分钟)
  createdAt: Date             // 创建时间
  description: string         // 描述
}
```

**主要方法:**
```typescript
// 任务操作
startTask(task: Task): void      // 开始任务
pauseTask(task: Task): void      // 暂停任务
deleteTask(task: Task): void     // 删除任务
viewResults(task: Task): void    // 查看结果

// 任务管理
createNewTask(): void            // 创建新任务
refreshTasks(): void             // 刷新任务列表
```

### 3. 系统设置 (SimulationSettings.vue)

**设置分类:**
- 渲染设置: 图形质量、抗锯齿、阴影等
- 仿真设置: 参与人数、时间步长、物理引擎等
- 可视化设置: 热力图分辨率、轨迹点数等
- 性能设置: 内存限制、GPU加速、多线程等
- 网络设置: 服务器地址、超时时间等
- 调试设置: 调试模式、日志级别、性能监控等

```typescript
interface Settings {
  rendering: RenderingSettings
  simulation: SimulationSettings
  visualization: VisualizationSettings
  performance: PerformanceSettings
  network: NetworkSettings
  debug: DebugSettings
}
```

## 数据服务 API (simulationService.ts)

### 核心服务类

```typescript
class SimulationService {
  // 获取仿真事件列表
  async getSimulationEvents(): Promise<SimulationEvent[]>

  // 获取仿真数据
  async getSimulationData(eventId: string): Promise<SimulationData | null>

  // 数据格式转换
  convertToChartData(data: SimulationData, type: string): ChartData
  convertToPieChartData(data: SimulationData): PieChartData

  // 实时更新
  startRealTimeUpdate(eventId: string, callback: Function): void
  stopRealTimeUpdate(eventId: string): void

  // 数据导出
  async exportData(eventId: string, format: 'json'|'csv'|'xlsx'): Promise<Blob>

  // 统计计算
  calculateStatistics(data: SimulationData): Record<string, number>
}
```

### 数据结构定义

```typescript
// 仿真事件
interface SimulationEvent {
  id: string                   // 事件ID
  name: string                 // 事件名称
  type: string                 // 事件类型
  status: string               // 状态
  date: string                 // 日期
  participants: number         // 参与人数
  duration: number             // 持续时间
  data?: SimulationData        // 仿真数据
}

// 仿真数据
interface SimulationData {
  participants: Array<{        // 参与者数据
    id: string
    position: [number, number, number]
    velocity: [number, number, number]
    timestamp: number
    metadata?: any
  }>
  heatmapData: Array<{         // 热力图数据
    x: number
    y: number
    value: number
    timestamp: number
  }>
  densityData: Array<{         // 密度数据
    area: string
    density: number
    timestamp: number
  }>
  trajectories: Array<{        // 轨迹数据
    participantId: string
    points: Array<[number, number, number]>
    timestamps: number[]
  }>
  statistics: {                // 统计信息
    totalParticipants: number
    maxDensity: number
    avgVelocity: number
    completionRate: number
  }
}
```

## 工具函数

```typescript
export const simulationUtils = {
  // 时间格式化
  formatTimestamp(timestamp: number): string

  // 距离计算
  calculateDistance(point1: [number, number, number], point2: [number, number, number]): number

  // 轨迹平滑
  smoothTrajectory(points: Array<[number, number, number]>, factor?: number): Array<[number, number, number]>

  // 颜色渐变生成
  generateColorGradient(startColor: string, endColor: string, steps: number): string[]

  // 颜色转换
  hexToRgb(hex: string): { r: number; g: number; b: number } | null
}
```

## 组件通信流程

### 1. 页面初始化流程
```
simulation.vue
  ↓ 加载仿真事件列表
simulationService.getSimulationEvents()
  ↓ 用户选择事件
loadSimulationEvent()
  ↓ 传递数据到3D组件
SimulationModel.vue 更新显示
  ↓ 同步更新图表
LineChart.vue + PieChart.vue 更新
```

### 2. 实时数据更新流程
```
用户选择事件
  ↓ 启动实时更新
simulationService.startRealTimeUpdate()
  ↓ 定时回调更新
callback(newData)
  ↓ 更新所有可视化组件
3D场景 + 图表 + 统计信息同步更新
```

### 3. 任务管理流程
```
SimulationTasks.vue
  ↓ 用户创建任务
submitNewTask()
  ↓ 启动任务
startTask()
  ↓ 模拟进度更新
progressInterval
  ↓ 任务完成
status = 'completed'
  ↓ 触发事件
emit('task-selected', task)
```

## 样式系统

### 设计风格
- **主色调**: 科技蓝 (#00d4ff)
- **背景**: 深色渐变 (#0c1426 → #1a1f35 → #2a2d47)
- **字体**: Microsoft YaHei, Arial
- **动画**: 3D变换、渐变过渡、发光效果

### 响应式断点
- **桌面**: > 1200px
- **平板**: 768px - 1200px
- **手机**: < 768px

### 组件样式特点
- 毛玻璃效果 (backdrop-filter: blur)
- 边框发光效果 (box-shadow + 颜色)
- 平滑过渡动画 (transition: all 0.3s ease)
- 悬停提升效果 (transform: translateY)

## 部署说明

### 开发环境启动
```bash
npm install
npm run dev
```

### 生产环境构建
```bash
npm run build
npm run preview
```

### 推荐的生产环境
- **Web服务器**: Nginx
- **Node.js**: v16+
- **内存**: 最低 2GB，推荐 4GB+
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+

## 性能优化建议

### 3D渲染优化
- 使用 LOD (Level of Detail) 技术
- 启用实例化渲染 (Instanced Rendering)
- 合理设置相机视距 (near/far)
- 动态加载模型资源

### 数据处理优化
- 实现数据分页加载
- 使用 Web Workers 处理大量数据
- 启用数据压缩传输
- 实现本地缓存机制

### 内存管理
- 定期清理未使用的纹理和几何体
- 合理设置垃圾回收间隔
- 监控内存使用情况
- 实现资源池管理

## 扩展接口

### 自定义可视化组件
```typescript
// 继承基础图表组件
interface CustomChartProps extends BaseChartProps {
  customOption?: any
}

// 实现自定义绘制方法
class CustomChart extends BaseChart {
  protected drawCustomElements(): void {
    // 自定义绘制逻辑
  }
}
```

### 插件系统接口
```typescript
interface SimulationPlugin {
  name: string
  version: string
  init(context: SimulationContext): void
  destroy(): void
  onDataUpdate?(data: SimulationData): void
}

// 插件注册
simulationService.registerPlugin(plugin: SimulationPlugin): void
simulationService.unregisterPlugin(pluginName: string): void
```

### 外部数据源接入
```typescript
interface DataSource {
  connect(config: ConnectionConfig): Promise<void>
  disconnect(): Promise<void>
  fetchData(query: DataQuery): Promise<SimulationData>
  subscribe(callback: DataCallback): Subscription
}

// 数据源注册
simulationService.registerDataSource(source: DataSource): void
```

## 常见问题

### Q: 如何添加新的仿真类型？
A: 在 `SimulationEvent` 接口的 `type` 字段中添加新类型，并在相关组件中添加对应的处理逻辑。

### Q: 如何自定义图表颜色主题？
A: 在 `SimulationSettings.vue` 中的 `colorTheme` 设置中添加新主题，并在图表组件中实现对应的颜色映射。

### Q: 如何优化大量数据的渲染性能？
A: 启用 LOD 优化、使用实例化渲染、实现数据分页加载，并在设置中调整性能相关参数。

### Q: 如何集成外部仿真引擎？
A: 实现 `DataSource` 接口，提供数据获取和实时订阅功能，然后通过 `simulationService.registerDataSource()` 注册。

## 更新日志

### v1.0.0 (2024-12-19)
- ✅ 基础3D场景集成
- ✅ 热力图可视化
- ✅ 自研图表组件
- ✅ 任务管理系统
- ✅ 系统设置界面
- ✅ 响应式设计
- ✅ TypeScript支持

### 计划功能
- 🔄 实时WebSocket数据连接
- 🔄 数据导出功能增强
- 🔄 插件系统实现
- 🔄 性能监控面板
- 🔄 多语言支持
