[English](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/blob/main/README.md)

# 思源笔记 文档高亮搜索 插件

> 注意：如果更新后无法打开搜索框，请重启一次思源笔记

#### 如何使用

启用后会在顶栏右边添加一个按钮，点击即可打开搜索。

另外还添加了快捷键 `Ctrl+Shift+Alt+F`，可以在快捷键设置自行修改。

只搜索当前页签内的文本，不包含界面和文档标题。

#### 近期更新

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

##### 2025-07-01

- 支持在浏览器、桌面端新窗口、移动端中使用插件 [#23](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/23)