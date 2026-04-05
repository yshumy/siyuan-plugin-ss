<template>
    <div class="search-dialog">
        <div class="b3-form__icon search-input">
            <input
                type="text"
                class="b3-text-field fn__size200"
                spellcheck="false"
                :placeholder="placeholder"
                v-model="searchText"
                @keydown.enter.exact="clickNext()"
                @keydown.shift.enter="clickLast()"
                @keydown.esc.exact="clickClose()"
                @input="handleInput"
            />
        </div>
        <button 
            class="search-option-btn"
            :class="{ 'search-option-btn--active': caseSensitive }"
            :title="caseSensitive ? '区分大小写' : '忽略大小写'"
            @click="toggleCaseSensitive">
            Aa
        </button>
        <span class="search-count" 
              :class="{ 'search-count--draggable': !isMobile() }"
              @mousedown="handleMouseDown">{{ resultIndex + "/" + resultCount }}</span>
        <div class="search-tools">
            <div @click="clickLast">
                <Svg icon="#iconUp" class="icon--14_14"></Svg>
            </div>
            <div @click="clickNext">
                <Svg icon="#iconDown" class="icon--14_14"></Svg>
            </div>
            <div @click="toggleReplaceMode" :title="replaceMode ? '隐藏替换' : '显示替换'">
                <Svg icon="#iconReplace" class="icon--14_14"></Svg>
            </div>
            <div @click="clickClose">
                <Svg icon="#iconClose" class="icon--14_14"></Svg>
            </div>
        </div>
    </div>
    <div v-if="replaceMode" class="replace-dialog">
        <div class="b3-form__icon search-input">
            <input
                type="text"
                class="b3-text-field fn__size200"
                spellcheck="false"
                placeholder="替换为..."
                v-model="replaceText"
                @keydown.enter.exact="replaceOne()"
                @keydown.esc.exact="toggleReplaceMode()"
            />
        </div>
        <div class="replace-tools">
            <div @click="replaceOne" :title="'替换当前'">
                <Svg icon="#iconReplace" class="icon--14_14"></Svg>
            </div>
            <div @click="replaceAll" :title="'全部替换'">
                <Svg icon="#iconReplaceAll" class="icon--14_14"></Svg>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineProps } from "vue";
import Svg from "./Svg.vue"
import { isMobile } from "./index"

const searchText = ref("")
const replaceText = ref("")
const replaceMode = ref(false)
const caseSensitive = ref(false)
const resultCount = ref(0)
const resultIndex = ref(0)

// 🆕 区分当前 DOM 中的数量和完整总数
const fullMatchCount = ref(0)  // 完整文档的匹配总数（来自 SQL API）
const domMatchCount = ref(0)   // 当前 DOM 中的匹配数量
const totalBlockCount = ref(0) // 🆕 文档总块数

// 🆕 模仿思源的 highlight 结构，添加 blockIndex
const highlight = ref({
    mark: new Highlight(),
    markHL: new Highlight(),
    ranges: [] as Range[],
    rangeIndex: 0,
    blockIndices: [] as number[]  // 🆕 每个 Range 对应的块索引
})

// 🆕 待定导航状态（参考 siyuan-sou-easy）
const pendingNavigation = ref({
    active: false,
    attempts: 0,
    timer: 0,
    maxAttempts: 40  // 最多重试 40 次（约 5 秒）
})

const placeholder = "🔍︎ (Shift) + Enter"

const props = defineProps<{
    edit: Element,
    element: Element,
    plugin: any,
}>()

// 🆕 获取文档总块数
async function getTotalBlockCount(): Promise<number> {
    const docId = await getDocId();
    if (!docId) return 0;
    
    try {
        const response = await fetch('/api/query/sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stmt: `SELECT COUNT(*) as count FROM blocks WHERE root_id = '${docId}'`
            })
        });
        
        const data = await response.json();
        if (data.code === 0 && data.data && data.data[0]) {
            return data.data[0].count || 0;
        }
    } catch (e) {
        console.error('Failed to get total block count:', e);
    }
    
    return 0;
}

