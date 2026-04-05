# 文档高亮搜索 / Document Highlight Search

[English](./README.md) | [中文文档](./README_zh_CN.md)

思源笔记插件，用于在文档内搜索和高亮文本，支持包含懒加载内容的全文搜索。

## 功能特性

- 🔍 **全文搜索**：搜索整个文档内容，包括尚未加载的部分（针对长文档的懒加载）
- 🎯 **智能导航**：智能重试机制，可导航到未加载内容中的匹配项
- 📊 **准确计数**：使用思源 API 获取整个文档的准确匹配总数
- 🔄 **替换功能**：替换当前匹配或文档中的所有匹配
- 🎨 **高亮显示**：搜索结果的可视化高亮，带焦点指示
- ⌨️ **快捷键**：通过 `Ctrl+Shift+Alt+F` 快速访问（可自定义）
- 📱 **移动端支持**：桌面端和移动端均可使用
- 🎭 **大小写敏感**：可切换区分/忽略大小写搜索

## 使用方法

### 基础搜索

1. **打开搜索面板**：
   - 点击顶栏右侧的搜索按钮
   - 或使用快捷键：`Ctrl+Shift+Alt+F`

2. **输入搜索文本**：
   - 在输入框中输入搜索内容
   - 按 `Enter` 跳转到下一个匹配
   - 按 `Shift+Enter` 跳转到上一个匹配
   - 按 `Esc` 关闭搜索面板

3. **导航结果**：
   - 点击 ↑ 按钮跳转到上一个匹配
   - 点击 ↓ 按钮跳转到下一个匹配
   - 当前位置显示为 "X/Y"（例如 "5/42"）

### 高级功能

#### 大小写敏感
- 点击 "Aa" 按钮切换大小写敏感
- 蓝色 = 忽略大小写（默认）
- 灰色 = 区分大小写

#### 替换功能
1. 点击替换图标（🔄）显示替换面板
2. 输入替换文本
3. 点击"替换当前"替换当前匹配
4. 点击"全部替换"替换文档中的所有匹配

#### 拖拽移动
- 桌面端：点击并拖拽匹配计数（"X/Y"）可重新定位搜索面板

## 技术细节

### 全文搜索
- 使用思源的 `/api/query/sql` 获取完整文档内容
- 统计所有块中的匹配，而不仅仅是可见 DOM
- 异步加载不阻塞 UI

### 智能导航
- **块索引定位**：使用块索引进行准确的滚动定位
- **重试机制**：导航到未加载内容时自动重试最多 40 次（5 秒）
- **近似滚动**：使用块索引比例估算滚动位置
- **Range 验证**：滚动前检查目标是否在 DOM 中

### 性能优化
- 400ms 输入防抖避免过度搜索
- 重试期间增量更新
- 使用 CSS Highlights API 高效渲染

## 安装方法

### 从集市安装
1. 打开思源笔记
2. 进入 设置 → 集市 → 插件
3. 搜索"文档高亮搜索"
4. 点击安装

### 手动安装
1. 从 [GitHub Releases](https://github.com/yshumy/siyuan-plugin-ss/releases) 下载最新版本
2. 解压到 `{工作空间}/data/plugins/` 目录
3. 重启思源笔记
4. 在 设置 → 插件 中启用插件

## 快捷键

| 操作 | 快捷键 |
|------|--------|
| 打开搜索 | `Ctrl+Shift+Alt+F` |
| 下一个匹配 | `Enter` |
| 上一个匹配 | `Shift+Enter` |
| 关闭搜索 | `Esc` |
| 替换当前 | `Enter`（在替换框中） |

## 兼容性

- **思源版本**：>= 3.1.0
- **平台**：Windows、macOS、Linux、Android、iOS
- **浏览器**：支持 CSS Highlights API 的现代浏览器

## 开发

查看 [DEVELOPMENT.md](./DEVELOPMENT.md) 了解开发文档。

## 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解版本历史。

## 许可证

MIT License - 详见 [LICENSE](../LICENSE) 文件。

## 致谢

基于 TCOTC 的 [siyuan-plugin-hsr-mdzz2048-fork](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork)。

重试机制参考了 [siyuan-sou-easy](https://github.com/frostime/siyuan-sou-easy)。

## 支持

- [GitHub Issues](https://github.com/yshumy/siyuan-plugin-ss/issues)
- [思源社区](https://ld246.com/)

## 作者

yshumy - [GitHub](https://github.com/yshumy)
