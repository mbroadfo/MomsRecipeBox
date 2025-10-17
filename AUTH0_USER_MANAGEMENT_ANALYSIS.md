# Auth0 User Management Implementation Analysis & Setup Plan

## Executive Summary

The Mom's Recipe Box application currently has a **mock authentication system** with some Auth0 integration foundations in place. The `owner_id` field is being used inconsistently across the database, with many recipes having either no owner or placeholder values like "demo-user" and "auth0|test-user". To implement true Auth0 user management, we need to:

1. Complete Auth0 tenant configuration
2. Implement proper user authentication flows
3. Migrate existing user data to real Auth0 user IDs
4. Set up dual-branding for the universal login page

---

## Current Authentication State Analysis

### 🔍 Current User Management Implementation

**Frontend (UI):**

- Uses mock authentication with hardcoded fallbacks
- Default user ID: `demo-user` when no user is authenticated
- Admin context has placeholder Auth0 integration (`AdminContext.tsx`)
- No actual Auth0 login flows implemented
- Test admin token bypass for development

**Backend (API):**

- JWT validation exists but has development bypasses
- Auth0 Management API integration is functional for admin operations
- Mock user data is returned in development mode
- Real Auth0 M2M (Machine-to-Machine) tokens work for admin functions

### 📊 Database Owner_ID Analysis

Based on the recipe visibility documentation and code analysis:

| Owner Pattern | Count | Status |
|---------------|-------|--------|
| `undefined/null` | 53 recipes | ❌ Needs migration |
| `"demo-user"` | 6 recipes | ❌ Needs migration |
| `"auth0\|test-user"` | 8 recipes | ⚠️ Test data, needs migration |
| Real Auth0 IDs | 0 recipes | ✅ Target state |

### 🔧 Current Auth0 Configuration

**Environment Variables Needed:**
```bash
AUTH0_DOMAIN=dev-jdsnf3lqod8nxlnv.us.auth0.com  # Your existing domain
AUTH0_M2M_CLIENT_ID=<your-m2m-client-id>
AUTH0_M2M_CLIENT_SECRET=<your-m2m-client-secret>
AUTH0_CLIENT_ID=<your-spa-client-id>
AUTH0_CLIENT_SECRET=<your-spa-client-secret>
```

**Auth0 Components Already Configured:**
- ✅ Management API M2M application exists
- ✅ JWT validation logic implemented
- ✅ Admin user management endpoints
- ✅ Permission-based authorization system
- ❌ Universal Login Page branding
- ❌ Frontend Auth0 SDK integration
- ❌ Proper user onboarding flows

---

## Dual-Branding Universal Login Analysis

### 🎨 Auth0 Universal Login Customization Options

Auth0 supports customizing the Universal Login page based on several factors:

**1. Application-Based Branding**
- Each Auth0 application can have custom branding
- Redirect URLs can determine which application is being used
- Custom domains can route to different branded experiences

**2. Domain-Based Routing (Recommended)**
```
momsrecipebox.com → Mom's Recipe Box branding
yourcruiseapp.com → Cruise App branding
```

**3. Query Parameter Customization**
- Pass custom parameters to login URLs
- Use in custom login page templates
- Control branding via URL parameters

### 🛠️ Implementation Strategy for Dual-Branding

**Option A: Separate Auth0 Applications (Recommended)**
- Create separate SPA applications for each brand
- Each app has its own client ID and custom branding
- Route based on callback domain

**Option B: Single Application with Custom Domain Logic**
- Use custom login page template
- Detect domain/referrer in template
- Apply conditional branding via JavaScript

---

## Step-by-Step Auth0 Implementation Plan

### Phase 0: Discovery & Existing Setup Analysis (1 day)

#### 0.1 Auth0 Configuration Discovery

**Information Needed from You:**

- [ ] Auth0 tenant details and existing applications
- [ ] Current Auth0 domain: `dev-jdsnf3lqod8nxlnv.us.auth0.com` (confirmed)
- [ ] Existing application configurations for your other project
- [ ] Current branding templates and customizations
- [ ] Any custom domains already configured
- [ ] M2M application credentials and scopes

**Multi-Mode Environment Analysis:**

