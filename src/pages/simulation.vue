<!--
 * @Author: AI Assistant
 * @Description: 人群仿真结果可视化页面 - 南京东路-外滩客流仿真
 * @Date: 2024-12-14
-->
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
								:enable-damping="true"
								:enable-rotate="viewMode === 'free'"
								:enable-pan="true"
								:enable-zoom="true"
								:max-polar-angle="viewMode === 'fixed' ? Math.PI / 2 : Math.PI"
								:min-polar-angle="viewMode === 'fixed' ? Math.PI / 2 : 0"
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
												<span>{{ cameraSettings.position.x }}</span>
											</div>
											<div>
												<span>Y</span>
												<input type="range" min="0" max="3000" step="1" v-model="cameraSettings.position.y" @input="updateCameraPosition" />
												<span>{{ cameraSettings.position.y }}</span>
											</div>
											<div>
												<span>Z</span>
												<input type="range" min="-2000" max="2000" step="1" v-model="cameraSettings.position.z" @input="updateCameraPosition" />
												<span>{{ cameraSettings.position.z }}</span>
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
import { useRouter } from 'vue-router'
import { SRGBColorSpace, BasicShadowMap, NoToneMapping } from 'three'
import { OrbitControls } from '@tresjs/cientos'
import { loadCityFBX } from '../plugins/digitalCity/common/loadCity'
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

// 路由
const router = useRouter()


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


// 视角模式
const viewMode = ref('free') // 'fixed' | 'free'

// 相机设置
const cameraSettings = reactive({
	position: {
		x: 600,
		y: 750,
		z: -1221
	},
	rotation: {
		x: 0,
		y: 0,
		z: 0
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
	router.push('/')
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
			const res = await fetchPedestrianData(1, simTime)
			if (res.success && Array.isArray(res.data)) {
				const map = new Map()
				res.data.forEach((item: any) => {
					const key = `${item.posX},${item.posY}`
					if (map.has(key)) {
						map.set(key, map.get(key) + 1)
					} else {
						map.set(key, 1)
					}
				})
				const totalCount = res.data.length || 1
				simulationStatus.dataPointCount = totalCount // 数据点数量即总人数
				const data = Array.from(map.entries()).map(([k, v]) => {
					const [x, y] = k.split(',').map(Number)
					return { x, y, value: v / totalCount * 360 }
				})
				heatmapData.value = {
					max: 360,
					min: 0,
					data
				}
				console.log('当前热力图数据:', JSON.stringify(heatmapData.value, null, 2))
			} else {
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
	viewMode.value = mode
	console.log('视角模式切换为:', mode)
	
	if (mode === 'fixed') {
		// 固定视角：用户自定义最佳俯视参数
		cameraSettings.position.x = -235.025520324126;
		cameraSettings.position.y = 1607.8986144439282;
		cameraSettings.position.z = 363.0626946271882;
		cameraSettings.rotation.x = -1.572990141332782;
		cameraSettings.rotation.y = -0.019780875806765456;
		cameraSettings.rotation.z = -1.6812580909431307;
	} else {
		// 开放视角：恢复默认
		cameraSettings.position.x = 600
		cameraSettings.position.y = 750
		cameraSettings.position.z = -1221
		cameraSettings.rotation.x = 0
		cameraSettings.rotation.y = 0
		cameraSettings.rotation.z = 0
	}
	updateCamera()
}

const getViewModeDescription = () => {
	if (viewMode.value === 'fixed') {
		return '固定俯视角度，只能平移，不能旋转'
	} else {
		return '自由视角，可以旋转、缩放和平移'
	}
}

const updateCameraPosition = () => {
	console.log('更新相机位置:', cameraSettings.position)
	updateCamera()
}

const updateCamera = () => {
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
			// 可复制格式
			console.log('复制格式:');
			console.log(`position: [${pos.x}, ${pos.y}, ${pos.z}]`);
			console.log(`rotation: [${rot.x}, ${rot.y}, ${rot.z}]`);
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

	// 自动加载城市模型
	await loadCityModel()
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
})


// 热力图数据格式说明和示例
/*
热力图数据格式要求：

1. 基础数据格式：
const heatmapData = {
  max: 36,        // 最大值
  min: -10,       // 最小值
  data: [         // 数据点数组
    {
      x: number,      // X坐标 (1 到 canvas宽度)
      y: number,      // Y坐标 (1 到 canvas高度)
      value: number   // 热力值 (min 到 max 之间)
    }
  ]
}

2. 示例数据：
const exampleData = {
  max: 36,
  min: -10,
  data: [
    { x: 50, y: 50, value: 25 },
    { x: 100, y: 100, value: 30 },
    { x: 150, y: 150, value: 20 },
    // ... 更多数据点
  ]
}

3. 实时数据更新：
- 可以通过修改 heatmap.setData() 来更新数据
- 支持时间序列数据播放
- 支持动态数据更新

4. 数据来源建议：
- 人群密度数据
- 温度传感器数据
- 交通流量数据
- 环境监测数据
- 仿真计算结果
*/

// rotation 弧度 <-> 度数（分别用 computed 实现）
const rotationDegreesX = computed({
  get: () => Math.round(cameraSettings.rotation.x * 180 / Math.PI),
  set: (val: number) => { cameraSettings.rotation.x = val * Math.PI / 180; updateCamera(); }
})
const rotationDegreesY = computed({
  get: () => Math.round(cameraSettings.rotation.y * 180 / Math.PI),
  set: (val: number) => { cameraSettings.rotation.y = val * Math.PI / 180; updateCamera(); }
})
const rotationDegreesZ = computed({
  get: () => Math.round(cameraSettings.rotation.z * 180 / Math.PI),
  set: (val: number) => { cameraSettings.rotation.z = val * Math.PI / 180; updateCamera(); }
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
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
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
