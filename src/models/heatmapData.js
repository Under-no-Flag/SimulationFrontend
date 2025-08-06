/**
 * 热力图数据模型
 * 管理时间序列热力图数据和播放控制
 */

export class HeatmapDataManager {
  constructor() {
    this.timeSeriesData = []
    this.currentTimeIndex = 0
    this.isPlaying = false
    this.playbackSpeed = 1.0 // 播放速度倍数
    this.totalFrames = 0
    this.frameInterval = null
    this.onDataUpdate = null
    this.onTimeChange = null
  }

  /**
   * 生成模拟热力图数据
   * @param {number} totalFrames - 总帧数
   * @param {number} pointsPerFrame - 每帧点数
   * @param {Object} bounds - 边界范围 {x: [min, max], y: [min, max]}
   */
  generateMockData(totalFrames = 100, pointsPerFrame = 50, bounds = { x: [-25, 25], y: [-25, 25] }) {
    this.timeSeriesData = []
    this.totalFrames = totalFrames

    for (let frame = 0; frame < totalFrames; frame++) {
      const frameData = {
        time: frame,
        timestamp: frame * 1000, // 毫秒时间戳
        points: []
      }

      // 生成每帧的热力图点
      for (let i = 0; i < pointsPerFrame; i++) {
        // 模拟人群移动模式
        const baseX = Math.sin(frame * 0.1 + i * 0.5) * 10
        const baseY = Math.cos(frame * 0.08 + i * 0.3) * 8
        
        frameData.points.push({
          x: baseX + (Math.random() - 0.5) * 10,
          y: baseY + (Math.random() - 0.5) * 8,
          value: Math.random() * 0.8 + 0.2, // 0.2-1.0 之间的密度值
          intensity: Math.random() * 0.6 + 0.4 // 0.4-1.0 之间的强度值
        })
      }

      this.timeSeriesData.push(frameData)
    }

    return this.timeSeriesData
  }

  /**
   * 获取指定时间点的热力图数据
   * @param {number} timeIndex - 时间索引
   * @returns {Object|null} 热力图数据
   */
  getDataAtTime(timeIndex) {
    if (timeIndex >= 0 && timeIndex < this.timeSeriesData.length) {
      return this.timeSeriesData[timeIndex]
    }
    return null
  }

  /**
   * 获取当前时间点的数据
   * @returns {Object|null} 当前热力图数据
   */
  getCurrentData() {
    return this.getDataAtTime(this.currentTimeIndex)
  }

  /**
   * 设置时间索引
   * @param {number} timeIndex - 时间索引
   */
  setTimeIndex(timeIndex) {
    const clampedIndex = Math.max(0, Math.min(timeIndex, this.totalFrames - 1))
    this.currentTimeIndex = clampedIndex
    
    if (this.onTimeChange) {
      this.onTimeChange(this.currentTimeIndex, this.totalFrames)
    }
    
    if (this.onDataUpdate) {
      this.onDataUpdate(this.getCurrentData())
    }
  }

  /**
   * 播放控制
   */
  play() {
    if (this.isPlaying) return
    
    this.isPlaying = true
    this.frameInterval = setInterval(() => {
      this.nextFrame()
    }, 1000 / this.playbackSpeed) // 每秒播放速度
  }

  pause() {
    this.isPlaying = false
    if (this.frameInterval) {
      clearInterval(this.frameInterval)
      this.frameInterval = null
    }
  }

  stop() {
    this.pause()
    this.setTimeIndex(0)
  }

  /**
   * 下一帧
   */
  nextFrame() {
    if (this.currentTimeIndex < this.totalFrames - 1) {
      this.setTimeIndex(this.currentTimeIndex + 1)
    } else {
      // 到达末尾，循环播放
      this.setTimeIndex(0)
    }
  }

  /**
   * 上一帧
   */
  previousFrame() {
    if (this.currentTimeIndex > 0) {
      this.setTimeIndex(this.currentTimeIndex - 1)
    }
  }

  /**
   * 设置播放速度
   * @param {number} speed - 播放速度倍数
   */
  setPlaybackSpeed(speed) {
    this.playbackSpeed = Math.max(0.1, Math.min(5.0, speed))
    
    if (this.isPlaying) {
      this.pause()
      this.play()
    }
  }

  /**
   * 获取播放状态信息
   * @returns {Object} 播放状态
   */
  getPlaybackInfo() {
    return {
      currentTime: this.currentTimeIndex,
      totalFrames: this.totalFrames,
      isPlaying: this.isPlaying,
      playbackSpeed: this.playbackSpeed,
      progress: this.totalFrames > 0 ? (this.currentTimeIndex / (this.totalFrames - 1)) * 100 : 0
    }
  }

  /**
   * 清理资源
   */
  dispose() {
    this.pause()
    this.timeSeriesData = []
    this.onDataUpdate = null
    this.onTimeChange = null
  }
}

// 导出单例实例
export const heatmapDataManager = new HeatmapDataManager() 