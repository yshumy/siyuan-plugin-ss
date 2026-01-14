/**
 * 替换工具类
 * 提供安全的 Markdown 内容替换功能
 */

export class ReplaceUtil {
    /**
     * 在 Kramdown 文本中安全地替换目标字符串
     * 避开链接地址、图片地址和属性标记
     */
    static safeReplace(kramdown: string, searchText: string, replaceText: string, caseSensitive: boolean): string {
        const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(escapedSearch, flags);

        // 简单的保护逻辑：
        // 我们将 Kramdown 分成“受保护区域”和“可替换区域”
        // 受保护区域包括：
        // 1. 链接/图片的目标地址: [text](target) 或 ![text](target)
        // 2. 属性标记: {: ...}
        
        // 这是一个简化的实现，通过占位符保护特定模式
        const protections: string[] = [];
        let protectedText = kramdown;

        // 1. 保护属性标记 {: ...}
        protectedText = protectedText.replace(/\{:.*?\}/g, (match) => {
            protections.push(match);
            return `__PROTECTED_${protections.length - 1}__`;
        });

        // 2. 保护链接和图片地址 [text](address)
        // 注意：只保护括号内的地址部分
        protectedText = protectedText.replace(/(!?\[.*?\])\((.*?)\)/g, (match, prefix, address) => {
            protections.push(address);
            return `${prefix}(__PROTECTED_${protections.length - 1}__)`;
        });

        // 执行替换
        let replacedText = protectedText.replace(regex, replaceText);

        // 还原受保护内容
        for (let i = protections.length - 1; i >= 0; i--) {
            replacedText = replacedText.replace(`__PROTECTED_${i}__`, protections[i]);
        }

        return replacedText;
    }
}
