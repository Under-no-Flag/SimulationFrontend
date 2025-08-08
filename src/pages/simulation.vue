<template>
	<div class="simulation-page">
		<!-- 顶部导航 -->
		<div class="top-navbar">
			<div class="nav-content">
				<div class="logo-section">
					<div class="logo-icon">🏙️</div>
					<h1 class="logo-text">上海外滩人群仿真平台</h1>
				</div>
				<div class="nav-buttons">
					<button class="nav-btn home-btn" @click="goHome">
						<span class="btn-icon">🏠</span>
						首页
					</button>
					<button class="nav-btn active">
						<span class="btn-icon">📊</span>
						仿真可视化
					</button>
					<button class="nav-btn">
						<span class="btn-icon">⚙️</span>
						设置
					</button>
				</div>
			</div>
		</div>

		<!-- 主要内容容器 -->
		<div class="main-container">
			<!-- 可视化布局 -->
			<div class="visualization-layout">
				<!-- 3D仿真可视化区域 -->
				<div class="model-section">
					<div class="section-header">
						<h3>3D仿真可视化</h3>
						<div class="model-controls">
							<button class="control-btn" @click="loadCityModel" :disabled="isLoading">
								{{ isLoading ? '加载中...' : '加载地图' }}
							</button>
							<button class="control-btn" @click="resetView">
								重置视图
							</button>
							<button class="control-btn" @click="toggleHeatmap" :class="{ active: showHeatmap }">
								{{ showHeatmap ? '关闭热力图' : '开启热力图' }}
							</button>
							<button class="control-btn" @click="resetScene" :disabled="heatmapState.isTransitioning">
								重置场景
							</button>
						</div>
					</div>
					<div class="model-container" ref="sceneContainer">
						<!-- 加载状态 -->
						<div v-if="isLoading" class="loading-overlay">
							<div class="loading-spinner">
								<div class="spinner"></div>
								<p>正在加载上海地图模型...</p>
							</div>
						</div>

						<!-- 3D仿真场景 -->
						<div v-if="renderError" class="render-error">
							<div class="error-content">
								<h3>渲染错误</h3>
								<p>{{ renderError }}</p>
								<button class="control-btn" @click="retryRender">重试渲染</button>
							</div>
						</div>
						
						<TresCanvas v-if="cityFBX && cityFBX.model && !renderError" ref="tcRef" v-bind="gl" :antialias="true" @error="handleRenderError">
							<TresPerspectiveCamera 
								:position="[cameraSettings.position.x, cameraSettings.position.y, cameraSettings.position.z]" 
								:rotation="[cameraSettings.rotation.x, cameraSettings.rotation.y, cameraSettings.rotation.z]"
								:fov="45" 
								:near="1" 
								:far="100000" 
							/>
							<OrbitControls 
								:auto-rotate="false" 
								:enable-damping="viewMode === 'free'"
								:enable-rotate="viewMode === 'free'"
								:enable-pan="viewMode === 'free'"
								:enable-zoom="viewMode === 'free'"
							/>
							<TresAmbientLight color="#ffffff" />
							<TresDirectionalLight :position="[100, 100, 0]" :intensity="0.5" color="#ffffff" />
							
							<!-- 基础地图模型 -->
							<primitive v-if="cityFBX.model && !showHeatmap" :object="cityFBX.model" />
							
							<!-- 热力图建筑物 - 使用稳定的 key 确保组件能正常卸载 -->
							<buildingsHeatmap 
								v-if="cityFBX.model && showHeatmap" 
								:key="'heatmap-component'"
								:model="cityFBX" 
								v-bind="buildingState" 
								:heatmap-data="heatmapData" 
							/>
							
							<!-- 建筑物线条 -->
							<buildingsLines v-if="cityFBX.city && showLines" v-bind="buildingsLinesState" :builds="cityFBX.city" />
							
							<!-- 仿真数据可视化层 -->
							<div v-if="selectedEvent && cityFBX" class="simulation-overlay">
								<div class="simulation-info">
									<h4>当前仿真事件: {{ getEventName(selectedEvent) }}</h4>
									<p>时间范围: {{ startTime }} - {{ endTime }}</p>
								</div>
							</div>
						</TresCanvas>

						<!-- 占位符 -->
						<div v-if="!cityFBX && !isLoading" class="visualization-placeholder">
							<div class="placeholder-content">
								<div class="placeholder-icon">🗺️</div>
								<h3>3D仿真可视化区域</h3>
								<p>点击"加载地图"开始3D仿真可视化分析</p>
								<p class="placeholder-subtitle">支持热力图、人群密度、交通流量等仿真数据可视化</p>
							</div>
						</div>
					</div>
				</div>

				<!-- 控制面板 -->
				<div class="control-panel">
					<!-- 面板标签 -->
					<div class="panel-tabs-container">
						<!-- 第一行标签 -->
						<div class="panel-tabs-row">
							<button
								class="panel-tab"
								:class="{ active: activePanel === 'parameters' }"
								@click="activePanel = 'parameters'"
							>
								参数设置
							</button>
							<button
								class="panel-tab"
								:class="{ active: activePanel === 'prevention' }"
								@click="activePanel = 'prevention'"
							>
								预防措施
							</button>
							<button
								class="panel-tab"
								:class="{ active: activePanel === 'simulation' }"
								@click="activePanel = 'simulation'"
							>
								仿真结果
							</button>
						</div>
						<!-- 第二行标签 -->
						<div class="panel-tabs-row">
							<button
								class="panel-tab"
								:class="{ active: activePanel === 'data' }"
								@click="activePanel = 'data'"
							>
								数据可视化
							</button>
							<button
								class="panel-tab"
								:class="{ active: activePanel === 'settings' }"
								@click="activePanel = 'settings'"
							>
								可视化设置
							</button>
						</div>
					</div>

					<!-- 参数设置面板 -->
					<div v-if="activePanel === 'parameters'" class="panel-content">
						<!-- 基础参数设置 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>基础参数设置</h4>
							</div>
							<div class="option-group">
								<label class="option-label">模型名称 (modelName)</label>
								<input
									type="text"
									v-model="simulationParams.modelName"
									class="text-input"
									placeholder="请输入模型名称"
									@input="onParameterChange"
								/>
							</div>
							<div class="option-group">
								<label class="option-label">开始时间 (startTime)</label>
								<input
									type="datetime-local"
									v-model="simulationParams.startTime"
									class="datetime-input"
									min="2000-01-01T00:00"
									max="2100-12-31T23:59"
									@change="onParameterChange"
								/>
							</div>
							<div class="option-group">
								<label class="option-label">结束时间 (stopDate)</label>
								<input
									type="datetime-local"
									v-model="simulationParams.stopDate"
									class="datetime-input"
									min="2000-01-01T00:00"
									max="2100-12-31T23:59"
									@change="onParameterChange"
								/>
							</div>
						</div>

						<!-- 高级参数设置 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>高级参数设置</h4>
							</div>
							<div class="option-group">
								<label class="option-label">实时比例 (realTimeScale)</label>
								<div class="number-input-group">
									<input
										type="number"
										v-model.number="simulationParams.realTimeScale"
										class="number-input"
										step="0.1"
										min="0.1"
										max="10"
										placeholder="1.0"
										@input="onParameterChange"
									/>
									<span class="input-unit">倍速</span>
								</div>
								<div class="slider-group">
									<input
										type="range"
										v-model.number="simulationParams.realTimeScale"
										min="0.1"
										max="10"
										step="0.1"
										class="slider-input"
										@input="onParameterChange"
									/>
									<span class="slider-value">{{ simulationParams.realTimeScale }}x</span>
								</div>
							</div>
							<div class="option-group">
								<label class="option-label">仿真目标时间 (simulTargetTime)</label>
								<input
									type="datetime-local"
									v-model="simulationParams.simulTargetTime"
									class="datetime-input"
									min="2000-01-01T00:00"
									max="2100-12-31T23:59"
									@change="onParameterChange"
								/>
							</div>
							<div class="option-group">
								<label class="option-label">运行ID (runId)</label>
								<input
									type="text"
									v-model="simulationParams.runId"
									class="text-input"
									placeholder="自动生成 (可选)"
									@input="onParameterChange"
								/>
								<div class="input-help">
									<small>留空将自动生成唯一ID</small>
								</div>
							</div>
						</div>

						<!-- 描述信息 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>描述信息</h4>
							</div>
							<div class="option-group">
								<label class="option-label">仿真描述 (description)</label>
								<textarea
									v-model="simulationParams.description"
									class="textarea-input"
									rows="4"
									placeholder="请输入仿真描述信息..."
									@input="onParameterChange"
								></textarea>
								<div class="char-counter">
									{{ simulationParams.description.length }}/500 字符
								</div>
							</div>
						</div>

						<!-- 参数预览 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>参数预览</h4>
							</div>
							<div class="option-group">
								<div class="params-preview">
									<pre class="params-json">{{ formatParamsPreview() }}</pre>
								</div>
							</div>
						</div>

						<!-- 操作按钮 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>操作</h4>
							</div>
							<div class="option-group">
								<div class="action-buttons">
									<button class="action-btn primary" @click="validateAndSaveParams">
										<span class="btn-icon">✓</span>
										保存参数
									</button>
									<button class="action-btn secondary" @click="resetParams">
										<span class="btn-icon">↻</span>
										重置参数
									</button>
									<button class="action-btn success" @click="startSimulationWithParams" :disabled="!isParamsValid || isStartingSimulation">
										<span class="btn-icon">{{ isStartingSimulation ? '⏳' : '▶' }}</span>
										{{ isStartingSimulation ? '启动中...' : '开始仿真' }}
									</button>
								</div>
							</div>
						</div>
					</div>

					<!-- 预防措施面板 -->
					<div v-if="activePanel === 'prevention'" class="panel-content">
						<!-- 等待时间参数 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>等待时间设置</h4>
							</div>
							<div class="option-group">
								<label class="option-label">最大等待时间 (waitTimeMax)</label>
								<input
									type="text"
									v-model="preventionParams.waitTimeMax"
									class="text-input"
									placeholder="请输入最大等待时间"
									@input="onPreventionParamChange"
								/>
							</div>
							<div class="option-group">
								<label class="option-label">仿真目标时间 (simulTargetTime)</label>
								<input
									type="text"
									v-model="preventionParams.simulTargetTime"
									class="text-input"
									placeholder="请输入仿真目标时间"
									@input="onPreventionParamChange"
								/>
							</div>
						</div>

						<!-- 快速移动概率设置 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>快速移动概率 (F-Fast)</h4>
							</div>
							<div class="option-group">
								<label class="option-label">东向概率 (FEastProbs)</label>
								<input
									type="text"
									v-model="preventionParams.FEastProbs"
									class="text-input"
									placeholder="请输入东向快速移动概率"
									@input="onPreventionParamChange"
								/>
							</div>
							<div class="option-group">
								<label class="option-label">北向概率 (FNorthProbs)</label>
								<input
									type="text"
									v-model="preventionParams.FNorthProbs"
									class="text-input"
									placeholder="请输入北向快速移动概率"
									@input="onPreventionParamChange"
								/>
							</div>
							<div class="option-group">
								<label class="option-label">南向概率 (FSouthProbs)</label>
								<input
									type="text"
									v-model="preventionParams.FSouthProbs"
									class="text-input"
									placeholder="请输入南向快速移动概率"
									@input="onPreventionParamChange"
								/>
							</div>
							<div class="option-group">
								<label class="option-label">西向概率 (FWestProbs)</label>
								<input
									type="text"
									v-model="preventionParams.FWestProbs"
									class="text-input"
									placeholder="请输入西向快速移动概率"
									@input="onPreventionParamChange"
								/>
							</div>
						</div>

						<!-- 慢速移动概率设置 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>慢速移动概率 (L-Low)</h4>
							</div>
							<div class="option-group">
								<label class="option-label">东向概率 (LEastProbs)</label>
								<input
									type="text"
									v-model="preventionParams.LEastProbs"
									class="text-input"
									placeholder="请输入东向慢速移动概率"
									@input="onPreventionParamChange"
								/>
							</div>
							<div class="option-group">
								<label class="option-label">北向概率 (LNorthProbs)</label>
								<input
									type="text"
									v-model="preventionParams.LNorthProbs"
									class="text-input"
									placeholder="请输入北向慢速移动概率"
									@input="onPreventionParamChange"
								/>
							</div>
							<div class="option-group">
								<label class="option-label">南向概率 (LSouthProbs)</label>
								<input
									type="text"
									v-model="preventionParams.LSouthProbs"
									class="text-input"
									placeholder="请输入南向慢速移动概率"
									@input="onPreventionParamChange"
								/>
							</div>
							<div class="option-group">
								<label class="option-label">西向概率 (LWestProbs)</label>
								<input
									type="text"
									v-model="preventionParams.LWestProbs"
									class="text-input"
									placeholder="请输入西向慢速移动概率"
									@input="onPreventionParamChange"
								/>
							</div>
						</div>

						<!-- 预防措施预览 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>预防措施预览</h4>
							</div>
							<div class="option-group">
								<div class="params-preview">
									<pre class="params-json">{{ formatPreventionPreview() }}</pre>
								</div>
							</div>
						</div>

						<!-- 预防措施操作 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>操作</h4>
							</div>
							<div class="option-group">
								<div class="action-buttons">
									<button class="action-btn primary" @click="savePreventionParams">
										<span class="btn-icon">💾</span>
										保存预防措施
									</button>
									<button class="action-btn secondary" @click="resetPreventionParams">
										<span class="btn-icon">↻</span>
										重置预防措施
									</button>
									<button class="action-btn info" @click="exportPreventionParams">
										<span class="btn-icon">📤</span>
										导出配置
									</button>
								</div>
							</div>
						</div>
					</div>

					<!-- 仿真结果面板 -->
					<div v-if="activePanel === 'simulation'" class="panel-content">
						<!-- 仿真实验信息 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>仿真实验信息</h4>
							</div>
							<div class="option-group">
								<div class="info-item">
									<label class="info-label">仿真实验ID:</label>
									<span class="info-value">{{ simulationInfo.experimentId }}</span>
								</div>
								<div class="info-item">
									<label class="info-label">仿真时间段:</label>
									<span class="info-value">{{ simulationInfo.startTime }} - {{ simulationInfo.endTime }}</span>
								</div>
								<div class="info-item">
									<label class="info-label">总仿真时长:</label>
									<span class="info-value">{{ simulationInfo.totalDuration }}</span>
								</div>
								<div class="info-item">
									<label class="info-label">数据采集间隔:</label>
									<span class="info-value">{{ simulationInfo.dataInterval }}</span>
								</div>
							</div>
						</div>

						<!-- 时间点选择 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>时间点选择</h4>
							</div>
							<div class="option-group">
								<label class="option-label">选择时间点</label>
								<select v-model="selectedTimePoint" class="select-input" @change="loadTimePointData">
									<option :value="null">请选择时间点</option>
									<option 
										v-for="timePoint in timePoints" 
										:key="timePoint.value" 
										:value="timePoint.value"
									>
										{{ timePoint.label }}
									</option>
								</select>
							</div>
							<div class="option-group">
								<div class="time-slider-group">
									<label class="slider-label">时间进度</label>
									<input
										type="range"
										v-model="timeProgress"
										min="0"
										:max="timePoints.length - 1"
										step="1"
										class="slider-input"
										@input="onTimeProgressChange"
									/>
									<span class="slider-value">{{ getCurrentTimeLabel() }}</span>
								</div>
							</div>
						</div>

						<!-- 仿真状态 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>仿真状态</h4>
							</div>
							<div class="option-group">
								<div class="status-grid">
									<div class="status-item">
										<label class="status-label">仿真状态:</label>
										<span class="status-value" :class="simulationStatus.status">
											{{ simulationStatus.statusText }}
										</span>
									</div>
									<div class="status-item">
										<label class="status-label">当前时间点:</label>
										<span class="status-value">{{ simulationStatus.currentTimePoint }}</span>
									</div>
									<div class="status-item">
										<label class="status-label">数据点数量:</label>
										<span class="status-value">{{ simulationStatus.dataPointCount }}</span>
									</div>
									<div class="status-item">
										<label class="status-label">热力图强度:</label>
										<span class="status-value">{{ simulationStatus.heatmapIntensity }}</span>
									</div>
								</div>
							</div>
						</div>

						<!-- 播放控制 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>播放控制</h4>
							</div>
							<div class="option-group">
								<div class="playback-controls">
									<button class="control-btn" @click="playSimulation" :disabled="simulationStatus.isPlaying">
										{{ simulationStatus.isPlaying ? '播放中...' : '播放' }}
									</button>
									<button class="control-btn" @click="pauseSimulation" :disabled="!simulationStatus.isPlaying">
										暂停
									</button>
									<button class="control-btn" @click="stopSimulation">
										停止
									</button>
									<button class="control-btn" @click="resetSimulation">
										重置
									</button>
								</div>
								<div class="slider-group">
									<label class="slider-label">播放速度</label>
									<input
										type="range"
										v-model="playbackSpeed"
										min="0.5"
										max="3"
										step="0.5"
										class="slider-input"
										@input="onPlaybackSpeedChange"
									/>
									<span class="slider-value">{{ playbackSpeed }}x</span>
								</div>
							</div>
						</div>
					</div>

					<!-- 数据可视化面板 -->
					<div v-if="activePanel === 'data'" class="panel-content">
						<!-- 事件选择 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>仿真事件</h4>
							</div>
							<div class="option-group">
								<label class="option-label">选择事件</label>
								<select v-model="selectedEvent" class="select-input" @change="loadSimulationEvent">
									<option value="">请选择事件</option>
									<option value="rush_hour">早高峰</option>
									<option value="evening_rush">晚高峰</option>
									<option value="weekend">周末购物</option>
									<option value="holiday">节假日</option>
									<option value="emergency">紧急疏散</option>
								</select>
							</div>
							<div class="option-group">
								<label class="option-label">时间范围</label>
								<div class="time-controls">
									<input
										type="time"
										v-model="startTime"
										class="time-input"
									/>
									<span class="time-separator">-</span>
									<input
										type="time"
										v-model="endTime"
										class="time-input"
									/>
								</div>
							</div>
						</div>



						<!-- 地图控制 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>地图控制</h4>
							</div>
							<div class="option-group">
								<div class="checkbox-group">
									<label class="checkbox-item">
										<input type="checkbox" v-model="showLines" />
										显示建筑物线条
									</label>
								</div>
								<div class="slider-group">
									<label class="slider-label">建筑物透明度</label>
									<input
										type="range"
										v-model="buildingState.opacity"
										min="0"
										max="1"
										step="0.1"
										class="slider-input"
									/>
									<span class="slider-value">{{ buildingState.opacity }}</span>
								</div>
							</div>
						</div>

						<!-- 可视化选项 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>可视化选项</h4>
							</div>
							<div class="option-group">
								<div class="checkbox-group">
									<label class="checkbox-item">
										<input type="checkbox" v-model="showDensityHeatmap" />
										人群密度热力图
									</label>
									<label class="checkbox-item">
										<input type="checkbox" v-model="showSpeedVectors" />
										速度向量场
									</label>
									<label class="checkbox-item">
										<input type="checkbox" v-model="showBottlenecks" />
										瓶颈区域标识
									</label>
									<label class="checkbox-item">
										<input type="checkbox" v-model="showEvacuationRoutes" />
										疏散路径
									</label>
									<label class="checkbox-item">
										<input type="checkbox" v-model="isRealTimeUpdate" />
										实时更新
									</label>
								</div>
							</div>
						</div>

						<!-- 数据可视化 -->
						<div class="panel-section data-visualization">
							<div class="section-header">
								<h5>实时数据</h5>
							</div>
							<div class="chart-container">
								<h6>人群密度趋势</h6>
								<canvas ref="lineChart" width="350" height="150"></canvas>
							</div>
							<div class="chart-container">
								<h6>区域分布</h6>
								<canvas ref="pieChart" width="350" height="200"></canvas>
							</div>
						</div>
					</div>

					<!-- 可视化设置面板 -->
					<div v-if="activePanel === 'settings'" class="panel-content">
						<!-- 视角控制 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>视角控制</h4>
							</div>
							<div class="option-group">
								<div class="view-mode-controls">
									<button 
										class="view-mode-btn" 
										:class="{ active: viewMode === 'fixed' }"
										@click="setViewMode('fixed')"
									>
										<span class="btn-icon">📐</span>
										固定视角
									</button>
									<button 
										class="view-mode-btn" 
										:class="{ active: viewMode === 'free' }"
										@click="setViewMode('free')"
									>
										<span class="btn-icon">🔄</span>
										开放视角
									</button>
								</div>
								<div class="view-info">
									<p class="view-description">{{ getViewModeDescription() }}</p>
								</div>
								<div class="view-actions">
									<button class="action-btn" @click="outputCurrentViewParams">
										<span class="btn-icon">📊</span>
										输出当前视角参数
									</button>
								</div>
							</div>
						</div>

						<!-- 相机设置 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>相机设置</h4>
							</div>
							<div class="option-group">
								<div class="camera-controls">
									<div class="camera-position">
										<label class="camera-label">相机位置</label>
										<div class="position-inputs">
											<div>
												<span>X</span>
												<input type="range" min="-2000" max="2000" step="1" v-model="cameraSettings.position.x" @input="updateCameraPosition" />
												<span>{{ Math.floor(cameraSettings.position.x) }}</span>
											</div>
											<div>
												<span>Y</span>
												<input type="range" min="0" max="3000" step="1" v-model="cameraSettings.position.y" @input="updateCameraPosition" />
												<span>{{ Math.floor(cameraSettings.position.y) }}</span>
											</div>
											<div>
												<span>Z</span>
												<input type="range" min="-2000" max="2000" step="1" v-model="cameraSettings.position.z" @input="updateCameraPosition" />
												<span>{{ Math.floor(cameraSettings.position.z) }}</span>
											</div>
										</div>
									</div>
									<div class="camera-rotation">
										<label class="camera-label">相机旋转</label>
										<div class="rotation-inputs">
											<div>
												<span>X</span>
												<input type="range" min="-180" max="180" step="1" v-model="rotationDegreesX" :disabled="viewMode === 'fixed'" />
												<span>{{ rotationDegreesX }}°</span>
											</div>
											<div>
												<span>Y</span>
												<input type="range" min="-180" max="180" step="1" v-model="rotationDegreesY" :disabled="viewMode === 'fixed'" />
												<span>{{ rotationDegreesY }}°</span>
											</div>
											<div>
												<span>Z</span>
												<input type="range" min="-180" max="180" step="1" v-model="rotationDegreesZ" :disabled="viewMode === 'fixed'" />
												<span>{{ rotationDegreesZ }}°</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- 显示设置 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>显示设置</h4>
							</div>
							<div class="option-group">
								<div class="checkbox-group">
									<label class="checkbox-item">
										<input type="checkbox" v-model="renderSettings.antialiasing" />
										抗锯齿
									</label>
								</div>
								<div class="slider-group">
									<label class="slider-label">显示质量</label>
									<input
										type="range"
										v-model="renderSettings.quality"
										min="0.5"
										max="1"
										step="0.1"
										class="slider-input"
									/>
									<span class="slider-value">{{ renderSettings.quality }}</span>
								</div>
							</div>
						</div>

						<!-- 坐标转换调试 -->
						<div class="panel-section">
							<div class="section-header">
								<h4>坐标转换调试</h4>
					</div>
							<div class="option-group">
								<div class="debug-section">
									<h5>校准参数信息</h5>
									<div class="debug-info">
										<div class="debug-item">
											<label>校准点覆盖范围:</label>
											<span>纬度: {{ calibrationData.geoBounds.minLat.toFixed(6) }} ~ {{ calibrationData.geoBounds.maxLat.toFixed(6) }}</span>
				</div>
										<div class="debug-item">
											<label></label>
											<span>经度: {{ calibrationData.geoBounds.minLon.toFixed(6) }} ~ {{ calibrationData.geoBounds.maxLon.toFixed(6) }}</span>
										</div>
										<div class="debug-item">
											<label>边界计算状态:</label>
											<span :class="{ 'text-success': geometryBounds.isCalculated, 'text-warning': !geometryBounds.isCalculated }">
												{{ geometryBounds.isCalculated ? '✅ 已自动计算' : '⚠️ 未计算' }}
											</span>
										</div>
										<div v-if="geometryBounds.isCalculated" class="debug-item">
											<label>计算时间:</label>
											<span>{{ geometryBounds.calculatedAt?.toLocaleTimeString() || '未知' }}</span>
										</div>
										<div class="debug-item">
											<label>模型坐标边界:</label>
											<span>X: {{ geometryBounds.isCalculated ? geometryBounds.modelBounds.minX.toFixed(2) : '未计算' }} ~ {{ geometryBounds.isCalculated ? geometryBounds.modelBounds.maxX.toFixed(2) : '未计算' }}</span>
										</div>
										<div class="debug-item">
											<label></label>
											<span>Y: {{ geometryBounds.isCalculated ? geometryBounds.modelBounds.minY.toFixed(2) : '未计算' }} ~ {{ geometryBounds.isCalculated ? geometryBounds.modelBounds.maxY.toFixed(2) : '未计算' }}</span>
										</div>
										<div class="debug-item">
											<label></label>
											<span>Z: {{ geometryBounds.isCalculated ? geometryBounds.modelBounds.minZ.toFixed(2) : '未计算' }} ~ {{ geometryBounds.isCalculated ? geometryBounds.modelBounds.maxZ.toFixed(2) : '未计算' }}</span>
										</div>
										<div v-if="geometryBounds.isCalculated" class="debug-item">
											<label>模型尺寸:</label>
											<span>{{ (geometryBounds.modelBounds.maxX - geometryBounds.modelBounds.minX).toFixed(2) }} × {{ (geometryBounds.modelBounds.maxY - geometryBounds.modelBounds.minY).toFixed(2) }} × {{ (geometryBounds.modelBounds.maxZ - geometryBounds.modelBounds.minZ).toFixed(2) }}</span>
										</div>
										<div class="debug-item">
											<label>热力图尺寸:</label>
											<span>{{ getHeatmapCanvasSize().width }} x {{ getHeatmapCanvasSize().height }} 像素</span>
										</div>
										<div class="debug-item">
											<label>坐标系统:</label>
											<span>{{ calibrationData.method === 'geometry' ? '🎯 几何体边界（自动）' : calibrationData.method === 'affine' ? '📐 仿射变换（高精度）' : '📏 校准边界（标准）' }}</span>
										</div>
										<div class="debug-item">
											<label>切换坐标系统:</label>
											<div class="coordinate-method-buttons">
												<button 
													class="control-btn small" 
													:class="{ active: calibrationData.method === 'calibration' }"
													@click="switchCoordinateMethod('calibration')"
												>
													📏 校准边界
												</button>
												<button 
													v-if="geometryBounds.isCalculated"
													class="control-btn small" 
													:class="{ active: calibrationData.method === 'geometry' }"
													@click="switchCoordinateMethod('geometry')"
												>
													🎯 几何体边界
												</button>
												<button 
													class="control-btn small" 
													:class="{ active: calibrationData.method === 'affine' }"
													@click="switchCoordinateMethod('affine')"
												>
													📐 仿射变换
												</button>
											</div>
										</div>
										<div class="debug-item">
											<label>坐标转换测试:</label>
											<button class="control-btn small" @click="testGeometryBoundsConversion">
												🧪 测试当前系统
											</button>
										</div>
										<div v-if="heatmapData.data.length > 0" class="debug-item">
											<label>数据诊断:</label>
											<button class="control-btn small" @click="diagnoseHeatmapData">
												🔍 诊断热力图数据
											</button>
										</div>
										<div class="debug-item">
											<label>转换方法:</label>
											<span>{{ calibrationData.method === 'affine' ? '仿射变换（高精度）' : '线性插值（标准）' }}</span>
										</div>
										<div class="debug-item" v-if="calibrationData.method === 'affine'">
											<label>仿射系数:</label>
											<span>a1={{ calibrationData.affineCoeffs?.a1?.toFixed(6) }}, b1={{ calibrationData.affineCoeffs?.b1?.toFixed(6) }}</span>
										</div>
									</div>
								</div>
								
								<div class="debug-section">
									<h5>坐标转换测试</h5>
									<div class="debug-inputs">
										<div class="input-row">
											<label>测试纬度:</label>
											<input type="number" v-model.number="debugCoords.testLat" step="0.000001" class="debug-input" />
										</div>
										<div class="input-row">
											<label>测试经度:</label>
											<input type="number" v-model.number="debugCoords.testLon" step="0.000001" class="debug-input" />
										</div>
										<button class="debug-btn" @click="testCoordinateConversion">测试转换</button>
									</div>
									
									<div class="debug-results" v-if="debugCoords.results">
										<div class="debug-item">
											<label>模型坐标:</label>
											<span>X={{ debugCoords.results.modelX.toFixed(2) }}, Z={{ debugCoords.results.modelZ.toFixed(2) }}</span>
										</div>
										<div class="debug-item">
											<label>热力图坐标:</label>
											<span>X={{ debugCoords.results.heatmapX }}, Y={{ debugCoords.results.heatmapY }}</span>
										</div>
										<div class="debug-item">
											<label>反向转换:</label>
											<span>纬度={{ debugCoords.results.reverseLat.toFixed(6) }}, 经度={{ debugCoords.results.reverseLon.toFixed(6) }}</span>
										</div>
										<div class="debug-item">
											<label>转换误差:</label>
											<span>纬度差={{ debugCoords.results.latError.toFixed(8) }}, 经度差={{ debugCoords.results.lonError.toFixed(8) }}</span>
										</div>
									</div>
								</div>
								
								<div class="debug-section" v-if="heatmapData.data.length > 0">
									<h5>当前热力图数据</h5>
									<div class="debug-info">
										<div class="debug-item">
											<label>数据点数量:</label>
											<span>{{ heatmapData.data.length }}</span>
										</div>
										<div class="debug-item">
											<label>热力值范围:</label>
											<span>{{ Math.min(...heatmapData.data.map(d => d.value)).toFixed(2) }} ~ {{ Math.max(...heatmapData.data.map(d => d.value)).toFixed(2) }}</span>
										</div>
										<div class="debug-item">
											<label>坐标范围:</label>
											<span>X: {{ Math.min(...heatmapData.data.map(d => d.x)) }} ~ {{ Math.max(...heatmapData.data.map(d => d.x)) }}</span>
										</div>
										<div class="debug-item">
											<label></label>
											<span>Y: {{ Math.min(...heatmapData.data.map(d => d.y)) }} ~ {{ Math.max(...heatmapData.data.map(d => d.y)) }}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- 状态栏 -->
		<div class="status-bar">
			<div class="status-item">
				<span class="status-label">连接状态:</span>
				<span class="status-indicator connected">
					已连接
				</span>
			</div>
			<div class="status-item">
				<span class="status-label">当前时间:</span>
				<span class="status-value">{{ currentTime }}</span>
			</div>
			<div class="status-item">
				<span class="status-label">内存使用:</span>
				<span class="status-value">{{ memoryUsage }}</span>
			</div>
			<div class="status-item">
				<span class="status-label">实时更新:</span>
				<span class="status-value active">{{ isRealTimeUpdate ? '🔄 进行中' : '⏸️ 暂停' }}</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted, ref, watchEffect, nextTick, watch, computed } from 'vue'

