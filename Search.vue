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
        <span class="search-count" 
              :class="{ 'search-count--draggable': !isMobile() }"
              @mousedown="handleMouseDown">{{ resultIndex + "/" + resultCount }}</span>
        <div class="search-tools">
            <div @click="toggleCaseSensitive" 
                 :class="{'search-tool--active': caseSensitive}"
                 :title="plugin?.i18n?.caseSensitive || 'Case Sensitive'">
                <span class="case-icon">Aa</span>
            </div>
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
    <div class="replace-dialog" v-if="resultCount > 0">
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineProps } from "vue";
import Svg from "./Svg.vue"
import { isMobile } from "./index"

const searchText = ref("")
const resultCount = ref(0)
const resultIndex = ref(0)
const resultRange = ref()
const caseSensitive = ref(false)
const replaceText = ref("")
const placeholder = "🔍︎ (Shift) + Enter"

/**
 * 生成搜索关键词的变体，解决 Issue #42：同时搜索包含空白字符和不包含空白字符的结果
 * @param searchStr 原始搜索关键词
 * @returns 包含原始关键词和变体的数组
 */
function generateSearchVariants(searchStr: string): string[] {
    if (!searchStr) return [];
    
    const variants = [searchStr];
    
    // 去除前后空白字符的变体
    const trimmed = searchStr.trim();
    if (trimmed !== searchStr) {
        variants.push(trimmed);
    }
    
    // 去除零宽空格和零宽连字的变体
    const noZeroWidth = searchStr.replace(/[\u200B-\u200D\uFEFF]/g, '');
    if (noZeroWidth !== searchStr) {
        variants.push(noZeroWidth);
    }
    
    // 去除所有空白字符的变体
    const noWhitespace = searchStr.replace(/\s/g, '');
    if (noWhitespace !== searchStr && noWhitespace.length > 0) {
        variants.push(noWhitespace);
    }
    
    // 去重并返回
    return [...new Set(variants)];
}

const props = defineProps<{
    edit: Element,
    element: Element,
    plugin: any, // 插件实例
}>()

// 设置焦点到输入框，并全选内容
onMounted(() => {
    const inputElement = props.element.querySelector('.search-dialog .b3-text-field') as HTMLInputElement;
    if (inputElement) {
        // 检查是否有预设的文本值（通过 data 属性传递）
        const presetText = props.element.getAttribute('data-preset-text');
        if (presetText) {
            props.element.removeAttribute('data-preset-text');
            // 如果有预设文本，设置到输入框并执行搜索
            searchText.value = presetText;
            inputElement.value = presetText;
            inputElement.focus();
            highlightHitResult(presetText, true);
        } else {
            // 没有预设文本，按照原来的逻辑
            inputElement.focus();
            inputElement.select();
        }
    }
    
    // 通知插件类组件已挂载
    props.plugin?.onSearchComponentMounted?.(eventBusHandle);
});

// 组件卸载时通知插件类
onUnmounted(() => {
    props.plugin?.onSearchComponentUnmounted?.(eventBusHandle);
});

// 拖拽处理函数
function handleMouseDown(event: MouseEvent) {
    if (isMobile()) return;
    // console.log("handleMouseDown: ", event);
    // 获取整个搜索对话框元素
    const searchDialog = (event.currentTarget as HTMLElement).closest('.search-dialog') as HTMLElement;
    
    // 使用插件提供的全局拖拽功能
    props.plugin?.startDragging?.(searchDialog, event.clientX, event.clientY);
    
    // 防止文本选择
    event.preventDefault();
}

