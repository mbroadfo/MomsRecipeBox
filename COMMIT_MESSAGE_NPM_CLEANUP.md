📦 MAJOR: NPM Script Cleanup - 47% Reduction (92→48 commands)

## Summary
Massive cleanup of npm scripts enabled by the unified four-profile deployment system.
Reduced from 92 npm scripts to 48 scripts, eliminating 44 redundant commands (47% reduction).

## Key Changes

### Core Lifecycle Updates
- `start/stop/restart`: Now use unified `profile:start`/`profile:stop`
- `dev` commands: Already integrated with profile system
- Eliminated mode-specific variants

### Removed Categories (44 commands total)
- **Profile-specific UI commands** (7): ui:build:atlas, ui:build:lambda, ui:preview:*, fullstack:*
- **Old environment management** (3): env:local, env:atlas, env:lambda  
- **Mode switching commands** (8): mode:show, mode:local, mode:atlas, etc.
- **Redundant deployment** (5): deploy:ui:dev, deploy:full:*, deploy:*:dry-run
- **Test command duplicates** (5): test:all, test:local, test:atlas, test:lambda:*
- **Setup variations** (3): setup:local, setup:atlas, setup:lambda
- **Build/backup variants** (12): build:lambda, backup:*, restore:*
- **Validation/maintenance duplicates** (5): validate:env, health:detailed, etc.

### Benefits
- ✅ 47% fewer commands to remember and maintain
- ✅ Unified workflow through profile system
- ✅ Eliminated redundancy and confusion
- ✅ All functionality preserved through profile system
- ✅ Better developer experience for onboarding

### New Simplified Workflow
```bash
npm run profile:set local   # Set deployment profile
npm run dev                 # Start development
npm run profile:set atlas   # Switch to cloud database
npm run restart             # Restart with new profile
```

## Technical Implementation
- Updated package.json scripts section
- Leveraged scripts/profile-manager.js for environment management
- Maintained all essential functionality through profile system
- Preserved infrastructure, testing, and deployment capabilities

## Files Modified
- `package.json` - Cleaned up scripts section
- `NPM_CLEANUP_COMPLETION.md` - Documentation of cleanup results

This cleanup demonstrates the power of the unified profile architecture:
**Complex system, simple interface** 🎉

---
*Scripts before: 92*
*Scripts after: 48* 
*Reduction: 44 commands (47%)*