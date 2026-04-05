# Development Documentation

## Project Structure

```
siyuan-plugin-ss/
├── src/                    # Source code
│   ├── index.ts           # Plugin entry point
│   ├── Search.vue         # Main search component
│   ├── Svg.vue           # SVG icon component
│   └── i18n/             # Internationalization
├── dist/                  # Build output
├── docs-release/          # Documentation
├── plugin.json           # Plugin manifest
├── package.json          # NPM dependencies
├── tsconfig.json         # TypeScript config
└── vite.config.ts        # Vite build config
```

## Core Components

### Search.vue

The main search component implementing:
- Full document search with SiYuan API
- Smart navigation with retry mechanism
- Replace functionality
- Highlight rendering

See [SEARCH_COMPONENT_DOCUMENTATION.md](./SEARCH_COMPONENT_DOCUMENTATION.md) for detailed technical documentation.

## Key Technologies

### CSS Highlights API

Used for efficient text highlighting without DOM manipulation:

```typescript
const highlight = new Highlight(...ranges);
CSS.highlights.set("search-results", highlight);
```

### SiYuan API Integration

#### Get Document Content
```typescript
POST /api/query/sql
{
  "stmt": "SELECT content FROM blocks WHERE root_id = '${docId}' ORDER BY sort"
}
```

#### Get Block Count
```typescript
POST /api/query/sql
{
  "stmt": "SELECT COUNT(*) as count FROM blocks WHERE root_id = '${docId}'"
}
```

#### Update Block
```typescript
POST /api/block/updateBlock
{
  "id": blockId,
  "dataType": "markdown",
  "data": newContent
}
```

## Core Algorithms

### 1. Block Index Positioning

```typescript
// Calculate relative position using block index
const blockIndex = highlight.value.blockIndices[index];
const ratio = (blockIndex + 0.5) / totalBlockCount;

// Calculate scroll position (centered)
const targetScrollTop = (ratio * scrollHeight) - (clientHeight / 2);
```

**Why block index?**
- Blocks are relatively evenly distributed in documents
- More accurate than text position
- Works well with virtual scrolling

### 2. Retry Mechanism

```typescript
function retryPendingNavigation() {
    // 1. Re-search DOM (may have updated)
    searchMarkRender(searchText.value, false);
    
    // 2. Try direct scroll
    const result = scrollMatchIntoView(index);
    if (result !== 'missing') {
        clearPendingNavigation();
        return;
    }
    
    // 3. Use approximate scroll
    scrollApproximateMatchIntoView(index);
    
    // 4. Retry after 120ms (max 40 times)
    if (attempts < 40) {
        setTimeout(() => retryPendingNavigation(), 120);
    }
}
```

**Parameters:**
- Retry interval: 120ms
- Max attempts: 40 (≈5 seconds)
- Inspired by siyuan-sou-easy plugin

### 3. Dual Count Mechanism

```typescript
// DOM count (immediate)
domMatchCount.value = highlight.value.ranges.length;

// Full count (async)
getFullMatchCount(searchText).then(count => {
    fullMatchCount.value = count;
    resultCount.value = count;
});

// Display logic
resultCount.value = fullMatchCount.value > 0 
    ? fullMatchCount.value 
    : domMatchCount.value;
```

## Development Setup

### Prerequisites

- Node.js >= 16
- npm or yarn
- SiYuan Note >= 3.1.0

### Installation

```bash
# Clone repository
git clone https://github.com/yshumy/siyuan-plugin-ss.git
cd siyuan-plugin-ss

# Install dependencies
npm install
```

### Development

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Create release package
npm run build
# Output: dist/package.zip
```

### Testing

1. Build the plugin
2. Copy `dist/` contents to `{workspace}/data/plugins/siyuan-plugin-ss/`
3. Restart SiYuan Note
4. Enable plugin in Settings → Plugins

### Debugging

Enable console logging in Search.vue:

```typescript
console.log('Search results:', highlight.value.ranges.length);
console.log('Navigating to index:', index);
```

## Code Style

### TypeScript

- Use strict type checking
- Prefer `const` over `let`
- Use async/await for promises
- Add JSDoc comments for public functions

### Vue

- Use Composition API (`<script setup>`)
- Prefer `ref()` over `reactive()`
- Use TypeScript for props

### Naming Conventions

- Components: PascalCase (e.g., `Search.vue`)
- Functions: camelCase (e.g., `searchMarkRender`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_ATTEMPTS`)
- CSS classes: kebab-case (e.g., `search-dialog`)

## Performance Optimization

### 1. Input Debounce

```typescript
const doneTypingInterval = 400; // 400ms debounce
```

### 2. Async API Calls

```typescript
// Don't block UI
Promise.all([
    getFullMatchCount(str),
    getTotalBlockCount()
]).then(([count, blockCount]) => {
    // Update after loading
});
```

### 3. Incremental Updates

```typescript
// Only update necessary parts during retry
searchMarkRender(searchText.value, false); // change=false
```

### 4. CSS Highlights API

- No DOM manipulation
- Browser-optimized rendering
- Better performance than manual highlighting

## Browser Compatibility

### Required Features

- CSS Highlights API
- TreeWalker API
- Range API
- Fetch API

### Fallbacks

None currently - requires modern browser with CSS Highlights support.

## Plugin Manifest

### plugin.json

```json
{
  "name": "siyuan-plugin-ss",
  "author": "yshumy",
  "url": "https://github.com/yshumy/siyuan-plugin-ss",
  "version": "1.0.0",
  "minAppVersion": "3.1.0",
  "backends": ["all"],
  "frontends": ["all"],
  "displayName": {
    "default": "Document Highlight Search",
    "zh_CN": "文档高亮搜索"
  }
}
```

## Build Configuration

### vite.config.ts

Key settings:
- Output format: IIFE
- External: siyuan
- Minification: enabled
- Source maps: disabled (production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Build/tooling

## Release Process

1. Update version in `plugin.json` and `package.json`
2. Update `CHANGELOG.md`
3. Build: `npm run build`
4. Test the build
5. Create git tag: `git tag v1.0.0`
6. Push: `git push --tags`
7. Create GitHub release with `dist/package.zip`

## Troubleshooting

### Search not working

1. Check browser console for errors
2. Verify SiYuan version >= 3.1.0
3. Check if CSS Highlights API is supported

### Navigation issues

1. Check `pendingNavigation` state
2. Verify `totalBlockCount` is loaded
3. Check console for retry logs

### Performance issues

1. Reduce `doneTypingInterval` if too slow
2. Check document size (very large documents may be slow)
3. Verify no infinite retry loops

## Resources

- [SiYuan Plugin API](https://github.com/siyuan-note/siyuan/blob/master/API.md)
- [CSS Highlights API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## License

MIT License - see [LICENSE](../LICENSE) file for details.
