import React from 'react';
import {
  Box,
  Camera,
  Home,
  ShieldCheck,
  ShoppingBag,
  Store,
  Ticket,
  User,
} from 'lucide-react';
import { ScreenId } from '../types/floraview';

interface MobileShellProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  cartCount: number;
  selectedBarangay: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}

const FULLSCREEN_SCREENS: ScreenId[] = ['splash', 'register', 'login', 'studio', 'ar'];

export const MobileShell: React.FC<MobileShellProps> = ({
  currentScreen,
  onNavigate,
  cartCount,
  selectedBarangay,
  isAdmin = false,
  children,
}) => {
  const isFullscreen = FULLSCREEN_SCREENS.includes(currentScreen);

  const navItems: Array<{ id: ScreenId; label: string; icon: React.ReactNode }> = isAdmin
    ? [
        { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" strokeWidth={1.8} /> },
        { id: 'shops', label: 'Shops', icon: <Store className="w-5 h-5" strokeWidth={1.8} /> },
        { id: 'studio', label: '3D Studio', icon: <Box className="w-5 h-5" strokeWidth={1.8} /> },
        { id: 'admin', label: 'Admin', icon: <ShieldCheck className="w-5 h-5" strokeWidth={1.8} /> },
        { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" strokeWidth={1.8} /> },
      ]
    : [
        { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" strokeWidth={1.8} /> },
        { id: 'shops', label: 'Shops', icon: <Store className="w-5 h-5" strokeWidth={1.8} /> },
        { id: 'studio', label: '3D Studio', icon: <Box className="w-5 h-5" strokeWidth={1.8} /> },
        { id: 'ar', label: 'AR View', icon: <Camera className="w-5 h-5" strokeWidth={1.8} /> },
        { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" strokeWidth={1.8} /> },
      ];

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F7] text-[#16211B]">
      {/* Standard Top Navigation Bar (Hidden on immersive Splash/Auth/3D/AR screens which render their own compact bar) */}
      {!isFullscreen && (
        <header className="sticky top-0 z-30 h-[52px] lg:h-16 bg-[#FAF9F7]/95 border-b border-[#E4E2DC] px-4 lg:px-8">
          <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4 lg:gap-8">
            {/* Zone 1: Single-element Brand Wordmark */}
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="font-serif text-xl lg:text-2xl font-bold tracking-tight text-[#16211B] whitespace-nowrap shrink-0 min-h-[44px] flex items-center cursor-pointer"
            >
              FloraView
            </button>

            {/* Zone 2: Desktop Single-Line Nav Links */}
            <nav
              aria-label="Primary navigation"
              className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#536159]"
            >
              {navItems
                .filter((item) => !(isAdmin && item.id === 'home'))
                .map((item) => {
                  const active =
                    currentScreen === item.id ||
                    (item.id === 'shops' && currentScreen === 'details');
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(item.id)}
                      className={`whitespace-nowrap shrink-0 min-h-[44px] px-1 border-b-2 transition-colors cursor-pointer ${
                        active
                          ? 'border-[#1B4332] text-[#16211B] font-semibold'
                          : 'border-transparent hover:text-[#16211B]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              <button
                type="button"
                onClick={() => onNavigate('tracker')}
                className={`whitespace-nowrap shrink-0 min-h-[44px] px-1 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentScreen === 'tracker'
                    ? 'border-[#1B4332] text-[#16211B] font-semibold'
                    : 'border-transparent hover:text-[#16211B]'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Live Tickets</span>
              </button>
            </nav>

            {/* Zone 3: Primary Action (Cart CTA - hidden for Admin) */}
            <div className="flex items-center gap-2 shrink-0">
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => onNavigate('cart')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs lg:text-sm font-medium flex items-center gap-2 hover:bg-[#143326] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>Reservation</span>
                  <span className="font-mono tabular-nums text-xs opacity-90">
                    ({cartCount})
                  </span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Content Canvas */}
      <main
        className={`flex-1 w-full ${
          !isFullscreen ? 'pb-[72px] lg:pb-12' : ''
        }`}
      >
        {children}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (56px height -> combined with 52px header = 108px <= 15% viewport height) */}
      {!isFullscreen && (
        <nav
          aria-label="Mobile bottom navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-[58px] bg-[#FFFFFF]/95 border-t border-[#E4E2DC]"
        >
          <div className="grid grid-cols-5 h-full max-w-lg mx-auto">
            {navItems.map((item) => {
              const active =
                currentScreen === item.id ||
                (item.id === 'shops' && currentScreen === 'details');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`flex flex-col items-center justify-center min-h-[44px] transition-colors cursor-pointer ${
                    active ? 'text-[#1B4332] font-semibold' : 'text-[#536159]'
                  }`}
                >
                  {item.icon}
                  <span className="text-[11px] leading-none mt-1 whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};
