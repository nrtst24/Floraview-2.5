import React, { useEffect, useState } from 'react';
import {
  Box,
  Camera,
  Check,
  Edit3,
  LogIn,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  User,
  UserPlus,
} from 'lucide-react';
import { DAGUPAN_BARANGAYS } from '../data/dagupanCatalog';
import {
  BouquetConfig,
  DagupanOrder,
  SavedBouquetRecord,
  ScreenId,
  UserAccount,
} from '../types/floraview';

interface ProfileScreenProps {
  user: UserAccount;
  savedBouquets: SavedBouquetRecord[];
  orders: DagupanOrder[];
  onNavigate: (screen: ScreenId) => void;
  onTrackTicket?: (ticketCode: string) => void;
  onUpdateProfile?: (updates: {
    displayName: string;
    phone: string;
    barangay: string;
    streetAddress: string;
  }) => Promise<void>;
  onLoadBouquetIn3D: (config: BouquetConfig) => void;
  onLoadBouquetInAR: (config: BouquetConfig) => void;
  onAddSavedBouquetToCart?: (record: SavedBouquetRecord) => void;
  onDeleteSavedBouquet: (id: string) => Promise<void>;
  onCancelReservation?: (orderId: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  savedBouquets,
  onNavigate,
  onUpdateProfile,
  onLoadBouquetIn3D,
  onLoadBouquetInAR,
  onAddSavedBouquetToCart,
  onDeleteSavedBouquet,
  onSignOut,
}) => {
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [phone, setPhone] = useState(user.phone);
  const [barangay, setBarangay] = useState(user.barangay);
  const [streetAddress, setStreetAddress] = useState(user.streetAddress);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [addedSavedId, setAddedSavedId] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user.displayName);
    setPhone(user.phone);
    setBarangay(user.barangay);
    setStreetAddress(user.streetAddress);
  }, [user.uid, user.displayName, user.phone, user.barangay, user.streetAddress]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateProfile) return;
    setProfileError(null);
    setSavingProfile(true);
    try {
      await onUpdateProfile({
        displayName: displayName.trim() || user.displayName,
        phone: phone.trim() || user.phone,
        barangay,
        streetAddress: streetAddress.trim() || user.streetAddress,
      });
      setEditingProfile(false);
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Unable to save profile details.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddSaved = (record: SavedBouquetRecord) => {
    if (!onAddSavedBouquetToCart) return;
    onAddSavedBouquetToCart(record);
    setAddedSavedId(record.id);
    window.setTimeout(() => {
      setAddedSavedId((curr) => (curr === record.id ? null : curr));
    }, 1400);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-12 space-y-8">
      {/* Top Customer Account Card */}
      <section className="rounded-2xl bg-white border border-[#E4E2DC] p-5 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1B4332] text-white flex items-center justify-center shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#536159]">
                <span>
                  {user.provider === 'google'
                    ? 'Google Verified Account'
                    : user.provider === 'email'
                      ? 'FloraView Member'
                      : 'Guest Session'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Brgy. {user.barangay}, Dagupan City</span>
                {profileSaved && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#1B4332] font-semibold">Saved</span>
                  </>
                )}
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#16211B] mt-0.5">
                {user.displayName}
              </h1>
              <p className="text-xs font-mono text-[#536159]">
                {user.email} · {user.phone}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onUpdateProfile && (
              <button
                type="button"
                onClick={() => setEditingProfile((prev) => !prev)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#E4E2DC] cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>{editingProfile ? 'Close Edit' : 'Edit Profile'}</span>
              </button>
            )}

            {user.provider === 'guest' ? (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log In Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Account</span>
                </button>
              </>
            ) : (
              <>
                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => onNavigate('admin')}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#16211B] text-[#E8D5B5] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Atelier</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Switch Account</span>
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-[#D5D2CA] text-[#16211B] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#F1F0EC] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Inline Edit Profile Form */}
        {editingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="pt-5 border-t border-[#E4E2DC] space-y-4"
          >
            {profileError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#FDF2F4] border border-[#F3C6D0] text-xs font-medium text-[#8E1F3A]"
              >
                {profileError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-xs font-semibold text-[#16211B] mb-1"
                >
                  Full Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-phone"
                  className="block text-xs font-semibold text-[#16211B] mb-1"
                >
                  Mobile Number
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-barangay"
                  className="block text-xs font-semibold text-[#16211B] mb-1"
                >
                  Preferred Barangay
                </label>
                <select
                  id="profile-barangay"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                >
                  {DAGUPAN_BARANGAYS.map((bgy) => (
                    <option key={bgy.name} value={bgy.name}>
                      Brgy. {bgy.name} ({bgy.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="profile-street"
                  className="block text-xs font-semibold text-[#16211B] mb-1"
                >
                  Street / Landmark
                </label>
                <input
                  id="profile-street"
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Saved Custom 3D Bouquets & Dagupan Pickup History */}
      <div className="space-y-8">
        {/* Saved Custom 3D Bouquets */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B8294B]" />
              <h2 className="font-serif text-2xl font-bold text-[#16211B]">
                Saved 3D Bouquet Designs ({savedBouquets.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('studio')}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#1B4332] text-white text-xs font-semibold cursor-pointer"
            >
              + New 3D Design
            </button>
          </div>

          {savedBouquets.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-[#E4E2DC] text-sm text-[#536159]">
              No custom 3D bouquets saved yet. Open the 3D Bouquet Studio and tap Save.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedBouquets.map((sb) => {
                const isAdded = addedSavedId === sb.id;
                return (
                  <article
                    key={sb.id}
                    className="rounded-2xl bg-white border border-[#E4E2DC] p-4 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-lg font-bold text-[#16211B]">
                          {sb.title}
                        </h3>
                        <button
                          type="button"
                          aria-label={`Delete ${sb.title}`}
                          onClick={() => onDeleteSavedBouquet(sb.id)}
                          className="min-w-[36px] min-h-[36px] text-[#536159] hover:text-[#B8294B] flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs font-mono tabular-nums text-[#536159] mt-1">
                        {sb.stemCount} Stems · ₱{sb.totalPrice.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F1F0EC]">
                      <button
                        type="button"
                        onClick={() => onLoadBouquetIn3D(sb.config)}
                        className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#1B4332] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Box className="w-3.5 h-3.5" />
                        <span>Open 3D</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onLoadBouquetInAR(sb.config)}
                        className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>AR View</span>
                      </button>
                      {onAddSavedBouquetToCart && (
                        <button
                          type="button"
                          onClick={() => handleAddSaved(sb)}
                          className="flex-1 min-h-[40px] px-3 rounded-xl border border-[#D5D2CA] text-[#16211B] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#FAF9F7] cursor-pointer"
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#1B4332]" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Add to Bag</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