- [ ] Review how Auth0 should integrate with each deployment profile:
  - **Local Profile**: Local dev with Auth0 (localhost callbacks)
  - **Atlas Profile**: Local dev with Auth0 + cloud database  
  - **Lambda Profile**: Cloud API with Auth0 (production callbacks)
  - **Cloud Profile**: Full production with Auth0

**Action Items:**

```bash
# Document current Auth0 setup
- Export existing application configurations
- Review current universal login customizations
- Map existing user base and roles
- Document any custom rules or hooks
```

#### 0.2 Multi-Mode Configuration Planning

**Environment-Specific Requirements:**

```json
{
  "local": {
    "auth0_callbacks": ["http://localhost:3000/callback", "http://localhost:5173/callback"],
    "auth0_origins": ["http://localhost:3000", "http://localhost:5173"],
    "auth0_logout_urls": ["http://localhost:3000", "http://localhost:5173"]
  },
  "atlas": {
    "auth0_callbacks": ["http://localhost:3000/callback", "http://localhost:5173/callback"],
    "auth0_origins": ["http://localhost:3000", "http://localhost:5173"],
    "auth0_logout_urls": ["http://localhost:3000", "http://localhost:5173"]
  },
  "lambda": {
    "auth0_callbacks": ["https://staging.momsrecipebox.app/callback"],
    "auth0_origins": ["https://staging.momsrecipebox.app"],
    "auth0_logout_urls": ["https://staging.momsrecipebox.app"]
  },
  "cloud": {
    "auth0_callbacks": ["https://momsrecipebox.app/callback"],
    "auth0_origins": ["https://momsrecipebox.app"],
    "auth0_logout_urls": ["https://momsrecipebox.app"]
  }
}
```

### Phase 1: Auth0 Tenant Configuration (Updated Based on Multi-Mode)

#### 1.1 Update/Create Applications (Based on Discovery)

```bash
# Update existing or create new MomsRecipeBox Application
Application Type: Single Page Application
Name: MomsRecipeBox-SPA

# Multi-mode callback configuration:
Allowed Callback URLs: 
  - http://localhost:3000/callback      # Local/Atlas Express
  - http://localhost:5173/callback      # Local/Atlas Vite dev
  - https://staging.momsrecipebox.app/callback  # Lambda testing
  - https://momsrecipebox.app/callback  # Cloud production

Allowed Logout URLs:
  - http://localhost:3000
  - http://localhost:5173
  - https://staging.momsrecipebox.app
  - https://momsrecipebox.app

Allowed Web Origins:
  - http://localhost:3000
  - http://localhost:5173
  - https://staging.momsrecipebox.app
  - https://momsrecipebox.app
```

#### 1.2 Configure API
```bash
# API Configuration
Name: MomsRecipeBox API
Identifier: https://momsrecipebox/api
Signing Algorithm: RS256

# Scopes:
- read:recipes
- write:recipes  
- admin:read
- admin:write
- users:read
- users:write
```

#### 1.3 Set Up Custom Domain (Optional)
```bash
# If you want custom branding domain
Custom Domain: auth.momsrecipebox.com
SSL Certificate: Auto-provision or upload
```

### Phase 2: Dual-Branding Implementation

#### 2.1 Universal Login Template Customization
```html
<!-- Custom Universal Login Template -->
<!DOCTYPE html>
<html>
<head>
  <script>
    // Detect which application is requesting auth
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client_id');
    const redirectUri = urlParams.get('redirect_uri');
    
    // Brand configuration
    const brandConfig = {
      'YOUR_MRB_CLIENT_ID': {
        logo: 'https://your-domain.com/mrb-logo.png',
        primaryColor: '#4F46E5',
        title: "Mom's Recipe Box",
        favicon: '/mrb-favicon.ico'
      },
      'YOUR_CRUISE_CLIENT_ID': {
        logo: 'https://your-cruise-domain.com/cruise-logo.png', 
        primaryColor: '#0EA5E9',
        title: 'Cruise App',
        favicon: '/cruise-favicon.ico'
      }
    };
    
    // Apply branding
    const brand = brandConfig[clientId] || brandConfig.default;
    document.title = `Login - ${brand.title}`;
    // ... apply other branding
  </script>
</head>
<!-- Rest of Auth0 template -->
</html>
```

