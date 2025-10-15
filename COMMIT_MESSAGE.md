feat: implement unified four-profile deployment system

## Major Changes

### 🎯 New Four-Profile Architecture
- Replaced scattered mode configuration with unified profile system
- Added local, atlas, lambda, and cloud deployment profiles
- Each profile manages database, backend, frontend, and infrastructure consistently

### 🔧 Profile Management System
- New scripts/profile-manager.js for comprehensive profile management
- Added config/deployment-profiles.json with all profile definitions
- Dynamic environment generation in config/current-profile.env (git-ignored)
- Environment variable substitution from static to profile-specific values

### 📦 NPM Script Integration
- Added profile:* commands: show, list, set, local, atlas, lambda, cloud
- Added profile:validate, profile:start, profile:stop for infrastructure management
- Maintains backwards compatibility with existing mode:* scripts

### 🔧 Configuration Improvements
- Eliminated conflicting .env files between root and app directories
- Single source of truth for environment management
- Standardized mode values across all components
- Cross-platform Node.js implementation

### 📚 Documentation Updates
- Updated README.md with new Deployment Profiles section
- Comprehensive Quick Start Guide with profile selection workflow
- Added architecture documentation in docs/ directory
- Updated CHANGELOG.md with detailed feature breakdown

## Breaking Changes
- None - old mode scripts remain functional during transition

## Migration Guide
- Use `npm run profile:local` instead of `npm run mode:local`
- Use `npm run profile:show` to see current configuration
- All environment variables now managed automatically per profile

## Testing
- ✅ Profile switching works correctly
- ✅ Environment variable generation functional
- ✅ Backwards compatibility maintained
- ✅ Documentation updated and accurate

Fixes the mode configuration chaos that caused conflicts between root/.env and app/.env files, providing a clean, unified deployment system.

Co-authored-by: GitHub Copilot <copilot@github.com>