function eventBusHandle(event: CustomEvent) {
    // console.log("event.detail: ", event.detail);
    // console.log("resultIndex.value: ", resultIndex.value);
    if (["savedoc", "rename"].includes(event.detail.cmd)) {
        // 处理 "ws-main" 事件
        // savedoc 之后可能有嵌入块更新，需要等一会
        clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => {
            // 这里不判断编辑的是否是当前文档才刷新高亮，因为别的文档更新可能影响当前文档的嵌入块
            // event.detail.data.rootID
            if (props.plugin?.isLastHighlightComponent?.(props.element)) {
                // 只有当前组件是最后执行 CSS.highlights.set 的组件时才执行高亮操作
                highlightHitResult(searchText.value, false);
                if (resultIndex.value >= 1) {
                    scroollIntoRanges(resultIndex.value - 1, false);
                }
            } else {
                // 不是最后高亮组件时，仅更新数字不执行高亮
                calculateSearchResults(searchText.value, false);
            }
        }, doneTypingInterval);
    } else if (["loaded-protyle-dynamic", "loaded-protyle-static", "switch-protyle", "switch-protyle-mode"].includes(event.type)) {
        // 动态加载、静态加载、切换页签后需要刷新搜索结果并高亮，并重置 resultIndex
        const protyleElement = event.detail?.protyle?.element;
        if (!protyleElement) {
            // 不存在编辑器，则不执行高亮
            // console.log("protyleElement: ", protyleElement);
            return;
        }
        const layoutTabContainer = protyleElement.closest(".layout-tab-container");
        if (layoutTabContainer && !layoutTabContainer.contains(props.element)) {
            // 如果这个组件不存在于对应的页签中，则不执行高亮
            // console.log("layoutTabContainer: ", layoutTabContainer);
            return;
        }
        const blockPopover = protyleElement.closest(".block__popover");
        if (blockPopover && !blockPopover.contains(props.element)) {
            // 如果这个组件不存在于对应的浮窗中，则不执行高亮
            // console.log("blockPopover: ", blockPopover);
            return;
        }
        clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => {
            // 这里无论是否为最后高亮组件，都重置 resultIndex，避免索引错位
            resultIndex.value = 0; // 文档加载或切换后重置索引
            if (props.plugin?.isLastHighlightComponent?.(props.element)) {
                // 只有当前组件是最后执行 CSS.highlights.set 的组件时才执行高亮操作
                highlightHitResult(searchText.value, false);
            } else {
                // 不是最后高亮组件时，仅更新数字不执行高亮
                calculateSearchResults(searchText.value, false);
            }
        }, doneTypingInterval);
    }
}

// 当文本框内容变动后超过0.4秒没有再次变动时，会触发 highlightHitResult 函数
let typingTimer: number | undefined; // 更新这里，初始化为 undefined
const doneTypingInterval = 400; // 0.4秒

function handleInput() {
    clearTimeout(typingTimer); // 清除之前的定时器
    typingTimer = window.setTimeout(() => { // 使用 window.setTimeout 并更新这里
        highlightHitResult(searchText.value, true); // 使用 .value 访问响应式变量的值
    }, doneTypingInterval);
}

function toggleCaseSensitive() {
    caseSensitive.value = !caseSensitive.value;
    highlightHitResult(searchText.value, true);
}

/**
 * 全部替换功能
 * 采用倒序替换策略，通过思源 API 批量更新受影响的块
 */
async function replaceAll() {
    if (!searchText.value || !resultRange.value || resultRange.value.length === 0) return;
    
    // 确认替换
    if (!confirm(`${props.plugin?.i18n?.replaceAll || 'Replace All'} "${searchText.value}" -> "${replaceText.value}"?`)) return;

    const ranges = [...resultRange.value] as Range[];
    // 倒序排列，防止前面的替换影响后面的偏移量
    // 注意：这里的 ranges 已经是按文档顺序排列的，所以直接 reverse 即可
    ranges.reverse();

    // 按块 ID 分组处理，减少 API 调用次数
    const blockUpdates = new Map<string, { element: HTMLElement, text: string }>();

    for (const range of ranges) {
        let container = range.commonAncestorContainer;
        let element = (container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement) as HTMLElement;
        
        // 向上查找所属的思源块 (拥有 data-node-id 属性)
        const blockElement = element.closest('[data-node-id]') as HTMLElement;
        if (!blockElement) continue;
        
        const blockId = blockElement.getAttribute('data-node-id');
        if (!blockId) continue;

        // 获取块的当前文本内容（这里简单处理，实际可能需要更复杂的 HTML/Markdown 处理）
        // 但由于我们是在 DOM 层面操作，且思源的编辑器是所见即所得的，
        // 我们可以直接操作块内的文本节点。
        
        // 为了保证准确性，我们直接在 Range 上进行替换操作
        // 注意：直接操作 DOM 不会触发思源的同步，所以我们需要在操作后获取块的 HTML 并调用 API
        const startNode = range.startContainer;
        const startOffset = range.startOffset;
        const endNode = range.endContainer;
        const endOffset = range.endOffset;

        if (startNode === endNode && startNode.nodeType === Node.TEXT_NODE) {
            const text = startNode.textContent || "";
            startNode.textContent = text.substring(0, startOffset) + replaceText.value + text.substring(endOffset);
        } else {
            // 跨节点的 Range 替换较为复杂，这里暂不处理或提示
            console.warn("Cross-node replacement is not supported yet.");
            continue;
        }

        // 记录需要更新的块
        if (!blockUpdates.has(blockId)) {
            blockUpdates.set(blockId, { element: blockElement, text: "" });
        }
    }

    // 调用思源 API 同步数据
    for (const [blockId, info] of blockUpdates) {
        try {
            // 获取修改后的块 HTML
            // 思源的编辑器内容在 .protyle-wysiwyg 内部
            // 我们需要获取块的 innerHTML 并通过 API 更新
            const html = info.element.innerHTML;
            
            // 调用思源 SDK 的更新块接口
            // 注意：这里假设插件实例上有 fetch 相关的工具或直接使用全局 fetch
            await (window as any).siyuan.fetchPost("/api/block/updateBlock", {
                dataType: "dom",
                data: html,
                id: blockId
            });
        } catch (e) {
            console.error(`Failed to update block ${blockId}:`, e);
        }
    }

    // 替换完成后，清除旧的高亮并重新搜索
    highlightHitResult(searchText.value, true);
}

