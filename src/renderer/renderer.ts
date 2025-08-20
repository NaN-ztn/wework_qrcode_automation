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
  private weibanAssistantSelect!: HTMLSelectElement

  // 标签页元素
  private mainTab!: HTMLButtonElement
  private groupReplaceTab!: HTMLButtonElement
  private historyTab!: HTMLButtonElement
  private configTab!: HTMLButtonElement
  private mainPanel!: HTMLDivElement
  private groupReplacePanel!: HTMLDivElement
  private historyPanel!: HTMLDivElement
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

  // 步骤管理元素
  private stepItems!: NodeListOf<HTMLDivElement>

  // 二维码相关元素
  private weworkQrImage!: HTMLImageElement
  private weibanQrImage!: HTMLImageElement
  private openQrCodeFolderBtn!: HTMLButtonElement

  // 历史任务相关元素
  private refreshHistoryBtn!: HTMLButtonElement
  private historyLoading!: HTMLDivElement
  private historyList!: HTMLDivElement
  private noHistoryMessage!: HTMLDivElement

  // 群码替换相关元素
  private groupReplaceForm!: HTMLFormElement
  private groupSearchKeywordInput!: HTMLInputElement
  private executeGroupReplaceBtn!: HTMLButtonElement
  private stopGroupReplaceBtn!: HTMLButtonElement
  private groupReplaceLogs!: HTMLDivElement
  private clearGroupReplaceLogsBtn!: HTMLButtonElement
  private autoScrollGroupReplaceBtn!: HTMLButtonElement

  // 步骤状态管理
  private steps = [
    { id: 1, title: '检查企微登录状态', status: 'pending', message: '等待执行...' },
    { id: 2, title: '检查微伴登录状态', status: 'pending', message: '等待执行...' },
    { id: 3, title: '更改企微通讯录名称', status: 'pending', message: '等待执行...' },
    { id: 4, title: '创建企业微信群码', status: 'pending', message: '等待执行...' },
    { id: 5, title: '创建微伴+v活码', status: 'pending', message: '等待执行...' },
  ]

  // 二维码路径存储
  private qrCodePaths = {
    weworkQrPath: '',
    weibanQrPath: '',
  }

  private isRunning = false
  private isGroupReplaceRunning = false
  private autoScroll = true
  private autoScrollGroupReplace = true

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
    this.weibanAssistantSelect = document.getElementById('weibanAssistant') as HTMLSelectElement

    // 标签页元素
    this.mainTab = document.getElementById('mainTab') as HTMLButtonElement
    this.groupReplaceTab = document.getElementById('groupReplaceTab') as HTMLButtonElement
    this.historyTab = document.getElementById('historyTab') as HTMLButtonElement
    this.configTab = document.getElementById('configTab') as HTMLButtonElement
    this.mainPanel = document.getElementById('mainPanel') as HTMLDivElement
    this.groupReplacePanel = document.getElementById('groupReplacePanel') as HTMLDivElement
    this.historyPanel = document.getElementById('historyPanel') as HTMLDivElement
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

    // 步骤管理元素
    this.stepItems = document.querySelectorAll('.step-item') as NodeListOf<HTMLDivElement>

    // 二维码相关元素
    this.weworkQrImage = document.getElementById('weworkQrImage') as HTMLImageElement
    this.weibanQrImage = document.getElementById('weibanQrImage') as HTMLImageElement
    this.openQrCodeFolderBtn = document.getElementById('openQrCodeFolder') as HTMLButtonElement

    // 历史任务相关元素
    this.refreshHistoryBtn = document.getElementById('refreshHistoryBtn') as HTMLButtonElement
    this.historyLoading = document.getElementById('historyLoading') as HTMLDivElement
    this.historyList = document.getElementById('historyList') as HTMLDivElement
    this.noHistoryMessage = document.getElementById('noHistoryMessage') as HTMLDivElement

    // 群码替换相关元素
    this.groupReplaceForm = document.getElementById('groupReplaceForm') as HTMLFormElement
    this.groupSearchKeywordInput = document.getElementById('groupSearchKeyword') as HTMLInputElement
    this.executeGroupReplaceBtn = document.getElementById(
      'executeGroupReplaceBtn',
    ) as HTMLButtonElement
    this.stopGroupReplaceBtn = document.getElementById('stopGroupReplaceBtn') as HTMLButtonElement
    this.groupReplaceLogs = document.getElementById('groupReplaceLogs') as HTMLDivElement
    this.clearGroupReplaceLogsBtn = document.getElementById(
      'clearGroupReplaceLogsBtn',
    ) as HTMLButtonElement
    this.autoScrollGroupReplaceBtn = document.getElementById(
      'autoScrollGroupReplaceBtn',
    ) as HTMLButtonElement
  }

  private setupEventListeners(): void {
    this.executeBtn.addEventListener('click', () => this.executeTask())
    this.stopBtn.addEventListener('click', () => this.stopExecution())

    // 标签页切换
    this.mainTab.addEventListener('click', () => this.switchTab('main'))
    this.groupReplaceTab.addEventListener('click', () => this.switchTab('groupReplace'))
    this.historyTab.addEventListener('click', () => this.switchTab('history'))
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

    // 历史任务控制
    this.refreshHistoryBtn.addEventListener('click', () => this.loadTaskHistory())

    // 群码替换控制
    this.groupReplaceForm.addEventListener('submit', (e) => this.executeGroupReplace(e))
    this.stopGroupReplaceBtn.addEventListener('click', () => this.stopGroupReplace())

    // 群码替换表单验证
    this.groupSearchKeywordInput.addEventListener('input', () => this.validateGroupReplaceForm())
    this.groupSearchKeywordInput.addEventListener('change', () => this.validateGroupReplaceForm())

    // 群码替换日志控制
    this.clearGroupReplaceLogsBtn.addEventListener('click', () => this.clearGroupReplaceLogs())
    this.autoScrollGroupReplaceBtn.addEventListener('click', () =>
      this.toggleAutoScrollGroupReplace(),
    )

    // 二维码文件夹打开 - 统一按钮，根据有哪个二维码来决定打开哪个文件夹
    this.openQrCodeFolderBtn.addEventListener('click', () => {
      const folderPath = this.qrCodePaths.weworkQrPath || this.qrCodePaths.weibanQrPath
      if (folderPath) {
        this.openQrCodeFolder(folderPath)
      } else {
        this.addLog('❌ 暂无二维码文件可打开', 'error')
      }
    })

    // 监听主进程日志和步骤更新
    this.setupMainProcessLogListener()
    this.setupStepUpdateListener()
    this.setupQrCodeUpdateListener()
    this.setupConfigUpdateListener()
    this.setupButtonStateUpdateListener()
  }

  private switchTab(tab: 'main' | 'groupReplace' | 'history' | 'config'): void {
    // 清除所有active状态
    this.mainTab.classList.remove('active')
    this.groupReplaceTab.classList.remove('active')
    this.historyTab.classList.remove('active')
    this.configTab.classList.remove('active')
    this.mainPanel.classList.remove('active')
    this.groupReplacePanel.classList.remove('active')
    this.historyPanel.classList.remove('active')
    this.configPanel.classList.remove('active')

    // 设置新的active状态
    if (tab === 'main') {
      this.mainTab.classList.add('active')
      this.mainPanel.classList.add('active')
    } else if (tab === 'groupReplace') {
      this.groupReplaceTab.classList.add('active')
      this.groupReplacePanel.classList.add('active')
      this.initGroupReplaceTab() // 初始化群码替换页面
    } else if (tab === 'history') {
      this.historyTab.classList.add('active')
      this.historyPanel.classList.add('active')
      this.loadTaskHistory() // 切换到历史页面时加载历史记录
    } else if (tab === 'config') {
      this.configTab.classList.add('active')
      this.configPanel.classList.add('active')
      this.loadConfig() // 切换到配置页面时重新加载配置
    }
  }

  private initGroupReplaceTab(): void {
    // 清除群码替换日志区域的占位符
    this.clearGroupReplaceLogs()
    this.addGroupReplaceLog('📝 群码替换功能已准备就绪，请输入搜索关键词后点击开始替换', 'info')
    // 验证群码替换表单状态
    this.validateGroupReplaceForm()
  }

  private validateGroupReplaceForm(): boolean {
    const searchKeyword = this.groupSearchKeywordInput.value.trim()

    // 关键词验证：必须不为空
    const isValid = searchKeyword.length > 0

    // 更新执行按钮状态和样式
    this.executeGroupReplaceBtn.disabled = !isValid || this.isGroupReplaceRunning
    this.stopGroupReplaceBtn.disabled = !this.isGroupReplaceRunning

    // 更新按钮文本
    if (this.isGroupReplaceRunning) {
      this.executeGroupReplaceBtn.querySelector('.btn-text')!.textContent = '执行中...'
      this.stopGroupReplaceBtn.querySelector('.btn-text')!.textContent = '停止替换'
    } else if (isValid) {
      this.executeGroupReplaceBtn.querySelector('.btn-text')!.textContent = '开始群码替换'
      this.stopGroupReplaceBtn.querySelector('.btn-text')!.textContent = '停止替换'
    } else {
      this.executeGroupReplaceBtn.querySelector('.btn-text')!.textContent = '请输入关键词'
      this.stopGroupReplaceBtn.querySelector('.btn-text')!.textContent = '停止替换'
    }

    return isValid
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

        // 填充微伴承接人选项
        this.populateSelectOptions(this.weibanAssistantSelect, result.config.USER_MAPPINGS || [])
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
      weibanAssistant: this.weibanAssistantSelect.value,
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
    ;(document.getElementById('weworkGroupManagementUrl') as HTMLInputElement).value =
      config.WEWORK_GROUP_MANAGEMENT_URL || ''

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

        // 保存成功后自动切换回主页
        setTimeout(() => {
          this.switchTab('main')
        }, 1000)
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

      // 重置步骤状态
      this.resetSteps()
      this.clearQrCodes()

      this.isRunning = true
      this.executeBtn.disabled = true
      this.stopBtn.disabled = false
      this.validateForm() // 更新按钮文本为"执行中..."

      this.addLog(`🚀 开始执行任务`, 'info')
      this.addLog(`📋 门店信息: ${storeData.storeName} (${storeData.storeType})`, 'info')
      this.addLog(`📞 联系方式: ${storeData.mobile}`, 'info')
      this.addLog(`👤 执行助理: ${storeData.assistant}`, 'info')

      const result = await window.electronAPI.executeTask(storeData)

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

  // 步骤管理方法
  private resetSteps(): void {
    this.steps.forEach((step, index) => {
      step.status = 'pending'
      step.message = '等待执行...'
      this.updateStepUI(index + 1, step.status, step.message)
    })
  }

  private updateStepUI(stepNumber: number, status: string, message: string): void {
    const stepItem = document.querySelector(`[data-step="${stepNumber}"]`) as HTMLDivElement
    if (!stepItem) return

    const stepStatusElement = stepItem.querySelector('.step-status') as HTMLSpanElement
    const stepMessageElement = stepItem.querySelector('.step-message') as HTMLDivElement

    // 更新状态图标
    const statusIcons = {
      pending: '⏳',
      running: '🔄',
      completed: '✅',
      failed: '❌',
    }
    stepStatusElement.textContent = statusIcons[status as keyof typeof statusIcons] || '⏳'
    stepStatusElement.className = `step-status ${status}`

    // 更新消息
    stepMessageElement.textContent = message

    // 更新步骤项样式
    stepItem.className = `step-item ${status}`
  }

  // 二维码管理方法
  private clearQrCodes(): void {
    this.qrCodePaths.weworkQrPath = ''
    this.qrCodePaths.weibanQrPath = ''

    // 隐藏图片并显示占位符
    this.weworkQrImage.style.display = 'none'
    this.weibanQrImage.style.display = 'none'
    this.openQrCodeFolderBtn.style.display = 'none'

    const placeholders = document.querySelectorAll('.qrcode-placeholder')
    placeholders.forEach((placeholder) => {
      ;(placeholder as HTMLElement).style.display = 'block'
    })
  }

  private displayQrCode(type: 'wework' | 'weiban', imagePath: string): void {
    const imageElement = type === 'wework' ? this.weworkQrImage : this.weibanQrImage
    const placeholder = document.querySelector(`#${type}QrCode .qrcode-placeholder`) as HTMLElement

    if (imagePath && imagePath.trim()) {
      // 设置图片路径（使用file://协议）
      imageElement.src = `file://${imagePath}`
      imageElement.style.display = 'block'
      placeholder.style.display = 'none'

      // 更新路径存储
      if (type === 'wework') {
        this.qrCodePaths.weworkQrPath = imagePath
      } else {
        this.qrCodePaths.weibanQrPath = imagePath
      }

      // 显示统一的打开文件夹按钮
      this.openQrCodeFolderBtn.style.display = 'block'
    }
  }

  private async openQrCodeFolder(filePath: string): Promise<void> {
    if (!filePath) {
      this.addLog('❌ 二维码文件路径为空', 'error')
      return
    }

    try {
      const result = await window.electronAPI.openQrCodeFolder(filePath)
      if (result.success) {
        this.addLog('📁 已打开文件夹', 'info')
      } else {
        this.addLog(`❌ 打开文件夹失败: ${result.message}`, 'error')
      }
    } catch (error) {
      this.addLog(`❌ 打开文件夹异常: ${error}`, 'error')
    }
  }

  // 事件监听器
  private setupStepUpdateListener(): void {
    window.electronAPI.onStepUpdate(
      (stepData: { step: number; status: string; message: string; timestamp: number }) => {
        // 更新内部状态
        const stepIndex = stepData.step - 1
        if (stepIndex >= 0 && stepIndex < this.steps.length) {
          this.steps[stepIndex].status = stepData.status
          this.steps[stepIndex].message = stepData.message
        }

        // 更新UI
        this.updateStepUI(stepData.step, stepData.status, stepData.message)

        // 记录日志
        const logMessage = `步骤${stepData.step}: ${stepData.message}`
        const logType =
          stepData.status === 'failed'
            ? 'error'
            : stepData.status === 'completed'
              ? 'success'
              : 'info'
        this.addLog(logMessage, logType)
      },
    )
  }

  private setupQrCodeUpdateListener(): void {
    window.electronAPI.onQrCodeUpdate(
      (qrCodePaths: { weworkQrPath: string; weibanQrPath: string }) => {
        // 显示二维码
        if (qrCodePaths.weworkQrPath) {
          this.displayQrCode('wework', qrCodePaths.weworkQrPath)
          this.addLog(`📷 企业微信群码已生成: ${qrCodePaths.weworkQrPath}`, 'success')
        }

        if (qrCodePaths.weibanQrPath) {
          this.displayQrCode('weiban', qrCodePaths.weibanQrPath)
          this.addLog(`📷 微伴活码已生成: ${qrCodePaths.weibanQrPath}`, 'success')
        }
      },
    )
  }

  private setupConfigUpdateListener(): void {
    window.electronAPI.onConfigUpdate((config: any) => {
      // 更新当前配置
      this.currentConfig = config
      this.addLog('📝 配置已更新，正在刷新门店信息选项...', 'info')

      // 重新初始化门店表单（更新下拉选项）
      this.initializeStoreForm()

      this.addLog('✅ 门店信息选项已更新', 'success')
    })
  }

  private setupButtonStateUpdateListener(): void {
    window.electronAPI.onButtonStateUpdate((data: { status: 'completed' | 'failed' }) => {
      // 恢复按钮到初始状态
      this.resetButtonStates()

      if (data.status === 'completed') {
        this.addLog('✅ 任务完成，浏览器已关闭', 'success')
      } else {
        this.addLog('❌ 任务失败，浏览器已关闭', 'error')
      }
    })
  }

  private resetButtonStates(): void {
    // 恢复执行按钮状态
    this.executeBtn.disabled = false
    this.executeBtn.classList.remove('running')

    // 恢复执行按钮的原始HTML结构
    this.executeBtn.innerHTML = `
      <span class="btn-icon">▶</span>
      <span class="btn-text">执行任务</span>
    `

    // 禁用停止按钮
    this.stopBtn.disabled = true

    // 重置运行状态
    this.isRunning = false

    // 重置所有步骤状态
    this.steps.forEach((step, index) => {
      step.status = 'pending'
      step.message = '等待执行...'
      this.updateStepUI(index + 1, 'pending', '等待执行...')
    })
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

  private toggleAutoScrollGroupReplace(): void {
    this.autoScrollGroupReplace = !this.autoScrollGroupReplace
    this.autoScrollGroupReplaceBtn.classList.toggle('active', this.autoScrollGroupReplace)
    this.autoScrollGroupReplaceBtn.textContent = this.autoScrollGroupReplace
      ? '自动滚动'
      : '手动滚动'
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

  private addGroupReplaceLog(message: string, type: 'info' | 'success' | 'error'): void {
    // 统一使用主页的日志系统
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = document.createElement('div')
    logEntry.className = `log-entry ${type} group-replace-process`
    logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> <span class="log-source">[群码替换]</span> <span class="log-message">${message}</span>`

    // 添加到主页日志区域
    this.logsDiv.appendChild(logEntry)
    if (this.autoScroll) {
      this.logsDiv.scrollTop = this.logsDiv.scrollHeight
    }

    // 同时也在群码替换专用区域显示（移除占位符）
    const placeholder = this.groupReplaceLogs.querySelector('.log-placeholder')
    if (placeholder) {
      placeholder.remove()
    }

    // 在群码替换区域也显示
    const groupLogEntry = logEntry.cloneNode(true) as HTMLElement
    this.groupReplaceLogs.appendChild(groupLogEntry)
    if (this.autoScrollGroupReplace) {
      this.groupReplaceLogs.scrollTop = this.groupReplaceLogs.scrollHeight
    }
  }

  private clearGroupReplaceLogs(): void {
    this.groupReplaceLogs.innerHTML = ''
    // 主进程清空逻辑在这里
    window.electronAPI.clearLogs().then((result) => {
      if (result.success) {
        this.addGroupReplaceLog('日志已清空', 'info')
      }
    })
  }

  // 历史任务相关方法
  private async loadTaskHistory(): Promise<void> {
    try {
      // 显示加载状态
      this.showHistoryLoading(true)

      const result = await window.electronAPI.getTaskHistory()

      if (result.success && result.data) {
        this.displayTaskHistory(result.data)
        this.addLog(`📋 已加载 ${result.data.length} 条历史记录`, 'info')
      } else {
        this.showNoHistoryMessage()
        this.addLog(`❌ 加载历史记录失败: ${result.message}`, 'error')
      }
    } catch (error) {
      this.showNoHistoryMessage()
      this.addLog(`❌ 加载历史记录异常: ${error}`, 'error')
    } finally {
      this.showHistoryLoading(false)
    }
  }

  private showHistoryLoading(show: boolean): void {
    this.historyLoading.style.display = show ? 'flex' : 'none'
    this.historyList.style.display = show ? 'none' : 'block'
    this.noHistoryMessage.style.display = 'none'
  }

  private showNoHistoryMessage(): void {
    this.historyLoading.style.display = 'none'
    this.historyList.style.display = 'none'
    this.noHistoryMessage.style.display = 'flex'
    this.historyList.innerHTML = ''
  }

  private displayTaskHistory(tasks: any[]): void {
    this.historyLoading.style.display = 'none'
    this.noHistoryMessage.style.display = 'none'
    this.historyList.style.display = 'block'

    if (tasks.length === 0) {
      this.showNoHistoryMessage()
      return
    }

    // 清空现有内容
    this.historyList.innerHTML = ''

    // 生成任务记录
    tasks.forEach((task) => {
      const taskCard = this.createTaskCard(task)
      this.historyList.appendChild(taskCard)
    })
  }

  private createTaskCard(task: any): HTMLElement {
    const card = document.createElement('div')
    card.className = 'task-record-card'

    // 检查是否有QR码
    const hasWeworkQr = task.qrCodes.wework && task.qrCodes.wework.trim()
    const hasWeibanQr = task.qrCodes.weiban && task.qrCodes.weiban.trim()

    // 构建HTML结构
    card.innerHTML = `
      <div class="task-record-header">
        <div class="task-info">
          <h4 class="task-store-name">${task.storeName}</h4>
          <div class="task-time">${task.createTime}</div>
          <div class="task-id">任务ID: ${task.id}</div>
        </div>
        <div class="task-actions">
          <button class="btn btn-small btn-secondary open-folder-btn" 
                  data-folder-path="${task.folderPath}" 
                  title="打开文件夹">
            📁 打开文件夹
          </button>
        </div>
      </div>
      
      <div class="task-qrcodes">
        ${this.buildQrCodeSection(hasWeworkQr, hasWeibanQr, task.qrCodes)}
      </div>
    `

    // 添加事件监听器
    const openFolderBtn = card.querySelector('.open-folder-btn') as HTMLButtonElement
    if (openFolderBtn) {
      openFolderBtn.addEventListener('click', () => {
        this.openTaskFolder(task.folderPath)
      })
    }

    return card
  }

  private buildQrCodeSection(hasWeworkQr: boolean, hasWeibanQr: boolean, qrCodes: any): string {
    if (!hasWeworkQr && !hasWeibanQr) {
      return `
        <div class="no-qrcodes">
          <div class="no-qr-icon">🚫</div>
          <span>此任务未找到二维码文件</span>
        </div>
      `
    }

    return `
      <div class="qrcode-grid">
        ${hasWeworkQr ? this.buildQrCodeItem('企业微信群码', '📱', qrCodes.wework) : ''}
        ${hasWeibanQr ? this.buildQrCodeItem('微伴活码', '🔗', qrCodes.weiban) : ''}
      </div>
    `
  }

  private buildQrCodeItem(label: string, icon: string, imagePath: string): string {
    // 处理文件路径，确保正确的格式
    const safePath = imagePath.replace(/\\/g, '/').replace(/'/g, "\\'")

    return `
      <div class="qr-preview-item">
        <div class="qr-preview-header">
          <span class="qr-label">${icon} ${label}</span>
        </div>
        <div class="qr-preview-image">
          <img src="file://${safePath}" 
               alt="${label}" 
               onerror="this.parentElement.innerHTML='<div class=&quot;qr-error&quot;>⚠️ 图片加载失败</div>'"
               onload="this.style.opacity='1'">
        </div>
      </div>
    `
  }

  private async openTaskFolder(folderPath: string): Promise<void> {
    try {
      const result = await window.electronAPI.openQrCodeFolder(folderPath)
      if (result.success) {
        this.addLog('📁 已打开任务文件夹', 'info')
      } else {
        this.addLog(`❌ 打开任务文件夹失败: ${result.message}`, 'error')
      }
    } catch (error) {
      this.addLog(`❌ 打开任务文件夹异常: ${error}`, 'error')
    }
  }

  // 群码替换相关方法

  private async executeGroupReplace(event: Event): Promise<void> {
    event.preventDefault()

    try {
      // 表单验证
      if (!this.validateGroupReplaceForm()) {
        this.addGroupReplaceLog('❌ 请输入搜索关键词', 'error')
        return
      }

      // 获取表单数据
      const searchKeyword = this.groupSearchKeywordInput.value.trim()

      const options = {
        searchKeyword,
      }

      // 设置运行状态
      this.isGroupReplaceRunning = true
      this.validateGroupReplaceForm() // 更新按钮状态

      this.addGroupReplaceLog('🚀 开始执行群码替换任务', 'info')
      this.addGroupReplaceLog(`🔍 搜索关键词: ${searchKeyword}`, 'info')

      // 调用主进程执行群码替换
      const result = await window.electronAPI.executeGroupReplace(options)

      if (result.success) {
        this.addGroupReplaceLog(`✅ 群码替换任务完成: ${result.message}`, 'success')

        // 显示详细结果
        if (result.data) {
          this.addGroupReplaceLog(`📊 处理结果统计:`, 'info')
          this.addGroupReplaceLog(`   - 实际处理: ${result.data.processedCount} 个群组`, 'info')
          this.addGroupReplaceLog(`   - 成功处理: ${result.data.successCount} 个群组`, 'info')
          this.addGroupReplaceLog(`   - 失败处理: ${result.data.failureCount} 个群组`, 'error')
          this.addGroupReplaceLog(`   - 执行耗时: ${result.data.executionTime}ms`, 'info')

          // 显示处理的群组详情
          if (result.data.operationRecords && result.data.operationRecords.length > 0) {
            this.addGroupReplaceLog(`📋 处理详情:`, 'info')
            result.data.operationRecords.forEach((record: any) => {
              const status = record.success ? '✅' : '❌'
              this.addGroupReplaceLog(
                `   ${status} ${record.groupInfo.title} (${record.groupInfo.adminInfo}) - ${record.operationType}`,
                record.success ? 'success' : 'error',
              )
              if (!record.success && record.error) {
                this.addGroupReplaceLog(`      错误: ${record.error}`, 'error')
              }
            })
          }
        }
      } else {
        this.addGroupReplaceLog(`❌ 群码替换任务失败: ${result.message}`, 'error')
      }
    } catch (error) {
      this.addGroupReplaceLog(`💥 群码替换任务异常: ${error}`, 'error')
    } finally {
      // 恢复运行状态
      this.isGroupReplaceRunning = false
      this.validateGroupReplaceForm() // 重新验证表单以更新按钮状态
    }
  }

  private async stopGroupReplace(): Promise<void> {
    this.addGroupReplaceLog('⏹ 用户请求停止群码替换任务', 'info')

    try {
      // 禁用停止按钮防止重复点击
      this.stopGroupReplaceBtn.disabled = true
      this.stopGroupReplaceBtn.querySelector('.btn-text')!.textContent = '停止中...'

      // 调用主进程停止群码替换
      const result = await window.electronAPI.stopGroupReplace()

      if (result.success) {
        this.addGroupReplaceLog(`✅ ${result.message}`, 'success')
      } else {
        this.addGroupReplaceLog(`❌ ${result.message}`, 'error')
      }
    } catch (error) {
      this.addGroupReplaceLog(`💥 停止群码替换异常: ${error}`, 'error')
    } finally {
      // 恢复运行状态
      this.isGroupReplaceRunning = false
      this.validateGroupReplaceForm() // 重新验证表单以更新按钮状态
    }
  }
}

// 等待DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new RendererApp()
})