// 🆕 获取块的全局索引
function getBlockIndex(element: HTMLElement): number {
    // 获取当前 DOM 中所有块
    const docRoot = props.edit.querySelector(':scope > .protyle:not(.fn__none) .protyle-wysiwyg') as HTMLElement
        || props.edit.querySelector('.protyle:not(.fn__none) .protyle-wysiwyg') as HTMLElement;
    
    if (!docRoot) return 0;
    
    const allBlocks = Array.from(docRoot.querySelectorAll('[data-node-id][data-type]'));
    const blockElement = element.closest('[data-node-id][data-type]');
    
    if (!blockElement) return 0;
    
    return allBlocks.indexOf(blockElement);
}
async function getDocId(): Promise<string | null> {
    // 方法1：从 data-node-id 属性获取
    const docElement = props.edit.querySelector('[data-node-id][data-type="NodeDocument"]') as HTMLElement;
    if (docElement) {
        return docElement.getAttribute('data-node-id');
    }
    
    // 方法2：从 protyle-background 获取
    const bgElement = props.edit.querySelector('.protyle-background[data-node-id]') as HTMLElement;
    if (bgElement) {
        return bgElement.getAttribute('data-node-id');
    }
    
    // 方法3：从任意块获取 root_id
    const anyBlock = props.edit.querySelector('[data-node-id]') as HTMLElement;
    if (anyBlock) {
        const blockId = anyBlock.getAttribute('data-node-id');
        if (blockId) {
            try {
                const response = await fetch('/api/block/getBlockInfo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: blockId })
                });
                const data = await response.json();
                if (data.code === 0 && data.data) {
                    return data.data.rootID || data.data.root_id || null;
                }
            } catch (e) {
                console.error('Failed to get doc id:', e);
            }
        }
    }
    
    return null;
}

// 🆕 使用 SQL 查询获取完整匹配数量
async function getFullMatchCount(searchText: string): Promise<number> {
    if (!searchText.trim()) return 0;
    
    const docId = await getDocId();
    if (!docId) return 0;
    
    try {
        const response = await fetch('/api/query/sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stmt: `SELECT content FROM blocks WHERE root_id = '${docId}' ORDER BY sort`
            })
        });
        
        const data = await response.json();
        if (data.code === 0 && data.data) {
            // 拼接所有块的内容
            const fullContent = data.data.map((block: any) => block.content || '').join('\n');
            const searchContent = caseSensitive.value ? fullContent : fullContent.toLowerCase();
            const searchStr = caseSensitive.value ? searchText.trim() : searchText.trim().toLowerCase();
            
            // 统计匹配数量
            let count = 0;
            let pos = 0;
            while ((pos = searchContent.indexOf(searchStr, pos)) !== -1) {
                count++;
                pos += searchStr.length;
            }
            
            return count;
        }
    } catch (e) {
        console.error('Failed to get full match count:', e);
    }
    
    return 0;
}

onMounted(() => {
    const inputElement = props.element.querySelector('.search-dialog .b3-text-field') as HTMLInputElement;
    if (inputElement) {
        const presetText = props.element.getAttribute('data-preset-text');
        if (presetText) {
            props.element.removeAttribute('data-preset-text');
            searchText.value = presetText;
            inputElement.value = presetText;
            inputElement.focus();
            highlightHitResult(presetText, true);
        } else {
            inputElement.focus();
            inputElement.select();
        }
    }
    
    props.plugin?.onSearchComponentMounted?.(eventBusHandle);
});

onUnmounted(() => {
    props.plugin?.onSearchComponentUnmounted?.(eventBusHandle);
});

function handleMouseDown(event: MouseEvent) {
    if (isMobile()) return;
    const searchDialog = (event.currentTarget as HTMLElement).closest('.search-dialog') as HTMLElement;
    props.plugin?.startDragging?.(searchDialog, event.clientX, event.clientY);
    event.preventDefault();
}

function eventBusHandle(event: CustomEvent) {
    if (["savedoc", "rename"].includes(event.detail.cmd)) {
        clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => {
            if (props.plugin?.isLastHighlightComponent?.(props.element)) {
                highlightHitResult(searchText.value, false);
            }
        }, doneTypingInterval);
    } else if (["loaded-protyle-dynamic", "loaded-protyle-static", "switch-protyle", "switch-protyle-mode"].includes(event.type)) {
        const protyleElement = event.detail?.protyle?.element;
        if (!protyleElement) return;
        
        const layoutTabContainer = protyleElement.closest(".layout-tab-container");
        if (layoutTabContainer && !layoutTabContainer.contains(props.element)) return;
        
        const blockPopover = protyleElement.closest(".block__popover");
        if (blockPopover && !blockPopover.contains(props.element)) return;
        
        clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => {
            resultIndex.value = 0;
            if (props.plugin?.isLastHighlightComponent?.(props.element)) {
                highlightHitResult(searchText.value, false);
            }
        }, doneTypingInterval);
    }
}

