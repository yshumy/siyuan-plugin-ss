# Project Structure / 项目结构

This is the complete source code structure for the Document Highlight Search plugin, ready for GitHub.

这是文档高亮搜索插件的完整源代码结构，可直接上传到GitHub。

## Directory Structure / 目录结构

```
github-release/
├── .github/                    # GitHub Actions workflows
│   └── workflows/
│       └── release.yml        # Auto-release on tag push
├── docs/                      # Technical documentation
│   ├── DEVELOPMENT.md         # Development guide
│   └── SEARCH_COMPONENT_DOCUMENTATION.md  # API documentation
├── scripts/                   # Build scripts
│   ├── icon.psd              # Icon source file
│   └── make_dev_link.js      # Development symlink script
├── src/                       # Source code
│   ├── i18n/                 # Internationalization
│   │   ├── en_US.json        # English translations
│   │   └── zh_CN.json        # Chinese translations
│   ├── utils/                # Utility functions
│   │   └── regexp/           # Regular expression utilities
│   ├── Search.vue            # Main search component
│   ├── Svg.vue               # SVG icon component
│   ├── index.ts              # Plugin entry point
│   └── index.scss            # Global styles
├── .gitignore                # Git ignore rules
├── CHANGELOG.md              # Version history
├── CONTRIBUTING.md           # Contribution guidelines
├── LICENSE                   # MIT License
├── README.md                 # English documentation
├── README_zh_CN.md           # Chinese documentation
├── icon.png                  # Plugin icon (160x160)
├── package.json              # NPM dependencies
├── package-lock.json         # NPM lock file
├── plugin.json               # Plugin manifest
├── preview.png               # Plugin preview image
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite build configuration
```

## Key Files / 关键文件

### Root Level / 根目录

| File | Purpose | 用途 |
|------|---------|------|
| `README.md` | English user guide | 英文用户指南 |
| `README_zh_CN.md` | Chinese user guide | 中文用户指南 |
| `CHANGELOG.md` | Version history | 版本历史 |
| `CONTRIBUTING.md` | Contribution guide | 贡献指南 |
| `LICENSE` | MIT License | MIT 许可证 |
| `plugin.json` | Plugin manifest | 插件清单 |
| `package.json` | NPM dependencies | NPM 依赖 |
| `tsconfig.json` | TypeScript config | TypeScript 配置 |
| `vite.config.ts` | Build config | 构建配置 |
| `.gitignore` | Git ignore rules | Git 忽略规则 |

### Source Code / 源代码

| File | Purpose | 用途 |
|------|---------|------|
| `src/index.ts` | Plugin entry point | 插件入口 |
| `src/Search.vue` | Main search component | 主搜索组件 |
| `src/Svg.vue` | SVG icon component | SVG 图标组件 |
| `src/index.scss` | Global styles | 全局样式 |
| `src/i18n/*.json` | Translations | 翻译文件 |

### Documentation / 文档

| File | Purpose | 用途 |
|------|---------|------|
| `docs/DEVELOPMENT.md` | Developer guide | 开发者指南 |
| `docs/SEARCH_COMPONENT_DOCUMENTATION.md` | Technical API docs | 技术 API 文档 |

### GitHub Actions / GitHub 工作流

| File | Purpose | 用途 |
|------|---------|------|
| `.github/workflows/release.yml` | Auto-release workflow | 自动发布工作流 |

## How to Use / 使用方法

### For GitHub Upload / 上传到 GitHub

1. Initialize git repository:
   ```bash
   cd github-release
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create GitHub repository and push:
   ```bash
   git remote add origin https://github.com/yshumy/siyuan-plugin-ss.git
   git branch -M main
   git push -u origin main
   ```

3. Create a release tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

### For Development / 开发

1. Install dependencies:
   ```bash
   npm install
   ```

2. Development build:
   ```bash
   npm run dev
   ```

3. Production build:
   ```bash
   npm run build
   ```

## Build Output / 构建输出

After running `npm run build`, the output will be in `dist/`:

```
dist/
├── README.md
├── README_zh_CN.md
├── i18n/
│   ├── en_US.json
│   └── zh_CN.json
├── icon.png
├── index.css
├── index.js
├── plugin.json
├── preview.png
└── package.zip          # Ready for installation
```

## Installation / 安装

### From Source / 从源代码

1. Build the plugin:
   ```bash
   npm run build
   ```

2. Copy `dist/` contents to:
   ```
   {workspace}/data/plugins/siyuan-plugin-ss/
   ```

3. Restart SiYuan Note

### From Release / 从发布版

1. Download `package.zip` from GitHub Releases
2. Extract to `{workspace}/data/plugins/`
3. Restart SiYuan Note

## Development Workflow / 开发流程

1. **Make changes** in `src/`
2. **Test** with `npm run dev`
3. **Build** with `npm run build`
4. **Test** in SiYuan Note
5. **Commit** changes
6. **Update** `CHANGELOG.md`
7. **Create tag** for release
8. **Push** tag to trigger auto-release

## GitHub Actions / GitHub 工作流

The `.github/workflows/release.yml` file automatically:
- Builds the plugin when a tag is pushed
- Creates a GitHub release
- Attaches `dist/package.zip` to the release

## Documentation Standards / 文档规范

- User docs: English + Chinese
- Developer docs: English only
- Code comments: English
- Commit messages: English (Conventional Commits)

## License / 许可证

MIT License - See `LICENSE` file

## Support / 支持

- GitHub Issues: https://github.com/yshumy/siyuan-plugin-ss/issues
- SiYuan Community: https://ld246.com/

---

**Ready for GitHub!** / **可以上传到 GitHub 了！**

This folder contains everything needed for a complete GitHub repository.

这个文件夹包含了完整 GitHub 仓库所需的所有内容。
