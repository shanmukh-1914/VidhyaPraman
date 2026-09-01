/**
 * oauth.js - Verified Client-Side Handshake for Google & GitHub OAuth
 * Connects directly to Google Identity Services (GIS) and GitHub OAuth provider endpoints.
 */

// Read client IDs from Vite environment (.env)
export const GITHUB_CLIENT_ID = (import.meta.env.VITE_GITHUB_CLIENT_ID || '').trim();
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

/**
 * Loads the Google Identity Services SDK script dynamically if not already on the page.
 */
export function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2 || window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }
    const existing = document.getElementById('google-gsi-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google SDK')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity SDK (https://accounts.google.com/gsi/client). Please check your internet connection.'));
    document.head.appendChild(script);
  });
}

/**
 * Triggers Google Sign-In via Google Identity Services OAuth2 token client.
 * Resolves with { credential: access_token }.
 */
export async function triggerGoogleOAuth() {
  const clientId = GOOGLE_CLIENT_ID;
  if (!clientId || clientId.includes('vidhyapramandemo')) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured in frontend/.env');
  }

  await loadGoogleScript();

  return new Promise((resolve, reject) => {
    try {
      if (window.google?.accounts?.oauth2) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error || 'Google sign-in was cancelled.'));
            } else if (response.access_token) {
              resolve({ credential: response.access_token });
            } else {
              reject(new Error('No access token received from Google.'));
            }
          },
          error_callback: (err) => {
            reject(new Error(err?.message || 'Google Sign-In prompt failed.'));
          },
        });
        client.requestAccessToken({ prompt: 'select_account' });
      } else if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              resolve({ credential: response.credential });
            } else {
              reject(new Error('No Google credential received.'));
            }
          },
        });
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Dismissed
          }
        });
      } else {
        reject(new Error('Google Identity Services SDK could not be initialized.'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Triggers GitHub OAuth authorization window or popup.
 * Resolves with { code }.
 */
export async function triggerGitHubOAuth(redirectUri = window.location.origin) {
  const clientId = GITHUB_CLIENT_ID;
  if (!clientId || clientId.includes('Demo')) {
    throw new Error('VITE_GITHUB_CLIENT_ID is not configured in frontend/.env');
  }

  const scope = 'read:user user:email repo';
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return new Promise((resolve, reject) => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2.5;

    let isDone = false;

    // Listen for postMessage from popup callback
    const messageHandler = (event) => {
      if (
        event.origin !== window.location.origin &&
        !event.origin.includes('localhost') &&
        !event.origin.includes('127.0.0.1')
      ) {
        return;
      }
      if (event.data && event.data.type === 'GITHUB_OAUTH_CODE' && event.data.code) {
        isDone = true;
        window.removeEventListener('message', messageHandler);
        clearInterval(timer);
        if (popup && !popup.closed) popup.close();
        resolve({ code: event.data.code });
      }
    };
    window.addEventListener('message', messageHandler);

    const popup = window.open(
      authUrl,
      'GitHub Authorization',
      `width=${width},height=${height},left=${left},top=${top},status=0,menubar=0`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Popup blocked - redirect whole window
      window.removeEventListener('message', messageHandler);
      window.location.href = authUrl;
      return;
    }

    const timer = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(timer);
          window.removeEventListener('message', messageHandler);
          if (!isDone) {
            setTimeout(() => {
              if (!isDone) {
                reject(new Error('GitHub authorization window was closed before completing sign-in.'));
              }
            }, 300);
          }
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl && popupUrl.includes(redirectUri)) {
          const urlObj = new URL(popupUrl);
          const code = urlObj.searchParams.get('code');
          const error = urlObj.searchParams.get('error_description') || urlObj.searchParams.get('error');

          if (code) {
            isDone = true;
            clearInterval(timer);
            window.removeEventListener('message', messageHandler);
            popup.close();
            resolve({ code });
          } else if (error) {
            isDone = true;
            clearInterval(timer);
            window.removeEventListener('message', messageHandler);
            popup.close();
            reject(new Error(error));
          }
        }
      } catch (e) {
        // Cross-origin restriction while on github.com domain - normal during OAuth redirect
      }
    }, 400);
  });
}