// 计算搜索结果并更新数字，不执行高亮操作
function calculateSearchResults(value: string, change: boolean) {
    // 为空判断
    const str = caseSensitive.value ? value.trim() : value.trim().toLowerCase()
    if (!str) {
        // 当搜索文本为空时，清除已有的高亮
        // 但不需要重置计数，方便撤回文本框编辑的时候恢复索引位置
        clearHighlight();
        return [];
    }

    // 如果文本框内容改变，搜索结果和索引计数都立刻清零
    if (change == true) {
        resultIndex.value = 0
        resultCount.value = 0
    }

    // 获取文档根,后续直接对全文档文本进行搜索
    // 选择器1：桌面端正常打开的页签文档（直接子元素查找）
    let docRoot = props.edit.querySelector(':scope > .protyle:not(.fn__none) :is(.protyle-content:not(.fn__none) .protyle-wysiwyg, .protyle-preview:not(.fn__none) .b3-typography)') as HTMLElement;
    
    // 选择器2：桌面端浮窗和搜索窗口、移动端编辑器（内部查找，不限制为直接子元素）
    if (!docRoot) {
        docRoot = props.edit.querySelector('.protyle:not(.fn__none) :is(.protyle-content:not(.fn__none) .protyle-wysiwyg, .protyle-preview:not(.fn__none) .b3-typography)') as HTMLElement;
    }
    
    if (!docRoot) {
        return [];
    }
    
    const docText = caseSensitive.value ? docRoot.textContent : docRoot.textContent.toLowerCase();

    // 准备一个数组来保存所有文本节点
    const allTextNodes = [];
    let incr_lens = [];
    let cur_len0 = 0;

    const treeWalker = document.createTreeWalker(docRoot, NodeFilter.SHOW_TEXT);
    let currentNode = treeWalker.nextNode();
    while (currentNode) {
        allTextNodes.push(currentNode);
        cur_len0 += currentNode.textContent.length
        incr_lens.push(cur_len0);
        currentNode = treeWalker.nextNode();
    }

    // 生成搜索关键词的变体，解决 Issue #42：同时搜索包含空白字符和不包含空白字符的结果
    const searchVariants = generateSearchVariants(str);
    let ranges = [];
    
    // 对每个变体进行搜索，并记录已处理的位置以避免重叠
    const processedRanges = new Set<string>();
    
    // 双向匹配：不仅搜索关键词变体，还要考虑文档内容可能包含零宽空格的情况
    // 收集所有匹配位置，然后按位置排序，确保索引顺序正确
    const allMatches: Array<{startIndex: number, endIndex: number, searchStr: string}> = [];
    
    searchVariants.forEach((searchStr) => {
        let startIndex = 0;
        let endIndex = 0;
        
        // 方法1：直接搜索当前变体
        while ((startIndex = docText.indexOf(searchStr, startIndex)) !== -1) {
            endIndex = startIndex + searchStr.length;
            allMatches.push({startIndex, endIndex, searchStr});
            startIndex = endIndex;
        }
        
        // 方法2：搜索去除零宽空格后的文档内容
        // 注意：这里 docText 已经是根据 caseSensitive 处理过的
        const normalizedDocText = docText.replace(/[\u200B-\u200D\uFEFF]/g, '');
        const normalizedSearchStr = searchStr.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        if (normalizedSearchStr !== searchStr || normalizedDocText !== docText) {
            startIndex = 0;
            
            while ((startIndex = normalizedDocText.indexOf(normalizedSearchStr, startIndex)) !== -1) {
                endIndex = startIndex + normalizedSearchStr.length;
                
                // 将标准化后的位置转换为原始文档中的位置
                const originalStartIndex = findOriginalPosition(docText, normalizedDocText, startIndex);
                const originalEndIndex = findOriginalPosition(docText, normalizedDocText, endIndex);
                
                if (originalStartIndex !== -1 && originalEndIndex !== -1) {
                    allMatches.push({startIndex: originalStartIndex, endIndex: originalEndIndex, searchStr});
                }
                startIndex = endIndex;
            }
        }
    });
    
    // 按起始位置排序，确保搜索结果索引顺序正确
    allMatches.sort((a, b) => a.startIndex - b.startIndex);
    
    // 去重并创建 Range
    allMatches.forEach((match) => {
        // 检查是否与已处理的范围重叠
        let isOverlapping = false;
        for (const processedRange of processedRanges) {
            const [procStart, procEnd] = processedRange.split('-').map(Number);
            if (match.startIndex < procEnd && match.endIndex > procStart) {
                isOverlapping = true;
                break;
            }
        }
        
        if (!isOverlapping) {
            createRangeForPosition(match.startIndex, match.endIndex, 0, allTextNodes, incr_lens, processedRanges, ranges);
        }
    });
    
    /**
     * 检查元素是否可见
     * 使用最新的 checkVisibility() API 检查元素可见性
     * 参考：https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility
     * @param element 要检查的元素
     * @returns 如果元素可见返回 true，否则返回 false
     */
    function isElementVisible(element: Element | null): boolean {
        if (!element) return false;
        
        const htmlElement = element as HTMLElement;
        
        // 检查是否为 style 元素
        if (htmlElement.tagName?.toLowerCase() === 'style') {
            return false;
        }
        
        // 检查元素及其所有祖先元素是否有 fn__none 类（思源笔记用于隐藏元素的类，包括折叠的块）
        let current: Element | null = element;
        while (current && current !== document.body) {
            if ((current as HTMLElement).classList?.contains('fn__none')) {
                return false;
            }
            current = current.parentElement;
        }
        
        // 使用 checkVisibility() API 检查元素可见性
        // 该方法会自动检查元素及其所有祖先元素的可见性
        // 包括 display: none、content-visibility: hidden 等
        // 使用可选参数检查 visibility 和 opacity
        if (typeof htmlElement.checkVisibility === 'function') {
            return htmlElement.checkVisibility({
                visibilityProperty: true,
                opacityProperty: true,
            });
        }
        
        // 如果浏览器不支持 checkVisibility()，回退到手动检查
        // 检查计算样式
        const style = window.getComputedStyle(htmlElement);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return false;
        }
        
        // 递归检查父元素
        return isElementVisible(htmlElement.parentElement);
    }
    
    // 辅助函数：为指定位置创建 Range
    function createRangeForPosition(startIndex: number, endIndex: number, cur_nodeIdx: number, allTextNodes: Text[], incr_lens: number[], processedRanges: Set<string>, ranges: Range[]): boolean {
        try {
            const range = document.createRange();
            
            // 找到起始位置对应的文本节点和偏移量
            // incr_lens[i] 是到第 i 个节点（包含）为止的累计长度
            // 如果 startIndex < incr_lens[i]，说明 startIndex 在第 i 个节点内
            // 如果 startIndex == incr_lens[i]，说明 startIndex 在第 i 个节点的末尾，应该属于下一个节点
            // 如果 startIndex > incr_lens[i]，说明 startIndex 在第 i 个节点之后，应该继续查找
            let startNodeIdx = cur_nodeIdx;
            while (startNodeIdx < allTextNodes.length - 1 && incr_lens[startNodeIdx] <= startIndex) {
                startNodeIdx++
            }
            const startNode = allTextNodes[startNodeIdx];
            const startOffset = startIndex - (startNodeIdx > 0 ? incr_lens[startNodeIdx - 1] : 0);
            
            // 验证起始节点和偏移量是否正确
            const startNodeLen = startNode.textContent.length;
            if (startOffset < 0 || startOffset > startNodeLen) {
                return false;
            }
            
            // 找到结束位置对应的文本节点和偏移量
            let endNodeIdx = startNodeIdx;
            while (endNodeIdx < allTextNodes.length - 1 && incr_lens[endNodeIdx] < endIndex) {
                endNodeIdx++
            }
            const endNode = allTextNodes[endNodeIdx];
            const endOffset = endIndex - (endNodeIdx > 0 ? incr_lens[endNodeIdx - 1] : 0);
            
            // 验证结束节点和偏移量是否正确
            const endNodeLen = endNode.textContent.length;
            if (endOffset < 0 || endOffset > endNodeLen) {
                return false;
            }
            
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
            
            // 检查 Range 的起始和结束容器所在的元素是否可见
            // 文本节点本身不可见，需要检查包含它们的元素
            // startNode 和 endNode 都是 Text 节点，所以需要获取它们的父元素
            const startContainerElement = startNode.parentElement;
            const endContainerElement = endNode.parentElement;
            
            // 只有当起始和结束容器所在的元素都可见时，才添加 Range
            if (startContainerElement && endContainerElement && 
                isElementVisible(startContainerElement) && isElementVisible(endContainerElement)) {
                ranges.push(range);
                processedRanges.add(`${startIndex}-${endIndex}`);
                return true;
            }
        } catch (error) {
            console.error("Error setting range in node:", error);
        }
        return false;
    }
    
    // 辅助函数：将标准化后的位置转换为原始文档中的位置
    function findOriginalPosition(originalText: string, normalizedText: string, normalizedIndex: number): number {
        // 通过比较原始文本和标准化文本，精确定位对应位置
        // 关键：我们需要找到原始文本中对应标准化文本 normalizedIndex 位置的字符
        // 这个字符应该是第一个非零宽字符，且它在标准化文本中的位置是 normalizedIndex
        
        let originalIndex = 0;
        let normalizedIndexCount = 0;
        
        // 遍历原始文本，跳过零宽字符，直到达到标准化文本中的目标位置
        while (originalIndex < originalText.length && normalizedIndexCount < normalizedIndex) {
            // 检查当前字符是否为零宽字符
            if (!/[\u200B-\u200D\uFEFF]/.test(originalText[originalIndex])) {
                normalizedIndexCount++;
            }
            originalIndex++;
        }
        
        // 现在 originalIndex 指向原始文本中对应标准化文本 normalizedIndex 位置的字符
        // 但我们需要确保这个位置是正确的，即从该位置开始，去除零宽字符后应该匹配标准化文本
        
        // 验证找到的位置是否正确
        if (normalizedIndexCount === normalizedIndex && originalIndex <= originalText.length) {
            // 验证：从找到的位置开始，去除零宽字符后应该与标准化文本从 normalizedIndex 开始的部分匹配
            const remainingOriginal = originalText.slice(originalIndex).replace(/[\u200B-\u200D\uFEFF]/g, '');
            const remainingNormalized = normalizedText.slice(normalizedIndex);
            
            // 如果剩余部分匹配，说明位置正确
            if (remainingOriginal.startsWith(remainingNormalized.substring(0, Math.min(remainingOriginal.length, remainingNormalized.length)))) {
                // 但是，如果 originalIndex 指向的是零宽字符，我们需要跳过它，找到第一个非零宽字符
                // 因为 range 的起始位置应该指向实际文本的开始，而不是零宽字符
                while (originalIndex < originalText.length && /[\u200B-\u200D\uFEFF]/.test(originalText[originalIndex])) {
                    originalIndex++;
                }
                return originalIndex;
            }
        }
        
        return -1;
    }

    // 更新结果计数和范围
    resultCount.value = ranges.flat().length
    resultRange.value = ranges.flat()
    
    return ranges.flat()
}

