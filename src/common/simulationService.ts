/**
 * @Description: 仿真数据处理服务
 * @Version: 1.0
 * @Author: 仿真系统开发
 * @Date: 2024-12-19
 */

export interface SimulationEvent {
  id: string
  name: string
  type: 'crowd_simulation' | 'evacuation' | 'traffic_flow' | 'behavior_analysis'
  status: 'pending' | 'running' | 'completed' | 'failed'
  date: string
  participants: number
  duration: number
  data?: SimulationData
}

export interface SimulationData {
  participants: Array<{
    id: string
    position: [number, number, number]
    velocity: [number, number, number]
    timestamp: number
    metadata?: any
  }>
  heatmapData: Array<{
    x: number
    y: number
    value: number
    timestamp: number
  }>
  densityData: Array<{
    area: string
    density: number
    timestamp: number
  }>
  trajectories: Array<{
    participantId: string
    points: Array<[number, number, number]>
    timestamps: number[]
  }>
  statistics: {
    totalParticipants: number
    maxDensity: number
    avgVelocity: number
    completionRate: number
  }
}

export interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    borderColor?: string
    backgroundColor?: string
    tension?: number
  }>
}

export interface PieChartData {
  labels: string[]
  datasets: Array<{
    data: number[]
    backgroundColor: string[]
  }>
}

class SimulationService {
  private static instance: SimulationService
  private eventListeners: Map<string, Function[]> = new Map()

  static getInstance(): SimulationService {
    if (!SimulationService.instance) {
      SimulationService.instance = new SimulationService()
    }
    return SimulationService.instance
  }

  private constructor() {}

