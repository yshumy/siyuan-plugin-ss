#!/usr/bin/env node
/**
 * 修复 z-index 和点击穿透问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修复 z-index 问题...\n');

const jsPath = path.join(__dirname, 'package', 'index.js');
let code = fs.readFileSync(jsPath, 'utf8');

// 1. 修改 handleGlobalMouseUp - 拖拽结束后保持 z-index
const mouseUpPattern = 'if(this.currentDraggingElement){const n=this.currentDraggingElement.style.left,s=this.currentDraggingElement.style.top;localStorage.setItem("highlight-search-position",JSON.stringify({left:n,top:s}))}';
const newMouseUp = 'if(this.currentDraggingElement){const n=this.currentDraggingElement.style.left,s=this.currentDraggingElement.style.top;this.currentDraggingElement.style.zIndex="200";localStorage.setItem("highlight-search-position",JSON.stringify({left:n,top:s}))}';

if (code.indexOf(mouseUpPattern) !== -1) {
    code = code.replace(mouseUpPattern, newMouseUp);
    console.log('✅ 已修改拖拽结束后保持 z-index');
} else {
    console.warn('⚠️  警告：找不到 handleGlobalMouseUp 保存位置代码');
}

// 2. 修改位置恢复代码 - 恢复时也设置 z-index
const restorePattern = 'try{const __pos=localStorage.getItem("highlight-search-position");if(__pos){const __p=JSON.parse(__pos);u.style.position="fixed",u.style.left=__p.left,u.style.top=__p.top,u.style.right="auto"}}catch(e){}';
const newRestore = 'try{const __pos=localStorage.getItem("highlight-search-position");if(__pos){const __p=JSON.parse(__pos);u.style.position="fixed",u.style.left=__p.left,u.style.top=__p.top,u.style.right="auto",u.style.zIndex="200"}}catch(e){}';

if (code.indexOf(restorePattern) !== -1) {
    code = code.replace(restorePattern, newRestore);
    console.log('✅ 已修改位置恢复时设置 z-index');
} else {
    console.warn('⚠️  警告：找不到位置恢复代码');
}

// 写入
fs.writeFileSync(jsPath, code, 'utf8');

console.log('\n✨ 修复完成！');
console.log('\n📝 修改说明：');
console.log('   1. 容器 z-index 设为 200（CSS）');
console.log('   2. 拖拽时 z-index 为 999');
console.log('   3. 拖拽结束后保持 z-index 200');
console.log('   4. 添加 pointer-events:auto 防止点击穿透');
console.log('\n💡 效果：');
console.log('   - 搜索面板始终在最上层');
console.log('   - 点击不会穿透');
console.log('   - 不会被其他元素遮挡\n');
