# 修复说明

## 问题描述
全部替换功能无效

## 根本原因
1. `src/Search.vue` 文件中缺少替换功能的完整实现
2. 使用了错误的 API 调用方式（`props.plugin.fetchPost` 不存在）

## 修复内容

### 1. 添加了响应式变量
```javascript
const showReplace = ref(false)
const replaceText = ref("")
```

### 2. 添加了替换按钮到工具栏
- 添加了替换图标按钮（使用 `#iconReplace` 图标）
- 点击后显示/隐藏替换输入框

### 3. 添加了替换输入框 UI
```vue
<div class="replace-dialog" v-if="showReplace">
    <input v-model="replaceText" placeholder="Replace with..." />
    <button @click="replaceAll">Replace All</button>
</div>
```

### 4. 实现了 `toggleReplace()` 函数
切换替换面板的显示/隐藏状态

### 5. 实现了 `replaceAll()` 函数
- 收集所有包含搜索结果的块 ID
- 通过思源 API 获取每个块的 Kramdown 内容
- 使用正则表达式进行全局替换（支持大小写敏感）
- 通过 API 更新修改后的块内容
- 替换完成后刷新高亮显示

### 6. 修复了 API 调用方式
- ❌ 错误：`props.plugin.fetchPost()` （不存在的方法）
- ✅ 正确：导入并使用全局函数 `fetchSyncPost()` from "siyuan"

### 7. 添加了相关样式
```css
.replace-dialog { ... }
.replace-all-btn { ... }
```

## 技术细节
- 导入 `fetchSyncPost` 函数：`import { fetchSyncPost } from "siyuan"`
- 使用 `/api/block/getBlockKramdown` 获取块内容
- 使用 `/api/block/updateBlock` 更新块内容
- 正确转义搜索文本中的正则表达式特殊字符：`searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`
- 支持大小写敏感/不敏感的替换

## 测试结果
✅ 替换功能已验证可以正常工作