#### 2.2 Forgot Password Flow Customization
```html
<!-- Similar approach for password reset template -->
<!-- Use same client_id detection for branding -->
```

### Phase 3: Multi-Mode Environment Configuration

#### 3.1 Update Deployment Profiles

**Add Auth0 Configuration to `config/deployment-profiles.json`:**

```json
{
  "profiles": {
    "local": {
      "environment": {
        "MONGODB_MODE": "local",
        "APP_MODE": "express",
        "VITE_API_MODE": "proxy",
        "VITE_ENVIRONMENT": "local",
        "REACT_APP_AUTH0_DOMAIN": "dev-jdsnf3lqod8nxlnv.us.auth0.com",
        "REACT_APP_AUTH0_CLIENT_ID": "${AUTH0_MRB_CLIENT_ID}",
        "REACT_APP_AUTH0_AUDIENCE": "https://momsrecipebox/api",
        "REACT_APP_AUTH0_REDIRECT_URI": "http://localhost:3000/callback",
        "REACT_APP_AUTH0_LOGOUT_URI": "http://localhost:3000"
      }
    },
    "atlas": {
      "environment": {
        "MONGODB_MODE": "atlas",
        "APP_MODE": "express",
        "VITE_API_MODE": "proxy", 
        "VITE_ENVIRONMENT": "atlas",
        "REACT_APP_AUTH0_DOMAIN": "dev-jdsnf3lqod8nxlnv.us.auth0.com",
        "REACT_APP_AUTH0_CLIENT_ID": "${AUTH0_MRB_CLIENT_ID}",
        "REACT_APP_AUTH0_AUDIENCE": "https://momsrecipebox/api",
        "REACT_APP_AUTH0_REDIRECT_URI": "http://localhost:3000/callback",
        "REACT_APP_AUTH0_LOGOUT_URI": "http://localhost:3000"
      }
    },
    "lambda": {
      "environment": {
        "MONGODB_MODE": "atlas",
        "APP_MODE": "lambda",
        "VITE_API_MODE": "direct",
        "VITE_ENVIRONMENT": "lambda",
        "REACT_APP_AUTH0_DOMAIN": "dev-jdsnf3lqod8nxlnv.us.auth0.com",
        "REACT_APP_AUTH0_CLIENT_ID": "${AUTH0_MRB_CLIENT_ID}",
        "REACT_APP_AUTH0_AUDIENCE": "https://momsrecipebox/api",
        "REACT_APP_AUTH0_REDIRECT_URI": "https://staging.momsrecipebox.app/callback",
        "REACT_APP_AUTH0_LOGOUT_URI": "https://staging.momsrecipebox.app"
      }
    },
    "cloud": {
      "environment": {
        "MONGODB_MODE": "atlas",
        "APP_MODE": "lambda",
        "VITE_API_MODE": "production",
        "VITE_ENVIRONMENT": "production",
        "REACT_APP_AUTH0_DOMAIN": "dev-jdsnf3lqod8nxlnv.us.auth0.com",
        "REACT_APP_AUTH0_CLIENT_ID": "${AUTH0_MRB_CLIENT_ID}",
        "REACT_APP_AUTH0_AUDIENCE": "https://momsrecipebox/api",
        "REACT_APP_AUTH0_REDIRECT_URI": "https://momsrecipebox.app/callback",
        "REACT_APP_AUTH0_LOGOUT_URI": "https://momsrecipebox.app"
      }
    }
  }
}
```

#### 3.2 Update Environment Variable Management

**Add to `config/environment-variables.json`:**

```json
{
  "secrets": {
    "AUTH0_DOMAIN": "dev-jdsnf3lqod8nxlnv.us.auth0.com",
    "AUTH0_MRB_CLIENT_ID": "${AUTH0_MRB_CLIENT_ID}",
    "AUTH0_MRB_CLIENT_SECRET": "${AUTH0_MRB_CLIENT_SECRET}",
    "AUTH0_M2M_CLIENT_ID": "${AUTH0_M2M_CLIENT_ID}",
    "AUTH0_M2M_CLIENT_SECRET": "${AUTH0_M2M_CLIENT_SECRET}",
    "AUTH0_AUDIENCE": "https://momsrecipebox/api"
  }
}
```

