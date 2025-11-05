import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import App from './App.tsx'

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

// Fallback if Auth0 config is missing
if (!domain || !clientId) {
  createRoot(document.getElementById('root')!).render(
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
        <p className="text-gray-600 mb-4">
          Missing Auth0 configuration. Please check your .env file.
        </p>
        <div className="text-left bg-gray-100 p-4 rounded text-sm">
          <p>Missing:</p>
          <ul>
            {!domain && <li>• VITE_AUTH0_DOMAIN</li>}
            {!clientId && <li>• VITE_AUTH0_CLIENT_ID</li>}
          </ul>
        </div>
      </div>
    </div>
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: `${window.location.origin}/callback`,
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: "openid profile email offline_access"
        }}
        useRefreshTokens={true}
        cacheLocation="localstorage"
      >
        <App />
      </Auth0Provider>
    </StrictMode>,
  );
}
