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
