<template>
    <div class="search-dialog">
        <div class="b3-form__icon search-input">
            <input
                type="text"
                class="b3-text-field fn__size200"
                spellcheck="false"
                :placeholder="placeholder"
                v-model="searchText"
                @keydown.enter.exact="handleEnterKey()"
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
            <div @click="toggleReplace" 
                 :class="{'search-tool--active': showReplace}"
                 :title="plugin?.i18n?.replace || 'Replace'">
                <Svg icon="#iconReplace" class="icon--14_14"></Svg>
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineProps, defineExpose } from "vue";
import Svg from "./Svg.vue"
import { isMobile } from "./index"
import { fetchSyncPost } from "siyuan";
import { SearchEngine, SearchMatch } from "./utils/search-engine";
import { ReplaceUtil } from "./utils/replace-util";

const props = defineProps<{
    edit: Element,
    element: Element,
    plugin: any,
}>()

const searchText = ref("")
const resultCount = ref(0)
const resultIndex = ref(0)
const resultRange = ref<Range[]>([])
const caseSensitive = ref(false)
const showReplace = ref(false)
const replaceText = ref("")
const placeholder = "🔍︎ (Shift) + Enter"

const searchEngine = new SearchEngine();
let typingTimer: number | undefined;
const doneTypingInterval = 800; // 增加防抖时间，减少大型文档下的计算频率

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
                if (resultIndex.value >= 1) {
                    scroollIntoRanges(resultIndex.value - 1, false);
                }
            } else {
                calculateSearchResults(searchText.value, false);
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
            } else {
                calculateSearchResults(searchText.value, false);
            }
        }, doneTypingInterval);
    }
}

function handleInput() {
    // 如果搜索词为空，立即清除高亮，不等待防抖
    if (!searchText.value.trim()) {
        clearTimeout(typingTimer);
        clearHighlight();
        resultCount.value = 0;
        resultIndex.value = 0;
        return;
    }

    clearTimeout(typingTimer);
    typingTimer = window.setTimeout(() => {
        highlightHitResult(searchText.value, true);
    }, doneTypingInterval);
}

function handleEnterKey() {
    // 如果当前有定时器在等待，说明用户按下了回车，我们立即执行搜索
    if (typingTimer) {
        clearTimeout(typingTimer);
        typingTimer = undefined;
        highlightHitResult(searchText.value, true);
    } else {
        // 如果没有定时器，说明搜索已经完成，执行“下一个”功能
        clickNext();
    }
}

function toggleCaseSensitive() {
    caseSensitive.value = !caseSensitive.value;
    highlightHitResult(searchText.value, true);
}

function toggleReplace() {
    showReplace.value = !showReplace.value;
}

async function replaceAll() {
    if (!searchText.value || !resultRange.value || resultRange.value.length === 0) return;
    
    const confirmMsg = `${props.plugin?.i18n?.replaceAll || 'Replace All'} "${searchText.value}" -> "${replaceText.value}"?`;
    if (!confirm(confirmMsg)) return;

    const blockIds = new Set<string>();
    for (const range of resultRange.value) {
        const container = range.commonAncestorContainer;
        const element = (container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement) as HTMLElement;
        const blockElement = element.closest('[data-node-id]');
        if (blockElement) {
            const id = blockElement.getAttribute('data-node-id');
            if (id) blockIds.add(id);
        }
    }

    let successCount = 0;
    for (const blockId of blockIds) {
        try {
            const response = await fetchSyncPost("/api/block/getBlockKramdown", { id: blockId });
            if (response?.code === 0 && response.data) {
                const kramdown = response.data.kramdown;
                const newKramdown = ReplaceUtil.safeReplace(kramdown, searchText.value, replaceText.value, caseSensitive.value);
                
                if (newKramdown !== kramdown) {
                    const updateRes = await fetchSyncPost("/api/block/updateBlock", {
                        dataType: "markdown",
                        data: newKramdown,
                        id: blockId
                    });
                    if (updateRes?.code === 0) successCount++;
                }
            }
        } catch (e) {
            console.error(`[Search Plugin] Replace failed for block ${blockId}:`, e);
        }
    }

    // 使用思源消息提示
    if (window.siyuan?.languages) {
        const msg = `Replace completed: ${successCount} blocks updated.`;
        fetchSyncPost("/api/notification/pushMsg", { msg, msgType: "info" });
    }

    setTimeout(() => {
        highlightHitResult(searchText.value, true);
    }, 300);
}

