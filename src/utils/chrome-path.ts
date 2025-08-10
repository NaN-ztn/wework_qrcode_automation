import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'
import * as os from 'os'

/**
 * 根据平台获取Chrome可执行文件的可能路径
 */
function getChromeExecutablePaths() {
  const platform = os.platform()
  const arch = os.arch()

  if (platform === 'win32') {
    return ['chrome-win64/chrome.exe', 'chrome-win32/chrome.exe']
  } else if (platform === 'darwin') {
    const chromePath = 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
    if (arch === 'arm64') {
      return [`chrome-mac-arm64/${chromePath}`, `chrome-mac/${chromePath}`]
    } else {
      return [`chrome-mac/${chromePath}`, `chrome-mac-arm64/${chromePath}`]
    }
  } else {
    return ['chrome-linux64/chrome', 'chrome-linux/chrome']
  }
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

  // 列出chrome目录内容（版本目录）
  const chromeVersionDirs = fs.readdirSync(chromeBaseDir).filter((item) => {
    return fs.statSync(path.join(chromeBaseDir, item)).isDirectory()
  })
  console.log('Chrome版本目录:', chromeVersionDirs)

  // 获取当前平台的Chrome可执行文件路径
  const executablePaths = getChromeExecutablePaths()
  console.log('当前平台Chrome可执行文件路径:', executablePaths)

  // 遍历所有版本目录，查找匹配的Chrome可执行文件
  for (const versionDir of chromeVersionDirs) {
    console.log(`检查版本目录: ${versionDir}`)

    for (const execPath of executablePaths) {
      const fullChromePath = path.join(chromeBaseDir, versionDir, execPath)
      console.log(`  检查: ${fullChromePath}`)

      if (fs.existsSync(fullChromePath)) {
        console.log(`✅ 找到Chrome: ${fullChromePath}`)
        return fullChromePath
      }
    }
  }

  throw new Error(
    `未找到可用的Chrome可执行文件。版本目录: ${chromeVersionDirs.join(', ')}，平台: ${os.platform()}`,
  )
}
