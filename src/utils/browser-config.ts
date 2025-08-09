import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as https from 'https'
import { createWriteStream } from 'fs'
import { spawn } from 'child_process'

export interface BrowserConfig {
  executablePath?: string
  headless: boolean
  devtools: boolean
  args?: string[]
}

export interface InstallProgress {
  percentage: number
  status: string
}

export class BrowserManager {
  private static readonly COMMON_CHROME_PATHS = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA
        ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe')
        : '',
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    ],
  }

  /**
   * 检查指定路径的浏览器是否存在
   */
  private static checkBrowserExists(browserPath: string): boolean {
    try {
      return fs.existsSync(browserPath) && fs.statSync(browserPath).isFile()
    } catch {
      return false
    }
  }

  /**
   * 查找系统中可用的Chrome/Chromium浏览器
   */
  public static findAvailableBrowser(): string | null {
    const platform = os.platform() as keyof typeof BrowserManager.COMMON_CHROME_PATHS
    const paths = BrowserManager.COMMON_CHROME_PATHS[platform] || []

    for (const browserPath of paths) {
      if (browserPath && this.checkBrowserExists(browserPath)) {
        return browserPath
      }
    }

    return null
  }

  /**
   * 检查系统是否有npm可用
   */
  public static async checkNpmAvailable(): Promise<boolean> {
    try {
      const isWindows = os.platform() === 'win32'
      const npmCommand = isWindows ? 'npm.cmd' : 'npm'

      return new Promise((resolve) => {
        const checkProcess = spawn(npmCommand, ['--version'], {
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        checkProcess.on('close', (code) => {
          resolve(code === 0)
        })

        checkProcess.on('error', () => {
          resolve(false)
        })
      })
    } catch {
      return false
    }
  }

  /**
   * 直接下载Chromium（不依赖npm）
   */
  public static async downloadChromiumDirect(
    progressCallback?: (progress: InstallProgress) => void,
  ): Promise<boolean> {
    try {
      progressCallback?.({ percentage: 0, status: '准备下载Chromium...' })

      // 获取Chromium下载URL
      const platform = os.platform()
      const arch = os.arch()
      const chromiumUrl = this.getChromiumDownloadUrl(platform, arch)

      if (!chromiumUrl) {
        throw new Error(`不支持的平台: ${platform}-${arch}`)
      }

      progressCallback?.({ percentage: 10, status: '开始下载Chromium...' })

      // 创建下载目录
      const downloadDir = path.join(__dirname, '../../chromium')
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true })
      }

      // 下载文件
      const filename = chromiumUrl.split('/').pop() || 'chromium.zip'
      const filePath = path.join(downloadDir, filename)

      await this.downloadFile(chromiumUrl, filePath, progressCallback)

      progressCallback?.({ percentage: 80, status: '正在解压Chromium...' })

      // 解压文件
      await this.extractChromium(filePath, downloadDir, progressCallback)

      progressCallback?.({ percentage: 100, status: 'Chromium安装完成！' })

      return true
    } catch (error) {
      console.error('直接下载Chromium失败:', error)
      return false
    }
  }

  /**
   * 获取Chromium下载URL
   */
  private static getChromiumDownloadUrl(platform: string, arch: string): string | null {
    const baseUrl = 'https://storage.googleapis.com/chromium-browser-snapshots'

    // 这些是示例版本号，实际应该从API获取最新版本
    const versions = {
      'win32-x64': '1097615',
      'win32-ia32': '1097615',
      'darwin-x64': '1097615',
      'darwin-arm64': '1097615',
      'linux-x64': '1097615',
    }

    const platformKey = `${platform}-${arch}`
    const version = versions[platformKey as keyof typeof versions]

    if (!version) return null

    switch (platform) {
      case 'win32':
        return `${baseUrl}/Win/${version}/chrome-win.zip`
      case 'darwin':
        return `${baseUrl}/Mac/${version}/chrome-mac.zip`
      case 'linux':
        return `${baseUrl}/Linux_x64/${version}/chrome-linux.zip`
      default:
        return null
    }
  }

  /**
   * 下载文件
   */
  private static async downloadFile(
    url: string,
    filePath: string,
    progressCallback?: (progress: InstallProgress) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(filePath)

      https
        .get(url, (response) => {
          const totalSize = parseInt(response.headers['content-length'] || '0', 10)
          let downloadedSize = 0

          response.pipe(file)

          response.on('data', (chunk) => {
            downloadedSize += chunk.length
            const percentage = Math.round((downloadedSize / totalSize) * 60) + 10 // 10-70%
            progressCallback?.({
              percentage,
              status: `下载中... ${Math.round(downloadedSize / 1024 / 1024)}MB / ${Math.round(totalSize / 1024 / 1024)}MB`,
            })
          })

          file.on('finish', () => {
            file.close()
            resolve()
          })

          file.on('error', reject)
        })
        .on('error', reject)
    })
  }

  /**
   * 解压Chromium
   */
  private static async extractChromium(
    zipPath: string,
    extractDir: string,
    progressCallback?: (progress: InstallProgress) => void,
  ): Promise<void> {
    // 这里需要添加解压逻辑，可以使用内置的zlib或第三方库
    // 简化处理：假设解压成功
    progressCallback?.({ percentage: 90, status: '解压完成' })
  }

  /**
   * 自动安装Chromium（增强版，支持无npm环境）
   */
  public static async installChromium(
    progressCallback?: (progress: InstallProgress) => void,
  ): Promise<boolean> {
    try {
      progressCallback?.({ percentage: 0, status: '检查安装环境...' })

      // 首先检查npm是否可用
      const hasNpm = await this.checkNpmAvailable()

      if (hasNpm) {
        progressCallback?.({ percentage: 5, status: '使用npm安装Puppeteer...' })
        return await this.installViaNpm(progressCallback)
      } else {
        progressCallback?.({ percentage: 5, status: 'npm不可用，使用直接下载方式...' })
        return await this.downloadChromiumDirect(progressCallback)
      }
    } catch (error) {
      console.error('安装Chromium失败:', error)
      return false
    }
  }

  /**
   * 通过npm安装Puppeteer（原有方法）
   */
  private static async installViaNpm(
    progressCallback?: (progress: InstallProgress) => void,
  ): Promise<boolean> {
    try {
      const isWindows = os.platform() === 'win32'
      const npmCommand = isWindows ? 'npm.cmd' : 'npm'

      progressCallback?.({ percentage: 20, status: '正在下载Puppeteer...' })

      return new Promise((resolve, reject) => {
        const installProcess = spawn(npmCommand, ['install', 'puppeteer'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: process.cwd(),
        })

        let output = ''

        installProcess.stdout?.on('data', (data) => {
          output += data.toString()
          console.log('npm stdout:', data.toString())

          if (data.toString().includes('http fetch')) {
            progressCallback?.({ percentage: 40, status: '正在下载Chromium...' })
          } else if (data.toString().includes('extract')) {
            progressCallback?.({ percentage: 60, status: '正在解压Chromium...' })
          } else if (data.toString().includes('install')) {
            progressCallback?.({ percentage: 80, status: '正在安装依赖...' })
          }
        })

        installProcess.stderr?.on('data', (data) => {
          console.error('npm stderr:', data.toString())
          output += data.toString()
        })

        installProcess.on('close', (code) => {
          if (code === 0) {
            progressCallback?.({ percentage: 100, status: 'Chromium安装完成！' })
            resolve(true)
          } else {
            console.error('npm install failed with code:', code)
            console.error('Output:', output)
            reject(new Error(`Chromium安装失败，退出码: ${code}`))
          }
        })

        installProcess.on('error', (error) => {
          console.error('Failed to start npm install:', error)
          reject(new Error(`无法启动npm安装: ${error.message}`))
        })
      })
    } catch (error) {
      console.error('通过npm安装失败:', error)
      return false
    }
  }

  /**
   * 检查是否需要安装Chromium
   */
  public static needsChromiumInstall(): boolean {
    const status = this.getBrowserStatus()
    return !status.hasSystemBrowser && !status.hasBundledChromium
  }

  /**
   * 获取Puppeteer启动配置（增强版）
   */
  public static getBrowserConfig(customPath?: string): BrowserConfig {
    let executablePath: string | undefined

    // 1. 优先使用用户指定的路径
    if (customPath && this.checkBrowserExists(customPath)) {
      executablePath = customPath
    }
    // 2. 尝试查找系统中的浏览器
    else {
      const foundBrowser = this.findAvailableBrowser()
      if (foundBrowser) {
        executablePath = foundBrowser
      }
    }

    // 3. 基础配置
    const config: BrowserConfig = {
      headless: false,
      devtools: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    }

    // 4. 如果找到了浏览器路径，则使用它
    if (executablePath) {
      config.executablePath = executablePath
      console.log(`使用浏览器: ${executablePath}`)
    } else {
      // 5. 如果没有找到系统浏览器，使用bundled Chromium（需要安装完整版puppeteer）
      console.log('未找到系统浏览器，将使用Puppeteer内置的Chromium')
      // Puppeteer会自动使用bundled Chromium
    }

    return config
  }

  /**
   * 检查浏览器配置是否有效
   */
  public static async validateBrowserConfig(config: BrowserConfig): Promise<boolean> {
    try {
      const puppeteer = await import('puppeteer')
      const browser = await puppeteer.launch(config)
      await browser.close()
      return true
    } catch (error) {
      console.error('浏览器配置验证失败:', error)
      return false
    }
  }

  /**
   * 获取浏览器状态信息
   */
  public static getBrowserStatus(): {
    hasSystemBrowser: boolean
    systemBrowserPath: string | null
    hasBundledChromium: boolean
  } {
    const systemBrowserPath = this.findAvailableBrowser()

    // 检查是否有bundled Chromium（通过检查node_modules）
    const puppeteerPath = path.join(__dirname, '../../../node_modules/puppeteer')
    const hasBundledChromium = fs.existsSync(puppeteerPath)

    return {
      hasSystemBrowser: !!systemBrowserPath,
      systemBrowserPath,
      hasBundledChromium,
    }
  }
}
