import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CheckCircle2,
  Clock,
  Edit3,
  LogOut,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Ticket,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  CATALOG_BOUQUETS,
  DAGUPAN_SHOPS,
  ImageKey,
  resolveCatalogImage,
} from '../data/dagupanCatalog';
import {
  AdminOverviewPayload,
  BouquetConfig,
  CatalogBouquet,
  DagupanOrder,
  DagupanStaffMember,
  FloristShop,
  ScreenId,
  StaffShiftStatus,
  UserAccount,
} from '../types/floraview';
import { ResilientImage } from '../components/ResilientImage';

interface AdminScreenProps {
  user: UserAccount;
  overview: AdminOverviewPayload | null;
  catalog?: CatalogBouquet[];
  shops?: FloristShop[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onUpdateOrderStatus: (
    orderId: string,
    status: DagupanOrder['status'],
  ) => Promise<void>;
  onAssignOrderStaff: (orderId: string, staffId: string) => Promise<void>;
  onDeleteOrder?: (orderId: string) => Promise<void>;
  onUpdateStaff: (
    staffId: string,
    updates: {
      status?: StaffShiftStatus;
      shopId?: string;
      name?: string;
      role?: string;
      station?: string;
      shiftWindow?: string;
      phoneExt?: string;
    },
  ) => Promise<void>;
  onAddStaff: (payload: {
    name: string;
    role: string;
    shopId: string;
    shiftWindow: string;
    station: string;
    phoneExt: string;
  }) => Promise<void>;
  onDeleteStaff?: (staffId: string) => Promise<void>;
  onUpdateShop?: (
    shopId: string,
    updates: {
      pickupPrepMin?: number;
      pickupHours?: string;
      counterDesk?: string;
      specialty?: string;
      isOpen?: boolean;
    },
  ) => Promise<void>;
  onAddCatalogItem?: (payload: {
    name: string;
    shopId: string;
    category: CatalogBouquet['category'];
    occasion: CatalogBouquet['occasion'];
    price: number;
    stemCount: number;
    vaseLifeDays: number;
    imageKey: ImageKey;
    description: string;
  }) => Promise<void>;
  onUpdateCatalogItem?: (
    bouquetId: string,
    updates: {
      name?: string;
      price?: number;
      inStock?: boolean;
    },
  ) => Promise<void>;
  onDeleteCatalogItem?: (bouquetId: string) => Promise<void>;
  onNavigate: (screen: ScreenId) => void;
  onOpenBouquetInStudio: (config: BouquetConfig) => void;
  onSignOut: () => Promise<void>;
}

type AdminSection = 'tickets' | 'staff' | 'catalog' | 'customers';
type TicketStatusFilter =
  | 'all'
  | 'preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'cancelled';

const STAFF_STATUS_OPTIONS: Array<{
  id: StaffShiftStatus;
  label: string;
}> = [
  { id: 'on_duty', label: 'On Duty' },
  { id: 'crafting', label: 'Crafting' },
  { id: 'break', label: 'Break' },
  { id: 'off_duty', label: 'Off Duty' },
];

export const AdminScreen: React.FC<AdminScreenProps> = ({
  user,
  overview,
  catalog = CATALOG_BOUQUETS,
  shops = DAGUPAN_SHOPS,
  loading,
  error,
  onRefresh,
  onUpdateOrderStatus,
  onAssignOrderStaff,
  onDeleteOrder,
  onUpdateStaff,
  onAddStaff,
  onDeleteStaff,
  onUpdateShop,
  onAddCatalogItem,
  onUpdateCatalogItem,
  onDeleteCatalogItem,
  onNavigate,
  onOpenBouquetInStudio,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<AdminSection>('tickets');
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [ticketQuery, setTicketQuery] = useState<string>('');
  const [staffBranchFilter, setStaffBranchFilter] = useState<string>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updatingStaffId, setUpdatingStaffId] = useState<string | null>(null);
  const [updatingShopId, setUpdatingShopId] = useState<string | null>(null);
  const [updatingBouquetId, setUpdatingBouquetId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState<boolean>(true);

  // Add Staff inline form state
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Floral Artisan');
  const [newStaffShopId, setNewStaffShopId] = useState(
    shops[0]?.id || DAGUPAN_SHOPS[0].id,
  );
  const [newStaffShift, setNewStaffShift] = useState('8:00 AM – 5:00 PM');
  const [newStaffStation, setNewStaffStation] = useState('Counter Bench 1');
  const [newStaffExt, setNewStaffExt] = useState('Local 105');
  const [addingStaff, setAddingStaff] = useState(false);

  // Edit Staff inline state
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffRole, setEditStaffRole] = useState('');
  const [editStaffStation, setEditStaffStation] = useState('');
  const [editStaffShift, setEditStaffShift] = useState('');
  const [editStaffExt, setEditStaffExt] = useState('');

  // Edit Branch inline state
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editShopPrepMin, setEditShopPrepMin] = useState('35');
  const [editShopHours, setEditShopHours] = useState('');
  const [editShopDesk, setEditShopDesk] = useState('');
  const [editShopSpecialty, setEditShopSpecialty] = useState('');

  // Add Bouquet inline form state
  const [showAddBouquet, setShowAddBouquet] = useState(false);
  const [newBqName, setNewBqName] = useState('');
  const [newBqShopId, setNewBqShopId] = useState(
    shops[0]?.id || DAGUPAN_SHOPS[0].id,
  );
  const [newBqCategory, setNewBqCategory] =
    useState<CatalogBouquet['category']>('signature');
  const [newBqOccasion, setNewBqOccasion] =
    useState<CatalogBouquet['occasion']>('romance');
  const [newBqPrice, setNewBqPrice] = useState('1850');
  const [newBqStems, setNewBqStems] = useState('15');
  const [newBqVaseDays, setNewBqVaseDays] = useState('9');
  const [newBqImageKey, setNewBqImageKey] = useState<ImageKey>('sampaguitaRose');
  const [newBqDesc, setNewBqDesc] = useState('');
  const [addingBouquet, setAddingBouquet] = useState(false);

