import * as puppeteer from 'puppeteer'
import * as fs from 'fs'
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
   * 轮询检测是否在目标页面
   * @param page 页面实例
   * @param targetUrl 目标URL（可以是完整URL或部分URL）
   * @param options 配置选项
   * @returns Promise<boolean> 是否成功到达目标页面
   */
  public async waitForTargetPage(
    page: puppeteer.Page,
    targetUrl: string,
    options: {
      timeout?: number // 超时时间，默认30秒
      interval?: number // 检查间隔，默认1秒
      strict?: boolean // 是否严格匹配URL，默认false（部分匹配）
    } = {},
  ): Promise<boolean> {
    const { timeout = 30000, interval = 1000, strict = false } = options
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      try {
        const currentUrl = page.url()
        const isTargetPage = strict ? currentUrl === targetUrl : currentUrl.includes(targetUrl)

        if (isTargetPage) {
          console.log(`成功到达目标页面: ${currentUrl}`)
          return true
        }

        console.log(`当前页面: ${currentUrl}, 继续等待目标页面: ${targetUrl}`)
        await this.wait(interval)
      } catch (error) {
        console.warn('轮询检测页面时出错:', error)
        await this.wait(interval)
      }
    }

    console.error(`轮询超时，未能到达目标页面: ${targetUrl}`)
    return false
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

  /**
   * 获取浏览器实例（用于高级操作）
   */
  public getBrowserInstance(): BrowserInstance {
    return this.browserInstance
  }

  /**
   * 保存当前Cookie
   */
  public async saveCookies(): Promise<boolean> {
    return await this.browserInstance.saveCookies()
  }

  /**
   * 检查是否有保存的Cookie
   */
  public hasSavedCookies(): boolean {
    return this.browserInstance.hasSavedCookies()
  }

  /**
   * 恢复Cookie到指定页面
   */
  public async restoreCookies(page: puppeteer.Page): Promise<boolean> {
    return await this.browserInstance.restoreCookies(page)
  }

  /**
   * 现代化元素等待并点击方法 (使用Locator API)
   */
  public async waitAndClick(
    page: puppeteer.Page,
    selector: string,
    timeout: number = 10000,
    description?: string,
  ): Promise<void> {
    try {
      console.log(`等待并点击${description ? ` ${description}` : ''}元素: ${selector}`)
      await page.locator(selector).setTimeout(timeout).click()
      console.log(`✓ 成功点击${description ? ` ${description}` : ''}元素`)
      await this.wait(500) // 短暂等待确保操作生效
    } catch (error) {
      throw new Error(
        `点击${description ? ` ${description}` : ''}元素失败: ${error instanceof Error ? error.message : '未知错误'}`,
      )
    }
  }

  /**
   * 兼容XPath的元素等待并点击方法
   */
  public async waitAndClickXPath(
    page: puppeteer.Page,
    xpath: string,
    timeout: number = 10000,
    description?: string,
  ): Promise<void> {
    try {
      console.log(`等待并点击${description ? ` ${description}` : ''}元素 (XPath): ${xpath}`)
      const element = await this.waitForElementByXPath(page, xpath, timeout)
      if (!element) {
        throw new Error(`未找到XPath元素: ${xpath}`)
      }
      await element.click()
      console.log(`✓ 成功点击${description ? ` ${description}` : ''}元素`)
      await element.dispose() // 释放资源
      await this.wait(500) // 短暂等待确保操作生效
    } catch (error) {
      throw new Error(
        `点击${description ? ` ${description}` : ''}元素失败: ${error instanceof Error ? error.message : '未知错误'}`,
      )
    }
  }

  /**
   * 现代化元素等待并填充方法 (使用Locator API)
   */
  public async waitAndFill(
    page: puppeteer.Page,
    selector: string,
    value: string,
    timeout: number = 10000,
    description?: string,
  ): Promise<void> {
    try {
      console.log(
        `等待并填充${description ? ` ${description}` : ''}输入框: ${selector} = "${value}"`,
      )
      const locator = page.locator(selector).setTimeout(timeout)
      await locator.fill(value)
      console.log(`✓ 成功填充${description ? ` ${description}` : ''}输入框`)
      await this.wait(300) // 短暂等待确保输入生效
    } catch (error) {
      throw new Error(
        `填充${description ? ` ${description}` : ''}输入框失败: ${error instanceof Error ? error.message : '未知错误'}`,
      )
    }
  }

  /**
   * 现代化元素等待方法 (使用Locator API)
   */
  public async waitForElement(
    page: puppeteer.Page,
    selector: string,
    timeout: number = 10000,
    description?: string,
  ): Promise<void> {
    try {
      console.log(`等待${description ? ` ${description}` : ''}元素出现: ${selector}`)
      await page.locator(selector).setTimeout(timeout).wait()
      console.log(`✓ ${description ? ` ${description}` : ''}元素已出现`)
    } catch (error) {
      throw new Error(
        `等待${description ? ` ${description}` : ''}元素失败: ${error instanceof Error ? error.message : '未知错误'}`,
      )
    }
  }

  /**
   * 轮询查找匹配的文本内容元素
   * @param page 页面实例
   * @param containerSelector 容器选择器
   * @param searchText 要搜索的文本
   * @param elementSelector 要查找的元素选择器
   * @param timeout 超时时间
   * @returns 找到的元素或null
   */
  public async findElementByText(
    page: puppeteer.Page,
    containerSelector: string,
    searchText: string,
    elementSelector: string = 'label',
    timeout: number = 10000,
  ): Promise<puppeteer.ElementHandle<Element> | null> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      try {
        console.log(`查找包含文本 "${searchText}" 的元素...`)

        // 等待容器出现
        await this.waitForElement(page, containerSelector, 5000, '容器')

        // 获取所有指定元素
        const elements = await page.$$(elementSelector)

        for (const element of elements) {
          try {
            const textContent = await element.evaluate((el) => el.textContent?.trim() || '')
            console.log(`检查元素文本: "${textContent}"`)

            if (textContent.includes(searchText)) {
              console.log(`✓ 找到匹配的元素: ${searchText}`)
              return element
            }
          } catch (evalError) {
            console.warn('读取元素文本失败:', evalError)
            continue
          }
        }

        // 清理 ElementHandle 数组
        await Promise.all(elements.map((el) => el.dispose()))

        console.log(`未找到包含 "${searchText}" 的元素，等待1秒后重试...`)
        await this.wait(1000)
      } catch (error) {
        console.warn('查找元素过程中出错:', error)
        await this.wait(1000)
      }
    }

    console.error(`查找元素超时: ${searchText}`)
    return null
  }

  /**
   * 检查单选框/复选框是否已勾选 (通过::after伪元素检查)
   */
  public async isCheckboxChecked(
    page: puppeteer.Page,
    selector: string,
    timeout: number = 5000,
  ): Promise<boolean> {
    try {
      console.log(`检查选择框状态: ${selector}`)

      // 等待元素出现
      await this.waitForElement(page, selector, timeout)

      // 检查元素是否有::after伪元素或checked属性
      const isChecked = await page.evaluate((sel) => {
        const element = document.querySelector(sel) as HTMLInputElement
        if (!element) return false

        // 方法1: 检查input的checked属性
        if (element.type === 'checkbox' || element.type === 'radio') {
          return element.checked
        }

        // 方法2: 通过计算样式检查::after伪元素
        const afterStyles = window.getComputedStyle(element, '::after')
        const hasAfterContent =
          afterStyles.content && afterStyles.content !== 'none' && afterStyles.content !== '""'

        // 方法3: 检查特定的class或属性
        const hasCheckedClass =
          element.classList.contains('checked') ||
          element.classList.contains('active') ||
          element.hasAttribute('checked')

        return hasAfterContent || hasCheckedClass
      }, selector)

      console.log(`选择框 ${selector} 状态: ${isChecked ? '已勾选' : '未勾选'}`)
      return isChecked
    } catch (error) {
      console.warn(`检查选择框状态失败: ${error instanceof Error ? error.message : '未知错误'}`)
      return false
    }
  }

  /**
   * 智能点击单选框/复选框 (仅在未勾选时点击)
   */
  public async smartClickCheckbox(
    page: puppeteer.Page,
    selector: string,
    timeout: number = 10000,
    description?: string,
  ): Promise<boolean> {
    try {
      console.log(`智能点击${description ? ` ${description}` : ''}选择框: ${selector}`)

      // 检查当前状态
      const isAlreadyChecked = await this.isCheckboxChecked(page, selector, timeout)

      if (isAlreadyChecked) {
        console.log(`✓ ${description ? ` ${description}` : ''}选择框已勾选，无需点击`)
        return true
      }

      // 如果未勾选，则点击
      console.log(`选择框未勾选，正在点击...`)
      await this.waitAndClick(page, selector, timeout, description)

      // 等待状态更新后再次检查
      await this.wait(500)
      const isNowChecked = await this.isCheckboxChecked(page, selector, 3000)

      if (isNowChecked) {
        console.log(`✓ ${description ? ` ${description}` : ''}选择框勾选成功`)
        return true
      } else {
        console.warn(`⚠️ ${description ? ` ${description}` : ''}选择框可能未正确勾选`)
        return false
      }
    } catch (error) {
      console.error(`智能点击选择框失败: ${error instanceof Error ? error.message : '未知错误'}`)
      return false
    }
  }

  /**
   * 从元素src属性保存图片到本地（支持base64和HTTP URL）
   * @param element 图片元素
   * @param savePath 保存路径
   * @param description 描述信息
   * @returns Promise<{success: boolean, method?: string, error?: string}>
   */
  public async saveImageFromElement(
    element: puppeteer.ElementHandle<Element>,
    savePath: string,
    description: string = '图片',
  ): Promise<{ success: boolean; method?: string; error?: string }> {
    try {
      console.log(`开始保存${description}...`)

      // 获取图片src属性
      console.log(`获取${description}src属性...`)
      const src = await element.evaluate((el) => {
        const imgEl = el as HTMLImageElement
        return imgEl.src
      })
      console.log(`${description}src: ${src.substring(0, 100)}...`)

      // 创建保存目录
      const saveDir = savePath.substring(0, savePath.lastIndexOf('/'))
      await fs.promises.mkdir(saveDir, { recursive: true })

      if (typeof src === 'string' && src.startsWith('data:image/')) {
        // Base64数据URI - 直接解析保存
        console.log('检测到base64格式，直接解析保存...')
        const base64Data = src.split(',')[1]
        if (!base64Data) {
          throw new Error('无效的base64数据格式')
        }
        const buffer = Buffer.from(base64Data, 'base64')
        await fs.promises.writeFile(savePath, buffer)
        console.log(`✓ ${description}已保存到: ${savePath} (base64格式)`)
        return { success: true, method: 'base64' }
      } else if (typeof src === 'string' && src.startsWith('http')) {
        // HTTP URL - 使用fetch下载
        console.log('检测到HTTP URL，开始下载原图...')
        const response = await fetch(src)
        if (!response.ok) {
          throw new Error(`HTTP请求失败: ${response.status} ${response.statusText}`)
        }
        const buffer = await response.arrayBuffer()
        await fs.promises.writeFile(savePath, Buffer.from(buffer))
        console.log(`✓ ${description}已保存到: ${savePath} (HTTP下载)`)
        return { success: true, method: 'http' }
      } else {
        throw new Error(
          `不支持的图片src格式: ${typeof src === 'string' ? src.substring(0, 50) + '...' : typeof src}`,
        )
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      console.error(`⚠️ 保存${description}失败: ${errorMessage}`)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * 处理门店名称 - 如果最后一个字不是"店"则添加"店"字
   */
  protected processStoreName(storeName: string): string {
    if (!storeName) return storeName

    const trimmedName = storeName.trim()
    if (trimmedName.endsWith('店')) {
      return trimmedName
    } else {
      return trimmedName + '店'
    }
  }
}