// 执行高亮操作
function highlightHitResult(value: string, change: boolean) {
    const ranges = calculateSearchResults(value, change)
    
    if (ranges.length === 0) {
        // 当没有搜索结果时，清除高亮
        clearHighlight();
        return;
    }

    // 清除上个高亮
    clearHighlight();

    // 创建高亮对象
    const searchResultsHighlight = new Highlight(...ranges)
    
    // 注册高亮
    CSS.highlights.set("search-results", searchResultsHighlight)
    
    // 更新最后执行 CSS.highlights.set 的组件记录
    props.plugin?.updateLastHighlightComponent?.(props.element);
}

// 清除高亮
function clearHighlight() {
    CSS.highlights.delete("search-results");
    CSS.highlights.delete("search-focus");
}

// 暴露函数给外部调用
defineExpose({
    highlightHitResult
});
/**
 * 查找包含指定元素的所有滚动容器（从最内层到最外层）
 * 支持垂直和横向滚动容器
 * @param element 要查找的元素
 * @returns 滚动容器数组，从最内层到最外层
 */
function findScrollContainers(element: Element): HTMLElement[] {
    const containers: HTMLElement[] = [];
    let current: Element | null = element;
    
    // 收集所有滚动容器（从内到外）
    while (current && current !== document.body) {
        const htmlElement = current as HTMLElement;
        const overflowY = window.getComputedStyle(htmlElement).overflowY;
        const overflowX = window.getComputedStyle(htmlElement).overflowX;
        
        // 检查是否为滚动容器（垂直或横向）
        const canScrollY = (overflowY === 'auto' || overflowY === 'scroll') && 
                          htmlElement.scrollHeight > htmlElement.clientHeight;
        const canScrollX = (overflowX === 'auto' || overflowX === 'scroll') && 
                          htmlElement.scrollWidth > htmlElement.clientWidth;
        
        if (canScrollY || canScrollX) {
            containers.push(htmlElement);
        }
        
        current = current.parentElement;
    }
    
    return containers;
}

