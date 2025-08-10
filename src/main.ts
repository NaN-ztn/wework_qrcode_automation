import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { ConfigManager, AppConfig } from './utils/config-manager'
import { WeworkManager } from './automation/wework'
import { BrowserInstance } from './automation/browser-instance'

class ElectronApp {
  private mainWindow: BrowserWindow | null = null
  private weworkManager: WeworkManager
  private browserInstance: BrowserInstance

  constructor() {
    this.browserInstance = BrowserInstance.getInstance()
    this.weworkManager = WeworkManager.getInstance()
    this.initConfig()
    this.init()
  }

  private async initConfig(): Promise<void> {
    // 初始化配置文件
    await ConfigManager.createInitialConfig()
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

    // 企微登录状态检查
    ipcMain.handle('check-wework-login', async () => {
      try {
        const res = await this.weworkManager.checkWeWorkLogin()
        return res
      } catch (error) {
        console.error('检查企微登录状态失败:', error)
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
