class RendererApp {
  private startBtn!: HTMLButtonElement
  private stopBtn!: HTMLButtonElement
  private installBtn!: HTMLButtonElement
  private checkLoginBtn!: HTMLButtonElement
  private statusDiv!: HTMLDivElement
  private logsDiv!: HTMLDivElement
  private progressPanel!: HTMLDivElement
  private progressBar!: HTMLDivElement
  private progressText!: HTMLDivElement

  // 登录状态相关元素
  private loginStatusDiv!: HTMLDivElement
  private loginDetailsDiv!: HTMLDivElement
  private currentUrlSpan!: HTMLSpanElement
  private pageTitleSpan!: HTMLSpanElement
  private checkTimeSpan!: HTMLSpanElement

  // 标签页元素
  private mainTab!: HTMLButtonElement
  private configTab!: HTMLButtonElement
  private mainPanel!: HTMLDivElement
  private configPanel!: HTMLDivElement

  // 配置表单元素
  private configForm!: HTMLFormElement
  private saveConfigBtn!: HTMLButtonElement
  private resetConfigBtn!: HTMLButtonElement

  private isRunning = false

  constructor() {
    this.initializeElements()
    this.setupEventListeners()
    this.checkBrowserStatus()
    this.loadConfig()
    this.addLog('应用程序已启动', 'info')
  }

  private initializeElements(): void {
    this.startBtn = document.getElementById('startBtn') as HTMLButtonElement
    this.stopBtn = document.getElementById('stopBtn') as HTMLButtonElement
    this.installBtn = document.getElementById('installBtn') as HTMLButtonElement
    this.checkLoginBtn = document.getElementById('checkLoginBtn') as HTMLButtonElement
    this.statusDiv = document.getElementById('status') as HTMLDivElement
    this.logsDiv = document.getElementById('logs') as HTMLDivElement
    this.progressPanel = document.getElementById('progressPanel') as HTMLDivElement
    this.progressBar = document.getElementById('progressBar') as HTMLDivElement
    this.progressText = document.getElementById('progressText') as HTMLDivElement

    // 登录状态相关元素
    this.loginStatusDiv = document.getElementById('loginStatus') as HTMLDivElement
    this.loginDetailsDiv = document.getElementById('loginDetails') as HTMLDivElement
    this.currentUrlSpan = document.getElementById('currentUrl') as HTMLSpanElement
    this.pageTitleSpan = document.getElementById('pageTitle') as HTMLSpanElement
    this.checkTimeSpan = document.getElementById('checkTime') as HTMLSpanElement

    // 标签页元素
    this.mainTab = document.getElementById('mainTab') as HTMLButtonElement
    this.configTab = document.getElementById('configTab') as HTMLButtonElement
    this.mainPanel = document.getElementById('mainPanel') as HTMLDivElement
    this.configPanel = document.getElementById('configPanel') as HTMLDivElement

    // 配置表单元素
    this.configForm = document.getElementById('configForm') as HTMLFormElement
    this.saveConfigBtn = document.getElementById('saveConfigBtn') as HTMLButtonElement
    this.resetConfigBtn = document.getElementById('resetConfigBtn') as HTMLButtonElement
  }

  private async checkBrowserStatus(): Promise<void> {
    try {
      const status = await window.electronAPI.getBrowserStatus()
      const needsInstall = await window.electronAPI.needsChromiumInstall()

      if (status.hasSystemBrowser) {
        this.addLog(`检测到系统浏览器: ${status.systemBrowserPath}`, 'success')
        this.installBtn.style.display = 'none'
      } else if (status.hasBundledChromium) {
        this.addLog('使用Puppeteer内置浏览器', 'info')
        this.installBtn.style.display = 'none'
      } else if (needsInstall) {
        this.addLog('未检测到Chrome浏览器，显示安装选项', 'error')
        this.installBtn.style.display = 'inline-block'
        this.startBtn.disabled = true
      }
    } catch (error) {
      this.addLog(`浏览器状态检测失败: ${error}`, 'error')
    }
  }

