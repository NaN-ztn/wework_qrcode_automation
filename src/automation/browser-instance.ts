import * as puppeteer from 'puppeteer'
import * as fs from 'fs'
import { ConfigManager } from '../utils/config-manager'
import { CookieManager } from '../utils/cookie-manager'
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

      // 确保用户数据目录存在
      if (!fs.existsSync(this.userDataDir)) {
        fs.mkdirSync(this.userDataDir, { recursive: true })
      }

      // 添加持久化用户数据目录和增强的Chrome启动参数
      const launchOptions = {
        headless: false,
        userDataDir: this.userDataDir,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--disable-infobars',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--enable-features=NetworkService',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--keep-alive-for-test',
          '--no-first-run',
          '--no-default-browser-check',
        ],
      }
      this.browser = await puppeteer.launch(launchOptions)

      // 浏览器初始化成功后，为默认页面恢复Cookie
      console.log('🔄 浏览器初始化完成，准备恢复Cookie...')
      await this.restoreCookiesOnInit()

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
   * 关闭浏览器实例（保留session数据，关闭前保存Cookie）
   */
  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        // 关闭前保存所有Cookie
        console.log('💾 关闭页面前保存Cookie...')
        await this.saveCookiesBeforeClose()

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
   * 完全关闭浏览器实例和进程（关闭前保存Cookie）
   */
  public async forceCloseBrowser(): Promise<void> {
    if (this.browser) {
      try {
        // 关闭前保存所有Cookie
        console.log('💾 浏览器即将关闭，正在保存Cookie...')
        await this.saveCookiesBeforeClose()

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
      await BrowserInstance.instance.forceCloseBrowser()
      console.log('BrowserInstance已清理')
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

  /**
   * 保存当前所有页面的Cookie（合并去重）
   */
  public async saveCookies(): Promise<boolean> {
    if (!this.browser) {
      console.warn('浏览器未初始化，无法保存Cookie')
      return false
    }

    try {
      const pages = await this.browser.pages()
      return await CookieManager.saveAllCookies(pages)
    } catch (error) {
      console.error('保存所有Cookie失败:', error)
      return false
    }
  }

  /**
   * 为指定页面恢复所有域的Cookie
   */
  public async restoreCookies(page: puppeteer.Page): Promise<boolean> {
    try {
      return await CookieManager.restoreAllCookies(page)
    } catch (error) {
      console.error('恢复Cookie失败:', error)
      return false
    }
  }

  /**
   * 检查是否有保存的Cookie
   */
  public hasSavedCookies(): boolean {
    return CookieManager.hasAllSavedCookies()
  }

  /**
   * 浏览器初始化后恢复Cookie
   */
  private async restoreCookiesOnInit(): Promise<void> {
    try {
      if (!this.browser) {
        console.warn('浏览器未初始化，跳过Cookie恢复')
        return
      }

      if (!this.hasSavedCookies()) {
        console.log('ℹ️  未发现保存的Cookie，首次启动')
        return
      }

      // 创建一个临时页面用于恢复Cookie
      const tempPage = await this.browser.newPage()

      console.log('🔄 发现保存的Cookie，正在恢复...')
      const restored = await this.restoreCookies(tempPage)

      if (restored) {
        console.log('✅ Cookie恢复成功，所有域的登录状态已恢复')
      } else {
        console.log('⚠️  Cookie恢复失败')
      }

      // 关闭临时页面
      await tempPage.close()
    } catch (error) {
      console.error('初始化Cookie恢复失败:', error)
    }
  }

  /**
   * 浏览器关闭前保存Cookie
   */
  private async saveCookiesBeforeClose(): Promise<void> {
    try {
      if (!this.browser) {
        console.warn('浏览器未初始化，跳过Cookie保存')
        return
      }

      const pages = await this.browser.pages()
      if (pages.length === 0) {
        console.log('没有活动页面，跳过Cookie保存')
        return
      }

      console.log(`正在保存来自 ${pages.length} 个页面的Cookie...`)
      const saved = await this.saveCookies()

      if (saved) {
        console.log('✅ 所有Cookie已保存，下次启动时将自动恢复')
      } else {
        console.log('⚠️  Cookie保存失败')
      }
    } catch (error) {
      console.error('保存Cookie失败:', error)
    }
  }
}
