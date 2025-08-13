# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

这是一个基于Electron和Puppeteer的企业微信自动化操作工具，支持Windows和Mac平台打包构建。主要功能是自动化处理企业微信和微伴平台的二维码相关任务，包括创建群活码、店铺配置等自动化流程。

## 常用开发命令

```bash
# 安装依赖
npm install

# 开发模式运行（不会执行完整构建，适合测试）
npm run dev

# 开发构建（仅编译TypeScript和复制资源）
npm run build:dev

# 完整构建（包含打包）
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
  - `base.ts`: 基础自动化管理器，提供通用方法（页面操作、元素等待、截图等）
  - `browser-instance.ts`: 浏览器实例单例管理器
  - `wework.ts`: 企业微信特定的自动化逻辑
  - `weiban.ts`: 微伴平台的自动化逻辑（活码创建等）
- **utils/**: 工具模块
  - `browser-config.ts`: 浏览器配置和Chromium安装管理
  - `config-manager.ts`: 应用配置管理，支持运行时.env修改
- **renderer/**: Electron渲染进程UI
  - `index.html`: 主界面，包含门店信息表单和配置管理
  - `renderer.ts`: 前端逻辑，处理表单验证、任务执行、配置保存
  - `style.css`: 界面样式

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
- 支持dmg（macOS）、NSIS（Windows）、AppImage（Linux）
- 图标资源位于`assets/icons/`目录
- 构建输出到`dist`目录
- Puppeteer依赖和Chrome浏览器文件通过asarUnpack处理，确保运行时可访问

## 配置管理

### .env文件结构
项目使用分类的.env配置，包含：
- **基本配置**: 应用名称等
- **自动化配置**: 企业微信和微伴平台URL、用户数据目录、文件路径等
- **消息模板配置**: 店中店和独立店的欢迎语模板
- **用户数据配置**: 助手名单、门店类型等（JSON数组格式）

### 运行时配置修改
应用支持通过界面修改所有.env配置：
- 配置保存后会重写.env文件并保持分类注释
- 配置验证确保数据类型正确（字符串、数字、JSON数组）
- 保存成功后显示动画提示

## 自动化执行流程

### 任务执行架构
1. **表单验证**: 门店信息完整性和格式验证
2. **浏览器实例管理**: 使用单例模式确保session持久化
3. **页面自动化**: 基于Puppeteer的现代Locator API
4. **结果处理**: 统一的AutomationResult接口