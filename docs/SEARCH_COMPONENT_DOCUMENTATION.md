# Search.vue 组件完整文档

## 概述

Search.vue 是思源笔记插件的核心搜索组件，实现了文档内高亮搜索、替换和智能导航功能。

## 核心特性

### 1. 全文搜索与准确计数
- **DOM 搜索**：在当前可见的 DOM 中搜索并高亮匹配项
- **SQL API 搜索**：异步获取完整文档的匹配总数
- **双重计数机制**：
  - `domMatchCount`：当前 DOM 中的匹配数量（立即显示）
  - `fullMatchCount`：完整文档的匹配总数（异步更新）

### 2. 智能导航与重试机制
- **块索引定位**：使用块索引而非文本位置进行近似滚动
- **Range 有效性检查**：判断目标是否在 DOM 中
- **自动重试机制**：最多重试 40 次（约 5 秒），每次间隔 120ms
- **近似滚动**：使用块索引比例估算滚动位置

### 3. 大小写敏感与替换功能
- **大小写切换**：支持区分/忽略大小写搜索
- **替换当前**：替换当前高亮的匹配项
- **全部替换**：批量替换文档中所有匹配项

## 数据结构

### 响应式状态

```typescript
// 基础搜索状态
const searchText = ref("")           // 搜索文本
const replaceText = ref("")          // 替换文本
const replaceMode = ref(false)       // 是否显示替换面板
const caseSensitive = ref(false)     // 是否区分大小写
const resultCount = ref(0)           // 显示的总匹配数
const resultIndex = ref(0)           // 当前匹配索引（1-based）

// 计数状态
const fullMatchCount = ref(0)        // 完整文档的匹配总数（SQL API）
const domMatchCount = ref(0)         // 当前 DOM 中的匹配数量
const totalBlockCount = ref(0)       // 文档总块数

// 高亮状态（模仿思源原生结构）
const highlight = ref({
    mark: new Highlight(),           // 普通高亮
    markHL: new Highlight(),         // 焦点高亮
    ranges: [] as Range[],           // 所有匹配的 Range 对象
    rangeIndex: 0,                   // 当前焦点索引（0-based）
    blockIndices: [] as number[]     // 每个 Range 对应的块索引
})

// 待定导航状态（重试机制）
const pendingNavigation = ref({
    active: false,                   // 是否正在重试
    attempts: 0,                     // 当前重试次数
    timer: 0,                        // 定时器 ID
    maxAttempts: 40                  // 最大重试次数
})
```

## 核心函数

### 1. 文档信息获取

#### `getDocId(): Promise<string | null>`
获取当前文档 ID

**实现方法**：
1. 从 `[data-type="NodeDocument"]` 元素获取
2. 从 `.protyle-background` 元素获取
3. 通过任意块的 `/api/block/getBlockInfo` 获取 root_id

#### `getTotalBlockCount(): Promise<number>`
获取文档总块数

**实现**：
```typescript
SELECT COUNT(*) as count FROM blocks WHERE root_id = '${docId}'
```

#### `getBlockIndex(element: HTMLElement): number`
获取元素所在块的 DOM 索引

**实现**：
1. 查找所有 `[data-node-id][data-type]` 块
2. 找到元素最近的块祖先
3. 返回该块在所有块中的索引

#### `getFullMatchCount(searchText: string): Promise<number>`
获取完整文档的匹配总数

**实现**：
```typescript
SELECT content FROM blocks WHERE root_id = '${docId}' ORDER BY sort
// 拼接所有块内容，统计匹配次数
```

### 2. 搜索与高亮

#### `searchMarkRender(value: string, change: boolean)`
核心搜索函数，模仿思源原生实现

**参数**：
- `value`：搜索文本
- `change`：是否为新搜索（true）或重新渲染（false）

**流程**：
1. **初始化**：
   - 如果是新搜索，重置索引和计数
   - 异步获取完整匹配数和总块数
   
2. **清空旧数据**：
   - 清除 highlight.mark 和 highlight.markHL
   - 清空 ranges 和 blockIndices 数组
   
3. **获取文档根**：
   - 优先查找 `:scope > .protyle` 直接子元素
   - 回退到内部查找 `.protyle`
   
