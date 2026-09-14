import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

/**
 * OAuth2CallbackPage — Trang trung gian xu ly sau khi Google OAuth2 thanh cong.
 *
 * Luong:
 *   1. Backend redirect ve: http://localhost:5173/oauth2/callback?status=success
 *   2. Trang nay hien thi loading spinner
 *   3. Goi fetchCurrentUser() tu Zustand — request den /api/v1/auth/me
 *      (Browser tu dong gui cookie HttpOnly trong request nay vi withCredentials=true)
 *   4. Zustand cap nhat global state voi thong tin user
 *   5. Redirect theo role: ADMIN -> /admin, DOCTOR -> /doctor, PATIENT -> /patient
 *
 * Xu ly loi:
 *   - Neu URL co ?error= hoac status != success -> redirect /login voi thong bao loi
 *   - Neu fetchCurrentUser that bai (cookie khong hop le) -> redirect /login
 */
export const OAuth2CallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fetchCurrentUser } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      // Kiem tra neu co loi tu Backend (OAuth2FailureHandler redirect voi ?error=)
      const errorParam = searchParams.get('error');
      const messageParam = searchParams.get('message');

      if (errorParam) {
        setStatus('error');
        setErrorMsg(
          messageParam
            ? decodeURIComponent(messageParam)
            : 'Dang nhap bang Google that bai. Vui long thu lai.'
        );
        setTimeout(() => navigate('/login?error=oauth2_failed'), 2500);
        return;
      }

      try {
        // Goi API /auth/me — cookie JWT duoc tu dong gui boi browser (withCredentials=true)
        await fetchCurrentUser();

        // Lay user moi nhat tu store sau fetchCurrentUser()
        const currentUser = useAuthStore.getState().user;

        if (!currentUser) {
          throw new Error('Khong the lay thong tin nguoi dung.');
        }

        // Redirect theo role
        switch (currentUser.role) {
          case 'ADMIN':
            navigate('/admin', { replace: true });
            break;
          case 'DOCTOR':
            navigate('/doctor', { replace: true });
            break;
          case 'PATIENT':
          default:
            navigate('/patient', { replace: true });
            break;
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg('Xac thuc that bai. Vui long dang nhap lai.');
        setTimeout(() => navigate('/login'), 2500);
      }
    };

    handleCallback();
    // Chi chay 1 lan khi mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="flex flex-col items-center gap-6 text-center px-4">
        {/* MediAssist Logo */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">MediAssist-AI</span>
        </div>

        {status === 'loading' ? (
          <>
            {/* Loading spinner */}
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              {/* Google icon trong spinner */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-7 w-7" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Dang xac thuc voi Google...</p>
              <p className="text-sm text-blue-300/70 mt-1">Vui long cho trong giay lat</p>
            </div>
          </>
        ) : (
          <>
            {/* Error state */}
            <div className="h-16 w-16 rounded-full bg-rose-500/20 flex items-center justify-center">
              <svg className="h-8 w-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Xac thuc that bai</p>
              <p className="text-sm text-rose-300/80 mt-1">{errorMsg}</p>
              <p className="text-xs text-slate-400 mt-2">Dang chuyen ve trang dang nhap...</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuth2CallbackPage;
