import * as fs from 'fs'
import * as path from 'path'
import { TodoList, TodoItem, TodoStatus, TodoListConfig, CollectGroupsResult } from '../types'
import { ConfigManager } from './config-manager'

export class TodoListManager {
  private static instance: TodoListManager
  private todoListStoragePath: string

  constructor() {
    const config = ConfigManager.loadConfig()
    this.todoListStoragePath = config.TODOLIST_STORAGE_PATH
    this.ensureStorageDirectory()
  }

  public static getInstance(): TodoListManager {
    if (!TodoListManager.instance) {
      TodoListManager.instance = new TodoListManager()
    }
    return TodoListManager.instance
  }

  /**
   * 确保存储目录存在
   */
  private ensureStorageDirectory(): void {
    try {
      if (!fs.existsSync(this.todoListStoragePath)) {
        fs.mkdirSync(this.todoListStoragePath, { recursive: true })
        console.log(`TodoList存储目录已创建: ${this.todoListStoragePath}`)
      }
    } catch (error) {
      console.error('创建TodoList存储目录失败:', error)
      throw new Error(`无法创建TodoList存储目录: ${this.todoListStoragePath}`)
    }
  }

  /**
   * 根据群码替换的操作记录创建TodoList（按插件维度组织）
   */
  public async createTodoListFromGroupReplace(
    searchKeyword: string,
    collectGroupsResult: CollectGroupsResult,
    pluginMetadata?: Record<string, { remarks?: string }>,
  ): Promise<TodoList> {
    const now = Date.now()
    const todoListId = `group-replace-${searchKeyword}-${now}`

    // 构建TodoList配置
    const config: TodoListConfig = {
      searchKeyword,
      allowRetry: true,
      defaultMaxRetries: 3,
    }

    // 按插件维度组织TodoItem
    const items: TodoItem[] = []
    let itemIdCounter = 1

    for (const [pluginId, operationRecords] of Object.entries(collectGroupsResult)) {
      if (operationRecords.length === 0) continue

      // 从插件元数据获取remarks信息
      const pluginRemarks = pluginMetadata?.[pluginId]?.remarks
      const displayName = pluginRemarks || this.getPluginDisplayName(pluginId)

      // 创建简化的插件级别的TodoItem
      const item: TodoItem = {
        id: `${todoListId}-plugin-${itemIdCounter++}`,
        pluginId,
        pluginName: displayName,
        remarks: pluginRemarks,
        status: TodoStatus.PENDING,
        operationRecords, // 仅用于统计，不参与状态管理
        createdAt: now,
      }

      items.push(item)
    }

    // 所有插件初始状态为PENDING

    // 构建整体进度信息
    const progress = this.calculateProgress(items)

    const todoList: TodoList = {
      id: todoListId,
      name: `群码替换任务 - ${searchKeyword} - ${new Date(now).toLocaleString('zh-CN')}`,
      createdAt: now,
      updatedAt: now,
      config,
      items,
      status: TodoStatus.PENDING,
      progress,
    }

    // 保存到文件
    await this.saveTodoList(todoList)
    console.log(`TodoList已创建: ${todoList.name}, 包含 ${items.length} 个任务`)

    return todoList
  }

  /**
   * 获取插件显示名称
   */
  private getPluginDisplayName(pluginId: string): string {
    const pluginNames: Record<string, string> = {
      LJYX: '龙江游学',
      HK: '香港区域',
      DD: '懂懂系统',
      default: '默认处理',
    }
    return pluginNames[pluginId] || pluginId
  }

