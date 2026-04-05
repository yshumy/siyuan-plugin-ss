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
            <div @click="clickClose">
                <Svg icon="#iconClose" class="icon--14_14"></Svg>
            </div>
        </div>
    </div>
    <div class="replace-dialog">
        <div class="b3-form__icon search-input">
            <input
                type="text"
                class="b3-text-field fn__size200"
                spellcheck="false"
                placeholder="替换为..."
                v-model="replaceText"
                @keydown.enter.exact="replaceOne()"
                @keydown.esc.exact="clickClose()"
            />
        </div>
        <div class="replace-tools">
            <button class="replace-btn" @click="replaceOne">替换当前</button>
            <button class="replace-btn" @click="replaceAll">替换全部</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineProps } from "vue";
import Svg from "./Svg.vue"
import { isMobile } from "./index"

const searchText = ref("")
const replaceText = ref("")
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
function getBlockIndex(node: Node): number {
    try {
        // 获取当前 DOM 中所有块
        const docRoot = props.edit.querySelector(':scope > .protyle:not(.fn__none) .protyle-wysiwyg') as HTMLElement
            || props.edit.querySelector('.protyle:not(.fn__none) .protyle-wysiwyg') as HTMLElement;
        
        if (!docRoot) return 0;
        
        const allBlocks = Array.from(docRoot.querySelectorAll('[data-node-id][data-type]'));
        
        // 如果是文本节点，获取其父元素
        let element: Element | null = null;
        if (node.nodeType === Node.TEXT_NODE) {
            element = node.parentElement;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            element = node as Element;
        }
        
        if (!element || typeof element.closest !== 'function') return 0;
        
        const blockElement = element.closest('[data-node-id][data-type]');
        
        if (!blockElement) return 0;
        
        return allBlocks.indexOf(blockElement);
    } catch (e) {
        console.error('getBlockIndex error:', e);
        return 0;
    }
}
async function getDocId(): Promise<string | null> {
    // 方法1：从 protyle-background 获取（最可靠）
    const bgElement = props.edit.querySelector('.protyle-background[data-node-id]') as HTMLElement;
    if (bgElement) {
        const docId = bgElement.getAttribute('data-node-id');
        console.log('[getDocId] 从 protyle-background 获取:', docId);
        return docId;
    }
    
    // 方法2：从 protyle-title 获取
    const titleElement = props.edit.querySelector('.protyle-title[data-node-id]') as HTMLElement;
    if (titleElement) {
        const docId = titleElement.getAttribute('data-node-id');
        console.log('[getDocId] 从 protyle-title 获取:', docId);
        return docId;
    }
    
    // 方法3：从任意块获取 root_id
    const anyBlock = props.edit.querySelector('[data-node-id]') as HTMLElement;
    if (anyBlock) {
        const blockId = anyBlock.getAttribute('data-node-id');
        console.log('[getDocId] 从任意块获取 blockId:', blockId);
        if (blockId) {
            try {
                const response = await fetch('/api/block/getBlockInfo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: blockId })
                });
                const data = await response.json();
                if (data.code === 0 && data.data) {
                    const rootId = data.data.rootID || data.data.root_id || null;
                    console.log('[getDocId] API 返回 rootId:', rootId);
                    return rootId;
                }
            } catch (e) {
                console.error('Failed to get doc id:', e);
            }
        }
    }
    
    console.log('[getDocId] 未找到文档 ID');
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
            console.log('[getFullMatchCount] 块数量:', data.data.length, '总内容长度:', fullContent.length, '前100字符:', fullContent.substring(0, 100));
            const searchContent = caseSensitive.value ? fullContent : fullContent.toLowerCase();
            const searchStr = caseSensitive.value ? searchText.trim() : searchText.trim().toLowerCase();
            
            // 统计匹配数量
            let count = 0;
            let pos = 0;
            while ((pos = searchContent.indexOf(searchStr, pos)) !== -1) {
                count++;
                pos += searchStr.length;
            }
            
            console.log('[getFullMatchCount] 搜索:', searchStr, '找到:', count, '个匹配');
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
        // 清除完整总数（新搜索）
        fullMatchCount.value = 0
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
            const blockIndex = getBlockIndex(range.startContainer);
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

    // 更新当前 DOM 中的匹配数量
    domMatchCount.value = highlight.value.ranges.length;
    
    // 显示逻辑：直接使用 DOM 中的匹配数量
    if (change || resultCount.value === 0) {
        resultCount.value = domMatchCount.value;
    }
    
    // 新搜索时，自动高亮第一个匹配
    if (change && highlight.value.ranges.length > 0) {
        highlight.value.rangeIndex = 0;
        resultIndex.value = 1;
        
        // 高亮第一个匹配
        const firstRange = highlight.value.ranges[0];
        highlight.value.markHL.clear();
        highlight.value.markHL.add(firstRange);
        CSS.highlights.set("search-focus", highlight.value.markHL);
        
        // 滚动到第一个匹配
        scrollMatchIntoView(0);
    }
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

