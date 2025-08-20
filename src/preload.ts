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
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
