#!/usr/bin/env node
/**
 * 完整修复拖拽问题
 * 1. 修复拖拽时容器被拉伸的问题
 * 2. 记住最后一次移动的位置
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 完整修复拖拽功能...\n');

const jsPath = path.join(__dirname, 'package', 'index.js');
const cssPath = path.join(__dirname, 'package', 'index.css');

// 1. 修复 JavaScript - 添加宽度设置和位置记忆
let code = fs.readFileSync(jsPath, 'utf8');

// 修改 handleGlobalMouseMove - 添加宽度锁定
const mouseMovePattern = 'this.currentDraggingElement.style.position="fixed",this.currentDraggingElement.style.left=this.initialLeft+s+"px",this.currentDraggingElement.style.top=this.initialTop+i+"px",this.currentDraggingElement.style.zIndex="9999"';
const newMouseMove = 'const __width=this.currentDraggingElement.offsetWidth;this.currentDraggingElement.style.position="fixed",this.currentDraggingElement.style.width=__width+"px",this.currentDraggingElement.style.left=this.initialLeft+s+"px",this.currentDraggingElement.style.top=this.initialTop+i+"px",this.currentDraggingElement.style.right="auto",this.currentDraggingElement.style.zIndex="9999"';

if (code.indexOf(mouseMovePattern) !== -1) {
    code = code.replace(mouseMovePattern, newMouseMove);
    console.log('✅ 已修复拖拽时的宽度锁定');
} else {
    console.warn('⚠️  警告：找不到 handleGlobalMouseMove 代码');
}

// 修改 handleGlobalMouseUp - 保存位置
const mouseUpPattern = 're(this,"handleGlobalMouseUp",()=>{this.isDragging=!1,this.currentDraggingElement=null})';
const newMouseUp = 're(this,"handleGlobalMouseUp",()=>{if(this.currentDraggingElement){const n=this.currentDraggingElement.style.left,s=this.currentDraggingElement.style.top;localStorage.setItem("highlight-search-position",JSON.stringify({left:n,top:s}))}this.isDragging=!1,this.currentDraggingElement=null})';

if (code.indexOf(mouseUpPattern) !== -1) {
    code = code.replace(mouseUpPattern, newMouseUp);
    console.log('✅ 已添加位置记忆功能');
} else {
    console.warn('⚠️  警告：找不到 handleGlobalMouseUp 代码');
}

// 修改 addSearchElement - 恢复保存的位置
const addSearchPattern = 'u.className=`${ut} ${s?ut+"--mobile":""}`,s?r.insertAdjacentElement("afterend",u):r.appendChild(u);';
const newAddSearch = 'u.className=`${ut} ${s?ut+"--mobile":""}`,s?r.insertAdjacentElement("afterend",u):r.appendChild(u);try{const __pos=localStorage.getItem("highlight-search-position");if(__pos){const __p=JSON.parse(__pos);u.style.position="fixed",u.style.left=__p.left,u.style.top=__p.top,u.style.right="auto"}}catch(e){}';

if (code.indexOf(addSearchPattern) !== -1) {
    code = code.replace(addSearchPattern, newAddSearch);
    console.log('✅ 已添加位置恢复功能');
} else {
    console.warn('⚠️  警告：找不到 addSearchElement 代码');
}

// 写入 JS
fs.writeFileSync(jsPath, code, 'utf8');

// 2. 修复 CSS - 确保容器不会被拉伸
let css = fs.readFileSync(cssPath, 'utf8');

// 修改 highlight-search-result 样式
const cssPattern = '.highlight-search-result{position:absolute;top:60px;right:70px;display:flex;flex-direction:column;min-width:300px}';
const newCss = '.highlight-search-result{position:absolute;top:60px;right:70px;display:flex;flex-direction:column;min-width:300px;max-width:600px;width:auto}';

if (css.indexOf(cssPattern) !== -1) {
    css = css.replace(cssPattern, newCss);
    console.log('✅ 已修复 CSS 容器样式');
} else {
    // 尝试部分匹配
    const partialPattern = '.highlight-search-result{position:absolute;top:60px;right:70px;';
    if (css.indexOf(partialPattern) !== -1) {
        console.log('⚠️  CSS 已被修改，跳过');
    } else {
        console.warn('⚠️  警告：找不到 CSS 样式');
    }
}

// 写入 CSS
fs.writeFileSync(cssPath, css, 'utf8');

console.log('\n✨ 修复完成！');
console.log('\n📝 修改说明：');
console.log('   1. 拖拽时锁定容器宽度，防止拉伸');
console.log('   2. 设置 right:auto，防止右边固定');
console.log('   3. 保存位置到 localStorage');
console.log('   4. 下次打开时恢复到上次位置');
console.log('\n💡 使用：重新打包插件即可');
console.log('🔄 清除位置记忆：localStorage.removeItem("highlight-search-position")\n');