// 🆕 替换当前匹配 - 直接操作当前 Range
async function replaceOne() {
    if (highlight.value.ranges.length === 0 || !replaceText.value) return;
    
    const currentRange = highlight.value.ranges[highlight.value.rangeIndex];
    if (!currentRange) return;
    
    try {
        // 获取当前匹配所在的块元素
        let node: Node | null = currentRange.startContainer;
        
        while (node && node.nodeType !== Node.ELEMENT_NODE) {
            node = node.parentNode;
        }
        
        let blockElement: Element | null = node as Element;
        while (blockElement && !blockElement.hasAttribute('data-node-id')) {
            blockElement = blockElement.parentElement;
        }
        
        if (!blockElement) {
            console.error('未找到块元素');
            return;
        }
        
        const blockId = blockElement.getAttribute('data-node-id');
        if (!blockId) {
            console.error('未找到块 ID');
            return;
        }
        
        // 获取块的 Kramdown 内容
        const getBlockResponse = await fetch('/api/block/getBlockKramdown', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: blockId })
        });
        
        const blockData = await getBlockResponse.json();
        if (blockData.code !== 0) {
            console.error('获取块内容失败:', blockData.msg);
            return;
        }
        
        let kramdown = blockData.data.kramdown;
        
        // 计算当前匹配在块内是第几个
        // 遍历所有 ranges，找到在同一个块内且在当前 range 之前的数量
        let matchIndexInBlock = 0;
        for (let i = 0; i < highlight.value.rangeIndex; i++) {
            const range = highlight.value.ranges[i];
            let rangeNode: Node | null = range.startContainer;
            while (rangeNode && rangeNode.nodeType !== Node.ELEMENT_NODE) {
                rangeNode = rangeNode.parentNode;
            }
            let rangeBlock: Element | null = rangeNode as Element;
            while (rangeBlock && !rangeBlock.hasAttribute('data-node-id')) {
                rangeBlock = rangeBlock.parentElement;
            }
            if (rangeBlock?.getAttribute('data-node-id') === blockId) {
                matchIndexInBlock++;
            }
        }
        
        console.log(`替换块 ${blockId} 中的第 ${matchIndexInBlock} 个匹配`);
        
        // 在 kramdown 中替换第 matchIndexInBlock 个匹配
        const searchPattern = searchText.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(searchPattern, caseSensitive.value ? 'g' : 'gi');
        
        let count = 0;
        const newKramdown = kramdown.replace(regex, (match) => {
            if (count === matchIndexInBlock) {
                count++;
                return replaceText.value;
            }
            count++;
            return match;
        });
        
        if (newKramdown === kramdown) {
            console.warn('未找到匹配的文本进行替换');
            return;
        }
        
        // 更新块内容
        const updateResponse = await fetch('/api/block/updateBlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: blockId,
                dataType: 'markdown',
                data: newKramdown
            })
        });
        
        const updateData = await updateResponse.json();
        if (updateData.code !== 0) {
            console.error('更新块失败:', updateData.msg);
            return;
        }
        
        console.log('替换成功');
        
        // 等待思源完成更新，然后重新搜索
        setTimeout(() => {
            resultCount.value = 0;
            domMatchCount.value = 0;
            highlightHitResult(searchText.value, true);
        }, 500);
        
    } catch (e) {
        console.error('替换失败:', e);
    }
}

