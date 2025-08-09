import * as puppeteer from 'puppeteer'
import { BrowserInstance } from './browser-instance'

export class BaseManager {
  protected browserInstance: BrowserInstance

  constructor() {
    this.browserInstance = BrowserInstance.getInstance()
  }

  /**
   * 初始化浏览器实例
   */
  public async initBrowser() {
    return await this.browserInstance.initBrowser()
  }

  /**
   * 创建新页面
   */
  public async createPage(): Promise<puppeteer.Page> {
    return await this.browserInstance.createPage()
  }

  /**
   * 获取默认页面
   */
  public async getDefaultPage(): Promise<puppeteer.Page> {
    return await this.browserInstance.getDefaultPage()
  }

  /**
   * 获取所有页面
   */
  public async getAllPages(): Promise<puppeteer.Page[]> {
    return await this.browserInstance.getAllPages()
  }

  /**
   * 关闭浏览器实例（保留登录态）
   */
  public async closeBrowser(): Promise<void> {
    await this.browserInstance.closeBrowser()
  }

  /**
   * 完全关闭浏览器实例和进程
   */
  public async forceCloseBrowser(): Promise<void> {
    await this.browserInstance.forceCloseBrowser()
  }

  /**
   * 获取浏览器状态
   */
  public isRunning(): boolean {
    return this.browserInstance.isRunning()
  }

  /**
   * 检查是否在目标页面
   */
  public async isOnTargetPage(page: puppeteer.Page, targetUrl: string): Promise<boolean> {
    try {
      const currentUrl = page.url()
      const isTargetUrl = currentUrl.includes(targetUrl)
      return isTargetUrl
    } catch (error) {
      console.error('检查目标页面失败:', error)
      return false
    }
  }

  /**
   * 通过xpath安全获取元素
   */
  public async safeGetElementByXPath(
    page: puppeteer.Page,
    xpath: string,
    timeout: number = 5000,
  ): Promise<puppeteer.ElementHandle<Element> | null> {
    try {
      await page.waitForXPath(xpath, { timeout })
      const elements = await page.$x(xpath)
      return elements.length > 0 ? (elements[0] as puppeteer.ElementHandle<Element>) : null
    } catch (error) {
      console.warn(`未找到xpath元素: ${xpath}`, error)
      return null
    }
  }

  /**
   * 通过xpath轮询元素直到存在
   */
  public async waitForElementByXPath(
    page: puppeteer.Page,
    xpath: string,
    timeout: number = 5000,
  ): Promise<puppeteer.ElementHandle<Element> | null> {
    try {
      await page.waitForXPath(xpath, { timeout })
      const elements = await page.$x(xpath)
      return elements.length > 0 ? (elements[0] as puppeteer.ElementHandle<Element>) : null
    } catch (error) {
      console.warn(`轮询超时，未找到xpath元素: ${xpath}`, error)
      return null
    }
  }

  /**
   * 通过xpath轮询元素直到不存在
   */
  public async waitForElementDisappear(
    page: puppeteer.Page,
    xpath: string,
    timeout: number = 5000,
  ): Promise<boolean> {
    try {
      await page.waitForXPath(xpath, { timeout, hidden: true })
      return true
    } catch (error) {
      // 如果waitForXPath超时，说明元素仍然存在，需要手动检查
      try {
        const elements = await page.$x(xpath)
        if (elements.length === 0) {
          return true
        }
        console.warn(`轮询超时，xpath元素仍存在: ${xpath}`)
        return false
      } catch (checkError) {
        console.warn(`检查xpath元素失败: ${xpath}`, checkError)
        return false
      }
    }
  }

  /**
   * wait方法，等待毫秒
   */
  public async wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
  }

  /**
   * 获取用户数据目录路径
   */
  public getUserDataDir(): string {
    return this.browserInstance.getUserDataDir()
  }
}