  /**
   * 计算进度信息（插件级别）
   * 注意：这个方法只计算进度，不修改状态
   */
  private calculateProgress(items: TodoItem[]) {
    const progress = {
      total: items.length,
      completed: 0,
      failed: 0,
      pending: 0,
      inProgress: 0,
    }

    console.log(`🔢 开始计算进度，总计 ${items.length} 个插件`)

    items.forEach((item, index) => {
      console.log(`插件 ${index + 1}: ${item.pluginId} 状态: ${item.status}`)

      // 只统计状态，不修改状态
      switch (item.status) {
        case TodoStatus.COMPLETED:
          progress.completed++
          break
        case TodoStatus.FAILED:
          progress.failed++
          break
        case TodoStatus.PENDING:
          progress.pending++
          break
        case TodoStatus.IN_PROGRESS:
          progress.inProgress++
          break
      }
    })

    console.log(
      `📊 进度统计结果: 总计 ${progress.total}, 完成 ${progress.completed}, 失败 ${progress.failed}, 待处理 ${progress.pending}, 进行中 ${progress.inProgress}`,
    )
    return progress
  }

  /**
   * 保存TodoList到文件
   */
  public async saveTodoList(todoList: TodoList): Promise<void> {
    try {
      const filePath = this.getTodoListFilePath(todoList.id)
      const jsonData = JSON.stringify(todoList, null, 2)

      await fs.promises.writeFile(filePath, jsonData, 'utf8')
      console.log(`TodoList已保存: ${filePath}`)
    } catch (error) {
      console.error('保存TodoList失败:', error)
      throw new Error(`保存TodoList失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 从文件加载TodoList
   */
  public async loadTodoList(todoListId: string): Promise<TodoList | null> {
    try {
      const filePath = this.getTodoListFilePath(todoListId)

      if (!fs.existsSync(filePath)) {
        return null
      }

      const fileContent = await fs.promises.readFile(filePath, 'utf8')
      const todoList: TodoList = JSON.parse(fileContent)

      console.log(`TodoList已加载: ${todoList.name}`)
      return todoList
    } catch (error) {
      console.error('加载TodoList失败:', error)
      return null
    }
  }

  /**
   * 简化版插件状态更新 - 只更新插件级别状态，避免操作状态更新的竞态条件
   * 使用重试机制确保状态不会被并发操作覆盖
   */
  public async updatePluginStatusOnly(
    todoListId: string,
    pluginId: string,
    status: TodoStatus,
    error?: string,
    maxRetries: number = 3,
  ): Promise<boolean> {
    let retryCount = 0

    while (retryCount < maxRetries) {
      try {
        console.log(
          `🔄 简化更新插件状态 (尝试 ${retryCount + 1}/${maxRetries}): ${pluginId} -> ${status}`,
        )

        const todoList = await this.loadTodoList(todoListId)
        if (!todoList) {
          console.log(`❌ TodoList不存在: ${todoListId}`)
          return false
        }

        // 找到对应的插件
        const item = todoList.items.find((item) => item.pluginId === pluginId)
        if (!item) {
          console.log(`❌ Plugin不存在: ${pluginId}`)
          return false
        }

        console.log(`📝 插件状态更新: ${item.status} -> ${status}`)

        // 状态保护：如果当前状态已经是completed，不允许降级为pending
        if (item.status === TodoStatus.COMPLETED && status === TodoStatus.PENDING) {
          console.log(`🛡️ 状态保护: 插件 ${pluginId} 已完成，拒绝降级为待处理`)
          return true // 认为更新成功，因为状态已经是期望的更高级状态
        }

        // 直接更新插件状态
        const oldStatus = item.status
        item.status = status
        item.error = error

        if (status === TodoStatus.COMPLETED) {
          item.completedAt = Date.now()
        } else if (status === TodoStatus.IN_PROGRESS) {
          if (!item.startedAt) {
            item.startedAt = Date.now()
          }
        }

        // 重新计算进度前，记录当前状态
        console.log(
          `📋 状态更新前所有插件状态: [${todoList.items.map((item, idx) => `${idx + 1}. ${item.pluginId}: ${item.status}`).join(', ')}]`,
        )

        // 重新计算进度
        todoList.progress = this.calculateProgress(todoList.items)
        todoList.updatedAt = Date.now()

        // 更新整体状态
        todoList.status = this.calculateOverallStatus(todoList.items)

        // 保存前再次验证状态一致性
        const targetItem = todoList.items.find((item) => item.pluginId === pluginId)
        if (targetItem && targetItem.status !== status) {
          console.log(`⚠️ 状态不一致，重试: 期望 ${status}, 实际 ${targetItem.status}`)
          retryCount++
          await new Promise((resolve) => setTimeout(resolve, 100)) // 短暂延迟
          continue
        }

        // 保存
        await this.saveTodoList(todoList)

        console.log(`✅ 插件状态已更新并保存 (尝试 ${retryCount + 1}): ${pluginId} -> ${status}`)
        console.log(
          `📋 保存后所有插件状态: [${todoList.items.map((item, idx) => `${idx + 1}. ${item.pluginId}: ${item.status}`).join(', ')}]`,
        )

        return true
      } catch (error) {
        console.error(`更新插件状态失败 (尝试 ${retryCount + 1}):`, error)
        retryCount++

        if (retryCount < maxRetries) {
          console.log(`⏳ 等待 ${retryCount * 100}ms 后重试...`)
          await new Promise((resolve) => setTimeout(resolve, retryCount * 100))
        }
      }
    }

    console.error(`❌ 插件状态更新最终失败，已重试 ${maxRetries} 次: ${pluginId}`)
    return false
  }

  /**
   * 计算整体状态
   */
  private calculateOverallStatus(items: TodoItem[]): TodoStatus {
    if (items.length === 0) return TodoStatus.PENDING

    const hasInProgress = items.some((item) => item.status === TodoStatus.IN_PROGRESS)
    if (hasInProgress) return TodoStatus.IN_PROGRESS

    const allCompleted = items.every(
      (item) => item.status === TodoStatus.COMPLETED || item.status === TodoStatus.SKIPPED,
    )
    if (allCompleted) return TodoStatus.COMPLETED

    const allFailed = items.every((item) => item.status === TodoStatus.FAILED)
    if (allFailed) return TodoStatus.FAILED

    const hasAnyCompleted = items.some((item) => item.status === TodoStatus.COMPLETED)
    const hasAnyFailed = items.some((item) => item.status === TodoStatus.FAILED)

    if (hasAnyCompleted || hasAnyFailed) {
      // 部分完成，部分失败，继续为进行中
      return TodoStatus.IN_PROGRESS
    }

    return TodoStatus.PENDING
  }

  /**
   * 获取可重试的插件列表（失败状态的插件）
   */
  public async getRetryablePlugins(todoListId: string): Promise<TodoItem[]> {
    const todoList = await this.loadTodoList(todoListId)
    if (!todoList) return []

    return todoList.items.filter((item) => item.status === TodoStatus.FAILED)
  }

  /**
   * 列出所有TodoList
   */
  public async listTodoLists(): Promise<TodoList[]> {
    try {
      const files = await fs.promises.readdir(this.todoListStoragePath)
      const todoLists: TodoList[] = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          const todoListId = path.basename(file, '.json')
          const todoList = await this.loadTodoList(todoListId)
          if (todoList) {
            todoLists.push(todoList)
          }
        }
      }

      // 按创建时间倒序排列
      todoLists.sort((a, b) => b.createdAt - a.createdAt)
      return todoLists
    } catch (error) {
      console.error('列出TodoList失败:', error)
      return []
    }
  }

  /**
   * 删除TodoList
   */
  public async deleteTodoList(todoListId: string): Promise<boolean> {
    try {
      const filePath = this.getTodoListFilePath(todoListId)

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
        console.log(`TodoList已删除: ${todoListId}`)
        return true
      }

      return false
    } catch (error) {
      console.error('删除TodoList失败:', error)
      return false
    }
  }

  /**
   * 获取TodoList文件路径
   */
  private getTodoListFilePath(todoListId: string): string {
    return path.join(this.todoListStoragePath, `${todoListId}.json`)
  }
}
