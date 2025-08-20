import * as puppeteer from 'puppeteer'
import * as fs from 'fs'
import * as path from 'path'
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
   * 通过CSS selector轮询元素直到不存在
   */
  public async waitForSelectorDisappear(
    page: puppeteer.Page,
    selector: string,
    timeout: number = 5000,
  ): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout, hidden: true })
      return true
    } catch (error) {
      // 如果waitForSelector超时，说明元素仍然存在，需要手动检查
      try {
        const element = await page.$(selector)
        if (!element) {
          return true
        }
        await element.dispose()
        console.warn(`轮询超时，selector元素仍存在: ${selector}`)
        return false
      } catch (checkError) {
        console.warn(`检查selector元素失败: ${selector}`, checkError)
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

  /**
   * 文件上传方法 - 支持直接上传和FileChooser两种方式
   * @param page 页面实例
   * @param selector 文件输入框选择器或触发按钮选择器
   * @param filePath 要上传的文件路径
   * @param useFileChooser 是否使用FileChooser API（默认false，直接上传）
   * @param timeout 超时时间
   * @param description 描述信息用于日志
   */
  public async uploadFileToElement(
    page: puppeteer.Page,
    selector: string,
    filePath: string,
    useFileChooser: boolean = false,
    timeout: number = 10000,
    description?: string,
  ): Promise<void> {
    try {
      console.log(`开始上传${description ? ` ${description}` : ''}文件: ${filePath}`)

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`)
      }

      if (useFileChooser) {
        // 方式1: 使用FileChooser API
        console.log(`使用FileChooser API上传文件...`)

        const [fileChooser] = await Promise.all([
          page.waitForFileChooser(),
          this.waitAndClick(
            page,
            selector,
            timeout,
            description ? `${description}触发按钮` : '触发按钮',
          ),
        ])

        await fileChooser.accept([filePath])
        console.log(`✓ 文件上传成功 (FileChooser API)`)
      } else {
        // 方式2: 直接上传到input元素
        console.log(`直接上传到input元素...`)

        await this.waitForElement(
          page,
          selector,
          timeout,
          description ? `${description}文件输入框` : '文件输入框',
        )
        const fileInput = await page.$(selector)

        if (!fileInput) {
          throw new Error(`未找到文件输入框: ${selector}`)
        }

        await (fileInput as any).uploadFile(filePath)
        await fileInput.dispose()
        console.log(`✓ 文件上传成功 (直接上传)`)
      }

      // 等待文件处理完成
      await this.wait(2000)
    } catch (error) {
      throw new Error(
        `上传${description ? ` ${description}` : ''}文件失败: ${error instanceof Error ? error.message : '未知错误'}`,
      )
    }
  }

  /**
   * 检查并确保开关处于指定状态
   * @param page 页面实例
   * @param switchSelector 开关选择器
   * @param targetState 目标状态 (true=开启, false=关闭)
   * @param timeout 超时时间
   * @param description 描述信息用于日志
   */
  public async ensureSwitchState(
    page: puppeteer.Page,
    switchSelector: string,
    targetState: boolean,
    timeout: number = 10000,
    description?: string,
  ): Promise<void> {
    try {
      console.log(
        `检查${description ? ` ${description}` : ''}开关状态，目标: ${targetState ? '开启' : '关闭'}`,
      )

      // 等待开关元素出现
      await this.waitForElement(
        page,
        switchSelector,
        timeout,
        description ? `${description}开关` : '开关',
      )

      // 检查当前状态
      const currentState = await page.evaluate((selector) => {
        const element = document.querySelector(selector)
        if (!element) return false

        // 方法1: 检查常见的开关类名
        const classList = element.classList
        if (
          classList.contains('ame-switch-checked') ||
          classList.contains('checked') ||
          classList.contains('active') ||
          classList.contains('on')
        ) {
          return true
        }

        // 方法2: 检查aria-checked属性
        const ariaChecked = element.getAttribute('aria-checked')
        if (ariaChecked === 'true') return true

        // 方法3: 检查子元素是否有选中状态
        const checkedChild = element.querySelector('.ame-switch-checked, .checked, .active')
        if (checkedChild) return true

        return false
      }, switchSelector)

      console.log(
        `${description ? ` ${description}` : ''}开关当前状态: ${currentState ? '开启' : '关闭'}`,
      )

      // 如果状态不匹配，则点击切换
      if (currentState !== targetState) {
        console.log(`开关状态不匹配，正在${targetState ? '开启' : '关闭'}...`)
        await this.waitAndClick(
          page,
          switchSelector,
          timeout,
          description ? `${description}开关` : '开关',
        )

        // 等待状态更新
        await this.wait(500)

        // 验证状态是否已更改
        const newState = await page.evaluate((selector) => {
          const element = document.querySelector(selector)
          if (!element) return false

          const classList = element.classList
          if (
            classList.contains('ame-switch-checked') ||
            classList.contains('checked') ||
            classList.contains('active') ||
            classList.contains('on')
          ) {
            return true
          }

          const ariaChecked = element.getAttribute('aria-checked')
          if (ariaChecked === 'true') return true

          const checkedChild = element.querySelector('.ame-switch-checked, .checked, .active')
          if (checkedChild) return true

          return false
        }, switchSelector)

        if (newState === targetState) {
          console.log(
            `✓ ${description ? ` ${description}` : ''}开关已成功${targetState ? '开启' : '关闭'}`,
          )
        } else {
          console.warn(`⚠️ ${description ? ` ${description}` : ''}开关状态可能未正确切换`)
        }
      } else {
        console.log(`✓ ${description ? ` ${description}` : ''}开关已处于目标状态`)
      }
    } catch (error) {
      throw new Error(
        `设置${description ? ` ${description}` : ''}开关状态失败: ${error instanceof Error ? error.message : '未知错误'}`,
      )
    }
  }

  /**
   * 输入带换行符的文本内容到指定元素
   * @param page 页面实例
   * @param selector 元素选择器
   * @param text 要输入的文本（可包含换行符）
   * @param timeout 超时时间
   * @param description 描述信息用于日志
   */
  public async typeTextWithNewlines(
    page: puppeteer.Page,
    selector: string,
    text: string,
    timeout: number = 10000,
    description?: string,
  ): Promise<void> {
    try {
      console.log(`输入${description ? ` ${description}` : ''}文本内容`)

      // 等待并聚焦到元素
      await this.waitForElement(page, selector, timeout, description)
      await page.click(selector)
      await this.wait(300)

      // 将文本按换行符分割
      const lines = text.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // 输入当前行的文本
        if (line) {
          await page.keyboard.type(line)
        }

        // 如果不是最后一行，按回车键
        if (i < lines.length - 1) {
          await page.keyboard.press('Enter')
          await this.wait(100) // 短暂等待确保回车生效
        }
      }

      console.log(`✓ 成功输入${description ? ` ${description}` : ''}文本内容`)
      await this.wait(300)
    } catch (error) {
      throw new Error(
        `输入${description ? ` ${description}` : ''}文本内容失败: ${error instanceof Error ? error.message : '未知错误'}`,
      )
    }
  }

  /**
   * 设置网络请求拦截
   * @param page 页面实例
   * @param interceptRequests 是否拦截请求（默认false，仅监听）
   */
  public async setupNetworkInterception(
    page: puppeteer.Page,
    interceptRequests: boolean = false,
  ): Promise<void> {
    try {
      console.log('设置网络请求监听...')

      if (interceptRequests) {
        await page.setRequestInterception(true)

        page.on('request', (request) => {
          console.log(`请求: ${request.method()} ${request.url()}`)
          request.continue()
        })
      }

      page.on('response', (response) => {})

      console.log('✓ 网络监听设置完成')
    } catch (error) {
      console.warn('设置网络监听失败:', error)
      throw new Error(`设置网络监听失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 等待特定API响应并返回数据
   * @param page 页面实例
   * @param apiPattern API路径匹配模式
   * @param timeout 超时时间（毫秒）
   * @param description 描述信息
   */
  public async waitForApiResponse<T = any>(
    page: puppeteer.Page,
    apiPattern: string,
    timeout: number = 30000,
    description?: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      console.log(`开始等待${description ? ` ${description}` : ''}API响应: ${apiPattern}`)

      const timeoutId = setTimeout(() => {
        reject(new Error(`等待${description ? ` ${description}` : ''}API响应超时: ${apiPattern}`))
      }, timeout)

      const responseHandler = async (response: puppeteer.HTTPResponse) => {
        try {
          if (response.url().includes(apiPattern)) {
            console.log(`✓ 捕获到${description ? ` ${description}` : ''}API响应: ${response.url()}`)

            const contentType = response.headers()['content-type']
            let responseData: T

            if (contentType && contentType.includes('application/json')) {
              responseData = await response.json()
            } else {
              responseData = (await response.text()) as T
            }

            clearTimeout(timeoutId)
            page.off('response', responseHandler)
            resolve(responseData)
          }
        } catch (error) {
          clearTimeout(timeoutId)
          page.off('response', responseHandler)
          reject(
            new Error(`解析API响应失败: ${error instanceof Error ? error.message : '未知错误'}`),
          )
        }
      }

      page.on('response', responseHandler)
    })
  }

  /**
   * 从URL下载图片到本地文件
   * @param imageUrl 图片URL
   * @param savePath 保存路径
   * @param description 描述信息
   */
  public async downloadImageFromUrl(
    imageUrl: string,
    savePath: string,
    description?: string,
  ): Promise<string> {
    try {
      console.log(`开始下载${description ? ` ${description}` : ''}图片: ${imageUrl}`)

      // 创建保存目录
      const saveDir = path.dirname(savePath)
      await fs.promises.mkdir(saveDir, { recursive: true })

      // 使用fetch下载图片
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`HTTP请求失败: ${response.status} ${response.statusText}`)
      }

      // 获取图片数据
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // 保存到本地文件
      await fs.promises.writeFile(savePath, buffer)

      console.log(`✓ 成功下载${description ? ` ${description}` : ''}图片到: ${savePath}`)
      return savePath
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      console.error(`下载${description ? ` ${description}` : ''}图片失败:`, errorMessage)
      throw new Error(`下载图片失败: ${errorMessage}`)
    }
  }
}
