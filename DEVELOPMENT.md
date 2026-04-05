# 开发文档

## 项目结构

```
siyuan-plugin-ss/
├── src/
│   ├── Search.vue          # 搜索组件主文件
│   ├── Svg.vue            # SVG 图标组件
│   ├── index.ts           # 插件入口
│   ├── index.scss         # 样式文件
│   ├── i18n/              # 国际化文件
│   │   ├── en_US.json
│   │   └── zh_CN.json
│   └── utils/
│       └── regexp/
│           └── index.ts   # 正则工具
├── scripts/               # 构建脚本
├── package.json           # 项目配置
├── plugin.json           # 插件元数据
├── tsconfig.json         # TypeScript 配置
└── vite.config.ts        # Vite 构建配置
```

## 核心功能

### 1. 搜索功能
- 实时高亮搜索结果
- 支持大小写敏感/不敏感
- 显示当前位置和总数
- 上一个/下一个导航

### 2. 替换功能
- 替换当前匹配
- 全部替换
- 支持正则表达式

### 3. 全文搜索
- 使用思源 SQL API 获取完整文档内容
- 准确统计全文匹配数量
- 块索引定位算法

### 4. 智能跳转
- 重试机制（最多 40 次，间隔 120ms）
- 近似滚动（基于块索引）
- 自动加载未渲染的内容

## 技术栈

- Vue 3 (Composition API)
- TypeScript
- Vite
- SCSS
- 思源笔记 API

## 构建命令

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 生产构建
npm run build
```

## 调试

1. 构建插件：`npm run build`
2. 将 `dist` 目录复制到思源笔记的 `data/plugins/siyuan-plugin-ss/`
3. 在思源笔记中重载插件
4. 打开浏览器开发者工具查看日志

## API 使用

### 思源笔记 API

- `/api/query/sql` - SQL 查询
- `/api/block/getBlockInfo` - 获取块信息
- `/api/block/updateBlock` - 更新块内容

### 插件 API

参考 `src/index.ts` 中的插件生命周期和事件处理。

## 注意事项

- 搜索高亮使用 CSS Highlight API
- 块索引用于准确定位和滚动
- 重试机制确保动态加载内容的跳转准确性
