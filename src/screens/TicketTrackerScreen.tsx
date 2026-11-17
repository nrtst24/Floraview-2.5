import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Ticket,
  UserCheck,
} from 'lucide-react';
import { DAGUPAN_SHOPS } from '../data/dagupanCatalog';
import {
  DagupanOrder,
  FloristShop,
  LiveTicketSummary,
  OrderStatus,
  ScreenId,
} from '../types/floraview';

interface TicketTrackerScreenProps {
  myOrders: DagupanOrder[];
  shops?: FloristShop[];
  initialTicketCode?: string | null;
  onNavigate: (screen: ScreenId) => void;
}

function getStageIndex(status: OrderStatus): number {
  if (status === 'cancelled') return 0;
  if (status === 'picked_up' || status === 'delivered') return 3;
  if (status === 'ready_for_pickup' || status === 'out_for_delivery') return 2;
  return 1;
}

function formatTicketStatusLabel(status: OrderStatus): string {
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'picked_up' || status === 'delivered') return 'Picked Up';
  if (status === 'ready_for_pickup' || status === 'out_for_delivery') {
    return 'Ready for Pickup';
  }
  return 'Crafting Bouquet';
}

function getStatusAccentClass(status: OrderStatus): string {
  if (status === 'cancelled') return 'text-[#8E1F3A]';
  if (status === 'picked_up' || status === 'delivered') return 'text-[#536159]';
  if (status === 'ready_for_pickup' || status === 'out_for_delivery') {
    return 'text-[#1B4332]';
  }
  return 'text-[#B8294B]';
}

