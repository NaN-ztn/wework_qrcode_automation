import { contextBridge, ipcRenderer } from 'electron'

interface BrowserStatus {
  hasSystemBrowser: boolean
  systemBrowserPath: string | null
  hasBundledChromium: boolean
}

interface ElectronAPI {
  startAutomation: () => Promise<{ success: boolean; message: string; needsInstall?: boolean }>
  stopAutomation: () => Promise<{ success: boolean; message: string }>
  getBrowserStatus: () => Promise<BrowserStatus>
  needsChromiumInstall: () => Promise<boolean>
  installChromium: () => Promise<{ success: boolean; message: string }>
  onInstallProgress: (callback: (progress: { percentage: number; status: string }) => void) => void
  getConfig: () => Promise<{ success: boolean; config?: any; message?: string }>
  saveConfig: (config: any) => Promise<{ success: boolean; message: string }>
  resetConfig: () => Promise<{ success: boolean; message: string }>
  checkWeWorkLogin: () => Promise<{ success: boolean; message: string; data?: any }>
  getAutomationStatus: () => Promise<{ success: boolean; data?: any }>
}

const electronAPI: ElectronAPI = {
  startAutomation: () => ipcRenderer.invoke('start-automation'),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
  getBrowserStatus: () => ipcRenderer.invoke('get-browser-status'),
  needsChromiumInstall: () => ipcRenderer.invoke('needs-chromium-install'),
  installChromium: () => ipcRenderer.invoke('install-chromium'),
  onInstallProgress: (callback) => {
    ipcRenderer.on('install-progress', (_, progress) => callback(progress))
  },
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  checkWeWorkLogin: () => ipcRenderer.invoke('check-wework-login'),
  getAutomationStatus: () => ipcRenderer.invoke('get-automation-status'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