import { SRGBColorSpace, BasicShadowMap, NoToneMapping } from 'three'
import { OrbitControls } from '@tresjs/cientos'
import { loadCityFBX } from '../plugins/digitalCity/common/loadCity'
import { createUnifiedHeatmapGeometry, xzToUV, disposeHeatmapGeometry } from '../plugins/digitalCity/common/heatmapUtils'
import buildingsHeatmap from '../plugins/digitalCity/components/buildings/buildingsHeatmap.vue'
import buildingsLines from '../plugins/digitalCity/components/buildings/buildingsLines.vue'
import { fetchPedestrianData } from '../common/service'
import type { Ref } from 'vue'

// 响应式状态
const sceneContainer = ref()
const lineChart = ref()
const pieChart = ref()
const tcRef = ref()

// Three.js GL配置
const gl = {
	clearColor: '#0c1426',
	outputColorSpace: SRGBColorSpace,
	shadowMapType: BasicShadowMap,
	toneMapping: NoToneMapping,
	useLegacyLights: false
}

// 城市模型
const cityFBX = ref<any>(null)
const isLoading = ref(false)

// 使用markRaw避免Vue的响应式代理
import { markRaw } from 'vue'

// 动态几何体边界数据 - 从实际加载的模型中计算
const geometryBounds = reactive({
	// 模型坐标边界（从几何体自动计算）
	modelBounds: {
		minX: 0,
		maxX: 0,
		minY: 0,
		maxY: 0,
		minZ: 0,
		maxZ: 0
	},
	// 是否已计算边界
	isCalculated: false,
	// 计算时间戳
	calculatedAt: null as Date | null
})

// 矩阵运算工具函数（基于Java GeoUtil算法）
const multiplyMatrix = (A: number[][], B: number[][]) => {
	const result = Array(A.length).fill(null).map(() => Array(B[0].length).fill(0))
	for (let i = 0; i < A.length; i++) {
		for (let j = 0; j < B[0].length; j++) {
			for (let k = 0; k < B.length; k++) {
				result[i][j] += A[i][k] * B[k][j]
			}
		}
	}
	return result
}

const transposeMatrix = (matrix: number[][]) => {
	return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]))
}

const invertMatrix = (matrix: number[][]) => {
	const n = matrix.length
	const augmented = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)])
	
	// 高斯-约旦消元法
	for (let i = 0; i < n; i++) {
		// 找到主元
		let maxRow = i
		for (let k = i + 1; k < n; k++) {
			if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
				maxRow = k
			}
		}
		[augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]]
		
		// 归一化主元行
		const pivot = augmented[i][i]
		if (Math.abs(pivot) < 1e-10) throw new Error('矩阵奇异，无法求逆')
		for (let j = 0; j < 2 * n; j++) {
			augmented[i][j] /= pivot
		}
		
		// 消元
		for (let k = 0; k < n; k++) {
			if (k !== i) {
				const factor = augmented[k][i]
				for (let j = 0; j < 2 * n; j++) {
					augmented[k][j] -= factor * augmented[i][j]
				}
			}
		}
	}
	
	return augmented.map(row => row.slice(n))
}

