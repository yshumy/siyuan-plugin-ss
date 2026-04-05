# GitHub 上传指南

## 上传步骤

1. 在 GitHub 上创建新仓库 `siyuan-plugin-ss`

2. 在本地初始化 git 仓库：
```bash
cd github-release
git init
git add .
git commit -m "Initial commit"
```

3. 关联远程仓库：
```bash
git remote add origin https://github.com/yshumy/siyuan-plugin-ss.git
git branch -M main
git push -u origin main
```

4. 创建第一个版本标签：
```bash
git tag v0.0.1
git push origin v0.0.1
```

## 发布新版本

1. 修改代码后提交：
```bash
git add .
git commit -m "描述你的改动"
git push
```

2. 更新版本号（在 `package.json` 和 `plugin.json` 中）

3. 创建新标签并推送：
```bash
git tag v0.0.2
git push origin v0.0.2
```

4. GitHub Actions 会自动构建并创建 Release

## 注意事项

- 版本号格式：`v主版本.次版本.修订号`（如 v0.0.1）
- 每次发布前记得更新 CHANGELOG.md
- 确保 package.json 和 plugin.json 中的版本号一致
