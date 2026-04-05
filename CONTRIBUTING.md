# Contributing to Document Highlight Search

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yshumy/siyuan-plugin-ss/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - SiYuan version and platform
   - Screenshots if applicable

### Suggesting Features

1. Check existing [Issues](https://github.com/yshumy/siyuan-plugin-ss/issues) for similar suggestions
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/siyuan-plugin-ss.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the code style guidelines
   - Add tests if applicable
   - Update documentation

4. **Test your changes**
   - Build the plugin: `npm run build`
   - Test in SiYuan Note
   - Verify no regressions

5. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation only
   - `style:` Code style (formatting, etc.)
   - `refactor:` Code refactoring
   - `test:` Adding tests
   - `chore:` Build process or tooling

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Link related issues

## Development Guidelines

### Code Style

#### TypeScript
- Use TypeScript strict mode
- Add type annotations for function parameters and return values
- Prefer `const` over `let`
- Use meaningful variable names

```typescript
// Good
const searchResults: Range[] = [];
function findMatches(text: string, caseSensitive: boolean): Range[] {
    // ...
}

// Bad
let r = [];
function find(t, c) {
    // ...
}
```

#### Vue
- Use Composition API with `<script setup>`
- Prefer `ref()` over `reactive()`
- Add TypeScript types for props

```vue
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    searchText: string;
    caseSensitive: boolean;
}>();

const results = ref<Range[]>([]);
</script>
```

#### CSS
- Use scoped styles
- Follow BEM naming convention
- Use CSS variables for theming

```css
.search-dialog {
    /* Block */
}

.search-dialog__input {
    /* Element */
}

.search-dialog--active {
    /* Modifier */
}
```

### Documentation

- Add JSDoc comments for public functions
- Update README.md for user-facing changes
- Update DEVELOPMENT.md for technical changes
- Add examples for complex features

```typescript
/**
 * Search for matches in the document
 * @param text - The search text
 * @param caseSensitive - Whether to match case
 * @returns Array of Range objects representing matches
 */
function searchDocument(text: string, caseSensitive: boolean): Range[] {
    // ...
}
```

### Testing

- Test on multiple platforms (Windows, macOS, Linux)
- Test on mobile if applicable
- Test with different document sizes
- Test edge cases (empty search, no matches, etc.)

### Performance

- Avoid blocking the UI thread
- Use debouncing for user input
- Minimize DOM manipulations
- Profile performance for large documents

## Project Structure

```
src/
├── index.ts          # Plugin entry point
├── Search.vue        # Main search component
├── Svg.vue          # Icon component
└── i18n/            # Translations
```

## Key Files

- `src/Search.vue` - Main search logic
- `plugin.json` - Plugin manifest
- `package.json` - Dependencies
- `vite.config.ts` - Build configuration

## Building

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build

# Output: dist/package.zip
```

## Testing Locally

1. Build the plugin
2. Copy `dist/` contents to `{workspace}/data/plugins/siyuan-plugin-ss/`
3. Restart SiYuan Note
4. Enable plugin in Settings → Plugins
5. Test your changes

## Debugging

### Enable Console Logging

Add debug logs in your code:

```typescript
console.log('[Search] Navigating to index:', index);
console.log('[Search] Total matches:', totalCount);
```

### Browser DevTools

1. Open SiYuan Note
2. Press `F12` to open DevTools
3. Check Console for logs
4. Use Sources tab for breakpoints

## Common Issues

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Type Errors

```bash
# Check TypeScript errors
npx tsc --noEmit
```

### Plugin Not Loading

1. Check `plugin.json` syntax
2. Verify `minAppVersion` compatibility
3. Check browser console for errors

## Review Process

1. Maintainer reviews code
2. Automated checks run (if configured)
3. Feedback provided if needed
4. Approved and merged when ready

## Questions?

- Open an [Issue](https://github.com/yshumy/siyuan-plugin-ss/issues)
- Ask in [SiYuan Community](https://ld246.com/)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions help make this plugin better for everyone. Thank you for your time and effort!
