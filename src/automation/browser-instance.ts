import * as puppeteer from 'puppeteer'
import { execSync } from 'child_process'
import { BrowserManager } from '../utils/browser-config'
import { ConfigManager } from '../utils/config-manager'
import { AutomationResult } from '../types'

/**
 * 浏览器实例单例管理类
 */
export class BrowserInstance {
  private static instance: BrowserInstance
  private browser: puppeteer.Browser | null = null
  private userDataDir: string

  private constructor() {
    const config = ConfigManager.loadConfig()
    this.userDataDir = config.USER_DATA_DIR
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): BrowserInstance {
    if (!BrowserInstance.instance) {
      BrowserInstance.instance = new BrowserInstance()
    }
    return BrowserInstance.instance
  }

  /**
   * 初始化浏览器实例
   */
  public async initBrowser(): Promise<AutomationResult> {
    try {
      if (this.browser) {
        return { success: true, message: '浏览器实例已存在' }
      }

      // 检查是否需要安装Chromium
      if (BrowserManager.needsChromiumInstall()) {
        return {
          success: false,
          message: '未检测到浏览器，请先安装Chromium',
          data: { needsInstall: true },
        }
      }

      const browserConfig = BrowserManager.getBrowserConfig()

      // 添加持久化用户数据目录
      const launchOptions = {
        ...browserConfig,
        userDataDir: this.userDataDir,
        // args: [
        //   ...(browserConfig.args || []),
        //   '--no-first-run',
        //   '--no-default-browser-check',
        //   '--disable-dev-shm-usage',
        //   '--disable-gpu',
        //   '--no-sandbox',
        //   '--disable-setuid-sandbox',
        //   '--disable-background-networking',
        //   '--disable-default-apps',
        //   '--disable-extensions',
        //   '--disable-sync',
        //   '--disable-translate',
        //   '--disable-infobars',
        //   '--disable-features=TranslateUI',
        //   '--disable-ipc-flooding-protection',
        // ],
      }

      this.browser = await puppeteer.launch(launchOptions)

      return { success: true, message: '浏览器初始化成功' }
    } catch (error) {
      console.error('浏览器初始化失败:', error)
      return {
        success: false,
        message: `浏览器初始化失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 获取浏览器实例
   */
  public async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      const initResult = await this.initBrowser()
      if (!initResult.success) {
        throw new Error(initResult.message)
      }
    }
    return this.browser!
  }

  /**
   * 创建新页面
   */
  public async createPage(): Promise<puppeteer.Page> {
    const browser = await this.getBrowser()
    return await browser.newPage()
  }

  /**
   * 获取所有页面
   */
  public async getAllPages(): Promise<puppeteer.Page[]> {
    const browser = await this.getBrowser()
    return await browser.pages()
  }

  /**
   * 获取或创建默认页面
   */
  public async getDefaultPage(): Promise<puppeteer.Page> {
    const browser = await this.getBrowser()
    const pages = await browser.pages()
    if (pages.length > 0) {
      return pages[0]
    }
    return await browser.newPage()
  }

  /**
   * 关闭浏览器实例（保留session数据）
   */
  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        // 优雅关闭所有页面，但保留浏览器进程和session
        const pages = await this.browser.pages()
        await Promise.all(
          pages.map((page) => page.close().catch((err) => console.warn('关闭页面失败:', err))),
        )

        // 注意：不调用 browser.close()，保留浏览器进程和用户数据
        console.log('页面已关闭，浏览器进程保留（session数据已保存）')
      } catch (error) {
        console.error('关闭页面时出错:', error)
      }
    }
  }

  /**
   * 完全关闭浏览器实例和进程
   */
  public async forceCloseBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close()
        this.browser = null
        console.log('浏览器进程已完全关闭')
      } catch (error) {
        console.error('强制关闭浏览器失败:', error)
        this.browser = null
      }
    }
  }

  /**
   * 静态方法：清理所有实例（保留session）
   */
  public static async cleanup(): Promise<void> {
    if (BrowserInstance.instance) {
      await BrowserInstance.instance.closeBrowser()
      // 注意：不设置为null，保持单例存在以便重新使用
      console.log('BrowserInstance已清理（保留session数据）')
    }
  }

  /**
   * 获取浏览器状态
   */
  public isRunning(): boolean {
    return this.browser !== null
  }

  /**
   * 获取用户数据目录路径
   */
  public getUserDataDir(): string {
    return this.userDataDir
  }
}
