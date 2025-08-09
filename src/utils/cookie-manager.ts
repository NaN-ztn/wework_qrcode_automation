import * as fs from 'fs'
import * as path from 'path'
import * as puppeteer from 'puppeteer'
import { ConfigManager } from './config-manager'

export interface StoredCookie {
  name: string
  value: string
  domain: string
  path: string
  expires?: number
  httpOnly: boolean
  secure: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

export interface CookieSnapshot {
  timestamp: string
  url: string
  cookies: StoredCookie[]
}

export interface MultipleCookieSnapshot {
  timestamp: string
  allCookies: StoredCookie[]
  sources: { url: string; cookieCount: number }[]
}

export class CookieManager {
  private static readonly COOKIE_FILE = 'cookies.json'

  /**
   * 获取Cookie存储文件路径
   */
  private static getCookieFilePath(): string {
    const config = ConfigManager.loadConfig()
    return path.join(config.USER_DATA_DIR, this.COOKIE_FILE)
  }

  /**
   * 保存所有域的Cookie到文件
   */
  public static async saveCookies(page: puppeteer.Page, url: string): Promise<boolean> {
    try {
      console.log('开始保存所有域的Cookie到文件...')

      // 获取所有域的cookies（不限制URL）
      const cookies = await page.cookies()

      // 转换为可存储的格式
      const storedCookies: StoredCookie[] = cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
      }))

      // 创建快照
      const snapshot: CookieSnapshot = {
        timestamp: new Date().toISOString(),
        url,
        cookies: storedCookies,
      }

