// Authentication utility for SnapIT Polls
// Handles Google OAuth and session management

declare global {
  interface Window {
    SNAPIT_CONFIG: any;
    google: any;
  }
}

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  accessToken: string | null;
}

class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
  };

  private listeners: Array<(state: AuthState) => void> = [];

  constructor() {
    this.loadSession();
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Load session from localStorage
  private loadSession() {
    try {
      const storedUser = localStorage.getItem('polls_user');
      const storedToken = localStorage.getItem('polls_access_token');

      if (storedUser && storedToken) {
        this.authState = {
          isAuthenticated: true,
          user: JSON.parse(storedUser),
          accessToken: storedToken,
        };
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      this.clearSession();
    }
  }

  // Save session to localStorage
  private saveSession(user: UserProfile, accessToken: string) {
    try {
      localStorage.setItem('polls_user', JSON.stringify(user));
      localStorage.setItem('polls_access_token', accessToken);
      this.authState = {
        isAuthenticated: true,
        user,
        accessToken,
      };
      this.notify();
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  // Clear session
  private clearSession() {
    localStorage.removeItem('polls_user');
    localStorage.removeItem('polls_access_token');
    this.authState = {
      isAuthenticated: false,
      user: null,
      accessToken: null,
    };
    this.notify();
  }

  // Handle Google Sign-In
  async handleGoogleSignIn(credential: string): Promise<boolean> {
    try {
      const API_URL = window.SNAPIT_CONFIG?.API_BASE_URL || 'https://polls-api.snapitsoftware.com';

      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();

      // Save user profile and access token
      this.saveSession(data.user, data.token);

      return true;
    } catch (error) {
      console.error('Google sign-in error:', error);
      return false;
    }
  }

  // Sign out
  signOut() {
    this.clearSession();
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  }

  // Get current auth state
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  // Get user profile
  getUser(): UserProfile | null {
    return this.authState.user;
  }

  // Get access token
  getAccessToken(): string | null {
    return this.authState.accessToken;
  }

  // Get auth headers for API requests
  getAuthHeaders(): Record<string, string> {
    if (this.authState.accessToken) {
      return {
        'Authorization': `Bearer ${this.authState.accessToken}`,
      };
    }
    return {};
  }

  // Initialize Google OAuth
  initGoogleAuth(onSuccess?: () => void) {
    if (!window.google?.accounts?.id) {
      console.warn('Google Sign-In not loaded yet');
      return;
    }

    const clientId = window.SNAPIT_CONFIG?.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('Google Client ID not configured');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        const success = await this.handleGoogleSignIn(response.credential);
        if (success && onSuccess) {
          onSuccess();
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    console.log('Google OAuth initialized for Polls');
  }

  // Render Google Sign-In button
  renderGoogleButton(elementId: string) {
    if (!window.google?.accounts?.id) {
      console.warn('Google Sign-In not available');
      return;
    }

    const element = document.getElementById(elementId);
    if (element) {
      window.google.accounts.id.renderButton(element, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
      });
    }
  }

  // Prompt Google One Tap
  promptOneTap() {
    if (window.google?.accounts?.id && !this.isAuthenticated()) {
      window.google.accounts.id.prompt();
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export for backward compatibility
export default authService;
