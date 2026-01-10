# 需要替换的文件

## 修改的文件
只需要替换原库中的以下文件：

### `src/Search.vue`
这是唯一修改的文件，包含了所有的替换功能修复。

## 主要修改内容

### 1. 导入语句（第 3 行）
```typescript
import { fetchSyncPost } from "siyuan";
```

### 2. 响应式变量（第 12-13 行）
```typescript
const showReplace = ref(false)
const replaceText = ref("")
```

### 3. 模板部分 - 添加替换按钮（第 24-28 行）
```vue
<div @click="toggleReplace" 
     :class="{'search-tool--active': showReplace}"
     :title="plugin?.i18n?.replaceAll || 'Replace'">
    <Svg icon="#iconReplace" class="icon--14_14"></Svg>
</div>
```

### 4. 模板部分 - 添加替换输入框（第 41-53 行）
```vue
<div class="replace-dialog" v-if="showReplace">
    <div class="b3-form__icon search-input">
        <input
            type="text"
            class="b3-text-field fn__size200"
            spellcheck="false"
            :placeholder="plugin?.i18n?.replacePlaceholder || 'Replace with...'"
            v-model="replaceText"
            @keydown.enter.exact="replaceAll()"
        />
    </div>
    <button class="b3-button b3-button--outline replace-all-btn" @click="replaceAll">
        {{ plugin?.i18n?.replaceAll || 'Replace All' }}
    </button>
</div>
```

### 5. 函数 - toggleReplace（第 225-227 行）
```typescript
function toggleReplace() {
    showReplace.value = !showReplace.value;
}
```

### 6. 函数 - replaceAll（第 229-273 行）
完整的替换功能实现，使用 `fetchSyncPost` API

### 7. 样式部分（第 768-778 行）
```css
.replace-dialog {
    display: flex;
    align-items: center;
    margin-top: 5px;
    padding-top: 5px;
    border-top: 1px solid var(--b3-theme-surface-lighter);
}
.replace-all-btn {
    margin-left: 8px;
    white-space: nowrap;
    padding: 4px 8px;
    font-size: 12px;
}
```

## 如何应用修改

### 方法 1：直接替换文件
```bash
# 复制修改后的文件到原库
cp siyuan-plugin-ss/src/Search.vue <原库路径>/src/Search.vue
```

### 方法 2：使用 Git
```bash
# 在原库中
git checkout <你的分支>
# 复制修改后的文件
cp <修复后的路径>/src/Search.vue ./src/Search.vue
git add src/Search.vue
git commit -m "fix: 修复全部替换功能无效的问题"
```

### 方法 3：手动合并
如果原库有其他修改，建议使用 diff 工具查看差异并手动合并：
```bash
diff -u <原库>/src/Search.vue <修复后>/src/Search.vue
```

## 验证修改
替换文件后，重新构建：
```bash
npm run build
```

构建成功后，`dist/` 目录和 `package.zip` 会自动更新。
