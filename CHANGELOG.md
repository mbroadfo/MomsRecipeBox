# Changelog

All notable changes to the MomsRecipeBox project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-08-28

### Added

- Full shopping list functionality with MongoDB persistence
- Shopping list UI with recipe grouping and item management
- Test script for adding sample shopping list items
- Field naming compatibility between frontend and backend

### Fixed

- Shopping list items now display correctly regardless of field naming
- Field naming inconsistencies between frontend and backend
- Debug component repositioned to avoid overlapping with content
- Shopping list documentation updated to reflect current implementation

### Changed

- Removed debug logging statements from shopping list component
- Updated documentation across all README files
- Improved error handling in shopping list handlers
- Made UI components more robust with field name fallbacks

## [1.0.0] - 2025-08-01

### Features

- Initial release with recipe management functionality
- Image upload and management
- Favorites/likes system
- Comments functionality
- Interactive ingredient checkboxes
- Basic shopping list structure (backend)
