#!/usr/bin/env node
/**
 * API 版本补丁 v2 - 修复可见性检查问题
 * 
 * 改进：
 * 1. 使用 API 获取完整文档内容
 * 2. 跳过可见性检查（因为我们要搜索全部内容）
 * 3. 确保搜索结果数量稳定
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始应用 API 版本补丁 v2...\n');

const indexPath = path.join(__dirname, 'package', 'index.js');
const backupPath = path.join(__dirname, 'package', 'index.js.backup');

// 备份
if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(indexPath, backupPath);
    console.log('✅ 已备份原文件');
}

let code = fs.readFileSync(indexPath, 'utf8');

// 1. 添加获取文档完整内容的函数
const getDocContentFunc = `
async function __getDocContent(n){
const docElement=n.edit.querySelector("[data-node-id][data-type='NodeDocument']");
if(!docElement)return null;
const docId=docElement.getAttribute("data-node-id");
if(!docId)return null;
try{
const res=await fetch("/api/filetree/getDoc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:docId,mode:0,size:Number.MAX_SAFE_INTEGER})});
const data=await res.json();
if(data.code===0&&data.data&&data.data.content)return data.data.content;
}catch(e){console.error("获取文档内容失败:",e)}
return null;
}
`.replace(/\n/g, '');

// 2. 找到搜索函数 j 的位置 - 更精确的匹配
const searchPattern = 'function j(R,w){var qe;h.clearCache();const N=R.trim();if(!N)return ie(),[];w&&(o.value=0,i.value=0);let S=n.edit.querySelector(":scope > .protyle:not(.fn__none) :is(.protyle-content:not(.fn__none) .protyle-wysiwyg, .protyle-preview:not(.fn__none) .b3-typography)");if(S||(S=n.edit.querySelector(".protyle:not(.fn__none) :is(.protyle-content:not(.fn__none) .protyle-wysiwyg, .protyle-preview:not(.fn__none) .b3-typography)")),!S)return[];';

if (code.indexOf(searchPattern) === -1) {
    console.error('❌ 错误：找不到搜索函数');
    process.exit(1);
}

// 3. 修改搜索函数，添加标记来跳过可见性检查
const modifiedSearchFunc = `${getDocContentFunc};async function j(R,w){var qe;h.clearCache();const N=R.trim();if(!N)return ie(),[];w&&(o.value=0,i.value=0);let S=n.edit.querySelector(":scope > .protyle:not(.fn__none) :is(.protyle-content:not(.fn__none) .protyle-wysiwyg, .protyle-preview:not(.fn__none) .b3-typography)");if(S||(S=n.edit.querySelector(".protyle:not(.fn__none) :is(.protyle-content:not(.fn__none) .protyle-wysiwyg, .protyle-preview:not(.fn__none) .b3-typography)")),!S)return[];let __useFullContent=false;const __docContent=await __getDocContent(n);if(__docContent){const __tempDiv=document.createElement("div");__tempDiv.innerHTML=__docContent;const __fullText=__tempDiv.textContent||__tempDiv.innerText||"";if(__fullText.length>S.textContent.length){const __tempContainer=document.createElement("div");__tempContainer.innerHTML=__docContent;__tempContainer.style.cssText="position:absolute;left:-9999px;top:-9999px;visibility:hidden;";document.body.appendChild(__tempContainer);S=__tempContainer;__useFullContent=true;setTimeout(()=>document.body.removeChild(__tempContainer),100);}}`;

code = code.replace(searchPattern, modifiedSearchFunc);
console.log('✅ 已修改搜索函数（添加完整内容标记）');

// 4. 修改可见性检查 - 当使用完整内容时跳过检查
const visibilityCheckPattern = 'if(h.isElementVisible($e.parentElement)&&h.isElementVisible(d.parentElement)){';
const modifiedVisibilityCheck = 'if(__useFullContent||h.isElementVisible($e.parentElement)&&h.isElementVisible(d.parentElement)){';

if (code.indexOf(visibilityCheckPattern) !== -1) {
    code = code.replace(visibilityCheckPattern, modifiedVisibilityCheck);
    console.log('✅ 已修改可见性检查（使用完整内容时跳过）');
} else {
    console.warn('⚠️  警告：找不到可见性检查代码');
}

// 5. 修改调用函数 k
const kPattern = 'function k(R,w){var S,I;const N=j(R,w);';
if (code.indexOf(kPattern) !== -1) {
    code = code.replace(kPattern, 'async function k(R,w){var S,I;const N=await j(R,w);');
    console.log('✅ 已修改函数 k 为 async');
}

// 写入
fs.writeFileSync(indexPath, code, 'utf8');

console.log('\n✨ 补丁应用完成！');
console.log('\n📝 改进说明：');
console.log('   1. 使用思源 API 获取完整文档内容');
console.log('   2. 跳过可见性检查（搜索全部内容）');
console.log('   3. 搜索结果数量不再受 DOM 加载影响');
console.log('   4. 点击下一个时结果总数保持稳定');
console.log('\n💡 优势：');
console.log('   - 搜索结果完整且稳定');
console.log('   - 不受懒加载影响');
console.log('   - 性能更好');
console.log('\n🔄 恢复：cp package/index.js.backup package/index.js\n');