4. **遍历文本节点**：
   - 使用 TreeWalker 遍历所有文本节点
   - 记录每个节点的累计长度
   
5. **查找匹配**：
   - 在拼接的文本中查找所有匹配位置
   - 为每个匹配创建 Range 对象
   - 记录每个 Range 所在的块索引
   
6. **应用高亮**：
   - 将所有 Range 添加到 highlight.mark
   - 使用 CSS.highlights.set() 应用高亮
   
7. **更新计数**：
   - 更新 domMatchCount
   - 如果有 fullMatchCount，使用它；否则使用 domMatchCount

#### `highlightHitResult(value: string, change: boolean)`
高亮入口函数

**实现**：
```typescript
function highlightHitResult(value: string, change: boolean) {
    searchMarkRender(value, change);
    props.plugin?.updateLastHighlightComponent?.(props.element);
}
```

### 3. 导航与滚动

#### `isRangeValid(range: Range): boolean`
检查 Range 是否在 DOM 中

**实现**：
```typescript
const rect = range.getBoundingClientRect();
return rect.width > 0 || rect.height > 0;
```

#### `scrollToCurrent(currentRange: Range)`
滚动到指定 Range 并居中

**实现**（模仿思源原生）：
```typescript
docContentElement.scrollTop = docContentElement.scrollTop + 
    currentRange.getBoundingClientRect().top - 
    contentRect.top - 
    contentRect.height / 2;
```

#### `scrollApproximateMatchIntoView(index: number): boolean`
近似滚动到目标位置

**关键算法**：
```typescript
// 使用块索引而非匹配索引
const blockIndex = highlight.value.blockIndices[index] || 0;
const totalBlocks = totalBlockCount.value > 0 ? totalBlockCount.value : 1;

// 计算块索引比例
const ratio = (blockIndex + 0.5) / totalBlocks;

// 计算目标滚动位置（居中）
const nextScrollTop = (ratio * scrollHeight) - (clientHeight / 2);
```

**优势**：
- 块在文档中分布相对均匀
- 比文本位置更准确
- 适用于长文档和虚拟滚动

#### `scrollMatchIntoView(index: number): 'scrolled' | 'missing' | 'visible'`
尝试滚动到匹配

**返回值**：
- `'scrolled'`：成功滚动
- `'missing'`：Range 不在 DOM 中
- `'visible'`：Range 已可见

### 4. 重试机制

#### `beginPendingNavigation()`
开始待定导航

**实现**：
```typescript
clearPendingNavigation();
pendingNavigation.value.active = true;
pendingNavigation.value.attempts = 0;
```

#### `clearPendingNavigation()`
清除待定导航

**实现**：
```typescript
if (pendingNavigation.value.timer) {
    window.clearTimeout(pendingNavigation.value.timer);
    pendingNavigation.value.timer = 0;
}
pendingNavigation.value.active = false;
pendingNavigation.value.attempts = 0;
```

#### `retryPendingNavigation()`
重试待定导航（核心算法）

**流程**：
1. **检查状态**：如果不在重试状态，直接返回
2. **重新搜索**：调用 `searchMarkRender(searchText.value, false)` 更新 DOM
3. **尝试滚动**：调用 `scrollMatchIntoView(index)`
4. **判断结果**：
   - 如果成功（`!== 'missing'`），清除待定状态
   - 如果失败，执行近似滚动
5. **增加计数**：`attempts++`
6. **检查限制**：如果达到 40 次，停止重试
7. **继续重试**：120ms 后再次调用自己

**参数调优**：
- 重试间隔：120ms（参考 siyuan-sou-easy）
- 最大次数：40 次（约 5 秒）
- 近似滚动：使用块索引比例

### 5. 用户交互

#### `clickNext()`
跳转到下一个匹配

**流程**：
1. 递增 `rangeIndex`（循环）
2. 更新 `resultIndex`（显示用）
3. 清除旧高亮
4. 重新设置高亮（普通 + 焦点）
5. 尝试滚动，失败则启动重试

#### `clickLast()`
跳转到上一个匹配

**流程**：与 `clickNext()` 相同，但递减索引

