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
  const { chromeDir, subPath } = getChromePathConfig()
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')

  const possiblePaths = []

  if (isDev) {
    // 开发环境：使用项目根目录的chrome
    const projectRoot = path.resolve(__dirname, '../../..')

    // 首先尝试当前平台的配置
    possiblePaths.push(path.join(projectRoot, 'chrome', chromeDir, subPath))

    // 如果当前平台找不到，尝试所有可能的Chrome配置
    const allConfigs = getAllPossibleChromeConfigs()
    for (const config of allConfigs) {
      possiblePaths.push(path.join(projectRoot, 'chrome', config.chromeDir, config.subPath))
    }
  }

  // 生产环境：使用app.asar.unpacked中的chrome
  try {
    const appPath = app.getAppPath()
    const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked')

    // 首先尝试当前平台的配置
    possiblePaths.push(path.join(unpackedPath, 'chrome', chromeDir, subPath))

    // 如果当前平台找不到，尝试所有可能的Chrome配置
    const allConfigs = getAllPossibleChromeConfigs()
    for (const config of allConfigs) {
      possiblePaths.push(path.join(unpackedPath, 'chrome', config.chromeDir, config.subPath))
    }
  } catch (error) {
    console.error('获取生产环境Chrome路径失败:', error)
  }

  // 去重
  const uniquePaths = [...new Set(possiblePaths)]

  // 检查所有可能的路径
  for (const chromePath of uniquePaths) {
    console.log(`检查Chrome路径: ${chromePath}`)
    if (fs.existsSync(chromePath)) {
      console.log(`✅ 找到Chrome: ${chromePath}`)
      return chromePath
    }
  }

  // 如果本地Chrome都没找到，使用Puppeteer自带的Chromium
  console.log('未找到本地Chrome，将使用Puppeteer自带的Chromium')
  console.log(`平台: ${os.platform()}, 架构: ${os.arch()}`)

  return ''
}
