class RendererApp {
  private installBtn!: HTMLButtonElement
  private executeBtn!: HTMLButtonElement
  private stopBtn!: HTMLButtonElement
  private continueBtn!: HTMLButtonElement
  private statusDiv!: HTMLDivElement
  private logsDiv!: HTMLDivElement
  private progressPanel!: HTMLDivElement
  private progressBar!: HTMLDivElement
  private mainProgressText!: HTMLDivElement

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

  // TodoList相关元素
  private loadTodoListBtn!: HTMLButtonElement
  private resumeTodoListBtn!: HTMLButtonElement
  private todoListContainer!: HTMLDivElement
  private todoListProgress!: HTMLDivElement
  private todoProgressText!: HTMLSpanElement
  private progressPercentage!: HTMLSpanElement
  private todoProgressBar!: HTMLDivElement
  private completedCount!: HTMLSpanElement
  private failedCount!: HTMLSpanElement
  private pendingCount!: HTMLSpanElement

  // TodoList详情相关元素
  private refreshTodoListBtn!: HTMLButtonElement
  private deleteTodoListBtn!: HTMLButtonElement
  private todoListSelect!: HTMLSelectElement
  private todoListDetails!: HTMLDivElement
  private todoListName!: HTMLElement
  private todoListStatus!: HTMLElement
  private todoListCreatedAt!: HTMLElement
  private todoListUpdatedAt!: HTMLElement
  private todoListProgressBar!: HTMLElement
  private todoListProgressText!: HTMLElement
  private totalItems!: HTMLElement
  private completedItems!: HTMLElement
  private failedItems!: HTMLElement
  private pendingItems!: HTMLElement
  private inProgressItems!: HTMLElement
  private statusFilter!: HTMLSelectElement
  private todoItemsList!: HTMLDivElement
  private expandAllBtn!: HTMLButtonElement
  private collapseAllBtn!: HTMLButtonElement

  // TodoList状态管理
  private currentTodoList: any = null
  private todoLists: any[] = []

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
  private isStopRequested = false
  private isGroupReplaceRunning = false
  private isGroupReplaceStopRequested = false
  private autoScroll = true
  private autoScrollGroupReplace = true

  constructor() {
    this.initializeElements()
    this.setupEventListeners()
    this.loadConfig()
    this.initializeStoreForm()
    this.startStatusUpdater()
    this.addLog('应用程序已启动', 'info')

    // 检查是否有未完成的任务
    this.checkAndShowContinueButton()
  }

  private initializeElements(): void {
    this.installBtn = document.getElementById('installBtn') as HTMLButtonElement
    this.executeBtn = document.getElementById('executeBtn') as HTMLButtonElement
    this.stopBtn = document.getElementById('stopBtn') as HTMLButtonElement
    this.continueBtn = document.getElementById('continueBtn') as HTMLButtonElement
    this.statusDiv = document.getElementById('status') as HTMLDivElement
    this.logsDiv = document.getElementById('logs') as HTMLDivElement
    this.progressPanel = document.getElementById('progressPanel') as HTMLDivElement
    this.progressBar = document.getElementById('progressBar') as HTMLDivElement
    this.mainProgressText = document.getElementById('progressText') as HTMLDivElement

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

    // TodoList相关元素
    this.todoListSelect = document.getElementById('todoListSelect') as HTMLSelectElement
    this.todoListDetails = document.getElementById('todoListDetails') as HTMLDivElement
    this.refreshTodoListBtn = document.getElementById('refreshTodoListBtn') as HTMLButtonElement
    this.loadTodoListBtn = document.getElementById('loadTodoListBtn') as HTMLButtonElement
    this.resumeTodoListBtn = document.getElementById('resumeTodoListBtn') as HTMLButtonElement
    this.deleteTodoListBtn = document.getElementById('deleteTodoListBtn') as HTMLButtonElement
    this.todoListName = document.getElementById('todoListName') as HTMLElement
    this.todoListStatus = document.getElementById('todoListStatus') as HTMLElement
    this.todoListCreatedAt = document.getElementById('todoListCreatedAt') as HTMLElement
    this.todoListUpdatedAt = document.getElementById('todoListUpdatedAt') as HTMLElement
    this.todoListProgressBar = document.getElementById('todoListProgressBar') as HTMLElement
    this.todoListProgressText = document.getElementById('todoListProgressText') as HTMLElement
    this.totalItems = document.getElementById('totalItems') as HTMLElement
    this.completedItems = document.getElementById('completedItems') as HTMLElement
    this.failedItems = document.getElementById('failedItems') as HTMLElement
    this.pendingItems = document.getElementById('pendingItems') as HTMLElement
    this.inProgressItems = document.getElementById('inProgressItems') as HTMLElement
    this.statusFilter = document.getElementById('statusFilter') as HTMLSelectElement
    this.todoItemsList = document.getElementById('todoItemsList') as HTMLDivElement
    this.expandAllBtn = document.getElementById('expandAllBtn') as HTMLButtonElement
    this.collapseAllBtn = document.getElementById('collapseAllBtn') as HTMLButtonElement
  }

