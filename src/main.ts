import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { BrowserManager, InstallProgress } from './utils/browser-config'
import { ConfigManager, AppConfig } from './utils/config-manager'
import { WeworkManager } from './automation/wework'
import { BrowserInstance } from './automation/browser-instance'

class ElectronApp {
  private mainWindow: BrowserWindow | null = null
  private weworkManager: WeworkManager

  constructor() {
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
    // 获取浏览器状态
    ipcMain.handle('get-browser-status', async () => {
      return BrowserManager.getBrowserStatus()
    })

    // 检查是否需要安装Chromium
    ipcMain.handle('needs-chromium-install', () => {
      return BrowserManager.needsChromiumInstall()
    })

    // 安装Chromium
    ipcMain.handle('install-chromium', async () => {
      try {
        const success = await BrowserManager.installChromium((progress: InstallProgress) => {
          // 发送进度到渲染进程
          this.mainWindow?.webContents.send('install-progress', progress)
        })

        return { success, message: success ? 'Chromium安装成功！' : 'Chromium安装失败' }
      } catch (error) {
        return {
          success: false,
          message: `安装失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }
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

    ipcMain.handle('start-automation', async () => {
      try {
        // 使用BrowserInstance单例来管理浏览器，确保session持久化
        const result = await this.weworkManager.initBrowser()

        if (result.success) {
          return { success: true, message: '自动化已启动（session已保持）' }
        } else {
          return result
        }
      } catch (error) {
        console.error('启动浏览器失败:', error)
        return {
          success: false,
          message: `启动失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })

    ipcMain.handle('stop-automation', async () => {
      try {
        // 只清理BrowserInstance单例（保留session）
        await BrowserInstance.cleanup()

        return { success: true, message: '自动化已停止（session数据已保留）' }
      } catch (error) {
        return { success: false, message: `停止失败: ${error}` }
      }
    })

    // 企微登录状态检查
    ipcMain.handle('check-wework-login', async () => {
      try {
        return await this.weworkManager.checkWeWorkLogin()
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
  }

  private async cleanup(): Promise<void> {
    console.log('开始清理资源（保留session数据）...')

    try {
      // 只清理BrowserInstance，但保留session数据
      console.log('清理BrowserInstance（保留session）')
      await BrowserInstance.cleanup()

      console.log('资源清理完成，session数据已保留')
    } catch (error) {
      console.error('清理资源时出错:', error)
      // 如果需要，可以选择强制清理，但会丢失session
      // await BrowserInstance.forceCleanup()
    }
  }
}

new ElectronApp()