/**
 * 滚动容器以使 range 可见并尽量居中（支持垂直和横向滚动）
 * 在每一层容器中都尽量将关键词滚动到容器的几何中心
 * @param range 要滚动到的 range
 * @param container 滚动容器
 */
function scrollContainerToRange(range: Range, container: HTMLElement) {
    const rangeRect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const containerStyle = window.getComputedStyle(container);
    
    // 计算 range 的中心位置（相对于视口）
    const rangeCenterX = (rangeRect.left + rangeRect.right) / 2;
    
    // 检查容器的滚动方向
    const overflowY = containerStyle.overflowY;
    const overflowX = containerStyle.overflowX;
    const canScrollY = (overflowY === 'auto' || overflowY === 'scroll') && container.scrollHeight > container.clientHeight;
    const canScrollX = (overflowX === 'auto' || overflowX === 'scroll') && container.scrollWidth > container.clientWidth;
    
    // 处理垂直滚动
    if (canScrollY) {
        // 计算 range 中心相对于容器内容的垂直位置
        // 公式：range 中心在文档中的位置 = range 中心在屏幕上的位置 - 容器顶部在屏幕上的位置 + 容器当前滚动位置
        const rangeCenterY = (rangeRect.top + rangeRect.bottom) / 2;
        const rangeCenterYInContent = rangeCenterY - containerRect.top + container.scrollTop;
        
        // 计算使 range 中心对齐到容器中心需要的 scrollTop
        const targetScrollTop = rangeCenterYInContent - container.clientHeight / 2;
        
        // 计算最大和最小滚动位置
        const maxScrollTop = container.scrollHeight - container.clientHeight;
        const minScrollTop = 0;
        
        // 滚动到目标位置，但确保在有效范围内
        container.scrollTop = Math.max(minScrollTop, Math.min(targetScrollTop, maxScrollTop));
    }
    
    // 处理横向滚动
    if (canScrollX) {
        // 计算 range 中心相对于容器内容的横向位置
        const rangeCenterXInContent = rangeCenterX - containerRect.left + container.scrollLeft;
        
        // 计算使 range 中心对齐到容器中心需要的 scrollLeft
        const targetScrollLeft = rangeCenterXInContent - container.clientWidth / 2;
        
        // 计算最大和最小滚动位置
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        const minScrollLeft = 0;
        
        // 滚动到目标位置，但确保在有效范围内
        container.scrollLeft = Math.max(minScrollLeft, Math.min(targetScrollLeft, maxScrollLeft));
    }
}

