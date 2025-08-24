import { contextBridge, ipcRenderer } from 'electron'

interface BrowserStatus {
  hasSystemBrowser: boolean
  systemBrowserPath: string | null
  hasBundledChromium: boolean
}

interface ElectronAPI {
  getBrowserStatus: () => Promise<BrowserStatus>
  getConfig: () => Promise<{ success: boolean; config?: any; message?: string }>
  saveConfig: (config: any) => Promise<{ success: boolean; message: string }>
  resetConfig: () => Promise<{ success: boolean; message: string }>
  executeTask: (storeData: {
    storeName: string
    mobile: string
    storeType: string
    assistant: string
  }) => Promise<{ success: boolean; message: string; data?: any }>
  getAutomationStatus: () => Promise<{ success: boolean; data?: any }>
  getBrowserRunning: () => Promise<{ success: boolean; data?: any }>
  stopExecution: () => Promise<{ success: boolean; message: string }>
  openQrCodeFolder: (filePath: string) => Promise<{ success: boolean; message: string }>
  onMainProcessLog: (
    callback: (logData: { level: string; message: string; timestamp: string }) => void,
  ) => void
  onStepUpdate: (
    callback: (stepData: {
      step: number
      status: string
      message: string
      timestamp: number
    }) => void,
  ) => void
  onQrCodeUpdate: (
    callback: (qrCodePaths: { weworkQrPath: string; weibanQrPath: string }) => void,
  ) => void
  onConfigUpdate: (callback: (config: any) => void) => void
  onButtonStateUpdate: (callback: (data: { status: 'completed' | 'failed' }) => void) => void
  getLogs: () => Promise<{ success: boolean; data?: string[] }>
  clearLogs: () => Promise<{ success: boolean; message?: string }>
  getTaskHistory: () => Promise<{ success: boolean; data?: any[]; message?: string }>
  executeGroupReplace: (options: {
    searchKeyword?: string
  }) => Promise<{ success: boolean; message: string; data?: any }>
  stopGroupReplace: () => Promise<{ success: boolean; message: string }>
  // 新的分阶段执行接口
  generatePluginTasks: (options: {
    searchKeyword?: string
  }) => Promise<{ success: boolean; message: string; data?: any }>
  executePluginTask: (options: {
    pluginId: string
    todoListId: string
  }) => Promise<{ success: boolean; message: string; data?: any }>
  // TodoList相关接口
  getTodoLists: () => Promise<{ success: boolean; data?: any[]; message?: string }>
  getTodoListById: (
    todoListId: string,
  ) => Promise<{ success: boolean; data?: any; message?: string }>
  deleteTodoList: (todoListId: string) => Promise<{ success: boolean; message: string }>
  resumeTodoListExecution: (
    todoListId: string,
    options?: {
      resumeFromItemId?: string
      skipCompleted?: boolean
      retryFailed?: boolean
    },
  ) => Promise<{ success: boolean; message: string; data?: any }>
  getRetryablePlugins: (
    todoListId: string,
  ) => Promise<{ success: boolean; data?: any[]; message?: string }>
  onTodoListUpdate: (callback: (todoList: any) => void) => void
  onTodoListCreated: (callback: (data: { todoListId: string }) => void) => void
  // 新的插件任务事件监听器
  onPluginTaskGenerated: (
    callback: (data: { todoListId: string; pluginCount: number; totalOperations: number }) => void,
  ) => void
  onPluginTaskStarted: (callback: (data: { pluginId: string; todoListId: string }) => void) => void
  onPluginTaskCompleted: (
    callback: (data: { pluginId: string; todoListId: string; data: any }) => void,
  ) => void
  onPluginTaskFailed: (
    callback: (data: { pluginId: string; todoListId: string; error: string }) => void,
  ) => void
  onPluginStatusUpdate: (
    callback: (data: {
      pluginId: string
      todoListId: string
      status: string
      timestamp: number
    }) => void,
  ) => void
}

const electronAPI: ElectronAPI = {
  getBrowserStatus: () => ipcRenderer.invoke('get-browser-status'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  executeTask: (storeData) => ipcRenderer.invoke('execute-task', storeData),
  getAutomationStatus: () => ipcRenderer.invoke('get-automation-status'),
  getBrowserRunning: () => ipcRenderer.invoke('get-browser-running'),
  stopExecution: () => ipcRenderer.invoke('stop-execution'),
  openQrCodeFolder: (filePath) => ipcRenderer.invoke('open-qrcode-folder', filePath),
  onMainProcessLog: (callback) => {
    ipcRenderer.on('main-process-log', (_, logData) => callback(logData))
  },
  onStepUpdate: (callback) => {
    ipcRenderer.on('task-step-update', (_, stepData) => callback(stepData))
  },
  onQrCodeUpdate: (callback) => {
    ipcRenderer.on('qrcode-paths-update', (_, qrCodePaths) => callback(qrCodePaths))
  },
  onConfigUpdate: (callback) => {
    ipcRenderer.on('config-updated', (_, config) => callback(config))
  },
  onButtonStateUpdate: (callback) => {
    ipcRenderer.on('button-state-update', (_, data) => callback(data))
  },
  getLogs: () => ipcRenderer.invoke('get-logs'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  getTaskHistory: () => ipcRenderer.invoke('get-task-history'),
  executeGroupReplace: (options) => ipcRenderer.invoke('execute-group-replace', options),
  stopGroupReplace: () => ipcRenderer.invoke('stop-group-replace'),
  // 新的分阶段执行实现
  generatePluginTasks: (options) => ipcRenderer.invoke('generate-plugin-tasks', options),
  executePluginTask: (options) => ipcRenderer.invoke('execute-plugin-task', options),
  // TodoList相关实现
  getTodoLists: () => ipcRenderer.invoke('get-todo-lists'),
  getTodoListById: (todoListId) => ipcRenderer.invoke('get-todo-list-by-id', todoListId),
  deleteTodoList: (todoListId) => ipcRenderer.invoke('delete-todo-list', todoListId),
  resumeTodoListExecution: (todoListId, options) =>
    ipcRenderer.invoke('resume-todo-list-execution', todoListId, options),
  getRetryablePlugins: (todoListId) => ipcRenderer.invoke('get-retryable-plugins', todoListId),
  onTodoListUpdate: (callback) => {
    ipcRenderer.on('todo-list-update', (_, todoList) => callback(todoList))
  },
  onTodoListCreated: (callback) => {
    ipcRenderer.on('todo-list-created', (_, data) => callback(data))
  },
  // 新的插件任务事件监听器实现
  onPluginTaskGenerated: (callback) => {
    ipcRenderer.on('plugin-task-generated', (_, data) => callback(data))
  },
  onPluginTaskStarted: (callback) => {
    ipcRenderer.on('plugin-task-started', (_, data) => callback(data))
  },
  onPluginTaskCompleted: (callback) => {
    ipcRenderer.on('plugin-task-completed', (_, data) => callback(data))
  },
  onPluginTaskFailed: (callback) => {
    ipcRenderer.on('plugin-task-failed', (_, data) => callback(data))
  },
  onPluginStatusUpdate: (callback) => {
    ipcRenderer.on('plugin-status-update', (_, data) => callback(data))
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
