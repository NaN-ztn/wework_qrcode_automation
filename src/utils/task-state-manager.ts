import * as fs from 'fs'
import * as path from 'path'
import { ConfigManager } from './config-manager'

export interface StoreData {
  storeName: string
  mobile: string
  storeType: string
  assistant: string
  weibanAssistant?: string
}

export interface StepResult {
  stepNumber: number
  stepName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  message: string
  timestamp: number
  data?: any
}

export interface TaskState {
  id: string
  storeData: StoreData
  currentStep: number
  steps: StepResult[]
  qrCodePaths: {
    weworkQrPath: string
    weibanQrPath: string
  }
  isCompleted: boolean
  createdAt: number
  updatedAt: number
}

export class TaskStateManager {
  private static instance: TaskStateManager
  private taskStateStoragePath: string

  constructor() {
    const config = ConfigManager.loadConfig()
    // 使用用户数据目录下的task-states子目录
    this.taskStateStoragePath = path.join(path.dirname(config.USER_DATA_DIR), 'task-states')
    this.ensureStorageDirectory()
  }

  public static getInstance(): TaskStateManager {
    if (!TaskStateManager.instance) {
      TaskStateManager.instance = new TaskStateManager()
    }
    return TaskStateManager.instance
  }

  /**
   * 确保存储目录存在
   */
  private ensureStorageDirectory(): void {
    try {
      if (!fs.existsSync(this.taskStateStoragePath)) {
        fs.mkdirSync(this.taskStateStoragePath, { recursive: true })
        console.log(`任务状态存储目录已创建: ${this.taskStateStoragePath}`)
      }
    } catch (error) {
      console.error('创建任务状态存储目录失败:', error)
      throw new Error(`无法创建任务状态存储目录: ${this.taskStateStoragePath}`)
    }
  }

  /**
   * 生成任务状态文件路径
   */
  private getTaskStateFilePath(taskId?: string): string {
    const fileName = taskId ? `task-${taskId}.json` : 'current-task.json'
    return path.join(this.taskStateStoragePath, fileName)
  }

  /**
   * 创建新的任务状态
   */
  public async createTaskState(storeData: StoreData): Promise<TaskState> {
    const now = Date.now()
    const taskId = `task-${storeData.storeName}-${now}`

    const initialSteps: StepResult[] = [
      {
        stepNumber: 1,
        stepName: '检查企微登录状态',
        status: 'pending',
        message: '等待执行...',
        timestamp: now,
      },
      {
        stepNumber: 2,
        stepName: '检查微伴登录状态',
        status: 'pending',
        message: '等待执行...',
        timestamp: now,
      },
      {
        stepNumber: 3,
        stepName: '更改企微通讯录名称',
        status: 'pending',
        message: '等待执行...',
        timestamp: now,
      },
      {
        stepNumber: 4,
        stepName: '创建企业微信群码',
        status: 'pending',
        message: '等待执行...',
        timestamp: now,
      },
      {
        stepNumber: 5,
        stepName: '创建微伴+v活码',
        status: 'pending',
        message: '等待执行...',
        timestamp: now,
      },
    ]

    const taskState: TaskState = {
      id: taskId,
      storeData,
      currentStep: 1,
      steps: initialSteps,
      qrCodePaths: {
        weworkQrPath: '',
        weibanQrPath: '',
      },
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    }

    await this.saveTaskState(taskState)
    console.log(`新任务状态已创建: ${taskId}`)
    return taskState
  }

  /**
   * 保存任务状态
   */
  public async saveTaskState(taskState: TaskState): Promise<void> {
    try {
      taskState.updatedAt = Date.now()
      const filePath = this.getTaskStateFilePath()
      await fs.promises.writeFile(filePath, JSON.stringify(taskState, null, 2))

      // 同时保存一份带ID的备份
      const backupPath = this.getTaskStateFilePath(taskState.id)
      await fs.promises.writeFile(backupPath, JSON.stringify(taskState, null, 2))

      console.log(`任务状态已保存: ${taskState.id}`)
    } catch (error) {
      console.error('保存任务状态失败:', error)
      throw new Error(`保存任务状态失败: ${error}`)
    }
  }

