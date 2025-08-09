#!/bin/bash

# 图标生成脚本
# 需要安装ImageMagick: brew install imagemagick (Mac) 或 sudo apt-get install imagemagick (Ubuntu)

SOURCE_ICON="assets/icons/icon.png"

echo "开始生成不同尺寸的图标..."

# 检查源文件是否存在
if [ ! -f "$SOURCE_ICON" ]; then
    echo "错误: 源图标文件不存在: $SOURCE_ICON"
    exit 1
fi

# 创建不同尺寸的目录
mkdir -p assets/icons/mac
mkdir -p assets/icons/win
mkdir -p assets/icons/linux

# 生成Mac图标 (.icns)
# Mac需要多种尺寸: 16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024
if command -v convert >/dev/null 2>&1; then
    echo "生成Mac图标..."
    convert "$SOURCE_ICON" -resize 16x16 assets/icons/mac/icon_16x16.png
    convert "$SOURCE_ICON" -resize 32x32 assets/icons/mac/icon_32x32.png
    convert "$SOURCE_ICON" -resize 128x128 assets/icons/mac/icon_128x128.png
    convert "$SOURCE_ICON" -resize 256x256 assets/icons/mac/icon_256x256.png
    convert "$SOURCE_ICON" -resize 512x512 assets/icons/mac/icon_512x512.png
    convert "$SOURCE_ICON" -resize 1024x1024 assets/icons/mac/icon_1024x1024.png
    
    # 生成Windows图标 (.ico)
    echo "生成Windows图标..."
    convert "$SOURCE_ICON" -resize 256x256 assets/icons/win/icon.ico
    
    # 生成Linux图标
    echo "生成Linux图标..."
    convert "$SOURCE_ICON" -resize 512x512 assets/icons/linux/icon.png
    
    echo "图标生成完成!"
else
    echo "警告: 未安装ImageMagick，无法自动生成不同尺寸的图标"
    echo "请手动安装: brew install imagemagick (Mac) 或 sudo apt-get install imagemagick (Ubuntu)"
    echo "或者手动创建以下尺寸的图标:"
    echo "- Mac: 16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024"
    echo "- Windows: 256x256 (.ico格式)"
    echo "- Linux: 512x512"
fi