// 计算两个数组的相关系数
const calculateCorrelation = (x: number[], y: number[]) => {
	const n = x.length
	const sumX = x.reduce((a, b) => a + b, 0)
	const sumY = y.reduce((a, b) => a + b, 0)
	const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
	const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
	const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)
	
	const numerator = n * sumXY - sumX * sumY
	const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
	
	return denominator === 0 ? 0 : numerator / denominator
}

// 默认校准点数据（与CoordinateCalibration.vue保持一致）
const defaultCalibrationPoints = [
	{
		name: "校准点1",
		modelX: -72.40295394451705,
		modelY: 19.66554549619716,
		modelZ: 812.9764577390581,
		lat: 31.242242,
		lon: 121.491427
	},
	{
		name: "校准点2",
		modelX: 106.19976971292328,
		modelY: 19.068050175905064,
		modelZ: 796.4236809332394,
		lat: 31.244036,
		lon: 121.490378
	},
	{
		name: "校准点3",
		modelX: -71.62023352807236,
		modelY: 19.068050175905157,
		modelZ: 411.37663393355365,
		lat: 31.240711,
		lon: 121.486782
	},
	{
		name: "校准点4",
		modelX: -3.9125294271554765,
		modelY: 19.068050175905196,
		modelZ: 176.27897770367957,
		lat: 31.240478,
		lon: 121.483794
	},
	{
		name: "校准点5",
		modelX: -292.64232281821876,
		modelY: 19.06805017590515,
		modelZ: 403.9310224900924,
		lat: 31.238495,
		lon: 121.487661
	},
	{
		name: "校准点6",
		modelX: -288.3651172141807,
		modelY: 19.0680501759052,
		modelZ: 160.30996285669252,
		lat: 31.237553,
		lon: 121.484886
	}
]

// 仿射变换校准（基于Java GeoUtil的算法，与CoordinateCalibration.vue完全一致）
const calculateAffineTransformation = (points: any[]) => {
	console.log('🧮 开始动态计算仿射变换系数...')
	console.log('校准点数据分析:')
	points.forEach((p, i) => {
		console.log(`点${i+1}: 模型(${p.modelX.toFixed(2)}, ${p.modelZ.toFixed(2)}) -> 经纬度(${p.lat}, ${p.lon})`)
	})
	
	// 分析坐标范围，确定正确的映射关系
	const xRange = Math.max(...points.map(p => p.modelX)) - Math.min(...points.map(p => p.modelX))
	const zRange = Math.max(...points.map(p => p.modelZ)) - Math.min(...points.map(p => p.modelZ))
	const latRange = Math.max(...points.map(p => p.lat!)) - Math.min(...points.map(p => p.lat!))
	const lonRange = Math.max(...points.map(p => p.lon!)) - Math.min(...points.map(p => p.lon!))
	
	console.log(`坐标范围分析: X=${xRange.toFixed(2)}, Z=${zRange.toFixed(2)}, Lat=${latRange.toFixed(6)}, Lon=${lonRange.toFixed(6)}`)
	
	// 分析坐标轴对应关系
	// 计算每个轴与经纬度的相关性
	const xLonCorr = calculateCorrelation(points.map(p => p.modelX), points.map(p => p.lon!))
	const xLatCorr = calculateCorrelation(points.map(p => p.modelX), points.map(p => p.lat!))
	const zLonCorr = calculateCorrelation(points.map(p => p.modelZ), points.map(p => p.lon!))
	const zLatCorr = calculateCorrelation(points.map(p => p.modelZ), points.map(p => p.lat!))
	
	console.log(`相关性分析:`)
	console.log(`X-经度相关性: ${xLonCorr.toFixed(4)}, X-纬度相关性: ${xLatCorr.toFixed(4)}`)
	console.log(`Z-经度相关性: ${zLonCorr.toFixed(4)}, Z-纬度相关性: ${zLatCorr.toFixed(4)}`)
	
	// 根据相关性确定最佳映射
	let useXForLon = Math.abs(xLonCorr) > Math.abs(zLonCorr)
	let useZForLat = Math.abs(zLatCorr) > Math.abs(xLatCorr)
	
	console.log(`建议映射: X轴->${useXForLon ? '经度' : '纬度'}, Z轴->${useZForLat ? '纬度' : '经度'}`)
	
	// 注意：对于仿射变换，我们总是使用标准形式 [x, z, 1]
	// 相关性分析主要用于诊断，实际的映射关系由仿射变换系数自动确定
	console.log('使用标准仿射变换形式: lat = a1*x + b1*z + c1, lon = a2*x + b2*z + c2')
	
	// 构建系数矩阵 A = [x, z, 1]
	const A = points.map(p => [p.modelX, p.modelZ, 1])
	
	// 目标向量
	const latVector = points.map(p => p.lat!)
	const lonVector = points.map(p => p.lon!)
	
	try {
		// 计算 (A^T * A)^(-1) * A^T （最小二乘法）
		const At = transposeMatrix(A)
		const AtA = multiplyMatrix(At, A)
		const AtA_inv = invertMatrix(AtA)
		const pseudoInverse = multiplyMatrix(AtA_inv, At)
		
		// 计算仿射变换系数
		const latCoeffs = multiplyMatrix(pseudoInverse, latVector.map(v => [v])).map(row => row[0])
		const lonCoeffs = multiplyMatrix(pseudoInverse, lonVector.map(v => [v])).map(row => row[0])
		
		const result = {
			// lat = a1 * x + b1 * z + c1
			a1: latCoeffs[0], b1: latCoeffs[1], c1: latCoeffs[2],
			// lon = a2 * x + b2 * z + c2  
			a2: lonCoeffs[0], b2: lonCoeffs[1], c2: lonCoeffs[2]
		}
		
		console.log('✅ 动态计算的仿射变换系数:', result)
		
		// 验证系数的合理性
		const det = result.a1 * result.b2 - result.a2 * result.b1
		console.log(`变换矩阵行列式: ${det}`)
		
		if (Math.abs(det) < 1e-15) {
			throw new Error('变换矩阵奇异，行列式接近零')
		}
		
		return result
		
	} catch (error) {
		console.error('❌ 仿射变换计算失败:', error)
		throw error
	}
}

// 校准数据 - 保留用于地理坐标转换（如果需要）
const calibrationData = {
	// 地理坐标范围（可选，用于地理坐标转换）
	geoBounds: {
		minLat: 31.237553,
		maxLat: 31.244036,
		minLon: 121.483794,
		maxLon: 121.491427
	},
	// 模型坐标边界（向后兼容，可能从校准文件加载）
	modelBounds: {
		minX: -292.64232281821876,
		maxX: 106.19976971292328,
		minY: 19.068050175905064,
		maxY: 19.66554549619716,
		minZ: 160.30996285669252,
		maxZ: 812.9764577390581
	},
	// 仿射变换系数（动态计算）
	affineCoeffs: null as any,
	// 转换方法标识
	method: 'affine' // 'geometry' 使用几何体边界, 'calibration' 使用校准边界, 'affine' 使用仿射变换
}

// 初始化仿射变换系数（使用默认校准点动态计算）
const initializeAffineCoeffs = () => {
	try {
		console.log('🚀 开始初始化仿射变换系数...')
		
		// 使用默认校准点计算仿射变换系数
		const affineCoeffs = calculateAffineTransformation(defaultCalibrationPoints)
		
		// 更新校准数据
		calibrationData.affineCoeffs = affineCoeffs
		calibrationData.method = 'affine'
		
		// 计算并更新边界
		const validPoints = defaultCalibrationPoints.filter(p => p.lat != null && p.lon != null)
		
		calibrationData.modelBounds = {
			minX: Math.min(...validPoints.map(p => p.modelX)),
			maxX: Math.max(...validPoints.map(p => p.modelX)),
			minY: Math.min(...validPoints.map(p => p.modelY)),
			maxY: Math.max(...validPoints.map(p => p.modelY)),
			minZ: Math.min(...validPoints.map(p => p.modelZ)),
			maxZ: Math.max(...validPoints.map(p => p.modelZ))
		}
		
		calibrationData.geoBounds = {
			minLat: Math.min(...validPoints.map(p => p.lat!)),
			maxLat: Math.max(...validPoints.map(p => p.lat!)),
			minLon: Math.min(...validPoints.map(p => p.lon!)),
			maxLon: Math.max(...validPoints.map(p => p.lon!))
		}
		
		console.log('✅ 仿射变换系数初始化完成')
		console.log('📊 最终系数:', calibrationData.affineCoeffs)
		
		return true
	} catch (error) {
		console.error('❌ 初始化仿射变换系数失败:', error)
		console.log('🔄 回退到线性插值模式')
		calibrationData.method = 'calibration'
		return false
	}
}

// 获取当前使用的模型边界数据
const getCurrentModelBounds = () => {
	if (calibrationData.method === 'geometry' && geometryBounds.isCalculated) {
		return geometryBounds.modelBounds
	} else {
		// 使用校准边界或仿射变换边界
		return calibrationData.modelBounds
	}
}

// 切换坐标系统方法
const switchCoordinateMethod = (method: 'geometry' | 'calibration' | 'affine') => {
	calibrationData.method = method
	console.log(`🔄 切换坐标系统为: ${method}`)
	
	if (method === 'geometry' && !geometryBounds.isCalculated) {
		console.warn('⚠️ 几何体边界未计算，请先加载模型')
		return false
	}
	
	// 重新测试坐标转换
	if (geometryBounds.isCalculated || method !== 'geometry') {
		testGeometryBoundsConversion()
	}
	
	return true
}

// 计算几何体边界框
const calculateGeometryBounds = async (cityModel: any) => {
	console.log('🔍 开始计算几何体边界框...')
	
	if (!cityModel || !cityModel.city || !cityModel.land) {
		console.warn('⚠️ 城市模型数据不完整，无法计算边界框')
		return false
	}
	
	try {
		// 导入 Three.js 的 Box3
		const { Box3 } = await import('three')
		
		// 创建边界框
		const boundingBox = new Box3()
		
		// 计算城市建筑的边界
		if (cityModel.city && cityModel.city.geometry) {
			const cityGeometry = cityModel.city.geometry.clone()
			if (cityModel.city.matrix) {
				cityGeometry.applyMatrix4(cityModel.city.matrix)
			}
			cityGeometry.computeBoundingBox()
			if (cityGeometry.boundingBox) {
				boundingBox.union(cityGeometry.boundingBox)
				console.log('✅ 已添加城市建筑边界')
			}
		}
		
		// 计算地面的边界
		if (cityModel.land && cityModel.land.geometry) {
			const landGeometry = cityModel.land.geometry.clone()
			if (cityModel.land.matrix) {
				landGeometry.applyMatrix4(cityModel.land.matrix)
			}
			landGeometry.computeBoundingBox()
			if (landGeometry.boundingBox) {
				boundingBox.union(landGeometry.boundingBox)
				console.log('✅ 已添加地面边界')
			}
		}
		
		// 如果有道路数据也包含进来
		if (cityModel.roads && cityModel.roads.geometry) {
			const roadsGeometry = cityModel.roads.geometry.clone()
			if (cityModel.roads.matrix) {
				roadsGeometry.applyMatrix4(cityModel.roads.matrix)
			}
			roadsGeometry.computeBoundingBox()
			if (roadsGeometry.boundingBox) {
				boundingBox.union(roadsGeometry.boundingBox)
				console.log('✅ 已添加道路边界')
			}
		}
		
		// 更新几何体边界数据
		geometryBounds.modelBounds = {
			minX: boundingBox.min.x,
			maxX: boundingBox.max.x,
			minY: boundingBox.min.y,
			maxY: boundingBox.max.y,
			minZ: boundingBox.min.z,
			maxZ: boundingBox.max.z
		}
		
		geometryBounds.isCalculated = true
		geometryBounds.calculatedAt = new Date()
		
		// 输出计算结果
		console.log('📐 几何体边界框计算完成:')
		console.log(`  X轴: ${geometryBounds.modelBounds.minX.toFixed(2)} ~ ${geometryBounds.modelBounds.maxX.toFixed(2)} (范围: ${(geometryBounds.modelBounds.maxX - geometryBounds.modelBounds.minX).toFixed(2)})`)
		console.log(`  Y轴: ${geometryBounds.modelBounds.minY.toFixed(2)} ~ ${geometryBounds.modelBounds.maxY.toFixed(2)} (范围: ${(geometryBounds.modelBounds.maxY - geometryBounds.modelBounds.minY).toFixed(2)})`)
		console.log(`  Z轴: ${geometryBounds.modelBounds.minZ.toFixed(2)} ~ ${geometryBounds.modelBounds.maxZ.toFixed(2)} (范围: ${(geometryBounds.modelBounds.maxZ - geometryBounds.modelBounds.minZ).toFixed(2)})`)
		
		return true
	} catch (error) {
		console.error('❌ 计算几何体边界框失败:', error)
		return false
	}
}

// 验证仿射变换的准确性
const validateAffineTransformation = () => {
	if (calibrationData.method !== 'affine' || !calibrationData.affineCoeffs) {
		console.log('当前未使用仿射变换，使用几何体边界')
		return
	}
	
	console.log('=== 仿射变换验证 ===')
	
	// 使用校准数据中的已知点进行验证
	const testPoints = [
		{ modelX: -72.40295394451705, modelZ: 812.9764577390581, lat: 31.242242, lon: 121.491427, name: '校准点1' },
		{ modelX: 106.19976971292328, modelZ: 796.4236809332394, lat: 31.244036, lon: 121.490378, name: '校准点2' },
		{ modelX: -71.62023352807236, modelZ: 411.37663393355365, lat: 31.240711, lon: 121.486782, name: '校准点3' }
	]
	
	testPoints.forEach(point => {
		// 正向转换：模型坐标 -> 经纬度
		const predicted = modelCoordsToLatLon(point.modelX, point.modelZ)
		const latError = Math.abs(predicted.lat - point.lat) * 111000 // 转换为米
		const lonError = Math.abs(predicted.lon - point.lon) * 111000 * Math.cos(point.lat * Math.PI / 180)
		const totalError = Math.sqrt(latError * latError + lonError * lonError)
		
		console.log(`${point.name}:`)
		console.log(`  模型坐标: (${point.modelX.toFixed(2)}, ${point.modelZ.toFixed(2)})`)
		console.log(`  实际经纬度: (${point.lat}, ${point.lon})`)
		console.log(`  预测经纬度: (${predicted.lat.toFixed(6)}, ${predicted.lon.toFixed(6)})`)
		console.log(`  误差: ${totalError.toFixed(2)}米`)
		
		// 反向转换：经纬度 -> 模型坐标
		const reversePredicted = latLonToModelCoords(point.lat, point.lon)
		const xError = Math.abs(reversePredicted.x - point.modelX)
		const zError = Math.abs(reversePredicted.z - point.modelZ)
		const reverseError = Math.sqrt(xError * xError + zError * zError)
		
		console.log(`  反向预测模型坐标: (${reversePredicted.x.toFixed(2)}, ${reversePredicted.z.toFixed(2)})`)
		console.log(`  反向误差: ${reverseError.toFixed(2)}模型单位`)
		console.log('---')
	})
}

// 验证热力图坐标转换
const validateHeatmapTransformation = () => {
	console.log('=== 热力图坐标转换验证 ===')
	
	// 测试用户提到的具体坐标
	const userTestPoint = { lat: 31.2382, lon: 121.486697, name: '用户测试点' }
	
	const testPoints = [
		userTestPoint,
		{ lat: 31.242242, lon: 121.491427, name: '校准点1（应该在右上）' },
		{ lat: 31.237553, lon: 121.483794, name: '校准点6（应该在左下）' },
		{ lat: 31.240711, lon: 121.486782, name: '校准点3（应该在中部）' }
	]
	
	const canvasSize = getHeatmapCanvasSize()
	
	// ✅ 获取与渲染一致的边界框
	const bounds = (heatmapGeometryInfo.value as any)?.transformedBounds ?? getCurrentModelBounds()
	
	testPoints.forEach(point => {
		// 完整转换链：经纬度 -> 模型坐标 -> 热力图坐标
		const modelCoords = latLonToModelCoords(point.lat, point.lon)
		// ✅ 修复传参顺序：第3个参数是bounds
		const heatmapCoords = modelCoordsToHeatmapCoords(modelCoords.x, modelCoords.z, bounds, canvasSize.width, canvasSize.height)
		
		// 计算在校准范围内的相对位置
		const latRatio = (point.lat - calibrationData.geoBounds.minLat) / 
						 (calibrationData.geoBounds.maxLat - calibrationData.geoBounds.minLat)
		const lonRatio = (point.lon - calibrationData.geoBounds.minLon) / 
						 (calibrationData.geoBounds.maxLon - calibrationData.geoBounds.minLon)
		
		console.log(`${point.name}:`)
		console.log(`  经纬度: (${point.lat}, ${point.lon})`)
		console.log(`  地理相对位置: 纬度${(latRatio*100).toFixed(1)}%, 经度${(lonRatio*100).toFixed(1)}%`)
		console.log(`  模型坐标: (${modelCoords.x.toFixed(2)}, ${modelCoords.z.toFixed(2)})`)
		console.log(`  热力图坐标: (${(heatmapCoords as any).x}, ${(heatmapCoords as any).y})`)
		console.log(`  期望热力图位置: X=${(lonRatio*canvasSize.width).toFixed(1)}, Y=${(canvasSize.height - latRatio*canvasSize.height).toFixed(1)}`)
		console.log('---')
	})
	
	// 验证校准边界点应该映射到热力图的四个角
	console.log('校准边界验证（应该映射到热力图四角）:')
	const corners = [
		{ lat: calibrationData.geoBounds.maxLat, lon: calibrationData.geoBounds.maxLon, name: '东北角 -> (250,0)' },
		{ lat: calibrationData.geoBounds.maxLat, lon: calibrationData.geoBounds.minLon, name: '西北角 -> (0,0)' },
		{ lat: calibrationData.geoBounds.minLat, lon: calibrationData.geoBounds.maxLon, name: '东南角 -> (250,250)' },
		{ lat: calibrationData.geoBounds.minLat, lon: calibrationData.geoBounds.minLon, name: '西南角 -> (0,250)' }
	]
	
	corners.forEach(corner => {
		// ✅ 修复传参顺序：第3个参数是bounds
		const heatmapCoords = latLonToHeatmapCoords(corner.lat, corner.lon, bounds, canvasSize.width, canvasSize.height)
		console.log(`${corner.name}: 实际(${(heatmapCoords as any).x}, ${(heatmapCoords as any).y})`)
	})
}

