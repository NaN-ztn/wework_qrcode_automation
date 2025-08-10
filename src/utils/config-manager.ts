import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface AppConfig {
  // 基本配置
  APP_NAME: string

  // 自动化配置
  WEWORK_CONTACT_URL: string
  USER_DATA_DIR: string
  STORE_AVATAR_PATH: string
}

export class ConfigManager {
  private static readonly CONFIG_FILE = path.join(process.cwd(), '.env')
  private static readonly EXAMPLE_FILE = path.join(process.cwd(), '.env.example')
  private static config: AppConfig | null = null

  /**
   * 获取默认配置
   */
  private static getDefaultConfig(): AppConfig {
    return {
      // 基本配置
      APP_NAME: '企业微信二维码自动化工具',

      // 自动化配置
      WEWORK_CONTACT_URL: 'https://work.weixin.qq.com/wework_admin/frame#/contacts',
      USER_DATA_DIR: path.join(os.homedir(), '.wework-automation', 'chrome-data'),
      STORE_AVATAR_PATH: path.join(process.cwd(), 'assets', 'store_avatar.PNG'),
    }
  }

  /**
   * 解析环境变量值
   */
  private static parseEnvValue(key: string, value: string, defaultValue: any): any {
    if (!value || value.trim() === '') {
      return defaultValue
    }

    // 处理路径相关配置，支持 ~ 符号
    if (key === 'USER_DATA_DIR' || key === 'STORE_AVATAR_PATH') {
      return value.startsWith('~') ? path.join(os.homedir(), value.slice(1)) : value
    }

    // 处理字符串
    return value
  }

  /**
   * 从.env文件加载配置
   */
  private static loadEnvFile(): Record<string, string> {
    const envData: Record<string, string> = {}

    if (!fs.existsSync(this.CONFIG_FILE)) {
      return envData
    }

    try {
      const content = fs.readFileSync(this.CONFIG_FILE, 'utf8')
      const lines = content.split('\n')

      for (const line of lines) {
        const trimmedLine = line.trim()

        // 跳过空行和注释
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue
        }

        const equalIndex = trimmedLine.indexOf('=')
        if (equalIndex === -1) {
          continue
        }

        const key = trimmedLine.substring(0, equalIndex).trim()
        const value = trimmedLine.substring(equalIndex + 1).trim()

        envData[key] = value
      }
    } catch (error) {
      console.error('读取.env文件失败:', error)
    }

    return envData
  }

  /**
   * 加载配置
   */
  public static loadConfig(): AppConfig {
    if (this.config) {
      return this.config
    }

    console.log('=== ConfigManager: 开始加载配置 ===')
    console.log('配置文件路径:', this.CONFIG_FILE)
    console.log('配置文件是否存在:', fs.existsSync(this.CONFIG_FILE))

    const defaultConfig = this.getDefaultConfig()
    console.log('默认配置:', JSON.stringify(defaultConfig, null, 2))

    const envData = this.loadEnvFile()
    console.log('环境文件数据:', JSON.stringify(envData, null, 2))

    // 合并配置
    const config: any = {}
    for (const [key, defaultValue] of Object.entries(defaultConfig)) {
      const parsedValue = this.parseEnvValue(key, envData[key], defaultValue)
      config[key] = parsedValue
      console.log(`配置项 ${key}: ${envData[key]} -> ${parsedValue}`)
    }

    this.config = config as AppConfig
    console.log('最终配置:', JSON.stringify(this.config, null, 2))
    return this.config
  }

  /**
   * 保存配置到.env文件
   */
  public static async saveConfig(config: AppConfig): Promise<boolean> {
    try {
      const lines: string[] = [
        '# 企业微信二维码自动化工具 - 环境配置文件',
        '# 此文件由应用自动生成，请谨慎手动修改',
        '',
        '# ==================== 基本配置 ====================',
      ]

      // 基本配置
      lines.push(`APP_NAME=${config.APP_NAME}`)
      lines.push('')

      // 自动化配置
      lines.push('# ==================== 自动化配置 ====================')
      lines.push(`WEWORK_CONTACT_URL=${config.WEWORK_CONTACT_URL}`)
      lines.push(`USER_DATA_DIR=${config.USER_DATA_DIR}`)
      lines.push(`STORE_AVATAR_PATH=${config.STORE_AVATAR_PATH}`)

      await fs.promises.writeFile(this.CONFIG_FILE, lines.join('\n'), 'utf8')
      console.log(`配置文件已保存到: ${this.CONFIG_FILE}`)

      // 重置缓存的配置
      this.config = null

      return true
    } catch (error) {
      console.error('保存配置文件失败:', error)
      return false
    }
  }

  /**
   * 检查配置文件是否存在
   */
  public static configExists(): boolean {
    return fs.existsSync(this.CONFIG_FILE)
  }

  /**
   * 创建初始配置文件
   */
  public static async createInitialConfig(): Promise<boolean> {
    if (this.configExists()) {
      return true
    }

    const defaultConfig = this.getDefaultConfig()
    return await this.saveConfig(defaultConfig)
  }

  /**
   * 获取配置文件路径
   */
  public static getConfigPath(): string {
    return this.CONFIG_FILE
  }

  /**
   * 验证配置
   */
  public static validateConfig(config: Partial<AppConfig>): string[] {
    const errors: string[] = []

    // 验证必填字段
    if (!config.APP_NAME?.trim()) {
      errors.push('应用名称不能为空')
    }

    if (config.WEWORK_CONTACT_URL && !config.WEWORK_CONTACT_URL.startsWith('http')) {
      errors.push('企业微信通讯录URL格式无效')
    }

    return errors
  }
}