// 🆕 全部替换 - 使用思源原生 API
async function replaceAll() {
    if (!searchText.value || !replaceText.value) return;
    
    const confirmMsg = `确定要将当前文档中所有的 "${searchText.value}" 替换为 "${replaceText.value}" 吗？`;
    if (!confirm(confirmMsg)) return;
    
    try {
        // 方法1: 从 DOM 获取文档信息
        const protyleElement = props.edit.querySelector('.protyle:not(.fn__none)') as HTMLElement;
        if (!protyleElement) {
            alert('无法获取文档信息');
            return;
        }
        
        // 从 protyle-title 或 protyle-wysiwyg 获取 data-node-id (这是文档的 root ID)
        let rootId = protyleElement.querySelector('.protyle-title')?.getAttribute('data-node-id');
        if (!rootId) {
            rootId = protyleElement.querySelector('.protyle-wysiwyg')?.getAttribute('data-node-id');
        }
        
        if (!rootId) {
            alert('无法获取文档 ID');
            return;
        }
        
        console.log('文档 rootId:', rootId);
        
        // 使用 API 获取文档的完整路径信息
        const docInfoResponse = await fetch('/api/block/getBlockInfo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: rootId })
        });
        
        const docInfo = await docInfoResponse.json();
        if (docInfo.code !== 0) {
            alert('获取文档信息失败：' + docInfo.msg);
            return;
        }
        
        const box = docInfo.data.box;  // notebook ID
        const path = docInfo.data.path;  // document path
        
        console.log('文档信息:', { box, path, rootId });
        
        if (!box || !path) {
            alert('无法获取文档路径信息');
            return;
        }
        
        // 构建 idPath: notebookId + path (保留 .sy 后缀)
        const idPath = `${box}${path}`;
        
        console.log('替换全部 - idPath:', idPath);
        
        // 调用思源原生替换 API
        const requestBody = {
            k: searchText.value,
            r: replaceText.value,
            method: caseSensitive.value ? 1 : 0,
            paths: [idPath],  // 使用 notebookId + docPath 格式（含 .sy）
            ids: [],  // 空数组表示替换路径下的所有匹配
            groupBy: 0,
            orderBy: 0,
            page: 1,
            types: {
                document: true,
                heading: true,
                list: true,
                listItem: true,
                codeBlock: true,
                mathBlock: true,
                table: true,
                blockquote: true,
                superBlock: true,
                paragraph: true,
                htmlBlock: true,
                audioBlock: true,
                videoBlock: true,
                iframeBlock: true,
                widgetBlock: true,
                embedBlock: true,
                databaseBlock: true,
                callout: true
            },
            replaceTypes: {
                text: true,
                imgText: true,
                imgTitle: true,
                imgSrc: true,
                aText: true,
                aTitle: true,
                aHref: true
            }
        };
        
        console.log('替换全部 - 请求参数:', requestBody);
        
        const response = await fetch('/api/search/findReplace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        console.log('替换全部 - 响应:', data);
        
        if (data.code !== 0) {
            alert('替换失败：' + data.msg);
            return;
        }
        
        alert('替换成功');
        
        // 等待思源完成替换操作，然后重新搜索
        setTimeout(() => {
            // 清空之前的搜索结果，强制完全重新搜索
            resultCount.value = 0;
            domMatchCount.value = 0;
            highlightHitResult(searchText.value, true);
        }, 800);
        
    } catch (e) {
        console.error('全部替换失败:', e);
        alert('替换失败：' + e);
    }
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
