# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

这是一个基于Electron和Puppeteer的企业微信自动化操作工具，支持Windows和Mac平台打包构建。主要功能是自动化处理企业微信二维码相关任务。

## 常用开发命令

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建应用
npm run build

# 打包Windows版本
npm run build:win

# 打包Mac版本  
npm run build:mac

# 生成不同尺寸的应用图标
npm run icons

# 运行测试
npm test

# 代码检查
npm run lint

# 修复lint问题
npm run lint:fix

# 清理构建目录
npm run clean
```

## 核心架构

### 主要模块结构

- **main.ts**: Electron主进程，管理应用窗口和IPC通信
- **renderer/**: 渲染进程文件（HTML、CSS、JS）
- **automation/**: 自动化核心模块
  - `base.ts`: 基础自动化管理器，提供通用方法
  - `browser-instance.ts`: 浏览器实例单例管理器
  - `wework.ts`: 企业微信特定的自动化逻辑
- **utils/**: 工具模块
  - `browser-config.ts`: 浏览器配置和Chromium安装管理
  - `config-manager.ts`: 应用配置管理

### 关键架构特点

1. **单例模式**: `WeworkManager`和`BrowserInstance`使用单例模式确保浏览器实例的唯一性和session持久化
2. **IPC通信**: 主进程与渲染进程通过IPC进行通信，处理浏览器操作、配置管理等
3. **浏览器管理**: 智能检测系统Chrome/Chromium，支持自动下载安装Puppeteer的Chromium
4. **配置管理**: 统一的配置系统，支持运行时配置保存和验证
5. **跨平台支持**: 针对Windows、macOS、Linux的不同打包配置

### Electron + Puppeteer兼容性注意事项

- 使用Puppeteer 21.5.0版本确保与Electron 28.0.0的兼容性
- **默认使用Puppeteer自带的Chrome**，不依赖系统Chrome浏览器
- 浏览器实例管理采用单例模式，确保session数据持久化
- 支持无头模式和有头模式切换，开发时默认显示浏览器窗口
- 自动处理Chromium安装和版本兼容性问题

## 开发注意事项

### TypeScript配置
- 使用ES2020目标，CommonJS模块系统
- 严格模式开启，确保类型安全
- 源码映射和声明文件生成已启用


### 代码规范
- ESLint + Prettier配置
- 使用Standard规范
- TypeScript特定规则已优化
- 单引号、无分号、100字符行宽

### 打包配置
- 使用electron-builder进行跨平台打包
- 支持dmg（macOS）、nsis（Windows）、AppImage（Linux）
- 图标资源位于`assets/icons/`目录
- 构建输出到`dist`目录