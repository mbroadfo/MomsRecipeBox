# Project Jobjar

Future improvements, features, and tasks identified during development but not immediately implemented.

## New ideas

<!-- All current ideas have been implemented -->

## 🍃 Low Hanging Fruit / Quick Wins (1-3 days each)

### 16. Modern UI Notifications ✅ **COMPLETED**

- ✅ Replaced all alert() and confirm() popups with modern toast notifications and confirmation modals
- ✅ Updated UserManagementPage.tsx to use showToast() for success/error notifications
- ✅ Updated RecipeDetailContainer.tsx to use ConfirmModal for delete confirmation and showToast() for feedback
- ✅ Updated ShoppingListPage.tsx and Header.tsx placeholder alerts with informative toast notifications
- ✅ Improved user experience with consistent, non-blocking notification system
- **Impact**: Professional UI/UX with modern notification patterns
- **Result**: Eliminated jarring browser popups, improved accessibility and user experience

### 15. Fix User Invitation Email Flow ✅ **COMPLETED**

- ✅ Fixed Auth0 change_password API call to use correct public endpoint (not M2M authenticated)
- ✅ Resolved email template branding issue using application.name detection for Mom's Recipe Box
- ✅ Updated both welcome and password reset templates with working conditional logic
- ✅ Verified end-to-end invitation flow with proper email delivery and branding
- **Impact**: Critical user onboarding experience now fully functional
- **Result**: Users receive properly branded Mom's Recipe Box invitation emails and can complete setup

### 6. Recipe Management UX Improvements ✅ **COMPLETED**

- Move delete recipe button to edit mode only
- Restrict delete functionality to recipe owners only
- Improve recipe ownership visual indicators
- **Impact**: High user safety, prevents accidental deletions
- **Effort**: Low - Simple UI changes and permission checks

### 14. Admin Mock Data Cleanup

- Remove "Coming Soon" placeholder in Recipe Moderation route (`/admin/recipes`)
- Clean up development-only mock authentication fallbacks in AdminContext.tsx
- Remove demo test files from admin/tests/ directory (demo_improvements.js, etc.)
- Replace hardcoded 'demo-user' fallbacks with proper authentication-only defaults
- Remove development console logging from admin API functions
- **Impact**: Professional admin interface, cleaner production environment
- **Effort**: Low - Remove placeholder UI and development artifacts

### 4. Cleanup Navigation and Action Bars

- Standardize navigation patterns across the UI
- Improve action bar consistency and usability
- Enhance responsive design for navigation elements
- **Impact**: Improved user experience consistency
- **Effort**: Low - UI consistency work, no new features

### 13. Admin vs Owner Permissions Review

- Analyze current admin capabilities vs recipe owners
- Define clear permission boundaries and roles
- Implement proper role-based access control
- **Impact**: Security foundation and clarity
- **Effort**: Low - Analysis and documentation task

## 🏗️ Major Projects (1-3 weeks each)

### 2. Implement Lambda Mode

- Complete Lambda mode implementation for serverless deployment
- Ensure feature parity between Express and Lambda modes
- Test and validate Lambda-specific functionality
- **Impact**: Infrastructure completion, cost optimization
- **Effort**: High - Infrastructure work, deployment architecture

### 7. Enhanced User Management

- Implement 2FA (Two-Factor Authentication)
- Add adaptive authentication based on risk assessment
- Integrate passkey support for passwordless authentication
- Enhance overall security posture
- **Impact**: Security and modern authentication
- **Effort**: High - Complex security features, Auth0 integration

### 8. Guest Access & Invitation System

- Implement guest access functionality
- Create invitation request system for non-members
- Design guest user experience and limitations
- **Impact**: User growth and accessibility
- **Effort**: High - New user workflow, authentication changes

### 11. Recipe Moderation System

- Implement recipe moderation workflow
- Add content review and approval process
- Create moderation tools for administrators
- **Impact**: Content quality and community management
- **Effort**: High - New admin workflow, content management

## 🔧 Minor Enhancements (2-5 days each)

### 5. AI Assistant Integration on Recipe Pages

- Implement AI assistant functionality on view recipe pages
- Add AI assistant to edit recipe pages
- Ensure seamless integration with existing recipe workflow
- **Impact**: Enhanced user engagement
- **Effort**: Medium - Extending existing AI functionality

### 10. Improve Add Recipe AI Assistant Quality

- Enhance AI assistant data quality validation
- Ensure AI-generated recipes meet quality standards
- Improve ingredient parsing and standardization
- **Impact**: Better AI-generated content quality
- **Effort**: Medium - Improving existing AI features

### 9. Edit Profile Implementation

- Create comprehensive profile editing interface
- Add profile image management
- Implement profile data validation and security
- **Impact**: Core user functionality
- **Effort**: Medium - Standard CRUD operations

### 1. Update Data Quality Check

- Enhance existing data quality validation systems
- Improve data integrity checks and reporting
- Add comprehensive data quality metrics and monitoring
- **Impact**: System reliability and data integrity
- **Effort**: Medium - Building on existing systems

### 3. Admin Infrastructure Updates (Gemini Suggestions)

- Review and implement Gemini's recommendations for admin infrastructure
- Evaluate suggested architectural improvements
- Update admin monitoring and management capabilities
- **Impact**: Incremental system improvements
- **Effort**: Medium - Incremental improvements to existing admin

## 🔍 Investigation/Analysis Tasks (1-2 days each)

### 12. Shopping Cart Performance Investigation

- Investigate excessive shopping cart API calls during recipe retrieval
- Optimize API call patterns and caching
- Reduce unnecessary network requests
- **Impact**: Performance improvement
- **Effort**: Investigation first, then implementation based on findings

## 📊 Recommended Implementation Strategy

### Phase 1: Quick Wins (1-2 weeks total)

1. **#14 - Admin Mock Data Cleanup** ⭐ **NEW HIGHEST PRIORITY** (production hygiene)
2. **#4 - Navigation Cleanup** (user experience)
3. **#13 - Permissions Review** (security foundation)

### Phase 2: High-Value Enhancements (2-3 weeks)

1. **#12 - Shopping Cart Performance** (investigate + fix)
2. **#5 - AI Assistant on Recipe Pages** (user engagement)
3. **#10 - AI Assistant Quality** (user experience)
4. **#9 - Edit Profile** (core functionality)

### Phase 3: Major Features (4-6 weeks)

1. **#2 - Lambda Mode** (infrastructure completion)
2. **#7 - Enhanced User Management** (2FA, passkeys)
3. **#8 - Guest Access System** (growth features)

### Phase 4: Advanced Features (ongoing)

1. **#11 - Recipe Moderation** (community management)
2. **#1 - Data Quality Updates** (continuous improvement)
3. **#3 - Admin Infrastructure** (ongoing optimization)

---

## 📝 Notes

- Items are prioritized by development impact and user value
- Each item should be broken down into specific tasks when implemented
- Consider dependencies between items when planning implementation order
- Regular review and reprioritization recommended

Last updated: October 23, 2025
