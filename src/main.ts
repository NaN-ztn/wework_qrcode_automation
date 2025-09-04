import { app, BrowserWindow, ipcMain, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { ConfigManager, AppConfig } from './utils/config-manager'
import { WeworkManager } from './automation/wework'
import { WeibanManager } from './automation/weiban'
import { BrowserInstance } from './automation/browser-instance'
import { TodoListManager } from './utils/todo-list-manager'

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

      // 检查是否是插件状态更新的特殊日志消息
      if (message.includes('🔄 PLUGIN_STATUS_UPDATE:')) {
        try {
          const updateMatch = message.match(/🔄 PLUGIN_STATUS_UPDATE: (\S+) (\S+) (\S+)/)
          if (updateMatch) {
            const [, todoListId, pluginId, status] = updateMatch
            // 使用原始console.log避免递归调用
            originalLog(`📤 检测到状态更新消息，发送事件: ${pluginId} -> ${status}`)
            this.sendPluginStatusUpdate(pluginId, todoListId, status)
          }
        } catch (e) {
          // 使用原始console.error避免递归调用
          originalError('解析状态更新消息失败:', e)
        }
      }

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
          weibanAssistant?: string
        },
      ) => {
        try {
          // 重置三层停止标识，确保新任务不受之前停止状态影响
          this.weworkManager.resetAllStopFlags()
          console.log('🔄 已重置三层停止标识，准备执行主页任务')

          // 创建任务状态
          const { TaskStateManager } = await import('./utils/task-state-manager')
          const taskStateManager = TaskStateManager.getInstance()
          const taskState = await taskStateManager.createTaskState(storeData)
          console.log(`✅ 任务状态已创建: ${taskState.id}`)

          const qrCodePaths = {
            weworkQrPath: '',
            weibanQrPath: '',
          }

          // 步骤1: 检查企微登录状态
          await taskStateManager.updateStepStatus(1, 'running', '正在检查企微登录状态')
          this.sendStepUpdate(1, 'running', '检查企微登录状态')
          console.log('=== 步骤1: 检查企微登录状态 ===')
          const weworkLoginResult = await this.weworkManager.checkWeWorkLogin()

          if (!weworkLoginResult.success) {
            await taskStateManager.updateStepStatus(
              1,
              'failed',
              `企微登录检查失败: ${weworkLoginResult.message}`,
            )
            this.sendStepUpdate(1, 'failed', `企微登录检查失败: ${weworkLoginResult.message}`)
            return weworkLoginResult
          }

          await taskStateManager.updateStepStatus(1, 'completed', '企微登录检查成功')
          this.sendStepUpdate(1, 'completed', '企微登录检查成功')

          // 步骤2: 检查微伴登录状态
          await taskStateManager.updateStepStatus(2, 'running', '正在检查微伴登录状态')
          this.sendStepUpdate(2, 'running', '检查微伴登录状态')
          console.log('=== 步骤2: 检查微伴登录状态 ===')
          const weibanLoginResult = await this.weibanManager.checkWeibanLogin()

          if (!weibanLoginResult.success) {
            await taskStateManager.updateStepStatus(
              2,
              'failed',
              `微伴登录检查失败: ${weibanLoginResult.message}`,
            )
            this.sendStepUpdate(2, 'failed', `微伴登录检查失败: ${weibanLoginResult.message}`)
            return weibanLoginResult
          }

          await taskStateManager.updateStepStatus(2, 'completed', '微伴登录检查成功')
          this.sendStepUpdate(2, 'completed', '微伴登录检查成功')

          // 步骤3: 更改企微通讯录名称
          await taskStateManager.updateStepStatus(3, 'running', '正在更改企微通讯录名称')
          this.sendStepUpdate(3, 'running', '更改企微通讯录名称')
          console.log('=== 步骤3: 更改企微通讯录名称 ===')
          const changeResult = await this.weworkManager.changeContactInfo({
            mobile: storeData.mobile,
            storeName: storeData.storeName,
            storeType: storeData.storeType,
          })

          if (!changeResult.success) {
            await taskStateManager.updateStepStatus(
              3,
              'failed',
              `通讯录名称更改失败: ${changeResult.message}`,
            )
            this.sendStepUpdate(3, 'failed', `通讯录名称更改失败: ${changeResult.message}`)
            return changeResult
          }

          await taskStateManager.updateStepStatus(3, 'completed', '通讯录名称更改成功')
          this.sendStepUpdate(3, 'completed', '通讯录名称更改成功')

          // 步骤4: 创建企业微信群码
          await taskStateManager.updateStepStatus(4, 'running', '正在创建企业微信群码')
          this.sendStepUpdate(4, 'running', '创建企业微信群码')
          console.log('=== 步骤4: 创建企业微信群码 ===')
          const weworkQrResult = await this.weworkManager.createGroupLiveCode({
            storeName: storeData.storeName,
            storeType: storeData.storeType,
            assistant: storeData.assistant,
          })

          if (!weworkQrResult.success) {
            await taskStateManager.updateStepStatus(
              4,
              'failed',
              `企微群码创建失败: ${weworkQrResult.message}`,
            )
            this.sendStepUpdate(4, 'failed', `企微群码创建失败: ${weworkQrResult.message}`)
            return weworkQrResult
          }

          if (weworkQrResult.data?.qrCodePath) {
            qrCodePaths.weworkQrPath = weworkQrResult.data.qrCodePath
            await taskStateManager.updateQrCodePaths({ weworkQrPath: qrCodePaths.weworkQrPath })
            // 立即发送企微二维码路径到渲染进程
            this.sendQrCodePaths({
              weworkQrPath: qrCodePaths.weworkQrPath,
              weibanQrPath: qrCodePaths.weibanQrPath,
            })
          }

          await taskStateManager.updateStepStatus(4, 'completed', '企微群码创建成功')
          this.sendStepUpdate(4, 'completed', '企微群码创建成功')

          // 步骤5: 创建微伴+v活码
          await taskStateManager.updateStepStatus(5, 'running', '正在创建微伴+v活码')
          this.sendStepUpdate(5, 'running', '创建微伴+v活码')
          console.log('=== 步骤5: 创建微伴+v活码 ===')

          // 确保企微群码已经生成
          if (!qrCodePaths.weworkQrPath) {
            await taskStateManager.updateStepStatus(
              5,
              'failed',
              '微伴活码创建失败: 企微群码尚未生成',
            )
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
            weibanAssistant: storeData.weibanAssistant,
          })

          if (!weibanQrResult.success) {
            await taskStateManager.updateStepStatus(
              5,
              'failed',
              `微伴活码创建失败: ${weibanQrResult.message}`,
            )
            this.sendStepUpdate(5, 'failed', `微伴活码创建失败: ${weibanQrResult.message}`)
            return weibanQrResult
          }

          if (weibanQrResult.data?.qrCodePath) {
            qrCodePaths.weibanQrPath = weibanQrResult.data.qrCodePath
            await taskStateManager.updateQrCodePaths({ weibanQrPath: qrCodePaths.weibanQrPath })
            // 立即发送微伴二维码路径到渲染进程
            this.sendQrCodePaths({
              weworkQrPath: qrCodePaths.weworkQrPath,
              weibanQrPath: qrCodePaths.weibanQrPath,
            })
          } else if (weibanQrResult.data?.weibanQrCodePath) {
            // 处理微伴返回的二维码路径字段可能不同的情况
            qrCodePaths.weibanQrPath = weibanQrResult.data.weibanQrCodePath
            await taskStateManager.updateQrCodePaths({ weibanQrPath: qrCodePaths.weibanQrPath })
            this.sendQrCodePaths({
              weworkQrPath: qrCodePaths.weworkQrPath,
              weibanQrPath: qrCodePaths.weibanQrPath,
            })
          }

          await taskStateManager.updateStepStatus(5, 'completed', '微伴活码创建成功')
          this.sendStepUpdate(5, 'completed', '微伴活码创建成功')

          // 最终再次发送完整的二维码路径信息
          this.sendQrCodePaths(qrCodePaths)

          // 任务完成后关闭浏览器并恢复按钮状态
          console.log('=== 任务完成，关闭浏览器 ===')
          await this.browserInstance.forceCloseBrowser()

          // 清除任务状态
          await taskStateManager.clearTaskState()
          console.log('✅ 任务状态已清除')

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

          // 通知渲染进程检查是否有未完成任务（用于显示继续执行按钮）
          this.sendTaskStateUpdate()

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
        console.log('=== 收到停止主页任务请求 ===')
        // 请求WeworkManager停止执行
        this.weworkManager.requestStop()
        console.log('已向WeworkManager发送停止请求')

        // 强制关闭浏览器实例
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

    // 生成插件任务列表
    ipcMain.handle('generate-plugin-tasks', async (_, options: any) => {
      try {
        // 重置停止标志，允许新任务生成
        this.weworkManager.resetStopFlag()
        console.log('🔄 已重置停止标志，准备生成新任务列表')

        console.log('=== 生成插件任务列表 ===')
        console.log('任务参数:', options)

        const { searchKeyword = '' } = options
        const result = await this.weworkManager.generatePluginTaskList(searchKeyword)

        if (result.success && result.data) {
          console.log('插件任务列表生成完成:', result.message)
          console.log('生成结果:', result.data)

          // 发送任务列表生成完成事件
          this.sendPluginTaskGenerated(
            result.data.todoListId,
            result.data.pluginCount,
            result.data.totalOperations,
          )

          // 发送自动选中通知
          this.sendTodoListCreated(result.data.todoListId)
        } else {
          console.error('插件任务列表生成失败:', result.message)
        }

        return result
      } catch (error) {
        console.error('生成插件任务列表异常:', error)
        return {
          success: false,
          message: `生成插件任务列表异常: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })

    // 执行单个插件任务
    ipcMain.handle('execute-plugin-task', async (_, options: any) => {
      try {
        // 首先检查是否已被请求停止
        if (this.weworkManager.checkStopRequested && this.weworkManager.checkStopRequested()) {
          console.log('🛑 检测到停止请求，拒绝执行插件任务')
          return {
            success: false,
            message: '用户请求停止，插件任务执行已取消',
          }
        }

        console.log('=== 执行单个插件任务 ===')
        console.log('插件参数:', options)

        const { pluginId, todoListId } = options

        // 发送插件开始执行事件
        this.sendPluginTaskStarted(pluginId, todoListId)

        console.log(`📤 准备调用executePluginTask: ${pluginId}`)
        const result = await this.weworkManager.executePluginTask(pluginId, todoListId)

        console.log(
          `📥 executePluginTask返回结果 - success: ${result.success}, message: ${result.message}`,
        )

        if (result.success) {
          console.log(`✅ 插件 ${pluginId} 执行成功，准备发送完成事件`)
          console.log('执行结果:', result.data)

          // 发送插件执行完成事件
          this.sendPluginTaskCompleted(pluginId, todoListId, result.data)
          console.log(`🚀 已发送plugin-task-completed事件: ${pluginId}`)
        } else {
          console.error(`❌ 插件 ${pluginId} 执行失败:`, result.message)

          // 发送插件执行失败事件
          this.sendPluginTaskFailed(pluginId, todoListId, result.message)
          console.log(`🚀 已发送plugin-task-failed事件: ${pluginId}`)
        }

        return result
      } catch (error) {
        console.error('执行单个插件任务异常:', error)

        // 发送插件执行失败事件
        const { pluginId, todoListId } = options
        this.sendPluginTaskFailed(
          pluginId,
          todoListId,
          error instanceof Error ? error.message : '未知错误',
        )

        return {
          success: false,
          message: `执行单个插件任务异常: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })

    // 群码替换功能（重构为分阶段执行）
    ipcMain.handle('execute-group-replace', async (_, options: any) => {
      try {
        // 重置三层停止标识，确保新任务不受之前停止状态影响
        this.weworkManager.resetAllStopFlags()
        console.log('🔄 已重置三层停止标识，准备执行新任务')

        console.log('=== 检查企微登录状态 ===')
        const weworkLoginResult = await this.weworkManager.checkWeWorkLogin()

        console.log('=== 开始执行群码替换任务（分阶段模式） ===')
        console.log('群码替换参数:', options)

        const { searchKeyword = '' } = options

        // 阶段1: 生成插件任务列表
        console.log('\n=== 阶段1: 生成插件任务列表 ===')
        const generateResult = await this.weworkManager.generatePluginTaskList(searchKeyword)

        if (!generateResult.success) {
          console.error('生成插件任务列表失败:', generateResult.message)
          return generateResult
        }

        const { todoListId, pluginCount, totalOperations } = generateResult.data!
        console.log(`任务列表生成成功: ${pluginCount} 个插件，共 ${totalOperations} 个操作`)

        // 发送任务列表生成完成事件
        this.sendPluginTaskGenerated(todoListId, pluginCount, totalOperations)
        // 发送自动选中通知
        this.sendTodoListCreated(todoListId)

        // 阶段2: 逐个执行插件任务
        console.log('\n=== 阶段2: 执行插件任务 ===')

        const todoListManager = TodoListManager.getInstance()
        const todoList = await todoListManager.loadTodoList(todoListId)

        if (!todoList) {
          return {
            success: false,
            message: `TodoList不存在: ${todoListId}`,
          }
        }

        const operationRecords: any[] = []
        let processedCount = 0
        let successCount = 0
        let failureCount = 0

        // 遍历每个插件并执行
        for (const pluginItem of todoList.items) {
          // 检查是否请求停止
          if (this.weworkManager.checkStopRequested && this.weworkManager.checkStopRequested()) {
            console.log('🛑 检测到停止请求，终止群码替换执行')
            await this.browserInstance.forceCloseBrowser()
            return {
              success: false,
              message: '用户请求停止，群码替换已中断',
              data: {
                searchKeyword,
                processedCount,
                successCount,
                failureCount,
                todoListId,
                operationRecords,
              },
            }
          }

          try {
            // 发送插件开始执行事件
            this.sendPluginTaskStarted(pluginItem.pluginId, todoListId)

            // 执行单个插件任务
            const pluginResult = await this.weworkManager.executePluginTask(
              pluginItem.pluginId,
              todoListId,
            )

            if (pluginResult.success && pluginResult.data) {
              operationRecords.push(...pluginResult.data.operationRecords)
              processedCount += pluginResult.data.processedCount
              successCount += pluginResult.data.successCount
              failureCount += pluginResult.data.failureCount

              // 发送插件执行完成事件
              this.sendPluginTaskCompleted(pluginItem.pluginId, todoListId, pluginResult.data)
            } else {
              // 插件执行失败
              failureCount += pluginItem.operationRecords?.length || 0
              console.error(`插件 ${pluginItem.pluginId} 执行失败: ${pluginResult.message}`)

              // 发送插件执行失败事件
              this.sendPluginTaskFailed(pluginItem.pluginId, todoListId, pluginResult.message)
            }
          } catch (error) {
            console.error(`执行插件 ${pluginItem.pluginId} 异常:`, error)
            failureCount += pluginItem.operationRecords?.length || 0

            // 发送插件执行失败事件
            this.sendPluginTaskFailed(
              pluginItem.pluginId,
              todoListId,
              error instanceof Error ? error.message : '未知错误',
            )
          }
        }

        const result = {
          success: true,
          message: `群码替换完成，处理 ${processedCount} 个操作，成功 ${successCount} 个，失败 ${failureCount} 个`,
          data: {
            searchKeyword,
            processedCount,
            successCount,
            failureCount,
            todoListId,
            operationRecords,
          },
        }

        console.log('群码替换任务完成:', result.message)
        console.log('处理结果:', result.data)

        await this.browserInstance.forceCloseBrowser()

        return result
      } catch (error) {
        console.error('群码替换任务异常:', error)

        // 异常情况下确保浏览器清理和状态重置
        try {
          await this.browserInstance.forceCloseBrowser()
          console.log('💥 异常情况下已强制关闭浏览器')
        } catch (closeError) {
          console.error('强制关闭浏览器失败:', closeError)
        }

        return {
          success: false,
          message: `群码替换任务异常: ${error instanceof Error ? error.message : '未知错误'}`,
          data: null,
        }
      }
    })

    // 停止群码替换功能
    ipcMain.handle('stop-group-replace', async () => {
      try {
        console.log('=== 收到停止群码替换请求 ===')

        // 请求WeworkManager停止执行
        this.weworkManager.requestStop()
        console.log('已向WeworkManager发送停止请求')

        // 强制关闭浏览器实例
        if (this.browserInstance) {
          console.log('正在强制关闭浏览器...')
          await this.browserInstance.forceCloseBrowser()
          console.log('浏览器已关闭')
        }

        return {
          success: true,
          message: '群码替换已停止，浏览器已关闭',
        }
      } catch (error) {
        console.error('停止群码替换异常:', error)
        return {
          success: false,
          message: `停止群码替换失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })

    // TodoList相关功能
    ipcMain.handle('get-todo-lists', async () => {
      try {
        console.log('=== 获取TodoList列表 ===')
        const todoListManager = TodoListManager.getInstance()

        const todoLists = await todoListManager.listTodoLists()

        return {
          success: true,
          data: todoLists,
          message: `获取到 ${todoLists.length} 个TodoList`,
        }
      } catch (error) {
        console.error('获取TodoList列表失败:', error)
        return {
          success: false,
          message: `获取TodoList列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })

    ipcMain.handle('get-todo-list-by-id', async (_, todoListId: string) => {
      try {
        console.log(`=== 获取TodoList详情: ${todoListId} ===`)
        const todoListManager = TodoListManager.getInstance()

        const todoList = await todoListManager.loadTodoList(todoListId)

        if (todoList) {
          console.log(
            `📋 加载的TodoList进度: 完成${todoList.progress.completed}/${todoList.progress.total}`,
          )
          console.log(
            `📋 加载的插件状态:`,
            todoList.items.map(
              (item: any, index: number) => `${index + 1}. ${item.pluginId}: ${item.status}`,
            ),
          )

          return {
            success: true,
            data: todoList,
            message: 'TodoList获取成功',
          }
        } else {
          return {
            success: false,
            message: 'TodoList不存在',
          }
        }
      } catch (error) {
        console.error('获取TodoList详情失败:', error)
        return {
          success: false,
          message: `获取TodoList详情失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })

    ipcMain.handle('delete-todo-list', async (_, todoListId: string) => {
      try {
        console.log(`=== 删除TodoList: ${todoListId} ===`)
        const todoListManager = TodoListManager.getInstance()

        const success = await todoListManager.deleteTodoList(todoListId)

        if (success) {
          return {
            success: true,
            message: 'TodoList删除成功',
          }
        } else {
          return {
            success: false,
            message: 'TodoList删除失败，文件不存在',
          }
        }
      } catch (error) {
        console.error('删除TodoList失败:', error)
        return {
          success: false,
          message: `删除TodoList失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })

    ipcMain.handle(
      'resume-todo-list-execution',
      async (_, todoListId: string, options: any = {}) => {
        try {
          console.log(`=== 接续执行TodoList: ${todoListId} ===`)
          console.log('执行选项:', options)

          // 重置三层停止标识，确保接续执行不受之前的停止标识影响
          this.weworkManager.resetAllStopFlags()

          const todoListManager = TodoListManager.getInstance()

          // 加载TodoList
          const todoList = await todoListManager.loadTodoList(todoListId)
          if (!todoList) {
            return {
              success: false,
              message: 'TodoList不存在',
            }
          }

          // 获取需要处理的插件（按插件维度）
          let pluginsToProcess = []
          if (options.retryFailed) {
            // 重试失败的插件
            pluginsToProcess = todoList.items.filter((item: any) => item.status === 'failed')
          } else {
            // 执行待处理和失败的插件
            pluginsToProcess = todoList.items.filter(
              (item: any) => item.status === 'pending' || item.status === 'failed',
            )
          }

          if (pluginsToProcess.length === 0) {
            return {
              success: false,
              message: '没有需要处理的插件',
            }
          }

          console.log(`需要处理 ${pluginsToProcess.length} 个插件`)

          const operationRecords: any[] = []
          let processedCount = 0
          let successCount = 0
          let failureCount = 0

          // 逐个执行插件任务
          for (const pluginItem of pluginsToProcess) {
            // 检查是否请求停止
            if (this.weworkManager.checkStopRequested()) {
              console.log('🛑 检测到停止请求，终止接续执行')
              await this.browserInstance.forceCloseBrowser()
              return {
                success: false,
                message: '用户请求停止，接续执行已中断',
                data: {
                  processedCount,
                  successCount,
                  failureCount,
                  todoListId,
                  operationRecords,
                },
              }
            }

            try {
              // 发送插件开始执行事件
              this.sendPluginTaskStarted(pluginItem.pluginId, todoListId)

              // 执行单个插件任务
              const pluginResult = await this.weworkManager.executePluginTask(
                pluginItem.pluginId,
                todoListId,
              )

              if (pluginResult.success && pluginResult.data) {
                operationRecords.push(...pluginResult.data.operationRecords)
                processedCount += pluginResult.data.processedCount
                successCount += pluginResult.data.successCount
                failureCount += pluginResult.data.failureCount

                // 发送插件执行完成事件
                this.sendPluginTaskCompleted(pluginItem.pluginId, todoListId, pluginResult.data)
              } else {
                // 插件执行失败
                failureCount += pluginItem.operationRecords?.length || 0
                console.error(`插件 ${pluginItem.pluginId} 执行失败: ${pluginResult.message}`)

                // 发送插件执行失败事件
                this.sendPluginTaskFailed(pluginItem.pluginId, todoListId, pluginResult.message)
              }
            } catch (error) {
              console.error(`执行插件 ${pluginItem.pluginId} 异常:`, error)
              failureCount += pluginItem.operationRecords?.length || 0

              // 发送插件执行失败事件
              this.sendPluginTaskFailed(
                pluginItem.pluginId,
                todoListId,
                error instanceof Error ? error.message : '未知错误',
              )
            }
          }

          console.log(
            `接续执行完成: 处理 ${processedCount} 个操作，成功 ${successCount} 个，失败 ${failureCount} 个`,
          )

          return {
            success: true,
            message: `接续执行完成，处理 ${processedCount} 个操作，成功 ${successCount} 个，失败 ${failureCount} 个`,
            data: {
              processedCount,
              successCount,
              failureCount,
              todoListId,
              operationRecords,
            },
          }
        } catch (error) {
          console.error('接续执行TodoList失败:', error)

          // 异常情况下确保浏览器清理和状态重置
          try {
            await this.browserInstance.forceCloseBrowser()
            console.log('💥 异常情况下已强制关闭浏览器')
          } catch (closeError) {
            console.error('强制关闭浏览器失败:', closeError)
          }

          return {
            success: false,
            message: `接续执行TodoList失败: ${error instanceof Error ? error.message : '未知错误'}`,
          }
        }
      },
    )

    // 获取可重试的插件列表
    ipcMain.handle('get-retryable-plugins', async (_, todoListId: string) => {
      try {
        console.log(`=== 获取可重试操作列表: ${todoListId} ===`)
        const todoListManager = TodoListManager.getInstance()

        const retryablePlugins = await todoListManager.getRetryablePlugins(todoListId)

        return {
          success: true,
          data: retryablePlugins,
          message: `找到 ${retryablePlugins.length} 个可重试的插件`,
        }
      } catch (error) {
        console.error('获取可重试操作列表失败:', error)
        return {
          success: false,
          message: `获取可重试操作列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })

    // 任务状态管理相关IPC处理器
    ipcMain.handle('get-current-task-state', async () => {
      try {
        const { TaskStateManager } = await import('./utils/task-state-manager')
        const taskStateManager = TaskStateManager.getInstance()
        const taskState = await taskStateManager.loadCurrentTaskState()

        return {
          success: true,
          data: taskState,
          message: taskState ? '任务状态获取成功' : '没有找到任务状态',
        }
      } catch (error) {
        console.error('获取任务状态失败:', error)
        return {
          success: false,
          message: `获取任务状态失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })

    ipcMain.handle('has-unfinished-task', async () => {
      try {
        const { TaskStateManager } = await import('./utils/task-state-manager')
        const taskStateManager = TaskStateManager.getInstance()
        const hasUnfinished = await taskStateManager.hasUnfinishedTask()

        return hasUnfinished
      } catch (error) {
        console.error('检查未完成任务失败:', error)
        return false
      }
    })

    ipcMain.handle('continue-task-execution', async () => {
      try {
        console.log('=== 开始继续执行任务 ===')
        const { TaskStateManager } = await import('./utils/task-state-manager')
        const taskStateManager = TaskStateManager.getInstance()

        // 加载当前任务状态
        const taskState = await taskStateManager.loadCurrentTaskState()
        if (!taskState) {
          return {
            success: false,
            message: '没有找到可继续执行的任务',
          }
        }

        console.log(`继续执行任务: ${taskState.id}`)
        console.log(`当前步骤: ${taskState.currentStep}`)

        // 获取可继续执行的步骤
        const continuableStep = await taskStateManager.getContinuableStep()
        if (!continuableStep) {
          return {
            success: false,
            message: '没有找到可继续执行的步骤',
          }
        }

        console.log(`从步骤${continuableStep}开始继续执行`)

        // 重置停止标识
        this.weworkManager.resetAllStopFlags()

        // 调用继续执行逻辑
        const result = await this.continueTaskFromStep(taskState, continuableStep)

        return result
      } catch (error) {
        console.error('继续执行任务失败:', error)
        return {
          success: false,
          message: `继续执行任务失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })

    ipcMain.handle('clear-task-state', async () => {
      try {
        const { TaskStateManager } = await import('./utils/task-state-manager')
        const taskStateManager = TaskStateManager.getInstance()
        await taskStateManager.clearTaskState()

        return {
          success: true,
          message: '任务状态已清除',
        }
      } catch (error) {
        console.error('清除任务状态失败:', error)
        return {
          success: false,
          message: `清除任务状态失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }
      }
    })
  }

  /**
   * 从指定步骤继续执行任务
   */
  private async continueTaskFromStep(taskState: any, startStep: number): Promise<any> {
    try {
      const { TaskStateManager } = await import('./utils/task-state-manager')
      const taskStateManager = TaskStateManager.getInstance()

      console.log(`开始从步骤${startStep}继续执行任务`)

      const storeData = taskState.storeData
      const qrCodePaths = {
        weworkQrPath: taskState.qrCodePaths.weworkQrPath || '',
        weibanQrPath: taskState.qrCodePaths.weibanQrPath || '',
      }

      // 从指定步骤开始执行
      for (let step = startStep; step <= 5; step++) {
        // 检查当前步骤的状态，如果已经成功完成，则跳过
        const currentStepState = taskState.steps[step - 1]
        if (currentStepState?.status === 'completed') {
          console.log(`⏭️  步骤${step}已完成，跳过执行`)
          // 使用原来的成功消息，如果没有则使用默认消息
          const originalMessage = currentStepState.message || `步骤${step}已完成`
          this.sendStepUpdate(step, 'completed', originalMessage)
          continue
        }

        // 检查是否请求停止
        if (this.weworkManager.checkStopRequested()) {
          console.log('🛑 检测到停止请求，终止继续执行')
          return {
            success: false,
            message: '用户请求停止，任务执行已中断',
          }
        }

        try {
          await taskStateManager.updateStepStatus(step, 'running', `正在执行步骤${step}`)
          this.sendStepUpdate(step, 'running', `正在执行步骤${step}`)

          let stepResult: any

          switch (step) {
            case 1:
              console.log('=== 步骤1: 检查企微登录状态 ===')
              stepResult = await this.weworkManager.checkWeWorkLogin()
              break

            case 2:
              console.log('=== 步骤2: 检查微伴登录状态 ===')
              stepResult = await this.weibanManager.checkWeibanLogin()
              break

            case 3:
              console.log('=== 步骤3: 更改企微通讯录名称 ===')
              stepResult = await this.weworkManager.changeContactInfo({
                mobile: storeData.mobile,
                storeName: storeData.storeName,
                storeType: storeData.storeType,
              })
              break

            case 4:
              console.log('=== 步骤4: 创建企业微信群码 ===')
              stepResult = await this.weworkManager.createGroupLiveCode({
                storeName: storeData.storeName,
                storeType: storeData.storeType,
                assistant: storeData.assistant,
              })

              if (stepResult.success && stepResult.data?.qrCodePath) {
                qrCodePaths.weworkQrPath = stepResult.data.qrCodePath
                await taskStateManager.updateQrCodePaths({ weworkQrPath: qrCodePaths.weworkQrPath })
                this.sendQrCodePaths({
                  weworkQrPath: qrCodePaths.weworkQrPath,
                  weibanQrPath: qrCodePaths.weibanQrPath,
                })
              }
              break

            case 5:
              console.log('=== 步骤5: 创建微伴+v活码 ===')

              // 确保企微群码已经存在
              if (!qrCodePaths.weworkQrPath) {
                stepResult = {
                  success: false,
                  message: '微伴活码创建失败: 企微群码尚未生成',
                }
                break
              }

              const weworkQrDir = path.dirname(qrCodePaths.weworkQrPath)
              stepResult = await this.weibanManager.createWeibanLiveCode({
                qrCodeDir: weworkQrDir,
                qrCodePath: qrCodePaths.weworkQrPath,
                storeName: storeData.storeName,
                storeType: storeData.storeType,
                assistant: storeData.assistant,
                weibanAssistant: storeData.weibanAssistant,
              })

              if (
                stepResult.success &&
                (stepResult.data?.qrCodePath || stepResult.data?.weibanQrCodePath)
              ) {
                qrCodePaths.weibanQrPath =
                  stepResult.data?.qrCodePath || stepResult.data?.weibanQrCodePath
                await taskStateManager.updateQrCodePaths({ weibanQrPath: qrCodePaths.weibanQrPath })
                this.sendQrCodePaths({
                  weworkQrPath: qrCodePaths.weworkQrPath,
                  weibanQrPath: qrCodePaths.weibanQrPath,
                })
              }
              break

            default:
              stepResult = { success: false, message: `未知步骤: ${step}` }
          }

          if (stepResult.success) {
            await taskStateManager.updateStepStatus(step, 'completed', `步骤${step}执行成功`)
            this.sendStepUpdate(step, 'completed', `步骤${step}执行成功`)
            console.log(`✅ 步骤${step}执行成功`)
          } else {
            await taskStateManager.updateStepStatus(
              step,
              'failed',
              `步骤${step}执行失败: ${stepResult.message}`,
            )
            this.sendStepUpdate(step, 'failed', `步骤${step}执行失败: ${stepResult.message}`)
            console.log(`❌ 步骤${step}执行失败: ${stepResult.message}`)

            // 通知渲染进程检查是否有未完成任务（用于显示继续执行按钮）
            this.sendTaskStateUpdate()

            return {
              success: false,
              message: `步骤${step}执行失败: ${stepResult.message}`,
              data: qrCodePaths,
            }
          }
        } catch (error) {
          const errorMessage = `步骤${step}执行异常: ${error instanceof Error ? error.message : '未知错误'}`
          await taskStateManager.updateStepStatus(step, 'failed', errorMessage)
          this.sendStepUpdate(step, 'failed', errorMessage)
          console.error(errorMessage, error)

          // 通知渲染进程检查是否有未完成任务（用于显示继续执行按钮）
          this.sendTaskStateUpdate()

          return {
            success: false,
            message: errorMessage,
            data: qrCodePaths,
          }
        }
      }

      // 所有步骤执行完成
      console.log('=== 任务继续执行完成 ===')
      await this.browserInstance.forceCloseBrowser()
      this.sendButtonStateUpdate('completed')

      // 清除任务状态
      await taskStateManager.clearTaskState()

      return {
        success: true,
        message: '任务继续执行完成',
        data: qrCodePaths,
      }
    } catch (error) {
      console.error('继续执行任务异常:', error)

      try {
        await this.browserInstance.forceCloseBrowser()
      } catch (closeError) {
        console.error('关闭浏览器失败:', closeError)
      }

      this.sendButtonStateUpdate('failed')

      return {
        success: false,
        message: `继续执行任务异常: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
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

  // 发送任务状态更新通知到渲染进程
  private sendTaskStateUpdate(): void {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('task-state-update')
        console.log('已发送任务状态更新通知')
      }
    } catch (error) {
      console.error('发送任务状态更新通知失败:', error)
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

  // 发送TodoList创建事件到渲染进程
  private sendTodoListCreated(todoListId: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('todo-list-created', { todoListId })
    }
  }

  // 发送插件任务列表生成完成事件到渲染进程
  private sendPluginTaskGenerated(
    todoListId: string,
    pluginCount: number,
    totalOperations: number,
  ): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('plugin-task-generated', {
        todoListId,
        pluginCount,
        totalOperations,
      })
    }
  }

  // 发送单个插件开始执行事件到渲染进程
  private sendPluginTaskStarted(pluginId: string, todoListId: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('plugin-task-started', {
        pluginId,
        todoListId,
      })
    }
  }

  // 发送单个插件执行完成事件到渲染进程
  private sendPluginTaskCompleted(pluginId: string, todoListId: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('plugin-task-completed', {
        pluginId,
        todoListId,
        data,
      })
    }
  }

  // 发送单个插件执行失败事件到渲染进程
  private sendPluginTaskFailed(pluginId: string, todoListId: string, error: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('plugin-task-failed', {
        pluginId,
        todoListId,
        error,
      })
    }
  }

  // 发送插件状态更新事件到渲染进程 - 用于实时更新UI
  private sendPluginStatusUpdate(pluginId: string, todoListId: string, status: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('plugin-status-update', {
        pluginId,
        todoListId,
        status,
        timestamp: Date.now(),
      })
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
