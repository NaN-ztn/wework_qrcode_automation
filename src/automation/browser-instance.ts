import * as puppeteer from 'puppeteer'
import * as fs from 'fs'
import { ConfigManager } from '../utils/config-manager'
import { CookieManager } from '../utils/cookie-manager'
import { getChromePath } from '../utils/chrome-path'
import { AutomationResult } from '../types'

/**
 * 浏览器实例单例管理类
 */
export class BrowserInstance {
  private static instance: BrowserInstance
  private browser: puppeteer.Browser | null = null
  private userDataDir: string
  private isStopRequested: boolean = false

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
   * 设置停止标志
   */
  public setStopRequested(stop: boolean): void {
    this.isStopRequested = stop
    console.log(`🛑 BrowserInstance停止标志设置为: ${stop}`)
  }

  /**
   * 检查是否被请求停止
   */
  public isStopRequestedFlag(): boolean {
    return this.isStopRequested
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

      // 获取项目中打包的Chrome路径
      const chromePath = getChromePath()
      console.log('=== Chrome路径配置 ===')
      console.log('Chrome路径:', chromePath)
      console.log('平台:', process.platform)
      console.log('架构:', process.arch)

      // 强制使用项目中的Chrome，如果找不到则报错
      if (!chromePath) {
        throw new Error('未找到项目中的Chrome，请确保chrome目录存在且包含对应平台的Chrome文件')
      }

      // 验证Chrome可执行文件是否存在
      if (!fs.existsSync(chromePath)) {
        throw new Error(`Chrome可执行文件不存在: ${chromePath}`)
      }

      console.log('✅ 强制使用项目中的Chrome:', chromePath)

      // 添加持久化用户数据目录和增强的Chrome启动参数
      const launchOptions = {
        headless: false,
        userDataDir: this.userDataDir,
        executablePath: chromePath, // 强制使用项目中的Chrome
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          // 禁用现代版本的信息栏和测试模式提示
          '--disable-infobars',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=TranslateUI,VizDisplayCompositor,HttpsFirstBalancedModeAutoEnable',
          // 隐藏Chrome自动化控制提示栏（重要参数）
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-extensions-except=',
          '--disable-component-extensions-with-background-pages',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-ipc-flooding-protection',
          // 专门针对自动化提示栏的参数
          '--exclude-switches=enable-automation',
          '--disable-blink-features=AutomationControlled',
          '--no-first-run',
          '--no-service-autorun',
          '--password-store=basic',
          '--use-mock-keychain',
          '--disable-component-extensions-with-background-pages',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-domain-reliability',
          '--disable-client-side-phishing-detection',
          '--disable-component-update',
          '--disable-ipc-flooding-protection',
          '--enable-features=NetworkService',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--keep-alive-for-test',
          '--no-first-run',
          '--no-default-browser-check',
          '--no-pings',
          '--no-zygote',
          // 禁用可能影响页面布局的特性
          '--disable-features=Translate,OptimizationHints,MediaRouter,CalculateNativeWinOcclusion,CertificateTransparencyComponentUpdater',
          '--disable-backgrounding-occluded-window',
          '--disable-software-rasterizer',
          '--disable-background-downloads',
          // 内存和性能优化参数
          '--memory-pressure-off',
          '--max_old_space_size=4096',
          '--disable-background-mode',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-java',
          '--disable-notifications',
          '--disable-web-security',
          '--disable-popup-blocking',
          // GPU和渲染优化
          '--use-gl=desktop',
          '--ignore-gpu-blacklist',
          '--disable-gpu-sandbox',
          '--enable-accelerated-2d-canvas',
          '--enable-gpu-rasterization',
          // 禁用各种可能导致UI变化的功能
          '--disable-features=VizDisplayCompositor,ChromeWhatsNewUI,AutofillEnableAccountWalletStorage',
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
    // 检查是否被请求停止
    if (this.isStopRequested) {
      throw new Error('浏览器实例已被停止，无法创建新的浏览器实例')
    }

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
    const page = await browser.newPage()

    // 隐藏自动化标识，让页面表现得像正常浏览器
    await page.evaluateOnNewDocument(() => {
      // 删除 webdriver 标识
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })

      // 删除自动化相关的 window 属性
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol

      // 重写 plugins 长度
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      })

      // 重写 languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en'],
      })
    })

    // 使用setViewport自适应显示器尺寸
    try {
      // 获取屏幕真实尺寸信息
      const screenInfo = await page.evaluate(() => {
        return {
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight,
          devicePixelRatio: window.devicePixelRatio || 1,
        }
      })

      console.log('📱 屏幕信息:', screenInfo)

      // 使用Puppeteer的setViewport API自适应屏幕
      // 减少高度以避免Chrome信息栏影响滚动
      const adjustedHeight = Math.max(screenInfo.availHeight - 100, 600) // 预留100px防止信息栏干扰
      await page.setViewport({
        width: screenInfo.availWidth, // 使用屏幕可用宽度
        height: adjustedHeight, // 调整高度避免信息栏影响
        deviceScaleFactor: screenInfo.devicePixelRatio, // 自适应设备缩放
        hasTouch: false,
        isMobile: false,
        isLandscape: screenInfo.screenWidth > screenInfo.screenHeight,
      })

      console.log('✅ Viewport已自适应显示器尺寸')
    } catch (error) {
      console.warn('设置自适应viewport失败:', error)

      // 降级方案：使用固定尺寸
      try {
        await page.setViewport({
          width: 1400,
          height: 900,
          deviceScaleFactor: 1,
        })
        console.log('🔄 已使用降级viewport配置')
      } catch (fallbackError) {
        console.error('降级viewport设置也失败:', fallbackError)
      }
    }

    return page
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
   * 关闭浏览器实例
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
        console.log('页面已关闭，浏览器进程保留')
      } catch (error) {
        console.error('关闭页面时出错:', error)
      }
    }
  }

  /**
   * 完全关闭浏览器实例和进程（关闭前保存Cookie）
   */
  public async forceCloseBrowser(): Promise<void> {
    // 设置停止标志，防止重新创建浏览器
    this.setStopRequested(true)

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
   * 静态方法：清理所有实例
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