// 加载校准数据（从导出的JSON文件）
const loadCalibrationData = async () => {
	try {
		// 这里可以从文件或API加载校准数据
		// 示例：从本地JSON文件加载
		const response = await fetch('/src/tools/fbx-coordinate-calibration-2025-08-08.json')
		const data = await response.json()
		
		if (data.transformationMatrix && data.transformationMatrix.affineCoeffs) {
			calibrationData.affineCoeffs = data.transformationMatrix.affineCoeffs
			calibrationData.method = 'affine'
			calibrationData.modelBounds = data.modelBounds
			calibrationData.geoBounds = data.geoBounds
			
			console.log('已加载仿射变换校准数据:', calibrationData.affineCoeffs)
			console.log(`校准精度: 平均误差=${data.transformationMatrix.averageError.toFixed(2)}米`)
		} else {
			console.log('使用默认线性插值转换')
		}
	} catch (error) {
		console.warn('加载校准数据失败，使用默认线性插值:', error)
	}
}

// 创建统一UV坐标的热力图几何体（自动计算变换后边界框）
const createHeatmapGeometryInfo = () => {
	if (!cityFBX.value) {
		console.warn('城市模型未加载完成')
		return null
	}
	
	try {
		console.log('🔄 创建统一UV坐标的热力图几何体...')
		
		// 几何体创建函数内部会自动计算变换后的边界框
		const geometryInfo = createUnifiedHeatmapGeometry(cityFBX.value)
		console.log('✅ 统一热力图几何体创建成功')
		console.log('几何体信息:', geometryInfo)
		console.log('变换后边界框:', (geometryInfo as any).transformedBounds)
		return geometryInfo
	} catch (error) {
		console.error('创建统一热力图几何体失败:', error)
		return null
	}
}

// 经纬度转模型坐标（支持仿射变换和线性插值）
const latLonToModelCoords = (lat: number, lon: number) => {
	if (calibrationData.method === 'affine' && calibrationData.affineCoeffs) {
		// 使用仿射变换逆运算
		const coeffs = calibrationData.affineCoeffs
		const det = coeffs.a1 * coeffs.b2 - coeffs.a2 * coeffs.b1
		
		if (Math.abs(det) < 1e-10) {
			console.warn('仿射变换矩阵奇异，回退到线性插值')
			return latLonToModelCoordsLinear(lat, lon)
		}
		
		// 逆变换公式：基于JSON文件中的transformationCode
		const latDiff = lat - coeffs.c1
		const lonDiff = lon - coeffs.c2
		
		const x = (latDiff * coeffs.b2 - lonDiff * coeffs.b1) / det
		const z = (lonDiff * coeffs.a1 - latDiff * coeffs.a2) / det
		
		return { x, y: 0, z }
	} else {
		// 使用线性插值
		return latLonToModelCoordsLinear(lat, lon)
	}
}

// 线性插值转换（备用方法）
const latLonToModelCoordsLinear = (lat: number, lon: number) => {
	const bounds = getCurrentModelBounds()
	
	const x = (lon - calibrationData.geoBounds.minLon) / 
			  (calibrationData.geoBounds.maxLon - calibrationData.geoBounds.minLon) * 
			  (bounds.maxX - bounds.minX) + 
			  bounds.minX
	
	const z = (lat - calibrationData.geoBounds.minLat) / 
			  (calibrationData.geoBounds.maxLat - calibrationData.geoBounds.minLat) * 
			  (bounds.maxZ - bounds.minZ) + 
			  bounds.minZ
	
	return { x, y: 0, z }
}

// 模型坐标转经纬度（支持仿射变换和线性插值）
const modelCoordsToLatLon = (x: number, z: number) => {
	if (calibrationData.method === 'affine' && calibrationData.affineCoeffs) {
		// 使用仿射变换
		const coeffs = calibrationData.affineCoeffs
		const lat = coeffs.a1 * x + coeffs.b1 * z + coeffs.c1
		const lon = coeffs.a2 * x + coeffs.b2 * z + coeffs.c2
		return { lat, lon }
	} else {
		// 使用线性插值
		const bounds = getCurrentModelBounds()
		
		const lon = (x - bounds.minX) / 
					(bounds.maxX - bounds.minX) * 
					(calibrationData.geoBounds.maxLon - calibrationData.geoBounds.minLon) + 
					calibrationData.geoBounds.minLon
		
		const lat = (z - bounds.minZ) / 
					(bounds.maxZ - bounds.minZ) * 
					(calibrationData.geoBounds.maxLat - calibrationData.geoBounds.minLat) + 
					calibrationData.geoBounds.minLat
		
		return { lat, lon }
	}
}

// 获取热力图实际尺寸（同步版本，用于模板和立即获取）
const getHeatmapCanvasSize = () => {
	const canvasInfo = validateHeatmapCanvas()
	return { width: canvasInfo.width, height: canvasInfo.height }
}

// 获取热力图实际尺寸（异步版本，带重试机制）
const getHeatmapCanvasSizeAsync = async (retryCount = 0) => {
	const canvasInfo = validateHeatmapCanvas(retryCount === 0) // 只在第一次尝试时显示详细信息
	
	// 如果没有找到canvas且重试次数少于3次，等待一段时间后重试
	if (!canvasInfo.found && retryCount < 3) {
		console.log(`🔄 第${retryCount + 1}次尝试未找到热力图canvas，等待500ms后重试...`)
		await new Promise(resolve => setTimeout(resolve, 500))
		return getHeatmapCanvasSizeAsync(retryCount + 1)
	}
	
	if (canvasInfo.found) {
		console.log(`✅ 成功获取热力图尺寸: ${canvasInfo.width} x ${canvasInfo.height}`)
	} else {
		console.log(`⚠️ 使用默认热力图尺寸: ${canvasInfo.width} x ${canvasInfo.height}`)
	}
	
	return { width: canvasInfo.width, height: canvasInfo.height }
}

// 统一的坐标转换函数（基于XZ→UV映射）
const modelCoordsToHeatmapCoords = (modelX: number, modelZ: number, modelBounds: any, canvasWidth?: number, canvasHeight?: number) => {
	try {
		// 用于第一段：生成 2D 画布像素点
		const { u, v } = xzToUV(modelX, modelZ, modelBounds)
		const x = u * (canvasWidth || 250)
		const y = v * (canvasHeight || 250)  // ✅ 不再 1 - v，因为xzToUV已经处理了翻转
		
		console.log(`统一坐标转换: 模型(${modelX.toFixed(2)}, ${modelZ.toFixed(2)}) → UV(${u.toFixed(4)}, ${v.toFixed(4)}) → 像素(${Math.floor(x)}, ${Math.floor(y)})`)
		
		return {
			x: Math.floor(Math.max(0, Math.min((canvasWidth || 250) - 1, x))),
			y: Math.floor(Math.max(0, Math.min((canvasHeight || 250) - 1, y)))
		}
	} catch (error) {
		console.error('统一坐标转换失败:', error)
		// 回退到简单的线性映射
		const bounds = modelBounds || getCurrentModelBounds()
		const xRatio = (modelX - bounds.minX) / (bounds.maxX - bounds.minX)
		const zRatio = (modelZ - bounds.minZ) / (bounds.maxZ - bounds.minZ)
		const width = canvasWidth || 250
		const height = canvasHeight || 250
		const x = xRatio * width
		const y = height - (zRatio * height)
		console.warn('回退到简单线性映射')
		return { x: Math.floor(x), y: Math.floor(y) }
	}
}

// 经纬度直接转热力图坐标（组合函数）
const latLonToHeatmapCoords = (lat: number, lon: number, modelBounds: any, canvasWidth?: number, canvasHeight?: number) => {
	const modelCoords = latLonToModelCoords(lat, lon)
	return modelCoordsToHeatmapCoords(modelCoords.x, modelCoords.z, modelBounds, canvasWidth, canvasHeight)
}

// 验证热力图画布尺寸
const validateHeatmapCanvas = (verbose = false) => {
	if (verbose) console.log('\n🔍 验证热力图画布状态...')
	
	try {
		// 根据 utils.js 中的实现，热力图canvas是通过 createElement("heatmap-canvas") 创建的
		const heatmapContainer = document.querySelector('heatmap-canvas')
		
		if (heatmapContainer) {
			if (verbose) console.log(`✅ 找到热力图容器: heatmap-canvas`)
			
			// 查找容器内的canvas元素
			const canvas = heatmapContainer.querySelector('canvas')
			if (canvas) {
				if (verbose) {
					console.log(`📐 画布信息:`)
					console.log(`  • 元素尺寸: ${canvas.clientWidth} x ${canvas.clientHeight}`)
					console.log(`  • 画布尺寸: ${canvas.width} x ${canvas.height}`)
					console.log(`  • 样式尺寸: ${canvas.style.width} x ${canvas.style.height}`)
				}
				
				return {
					found: true,
					width: canvas.width || 250,
					height: canvas.height || 250,
					element: canvas
				}
			} else {
				if (verbose) console.warn('⚠️ 找到热力图容器但没有canvas子元素')
			}
		}
		
		// 备用方案：检查所有canvas元素，寻找可能的热力图canvas
		if (verbose) console.log('🔍 备用方案：检查所有canvas元素...')
		const allCanvases = document.querySelectorAll('canvas')
		
		if (allCanvases.length > 0) {
			if (verbose) console.log(`找到 ${allCanvases.length} 个canvas元素:`)
			for (let i = 0; i < allCanvases.length; i++) {
				const canvas = allCanvases[i]
				const parent = canvas.parentElement
				const parentTag = parent ? parent.tagName.toLowerCase() : 'unknown'
				if (verbose) console.log(`  Canvas ${i + 1}: 父元素=${parentTag}, 尺寸=${canvas.width}x${canvas.height}, class="${canvas.className || '(无)'}"`)
				
				// 如果父元素是 heatmap-canvas，这很可能就是我们要找的
				if (parentTag === 'heatmap-canvas') {
					if (verbose) console.log(`✅ 通过父元素找到热力图canvas`)
					return {
						found: true,
						width: canvas.width || 250,
						height: canvas.height || 250,
						element: canvas
					}
				}
			}
		}
		
		if (verbose) console.warn('⚠️ 未找到热力图画布元素，使用默认尺寸')
		return {
			found: false,
			width: 250,
			height: 250,
			element: null
		}
		
	} catch (error) {
		if (verbose) console.error('验证热力图画布时出错:', error)
		return {
			found: false,
			width: 250,
			height: 250,
			element: null
		}
	}
}




// 可视化选项
const showDensityHeatmap = ref(true)
const showSpeedVectors = ref(false)
const showBottlenecks = ref(false)
const showEvacuationRoutes = ref(false)
const isRealTimeUpdate = ref(true)

// 事件选择
const selectedEvent = ref('')
const startTime = ref('08:00')
const endTime = ref('08:20')

// 面板状态
const activePanel = ref('parameters')

// 仿真参数设置
const simulationParams = reactive({
	modelName: 'NanJingDong',
	startTime: '2025-05-31T15:30',
	stopDate: '2025-05-31T15:50',
	realTimeScale: 1000,
	simulTargetTime: '2025-05-31T15:30',
	runId: '',
	description: '测试仿真'
})

// 参数验证状态
const isParamsValid = computed(() => {
	return simulationParams.modelName.trim() !== '' &&
		   simulationParams.startTime !== '' &&
		   simulationParams.stopDate !== '' &&
		   simulationParams.realTimeScale > 0 &&
		   simulationParams.simulTargetTime !== ''
})

// 仿真启动状态
const isStartingSimulation = ref(false)

// 预防措施参数设置
const preventionParams = reactive({
	waitTimeMax: '',
	simulTargetTime: '',
	FEastProbs: '',
	FNorthProbs: '',
	FSouthProbs: '',
	FWestProbs: '',
	LEastProbs: '',
	LNorthProbs: '',
	LSouthProbs: '',
	LWestProbs: ''
})

// 仿真信息
const simulationInfo = reactive({
	experimentId: 'SIM_20241214_001',
	startTime: '08:00',
	endTime: '08:20',
	totalDuration: '20分钟',
	dataInterval: '2分钟'
})

// 时间点数据
const timePoints = ref([
	{ value: 0, label: '08:00 (0分钟)' },
	{ value: 1, label: '08:02 (2分钟)' },
	{ value: 2, label: '08:04 (4分钟)' },
	{ value: 3, label: '08:06 (6分钟)' },
	{ value: 4, label: '08:08 (8分钟)' },
	{ value: 5, label: '08:10 (10分钟)' },
	{ value: 6, label: '08:12 (12分钟)' },
	{ value: 7, label: '08:14 (14分钟)' },
	{ value: 8, label: '08:16 (16分钟)' },
	{ value: 9, label: '08:18 (18分钟)' },
	{ value: 10, label: '08:20 (20分钟)' }
])

// 选中的时间点
const selectedTimePoint = ref<number | null>(null)
const timeProgress = ref(0)

// 播放速度
const playbackSpeed = ref(1.0)

// 仿真状态
const simulationStatus = reactive({
	status: 'ready', // ready, playing, paused, completed
	statusText: '就绪',
	isPlaying: false,
	currentTimePoint: '08:00',
	dataPointCount: 0,
	heatmapIntensity: '中等'
})


// 视角模式 - 初始化为固定模式
const viewMode = ref('fixed') // 'fixed' | 'free'

// 相机设置 - 初始化为固定视角的最佳参数
const cameraSettings = reactive({
	position: {
		x: -141.98630698496282,
		y: 1134.0416010330255,
		z: 310.9654273060678
	},
	rotation: {
		x: -1.5707963765578337,
		y: -9.989167108483407e-7,
		z: -1.620572080414084,
	}
})

// 渲染设置
const renderSettings = reactive({
	antialiasing: true,
	quality: 1.0
})

// 建筑物状态
const buildingState = reactive({
	opacity: 0.9
})

// 建筑物线条状态
const buildingsLinesState = reactive({
	width: 1.0,
	color: '#000',
	opacity: 1.0,
	show: true
})

// 仿真可视化状态
const showHeatmap = ref(false)
const showLines = ref(true)

// 热力图状态管理
const heatmapState = reactive({
	isTransitioning: false
})

// 热力图几何体信息（使用共享工具函数创建）
const heatmapGeometryInfo = ref<any>(null)

// 调试坐标转换
const debugCoords = reactive({
	testLat: 31.240000,  // 默认测试纬度
	testLon: 121.485000, // 默认测试经度
	results: null as any
})

// 测试坐标转换系统
const testGeometryBoundsConversion = () => {
	console.log(`\n🧪 === ${calibrationData.method.toUpperCase()} 坐标转换测试 ===`)
	
	const canvasSize = getHeatmapCanvasSize()
	console.log(`热力图画布尺寸: ${canvasSize.width} x ${canvasSize.height}`)
	
	// ✅ 与渲染保持一致，使用 transformedBounds
	const bounds = (heatmapGeometryInfo.value as any)?.transformedBounds ?? getCurrentModelBounds()
	console.log(`使用边界框: X(${bounds.minX.toFixed(2)}~${bounds.maxX.toFixed(2)}), Z(${bounds.minZ.toFixed(2)}~${bounds.maxZ.toFixed(2)})`)
	
	// 测试边界点
	const testPoints = [
		{ name: '左下角', x: bounds.minX, z: bounds.minZ, expectedX: 0, expectedY: canvasSize.height },
		{ name: '右下角', x: bounds.maxX, z: bounds.minZ, expectedX: canvasSize.width, expectedY: canvasSize.height },
		{ name: '左上角', x: bounds.minX, z: bounds.maxZ, expectedX: 0, expectedY: 0 },
		{ name: '右上角', x: bounds.maxX, z: bounds.maxZ, expectedX: canvasSize.width, expectedY: 0 },
		{ name: '中心点', x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2, expectedX: canvasSize.width / 2, expectedY: canvasSize.height / 2 }
	]
	
	let allMatched = true
	
	testPoints.forEach(point => {
		// ✅ 修复传参顺序：第3个参数是bounds
		const heatmapCoords = modelCoordsToHeatmapCoords(point.x, point.z, bounds, canvasSize.width, canvasSize.height)
		
		console.log(`${point.name}:`)
		console.log(`  模型坐标: (${point.x.toFixed(2)}, ${point.z.toFixed(2)})`)
		console.log(`  热力图坐标: (${(heatmapCoords as any).x}, ${(heatmapCoords as any).y})`)
		console.log(`  期望坐标: (${point.expectedX}, ${point.expectedY})`)
		
		const isMatched = Math.abs((heatmapCoords as any).x - point.expectedX) <= 1 && Math.abs((heatmapCoords as any).y - point.expectedY) <= 1
		console.log(`  坐标匹配: ${isMatched ? '✅' : '❌'}`)
		
		if (!isMatched) {
			allMatched = false
			const xError = Math.abs((heatmapCoords as any).x - point.expectedX)
			const yError = Math.abs((heatmapCoords as any).y - point.expectedY)
			console.log(`  误差: X=${xError}, Y=${yError}`)
		}
		console.log('---')
	})
	
	console.log(`🧪 ${calibrationData.method.toUpperCase()} 坐标转换测试完成 - ${allMatched ? '✅ 全部匹配' : '❌ 存在误差'}\n`)
	
	if (!allMatched && calibrationData.method === 'geometry') {
		console.log('💡 建议: 几何体边界可能不适合热力图，尝试切换到校准边界')
		console.log('   执行: switchCoordinateMethod("calibration")')
	}
	
	return allMatched
}