  // Inline bouquet price edits
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  // Customer search
  const [customerQuery, setCustomerQuery] = useState('');

  const isAdmin = user.role === 'admin';

  const activeShops = useMemo(() => {
    const raw =
      overview?.shops && overview.shops.length > 0 ? overview.shops : shops;
    return raw.map((s) => ({
      ...s,
      image: resolveCatalogImage(s.imageKey, s.image),
    }));
  }, [overview?.shops, shops]);

  const activeCatalog = useMemo(() => {
    const raw =
      overview?.catalog && overview.catalog.length > 0
        ? overview.catalog
        : catalog;
    return raw.map((b) => ({
      ...b,
      image: resolveCatalogImage(b.imageKey, b.image),
    }));
  }, [overview?.catalog, catalog]);

  // Live polling for Admin Live Ticket Tracker & Staff Board
  useEffect(() => {
    if (!isAdmin || !autoSync) return;
    const timer = window.setInterval(() => {
      onRefresh().catch(() => {});
    }, 10000);
    return () => window.clearInterval(timer);
  }, [isAdmin, autoSync, onRefresh]);

  const filteredOrders = useMemo(() => {
    const list = overview?.orders || [];
    const q = ticketQuery.trim().toLowerCase();
    return list.filter((ord) => {
      const normalizedStatus =
        ord.status === 'delivered'
          ? 'picked_up'
          : ord.status === 'out_for_delivery'
            ? 'ready_for_pickup'
            : ord.status;
      const matchStatus =
        statusFilter === 'all' || normalizedStatus === statusFilter;
      const matchBranch =
        branchFilter === 'all' ||
        (ord.pickupShopId || 'shop-lucao') === branchFilter;
      const matchQuery =
        !q ||
        (ord.ticketCode || '').toLowerCase().includes(q) ||
        ord.id.toLowerCase().includes(q) ||
        ord.recipientName.toLowerCase().includes(q) ||
        ord.summaryText.toLowerCase().includes(q);
      return matchStatus && matchBranch && matchQuery;
    });
  }, [overview?.orders, statusFilter, branchFilter, ticketQuery]);

  const staffList = overview?.staff || [];
  const filteredStaff = useMemo(() => {
    if (staffBranchFilter === 'all') return staffList;
    return staffList.filter((s) => s.shopId === staffBranchFilter);
  }, [staffList, staffBranchFilter]);