export const TicketTrackerScreen: React.FC<TicketTrackerScreenProps> = ({
  myOrders,
  shops = DAGUPAN_SHOPS,
  initialTicketCode,
  onNavigate,
}) => {
  const [liveTickets, setLiveTickets] = useState<LiveTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [searchCode, setSearchCode] = useState<string>(initialTicketCode || '');
  const [focusedTicket, setFocusedTicket] = useState<LiveTicketSummary | null>(
    null,
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');

  const fetchLiveQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets/live');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not load live pickup counter queue.');
      }
      const list: LiveTicketSummary[] = Array.isArray(data.tickets)
        ? data.tickets
        : [];
      setLiveTickets(list);
      setLastSyncedAt(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
      setError(null);

      setFocusedTicket((prev) => {
        if (prev) {
          const updated = list.find(
            (t) => t.id === prev.id || t.ticketCode === prev.ticketCode,
          );
          if (updated) return updated;
        }
        if (initialTicketCode) {
          const match = list.find(
            (t) =>
              t.ticketCode.toLowerCase() === initialTicketCode.toLowerCase() ||
              t.id.toLowerCase() === initialTicketCode.toLowerCase(),
          );
          if (match) return match;
        }
        if (myOrders.length > 0) {
          const myMatch = list.find(
            (t) =>
              t.id === myOrders[0].id ||
              (myOrders[0].ticketCode && t.ticketCode === myOrders[0].ticketCode),
          );
          if (myMatch) return myMatch;
        }
        return list.find((t) => t.status !== 'picked_up' && t.status !== 'delivered') || list[0] || null;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to reach Dagupan counter queue.',
      );
    } finally {
      setLoading(false);
    }
  }, [initialTicketCode, myOrders]);

  useEffect(() => {
    fetchLiveQueue();
    const timer = window.setInterval(() => {
      fetchLiveQueue();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [fetchLiveQueue]);

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = searchCode.trim();
    if (!code) return;
    setLookupError(null);
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Ticket "${code}" not found.`);
      }
      if (data.ticket) {
        setFocusedTicket(data.ticket);
      }
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : 'Could not find pickup ticket.',
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const filteredLiveTickets = useMemo(() => {
    if (branchFilter === 'all') return liveTickets;
    return liveTickets.filter((t) => t.pickupShopId === branchFilter);
  }, [liveTickets, branchFilter]);

  const readyTickets = useMemo(
    () =>
      filteredLiveTickets.filter(
        (t) => t.status === 'ready_for_pickup' || t.status === 'out_for_delivery',
      ),
    [filteredLiveTickets],
  );

  const craftingTickets = useMemo(
    () => filteredLiveTickets.filter((t) => t.status === 'preparing'),
    [filteredLiveTickets],
  );

  const completedTickets = useMemo(
    () =>
      filteredLiveTickets
        .filter((t) => t.status === 'picked_up' || t.status === 'delivered')
        .slice(0, 6),
    [filteredLiveTickets],
  );

  const activeStage = focusedTicket ? getStageIndex(focusedTicket.status) : 1;
  const focusedShop = focusedTicket
    ? shops.find((s) => s.id === focusedTicket.pickupShopId)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-12 space-y-8">
      {/* Page Header */}
      <div className="pb-4 border-b border-[#E4E2DC] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="min-h-[40px] px-1 -ml-1 mb-1 flex items-center gap-1.5 text-xs font-medium text-[#536159] hover:text-[#16211B] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Storefront</span>
          </button>
          <p className="text-xs font-medium text-[#B8294B]">
            Pickup-Only Atelier Queue · No Delivery
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#16211B] mt-0.5">
            Live Pickup Ticket Tracker
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {lastSyncedAt && (
            <span className="text-xs font-mono tabular-nums text-[#536159]">
              Synced {lastSyncedAt}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchLiveQueue()}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold flex items-center gap-2 hover:bg-[#E4E2DC] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Ticket Code Search Bar & My Recent Reservations Quick Select */}
      <section className="rounded-2xl bg-white border border-[#E4E2DC] p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <form
            onSubmit={handleLookupSubmit}
            className="lg:col-span-7 flex flex-col sm:flex-row gap-2.5"
          >
            <div className="flex-1">
              <label
                htmlFor="ticket-lookup-input"
                className="block text-xs font-semibold text-[#16211B] mb-1.5"
              >
                Track by Pickup Ticket Code or Reservation ID
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#536159] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="ticket-lookup-input"
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="Enter PK-104, PK-105, or FV_8512..."
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm font-mono text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={lookupLoading}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-semibold hover:bg-[#143326] self-end cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {lookupLoading ? 'Checking...' : 'Track Ticket'}
            </button>
          </form>

          {myOrders.length > 0 && (
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold text-[#16211B] mb-1.5">
                Your Recent Reservations
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {myOrders.slice(0, 4).map((ord) => {
                  const code = ord.ticketCode || ord.id;
                  const active =
                    focusedTicket?.id === ord.id ||
                    focusedTicket?.ticketCode === code;
                  return (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => {
                        setSearchCode(code);
                        const liveMatch = liveTickets.find(
                          (t) => t.id === ord.id || t.ticketCode === code,
                        );
                        if (liveMatch) {
                          setFocusedTicket(liveMatch);
                        } else {
                          setFocusedTicket({
                            id: ord.id,
                            ticketCode: code,
                            status: ord.status,
                            pickupShopId: ord.pickupShopId || 'shop-lucao',
                            pickupShopName:
                              ord.pickupShopName || 'Lucao Garden Atelier',
                            pickupBranchAddress:
                              ord.pickupBranchAddress || ord.streetLandmark,
                            pickupDate:
                              ord.pickupDate || ord.createdAt.slice(0, 10),
                            pickupSlot: ord.pickupSlot || ord.deliverySlot,
                            summaryText: ord.summaryText,
                            assignedStaffId: ord.assignedStaffId,
                            assignedStaffName: ord.assignedStaffName,
                            customerInitials: ord.recipientName.slice(0, 2).toUpperCase(),
                            totalAmount: ord.totalAmount,
                            createdAt: ord.createdAt,
                            updatedAt: ord.updatedAt,
                          });
                        }
                      }}
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl font-mono text-xs font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1B4332] text-white border-[#1B4332]'
                          : 'bg-[#FAF9F7] text-[#16211B] border-[#E4E2DC] hover:border-[#1B4332]'
                      }`}
                    >
                      #{code}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {lookupError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-[#FDF2F4] border border-[#F3C6D0] text-xs font-medium text-[#8E1F3A]"
          >
            {lookupError}
          </div>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[#FDF2F4] border border-[#F3C6D0] text-xs font-medium text-[#8E1F3A]"
        >
          {error}
        </div>
      )}

      {/* Spotlight Live Ticket Progress Card */}
      {focusedTicket && (
        <section
          aria-label="Selected Pickup Ticket Progress"
          className="rounded-2xl bg-white border border-[#E4E2DC] p-5 sm:p-7 space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-[#F1F0EC]">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono font-bold text-[#16211B]">
                  Ticket #{focusedTicket.ticketCode}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[#536159]">
                  Ref {focusedTicket.id}
                </span>
                <span aria-hidden="true">·</span>
                <span
                  className={`font-semibold ${getStatusAccentClass(focusedTicket.status)}`}
                >
                  {formatTicketStatusLabel(focusedTicket.status)}
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#16211B]">
                {focusedTicket.summaryText}
              </h2>
              <p className="text-xs text-[#536159]">
                Pickup Date: <span className="font-mono font-medium text-[#16211B]">{focusedTicket.pickupDate}</span>
                {' · '}
                Window: <span className="font-medium text-[#16211B]">{focusedTicket.pickupSlot}</span>
              </p>
            </div>

            <div className="text-left md:text-right shrink-0">
              <p className="text-xs text-[#536159]">Reservation Total (₱0 Pickup Fee)</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-[#16211B]">
                ₱{Number(focusedTicket.totalAmount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* 3-Step Live Pickup Progress Bar */}
          {focusedTicket.status === 'cancelled' ? (
            <div className="rounded-xl p-4 bg-[#FDF2F4] border border-[#F3C6D0] text-xs text-[#8E1F3A]">
              This pickup reservation has been cancelled and removed from the active Dagupan counter queue.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  step: 1,
                  title: '1. Crafting Bouquet',
                  desc: 'Assigned Dagupan florist is conditioning & hand-tying stems.',
                  icon: <Sparkles className="w-4 h-4" />,
                },
                {
                  step: 2,
                  title: '2. Ready at Counter',
                  desc: 'Chilled & held at your chosen atelier pickup counter.',
                  icon: <Store className="w-4 h-4" />,
                },
                {
                  step: 3,
                  title: '3. Picked Up',
                  desc: 'Bouquet claimed in person at the Dagupan branch.',
                  icon: <CheckCircle2 className="w-4 h-4" />,
                },
              ].map((s) => {
                const reached = activeStage >= s.step;
                const current = activeStage === s.step;
                return (
                  <div
                    key={s.step}
                    className={`rounded-xl p-4 border transition-colors ${
                      current
                        ? 'bg-[#FAF9F7] border-[#1B4332]'
                        : reached
                          ? 'bg-white border-[#D5D2CA]'
                          : 'bg-[#FAF9F7]/50 border-[#E4E2DC] opacity-65'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-semibold flex items-center gap-1.5 ${
                          reached ? 'text-[#1B4332]' : 'text-[#536159]'
                        }`}
                      >
                        {s.icon}
                        <span>{s.title}</span>
                      </span>
                      <span className="font-mono text-[11px] text-[#536159]">
                        {current ? 'Current' : reached ? 'Done' : 'Pending'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#536159] leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pickup Branch & Assigned Dagupan Florist Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#F1F0EC] text-xs">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#B8294B] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-[#16211B]">
                  {focusedTicket.pickupShopName}
                </p>
                <p className="text-[#536159]">
                  {focusedTicket.pickupBranchAddress}
                </p>
                {focusedShop && (
                  <p className="text-[#536159]">
                    {focusedShop.counterDesk} · {focusedShop.pickupHours}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <UserCheck className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-[#16211B]">
                  Assigned Dagupan Florist:{' '}
                  {focusedTicket.assignedStaffName || 'Assigning at Branch'}
                </p>
                <p className="text-[#536159]">
                  Present ticket code <span className="font-mono font-semibold text-[#16211B]">#{focusedTicket.ticketCode}</span> at the counter to claim.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Live Counter Queue Board Across Dagupan Ateliers */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#16211B]">
              Dagupan Live Counter Queue
            </h2>
            <p className="text-xs text-[#536159] mt-0.5">
              Real-time counter board synced with our Dagupan florist staff stations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setBranchFilter('all')}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                branchFilter === 'all'
                  ? 'bg-[#1B4332] text-white'
                  : 'bg-white border border-[#E4E2DC] text-[#536159] hover:text-[#16211B]'
              }`}
            >
              All Branches
            </button>
            {shops.map((shop) => (
              <button
                key={shop.id}
                type="button"
                onClick={() => setBranchFilter(shop.id)}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                  branchFilter === shop.id
                    ? 'bg-[#1B4332] text-white'
                    : 'bg-white border border-[#E4E2DC] text-[#536159] hover:text-[#16211B]'
                }`}
              >
                {shop.barangay}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Ready for Counter Pickup */}
          <div className="rounded-2xl bg-white border border-[#E4E2DC] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F0EC]">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#1B4332]" />
                <h3 className="font-serif text-xl font-bold text-[#16211B]">
                  Ready at Counter ({readyTickets.length})
                </h3>
              </div>
              <span className="text-xs text-[#1B4332] font-semibold">
                Claim Now
              </span>
            </div>

            {readyTickets.length === 0 ? (
              <p className="text-xs text-[#536159] py-4">
                No tickets currently waiting at the counter for this branch.
              </p>
            ) : (
              <div className="divide-y divide-[#F1F0EC]">
                {readyTickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setFocusedTicket(t);
                      setSearchCode(t.ticketCode);
                    }}
                    className="w-full py-3 text-left flex items-start justify-between gap-3 hover:bg-[#FAF9F7] px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#1B4332]">
                          #{t.ticketCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[#16211B]">
                          {t.customerInitials}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#536159] truncate">
                          {t.pickupShopName}
                        </span>
                      </div>
                      <p className="text-xs text-[#16211B] font-medium truncate">
                        {t.summaryText}
                      </p>
                      <p className="text-[11px] text-[#536159]">
                        {t.pickupSlot}
                        {t.assignedStaffName ? ` · Florist: ${t.assignedStaffName}` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#1B4332] shrink-0">
                      Inspect
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Crafting at Florist Bench */}
          <div className="rounded-2xl bg-white border border-[#E4E2DC] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F0EC]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#B8294B]" />
                <h3 className="font-serif text-xl font-bold text-[#16211B]">
                  Crafting at Bench ({craftingTickets.length})
                </h3>
              </div>
              <span className="text-xs text-[#B8294B] font-semibold">
                In Preparation
              </span>
            </div>

            {craftingTickets.length === 0 ? (
              <p className="text-xs text-[#536159] py-4">
                All queued bouquets for this branch have finished crafting.
              </p>
            ) : (
              <div className="divide-y divide-[#F1F0EC]">
                {craftingTickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setFocusedTicket(t);
                      setSearchCode(t.ticketCode);
                    }}
                    className="w-full py-3 text-left flex items-start justify-between gap-3 hover:bg-[#FAF9F7] px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#B8294B]">
                          #{t.ticketCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[#16211B]">
                          {t.customerInitials}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#536159] truncate">
                          {t.pickupShopName}
                        </span>
                      </div>
                      <p className="text-xs text-[#16211B] font-medium truncate">
                        {t.summaryText}
                      </p>
                      <p className="text-[11px] text-[#536159]">
                        {t.pickupSlot}
                        {t.assignedStaffName ? ` · Florist: ${t.assignedStaffName}` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#536159] shrink-0">
                      Inspect
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recently Claimed History Strip */}
        {completedTickets.length > 0 && (
          <div className="rounded-2xl bg-[#F1F0EC]/70 border border-[#E4E2DC] p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#16211B]">
              <Ticket className="w-4 h-4 text-[#1B4332]" />
              <span>Recently Picked Up at Dagupan Counters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {completedTickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setFocusedTicket(t);
                    setSearchCode(t.ticketCode);
                  }}
                  className="text-left p-3 rounded-xl bg-white border border-[#E4E2DC] hover:border-[#1B4332] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[#16211B]">
                      #{t.ticketCode}
                    </span>
                    <span className="text-[#536159]">Picked Up</span>
                  </div>
                  <p className="mt-1 text-[#16211B] font-medium truncate">
                    {t.summaryText}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#536159] truncate">
                    {t.pickupShopName}
                    {t.assignedStaffName ? ` · ${t.assignedStaffName}` : ''}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
