/**
 * 搜索引擎工具类
 * 用于处理文档内搜索、位置映射和可见性检查
 */

export interface SearchMatch {
    startIndex: number;
    endIndex: number;
    searchStr: string;
}

export class SearchEngine {
    private visibilityCache: Map<Element, boolean> = new Map();

    /**
     * 清除可见性缓存
     */
    clearCache() {
        this.visibilityCache.clear();
    }

    /**
     * 检查元素是否可见（带缓存优化）
     */
    isElementVisible(element: Element | null): boolean {
        if (!element) return false;
        if (element === document.body) return true;

        // 检查缓存
        if (this.visibilityCache.has(element)) {
            return this.visibilityCache.get(element)!;
        }

        const htmlElement = element as HTMLElement;

        // 基础检查
        if (htmlElement.tagName?.toLowerCase() === 'style' || 
            htmlElement.classList?.contains('fn__none')) {
            this.visibilityCache.set(element, false);
            return false;
        }

        // 使用 checkVisibility API
        if (typeof htmlElement.checkVisibility === 'function') {
            const isVisible = htmlElement.checkVisibility({
                visibilityProperty: true,
                opacityProperty: true,
            });
            if (!isVisible) {
                this.visibilityCache.set(element, false);
                return false;
            }
        } else {
            // 回退方案
            const style = window.getComputedStyle(htmlElement);
            if (style.display === 'none' || style.visibility === 'hidden') {
                this.visibilityCache.set(element, false);
                return false;
            }
        }

        // 递归检查父元素
        const isParentVisible = this.isElementVisible(htmlElement.parentElement);
        this.visibilityCache.set(element, isParentVisible);
        return isParentVisible;
    }

    /**
     * 使用二分查找定位索引所在的节点
     * @param index 目标索引
     * @param incrLens 累计长度数组
     * @returns 节点索引
     */
    findNodeIndex(index: number, incrLens: number[]): number {
        let low = 0;
        let high = incrLens.length - 1;
        
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const prevLen = mid > 0 ? incrLens[mid - 1] : 0;
            const currLen = incrLens[mid];
            
            if (index >= prevLen && index < currLen) {
                return mid;
            } else if (index < prevLen) {
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        return incrLens.length - 1;
    }

    /**
     * 生成搜索变体
     */
    generateSearchVariants(searchStr: string): string[] {
        if (!searchStr) return [];
        const variants = new Set([searchStr]);
        
        const trimmed = searchStr.trim();
        if (trimmed) variants.add(trimmed);
        
        const noZeroWidth = searchStr.replace(/[\u200B-\u200D\uFEFF]/g, '');
        if (noZeroWidth) variants.add(noZeroWidth);
        
        const noWhitespace = searchStr.replace(/\s/g, '');
        if (noWhitespace) variants.add(noWhitespace);
        
        return Array.from(variants);
    }

    /**
     * 将标准化位置映射回原始位置
     */
    findOriginalPosition(originalText: string, normalizedText: string, normalizedIndex: number): number {
        let originalIndex = 0;
        let normalizedIndexCount = 0;
        
        while (originalIndex < originalText.length && normalizedIndexCount < normalizedIndex) {
            if (!/[\u200B-\u200D\uFEFF]/.test(originalText[originalIndex])) {
                normalizedIndexCount++;
            }
            originalIndex++;
        }
        
        if (normalizedIndexCount === normalizedIndex) {
            while (originalIndex < originalText.length && /[\u200B-\u200D\uFEFF]/.test(originalText[originalIndex])) {
                originalIndex++;
            }
            return originalIndex;
        }
        return -1;
    }
}
