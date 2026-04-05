# 上传到 GitHub 指南

## 当前版本
- 版本号：0.9.1
- 状态：已修复所有已知问题

## 主要功能
1. ✅ 文档内搜索高亮
2. ✅ 大小写敏感/不敏感
3. ✅ 上一个/下一个导航
4. ✅ 准确的匹配总数显示
5. ✅ 替换当前/全部替换
6. ✅ 替换框始终展开
7. ✅ 智能跳转和重试机制

## 已修复的问题
- ✅ 修复了 `closest is not a function` 错误（文本节点处理）
- ✅ 修复了总数"闪回到1"的问题（移除有问题的 SQL API）
- ✅ 修复了块索引计算错误
- ✅ 优化了搜索性能

## 上传步骤

### 1. 初始化 Git 仓库
```bash
cd github-release
git init
git add .
git commit -m "Initial commit: v0.9.1"
```

### 2. 关联 GitHub 仓库
在 GitHub 上创建新仓库 `siyuan-plugin-ss`，然后：
```bash
git remote add origin https://github.com/yshumy/siyuan-plugin-ss.git
git branch -M main
git push -u origin main
```

### 3. 创建版本标签
```bash
git tag v0.9.1
git push origin v0.9.1
```

### 4. GitHub Actions 自动发布
推送标签后，GitHub Actions 会自动：
- 安装依赖
- 构建插件
- 创建 Release
- 上传 package.zip

## 后续更新流程

1. 修改代码
2. 更新 `CHANGELOG.md`
3. 更新 `package.json` 和 `plugin.json` 中的版本号
4. 提交并推送：
```bash
git add .
git commit -m "描述你的改动"
git push
```
5. 创建新标签：
```bash
git tag v0.9.2
git push origin v0.9.2
```

## 注意事项
- 版本号格式：`v主版本.次版本.修订号`
- `package.json` 和 `plugin.json` 的版本号要保持一致
- 每次发布前更新 `CHANGELOG.md`
- 标签名必须以 `v` 开头才能触发自动发布

## 文件清单
- ✅ 源代码（src/）
- ✅ 配置文件（package.json, plugin.json, tsconfig.json, vite.config.ts）
- ✅ 文档（README.md, README_zh_CN.md, CHANGELOG.md）
- ✅ GitHub Actions（.github/workflows/release.yml）
- ✅ 许可证（LICENSE）
- ✅ 图标和预览图（icon.png, preview.png）
