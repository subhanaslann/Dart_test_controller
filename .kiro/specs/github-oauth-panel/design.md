# Design Document

## Overview

The GitHub OAuth Panel feature adds a professional, secure authentication mechanism to the Flutter Test Coverage Sentinel application. Instead of requiring users to manually create and paste personal access tokens, the application will use GitHub's OAuth 2.0 flow to obtain authorized access. The design follows GitHub's official OAuth UI patterns and integrates seamlessly with the existing application architecture.

## Architecture

### Component Structure

```
App.tsx (Root)
├── OAuthButton (Trigger)
├── OAuthModal (Container)
│   ├── OAuthPanel (Main UI)
│   │   ├── OAuthHeader (Logos & Title)
│   │   ├── OAuthPermissions (Scopes List)
│   │   ├── OAuthActions (Buttons)
│   │   └── OAuthMetadata (App Info)
│   └── OAuthBackdrop (Overlay)
└── OAuthService (Logic)
```

### OAuth Flow Architecture

```
User Action → OAuthButton Click
    ↓
Open OAuthModal
    ↓
Display Authorization Request
    ↓
User Clicks "Authorize"
    ↓
Redirect to GitHub OAuth
    ↓
GitHub Authorization Page
    ↓
User Approves
    ↓
Redirect to Callback URL
    ↓
Extract Authorization Code
    ↓
Exchange Code for Token (Backend/Proxy)
    ↓
Store Token Securely
    ↓
Update UI State
    ↓
Close Modal & Show Success
```

## Components and Interfaces

### 1. OAuthButton Component

**Purpose:** Trigger button that opens the OAuth panel

**Props:**
```typescript
interface OAuthButtonProps {
  isAuthenticated: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}
```

**Behavior:**
- Shows "Connect GitHub" when not authenticated
- Shows "Connected" with checkmark when authenticated
- Clicking when authenticated shows disconnect option

### 2. OAuthModal Component

**Purpose:** Modal container with backdrop overlay

**Props:**
```typescript
interface OAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}
```

**Features:**
- Centered modal with backdrop
- Click outside to close
- ESC key to close
- Smooth fade-in/fade-out animations

### 3. OAuthPanel Component

**Purpose:** Main authorization panel UI

**Props:**
```typescript
interface OAuthPanelProps {
  appName: string;
  developerName: string;
  permissions: Permission[];
  metadata: AppMetadata;
  onAuthorize: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface Permission {
  name: string;
  description: string;
  isReadOnly: boolean;
  icon?: string;
}

interface AppMetadata {
  isGitHubOwned: boolean;
  createdDate: string;
  userCount: string;
}
```

### 4. OAuthService

**Purpose:** Handle OAuth flow logic

**Interface:**
```typescript
interface OAuthService {
  // Initiate OAuth flow
  initiateOAuth(): Promise<void>;
  
  // Handle OAuth callback
  handleCallback(code: string): Promise<string>;
  
  // Store token securely
  storeToken(token: string): void;
  
  // Retrieve stored token
  getToken(): string | null;
  
  // Remove token
  revokeToken(): void;
  
  // Check authentication status
  isAuthenticated(): boolean;
}
```

**Methods:**

1. `initiateOAuth()`: Opens GitHub OAuth authorization URL
2. `handleCallback(code)`: Exchanges authorization code for access token
3. `storeToken(token)`: Saves token to localStorage with encryption
4. `getToken()`: Retrieves and decrypts stored token
5. `revokeToken()`: Removes token from storage
6. `isAuthenticated()`: Checks if valid token exists

## Data Models

### OAuth Configuration

```typescript
interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string[];
  authorizationUrl: string;
  tokenUrl: string;
}

const GITHUB_OAUTH_CONFIG: OAuthConfig = {
  clientId: process.env.GITHUB_CLIENT_ID || '',
  redirectUri: `${window.location.origin}/oauth/callback`,
  scope: ['repo', 'read:user'],
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token'
};
```

### Authentication State

