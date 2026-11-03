import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthUser } from '../../services/api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string; select_by?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
            }
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup' | 'login' | 'register';
  text?: 'continue_with' | 'signin_with' | 'signup_with';
  onSuccess?: (user: AuthUser, isNewUser?: boolean) => void;
  onError?: (errorMessage: string) => void;
  className?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  mode = 'signin',
  text = 'continue_with',
  onSuccess,
  onError,
  className = '',
}) => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gisRendered, setGisRendered] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const from = (location.state as any)?.from?.pathname || '/app/dashboard';

  const isSignup = mode === 'signup' || mode === 'register';

  const handleCredentialResponse = async (credential: string) => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const result = await loginWithGoogle(credential);
      if (onSuccess) {
        onSuccess(result.user, result.isNewUser);
      } else {
        if (result.isNewUser) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Google authentication failed. Please try again.';
      setErrorMessage(msg);
      onError?.(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    if (!clientId) {
      return;
    }

    let isMounted = true;

    const initializeGis = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              handleCredentialResponse(response.credential);
            } else {
              const msg = 'Google authentication was cancelled or returned no credentials.';
              setErrorMessage(msg);
              onError?.(msg);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Calculate responsive width for container (max 400, min 240)
        const containerWidth = containerRef.current.clientWidth || 360;
        const renderWidth = Math.max(240, Math.min(containerWidth, 400));

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: text || (isSignup ? 'signup_with' : 'continue_with'),
          shape: 'rectangular',
          logo_alignment: 'left',
          width: renderWidth,
        });

        if (isMounted) {
          setGisRendered(true);
        }
      } catch (err: any) {
        console.warn('GIS initialization notice:', err?.message || err);
      }
    };

    if (window.google?.accounts?.id) {
      initializeGis();
    } else {
      const existingScript = document.getElementById('google-gsi-client');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-gsi-client';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) initializeGis();
        };
        script.onerror = () => {
          if (isMounted) {
            console.warn('Could not load Google Identity Services script.');
          }
        };
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener('load', initializeGis);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [clientId, mode, text]);

  const handleCustomButtonClick = () => {
    if (!clientId) {
      const msg = 'Google Sign-In is not configured yet. Please configure VITE_GOOGLE_CLIENT_ID.';
      setErrorMessage(msg);
      onError?.(msg);
      return;
    }

    if (window.google?.accounts?.id) {
      setErrorMessage(null);
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          const reason = notification.getNotDisplayedReason?.() || notification.getSkippedReason?.() || '';
          if (reason) {
            console.warn('GIS prompt not displayed or skipped:', reason);
          }
        }
      });
    } else {
      const msg = 'Google authentication script is still loading. Please try again in a moment.';
      setErrorMessage(msg);
      onError?.(msg);
    }
  };

  const buttonLabel = isSignup ? 'Sign up with Google' : 'Continue with Google';

  return (
    <div className={`w-full space-y-2 ${className}`}>
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#C85D55] text-xs flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-[#C85D55] shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {isAuthenticating ? (
        <div className="w-full py-2.5 px-4 rounded-xl text-xs font-medium border border-[#E9ECE7] bg-[#F8F9FA] text-[#5F6F65] flex items-center justify-center gap-2.5 shadow-subtle">
          <Loader2 className="w-4 h-4 animate-spin text-[#245C46]" />
          <span>Verifying Google account...</span>
        </div>
      ) : (
        <div className="w-full relative">
          {/* Container where Google's official iframe button is mounted */}
          <div
            ref={containerRef}
            className={gisRendered ? 'w-full flex justify-center min-h-[44px]' : 'w-full flex justify-center h-0 overflow-hidden opacity-0'}
          />

          {/* Branded fallback button shown while GIS is loading or if GIS is not rendered */}
          {!gisRendered && (
            <button
              type="button"
              onClick={handleCustomButtonClick}
              aria-label={buttonLabel}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-[#DADCE0] bg-[#FFFFFF] hover:bg-[#F8F9FA] text-[#3C4043] shadow-subtle hover:shadow-card transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-[#245C46]"
            >
              {/* Official Google 4-color G Logo */}
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span>{buttonLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
