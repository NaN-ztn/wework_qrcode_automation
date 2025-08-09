import { ConfigManager } from '../utils/config-manager'
import { AutomationResult } from '../types'
import { BaseManager } from './base'

export class WeworkManager extends BaseManager {
  private static instance: WeworkManager

  constructor() {
    super()
  }

  public static getInstance(): WeworkManager {
    if (!WeworkManager.instance) {
      WeworkManager.instance = new WeworkManager()
    }
    return WeworkManager.instance
  }

  /**
   * 检查企微登录状态
   */
  public async checkWeWorkLogin(): Promise<AutomationResult> {
    try {
      const config = ConfigManager.loadConfig()
      const targetUrl = config.WEWORK_CONTACT_URL

      if (!targetUrl) {
        return {
          success: false,
          message: '企微通讯录URL未配置，请先在环境配置中设置',
        }
      }

      const page = await this.createPage()

      // Cookie已在浏览器初始化时自动恢复，无需手动处理

      // 设置页面参数
      await page.setViewport({ width: 1200, height: 800 })
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      )

      console.log(`正在导航到: ${targetUrl}`)

      // 导航到目标页面
      const response = await page.goto(targetUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      if (!response) {
        return {
          success: false,
          message: '页面加载失败',
        }
      }

      // 等待页面加载完成后检查登录状态
      await this.wait(2000)

      // 获取当前页面信息
      const currentUrl = page.url()
      const pageTitle = await page.title()
      const timestamp = Date.now()

      // 检查当前页面状态
      let isOnTargetPage = await this.isOnTargetPage(page, targetUrl)

      // 构建详细登录数据
      const loginData = {
        isLoggedIn: isOnTargetPage,
        currentUrl,
        pageTitle,
        timestamp,
      }

      // 在目标页面
      if (isOnTargetPage) {
        console.log('🎉 检测到已登录状态')
        // Cookie将在浏览器关闭时自动保存
        return {
          success: true,
          message: '已登录企微',
          data: loginData,
        }
      }

      // 登录标题
      const loginTitleXpath = '//*[@id="wework_admin.loginpage_wx2_$"]//h2//span'
      const res = await this.waitForElementDisappear(page, loginTitleXpath, 3000000)

      // 元素没有消失
      if (!res) {
        loginData.isLoggedIn = false
        return {
          success: false,
          message: '登录超时',
          data: loginData,
        }
      }

      // 重新检查登录状态
      isOnTargetPage = await this.isOnTargetPage(page, targetUrl)

      // 更新登录数据
      loginData.isLoggedIn = isOnTargetPage
      loginData.currentUrl = page.url()
      loginData.pageTitle = await page.title()
      loginData.timestamp = Date.now()

      const result = {
        success: isOnTargetPage,
        message: isOnTargetPage ? '已登录企微' : '页面错误',
        data: loginData,
      }

      if (isOnTargetPage) {
        console.log('🎉 登录完成')
        // Cookie将在浏览器关闭时自动保存
      }

      console.log('登录检查结果:', JSON.stringify(result, null, 2))
      return result
    } catch (error) {
      console.error('检查登录状态失败:', error)

      // 即使发生错误，也尝试返回基本页面信息
      let errorData = null
      try {
        const page = await this.getDefaultPage()
        errorData = {
          isLoggedIn: false,
          currentUrl: page.url(),
          pageTitle: await page.title(),
          timestamp: Date.now(),
        }
      } catch (pageError) {
        console.error('获取页面信息失败:', pageError)
      }

      return {
        success: false,
        message: `检查登录状态失败: ${error instanceof Error ? error.message : '未知错误'}`,
        data: errorData,
      }
    }
  }
}