  /**
   * 加载当前任务状态
   */
  public async loadCurrentTaskState(): Promise<TaskState | null> {
    try {
      const filePath = this.getTaskStateFilePath()
      if (!fs.existsSync(filePath)) {
        return null
      }

      const content = await fs.promises.readFile(filePath, 'utf-8')
      const taskState = JSON.parse(content) as TaskState

      console.log(`加载任务状态: ${taskState.id}`)
      return taskState
    } catch (error) {
      console.error('加载任务状态失败:', error)
      return null
    }
  }

  /**
   * 更新步骤状态
   */
  public async updateStepStatus(
    stepNumber: number,
    status: 'pending' | 'running' | 'completed' | 'failed',
    message: string,
    data?: any,
  ): Promise<void> {
    const taskState = await this.loadCurrentTaskState()
    if (!taskState) {
      console.warn('未找到当前任务状态，无法更新步骤状态')
      return
    }

    const stepIndex = stepNumber - 1
    if (stepIndex >= 0 && stepIndex < taskState.steps.length) {
      taskState.steps[stepIndex].status = status
      taskState.steps[stepIndex].message = message
      taskState.steps[stepIndex].timestamp = Date.now()
      if (data) {
        taskState.steps[stepIndex].data = data
      }

      // 更新当前步骤
      if (status === 'completed') {
        taskState.currentStep = Math.min(stepNumber + 1, taskState.steps.length)
      }

      // 检查是否所有步骤都已完成
      const allCompleted = taskState.steps.every((step) => step.status === 'completed')
      if (allCompleted) {
        taskState.isCompleted = true
      }

      await this.saveTaskState(taskState)
      console.log(`步骤${stepNumber}状态已更新: ${status} - ${message}`)
    }
  }

  /**
   * 更新二维码路径
   */
  public async updateQrCodePaths(qrCodePaths: {
    weworkQrPath?: string
    weibanQrPath?: string
  }): Promise<void> {
    const taskState = await this.loadCurrentTaskState()
    if (!taskState) {
      console.warn('未找到当前任务状态，无法更新二维码路径')
      return
    }

    if (qrCodePaths.weworkQrPath) {
      taskState.qrCodePaths.weworkQrPath = qrCodePaths.weworkQrPath
    }
    if (qrCodePaths.weibanQrPath) {
      taskState.qrCodePaths.weibanQrPath = qrCodePaths.weibanQrPath
    }

    await this.saveTaskState(taskState)
    console.log('二维码路径已更新:', qrCodePaths)
  }

  /**
   * 检查是否有未完成的任务
   */
  public async hasUnfinishedTask(): Promise<boolean> {
    const taskState = await this.loadCurrentTaskState()
    return taskState !== null && !taskState.isCompleted
  }

  /**
   * 获取可继续执行的步骤
   */
  public async getContinuableStep(): Promise<number | null> {
    const taskState = await this.loadCurrentTaskState()
    if (!taskState || taskState.isCompleted) {
      return null
    }

    // 找到第一个失败的步骤或当前正在执行的步骤
    for (let i = 0; i < taskState.steps.length; i++) {
      const step = taskState.steps[i]
      if (step.status === 'failed' || step.status === 'running') {
        return step.stepNumber
      }
    }

    // 如果没有失败的步骤，返回当前步骤
    return taskState.currentStep <= taskState.steps.length ? taskState.currentStep : null
  }

  /**
   * 清除当前任务状态
   */
  public async clearTaskState(): Promise<void> {
    try {
      const filePath = this.getTaskStateFilePath()
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
        console.log('当前任务状态已清除')
      }
    } catch (error) {
      console.error('清除任务状态失败:', error)
    }
  }

  /**
   * 获取历史任务状态列表
   */
  public async getHistoryTaskStates(): Promise<TaskState[]> {
    try {
      const files = await fs.promises.readdir(this.taskStateStoragePath)
      const taskFiles = files.filter((file) => file.startsWith('task-') && file.endsWith('.json'))

      const taskStates: TaskState[] = []
      for (const file of taskFiles) {
        try {
          const filePath = path.join(this.taskStateStoragePath, file)
          const content = await fs.promises.readFile(filePath, 'utf-8')
          const taskState = JSON.parse(content) as TaskState
          taskStates.push(taskState)
        } catch (error) {
          console.warn(`读取任务状态文件失败: ${file}`, error)
        }
      }

      // 按创建时间降序排序
      return taskStates.sort((a, b) => b.createdAt - a.createdAt)
    } catch (error) {
      console.error('获取历史任务状态失败:', error)
      return []
    }
  }
}