function calculateSearchResults(value: string, change: boolean): Range[] {
    searchEngine.clearCache();
    const str = value.trim();
    if (!str) {
        clearHighlight();
        return [];
    }

    if (change) {
        resultIndex.value = 0;
        resultCount.value = 0;
    }

    let docRoot = props.edit.querySelector(':scope > .protyle:not(.fn__none) :is(.protyle-content:not(.fn__none) .protyle-wysiwyg, .protyle-preview:not(.fn__none) .b3-typography)') as HTMLElement;
    if (!docRoot) {
        docRoot = props.edit.querySelector('.protyle:not(.fn__none) :is(.protyle-content:not(.fn__none) .protyle-wysiwyg, .protyle-preview:not(.fn__none) .b3-typography)') as HTMLElement;
    }
    if (!docRoot) return [];
    
    const docText = caseSensitive.value ? docRoot.textContent || "" : (docRoot.textContent || "").toLowerCase();
    const normalizedDocText = docText.replace(/[\u200B-\u200D\uFEFF]/g, '');

    const allTextNodes: Text[] = [];
    const incrLens: number[] = [];
    let currentLen = 0;

    const treeWalker = document.createTreeWalker(docRoot, NodeFilter.SHOW_TEXT);
    let currentNode = treeWalker.nextNode() as Text;
    while (currentNode) {
        allTextNodes.push(currentNode);
        currentLen += currentNode.textContent?.length || 0;
        incrLens.push(currentLen);
        currentNode = treeWalker.nextNode() as Text;
    }

    const searchVariants = searchEngine.generateSearchVariants(caseSensitive.value ? str : str.toLowerCase());
    const allMatches: SearchMatch[] = [];
    
    searchVariants.forEach((searchStr) => {
        let startIndex = 0;
        // 直接搜索
        while ((startIndex = docText.indexOf(searchStr, startIndex)) !== -1) {
            allMatches.push({ startIndex, endIndex: startIndex + searchStr.length, searchStr });
            startIndex += searchStr.length;
        }
        
        // 标准化搜索
        const normalizedSearchStr = searchStr.replace(/[\u200B-\u200D\uFEFF]/g, '');
        if (normalizedSearchStr !== searchStr || normalizedDocText !== docText) {
            startIndex = 0;
            while ((startIndex = normalizedDocText.indexOf(normalizedSearchStr, startIndex)) !== -1) {
                const originalStart = searchEngine.findOriginalPosition(docText, normalizedDocText, startIndex);
                const originalEnd = searchEngine.findOriginalPosition(docText, normalizedDocText, startIndex + normalizedSearchStr.length);
                if (originalStart !== -1 && originalEnd !== -1) {
                    allMatches.push({ startIndex: originalStart, endIndex: originalEnd, searchStr });
                }
                startIndex += normalizedSearchStr.length;
            }
        }
    });
    
    allMatches.sort((a, b) => a.startIndex - b.startIndex);
    
    const ranges: Range[] = [];
    const processedRanges = new Set<string>();
    
    allMatches.forEach((match) => {
        let isOverlapping = false;
        for (const proc of processedRanges) {
            const [pStart, pEnd] = proc.split('-').map(Number);
            if (match.startIndex < pEnd && match.endIndex > pStart) {
                isOverlapping = true;
                break;
            }
        }
        
        if (!isOverlapping) {
            try {
                const startNodeIdx = searchEngine.findNodeIndex(match.startIndex, incrLens);
                const startNode = allTextNodes[startNodeIdx];
                const startOffset = match.startIndex - (startNodeIdx > 0 ? incrLens[startNodeIdx - 1] : 0);
                
                const endNodeIdx = searchEngine.findNodeIndex(match.endIndex, incrLens);
                const endNode = allTextNodes[endNodeIdx];
                const endOffset = match.endIndex - (endNodeIdx > 0 ? incrLens[endNodeIdx - 1] : 0);
                
                if (searchEngine.isElementVisible(startNode.parentElement) && searchEngine.isElementVisible(endNode.parentElement)) {
                    const range = document.createRange();
                    range.setStart(startNode, startOffset);
                    range.setEnd(endNode, endOffset);
                    ranges.push(range);
                    processedRanges.add(`${match.startIndex}-${match.endIndex}`);
                }
            } catch (e) {}
        }
    });
    
    resultCount.value = ranges.length;
    resultRange.value = ranges;
    return ranges;
}