### Phase 4: Frontend Integration (Updated for Multi-Mode)

#### 3.1 Install Auth0 SDK
```bash
cd ui
npm install @auth0/auth0-react
```

#### 3.2 Auth0 Provider Setup
```typescript
// src/auth/Auth0Provider.tsx
import { Auth0Provider } from '@auth0/auth0-react';

const domain = process.env.REACT_APP_AUTH0_DOMAIN!;
const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID!;
const audience = process.env.REACT_APP_AUTH0_AUDIENCE!;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => (
  <Auth0Provider
    domain={domain}
    clientId={clientId}
    authorizationParams={{
      redirect_uri: window.location.origin + '/callback',
      audience: audience,
      scope: 'openid profile email read:recipes write:recipes'
    }}
  >
    {children}
  </Auth0Provider>
);
```

#### 3.3 Replace Mock Authentication
```typescript
// src/hooks/useAuth.ts
import { useAuth0 } from '@auth0/auth0-react';

export const useAuth = () => {
  const { user, isAuthenticated, getAccessTokenSilently, loginWithRedirect, logout } = useAuth0();
  
  const getCurrentUserId = () => {
    return user?.sub || 'anonymous';
  };
  
  const getToken = async () => {
    return isAuthenticated ? await getAccessTokenSilently() : null;
  };
  
  return {
    user,
    isAuthenticated,
    getCurrentUserId,
    getToken,
    login: loginWithRedirect,
    logout
  };
};
```

### Phase 4: Database Migration

#### 4.1 User ID Migration Script
```javascript
// scripts/migrate-user-ids.js
const { MongoClient } = require('mongodb');

const migrationMap = {
  'demo-user': null, // Will be set during first login
  'auth0|test-user': null, // Will be set during first login  
  undefined: null,
  null: null
};

async function migrateUserIds() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('momsrecipebox');
  
  // Migrate recipes
  await db.collection('recipes').updateMany(
    { owner_id: { $in: ['demo-user', 'auth0|test-user', null, undefined] } },
    { $unset: { owner_id: 1 } } // Remove owner_id, will be set on first edit
  );
  
  // Migrate favorites  
  await db.collection('favorites').updateMany(
    { userId: { $in: ['demo-user', 'auth0|test-user', null, undefined] } },
    { $unset: { userId: 1 } } // Remove userId, will be re-created on first login
  );
  
  // Migrate comments
  await db.collection('comments').updateMany(
    { user_id: { $in: ['demo-user', 'auth0|test-user', null, undefined] } },
    { $unset: { user_id: 1 } } // Remove user_id, will be re-created
  );
  
  // Migrate shopping lists
  await db.collection('shopping_lists').updateMany(
    { user_id: { $in: ['demo-user', 'auth0|test-user', null, undefined] } },
    { $unset: { user_id: 1 } } // Remove user_id, will be re-created
  );
  
  await client.close();
}
```

#### 4.2 Recipe Ownership Assignment
```javascript
// After migration, implement ownership claim system
// When user first logs in, show them unowned recipes they can claim
// Or automatically assign based on creation patterns
```

### Phase 5: Admin System Integration

#### 5.1 Update Admin Authentication
```typescript
// Replace mock admin auth with real Auth0
// Update AdminContext.tsx to use Auth0Provider
// Implement role-based permissions in Auth0
```

#### 5.2 User Management UI Updates
```typescript
// Update admin panels to work with real Auth0 users
// Remove mock user data
// Implement real user invite/delete flows
```

---

## Environment Configuration

### Development Environment
```bash
# .env.development
AUTH0_DOMAIN=dev-jdsnf3lqod8nxlnv.us.auth0.com
AUTH0_CLIENT_ID=<your-spa-client-id>
AUTH0_AUDIENCE=https://momsrecipebox/api
AUTH0_M2M_CLIENT_ID=<your-m2m-client-id>
AUTH0_M2M_CLIENT_SECRET=<your-m2m-secret>
```

