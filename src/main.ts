import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { ConfigManager, AppConfig } from './utils/config-manager'
import { WeworkManager } from './automation/wework'
import { BrowserInstance } from './automation/browser-instance'

class ElectronApp {
  private mainWindow: BrowserWindow | null = null
  private weworkManager: WeworkManager
  private browserInstance: BrowserInstance
  private logs: string[] = []

  constructor() {
    this.browserInstance = BrowserInstance.getInstance()
    this.weworkManager = WeworkManager.getInstance()
    this.setupLogging()
    this.initConfig()
    this.init()
  }

  private setupLogging(): void {
    // 保存原始的 console 方法
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    // 重写 console 方法，同时发送到渲染进程
    console.log = (...args: any[]) => {
      const message = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      const logEntry = `[LOG] ${new Date().toLocaleTimeString()} ${message}`
      this.logs.push(logEntry)
      this.sendLogToRenderer('log', message)
      originalLog.apply(console, args)
    }

    console.error = (...args: any[]) => {
      const message = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      const logEntry = `[ERROR] ${new Date().toLocaleTimeString()} ${message}`
      this.logs.push(logEntry)
      this.sendLogToRenderer('error', message)
      originalError.apply(console, args)
    }

    console.warn = (...args: any[]) => {
      const message = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      const logEntry = `[WARN] ${new Date().toLocaleTimeString()} ${message}`
      this.logs.push(logEntry)
      this.sendLogToRenderer('warn', message)
      originalWarn.apply(console, args)
    }

    // 限制日志条数，避免内存泄露
    setInterval(() => {
      if (this.logs.length > 1000) {
        this.logs = this.logs.slice(-500)
      }
    }, 30000)
  }

  private sendLogToRenderer(level: string, message: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('main-process-log', {
        level,
        message,
        timestamp: new Date().toLocaleTimeString(),
      })
    }
  }

  private async initConfig(): Promise<void> {
    // 初始化配置文件
    console.log('=== 主进程: 初始化配置 ===')
    console.log('当前工作目录:', process.cwd())
    console.log('__dirname:', __dirname)
    console.log('process.resourcesPath:', process.resourcesPath)
    console.log('NODE_ENV:', process.env.NODE_ENV)

    const success = await ConfigManager.createInitialConfig()
    console.log('配置初始化结果:', success)

    const config = ConfigManager.loadConfig()
    console.log('加载的配置:', JSON.stringify(config, null, 2))
    console.log('配置文件路径:', ConfigManager.getConfigPath())

    // 检查头像文件是否存在
    console.log('=== 主进程: 头像文件检查 ===')
    console.log('配置的头像路径:', config.STORE_AVATAR_PATH)
    console.log('头像文件是否存在:', fs.existsSync(config.STORE_AVATAR_PATH))
  }

  private init(): void {
    app.whenReady().then(() => {
      this.createWindow()
      this.setupIPC()
    })

    app.on('window-all-closed', async () => {
      if (process.platform !== 'darwin') {
        await this.cleanup()
        app.quit()
      }
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow()
      }
    })
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    })

    this.mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  }

  private setupIPC(): void {
    // 浏览器状态API
    ipcMain.handle('get-browser-status', async () => {
      return {
        success: true,
        data: {
          hasSystemBrowser: false, // 简化实现，直接返回false
          systemBrowserPath: null,
          hasBundledChromium: true, // 使用Puppeteer内置Chromium
        },
      }
    })

    // 配置管理API
    ipcMain.handle('get-config', async () => {
      try {
        return { success: true, config: ConfigManager.loadConfig() }
      } catch (error) {
        return { success: false, message: `获取配置失败: ${error}` }
      }
    })

    ipcMain.handle('save-config', async (_, config: AppConfig) => {
      try {
        const errors = ConfigManager.validateConfig(config)
        if (errors.length > 0) {
          return { success: false, message: `配置验证失败: ${errors.join(', ')}` }
        }

        const success = await ConfigManager.saveConfig(config)
        return {
          success,
          message: success ? '配置保存成功！' : '配置保存失败',
        }
      } catch (error) {
        return { success: false, message: `保存配置失败: ${error}` }
      }
    })

    ipcMain.handle('reset-config', async () => {
      try {
        const success = await ConfigManager.createInitialConfig()
        return {
          success,
          message: success ? '配置已重置为默认值！' : '配置重置失败',
        }
      } catch (error) {
        return { success: false, message: `重置配置失败: ${error}` }
      }
    })

    // 执行任务
    ipcMain.handle('execute-task', async () => {
      try {
        console.log('=== 主进程: 开始检查企微登录状态 ===')
        const res = await this.weworkManager.checkWeWorkLogin()
        console.log('=== 主进程: 登录检查完成，结果:', JSON.stringify(res, null, 2))

        if (!res.success) return res

        console.log('=== 主进程: 开始变更联系人信息 ===')
        const changeResult = await this.weworkManager.changeContactInfo({
          mobile: '13052828856',
          storeName: '楠子22',
          storeType: '店中店',
        })
        console.log('=== 主进程: 联系人信息变更完成，结果:', JSON.stringify(changeResult, null, 2))

        return res
      } catch (error) {
        console.error('=== 主进程: 检查企微登录状态失败 ===')
        console.error('错误详情:', error)
        console.error('错误堆栈:', error instanceof Error ? error.stack : '无堆栈信息')
        return {
          success: false,
          message: `检查登录状态失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })

    // 获取自动化管理器状态
    ipcMain.handle('get-automation-status', async () => {
      return {
        success: true,
        data: {
          isRunning: this.weworkManager.isRunning(),
          userDataDir: this.weworkManager.getUserDataDir(),
        },
      }
    })

    // 获取浏览器运行状态
    ipcMain.handle('get-browser-running', async () => {
      return {
        success: true,
        data: {
          isRunning: this.weworkManager.isRunning(),
        },
      }
    })

    // 停止执行
    ipcMain.handle('stop-execution', async () => {
      try {
        await this.browserInstance.forceCloseBrowser()
        return {
          success: true,
          message: '执行已停止',
        }
      } catch (error) {
        console.error('停止执行失败:', error)
        return {
          success: false,
          message: `停止执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })

    // 获取日志历史
    ipcMain.handle('get-logs', async () => {
      return {
        success: true,
        data: this.logs,
      }
    })

    // 清空日志
    ipcMain.handle('clear-logs', async () => {
      this.logs = []
      return {
        success: true,
        message: '日志已清空',
      }
    })
  }

  private async cleanup(): Promise<void> {
    console.log('开始清理资源')

    try {
      // 只清理BrowserInstance
      console.log('清理BrowserInstance')
      await this.browserInstance.forceCloseBrowser()

      console.log('资源清理完成')
    } catch (error) {
      console.error('清理资源时出错:', error)
    }
  }
}

new ElectronApp()
