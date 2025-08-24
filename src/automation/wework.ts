import * as puppeteer from 'puppeteer'
import * as fs from 'fs'
import { ConfigManager } from '../utils/config-manager'
import { TodoListManager } from '../utils/todo-list-manager'
import {
  AutomationResult,
  GroupReplaceOptions,
  GroupInfo,
  GroupReplaceResultData,
  GroupOperationType,
  GroupOperationRecord,
  CollectGroupsResult,
  TodoList,
  TodoStatus,
} from '../types'
import { BaseManager } from './base'

export class WeworkManager extends BaseManager {
  private static instance: WeworkManager
  private todoListManager: TodoListManager
  private currentTodoList: TodoList | null = null
  private isStopRequested: boolean = false

  constructor() {
    super()
    this.todoListManager = TodoListManager.getInstance()
  }

  /**
   * 请求停止执行
   */
  public requestStop(): void {
    console.log('🛑 收到停止请求，设置停止标志')
    this.isStopRequested = true
  }

  /**
   * 重置停止标志
   */
  public resetStopFlag(): void {
    this.isStopRequested = false
    // 同时重置BrowserInstance的停止标志
    this.browserInstance.setStopRequested(false)
  }

  /**
   * 统一的三层停止标识重置方法
   * 用于接续执行等场景，确保彻底清理所有停止标识
   */
  public resetAllStopFlags(): void {
    console.log('🔄 开始重置三层停止标识')

    // 第一层：重置WeworkManager层的停止标识
    this.isStopRequested = false
    console.log('✅ WeworkManager层停止标识已重置')

    // 第二层：重置BrowserInstance层的停止标识
    this.browserInstance.setStopRequested(false)
    console.log('✅ BrowserInstance层停止标识已重置')

    // 第三层：通知渲染进程重置停止标识（在接续执行时由渲染进程主动重置）
    console.log('✅ 三层停止标识重置完成，准备开始新任务')
  }

  /**
   * 检查是否请求停止
   */
  public checkStopRequested(): boolean {
    if (this.isStopRequested) {
      console.log('🛑 检测到停止请求，终止执行')
      return true
    }
    return false
  }

  public static getInstance(): WeworkManager {
    if (!WeworkManager.instance) {
      WeworkManager.instance = new WeworkManager()
    }
    WeworkManager.instance.resetStopFlag()
    return WeworkManager.instance
  }