```typescript
interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: GitHubUser | null;
  isLoading: boolean;
  error: string | null;
}

interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  email: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Button click opens modal
*For any* initial state where the OAuth modal is closed, clicking the "Connect GitHub" button should result in the modal becoming visible in the DOM.
**Validates: Requirements 1.1**

### Property 2: Panel displays required information
*For any* OAuth panel render, the displayed content should include the application name, developer name, and all requested permissions.
**Validates: Requirements 1.2**

### Property 3: Authorize triggers redirect
*For any* OAuth configuration, clicking the "Authorize" button should trigger a redirect to GitHub's OAuth URL with correct parameters (client_id, redirect_uri, scope).
**Validates: Requirements 1.3**

### Property 4: Token storage after successful auth
*For any* valid authorization code received in the callback, the application should exchange it for an access token and store it securely in localStorage.
**Validates: Requirements 1.4**

### Property 5: Cancel closes without side effects
*For any* open OAuth panel, clicking "Cancel" should close the modal without initiating any OAuth flow or storing any data.
**Validates: Requirements 1.5**

### Property 6: All permissions rendered
*For any* list of permission objects, the rendered panel should display each permission with its name and description.
**Validates: Requirements 2.1, 2.4**

### Property 7: Expandable sections toggle
*For any* permission with detailed information, clicking the expand control should toggle the visibility of additional details.
**Validates: Requirements 2.2**

### Property 8: Read-only indicator presence
*For any* permission marked as read-only, the rendered permission should include a visual indicator (e.g., "(read-only)" text or icon).
**Validates: Requirements 2.3**

### Property 9: Metadata display completeness
*For any* OAuth panel render, the metadata section should display ownership status, creation date, and user count.
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 10: Loading state visibility
*For any* state where isLoading is true, the UI should display a loading indicator and disable action buttons.
**Validates: Requirements 4.1**

### Property 11: Success state rendering
*For any* successful authorization completion, the UI should display a success message with a checkmark icon.
**Validates: Requirements 4.2**

### Property 12: Error message display
*For any* error state with an error message, the UI should display the error message to the user.
**Validates: Requirements 4.3**

### Property 13: Authenticated state indicator
*For any* state where isAuthenticated is true, the UI should show a "Connected" or similar status indicator.
**Validates: Requirements 4.4**

### Property 14: Logo elements present
*For any* OAuth panel render, both the GitHub logo and application logo should be present in the DOM.
**Validates: Requirements 5.1**

### Property 15: Service unavailable error handling
*For any* OAuth service call that fails with a service unavailable error, the application should display a user-friendly error message.
**Validates: Requirements 6.1**

### Property 16: Authorization denial handling
*For any* OAuth callback indicating user denial, the application should close the panel and reset to allow retry.
**Validates: Requirements 6.2**

### Property 17: Network error handling
*For any* network error during OAuth flow, the application should display an error message and provide retry capability.
**Validates: Requirements 6.3**

### Property 18: Callback failure logging
*For any* OAuth callback failure, the application should log the error details and display a user notification.
**Validates: Requirements 6.4**

### Property 19: Disconnect option visibility
*For any* authenticated state, the UI should display a "Disconnect" or "Revoke Access" option.
**Validates: Requirements 7.1**

### Property 20: Token removal on disconnect
*For any* disconnect action, the stored access token should be removed from localStorage.
**Validates: Requirements 7.2**

### Property 21: UI state after disconnect
*For any* completed disconnect action, the UI should update to reflect unauthenticated state (showing "Connect GitHub" button).
**Validates: Requirements 7.3**

### Property 22: Disconnect information message
*For any* disconnect action, the application should display a message informing the user about revoking access in GitHub settings.
**Validates: Requirements 7.4**

## Error Handling

### OAuth Flow Errors

1. **Authorization Denied**
   - User clicks "Cancel" on GitHub authorization page
   - Callback receives `error=access_denied`
   - Application displays: "Authorization was cancelled. You can try again anytime."
   - Modal closes, state resets to allow retry

2. **Network Errors**
   - Token exchange request fails
   - Application catches network error
   - Displays: "Network error occurred. Please check your connection and try again."
   - Provides "Retry" button

3. **Invalid Callback**
   - Callback URL missing authorization code
   - Application validates callback parameters
   - Displays: "Invalid authorization response. Please try again."
   - Logs error details for debugging

4. **Token Storage Failure**
   - localStorage is unavailable or full
   - Application catches storage error
   - Displays: "Unable to save authentication. Please check browser settings."
   - Falls back to session storage if available

5. **Service Unavailable**
   - GitHub OAuth service returns 503
   - Application detects service error
   - Displays: "GitHub authentication service is temporarily unavailable. Please try again later."
   - Provides "Retry" button with exponential backoff

### Error Recovery Strategies

- All errors include clear, user-friendly messages
- Retry mechanisms for transient failures
- Graceful degradation (fallback to manual token input)
- Error logging for debugging
- State cleanup to prevent inconsistent UI

## Testing Strategy

### Unit Testing

**Component Tests:**
- OAuthButton: Test rendering states (connected/disconnected), click handlers
- OAuthModal: Test open/close behavior, backdrop clicks, ESC key handling
- OAuthPanel: Test permission rendering, button states, metadata display
- OAuthService: Test token storage/retrieval, OAuth URL generation

**Integration Tests:**
- Complete OAuth flow simulation
- Error handling scenarios
- State management across components
- LocalStorage interactions

### Property-Based Testing

**Framework:** fast-check (JavaScript property-based testing library)

**Test Configuration:** Each property test should run a minimum of 100 iterations.

**Property Tests:**

1. **Modal State Consistency**
   - Generate random sequences of open/close actions
   - Verify modal visibility always matches expected state

2. **Permission Rendering**
   - Generate random permission arrays (0-10 items)
   - Verify all permissions are rendered with correct data

3. **Token Storage Round-Trip**
   - Generate random valid tokens
   - Store and retrieve, verify equality

4. **OAuth URL Generation**
   - Generate random valid OAuth configs
   - Verify generated URLs contain all required parameters

5. **Error State Handling**
   - Generate random error types
   - Verify appropriate error messages are displayed

**Test Tags:**
Each property-based test must include a comment tag:
```javascript
// **Feature: github-oauth-panel, Property X: [property description]**
```

### Manual Testing Checklist

- [ ] Visual appearance matches GitHub's OAuth design
- [ ] Animations are smooth and professional
- [ ] Responsive design works on mobile/tablet
- [ ] Keyboard navigation (Tab, Enter, ESC)
- [ ] Screen reader accessibility
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

## Implementation Notes

### Security Considerations

1. **Token Storage**
   - Store tokens in localStorage with encryption
   - Never expose tokens in URLs or logs
   - Clear tokens on logout/disconnect

2. **OAuth State Parameter**
   - Generate random state parameter for CSRF protection
   - Validate state in callback
   - Use cryptographically secure random generator

3. **Redirect URI Validation**
   - Whitelist allowed redirect URIs
   - Validate callback origin
   - Use HTTPS in production

### Backend Requirements

Since this is a client-side application, the OAuth token exchange requires a backend proxy to keep the client secret secure:

**Option 1: Serverless Function (Recommended)**
- Deploy a serverless function (Vercel, Netlify, AWS Lambda)
- Function receives authorization code
- Exchanges code for token using client secret
- Returns token to client

**Option 2: GitHub OAuth App with PKCE**
- Use OAuth 2.0 PKCE flow (if GitHub supports it)
- Eliminates need for client secret
- Entire flow can be client-side

**Option 3: Fallback to Manual Token**
- If OAuth setup is not available
- Provide clear instructions for creating personal access token
- Keep existing manual token input as fallback

### Environment Variables

```bash
VITE_GITHUB_CLIENT_ID=your_client_id_here
VITE_GITHUB_REDIRECT_URI=https://yourdomain.com/oauth/callback
VITE_OAUTH_PROXY_URL=https://your-proxy.vercel.app/api/oauth
```

### Migration Strategy

1. Keep existing token input as fallback
2. Add OAuth button alongside manual input
3. Detect if OAuth is configured (client ID present)
4. Show OAuth option if available, otherwise show manual input
5. Support both authentication methods simultaneously

## UI/UX Specifications

### Color Palette (GitHub Dark Theme)

```css
--bg-primary: #0d1117
--bg-secondary: #161b22
--bg-tertiary: #21262d
--border-default: #30363d
--text-primary: #c9d1d9
--text-secondary: #8b949e
--accent-success: #238636
--accent-danger: #da3633
--accent-emphasis: #1f6feb
```

### Typography

- Font Family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
- Title: 24px, font-weight: 600
- Body: 14px, font-weight: 400
- Small: 12px, font-weight: 400

### Spacing

- Modal padding: 24px
- Section spacing: 16px
- Button padding: 12px 24px
- Icon size: 48px (logos), 16px (inline icons)

### Animations

- Modal fade-in: 200ms ease-out
- Modal fade-out: 150ms ease-in
- Button hover: 100ms ease
- Loading spinner: 1s linear infinite

## Future Enhancements

1. **Remember Me Option**
   - Checkbox to keep user logged in
   - Longer token expiration

2. **Multiple Account Support**
   - Switch between different GitHub accounts
   - Account selector dropdown

3. **Token Refresh**
   - Automatic token refresh before expiration
   - Background refresh without user interaction

4. **OAuth Scope Customization**
   - Allow users to select which permissions to grant
   - Minimal permissions by default

5. **Activity Log**
   - Show recent OAuth activities
   - Token usage statistics
