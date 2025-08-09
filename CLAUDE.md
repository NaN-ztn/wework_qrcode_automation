# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

这是一个基于Electron和Puppeteer的自动化操作工具，支持Windows和Mac平台打包构建。

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
```

## 架构要点

### Electron + Puppeteer兼容性注意事项

1. **Puppeteer版本选择**: 使用与当前Electron版本兼容的Puppeteer版本，避免Chrome版本不匹配
2. **无头浏览器配置**: 在Electron主进程中启动Puppeteer时需要正确配置Chrome路径
3. **沙盒模式**: 注意Electron的沙盒模式与Puppeteer的兼容性
4. **权限配置**: 确保必要的权限配置用于自动化操作

### 跨平台打包配置

- 使用electron-builder进行跨平台打包
- Windows: 需要配置合适的图标和签名
- macOS: 需要处理公证和签名问题
- 确保原生模块在目标平台上正确编译

### 自动化操作架构

- 主进程负责Electron窗口管理和系统交互
- 渲染进程处理用户界面
- Puppeteer在后台执行自动化任务
- 通过IPC进行进程间通信

## 开发注意事项

- 测试时需要在实际的Electron环境中验证Puppeteer功能
- 打包前确保所有原生依赖都正确配置
- 处理不同操作系统的路径差异
- 确保自动化脚本的稳定性和容错能力