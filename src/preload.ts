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
  checkWeWorkLogin: () => Promise<{ success: boolean; message: string; data?: any }>
  getAutomationStatus: () => Promise<{ success: boolean; data?: any }>
  getBrowserRunning: () => Promise<{ success: boolean; data?: any }>
  stopExecution: () => Promise<{ success: boolean; message: string }>
  onMainProcessLog: (
    callback: (logData: { level: string; message: string; timestamp: string }) => void,
  ) => void
  getLogs: () => Promise<{ success: boolean; data?: string[] }>
  clearLogs: () => Promise<{ success: boolean; message?: string }>
}

const electronAPI: ElectronAPI = {
  getBrowserStatus: () => ipcRenderer.invoke('get-browser-status'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  checkWeWorkLogin: () => ipcRenderer.invoke('check-wework-login'),
  getAutomationStatus: () => ipcRenderer.invoke('get-automation-status'),
  getBrowserRunning: () => ipcRenderer.invoke('get-browser-running'),
  stopExecution: () => ipcRenderer.invoke('stop-execution'),
  onMainProcessLog: (callback) => {
    ipcRenderer.on('main-process-log', (_, logData) => callback(logData))
  },
  getLogs: () => ipcRenderer.invoke('get-logs'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