// 诊断热力图数据问题
const diagnoseHeatmapData = () => {
	console.log('\n🔍 === 热力图数据诊断 ===')
	
	if (!heatmapData.value || !heatmapData.value.data || heatmapData.value.data.length === 0) {
		console.error('❌ 问题: 热力图数据为空')
		console.log('💡 建议: 检查后端数据是否正确返回')
		return
	}
	
	const data = heatmapData.value.data
	const canvasSize = getHeatmapCanvasSize()
	
	console.log(`📊 数据概览:`)
	console.log(`  • 数据点数量: ${data.length}`)
	console.log(`  • 热力图配置: max=${heatmapData.value.max}, min=${heatmapData.value.min}`)
	console.log(`  • 画布尺寸: ${canvasSize.width} x ${canvasSize.height}`)
	
	// 分析坐标分布
	const xCoords = data.map(d => d.x)
	const yCoords = data.map(d => d.y)
	const values = data.map(d => d.value)
	
	const xMin = Math.min(...xCoords)
	const xMax = Math.max(...xCoords)
	const yMin = Math.min(...yCoords)
	const yMax = Math.max(...yCoords)
	const valueMin = Math.min(...values)
	const valueMax = Math.max(...values)
	
	console.log(`📐 坐标分布:`)
	console.log(`  • X范围: ${xMin} ~ ${xMax} (画布: 0 ~ ${canvasSize.width})`)
	console.log(`  • Y范围: ${yMin} ~ ${yMax} (画布: 0 ~ ${canvasSize.height})`)
	console.log(`  • 热力值范围: ${valueMin.toFixed(2)} ~ ${valueMax.toFixed(2)}`)
	
	// 检查问题
	const inCanvasCount = data.filter(d => d.x >= 0 && d.x < canvasSize.width && d.y >= 0 && d.y < canvasSize.height).length
	const outCanvasCount = data.length - inCanvasCount
	
	console.log(`🎯 数据质量:`)
	console.log(`  • 画布内点数: ${inCanvasCount} (${(inCanvasCount/data.length*100).toFixed(1)}%)`)
	console.log(`  • 画布外点数: ${outCanvasCount} (${(outCanvasCount/data.length*100).toFixed(1)}%)`)
	
	// 诊断问题
	if (outCanvasCount > data.length * 0.5) {
		console.error('❌ 严重问题: 超过50%的数据点在画布外')
		console.log('💡 可能原因: 坐标转换系统不匹配')
		console.log('💡 建议: 尝试切换坐标系统 (校准边界 ↔ 几何体边界 ↔ 仿射变换)')
	} else if (outCanvasCount > 0) {
		console.warn('⚠️ 轻微问题: 部分数据点在画布外')
		console.log('💡 建议: 检查数据范围是否超出校准区域')
	}
	
	if (valueMax === valueMin) {
		console.warn('⚠️ 问题: 所有热力值相同，热力图可能显示单一颜色')
		console.log('💡 建议: 检查热力值计算逻辑')
	}
	
	if (data.length < 10) {
		console.warn('⚠️ 问题: 数据点数量过少，热力图可能不够丰富')
		console.log('💡 建议: 检查数据聚合逻辑或增加数据源')
	}
	
	console.log('🔍 热力图数据诊断完成\n')
}

// 切换热力图显示
const toggleHeatmap = async () => {
	if (heatmapState.isTransitioning) {
		return
	}
	
	try {
		heatmapState.isTransitioning = true
		
		if (showHeatmap.value) {
			// 关闭热力图
			showHeatmap.value = false
			
			// 等待 DOM 更新完成，确保组件完全卸载
			await nextTick()
			
			// 清理热力图对象
			cleanupHeatmapObjects()
			
			console.log('热力图已关闭')
		} else {
			// 开启热力图
			showHeatmap.value = true
			console.log('热力图已开启')
		}
	} catch (error) {
		console.error('热力图切换失败:', error)
		showHeatmap.value = false
		cleanupHeatmapObjects()
	} finally {
		heatmapState.isTransitioning = false
	}
}

// 清理热力图对象
const cleanupHeatmapObjects = () => {
	try {
		console.log('开始清理热力图对象...')
		console.log('tcRef.value:', tcRef.value)
		
		if (tcRef.value && tcRef.value.context) {
			console.log('TresCanvas 上下文:', tcRef.value.context)
			
			// 正确访问 TresCanvas 的上下文
			const scene = tcRef.value.context.scene?.value || tcRef.value.context.scene
			console.log('Scene 对象:', scene)
			
			if (scene && typeof scene.traverse === 'function') {
				const objectsToRemove: any[] = []
				scene.traverse((child: any) => {
					// 检查是否是热力图相关的对象
					if (child.userData && child.userData.isHeatmap) {
						objectsToRemove.push(child)
					}
					// 检查是否是道路对象
					if (child.name && (child.name.includes('ROAD') || child.name.includes('road'))) {
						objectsToRemove.push(child)
					}
					// 检查是否是热力图网格对象
					if (child.material && child.material.uniforms && child.material.uniforms.heightMap) {
						objectsToRemove.push(child)
					}
				})
				
				// 移除找到的对象
				objectsToRemove.forEach(obj => {
					if (obj.geometry) {
						obj.geometry.dispose()
					}
					if (obj.material) {
						if (Array.isArray(obj.material)) {
							obj.material.forEach((mat: any) => mat.dispose())
						} else {
							obj.material.dispose()
						}
					}
					scene.remove(obj)
				})
				
				// 强制重新渲染
				const renderer = tcRef.value.context.renderer?.value || tcRef.value.context.renderer
				const camera = tcRef.value.context.camera?.value || tcRef.value.context.camera
				console.log('Renderer:', renderer)
				console.log('Camera:', camera)
				
				if (renderer && camera && typeof renderer.render === 'function') {
					renderer.render(scene, camera)
				}
				
				console.log(`清理了 ${objectsToRemove.length} 个热力图对象`)
			} else {
				console.warn('场景对象不可用或不是有效的 Three.js Scene')
				console.log('Scene 类型:', typeof scene)
				console.log('Scene traverse 方法:', typeof scene?.traverse)
			}
		} else {
			console.warn('Three.js 上下文不可用')
		}
	} catch (error) {
		console.error('清理热力图对象失败:', error)
		console.error('错误详情:', error)
	}
}

// 渲染错误处理
const renderError = ref('')

// 相机更新现在只在用户手动操作时触发

// 状态信息
const currentTime = ref('')
const memoryUsage = ref('--')

// 定时器
let timeInterval: NodeJS.Timeout | null = null;
let memoryInterval: NodeJS.Timeout | null = null;

// 图表绘制函数
const drawLineChart = (canvas: HTMLCanvasElement) => {
	if (!canvas) return

	const ctx = canvas.getContext('2d')
	if (!ctx) return

	const width = canvas.width
	const height = canvas.height

	// 清除画布
	ctx.clearRect(0, 0, width, height)

	// 背景
	ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
	ctx.fillRect(0, 0, width, height)

	// 数据
	const data = [20, 45, 78, 92, 65, 88, 95, 87, 72, 58, 35]

	const padding = 40
	const chartWidth = width - padding * 2
	const chartHeight = height - padding * 2

	// 绘制坐标轴
	ctx.strokeStyle = '#444'
	ctx.lineWidth = 1
	ctx.beginPath()
	ctx.moveTo(padding, padding)
	ctx.lineTo(padding, height - padding)
	ctx.lineTo(width - padding, height - padding)
	ctx.stroke()

	// 绘制数据线
	ctx.strokeStyle = '#00d4ff'
	ctx.lineWidth = 2
	ctx.beginPath()

	data.forEach((value, index) => {
		const x = padding + (index / (data.length - 1)) * chartWidth
		const y = height - padding - (value / 100) * chartHeight

		if (index === 0) {
			ctx.moveTo(x, y)
		} else {
			ctx.lineTo(x, y)
		}
	})

	ctx.stroke()

	// 绘制数据点
	ctx.fillStyle = '#00d4ff'
	data.forEach((value, index) => {
		const x = padding + (index / (data.length - 1)) * chartWidth
		const y = height - padding - (value / 100) * chartHeight

		ctx.beginPath()
		ctx.arc(x, y, 3, 0, Math.PI * 2)
		ctx.fill()
	})
}

const drawPieChart = (canvas: HTMLCanvasElement) => {
	if (!canvas) return

	const ctx = canvas.getContext('2d')
	if (!ctx) return

	const width = canvas.width
	const height = canvas.height
	const centerX = width / 2
	const centerY = height / 2 - 20
	const radius = Math.min(width, height) / 3

	// 清除画布
	ctx.clearRect(0, 0, width, height)

	// 数据
	const data = [25, 35, 20, 10, 10]
	const labels = ['入口区域', '中央大厅', '商铺区', '休息区', '出口区域']
	const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']

	const total = data.reduce((sum, value) => sum + value, 0)
	let currentAngle = 0

	// 绘制饼图
	data.forEach((value, index) => {
		const sliceAngle = (value / total) * Math.PI * 2

		ctx.fillStyle = colors[index]
		ctx.beginPath()
		ctx.moveTo(centerX, centerY)
		ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
		ctx.closePath()
		ctx.fill()

		// 绘制标签
		const labelAngle = currentAngle + sliceAngle / 2
		const labelX = centerX + Math.cos(labelAngle) * (radius + 20)
		const labelY = centerY + Math.sin(labelAngle) * (radius + 20)

		ctx.fillStyle = '#ffffff'
		ctx.font = '12px Microsoft YaHei'
		ctx.textAlign = 'center'
		ctx.fillText(`${labels[index]}`, labelX, labelY)
		ctx.fillText(`${value}%`, labelX, labelY + 15)

		currentAngle += sliceAngle
	})
}

// 更新图表
const updateCharts = () => {
	if (lineChart.value) {
		drawLineChart(lineChart.value)
	}
	if (pieChart.value) {
		drawPieChart(pieChart.value)
	}
}

// 时间和内存更新
const updateTime = () => {
	const now = new Date()
	currentTime.value = now.toLocaleTimeString()
}

const updateMemoryUsage = () => {
	if ('memory' in performance) {
		const memory = (performance as any).memory
		const used = Math.round(memory.usedJSHeapSize / 1024 / 1024)
		memoryUsage.value = `${used} MB`
	}
}

// 参数设置相关方法
const onParameterChange = () => {
	console.log('参数已更改:', simulationParams)
	// 实时验证参数
	validateParams()
}

const validateParams = () => {
	// 可以在这里添加更详细的验证逻辑
	return isParamsValid.value
}

const formatParamsPreview = () => {
	const params = {
		"模型名称": simulationParams.modelName || '未设置',
		"开始时间": simulationParams.startTime || '未设置',
		"结束时间": simulationParams.stopDate || '未设置',
		"实时比例": `${simulationParams.realTimeScale}x`,
		"仿真目标时间": simulationParams.simulTargetTime || '未设置',
		"运行ID": simulationParams.runId || '自动生成',
		"描述信息": simulationParams.description || '无描述'
	}
	return JSON.stringify(params, null, 2)
}

const validateAndSaveParams = () => {
	if (!validateParams()) {
		alert('请检查参数设置，确保所有必填项都已正确填写')
		return
	}
	
	console.log('参数验证通过，已保存:', simulationParams)
	alert('参数保存成功！')
}

const resetParams = () => {
	if (confirm('确定要重置所有参数吗？')) {
		simulationParams.modelName = 'NanJingDong'
		simulationParams.startTime = '2025-05-31T15:30'
		simulationParams.stopDate = '2025-05-31T15:50'
		simulationParams.realTimeScale = 1000
		simulationParams.simulTargetTime = '2025-05-31T15:30'
		simulationParams.runId = ''
		simulationParams.description = '测试仿真'
		console.log('参数已重置')
	}
}



const startSimulationWithParams = async () => {
	if (!validateParams()) {
		alert('请先完善参数设置')
		return
	}
	
	// 构建API请求数据
	const requestData = {
		modelName: simulationParams.modelName,
		engineParameters: {
			startDate: simulationParams.startTime.replace('T', ' ') + ':00',
			stopDate: simulationParams.stopDate.replace('T', ' ') + ':00',
			realTimeScale: simulationParams.realTimeScale
		},
		agentParameters: {
			simulTargetTime: simulationParams.simulTargetTime.replace('T', ' ') + ':00',
			runId: simulationParams.runId.trim() === '' ? null : simulationParams.runId
		},
		description: simulationParams.description
	}
	
	console.log('开始仿真，发送数据:', requestData)
	
	// 设置加载状态
	isStartingSimulation.value = true
	
	try {
		// 发送POST请求到后端API
		const response = await fetch('http://localhost:9527/api/simulation/start', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestData)
		})
		
		if (response.ok) {
			const result = await response.json()
			console.log('仿真启动成功:', result)
			
			// 显示成功弹窗
			const displayRunId = simulationParams.runId.trim() === '' ? '系统自动分配' : simulationParams.runId
			alert(`仿真成功运行！\n运行ID: ${displayRunId}\n模型: ${simulationParams.modelName}`)
			
			// 切换到仿真结果面板
			activePanel.value = 'simulation'
			
		} else {
			const errorData = await response.json().catch(() => ({ message: '未知错误' }))
			console.error('仿真启动失败:', errorData)
			alert(`仿真启动失败：${errorData.message || response.statusText}\n请检查参数设置或联系管理员`)
		}
		
	} catch (error: any) {
		console.error('网络请求失败:', error)
		alert(`网络请求失败：${error.message}\n请检查网络连接或后端服务是否正常运行`)
	} finally {
		// 无论成功还是失败，都要重置加载状态
		isStartingSimulation.value = false
	}
}

// 预防措施相关方法
const onPreventionParamChange = () => {
	console.log('预防措施参数已更改:', preventionParams)
}

const formatPreventionPreview = () => {
	const params = {
		"最大等待时间": preventionParams.waitTimeMax || '未设置',
		"仿真目标时间": preventionParams.simulTargetTime || '未设置',
		"快速移动概率": {
			"东向": preventionParams.FEastProbs || '未设置',
			"北向": preventionParams.FNorthProbs || '未设置',
			"南向": preventionParams.FSouthProbs || '未设置',
			"西向": preventionParams.FWestProbs || '未设置'
		},
		"慢速移动概率": {
			"东向": preventionParams.LEastProbs || '未设置',
			"北向": preventionParams.LNorthProbs || '未设置',
			"南向": preventionParams.LSouthProbs || '未设置',
			"西向": preventionParams.LWestProbs || '未设置'
		}
	}
	return JSON.stringify(params, null, 2)
}

const savePreventionParams = () => {
	console.log('保存预防措施参数:', preventionParams)
	alert('预防措施参数保存成功！')
}

const resetPreventionParams = () => {
	if (confirm('确定要重置所有预防措施参数吗？')) {
		preventionParams.waitTimeMax = ''
		preventionParams.simulTargetTime = ''
		preventionParams.FEastProbs = ''
		preventionParams.FNorthProbs = ''
		preventionParams.FSouthProbs = ''
		preventionParams.FWestProbs = ''
		preventionParams.LEastProbs = ''
		preventionParams.LNorthProbs = ''
		preventionParams.LSouthProbs = ''
		preventionParams.LWestProbs = ''
		console.log('预防措施参数已重置')
	}
}

const exportPreventionParams = () => {
	const dataStr = JSON.stringify(preventionParams, null, 2)
	const dataBlob = new Blob([dataStr], { type: 'application/json' })
	const url = URL.createObjectURL(dataBlob)
	const link = document.createElement('a')
	link.href = url
	link.download = 'prevention_params.json'
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
	console.log('预防措施参数已导出')
}

// 方法
const goHome = () => {
	// 由于已删除 index 页面，这里可以跳转到备用页面或刷新当前页面
	window.location.reload()
}



// 已删除调试函数，因为现在有了更好的相机控制方案

const resetView = () => {
	console.log('重置视图')
	// 这里可以添加重置视图的逻辑
}

