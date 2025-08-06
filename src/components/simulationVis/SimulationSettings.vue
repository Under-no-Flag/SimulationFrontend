<!--
 * @Description: 仿真系统设置组件
 * @Version: 1.0
 * @Author: 仿真系统开发
 * @Date: 2024-12-19
-->
<template>
  <div class="simulation-settings">
    <div class="settings-header">
      <h3>系统设置</h3>
      <div class="header-actions">
        <button @click="resetToDefaults" class="action-btn reset-btn">
          <span class="btn-icon">🔄</span>
          恢复默认
        </button>
        <button @click="saveSettings" class="action-btn save-btn">
          <span class="btn-icon">💾</span>
          保存设置
        </button>
      </div>
    </div>

    <div class="settings-content">
      <!-- 渲染设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4>🎨 渲染设置</h4>
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">图形质量</label>
            <select v-model="settings.rendering.quality" class="setting-select">
              <option value="low">低质量</option>
              <option value="medium">中等质量</option>
              <option value="high">高质量</option>
              <option value="ultra">超高质量</option>
            </select>
          </div>
          
          <div class="setting-item">
            <label class="setting-label">抗锯齿</label>
            <input 
              v-model="settings.rendering.antialiasing" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">阴影</label>
            <input 
              v-model="settings.rendering.shadows" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">后期处理</label>
            <input 
              v-model="settings.rendering.postProcessing" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">帧率限制</label>
            <select v-model="settings.rendering.fpsLimit" class="setting-select">
              <option value="30">30 FPS</option>
              <option value="60">60 FPS</option>
              <option value="120">120 FPS</option>
              <option value="unlimited">无限制</option>
            </select>
          </div>
          
          <div class="setting-item">
            <label class="setting-label">视场角</label>
            <input 
              v-model.number="settings.rendering.fov" 
              type="range" 
              min="30" 
              max="120" 
              class="setting-slider"
            />
            <span class="setting-value">{{ settings.rendering.fov }}°</span>
          </div>
        </div>
      </div>

      <!-- 仿真设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4>⚙️ 仿真设置</h4>
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">默认参与人数</label>
            <input 
              v-model.number="settings.simulation.defaultParticipants" 
              type="number" 
              min="1" 
              max="10000"
              class="setting-input"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">时间步长 (ms)</label>
            <input 
              v-model.number="settings.simulation.timeStep" 
              type="number" 
              min="1" 
              max="1000"
              class="setting-input"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">自动保存间隔 (分钟)</label>
            <input 
              v-model.number="settings.simulation.autoSaveInterval" 
              type="number" 
              min="1" 
              max="60"
              class="setting-input"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">最大历史记录</label>
            <input 
              v-model.number="settings.simulation.maxHistorySize" 
              type="number" 
              min="10" 
              max="1000"
              class="setting-input"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">碰撞检测</label>
            <input 
              v-model="settings.simulation.collisionDetection" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">物理引擎</label>
            <select v-model="settings.simulation.physicsEngine" class="setting-select">
              <option value="basic">基础物理</option>
              <option value="cannon">Cannon.js</option>
              <option value="ammo">Ammo.js</option>
              <option value="rapier">Rapier</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 可视化设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4>📊 可视化设置</h4>
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">热力图分辨率</label>
            <select v-model="settings.visualization.heatmapResolution" class="setting-select">
              <option value="64">64x64</option>
              <option value="128">128x128</option>
              <option value="256">256x256</option>
              <option value="512">512x512</option>
            </select>
          </div>
          
          <div class="setting-item">
            <label class="setting-label">轨迹点数量</label>
            <input 
              v-model.number="settings.visualization.trajectoryPoints" 
              type="number" 
              min="10" 
              max="1000"
              class="setting-input"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">密度可视化</label>
            <input 
              v-model="settings.visualization.densityVisualization" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">流场可视化</label>
            <input 
              v-model="settings.visualization.flowFieldVisualization" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">图表更新间隔 (ms)</label>
            <input 
              v-model.number="settings.visualization.chartUpdateInterval" 
              type="number" 
              min="100" 
              max="5000"
              class="setting-input"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">颜色主题</label>
            <select v-model="settings.visualization.colorTheme" class="setting-select">
              <option value="tech">科技蓝</option>
              <option value="heat">热力红</option>
              <option value="forest">森林绿</option>
              <option value="sunset">日落橙</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 性能设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4>🚀 性能设置</h4>
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">内存限制 (MB)</label>
            <input 
              v-model.number="settings.performance.memoryLimit" 
              type="number" 
              min="512" 
              max="8192"
              class="setting-input"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">GPU加速</label>
            <input 
              v-model="settings.performance.gpuAcceleration" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">多线程处理</label>
            <input 
              v-model="settings.performance.multiThreading" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">LOD优化</label>
            <input 
              v-model="settings.performance.lodOptimization" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">垃圾回收间隔 (s)</label>
            <input 
              v-model.number="settings.performance.gcInterval" 
              type="number" 
              min="1" 
              max="300"
              class="setting-input"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">缓存大小 (MB)</label>
            <input 
              v-model.number="settings.performance.cacheSize" 
              type="number" 
              min="10" 
              max="1024"
              class="setting-input"
            />
          </div>
        </div>
      </div>

      <!-- 网络设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4>🌐 网络设置</h4>
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">服务器地址</label>
            <input 
              v-model="settings.network.serverUrl" 
              type="text" 
              placeholder="http://localhost:3000"
              class="setting-input"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">连接超时 (s)</label>
            <input 
              v-model.number="settings.network.timeout" 
              type="number" 
              min="5" 
              max="120"
              class="setting-input"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">重试次数</label>
            <input 
              v-model.number="settings.network.retryCount" 
              type="number" 
              min="0" 
              max="10"
              class="setting-input"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">启用WebSocket</label>
            <input 
              v-model="settings.network.enableWebSocket" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">数据压缩</label>
            <input 
              v-model="settings.network.compression" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">离线模式</label>
            <input 
              v-model="settings.network.offlineMode" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
        </div>
      </div>

      <!-- 调试设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h4>🐛 调试设置</h4>
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">启用调试模式</label>
            <input 
              v-model="settings.debug.enabled" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">显示FPS计数器</label>
            <input 
              v-model="settings.debug.showFPS" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">显示内存使用</label>
            <input 
              v-model="settings.debug.showMemory" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">日志级别</label>
            <select v-model="settings.debug.logLevel" class="setting-select">
              <option value="error">错误</option>
              <option value="warn">警告</option>
              <option value="info">信息</option>
              <option value="debug">调试</option>
            </select>
          </div>
          
          <div class="setting-item">
            <label class="setting-label">性能监控</label>
            <input 
              v-model="settings.debug.performanceMonitoring" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
          
          <div class="setting-item">
            <label class="setting-label">错误上报</label>
            <input 
              v-model="settings.debug.errorReporting" 
              type="checkbox" 
              class="setting-checkbox"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 保存成功提示 -->
    <div v-if="showSaveSuccess" class="save-success">
      ✅ 设置已保存
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'

