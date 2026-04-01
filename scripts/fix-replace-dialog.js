#!/usr/bin/env node
/**
 * 修复替换对话框问题
 * 1. 让替换对话框跟随搜索框移动
 * 2. 统一样式和布局
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修复替换对话框...\n');

const cssPath = path.join(__dirname, 'package', 'index.css');
const jsPath = path.join(__dirname, 'package', 'index.js');

// 备份
if (!fs.existsSync(cssPath + '.backup')) {
    fs.copyFileSync(cssPath, cssPath + '.backup');
    console.log('✅ 已备份 CSS 文件');
}

// 1. 修改 CSS - 让 replace-dialog 成为 search-dialog 的一部分
let css = fs.readFileSync(cssPath, 'utf8');

// 找到 .replace-dialog 的样式定义
const oldReplaceStyle = '.replace-dialog[data-v-d6e543e9]{display:flex;align-items:center;margin-top:5px;padding-top:5px;border-top:1px solid var(--b3-theme-surface-lighter)}';

// 新样式：去掉独立定位，让它成为 search-dialog 的子元素
const newReplaceStyle = '.replace-dialog[data-v-d6e543e9]{display:flex;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--b3-theme-surface-lighter);width:100%}';

if (css.indexOf(oldReplaceStyle) !== -1) {
    css = css.replace(oldReplaceStyle, newReplaceStyle);
    console.log('✅ 已修改 replace-dialog CSS 样式');
} else {
    console.log('⚠️  未找到 replace-dialog 样式，可能已经修改过');
}

// 确保 search-dialog 可以包含 replace-dialog
// 添加容器样式
const searchDialogPattern = '.highlight-search-result .search-dialog{position:relative;z-index:8;background-color:var(--b3-theme-surface);border:1px solid var(--b3-theme-surface);box-shadow:1px 2px 6px 1px #0003;border-radius:5px;padding:10px}';
const newSearchDialogStyle = '.highlight-search-result .search-dialog{position:relative;z-index:8;background-color:var(--b3-theme-surface);border:1px solid var(--b3-theme-surface);box-shadow:1px 2px 6px 1px #0003;border-radius:5px;padding:10px;display:flex;flex-direction:column;min-width:300px}';

if (css.indexOf(searchDialogPattern) !== -1) {
    css = css.replace(searchDialogPattern, newSearchDialogStyle);
    console.log('✅ 已修改 search-dialog 为 flex 容器');
}

// 写入 CSS
fs.writeFileSync(cssPath, css, 'utf8');

console.log('\n✨ CSS 修复完成！');
console.log('\n📝 修改说明：');
console.log('   1. replace-dialog 现在会跟随 search-dialog 一起移动');
console.log('   2. 统一了布局样式');
console.log('   3. 改善了视觉效果');
console.log('\n💡 使用：重新打包插件即可');
console.log('🔄 恢复：cp package/index.css.backup package/index.css\n');