const loadSimulationEvent = () => {
	if (selectedEvent.value) {
		console.log('加载仿真事件:', selectedEvent.value)
		
		// 确保地图已加载
		if (!cityFBX.value) {
			console.log('地图未加载，正在加载地图...')
			loadCityModel()
		}
		
		// 根据事件类型调整可视化设置
		switch (selectedEvent.value) {
			case 'rush_hour':
			case 'evening_rush':
				// 交通高峰期显示热力图
				if (!showHeatmap.value) {
					toggleHeatmap()
				}
				showLines.value = true
				break
			case 'weekend':
			case 'holiday':
				// 休闲时段显示基础地图
				if (showHeatmap.value) {
					toggleHeatmap()
				}
				showLines.value = true
				break
			case 'emergency':
				// 紧急情况显示热力图和线条
				if (!showHeatmap.value) {
					toggleHeatmap()
				}
				showLines.value = true
				break
		}
		
		// 更新图表数据
		updateCharts()
	}
}

// 加载城市模型
const loadCityModel = async () => {
	if (isLoading.value) return // 防止重复加载

	isLoading.value = true
	try {
		console.log('开始加载上海地图模型...')
		const model = await loadCityFBX()
		// 使用markRaw避免Vue的响应式代理导致Three.js错误
		cityFBX.value = markRaw(model)
		console.log('上海地图模型加载成功')
		
		// 模型加载完成后，创建热力图几何体（使用共享工具函数）
		setTimeout(() => {
			heatmapGeometryInfo.value = createHeatmapGeometryInfo()
		}, 100)
		
		// 自动计算几何体边界框
		console.log('🔄 开始计算几何体边界框...')
		const boundsCalculated = await calculateGeometryBounds(model)
		
		if (boundsCalculated) {
			console.log('✅ 几何体边界框计算完成')
			
			// 输出边界信息供调试
			console.log('📊 模型边界信息:')
			console.log(`  • X轴范围: ${geometryBounds.modelBounds.minX.toFixed(2)} ~ ${geometryBounds.modelBounds.maxX.toFixed(2)}`)
			console.log(`  • Y轴范围: ${geometryBounds.modelBounds.minY.toFixed(2)} ~ ${geometryBounds.modelBounds.maxY.toFixed(2)}`)
			console.log(`  • Z轴范围: ${geometryBounds.modelBounds.minZ.toFixed(2)} ~ ${geometryBounds.modelBounds.maxZ.toFixed(2)}`)
			
			// 计算模型中心点
			const centerX = (geometryBounds.modelBounds.minX + geometryBounds.modelBounds.maxX) / 2
			const centerY = (geometryBounds.modelBounds.minY + geometryBounds.modelBounds.maxY) / 2
			const centerZ = (geometryBounds.modelBounds.minZ + geometryBounds.modelBounds.maxZ) / 2
			console.log(`  • 模型中心: (${centerX.toFixed(2)}, ${centerY.toFixed(2)}, ${centerZ.toFixed(2)})`)
			
			// 计算模型尺寸
			const sizeX = geometryBounds.modelBounds.maxX - geometryBounds.modelBounds.minX
			const sizeY = geometryBounds.modelBounds.maxY - geometryBounds.modelBounds.minY
			const sizeZ = geometryBounds.modelBounds.maxZ - geometryBounds.modelBounds.minZ
			console.log(`  • 模型尺寸: ${sizeX.toFixed(2)} × ${sizeY.toFixed(2)} × ${sizeZ.toFixed(2)}`)
			
			// 智能选择坐标系统
			console.log('\n🤖 智能坐标系统选择:')
			console.log(`  • 当前设置: ${calibrationData.method}`)
			console.log(`  • 建议: 由于几何体边界可能过大，推荐使用校准边界`)
			console.log(`  • 可通过调试面板切换坐标系统进行测试`)
			
		} else {
			console.warn('⚠️ 几何体边界框计算失败，将使用校准边界')
		}
		
	} catch (error: any) {
		console.error('加载上海地图模型失败:', error)
		console.error('错误详情:', error?.message || '未知错误')
		
		// 显示用户友好的错误信息
		alert(`地图加载失败：${error?.message || '未知错误'}\n\n请检查网络连接或联系管理员。`)
	} finally {
		isLoading.value = false
	}
}

// 重置场景
const resetScene = () => {
	try {
		if (tcRef.value && tcRef.value.context) {
			// 正确访问 TresCanvas 的上下文
			const scene = tcRef.value.context.scene?.value || tcRef.value.context.scene
			const renderer = tcRef.value.context.renderer?.value || tcRef.value.context.renderer
			const camera = tcRef.value.context.camera?.value || tcRef.value.context.camera
			
			if (scene && renderer && camera && typeof scene.traverse === 'function') {
				// 清除场景中的所有对象（除了相机、灯光等基础对象）
				const objectsToRemove: any[] = []
				scene.traverse((child: any) => {
					if (child.type !== 'PerspectiveCamera' && 
						child.type !== 'AmbientLight' && 
						child.type !== 'DirectionalLight' &&
						child.type !== 'OrbitControls') {
						objectsToRemove.push(child)
					}
				})
				
				objectsToRemove.forEach(obj => {
					if (obj.geometry) {
						obj.geometry.dispose()
					}
					if (obj.material) {
						if (Array.isArray(obj.material)) {
							obj.material.forEach((mat: any) => mat.dispose())
						} else {
							obj.material.dispose()
						}
					}
					scene.remove(obj)
				})
				
				// 重新渲染
				if (typeof renderer.render === 'function') {
					renderer.render(scene, camera)
				}
				console.log('场景已重置')
			} else {
				console.warn('Three.js 上下文不可用或不是有效的对象')
			}
		} else {
			console.warn('TresCanvas 引用不可用')
		}
	} catch (error) {
		console.error('重置场景失败:', error)
	}
}

// 获取事件名称
const getEventName = (eventType: string): string => {
	const eventNames: Record<string, string> = {
		'rush_hour': '早高峰',
		'evening_rush': '晚高峰',
		'weekend': '周末购物',
		'holiday': '节假日',
		'emergency': '紧急疏散'
	}
	return eventNames[eventType] || '未知事件'
}

// 仿真相关方法
const loadTimePointData = async () => {
	if (selectedTimePoint.value !== null) {
		const timePoint = timePoints.value.find(tp => tp.value === selectedTimePoint.value)
		if (timePoint) {
			simulationStatus.currentTimePoint = timePoint.label.split(' ')[0]
			simulationStatus.dataPointCount = Math.floor(Math.random() * 500) + 100
			simulationStatus.heatmapIntensity = getRandomIntensity()

			// 1. 先卸载热力图
			showHeatmap.value = false
			await nextTick() // 等待 DOM 卸载

			// 2. 请求后端数据
			// 假设 simTime = (selectedTimePoint.value * 2).toFixed(3)
			const simTime = (selectedTimePoint.value * 2).toFixed(3)
			const res = await fetchPedestrianData(269, simTime)
			if (res.success && Array.isArray(res.data)) {
				console.log(`\n🔍 === 后端数据分析 ===`)
				console.log(`原始数据总数: ${res.data.length}`)
				console.log('原始后端数据样本:', res.data.slice(0, 3))
				
				// 分析数据结构
				if (res.data.length > 0) {
					const sample = res.data[0]
					console.log('数据字段:', Object.keys(sample))
					console.log('lat字段类型:', typeof sample.lat, '值:', sample.lat)
					console.log('lon字段类型:', typeof sample.lon, '值:', sample.lon)
				}
				
				const map = new Map()
				let validCount = 0
				let outOfRangeCount = 0
				
				res.data.forEach((item: any) => {
					// ✅ 修复0经纬度被当成无效的老坑
					const hasLat = item.lat !== undefined && item.lat !== null
					const hasLon = item.lon !== undefined && item.lon !== null
					if (hasLat && hasLon) {
						const lat = Number(item.lat)
						const lon = Number(item.lon)
						if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
						
							// 检查是否在校准范围内（仅用于统计，不过滤数据）
							const inCalibrationRange = lat >= calibrationData.geoBounds.minLat && 
														lat <= calibrationData.geoBounds.maxLat &&
														lon >= calibrationData.geoBounds.minLon && 
														lon <= calibrationData.geoBounds.maxLon
							
							if (!inCalibrationRange) {
								outOfRangeCount++
							}
							
							// 对经纬度进行适度精度处理，避免过度精确导致无法聚合
							// 保留6位小数，大约1米精度
							const roundedLat = Math.round(lat * 1000000) / 1000000
							const roundedLon = Math.round(lon * 1000000) / 1000000
							const key = `${roundedLat},${roundedLon}`
							
							if (map.has(key)) {
								map.set(key, map.get(key) + 1)
							} else {
								map.set(key, 1)
							}
							validCount++
						}
					}
				})
				
				const totalCount = res.data.length || 1
				simulationStatus.dataPointCount = totalCount // 数据点数量即总人数
				
				console.log(`\n📊 === 数据质量分析 ===`)
				console.log(`总数据点: ${totalCount}`)
				console.log(`有效数据点: ${validCount} (${(validCount/totalCount*100).toFixed(1)}%)`)
				console.log(`无效数据点: ${totalCount - validCount} (${((totalCount - validCount)/totalCount*100).toFixed(1)}%)`)
				console.log(`超出校准范围: ${outOfRangeCount} (${(outOfRangeCount/totalCount*100).toFixed(1)}%)`)
				console.log(`去重后位置: ${map.size}`)
				console.log(`平均每位置人数: ${(validCount/map.size).toFixed(2)}`)
				
				if (validCount === 0) {
					console.error('❌ 错误: 没有有效的数据点！')
					heatmapData.value = { max: 1, min: 1, data: [] }
					showHeatmap.value = true
					return
				}
				
				if (outOfRangeCount > validCount * 0.5) {
					console.warn(`⚠️ 警告: 超过50%的数据点超出校准范围，热力图可能显示不准确`)
				}
				
				if (map.size < 10) {
					console.warn(`⚠️ 警告: 去重后位置数量较少(${map.size})，热力图可能不够丰富`)
				}
				
				// 获取热力图实际尺寸（异步等待）
				const heatmapSize = await getHeatmapCanvasSizeAsync()
				
				// 使用新的坐标转换逻辑
				console.log(`\n=== 使用统一XZ→UV映射系统处理热力图数据 ===`)
				console.log(`热力图画布尺寸: ${heatmapSize.width} x ${heatmapSize.height}`)
				console.log(`当前校准方法: ${calibrationData.method}`)
				
				// 确保热力图几何体已创建，获取变换后的边界框
				if (!heatmapGeometryInfo.value) {
					heatmapGeometryInfo.value = createHeatmapGeometryInfo()
					if (!heatmapGeometryInfo.value) {
						throw new Error('无法创建热力图几何体')
					}
				}
				
				// 使用几何体的变换后边界框（与几何体使用同一坐标系、同一变换）
				const transformedBounds = (heatmapGeometryInfo.value as any).transformedBounds
				console.log(`使用几何体的变换后边界框:`, transformedBounds)
				console.log(`  模型坐标: X(${transformedBounds.minX.toFixed(2)}~${transformedBounds.maxX.toFixed(2)}), Z(${transformedBounds.minZ.toFixed(2)}~${transformedBounds.maxZ.toFixed(2)})`)
				console.log(`  地理坐标: 纬度(${calibrationData.geoBounds.minLat.toFixed(6)}~${calibrationData.geoBounds.maxLat.toFixed(6)}), 经度(${calibrationData.geoBounds.minLon.toFixed(6)}~${calibrationData.geoBounds.maxLon.toFixed(6)})`)
				console.log(`🔧 核心思路: 统一的XZ→UV转换，第一段生成2D画布像素点，第二段重建几何体UV`)
				
				// 找出最大聚合数量，用于热力值归一化
				const maxCount = Math.max(...Array.from(map.values()))
				const minCount = Math.min(...Array.from(map.values()))
				console.log(`聚合统计: 最大聚合数=${maxCount}, 最小聚合数=${minCount}`)
				
				const data = Array.from(map.entries()).map(([k, v], index) => {
					const [lat, lon] = k.split(',').map(Number)
					
					// 步骤1: 经纬度 → 模型坐标（基于地理标定）
					const modelCoords = latLonToModelCoords(lat, lon)
					
					// 步骤2: 模型坐标(X/Z) → 统一的热力图像素坐标（基于XZ→UV映射）
					const heatmapCoords = modelCoordsToHeatmapCoords(
						modelCoords.x,
						modelCoords.z,
						transformedBounds,             // ✅ 第三个参数必须是变换后的边界框
						heatmapSize.width,
						heatmapSize.height
					)
					
					// 修复热力值计算：基于该位置的人数密度，归一化到0-100范围
					// 使用对数缩放来处理极值差异
					let heatValue
					if (maxCount === minCount) {
						heatValue = 50 // 如果所有位置人数相同，使用中等热力值
					} else {
						// 线性归一化到0-100范围
						heatValue = ((v - minCount) / (maxCount - minCount)) * 100
						// 确保最小值不为0，便于可视化
						heatValue = Math.max(heatValue, 5)
					}
					
					// 验证坐标转换结果
					const isInCanvas = (heatmapCoords as any).x >= 0 && (heatmapCoords as any).x < heatmapSize.width && 
									   (heatmapCoords as any).y >= 0 && (heatmapCoords as any).y < heatmapSize.height
					const isInCalibration = lat >= calibrationData.geoBounds.minLat && lat <= calibrationData.geoBounds.maxLat &&
											 lon >= calibrationData.geoBounds.minLon && lon <= calibrationData.geoBounds.maxLon
					
					// 详细的坐标转换调试输出（只显示前5个点和有问题的点）
					const shouldLog = index < 5 || !isInCanvas || !isInCalibration
					if (shouldLog) {
						console.log(`\n--- 数据点 ${index + 1} ${!isInCanvas ? '(画布外)' : ''} ${!isInCalibration ? '(校准外)' : ''} ---`)
						console.log(`📍 输入经纬度: (${lat.toFixed(6)}, ${lon.toFixed(6)})`)
						console.log(`🏗️ 模型坐标: (X=${modelCoords.x.toFixed(2)}, Z=${modelCoords.z.toFixed(2)})`)
						console.log(`🔥 热力图坐标: (X=${(heatmapCoords as any).x}, Y=${(heatmapCoords as any).y})`)
						console.log(`📊 热力值: ${heatValue.toFixed(2)} (人数: ${v})`)
						
						// 计算相对位置比例
						const xRatio = (modelCoords.x - transformedBounds.minX) / 
									   (transformedBounds.maxX - transformedBounds.minX)
						const zRatio = (modelCoords.z - transformedBounds.minZ) / 
									   (transformedBounds.maxZ - transformedBounds.minZ)
						console.log(`📐 相对位置: X比例=${(xRatio*100).toFixed(1)}%, Z比例=${(zRatio*100).toFixed(1)}%`)
						console.log(`✅ 状态: 画布内=${isInCanvas}, 校准内=${isInCalibration}`)
						
						if (!isInCanvas) {
							console.warn(`⚠️ 坐标超出画布范围`)
						}
						if (!isInCalibration) {
							console.warn(`⚠️ 经纬度超出校准范围，使用外推计算`)
						}
					} else if (index === 5) {
						console.log(`\n... 正常数据点不再详细显示，仅显示异常点 ...`)
					}
					
					return { 
						x: (heatmapCoords as any).x, 
						y: (heatmapCoords as any).y, 
						value: heatValue 
					}
				})
				
				heatmapData.value = {
					max: 100,  // 修复：使用与热力值计算一致的最大值
					min: 0,
					data
				}
				
				// 统计转换结果
				const inCanvasCount = data.filter(d => d.x >= 0 && d.x < heatmapSize.width && d.y >= 0 && d.y < heatmapSize.height).length
				const maxValue = Math.max(...data.map(d => d.value))
				const minValue = Math.min(...data.map(d => d.value))
				const avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length
				
				console.log(`\n=== 坐标转换完成 ===`)
				console.log(`📊 转换统计:`)
				console.log(`  • 总数据点: ${data.length}`)
				console.log(`  • 画布内点数: ${inCanvasCount} (${(inCanvasCount/data.length*100).toFixed(1)}%)`)
				console.log(`  • 画布外点数: ${data.length - inCanvasCount} (${((data.length - inCanvasCount)/data.length*100).toFixed(1)}%)`)
				console.log(`📈 热力值统计:`)
				console.log(`  • 最大值: ${maxValue.toFixed(2)}`)
				console.log(`  • 最小值: ${minValue.toFixed(2)}`)
				console.log(`  • 平均值: ${avgValue.toFixed(2)}`)
				console.log(`🎯 热力图配置: max=${heatmapData.value.max}, min=${heatmapData.value.min}`)
				
				// 显示坐标范围
				const xCoords = data.map(d => d.x)
				const yCoords = data.map(d => d.y)
				console.log(`📐 坐标范围:`)
				console.log(`  • X: ${Math.min(...xCoords)} ~ ${Math.max(...xCoords)}`)
				console.log(`  • Y: ${Math.min(...yCoords)} ~ ${Math.max(...yCoords)}`)
				console.log(`=========================\n`)
				
				// 自动运行数据诊断
				setTimeout(() => {
					diagnoseHeatmapData()
				}, 100)
			} else {
				console.warn('后端数据无效或为空')
				heatmapData.value = { max: 1, min: 1, data: [] }
			}

			// 3. 重新显示热力图
			showHeatmap.value = true
		}
	}
}