  /**
   * 检查企微登录状态
   */
  public async checkWeWorkLogin(): Promise<AutomationResult> {
    try {
      const config = ConfigManager.loadConfig()
      const targetUrl = config.WEWORK_CONTACT_URL

      const page = await this.createPage()

      // 页面已在browser-instance.ts中自适应配置viewport
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

  /** 企微通讯录信息变更 */
  public async changeContactInfo(param: { mobile: string; storeType: string; storeName: string }) {
    const config = ConfigManager.loadConfig()
    const targetUrl = config.WEWORK_CONTACT_URL

    const page = await this.createPage()

    // 页面已在browser-instance.ts中自适应配置viewport
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

    try {
      console.log(
        `开始处理联系人信息变更: 手机号=${param.mobile}, 门店类型=${param.storeType}, 门店名=${param.storeName}`,
      )

      // 步骤1: 在搜索框中输入手机号
      console.log('步骤1: 搜索用户...')
      const searchInputXpath = '//*[@id="memberSearchInput"]'
      const searchInput = await this.waitForElementByXPath(page, searchInputXpath, 10000)

      if (!searchInput) {
        return {
          success: false,
          message: '未找到搜索框，请确认页面是否正确加载',
        }
      }

      // 清空搜索框并输入手机号
      await searchInput.click({ clickCount: 3 }) // 三击选中所有文本
      await this.wait(500) // 等待选中生效
      await searchInput.type(param.mobile)
      console.log(`已输入手机号: ${param.mobile}`)
      await this.wait(1000) // 等待输入完成

      // 等待搜索结果出现 - 等待搜索结果列表显示
      const searchListXpath = '//*[@id="search_member_list"]'
      await this.waitForElementByXPath(page, searchListXpath, 10000)

      // 步骤2: 点击第一个搜索结果
      console.log('步骤2: 选择第一个搜索结果...')
      const firstMemberXpath = '//*[@id="search_member_list"]/li[1]'
      const firstMember = await this.waitForElementByXPath(page, firstMemberXpath, 10000)

      if (!firstMember) {
        return {
          success: false,
          message: '未找到搜索结果，请检查手机号是否正确',
        }
      }

      await firstMember.click()
      console.log('已点击第一个搜索结果')
      await this.wait(1500) // 等待页面跳转

      // 等待用户详情页面加载 - 等待编辑按钮出现
      const editButtonPreCheck = '//*[contains(@class, "js_edit")]'
      await this.waitForElementByXPath(page, editButtonPreCheck, 15000)

      // 步骤3: 点击编辑按钮
      console.log('步骤3: 进入编辑模式...')
      const editButtonXpath =
        '//*[contains(@class, "qui_btn") and contains(@class, "ww_btn") and contains(@class, "js_edit")]'
      const editButton = await this.waitForElementByXPath(page, editButtonXpath, 10000)

      if (!editButton) {
        return {
          success: false,
          message: '未找到编辑按钮，可能没有编辑权限',
        }
      }

      await editButton.click()
      console.log('已进入编辑模式')
      await this.wait(1000) // 等待编辑模式加载

      // 等待编辑表单加载 - 等待姓名输入框出现
      const formLoadCheck = '//*[@id="username"]'
      await this.waitForElementByXPath(page, formLoadCheck, 10000)

      // 步骤4: 更新姓名
      console.log('步骤4: 更新用户姓名...')
      const processedStoreName =
        this.processStoreName(param.storeName) + (param.storeType === '店中店' ? '店小二' : '')
      console.log(`处理后的门店名称: ${processedStoreName}`)

      const usernameInputXpath = '//*[@id="username"]'
      const usernameInput = await this.waitForElementByXPath(page, usernameInputXpath, 10000)

      if (!usernameInput) {
        return {
          success: false,
          message: '未找到姓名输入框',
        }
      }

      // 清空并输入新姓名
      await usernameInput.click({ clickCount: 3 })
      await this.wait(300) // 等待选中生效
      await usernameInput.type(processedStoreName)
      console.log(`已更新姓名为: ${processedStoreName}`)
      await this.wait(800) // 等待输入完成

      // 步骤5: 更新头像(仅店中店)
      if (param.storeType === '店中店') {
        console.log('步骤5: 更新头像...')
        const avatarUpdateResult = await this.updateAvatar(page)
        if (!avatarUpdateResult.success) {
          return avatarUpdateResult
        }
        await this.wait(1000)
      } else {
        console.log('跳过头像更新(非店中店类型)')
      }

      // 步骤5: 修改部门信息
      console.log('步骤5: 修改部门信息...')
      const departmentResult = await this.updateDepartment(page, param.storeType)
      if (!departmentResult.success) {
        return departmentResult
      }

      // 步骤6: 保存更改
      console.log('步骤6: 保存更改...')
      const saveResult = await this.saveContactChanges(page)
      if (!saveResult.success) {
        return saveResult
      }

      console.log('✅ 联系人信息变更完成')

      return {
        success: true,
        message: '联系人信息更新成功',
        data: {
          mobile: param.mobile,
          newName: processedStoreName,
          storeType: param.storeType,
          avatarUpdated: param.storeType === '店中店',
        },
      }
    } catch (error) {
      console.error('联系人信息变更失败:', error)

      return {
        success: false,
        message: `联系人信息变更失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 生成随机emoji (针对群名称使用)
   */
  private generateRandomEmoji(): string {
    const emojiList = [
      '💐',
      '🌸',
      '🌺',
      '🌻',
      '🌷',
      '🌹',
      '🥀',
      '🌵',
      '🌿',
      '☘️',
      '🍀',
      '🌱',
      '🌾',
      '🌴',
      '🌳',
      '🌲',
      '🌊',
      '🌈',
      '⭐',
      '✨',
      '🌟',
      '💫',
      '🌙',
      '☀️',
      '🌞',
      '🔥',
      '💎',
      '🎉',
      '🎊',
      '🎈',
    ]
    return emojiList[Math.floor(Math.random() * emojiList.length)]
  }

  /**
   * 查找模板元素 (使用base中的通用方法)
   */
  private async findTemplateElement(
    page: puppeteer.Page,
    templateName: string,
    timeout: number = 10000,
  ): Promise<puppeteer.ElementHandle<Element> | null> {
    const templateContainer = '#__dialog__MNDialog__ div:nth-child(2) div'
    return await this.findElementByText(page, templateContainer, templateName, 'label', timeout)
  }

  /**
   * 更新头像为店中店专用头像
   */
  private async updateAvatar(page: puppeteer.Page): Promise<AutomationResult> {
    try {
      // 点击头像编辑区域
      const avatarEditXpath = '//*[@id="js_upload_file"]/div/div[2]'
      const avatarEditButton = await this.waitForElementByXPath(page, avatarEditXpath, 10000)

      if (!avatarEditButton) {
        return {
          success: false,
          message: '未找到头像编辑区域',
        }
      }

      await avatarEditButton.click()
      console.log('已点击头像编辑区域')
      await this.wait(1000) // 等待对话框打开

      // 等待头像编辑对话框加载 - 等待对话框元素出现
      const avatarDialogXpath = '//*[@id="__dialog__avatarEditor__"]'
      await this.waitForElementByXPath(page, avatarDialogXpath, 10000)

      // 获取头像文件路径 - 从配置文件获取
      const config = ConfigManager.loadConfig()
      const avatarPath = config.STORE_AVATAR_PATH

      console.log('=== 头像文件配置调试信息 ===')
      console.log('配置文件路径:', ConfigManager.getConfigPath())
      console.log('配置的头像路径:', config.STORE_AVATAR_PATH)
      console.log('当前工作目录:', process.cwd())
      console.log('__dirname:', __dirname)
      console.log('process.resourcesPath:', process.resourcesPath)
      console.log('NODE_ENV:', process.env.NODE_ENV)

      console.log(`使用头像文件路径: ${avatarPath}`)
      console.log(`文件是否存在: ${fs.existsSync(avatarPath)}`)

      // 验证文件是否存在
      if (!fs.existsSync(avatarPath)) {
        console.error(`头像文件不存在: ${avatarPath}`)
        console.log('当前工作目录:', process.cwd())
        console.log('__dirname:', __dirname)
        console.log('process.resourcesPath:', process.resourcesPath)

        console.log('配置的头像路径:', config.STORE_AVATAR_PATH)

        return {
          success: false,
          message: `头像文件不存在: ${avatarPath}，请检查路径配置`,
        }
      }

      // 尝试方案A: 查找文件输入元素并直接上传
      const fileInputXpath = '//*[@id="__dialog__avatarEditor__"]/div/div[3]/div/a/input'
      const fileInput = await this.safeGetElementByXPath(page, fileInputXpath, 5000)

      if (fileInput) {
        console.log('使用直接上传方式')
        console.log('文件input元素已找到')
        try {
          console.log('开始上传文件:', avatarPath)
          // 类型断言为HTMLInputElement
          await (fileInput as puppeteer.ElementHandle<HTMLInputElement>).uploadFile(avatarPath)
          console.log('uploadFile调用完成')
          await this.wait(1500) // 等待文件上传
          console.log('文件上传等待完成')
        } catch (uploadError) {
          console.error('直接上传失败:', uploadError)
          console.error('错误详情:', uploadError)
          return {
            success: false,
            message: `文件上传失败: ${uploadError instanceof Error ? uploadError.message : '未知错误'}`,
          }
        }
      } else {
        // 方案B: 使用文件选择器
        console.log('使用文件选择器方式')

        const uploadButtonXpath = '//*[@id="__dialog__avatarEditor__"]/div/div[3]/div/a'
        const uploadButton = await this.waitForElementByXPath(page, uploadButtonXpath, 10000)

        if (!uploadButton) {
          return {
            success: false,
            message: '未找到上传按钮',
          }
        }

        // 等待文件选择器并选择文件
        try {
          console.log('等待文件选择器...')
          const [fileChooser] = await Promise.all([page.waitForFileChooser(), uploadButton.click()])
          console.log('文件选择器已打开')

          console.log('接受文件:', avatarPath)
          await fileChooser.accept([avatarPath])
          console.log('文件选择器accept调用完成')
          await this.wait(2000) // 等待文件处理
          console.log('文件选择器处理等待完成')
        } catch (chooserError) {
          console.error('文件选择器上传失败:', chooserError)
          console.error('错误详情:', chooserError)
          return {
            success: false,
            message: `文件选择器上传失败: ${chooserError instanceof Error ? chooserError.message : '未知错误'}`,
          }
        }
      }

      // 等待上传完成 - 等待保存按钮变为可用状态或预览图片出现
      const avatarSaveButtonXpath = '//*[@id="__dialog__avatarEditor__"]/div/div[3]/a[1]'
      const saveButton = await this.waitForElementByXPath(page, avatarSaveButtonXpath, 15000)

      if (!saveButton) {
        return {
          success: false,
          message: '未找到头像保存按钮或上传未完成',
        }
      }

      await saveButton.click()
      console.log('已点击头像保存按钮')
      await this.wait(1000) // 等待保存处理

      // 等待头像编辑对话框关闭
      const dialogXpath = '//*[@id="__dialog__avatarEditor__"]'
      const dialogClosed = await this.waitForElementDisappear(page, dialogXpath, 10000)

      if (!dialogClosed) {
        console.warn('头像对话框未完全关闭，但继续执行')
      }

      console.log('✅ 头像更新完成')
      return {
        success: true,
        message: '头像更新成功',
      }
    } catch (error) {
      console.error('头像更新失败:', error)
      return {
        success: false,
        message: `头像更新失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 保存联系人变更
   */
  private async saveContactChanges(page: puppeteer.Page): Promise<AutomationResult> {
    try {
      // 等待页面稳定 - 确保编辑表单完全加载
      const operationBarXpath = '//*[contains(@class, "js_member_operationBar")]'
      await this.waitForElementByXPath(page, operationBarXpath, 10000)

      // 点击最终保存按钮
      const finalSaveButtonSelector =
        'div.member_colRight_operationBar.member_operationBar.member_footer_operationBar.js_member_operationBar > a.qui_btn.ww_btn.ww_btn_Blue.js_save'

      // 先尝试用CSS选择器
      let saveButton: puppeteer.ElementHandle<Element> | null =
        await page.$(finalSaveButtonSelector)

      if (!saveButton) {
        // 如果CSS选择器失败，尝试更简单的选择器
        const simpleSaveSelector = '.js_member_operationBar .js_save'
        saveButton = await page.$(simpleSaveSelector)
      }

      if (!saveButton) {
        // 最后尝试xpath
        const saveButtonXpath =
          '//*[contains(@class, "js_save") and contains(@class, "ww_btn_Blue")]'
        const saveButtonElement = await this.waitForElementByXPath(page, saveButtonXpath, 10000)

        if (!saveButtonElement) {
          return {
            success: false,
            message: '未找到最终保存按钮',
          }
        }

        await saveButtonElement.click()
      } else {
        await saveButton.click()
      }

      console.log('已点击最终保存按钮')
      await this.wait(1000) // 等待保存处理开始

      // 等待保存完成 - 等待编辑模式退出或页面变化
      const editFormXpath = '//*[contains(@class, "js_edit_container")]'
      const saveSuccessResult = await Promise.race([
        this.waitForElementDisappear(page, editFormXpath, 10000).then(() => 'form_closed'),
        page
          .waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
          .then(() => 'navigation')
          .catch(() => null),
      ])

      // 检查保存结果
      const currentUrl = page.url()
      console.log(`保存后页面URL: ${currentUrl}`)

      if (saveSuccessResult) {
        console.log(
          `保存成功 - ${saveSuccessResult === 'form_closed' ? '编辑表单已关闭' : '页面已跳转'}`,
        )
      } else {
        console.warn('保存状态未确认，但继续执行')
      }

      return {
        success: true,
        message: '联系人信息保存成功',
      }
    } catch (error) {
      console.error('保存联系人变更失败:', error)
      return {
        success: false,
        message: `保存失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /** 创建群活码 */
  public async createGroupLiveCode(param: {
    storeName: string
    storeType: string
    assistant: string
  }): Promise<AutomationResult> {
    const startTime = Date.now()
    console.log(
      `开始创建群活码 - 店铺: ${param.storeName}, 类型: ${param.storeType}, 助手: ${param.assistant}`,
    )

    try {
      const config = ConfigManager.loadConfig()
      const targetUrl = config.WEWORK_CREATE_GROUP_LIVE_CODE_URL

      const page = await this.createPage()

      // 页面已在browser-instance.ts中自适应配置viewport
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

      // 生成群名称需要的随机emoji(在整个流程中保持一致)
      const randomEmoji = this.generateRandomEmoji()
      const processedStoreName = this.processStoreName(param.storeName)

      console.log(`随机Emoji: ${randomEmoji}, 处理后店铺名: ${processedStoreName}`)

      // 步骤1-8: 使用通用的群码操作之修改新建群聊方法
      const groupName = `${randomEmoji}邻家优选｜${processedStoreName}2群`
      await this.modifyAndCreateGroupChat(page, groupName, param.assistant)

      // 步骤9: 点击使用模板
      console.log('\n=== 步骤9: 点击使用模板 ===')
      await this.waitForSelectorDisappear(
        page,
        '#__dialog__MNDialog__ > div > div.qui_dialog_foot.ww_dialog_foot > a.qui_btn.ww_btn.ww_btn_Blue',
      )
      await this.waitAndClick(
        page,
        '#js_csPlugin_index_create_wrap > div.csPlugin_mod_main > div:nth-child(3) > div.csPlugin_mod_item_content > div.csPlugin_mod_item_row.js_csPlugin_mod_item_set.csPlugin_mod_item_set > a',
        10000,
        '使用模板按钮',
      )
      await this.wait(1500) // 等待模板选择弹框出现

      // 步骤10: 查找并选择模板
      console.log('\n=== 步骤10: 选择模板 ===')
      const templateName = `${param.storeType}活码通用`
      console.log(`目标模板名称: ${templateName}`)

      const templateElement = await this.findTemplateElement(page, templateName, 15000)
      if (!templateElement) {
        return {
          success: false,
          message: `未找到模板: ${templateName}`,
        }
      }

      await templateElement.click()
      console.log(`✓ 已选择模板: ${templateName}`)
      await templateElement.dispose() // 释放资源
      await this.wait(1500) // 等待模板选择状态更新

      // 步骤11: 点击使用该模板
      console.log('\n=== 步骤11: 确认使用模板 ===')
      await this.waitAndClick(
        page,
        '#__dialog__MNDialog__ > div > div:nth-child(3) > a:nth-child(2)',
        10000,
        '使用该模板按钮',
      )
      await this.wait(2500) // 等待模板应用到配置中

      // 步骤12: 填写后续新建群名
      console.log('\n=== 步骤12: 设置后续新建群名 ===')
      const subsequentGroupName = `${randomEmoji}邻家优选｜${processedStoreName}`
      console.log(`后续群名称: ${subsequentGroupName}`)

      await this.waitAndFill(
        page,
        '#js_csPlugin_index_create_wrap > div:nth-child(1) > div:nth-child(3) > div:nth-child(2) > div:nth-child(3) > div:nth-child(1) > input',
        subsequentGroupName,
        10000,
        '后续新建群名输入框',
      )
      await this.wait(800) // 等待输入完成

      // 步骤13: 确保群序号单选框勾选
      console.log('\n=== 步骤13: 确保群序号选项勾选 ===')
      const checkboxResult = await this.smartClickCheckbox(
        page,
        '#js_csPlugin_index_create_wrap > div:nth-child(1) > div:nth-child(3) > div:nth-child(2) > div:nth-child(3) > div:nth-child(2) > input:nth-child(1)',
        10000,
        '群序号单选框',
      )

      if (!checkboxResult) {
        console.warn('⚠️ 群序号单选框可能未正确勾选，但继续执行')
      }

      await this.wait(500) // 等待选项状态更新

      // 步骤14: 调整序号为3
      console.log('\n=== 步骤14: 设置序号为3 ===')
      await this.waitAndFill(
        page,
        '#js_csPlugin_index_create_wrap > div.csPlugin_mod_main > div:nth-child(3) > div.csPlugin_mod_item_content > div.csPlugin_mod_item_wrapper > div.csPlugin_line > input.csPlugin_mod_index_input',
        '3',
        10000,
        '序号输入框',
      )
      await this.wait(600) // 等待序号输入完成

      // 步骤15: 填写群备注
      console.log('\n=== 步骤15: 填写群备注 ===')
      const groupNote = `${processedStoreName}LJYX`
      console.log(`群备注: ${groupNote}`)

      await this.waitAndFill(
        page,
        '#js_csPlugin_index_create_wrap > div:nth-child(1) > div:nth-child(4) > div:nth-child(2) > div > input',
        groupNote,
        10000,
        '群备注输入框',
      )
      await this.wait(800) // 等待备注输入完成

      // 获取环境变量和生成文件路径
      const qrCodeBasePath = config.QRCODE_TARGET_STORE_PATH || './qr-codes'
      const timestamp = new Date()
        .toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
        .replace(/[/\s:]/g, '_')
      const folderName = `${processedStoreName}_${timestamp}`
      const qrCodeDir = `${qrCodeBasePath}/${folderName}`
      const qrCodePath = `${qrCodeDir}/groupqrcode.png`

      console.log('\n=== 步骤16: 设置网络监听 ===')
      console.log(`二维码保存路径: ${qrCodePath}`)

      // 设置网络监听，准备捕获群活码创建API响应
      await this.setupNetworkInterception(page, false)

      // 步骤17: 点击创建按钮并等待API响应
      console.log('\n=== 步骤17: 创建群活码并监听API响应 ===')
      console.log('点击创建按钮，同时开始监听API响应...')

      // 并行执行：点击按钮 + 等待API响应
      const [apiResponse] = await Promise.all([
        this.waitForApiResponse<any>(
          page,
          '/wework_admin/chatGroup/savePlugin',
          30000,
          '企业微信群活码创建',
        ),
        this.waitAndClick(
          page,
          '#js_csPlugin_index_create_wrap > div:nth-child(1) > div:nth-child(5) > a',
          15000,
          '创建按钮',
        ),
      ])

      console.log('✓ 成功获取到群活码创建API响应')

      // 步骤18: 解析API响应并下载二维码
      console.log('\n=== 步骤18: 解析API响应并下载二维码 ===')
      let qrCodeSaved = false
      const qrCodeSaveMethod = 'network-request'

      // 解析API响应获取二维码URL
      let qrCodeUrl = ''
      if (apiResponse && apiResponse.data && apiResponse.data.ctcode) {
        qrCodeUrl = apiResponse.data.ctcode
        console.log('✓ 从API响应中提取到二维码URL:', qrCodeUrl)

        // 使用网络请求下载二维码
        const downloadedPath = await this.downloadImageFromUrl(qrCodeUrl, qrCodePath, '二维码')

        if (downloadedPath) {
          qrCodeSaved = true
          console.log('✓ 二维码下载成功')
        }
      } else {
        throw new Error('API响应中未找到ctcode字段')
      }

      const executionTime = Date.now() - startTime
      console.log(`\n✅ 群活码创建完成！耗时: ${executionTime}ms`)

      return {
        success: true,
        message: '群活码创建成功',
        data: {
          storeName: param.storeName,
          storeType: param.storeType,
          assistant: param.assistant,
          groupName,
          subsequentGroupName,
          groupNote,
          templateName,
          executionTime,
          randomEmoji,
          qrCodeSaved,
          qrCodeDir: qrCodeSaved ? qrCodeDir : '',
          qrCodePath: qrCodeSaved ? qrCodePath : '',
          qrCodeSaveMethod: qrCodeSaved ? qrCodeSaveMethod : '',
        },
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      console.error('创建群活码失败:', error)

      return {
        success: false,
        message: `创建群活码失败: ${error instanceof Error ? error.message : '未知错误'}`,
        data: {
          storeName: param.storeName,
          storeType: param.storeType,
          assistant: param.assistant,
          executionTime,
          error: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  /**
   * 更新部门信息
   */
  private async updateDepartment(
    page: puppeteer.Page,
    storeType: string,
  ): Promise<AutomationResult> {
    try {
      // 确定搜索的部门名称
      const departmentName = storeType === '店中店' ? '邻家优选店中店' : '邻家优选社区'
      console.log(`准备搜索部门: ${departmentName}`)

      // 点击部门修改按钮
      const departmentSelector =
        'div.js_edit_container.member_edit > form > div.member_edit_formWrap.member_edit_formWrap_Five > div:nth-child(3) > div:nth-child(1) > div.member_edit_item_right > div.ww_groupSelBtn.js_party_select_result > a'
      await this.waitAndClick(page, departmentSelector, 10000, '部门修改按钮')
      await this.wait(2000) // 等待弹框加载

      // 删除所有现有部门
      const existingDepartments = await page.$$(
        'div > div.qui_dialog_body.ww_dialog_body > div > div > div > div.multiPickerDlg_right > div.multiPickerDlg_right_cnt > div > ul > li > a',
      )
      if (existingDepartments.length > 0) {
        console.log(`删除 ${existingDepartments.length} 个现有部门`)
        for (const dept of existingDepartments) {
          await dept.click()
          await this.wait(500)
        }
      }

      await this.wait(5000)

      // 在搜索框中输入部门名称
      await this.waitAndFill(
        page,
        'div > div.qui_dialog_body.ww_dialog_body > div > div > div > div.multiPickerDlg_left.js_select > div.multiPickerDlg_left_cnt > div.multiPickerDlg_search.multiPickerDlg_commCnt > span > input',
        departmentName,
        10000,
        '部门搜索框',
      )
      await this.wait(2000) // 等待搜索结果

      // 点击第一个搜索结果
      await this.waitAndClick(page, '#searchResult > ul > li', 10000, '第一个搜索结果')
      await this.wait(1000)

      // 点击确认按钮
      await this.waitAndClick(page, '#footer_submit_btn', 10000, '确认按钮')
      await this.wait(2000)

      console.log(`✓ 部门更新成功: ${departmentName}`)
      return { success: true, message: '部门更新成功' }
    } catch (error) {
      console.error('部门更新失败:', error)
      return {
        success: false,
        message: `部门更新失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 生成插件任务列表
   * 仅收集群组信息并创建TodoList，不执行具体操作
   */
  public async generatePluginTaskList(searchKeyword: string = ''): Promise<{
    success: boolean
    message: string
    data?: {
      todoListId: string
      pluginCount: number
      totalOperations: number
    }
  }> {
    // 重置停止标志
    if (this.checkStopRequested()) {
      console.log('🛑 检测到停止请求，终止任务生成')
      await this.forceCloseBrowser()
      return {
        success: false,
        message: '用户请求停止，任务生成已中断',
      }
    }

    console.log('开始生成插件任务列表')
    console.log(`搜索关键词: ${searchKeyword || '自动搜索HK/DD'}`)

    const todoListManager = TodoListManager.getInstance()

    try {
      const config = ConfigManager.loadConfig()
      const targetUrl = config.WEWORK_GROUP_MANAGEMENT_URL

      const page = await this.createPage()

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      )

      console.log(`导航到群聊管理页面: ${targetUrl}`)
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

      await this.wait(2000)

      // 检查是否请求停止
      if (this.checkStopRequested()) {
        console.log('🛑 检测到停止请求，终止任务生成')
        await this.forceCloseBrowser()
        return {
          success: false,
          message: '用户请求停止，任务生成已中断',
        }
      }

      // 收集群组信息并生成操作记录
      const collectResult = await this.collectValidGroups(page, searchKeyword)
      const pluginResults = collectResult.operations
      const pluginMetadata = collectResult.metadata

      if (Object.keys(pluginResults).length === 0) {
        return {
          success: false,
          message: '未找到任何群组，无操作需要执行',
        }
      }

      // 检查是否请求停止
      if (this.checkStopRequested()) {
        console.log('🛑 检测到停止请求，终止任务生成')
        await this.forceCloseBrowser()
        return {
          success: false,
          message: '用户请求停止，任务生成已中断',
        }
      }

      // 创建TodoList
      console.log('\n=== 创建TodoList ===')
      const todoList = await todoListManager.createTodoListFromGroupReplace(
        searchKeyword,
        pluginResults,
        pluginMetadata,
      )
      console.log(`TodoList已创建: ${todoList.id}`)

      // 计算总操作数
      const totalOperations = Object.values(pluginResults).reduce(
        (sum, operations) => sum + operations.length,
        0,
      )

      console.log(`=== 任务列表生成完成 ===`)
      console.log(`插件数量: ${Object.keys(pluginResults).length}`)
      console.log(`总操作数: ${totalOperations}`)

      return {
        success: true,
        message: `任务列表生成完成，包含 ${Object.keys(pluginResults).length} 个插件，共 ${totalOperations} 个操作`,
        data: {
          todoListId: todoList.id,
          pluginCount: Object.keys(pluginResults).length,
          totalOperations,
        },
      }
    } catch (error) {
      console.error('生成插件任务列表失败:', error)

      // 任务失败，关闭浏览器
      console.log('任务生成失败，关闭浏览器...')
      try {
        await this.forceCloseBrowser()
        console.log('浏览器已关闭')
      } catch (closeError) {
        console.error('关闭浏览器失败:', closeError)
      }

      return {
        success: false,
        message: `生成插件任务列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 执行单个插件任务
   * 基于TodoList中的插件信息执行具体操作
   */
  public async executePluginTask(
    pluginId: string,
    todoListId: string,
  ): Promise<{
    success: boolean
    message: string
    data?: {
      processedCount: number
      successCount: number
      failureCount: number
      operationRecords: GroupOperationRecord[]
    }
  }> {
    console.log(`开始执行插件任务: ${pluginId}`)

    const todoListManager = TodoListManager.getInstance()

    try {
      // 检查是否请求停止
      if (this.checkStopRequested()) {
        console.log('🛑 检测到停止请求，跳过插件执行')
        return {
          success: false,
          message: '用户请求停止，插件执行已中断',
        }
      }

      // 加载TodoList获取插件信息
      const todoList = await todoListManager.loadTodoList(todoListId)
      if (!todoList) {
        return {
          success: false,
          message: `TodoList不存在: ${todoListId}`,
        }
      }

      // 找到对应的插件项
      const pluginItem = todoList.items.find((item) => item.pluginId === pluginId)
      if (!pluginItem) {
        return {
          success: false,
          message: `插件不存在: ${pluginId}`,
        }
      }

      // 提取操作记录
      const operations = pluginItem.operationRecords || []
      if (operations.length === 0) {
        return {
          success: false,
          message: `插件 ${pluginId} 没有待执行的操作`,
        }
      }

      const config = ConfigManager.loadConfig()
      const targetUrl = config.WEWORK_GROUP_MANAGEMENT_URL

      const page = await this.createPage()

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      )

      console.log(`导航到群聊管理页面: ${targetUrl}`)
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

      await this.wait(2000)

      // 检查是否请求停止
      if (this.checkStopRequested()) {
        console.log('🛑 检测到停止请求，终止插件执行')
        await this.forceCloseBrowser()
        return {
          success: false,
          message: '用户请求停止，插件执行已中断',
        }
      }

      // 设置插件状态为进行中
      await todoListManager.updatePluginStatusOnly(todoListId, pluginId, TodoStatus.IN_PROGRESS)

      // 发送状态更新通知给主进程
      console.log(`🔄 PLUGIN_STATUS_UPDATE: ${todoListId} ${pluginId} in_progress`)

      // 执行插件操作
      console.log(`=== 处理插件 ${pluginId} (${operations.length} 个操作) ===`)

      const result = await this.processPluginOperationsWithoutStatusUpdate(
        page,
        pluginId,
        operations,
      )

      // 安全关闭页面，不让关闭失败影响状态更新
      try {
        console.log(`🔄 开始关闭插件 ${pluginId} 的页面`)
        await page.close()
        console.log(`✅ 插件 ${pluginId} 页面关闭成功`)
      } catch (closeError) {
        console.error(`⚠️ 插件 ${pluginId} 页面关闭失败（不影响状态更新）:`, closeError)
      }

      console.log(`🎯 插件 ${pluginId} 处理完成: 成功 ${result.success}, 失败 ${result.failures}`)

      // 根据执行结果更新插件状态 - 任何操作失败都标记整个插件失败
      if (result.failures === 0) {
        await todoListManager.updatePluginStatusOnly(todoListId, pluginId, TodoStatus.COMPLETED)
        console.log(`🔄 PLUGIN_STATUS_UPDATE: ${todoListId} ${pluginId} completed`)
        console.log(`✅ 插件 ${pluginId} 所有操作成功，标记为已完成`)
      } else {
        await todoListManager.updatePluginStatusOnly(
          todoListId,
          pluginId,
          TodoStatus.FAILED,
          `执行失败: 成功${result.success}个，失败${result.failures}个`,
        )
        console.log(`🔄 PLUGIN_STATUS_UPDATE: ${todoListId} ${pluginId} failed`)
        console.log(`❌ 插件 ${pluginId} 有操作失败，整个插件标记为失败并跳过`)
      }

      console.log(`✅ 插件状态已更新为最终状态`)

      const pluginResult = {
        success: result.failures === 0,
        message: `插件 ${pluginId} 执行完成: 成功 ${result.success}, 失败 ${result.failures}`,
        data: {
          processedCount: result.processed,
          successCount: result.success,
          failureCount: result.failures,
          operationRecords: result.records,
        },
      }

      console.log(`🚀 即将返回插件 ${pluginId} 执行结果:`, pluginResult.success ? '成功' : '失败')
      return pluginResult
    } catch (error) {
      console.error(`执行插件 ${pluginId} 失败:`, error)

      // 标记插件为失败状态
      try {
        await todoListManager.updatePluginStatusOnly(
          todoListId,
          pluginId,
          TodoStatus.FAILED,
          error instanceof Error ? error.message : '插件执行失败',
        )
        console.log(`🔄 PLUGIN_STATUS_UPDATE: ${todoListId} ${pluginId} failed`)
        console.log(`✓ 插件 ${pluginId} 状态已更新为FAILED`)
      } catch (updateError) {
        console.error('更新插件状态失败:', updateError)
      }

      return {
        success: false,
        message: `执行插件 ${pluginId} 失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 群码自动替换群功能
   * 基于参考项目的逻辑，自动搜索包含HK或DD关键字的群组，
   * 提取群名称和群主信息，处理群名称数字递增，删除现有群成员并新建群聊
   *
   * 重构为协调器模式：
   * - 先生成插件任务列表
   * - 再逐个执行插件任务
   */
  public async replaceGroupQrCode(options: GroupReplaceOptions = {}): Promise<AutomationResult> {
    const startTime = Date.now()
    const { searchKeyword = '' } = options

    console.log('开始群码自动替换功能（新架构）')
    console.log(`搜索关键词: ${searchKeyword || '自动搜索HK/DD'}`)

    try {
      // 阶段1: 生成插件任务列表
      console.log('\n=== 阶段1: 生成插件任务列表 ===')
      const generateResult = await this.generatePluginTaskList(searchKeyword)

      if (!generateResult.success) {
        return {
          success: false,
          message: generateResult.message,
          data: {
            searchKeyword,
            processedCount: 0,
            successCount: 0,
            failureCount: 0,
            executionTime: Date.now() - startTime,
            operationRecords: [],
            processedGroups: [],
            todoListId: null,
          } as GroupReplaceResultData & { todoListId: string | null },
        }
      }

      const { todoListId, pluginCount, totalOperations } = generateResult.data!
      console.log(`任务列表生成成功: ${pluginCount} 个插件，共 ${totalOperations} 个操作`)

      // 阶段2: 逐个执行插件任务
      console.log('\n=== 阶段2: 执行插件任务 ===')

      const todoListManager = TodoListManager.getInstance()
      const todoList = await todoListManager.loadTodoList(todoListId)

      if (!todoList) {
        return {
          success: false,
          message: `TodoList不存在: ${todoListId}`,
          data: {
            searchKeyword,
            processedCount: 0,
            successCount: 0,
            failureCount: 0,
            executionTime: Date.now() - startTime,
            operationRecords: [],
            processedGroups: [],
            todoListId,
          } as GroupReplaceResultData & { todoListId: string },
        }
      }

      const operationRecords: GroupOperationRecord[] = []
      let processedCount = 0
      let successCount = 0
      let failureCount = 0

      // 遍历每个插件并执行
      for (const pluginItem of todoList.items) {
        // 检查是否请求停止
        if (this.checkStopRequested()) {
          console.log('🛑 检测到停止请求，终止群码替换执行')
          // 关闭浏览器
          await this.forceCloseBrowser()
          return {
            success: false,
            message: '用户请求停止，群码替换已中断',
            data: {
              searchKeyword,
              processedCount,
              successCount,
              failureCount,
              executionTime: Date.now() - startTime,
              operationRecords,
              processedGroups: [],
              todoListId,
            } as GroupReplaceResultData & { todoListId: string },
          }
        }

        try {
          // 执行单个插件任务
          const pluginResult = await this.executePluginTask(pluginItem.pluginId, todoListId)

          if (pluginResult.success && pluginResult.data) {
            operationRecords.push(...pluginResult.data.operationRecords)
            processedCount += pluginResult.data.processedCount
            successCount += pluginResult.data.successCount
            failureCount += pluginResult.data.failureCount
          } else {
            // 插件执行失败，统计所有操作为失败
            failureCount += pluginItem.operationRecords?.length || 0
            console.error(`插件 ${pluginItem.pluginId} 执行失败: ${pluginResult.message}`)
          }
        } catch (error) {
          console.error(`执行插件 ${pluginItem.pluginId} 异常:`, error)
          failureCount += pluginItem.operationRecords?.length || 0
        }
      }

      console.log('\n=== 所有插件处理完成 ===')

      const executionTime = Date.now() - startTime
      console.log('\n=== 群码替换完成 ===')
      console.log(`耗时: ${executionTime}ms`)

      // 最终保存TodoList
      const finalTodoList = await todoListManager.loadTodoList(todoListId)
      if (finalTodoList) {
        finalTodoList.status = TodoStatus.COMPLETED
        await todoListManager.saveTodoList(finalTodoList)
      }

      // 任务完成，关闭浏览器
      console.log('群码替换任务完成，关闭浏览器...')
      await this.forceCloseBrowser()
      console.log('浏览器已关闭')

      return {
        success: true,
        message: `群码替换完成，处理 ${processedCount} 个操作，成功 ${successCount} 个，失败 ${failureCount} 个`,
        data: {
          searchKeyword,
          processedCount,
          successCount,
          failureCount,
          executionTime,
          operationRecords,
          processedGroups: [],
          todoListId,
        } as GroupReplaceResultData & { todoListId: string },
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      console.error('群码替换失败:', error)

      // 任务失败，关闭浏览器
      console.log('群码替换任务失败，关闭浏览器...')
      try {
        await this.forceCloseBrowser()
        console.log('浏览器已关闭')
      } catch (closeError) {
        console.error('关闭浏览器失败:', closeError)
      }

      return {
        success: false,
        message: `群码替换失败: ${error instanceof Error ? error.message : '未知错误'}`,
        data: {
          searchKeyword,
          processedCount: 0,
          successCount: 0,
          failureCount: 0,
          executionTime,
          operationRecords: [],
          processedGroups: [],
          todoListId: null,
        } as GroupReplaceResultData & { todoListId: string | null },
      }
    }
  }

  /**
   * 收集符合条件的群组信息
   * 新逻辑：检查DD/HK关键词和群人数，生成操作记录
   */
  private async collectValidGroups(
    page: puppeteer.Page,
    searchKeyword: string,
  ): Promise<{ operations: CollectGroupsResult; metadata: Record<string, { remarks?: string }> }> {
    console.log('使用网络请求监听方式收集群组信息...')

    // 使用base中的网络监听方法
    await this.setupNetworkInterception(page, false)

    // 构建搜索关键词
    const finalSearchKeyword = searchKeyword && searchKeyword.trim() !== '' ? searchKeyword : ''

    console.log(`搜索关键词: ${finalSearchKeyword}`)

    // 轮询所有页数，获取所有插件的变更操作
    let currentPage = 1
    const apiResponses: any[] = []
    let nextButton: puppeteer.ElementHandle | null = null

    do {
      console.log(`正在收集第 ${currentPage} 页数据...`)

      try {
        // 检查浏览器是否已关闭
        const browser = page.browser()
        if (!browser.connected) {
          console.log('浏览器已关闭，停止收集群组数据')
          break
        }

        // 检查页面是否已关闭
        if (page.isClosed()) {
          console.log('页面已关闭，停止收集群组数据')
          break
        }

        // 先设置Promise监听，再执行查询操作
        const apiResponsePromise = this.waitForApiResponse<any>(
          page,
          'chatGroup/listPlugin',
          10000,
          '群组列表',
        )

        // 执行搜索触发API调用
        currentPage === 1
          ? await this.performApiSearch(page, finalSearchKeyword)
          : await nextButton?.click()

        const apiResponse = await apiResponsePromise

        if (apiResponse?.data?.pluglist?.length > 0) {
          apiResponses.push(apiResponse)
          console.log(`第 ${currentPage} 页获取到 ${apiResponse.data.pluglist.length} 个插件`)
        } else {
          console.log(`第 ${currentPage} 页没有数据，结束收集`)
          break
        }
      } catch (error) {
        // 检查是否是页面已关闭相关的错误
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (
          errorMessage.includes('Target closed') ||
          errorMessage.includes('Session closed') ||
          errorMessage.includes('Connection closed') ||
          errorMessage.includes('Protocol error')
        ) {
          console.log('检测到页面或浏览器已关闭，停止收集群组数据')
          break
        }

        console.warn(`第 ${currentPage} 页API响应失败:`, errorMessage)
        break
      }

      // 检查是否有下一页，优化检查逻辑
      nextButton = await this.checkNextPage(page)
      if (!nextButton) {
        console.log(`已到达最后一页，共收集 ${currentPage} 页数据`)
        break
      }
      currentPage++
      await this.wait(2000) // 页面切换等待
    } while (true)

    const totalPlugins = apiResponses.reduce(
      (sum, res) => sum + (res?.data?.pluglist?.length || 0),
      0,
    )
    console.log(`分页收集完成，共 ${apiResponses.length} 页，总插件数: ${totalPlugins}`)

    if (apiResponses.length === 0) {
      console.warn('未收集到任何数据')
      return { operations: {}, metadata: {} }
    }

    // 按插件聚合操作记录
    const pluginOperations: Record<string, GroupOperationRecord[]> = {}
    const pluginMetadata: Record<string, { remarks?: string }> = {}

    // 处理收集到的API响应数据
    for (const responseData of apiResponses) {
      if (!responseData?.data?.pluglist) continue

      for (const plugin of responseData.data.pluglist) {
        // 从pluginfo获取基本信息
        const plugid = plugin.pluginfo?.plugid
        const remarks = plugin.pluginfo?.remarks
        if (!plugid) continue

        pluginOperations[plugid] = []
        pluginMetadata[plugid] = { remarks }

        // 从kfmember.roomids_detail获取群组详情
        const roomDetails = plugin.kfmember?.roomids_detail || []

        for (const room of roomDetails) {
          const roomname = room.roomname || ''
          const adminname = room.adminname || ''
          const roomId = room.roomid || ''

          // 获取更详细的群组信息（包含成员数量）
          const detailedGroupInfo = await this.getGroupChatDetails(page, roomId)
          const memberCount = detailedGroupInfo?.member_count || 0

          console.log(`检查群组: ${roomname} (成员数: ${memberCount})`)

          // 构建群组信息
          const groupInfo: GroupInfo = {
            title: roomname,
            adminInfo: adminname,
            roomId,
            memberCount,
          }

          // 执行新的判断逻辑
          const operationRecord = await this.determineGroupOperation(groupInfo)
          pluginOperations[plugid].push(operationRecord)

          console.log(
            `群组 ${roomname} 操作决定: ${operationRecord.operationType} - ${operationRecord.reason}`,
          )
        }

        // 判断删除操作和群数量相等则插入创建群聊操作
        const deleteOperations = pluginOperations[plugid].filter(
          (op) =>
            op.operationType === GroupOperationType.DELETE_BY_KEYWORD ||
            op.operationType === GroupOperationType.DELETE_BY_MEMBER_COUNT,
        )

        // 如果删除的群数量等于该插件的总群数量，添加一个创建操作
        if (deleteOperations.length === roomDetails.length && deleteOperations.length > 0) {
          console.log(
            `插件 ${plugid} 中删除群数 (${deleteOperations.length}) 等于总群数 (${roomDetails.length})，添加一个创建操作`,
          )

          // 使用最后一个删除的群组信息
          const lastDeletedGroup = deleteOperations[deleteOperations.length - 1]
          const title = this.processGroupTitle(lastDeletedGroup.groupInfo.title)
          const adminName = this.extractAdminName(lastDeletedGroup.groupInfo.adminInfo)

          const createOperation: GroupOperationRecord = {
            groupInfo: {
              title, // 使用删除群组的名称
              adminInfo: lastDeletedGroup.groupInfo.adminInfo, // 使用删除群组的群主信息
              roomId: undefined, // 新建群组还没有roomId
              memberCount: 0,
            },
            operationType: GroupOperationType.CREATE_NEW,
            reason: `由于插件所有群组都被删除，创建新的群组替换`,
          }
          pluginOperations[plugid].push(createOperation)

          console.log(`插件 ${plugid} 添加了一个创建群组操作，群名: ${title}, 群主: ${adminName}`)
        }
      }
    }

    const filteredPluginOperations = Object.fromEntries(
      Object.entries(pluginOperations)
        .map(([pluginId, operations]) => [
          pluginId,
          operations.filter((op) => op.operationType !== GroupOperationType.NO_ACTION),
        ])
        .filter(([pluginId, operations]) => operations.length),
    )

    console.log(`\n=== 群组分析完成 ===`)
    console.log(`需要操作的插件数: ${Object.keys(filteredPluginOperations).length}`)

    return { operations: filteredPluginOperations, metadata: pluginMetadata }
  }

  /**
   * 执行API搜索操作来触发网络请求
   */
  private async performApiSearch(page: puppeteer.Page, keyword: string): Promise<void> {
    try {
      console.log(`执行API搜索: ${keyword}`)

      // 等待页面加载
      await this.wait(2000)

      // 查找并填写搜索框
      await this.waitAndFill(
        page,
        '.qui_inputText.ww_inputText.ww_searchInput_text.js_cs_index_search_input',
        keyword,
        10000,
        '搜索输入框',
      )

      // 触发搜索
      await page.keyboard.press('Enter')
      await this.wait(3000) // 等待更长时间以确保API请求完成
      console.log(`API搜索完成: ${keyword}`)
    } catch (error) {
      console.warn('API搜索操作失败:', error)
      throw error
    }
  }

  /**
   * 确定群组应执行的操作
   * @param groupInfo 群组信息
   * @returns 操作记录
   */
  private async determineGroupOperation(groupInfo: GroupInfo): Promise<GroupOperationRecord> {
    const { title, memberCount } = groupInfo

    // 1. 检查是否包含DD/HK关键词
    if (this.containsKeywords(title)) {
      return {
        groupInfo,
        operationType: GroupOperationType.DELETE_BY_KEYWORD,
        reason: `群名包含关键词DD/HK/dd/hk: ${title}`,
      }
    }

    // 2. 检查群成员数量是否超过阈值
    const config = ConfigManager.loadConfig()
    const deleteThreshold = config.WEWORK_GROUP_MEMBER_DELETE_THRESHOLD || 100
    if (memberCount && memberCount >= deleteThreshold) {
      return {
        groupInfo,
        operationType: GroupOperationType.DELETE_BY_MEMBER_COUNT,
        reason: `群成员数量超过${deleteThreshold}人: ${memberCount}人`,
      }
    }

    // 3. 无需操作
    return {
      groupInfo,
      operationType: GroupOperationType.NO_ACTION,
      reason: `群组正常，无需操作 (成员数: ${memberCount || '未知'})`,
    }
  }

  /**
   * 检查群名是否包含DD/HK关键词
   */
  private containsKeywords(title: string): boolean {
    if (!title) return false
    const keywords = ['DD', 'HK', 'dd', 'hk']
    return keywords.some((keyword) => title.includes(keyword))
  }

  /**
   * 检查是否有下一页并点击（优化版本）
   */
  private async checkNextPage(
    page: puppeteer.Page,
  ): Promise<puppeteer.ElementHandle<Element> | null> {
    try {
      // 等待分页导航元素加载
      await page.waitForSelector('.ww_pageNav_info_arrowWrap.js_pager_nextPage', { timeout: 5000 })
      const nextButton = await page.$('.ww_pageNav_info_arrowWrap.js_pager_nextPage')
      if (!nextButton) {
        console.log('未找到下一页按钮')
        return null
      }

      const isDisabled = await page.evaluate((el) => {
        const htmlEl = el as HTMLElement
        return (
          (htmlEl.hasAttribute('disabled') && htmlEl.getAttribute('disabled') === 'disabled') ||
          htmlEl.classList.contains('disabled') ||
          htmlEl.style.display === 'none' ||
          htmlEl.style.visibility === 'hidden'
        )
      }, nextButton)

      if (!isDisabled) return nextButton

      console.log('下一页按钮已禁用')
      await nextButton.dispose()
      return null
    } catch (error) {
      console.warn('检查下一页失败:', error)
      return null
    }
  }

  /**
   * 处理群名称（将数字+1）
   * 参考原项目逻辑
   */
  private processGroupTitle(title: string): string {
    // 先截取"群"及前面的文字
    const groupIndex = title.indexOf('群')
    let processedTitle = title

    if (groupIndex !== -1) {
      processedTitle = title.substring(0, groupIndex + 1)
    }

    // 查找"群"前面的阿拉伯数字并+1
    const numberMatch = processedTitle.match(/(\d+)群/)
    if (numberMatch) {
      const currentNumber = parseInt(numberMatch[1])
      const newNumber = currentNumber + 1
      processedTitle = processedTitle.replace(/(\d+)群/, `${newNumber}群`)
    }

    return processedTitle
  }

  /**
   * 从管理员信息中提取群主名称
   */
  private extractAdminName(adminInfo: string): string {
    const prefix = '群主：'
    const index = adminInfo.indexOf(prefix)

    if (index !== -1) {
      return adminInfo.substring(index + prefix.length).trim()
    }

    return adminInfo.trim()
  }

  /**
   * 群码操作之修改新建群聊的通用逻辑
   * @param page 页面实例
   * @param groupName 群名称
   * @param adminName 群主名称
   * @param enableRetry 是否启用搜索重试机制，默认true
   * @param maxRetries 最大重试次数，默认5次
   */
  private async modifyAndCreateGroupChat(
    page: puppeteer.Page,
    groupName: string,
    adminName: string,
    enableRetry: boolean = true,
    maxRetries: number = 5,
  ): Promise<void> {
    console.log(`开始群码操作之修改新建群聊: 群名=${groupName}, 群主=${adminName}`)

    // 步骤1: 点击修改按钮
    console.log('\n=== 步骤1: 点击修改按钮 ===')
    await this.waitAndClick(
      page,
      '#js_csPlugin_index_create_wrap > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)',
      10000,
      '修改按钮',
    )
    await this.wait(1500) // 等待修改菜单展开

    // 步骤2: 点击新建群聊按钮
    console.log('\n=== 步骤2: 点击新建群聊按钮 ===')
    await this.waitAndClick(
      page,
      '#js_csPlugin_index_create_wrap > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > ul > li:nth-child(1) > a',
      10000,
      '新建群聊按钮',
    )
    await this.wait(2000) // 等待新建群聊弹框完全加载

    // 等待弹框出现
    await this.waitForElement(page, '#__dialog__MNDialog__', 10000, '新建群聊弹框')

    // 步骤3: 点击选择群主
    console.log('\n=== 步骤3: 选择群主 ===')
    await this.waitAndClick(
      page,
      '#__dialog__MNDialog__ > div > div:nth-child(2) > div > form > div > div > a',
      10000,
      '选择群主按钮',
    )
    await this.wait(3000) // 等待群主选择页面加载

    // 步骤4: 在搜索成员框输入助手名称（可选重试逻辑）
    console.log('\n=== 步骤4: 搜索助手 ===')

    if (enableRetry) {
      await this.searchMemberWithRetry(page, adminName, maxRetries)
    } else {
      // 直接搜索，无重试
      await this.waitAndFill(page, '#memberSearchInput', adminName, 10000, '成员搜索框')
      await this.wait(2000) // 等待搜索结果异步加载

      // 等待搜索结果出现
      await this.waitForElement(page, '#searchResult', 10000, '搜索结果')
    }

    // 步骤5: 点击第一个搜索项
    console.log('\n=== 步骤5: 选择搜索结果 ===')
    await this.waitAndClick(
      page,
      '#searchResult > ul > li > a > span:nth-child(1)',
      10000,
      '第一个搜索结果',
    )
    await this.wait(1000) // 等待选择状态更新

    // 步骤6: 点击确认按钮
    console.log('\n=== 步骤6: 确认群主选择 ===')
    await this.waitAndClick(page, '#footer_submit_btn', 10000, '确认按钮')
    await this.wait(2500) // 等待返回群创建页面并加载完成

    // 步骤7: 输入群名称
    console.log('\n=== 步骤7: 设置群名称 ===')
    console.log(`群名称: ${groupName}`)

    await this.waitAndFill(
      page,
      '#__dialog__MNDialog__ > div > div:nth-child(2) > div > form > div > input',
      groupName,
      10000,
      '群名称输入框',
    )
    await this.wait(1000) // 等待群名称输入完成并验证

    // 步骤8: 点击群名称确认按钮
    console.log('\n=== 步骤8: 确认群名称设置 ===')
    await this.waitAndClick(
      page,
      '#__dialog__MNDialog__ > div > div.qui_dialog_foot.ww_dialog_foot > a.qui_btn.ww_btn.ww_btn_Blue',
      10000,
      '群名称确认按钮',
    )
    await this.wait(3000) // 等待群名称确认并返回主配置页面

    console.log('✅ 群码操作之修改新建群聊完成')
  }

  /**
   * 搜索成员的重试逻辑
   * @param page 页面实例
   * @param memberName 成员名称
   * @param maxRetries 最大重试次数
   */
  private async searchMemberWithRetry(
    page: puppeteer.Page,
    memberName: string,
    maxRetries: number = 5,
  ): Promise<void> {
    let searchSuccess = false
    const retryDelay = 5000 // 5秒间隔

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 检查浏览器是否已关闭
        const browser = page.browser()
        if (!browser.connected) {
          console.log('浏览器已关闭，停止搜索成员')
          return
        }

        // 检查页面是否已关闭
        if (page.isClosed()) {
          console.log('页面已关闭，停止搜索成员')
          return
        }

        console.log(`🔄 第${attempt}/${maxRetries}次尝试搜索成员: ${memberName}`)

        // 输入成员名称
        await this.waitAndFill(page, '#memberSearchInput', memberName, 10000, '成员搜索框')
        await this.wait(2000) // 等待搜索结果异步加载

        // 等待搜索结果出现
        await this.waitForElement(page, '#searchResult', 10000, '搜索结果')

        // 检查是否有搜索结果
        const hasResults = await page.evaluate(() => {
          const searchResult = document.querySelector('#searchResult')
          return searchResult && searchResult.children.length > 0
        })

        if (hasResults) {
          console.log(`✅ 第${attempt}次尝试成功找到成员`)
          searchSuccess = true
          break
        } else {
          throw new Error('搜索结果为空')
        }
      } catch (error) {
        // 检查是否是页面已关闭相关的错误
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (
          errorMessage.includes('Target closed') ||
          errorMessage.includes('Session closed') ||
          errorMessage.includes('Connection closed') ||
          errorMessage.includes('Protocol error')
        ) {
          console.log('检测到页面或浏览器已关闭，停止搜索成员')
          return
        }

        console.warn(`⚠️ 第${attempt}次搜索成员失败:`, errorMessage)

        if (attempt < maxRetries) {
          console.log(`⏳ ${retryDelay / 1000}秒后进行第${attempt + 1}次重试...`)
          await this.wait(retryDelay)

          // 清空输入框准备重试
          try {
            await this.waitAndFill(page, '#memberSearchInput', '', 5000, '清空成员搜索框')
            await page.keyboard.press('Enter')
            await this.wait(2000)
          } catch (clearError) {
            console.warn('清空输入框失败:', clearError)
          }
        }
      }
    }

    if (!searchSuccess) {
      throw new Error(
        `搜索成员失败: 已重试${maxRetries}次仍无法找到成员"${memberName}"，请检查成员名称是否正确`,
      )
    }
  }

  /**
   * 添加新群聊（兼容旧接口）
   */
  private async addNewGroupChat(
    page: puppeteer.Page,
    groupName: string,
    adminName: string,
  ): Promise<void> {
    console.log('开始添加新群聊...')

    // 1. 点击添加按钮
    await this.waitAndClick(page, '.ww_groupSelBtn_add', 10000, '添加按钮')

    // 2. 等待下拉菜单
    await this.waitForElement(
      page,
      '.qui_dropdownMenu_itemLink.ww_dropdownMenu_itemLink',
      5000,
      '下拉菜单',
    )

    // 3. 点击新建群聊
    const newGroupOption = await page.$('.qui_dropdownMenu_itemLink.ww_dropdownMenu_itemLink')
    if (newGroupOption) {
      const optionText = await page.evaluate(
        (el) => (el as HTMLElement).innerText || el.textContent,
        newGroupOption,
      )
      if (optionText && optionText.includes('新建群聊')) {
        await newGroupOption.click()
        console.log('点击新建群聊选项')
      }
      await newGroupOption.dispose()
    }

    // 4. 等待新建群聊页面
    await this.waitForElement(page, '#memberSearchInput', 10000, '成员搜索框')

    // 5. 选择群主
    await this.selectGroupOwner(page, adminName)

    // 6. 设置群名称
    await this.setGroupName(page, groupName)

    console.log('新群聊添加完成')
  }

  /**
   * 选择群主
   */
  private async selectGroupOwner(page: puppeteer.Page, adminName: string): Promise<void> {
    console.log(`搜索并选择群主: ${adminName}`)

    // 搜索群主
    await this.waitAndFill(page, '#memberSearchInput', adminName, 10000, '成员搜索框')
    await this.wait(2000)

    // 等待搜索结果
    await this.waitForElement(page, '.ww_searchResult_title_peopleName', 10000, '搜索结果')

    // 点击第一个搜索结果
    await this.waitAndClick(page, '.ww_searchResult_title_peopleName', 10000, '搜索结果中的人名')
    await this.wait(1000)

    // 点击确认按钮
    await this.waitAndClick(page, '.qui_btn.ww_btn.ww_btn_Blue.js_submit', 10000, '确认按钮')
    await this.wait(2000)
  }

  /**
   * 设置群名称
   */
  private async setGroupName(page: puppeteer.Page, groupName: string): Promise<void> {
    console.log(`设置群名称: ${groupName}`)

    // 等待回到群聊创建页面
    await this.waitForElement(
      page,
      '.qui_inputText.ww_inputText.ww_inputText_Big.js_chatGroup_name',
      10000,
      '群名称输入框',
    )

    // 填写群名称
    await this.waitAndFill(
      page,
      '.qui_inputText.ww_inputText.ww_inputText_Big.js_chatGroup_name',
      groupName,
      10000,
      '群名称输入框',
    )

    await this.wait(1000)

    // 点击确认按钮
    await this.waitAndClick(
      page,
      '.qui_dialog_foot .qui_btn.ww_btn.ww_btn_Blue[d_ck="submit"]',
      10000,
      '确认按钮',
    )

    await this.wait(2000)
  }

  /**
   * 从插件中删除指定的群组
   * @param page 页面实例
   * @param operations 操作记录数组
   */
  private async deleteGroupsFromPlugin(
    page: puppeteer.Page,
    operations: GroupOperationRecord[],
  ): Promise<{
    processed: number
    success: number
    failures: number
    records: GroupOperationRecord[]
  }> {
    const groupsToDelete = operations.filter(
      (op) =>
        op.operationType === GroupOperationType.DELETE_BY_KEYWORD ||
        op.operationType === GroupOperationType.DELETE_BY_MEMBER_COUNT,
    )

    if (groupsToDelete.length === 0) {
      console.log('无需删除的群组')
      return {
        processed: 0,
        success: 0,
        failures: 0,
        records: [],
      }
    }

    const groupContainer =
      '#js_csPlugin_index_create_wrap > div.csPlugin_mod_main > div:nth-child(1) > div.csPlugin_mod_item_content > div.csPlugin_mod_chatGroups.js_chatGroup_groupList'

    console.log(`开始删除 ${groupsToDelete.length} 个群组`)

    const results: GroupOperationRecord[] = []
    let successCount = 0
    let failureCount = 0

    // 等待群组容器加载
    try {
      await this.waitForElement(page, groupContainer, 10000, '群组容器')
    } catch (error) {
      console.error('群组容器加载失败:', error)

      // 所有删除操作都失败
      return {
        processed: groupsToDelete.length,
        success: 0,
        failures: groupsToDelete.length,
        records: groupsToDelete.map((op) => ({
          ...op,
          success: false,
          error: '群组容器加载失败',
        })),
      }
    }

    for (const operation of groupsToDelete) {
      const { groupInfo } = operation
      const { roomId, title } = groupInfo

      try {
        console.log(`删除群组: ${title} (roomId: ${roomId})`)

        if (!roomId) {
          throw new Error('缺少群组roomId')
        }

        // 构建选择器：在群组容器中查找具有指定data-roomid的元素，然后找删除按钮
        const deleteButtonSelector = `${groupContainer} > div[data-roomid="${roomId}"] > i`

        // 复用base中的waitAndClick方法
        await this.waitAndClick(page, deleteButtonSelector, 10000, `群组 ${title} 删除按钮`)

        // 等待删除操作完成
        await this.wait(1000)

        // 复用base中的方法验证群组是否已被删除
        const isDeleted = await this.waitForSelectorDisappear(page, deleteButtonSelector, 2000)
        if (isDeleted) {
          console.log(`✓ 群组 ${title} 删除成功`)
        } else {
          console.warn(`群组 ${title} 可能未完全删除`)
        }

        results.push({
          ...operation,
          success: true,
        })
        successCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '删除失败'
        console.error(`删除群组 ${title} 失败:`, errorMessage)

        results.push({
          ...operation,
          success: false,
          error: errorMessage,
        })
        failureCount++
      }
    }

    console.log(`群组删除完成: 成功 ${successCount}, 失败 ${failureCount}`)

    return {
      processed: groupsToDelete.length,
      success: successCount,
      failures: failureCount,
      records: results,
    }
  }

  /**
   * 向插件添加新群组（根据创建操作）
   * @param page 页面实例
   * @param operations 操作记录数组
   */
  private async addGroupsToPlugin(
    page: puppeteer.Page,
    operations: GroupOperationRecord[],
  ): Promise<{
    processed: number
    success: number
    failures: number
    records: GroupOperationRecord[]
  }> {
    // 找到需要新建群组的操作（CREATE_NEW 类型）
    const createOperations = operations.filter(
      (op) => op.operationType === GroupOperationType.CREATE_NEW,
    )

    if (createOperations.length === 0) {
      console.log('无需新建群组')
      return {
        processed: 0,
        success: 0,
        failures: 0,
        records: [],
      }
    }

    console.log(`开始新建群组，创建操作数: ${createOperations.length}`)

    // 由于一个插件只有一个创建操作，直接处理第一个
    const operation = createOperations[0]
    const { groupInfo } = operation

    // 从创建操作的groupInfo中获取群名和群主信息
    const groupTitle = groupInfo.title
    const adminName = this.extractAdminName(groupInfo.adminInfo)

    console.log(`执行创建操作: 群名 "${groupTitle}", 群主: ${adminName}`)

    try {
      // 复用现有的新建群聊逻辑
      await this.modifyAndCreateGroupChat(page, groupTitle, adminName)

      const successRecord: GroupOperationRecord = {
        groupInfo,
        operationType: GroupOperationType.CREATE_NEW,
        reason: `成功新建群组 "${groupTitle}"`,
        success: true,
      }

      console.log(`✓ 新群组 "${groupTitle}" 创建成功`)

      return {
        processed: 1,
        success: 1,
        failures: 0,
        records: [successRecord],
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '新建群组失败'
      console.error(`新建群组失败:`, errorMessage)

      const failureRecord: GroupOperationRecord = {
        groupInfo,
        operationType: GroupOperationType.CREATE_NEW,
        reason: `新建群组失败: ${errorMessage}`,
        success: false,
        error: errorMessage,
      }

      return {
        processed: 1,
        success: 0,
        failures: 1,
        records: [failureRecord],
      }
    }
  }

  /**
   * 保存插件变更
   * @param page 页面实例
   */
  private async savePluginChanges(page: puppeteer.Page): Promise<void> {
    try {
      console.log('保存插件变更...')

      // 查找保存按钮（参考现有的保存逻辑）
      const saveButtonSelectors = [
        '.csPlugin_mod_item_opt .qui_btn.ww_btn.ww_btn_Blue.js_save_form', // 主要保存按钮选择器
        '.qui_btn.ww_btn.ww_btn_Blue.js_save_form', // 备用选择器
        '[class*="js_save_form"]', // 更通用的保存按钮选择器
        '.ww_btn_Blue', // 最通用的蓝色按钮选择器
      ]

      let saveSuccess = false
      let lastError: Error | null = null

      // 尝试不同的保存按钮选择器
      for (const selector of saveButtonSelectors) {
        try {
          console.log(`尝试使用选择器: ${selector}`)

          await this.waitForElement(page, selector, 5000, `保存按钮 (${selector})`)
          await this.waitAndClick(page, selector, 10000, `保存按钮 (${selector})`)

          saveSuccess = true
          console.log(`✓ 成功点击保存按钮: ${selector}`)
          break
        } catch (error) {
          console.warn(`保存按钮选择器 ${selector} 失败:`, error)
          lastError = error instanceof Error ? error : new Error('未知错误')
          continue
        }
      }

      if (!saveSuccess) {
        throw new Error(`所有保存按钮选择器都失败。最后的错误: ${lastError?.message}`)
      }

      // 等待保存操作完成
      console.log('等待保存操作完成...')
      await this.wait(3000)

      // 检查是否有保存成功的指示
      try {
        // 等待页面跳转或确认保存成功
        await Promise.race([
          // 等待可能的页面跳转
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => null),
          // 等待特定的成功提示（如果有）
          page
            .waitForSelector('.success, .toast-success, [class*="success"]', { timeout: 5000 })
            .catch(() => null),
          // 简单的时间等待作为后备
          this.wait(5000),
        ])

        console.log('✓ 插件变更保存完成')
      } catch (waitError) {
        console.warn('保存完成检查失败，但保存操作可能已成功:', waitError)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      console.error('保存插件变更失败:', errorMessage)
      throw new Error(`保存插件变更失败: ${errorMessage}`)
    }
  }

  /**
   * 获取群聊详细信息
   * 通过企微API获取群聊的详细数据
   * @param page 页面实例
   * @param roomId 群聊房间ID
   * @returns 群聊详细信息或null
   */
  private async getGroupChatDetails(page: puppeteer.Page, roomId: string): Promise<any | null> {
    try {
      console.log(`获取群聊详细信息，房间ID: ${roomId}`)

      // 添加1秒内随机等待时间，避免请求过于频繁
      const randomWaitTime = Math.floor(Math.random() * 1000) // 0-1000毫秒 (0-1秒)
      console.log(`随机等待 ${randomWaitTime}ms`)
      await this.wait(randomWaitTime)

      // 生成随机数
      const random = Math.random()

      // 构建API URL
      const apiUrl = new URL('https://work.weixin.qq.com/wework_admin/customer/getGroupChatList')
      apiUrl.searchParams.set('lang', 'zh_CN')
      apiUrl.searchParams.set('f', 'json')
      apiUrl.searchParams.set('ajax', '1')
      apiUrl.searchParams.set('timeZoneInfo[zone_offset]', '-8')
      apiUrl.searchParams.set('random', random.toString())
      apiUrl.searchParams.set('roomids[]', roomId)

      console.log(`构建的API URL: ${apiUrl.toString()}`)

      // 使用页面的evaluate方法发送请求，确保cookies被正确携带
      const response = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include', // 确保携带cookies
            headers: {
              Accept: 'application/json, text/javascript, */*; q=0.01',
              'X-Requested-With': 'XMLHttpRequest',
              'User-Agent': navigator.userAgent,
              Referer: window.location.href,
            },
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()
          return { success: true, data }
        } catch (error: any) {
          return {
            success: false,
            error: error.message || '请求失败',
          }
        }
      }, apiUrl.toString())

      if (!response.success) {
        console.error(`获取群聊详细信息失败: ${response.error}`)
        return null
      }

      const responseData = response.data
      console.log('API响应数据:', JSON.stringify(responseData, null, 2))

      // 解析响应数据
      if (responseData && responseData.data && responseData.data.datalist) {
        const datalist = responseData.data.datalist
        if (datalist.length > 0) {
          const groupInfo = datalist[0] // 取第一个群组信息
          console.log(`✓ 成功获取群聊详细信息: ${groupInfo.roomname || groupInfo.new_room_name}`)
          return groupInfo
        }
      }

      console.warn('API响应中未找到群组数据')
      return null
    } catch (error) {
      console.error('获取群聊详细信息时发生错误:', error)
      return null
    }
  }

  private async processPluginOperationsWithoutStatusUpdate(
    page: puppeteer.Page,
    pluginId: string,
    operations: GroupOperationRecord[],
  ): Promise<{
    processed: number
    success: number
    failures: number
    records: GroupOperationRecord[]
  }> {
    try {
      console.log(`开始处理插件 ${pluginId}`)

      // 检查是否请求停止
      if (this.checkStopRequested()) {
        console.log(`🛑 检测到停止请求，跳过插件 ${pluginId} 的处理`)
        throw new Error('用户请求停止')
      }

      // 1. 跳转到插件编辑页面
      const editUrl = `https://work.weixin.qq.com/wework_admin/frame#chatGroup/edit/${pluginId}`
      console.log(`跳转到插件编辑页面: ${editUrl}`)

      await page.goto(editUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      await this.wait(3000) // 等待页面完全加载

      // 2. 执行删除操作 - 快速失败检查
      console.log(`🔄 开始执行删除操作...`)
      const deleteResult = await this.deleteGroupsFromPluginWithoutStatusUpdate(page, operations)

      // 检查是否需要快速失败（关键操作失败）
      if (deleteResult.criticalFailure) {
        console.log(`❌ 删除操作遇到致命错误，终止插件任务: ${deleteResult.criticalError}`)
        throw new Error(`关键操作失败: ${deleteResult.criticalError}`)
      }

      // 3. 如果需要，执行新建群组操作 - 快速失败检查
      console.log(`🔄 开始执行添加操作...`)
      const addResult = await this.addGroupsToPluginWithoutStatusUpdate(page, operations)

      // 检查是否需要快速失败（关键操作失败）
      if (addResult.criticalFailure) {
        console.log(`❌ 添加操作遇到致命错误，终止插件任务: ${addResult.criticalError}`)
        throw new Error(`关键操作失败: ${addResult.criticalError}`)
      }

      // 4. 保存插件变更 - 关键步骤，失败应终止
      console.log(`🔄 开始保存插件变更...`)
      try {
        await this.savePluginChanges(page)
        console.log(`✅ 插件变更保存成功`)
      } catch (saveError) {
        console.log(`❌ 保存插件变更失败，终止任务: ${saveError}`)
        throw new Error(
          `保存插件失败: ${saveError instanceof Error ? saveError.message : '未知错误'}`,
        )
      }

      // 5. 合并操作结果
      const allRecords = [...deleteResult.records, ...addResult.records]
      const totalProcessed = deleteResult.processed + addResult.processed
      const totalSuccess = deleteResult.success + addResult.success
      const totalFailures = deleteResult.failures + addResult.failures

      console.log(
        `插件 ${pluginId} 处理完成: 总计 ${totalProcessed}, 成功 ${totalSuccess}, 失败 ${totalFailures}`,
      )

      return {
        processed: totalProcessed,
        success: totalSuccess,
        failures: totalFailures,
        records: allRecords,
      }
    } catch (error) {
      console.error(`处理插件 ${pluginId} 时发生错误:`, error)

      // 将所有操作标记为失败并返回
      const failedRecords = operations.map((op) => ({
        ...op,
        success: false,
        error: error instanceof Error ? error.message : '插件处理失败',
      }))

      return {
        processed: operations.length,
        success: 0,
        failures: operations.length,
        records: failedRecords,
      }
    }
  }

  /**
   * 简化版删除群组操作 - 不更新状态
   */
  private async deleteGroupsFromPluginWithoutStatusUpdate(
    page: puppeteer.Page,
    operations: GroupOperationRecord[],
  ): Promise<{
    processed: number
    success: number
    failures: number
    records: GroupOperationRecord[]
    criticalFailure?: boolean
    criticalError?: string
  }> {
    const deleteOperations = operations.filter(
      (op) => op.operationType === GroupOperationType.DELETE_BY_MEMBER_COUNT,
    )

    if (deleteOperations.length === 0) {
      console.log('无需删除群组')
      return { processed: 0, success: 0, failures: 0, records: [], criticalFailure: false }
    }

    console.log(`开始删除 ${deleteOperations.length} 个群组`)

    const groupContainer =
      '#js_csPlugin_index_create_wrap > div.csPlugin_mod_main > div:nth-child(1) > div.csPlugin_mod_item_content > div.csPlugin_mod_chatGroups.js_chatGroup_groupList'

    // 关键操作：等待群组容器，失败则为致命错误
    try {
      await this.waitForElement(page, groupContainer, 10000, '群组容器')
    } catch (containerError) {
      console.error(`❌ 致命错误 - 无法找到群组容器:`, containerError)
      return {
        processed: deleteOperations.length,
        success: 0,
        failures: deleteOperations.length,
        records: [],
        criticalFailure: true,
        criticalError: `无法找到群组容器: ${containerError instanceof Error ? containerError.message : '未知错误'}`,
      }
    }

    const results: GroupOperationRecord[] = []
    let successCount = 0
    let failureCount = 0

    for (const operation of deleteOperations) {
      try {
        const { roomId, title } = operation.groupInfo
        console.log(`删除群组: ${title} (roomId: ${roomId})`)

        const deleteButtonSelector = `${groupContainer} > div[data-roomid="${roomId}"] > i`

        try {
          await this.waitForElement(page, deleteButtonSelector, 2000, `群组 ${title} 删除按钮`)
          await page.click(deleteButtonSelector)
          console.log(`✓ 群组 ${title} 删除成功`)

          results.push({
            ...operation,
            success: true,
          })
          successCount++
        } catch (clickError) {
          console.log(`✗ 群组 ${title} 删除按钮未找到或点击失败`)
          results.push({
            ...operation,
            success: false,
            error: '删除按钮未找到或点击失败',
          })
          failureCount++
        }
      } catch (error) {
        console.error(`删除群组失败:`, error)
        results.push({
          ...operation,
          success: false,
          error: error instanceof Error ? error.message : '删除失败',
        })
        failureCount++
      }
    }

    console.log(`群组删除完成: 成功 ${successCount}, 失败 ${failureCount}`)
    return {
      processed: deleteOperations.length,
      success: successCount,
      failures: failureCount,
      records: results,
      criticalFailure: false,
    }
  }

  /**
   * 简化版添加群组操作 - 不更新状态
   */
  private async addGroupsToPluginWithoutStatusUpdate(
    page: puppeteer.Page,
    operations: GroupOperationRecord[],
  ): Promise<{
    processed: number
    success: number
    failures: number
    records: GroupOperationRecord[]
    criticalFailure?: boolean
    criticalError?: string
  }> {
    const addOperations = operations.filter(
      (op) => op.operationType === GroupOperationType.CREATE_NEW,
    )

    if (addOperations.length === 0) {
      console.log('无需创建新群组')
      return { processed: 0, success: 0, failures: 0, records: [], criticalFailure: false }
    }

    console.log(`开始新建群组，创建操作数: ${addOperations.length}`)

    const results: GroupOperationRecord[] = []
    let successCount = 0
    let failureCount = 0

    for (const operation of addOperations) {
      try {
        const { title: groupTitle, adminInfo: adminName } = operation.groupInfo
        console.log(`执行创建操作: 群名 "${groupTitle}", 群主: ${adminName}`)

        await this.modifyAndCreateGroupChat(page, groupTitle, adminName)

        console.log(`✓ 新群组 "${groupTitle}" 创建成功`)

        results.push({
          ...operation,
          success: true,
        })
        successCount++
      } catch (error) {
        console.error(`创建群组失败:`, error)
        results.push({
          ...operation,
          success: false,
          error: error instanceof Error ? error.message : '创建失败',
        })
        failureCount++
      }
    }

    console.log(`群组创建完成: 成功 ${successCount}, 失败 ${failureCount}`)
    return {
      processed: addOperations.length,
      success: successCount,
      failures: failureCount,
      records: results,
      criticalFailure: false,
    }
  }
}

// ;(async function () {
//   const instance = WeworkManager.getInstance()
//   await instance.checkWeWorkLogin()
//   // await instance.changeContactInfo({
//   //   mobile: '13052828856',
//   //   storeType: '店中店',
//   //   storeName: '楠子1店',
//   // })
//   // await instance.createGroupLiveCode({
//   //   storeName: '楠子1店',
//   //   storeType: '店中店',
//   //   assistant: '侧耳',
//   // })

//   // 测试群码替换功能
//   // await instance.replaceGroupQrCode({
//   //   searchKeyword: '凡铭', // 空字符串表示搜索HK/DD
//   // })

//   // await instance.forceCloseBrowser()
// })()