  private setupEventListeners(): void {
    this.executeBtn.addEventListener('click', () => this.executeTask())
    this.stopBtn.addEventListener('click', () => this.stopExecution())
    this.continueBtn.addEventListener('click', () => this.continueTask())

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

    // TodoList相关控制
    this.refreshTodoListBtn.addEventListener('click', () => this.loadTodoLists())
    this.loadTodoListBtn.addEventListener('click', () => this.loadTodoLists())
    this.resumeTodoListBtn.addEventListener('click', () => this.resumeTodoListExecution())
    this.deleteTodoListBtn.addEventListener('click', () => this.deleteTodoList())
    this.todoListSelect.addEventListener('change', () => this.onTodoListSelectChange())
    this.statusFilter.addEventListener('change', () => this.filterTodoItems())
    this.expandAllBtn.addEventListener('click', () => this.expandAllPlugins())
    this.collapseAllBtn.addEventListener('click', () => this.collapseAllPlugins())

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
    this.setupTodoListCreatedListener()
    this.setupPluginTaskEventListeners()
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
      this.loadTodoLists() // 自动加载所有TodoList任务
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
      // 立即重置停止标志，表示开始新任务
      this.isStopRequested = false
      console.log('🔄 主页前端已重置停止标志，开始新任务')

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

  private async continueTask(): Promise<void> {
    try {
      this.addLog('🔄 准备继续执行任务...', 'info')

      // 检查是否有未完成的任务状态
      const taskStateResult = await window.electronAPI.getCurrentTaskState()
      if (!taskStateResult.success || !taskStateResult.data) {
        this.addLog('❌ 没有找到可继续执行的任务', 'error')
        this.hideContinueButton()
        return
      }

      const taskState = taskStateResult.data
      this.addLog(`📋 继续执行任务: ${taskState.storeData.storeName}`, 'info')
      this.addLog(`🔄 从步骤${taskState.currentStep}开始继续执行`, 'info')

      // 恢复门店数据到表单
      this.restoreStoreData(taskState.storeData)

      // 恢复UI状态
      this.restoreUIState(taskState)

      // 设置运行状态
      this.isRunning = true
      this.executeBtn.disabled = true
      this.continueBtn.disabled = true
      this.stopBtn.disabled = false

      // 隐藏继续执行按钮，因为任务已经开始
      this.hideContinueButton()

      // 调用继续执行的API
      const executeResult = await window.electronAPI.continueTaskExecution()

      // 处理执行结果
      if (executeResult.success) {
        this.addLog(`✅ ${executeResult.message}`, 'success')
      } else {
        this.addLog(`❌ ${executeResult.message}`, 'error')
      }
    } catch (error) {
      this.addLog(`💥 继续执行任务异常: ${error}`, 'error')
    } finally {
      this.isRunning = false
      this.validateForm() // 重新验证表单以更新按钮状态
      this.stopBtn.disabled = true
      this.continueBtn.disabled = false
    }
  }

  private restoreStoreData(storeData: any): void {
    this.storeNameInput.value = storeData.storeName || ''
    this.mobileInput.value = storeData.mobile || ''
    this.storeTypeSelect.value = storeData.storeType || ''
    this.assistantSelect.value = storeData.assistant || ''
    this.weibanAssistantSelect.value = storeData.weibanAssistant || ''

    this.addLog('📝 已恢复门店信息到表单', 'info')
  }

  private restoreUIState(taskState: any): void {
    // 恢复步骤状态
    taskState.steps.forEach((step: any, index: number) => {
      this.updateStepUI(step.stepNumber, step.status, step.message)
    })

    // 恢复二维码显示
    if (taskState.qrCodePaths.weworkQrPath) {
      this.displayQrCode('wework', taskState.qrCodePaths.weworkQrPath)
      this.addLog(`📷 已恢复企业微信群码显示`, 'info')
    }
    if (taskState.qrCodePaths.weibanQrPath) {
      this.displayQrCode('weiban', taskState.qrCodePaths.weibanQrPath)
      this.addLog(`📷 已恢复微伴活码显示`, 'info')
    }

    this.addLog('🔄 UI状态已恢复', 'info')
  }

  private async checkAndShowContinueButton(): Promise<void> {
    try {
      console.log('开始检查是否有未完成任务...')
      const hasUnfinishedTask = await window.electronAPI.hasUnfinishedTask()
      console.log('未完成任务检查结果:', hasUnfinishedTask)

      if (hasUnfinishedTask) {
        console.log('发现未完成任务，显示继续执行按钮')
        this.showContinueButton()
      } else {
        console.log('没有未完成任务，隐藏继续执行按钮')
        this.hideContinueButton()
      }
    } catch (error) {
      console.error('检查未完成任务状态失败:', error)
      this.hideContinueButton()
    }
  }

  private showContinueButton(): void {
    this.continueBtn.style.display = 'inline-block'
    this.continueBtn.disabled = false
    this.addLog('🔄 发现未完成的任务，继续执行按钮已启用', 'info')
  }

  private hideContinueButton(): void {
    this.continueBtn.style.display = 'none'
    this.continueBtn.disabled = true
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
        // 任务完全成功时隐藏继续执行按钮
        this.hideContinueButton()
      } else {
        this.addLog('❌ 任务失败，浏览器已关闭', 'error')
        // 任务失败时不立即隐藏，让延迟检查决定是否显示
      }
    })

    // 任务状态更新监听
    window.electronAPI.onTaskStateUpdate(() => {
      console.log('收到任务状态更新通知，检查继续执行按钮')
      this.checkAndShowContinueButton()
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

    // 检查是否需要显示继续执行按钮（延迟检查以确保任务状态已保存）
    setTimeout(() => {
      this.checkAndShowContinueButton()
    }, 500)

    // 重置所有步骤状态（仅在任务完全成功时）
    // 如果有失败步骤，保留步骤状态以便继续执行
    // this.steps.forEach((step, index) => {
    //   step.status = 'pending'
    //   step.message = '等待执行...'
    //   this.updateStepUI(index + 1, 'pending', '等待执行...')
    // })
  }

  private async stopExecution(): Promise<void> {
    this.addLog('正在停止执行...', 'info')

    // 立即设置停止标志，防止新任务开始
    this.isStopRequested = true

    try {
      const result = await window.electronAPI.stopExecution()

      if (result.success) {
        this.addLog(result.message, 'success')
      } else {
        this.addLog(result.message, 'error')
      }
    } catch (error) {
      this.addLog(`停止执行失败: ${error}`, 'error')
    } finally {
      // 恢复运行状态
      this.isRunning = false
      this.validateForm() // 重新验证表单以更新按钮状态
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
        // 添加到主页日志区域
        this.addMainProcessLog(
          logData.message,
          logData.level as 'log' | 'error' | 'warn',
          logData.timestamp,
        )

        // 同时添加到群码替换日志区域
        this.addGroupReplaceMainProcessLog(
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

  private addGroupReplaceLog(
    message: string,
    type: 'info' | 'success' | 'error' | 'warning',
  ): void {
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

  private addGroupReplaceMainProcessLog(
    message: string,
    level: 'log' | 'error' | 'warn',
    timestamp: string,
  ): void {
    // 转换日志级别为群码替换支持的类型
    const typeMap = { log: 'info', error: 'error', warn: 'warning' }
    const type = typeMap[level] as 'info' | 'error' | 'warning'

    const logEntry = document.createElement('div')
    logEntry.className = `log-entry ${type} main-process`
    logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> <span class="log-source">[主进程]</span> <span class="log-message">${message}</span>`

    // 移除群码替换区域的占位符（如果存在）
    const placeholder = this.groupReplaceLogs.querySelector('.log-placeholder')
    if (placeholder) {
      placeholder.remove()
    }

    // 添加到群码替换日志区域
    this.groupReplaceLogs.appendChild(logEntry)
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
      // 立即重置停止标志，表示开始新任务
      this.isGroupReplaceStopRequested = false
      console.log('🔄 前端已重置停止标志，开始新任务')

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

      // 确保异常时也重置停止标识，避免状态残留
      this.isGroupReplaceStopRequested = false
      console.log('💥 异常情况下重置渲染进程停止标识')
    } finally {
      // 统一的状态恢复机制
      this.isGroupReplaceRunning = false
      this.validateGroupReplaceForm() // 重新验证表单以更新按钮状态
      this.updateTodoListButtons() // 更新TodoList按钮状态

      // 确保按钮状态完全恢复
      console.log('✅ 群码替换任务结束，按钮状态已恢复')
    }
  }

  private async stopGroupReplace(): Promise<void> {
    this.addGroupReplaceLog('⏹ 用户请求停止群码替换任务', 'info')

    // 立即设置停止标志，防止新任务开始
    this.isGroupReplaceStopRequested = true

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
      this.updateTodoListButtons() // 更新TodoList按钮状态
    }
  }

  // TodoList相关方法

  /**
   * 加载TodoList列表
   */
  private async loadTodoLists(): Promise<void> {
    try {
      const result = await window.electronAPI.getTodoLists()

      if (result.success && result.data) {
        this.todoLists = result.data
        // 按创建时间降序排序，最新的在前面
        this.todoLists.sort((a, b) => b.createdAt - a.createdAt)
        this.updateTodoListSelect()

        // 自动选择最近的任务
        if (this.todoLists.length > 0) {
          this.todoListSelect.value = this.todoLists[0].id
          await this.onTodoListSelectChange()
        }

        this.addGroupReplaceLog(
          `📋 获取到 ${this.todoLists.length} 个TodoList，已自动选择最新任务`,
          'info',
        )
      } else {
        this.addGroupReplaceLog(`❌ 获取TodoList失败: ${result.message}`, 'error')
      }
    } catch (error) {
      this.addGroupReplaceLog(`💥 获取TodoList异常: ${error}`, 'error')
    }
  }

  /**
   * 更新TodoList选择器
   */
  private updateTodoListSelect(): void {
    // 清空现有选项
    this.todoListSelect.innerHTML = '<option value="">请选择TodoList</option>'

    // 添加TodoList选项
    this.todoLists.forEach((todoList) => {
      const option = document.createElement('option')
      option.value = todoList.id
      option.textContent = `${todoList.name} (${todoList.status})`
      this.todoListSelect.appendChild(option)
    })
  }

  /**
   * TodoList选择变化事件处理
   */
  private async onTodoListSelectChange(): Promise<void> {
    const selectedId = this.todoListSelect.value

    if (!selectedId) {
      this.todoListDetails.style.display = 'none'
      this.currentTodoList = null
      this.updateTodoListButtons()
      return
    }

    try {
      const result = await window.electronAPI.getTodoListById(selectedId)

      if (result.success && result.data) {
        this.currentTodoList = result.data
        this.displayTodoListDetails(this.currentTodoList)
        this.updateTodoListButtons()
      } else {
        this.addGroupReplaceLog(`❌ 获取TodoList详情失败: ${result.message}`, 'error')
      }
    } catch (error) {
      this.addGroupReplaceLog(`💥 获取TodoList详情异常: ${error}`, 'error')
    }
  }

  /**
   * 显示TodoList详情
   */
  private displayTodoListDetails(todoList: any): void {
    // 显示基本信息
    this.todoListName.textContent = todoList.name
    this.todoListStatus.textContent = todoList.status
    this.todoListStatus.className = `status-badge ${todoList.status}`
    this.todoListCreatedAt.textContent = `创建: ${new Date(todoList.createdAt).toLocaleString('zh-CN')}`
    this.todoListUpdatedAt.textContent = `更新: ${new Date(todoList.updatedAt).toLocaleString('zh-CN')}`

    // 显示进度信息
    const progress = todoList.progress
    const progressPercentage =
      progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

    this.todoListProgressBar
      .querySelector('.progress-fill')!
      .setAttribute('style', `width: ${progressPercentage}%`)
    this.todoListProgressText.textContent = `${progress.completed}/${progress.total}`

    this.totalItems.textContent = progress.total.toString()
    this.completedItems.textContent = progress.completed.toString()
    this.failedItems.textContent = progress.failed.toString()
    this.pendingItems.textContent = progress.pending.toString()
    this.inProgressItems.textContent = progress.inProgress.toString()

    // 显示TodoItem列表
    this.displayTodoItems(todoList.items)

    // 显示详情面板
    this.todoListDetails.style.display = 'block'
  }

  /**
   * 显示TodoItem列表（插件级别）
   */
  private displayTodoItems(items: any[]): void {
    this.todoItemsList.innerHTML = ''

    const filteredItems = this.getFilteredTodoItems(items)

    if (filteredItems.length === 0) {
      this.todoItemsList.innerHTML = '<div class="no-items">没有符合条件的插件任务</div>'
      return
    }

    filteredItems.forEach((item) => {
      const itemElement = this.createPluginItemElement(item)
      this.todoItemsList.appendChild(itemElement)
    })
  }

  /**
   * 根据状态筛选TodoItem
   */
  private getFilteredTodoItems(items: any[]): any[] {
    const filterStatus = this.statusFilter.value

    if (filterStatus === 'all') {
      return items
    }

    return items.filter((item) => item.status === filterStatus)
  }

  /**
   * 创建插件级别的TodoItem元素
   */
  private createPluginItemElement(item: any): HTMLElement {
    const div = document.createElement('div')
    div.className = `plugin-item ${item.status}`
    div.setAttribute('data-plugin-id', item.pluginId)

    const statusIcon = this.getStatusIcon(item.status)
    // 插件进度基于状态：完成=100%，进行中=50%，其他=0%
    const progressPercent =
      item.status === 'completed' ? 100 : item.status === 'in_progress' ? 50 : 0

    div.innerHTML = `
      <div class="plugin-item-header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="plugin-item-main">
          <span class="status-icon">${statusIcon}</span>
          <h5 class="plugin-item-title">${item.pluginName}</h5>
          <span class="plugin-item-status ${item.status}">${this.getStatusText(item.status)}</span>
          <span class="expand-icon">📂</span>
        </div>
        <div class="plugin-item-progress">
          <div class="progress-bar-mini">
            <div class="progress-fill-mini" style="width: ${progressPercent}%"></div>
          </div>
        </div>
      </div>
      <div class="plugin-item-content">
        <div class="plugin-summary">
          <p>插件包含 ${item.operationRecords?.length || 0} 个群组操作记录</p>
          ${item.error ? `<div class="plugin-error">错误信息: ${item.error}</div>` : ''}
        </div>
        ${this.renderOperationRecords(item.operationRecords || [])}
      </div>
    `

    return div
  }

  /**
   * 展开所有插件
   */
  private expandAllPlugins(): void {
    const pluginItems = this.todoItemsList.querySelectorAll('.plugin-item')
    pluginItems.forEach((item) => {
      item.classList.add('expanded')
    })
  }

  /**
   * 收起所有插件
   */
  private collapseAllPlugins(): void {
    const pluginItems = this.todoItemsList.querySelectorAll('.plugin-item')
    pluginItems.forEach((item) => {
      item.classList.remove('expanded')
    })
  }

  /**
   * 获取状态图标
   */
  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: '⏳',
      in_progress: '🔄',
      completed: '✅',
      failed: '❌',
      skipped: '⏭️',
    }
    return icons[status] || '❓'
  }

  /**
   * 获取状态文本
   */
  private getStatusText(status: string): string {
    const texts: Record<string, string> = {
      pending: '待处理',
      in_progress: '进行中',
      completed: '已完成',
      failed: '失败',
      skipped: '已跳过',
    }
    return texts[status] || '未知'
  }

  /**
   * 获取操作类型的中文描述和图标
   */
  private getOperationTypeDisplay(operationType: string): { icon: string; text: string } {
    const operationTypes: Record<string, { icon: string; text: string }> = {
      delete_by_member_count: { icon: '🗑️', text: '删除（成员超限）' },
      delete_by_keyword: { icon: '🗑️', text: '删除（关键词匹配）' },
      create_new: { icon: '➕', text: '创建新群' },
      no_action: { icon: '⏸️', text: '无需操作' },
    }
    return operationTypes[operationType] || { icon: '❓', text: '未知操作' }
  }

  /**
   * 渲染操作记录列表
   */
  private renderOperationRecords(operationRecords: any[]): string {
    if (!operationRecords || operationRecords.length === 0) {
      return '<div class="no-operations">暂无操作记录</div>'
    }

    const recordsHtml = operationRecords
      .map((record) => {
        const { icon, text } = this.getOperationTypeDisplay(record.operationType)
        const groupName = record.groupInfo?.title || '未知群组'
        const reason = record.reason || '无详细原因'

        return `
          <div class="operation-record">
            <div class="operation-header">
              <span class="operation-icon">${icon}</span>
              <span class="operation-type">${text}</span>
            </div>
            <div class="operation-details">
              <div class="group-name">${groupName}</div>
              <div class="operation-reason">${reason}</div>
            </div>
          </div>
        `
      })
      .join('')

    return `
      <div class="operation-records-container">
        <h6 class="operation-records-title">操作记录详情</h6>
        <div class="operation-records-list">
          ${recordsHtml}
        </div>
      </div>
    `
  }

  /**
   * 格式化时间信息
   */
  private formatTimeInfo(item: any): string {
    if (item.completedAt) {
      return `完成于: ${new Date(item.completedAt).toLocaleString('zh-CN')}`
    } else if (item.startedAt) {
      return `开始于: ${new Date(item.startedAt).toLocaleString('zh-CN')}`
    } else {
      return `创建于: ${new Date(item.createdAt).toLocaleString('zh-CN')}`
    }
  }

  /**
   * 筛选TodoItem
   */
  private filterTodoItems(): void {
    if (this.currentTodoList) {
      this.displayTodoItems(this.currentTodoList.items)
    }
  }

  /**
   * 更新TodoList按钮状态
   */
  private updateTodoListButtons(): void {
    const hasSelected = !!this.currentTodoList

    // 检查是否有未完成的插件（pending或failed状态）
    const hasUnfinishedItems =
      hasSelected &&
      this.currentTodoList.items?.some(
        (item: any) =>
          item.status === 'pending' || item.status === 'failed' || item.status === 'in_progress',
      )

    const canResume = hasSelected && hasUnfinishedItems

    // 显示/隐藏按钮
    this.resumeTodoListBtn.style.display = hasSelected ? 'inline-block' : 'none'
    this.deleteTodoListBtn.style.display = hasSelected ? 'inline-block' : 'none'

    // 设置按钮状态
    this.resumeTodoListBtn.disabled = !canResume || this.isGroupReplaceRunning
    this.deleteTodoListBtn.disabled = !hasSelected || this.isGroupReplaceRunning

    // 更新接续执行按钮文本
    if (this.isGroupReplaceRunning && canResume) {
      this.resumeTodoListBtn.textContent = '执行中...'
      this.resumeTodoListBtn.classList.add('running')
    } else if (canResume) {
      this.resumeTodoListBtn.textContent = '接续执行'
      this.resumeTodoListBtn.classList.remove('running')
    } else if (hasSelected) {
      this.resumeTodoListBtn.textContent = '无需执行'
      this.resumeTodoListBtn.classList.remove('running')
    }
  }

  /**
   * 接续执行TodoList
   */
  private async resumeTodoListExecution(): Promise<void> {
    if (!this.currentTodoList) {
      this.addGroupReplaceLog('❌ 请先选择一个TodoList', 'error')
      return
    }

    try {
      // 重置渲染进程层的停止标识，确保接续执行不受之前停止状态影响
      this.isGroupReplaceStopRequested = false
      console.log('🔄 渲染进程层停止标识已重置，准备接续执行')

      this.isGroupReplaceRunning = true
      this.updateTodoListButtons()
      this.validateGroupReplaceForm()

      this.addGroupReplaceLog(`🔄 开始接续执行TodoList: ${this.currentTodoList.name}`, 'info')

      const options = {
        skipCompleted: true,
        retryFailed: false,
      }

      const result = await window.electronAPI.resumeTodoListExecution(
        this.currentTodoList.id,
        options,
      )

      if (result.success) {
        this.addGroupReplaceLog(`✅ TodoList接续执行完成: ${result.message}`, 'success')

        // 重新加载TodoList详情
        await this.onTodoListSelectChange()
      } else {
        this.addGroupReplaceLog(`❌ TodoList接续执行失败: ${result.message}`, 'error')
      }
    } catch (error) {
      this.addGroupReplaceLog(`💥 TodoList接续执行异常: ${error}`, 'error')

      // 确保异常时也重置停止标识，避免状态残留
      this.isGroupReplaceStopRequested = false
      console.log('💥 异常情况下重置渲染进程停止标识')
    } finally {
      // 统一的状态恢复机制
      this.isGroupReplaceRunning = false
      this.updateTodoListButtons()
      this.validateGroupReplaceForm()

      // 确保按钮状态完全恢复
      console.log('✅ 接续执行结束，按钮状态已恢复')
    }
  }

  /**
   * 删除TodoList
   */
  private async deleteTodoList(): Promise<void> {
    if (!this.currentTodoList) {
      this.addGroupReplaceLog('❌ 请先选择一个TodoList', 'error')
      return
    }

    const confirmed = confirm(
      `确定要删除TodoList "${this.currentTodoList.name}" 吗？此操作不可恢复。`,
    )
    if (!confirmed) {
      return
    }

    try {
      const result = await window.electronAPI.deleteTodoList(this.currentTodoList.id)

      if (result.success) {
        this.addGroupReplaceLog(`✅ TodoList删除成功: ${result.message}`, 'success')

        // 重新加载TodoList列表
        await this.loadTodoLists()

        // 清空当前选择
        this.todoListSelect.value = ''
        this.todoListDetails.style.display = 'none'
        this.currentTodoList = null
        this.updateTodoListButtons()
      } else {
        this.addGroupReplaceLog(`❌ TodoList删除失败: ${result.message}`, 'error')
      }
    } catch (error) {
      this.addGroupReplaceLog(`💥 TodoList删除异常: ${error}`, 'error')
    }
  }

  private setupTodoListCreatedListener(): void {
    window.electronAPI.onTodoListCreated(async (data: { todoListId: string }) => {
      console.log('收到TodoList创建通知:', data.todoListId)

      // 自动切换到群码替换标签页
      this.switchTab('groupReplace')

      // 重新加载TodoList列表
      await this.loadTodoLists()

      // 自动选中新创建的TodoList
      this.todoListSelect.value = data.todoListId
      await this.onTodoListSelectChange()

      this.addGroupReplaceLog(`📋 任务已创建并自动选中: ${data.todoListId}`, 'info')
    })
  }

  /**
   * 设置插件任务事件监听器，用于实时更新
   */
  private setupPluginTaskEventListeners(): void {
    // 监听插件任务列表生成完成事件
    window.electronAPI.onPluginTaskGenerated(
      (data: { todoListId: string; pluginCount: number; totalOperations: number }) => {
        console.log('收到插件任务列表生成完成通知:', data)
        this.addGroupReplaceLog(
          `📋 任务列表生成完成: ${data.pluginCount} 个插件，共 ${data.totalOperations} 个操作`,
          'info',
        )

        // 自动切换到群码替换标签页
        this.switchTab('groupReplace')

        // 刷新TodoList显示
        this.loadTodoLists().then(() => {
          // 自动选中新创建的TodoList
          this.todoListSelect.value = data.todoListId
          this.onTodoListSelectChange()
        })
      },
    )

    // 监听单个插件开始执行事件
    window.electronAPI.onPluginTaskStarted((data: { pluginId: string; todoListId: string }) => {
      console.log('收到插件开始执行通知:', data)
      const pluginDisplayName = this.getPluginDisplayName(data.pluginId)
      this.addGroupReplaceLog(`🔄 开始执行插件: ${pluginDisplayName}`, 'info')

      // 更新TodoList显示，标记插件为进行中状态
      this.updatePluginStatus(data.pluginId, 'in_progress')
    })

    // 监听单个插件执行完成事件
    window.electronAPI.onPluginTaskCompleted(
      async (data: { pluginId: string; todoListId: string; data: any }) => {
        console.log('收到插件执行完成通知:', data)
        const { processedCount, successCount, failureCount } = data.data
        const pluginDisplayName = this.getPluginDisplayName(data.pluginId)
        this.addGroupReplaceLog(
          `✅ 插件执行完成: ${pluginDisplayName} - 成功 ${successCount}, 失败 ${failureCount}`,
          'success',
        )

        // 刷新TodoList详情显示，从文件重新加载最新状态
        if (this.currentTodoList && this.currentTodoList.id === data.todoListId) {
          console.log(`🔄 插件 ${data.pluginId} 完成，重新加载TodoList状态: ${data.todoListId}`)
          await this.refreshTodoListDetails()
          console.log(`✓ TodoList状态已重新加载，UI已更新`)
        } else {
          console.log(
            `⚠️ 当前TodoList不匹配: 当前=${this.currentTodoList?.id}, 事件=${data.todoListId}`,
          )
        }
      },
    )

    // 监听单个插件执行失败事件
    window.electronAPI.onPluginTaskFailed(
      async (data: { pluginId: string; todoListId: string; error: string }) => {
        console.log('收到插件执行失败通知:', data)
        const pluginDisplayName = this.getPluginDisplayName(data.pluginId)
        this.addGroupReplaceLog(`❌ 插件执行失败: ${pluginDisplayName} - ${data.error}`, 'error')

        // 先刷新TodoList详情显示，从文件重新加载最新状态
        if (this.currentTodoList && this.currentTodoList.id === data.todoListId) {
          console.log(`🔄 重新加载TodoList状态: ${data.todoListId}`)
          await this.refreshTodoListDetails()
          console.log(`✓ TodoList状态已重新加载`)
        }

        // 然后更新UI显示，标记插件为失败状态
        console.log(`🎯 更新插件UI状态: ${data.pluginId} -> failed`)
        this.updatePluginStatus(data.pluginId, 'failed')
      },
    )

    // 监听插件状态实时更新事件
    window.electronAPI.onPluginStatusUpdate(
      async (data: { pluginId: string; todoListId: string; status: string; timestamp: number }) => {
        console.log('收到插件状态更新通知:', data)
        const pluginDisplayName = this.getPluginDisplayName(data.pluginId)
        this.addGroupReplaceLog(`🔄 插件状态更新: ${pluginDisplayName} -> ${data.status}`, 'info')

        // 实时更新UI显示
        console.log(`🎯 实时更新插件UI状态: ${data.pluginId} -> ${data.status}`)
        this.updatePluginStatus(data.pluginId, data.status as any)

        // 如果是当前显示的TodoList，刷新详情显示
        if (this.currentTodoList && this.currentTodoList.id === data.todoListId) {
          console.log(`🔄 实时刷新TodoList详情: ${data.todoListId}`)
          await this.refreshTodoListDetails()
        }
      },
    )
  }

  /**
   * 获取插件的显示名称
   */
  private getPluginDisplayName(pluginId: string): string {
    if (!this.currentTodoList) return pluginId

    const item = this.currentTodoList.items?.find((item: any) => item.pluginId === pluginId)
    return item?.pluginName || item?.remarks || pluginId
  }

  /**
   * 更新插件状态显示
   */
  private updatePluginStatus(pluginId: string, status: string): void {
    if (!this.currentTodoList) return

    // 在TodoList中找到对应的插件项并更新状态
    const pluginItem = this.currentTodoList.items?.find((item: any) => item.pluginId === pluginId)
    if (pluginItem) {
      pluginItem.status = status

      // 更新UI显示
      const pluginElement = document.querySelector(`[data-plugin-id="${pluginId}"]`) as HTMLElement
      if (pluginElement) {
        // 更新插件元素的状态类名（移除旧状态，添加新状态）
        pluginElement.className = pluginElement.className.replace(
          /(pending|in_progress|completed|failed|skipped)/,
          status,
        )

        // 更新状态图标
        const statusIconElement = pluginElement.querySelector('.status-icon')
        if (statusIconElement) {
          statusIconElement.textContent = this.getStatusIcon(status)
        }

        // 更新状态文本
        const statusTextElement = pluginElement.querySelector('.plugin-item-status')
        if (statusTextElement) {
          statusTextElement.textContent = this.getStatusText(status)
          statusTextElement.className = `plugin-item-status ${status}`
        }

        console.log(`✓ UI已更新: 插件 ${pluginId} 状态 -> ${status}`)
      }
    }
  }

  /**
   * 刷新TodoList详情显示
   */
  private async refreshTodoListDetails(): Promise<void> {
    if (!this.currentTodoList) return

    try {
      console.log(`🔄 开始刷新TodoList详情: ${this.currentTodoList.id}`)

      // 重新加载TodoList数据
      const result = await window.electronAPI.getTodoListById(this.currentTodoList.id)
      if (result.success && result.data) {
        const oldProgress = this.currentTodoList.progress
        this.currentTodoList = result.data
        const newProgress = result.data.progress

        console.log(
          `📊 进度对比 - 旧: 完成${oldProgress?.completed || 0}/${oldProgress?.total || 0}, 新: 完成${newProgress?.completed || 0}/${newProgress?.total || 0}`,
        )
        console.log(
          `📋 刷新后插件状态:`,
          result.data.items.map(
            (item: any, index: number) => `${index + 1}. ${item.pluginId}: ${item.status}`,
          ),
        )

        this.displayTodoListDetails(this.currentTodoList)
        console.log(`✅ TodoList详情刷新完成`)
      } else {
        console.error(`❌ 重新加载TodoList失败:`, result.message)
      }
    } catch (error) {
      console.error('刷新TodoList详情失败:', error)
    }
  }
}

// 全局变量，用于HTML onclick访问
let todoListRenderer: RendererApp

// 等待DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  todoListRenderer = new RendererApp()
})
