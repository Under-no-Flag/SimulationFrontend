# 人群仿真可视化系统 - 依赖库清单

## 核心依赖 (已在项目中包含)

### Vue 生态系统
- `vue`: Vue 3 框架
- `vue-router`: Vue 路由管理
- `@vueuse/core`: Vue 组合式工具库

### Three.js 生态系统
- `three`: Three.js 3D引擎
- `@tresjs/core`: TresJS Vue 3 组件
- `@tresjs/cientos`: TresJS 扩展组件库

### 构建工具
- `vite`: 现代前端构建工具
- `typescript`: TypeScript 支持
- `@vitejs/plugin-vue`: Vue 单文件组件支持

### UI/样式
- `tweakpane`: 调试控制面板
- 无需额外UI库，使用自研组件

## 新增依赖 (无需联网下载)

本系统已实现以下功能的**无依赖**版本:

### 📊 图表可视化
- **折线图组件** (`LineChart.vue`) - 纯Canvas实现
- **环形图组件** (`PieChart.vue`) - 纯Canvas实现
- 替代方案: Chart.js, ECharts, D3.js

### 🔥 热力图渲染
- **热力图组件** - 基于`heatmap.js-fix`(已包含)
- 3D热力图着色器 - 自研GLSL着色器

### 🎨 3D渲染增强
- **粒子系统** - 基于Three.js原生API
- **轨迹渲染** - 自研线条渲染
- **密度可视化** - 自研球体群渲染

### 💾 数据处理
- **仿真数据服务** - 纯TypeScript实现
- **数据导出** - 原生Blob API
- **实时更新** - 原生定时器

## 可选增强库 (如需高级功能)

### 数据处理增强
```bash
# Excel导出功能
npm install xlsx

# 数学计算增强
npm install ml-matrix

# 统计分析
npm install simple-statistics
```

### 3D渲染增强
```bash
# 物理引擎
npm install cannon-es

# 后期处理
npm install postprocessing

# 模型加载器增强
npm install three-stdlib
```

### 网络通信
```bash
# WebSocket连接
npm install ws
npm install @types/ws

# HTTP客户端
npm install axios

# 实时通信
npm install socket.io-client
```

### 性能监控
```bash
# 性能监控
npm install stats.js

# 内存泄漏检测
npm install @sentry/browser
```

### 测试工具
```bash
# 单元测试
npm install vitest
npm install @vue/test-utils

# E2E测试
npm install playwright
```

## 开发工具依赖

### 代码质量
```bash
# ESLint
npm install eslint
npm install @typescript-eslint/parser
npm install @typescript-eslint/eslint-plugin

# Prettier
npm install prettier
npm install eslint-config-prettier
```

### 类型定义
```bash
# Three.js类型定义
npm install @types/three

# Node.js类型定义
npm install @types/node
```

## 生产环境推荐

### Web服务器
- **Nginx** - 静态资源服务
- **Apache** - 替代选择

### CDN加速
- **阿里云CDN** - 国内访问
- **Cloudflare** - 国际访问

### 监控工具
- **Google Analytics** - 用户行为分析
- **Sentry** - 错误监控
- **Grafana** - 性能监控

## 浏览器兼容性

### 最低要求
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### WebGL要求
- 支持WebGL 2.0
- 支持GLSL ES 3.0
- 支持浮点纹理

### 推荐配置
- 内存: 4GB+
- 显卡: 支持Hardware Acceleration
- 网络: 10Mbps+ (用于模型加载)

## 部署清单

### 必需文件
```
dist/
├── index.html              # 主页面
├── assets/                 # 静态资源
│   ├── index-[hash].js    # 主要JavaScript
│   ├── index-[hash].css   # 主要样式
│   └── vendor-[hash].js   # 第三方库
├── plugins/               # 插件资源
│   └── digitalCity/
│       └── model/
│           └── shanghai.FBX  # 上海建筑模型
└── public/                # 公共资源
    ├── draco/             # Draco压缩库
    └── lib/               # 其他库文件
```

### 服务器配置
```nginx
# Nginx配置示例
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;

    # Gzip压缩
    gzip on;
    gzip_types text/css application/javascript application/json;

    # 缓存设置
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 支持History模式
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 性能优化建议

### 构建优化
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'vue': ['vue', 'vue-router'],
          'charts': ['./src/components/simulationVis/LineChart.vue']
        }
      }
    }
  }
})
```

### 资源优化
- 启用Draco几何压缩
- 使用WebP图片格式
- 启用HTTP/2推送
- 实现渐进式加载

### 运行时优化
- 启用Object Pooling
- 使用RequestIdleCallback
- 实现虚拟滚动
- 优化渲染帧率

## 故障排除

### 常见问题
1. **模型加载失败** - 检查FBX文件路径和权限
2. **热力图不显示** - 检查WebGL支持和着色器编译
3. **图表渲染异常** - 检查Canvas API支持
4. **内存泄漏** - 启用开发者工具内存监控

### 调试工具
- Chrome DevTools
- Three.js Inspector
- Vue DevTools
- WebGL Inspector

### 联系支持
- GitHub Issues: [项目地址]
- 邮箱: support@your-domain.com
- 文档: [在线文档地址]
