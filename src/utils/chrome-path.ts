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
 * 获取本地Chrome执行路径
 */
export function getChromePath(): string {
  const { chromeDir, subPath } = getChromePathConfig()
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')

  if (isDev) {
    // 开发环境：使用项目根目录的chrome
    const projectRoot = path.resolve(__dirname, '../../..')
    const chromePath = path.join(projectRoot, 'chrome', chromeDir, subPath)

    if (fs.existsSync(chromePath)) {
      console.log(`找到开发环境Chrome: ${chromePath}`)
      return chromePath
    }
  }

  // 生产环境：使用app.asar.unpacked中的chrome
  try {
    const appPath = app.getAppPath()
    const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked')
    const chromePath = path.join(unpackedPath, 'chrome', chromeDir, subPath)

    if (fs.existsSync(chromePath)) {
      console.log(`找到生产环境Chrome: ${chromePath}`)
      return chromePath
    }
  } catch (error) {
    console.error('获取生产环境Chrome路径失败:', error)
  }

  // 回退方案：返回空字符串让Puppeteer使用默认搜索
  console.warn(
    `未找到本地Chrome (平台: ${os.platform()}, 架构: ${os.arch()})，使用Puppeteer默认搜索`,
  )
  return ''
}
