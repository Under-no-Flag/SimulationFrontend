<template>
  <div class="heatmap-player">
    <div class="player-header">
      <h4>热力图播放控制</h4>
      <div class="player-status">
        <span class="status-indicator" :class="{ active: isPlaying }">
          {{ isPlaying ? '播放中' : '已暂停' }}
        </span>
      </div>
    </div>

    <!-- 播放控制按钮 -->
    <div class="control-buttons">
      <button class="control-btn" @click="previousFrame" :disabled="currentTime === 0">
        <span class="btn-icon">⏮️</span>
        上一帧
      </button>
      
      <button class="control-btn play-btn" @click="togglePlay">
        <span class="btn-icon">{{ isPlaying ? '⏸️' : '▶️' }}</span>
        {{ isPlaying ? '暂停' : '播放' }}
      </button>
      
      <button class="control-btn" @click="nextFrame" :disabled="currentTime >= totalFrames - 1">
        <span class="btn-icon">⏭️</span>
        下一帧
      </button>
      
      <button class="control-btn stop-btn" @click="stop">
        <span class="btn-icon">⏹️</span>
        停止
      </button>
    </div>

    <!-- 进度条 -->
    <div class="progress-section">
      <div class="progress-info">
        <span class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(totalFrames) }}</span>
        <span class="progress-percentage">{{ Math.round(progress) }}%</span>
      </div>
      
      <div class="progress-bar-container">
        <input
          type="range"
          v-model="currentTime"
          :min="0"
          :max="totalFrames - 1"
          class="progress-slider"
          @input="onSliderChange"
          @change="onSliderChange"
        />
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>

    <!-- 播放速度控制 -->
    <div class="speed-control">
      <label class="speed-label">播放速度</label>
      <div class="speed-buttons">
        <button 
          class="speed-btn" 
          :class="{ active: playbackSpeed === 0.5 }"
          @click="setSpeed(0.5)"
        >
          0.5x
        </button>
        <button 
          class="speed-btn" 
          :class="{ active: playbackSpeed === 1.0 }"
          @click="setSpeed(1.0)"
        >
          1x
        </button>
        <button 
          class="speed-btn" 
          :class="{ active: playbackSpeed === 2.0 }"
          @click="setSpeed(2.0)"
        >
          2x
        </button>
        <button 
          class="speed-btn" 
          :class="{ active: playbackSpeed === 3.0 }"
          @click="setSpeed(3.0)"
        >
          3x
        </button>
      </div>
    </div>

    <!-- 循环播放设置 -->
    <div class="loop-control">
      <label class="checkbox-item">
        <input type="checkbox" v-model="loopEnabled" />
        循环播放
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { heatmapDataManager } from '@/models/heatmapData.js'

// Emits
const emit = defineEmits(['data-update'])

// 响应式状态
const currentTime = ref(0)
const totalFrames = ref(0)
const isPlaying = ref(false)
const playbackSpeed = ref(1.0)
const loopEnabled = ref(true)

// 计算属性
const progress = computed(() => {
  if (totalFrames.value <= 1) return 0
  return (currentTime.value / (totalFrames.value - 1)) * 100
})

// 格式化时间显示
const formatTime = (time) => {
  const minutes = Math.floor(time / 60)
  const seconds = time % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// 播放控制方法
const togglePlay = () => {
  if (isPlaying.value) {
    heatmapDataManager.pause()
  } else {
    heatmapDataManager.play()
  }
}

const stop = () => {
  heatmapDataManager.stop()
}

const previousFrame = () => {
  heatmapDataManager.previousFrame()
}

const nextFrame = () => {
  heatmapDataManager.nextFrame()
}

const setSpeed = (speed) => {
  heatmapDataManager.setPlaybackSpeed(speed)
}

// 进度条控制
const onSliderChange = () => {
  heatmapDataManager.setTimeIndex(currentTime.value)
}

// 更新播放状态
const updatePlaybackInfo = () => {
  const info = heatmapDataManager.getPlaybackInfo()
  currentTime.value = info.currentTime
  totalFrames.value = info.totalFrames
  isPlaying.value = info.isPlaying
  playbackSpeed.value = info.playbackSpeed
}

// 监听数据管理器状态变化
const handleTimeChange = (timeIndex, total) => {
  currentTime.value = timeIndex
  totalFrames.value = total
}

const handleDataUpdate = (data) => {
  // 触发数据更新事件
  emit('data-update', data)
}

// 生命周期
onMounted(() => {
  // 初始化数据管理器
  heatmapDataManager.generateMockData(120, 60) // 120帧，每帧60个点
  
  // 设置回调函数
  heatmapDataManager.onTimeChange = handleTimeChange
  heatmapDataManager.onDataUpdate = handleDataUpdate
  
  // 初始化状态
  updatePlaybackInfo()
  
  // 设置循环播放
  heatmapDataManager.loopEnabled = loopEnabled.value
})

onUnmounted(() => {
  heatmapDataManager.dispose()
})

// 监听循环播放设置
watch(loopEnabled, (newValue) => {
  heatmapDataManager.loopEnabled = newValue
})

// 暴露方法给父组件
defineExpose({
  play: () => heatmapDataManager.play(),
  pause: () => heatmapDataManager.pause(),
  stop: () => heatmapDataManager.stop(),
  setTimeIndex: (index) => heatmapDataManager.setTimeIndex(index),
  getCurrentData: () => heatmapDataManager.getCurrentData(),
  getPlaybackInfo: () => heatmapDataManager.getPlaybackInfo()
})
</script>

<style scoped>
.heatmap-player {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.player-header h4 {
  margin: 0;
  color: #00d4ff;
  font-size: 1.1rem;
}

.status-indicator {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.1);
  color: #888;
}

.status-indicator.active {
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
}

.control-buttons {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  justify-content: center;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  min-width: 80px;
  justify-content: center;
}

.control-btn:hover:not(:disabled) {
  background: rgba(0, 212, 255, 0.2);
  transform: translateY(-1px);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-btn {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  min-width: 100px;
}

.stop-btn {
  background: rgba(255, 107, 107, 0.1);
  border-color: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}

.stop-btn:hover:not(:disabled) {
  background: rgba(255, 107, 107, 0.2);
}

.btn-icon {
  font-size: 1rem;
}

.progress-section {
  margin-bottom: 1rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.time-display {
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: bold;
}

.progress-percentage {
  color: #00d4ff;
  font-size: 0.8rem;
  font-weight: bold;
}

.progress-bar-container {
  position: relative;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-slider {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #00d4ff, #0099cc);
  border-radius: 4px;
  transition: width 0.1s ease;
  z-index: 1;
}

.speed-control {
  margin-bottom: 1rem;
}

.speed-label {
  display: block;
  color: #00d4ff;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.speed-buttons {
  display: flex;
  gap: 0.25rem;
}

.speed-btn {
  flex: 1;
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
  text-align: center;
}

.speed-btn:hover {
  background: rgba(0, 212, 255, 0.2);
}

.speed-btn.active {
  background: #00d4ff;
  color: #0c1426;
}

.loop-control {
  display: flex;
  align-items: center;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  color: #ffffff;
  font-size: 0.9rem;
}

.checkbox-item input[type="checkbox"] {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(0, 212, 255, 0.5);
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  position: relative;
}

.checkbox-item input[type="checkbox"]:checked {
  background: #00d4ff;
  border-color: #00d4ff;
}

.checkbox-item input[type="checkbox"]:checked::after {
  content: '✓';
  position: absolute;
  top: -2px;
  left: 2px;
  color: #0c1426;
  font-size: 12px;
  font-weight: bold;
}
</style> 