let typingTimer: number | undefined;
const doneTypingInterval = 400;

function handleInput() {
    clearTimeout(typingTimer);
    typingTimer = window.setTimeout(() => {
        highlightHitResult(searchText.value, true);
    }, doneTypingInterval);
}

// 🆕 完全模仿思源的 searchMarkRender 实现
function searchMarkRender(value: string, change: boolean) {
    const str = value.trim()
    if (!str) {
        clearHighlight();
        return;
    }

    // 根据大小写敏感设置转换搜索字符串
    const searchStr = caseSensitive.value ? str : str.toLowerCase()

    if (change) {
        resultIndex.value = 0
        // 🆕 重置完整总数（新搜索）
        fullMatchCount.value = 0
        
        // 🆕 异步获取完整匹配数量和总块数（新搜索时立即开始）
        Promise.all([
            getFullMatchCount(str),
            getTotalBlockCount()
        ]).then(([count, blockCount]) => {
            if (count > 0) {
                fullMatchCount.value = count;
                resultCount.value = count;
            }
            if (blockCount > 0) {
                totalBlockCount.value = blockCount;
            }
        });
    }

    // 清空
    highlight.value.mark.clear()
    highlight.value.markHL.clear()
    highlight.value.ranges = []
    highlight.value.blockIndices = []  // 🆕 清空块索引
    highlight.value.rangeIndex = 0

    // 获取文档根
    let docRoot = props.edit.querySelector(':scope > .protyle:not(.fn__none) :is(.protyle-content:not(.fn__none) .protyle-wysiwyg, .protyle-preview:not(.fn__none) .b3-typography)') as HTMLElement;
    
    if (!docRoot) {
        docRoot = props.edit.querySelector('.protyle:not(.fn__none) :is(.protyle-content:not(.fn__none) .protyle-wysiwyg, .protyle-preview:not(.fn__none) .b3-typography)') as HTMLElement;
    }
    
    if (!docRoot) {
        return;
    }

    // 准备一个数组来保存所有文本节点
    const textNodes: Node[] = [];
    const textNodesSize: number[] = [];
    let currentSize = 0;

    const treeWalker = document.createTreeWalker(docRoot, NodeFilter.SHOW_TEXT);
    let currentNode = treeWalker.nextNode();
    while (currentNode) {
        textNodes.push(currentNode);
        currentSize += currentNode.textContent!.length;
        textNodesSize.push(currentSize);
        currentNode = treeWalker.nextNode();
    }

    const text = caseSensitive.value ? docRoot.textContent! : docRoot.textContent!.toLowerCase();
    let startIndex = 0;
    let currentNodeIndex = 0;

    // 在文本中查找所有匹配
    while ((startIndex = text.indexOf(searchStr, startIndex)) !== -1) {
        try {
            const range = new Range();
            const endIndex = startIndex + searchStr.length;

            // 找到起始文本节点
            while (currentNodeIndex < textNodes.length && textNodesSize[currentNodeIndex] <= startIndex) {
                currentNodeIndex++;
            }
            const startNode = textNodes[currentNodeIndex];
            range.setStart(startNode, startIndex - (currentNodeIndex ? textNodesSize[currentNodeIndex - 1] : 0));

            // 找到结束文本节点
            while (currentNodeIndex < textNodes.length && textNodesSize[currentNodeIndex] < endIndex) {
                currentNodeIndex++;
            }
            const endNode = textNodes[currentNodeIndex];
            range.setEnd(endNode, endIndex - (currentNodeIndex ? textNodesSize[currentNodeIndex - 1] : 0));

            highlight.value.ranges.push(range);
            
            // 🆕 记录这个 Range 所在块的索引
            const blockIndex = getBlockIndex(range.startContainer as HTMLElement);
            highlight.value.blockIndices.push(blockIndex);
        } catch (e) {
            console.error("searchMarkRender error:", e);
        }
        
        startIndex += searchStr.length;
    }

    // 高亮所有匹配
    highlight.value.ranges.forEach(range => {
        highlight.value.mark.add(range);
    });

    CSS.highlights.set("search-results", highlight.value.mark);

    // 🆕 更新当前 DOM 中的匹配数量
    domMatchCount.value = highlight.value.ranges.length;
    
    // 🆕 显示逻辑：
    // - 如果已有完整总数（fullMatchCount > 0），使用它
    // - 否则使用 DOM 中的数量作为临时显示
    if (fullMatchCount.value > 0) {
        resultCount.value = fullMatchCount.value;
    } else if (change) {
        // 新搜索且还没有完整总数，先显示 DOM 数量
        resultCount.value = domMatchCount.value;
    }
    // 重试期间（change === false）且没有完整总数时，不更新 resultCount
}