function scroollIntoRanges(index: number, scroll: boolean = true) {
    const ranges = resultRange.value as Range[]
    if (!ranges || ranges.length === 0) {
        return
    }
    const range = ranges[index]
    // const parent = range.commonAncestorContainer.parentElement
    // parent.scrollIntoView({ behavior: 'smooth', block: "center" })

    if (scroll) {
        // 获取 range 的公共祖先元素
        const commonAncestor = range.commonAncestorContainer;
        const ancestorElement = commonAncestor.nodeType === Node.TEXT_NODE 
            ? commonAncestor.parentElement 
            : commonAncestor as Element;
        
        if (ancestorElement) {
            // 查找所有包含该 range 的滚动容器（从最内层到最外层）
            const scrollContainers = findScrollContainers(ancestorElement);
            
            // 从最内层到最外层，依次滚动每个容器
            // 每次滚动后，重新获取 range 的位置以确保准确性
            scrollContainers.forEach(container => {
                // 重新获取 range 的位置（因为之前的滚动可能已经改变了位置）
                scrollContainerToRange(range, container);
            });
            
            // 如果没有任何滚动容器，或者需要滚动主文档容器，则使用居中逻辑
            if (scrollContainers.length === 0) {
                const docContentElement = props.edit.querySelector(':scope > .protyle:not(.fn__none) :is(.protyle-content:not(.fn__none), .protyle-preview:not(.fn__none))') as HTMLElement;
                if (docContentElement) {
                    // 使用相同的居中逻辑处理主文档容器
                    scrollContainerToRange(range, docContentElement);
                }
            }
        }
    }
  
    CSS.highlights.set("search-focus", new Highlight(range))
    
    // 输出当前聚焦的 range 对应的元素信息
    // console.log("当前聚焦的 range 信息:", {
    //     range: range,
    //     startContainer: range.startContainer,
    //     endContainer: range.endContainer,
    //     startOffset: range.startOffset,
    //     endOffset: range.endOffset,
    //     textContent: range.toString(),
    //     commonAncestorContainer: range.commonAncestorContainer,
    //     parentElement: range.commonAncestorContainer.parentElement
    // });
    // console.log("range parentElement:", range.commonAncestorContainer.parentElement)

    // 更新最后执行 CSS.highlights.set 的组件记录
    props.plugin?.updateLastHighlightComponent?.(props.element);
}
function clickLast() { // 上一个
    if ((resultIndex.value > 1 && resultIndex.value <= resultCount.value) && resultCount.value != 0) {
        resultIndex.value = resultIndex.value - 1
    }
    else if ((resultIndex.value <= 1 || resultIndex.value > resultCount.value) && resultCount.value != 0) {
        resultIndex.value = resultCount.value
    }
    else if (resultCount.value == 0) {
        resultIndex.value = 0
    }
    scroollIntoRanges(resultIndex.value - 1)
}
function clickNext() { // 下一个
    if (resultIndex.value < resultCount.value) {
        resultIndex.value = resultIndex.value + 1
    }
    else if (resultIndex.value >= resultCount.value && resultCount.value != 0) {
        resultIndex.value = 1
    }
    else if (resultCount.value == 0) {
        resultIndex.value = 0
    }
    scroollIntoRanges(resultIndex.value - 1)
}
function clickClose() { // 关闭
    // 清除高亮
    clearHighlight();
    // 销毁当前组件实例
    props.plugin?.closeCurrentSearchDialog?.(props.element);
}
</script>

<style scoped>
.search-dialog {
    display: flex;
    align-items: center;
    margin-top: 5px;
}
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
.search-input {
    margin-right: 5px;
}
.search-count {
    min-width: 35px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch; /* 让元素拉伸到父容器高度 */
}
.search-count--draggable {
    cursor: move; /* 显示可拖拽光标 */
    user-select: none; /* 防止文本选择 */
}
.search-tools {
    display: flex;
    align-items: center;
}
.search-tools > div {
    display: flex;
    margin-left: 5px;
    align-items: center;
    cursor: pointer;
    border-radius: 4px;
    padding: 2px;
}
.search-tools > div:hover {
    background-color: var(--b3-theme-hover);
}
.search-tool--active {
    color: var(--b3-theme-primary);
    background-color: var(--b3-theme-hover);
}
.case-icon {
    font-size: 12px;
    font-weight: bold;
    padding: 0 4px;
    user-select: none;
}
.icon--14_14 {
    width: 14px;
    height: 14px;
    margin: 5px;
}
</style>