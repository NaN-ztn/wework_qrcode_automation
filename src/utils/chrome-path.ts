import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'
import * as os from 'os'

/**
 * 获取Chrome路径配置（根据平台）
 */
function getChromePathConfig() {
  const platform = os.platform()

  if (platform === 'win32') {
    return {
      // Windows平台的Chrome路径
      chromeDir: 'win64-141.0.7347.0',
      subPath: path.join('chrome-win64', 'chrome.exe'),
    }
  } else if (platform === 'darwin') {
    const arch = os.arch()
    if (arch === 'arm64') {
      return {
        // macOS ARM64平台
        chromeDir: 'mac_arm-141.0.7347.0',
        subPath: path.join(
          'chrome-mac-arm64',
          'Google Chrome for Testing.app',
          'Contents',
          'MacOS',
          'Google Chrome for Testing',
        ),
      }
    } else {
      return {
        // macOS x64平台
        chromeDir: 'mac-141.0.7347.0',
        subPath: path.join(
          'chrome-mac',
          'Google Chrome for Testing.app',
          'Contents',
          'MacOS',
          'Google Chrome for Testing',
        ),
      }
    }
  } else {
    return {
      // Linux平台
      chromeDir: 'linux-141.0.7347.0',
      subPath: path.join('chrome-linux64', 'chrome'),
    }
  }
}

/**
 * 获取所有可能的Chrome目录配置
 */
function getAllPossibleChromeConfigs() {
  // 返回所有平台的Chrome配置，用于检测可用的Chrome
  return [
    {
      chromeDir: 'win64-141.0.7347.0',
      subPath: path.join('chrome-win64', 'chrome.exe'),
      platform: 'win32',
    },
    {
      chromeDir: 'mac_arm-141.0.7347.0',
      subPath: path.join(
        'chrome-mac-arm64',
        'Google Chrome for Testing.app',
        'Contents',
        'MacOS',
        'Google Chrome for Testing',
      ),
      platform: 'darwin',
      arch: 'arm64',
    },
    {
      chromeDir: 'mac-141.0.7347.0',
      subPath: path.join(
        'chrome-mac',
        'Google Chrome for Testing.app',
        'Contents',
        'MacOS',
        'Google Chrome for Testing',
      ),
      platform: 'darwin',
      arch: 'x64',
    },
    {
      chromeDir: 'linux-141.0.7347.0',
      subPath: path.join('chrome-linux64', 'chrome'),
      platform: 'linux',
    },
  ]
}

/**
 * 获取本地Chrome执行路径
 */
export function getChromePath(): string {
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')

  // 获取项目根目录
  let projectRoot: string

  if (isDev) {
    // 开发环境：相对于dist/utils/chrome-path.js的位置，需要回到项目根目录
    projectRoot = path.resolve(__dirname, '../..')
  } else {
    // 生产环境：从app路径获取
    try {
      const appPath = app.getAppPath()
      projectRoot = appPath.replace('app.asar', 'app.asar.unpacked')
    } catch (error) {
      console.error('获取app路径失败:', error)
      throw new Error('无法获取应用路径')
    }
  }

  console.log('项目根目录:', projectRoot)
  console.log('当前平台:', os.platform(), '架构:', os.arch())

  // 检查chrome目录是否存在
  const chromeBaseDir = path.join(projectRoot, 'chrome')
  console.log('Chrome基础目录:', chromeBaseDir)

  if (!fs.existsSync(chromeBaseDir)) {
    console.error('Chrome目录不存在:', chromeBaseDir)
    throw new Error(`Chrome目录不存在: ${chromeBaseDir}`)
  }

  // 列出chrome目录内容
  const chromeContents = fs.readdirSync(chromeBaseDir)
  console.log('Chrome目录内容:', chromeContents)

  // 首先尝试当前平台的Chrome配置
  const currentConfig = getChromePathConfig()
  const currentPlatformPath = path.join(
    chromeBaseDir,
    currentConfig.chromeDir,
    currentConfig.subPath,
  )
  console.log(`优先检查当前平台(${os.platform()})Chrome: ${currentPlatformPath}`)

  if (fs.existsSync(currentPlatformPath)) {
    console.log(`✅ 找到当前平台Chrome: ${currentPlatformPath}`)
    return currentPlatformPath
  } else {
    console.log(`❌ 当前平台Chrome不存在: ${currentPlatformPath}`)
  }

  // 如果当前平台Chrome不存在，尝试所有其他平台的Chrome配置
  console.log('尝试其他平台的Chrome配置...')
  const allConfigs = getAllPossibleChromeConfigs()

  for (const config of allConfigs) {
    // 跳过当前平台（已经检查过了）
    if (config.platform === os.platform() && (!config.arch || config.arch === os.arch())) {
      continue
    }

    const fullChromePath = path.join(chromeBaseDir, config.chromeDir, config.subPath)
    console.log(`检查${config.platform || 'unknown'}平台Chrome路径: ${fullChromePath}`)

    if (fs.existsSync(fullChromePath)) {
      console.log(`⚠️ 使用非当前平台的Chrome: ${fullChromePath}`)
      return fullChromePath
    } else {
      console.log(`❌ Chrome不存在: ${fullChromePath}`)
    }
  }

  throw new Error(`所有Chrome路径都不可用，chrome目录内容: ${chromeContents.join(', ')}`)
}
