[English](https://github.com/yshumy/siyuan-plugin-ss/blob/main/README.md)

#### 如何使用

启用后会在顶栏右边添加一个按钮，点击即可打开搜索。

另外还添加了快捷键 `Ctrl+Shift+Alt+F`，可以在快捷键设置自行修改。

搜索整个文档的完整内容，包括尚未加载的部分（针对长文档的懒加载）。搜索使用思源 API 获取完整文档内容，确保找到所有匹配项。

#### 近期更新

##### 2026-04-04

- 使用思源 API 获取完整文档内容进行搜索，解决长文档分段加载导致搜索结果不全的问题
- 搜索时自动触发未加载内容的加载和高亮显示

##### 2025-12-24

- 修复光标在浮窗内的 Callout block 中时无法打开搜索框的问题

##### 2025-11-17

- 支持多层滚动容器的居中显示
- 搜索时检查元素可见性，仅显示可见的元素作为搜索结果
- 修复浮窗搜索和移动端搜索功能失效的问题
- 修复因 .protyle-attr 元素中的零宽空格导致搜索结果定位不准确的问题

##### 2025-09-04

- 解决与原生搜索高亮的冲突 [#45](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/45)
- 存在搜索页签时，高亮搜索匹配不到当前文档 [#29](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/29)

##### 2025-09-01

- 支持搜索包含零宽空格的文本 [#42](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/42)

##### 2025-08-10

- 切换页签时重新搜索 [#2](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/2)
- 支持在导出预览模式搜索 [#39](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/39)

##### 2025-07-12

- 桌面端拖拽搜索结果数量文本可以移动搜索组件位置 [#16](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/16)
- 解决搜索结果为空时点击按钮报错
- 编辑文档后刷新高亮 [#24](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/24)
- 支持选中文本搜索 [#20](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/20)
- 支持在浮窗中搜索 [#27](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/27)