#### `toggleCaseSensitive()`
切换大小写敏感

**实现**：
```typescript
caseSensitive.value = !caseSensitive.value;
if (searchText.value) {
    highlightHitResult(searchText.value, true);
}
```

### 6. 替换功能

#### `replaceOne()`
替换当前匹配

**流程**：
1. 获取当前 Range
2. 找到所在块的 `data-node-id`
3. 调用 `/api/block/getBlockKramdown` 获取内容
4. 查找并替换第一个匹配
5. 调用 `/api/block/updateBlock` 更新块
6. 100ms 后重新搜索

#### `replaceAll()`
全部替换

**流程**：
1. 确认操作
2. 获取文档 ID
3. 查询所有块：`SELECT id, markdown FROM blocks WHERE root_id = '${docId}'`
4. 遍历每个块，使用正则表达式替换所有匹配
5. 批量更新块
6. 显示替换数量
7. 200ms 后重新搜索

#### `escapeRegExp(string: string): string`
转义正则表达式特殊字符

**实现**：
```typescript
return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

## 事件处理

### `handleInput()`
输入防抖处理

**实现**：
```typescript
clearTimeout(typingTimer);
typingTimer = window.setTimeout(() => {
    highlightHitResult(searchText.value, true);
}, 400); // 400ms 防抖
```

### `eventBusHandle(event: CustomEvent)`
处理插件事件

**支持的事件**：
- `savedoc`：文档保存后重新搜索
- `rename`：文档重命名后重新搜索
- `loaded-protyle-dynamic`：动态加载后重新搜索（保持索引）
- `loaded-protyle-static`：静态加载后重新搜索（重置索引）
- `switch-protyle`：切换文档后重新搜索（重置索引）
- `switch-protyle-mode`：切换模式后重新搜索（重置索引）

### `handleMouseDown(event: MouseEvent)`
拖拽处理

**实现**：
```typescript
const searchDialog = (event.currentTarget as HTMLElement).closest('.search-dialog');
props.plugin?.startDragging?.(searchDialog, event.clientX, event.clientY);
event.preventDefault();
```

## 生命周期

### `onMounted()`
组件挂载

**流程**：
1. 获取输入框元素
2. 检查是否有预设文本（`data-preset-text` 属性）
3. 如果有预设文本，设置并执行搜索
4. 否则，聚焦并全选输入框
5. 通知插件组件已挂载

### `onUnmounted()`
组件卸载

**流程**：
1. 通知插件组件已卸载

## 样式说明

### 搜索面板 (`.search-dialog`)
- 水平布局（flexbox）
- 顶部边距 5px

### 大小写按钮 (`.search-option-btn`)
- 尺寸：28x28px
- 边框：1px solid
- 激活状态：主题色背景

### 计数显示 (`.search-count`)
- 最小宽度：35px
- 居中对齐
- 可拖拽（桌面端）

### 替换面板 (`.replace-dialog`)
- 顶部边框分隔
- 顶部内边距 5px

## 关键算法总结

### 1. 块索引定位算法
```
相对位置 = (块索引 + 0.5) / 总块数
目标滚动位置 = (相对位置 × 滚动高度) - (视口高度 / 2)
```

### 2. 重试机制算法
```
while (attempts < 40 && !success) {
    1. 重新搜索 DOM
    2. 尝试直接滚动
    3. 如果失败，近似滚动
    4. 等待 120ms
    5. attempts++
}
```

### 3. 双重计数机制
```
显示总数 = fullMatchCount > 0 ? fullMatchCount : domMatchCount
```

## 性能优化

1. **防抖输入**：400ms 防抖避免频繁搜索
2. **异步 API**：不阻塞 UI，后台获取完整计数
3. **增量更新**：重试时只更新必要的部分
4. **Range 复用**：使用 CSS Highlights API，性能优于 DOM 操作

## 兼容性

- **思源笔记版本**：>= 3.1.0
- **浏览器要求**：支持 CSS Highlights API
- **移动端**：支持，但禁用拖拽功能

## 参考资料

- 思源笔记原生搜索实现
- siyuan-sou-easy 插件的重试机制
- CSS Highlights API 规范