const onTimeProgressChange = () => {
	const timePoint = timePoints.value[timeProgress.value]
	if (timePoint) {
		selectedTimePoint.value = timePoint.value
		loadTimePointData()
	}
}

const getCurrentTimeLabel = () => {
	const timePoint = timePoints.value[timeProgress.value]
	return timePoint ? timePoint.label : '08:00 (0分钟)'
}

const getRandomIntensity = () => {
	const intensities = ['低', '中等', '高', '极高']
	return intensities[Math.floor(Math.random() * intensities.length)]
}

// 播放控制方法
const playSimulation = () => {
	simulationStatus.isPlaying = true
	simulationStatus.status = 'playing'
	simulationStatus.statusText = '播放中'
	
	// 开始播放逻辑
	console.log('开始播放仿真')
}

const pauseSimulation = () => {
	simulationStatus.isPlaying = false
	simulationStatus.status = 'paused'
	simulationStatus.statusText = '已暂停'
	
	// 暂停播放逻辑
	console.log('暂停播放仿真')
}

const stopSimulation = () => {
	simulationStatus.isPlaying = false
	simulationStatus.status = 'ready'
	simulationStatus.statusText = '已停止'
	timeProgress.value = 0
	selectedTimePoint.value = null
	
	// 停止播放逻辑
	console.log('停止播放仿真')
}

const resetSimulation = () => {
	simulationStatus.isPlaying = false
	simulationStatus.status = 'ready'
	simulationStatus.statusText = '就绪'
	timeProgress.value = 0
	selectedTimePoint.value = null
	playbackSpeed.value = 1.0
	
	// 重置仿真逻辑
	console.log('重置仿真')
}

const onPlaybackSpeedChange = () => {
	console.log('播放速度改变:', playbackSpeed.value)
	// 这里可以调整播放速度
}

// 视角控制方法
const setViewMode = (mode: 'fixed' | 'free') => {
	console.log('视角模式切换为:', mode)
	
	if (mode === 'fixed') {
		// 直接设置为固定模式
		viewMode.value = 'fixed'
		
		// 设置用户指定的固定视角参数
		cameraSettings.position.x = -141.98630698496282;
		cameraSettings.position.y = 1134.0416010330255;
		cameraSettings.position.z = 310.9654273060678;
		cameraSettings.rotation.x = -1.5707963765578337;
		cameraSettings.rotation.y = -9.989167108483407e-7;
		cameraSettings.rotation.z = -1.5707963765578337;
		
		// 立即更新相机位置（使用专门的固定视角方法）
		updateCameraForFixed()
		console.log('固定视角已应用，位置和旋转已锁定')
	} else {
		// 开放视角：恢复默认
		viewMode.value = mode
		cameraSettings.position.x = 600
		cameraSettings.position.y = 750
		cameraSettings.position.z = -1221
		cameraSettings.rotation.x = 0
		cameraSettings.rotation.y = 0
		cameraSettings.rotation.z = 0
		updateCamera()
	}
}

const getViewModeDescription = () => {
	if (viewMode.value === 'fixed') {
		return '固定视角，完全锁定，无法进行任何相机操作'
	} else {
		return '自由视角，可以旋转、缩放和平移'
	}
}

const updateCameraPosition = () => {
	// 在固定视角模式下，阻止用户手动调整相机位置
	if (viewMode.value === 'fixed') {
		console.log('固定视角模式下，禁止手动调整相机位置')
		return
	}
	console.log('更新相机位置:', cameraSettings.position)
	updateCamera()
}

// 专门用于固定视角设置的相机更新方法
const updateCameraForFixed = () => {
	if (tcRef.value && tcRef.value.context && tcRef.value.context.camera) {
		const camera = tcRef.value.context.camera.value || tcRef.value.context.camera
		if (camera) {
			camera.position.set(
				cameraSettings.position.x,
				cameraSettings.position.y,
				cameraSettings.position.z
			)
			camera.rotation.set(
				cameraSettings.rotation.x,
				cameraSettings.rotation.y,
				cameraSettings.rotation.z
			)
			// 触发渲染
			if (tcRef.value.context.renderer) {
				const renderer = tcRef.value.context.renderer.value || tcRef.value.context.renderer
				const scene = tcRef.value.context.scene.value || tcRef.value.context.scene
				renderer.render(scene, camera)
			}
		}
	}
}

const updateCamera = () => {
	// 在固定视角模式下，阻止通过滑块等方式调整相机
	if (viewMode.value === 'fixed') {
		console.log('固定视角模式下，禁止调整相机')
		return
	}
	
	if (tcRef.value && tcRef.value.context && tcRef.value.context.camera) {
		const camera = tcRef.value.context.camera.value || tcRef.value.context.camera
		if (camera) {
			camera.position.set(
				cameraSettings.position.x,
				cameraSettings.position.y,
				cameraSettings.position.z
			)
			camera.rotation.set(
				cameraSettings.rotation.x,
				cameraSettings.rotation.y,
				cameraSettings.rotation.z
			)
			// 触发渲染
			if (tcRef.value.context.renderer) {
				const renderer = tcRef.value.context.renderer.value || tcRef.value.context.renderer
				const scene = tcRef.value.context.scene.value || tcRef.value.context.scene
				renderer.render(scene, camera)
			}
		}
	}
}

const outputCurrentViewParams = () => {
	if (tcRef.value && tcRef.value.context && tcRef.value.context.camera) {
		const camera = tcRef.value.context.camera.value || tcRef.value.context.camera;
		if (camera) {
			const pos = camera.position;
			const rot = camera.rotation;
			console.log('=== 当前真实相机参数 ===');
			console.log('Position:');
			console.log(`  X: ${pos.x}`);
			console.log(`  Y: ${pos.y}`);
			console.log(`  Z: ${pos.z}`);
			console.log('Rotation (Euler, 弧度):');
			console.log(`  X: ${rot.x}`);
			console.log(`  Y: ${rot.y}`);
			console.log(`  Z: ${rot.z}`);
			console.log('==================');
			
			// 当前固定视角设置
			console.log('=== 当前固定视角设置 ===');
			console.log('Position:');
			console.log(`  X: -141.98630698496282`);
			console.log(`  Y: 1134.0416010330255`);
			console.log(`  Z: 310.9654273060678`);
			console.log('Rotation:');
			console.log(`  X: -1.5707963765578337`);
			console.log(`  Y: -9.989167108483407e-7`);
			console.log(`  Z: -1.5707963765578337`);
			console.log('==================');
			
			// 差异对比
			console.log('=== 参数差异对比 ===');
			console.log(`Position差异:`);
			console.log(`  X: ${pos.x - (-141.98630698496282)} (当前 - 固定)`);
			console.log(`  Y: ${pos.y - 1134.0416010330255}`);
			console.log(`  Z: ${pos.z - 310.9654273060678}`);
			console.log(`Rotation差异:`);
			console.log(`  X: ${rot.x - (-1.5707963765578337)}`);
			console.log(`  Y: ${rot.y - (-9.989167108483407e-7)}`);
			console.log(`  Z: ${rot.z - (-1.5707963765578337)}`);
			console.log('==================');
			
			// 可复制格式
			console.log('=== 可复制的代码格式 ===');
			console.log('// 当前相机参数:');
			console.log(`position: [${pos.x}, ${pos.y}, ${pos.z}]`);
			console.log(`rotation: [${rot.x}, ${rot.y}, ${rot.z}]`);
			console.log('');
			console.log('// 如果要设置为新的固定视角，请复制以下代码:');
			console.log(`cameraSettings.position.x = ${pos.x};`);
			console.log(`cameraSettings.position.y = ${pos.y};`);
			console.log(`cameraSettings.position.z = ${pos.z};`);
			console.log(`cameraSettings.rotation.x = ${rot.x};`);
			console.log(`cameraSettings.rotation.y = ${rot.y};`);
			console.log(`cameraSettings.rotation.z = ${rot.z};`);
			console.log('==================');
		} else {
			console.warn('未找到相机对象');
		}
	} else {
		console.warn('tcRef 或相机对象不可用');
	}
};

// 处理渲染错误
const handleRenderError = (error: any) => {
	console.error('3D渲染错误:', error)
	renderError.value = error?.message || '3D渲染出现错误'
}

// 重试渲染
const retryRender = () => {
	renderError.value = ''
	console.log('重试3D渲染...')
}

// 测试坐标转换
const testCoordinateConversion = () => {
	const { testLat, testLon } = debugCoords
	
	// 验证输入
	if (!testLat || !testLon) {
		alert('请输入有效的经纬度坐标')
		return
	}
	
	console.log(`测试坐标转换: 纬度=${testLat}, 经度=${testLon}`)
	
	// 1. 经纬度 → 模型坐标
	const modelCoords = latLonToModelCoords(testLat, testLon)
	
	// ✅ 获取与渲染一致的边界框
	const bounds = (heatmapGeometryInfo.value as any)?.transformedBounds ?? getCurrentModelBounds()
	
	// 2. 模型坐标 → 热力图坐标
	// ✅ 修复传参顺序：第3个参数是bounds
	const heatmapCoords = modelCoordsToHeatmapCoords(modelCoords.x, modelCoords.z, bounds, 250, 250)
	
	// 3. 反向转换：模型坐标 → 经纬度
	const reverseCoords = modelCoordsToLatLon(modelCoords.x, modelCoords.z)
	
	// 4. 计算转换误差
	const latError = Math.abs(reverseCoords.lat - testLat)
	const lonError = Math.abs(reverseCoords.lon - testLon)
	
	// 保存结果
	debugCoords.results = {
		modelX: modelCoords.x,
		modelZ: modelCoords.z,
		heatmapX: (heatmapCoords as any).x,
		heatmapY: (heatmapCoords as any).y,
		reverseLat: reverseCoords.lat,
		reverseLon: reverseCoords.lon,
		latError,
		lonError
	}
	
	console.log('坐标转换结果:', debugCoords.results)
	
	// 检查是否在校准范围内（仅用于提示）
	const isInCalibrationRange = testLat >= calibrationData.geoBounds.minLat && 
								  testLat <= calibrationData.geoBounds.maxLat &&
								  testLon >= calibrationData.geoBounds.minLon && 
								  testLon <= calibrationData.geoBounds.maxLon
	
	if (!isInCalibrationRange) {
		console.info('提示：测试坐标超出校准点覆盖范围，转换基于线性外推')
	} else {
		console.info('测试坐标在校准点覆盖范围内，转换精度较高')
	}
}

// 监听热力图状态变化
watchEffect(() => {
	if (showHeatmap.value) {
		console.log('热力图状态已激活')
	} else {
		console.log('热力图状态已关闭')
	}
})

// 监听渲染错误
watch(renderError, (error) => {
	if (error) {
		console.error('检测到渲染错误，尝试恢复...')
		// 尝试重置热力图状态
		if (showHeatmap.value) {
			toggleHeatmap()
		}
		
		// 延迟后重试
		setTimeout(() => {
			renderError.value = ''
		}, 2000)
	}
})


// 统计更新
const updateStats = () => {
	updateTime()
	updateMemoryUsage()
	updateCharts()
}

// 生命周期
onMounted(async () => {
	// 初始化
	updateStats()

	// 启动定时器
	timeInterval = setInterval(updateTime, 1000)
	memoryInterval = setInterval(updateMemoryUsage, 5000)

	// 初始化仿射变换系数（使用默认校准点动态计算）
	const affineInitialized = initializeAffineCoeffs()
	
	// 如果动态计算失败，尝试从JSON文件加载
	if (!affineInitialized) {
		console.log('🔄 尝试从JSON文件加载校准数据...')
		await loadCalibrationData()
	}
	
	// 验证仿射变换准确性
	validateAffineTransformation()
	
	// 验证热力图坐标转换
	validateHeatmapTransformation()

	// 自动加载城市模型
	await loadCityModel()
	
	// 等待模型加载完成后，确保相机处于固定视角
	await nextTick()
	setTimeout(() => {
		if (tcRef.value && tcRef.value.context && tcRef.value.context.camera) {
			updateCameraForFixed()
			console.log('页面初始化：已应用固定视角')
		}
	}, 200)
})

// 正确放置 onUnmounted 在 setup 函数顶层
onUnmounted(() => {
	// 清理定时器
	if (timeInterval) clearInterval(timeInterval)
	if (memoryInterval) clearInterval(memoryInterval)
	
	// 清理城市模型资源
	if (cityFBX.value) {
		try {
			if (cityFBX.value.model) {
				cityFBX.value.model.traverse((child: any) => {
					if (child.geometry) {
						child.geometry.dispose()
					}
					if (child.material) {
						if (Array.isArray(child.material)) {
							child.material.forEach((mat: any) => mat.dispose())
						} else {
							child.material.dispose()
						}
					}
				})
			}
		} catch (error) {
			console.error('清理城市模型资源失败:', error)
		}
	}
	
	// 清理热力图几何体
	try {
		if (heatmapGeometryInfo.value) {
			disposeHeatmapGeometry(heatmapGeometryInfo.value)
			heatmapGeometryInfo.value = null
		}
		
		console.log('simulation 组件卸载完成')
	} catch (error) {
		console.error('清理 simulation 资源失败:', error)
	}
})


// 热力图数据格式说明和示例（基于校准点的经纬度转换）
/*
热力图数据格式要求：

1. 基础数据格式：
const heatmapData = {
  max: 360,       // 最大值
  min: 0,         // 最小值
  data: [         // 数据点数组
    {
      x: number,      // 热力图X坐标（支持任意尺寸）
      y: number,      // 热力图Y坐标（支持任意尺寸）
      value: number   // 热力值 (min 到 max 之间)
    }
  ]
}

2. 坐标转换流程：
后端经纬度数据 → 校准转换 → 模型坐标 → 热力图坐标
- 校准点覆盖范围: lat(31.236662~31.242242), lon(121.481045~121.491421)
- 对应模型坐标: x(-377.41~11.53), z(-43.60~812.97)
- 热力图坐标: 动态适应canvas尺寸
- 支持超出校准范围的坐标（基于线性外推）

3. 转换函数：
- latLonToModelCoords(lat, lon): 经纬度 → 模型坐标（线性插值）
- modelCoordsToHeatmapCoords(x, z, width?, height?): 模型坐标 → 热力图坐标
- latLonToHeatmapCoords(lat, lon, width?, height?): 经纬度 → 热力图坐标（组合）
- getHeatmapCanvasSize(): 动态获取热力图尺寸

4. 数据处理特点：
- 不限制经纬度范围，支持任意地理坐标
- 基于校准点进行线性插值和外推
- 动态适应热力图canvas尺寸
- 统计校准范围内外的数据点

5. 校准机制：
- 基于多个校准点建立坐标映射关系
- 使用线性插值进行坐标转换
- 支持超出校准范围的坐标外推
- 校准精度取决于校准点的分布和数量

6. 实时数据更新：
- 支持时间序列数据播放
- 动态坐标转换和尺寸适应
- 实时热力图渲染
- 详细的转换日志和统计

7. 数据来源：
- 人群位置数据（经纬度格式）
- GPS轨迹数据
- 移动设备定位数据
- 仿真计算结果（经纬度输出）
- 任意地理范围的位置数据

8. 校准数据来源：
- 使用CoordinateCalibration.vue工具校准
- 基于实际地标建筑物坐标
- 支持多点校准提高精度
- 校准点分布影响转换精度
*/

// rotation 弧度 <-> 度数（分别用 computed 实现）
const rotationDegreesX = computed({
  get: () => Math.round(cameraSettings.rotation.x * 180 / Math.PI),
  set: (val: number) => { 
    if (viewMode.value === 'fixed') {
      console.log('固定视角模式下，禁止调整旋转')
      return
    }
    cameraSettings.rotation.x = val * Math.PI / 180; 
    updateCamera(); 
  }
})
const rotationDegreesY = computed({
  get: () => Math.round(cameraSettings.rotation.y * 180 / Math.PI),
  set: (val: number) => { 
    if (viewMode.value === 'fixed') {
      console.log('固定视角模式下，禁止调整旋转')
      return
    }
    cameraSettings.rotation.y = val * Math.PI / 180; 
    updateCamera(); 
  }
})
const rotationDegreesZ = computed({
  get: () => Math.round(cameraSettings.rotation.z * 180 / Math.PI),
  set: (val: number) => { 
    if (viewMode.value === 'fixed') {
      console.log('固定视角模式下，禁止调整旋转')
      return
    }
    cameraSettings.rotation.z = val * Math.PI / 180; 
    updateCamera(); 
  }
})

const heatmapData: Ref<{ max: number, min: number, data: { x: number, y: number, value: number }[] }> = ref({ max: 1, min: 1, data: [] }) // 用于热力图

</script>