### Production Environment  
```bash
# .env.production
AUTH0_DOMAIN=auth.momsrecipebox.com  # Custom domain
AUTH0_CLIENT_ID=<prod-spa-client-id>
AUTH0_AUDIENCE=https://momsrecipebox/api
AUTH0_M2M_CLIENT_ID=<prod-m2m-client-id>
AUTH0_M2M_CLIENT_SECRET=<prod-m2m-secret>
```

---

## Migration Risks & Mitigation

### 🚨 Potential Issues

1. **Data Loss**: User favorites, comments, and shopping lists tied to mock IDs
   - **Mitigation**: Backup database before migration
   - **Recovery**: Implement user claim system for orphaned data

2. **User Experience**: Existing users will need to re-authenticate
   - **Mitigation**: Clear communication about the upgrade
   - **Recovery**: Provide data export/import tools

3. **Recipe Ownership**: Unowned recipes need assignment
   - **Mitigation**: Make all unowned recipes public initially
   - **Recovery**: Implement claiming system for users

### ✅ Success Criteria

- [ ] Users can log in with Auth0
- [ ] Dual-branding works for both applications
- [ ] Admin system functions with real Auth0 users
- [ ] All user data is properly associated with Auth0 user IDs
- [ ] No mock authentication code remains in production

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Auth0 Configuration | 2-3 days | Access to Auth0 dashboard |
| Dual-Branding Setup | 1-2 days | Custom domain (optional) |
| Frontend Integration | 3-4 days | Auth0 SDK, testing |
| Database Migration | 2-3 days | Database backup, testing |
| Admin System Updates | 2-3 days | Frontend integration complete |
| **Total** | **10-15 days** | No major blockers |

---

## Next Steps

1. **Immediate**: Set up Auth0 applications and API configuration
2. **Week 1**: Implement dual-branding and test with both applications  
3. **Week 2**: Integrate Auth0 SDK into frontend and replace mock auth
4. **Week 3**: Execute database migration and test all user flows
5. **Final**: Remove all development bypasses and deploy to production

## Updated Implementation Timeline

### Multi-Mode Auth0 Integration Plan

**Total Estimated Time: 12-18 days** (Updated to include discovery and multi-mode complexity)

| Phase | Days | Description | Multi-Mode Considerations |
|-------|------|-------------|---------------------------|
| **Phase 0: Discovery** | 1 | Analyze existing Auth0 setup | Document current branding, review existing apps |
| **Phase 1: Auth0 Config** | 2-3 | Update tenant configuration | Multi-environment callback URLs |
| **Phase 2: Dual-Branding** | 1-2 | Implement branding templates | Leverage existing templates |
| **Phase 3: Multi-Mode Setup** | 2 | Environment configuration | Profile-based Auth0 configs |
| **Phase 4: Frontend Integration** | 3-4 | Replace mock authentication | Environment-aware Auth0 SDK |
| **Phase 5: Database Migration** | 2-3 | Migrate user IDs and data | Profile-specific migration scripts |
| **Phase 6: Admin Updates** | 2-3 | Remove mock admin functionality | Environment-aware admin auth |

### Key Multi-Mode Considerations

**Environment-Specific Challenges:**

1. **Local/Atlas Profiles**: Same localhost URLs, different databases
2. **Lambda Profile**: Cloud API with staging domain callbacks  
3. **Cloud Profile**: Production domain callbacks
4. **Profile Switching**: Auth0 config must change with profile switches

**Auth0 Configuration Impact:**

- One Auth0 application supports all environments via multiple callback URLs
- Environment variables automatically configure Auth0 based on active profile
- Development bypass mechanisms for local testing
- Separate M2M tokens for each environment if needed

### Discovery Phase Requirements

**From Your Existing Setup:**

- [ ] Export current Auth0 application configurations
- [ ] Provide existing universal login page templates
- [ ] Share current branding assets and CSS customizations
- [ ] Document any existing custom rules or hooks
- [ ] Review current user base and roles in your tenant

**Multi-Mode Profile Integration:**

- [ ] Determine staging domain requirements
- [ ] Configure production domain callbacks
- [ ] Set up environment-specific Auth0 variable management
- [ ] Plan profile-based Auth0 configuration switching

Would you like me to start with **Phase 0: Discovery** to understand your existing Auth0 setup and branding templates?