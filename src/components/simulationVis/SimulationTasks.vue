<!--
 * @Description: 仿真模型任务管理组件
 * @Version: 1.0
 * @Author: 仿真系统开发
 * @Date: 2024-12-19
-->
<template>
  <div class="simulation-tasks">
    <div class="tasks-header">
      <h3>仿真模型任务管理</h3>
      <div class="header-actions">
        <button @click="refreshTasks" class="action-btn refresh-btn">
          <span class="btn-icon">🔄</span>
          刷新
        </button>
        <button @click="createNewTask" class="action-btn create-btn">
          <span class="btn-icon">➕</span>
          新建任务
        </button>
      </div>
    </div>

    <!-- 任务统计 -->
    <div class="task-stats">
      <div class="stat-card">
        <div class="stat-value">{{ taskStats.total }}</div>
        <div class="stat-label">总任务数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ taskStats.running }}</div>
        <div class="stat-label">运行中</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ taskStats.completed }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ taskStats.failed }}</div>
        <div class="stat-label">失败</div>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filters">
      <div class="filter-group">
        <label class="filter-label">状态筛选</label>
        <select v-model="statusFilter" class="filter-select">
          <option value="">所有状态</option>
          <option value="pending">等待中</option>
          <option value="running">运行中</option>
          <option value="completed">已完成</option>
          <option value="failed">失败</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">类型筛选</label>
        <select v-model="typeFilter" class="filter-select">
          <option value="">所有类型</option>
          <option value="crowd_simulation">人群仿真</option>
          <option value="evacuation">疏散仿真</option>
          <option value="traffic_flow">交通流仿真</option>
          <option value="behavior_analysis">行为分析</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">搜索</label>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜索任务名称..."
          class="search-input"
        />
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-list">
      <div 
        v-for="task in filteredTasks" 
        :key="task.id"
        class="task-card"
        :class="{ selected: selectedTask?.id === task.id }"
        @click="selectTask(task)"
      >
        <div class="task-header">
          <div class="task-title">
            <h4>{{ task.name }}</h4>
            <span class="task-id">#{{ task.id }}</span>
          </div>
          <div class="task-status" :class="task.status">
            {{ getStatusText(task.status) }}
          </div>
        </div>
        
        <div class="task-info">
          <div class="info-item">
            <span class="info-label">类型:</span>
            <span class="info-value">{{ getTypeText(task.type) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">创建时间:</span>
            <span class="info-value">{{ formatDate(task.createdAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">预计时长:</span>
            <span class="info-value">{{ task.estimatedDuration }}分钟</span>
          </div>
        </div>

        <div class="task-progress" v-if="task.status === 'running'">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: task.progress + '%' }"></div>
          </div>
          <span class="progress-text">{{ task.progress }}%</span>
        </div>

        <div class="task-actions">
          <button 
            v-if="task.status === 'pending'" 
            @click.stop="startTask(task)"
            class="task-btn start-btn"
          >
            ▶️ 开始
          </button>
          <button 
            v-if="task.status === 'running'" 
            @click.stop="pauseTask(task)"
            class="task-btn pause-btn"
          >
            ⏸️ 暂停
          </button>
          <button 
            v-if="task.status === 'completed'" 
            @click.stop="viewResults(task)"
            class="task-btn view-btn"
          >
            👁️ 查看结果
          </button>
          <button 
            @click.stop="deleteTask(task)"
            class="task-btn delete-btn"
          >
            🗑️ 删除
          </button>
        </div>
      </div>
    </div>

    <!-- 新建任务对话框 -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click="showCreateDialog = false">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h4>新建仿真任务</h4>
          <button @click="showCreateDialog = false" class="close-btn">✕</button>
        </div>
        
        <form @submit.prevent="submitNewTask" class="task-form">
          <div class="form-group">
            <label class="form-label">任务名称</label>
            <input 
              v-model="newTask.name" 
              type="text" 
              class="form-input"
              placeholder="输入任务名称"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">仿真类型</label>
            <select v-model="newTask.type" class="form-select" required>
              <option value="">请选择类型</option>
              <option value="crowd_simulation">人群仿真</option>
              <option value="evacuation">疏散仿真</option>
              <option value="traffic_flow">交通流仿真</option>
              <option value="behavior_analysis">行为分析</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">参与人数</label>
            <input 
              v-model.number="newTask.participants" 
              type="number" 
              class="form-input"
              placeholder="输入参与人数"
              min="1"
              max="10000"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">仿真时长 (分钟)</label>
            <input 
              v-model.number="newTask.duration" 
              type="number" 
              class="form-input"
              placeholder="输入仿真时长"
              min="1"
              max="1440"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">场景描述</label>
            <textarea 
              v-model="newTask.description" 
              class="form-textarea"
              placeholder="描述仿真场景和参数"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showCreateDialog = false" class="cancel-btn">
              取消
            </button>
            <button type="submit" class="submit-btn">
              创建任务
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

interface Task {
  id: string
  name: string
  type: 'crowd_simulation' | 'evacuation' | 'traffic_flow' | 'behavior_analysis'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  participants: number
  estimatedDuration: number
  createdAt: Date
  description: string
}

const emit = defineEmits<{
  'task-selected': [task: Task]
}>()

// 任务列表
const tasks = ref<Task[]>([])

// 选中的任务
const selectedTask = ref<Task | null>(null)

// 筛选条件
const statusFilter = ref('')
const typeFilter = ref('')
const searchQuery = ref('')

// 新建任务对话框
const showCreateDialog = ref(false)
const newTask = reactive({
  name: '',
  type: '',
  participants: 100,
  duration: 60,
  description: ''
})

// 任务统计
const taskStats = computed(() => {
  const total = tasks.value.length
  const running = tasks.value.filter(t => t.status === 'running').length
  const completed = tasks.value.filter(t => t.status === 'completed').length
  const failed = tasks.value.filter(t => t.status === 'failed').length
  
  return { total, running, completed, failed }
})

// 筛选后的任务列表
const filteredTasks = computed(() => {
  let filtered = tasks.value

  if (statusFilter.value) {
    filtered = filtered.filter(task => task.status === statusFilter.value)
  }

  if (typeFilter.value) {
    filtered = filtered.filter(task => task.type === typeFilter.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(task => 
      task.name.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
    )
  }

  return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
})

// 方法
const refreshTasks = () => {
  console.log('刷新任务列表')
  loadTasks()
}

const createNewTask = () => {
  showCreateDialog.value = true
  // 重置表单
  Object.assign(newTask, {
    name: '',
    type: '',
    participants: 100,
    duration: 60,
    description: ''
  })
}

const selectTask = (task: Task) => {
  selectedTask.value = task
  emit('task-selected', task)
}

const startTask = (task: Task) => {
  console.log('开始任务:', task.id)
  task.status = 'running'
  task.progress = 0
  
  // 模拟任务进度
  const progressInterval = setInterval(() => {
    if (task.progress < 100 && task.status === 'running') {
      task.progress += Math.random() * 10
      if (task.progress >= 100) {
        task.progress = 100
        task.status = 'completed'
        clearInterval(progressInterval)
      }
    } else {
      clearInterval(progressInterval)
    }
  }, 1000)
}

const pauseTask = (task: Task) => {
  console.log('暂停任务:', task.id)
  task.status = 'pending'
}

const viewResults = (task: Task) => {
  console.log('查看结果:', task.id)
  selectTask(task)
}

const deleteTask = (task: Task) => {
  const index = tasks.value.indexOf(task)
  if (index > -1) {
    tasks.value.splice(index, 1)
    if (selectedTask.value?.id === task.id) {
      selectedTask.value = null
    }
  }
}

const submitNewTask = () => {
  const task: Task = {
    id: generateId(),
    name: newTask.name,
    type: newTask.type as Task['type'],
    status: 'pending',
    progress: 0,
    participants: newTask.participants,
    estimatedDuration: newTask.duration,
    createdAt: new Date(),
    description: newTask.description
  }
  
  tasks.value.unshift(task)
  showCreateDialog.value = false
  
  console.log('创建新任务:', task)
}

const generateId = () => {
  return 'task_' + Date.now().toString(36) + Math.random().toString(36).substr(2)
}

const getStatusText = (status: string) => {
  const statusMap = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '失败'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const getTypeText = (type: string) => {
  const typeMap = {
    crowd_simulation: '人群仿真',
    evacuation: '疏散仿真',
    traffic_flow: '交通流仿真',
    behavior_analysis: '行为分析'
  }
  return typeMap[type as keyof typeof typeMap] || type
}

const formatDate = (date: Date) => {
  return date.toLocaleString('zh-CN')
}

const loadTasks = () => {
  // 模拟加载任务数据
  tasks.value = [
    {
      id: 'task_001',
      name: '地铁站高峰期人群仿真',
      type: 'crowd_simulation',
      status: 'running',
      progress: 65,
      participants: 500,
      estimatedDuration: 120,
      createdAt: new Date('2024-12-19T10:00:00'),
      description: '模拟地铁站早高峰期间的人群流动情况'
    },
    {
      id: 'task_002',
      name: '商场火灾疏散演练',
      type: 'evacuation',
      status: 'completed',
      progress: 100,
      participants: 800,
      estimatedDuration: 180,
      createdAt: new Date('2024-12-18T14:30:00'),
      description: '模拟商场发生火灾时的人群疏散过程'
    },
    {
      id: 'task_003',
      name: '体育场散场流量分析',
      type: 'behavior_analysis',
      status: 'pending',
      progress: 0,
      participants: 2000,
      estimatedDuration: 90,
      createdAt: new Date('2024-12-17T16:45:00'),
      description: '分析体育场散场时的人群行为模式'
    },
    {
      id: 'task_004',
      name: '交叉路口交通流仿真',
      type: 'traffic_flow',
      status: 'failed',
      progress: 0,
      participants: 300,
      estimatedDuration: 60,
      createdAt: new Date('2024-12-16T09:15:00'),
      description: '模拟繁忙交叉路口的交通流情况'
    }
  ]
}

onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.simulation-tasks {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.tasks-header h3 {
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

.create-btn {
  background: linear-gradient(45deg, #00d4ff, #0099cc);
  color: #ffffff;
}

.btn-icon {
  font-size: 1rem;
}

/* 任务统计 */
.task-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #00d4ff;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

/* 筛选器 */
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(0, 212, 255, 0.2);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  color: #00d4ff;
  font-size: 0.9rem;
  font-weight: 500;
}

.filter-select, .search-input {
  background: rgba(0, 0, 0, 0.5);
  color: #ffffff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.9rem;
}

.filter-select:focus, .search-input:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

/* 任务列表 */
.tasks-list {
  display: grid;
  gap: 1rem;
}

.task-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.task-card:hover {
  border-color: #00d4ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 212, 255, 0.2);
}

.task-card.selected {
  border-color: #00d4ff;
  background: rgba(0, 212, 255, 0.1);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.task-title h4 {
  margin: 0 0 0.25rem 0;
  color: #ffffff;
  font-size: 1.1rem;
}

.task-id {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
}

.task-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.task-status.pending {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.task-status.running {
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
}

.task-status.completed {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.task-status.failed {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.task-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
}

.info-value {
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 500;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00d4ff, #0099cc);
  transition: width 0.3s ease;
}

.progress-text {
  color: #00d4ff;
  font-size: 0.8rem;
  font-weight: bold;
  min-width: 40px;
}

.task-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.task-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
}

.task-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.start-btn {
  background: rgba(76, 175, 80, 0.2);
  border-color: #4caf50;
  color: #4caf50;
}

.pause-btn {
  background: rgba(255, 193, 7, 0.2);
  border-color: #ffc107;
  color: #ffc107;
}

.view-btn {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  color: #00d4ff;
}

.delete-btn {
  background: rgba(244, 67, 54, 0.2);
  border-color: #f44336;
  color: #f44336;
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.dialog-content {
  background: linear-gradient(135deg, #1a1f35 0%, #2a2d47 100%);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.3);
  min-width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
}

.dialog-header h4 {
  margin: 0;
  color: #00d4ff;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.task-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  color: #00d4ff;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-input, .form-select, .form-textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  color: #ffffff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.cancel-btn, .submit-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.submit-btn {
  background: linear-gradient(45deg, #00d4ff, #0099cc);
  color: #ffffff;
  border: 1px solid #00d4ff;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .simulation-tasks {
    padding: 1rem;
  }
  
  .tasks-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .task-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters {
    grid-template-columns: 1fr;
  }
  
  .task-info {
    grid-template-columns: 1fr;
  }
  
  .task-actions {
    justify-content: center;
  }
  
  .dialog-content {
    min-width: auto;
    margin: 1rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>
