import React from 'react';

/**
 * GoogleLoginButton — Nut dang nhap bang Google OAuth2.
 *
 * Khi click, chuyen huong truc tiep den Spring Security OAuth2 authorization endpoint.
 * Spring Security se tu dong redirect sang Google consent screen.
 *
 * Luong:
 *   1. User click button nay
 *   2. Browser chuyen toi: http://localhost:5000/oauth2/authorization/google
 *   3. Spring Security redirect sang Google consent screen
 *   4. Google xac thuc va redirect ve: http://localhost:5000/login/oauth2/code/google
 *   5. Backend xu ly, set cookie JWT, redirect ve: http://localhost:5173/oauth2/callback
 *   6. OAuth2CallbackPage goi /api/v1/auth/me va luu user vao Zustand store
 */

interface GoogleLoginButtonProps {
  /** Label hien thi tren button, mac dinh: "Tiep tuc voi Google" */
  label?: string;
  /** Class CSS tuy chinh them (de merge voi class mac dinh) */
  className?: string;
  /** Backend base URL — phai khop voi cau hinh OAuth2 trong Spring Security */
  backendUrl?: string;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  label = 'Tiếp tục với Google',
  className = '',
  backendUrl = 'http://localhost:5000',
}) => {

  /**
   * Chuyen huong TRUC TIEP den backend OAuth2 authorization endpoint.
   * TUYET DOI KHONG goi qua Axios/fetch — OAuth2 Authorization Code Flow yeu cau
   * browser redirect thuc su (khong phai XMLHttpRequest) de:
   *   1. Browser co the nhan va luu cookie tu domain backend
   *   2. Google consent screen co the hien thi dung
   *   3. PKCE/state parameter hoat dong chinh xac
   */
  const handleGoogleLogin = () => {
    window.location.href = `${backendUrl}/oauth2/authorization/google`;
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      className={[
        // Base styles
        'flex w-full items-center justify-center gap-3',
        'rounded-xl border border-slate-200 bg-white px-4 py-3',
        'text-sm font-semibold text-slate-700',
        'shadow-sm transition-all duration-200',
        // Hover & Focus
        'hover:bg-slate-50 hover:border-slate-300 hover:shadow-md',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        // Active press effect
        'active:scale-[0.98]',
        className,
      ].join(' ')}
      id="btn-google-login"
      aria-label="Dang nhap bang tai khoan Google"
    >
      {/* Google Logo SVG chinh xac theo brand guidelines */}
      <svg
        className="h-5 w-5 flex-shrink-0"
        viewBox="0 0 24 24"
        aria-hidden="true"
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
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>

      <span>{label}</span>
    </button>
  );
};

export default GoogleLoginButton;
