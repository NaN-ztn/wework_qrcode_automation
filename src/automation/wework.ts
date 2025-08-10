import * as puppeteer from 'puppeteer'
import * as fs from 'fs'
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
        return {
          success: true,
          message: '已登录企微',
          data: loginData,
        }
      }

      // 搜索框
      const searchInputXpath = '//*[@id="memberSearchInput"]'
      const res = await this.waitForElementByXPath(page, searchInputXpath, 3000000)

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
      const processedStoreName = this.processStoreName(param.storeName)
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
      } else {
        console.log('跳过头像更新(非店中店类型)')
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
   * 处理门店名称 - 如果最后一个字不是"店"则添加"店"字
   */
  private processStoreName(storeName: string): string {
    if (!storeName) return storeName

    const trimmedName = storeName.trim()
    if (trimmedName.endsWith('店')) {
      return trimmedName
    } else {
      return trimmedName + '店'
    }
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
}

// ;(async function () {
//   const instance = WeworkManager.getInstance()
//   await instance.checkWeWorkLogin()
//   await instance.changeContactInfo({
//     mobile: '13052828856',
//     storeName: '楠子1',
//     storeType: '店中店',
//   })
// })()
