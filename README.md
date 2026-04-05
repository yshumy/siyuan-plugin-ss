# Document Highlight Search / 文档高亮搜索

[中文文档](./README_zh_CN.md) | [English](./README.md)

A SiYuan Note plugin for searching and highlighting text within documents, with support for full document search including lazy-loaded content.

## Features

- 🔍 **Full Document Search**: Search entire document content, including parts not yet loaded (for long documents with lazy loading)
- 🎯 **Smart Navigation**: Intelligent retry mechanism for navigating to matches in unloaded content
- 📊 **Accurate Count**: Uses SiYuan API to get accurate total match count across the entire document
- 🔄 **Replace Function**: Replace current match or all matches in the document
- 🎨 **Highlight Display**: Visual highlighting of search results with focus indication
- ⌨️ **Keyboard Shortcuts**: Quick access via `Ctrl+Shift+Alt+F` (customizable)
- 📱 **Mobile Support**: Works on both desktop and mobile platforms
- 🎭 **Case Sensitivity**: Toggle between case-sensitive and case-insensitive search

## How to Use

### Basic Search

1. **Open Search Panel**:
   - Click the search button in the top bar (right side)
   - Or use keyboard shortcut: `Ctrl+Shift+Alt+F`

2. **Enter Search Text**:
   - Type your search query in the input field
   - Press `Enter` to navigate to next match
   - Press `Shift+Enter` to navigate to previous match
   - Press `Esc` to close the search panel

3. **Navigate Results**:
   - Click ↑ button to go to previous match
   - Click ↓ button to go to next match
   - Current position is shown as "X/Y" (e.g., "5/42")

### Advanced Features

#### Case Sensitivity
- Click the "Aa" button to toggle case sensitivity
- Blue = case-insensitive (default)
- Gray = case-sensitive

#### Replace Function
1. Click the replace icon (🔄) to show replace panel
2. Enter replacement text
3. Click "Replace Current" to replace the current match
4. Click "Replace All" to replace all matches in the document

#### Drag to Move
- On desktop: Click and drag the match count ("X/Y") to reposition the search panel

## Technical Details

### Full Document Search
- Uses SiYuan's `/api/query/sql` to fetch complete document content
- Counts matches across all blocks, not just visible DOM
- Asynchronous loading doesn't block UI

### Smart Navigation
- **Block Index Positioning**: Uses block indices for accurate scroll positioning
- **Retry Mechanism**: Automatically retries up to 40 times (5 seconds) when navigating to unloaded content
- **Approximate Scrolling**: Estimates scroll position using block index ratio
- **Range Validation**: Checks if target is in DOM before scrolling

### Performance
- 400ms input debounce to avoid excessive searches
- Incremental updates during retry
- CSS Highlights API for efficient rendering

## Installation

### From Marketplace
1. Open SiYuan Note
2. Go to Settings → Marketplace → Plugins
3. Search for "Document Highlight Search"
4. Click Install

### Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/yshumy/siyuan-plugin-ss/releases)
2. Extract the zip file to `{workspace}/data/plugins/`
3. Restart SiYuan Note
4. Enable the plugin in Settings → Plugins

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Search | `Ctrl+Shift+Alt+F` |
| Next Match | `Enter` |
| Previous Match | `Shift+Enter` |
| Close Search | `Esc` |
| Replace Current | `Enter` (in replace field) |

## Compatibility

- **SiYuan Version**: >= 3.1.0
- **Platforms**: Windows, macOS, Linux, Android, iOS
- **Browser**: Modern browsers with CSS Highlights API support

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for development documentation.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## License

MIT License - see [LICENSE](../LICENSE) file for details.

## Credits

Based on [siyuan-plugin-hsr-mdzz2048-fork](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork) by TCOTC.

Retry mechanism inspired by [siyuan-sou-easy](https://github.com/frostime/siyuan-sou-easy).

## Support

- [GitHub Issues](https://github.com/yshumy/siyuan-plugin-ss/issues)
- [SiYuan Community](https://ld246.com/)

## Author

yshumy - [GitHub](https://github.com/yshumy)
