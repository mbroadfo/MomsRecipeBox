# Admin UI Implementation Plan
## MomsRecipeBox Admin Dashboard

### 📋 Overview
Build a comprehensive admin interface within the existing React application to manage users, moderate content, and view analytics.

### 🏗️ Architecture Approach

#### **Integration Strategy**
- **Route Protection**: Add admin-only routes with role-based access
- **Shared Components**: Leverage existing UI components and styling
- **Navigation**: Extend current navigation with admin section
- **Authentication**: Use existing Auth0 setup with admin role checks

#### **UI Framework Alignment**
- **React + TypeScript**: Match existing tech stack
- **Tailwind CSS**: Use established styling system
- **Component Structure**: Follow current patterns in `ui/src/components/`

### 🎯 Phase 1: Core Admin Dashboard

#### **1.1 Admin Route Setup**
```typescript
// New routes to add to App.tsx
/admin                    -> Admin Dashboard (landing page)
/admin/users             -> User Management
/admin/users/invite      -> Invite User Form
/admin/recipes           -> Recipe Moderation
/admin/analytics         -> System Analytics
```

#### **1.2 Components to Create**

**Admin Layout & Navigation:**
- `src/components/admin/AdminLayout.tsx` - Admin-specific layout wrapper
- `src/components/admin/AdminNavigation.tsx` - Admin sidebar/navigation
- `src/components/admin/AdminBreadcrumb.tsx` - Breadcrumb navigation

**User Management:**
- `src/components/admin/UserManagement.tsx` - Main user list view
- `src/components/admin/UserTable.tsx` - Sortable user data table
- `src/components/admin/UserFilters.tsx` - Search/filter controls
- `src/components/admin/UserActions.tsx` - User action buttons (delete, etc.)
- `src/components/admin/InviteUserModal.tsx` - User invitation form
- `src/components/admin/UserStatistics.tsx` - User stats dashboard

**Shared Admin Components:**
- `src/components/admin/AdminCard.tsx` - Statistics card component
- `src/components/admin/AdminTable.tsx` - Reusable data table
- `src/components/admin/AdminButton.tsx` - Admin-styled buttons
- `src/components/admin/ConfirmDialog.tsx` - Delete confirmation modal

#### **1.3 API Integration**
```typescript
// src/utils/adminApi.ts
- listUsers(page?, search?, filters?)
- inviteUser(email, firstName, lastName, roles?)
- deleteUser(userId)
- getUserStats()
```

#### **1.4 State Management**
```typescript
// src/contexts/AdminContext.tsx
- User list state
- Loading states
- Error handling
- Pagination state
- Filter/search state
```

### 🎯 Phase 2: Enhanced User Management

#### **2.1 Advanced User Features**
- **User Detail View**: Individual user profiles with activity history
- **Bulk Operations**: Select multiple users for batch actions
- **Role Management**: Edit user roles (if super_admin)
- **User Activity Log**: Track user actions and logins
- **Export Users**: CSV/Excel export functionality

#### **2.2 Search & Filtering**
- **Real-time Search**: Search by email, name, or ID
- **Advanced Filters**: Role, status, registration date, login activity
- **Sorting**: Multiple column sorting with persistence
- **Pagination**: Server-side pagination with page size options

### 🎯 Phase 3: Recipe & Content Moderation

#### **3.1 Recipe Management**
```typescript
// Components for recipe moderation
- RecipeModerationQueue.tsx - Flagged/reported recipes
- RecipeDetailAdmin.tsx - Admin view of recipes with moderation tools
- BulkRecipeActions.tsx - Mass approve/delete recipes
```

#### **3.2 Comment Moderation**
```typescript
// Comment moderation system
- CommentModerationQueue.tsx - Flagged comments
- CommentThreadView.tsx - View comment threads
- ModerationActions.tsx - Approve/delete/warn actions
```

### 🎯 Phase 4: Analytics & Reporting

#### **4.1 Dashboard Analytics**
- **User Growth**: Registration trends over time
- **Activity Metrics**: Login frequency, recipe creation rates
- **Content Stats**: Total recipes, comments, favorites
- **System Health**: Error rates, performance metrics

#### **4.2 Advanced Reporting**
- **Custom Date Ranges**: Flexible reporting periods
- **Export Reports**: PDF/CSV report generation
- **Real-time Updates**: Live dashboard updates
- **Comparative Analysis**: Month-over-month comparisons

### 🛡️ Security & Permissions

