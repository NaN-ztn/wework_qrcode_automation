import * as path from 'path'
import { AutomationResult } from '../types'
import { ConfigManager } from '../utils/config-manager'
import { BaseManager } from './base'

export class WeibanManager extends BaseManager {
  private static instance: WeibanManager

  constructor() {
    super()
  }

  public static getInstance(): WeibanManager {
    if (!WeibanManager.instance) {
      WeibanManager.instance = new WeibanManager()
    }
    return WeibanManager.instance
  }

  /**
   * 检查微伴登录状态
   */
  public async checkWeibanLogin(): Promise<AutomationResult> {
    try {
      const config = ConfigManager.loadConfig()
      const targetUrl = config.WEIBAN_DASHBOARD_URL

      const page = await this.createPage()

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
      const isOnTargetPage = await this.isOnTargetPage(page, targetUrl)

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
        return {
          success: true,
          message: '已登录企微',
          data: loginData,
        }
      }

      // 使用轮询检测是否到达目标页面
      console.log('正在等待到达目标页面...')
      const reachedTargetPage = await this.waitForTargetPage(page, targetUrl, {
        timeout: 30000,
        interval: 1000,
      })

      // 更新登录数据
      loginData.isLoggedIn = reachedTargetPage
      loginData.currentUrl = page.url()
      loginData.pageTitle = await page.title()
      loginData.timestamp = Date.now()

      const result = {
        success: reachedTargetPage,
        message: reachedTargetPage ? '已登录企微' : '登录超时或页面错误',
        data: loginData,
      }

      if (reachedTargetPage) {
        console.log('🎉 登录完成')
        // Cookie将在浏览器关闭时自动保存
      }

      console.log('登录检查结果:', JSON.stringify(result, null, 2))
      return result
    } catch (error) {
      console.error('检查登录状态失败:', error)

      return {
        success: false,
        message: `检查登录状态失败: ${error instanceof Error ? error.message : '未知错误'}`,
        data: null,
      }
    }
  }

  /** 创建+v活码 */
  public async createWeibanLiveCode(parm: {
    qrCodeDir: string
    qrCodePath: string
    storeName: string
    storeType: string
    assistant: string
  }): Promise<AutomationResult> {
    try {
      console.log('=== 开始创建微伴活码 ===')
      console.log('参数:', JSON.stringify(parm, null, 2))

      const config = ConfigManager.loadConfig()
      const targetUrl = config.WEIBAN_QR_CREATE_URL

      const page = await this.createPage()

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

      // 等待页面加载完成
      await this.wait(2000)

      // 设置网络监听，准备捕获活码创建API响应
      await this.setupNetworkInterception(page, false)

      // === 第一步: 填写二维码名称 ===
      console.log('步骤1: 填写二维码名称')
      const qrCodeName = this.processStoreName(parm.storeName)
      const nameInputSelector =
        '#ame-page-content > section > div > section > p > span.ame-input-wrapper.ame-input-wrapper-XL.__ameInput__ > input'

      await this.waitAndFill(page, nameInputSelector, qrCodeName, 15000, '二维码名称输入框')
      await this.wait(2000)

      // === 第二步: 添加成员流程 ===
      console.log('步骤2: 添加成员流程')

      // 点击添加成员按钮
      const addMemberSelector =
        '#ame-page-content > section > div > section > div.title-item-box.account-container > div > section.add-member-list.__addMemberList__ > div.add-member-top > button'
      await this.waitAndClick(page, addMemberSelector, 15000, '添加成员按钮')
      await this.wait(2000)

      // 在成员名称输入框输入助手名称
      const memberNameInputSelector =
        'body > div.__ameModal__ > section > div > div.ame-modal-content > section > section > div.ame-add-staff-left > p.ame-tool-top > span > input'
      await this.waitAndFill(page, memberNameInputSelector, parm.assistant, 15000, '成员名称输入框')
      await this.wait(1000)

      // 点击选择第一个成员
      const firstMemberSelector =
        'body > div.__ameModal__ > section > div > div.ame-modal-content > section > section > div.ame-add-staff-left > div > div:nth-child(2) > div:nth-child(4) > div > div:nth-child(1)'
      await this.waitAndClick(page, firstMemberSelector, 15000, '第一个成员')
      await this.wait(1000)

      // 点击确认按钮
      const confirmMemberSelector =
        'body > div.__ameModal__ > section > div > div.ame-modal-content > section > div > div > button.ame-btn.ame-btn-primary.ame-btn-md-2.pc.button.__ameButton__'
      await this.waitAndClick(page, confirmMemberSelector, 15000, '确认添加成员')
      await this.wait(2000)

      // === 第三步: 客户标签配置 ===
      console.log('步骤3: 客户标签配置')

      // 确保客户标签开关开启
      const switchSelector =
        '#ame-page-content > section > div > section > div:nth-child(8) > div > p > span > label > span.ame-switch-track'
      await this.ensureSwitchState(page, switchSelector, true, 15000, '客户标签开关')
      await this.wait(1000)

      // 点击添加标签
      const addTagSelector =
        '#ame-page-content > section > div > section > div:nth-child(8) > div > div > section > button'
      await this.waitAndClick(page, addTagSelector, 15000, '添加标签按钮')
      await this.wait(2000)

      // 智能标签选择逻辑：先搜索是否存在，不存在则创建
      const tagName = `${qrCodeName}活码新加`
      const tagSearchInputSelector =
        'body > div:nth-child(12) > section > div > div.ame-modal-content > div.search-box.top-box.flex-row > span > input'

      // 在搜索框中输入标签名进行搜索
      console.log(`搜索已存在的标签: ${tagName}`)
      await this.waitAndFill(page, tagSearchInputSelector, tagName, 15000, '标签搜索框')
      await this.wait(2000) // 等待搜索结果加载

      // 检查搜索结果中是否存在目标标签
      const existingTagSelector =
        'body > div:nth-child(12) > section > div > div.ame-modal-content > section > div.customer-tag-box > div > div > span:nth-child(3) > span > span > span > span'

      const tagExists = await page.evaluate(
        (selector, targetTagName) => {
          const tagElements = document.querySelectorAll(selector)
          for (const element of Array.from(tagElements)) {
            if (element.textContent?.trim() === targetTagName) {
              return true
            }
          }
          return false
        },
        existingTagSelector,
        tagName,
      )

      if (tagExists) {
        console.log('✓ 找到已存在的标签，直接选择')
        // 找到并点击匹配的标签
        await page.evaluate(
          (selector, targetTagName) => {
            const tagElements = document.querySelectorAll(selector)
            for (const element of Array.from(tagElements)) {
              if (element.textContent?.trim() === targetTagName) {
                ;(element as HTMLElement).click()
                break
              }
            }
          },
          existingTagSelector,
          tagName,
        )
        await this.wait(1000)
      } else {
        console.log('标签不存在，创建新标签组和标签')

        // 点击新建标签组
        const newTagGroupSelector =
          'body > div:nth-child(12) > section > div > div.ame-modal-content > div.search-box.top-box.flex-row > button'
        await this.waitAndClick(page, newTagGroupSelector, 15000, '新建标签组')
        await this.wait(2000)

        // 在标签组输入框输入门店名
        const tagGroupInputSelector =
          '#operator-tag-group-dialog > div.scroll-view > div.tag-group > span > input'
        await this.waitAndFill(page, tagGroupInputSelector, qrCodeName, 15000, '标签组输入框')
        await this.wait(1000)

        // 在标签输入框输入标签名
        const tagInputSelector =
          '#operator-tag-group-dialog > div.scroll-view > div.tag-list-wrap > ul > li > div > span > input'
        await this.waitAndFill(page, tagInputSelector, tagName, 15000, '标签输入框')
        await this.wait(1000)

        // 点击标签组确认按钮
        const tagGroupConfirmSelector =
          '#operator-tag-group-dialog > div.operator-btn-wrap > div > button.ame-btn.ml-12.ame-btn-primary.ame-btn-md-2.pc.button.__ameButton__'
        await this.waitAndClick(page, tagGroupConfirmSelector, 15000, '标签组确认')
        await this.wait(2000)

        // 轮询搜索刚创建的标签，最多重试5次
        console.log(`开始轮询搜索刚创建的标签: ${tagName}`)
        const maxRetries = 5
        const retryInterval = 10000 // 10秒
        let foundNewTag = false

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          console.log(`第${attempt}次搜索标签: ${tagName}`)

          // 清空搜索框并重新搜索
          await this.waitAndFill(page, tagSearchInputSelector, '', 15000, '清空标签搜索框')
          await this.wait(500)
          await this.waitAndFill(page, tagSearchInputSelector, tagName, 15000, '标签搜索框')
          await this.wait(2000)

          // 检查是否找到了新创建的标签
          const newTagExists = await page.evaluate(
            (selector, targetTagName) => {
              const tagElements = document.querySelectorAll(selector)
              for (const element of Array.from(tagElements)) {
                if (element.textContent?.trim() === targetTagName) {
                  return true
                }
              }
              return false
            },
            existingTagSelector,
            tagName,
          )

          if (newTagExists) {
            console.log(`✓ 第${attempt}次搜索成功找到新创建的标签`)
            foundNewTag = true
            break
          } else {
            console.log(
              `第${attempt}次搜索未找到标签，${
                attempt < maxRetries ? `等待${retryInterval / 1000}秒后重试...` : '达到最大重试次数'
              }`,
            )
            if (attempt < maxRetries) {
              await this.wait(retryInterval)
            }
          }
        }

        if (!foundNewTag) {
          throw new Error(`轮询${maxRetries}次后仍未找到新创建的标签: ${tagName}`)
        }

        // 选择找到的新标签
        await page.evaluate(
          (selector, targetTagName) => {
            const tagElements = document.querySelectorAll(selector)
            for (const element of Array.from(tagElements)) {
              if (element.textContent?.trim() === targetTagName) {
                ;(element as HTMLElement).click()
                break
              }
            }
          },
          existingTagSelector,
          tagName,
        )
        await this.wait(1000)
      }

      // 点击标签确认
      const tagConfirmSelector =
        'body > div:nth-child(12) > section > div > div.btn-wrap.flex-row.align-side > div.right.flex-row > button.ame-btn.ame-btn-primary.ame-btn-md-2.pc.button.__ameButton__'
      await this.waitAndClick(page, tagConfirmSelector, 15000, '标签确认')
      await this.wait(2000)

      // === 第四步: 消息内容设置 ===
      console.log('步骤4: 消息内容设置')

      // 点击插入用户昵称
      const insertNicknameSelector =
        '#multi-sendable-message-box > div.text-area-box.has-ai > div.msg-textarea-box.full-w.__msgTextarea__ > div.insert-btn > span:nth-child(2)'
      await this.waitAndClick(page, insertNicknameSelector, 15000, '插入用户昵称')
      await this.wait(1000)

      // 在消息内容输入框追加消息
      const messageInputSelector =
        '#multi-sendable-message-box > div.text-area-box.has-ai > div.msg-textarea-box.full-w.__msgTextarea__ > div.textarea-box > div:nth-child(2)'
      const messageTemplate = this.processMessageTemplate(parm.storeName, parm.storeType)

      // 获取当前内容并追加（支持换行符）
      await this.wait(500)
      await page.click(messageInputSelector)
      await page.keyboard.press('End') // 移动到最后
      await page.keyboard.type(' ') // 添加一个空格分隔
      await this.typeTextWithNewlines(
        page,
        messageInputSelector,
        messageTemplate,
        15000,
        '消息内容',
      )
      await this.wait(2000)

      // === 第五步: 附件上传流程 ===
      console.log('步骤5: 附件上传流程')

      // 点击添加附件
      const addAttachmentSelector =
        '#multi-sendable-message-box > div.option-area-box > div > section > div > button'
      await this.waitAndClick(page, addAttachmentSelector, 15000, '添加附件')
      await this.wait(2000)

      // 点击链接按钮
      const linkButtonSelector =
        'body > div.__ameModal__ > section > div > div.ame-modal-content > section.ame-tabs.tabs.ame-tabs-bottom-border.ame-tabs-card.__ameTabs__ > div > div.ame-tabs-container > div:nth-child(2)'
      await this.waitAndClick(page, linkButtonSelector, 15000, '链接按钮')
      await this.wait(2000)

      // 点击创建入群链接
      const createGroupLinkSelector =
        'body > div.__ameModal__ > section > div > div.ame-modal-content > div > div > section > div.radar-row.not-show-radar > div.flex-row > button:nth-child(3)'
      await this.waitAndClick(page, createGroupLinkSelector, 15000, '创建入群链接')
      await this.wait(3000)

      // 上传群二维码图片
      const qrCodeUploadSelector =
        'body > div:nth-child(12) > section > div > div.ame-modal-content > div > section > div > section:nth-child(1) > div > div.ame-form-item-content > section > input[type=file]'
      await this.uploadFileToElement(
        page,
        qrCodeUploadSelector,
        parm.qrCodePath,
        false,
        15000,
        '群二维码',
      )

      // 填写链接标题
      const linkTitleSelector =
        'body > div:nth-child(12) > section > div > div.ame-modal-content > div > section > div > section:nth-child(2) > div > div.ame-form-item-content > span > input'
      const linkTitle = `邻家优选${qrCodeName}`
      await this.waitAndFill(page, linkTitleSelector, linkTitle, 15000, '链接标题输入框')
      await this.wait(1000)

      // 填写链接描述
      const linkDescSelector =
        'body > div:nth-child(12) > section > div > div.ame-modal-content > div > section > div > section:nth-child(3) > div > div.ame-form-item-content > span > input'
      const linkDescription = `邻家优选${qrCodeName}`
      await this.waitAndFill(page, linkDescSelector, linkDescription, 15000, '链接描述输入框')
      await this.wait(2000)

      // 点击链接创建确认按钮
      const linkCreateConfirmSelector =
        'body > div:nth-child(12) > section > div > div.ame-modal-footer > div.ame-modal-footer-btns > button.ame-btn.ame-btn-primary.ame-btn-md-2.pc.button.__ameButton__'
      await this.waitAndClick(page, linkCreateConfirmSelector, 15000, '链接创建确认')
      await this.wait(2000)

      // 等待链接创建确认按钮消失，确保操作完成
      console.log('等待链接创建确认按钮消失...')
      await this.waitForSelectorDisappear(page, linkCreateConfirmSelector, 10000)
      await this.wait(1000)

      // 点击附件弹窗确认按钮
      const attachmentConfirmSelector =
        'body > div.__ameModal__ > section > div > div.flex-row.align-right.mt-24 > button.ame-btn.ml-12.ame-btn-primary.ame-btn-md-2.pc.button.__ameButton__'
      await this.waitAndClick(page, attachmentConfirmSelector, 15000, '附件确认')
      await this.wait(2000)

      // === 第六步: 创建活码 ===
      console.log('步骤6: 创建活码')

      // 点击新建活码按钮并同时等待API响应
      const createLiveCodeSelector = '#ame-page-content > section > div > section > button'

      console.log('点击新建活码按钮，同时开始监听API响应...')

      // 并行执行：点击按钮 + 等待API响应
      const [apiResponse] = await Promise.all([
        this.waitForApiResponse<any>(page, '/api/contact_way/corp/add', 30000, '微伴活码创建'),
        this.waitAndClick(page, createLiveCodeSelector, 15000, '新建活码'),
      ])

      console.log('✓ 成功获取到活码创建API响应')

      // === 第七步: 获取活码二维码 ===
      console.log('步骤7: 获取活码二维码')

      // 解析API响应获取二维码信息
      let weibanQrCodePath = null
      let contactWayInfo = null

      if (apiResponse && apiResponse.success && apiResponse.contact_way) {
        contactWayInfo = {
          id: apiResponse.contact_way.id,
          qrCode: apiResponse.contact_way.qr_code,
          state: apiResponse.contact_way.state,
          remark: apiResponse.contact_way.remark,
          status: apiResponse.contact_way.status,
        }

        console.log('活码信息:', JSON.stringify(contactWayInfo, null, 2))

        // 下载微伴平台生成的二维码
        if (contactWayInfo.qrCode) {
          try {
            weibanQrCodePath = await this.downloadWeibanQrCode(
              contactWayInfo.qrCode,
              parm.qrCodeDir,
            )
            console.log('✓ 微伴活码二维码下载完成')
          } catch (downloadError) {
            console.warn('微伴活码二维码下载失败:', downloadError)
          }
        }
      } else {
        console.warn('未获取到有效的活码API响应数据')
      }

      await this.wait(2000)
      console.log('✓ 微伴活码创建流程完成')

      return {
        success: true,
        message: '微伴活码创建成功',
        data: {
          qrCodeName,
          storeName: parm.storeName,
          storeType: parm.storeType,
          assistant: parm.assistant,
          timestamp: Date.now(),
          // 标准二维码路径字段（供主进程使用）
          qrCodePath: weibanQrCodePath,
          // 微伴活码信息
          weibanContactWay: contactWayInfo,
          weibanQrCodePath,
          // 原有的群二维码路径
          groupQrCodePath: parm.qrCodePath,
        },
      }
    } catch (error) {
      console.error('创建微伴活码失败:', error)

      return {
        success: false,
        message: `创建微伴活码失败: ${error instanceof Error ? error.message : '未知错误'}`,
        data: null,
      }
    }
  }

  /**
   * 处理微伴消息模板 - 从配置文件读取消息内容并替换模板变量，处理换行符
   * @param storeName 门店名称
   * @param storeType 门店类型
   * @returns 处理后的消息内容
   */
  private processMessageTemplate(storeName: string, storeType: string): string {
    try {
      const config = ConfigManager.loadConfig()

      // 处理门店名称
      const processedStoreName = this.processStoreName(storeName)

      // 根据门店类型从配置中获取消息模板
      let messageTemplate = ''

      switch (storeType) {
        case '店中店':
          messageTemplate =
            config.WEIBAN_WELCOME_MSG || '欢迎来到{{storeName}}，为您提供优质的产品和服务。'
          break
        case '独立店':
          messageTemplate =
            config.WEIBAN_WELCOME_MSG_INDEPENDENT ||
            '欢迎来到{{storeName}}，为您提供优质的产品和服务。'
          break
        default:
          messageTemplate =
            config.WEIBAN_WELCOME_MSG || '欢迎来到{{storeName}}，为您提供优质的产品和服务。'
      }

      // 替换模板变量
      let processedMessage = messageTemplate.replace(/\{\{storeName\}\}/g, processedStoreName)

      // 处理换行符：将配置中的 \n 转换为实际的换行符
      processedMessage = processedMessage.replace(/\\n/g, '\n')

      console.log(`微伴消息模板处理完成: ${processedMessage}`)
      return processedMessage
    } catch (error) {
      console.warn('处理微伴消息模板失败，使用默认消息:', error)
      const processedStoreName = this.processStoreName(storeName)
      return `欢迎来到${processedStoreName}，为您提供优质的产品和服务。`
    }
  }

  /**
   * 下载微伴活码二维码
   * @param qrCodeUrl 二维码URL
   * @param qrCodeDir 保存目录
   */
  private async downloadWeibanQrCode(qrCodeUrl: string, qrCodeDir: string): Promise<string> {
    const fileName = 'weiban_qr_code.png'
    const savePath = path.join(qrCodeDir, fileName)

    console.log(`准备下载微伴活码二维码: ${qrCodeUrl}`)

    const localPath = await this.downloadImageFromUrl(qrCodeUrl, savePath, '微伴活码二维码')

    console.log(`✓ 微伴活码二维码已保存到: ${localPath}`)
    return localPath
  }
}

// ;(async function () {
//   const instance = WeibanManager.getInstance()
//   await instance.checkWeibanLogin()
//   await instance.createWeibanLiveCode({
//     storeName: '楠子1店',
//     storeType: '独立店',
//     assistant: '王莹',
//     qrCodeDir: '/tmp/wework-automation/qr_code/楠子1店_2025_08_13_15_24_42',
//     qrCodePath: '/tmp/wework-automation/qr_code/楠子1店_2025_08_13_15_24_42/groupqrcode.png',
//   })
//   // await instance.forceCloseBrowser()
// })()