interface Settings {
  rendering: {
    quality: string
    antialiasing: boolean
    shadows: boolean
    postProcessing: boolean
    fpsLimit: string
    fov: number
  }
  simulation: {
    defaultParticipants: number
    timeStep: number
    autoSaveInterval: number
    maxHistorySize: number
    collisionDetection: boolean
    physicsEngine: string
  }
  visualization: {
    heatmapResolution: string
    trajectoryPoints: number
    densityVisualization: boolean
    flowFieldVisualization: boolean
    chartUpdateInterval: number
    colorTheme: string
  }
  performance: {
    memoryLimit: number
    gpuAcceleration: boolean
    multiThreading: boolean
    lodOptimization: boolean
    gcInterval: number
    cacheSize: number
  }
  network: {
    serverUrl: string
    timeout: number
    retryCount: number
    enableWebSocket: boolean
    compression: boolean
    offlineMode: boolean
  }
  debug: {
    enabled: boolean
    showFPS: boolean
    showMemory: boolean
    logLevel: string
    performanceMonitoring: boolean
    errorReporting: boolean
  }
}

const emit = defineEmits<{
  'settings-changed': [settings: Settings]
}>()

const showSaveSuccess = ref(false)

// 默认设置
const defaultSettings: Settings = {
  rendering: {
    quality: 'high',
    antialiasing: true,
    shadows: true,
    postProcessing: true,
    fpsLimit: '60',
    fov: 75
  },
  simulation: {
    defaultParticipants: 500,
    timeStep: 16,
    autoSaveInterval: 5,
    maxHistorySize: 100,
    collisionDetection: true,
    physicsEngine: 'cannon'
  },
  visualization: {
    heatmapResolution: '256',
    trajectoryPoints: 100,
    densityVisualization: true,
    flowFieldVisualization: false,
    chartUpdateInterval: 1000,
    colorTheme: 'tech'
  },
  performance: {
    memoryLimit: 2048,
    gpuAcceleration: true,
    multiThreading: true,
    lodOptimization: true,
    gcInterval: 30,
    cacheSize: 128
  },
  network: {
    serverUrl: 'http://localhost:3000',
    timeout: 30,
    retryCount: 3,
    enableWebSocket: true,
    compression: true,
    offlineMode: false
  },
  debug: {
    enabled: false,
    showFPS: false,
    showMemory: false,
    logLevel: 'warn',
    performanceMonitoring: false,
    errorReporting: true
  }
}