  /**
   * 获取所有仿真事件
   */
  async getSimulationEvents(): Promise<SimulationEvent[]> {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 'event_001',
            name: '地铁站高峰期',
            type: 'crowd_simulation',
            status: 'completed',
            date: '2024-12-19',
            participants: 500,
            duration: 120,
            data: this.generateMockSimulationData(500)
          },
          {
            id: 'event_002',
            name: '商场疏散演练',
            type: 'evacuation',
            status: 'completed',
            date: '2024-12-18',
            participants: 800,
            duration: 180,
            data: this.generateMockSimulationData(800)
          },
          {
            id: 'event_003',
            name: '体育场散场',
            type: 'behavior_analysis',
            status: 'running',
            date: '2024-12-17',
            participants: 2000,
            duration: 90
          }
        ])
      }, 500)
    })
  }

  /**
   * 根据ID获取仿真事件数据
   */
  async getSimulationData(eventId: string): Promise<SimulationData | null> {
    const events = await this.getSimulationEvents()
    const event = events.find(e => e.id === eventId)
    return event?.data || null
  }

  /**
   * 生成模拟的仿真数据
   */
  private generateMockSimulationData(participantCount: number): SimulationData {
    const participants: SimulationData['participants'] = []
    const heatmapData: SimulationData['heatmapData'] = []
    const densityData: SimulationData['densityData'] = []
    const trajectories: SimulationData['trajectories'] = []

    // 生成参与者数据
    for (let i = 0; i < participantCount; i++) {
      participants.push({
        id: `participant_${i}`,
        position: [
          (Math.random() - 0.5) * 1000,
          20,
          (Math.random() - 0.5) * 1000
        ] as [number, number, number],
        velocity: [
          (Math.random() - 0.5) * 10,
          0,
          (Math.random() - 0.5) * 10
        ] as [number, number, number],
        timestamp: Date.now(),
        metadata: {
          age: Math.floor(Math.random() * 60) + 18,
          group: Math.floor(Math.random() * 5)
        }
      })

      // 生成轨迹数据
      if (i < 50) { // 只生成前50个参与者的轨迹
        const points: Array<[number, number, number]> = []
        const timestamps: number[] = []
        const startX = (Math.random() - 0.5) * 1000
        const startZ = (Math.random() - 0.5) * 1000
        const endX = (Math.random() - 0.5) * 1000
        const endZ = (Math.random() - 0.5) * 1000

        for (let j = 0; j <= 100; j++) {
          const t = j / 100
          points.push([
            startX + (endX - startX) * t + (Math.random() - 0.5) * 50,
            20 + Math.sin(t * Math.PI * 2) * 5,
            startZ + (endZ - startZ) * t + (Math.random() - 0.5) * 50
          ])
          timestamps.push(Date.now() + j * 1000)
        }

        trajectories.push({
          participantId: `participant_${i}`,
          points,
          timestamps
        })
      }
    }

    // 生成热力图数据
    for (let i = 0; i < 500; i++) {
      heatmapData.push({
        x: Math.floor(Math.random() * 256),
        y: Math.floor(Math.random() * 256),
        value: Math.random() * 10,
        timestamp: Date.now()
      })
    }

    // 生成密度数据
    const areas = ['入口区域', '中央大厅', '商铺区', '休息区', '出口区域']
    areas.forEach(area => {
      densityData.push({
        area,
        density: Math.random() * 100,
        timestamp: Date.now()
      })
    })

    return {
      participants,
      heatmapData,
      densityData,
      trajectories,
      statistics: {
        totalParticipants: participantCount,
        maxDensity: Math.max(...densityData.map(d => d.density)),
        avgVelocity: 2.5,
        completionRate: 0.95
      }
    }
  }

  /**
   * 将仿真数据转换为图表数据格式
   */
  convertToChartData(data: SimulationData, type: 'density' | 'velocity' | 'participants'): ChartData {
    switch (type) {
      case 'density':
        return {
          labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
          datasets: [{
            label: '人群密度',
            data: Array.from({ length: 11 }, () => Math.floor(Math.random() * 100) + 20),
            borderColor: '#00d4ff',
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
            tension: 0.4
          }]
        }

      case 'velocity':
        return {
          labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
          datasets: [{
            label: '平均速度 (m/s)',
            data: Array.from({ length: 11 }, () => Math.random() * 3 + 1),
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4
          }]
        }

      case 'participants':
        return {
          labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
          datasets: [{
            label: '参与人数',
            data: Array.from({ length: 11 }, () => Math.floor(Math.random() * 200) + 300),
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            tension: 0.4
          }]
        }

      default:
        return { labels: [], datasets: [] }
    }
  }

  /**
   * 将密度数据转换为饼图数据格式
   */
  convertToPieChartData(data: SimulationData): PieChartData {
    const areaData = data.densityData.reduce((acc, item) => {
      acc[item.area] = (acc[item.area] || 0) + item.density
      return acc
    }, {} as Record<string, number>)

    const labels = Object.keys(areaData)
    const values = Object.values(areaData)
    const colors = [
      '#ff6b6b',
      '#4ecdc4',
      '#45b7d1',
      '#96ceb4',
      '#ffeaa7',
      '#dda0dd',
      '#98d8c8'
    ]

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length)
      }]
    }
  }

  /**
   * 实时更新仿真数据
   */
  startRealTimeUpdate(eventId: string, callback: (data: SimulationData) => void): void {
    const interval = setInterval(async () => {
      const data = await this.getSimulationData(eventId)
      if (data) {
        // 模拟数据更新
        data.participants.forEach(participant => {
          participant.position[0] += (Math.random() - 0.5) * 2
          participant.position[2] += (Math.random() - 0.5) * 2
          participant.timestamp = Date.now()
        })
        callback(data)
      }
    }, 1000)

    // 存储定时器ID以便后续清理
    this.eventListeners.set(eventId, [() => clearInterval(interval)])
  }

  /**
   * 停止实时更新
   */
  stopRealTimeUpdate(eventId: string): void {
    const listeners = this.eventListeners.get(eventId)
    if (listeners) {
      listeners.forEach(cleanup => cleanup())
      this.eventListeners.delete(eventId)
    }
  }

  /**
   * 导出仿真数据
   */
  async exportData(eventId: string, format: 'json' | 'csv' | 'xlsx'): Promise<Blob> {
    const data = await this.getSimulationData(eventId)
    if (!data) {
      throw new Error('数据不存在')
    }

    switch (format) {
      case 'json':
        return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      
      case 'csv':
        const csvContent = this.convertToCSV(data)
        return new Blob([csvContent], { type: 'text/csv' })
      
      case 'xlsx':
        // 这里需要集成 xlsx 库，目前返回 JSON 格式
        return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      
      default:
        throw new Error('不支持的格式')
    }
  }

  /**
   * 将数据转换为CSV格式
   */
  private convertToCSV(data: SimulationData): string {
    const headers = ['participant_id', 'x', 'y', 'z', 'velocity_x', 'velocity_y', 'velocity_z', 'timestamp']
    const rows = data.participants.map(p => [
      p.id,
      p.position[0],
      p.position[1],
      p.position[2],
      p.velocity[0],
      p.velocity[1],
      p.velocity[2],
      p.timestamp
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  /**
   * 计算统计指标
   */
  calculateStatistics(data: SimulationData): Record<string, number> {
    const totalParticipants = data.participants.length
    const avgVelocity = data.participants.reduce((sum, p) => {
      const velocity = Math.sqrt(p.velocity[0] ** 2 + p.velocity[1] ** 2 + p.velocity[2] ** 2)
      return sum + velocity
    }, 0) / totalParticipants

    const maxDensity = Math.max(...data.densityData.map(d => d.density))
    const avgDensity = data.densityData.reduce((sum, d) => sum + d.density, 0) / data.densityData.length

    return {
      totalParticipants,
      avgVelocity: Math.round(avgVelocity * 100) / 100,
      maxDensity: Math.round(maxDensity * 100) / 100,
      avgDensity: Math.round(avgDensity * 100) / 100,
      trajectoryCount: data.trajectories.length,
      heatmapPoints: data.heatmapData.length
    }
  }
}

// 导出服务实例
export const simulationService = SimulationService.getInstance()

// 导出数据处理工具函数
export const simulationUtils = {
  /**
   * 格式化时间戳
   */
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString('zh-CN')
  },

  /**
   * 计算两点间距离
   */
  calculateDistance(
    point1: [number, number, number],
    point2: [number, number, number]
  ): number {
    const dx = point1[0] - point2[0]
    const dy = point1[1] - point2[1]
    const dz = point1[2] - point2[2]
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  },

  /**
   * 平滑轨迹数据
   */
  smoothTrajectory(
    points: Array<[number, number, number]>,
    factor: number = 0.1
  ): Array<[number, number, number]> {
    if (points.length < 3) return points

    const smoothed: Array<[number, number, number]> = [points[0]]

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const next = points[i + 1]

      const smoothedPoint: [number, number, number] = [
        curr[0] + factor * (prev[0] + next[0] - 2 * curr[0]),
        curr[1] + factor * (prev[1] + next[1] - 2 * curr[1]),
        curr[2] + factor * (prev[2] + next[2] - 2 * curr[2])
      ]

      smoothed.push(smoothedPoint)
    }

    smoothed.push(points[points.length - 1])
    return smoothed
  },

  /**
   * 生成颜色渐变
   */
  generateColorGradient(
    startColor: string,
    endColor: string,
    steps: number
  ): string[] {
    const colors: string[] = []
    const start = this.hexToRgb(startColor)
    const end = this.hexToRgb(endColor)

    if (!start || !end) return [startColor]

    for (let i = 0; i < steps; i++) {
      const ratio = i / (steps - 1)
      const r = Math.round(start.r + ratio * (end.r - start.r))
      const g = Math.round(start.g + ratio * (end.g - start.g))
      const b = Math.round(start.b + ratio * (end.b - start.b))
      colors.push(`rgb(${r}, ${g}, ${b})`)
    }

    return colors
  },

  /**
   * 将十六进制颜色转换为RGB
   */
  hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }
}
