#!/usr/bin/env node
/**
 * 修复拖拽容器问题
 * 让拖拽作用于整个搜索组件容器，而不是只拖拽搜索框
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修复拖拽容器...\n');

const jsPath = path.join(__dirname, 'package', 'index.js');

// 读取代码
let code = fs.readFileSync(jsPath, 'utf8');

// 查找拖拽代码
const dragPattern = 'const w=R.currentTarget.closest(".search-dialog");';
const newDragCode = 'const w=R.currentTarget.closest(".highlight-search-result");';

if (code.indexOf(dragPattern) !== -1) {
    code = code.replace(dragPattern, newDragCode);
    console.log('✅ 已修改拖拽目标为父容器');
    
    // 写入
    fs.writeFileSync(jsPath, code, 'utf8');
    
    console.log('\n✨ 修复完成！');
    console.log('\n📝 修改说明：');
    console.log('   - 拖拽现在作用于 .highlight-search-result 容器');
    console.log('   - 搜索框和替换框会一起移动');
    console.log('\n💡 使用：重新打包插件即可\n');
} else {
    console.error('❌ 错误：找不到拖拽代码');
    process.exit(1);
}