function highlightHitResult(value: string, change: boolean) {
    searchMarkRender(value, change);
    props.plugin?.updateLastHighlightComponent?.(props.element);
}

function clearHighlight() {
    CSS.highlights.delete("search-results");
    CSS.highlights.delete("search-focus");
    highlight.value.mark.clear();
    highlight.value.markHL.clear();
    highlight.value.ranges = [];
    highlight.value.blockIndices = [];  // 🆕 清除块索引
    highlight.value.rangeIndex = 0;
    resultCount.value = 0;
    resultIndex.value = 0;
    fullMatchCount.value = 0;  // 🆕 清除完整总数
    domMatchCount.value = 0;   // 🆕 清除 DOM 数量
    totalBlockCount.value = 0; // 🆕 清除总块数
}

defineExpose({
    highlightHitResult
});

// 🆕 清除待定导航
function clearPendingNavigation() {
    if (pendingNavigation.value.timer) {
        window.clearTimeout(pendingNavigation.value.timer);
        pendingNavigation.value.timer = 0;
    }
    pendingNavigation.value.active = false;
    pendingNavigation.value.attempts = 0;
}

// 🆕 开始待定导航
function beginPendingNavigation() {
    clearPendingNavigation();
    pendingNavigation.value.active = true;
    pendingNavigation.value.attempts = 0;
}

// 🆕 检查 Range 是否有效（在 DOM 中）
function isRangeValid(range: Range): boolean {
    try {
        const rect = range.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
    } catch (e) {
        return false;
    }
}

// 🆕 近似滚动（参考 siyuan-sou-easy，使用块索引）
function scrollApproximateMatchIntoView(index: number): boolean {
    const docContentElement = props.edit.querySelector(':scope > .protyle:not(.fn__none) :is(.protyle-content:not(.fn__none), .protyle-preview:not(.fn__none))') as HTMLElement;
    if (!docContentElement) return false;

    // 🆕 使用块索引而不是匹配索引
    const blockIndex = highlight.value.blockIndices[index] || 0;
    const totalBlocks = totalBlockCount.value > 0 ? totalBlockCount.value : 1;

    // 使用块索引比例估算位置
    const ratio = (blockIndex + 0.5) / totalBlocks;
    const scrollHeight = Math.max(docContentElement.scrollHeight || 0, docContentElement.clientHeight || 0, 1);
    const clientHeight = Math.max(docContentElement.clientHeight || 0, 1);
    const maxScrollTop = Math.max(0, scrollHeight - clientHeight);

    const nextScrollTop = Math.max(
        0,
        Math.min(
            maxScrollTop,
            (ratio * scrollHeight) - (clientHeight / 2)
        )
    );

    docContentElement.scrollTop = nextScrollTop;
    return true;
}

// 🆕 尝试滚动到匹配（返回结果状态）
function scrollMatchIntoView(index: number): 'scrolled' | 'missing' | 'visible' {
    const range = highlight.value.ranges[index];
    if (!range) return 'missing';

    // 检查 Range 是否有效
    if (!isRangeValid(range)) {
        return 'missing';
    }

    // 滚动到 Range
    scrollToCurrent(range);
    return 'scrolled';
}

// 🆕 重试待定导航（参考 siyuan-sou-easy）
function retryPendingNavigation() {
    if (!pendingNavigation.value.active) return;

    const index = highlight.value.rangeIndex;

    // 重新计算搜索结果（DOM 可能已更新）
    searchMarkRender(searchText.value, false);

    // 尝试直接滚动
    const result = scrollMatchIntoView(index);

    if (result !== 'missing') {
        // 成功，清除待定状态
        clearPendingNavigation();
        return;
    }

    // 失败，使用近似滚动
    if (!scrollApproximateMatchIntoView(index)) {
        clearPendingNavigation();
        return;
    }

    // 增加重试次数
    pendingNavigation.value.attempts++;

    // 最多重试 40 次（约 5 秒）
    if (pendingNavigation.value.attempts >= pendingNavigation.value.maxAttempts) {
        clearPendingNavigation();
        return;
    }

    // 120ms 后重试
    pendingNavigation.value.timer = window.setTimeout(() => {
        retryPendingNavigation();
    }, 120);
}

