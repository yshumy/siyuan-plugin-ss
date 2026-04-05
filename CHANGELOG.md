# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-04-05

### Added
- Full document search using SiYuan API
- Accurate match count across entire document (not just visible DOM)
- Smart navigation with retry mechanism for unloaded content
- Block index-based positioning for accurate scrolling
- Case sensitivity toggle (Aa button)
- Replace current match function
- Replace all matches function
- Drag to move search panel (desktop only)
- Keyboard shortcuts support

### Technical Improvements
- Asynchronous API calls don't block UI
- 400ms input debounce for better performance
- CSS Highlights API for efficient rendering
- Retry mechanism: up to 40 attempts (5 seconds) with 120ms intervals
- Block index ratio for approximate scrolling

### Fixed
- Long document search results incomplete issue
- Navigation to matches beyond visible content
- Match count accuracy in documents with lazy loading
- Search panel positioning and z-index issues

## [0.9.1] - 2025-12-24

### Fixed
- Unable to open search box when cursor is in Callout block within floating window

## [0.9.0] - 2025-11-17

### Added
- Multi-layer scroll container centering support
- Element visibility check for search results

### Fixed
- Floating window search functionality
- Mobile search functionality
- Inaccurate positioning due to zero-width spaces in .protyle-attr elements

## [0.8.0] - 2025-09-04

### Fixed
- Conflict with native search highlighting [#45](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/45)
- Highlight search not matching current document when search tab exists [#29](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/29)

## [0.7.0] - 2025-09-01

### Added
- Support for searching text containing zero-width spaces [#42](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/42)

## [0.6.0] - 2025-08-10

### Added
- Re-search when switching tabs [#2](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/2)
- Support for searching in export preview mode [#39](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/39)

## [0.5.0] - 2025-07-12

### Added
- Drag search result count text to move search component (desktop) [#16](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/16)
- Refresh highlighting after editing document [#24](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/24)
- Support for searching selected text [#20](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/20)
- Support for searching in floating windows [#27](https://github.com/TCOTC/siyuan-plugin-hsr-mdzz2048-fork/issues/27)

### Fixed
- Error when clicking buttons with empty search results

---

## Version Numbering

This project follows [Semantic Versioning](https://semver.org/):
- MAJOR version for incompatible API changes
- MINOR version for new functionality in a backwards compatible manner
- PATCH version for backwards compatible bug fixes

## Links

- [GitHub Repository](https://github.com/yshumy/siyuan-plugin-ss)
- [Issue Tracker](https://github.com/yshumy/siyuan-plugin-ss/issues)
- [SiYuan Community](https://ld246.com/)