  const filteredCustomers = useMemo(() => {
    const list = overview?.customers || [];
    const q = customerQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.barangay.toLowerCase().includes(q),
    );
  }, [overview?.customers, customerQuery]);

  const handleStatusChange = async (
    orderId: string,
    nextStatus: DagupanOrder['status'],
  ) => {
    setActionError(null);
    setUpdatingOrderId(orderId);
    try {
      await onUpdateOrderStatus(orderId, nextStatus);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Unable to update pickup ticket status.',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleAssignStaff = async (orderId: string, staffId: string) => {
    setActionError(null);
    setUpdatingOrderId(orderId);
    try {
      await onAssignOrderStaff(orderId, staffId);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Unable to assign Dagupan florist to ticket.',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleRemoveOrder = async (orderId: string) => {
    if (!onDeleteOrder) return;
    setActionError(null);
    setUpdatingOrderId(orderId);
    try {
      await onDeleteOrder(orderId);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to delete ticket record.',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleStaffUpdate = async (
    staffId: string,
    updates: {
      status?: StaffShiftStatus;
      shopId?: string;
      role?: string;
      station?: string;
      shiftWindow?: string;
      phoneExt?: string;
    },
  ) => {
    setActionError(null);
    setUpdatingStaffId(staffId);
    try {
      await onUpdateStaff(staffId, updates);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to update staff board.',
      );
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const startEditStaff = (member: DagupanStaffMember) => {
    setEditingStaffId(member.id);
    setEditStaffRole(member.role);
    setEditStaffStation(member.station);
    setEditStaffShift(member.shiftWindow);
    setEditStaffExt(member.phoneExt);
  };

  const handleSaveStaffEdit = async (e: React.FormEvent, staffId: string) => {
    e.preventDefault();
    await handleStaffUpdate(staffId, {
      role: editStaffRole.trim(),
      station: editStaffStation.trim(),
      shiftWindow: editStaffShift.trim(),
      phoneExt: editStaffExt.trim(),
    });
    setEditingStaffId(null);
  };

  const handleRemoveStaff = async (staffId: string) => {
    if (!onDeleteStaff) return;
    setActionError(null);
    setUpdatingStaffId(staffId);
    try {
      await onDeleteStaff(staffId);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to remove staff member.',
      );
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffRole.trim()) return;
    setActionError(null);
    setAddingStaff(true);
    try {
      await onAddStaff({
        name: newStaffName.trim(),
        role: newStaffRole.trim(),
        shopId: newStaffShopId,
        shiftWindow: newStaffShift.trim() || '8:00 AM – 5:00 PM',
        station: newStaffStation.trim() || 'Counter Bench 1',
        phoneExt: newStaffExt.trim() || 'Local 105',
      });
      setNewStaffName('');
      setShowAddStaff(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to add staff member.',
      );
    } finally {
      setAddingStaff(false);
    }
  };

  const startEditShop = (shop: FloristShop) => {
    setEditingShopId(shop.id);
    setEditShopPrepMin(String(shop.pickupPrepMin));
    setEditShopHours(shop.pickupHours);
    setEditShopDesk(shop.counterDesk);
    setEditShopSpecialty(shop.specialty);
  };

  const handleSaveShopEdit = async (e: React.FormEvent, shopId: string) => {
    e.preventDefault();
    if (!onUpdateShop) return;
    setActionError(null);
    setUpdatingShopId(shopId);
    try {
      await onUpdateShop(shopId, {
        pickupPrepMin: Math.max(5, Math.min(180, parseInt(editShopPrepMin, 10) || 35)),
        pickupHours: editShopHours.trim(),
        counterDesk: editShopDesk.trim(),
        specialty: editShopSpecialty.trim(),
      });
      setEditingShopId(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to update Dagupan branch.',
      );
    } finally {
      setUpdatingShopId(null);
    }
  };

  const handleToggleShopOpen = async (shop: FloristShop) => {
    if (!onUpdateShop) return;
    setActionError(null);
    setUpdatingShopId(shop.id);
    try {
      await onUpdateShop(shop.id, { isOpen: shop.isOpen === false });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to toggle branch status.',
      );
    } finally {
      setUpdatingShopId(null);
    }
  };

  const handleCreateBouquet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddCatalogItem || !newBqName.trim()) return;
    setActionError(null);
    setAddingBouquet(true);
    try {
      await onAddCatalogItem({
        name: newBqName.trim(),
        shopId: newBqShopId,
        category: newBqCategory,
        occasion: newBqOccasion,
        price: Math.max(100, parseInt(newBqPrice, 10) || 1500),
        stemCount: Math.max(5, Math.min(36, parseInt(newBqStems, 10) || 15)),
        vaseLifeDays: Math.max(3, Math.min(60, parseInt(newBqVaseDays, 10) || 9)),
        imageKey: newBqImageKey,
        description:
          newBqDesc.trim() ||
          'Hand-tied fresh floral arrangement crafted for counter pickup in Dagupan City.',
      });
      setNewBqName('');
      setNewBqDesc('');
      setShowAddBouquet(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to add catalog bouquet.',
      );
    } finally {
      setAddingBouquet(false);
    }
  };

  const handleSaveBouquetPrice = async (bq: CatalogBouquet) => {
    if (!onUpdateCatalogItem) return;
    const raw = priceDrafts[bq.id];
    const nextPrice = parseInt(raw, 10);
    if (!Number.isFinite(nextPrice) || nextPrice < 100) return;
    setActionError(null);
    setUpdatingBouquetId(bq.id);
    try {
      await onUpdateCatalogItem(bq.id, { price: nextPrice });
      setPriceDrafts((prev) => {
        const copy = { ...prev };
        delete copy[bq.id];
        return copy;
      });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to update bouquet price.',
      );
    } finally {
      setUpdatingBouquetId(null);
    }
  };

  const handleToggleBouquetStock = async (bq: CatalogBouquet) => {
    if (!onUpdateCatalogItem) return;
    setActionError(null);
    setUpdatingBouquetId(bq.id);
    try {
      await onUpdateCatalogItem(bq.id, { inStock: bq.inStock === false });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to update stock status.',
      );
    } finally {
      setUpdatingBouquetId(null);
    }
  };

  const handleRemoveBouquet = async (bouquetId: string) => {
    if (!onDeleteCatalogItem) return;
    setActionError(null);
    setUpdatingBouquetId(bouquetId);
    try {
      await onDeleteCatalogItem(bouquetId);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to remove catalog bouquet.',
      );
    } finally {
      setUpdatingBouquetId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <section className="rounded-2xl bg-white border border-[#E4E2DC] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#B8294B]">
            <ShieldCheck className="w-4 h-4" />
            <span>Administrator Authorization Required</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#16211B]">
            Dagupan Atelier Admin Desk
          </h1>
          <p className="text-sm text-[#536159]">
            Sign in with your administrator credentials on the Log In page to manage the Live Pickup Ticket Tracker and Dagupan Staff Board.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1B4332] text-white text-sm font-semibold cursor-pointer"
            >
              Go to Log In Page
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F1F0EC] text-[#16211B] text-sm font-semibold cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 pb-12 space-y-6 sm:space-y-8">
      {/* Top Atelier Operations Header */}
      <section className="rounded-2xl bg-white border border-[#E4E2DC] p-4 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#16211B] text-[#E8D5B5] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-[#536159]">
              <span className="font-semibold text-[#1B4332]">
                Atelier Operations
              </span>
              <span aria-hidden="true">·</span>
              <span>Pickup-Only Counter &amp; Staff Desk</span>
            </div>
            <h1 className="font-serif text-xl sm:text-3xl font-bold text-[#16211B] mt-0.5 truncate">
              {user.displayName}
            </h1>
            <p className="text-xs font-mono text-[#536159] truncate">
              Signed in as {user.email} · {user.barangay}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setAutoSync((prev) => !prev)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer whitespace-nowrap ${
              autoSync
                ? 'border-[#1B4332] bg-[#FAF9F7] text-[#1B4332]'
                : 'border-[#E4E2DC] bg-white text-[#536159]'
            }`}
          >
            {autoSync ? 'Live Sync: On (10s)' : 'Live Sync: Paused'}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => onRefresh()}
            className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#E7E5DF] cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${loading ? 'animate-spin' : ''}`}
            />
            <span>{loading ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#143326] cursor-pointer whitespace-nowrap"
          >
            <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Storefront</span>
          </button>

          <button
            type="button"
            onClick={() => onSignOut()}
            className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border border-[#D5D2CA] text-[#16211B] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#F1F0EC] cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </section>

      {(error || actionError) && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[#FDF2F4] border border-[#F3C6D0] text-xs font-medium text-[#8E1F3A]"
        >
          {actionError || error}
        </div>
      )}

      {/* 4-Column Typographic KPI Ledger */}
      <section
        aria-label="Dagupan Atelier Key Metrics"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <div className="rounded-2xl bg-white border border-[#E4E2DC] p-4 sm:p-5">
          <p className="text-xs font-medium text-[#536159]">Dagupan Revenue</p>
          <p className="mt-1.5 sm:mt-2 font-serif text-2xl sm:text-3xl font-bold text-[#16211B] tabular-nums">
            ₱{(overview?.totalRevenue ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[#536159]">
            Across {(overview?.orders || []).filter((o) => o.status !== 'cancelled').length} active tickets
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E4E2DC] p-4 sm:p-5">
          <p className="text-xs font-medium text-[#536159]">Active Ticket Queue</p>
          <p className="mt-1.5 sm:mt-2 font-serif text-2xl sm:text-3xl font-bold text-[#B8294B] tabular-nums">
            {overview?.activeOrdersCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-[#536159]">
            {overview?.readyForPickupCount ?? 0} ready at counter now
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E4E2DC] p-4 sm:p-5">
          <p className="text-xs font-medium text-[#536159]">Claimed Pickups</p>
          <p className="mt-1.5 sm:mt-2 font-serif text-2xl sm:text-3xl font-bold text-[#1B4332] tabular-nums">
            {overview?.deliveredOrdersCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-[#536159]">
            Zero-fee counter handoffs
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E4E2DC] p-4 sm:p-5">
          <p className="text-xs font-medium text-[#536159]">Dagupan Staff Active</p>
          <p className="mt-1.5 sm:mt-2 font-serif text-2xl sm:text-3xl font-bold text-[#16211B] tabular-nums">
            {overview?.staffOnDutyCount ?? 0}
            <span className="text-base font-normal text-[#536159]">
              /{staffList.length}
            </span>
          </p>
          <p className="mt-1 text-xs text-[#536159]">
            Across {activeShops.length} Dagupan ateliers
          </p>
        </div>
      </section>

      {/* Editorial Underline Navigation Tabs */}
      <div className="border-b border-[#E4E2DC] flex items-center gap-4 sm:gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`min-h-[44px] pb-2 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === 'tickets'
              ? 'border-[#1B4332] text-[#16211B]'
              : 'border-transparent text-[#536159] hover:text-[#16211B]'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Live Ticket Tracker ({overview?.orders.length ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`min-h-[44px] pb-2 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === 'staff'
              ? 'border-[#1B4332] text-[#16211B]'
              : 'border-transparent text-[#536159] hover:text-[#16211B]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Dagupan Staff Board ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`min-h-[44px] pb-2 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'catalog'
              ? 'border-[#1B4332] text-[#16211B]'
              : 'border-transparent text-[#536159] hover:text-[#16211B]'
          }`}
        >
          Ateliers &amp; Catalog ({activeCatalog.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`min-h-[44px] pb-2 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'customers'
              ? 'border-[#1B4332] text-[#16211B]'
              : 'border-transparent text-[#536159] hover:text-[#16211B]'
          }`}
        >
          Customers ({overview?.customers.length ?? 0})
        </button>
      </div>

      {/* TAB 1: LIVE PICKUP TICKET TRACKER */}
      {activeTab === 'tickets' && (
        <section className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#16211B]">
                Live Pickup Ticket Tracker
              </h2>
              <p className="text-xs text-[#536159]">
                Search tickets, assign Dagupan florists from the Staff Board, advance stage statuses, or clean up cancelled tickets.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#536159] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Search pickup tickets"
                  value={ticketQuery}
                  onChange={(e) => setTicketQuery(e.target.value)}
                  placeholder="Search ticket, name..."
                  className="min-h-[44px] pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E4E2DC] text-xs text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <select
                aria-label="Filter tickets by Dagupan branch"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#E4E2DC] text-xs font-semibold text-[#16211B] focus:outline-none focus:border-[#1B4332]"
              >
                <option value="all">All Dagupan Branches</option>
                {activeShops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>

              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'preparing', label: 'Crafting' },
                  { id: 'ready_for_pickup', label: 'Ready' },
                  { id: 'picked_up', label: 'Picked Up' },
                  { id: 'cancelled', label: 'Cancelled' },
                ] as const
              ).map((flt) => (
                <button
                  key={flt.id}
                  type="button"
                  onClick={() => setStatusFilter(flt.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === flt.id
                      ? 'bg-[#1B4332] text-white'
                      : 'bg-white border border-[#E4E2DC] text-[#536159] hover:text-[#16211B]'
                  }`}
                >
                  {flt.label}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#E4E2DC] p-8 text-center text-sm text-[#536159]">
              No Dagupan pickup tickets match this filter yet.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((ord) => {
                const isUpdating = updatingOrderId === ord.id;
                const ticketCode = ord.ticketCode || ord.id;
                const isCancelled = ord.status === 'cancelled';
                const isPickedUp =
                  ord.status === 'picked_up' || ord.status === 'delivered';
                const isReady =
                  ord.status === 'ready_for_pickup' ||
                  ord.status === 'out_for_delivery';

                const statusLabel = isCancelled
                  ? 'Cancelled'
                  : isPickedUp
                    ? 'Picked Up'
                    : isReady
                      ? 'Ready for Pickup'
                      : 'Crafting Bouquet';
                const statusColor = isCancelled
                  ? 'text-[#8E1F3A]'
                  : isReady
                    ? 'text-[#1B4332]'
                    : isPickedUp
                      ? 'text-[#536159]'
                      : 'text-[#B8294B]';

                return (
                  <article
                    key={`${ord.ownerUid}-${ord.id}`}
                    className="rounded-2xl bg-white border border-[#E4E2DC] p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-[#16211B]">
                            #{ticketCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-[#536159]">
                            {ord.id}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-semibold ${statusColor}`}>
                            {statusLabel}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#536159]">
                            {ord.pickupDate || ord.createdAt.slice(0, 10)} ·{' '}
                            {ord.pickupSlot || ord.deliverySlot}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#536159]">
                            {ord.paymentMethod}
                          </span>
                        </div>
                        <h3 className="font-serif text-lg font-bold text-[#16211B]">
                          {ord.summaryText}
                        </h3>
                      </div>

                      <div className="text-right">
                        <p className="font-mono text-lg font-bold text-[#16211B] tabular-nums">
                          ₱{Number(ord.totalAmount || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-[#536159]">
                          Claimant: {ord.recipientName} ({ord.recipientPhone})
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 border-t border-[#F1F0EC] text-xs text-[#536159] items-center">
                      <div className="lg:col-span-5 flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#B8294B] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[#16211B]">
                            {ord.pickupShopName || 'Lucao Garden Atelier'} · Brgy.{' '}
                            {ord.barangay}
                          </p>
                          <p>
                            {ord.pickupBranchAddress || ord.streetLandmark}
                          </p>
                          {ord.pickupNotes && (
                            <p className="mt-0.5 italic text-[#1B4332]">
                              Note: {ord.pickupNotes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Inline Staff Assignment */}
                      <div className="lg:col-span-3">
                        <label
                          htmlFor={`assign-${ord.id}`}
                          className="block text-[11px] font-semibold text-[#536159] mb-1"
                        >
                          Assigned Dagupan Florist
                        </label>
                        <select
                          id={`assign-${ord.id}`}
                          disabled={isUpdating || isCancelled}
                          value={ord.assignedStaffId || ''}
                          onChange={(e) =>
                            handleAssignStaff(ord.id, e.target.value)
                          }
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs font-medium text-[#16211B] focus:outline-none focus:border-[#1B4332] disabled:opacity-60"
                        >
                          <option value="">Unassigned</option>
                          {staffList.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name} ({st.barangay})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Stage Progression Buttons */}
                      <div className="lg:col-span-4 flex flex-wrap items-center justify-start lg:justify-end gap-2">
                        {!isCancelled && !isReady && !isPickedUp && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              handleStatusChange(ord.id, 'ready_for_pickup')
                            }
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#143326] cursor-pointer disabled:opacity-60 whitespace-nowrap"
                          >
                            <Store className="w-4 h-4" />
                            <span>Mark Ready for Pickup</span>
                          </button>
                        )}

                        {!isCancelled && !isPickedUp && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              handleStatusChange(ord.id, 'picked_up')
                            }
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#E4E2DC] cursor-pointer disabled:opacity-60 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#1B4332]" />
                            <span>Mark Picked Up</span>
                          </button>
                        )}

                        {(isPickedUp || isCancelled) && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              handleStatusChange(ord.id, 'preparing')
                            }
                            className="min-h-[44px] px-4 py-2 rounded-xl border border-[#D5D2CA] text-[#536159] text-xs font-semibold hover:text-[#16211B] cursor-pointer disabled:opacity-60 whitespace-nowrap"
                          >
                            Reopen Ticket
                          </button>
                        )}

                        {onDeleteOrder && (
                          <button
                            type="button"
                            aria-label={`Delete ticket ${ticketCode}`}
                            disabled={isUpdating}
                            onClick={() => handleRemoveOrder(ord.id)}
                            className="min-w-[40px] min-h-[44px] px-2.5 rounded-xl border border-[#F3C6D0] text-[#8E1F3A] text-xs font-semibold flex items-center justify-center hover:bg-[#FDF2F4] cursor-pointer disabled:opacity-60"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: DAGUPAN STAFF BOARD */}
      {activeTab === 'staff' && (
        <section className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#16211B]">
                Dagupan Florist &amp; Counter Staff Board
              </h2>
              <p className="text-xs text-[#536159]">
                Edit shift stations, reassign branches, update duty status, or add/remove Dagupan staff members.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter staff by Dagupan branch"
                value={staffBranchFilter}
                onChange={(e) => setStaffBranchFilter(e.target.value)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#E4E2DC] text-xs font-semibold text-[#16211B] focus:outline-none focus:border-[#1B4332]"
              >
                <option value="all">All {activeShops.length} Dagupan Branches</option>
                {activeShops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowAddStaff((prev) => !prev)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#143326] cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>{showAddStaff ? 'Close Form' : 'Add Dagupan Staff'}</span>
              </button>
            </div>
          </div>

          {/* Shift Status Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STAFF_STATUS_OPTIONS.map((opt) => {
              const count = filteredStaff.filter(
                (s) => s.status === opt.id,
              ).length;
              return (
                <div
                  key={opt.id}
                  className="rounded-xl bg-white border border-[#E4E2DC] px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-xs font-medium text-[#536159]">
                    {opt.label}
                  </span>
                  <span className="font-mono tabular-nums text-lg font-bold text-[#16211B]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Inline Add Dagupan Staff Form */}
          {showAddStaff && (
            <form
              onSubmit={handleCreateStaff}
              className="rounded-2xl bg-white border border-[#1B4332] p-5 sm:p-6 space-y-4"
            >
              <h3 className="font-serif text-xl font-bold text-[#16211B]">
                Add Dagupan Florist or Counter Coordinator
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="new-staff-name"
                    className="block text-xs font-semibold text-[#16211B] mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="new-staff-name"
                    type="text"
                    required
                    placeholder="e.g., Camille Aquino"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-staff-role"
                    className="block text-xs font-semibold text-[#16211B] mb-1"
                  >
                    Role / Specialty
                  </label>
                  <input
                    id="new-staff-role"
                    type="text"
                    required
                    placeholder="e.g., Pickup Counter Coordinator"
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-staff-branch"
                    className="block text-xs font-semibold text-[#16211B] mb-1"
                  >
                    Dagupan Branch
                  </label>
                  <select
                    id="new-staff-branch"
                    value={newStaffShopId}
                    onChange={(e) => setNewStaffShopId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                  >
                    {activeShops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.barangay})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-staff-shift"
                    className="block text-xs font-semibold text-[#16211B] mb-1"
                  >
                    Shift Window
                  </label>
                  <input
                    id="new-staff-shift"
                    type="text"
                    value={newStaffShift}
                    onChange={(e) => setNewStaffShift(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-staff-station"
                    className="block text-xs font-semibold text-[#16211B] mb-1"
                  >
                    Station / Bench
                  </label>
                  <input
                    id="new-staff-station"
                    type="text"
                    value={newStaffStation}
                    onChange={(e) => setNewStaffStation(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-staff-ext"
                    className="block text-xs font-semibold text-[#16211B] mb-1"
                  >
                    Counter Ext
                  </label>
                  <input
                    id="new-staff-ext"
                    type="text"
                    value={newStaffExt}
                    onChange={(e) => setNewStaffExt(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-sm text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaff(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStaff}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  <span>{addingStaff ? 'Saving...' : 'Add to Staff Board'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Staff Cards Grid */}
          {filteredStaff.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#E4E2DC] p-8 text-center text-sm text-[#536159]">
              No Dagupan staff assigned to this branch yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStaff.map((member) => {
                const busy = updatingStaffId === member.id;
                const isEditing = editingStaffId === member.id;
                const statusTextColor =
                  member.status === 'crafting'
                    ? 'text-[#B8294B]'
                    : member.status === 'on_duty'
                      ? 'text-[#1B4332]'
                      : 'text-[#536159]';

                return (
                  <article
                    key={member.id}
                    className="rounded-2xl bg-white border border-[#E4E2DC] p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-[#16211B]">
                            {member.role}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-semibold ${statusTextColor}`}>
                            {
                              STAFF_STATUS_OPTIONS.find(
                                (o) => o.id === member.status,
                              )?.label
                            }
                          </span>
                        </div>
                        <h3 className="font-serif text-xl font-bold text-[#16211B]">
                          {member.name}
                        </h3>
                        <p className="text-xs text-[#536159]">
                          {member.station} · {member.shiftWindow} ·{' '}
                          <span className="font-mono">{member.phoneExt}</span>
                        </p>
                      </div>

                      <div className="flex items-start gap-2 shrink-0">
                        <div className="text-right">
                          <p className="font-mono tabular-nums text-sm font-bold text-[#16211B]">
                            {member.activeTicketCount ?? 0} Active
                          </p>
                          <p className="font-mono tabular-nums text-[11px] text-[#536159]">
                            {member.completedTicketCount ?? 0} Claimed
                          </p>
                        </div>

                        <button
                          type="button"
                          aria-label={`Edit ${member.name}`}
                          onClick={() =>
                            isEditing
                              ? setEditingStaffId(null)
                              : startEditStaff(member)
                          }
                          className="min-w-[36px] min-h-[36px] rounded-lg bg-[#F1F0EC] text-[#16211B] flex items-center justify-center cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {onDeleteStaff && (
                          <button
                            type="button"
                            aria-label={`Remove ${member.name}`}
                            disabled={busy}
                            onClick={() => handleRemoveStaff(member.id)}
                            className="min-w-[36px] min-h-[36px] rounded-lg border border-[#F3C6D0] text-[#8E1F3A] flex items-center justify-center hover:bg-[#FDF2F4] cursor-pointer disabled:opacity-60"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <form
                        onSubmit={(e) => handleSaveStaffEdit(e, member.id)}
                        className="p-3.5 rounded-xl bg-[#FAF9F7] border border-[#E4E2DC] space-y-2.5"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            aria-label="Edit role"
                            value={editStaffRole}
                            onChange={(e) => setEditStaffRole(e.target.value)}
                            placeholder="Role"
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-[#D5D2CA] text-xs"
                          />
                          <input
                            type="text"
                            aria-label="Edit station"
                            value={editStaffStation}
                            onChange={(e) => setEditStaffStation(e.target.value)}
                            placeholder="Bench / Station"
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-[#D5D2CA] text-xs"
                          />
                          <input
                            type="text"
                            aria-label="Edit shift window"
                            value={editStaffShift}
                            onChange={(e) => setEditStaffShift(e.target.value)}
                            placeholder="Shift Window"
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-[#D5D2CA] text-xs"
                          />
                          <input
                            type="text"
                            aria-label="Edit counter ext"
                            value={editStaffExt}
                            onChange={(e) => setEditStaffExt(e.target.value)}
                            placeholder="Counter Ext"
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-[#D5D2CA] text-xs"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingStaffId(null)}
                            className="min-h-[36px] px-3 rounded-lg bg-[#F1F0EC] text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={busy}
                            className="min-h-[36px] px-3.5 rounded-lg bg-[#1B4332] text-white text-xs font-semibold cursor-pointer"
                          >
                            Save Staff
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-[#F1F0EC] items-center">
                      <div className="sm:col-span-5">
                        <label
                          htmlFor={`staff-branch-${member.id}`}
                          className="sr-only"
                        >
                          Branch for {member.name}
                        </label>
                        <select
                          id={`staff-branch-${member.id}`}
                          disabled={busy}
                          value={member.shopId}
                          onChange={(e) =>
                            handleStaffUpdate(member.id, {
                              shopId: e.target.value,
                            })
                          }
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs font-medium text-[#16211B] focus:outline-none focus:border-[#1B4332]"
                        >
                          {activeShops.map((shop) => (
                            <option key={shop.id} value={shop.id}>
                              {shop.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-7 flex flex-wrap items-center justify-start sm:justify-end gap-1.5">
                        {STAFF_STATUS_OPTIONS.map((opt) => {
                          const active = member.status === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleStaffUpdate(member.id, { status: opt.id })
                              }
                              className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                                active
                                  ? 'bg-[#1B4332] text-white'
                                  : 'bg-[#F1F0EC] text-[#536159] hover:text-[#16211B]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: PARTNER FLORIST ATELIERS & CATALOG BOUQUETS */}
      {activeTab === 'catalog' && (
        <section className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#1B4332]" />
              <h2 className="font-serif text-2xl font-bold text-[#16211B]">
                Dagupan Pickup Ateliers ({activeShops.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeShops.map((shop) => {
                const shopBusy = updatingShopId === shop.id;
                const isEditing = editingShopId === shop.id;
                const shopOpen = shop.isOpen !== false;

                return (
                  <div
                    key={shop.id}
                    className="rounded-2xl bg-white border border-[#E4E2DC] p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-[#B8294B]">
                          Brgy. {shop.barangay} · {shop.pickupPrepMin} min counter prep
                          {!shopOpen ? ' · Closed' : ''}
                        </p>
                        <h3 className="font-serif text-lg font-bold text-[#16211B] mt-0.5">
                          {shop.name}
                        </h3>
                        <p className="text-xs text-[#536159] mt-1">{shop.street}</p>
                        <p className="text-xs font-mono text-[#536159] mt-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#1B4332]" />
                          <span>
                            {shop.counterDesk} · {shop.pickupHours}
                          </span>
                        </p>
                        <p className="text-xs text-[#16211B] mt-2 font-medium">
                          Specialty: {shop.specialty}
                        </p>
                      </div>

                      <div className="text-right font-mono text-xs font-bold text-[#16211B] shrink-0">
                        ★ {shop.rating.toFixed(1)}
                        <p className="font-normal text-[#536159]">
                          ({shop.reviewCount})
                        </p>
                      </div>
                    </div>

                    {isEditing && (
                      <form
                        onSubmit={(e) => handleSaveShopEdit(e, shop.id)}
                        className="p-3.5 rounded-xl bg-[#FAF9F7] border border-[#E4E2DC] space-y-2.5"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="number"
                            min={5}
                            max={180}
                            aria-label="Prep minutes"
                            value={editShopPrepMin}
                            onChange={(e) => setEditShopPrepMin(e.target.value)}
                            placeholder="Prep min"
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-[#D5D2CA] text-xs"
                          />
                          <input
                            type="text"
                            aria-label="Counter desk"
                            value={editShopDesk}
                            onChange={(e) => setEditShopDesk(e.target.value)}
                            placeholder="Counter desk"
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-[#D5D2CA] text-xs"
                          />
                          <input
                            type="text"
                            aria-label="Pickup hours"
                            value={editShopHours}
                            onChange={(e) => setEditShopHours(e.target.value)}
                            placeholder="Pickup hours"
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-[#D5D2CA] text-xs sm:col-span-2"
                          />
                          <input
                            type="text"
                            aria-label="Specialty"
                            value={editShopSpecialty}
                            onChange={(e) => setEditShopSpecialty(e.target.value)}
                            placeholder="Specialty"
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-[#D5D2CA] text-xs sm:col-span-2"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingShopId(null)}
                            className="min-h-[36px] px-3 rounded-lg bg-[#F1F0EC] text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={shopBusy}
                            className="min-h-[36px] px-3.5 rounded-lg bg-[#1B4332] text-white text-xs font-semibold cursor-pointer"
                          >
                            Save Branch
                          </button>
                        </div>
                      </form>
                    )}

                    {onUpdateShop && (
                      <div className="pt-3 border-t border-[#F1F0EC] flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={shopBusy}
                          onClick={() => handleToggleShopOpen(shop)}
                          className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold cursor-pointer ${
                            shopOpen
                              ? 'bg-[#1B4332] text-white'
                              : 'bg-[#FDF2F4] text-[#8E1F3A] border border-[#F3C6D0]'
                          }`}
                        >
                          {shopOpen ? 'Open for Pickup' : 'Closed (Reopen)'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            isEditing
                              ? setEditingShopId(null)
                              : startEditShop(shop)
                          }
                          className="min-h-[38px] px-3.5 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isEditing ? 'Close Edit' : 'Edit Branch'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Catalog Manager */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#B8294B]" />
                <h2 className="font-serif text-2xl font-bold text-[#16211B]">
                  Active Bouquet Catalog ({activeCatalog.length})
                </h2>
              </div>

              {onAddCatalogItem && (
                <button
                  type="button"
                  onClick={() => setShowAddBouquet((prev) => !prev)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#143326] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddBouquet ? 'Close Form' : 'Add Bouquet'}</span>
                </button>
              )}
            </div>

            {showAddBouquet && onAddCatalogItem && (
              <form
                onSubmit={handleCreateBouquet}
                className="rounded-2xl bg-white border border-[#1B4332] p-5 sm:p-6 space-y-4"
              >
                <h3 className="font-serif text-xl font-bold text-[#16211B]">
                  Add New Dagupan Pickup Bouquet
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label
                      htmlFor="new-bq-name"
                      className="block text-xs font-semibold text-[#16211B] mb-1"
                    >
                      Bouquet Name
                    </label>
                    <input
                      id="new-bq-name"
                      type="text"
                      required
                      placeholder="e.g., Bonuan Sunrise Bundle"
                      value={newBqName}
                      onChange={(e) => setNewBqName(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="new-bq-shop"
                      className="block text-xs font-semibold text-[#16211B] mb-1"
                    >
                      Atelier Branch
                    </label>
                    <select
                      id="new-bq-shop"
                      value={newBqShopId}
                      onChange={(e) => setNewBqShopId(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs"
                    >
                      {activeShops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="new-bq-price"
                      className="block text-xs font-semibold text-[#16211B] mb-1"
                    >
                      Price (₱)
                    </label>
                    <input
                      id="new-bq-price"
                      type="number"
                      min={100}
                      required
                      value={newBqPrice}
                      onChange={(e) => setNewBqPrice(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="new-bq-image"
                      className="block text-xs font-semibold text-[#16211B] mb-1"
                    >
                      Vertical Portrait Visual
                    </label>
                    <select
                      id="new-bq-image"
                      value={newBqImageKey}
                      onChange={(e) => setNewBqImageKey(e.target.value as ImageKey)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs"
                    >
                      <option value="sampaguitaRose">Sampaguita &amp; Blush Rose</option>
                      <option value="solarSunflower">Solar Sunflower</option>
                      <option value="stargazerOrchid">Stargazer &amp; Orchid</option>
                      <option value="heroAtelier">Atelier Rose Signature</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="new-bq-category"
                      className="block text-xs font-semibold text-[#16211B] mb-1"
                    >
                      Category
                    </label>
                    <select
                      id="new-bq-category"
                      value={newBqCategory}
                      onChange={(e) =>
                        setNewBqCategory(e.target.value as CatalogBouquet['category'])
                      }
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs"
                    >
                      <option value="signature">Signature Bouquet</option>
                      <option value="single_stems">Single Stems</option>
                      <option value="tropical_native">Tropical &amp; Native</option>
                      <option value="dried_preserved">Dried &amp; Preserved</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="new-bq-occasion"
                      className="block text-xs font-semibold text-[#16211B] mb-1"
                    >
                      Occasion
                    </label>
                    <select
                      id="new-bq-occasion"
                      value={newBqOccasion}
                      onChange={(e) =>
                        setNewBqOccasion(e.target.value as CatalogBouquet['occasion'])
                      }
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs"
                    >
                      <option value="romance">Romance &amp; Roses</option>
                      <option value="sampaguita">Sampaguita &amp; Heritage</option>
                      <option value="fiesta">Fiesta &amp; Sunburst</option>
                      <option value="sympathy">Orchids &amp; Sympathy</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="new-bq-stems"
                      className="block text-xs font-semibold text-[#16211B] mb-1"
                    >
                      Stem Count
                    </label>
                    <input
                      id="new-bq-stems"
                      type="number"
                      min={5}
                      max={36}
                      value={newBqStems}
                      onChange={(e) => setNewBqStems(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="new-bq-vase"
                      className="block text-xs font-semibold text-[#16211B] mb-1"
                    >
                      Vase Life (Days)
                    </label>
                    <input
                      id="new-bq-vase"
                      type="number"
                      min={3}
                      max={60}
                      value={newBqVaseDays}
                      onChange={(e) => setNewBqVaseDays(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="new-bq-desc"
                    className="block text-xs font-semibold text-[#16211B] mb-1"
                  >
                    Editorial Notes
                  </label>
                  <input
                    id="new-bq-desc"
                    type="text"
                    value={newBqDesc}
                    onChange={(e) => setNewBqDesc(e.target.value)}
                    placeholder="Vertical hand-tied stem composition and wrapping description..."
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#FAF9F7] border border-[#D5D2CA] text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBouquet(false)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#F1F0EC] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingBouquet}
                    className="min-h-[42px] px-5 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {addingBouquet ? 'Adding...' : 'Publish Bouquet'}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeCatalog.map((bq) => {
                const busy = updatingBouquetId === bq.id;
                const inStock = bq.inStock !== false;
                const draftPrice = priceDrafts[bq.id] ?? String(bq.price);
                const priceDirty =
                  priceDrafts[bq.id] !== undefined &&
                  parseInt(priceDrafts[bq.id], 10) !== bq.price;

                return (
                  <article
                    key={bq.id}
                    className="rounded-2xl bg-white border border-[#E4E2DC] overflow-hidden flex flex-col justify-between"
                  >
                    <div className="aspect-[3/4] w-full bg-[#F1F0EC] relative overflow-hidden">
                      <ResilientImage
                        src={bq.image}
                        alt={bq.name}
                        className={`w-full h-full object-cover object-center ${
                          !inStock ? 'opacity-65 grayscale-[30%]' : ''
                        }`}
                      />
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#536159]">
                          <span className="truncate">{bq.shopName}</span>
                          <span
                            className={`font-semibold shrink-0 ${
                              inStock ? 'text-[#1B4332]' : 'text-[#8E1F3A]'
                            }`}
                          >
                            {inStock ? 'In Stock' : 'Sold Out'}
                          </span>
                        </div>
                        <h3 className="font-serif text-lg font-bold text-[#16211B] mt-0.5 leading-snug">
                          {bq.name}
                        </h3>
                        <p className="mt-1 font-mono text-xs text-[#536159] tabular-nums">
                          {bq.stemCount} Stems · {bq.vaseLifeDays}d vase life
                        </p>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-[#F1F0EC]">
                        {onUpdateCatalogItem ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-[#536159]">₱</span>
                            <input
                              type="number"
                              min={100}
                              aria-label={`Price for ${bq.name}`}
                              value={draftPrice}
                              onChange={(e) =>
                                setPriceDrafts((prev) => ({
                                  ...prev,
                                  [bq.id]: e.target.value,
                                }))
                              }
                              className="w-24 min-h-[36px] px-2 py-1 rounded-lg bg-[#FAF9F7] border border-[#D5D2CA] font-mono text-xs font-bold text-[#16211B]"
                            />
                            {priceDirty && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleSaveBouquetPrice(bq)}
                                className="min-h-[36px] px-2.5 rounded-lg bg-[#1B4332] text-white text-[11px] font-semibold cursor-pointer"
                              >
                                Save
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono text-base font-bold text-[#16211B] tabular-nums">
                            ₱{bq.price.toLocaleString()}
                          </span>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenBouquetInStudio(bq.defaultConfig)}
                            className="flex-1 min-h-[38px] px-2.5 rounded-xl bg-[#F1F0EC] text-[#16211B] text-xs font-semibold flex items-center justify-center gap-1 hover:bg-[#E4E2DC] cursor-pointer"
                          >
                            <Box className="w-3.5 h-3.5" />
                            <span>3D</span>
                          </button>

                          {onUpdateCatalogItem && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleToggleBouquetStock(bq)}
                              className={`flex-1 min-h-[38px] px-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                                inStock
                                  ? 'bg-[#FAF9F7] border border-[#D5D2CA] text-[#16211B]'
                                  : 'bg-[#1B4332] text-white'
                              }`}
                            >
                              {inStock ? 'Mark Out' : 'Restock'}
                            </button>
                          )}

                          {onDeleteCatalogItem && (
                            <button
                              type="button"
                              aria-label={`Delete ${bq.name}`}
                              disabled={busy}
                              onClick={() => handleRemoveBouquet(bq.id)}
                              className="min-w-[38px] min-h-[38px] rounded-xl border border-[#F3C6D0] text-[#8E1F3A] flex items-center justify-center hover:bg-[#FDF2F4] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: REGISTERED DAGUPAN CUSTOMERS */}
      {activeTab === 'customers' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1B4332]" />
              <h2 className="font-serif text-2xl font-bold text-[#16211B]">
                Dagupan City Customer Directory
              </h2>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#536159] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Filter customers"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Search name or barangay..."
                className="min-h-[42px] pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E4E2DC] text-xs text-[#16211B] focus:outline-none focus:border-[#1B4332]"
              />
            </div>
          </div>

          {!overview || filteredCustomers.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#E4E2DC] p-8 text-center text-sm text-[#536159]">
              No registered customers match this search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCustomers.map((cust) => (
                <article
                  key={cust.uid}
                  className="rounded-2xl bg-white border border-[#E4E2DC] p-5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#16211B]">
                        {cust.displayName}
                      </h3>
                      <p className="text-xs font-mono text-[#536159]">
                        {cust.email} · {cust.phone}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#1B4332] tabular-nums">
                      ₱{cust.totalSpent.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-[#536159]">
                    Brgy. {cust.barangay} — {cust.streetAddress}
                  </p>

                  <div className="pt-2 border-t border-[#F1F0EC] flex items-center gap-4 text-xs font-mono text-[#16211B]">
                    <span>{cust.orderCount} Reservations</span>
                    <span aria-hidden="true">·</span>
                    <span>{cust.savedBouquetCount} Saved 3D Designs</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
