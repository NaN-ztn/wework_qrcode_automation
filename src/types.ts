export interface AutomationResult {
  success: boolean
  message: string
  data?: any
}

/**
 * 群码替换功能选项
 */
export interface GroupReplaceOptions {
  /** 搜索关键词，默认为空（搜索包含HK或DD的群组） */
  searchKeyword?: string
}

/**
 * 群组信息
 */
export interface GroupInfo {
  /** 群组标题 */
  title: string
  /** 群主信息 */
  adminInfo: string
  /** 群组房间ID */
  roomId?: string
  /** 群组成员数量 */
  memberCount?: number
  /** 群组编辑链接 */
  editUrl?: string
}

/**
 * 群组操作类型
 */
export enum GroupOperationType {
  /** 删除 - 包含DD/HK关键词 */
  DELETE_BY_KEYWORD = 'delete_by_keyword',
  /** 删除 - 人数超过100 */
  DELETE_BY_MEMBER_COUNT = 'delete_by_member_count',
  /** 新建群组 */
  CREATE_NEW = 'create_new',
  /** 无需操作 */
  NO_ACTION = 'no_action',
}

/**
 * 群组操作记录
 */
export interface GroupOperationRecord {
  /** 群组信息 */
  groupInfo: GroupInfo
  /** 操作类型 */
  operationType: GroupOperationType
  /** 操作原因描述 */
  reason: string
  /** 是否执行成功 */
  success?: boolean
  /** 错误信息 */
  error?: string
}

/**
 * 收集群组的结果
 */
export type CollectGroupsResult = Record<string, GroupOperationRecord[]>

/**
 * 群码替换结果数据
 */
export interface GroupReplaceResultData {
  /** 搜索关键词 */
  searchKeyword?: string
  /** 实际处理的群组数量 */
  processedCount: number
  /** 成功处理的群组数量 */
  successCount: number
  /** 失败处理的群组数量 */
  failureCount: number
  /** 执行时间（毫秒） */
  executionTime: number
  /** 操作记录列表 */
  operationRecords: GroupOperationRecord[]
}

/**
 * TodoList任务状态
 */
export enum TodoStatus {
  /** 待执行 */
  PENDING = 'pending',
  /** 执行中 */
  IN_PROGRESS = 'in_progress',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 执行失败 */
  FAILED = 'failed',
  /** 已跳过 */
  SKIPPED = 'skipped',
}

/**
 * TodoList任务项（插件维度）
 */
export interface TodoItem {
  /** 唯一标识符 */
  id: string
  /** 插件ID */
  pluginId: string
  /** 插件名称 */
  pluginName: string
  /** 任务状态 */
  status: TodoStatus
  /** 关联的群组操作记录数组（用于统计，不用于状态管理） */
  operationRecords?: GroupOperationRecord[]
  /** 创建时间戳 */
  createdAt: number
  /** 开始执行时间戳 */
  startedAt?: number
  /** 完成时间戳 */
  completedAt?: number
  /** 错误信息 */
  error?: string
}

/**
 * TodoList配置
 */
export interface TodoListConfig {
  /** 搜索关键词 */
  searchKeyword?: string
  /** 是否允许重试失败的任务 */
  allowRetry: boolean
  /** 默认最大重试次数 */
  defaultMaxRetries: number
  /** 自动保存间隔（毫秒） */
  autoSaveInterval: number
}

/**
 * TodoList数据结构
 */
export interface TodoList {
  /** 任务列表ID */
  id: string
  /** 任务列表名称 */
  name: string
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
  /** 配置信息 */
  config: TodoListConfig
  /** 任务项列表 */
  items: TodoItem[]
  /** 整体状态 */
  status: TodoStatus
  /** 进度信息 */
  progress: {
    total: number
    completed: number
    failed: number
    pending: number
    inProgress: number
  }
}

/**
 * TodoList执行选项
 */
export interface TodoListExecuteOptions {
  /** 是否从指定任务开始执行（断点恢复） */
  resumeFromItemId?: string
  /** 是否跳过已完成的任务 */
  skipCompleted?: boolean
  /** 是否重试失败的任务 */
  retryFailed?: boolean
  /** 批量执行大小 */
  batchSize?: number
}

/**
 * TodoList执行结果
 */
export interface TodoListExecuteResult {
  /** 是否成功 */
  success: boolean
  /** 结果消息 */
  message: string
  /** 执行统计 */
  stats: {
    totalItems: number
    processedItems: number
    successItems: number
    failedItems: number
    skippedItems: number
    executionTime: number
  }
  /** 更新后的TodoList */
  todoList?: TodoList
}
