# 上海建筑物展示功能

## 功能说明

这个功能实现了类似 `digitalCity/pages/buildings.vue` 的上海建筑物展示效果，可以展示 `shanghai.FBX` 模型。现在已集成到首页中，提供完整的导航和交互体验。

## 使用方法

### 1. 访问首页
访问根路径 `/` 即可看到集成后的首页。

### 2. 导航功能
- **首页内容**: 展示框架介绍和功能特性
- **上海建筑物展示**: 点击按钮进入3D展示模式
- **返回首页**: 从3D展示模式返回首页

### 3. 控制面板功能

在3D展示模式下，页面右上角会显示一个控制面板，包含以下功能：

#### 建筑物效果控制
- **显示建筑物**: 控制是否显示建筑物模型
- **楼宇颜色**: 调整建筑物的颜色
- **建筑物透明度**: 调整建筑物的透明度 (0-1)

#### 场景控制
- **自动旋转**: 控制场景是否自动旋转
- **显示坐标轴**: 显示/隐藏坐标轴辅助线
- **显示网格**: 显示/隐藏网格辅助线

### 4. 交互操作
- **鼠标左键拖拽**: 旋转视角
- **鼠标右键拖拽**: 平移视角
- **鼠标滚轮**: 缩放视角

## 技术实现

### 核心文件
- `src/pages/index.vue` - 主页面组件（集成上海建筑物展示）
- `src/pages/shanghai.vue` - 独立的上海建筑物展示页面
- `public/plugins/digitalCity/model/shanghai.FBX` - 上海城市模型文件

### 主要功能
1. **响应式导航**: 提供首页和3D展示模式的切换
2. **模型加载**: 使用 `useFBX` 加载 FBX 模型
3. **材质控制**: 动态调整模型材质颜色和透明度
4. **场景控制**: 提供完整的 3D 场景控制
5. **交互面板**: 使用 tweakpane 提供实时参数调整

### 依赖组件
- `@tresjs/core` - Three.js Vue 集成
- `@tresjs/cientos` - Three.js 组件库
- `tweakpane` - 参数控制面板

## 页面结构

### 首页布局
```
index-page
├── navbar (导航栏)
│   ├── logo (框架标题)
│   └── nav-links (导航按钮)
└── main-content (主要内容)
    ├── shanghai-container (3D展示容器)
    │   └── shanghai-page (上海建筑物展示)
    └── home-content (首页内容)
        ├── welcome-section (欢迎区域)
        ├── feature-cards (功能卡片)
        └── cta-button (行动按钮)
```

### 状态管理
- `showShanghai`: 控制是否显示3D展示
- `cityModel`: 存储加载的3D模型
- `buildingState`: 建筑物参数控制
- `controlsState`: 场景控制参数

## 自定义修改

### 修改模型路径
在 `loadCityModel` 函数中修改 `path` 变量：
```javascript
const path = './your-model-path.FBX'
```

### 修改默认参数
在 `buildingState` 中修改默认值：
```javascript
const buildingState = reactive({
  bulidingsColor: '#your-color',  // 默认颜色
  opacity: 0.9,                   // 默认透明度
  show: true                      // 默认显示状态
})
```

### 添加新控制项
在 `onMounted` 函数中添加新的控制项：
```javascript
f1.addBinding(yourState, 'yourProperty', {
  label: '你的控制项',
  min: 0,
  max: 1,
  step: 0.1
})
```

### 修改首页内容
在 `home-content` 区域修改首页展示内容：
```html
<div class="welcome-section">
  <h2>你的标题</h2>
  <p>你的描述</p>
  <!-- 添加更多内容 -->
</div>
```

## 注意事项

1. 确保 `shanghai.FBX` 模型文件存在于正确路径
2. 模型文件应该包含正确的材质和几何体
3. 如果模型加载失败，检查控制台错误信息
4. 建议在开发环境中测试功能后再部署
5. 页面采用响应式设计，支持移动端访问

## 扩展功能

可以基于此功能扩展：
- 添加更多3D展示页面
- 集成更多控制参数
- 添加场景切换动画
- 实现模型热更新
- 添加更多交互功能
- 集成数据可视化功能

## 访问方式

- **首页**: 访问 `/` 或 `/index`
- **独立页面**: 访问 `/shanghai` (如果路由配置正确)