function highlightHitResult(value: string, change: boolean) {
    const ranges = calculateSearchResults(value, change);
    clearHighlight();
    if (ranges.length > 0) {
        CSS.highlights.set("search-results", new Highlight(...ranges));
        props.plugin?.updateLastHighlightComponent?.(props.element);
    }
}

function clearHighlight() {
    CSS.highlights.delete("search-results");
    CSS.highlights.delete("search-focus");
}

function findScrollContainers(element: Element): HTMLElement[] {
    const containers: HTMLElement[] = [];
    let current: Element | null = element;
    while (current && current !== document.body) {
        const el = current as HTMLElement;
        const style = window.getComputedStyle(el);
        const canScrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        const canScrollX = (style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth;
        if (canScrollY || canScrollX) containers.push(el);
        current = current.parentElement;
    }
    return containers;
}

function scrollContainerToRange(range: Range, container: HTMLElement) {
    const rangeRect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const style = window.getComputedStyle(container);
    
    if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && container.scrollHeight > container.clientHeight) {
        const centerY = (rangeRect.top + rangeRect.bottom) / 2 - containerRect.top + container.scrollTop;
        container.scrollTop = Math.max(0, Math.min(centerY - container.clientHeight / 2, container.scrollHeight - container.clientHeight));
    }
    if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && container.scrollWidth > container.clientWidth) {
        const centerX = (rangeRect.left + rangeRect.right) / 2 - containerRect.left + container.scrollLeft;
        container.scrollLeft = Math.max(0, Math.min(centerX - container.clientWidth / 2, container.scrollWidth - container.clientWidth));
    }
}

function scroollIntoRanges(index: number, scroll: boolean = true) {
    const ranges = resultRange.value;
    if (!ranges || ranges.length === 0) return;
    const range = ranges[index];
    if (scroll) {
        const ancestor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE ? range.commonAncestorContainer.parentElement : range.commonAncestorContainer as Element;
        if (ancestor) {
            const containers = findScrollContainers(ancestor);
            containers.forEach(c => scrollContainerToRange(range, c));
            if (containers.length === 0) {
                const docContent = props.edit.querySelector(':scope > .protyle:not(.fn__none) :is(.protyle-content:not(.fn__none), .protyle-preview:not(.fn__none))') as HTMLElement;
                if (docContent) scrollContainerToRange(range, docContent);
            }
        }
    }
    CSS.highlights.set("search-focus", new Highlight(range));
    props.plugin?.updateLastHighlightComponent?.(props.element);
}

function clickLast() {
    if (resultCount.value === 0) { resultIndex.value = 0; return; }
    resultIndex.value = resultIndex.value <= 1 ? resultCount.value : resultIndex.value - 1;
    scroollIntoRanges(resultIndex.value - 1);
}

function clickNext() {
    if (resultCount.value === 0) { resultIndex.value = 0; return; }
    resultIndex.value = resultIndex.value >= resultCount.value ? 1 : resultIndex.value + 1;
    scroollIntoRanges(resultIndex.value - 1);
}

function clickClose() {
    clearHighlight();
    props.plugin?.closeCurrentSearchDialog?.(props.element);
}

defineExpose({ highlightHitResult });
</script>

<style scoped>
.search-dialog { display: flex; align-items: center; margin-top: 5px; }
.replace-dialog { display: flex; align-items: center; margin-top: 5px; padding-top: 5px; border-top: 1px solid var(--b3-theme-surface-lighter); }
.replace-all-btn { margin-left: 8px; white-space: nowrap; padding: 4px 8px; font-size: 12px; }
.search-input { margin-right: 5px; }
.search-count { min-width: 35px; text-align: center; display: flex; align-items: center; justify-content: center; align-self: stretch; }
.search-count--draggable { cursor: move; user-select: none; }
.search-tools { display: flex; align-items: center; }
.search-tools > div { display: flex; margin-left: 5px; align-items: center; cursor: pointer; border-radius: 4px; padding: 2px; }
.search-tools > div:hover { background-color: var(--b3-theme-hover); }
.search-tool--active { color: var(--b3-theme-primary); background-color: var(--b3-theme-hover); }
.case-icon { font-size: 12px; font-weight: bold; padding: 0 4px; user-select: none; }
.icon--14_14 { width: 14px; height: 14px; margin: 5px; }
</style>
