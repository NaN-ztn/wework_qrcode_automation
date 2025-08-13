import { app, BrowserWindow, ipcMain, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { ConfigManager, AppConfig } from './utils/config-manager'
import { WeworkManager } from './automation/wework'
import { WeibanManager } from './automation/weiban'
import { BrowserInstance } from './automation/browser-instance'

class ElectronApp {
  private mainWindow: BrowserWindow | null = null
  private weworkManager: WeworkManager
  private weibanManager: WeibanManager
  private browserInstance: BrowserInstance
  private logs: string[] = []

  constructor() {
    this.browserInstance = BrowserInstance.getInstance()
    this.weworkManager = WeworkManager.getInstance()
    this.weibanManager = WeibanManager.getInstance()
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

        if (success) {
          // 配置保存成功后，通知渲染进程更新
          this.sendConfigUpdate()
        }

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
    ipcMain.handle(
      'execute-task',
      async (
        _,
        storeData: {
          storeName: string
          mobile: string
          storeType: string
          assistant: string
        },
      ) => {
        try {
          const qrCodePaths = {
            weworkQrPath: '',
            weibanQrPath: '',
          }

          // 步骤1: 检查企微登录状态
          this.sendStepUpdate(1, 'running', '检查企微登录状态')
          console.log('=== 步骤1: 检查企微登录状态 ===')
          const weworkLoginResult = await this.weworkManager.checkWeWorkLogin()

          if (!weworkLoginResult.success) {
            this.sendStepUpdate(1, 'failed', `企微登录检查失败: ${weworkLoginResult.message}`)
            return weworkLoginResult
          }

          this.sendStepUpdate(1, 'completed', '企微登录检查成功')

          // 步骤2: 检查微伴登录状态
          this.sendStepUpdate(2, 'running', '检查微伴登录状态')
          console.log('=== 步骤2: 检查微伴登录状态 ===')
          const weibanLoginResult = await this.weibanManager.checkWeibanLogin()

          if (!weibanLoginResult.success) {
            this.sendStepUpdate(2, 'failed', `微伴登录检查失败: ${weibanLoginResult.message}`)
            return weibanLoginResult
          }

          this.sendStepUpdate(2, 'completed', '微伴登录检查成功')

          // 步骤3: 更改企微通讯录名称
          this.sendStepUpdate(3, 'running', '更改企微通讯录名称')
          console.log('=== 步骤3: 更改企微通讯录名称 ===')
          const changeResult = await this.weworkManager.changeContactInfo({
            mobile: storeData.mobile,
            storeName: storeData.storeName,
            storeType: storeData.storeType,
          })

          if (!changeResult.success) {
            this.sendStepUpdate(3, 'failed', `通讯录名称更改失败: ${changeResult.message}`)
            return changeResult
          }

          this.sendStepUpdate(3, 'completed', '通讯录名称更改成功')

          // 步骤4: 创建企业微信群码
          this.sendStepUpdate(4, 'running', '创建企业微信群码')
          console.log('=== 步骤4: 创建企业微信群码 ===')
          const weworkQrResult = await this.weworkManager.createGroupLiveCode({
            storeName: storeData.storeName,
            storeType: storeData.storeType,
            assistant: storeData.assistant,
          })

          if (!weworkQrResult.success) {
            this.sendStepUpdate(4, 'failed', `企微群码创建失败: ${weworkQrResult.message}`)
            return weworkQrResult
          }

          if (weworkQrResult.data?.qrCodePath) {
            qrCodePaths.weworkQrPath = weworkQrResult.data.qrCodePath
            // 立即发送企微二维码路径到渲染进程
            this.sendQrCodePaths({
              weworkQrPath: qrCodePaths.weworkQrPath,
              weibanQrPath: qrCodePaths.weibanQrPath,
            })
          }

          this.sendStepUpdate(4, 'completed', '企微群码创建成功')

          // 步骤5: 创建微伴+v活码
          this.sendStepUpdate(5, 'running', '创建微伴+v活码')
          console.log('=== 步骤5: 创建微伴+v活码 ===')
          const config = ConfigManager.loadConfig()

          // 确保企微群码已经生成
          if (!qrCodePaths.weworkQrPath) {
            this.sendStepUpdate(5, 'failed', '微伴活码创建失败: 企微群码尚未生成')
            return {
              success: false,
              message: '微伴活码创建失败: 企微群码尚未生成',
            }
          }

          // 获取企微群码所在的目录作为微伴二维码的保存目录
          const weworkQrDir = path.dirname(qrCodePaths.weworkQrPath)
          const qrCodeFileName = `weiban_${storeData.storeName}_${Date.now()}.png`
          const qrCodePath = path.join(weworkQrDir, qrCodeFileName)

          const weibanQrResult = await this.weibanManager.createWeibanLiveCode({
            qrCodeDir: weworkQrDir,
            qrCodePath: qrCodePaths.weworkQrPath, // 传递企微群码路径作为上传文件
            storeName: storeData.storeName,
            storeType: storeData.storeType,
            assistant: storeData.assistant,
          })

          if (!weibanQrResult.success) {
            this.sendStepUpdate(5, 'failed', `微伴活码创建失败: ${weibanQrResult.message}`)
            return weibanQrResult
          }

          if (weibanQrResult.data?.qrCodePath) {
            qrCodePaths.weibanQrPath = weibanQrResult.data.qrCodePath
            // 立即发送微伴二维码路径到渲染进程
            this.sendQrCodePaths({
              weworkQrPath: qrCodePaths.weworkQrPath,
              weibanQrPath: qrCodePaths.weibanQrPath,
            })
          } else if (weibanQrResult.data?.weibanQrCodePath) {
            // 处理微伴返回的二维码路径字段可能不同的情况
            qrCodePaths.weibanQrPath = weibanQrResult.data.weibanQrCodePath
            this.sendQrCodePaths({
              weworkQrPath: qrCodePaths.weworkQrPath,
              weibanQrPath: qrCodePaths.weibanQrPath,
            })
          }

          this.sendStepUpdate(5, 'completed', '微伴活码创建成功')

          // 最终再次发送完整的二维码路径信息
          this.sendQrCodePaths(qrCodePaths)

          // 任务完成后关闭浏览器并恢复按钮状态
          console.log('=== 任务完成，关闭浏览器 ===')
          await this.browserInstance.forceCloseBrowser()

          // 通知渲染进程恢复按钮状态
          this.sendButtonStateUpdate('completed')

          return {
            success: true,
            message: '所有任务执行完成',
            data: qrCodePaths,
          }
        } catch (error) {
          console.error('=== 任务执行异常 ===')
          console.error('错误详情:', error)
          console.error('错误堆栈:', error instanceof Error ? error.stack : '无堆栈信息')

          // 通知当前步骤失败
          this.sendStepUpdate(
            0,
            'failed',
            `执行异常: ${error instanceof Error ? error.message : '未知错误'}`,
          )

          // 任务失败时也要关闭浏览器并恢复按钮状态
          console.log('=== 任务失败，关闭浏览器 ===')
          try {
            await this.browserInstance.forceCloseBrowser()
          } catch (closeError) {
            console.error('关闭浏览器失败:', closeError)
          }

          // 通知渲染进程恢复按钮状态
          this.sendButtonStateUpdate('failed')

          return {
            success: false,
            message: `任务执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
          }
        }
      },
    )

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

    // 打开二维码文件夹
    ipcMain.handle('open-qrcode-folder', async (_, filePath: string) => {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath)

          if (stats.isDirectory()) {
            // 如果是目录，直接打开目录
            await shell.openPath(filePath)
          } else {
            // 如果是文件，显示文件在文件夹中的位置
            shell.showItemInFolder(filePath)
          }

          return { success: true, message: '已打开文件夹' }
        } else {
          return { success: false, message: '路径不存在' }
        }
      } catch (error) {
        return { success: false, message: `打开文件夹失败: ${error}` }
      }
    })

    // 获取任务历史记录
    ipcMain.handle('get-task-history', async () => {
      try {
        const config = ConfigManager.loadConfig()
        const qrCodeBasePath = config.QRCODE_TARGET_STORE_PATH

        if (!fs.existsSync(qrCodeBasePath)) {
          return {
            success: true,
            data: [],
            message: '二维码存储目录不存在',
          }
        }

        // 读取所有子目录
        const entries = fs.readdirSync(qrCodeBasePath, { withFileTypes: true })
        const directories = entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => {
            const fullPath = path.join(qrCodeBasePath, entry.name)
            const stats = fs.statSync(fullPath)
            return {
              name: entry.name,
              fullPath,
              mtime: stats.mtime,
            }
          })

        // 按修改时间降序排序，取最近10条
        const sortedDirectories = directories
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
          .slice(0, 10)

        // 处理每个目录，提取任务信息和二维码
        const taskHistory = sortedDirectories.map((dir) => {
          // 解析目录名获取门店名称和时间戳
          const dirName = dir.name
          const parts = dirName.split('_')
          let storeName = dirName
          let timestamp = dir.mtime.getTime()

          // 尝试从目录名解析门店名称和时间戳
          if (parts.length >= 2) {
            // 假设格式为: storeName_timestamp 或 storeName_year_month_day_hour_minute_second
            if (parts.length >= 6) {
              // 格式: storeName_year_month_day_hour_minute_second
              storeName = parts[0]
              const year = parseInt(parts[1])
              const month = parseInt(parts[2]) - 1 // JavaScript月份从0开始
              const day = parseInt(parts[3])
              const hour = parseInt(parts[4])
              const minute = parseInt(parts[5])
              const second = parseInt(parts[6]) || 0

              if (!isNaN(year) && year > 2020) {
                timestamp = new Date(year, month, day, hour, minute, second).getTime()
              }
            } else if (parts.length === 2 && /^\d+$/.test(parts[1])) {
              // 格式: storeName_timestamp
              storeName = parts[0]
              const parsedTimestamp = parseInt(parts[1])
              if (!isNaN(parsedTimestamp) && parsedTimestamp > 1000000000000) {
                timestamp = parsedTimestamp
              }
            }
          }

          // 检查二维码文件
          const qrCodes: { wework?: string; weiban?: string } = {}

          const weworkQrPath = path.join(dir.fullPath, 'groupqrcode.png')
          if (fs.existsSync(weworkQrPath)) {
            qrCodes.wework = weworkQrPath
          }

          const weibanQrPath = path.join(dir.fullPath, 'weiban_qr_code.png')
          if (fs.existsSync(weibanQrPath)) {
            qrCodes.weiban = weibanQrPath
          }

          return {
            id: dirName,
            storeName,
            timestamp,
            createTime: new Date(timestamp).toLocaleString('zh-CN'),
            folderPath: dir.fullPath,
            qrCodes,
          }
        })

        return {
          success: true,
          data: taskHistory,
          message: `找到 ${taskHistory.length} 条历史记录`,
        }
      } catch (error) {
        console.error('获取任务历史记录失败:', error)
        return {
          success: false,
          message: `获取任务历史记录失败: ${error instanceof Error ? error.message : '未知错误'}`,
          data: [],
        }
      }
    })
  }

  // 发送步骤更新事件到渲染进程
  private sendStepUpdate(
    step: number,
    status: 'pending' | 'running' | 'completed' | 'failed',
    message: string,
  ): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('task-step-update', {
        step,
        status,
        message,
        timestamp: Date.now(),
      })
    }
  }

  // 发送二维码路径到渲染进程
  private sendQrCodePaths(qrCodePaths: { weworkQrPath: string; weibanQrPath: string }): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('qrcode-paths-update', qrCodePaths)
    }
  }

  // 发送配置更新事件到渲染进程
  private sendConfigUpdate(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      const newConfig = ConfigManager.loadConfig()
      this.mainWindow.webContents.send('config-updated', newConfig)
    }
  }

  // 发送按钮状态更新事件到渲染进程
  private sendButtonStateUpdate(status: 'completed' | 'failed'): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('button-state-update', { status })
    }
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