// 当前设置
const settings = reactive<Settings>(JSON.parse(JSON.stringify(defaultSettings)))

// 方法
const loadSettings = () => {
  const saved = localStorage.getItem('simulation-settings')
  if (saved) {
    try {
      const parsedSettings = JSON.parse(saved)
      Object.assign(settings, parsedSettings)
      console.log('已加载保存的设置')
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }
}

const saveSettings = () => {
  try {
    localStorage.setItem('simulation-settings', JSON.stringify(settings))
    emit('settings-changed', settings)
    
    // 显示保存成功提示
    showSaveSuccess.value = true
    setTimeout(() => {
      showSaveSuccess.value = false
    }, 2000)
    
    console.log('设置已保存')
  } catch (error) {
    console.error('保存设置失败:', error)
  }
}

const resetToDefaults = () => {
  if (confirm('确定要恢复所有设置到默认值吗？')) {
    Object.assign(settings, JSON.parse(JSON.stringify(defaultSettings)))
    console.log('设置已恢复默认值')
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.simulation-settings {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.settings-header h3 {
  margin: 0;
  color: #00d4ff;
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.action-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  transform: translateY(-2px);
}

.save-btn {
  background: linear-gradient(45deg, #00d4ff, #0099cc);
  color: #ffffff;
}

.reset-btn {
  background: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.5);
  color: #ff6b6b;
}

.reset-btn:hover {
  background: rgba(255, 107, 107, 0.3);
}

.btn-icon {
  font-size: 1rem;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  overflow: hidden;
}

.section-header {
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
}

.section-header h4 {
  margin: 0;
  color: #00d4ff;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  font-weight: 500;
}

.setting-input, .setting-select {
  background: rgba(0, 0, 0, 0.5);
  color: #ffffff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
}

.setting-input:focus, .setting-select:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

.setting-checkbox {
  width: 20px;
  height: 20px;
  accent-color: #00d4ff;
  cursor: pointer;
}

.setting-slider {
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  cursor: pointer;
}

.setting-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #00d4ff;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.setting-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #00d4ff;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.setting-value {
  color: #00d4ff;
  font-size: 0.8rem;
  font-weight: bold;
  text-align: right;
  margin-top: 0.25rem;
}

.save-success {
  position: fixed;
  top: 100px;
  right: 20px;
  background: rgba(76, 175, 80, 0.9);
  color: #ffffff;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  border: 1px solid #4caf50;
  font-size: 0.9rem;
  font-weight: 500;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .simulation-settings {
    padding: 1rem;
  }
  
  .settings-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }
  
  .section-header {
    padding: 1rem;
  }
  
  .save-success {
    position: fixed;
    top: auto;
    bottom: 20px;
    right: 20px;
    left: 20px;
    text-align: center;
  }
}
</style>