#### **4.1 Route Protection**
```typescript
// src/components/admin/AdminProtectedRoute.tsx
- Check user has admin role
- Redirect non-admins to home
- Handle permission-specific routing
```

#### **4.2 Permission Checks**
```typescript
// src/hooks/useAdminPermissions.tsx
- hasPermission(permission)
- hasRole(role)
- canAccessRoute(route)
- getAvailableActions()
```

### 🎨 Design System

#### **4.1 Admin Theme**
- **Color Scheme**: Distinct admin color palette (blues/grays)
- **Icons**: Admin-specific iconography (Heroicons/Lucide)
- **Layout**: Sidebar navigation with main content area
- **Responsive**: Mobile-friendly admin interface

#### **4.2 UI Patterns**
- **Data Tables**: Consistent table styling with actions
- **Cards**: Statistics and information cards
- **Forms**: Standardized form styling and validation
- **Modals**: Confirmation dialogs and forms

### 📱 Implementation Strategy

#### **Step 1: Foundation (Week 1)**
1. Create admin route structure
2. Implement admin authentication checks
3. Build basic admin layout and navigation
4. Set up admin API integration

#### **Step 2: User Management (Week 2)**
1. Build user list component with basic table
2. Implement search and filtering
3. Add invite user functionality
4. Create delete user with confirmation

#### **Step 3: Enhancement (Week 3)**
1. Add user statistics dashboard
2. Implement bulk operations
3. Enhance table with sorting/pagination
4. Add user detail views

#### **Step 4: Polish (Week 4)**
1. Improve responsive design
2. Add error handling and loading states
3. Implement confirmation dialogs
4. Add analytics dashboard foundation

### 🧪 Testing Strategy

#### **Component Testing**
- Unit tests for all admin components
- Mock API calls for isolation
- Permission testing scenarios

#### **Integration Testing**
- Admin route navigation testing
- API integration verification
- Role-based access testing

#### **E2E Testing**
- Complete admin workflows
- User management scenarios
- Cross-browser compatibility

### 📊 Success Metrics

#### **Functionality**
- ✅ Admin can view user list with stats
- ✅ Admin can invite new users
- ✅ Admin can delete users safely
- ✅ Admin can search/filter users
- ✅ Admin can moderate content

#### **UX Quality**
- ✅ Responsive design works on all devices
- ✅ Loading states provide feedback
- ✅ Error messages are clear and actionable
- ✅ Navigation is intuitive and consistent

#### **Security**
- ✅ Non-admin users cannot access admin routes
- ✅ All admin API calls are properly authenticated
- ✅ Sensitive operations require confirmation
- ✅ User data is properly protected

### 🔧 Technical Requirements

#### **Dependencies to Add**
```json
{
  "@tanstack/react-table": "^8.x", // Data table functionality
  "react-hook-form": "^7.x",       // Form management
  "zod": "^3.x",                   // Form validation
  "recharts": "^2.x",              // Analytics charts
  "lucide-react": "^0.x"           // Additional icons
}
```

#### **File Structure**
```
ui/src/
├── components/admin/
│   ├── layout/
│   │   ├── AdminLayout.tsx
│   │   ├── AdminNavigation.tsx
│   │   └── AdminBreadcrumb.tsx
│   ├── users/
│   │   ├── UserManagement.tsx
│   │   ├── UserTable.tsx
│   │   ├── UserFilters.tsx
│   │   ├── InviteUserModal.tsx
│   │   └── UserStatistics.tsx
│   ├── recipes/
│   │   ├── RecipeModerationQueue.tsx
│   │   └── RecipeDetailAdmin.tsx
│   ├── analytics/
│   │   ├── AnalyticsDashboard.tsx
│   │   └── UserGrowthChart.tsx
│   └── shared/
│       ├── AdminCard.tsx
│       ├── AdminTable.tsx
│       ├── AdminButton.tsx
│       └── ConfirmDialog.tsx
├── pages/admin/
│   ├── AdminDashboard.tsx
│   ├── UserManagementPage.tsx
│   ├── RecipeModerationPage.tsx
│   └── AnalyticsPage.tsx
├── hooks/admin/
│   ├── useAdminAuth.tsx
│   ├── useAdminPermissions.tsx
│   ├── useUserManagement.tsx
│   └── useAdminAnalytics.tsx
├── contexts/
│   └── AdminContext.tsx
└── utils/
    └── adminApi.ts
```

This plan provides a comprehensive roadmap for building a full-featured admin interface that integrates seamlessly with the existing MomsRecipeBox application while providing powerful user management and moderation capabilities.
