import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Flower2 } from 'lucide-react';
import { DAGUPAN_BARANGAYS, IMAGES } from '../data/dagupanCatalog';
import { ScreenId, UserAccount } from '../types/floraview';
import { ResilientImage } from '../components/ResilientImage';

interface RegisterScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onGoogleSignIn?: () => Promise<void>;
  onEmailRegister: (payload: {
    displayName: string;
    email: string;
    password: string;
    phone: string;
    barangay: string;
    streetAddress: string;
  }) => Promise<UserAccount | void>;
  currentUser: UserAccount;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onNavigate,
  onEmailRegister,
  currentUser,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+63 ');
  const [barangay, setBarangay] = useState('Lucao');
  const [streetAddress, setStreetAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!displayName.trim() || !email.trim() || password.length < 6) {
      setError('Please enter your name, email address, and a password of at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await onEmailRegister({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || '+63 917 000 0000',
        barangay,
        streetAddress: streetAddress.trim() || `Brgy. ${barangay}, Dagupan City`,
      });
      onNavigate('home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-12 bg-[#FAF9F7]">
      {/* Left Column: Editorial Botanical Showcase (Desktop) */}
      <div className="hidden lg:flex lg:col-span-5 relative bg-[#16211B] text-white flex-col justify-between p-10 overflow-hidden">
        <div className="absolute inset-0">
          <ResilientImage
            src={IMAGES.sampaguitaRose}
            alt="Hand-tied Sampaguita and blush rose bouquet"
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111C16] via-[#111C16]/50 to-[#111C16]/40" />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('splash')}
            className="flex items-center gap-2 font-serif text-2xl font-bold text-white cursor-pointer"
          >
            <Flower2 className="w-6 h-6 text-[#E8D5B5]" />
            <span>FloraView</span>
          </button>
          <span className="text-xs font-mono text-white/80">Dagupan City</span>
        </div>

        <div className="relative z-10 space-y-5">
          <h2 className="font-serif text-4xl font-bold leading-tight text-white">
            Save Custom 3D Bouquets &amp; Track Live Pickup Tickets
          </h2>
          <ul className="space-y-3 text-sm text-white/85">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E8D5B5] shrink-0" />
              <span>Cloud-synced custom 3D stem recipes and AR snapshots</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E8D5B5] shrink-0" />
              <span>₱0 pickup-only reservation across 4 Dagupan City atelier counters</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E8D5B5] shrink-0" />
              <span>Pay at Counter, GCash, Maya, and Card counter support</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Right Column: Registration & Sign-In Choice Form */}
      <div className="lg:col-span-7 flex flex-col justify-center px-5 py-6 sm:px-10 lg:px-16 max-w-2xl w-full mx-auto">
        {/* Top Back & Login Switch Bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => onNavigate('splash')}
            className="min-h-[44px] px-2 -ml-2 flex items-center gap-1.5 text-sm font-medium text-[#536159] hover:text-[#16211B] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="min-h-[44px] px-4 rounded-xl border border-[#E4E2DC] bg-white text-xs font-semibold text-[#16211B] hover:bg-[#F1F0EC] cursor-pointer"
            >
              Log In Page
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="min-h-[44px] px-3 text-xs font-medium text-[#536159] hover:text-[#16211B] cursor-pointer"
            >
              Guest Mode
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-[#B8294B] mb-1">
            Step 02 · Account &amp; Dagupan Pickup Profile
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#16211B] tracking-tight">
            Create Your FloraView Account
          </h1>
          <p className="mt-1.5 text-sm text-[#536159]">
            Register to save custom 3D bouquets, or sign in with Google for instant sync.
          </p>
        </div>

        {currentUser.provider !== 'guest' && (
          <div className="mt-4 p-3.5 rounded-xl bg-[#F1F0EC] border border-[#E4E2DC] flex items-center justify-between gap-3">
            <div className="text-xs">
              <p className="font-semibold text-[#16211B]">
                Signed in as {currentUser.displayName}
              </p>
              <p className="text-[#536159]">{currentUser.email}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="min-h-[40px] px-3.5 rounded-lg bg-[#1B4332] text-white text-xs font-medium cursor-pointer"
            >
              Go to Home
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 mb-4 p-3.5 rounded-xl bg-[#FDF2F4] border border-[#F3C6D0] text-xs font-medium text-[#8E1F3A]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-name"
                className="block text-xs font-semibold text-[#16211B] mb-1.5"
              >
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                placeholder="e.g., Sofia Mendoza"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div>
              <label
                htmlFor="reg-phone"
                className="block text-xs font-semibold text-[#16211B] mb-1.5"
              >
                Mobile Number
              </label>
              <input
                id="reg-phone"
                type="tel"
                placeholder="+63 9XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-email"
              className="block text-xs font-semibold text-[#16211B] mb-1.5"
            >
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              required
              placeholder="sofia@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-barangay"
                className="block text-xs font-semibold text-[#16211B] mb-1.5"
              >
                Dagupan City Barangay
              </label>
              <select
                id="reg-barangay"
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
              >
                {DAGUPAN_BARANGAYS.map((b) => (
                  <option key={b.name} value={b.name}>
                    Brgy. {b.name} (₱0 Counter Pickup)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="reg-street"
                className="block text-xs font-semibold text-[#16211B] mb-1.5"
              >
                Street / Landmark
              </label>
              <input
                id="reg-street"
                type="text"
                placeholder="Near Nepo Mall / CSI Lucao"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-password"
              className="block text-xs font-semibold text-[#16211B] mb-1.5"
            >
              Password (minimum 6 characters)
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Create a password"
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
            {loading ? 'Creating Account...' : 'Register & Enter FloraView'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E4E2DC] flex items-center justify-between text-xs text-[#536159]">
          <span>Already registered with FloraView Dagupan?</span>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="min-h-[44px] px-2 font-semibold text-[#1B4332] underline underline-offset-4 cursor-pointer"
          >
            Go to Log In Page
          </button>
        </div>
      </div>
    </div>
  );
};