  private setupEventListeners(): void {
    this.startBtn.addEventListener('click', () => this.startAutomation())
    this.stopBtn.addEventListener('click', () => this.stopAutomation())
    this.installBtn.addEventListener('click', () => this.installChromium())
    this.checkLoginBtn.addEventListener('click', () => this.checkWeWorkLogin())

    // 标签页切换
    this.mainTab.addEventListener('click', () => this.switchTab('main'))
    this.configTab.addEventListener('click', () => this.switchTab('config'))

    // 配置管理
    this.saveConfigBtn.addEventListener('click', () => this.saveConfig())
    this.resetConfigBtn.addEventListener('click', () => this.resetConfig())

    // 监听安装进度
    window.electronAPI.onInstallProgress((progress) => {
      this.updateProgress(progress.percentage, progress.status)
    })
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

  private async loadConfig(): Promise<void> {
    try {
      const result = await window.electronAPI.getConfig()
      if (result.success && result.config) {
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
  }

  private async saveConfig(): Promise<void> {
    try {
      const formData = new FormData(this.configForm)
      const config: any = {}

      // 转换表单数据为配置对象
      formData.forEach((value, key) => {
        config[key] = value
      })

      this.saveConfigBtn.disabled = true
      this.saveConfigBtn.textContent = '保存中...'

      const result = await window.electronAPI.saveConfig(config)

      if (result.success) {
        this.addLog(result.message, 'success')
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

  private async resetConfig(): Promise<void> {
    try {
      this.resetConfigBtn.disabled = true
      this.resetConfigBtn.textContent = '重置中...'

      const result = await window.electronAPI.resetConfig()

      if (result.success) {
        this.addLog(result.message, 'success')
        await this.loadConfig() // 重新加载配置到表单
      } else {
        this.addLog(result.message, 'error')
      }
    } catch (error) {
      this.addLog('重置配置失败: ' + error, 'error')
    } finally {
      this.resetConfigBtn.disabled = false
      this.resetConfigBtn.textContent = '重置默认'
    }
  }

  private async checkWeWorkLogin(): Promise<void> {
    try {
      this.checkLoginBtn.disabled = true
      this.checkLoginBtn.textContent = '检查中...'
      this.updateLoginStatus('checking', '正在检查登录状态...')
      this.addLog('开始检查企微登录状态', 'info')

      const result = await window.electronAPI.checkWeWorkLogin()

      // 如果有登录数据，显示详细信息
      if (result.data) {
        const loginData = result.data
        const status = loginData.isLoggedIn ? 'logged-in' : 'not-logged-in'
        const message = loginData.isLoggedIn ? '已登录' : '未登录'

        this.updateLoginStatus(status, message)
        this.updateLoginDetails(loginData)
        this.addLog(result.message, result.success ? 'success' : 'error')
      } else {
        // 没有登录数据时的处理
        const status = result.success ? 'logged-in' : 'not-logged-in'
        const message = result.success ? '已登录' : '检查失败'

        this.updateLoginStatus(status, message)
        this.updateLoginDetails(null)
        this.addLog(result.message, result.success ? 'success' : 'error')
      }
    } catch (error) {
      this.updateLoginStatus('not-logged-in', '检查失败')
      this.updateLoginDetails(null)
      this.addLog(`检查登录状态失败: ${error}`, 'error')
    } finally {
      this.checkLoginBtn.disabled = false
      this.checkLoginBtn.textContent = '检查企微登录'
    }
  }

  private updateLoginStatus(
    status: 'logged-in' | 'not-logged-in' | 'checking',
    message: string,
  ): void {
    // 清除所有状态类
    this.loginStatusDiv.classList.remove('logged-in', 'not-logged-in', 'checking')

    // 添加新状态类
    this.loginStatusDiv.classList.add(status)
    this.loginStatusDiv.textContent = message
  }

  private updateLoginDetails(loginData: any): void {
    if (loginData) {
      this.currentUrlSpan.textContent = loginData.currentUrl || '-'
      this.pageTitleSpan.textContent = loginData.pageTitle || '-'
      this.checkTimeSpan.textContent = loginData.timestamp
        ? new Date(loginData.timestamp).toLocaleString()
        : '-'

      this.loginDetailsDiv.style.display = 'block'
    } else {
      this.loginDetailsDiv.style.display = 'none'
    }
  }

  private async installChromium(): Promise<void> {
    try {
      this.installBtn.disabled = true
      this.progressPanel.style.display = 'block'
      this.addLog('开始安装Chromium...', 'info')

      const result = await window.electronAPI.installChromium()

      if (result.success) {
        this.addLog(result.message, 'success')
        this.installBtn.style.display = 'none'
        this.startBtn.disabled = false
        this.progressPanel.style.display = 'none'

        // 重新检查浏览器状态
        await this.checkBrowserStatus()
      } else {
        this.addLog(result.message, 'error')
        this.installBtn.disabled = false
        this.progressPanel.style.display = 'none'
      }
    } catch (error) {
      this.addLog(`安装失败: ${error}`, 'error')
      this.installBtn.disabled = false
      this.progressPanel.style.display = 'none'
    }
  }

  private updateProgress(percentage: number, status: string): void {
    this.progressBar.style.width = `${percentage}%`
    this.progressText.textContent = `${percentage}% - ${status}`
    this.addLog(status, 'info')
  }

  private async startAutomation(): Promise<void> {
    try {
      this.updateButtonStates(true)
      this.updateStatus('启动中...')
      this.addLog('正在启动自动化系统...', 'info')

      const result = await window.electronAPI.startAutomation()

      if (result.success) {
        this.isRunning = true
        this.updateStatus('运行中')
        this.addLog(result.message, 'success')
      } else {
        this.updateButtonStates(false)
        this.updateStatus('启动失败')
        this.addLog(result.message, 'error')
      }
    } catch (error) {
      this.updateButtonStates(false)
      this.updateStatus('启动失败')
      this.addLog(`启动失败: ${error}`, 'error')
    }
  }

  private async stopAutomation(): Promise<void> {
    try {
      this.updateStatus('停止中...')
      this.addLog('正在停止自动化系统...', 'info')

      const result = await window.electronAPI.stopAutomation()

      if (result.success) {
        this.isRunning = false
        this.updateButtonStates(false)
        this.updateStatus('已停止')
        this.addLog(result.message, 'success')
      } else {
        this.updateStatus('停止失败')
        this.addLog(result.message, 'error')
      }
    } catch (error) {
      this.updateStatus('停止失败')
      this.addLog(`停止失败: ${error}`, 'error')
    }
  }

  private updateButtonStates(isRunning: boolean): void {
    this.startBtn.disabled = isRunning
    this.stopBtn.disabled = !isRunning
  }

  private updateStatus(status: string): void {
    this.statusDiv.textContent = status
  }

  private addLog(message: string, type: 'info' | 'success' | 'error'): void {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = document.createElement('div')
    logEntry.className = `log-entry ${type}`
    logEntry.textContent = `[${timestamp}] ${message}`

    this.logsDiv.appendChild(logEntry)
    this.logsDiv.scrollTop = this.logsDiv.scrollHeight
  }
}

// 等待DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new RendererApp()
})
