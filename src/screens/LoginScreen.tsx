import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Flower2 } from 'lucide-react';
import { IMAGES } from '../data/dagupanCatalog';
import { ScreenId, UserAccount } from '../types/floraview';
import { ResilientImage } from '../components/ResilientImage';

interface LoginScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onEmailLogin: (email: string, password: string) => Promise<UserAccount>;
  onGoogleSignIn?: () => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigate,
  onEmailLogin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter both your email or username and password.');
      return;
    }
    setLoading(true);
    try {
      const loggedIn = await onEmailLogin(email.trim(), password);
      onNavigate(loggedIn.role === 'admin' ? 'admin' : 'home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-12 bg-[#FAF9F7]">
      {/* Left Form Column */}
      <div className="lg:col-span-7 flex flex-col justify-center px-5 py-6 sm:px-10 lg:px-16 max-w-xl w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="min-h-[44px] px-2 -ml-2 flex items-center gap-1.5 text-sm font-medium text-[#536159] hover:text-[#16211B] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="min-h-[44px] px-3 text-xs font-medium text-[#536159] hover:text-[#16211B] cursor-pointer"
          >
            Continue as Guest
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-[#1B4332] mb-2">
          <Flower2 className="w-4 h-4" />
          <span>FloraView Dagupan</span>
          <span aria-hidden="true">·</span>
          <span>Member &amp; Admin Sign In</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#16211B] tracking-tight">
          Welcome Back to the Atelier
        </h1>
        <p className="mt-1.5 text-sm text-[#536159]">
          Log in to access your saved 3D bouquet designs, Dagupan pickup tickets, or the Atelier Admin &amp; Staff desk.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 p-3.5 rounded-xl bg-[#FDF2F4] border border-[#F3C6D0] text-xs font-medium text-[#8E1F3A]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-[#16211B] mb-1.5"
            >
              Email or Username
            </label>
            <input
              id="login-email"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              required
              placeholder="clara.reyes@dagupanflora.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-[#16211B] mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] pl-3.5 pr-12 py-2 rounded-xl bg-white border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#536159] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#1B4332] text-white text-sm font-semibold hover:bg-[#143326] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Signing In...' : 'Log In'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E4E2DC] flex items-center justify-between text-xs text-[#536159]">
          <span>Don&apos;t have an account yet?</span>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="min-h-[44px] px-2 font-semibold text-[#1B4332] underline underline-offset-4 cursor-pointer"
          >
            Create Account
          </button>
        </div>
      </div>

      {/* Right Visual Showcase Column (Desktop) */}
      <div className="hidden lg:block lg:col-span-5 relative bg-[#16211B]">
        <ResilientImage
          src={IMAGES.stargazerOrchid}
          alt="Stargazer Lily and Phalaenopsis Orchid arrangement"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E1712]/80 via-transparent to-[#0E1712]/25" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="text-xs font-mono text-[#E8D5B5] mb-1">
            Lucao Garden Atelier · Dagupan City
          </p>
          <p className="font-serif text-2xl font-semibold">
            Freshly cut every morning and chilled ready for counter pickup in Dagupan.
          </p>
        </div>
      </div>
    </div>
  );
};
