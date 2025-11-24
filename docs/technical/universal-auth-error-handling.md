# Universal Authentication Error Handling

## Overview

Implemented automatic authentication error handling that redirects users to Auth0 login when JWT tokens expire or become invalid, regardless of which page they are on.

## Problem Statement

**User Issue**: "I sometimes get Failed to load recipes or other failures if I refresh an old browser session"

**Root Cause**:

- JWT tokens expire after a certain time period
- Users with stale browser sessions would see API errors (401 Unauthorized)
- No universal mechanism to detect expired tokens and trigger re-authentication
- Each component would need to individually handle auth failures

## Solution Architecture

### 1. Global Auth Error Handler

A centralized authentication error handler registered once during app initialization:

```typescript
// In App.tsx
React.useEffect(() => {
  setGlobalAuthErrorHandler(() => {
    console.log('🔐 Global auth error handler triggered - redirecting to login');
    loginWithRedirect({
      appState: {
        returnTo: window.location.pathname
      }
    });
  });
}, [loginWithRedirect]);
```

### 2. API Client Enhancement

The `api-client.ts` now detects 401 responses and triggers the global handler:

```typescript
// Check for authentication errors in all API responses
if (response.status === 401 && globalAuthErrorHandler) {
  console.warn('🔐 Authentication failed (401) - triggering global auth handler');
  globalAuthErrorHandler();
}
```

## User Experience Flow

### Before (Broken Experience)

1. User has old browser session with expired token
2. User refreshes page or navigates to new page
3. API call fails with 401 Unauthorized
4. User sees error message: "Failed to load recipes"
5. User confused and doesn't know how to fix it

### After (Seamless Experience)

1. User has old browser session with expired token
2. User refreshes page or navigates to any page
3. API call fails with 401 Unauthorized
4. **Automatic redirect to Auth0 login** (no error shown)
5. User logs in successfully
6. **Returns to original page** they were trying to access
7. Page loads successfully with fresh token

## Technical Implementation

### Files Modified

#### `ui/src/lib/api-client.ts`

- Added `globalAuthErrorHandler` variable to store handler function
- Added `setGlobalAuthErrorHandler()` function for registration
- Enhanced `request()` method to detect 401 status codes
- Triggers handler when authentication fails

#### `ui/src/App.tsx`

- Imports `setGlobalAuthErrorHandler` from api-client
- Registers handler in `AuthenticatedApp` component
- Uses Auth0's `loginWithRedirect()` with return path
- Passes `window.location.pathname` as `returnTo` state

## Behavior Matrix

| Scenario | Old Behavior | New Behavior |
|----------|-------------|--------------|
| Expired token on recipe page | "Failed to load recipes" error | Auto-redirect to login, return to recipes |
| Expired token on shopping list | "Failed to load" error | Auto-redirect to login, return to shopping list |
| Expired token on profile page | Error message | Auto-redirect to login, return to profile |
| Expired token on admin page | 401 error shown | Auto-redirect to login, return to admin |
| Invalid token on any API call | Component-specific error | Universal login redirect |

## Security Improvements

1. **Proactive Token Validation**: Any expired or invalid token is immediately caught
2. **No Partial State**: Users never see partially loaded pages with failed API calls
3. **Fresh Tokens**: After login, all subsequent API calls use fresh, valid JWT tokens
4. **Universal Coverage**: Works for ALL API endpoints automatically

## Testing Scenarios

### Manual Testing

1. **Expired Token Test**:
   - Log in to app
   - Wait for token to expire (or manually clear token from storage)
   - Refresh any page
   - Should redirect to login
   - After login, should return to original page

2. **Invalid Token Test**:
   - Log in to app
   - Manually modify token in browser storage to invalid value
   - Try to load any page
   - Should redirect to login

3. **Multi-Page Test**:
   - Test on each major page: recipes, shopping list, profile, admin
   - All should handle expired tokens consistently

## Error Logging

Authentication errors are logged for debugging:

```console
Console Output Example:
🔐 Authentication failed (401) - triggering global auth handler
🔐 Global auth error handler triggered - redirecting to login
```

## Future Enhancements

1. **Token Refresh**: Implement automatic token refresh before expiration
2. **Grace Period**: Show "Session expiring soon" warning before redirect
3. **Background Refresh**: Refresh tokens silently in background
4. **Retry Logic**: Attempt token refresh before redirecting to login

## Deployment

- **Version**: Deployed 2025-11-24
- **Environment**: Production (CloudFront)
- **CloudFront Distribution**: E15JMXLPX2IABK
- **Invalidation**: I4PQCLD5ONF3IRKDHZ2RV1OAUM

## Related Documentation

- [Auth0 React SDK Documentation](https://auth0.com/docs/libraries/auth0-react)
- [JWT Token Management](../JWT_AUTHORIZATION_PLAN.md)
- [API Client Architecture](../../ui/src/lib/api-client.ts)

## Maintenance Notes

- The global handler is registered once per app session
- No component-specific changes needed for auth error handling
- All new API endpoints automatically inherit this behavior
- Handler registration happens before any API calls are made
