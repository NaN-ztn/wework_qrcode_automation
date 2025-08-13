class RendererApp {
  private installBtn!: HTMLButtonElement
  private executeBtn!: HTMLButtonElement
  private stopBtn!: HTMLButtonElement
  private statusDiv!: HTMLDivElement
  private logsDiv!: HTMLDivElement
  private progressPanel!: HTMLDivElement
  private progressBar!: HTMLDivElement
  private progressText!: HTMLDivElement

  // 门店表单相关元素
  private storeForm!: HTMLFormElement
  private storeNameInput!: HTMLInputElement
  private mobileInput!: HTMLInputElement
  private storeTypeSelect!: HTMLSelectElement
  private assistantSelect!: HTMLSelectElement

  // 标签页元素
  private mainTab!: HTMLButtonElement
  private configTab!: HTMLButtonElement
  private mainPanel!: HTMLDivElement
  private configPanel!: HTMLDivElement

  // 配置表单元素
  private configForm!: HTMLFormElement
  private saveConfigBtn!: HTMLButtonElement

  // 数组配置元素
  private userMappingsList!: HTMLDivElement
  private storeTypesList!: HTMLDivElement
  private newUserMappingInput!: HTMLInputElement
  private newStoreTypeInput!: HTMLInputElement
  private addUserMappingBtn!: HTMLButtonElement
  private addStoreTypeBtn!: HTMLButtonElement

  // 当前配置数据
  private currentConfig: any = null

  // 日志控制元素
  private clearLogsBtn!: HTMLButtonElement
  private autoScrollBtn!: HTMLButtonElement

  private isRunning = false
  private autoScroll = true

  constructor() {
    this.initializeElements()
    this.setupEventListeners()
    this.loadConfig()
    this.initializeStoreForm()
    this.startStatusUpdater()
    this.addLog('应用程序已启动', 'info')
  }

  private initializeElements(): void {
    this.installBtn = document.getElementById('installBtn') as HTMLButtonElement
    this.executeBtn = document.getElementById('executeBtn') as HTMLButtonElement
    this.stopBtn = document.getElementById('stopBtn') as HTMLButtonElement
    this.statusDiv = document.getElementById('status') as HTMLDivElement
    this.logsDiv = document.getElementById('logs') as HTMLDivElement
    this.progressPanel = document.getElementById('progressPanel') as HTMLDivElement
    this.progressBar = document.getElementById('progressBar') as HTMLDivElement
    this.progressText = document.getElementById('progressText') as HTMLDivElement

    // 门店表单相关元素
    this.storeForm = document.getElementById('storeForm') as HTMLFormElement
    this.storeNameInput = document.getElementById('storeName') as HTMLInputElement
    this.mobileInput = document.getElementById('mobile') as HTMLInputElement
    this.storeTypeSelect = document.getElementById('storeType') as HTMLSelectElement
    this.assistantSelect = document.getElementById('assistant') as HTMLSelectElement

    // 标签页元素
    this.mainTab = document.getElementById('mainTab') as HTMLButtonElement
    this.configTab = document.getElementById('configTab') as HTMLButtonElement
    this.mainPanel = document.getElementById('mainPanel') as HTMLDivElement
    this.configPanel = document.getElementById('configPanel') as HTMLDivElement

    // 配置表单元素
    this.configForm = document.getElementById('configForm') as HTMLFormElement
    this.saveConfigBtn = document.getElementById('saveConfigBtn') as HTMLButtonElement

    // 数组配置元素
    this.userMappingsList = document.getElementById('userMappingsList') as HTMLDivElement
    this.storeTypesList = document.getElementById('storeTypesList') as HTMLDivElement
    this.newUserMappingInput = document.getElementById('newUserMapping') as HTMLInputElement
    this.newStoreTypeInput = document.getElementById('newStoreType') as HTMLInputElement
    this.addUserMappingBtn = document.getElementById('addUserMapping') as HTMLButtonElement
    this.addStoreTypeBtn = document.getElementById('addStoreType') as HTMLButtonElement

    // 日志控制元素
    this.clearLogsBtn = document.getElementById('clearLogsBtn') as HTMLButtonElement
    this.autoScrollBtn = document.getElementById('autoScrollBtn') as HTMLButtonElement
  }

  private setupEventListeners(): void {
    this.executeBtn.addEventListener('click', () => this.executeTask())
    this.stopBtn.addEventListener('click', () => this.stopExecution())

    // 标签页切换
    this.mainTab.addEventListener('click', () => this.switchTab('main'))
    this.configTab.addEventListener('click', () => this.switchTab('config'))

    // 配置管理
    this.saveConfigBtn.addEventListener('click', () => this.saveConfig())

    // 数组配置管理
    this.addUserMappingBtn.addEventListener('click', () => this.addUserMapping())
    this.addStoreTypeBtn.addEventListener('click', () => this.addStoreType())
    this.newUserMappingInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addUserMapping()
    })
    this.newStoreTypeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addStoreType()
    })

    // 日志控制
    this.clearLogsBtn.addEventListener('click', () => this.clearLogs())
    this.autoScrollBtn.addEventListener('click', () => this.toggleAutoScroll())

    // 监听主进程日志
    this.setupMainProcessLogListener()
  }

  private switchTab(tab: 'main' | 'config'): void {
    // 清除所有active状态
    this.mainTab.classList.remove('active')
    this.configTab.classList.remove('active')
    this.mainPanel.classList.remove('active')
    this.configPanel.classList.remove('active')

    // 设置新的active状态
    if (tab === 'main') {
      this.mainTab.classList.add('active')
      this.mainPanel.classList.add('active')
    } else {
      this.configTab.classList.add('active')
      this.configPanel.classList.add('active')
      this.loadConfig() // 切换到配置页面时重新加载配置
    }
  }

  private async initializeStoreForm(): Promise<void> {
    try {
      // 获取配置数据来填充下拉框选项
      const result = await window.electronAPI.getConfig()
      if (result.success && result.config) {
        // 填充门店类型选项
        this.populateSelectOptions(this.storeTypeSelect, result.config.STORE_TYPE || [])

        // 填充小助理选项
        this.populateSelectOptions(this.assistantSelect, result.config.USER_MAPPINGS || [])
      }

      // 添加表单验证
      this.setupFormValidation()

      this.addLog('门店表单初始化完成', 'info')
    } catch (error) {
      this.addLog('门店表单初始化失败: ' + error, 'error')
    }
  }

  private populateSelectOptions(selectElement: HTMLSelectElement, options: string[]): void {
    // 清除除了默认选项之外的所有选项
    while (selectElement.children.length > 1) {
      selectElement.removeChild(selectElement.lastChild!)
    }

    // 添加新选项
    options.forEach((option) => {
      const optionElement = document.createElement('option')
      optionElement.value = option
      optionElement.textContent = option
      selectElement.appendChild(optionElement)
    })
  }

  private setupFormValidation(): void {
    // 手机号验证
    this.mobileInput.addEventListener('input', () => {
      const value = this.mobileInput.value
      const isValid = /^[0-9]{11}$/.test(value)

      if (value.length > 0 && !isValid) {
        this.mobileInput.setCustomValidity('请输入11位有效手机号')
      } else {
        this.mobileInput.setCustomValidity('')
      }
    })

    // 实时验证所有必填字段
    const requiredFields = [
      this.storeNameInput,
      this.mobileInput,
      this.storeTypeSelect,
      this.assistantSelect,
    ]
    requiredFields.forEach((field) => {
      field.addEventListener('change', () => this.validateForm())
      field.addEventListener('input', () => this.validateForm())
    })
  }

  private validateForm(): boolean {
    const storeName = this.storeNameInput.value.trim()
    const mobile = this.mobileInput.value.trim()
    const storeType = this.storeTypeSelect.value
    const assistant = this.assistantSelect.value

    // 详细的表单验证
    const validations = {
      storeName: storeName.length >= 2,
      mobile: /^[0-9]{11}$/.test(mobile),
      storeType: storeType !== '',
      assistant: assistant !== '',
    }

    const isValid = Object.values(validations).every(Boolean)

    // 更新执行按钮状态和样式
    this.executeBtn.disabled = !isValid || this.isRunning

    // 更新按钮文本
    if (this.isRunning) {
      this.executeBtn.querySelector('.btn-text')!.textContent = '执行中...'
    } else if (isValid) {
      this.executeBtn.querySelector('.btn-text')!.textContent = '执行任务'
    } else {
      this.executeBtn.querySelector('.btn-text')!.textContent = '请完善信息'
    }

    return isValid
  }

  private getStoreFormData() {
    return {
      storeName: this.storeNameInput.value.trim(),
      mobile: this.mobileInput.value.trim(),
      storeType: this.storeTypeSelect.value,
      assistant: this.assistantSelect.value,
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const result = await window.electronAPI.getConfig()
      if (result.success && result.config) {
        this.currentConfig = result.config
        this.populateConfigForm(result.config)
        this.addLog('配置文件加载成功', 'info')
      } else {
        this.addLog('配置文件加载失败: ' + result.message, 'error')
      }
    } catch (error) {
      this.addLog('加载配置失败: ' + error, 'error')
    }
  }

  private populateConfigForm(config: any): void {
    // 基本配置
    ;(document.getElementById('appName') as HTMLInputElement).value = config.APP_NAME || ''

    // 自动化配置
    ;(document.getElementById('weworkContactUrl') as HTMLInputElement).value =
      config.WEWORK_CONTACT_URL || ''
    ;(document.getElementById('weworkCreateGroupUrl') as HTMLInputElement).value =
      config.WEWORK_CREATE_GROUP_LIVE_CODE_URL || ''
    ;(document.getElementById('userDataDir') as HTMLInputElement).value = config.USER_DATA_DIR || ''
    ;(document.getElementById('storeAvatarPath') as HTMLInputElement).value =
      config.STORE_AVATAR_PATH || ''
    ;(document.getElementById('qrCodeStorePath') as HTMLInputElement).value =
      config.QRCODE_TARGET_STORE_PATH || ''
    ;(document.getElementById('weibanDashboard') as HTMLInputElement).value =
      config.WEIBAN_DASHBOARD_URL || ''
    ;(document.getElementById('weibanQrCreate') as HTMLInputElement).value =
      config.WEIBAN_QR_CREATE_URL || ''

    // 消息模板配置
    ;(document.getElementById('weibanWelcomeMsg') as HTMLTextAreaElement).value =
      config.WEIBAN_WELCOME_MSG || ''
    ;(document.getElementById('weibanWelcomeMsgIndependent') as HTMLTextAreaElement).value =
      config.WEIBAN_WELCOME_MSG_INDEPENDENT || ''

    // 用户数据配置 - 数组类型
    this.populateArrayField('userMappings', config.USER_MAPPINGS || [])
    this.populateArrayField('storeTypes', config.STORE_TYPE || [])
  }

  private populateArrayField(fieldName: string, values: string[]): void {
    const container = fieldName === 'userMappings' ? this.userMappingsList : this.storeTypesList
    container.innerHTML = ''

    values.forEach((value) => {
      this.addArrayItem(fieldName, value)
    })
  }

  private addArrayItem(fieldName: string, value: string): void {
    const container = fieldName === 'userMappings' ? this.userMappingsList : this.storeTypesList
    const item = document.createElement('div')
    item.className = 'list-item'
    item.innerHTML = `
      <span class="list-item-text">${value}</span>
      <button type="button" class="btn btn-small btn-danger remove-item">删除</button>
    `

    const removeBtn = item.querySelector('.remove-item') as HTMLButtonElement
    removeBtn.addEventListener('click', () => {
      item.remove()
    })

    container.appendChild(item)
  }

  private addUserMapping(): void {
    const value = this.newUserMappingInput.value.trim()
    if (value) {
      this.addArrayItem('userMappings', value)
      this.newUserMappingInput.value = ''
    }
  }

  private addStoreType(): void {
    const value = this.newStoreTypeInput.value.trim()
    if (value) {
      this.addArrayItem('storeTypes', value)
      this.newStoreTypeInput.value = ''
    }
  }

  private getArrayFieldValues(fieldName: string): string[] {
    const container = fieldName === 'userMappings' ? this.userMappingsList : this.storeTypesList
    const items = container.querySelectorAll('.list-item-text')
    return Array.from(items).map((item) => item.textContent || '')
  }

  private async saveConfig(): Promise<void> {
    try {
      const formData = new FormData(this.configForm)
      const config: any = {}

      // 转换表单数据为配置对象
      formData.forEach((value, key) => {
        config[key] = value
      })

      // 处理数组字段
      config.USER_MAPPINGS = this.getArrayFieldValues('userMappings')
      config.STORE_TYPE = this.getArrayFieldValues('storeTypes')

      this.saveConfigBtn.disabled = true
      this.saveConfigBtn.textContent = '保存中...'

      const result = await window.electronAPI.saveConfig(config)

      if (result.success) {
        this.addLog(result.message, 'success')
        this.currentConfig = config // 更新当前配置缓存

        // 显示保存成功的提示
        this.showConfigSaveSuccess()
      } else {
        this.addLog(result.message, 'error')
      }
    } catch (error) {
      this.addLog('保存配置失败: ' + error, 'error')
    } finally {
      this.saveConfigBtn.disabled = false
      this.saveConfigBtn.textContent = '保存配置'
    }
  }

  private showConfigSaveSuccess(): void {
    // 创建提示元素
    const notification = document.createElement('div')
    notification.className = 'config-save-notification'
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">✅</span>
        <span class="notification-text">配置保存成功！</span>
      </div>
    `

    // 添加样式
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    `

    // 添加动画样式
    const style = document.createElement('style')
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `
    if (!document.head.querySelector('style[data-config-notification]')) {
      style.setAttribute('data-config-notification', 'true')
      document.head.appendChild(style)
    }

    // 添加到页面
    document.body.appendChild(notification)

    // 3秒后自动消失
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out forwards'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }

  private async executeTask(): Promise<void> {
    try {
      // 第一层验证：基本表单验证
      if (!this.validateForm()) {
        this.addLog('❌ 请填写完整的门店信息', 'error')
        this.showValidationErrors()
        return
      }

      const storeData = this.getStoreFormData()

      // 第二层验证：详细业务逻辑验证
      const validationResult = this.validateStoreData(storeData)
      if (!validationResult.isValid) {
        this.addLog(`❌ 信息验证失败: ${validationResult.message}`, 'error')
        return
      }

      this.isRunning = true
      this.executeBtn.disabled = true
      this.stopBtn.disabled = false
      this.validateForm() // 更新按钮文本为"执行中..."

      this.addLog(`🚀 开始执行任务`, 'info')
      this.addLog(`📋 门店信息: ${storeData.storeName} (${storeData.storeType})`, 'info')
      this.addLog(`📞 联系方式: ${storeData.mobile}`, 'info')
      this.addLog(`👤 执行助理: ${storeData.assistant}`, 'info')

      const result = await window.electronAPI.executeTask()

      // 处理执行结果
      if (result.success) {
        this.addLog(`✅ ${result.message}`, 'success')
      } else {
        this.addLog(`❌ ${result.message}`, 'error')
      }
    } catch (error) {
      this.addLog(`💥 任务执行异常: ${error}`, 'error')
    } finally {
      this.isRunning = false
      this.validateForm() // 重新验证表单以更新按钮状态
      this.stopBtn.disabled = true
    }
  }

  private validateStoreData(storeData: any): { isValid: boolean; message: string } {
    // 门店名称验证
    if (storeData.storeName.length < 2) {
      return { isValid: false, message: '门店名称至少需要2个字符' }
    }

    if (storeData.storeName.length > 50) {
      return { isValid: false, message: '门店名称不能超过50个字符' }
    }

    // 手机号验证
    if (!/^1[3-9]\d{9}$/.test(storeData.mobile)) {
      return { isValid: false, message: '请输入有效的手机号码' }
    }

    // 门店类型验证
    if (!storeData.storeType || storeData.storeType === '') {
      return { isValid: false, message: '请选择门店类型' }
    }

    // 助理验证
    if (!storeData.assistant || storeData.assistant === '') {
      return { isValid: false, message: '请选择执行助理' }
    }

    return { isValid: true, message: '验证通过' }
  }

  private showValidationErrors(): void {
    const storeName = this.storeNameInput.value.trim()
    const mobile = this.mobileInput.value.trim()
    const storeType = this.storeTypeSelect.value
    const assistant = this.assistantSelect.value

    if (!storeName) {
      this.addLog('📝 请输入门店名称', 'error')
    }
    if (!mobile) {
      this.addLog('📞 请输入手机号码', 'error')
    } else if (!/^[0-9]{11}$/.test(mobile)) {
      this.addLog('📞 请输入正确的11位手机号码', 'error')
    }
    if (!storeType) {
      this.addLog('🏪 请选择门店类型', 'error')
    }
    if (!assistant) {
      this.addLog('👤 请选择执行助理', 'error')
    }
  }

  private async stopExecution(): Promise<void> {
    try {
      this.addLog('正在停止执行...', 'info')
      const result = await window.electronAPI.stopExecution()

      if (result.success) {
        this.addLog(result.message, 'success')
      } else {
        this.addLog(result.message, 'error')
      }
    } catch (error) {
      this.addLog(`停止执行失败: ${error}`, 'error')
    }
  }

  private startStatusUpdater(): void {
    // 每2秒更新一次停止按钮状态
    setInterval(async () => {
      if (!this.isRunning) {
        await this.updateStopButtonStatus()
      }
    }, 2000)
  }

  private async updateStopButtonStatus(): Promise<void> {
    try {
      const result = await window.electronAPI.getBrowserRunning()
      if (result.success && result.data) {
        this.stopBtn.disabled = !result.data.isRunning
      }
    } catch (error) {
      console.error('更新停止按钮状态失败:', error)
    }
  }

  private setupMainProcessLogListener(): void {
    // 监听主进程日志
    window.electronAPI.onMainProcessLog(
      (logData: { level: string; message: string; timestamp: string }) => {
        this.addMainProcessLog(
          logData.message,
          logData.level as 'log' | 'error' | 'warn',
          logData.timestamp,
        )
      },
    )

    // 启动时加载历史日志
    this.loadHistoryLogs()
  }

  private async loadHistoryLogs(): Promise<void> {
    try {
      const result = await window.electronAPI.getLogs()
      if (result.success && result.data) {
        result.data.forEach((logEntry: string) => {
          this.addRawLog(logEntry)
        })
      }
    } catch (error) {
      console.error('加载历史日志失败:', error)
    }
  }

  private clearLogs(): void {
    this.logsDiv.innerHTML = ''
    window.electronAPI.clearLogs().then((result) => {
      if (result.success) {
        this.addLog('日志已清空', 'info')
      }
    })
  }

  private toggleAutoScroll(): void {
    this.autoScroll = !this.autoScroll
    this.autoScrollBtn.classList.toggle('active', this.autoScroll)
    this.autoScrollBtn.textContent = this.autoScroll ? '自动滚动' : '手动滚动'
  }

  private addMainProcessLog(
    message: string,
    level: 'log' | 'error' | 'warn',
    timestamp: string,
  ): void {
    const logEntry = document.createElement('div')
    const typeMap = { log: 'info', error: 'error', warn: 'warning' }
    logEntry.className = `log-entry ${typeMap[level]} main-process`
    logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> <span class="log-source">[主进程]</span> <span class="log-message">${message}</span>`

    this.logsDiv.appendChild(logEntry)
    if (this.autoScroll) {
      this.logsDiv.scrollTop = this.logsDiv.scrollHeight
    }
  }

  private addRawLog(rawLogEntry: string): void {
    const logEntry = document.createElement('div')
    logEntry.className = 'log-entry raw'
    logEntry.textContent = rawLogEntry

    this.logsDiv.appendChild(logEntry)
    if (this.autoScroll) {
      this.logsDiv.scrollTop = this.logsDiv.scrollHeight
    }
  }

  private addLog(message: string, type: 'info' | 'success' | 'error'): void {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = document.createElement('div')
    logEntry.className = `log-entry ${type} renderer-process`
    logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> <span class="log-source">[渲染进程]</span> <span class="log-message">${message}</span>`

    this.logsDiv.appendChild(logEntry)
    if (this.autoScroll) {
      this.logsDiv.scrollTop = this.logsDiv.scrollHeight
    }
  }
}

// 等待DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new RendererApp()
})