<style scoped>
.simulation-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0c1426 0%, #1a1f35 50%, #2a2d47 100%);
  color: #ffffff;
  font-family: 'Microsoft YaHei', 'Arial', sans-serif;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.top-navbar {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 212, 255, 0.3);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-icon {
  font-size: 2rem;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  background: linear-gradient(45deg, #00d4ff, #0099cc);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.nav-buttons {
  display: flex;
  gap: 1rem;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.nav-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
}

.nav-btn.active {
  background: linear-gradient(45deg, #00d4ff, #0099cc);
  color: #ffffff;
  border-color: #00d4ff;
}

.home-btn {
  background: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.5);
}

.home-btn:hover {
  background: rgba(255, 107, 107, 0.3);
  border-color: #ff6b6b;
}

.btn-icon {
  font-size: 1.1rem;
}

/* 主要内容容器 */
.main-container {
  flex: 1;
  padding: 2rem;
  max-width: 2400px;
  margin: 0 auto;
  width: 100%;
}

/* 可视化布局 */
.visualization-layout {
  display: grid;
  grid-template-columns: 1fr 500px;
  gap: 2rem;
  min-height: 800px;
  align-items: start;
}

/* 模型区域 */
.model-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 1600px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
}

.section-header h3, .section-header h4 {
  margin: 0;
  color: #00d4ff;
  font-size: 1.2rem;
}

.section-header h5 {
  margin: 0 0 1rem 0;
  color: #00d4ff;
  font-size: 1rem;
}

.section-header h6 {
  margin: 0 0 0.5rem 0;
  color: #ffffff;
  font-size: 0.9rem;
}

.model-controls {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
}

.control-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  transform: translateY(-1px);
}

.control-btn.active {
  background: #00d4ff;
  color: #0c1426;
}

.control-btn.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  margin: 0 0.25rem;
}

.text-success {
  color: #4ade80 !important;
}

.text-warning {
  color: #fbbf24 !important;
}

.coordinate-method-buttons {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.coordinate-method-buttons .control-btn.small {
  margin: 0;
  min-width: auto;
}

.model-container {
  flex: 1;
  position: relative;
  height: calc(1600px - 80px);
  overflow: hidden;
}

/* 可视化占位符样式 */
.visualization-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.placeholder-content {
  text-align: center;
  color: #ffffff;
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.placeholder-content h3 {
  margin: 0 0 0.5rem 0;
  color: #00d4ff;
  font-size: 1.5rem;
}

.placeholder-content p {
  margin: 0;
  font-size: 1rem;
  opacity: 0.8;
}

.placeholder-subtitle {
  font-size: 0.9rem;
  opacity: 0.6;
  margin-top: 0.5rem;
}

/* 仿真信息显示 */
.simulation-overlay {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 8px;
  padding: 1rem;
  color: #ffffff;
  z-index: 1000;
}

.simulation-info h4 {
  margin: 0 0 0.5rem 0;
  color: #00d4ff;
  font-size: 1rem;
}

.simulation-info p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.8;
}

/* 渲染错误样式 */
.render-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.error-content {
  text-align: center;
  color: #ffffff;
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  border-radius: 8px;
  padding: 2rem;
  max-width: 400px;
}

.error-content h3 {
  margin: 0 0 1rem 0;
  color: #ff6b6b;
  font-size: 1.5rem;
}

.error-content p {
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  opacity: 0.8;
  line-height: 1.4;
}

/* 加载状态样式 */
.loading-overlay {
  position: absolute;
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

.loading-spinner {
  text-align: center;
  color: white;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner p {
  margin: 0;
  font-size: 16px;
  opacity: 0.8;
}

/* 控制面板 */
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 500px;
  height: calc(100vh - 200px);
  overflow-y: scroll;
  overflow-x: hidden;
  padding-right: 10px;
  box-sizing: border-box;
}

/* 自定义滚动条样式 */
.control-panel::-webkit-scrollbar {
  width: 8px;
}

.control-panel::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.control-panel::-webkit-scrollbar-thumb {
  background: rgba(0, 212, 255, 0.6);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.control-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 212, 255, 0.8);
}

.control-panel::-webkit-scrollbar-corner {
  background: transparent;
}

.panel-tabs-container {
  margin-bottom: 1rem;
}

.panel-tabs-row {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-tabs-row:last-child {
  border-bottom: none;
  margin-bottom: 0.5rem;
}

/* 第二行标签特殊样式 */
.panel-tabs-row:last-child .panel-tab {
  margin: 0 10%;
  border-radius: 6px 6px 0 0;
}

.panel-tab {
  flex: 1;
  text-align: center;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  color: #ffffff;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 500;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-tab:hover {
  background: rgba(0, 212, 255, 0.1);
}

.panel-tab.active {
  border-bottom-color: #00d4ff;
  color: #00d4ff;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex-shrink: 0;
  min-height: fit-content;
}

.panel-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  overflow: hidden;
  flex-shrink: 0;
  min-height: fit-content;
}

.panel-section .section-header {
  padding: 1rem 1.5rem;
}

.option-group {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.option-group:last-child {
  border-bottom: none;
}



.option-label {
  display: block;
  color: #00d4ff;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.select-input, .time-input {
  width: calc(100% - 5px);
  background: rgba(255, 255, 255, 0.95);
  color: #333333;
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
  margin-right: 5px;
}

.select-input:focus, .time-input:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

.time-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-separator {
  color: #888;
  font-size: 0.9rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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

/* 滑块组样式 */
.slider-group {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.slider-label {
  display: block;
  color: #00d4ff;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.slider-input {
  width: 100%;
  height: 6px;
  background: rgba(0, 212, 255, 0.2);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  margin-bottom: 0.5rem;
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #00d4ff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.slider-input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #00d4ff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.slider-value {
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: bold;
}

/* 按钮组样式 */
.button-group {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.button-group .control-btn {
  flex: 1;
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
  text-align: center;
}

.button-group .control-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  transform: translateY(-1px);
}

/* 信息项样式 */
.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  color: #00d4ff;
  font-size: 0.9rem;
  font-weight: 500;
}

.info-value {
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: bold;
}

/* 时间滑块组样式 */
.time-slider-group {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 状态网格样式 */
.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.status-grid .status-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-grid .status-label {
  color: #00d4ff;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-grid .status-value {
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: bold;
}

.status-grid .status-value.ready {
  color: #4caf50;
}

.status-grid .status-value.playing {
  color: #ff9800;
}

.status-grid .status-value.paused {
  color: #ffc107;
}

.status-grid .status-value.completed {
  color: #2196f3;
}

/* 播放控制样式 */
.playback-controls {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.playback-controls .control-btn {
  padding: 0.75rem 0.5rem;
  font-size: 0.8rem;
  text-align: center;
}

/* 视角控制样式 */
.view-mode-controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.view-mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.view-mode-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  transform: translateY(-1px);
}

.view-mode-btn.active {
  background: #00d4ff;
  color: #0c1426;
  border-color: #00d4ff;
}

.view-mode-btn .btn-icon {
  font-size: 1.1rem;
}

.view-info {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  border: 1px solid rgba(0, 212, 255, 0.2);
}

.view-description {
  margin: 0;
  color: #ffffff;
  font-size: 0.85rem;
  line-height: 1.4;
  opacity: 0.8;
}

.view-actions {
  margin-top: 1rem;
}

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
  border: 1px solid rgba(255, 193, 7, 0.3);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.action-btn:hover {
  background: rgba(255, 193, 7, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 193, 7, 0.2);
}

.action-btn .btn-icon {
  font-size: 1.1rem;
}

/* 相机控制样式 */
.camera-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.camera-position, .camera-rotation {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.camera-label {
  color: #00d4ff;
  font-size: 0.9rem;
  font-weight: 500;
}

.position-inputs, .rotation-inputs {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

.position-inputs > div, .rotation-inputs > div {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 4px;
}

.position-inputs > div > span:first-child, .rotation-inputs > div > span:first-child {
  min-width: 20px;
  font-weight: 500;
  color: #00d4ff;
}

.position-inputs > div > input, .rotation-inputs > div > input {
  flex: 1;
  margin: 0 0.5rem;
}

.position-inputs > div > span:last-child, .rotation-inputs > div > span:last-child {
  min-width: 60px;
  text-align: right;
  font-family: monospace;
  color: #ffffff;
}

.position-input, .rotation-input {
  background: rgba(0, 0, 0, 0.5);
  color: #ffffff;
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.8rem;
  text-align: center;
  transition: border-color 0.3s ease;
}

.position-input:focus, .rotation-input:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

.position-input:disabled, .rotation-input:disabled {
  background: rgba(0, 0, 0, 0.3);
  color: #666;
  cursor: not-allowed;
  border-color: rgba(255, 255, 255, 0.1);
}

.position-input::placeholder, .rotation-input::placeholder {
  color: #888;
}

/* 数据可视化区域 */
.data-visualization {
  flex: 1;
  min-height: 400px;
}

.chart-container {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-container:last-child {
  border-bottom: none;
}

.chart-container canvas {
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
}

/* 状态栏 */
.status-bar {
  background: rgba(0, 0, 0, 0.8);
  border-top: 1px solid rgba(0, 212, 255, 0.3);
  padding: 0.75rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  color: #888;
}

.status-value {
  color: #ffffff;
}

.status-value.active {
  color: #00d4ff;
}

.status-indicator {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
}

.status-indicator.connected {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-indicator.connecting {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.status-indicator.disconnected {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .visualization-layout {
    grid-template-columns: 1fr 450px;
  }
}

/* 调试面板样式 */
.debug-section {
	margin-bottom: 1rem;
	padding: 1rem;
	background: rgba(0, 0, 0, 0.2);
	border-radius: 6px;
	border: 1px solid rgba(0, 212, 255, 0.2);
}

.debug-section h5 {
	margin: 0 0 0.75rem 0;
	color: #00d4ff;
	font-size: 0.9rem;
	font-weight: 500;
}

.debug-info {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.debug-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 0.8rem;
}

.debug-item label {
	color: #ffffff;
	opacity: 0.8;
	min-width: 100px;
	font-weight: 500;
}

.debug-item span {
	color: #00d4ff;
	font-family: monospace;
	text-align: right;
}

.debug-inputs {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	margin-bottom: 1rem;
}

.input-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.input-row label {
	color: #ffffff;
	font-size: 0.8rem;
	min-width: 80px;
}

.debug-input {
	flex: 1;
	background: rgba(255, 255, 255, 0.1);
	color: #ffffff;
	border: 1px solid rgba(0, 212, 255, 0.3);
	border-radius: 4px;
	padding: 0.4rem 0.6rem;
	font-size: 0.8rem;
	font-family: monospace;
}

.debug-input:focus {
	outline: none;
	border-color: #00d4ff;
	box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

.debug-btn {
	background: linear-gradient(45deg, #00d4ff, #0099cc);
	color: white;
	border: none;
	border-radius: 4px;
	padding: 0.5rem 1rem;
	font-size: 0.8rem;
	cursor: pointer;
	transition: all 0.3s ease;
}

.debug-btn:hover {
	transform: translateY(-1px);
	box-shadow: 0 2px 8px rgba(0, 212, 255, 0.3);
}

.debug-results {
	background: rgba(0, 0, 0, 0.3);
	border-radius: 4px;
	padding: 0.75rem;
	border: 1px solid rgba(0, 212, 255, 0.2);
}

.debug-results .debug-item {
	margin-bottom: 0.4rem;
}

.debug-results .debug-item:last-child {
	margin-bottom: 0;
}

@media (max-width: 1200px) {
  .visualization-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    min-height: auto;
    align-items: stretch;
  }

  .control-panel {
    min-width: auto;
    height: 600px;
    max-height: 600px;
  }
  
  .model-section {
    height: 1000px;
  }
  
  .model-container {
    height: calc(1000px - 80px);
  }
}

@media (max-width: 768px) {
  .nav-content {
    flex-direction: column;
    gap: 1rem;
  }

  .nav-buttons {
    flex-wrap: wrap;
    justify-content: center;
  }

  .main-container {
    padding: 1rem;
  }

  .control-panel {
    height: calc(100vh - 300px);
    min-height: 400px;
    padding-right: 5px;
  }

  .control-panel::-webkit-scrollbar {
    width: 6px;
  }

  .model-section {
    height: 600px;
  }
  
  .model-container {
    height: calc(600px - 80px);
  }

  .status-bar {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}

/* 参数设置面板样式 */
.text-input, .datetime-input {
	width: calc(100% - 5px);
	background: rgba(255, 255, 255, 0.95);
	color: #333333;
	border: 1px solid rgba(0, 212, 255, 0.3);
	border-radius: 6px;
	padding: 0.75rem;
	font-size: 0.9rem;
	transition: border-color 0.3s ease;
	margin-right: 5px;
}

.text-input:focus, .datetime-input:focus {
	outline: none;
	border-color: #00d4ff;
	box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

/* 专门为datetime-local输入框优化样式 */
.datetime-input {
	background: rgba(255, 255, 255, 0.98);
	color: #333333;
	font-family: inherit;
}

/* 确保datetime-local控件的内部元素可见 */
.datetime-input::-webkit-datetime-edit {
	color: #333333;
}

.datetime-input::-webkit-datetime-edit-fields-wrapper {
	background: transparent;
}

.datetime-input::-webkit-datetime-edit-text {
	color: #666666;
	padding: 0 0.25rem;
}

.datetime-input::-webkit-datetime-edit-month-field,
.datetime-input::-webkit-datetime-edit-day-field,
.datetime-input::-webkit-datetime-edit-year-field,
.datetime-input::-webkit-datetime-edit-hour-field,
.datetime-input::-webkit-datetime-edit-minute-field {
	background: transparent;
	color: #333333;
	border: none;
	padding: 0.1rem;
}

.datetime-input::-webkit-calendar-picker-indicator {
	background: transparent;
	color: #00d4ff;
	cursor: pointer;
	font-size: 1.1rem;
	padding: 0.25rem;
}

.datetime-input::-webkit-calendar-picker-indicator:hover {
	background: rgba(0, 212, 255, 0.1);
	border-radius: 3px;
}

.number-input-group {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 0.5rem;
}

.number-input {
	flex: 1;
	background: rgba(255, 255, 255, 0.95);
	color: #333333;
	border: 1px solid rgba(0, 212, 255, 0.3);
	border-radius: 6px;
	padding: 0.75rem;
	font-size: 0.9rem;
	transition: border-color 0.3s ease;
	margin-right: 5px;
}

.number-input:focus {
	outline: none;
	border-color: #00d4ff;
	box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

.input-unit {
	color: #888;
	font-size: 0.8rem;
	min-width: 40px;
}

.input-help {
	margin-top: 0.25rem;
}

.input-help small {
	color: #888;
	font-size: 0.75rem;
}

.textarea-input {
	width: calc(100% - 5px);
	background: rgba(255, 255, 255, 0.95);
	color: #333333;
	border: 1px solid rgba(0, 212, 255, 0.3);
	border-radius: 6px;
	padding: 0.75rem;
	font-size: 0.9rem;
	font-family: inherit;
	resize: vertical;
	min-height: 100px;
	transition: border-color 0.3s ease;
	margin-right: 5px;
}

.textarea-input:focus {
	outline: none;
	border-color: #00d4ff;
	box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

.textarea-input::placeholder {
	color: #888888;
}

.char-counter {
	text-align: right;
	margin-top: 0.25rem;
	color: #888;
	font-size: 0.75rem;
}

.params-preview {
	background: rgba(0, 0, 0, 0.3);
	border: 1px solid rgba(0, 212, 255, 0.2);
	border-radius: 6px;
	padding: 1rem;
	overflow: auto;
	max-height: 300px;
	min-height: 150px;
	width: calc(100% - 5px);
	margin-right: 5px;
}

.params-json {
	color: #ffffff;
	font-family: 'Courier New', monospace;
	font-size: 0.75rem;
	line-height: 1.5;
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
	overflow-wrap: break-word;
}

.action-buttons {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	gap: 0.75rem;
}

.action-buttons .action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.3s ease;
	font-size: 0.9rem;
	font-weight: 500;
	border: 1px solid;
	text-decoration: none;
}

.action-btn.primary {
	background: rgba(0, 212, 255, 0.1);
	color: #00d4ff;
	border-color: rgba(0, 212, 255, 0.3);
}

.action-btn.primary:hover {
	background: rgba(0, 212, 255, 0.2);
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
}

.action-btn.secondary {
	background: rgba(255, 255, 255, 0.1);
	color: #ffffff;
	border-color: rgba(255, 255, 255, 0.3);
}

.action-btn.secondary:hover {
	background: rgba(255, 255, 255, 0.2);
	transform: translateY(-1px);
}

.action-btn.success {
	background: rgba(76, 175, 80, 0.1);
	color: #4caf50;
	border-color: rgba(76, 175, 80, 0.3);
	grid-column: 1 / -1;
	margin-top: 0.5rem;
}

.action-btn.success:hover:not(:disabled) {
	background: rgba(76, 175, 80, 0.2);
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.action-btn.info {
	background: rgba(33, 150, 243, 0.1);
	color: #2196f3;
	border-color: rgba(33, 150, 243, 0.3);
}

.action-btn.info:hover {
	background: rgba(33, 150, 243, 0.2);
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.action-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
	transform: none !important;
	box-shadow: none !important;
}

.action-btn .btn-icon {
	font-size: 1rem;
}

/* 参数设置面板响应式 */
@media (max-width: 768px) {
	.action-buttons {
		grid-template-columns: 1fr;
	}
	
	.action-btn.success {
		grid-column: 1;
	}
	
	.playback-controls {
		grid-template-columns: 1fr 1fr;
	}
	
	.number-input-group {
		flex-direction: column;
		align-items: stretch;
	}
	
	.input-unit {
		text-align: center;
		min-width: auto;
	}
}
</style>
