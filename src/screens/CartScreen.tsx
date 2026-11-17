import React, { useEffect, useState } from 'react';
import {
  Box,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Ticket,
  Trash2,
} from 'lucide-react';
import {
  DAGUPAN_SHOPS,
  FLOWER_SPECIES,
  PICKUP_PAYMENT_METHODS,
  PICKUP_TIME_SLOTS,
} from '../data/dagupanCatalog';
import {
  CartItem,
  DagupanOrder,
  FloristShop,
  ScreenId,
  UserAccount,
} from '../types/floraview';
import { ResilientImage } from '../components/ResilientImage';

interface CartScreenProps {
  items: CartItem[];
  shops?: FloristShop[];
  user: UserAccount;
  selectedBarangay: string;
  onSelectBarangay: (barangay: string) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onPlaceOrder: (orderPayload: {
    recipientName: string;
    recipientPhone: string;
    pickupShopId: string;
    pickupShopName: string;
    pickupBranchAddress: string;
    pickupDate: string;
    pickupSlot: string;
    pickupNotes?: string;
    barangay: string;
    streetLandmark: string;
    deliverySlot: string;
    paymentMethod: string;
    subtotal: number;
    deliveryFee: number;
    totalAmount: number;
    summaryText: string;
  }) => Promise<DagupanOrder>;
  onNavigate: (screen: ScreenId) => void;
  onTrackTicket?: (ticketCode: string) => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  items,
  shops = DAGUPAN_SHOPS,
  user,
  onSelectBarangay,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  onNavigate,
  onTrackTicket,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  const firstOpenShop = shops.find((s) => s.isOpen !== false) || shops[0];
  const [selectedShopId, setSelectedShopId] = useState<string>(
    firstOpenShop.id,
  );
  const [pickupDate, setPickupDate] = useState<string>(todayStr);
  const [pickupSlot, setPickupSlot] = useState<string>(PICKUP_TIME_SLOTS[0]);
  const [recipientName, setRecipientName] = useState(
    user.provider !== 'guest' ? user.displayName : '',
  );
  const [recipientPhone, setRecipientPhone] = useState(
    user.phone || '+63 917 ',
  );
  const [pickupNotes, setPickupNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(
    PICKUP_PAYMENT_METHODS[0],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<DagupanOrder | null>(
    null,
  );

  useEffect(() => {
    if (user.provider !== 'guest') {
      setRecipientName((prev) => prev || user.displayName);
      setRecipientPhone((prev) =>
        prev === '+63 917 ' || !prev ? user.phone : prev,
      );
    }
  }, [user.uid, user.provider, user.displayName, user.phone]);

  const selectedShop =
    shops.find((s) => s.id === selectedShopId) || firstOpenShop;

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  // Pickup-Only Policy: zero delivery fee
  const deliveryFee = 0;
  const totalAmount = subtotal;

  const handleReservePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) return;
    if (selectedShop.isOpen === false) {
      setError(
        `${selectedShop.name} is temporarily closed for reservations. Please select another Dagupan atelier branch.`,
      );
      return;
    }
    if (!recipientName.trim() || !recipientPhone.trim()) {
      setError(
        'Please enter the claimant name and mobile number for counter pickup verification.',
      );
      return;
    }

    const summaryText = items
      .map((it) => `${it.quantity}x ${it.name}`)
      .join(', ')
      .slice(0, 280);

    setSubmitting(true);
    try {
      onSelectBarangay(selectedShop.barangay);
      const order = await onPlaceOrder({
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        pickupShopId: selectedShop.id,
        pickupShopName: selectedShop.name,
        pickupBranchAddress: selectedShop.street,
        pickupDate,
        pickupSlot,
        pickupNotes: pickupNotes.trim() || undefined,
        barangay: selectedShop.barangay,
        streetLandmark: selectedShop.street,
        deliverySlot: pickupSlot,
        paymentMethod,
        subtotal,
        deliveryFee: 0,
        totalAmount,
        summaryText,
      });
      setConfirmedOrder(order);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not complete pickup reservation.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    const ticketCode = confirmedOrder.ticketCode || confirmedOrder.id;
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="rounded-2xl bg-white border border-[#E4E2DC] p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#1B4332] text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-mono text-[#1B4332] font-semibold">
                Pickup Ticket #{ticketCode} · Ref {confirmedOrder.id}
              </p>
              <h1 className="font-serif text-3xl font-bold text-[#16211B] mt-0.5">
                Pickup Reservation Confirmed
              </h1>
              <p className="text-sm text-[#536159] mt-1">
                Our florists at {confirmedOrder.pickupShopName || selectedShop.name} are preparing your stems for counter pickup (no delivery).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F7] border border-[#E4E2DC] space-y-2.5 text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-[#536159]">Claimant</span>
              <span className="font-semibold text-[#16211B] text-right">
                {confirmedOrder.recipientName} ({confirmedOrder.recipientPhone})
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#536159]">Pickup Atelier</span>
              <span className="font-semibold text-[#16211B] text-right max-w-[65%]">
                {confirmedOrder.pickupShopName || selectedShop.name} ·{' '}
                {confirmedOrder.pickupBranchAddress || selectedShop.street}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#536159]">Pickup Date &amp; Window</span>
              <span className="font-semibold text-[#16211B] text-right">
                {confirmedOrder.pickupDate || pickupDate} ·{' '}
                {confirmedOrder.pickupSlot || confirmedOrder.deliverySlot}
              </span>
            </div>
            {confirmedOrder.assignedStaffName && (
              <div className="flex justify-between gap-3">
                <span className="text-[#536159]">Assigned Florist</span>
                <span className="font-semibold text-[#1B4332]">
                  {confirmedOrder.assignedStaffName}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-[#536159]">Payment Method</span>
              <span className="font-semibold text-[#16211B]">
                {confirmedOrder.paymentMethod}
              </span>
            </div>
            <div className="pt-2 border-t border-[#E4E2DC] flex justify-between text-sm">
              <span className="font-semibold text-[#16211B]">
                Reservation Total (₱0 Pickup Fee)
              </span>
              <span className="font-mono tabular-nums font-bold text-[#1B4332]">
                ₱{confirmedOrder.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirmedOrder(null);
                if (onTrackTicket) {
                  onTrackTicket(ticketCode);
                } else {
                  onNavigate('tracker');
                }
              }}
              className="min-h-[48px] flex-1 px-5 py-3 rounded-xl bg-[#1B4332] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Ticket className="w-4 h-4" />
              <span>Open Live Ticket Tracker</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmedOrder(null);
                onNavigate('profile');
              }}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-[#F1F0EC] text-[#16211B] text-sm font-semibold cursor-pointer"
            >
              View in Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-12 space-y-6">
      <div className="pb-4 border-b border-[#E4E2DC] flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#B8294B]">
            Pickup-Only Reservation System · No Delivery
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#16211B] mt-0.5">
            Your Pickup Bag &amp; Reservation
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate('tracker')}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#E4E2DC] cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5 text-[#1B4332]" />
            <span>Live Ticket Tracker</span>
          </button>
          <span className="font-mono tabular-nums text-xs text-[#536159]">
            {items.reduce((acc, i) => acc + i.quantity, 0)} Items
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white border border-[#E4E2DC] text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F1F0EC] text-[#1B4332] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#16211B]">
            Your pickup bag is empty
          </h2>
          <p className="text-sm text-[#536159]">
            Reserve freshly cut arrangements for counter pickup at our Dagupan City ateliers or compose your own 3D bouquet.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('shops')}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1B4332] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>Browse Dagupan Shops</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('studio')}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Box className="w-4 h-4" />
              <span>Open 3D Bouquet Studio</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Itemized Cart List */}
          <div className="lg:col-span-7 space-y-4">
            {items.map((item) => {
              const customStemSummary = item.customConfig
                ? FLOWER_SPECIES.map((sp) => ({
                    name: sp.name,
                    qty: item.customConfig?.stems[sp.id] || 0,
                  }))
                    .filter((x) => x.qty > 0)
                    .map((x) => `${x.qty}x ${x.name}`)
                    .join(' · ')
                : null;

              return (
                <article
                  key={item.id}
                  className="rounded-2xl bg-white border border-[#E4E2DC] p-4 sm:p-5 flex gap-4 items-start"
                >
                  <div className="w-20 aspect-[3/4] sm:w-24 rounded-xl overflow-hidden bg-[#F1F0EC] shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <ResilientImage
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <Box className="w-7 h-7 text-[#1B4332]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-[#536159]">
                          {item.shopName}
                          {item.sizeTier ? ` · ${item.sizeTier.toUpperCase()}` : ''}
                        </p>
                        <h2 className="font-serif text-lg sm:text-xl font-bold text-[#16211B] leading-snug">
                          {item.name}
                        </h2>
                      </div>

                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => onRemoveItem(item.id)}
                        className="min-w-[40px] min-h-[40px] rounded-lg text-[#536159] hover:text-[#B8294B] flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {customStemSummary && (
                      <p className="mt-1 text-xs text-[#536159] leading-relaxed">
                        {customStemSummary}
                      </p>
                    )}

                    {item.giftNote && (
                      <p className="mt-1 text-xs italic text-[#1B4332]">
                        Card: &ldquo;{item.giftNote}&rdquo;
                      </p>
                    )}

                    <div className="mt-3 pt-2.5 border-t border-[#F1F0EC] flex items-center justify-between gap-2">
                      <span className="font-mono tabular-nums text-sm font-bold text-[#16211B]">
                        ₱{(item.unitPrice * item.quantity).toLocaleString()}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Decrease quantity for ${item.name}`}
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="min-w-[40px] min-h-[40px] rounded-lg bg-[#F1F0EC] text-[#16211B] flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center font-mono tabular-nums text-xs font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity for ${item.name}`}
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="min-w-[40px] min-h-[40px] rounded-lg bg-[#1B4332] text-white flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Right Dagupan City Pickup-Only Reservation Form */}
          <form
            onSubmit={handleReservePickup}
            className="lg:col-span-5 rounded-2xl bg-white border border-[#E4E2DC] p-5 sm:p-6 space-y-4"
          >
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#16211B]">
                Dagupan Counter Pickup Reservation
              </h2>
              <p className="mt-1 text-xs text-[#536159]">
                In-store pickup only (no delivery). Reserve your live queue ticket and claim chilled stems at the counter.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#FDF2F4] border border-[#F3C6D0] text-xs font-medium text-[#8E1F3A]"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="pickup-shop-select"
                className="block text-xs font-semibold text-[#16211B] mb-1.5"
              >
                Dagupan Pickup Atelier Branch
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#B8294B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="pickup-shop-select"
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                >
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name} · Brgy. {shop.barangay}
                      {shop.isOpen === false ? ' (Closed)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-1.5 text-[11px] text-[#536159] space-y-0.5">
                <p>{selectedShop.street}</p>
                <p className="font-mono">
                  {selectedShop.counterDesk} · {selectedShop.pickupHours}
                  {selectedShop.isOpen === false ? ' · Temporarily Closed' : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="pickup-date"
                  className="block text-xs font-semibold text-[#16211B] mb-1.5"
                >
                  Pickup Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#536159] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="pickup-date"
                    type="date"
                    min={todayStr}
                    required
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full min-h-[44px] pl-10 pr-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs font-mono text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="pickup-slot"
                  className="block text-xs font-semibold text-[#16211B] mb-1.5"
                >
                  Pickup Window
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-[#536159] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="pickup-slot"
                    value={pickupSlot}
                    onChange={(e) => setPickupSlot(e.target.value)}
                    className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs font-medium text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                  >
                    {PICKUP_TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="checkout-name"
                  className="block text-xs font-semibold text-[#16211B] mb-1.5"
                >
                  Claimant Name
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  required
                  placeholder="Full name for counter ID"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label
                  htmlFor="checkout-phone"
                  className="block text-xs font-semibold text-[#16211B] mb-1.5"
                >
                  Mobile Number
                </label>
                <input
                  id="checkout-phone"
                  type="tel"
                  required
                  placeholder="+63 917 842 3910"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="pickup-notes"
                className="block text-xs font-semibold text-[#16211B] mb-1.5"
              >
                Counter Pickup Note (Optional)
              </label>
              <input
                id="pickup-notes"
                type="text"
                maxLength={180}
                placeholder="e.g., Authorized representative Ana Reyes will claim"
                value={pickupNotes}
                onChange={(e) => setPickupNotes(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div>
              <label
                htmlFor="checkout-payment"
                className="block text-xs font-semibold text-[#16211B] mb-1.5"
              >
                Reservation Payment Method
              </label>
              <select
                id="checkout-payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs font-medium text-[#16211B] focus:outline-none focus:border-[#1B4332]"
              >
                {PICKUP_PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            {/* Reservation Totals */}
            <div className="pt-4 border-t border-[#E4E2DC] space-y-2 text-xs">
              <div className="flex justify-between text-[#536159]">
                <span>Bouquet Subtotal</span>
                <span className="font-mono tabular-nums text-[#16211B]">
                  ₱{subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[#536159]">
                <span>In-Store Pickup Fee (No Delivery)</span>
                <span className="font-mono tabular-nums font-semibold text-[#1B4332]">
                  FREE (₱{deliveryFee})
                </span>
              </div>
              <div className="pt-2 border-t border-[#E4E2DC] flex justify-between text-base font-bold text-[#16211B]">
                <span>Total Reservation</span>
                <span className="font-mono tabular-nums">
                  ₱{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#1B4332] text-white text-sm font-semibold hover:bg-[#143326] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              {submitting
                ? 'Issuing Pickup Ticket...'
                : `Reserve Pickup Ticket · ₱${totalAmount.toLocaleString()}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