// 🆕 完全模仿思源的 scrollToCurrent 实现
function scrollToCurrent(currentRange: Range) {
    const docContentElement = props.edit.querySelector(':scope > .protyle:not(.fn__none) :is(.protyle-content:not(.fn__none), .protyle-preview:not(.fn__none))') as HTMLElement;
    if (!docContentElement) return;

    const contentRect = docContentElement.getBoundingClientRect();
    
    // 思源的居中公式
    docContentElement.scrollTop = docContentElement.scrollTop + 
        currentRange.getBoundingClientRect().top - 
        contentRect.top - 
        contentRect.height / 2;
}

// 🆕 完全模仿思源的 renderNextSearchMark 实现
function clickNext() {
    if (highlight.value.ranges.length === 0) return;

    // 递增索引（循环）
    highlight.value.rangeIndex++;
    if (highlight.value.rangeIndex >= highlight.value.ranges.length) {
        highlight.value.rangeIndex = 0;
    }

    // 更新显示索引
    resultIndex.value = highlight.value.rangeIndex + 1;

    // 清除旧高亮
    highlight.value.mark.clear();
    highlight.value.markHL.clear();

    // 重新设置高亮
    let currentRange: Range | null = null;
    highlight.value.ranges.forEach((range, index) => {
        if (index === highlight.value.rangeIndex) {
            highlight.value.markHL.add(range);
            currentRange = range;
        } else {
            highlight.value.mark.add(range);
        }
    });

    CSS.highlights.set("search-results", highlight.value.mark);
    CSS.highlights.set("search-focus", highlight.value.markHL);

    // 🆕 尝试滚动，如果失败则启动重试机制
    const result = scrollMatchIntoView(highlight.value.rangeIndex);
    
    if (result === 'missing') {
        // 开始待定导航和重试
        beginPendingNavigation();
        retryPendingNavigation();
    }
}

function clickLast() {
    if (highlight.value.ranges.length === 0) return;

    // 递减索引（循环）
    highlight.value.rangeIndex--;
    if (highlight.value.rangeIndex < 0) {
        highlight.value.rangeIndex = highlight.value.ranges.length - 1;
    }

    // 更新显示索引
    resultIndex.value = highlight.value.rangeIndex + 1;

    // 清除旧高亮
    highlight.value.mark.clear();
    highlight.value.markHL.clear();

    // 重新设置高亮
    let currentRange: Range | null = null;
    highlight.value.ranges.forEach((range, index) => {
        if (index === highlight.value.rangeIndex) {
            highlight.value.markHL.add(range);
            currentRange = range;
        } else {
            highlight.value.mark.add(range);
        }
    });

    CSS.highlights.set("search-results", highlight.value.mark);
    CSS.highlights.set("search-focus", highlight.value.markHL);

    // 🆕 尝试滚动，如果失败则启动重试机制
    const result = scrollMatchIntoView(highlight.value.rangeIndex);
    
    if (result === 'missing') {
        // 开始待定导航和重试
        beginPendingNavigation();
        retryPendingNavigation();
    }
}

function clickClose() {
    clearHighlight();
    clearPendingNavigation();  // 🆕 清除待定导航
    props.plugin?.closeCurrentSearchDialog?.(props.element);
}

// 🆕 切换大小写敏感
function toggleCaseSensitive() {
    caseSensitive.value = !caseSensitive.value;
    // 重新搜索
    if (searchText.value) {
        highlightHitResult(searchText.value, true);
    }
}

// 🆕 切换替换模式
function toggleReplaceMode() {
    replaceMode.value = !replaceMode.value;
}