      // 确保目录存在
      const filePath = this.getCookieFilePath()
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // 写入文件
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2))

      console.log(`✅ 已保存 ${storedCookies.length} 个重要cookies 到 ${filePath}`)

      // 显示保存的cookie信息
      if (storedCookies.length > 0) {
        console.log('保存的cookies:')
        storedCookies.forEach((cookie) => {
          console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 30)}... (${cookie.domain})`)
        })
      }

      return true
    } catch (error) {
      console.error('保存Cookie失败:', error)
      return false
    }
  }

  /**
   * 从文件恢复Cookie到页面
   */
  public static async restoreCookies(page: puppeteer.Page): Promise<boolean> {
    try {
      const filePath = this.getCookieFilePath()

      if (!fs.existsSync(filePath)) {
        console.log('未找到Cookie文件，跳过恢复')
        return false
      }

      console.log('开始从文件恢复Cookie...')

      // 读取cookie文件
      const content = fs.readFileSync(filePath, 'utf8')
      const snapshot: CookieSnapshot = JSON.parse(content)

      console.log(
        `发现cookie快照，时间: ${snapshot.timestamp}，包含 ${snapshot.cookies.length} 个cookies`,
      )

      // 设置cookies到页面
      for (const cookie of snapshot.cookies) {
        try {
          await page.setCookie({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expires,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite,
          })
          console.log(`  ✅ 恢复cookie: ${cookie.name}`)
        } catch (cookieError) {
          console.warn(`  ⚠️  恢复cookie失败: ${cookie.name} - ${cookieError}`)
        }
      }

      console.log('✅ Cookie恢复完成')
      return true
    } catch (error) {
      console.error('恢复Cookie失败:', error)
      return false
    }
  }

  /**
   * 检查Cookie文件是否存在且有效
   */
  public static hasSavedCookies(): boolean {
    const filePath = this.getCookieFilePath()

    if (!fs.existsSync(filePath)) {
      return false
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const snapshot: CookieSnapshot = JSON.parse(content)

      // 检查是否有有效的cookies
      const now = Date.now() / 1000
      const validCookies = snapshot.cookies.filter((cookie) => {
        return !cookie.expires || cookie.expires > now
      })

      return validCookies.length > 0
    } catch (error) {
      console.error('检查Cookie文件失败:', error)
      return false
    }
  }

  /**
   * 清除保存的Cookie文件
   */
  public static clearSavedCookies(): boolean {
    try {
      const filePath = this.getCookieFilePath()
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log('已清除保存的Cookie文件')
        return true
      }
      return false
    } catch (error) {
      console.error('清除Cookie文件失败:', error)
      return false
    }
  }

  /**
   * 保存多个页面的合并Cookie
   */
  public static async saveAllCookies(pages: any[]): Promise<boolean> {
    try {
      console.log('开始保存所有页面的Cookie到文件...')

      const allCookies: StoredCookie[] = []
      const sources: { url: string; cookieCount: number }[] = []
      const seenCookies = new Set<string>()

      // 从所有页面收集Cookie
      for (const page of pages) {
        try {
          const url = page.url()
          if (!url || url === 'about:blank') continue

          const cookies = await page.cookies()
          let uniqueCount = 0

          cookies.forEach((cookie: any) => {
            // 使用域名+名称+路径作为唯一标识，避免重复
            const cookieKey = `${cookie.domain}|${cookie.name}|${cookie.path}`
            if (!seenCookies.has(cookieKey)) {
              seenCookies.add(cookieKey)
              allCookies.push({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                expires: cookie.expires,
                httpOnly: cookie.httpOnly,
                secure: cookie.secure,
                sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
              })
              uniqueCount++
            }
          })

          if (uniqueCount > 0) {
            sources.push({ url, cookieCount: uniqueCount })
          }
        } catch (pageError) {
          console.warn(`获取页面 ${page.url()} 的Cookie失败:`, pageError)
        }
      }

      // 创建合并后的快照
      const snapshot: MultipleCookieSnapshot = {
        timestamp: new Date().toISOString(),
        allCookies,
        sources,
      }

      // 确保目录存在
      const filePath = this.getCookieFilePath()
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // 写入文件
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2))

      console.log(
        `✅ 已保存来自 ${sources.length} 个页面的 ${allCookies.length} 个去重Cookie 到 ${filePath}`,
      )

      // 显示详细信息
      console.log('Cookie来源详情:')
      sources.forEach((source) => {
        console.log(`  - ${source.url}: ${source.cookieCount} 个Cookie`)
      })

      // 按域名统计
      const domainStats = new Map<string, number>()
      allCookies.forEach((cookie) => {
        domainStats.set(cookie.domain, (domainStats.get(cookie.domain) || 0) + 1)
      })

      console.log('按域名统计:')
      domainStats.forEach((count, domain) => {
        console.log(`  - ${domain}: ${count} 个Cookie`)
      })

      return true
    } catch (error) {
      console.error('保存合并Cookie失败:', error)
      return false
    }
  }

  /**
   * 从合并的Cookie文件恢复Cookie到页面
   */
  public static async restoreAllCookies(page: any): Promise<boolean> {
    try {
      const filePath = this.getCookieFilePath()

      if (!fs.existsSync(filePath)) {
        console.log('未找到Cookie文件，跳过恢复')
        return false
      }

      console.log('开始从文件恢复所有域的Cookie...')

      // 读取cookie文件
      const content = fs.readFileSync(filePath, 'utf8')
      const data = JSON.parse(content)

      // 兼容旧格式和新格式
      const cookies = data.allCookies || data.cookies || []

      if (!cookies.length) {
        console.log('Cookie文件为空，跳过恢复')
        return false
      }

      console.log(`发现cookie快照，时间: ${data.timestamp}，包含 ${cookies.length} 个cookies`)

      // 设置cookies到页面
      let successCount = 0
      for (const cookie of cookies) {
        try {
          await page.setCookie({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expires,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite,
          })
          successCount++
        } catch (cookieError) {
          console.warn(`  ⚠️  恢复cookie失败: ${cookie.name}@${cookie.domain} - ${cookieError}`)
        }
      }

      console.log(`✅ Cookie恢复完成，成功恢复 ${successCount}/${cookies.length} 个Cookie`)
      return true
    } catch (error) {
      console.error('恢复Cookie失败:', error)
      return false
    }
  }

  /**
   * 检查合并Cookie文件是否存在且有效
   */
  public static hasAllSavedCookies(): boolean {
    const filePath = this.getCookieFilePath()

    if (!fs.existsSync(filePath)) {
      return false
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const data = JSON.parse(content)

      // 兼容新旧格式
      const cookies = data.allCookies || data.cookies || []

      // 检查是否有有效的cookies
      const now = Date.now() / 1000
      const validCookies = cookies.filter((cookie: any) => {
        return !cookie.expires || cookie.expires > now
      })

      return validCookies.length > 0
    } catch (error) {
      console.error('检查Cookie文件失败:', error)
      return false
    }
  }

  /**
   * 获取保存的Cookie信息
   */
  public static getSavedCookiesInfo(): CookieSnapshot | MultipleCookieSnapshot | null {
    try {
      const filePath = this.getCookieFilePath()
      if (!fs.existsSync(filePath)) {
        return null
      }

      const content = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      console.error('读取Cookie信息失败:', error)
      return null
    }
  }
}