// 🆕 替换当前匹配
async function replaceOne() {
    if (highlight.value.ranges.length === 0 || !replaceText.value) return;
    
    const currentRange = highlight.value.ranges[highlight.value.rangeIndex];
    if (!currentRange) return;
    
    try {
        // 获取当前匹配所在的块
        let blockElement = currentRange.commonAncestorContainer as Node;
        while (blockElement && blockElement.nodeType !== Node.ELEMENT_NODE) {
            blockElement = blockElement.parentNode!;
        }
        
        while (blockElement && !(blockElement as Element).hasAttribute('data-node-id')) {
            blockElement = blockElement.parentNode!;
        }
        
        if (!blockElement) return;
        
        const blockId = (blockElement as Element).getAttribute('data-node-id');
        if (!blockId) return;
        
        // 获取块内容
        const response = await fetch('/api/block/getBlockKramdown', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: blockId })
        });
        
        const data = await response.json();
        if (data.code !== 0 || !data.data) return;
        
        const oldContent = data.data.kramdown;
        
        // 执行替换（只替换第一个匹配）
        const searchStr = caseSensitive.value ? searchText.value : searchText.value.toLowerCase();
        const contentToSearch = caseSensitive.value ? oldContent : oldContent.toLowerCase();
        const matchIndex = contentToSearch.indexOf(searchStr);
        
        if (matchIndex === -1) return;
        
        const newContent = oldContent.substring(0, matchIndex) + 
                          replaceText.value + 
                          oldContent.substring(matchIndex + searchText.value.length);
        
        // 更新块
        await fetch('/api/block/updateBlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: blockId,
                dataType: 'markdown',
                data: newContent
            })
        });
        
        // 重新搜索
        setTimeout(() => {
            highlightHitResult(searchText.value, true);
        }, 100);
        
    } catch (e) {
        console.error('Replace one failed:', e);
    }
}

// 🆕 全部替换
async function replaceAll() {
    if (!searchText.value || !replaceText.value) return;
    
    const confirmMsg = `确定要将所有 "${searchText.value}" 替换为 "${replaceText.value}" 吗？`;
    if (!confirm(confirmMsg)) return;
    
    const docId = await getDocId();
    if (!docId) return;
    
    try {
        // 获取所有包含搜索文本的块
        const searchStr = caseSensitive.value ? searchText.value : searchText.value.toLowerCase();
        
        const response = await fetch('/api/query/sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stmt: `SELECT id, markdown FROM blocks WHERE root_id = '${docId}' ORDER BY sort`
            })
        });
        
        const data = await response.json();
        if (data.code !== 0 || !data.data) return;
        
        let replacedCount = 0;
        
        // 遍历所有块进行替换
        for (const block of data.data) {
            const content = block.markdown || '';
            const contentToSearch = caseSensitive.value ? content : content.toLowerCase();
            
            if (contentToSearch.includes(searchStr)) {
                // 执行替换（全部替换）
                const regex = caseSensitive.value 
                    ? new RegExp(escapeRegExp(searchText.value), 'g')
                    : new RegExp(escapeRegExp(searchText.value), 'gi');
                    
                const newContent = content.replace(regex, replaceText.value);
                
                if (newContent !== content) {
                    await fetch('/api/block/updateBlock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: block.id,
                            dataType: 'markdown',
                            data: newContent
                        })
                    });
                    replacedCount++;
                }
            }
        }
        
        alert(`已替换 ${replacedCount} 个块`);
        
        // 重新搜索
        setTimeout(() => {
            highlightHitResult(searchText.value, true);
        }, 200);
        
    } catch (e) {
        console.error('Replace all failed:', e);
        alert('替换失败：' + e);
    }
}

// 辅助函数：转义正则表达式特殊字符
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
</script>

<style scoped>
.search-dialog {
    display: flex;
    align-items: center;
    margin-top: 5px;
}
.search-input {
    margin-right: 5px;
}
.search-option-btn {
    min-width: 28px;
    height: 28px;
    padding: 0 6px;
    margin-right: 5px;
    border: 1px solid var(--b3-border-color);
    border-radius: 4px;
    background: var(--b3-theme-background);
    color: var(--b3-theme-on-background);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.15s ease;
}
.search-option-btn:hover {
    background: var(--b3-theme-background-light);
}
.search-option-btn--active {
    background: var(--b3-theme-primary);
    color: var(--b3-theme-on-primary);
    border-color: var(--b3-theme-primary);
}
.search-count {
    min-width: 35px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
}
.search-count--draggable {
    cursor: move;
    user-select: none;
}
.search-tools {
    display: flex;
    align-items: center;
}
.search-tools > div {
    display: flex;
    margin-left: 5px;
    align-items: center;
}
.icon--14_14 {
    width: 14px;
    height: 14px;
    margin: 5px;
}
.replace-dialog {
    display: flex;
    align-items: center;
    margin-top: 5px;
    padding-top: 5px;
    border-top: 1px solid var(--b3-border-color);
}
.replace-tools {
    display: flex;
    align-items: center;
}
.replace-tools > div {
    display: flex;
    margin-left: 5px;
    align-items: center;
    cursor: pointer;
}
.replace-tools > div:hover {
    opacity: 0.7;
}
</style>
