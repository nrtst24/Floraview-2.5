import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response } from 'express';

interface StoredUser {
  uid: string;
  displayName: string;
  email: string;
  passwordHash: string;
  salt: string;
  phone: string;
  barangay: string;
  streetAddress: string;
  role?: 'customer' | 'admin';
  createdAt: string;
}

interface StoredOrderItem {
  id: string;
  ticketCode?: string;
  fulfillmentMode?: 'pickup';
  pickupShopId?: string;
  pickupShopName?: string;
  pickupBranchAddress?: string;
  pickupDate?: string;
  pickupSlot?: string;
  pickupNotes?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  recipientName: string;
  recipientPhone: string;
  barangay: string;
  streetLandmark: string;
  deliverySlot: string;
  paymentMethod: string;
  status:
    | 'preparing'
    | 'ready_for_pickup'
    | 'picked_up'
    | 'cancelled'
    | 'out_for_delivery'
    | 'delivered';
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  summaryText: string;
  createdAt: string;
  updatedAt?: string;
}

interface StoredStaffMember {
  id: string;
  name: string;
  role: string;
  shopId: string;
  shopName: string;
  barangay: string;
  shiftWindow: string;
  status: 'on_duty' | 'crafting' | 'break' | 'off_duty';
  station: string;
  phoneExt: string;
  createdAt: string;
}

interface StoredShop {
  id: string;
  name: string;
  barangay: string;
  street: string;
  rating: number;
  reviewCount: number;
  deliveryEtaMin: number;
  pickupPrepMin: number;
  pickupHours: string;
  counterDesk: string;
  specialty: string;
  distanceKm: number;
  image: string;
  imageKey: string;
  isOpen: boolean;
}

interface StoredCatalogBouquet {
  id: string;
  name: string;
  shopId: string;
  shopName: string;
  barangay: string;
  category: 'signature' | 'single_stems' | 'tropical_native' | 'dried_preserved';
  occasion: 'romance' | 'sampaguita' | 'sympathy' | 'fiesta';
  price: number;
  rating: number;
  stemCount: number;
  vaseLifeDays: number;
  fragrance: string;
  description: string;
  careTip: string;
  image: string;
  imageKey: string;
  inStock: boolean;
  defaultConfig: {
    title: string;
    stems: Record<string, number>;
    petalPalette: string;
    wrapStyle: string;
    ribbonStyle: string;
  };
}

interface StoredDatabase {
  users: StoredUser[];
  sessions: Record<string, string>;
  userStates: Record<
    string,
    {
      cart: unknown[];
      savedBouquets: unknown[];
      orders: unknown[];
    }
  >;
  staff?: StoredStaffMember[];
  shops?: StoredShop[];
  catalog?: StoredCatalogBouquet[];
  guestTickets?: StoredOrderItem[];
  ticketSeq?: number;
}

const SEED_SHOPS: StoredShop[] = [
  {
    id: 'shop-lucao',
    name: 'Lucao Garden Atelier',
    barangay: 'Lucao',
    street: '248 Judge Jose De Venecia Sr. Ave, Brgy. Lucao',
    rating: 4.9,
    reviewCount: 214,
    deliveryEtaMin: 35,
    pickupPrepMin: 25,
    pickupHours: '8:00 AM – 7:30 PM Daily',
    counterDesk: 'Lucao Counter Desk · Window 1',
    specialty: 'Sculpted Garden Roses & Benguet Stems',
    distanceKm: 1.6,
    image: '',
    imageKey: 'shopLucao',
    isOpen: true,
  },
  {
    id: 'shop-pantal',
    name: 'Pantal River Botanicals',
    barangay: 'Poblacion Oeste',
    street: '112 A.B. Fernandez Ave, Brgy. Poblacion Oeste',
    rating: 4.8,
    reviewCount: 178,
    deliveryEtaMin: 25,
    pickupPrepMin: 20,
    pickupHours: '8:00 AM – 7:00 PM Daily',
    counterDesk: 'Pantal Heritage Counter · Plaza Side',
    specialty: 'Heritage Sampaguita & Linen Hand-Ties',
    distanceKm: 0.9,
    image: '',
    imageKey: 'sampaguitaRose',
    isOpen: true,
  },
  {
    id: 'shop-bonuan',
    name: 'Bonuan Coastal Blooms',
    barangay: 'Bonuan Gueset',
    street: '84 Tondaligan Beach Blvd, Brgy. Bonuan Gueset',
    rating: 4.9,
    reviewCount: 152,
    deliveryEtaMin: 50,
    pickupPrepMin: 30,
    pickupHours: '8:30 AM – 6:30 PM Daily',
    counterDesk: 'Tondaligan Pavilion Counter',
    specialty: 'Golden Sunflowers & Tropical Arrangements',
    distanceKm: 4.2,
    image: '',
    imageKey: 'solarSunflower',
    isOpen: true,
  },
  {
    id: 'shop-tapuac',
    name: 'Tapuac Heritage Florist',
    barangay: 'Tapuac',
    street: '56 Tapuac District Rd, Brgy. Tapuac',
    rating: 4.7,
    reviewCount: 129,
    deliveryEtaMin: 30,
    pickupPrepMin: 25,
    pickupHours: '8:00 AM – 7:00 PM Daily',
    counterDesk: 'Tapuac Orchid Conservatory Desk',
    specialty: 'Phalaenopsis Orchids & Stargazer Lilies',
    distanceKm: 1.4,
    image: '',
    imageKey: 'shopTapuac',
    isOpen: true,
  },
];

const SEED_CATALOG: StoredCatalogBouquet[] = [
  {
    id: 'bq-sampaguita-blush',
    name: 'Sampaguita & Capiz Blush Hand-Tie',
    shopId: 'shop-pantal',
    shopName: 'Pantal River Botanicals',
    barangay: 'Poblacion Oeste',
    category: 'signature',
    occasion: 'romance',
    price: 1890,
    rating: 4.9,
    stemCount: 15,
    vaseLifeDays: 9,
    fragrance: 'Sweet Jasmine & Damask Rose',
    description:
      'Hand-tied in downtown Dagupan with fragrant Pangasinan sampaguita clusters, blush Benguet garden roses, and aromatic silver dollar eucalyptus wrapped in ivory silk linen.',
    careTip: 'Trim stems at a 45° angle every two days and keep away from direct afternoon window heat.',
    image: '',
    imageKey: 'sampaguitaRose',
    inStock: true,
    defaultConfig: {
      title: 'Sampaguita & Capiz Blush Hand-Tie',
      stems: { rose: 6, sunflower: 0, stargazer: 0, orchid: 1, sampaguita: 5, eucalyptus: 3 },
      petalPalette: 'blush',
      wrapStyle: 'ivory_silk',
      ribbonStyle: 'champagne',
    },
  },
  {
    id: 'bq-tondaligan-sunburst',
    name: 'Tondaligan Golden Sunburst',
    shopId: 'shop-bonuan',
    shopName: 'Bonuan Coastal Blooms',
    barangay: 'Bonuan Gueset',
    category: 'tropical_native',
    occasion: 'fiesta',
    price: 1650,
    rating: 4.9,
    stemCount: 12,
    vaseLifeDays: 10,
    fragrance: 'Crisp Citrus & Green Meadow',
    description:
      'Inspired by golden hour along Bonuan Tondaligan Beach—radiant Pangasinan sunflowers paired with coral garden roses and eucalyptus in unbleached kraft linen.',
    careTip: 'Sunflowers drink generously; top up cool water daily for a full 10-day bloom.',
    image: '',
    imageKey: 'tondaliganSunburst',
    inStock: true,
    defaultConfig: {
      title: 'Tondaligan Golden Sunburst',
      stems: { rose: 3, sunflower: 5, stargazer: 0, orchid: 0, sampaguita: 1, eucalyptus: 3 },
      petalPalette: 'solar',
      wrapStyle: 'kraft_linen',
      ribbonStyle: 'emerald',
    },
  },
  {
    id: 'bq-lucao-stargazer',
    name: 'Lucao Stargazer & Phalaenopsis',
    shopId: 'shop-lucao',
    shopName: 'Lucao Garden Atelier',
    barangay: 'Lucao',
    category: 'signature',
    occasion: 'romance',
    price: 2450,
    rating: 5.0,
    stemCount: 14,
    vaseLifeDays: 12,
    fragrance: 'Lush Oriental Lily & White Tea',
    description:
      'Our flagship architectural arrangement featuring crimson-pink Cordillera stargazer lilies and cascading white Tapuac phalaenopsis orchids framed in obsidian matte wrap.',
    careTip: 'Gently remove orange pollen anthers as lily buds open to keep petals pristine.',
    image: '',
    imageKey: 'stargazerOrchid',
    inStock: true,
    defaultConfig: {
      title: 'Lucao Stargazer & Phalaenopsis',
      stems: { rose: 2, sunflower: 0, stargazer: 5, orchid: 4, sampaguita: 0, eucalyptus: 3 },
      petalPalette: 'crimson',
      wrapStyle: 'charcoal_velvet',
      ribbonStyle: 'champagne',
    },
  },
  {
    id: 'bq-capiz-courtyard',
    name: 'Dagupan Heritage Courtyard Medley',
    shopId: 'shop-lucao',
    shopName: 'Lucao Garden Atelier',
    barangay: 'Lucao',
    category: 'signature',
    occasion: 'fiesta',
    price: 2150,
    rating: 4.9,
    stemCount: 16,
    vaseLifeDays: 9,
    fragrance: 'Sampaguita, Lily & Warm Cedar',
    description:
      'A balanced celebration of Dagupan City’s coastal warmth and highland artistry—combining sunflowers, stargazer lilies, blush roses, and sampaguita in warm kraft linen.',
    careTip: 'Mist sampaguita florets lightly each morning to preserve their evening fragrance.',
    image: '',
    imageKey: 'courtyardMedley',
    inStock: true,
    defaultConfig: {
      title: 'Dagupan Atelier Custom Hand-Tie',
      stems: { rose: 5, sunflower: 2, stargazer: 2, orchid: 1, sampaguita: 3, eucalyptus: 3 },
      petalPalette: 'blush',
      wrapStyle: 'kraft_linen',
      ribbonStyle: 'champagne',
    },
  },
  {
    id: 'bq-tapuac-orchid-serenity',
    name: 'Tapuac White Orchid Serenity',
    shopId: 'shop-tapuac',
    shopName: 'Tapuac Heritage Florist',
    barangay: 'Tapuac',
    category: 'tropical_native',
    occasion: 'sympathy',
    price: 2290,
    rating: 4.8,
    stemCount: 12,
    vaseLifeDays: 14,
    fragrance: 'Subtle Dewy Jasmine',
    description:
      'Pure ivory phalaenopsis orchids, sampaguita clusters, and sage eucalyptus designed for solemn remembrance, hospital visits near Region 1 Medical Center, or quiet gratitude.',
    careTip: 'Keep in an air-conditioned room or shaded table for up to two weeks of crisp blooms.',
    image: '',
    imageKey: 'stargazerOrchid',
    inStock: true,
    defaultConfig: {
      title: 'Tapuac White Orchid Serenity',
      stems: { rose: 0, sunflower: 0, stargazer: 2, orchid: 5, sampaguita: 3, eucalyptus: 2 },
      petalPalette: 'ivory',
      wrapStyle: 'sage_botanical',
      ribbonStyle: 'champagne',
    },
  },
  {
    id: 'bq-crimson-benguet-roses',
    name: 'Twelve Velvet Benguet Roses',
    shopId: 'shop-pantal',
    shopName: 'Pantal River Botanicals',
    barangay: 'Poblacion Oeste',
    category: 'single_stems',
    occasion: 'romance',
    price: 1780,
    rating: 4.8,
    stemCount: 14,
    vaseLifeDays: 8,
    fragrance: 'Classic Velvet Rose',
    description:
      'Twelve long-stemmed highland crimson roses paired with silvery eucalyptus sprigs and tied with a double-faced burgundy grosgrain ribbon.',
    careTip: 'Remove any leaves below the waterline and add the included floral nutrient packet.',
    image: '',
    imageKey: 'benguetCrimson',
    inStock: true,
    defaultConfig: {
      title: 'Twelve Velvet Benguet Roses',
      stems: { rose: 11, sunflower: 0, stargazer: 0, orchid: 0, sampaguita: 0, eucalyptus: 3 },
      petalPalette: 'crimson',
      wrapStyle: 'blush_organza',
      ribbonStyle: 'burgundy',
    },
  },
  {
    id: 'bq-sampaguita-fiesta-garland',
    name: 'Bangus Festival Sampaguita & Gold',
    shopId: 'shop-bonuan',
    shopName: 'Bonuan Coastal Blooms',
    barangay: 'Bonuan Gueset',
    category: 'tropical_native',
    occasion: 'sampaguita',
    price: 1490,
    rating: 4.9,
    stemCount: 13,
    vaseLifeDays: 7,
    fragrance: 'Intense Pangasinan Sampaguita',
    description:
      'Created for Dagupan’s Bangus Festival, graduations, and homecoming welcomes—abundant sampaguita clusters accented with solar sunflowers and brushed brass ribbon.',
    careTip: 'Place in a wide-mouth ceramic vase with cool filtered water.',
    image: '',
    imageKey: 'fiestaSampaguita',
    inStock: true,
    defaultConfig: {
      title: 'Bangus Festival Sampaguita & Gold',
      stems: { rose: 0, sunflower: 4, stargazer: 0, orchid: 0, sampaguita: 7, eucalyptus: 2 },
      petalPalette: 'solar',
      wrapStyle: 'kraft_linen',
      ribbonStyle: 'gold',
    },
  },
  {
    id: 'bq-preserved-cordillera',
    name: 'Cordillera Mauve & Eucalyptus Study',
    shopId: 'shop-tapuac',
    shopName: 'Tapuac Heritage Florist',
    barangay: 'Tapuac',
    category: 'dried_preserved',
    occasion: 'sympathy',
    price: 1590,
    rating: 4.7,
    stemCount: 11,
    vaseLifeDays: 30,
    fragrance: 'Dried Lavender & Eucalyptus',
    description:
      'Long-lasting preserved mauve roses, dried silver dollar eucalyptus, and ivory lilies styled in sage cotton paper for desks and studio consoles.',
    careTip: 'No water needed for preserved stems; dust gently with cool air.',
    image: '',
    imageKey: 'cordilleraMauve',
    inStock: true,
    defaultConfig: {
      title: 'Cordillera Mauve & Eucalyptus Study',
      stems: { rose: 5, sunflower: 0, stargazer: 1, orchid: 0, sampaguita: 0, eucalyptus: 5 },
      petalPalette: 'lavender',
      wrapStyle: 'sage_botanical',
      ribbonStyle: 'champagne',
    },
  },
];

function getBranchById(db: StoredDatabase, shopId?: string): StoredShop {
  const shops = Array.isArray(db.shops) && db.shops.length > 0 ? db.shops : SEED_SHOPS;
  return shops.find((s) => s.id === shopId) || shops[0];
}

const SEED_DAGUPAN_STAFF: StoredStaffMember[] = [
  {
    id: 'staff-marisol',
    name: 'Marisol Soriano',
    role: 'Lead Florist',
    shopId: 'shop-lucao',
    shopName: 'Lucao Garden Atelier',
    barangay: 'Lucao',
    shiftWindow: '8:00 AM – 5:00 PM',
    status: 'crafting',
    station: 'Cold Vault Bench A',
    phoneExt: 'Local 101',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'staff-rafael',
    name: 'Rafael De Guzman',
    role: '3D Bouquet Artisan',
    shopId: 'shop-lucao',
    shopName: 'Lucao Garden Atelier',
    barangay: 'Lucao',
    shiftWindow: '10:00 AM – 7:00 PM',
    status: 'on_duty',
    station: 'Counter Desk · Window 1',
    phoneExt: 'Local 102',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'staff-clarisse',
    name: 'Clarisse Mendoza',
    role: 'Sampaguita & Orchid Specialist',
    shopId: 'shop-pantal',
    shopName: 'Pantal River Botanicals',
    barangay: 'Poblacion Oeste',
    shiftWindow: '8:00 AM – 5:00 PM',
    status: 'on_duty',
    station: 'Plaza Heritage Counter',
    phoneExt: 'Local 201',
    createdAt: '2026-10-02T08:00:00.000Z',
  },
  {
    id: 'staff-jeric',
    name: 'Jeric Fernandez',
    role: 'Pickup Counter Lead',
    shopId: 'shop-pantal',
    shopName: 'Pantal River Botanicals',
    barangay: 'Poblacion Oeste',
    shiftWindow: '9:30 AM – 6:30 PM',
    status: 'crafting',
    station: 'Hand-Tie Prep Table 2',
    phoneExt: 'Local 202',
    createdAt: '2026-10-03T08:00:00.000Z',
  },
  {
    id: 'staff-bea',
    name: 'Bea Villamil',
    role: 'Lead Florist',
    shopId: 'shop-bonuan',
    shopName: 'Bonuan Coastal Blooms',
    barangay: 'Bonuan Gueset',
    shiftWindow: '8:30 AM – 5:30 PM',
    status: 'on_duty',
    station: 'Tondaligan Pavilion Desk',
    phoneExt: 'Local 301',
    createdAt: '2026-10-04T08:00:00.000Z',
  },
  {
    id: 'staff-noel',
    name: 'Noel Estrada',
    role: 'Orchid & Lily Conservator',
    shopId: 'shop-tapuac',
    shopName: 'Tapuac Heritage Florist',
    barangay: 'Tapuac',
    shiftWindow: '8:00 AM – 5:00 PM',
    status: 'break',
    station: 'Orchid Conservatory Desk',
    phoneExt: 'Local 401',
    createdAt: '2026-10-05T08:00:00.000Z',
  },
];

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'floraview_db.json');

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function ensureAdminSeeded(db: StoredDatabase): boolean {
  let modified = false;
  const adminEmail = 'admin';
  const existingAdmin = db.users.find(
    (u) => u.email.toLowerCase() === adminEmail,
  );
  if (!existingAdmin) {
    const adminSalt = 'dagupan_atelier_admin_salt_2026';
    const adminUid = 'user-admin-dagupan';
    db.users.push({
      uid: adminUid,
      displayName: 'Dagupan Atelier Admin',
      email: adminEmail,
      passwordHash: hashPassword('admin123', adminSalt),
      salt: adminSalt,
      phone: '+63 917 500 2026',
      barangay: 'Poblacion Oeste',
      streetAddress: 'Plaza Rizal & A.B. Fernandez Ave, Dagupan City',
      role: 'admin',
      createdAt: '2026-10-01T08:00:00.000Z',
    });
    if (!db.userStates[adminUid]) {
      db.userStates[adminUid] = { cart: [], savedBouquets: [], orders: [] };
    }
    modified = true;
  } else if (existingAdmin.role !== 'admin') {
    existingAdmin.role = 'admin';
    modified = true;
  }
  return modified;
}

function ensureStaffAndTicketsSeeded(db: StoredDatabase): boolean {
  let modified = false;
  if (!Array.isArray(db.shops) || db.shops.length === 0) {
    db.shops = SEED_SHOPS.map((s) => ({ ...s }));
    modified = true;
  }
  if (!Array.isArray(db.catalog) || db.catalog.length === 0) {
    db.catalog = SEED_CATALOG.map((c) => ({ ...c, defaultConfig: { ...c.defaultConfig, stems: { ...c.defaultConfig.stems } } }));
    modified = true;
  }
  if (!Array.isArray(db.staff) || db.staff.length === 0) {
    db.staff = SEED_DAGUPAN_STAFF.map((s) => ({ ...s }));
    modified = true;
  }
  if (!Array.isArray(db.guestTickets)) {
    db.guestTickets = [
      {
        id: 'FV_8512',
        ticketCode: 'PK-104',
        fulfillmentMode: 'pickup',
        pickupShopId: 'shop-pantal',
        pickupShopName: 'Pantal River Botanicals',
        pickupBranchAddress: '112 A.B. Fernandez Ave, Brgy. Poblacion Oeste',
        pickupDate: new Date().toISOString().slice(0, 10),
        pickupSlot: 'Midday Fresh Batch (12:00 PM – 2:30 PM)',
        pickupNotes: 'Claiming before lunch break',
        assignedStaffId: 'staff-clarisse',
        assignedStaffName: 'Clarisse Mendoza',
        recipientName: 'Paolo Velasco',
        recipientPhone: '+63 917 612 4401',
        barangay: 'Poblacion Oeste',
        streetLandmark: '112 A.B. Fernandez Ave, Brgy. Poblacion Oeste',
        deliverySlot: 'Midday Fresh Batch (12:00 PM – 2:30 PM)',
        paymentMethod: 'GCash (Pre-Reserve)',
        status: 'ready_for_pickup',
        subtotal: 1890,
        deliveryFee: 0,
        totalAmount: 1890,
        summaryText: '1x Sampaguita & Capiz Blush Hand-Tie',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
      {
        id: 'FV_8515',
        ticketCode: 'PK-105',
        fulfillmentMode: 'pickup',
        pickupShopId: 'shop-lucao',
        pickupShopName: 'Lucao Garden Atelier',
        pickupBranchAddress: '248 Judge Jose De Venecia Sr. Ave, Brgy. Lucao',
        pickupDate: new Date().toISOString().slice(0, 10),
        pickupSlot: 'Afternoon Golden Hour (3:00 PM – 5:30 PM)',
        pickupNotes: 'Custom 3D ribbon wrap',
        assignedStaffId: 'staff-marisol',
        assignedStaffName: 'Marisol Soriano',
        recipientName: 'Hannah Dizon',
        recipientPhone: '+63 918 304 8812',
        barangay: 'Lucao',
        streetLandmark: '248 Judge Jose De Venecia Sr. Ave, Brgy. Lucao',
        deliverySlot: 'Afternoon Golden Hour (3:00 PM – 5:30 PM)',
        paymentMethod: 'Pay at Counter (Cash)',
        status: 'preparing',
        subtotal: 2150,
        deliveryFee: 0,
        totalAmount: 2150,
        summaryText: '1x Dagupan Heritage Courtyard Medley',
        createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ];
    modified = true;
  }
  if (typeof db.ticketSeq !== 'number' || db.ticketSeq < 106) {
    db.ticketSeq = 106;
    modified = true;
  }

  // Normalize existing user orders with pickup ticket metadata when absent
  let seqOffset = 101;
  for (const state of Object.values(db.userStates)) {
    if (!Array.isArray(state.orders)) continue;
    for (const rawOrd of state.orders as StoredOrderItem[]) {
      if (!rawOrd.ticketCode) {
        rawOrd.ticketCode = `PK-${seqOffset++}`;
        modified = true;
      }
      if (!rawOrd.fulfillmentMode) {
        rawOrd.fulfillmentMode = 'pickup';
        modified = true;
      }
      if (!rawOrd.pickupShopId || !rawOrd.pickupShopName) {
        const targetId =
          rawOrd.barangay === 'Tapuac'
            ? 'shop-tapuac'
            : rawOrd.barangay === 'Bonuan Gueset'
              ? 'shop-bonuan'
              : rawOrd.barangay === 'Poblacion Oeste'
                ? 'shop-pantal'
                : 'shop-lucao';
        const branch = getBranchById(db, targetId);
        rawOrd.pickupShopId = branch.id;
        rawOrd.pickupShopName = branch.name;
        rawOrd.pickupBranchAddress = branch.street;
        modified = true;
      }
      if (!rawOrd.pickupSlot) {
        rawOrd.pickupSlot = rawOrd.deliverySlot || 'Morning Counter (9:00 AM – 11:30 AM)';
        modified = true;
      }
      if (!rawOrd.pickupDate) {
        rawOrd.pickupDate = (rawOrd.createdAt || new Date().toISOString()).slice(0, 10);
        modified = true;
      }
      if (rawOrd.status === 'delivered') {
        rawOrd.status = 'picked_up';
        modified = true;
      } else if (rawOrd.status === 'out_for_delivery') {
        rawOrd.status = 'ready_for_pickup';
        modified = true;
      }
      if (!rawOrd.assignedStaffId && rawOrd.status === 'preparing') {
        rawOrd.assignedStaffId = 'staff-marisol';
        rawOrd.assignedStaffName = 'Marisol Soriano';
        modified = true;
      }
    }
  }

  return modified;
}

function loadDatabase(): StoredDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const demoSalt = 'dagupan_flora_seed_2026';
    const demoUid = 'user-clara-dagupan';
    const initial: StoredDatabase = {
      users: [
        {
          uid: demoUid,
          displayName: 'Clara Reyes',
          email: 'clara.reyes@dagupanflora.ph',
          passwordHash: hashPassword('Flora2026!', demoSalt),
          salt: demoSalt,
          phone: '+63 917 842 3910',
          barangay: 'Lucao',
          streetAddress: '184 De Venecia Rd, near CSI City Mall, Brgy. Lucao, Dagupan City',
          role: 'customer',
          createdAt: '2026-10-18T08:30:00.000Z',
        },
      ],
      sessions: {},
      userStates: {
        [demoUid]: {
          cart: [],
          savedBouquets: [
            {
              id: 'bq-saved-101',
              title: 'Lingayen Sunset Sampaguita & Rose',
              totalPrice: 2145,
              stemCount: 15,
              createdAt: '2026-10-25T10:15:00.000Z',
              config: {
                title: 'Lingayen Sunset Sampaguita & Rose',
                stems: {
                  rose: 5,
                  sunflower: 2,
                  stargazer: 1,
                  orchid: 1,
                  sampaguita: 3,
                  eucalyptus: 3,
                },
                petalPalette: 'sunset',
                wrapStyle: 'kraft_linen',
                ribbonStyle: 'champagne',
              },
            },
          ],
          orders: [
            {
              id: 'FV-8421',
              ticketCode: 'PK-101',
              fulfillmentMode: 'pickup',
              pickupShopId: 'shop-pantal',
              pickupShopName: 'Pantal River Botanicals',
              pickupBranchAddress: '112 A.B. Fernandez Ave, Brgy. Poblacion Oeste',
              pickupDate: '2026-10-28',
              pickupSlot: 'Morning Counter (9:00 AM – 11:30 AM)',
              assignedStaffId: 'staff-jeric',
              assignedStaffName: 'Jeric Fernandez',
              recipientName: 'Elena Reyes',
              recipientPhone: '+63 917 842 3910',
              barangay: 'Poblacion Oeste',
              streetLandmark: '112 A.B. Fernandez Ave, Brgy. Poblacion Oeste',
              deliverySlot: 'Morning Counter (9:00 AM – 11:30 AM)',
              paymentMethod: 'GCash (Pre-Reserve)',
              status: 'picked_up',
              subtotal: 1890,
              deliveryFee: 0,
              totalAmount: 1890,
              summaryText: '1x Sampaguita & Capiz Blush Hand-Tie (Pantal River Botanicals)',
              createdAt: '2026-10-28T09:12:00.000Z',
            },
            {
              id: 'FV-8490',
              ticketCode: 'PK-102',
              fulfillmentMode: 'pickup',
              pickupShopId: 'shop-lucao',
              pickupShopName: 'Lucao Garden Atelier',
              pickupBranchAddress: '248 Judge Jose De Venecia Sr. Ave, Brgy. Lucao',
              pickupDate: '2026-11-05',
              pickupSlot: 'Afternoon Golden Hour (3:00 PM – 5:30 PM)',
              assignedStaffId: 'staff-rafael',
              assignedStaffName: 'Rafael De Guzman',
              recipientName: 'Marco Bautista',
              recipientPhone: '+63 918 510 7724',
              barangay: 'Lucao',
              streetLandmark: '248 Judge Jose De Venecia Sr. Ave, Brgy. Lucao',
              deliverySlot: 'Afternoon Golden Hour (3:00 PM – 5:30 PM)',
              paymentMethod: 'Maya (Pre-Reserve)',
              status: 'ready_for_pickup',
              subtotal: 2450,
              deliveryFee: 0,
              totalAmount: 2450,
              summaryText: '1x Lucao Stargazer & Phalaenopsis (Lucao Garden Atelier)',
              createdAt: '2026-11-05T14:20:00.000Z',
            },
          ],
        },
      },
      staff: SEED_DAGUPAN_STAFF.map((s) => ({ ...s })),
      guestTickets: [],
      ticketSeq: 106,
    };
    ensureAdminSeeded(initial);
    ensureStaffAndTicketsSeeded(initial);
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as StoredDatabase;
    if (!Array.isArray(parsed.users)) parsed.users = [];
    if (!parsed.sessions) parsed.sessions = {};
    if (!parsed.userStates) parsed.userStates = {};
    const changedAdmin = ensureAdminSeeded(parsed);
    const changedSeed = ensureStaffAndTicketsSeeded(parsed);
    if (changedAdmin || changedSeed) {
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf8');
    }
    return parsed;
  } catch {
    const fallback: StoredDatabase = { users: [], sessions: {}, userStates: {} };
    ensureAdminSeeded(fallback);
    ensureStaffAndTicketsSeeded(fallback);
    return fallback;
  }
}

function saveDatabase(db: StoredDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function getSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function requireAdminUser(
  req: Request,
  res: Response,
  db: StoredDatabase,
): StoredUser | null {
  const token = getSessionToken(req);
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  const uid = db.sessions[token];
  const user = uid ? db.users.find((u) => u.uid === uid) : undefined;
  if (!user) {
    res.status(401).json({ error: 'Session expired' });
    return null;
  }
  if ((user.role || 'customer') !== 'admin') {
    res.status(403).json({ error: 'Administrator privileges required.' });
    return null;
  }
  return user;
}

function getInitials(name: string): string {
  const parts = String(name || 'Guest')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'DG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}.${parts[parts.length - 1][0]}.`.toUpperCase();
}

function collectAllOrders(db: StoredDatabase): Array<
  StoredOrderItem & {
    ownerUid: string;
    customerName: string;
    customerEmail: string;
  }
> {
  const allOrders: Array<
    StoredOrderItem & {
      ownerUid: string;
      customerName: string;
      customerEmail: string;
    }
  > = [];

  for (const u of db.users) {
    const state = db.userStates[u.uid] || { cart: [], savedBouquets: [], orders: [] };
    const userOrders = Array.isArray(state.orders)
      ? (state.orders as StoredOrderItem[])
      : [];
    for (const ord of userOrders) {
      allOrders.push({
        ...ord,
        ownerUid: u.uid,
        customerName: u.displayName,
        customerEmail: u.email,
      });
    }
  }

  if (Array.isArray(db.guestTickets)) {
    for (const ord of db.guestTickets) {
      allOrders.push({
        ...ord,
        ownerUid: 'guest-pickup',
        customerName: ord.recipientName || 'Walk-in Guest',
        customerEmail: 'guest-pickup@floraview.ph',
      });
    }
  }

  allOrders.sort((a, b) => {
    const ta = Date.parse(a.createdAt || '') || 0;
    const tb = Date.parse(b.createdAt || '') || 0;
    return tb - ta;
  });

  return allOrders;
}

function toSanitizedTicket(ord: StoredOrderItem, db?: StoredDatabase) {
  const branch = db
    ? getBranchById(db, ord.pickupShopId)
    : SEED_SHOPS.find((s) => s.id === ord.pickupShopId) || SEED_SHOPS[0];
  return {
    id: ord.id,
    ticketCode: ord.ticketCode || ord.id,
    status: ord.status,
    pickupShopId: ord.pickupShopId || branch.id,
    pickupShopName: ord.pickupShopName || branch.name,
    pickupBranchAddress: ord.pickupBranchAddress || branch.street,
    pickupDate: ord.pickupDate || (ord.createdAt || new Date().toISOString()).slice(0, 10),
    pickupSlot: ord.pickupSlot || ord.deliverySlot || 'Morning Counter (9:00 AM – 11:30 AM)',
    summaryText: ord.summaryText,
    assignedStaffId: ord.assignedStaffId,
    assignedStaffName: ord.assignedStaffName,
    customerInitials: getInitials(ord.recipientName),
    totalAmount: Number(ord.totalAmount || 0),
    createdAt: ord.createdAt,
    updatedAt: ord.updatedAt || ord.createdAt,
  };
}

function enrichStaffWithTicketCounts(
  staff: StoredStaffMember[],
  orders: StoredOrderItem[],
) {
  return staff.map((member) => {
    const assigned = orders.filter((o) => o.assignedStaffId === member.id);
    const activeTicketCount = assigned.filter(
      (o) => o.status === 'preparing' || o.status === 'ready_for_pickup' || o.status === 'out_for_delivery',
    ).length;
    const completedTicketCount = assigned.filter(
      (o) => o.status === 'picked_up' || o.status === 'delivered',
    ).length;
    return {
      ...member,
      activeTicketCount,
      completedTicketCount,
    };
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'floraview-dagupan', fulfillment: 'pickup-only' });
  });

  app.get('/api/catalog', (_req: Request, res: Response) => {
    const db = loadDatabase();
    res.json({
      shops: db.shops || SEED_SHOPS,
      catalog: db.catalog || SEED_CATALOG,
    });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { displayName, email, password, phone, barangay, streetAddress } = req.body || {};
    if (!displayName || !email || !password || String(password).length < 6) {
      res.status(400).json({ error: 'Name, email, and a password of at least 6 characters are required.' });
      return;
    }

    const db = loadDatabase();
    const normalizedEmail = String(email).trim().toLowerCase();
    if (
      normalizedEmail === 'admin' ||
      db.users.some((u) => u.email.toLowerCase() === normalizedEmail)
    ) {
      res.status(409).json({ error: 'An account with this identifier already exists. Please log in instead.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const uid = `user-${crypto.randomBytes(6).toString('hex')}`;
    const newUser: StoredUser = {
      uid,
      displayName: String(displayName).trim().slice(0, 80),
      email: normalizedEmail,
      passwordHash: hashPassword(String(password), salt),
      salt,
      phone: String(phone || '+63 917 000 0000').trim().slice(0, 24),
      barangay: String(barangay || 'Lucao').trim().slice(0, 64),
      streetAddress: String(streetAddress || 'Dagupan City, Pangasinan').trim().slice(0, 200),
      role: 'customer',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.userStates[uid] = { cart: [], savedBouquets: [], orders: [] };
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = uid;
    saveDatabase(db);

    res.status(201).json({
      token,
      user: {
        uid: newUser.uid,
        displayName: newUser.displayName,
        email: newUser.email,
        phone: newUser.phone,
        barangay: newUser.barangay,
        streetAddress: newUser.streetAddress,
        provider: 'email',
        role: 'customer',
      },
      state: db.userStates[uid],
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email or username and password are required.' });
      return;
    }

    const db = loadDatabase();
    const normalizedEmail = String(email).trim().toLowerCase();
    const found = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!found) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const computed = hashPassword(String(password), found.salt);
    if (computed !== found.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = found.uid;
    if (!db.userStates[found.uid]) {
      db.userStates[found.uid] = { cart: [], savedBouquets: [], orders: [] };
    }
    saveDatabase(db);

    res.json({
      token,
      user: {
        uid: found.uid,
        displayName: found.displayName,
        email: found.email,
        phone: found.phone,
        barangay: found.barangay,
        streetAddress: found.streetAddress,
        provider: 'email',
        role: found.role || 'customer',
      },
      state: db.userStates[found.uid],
    });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const db = loadDatabase();
    const uid = db.sessions[token];
    const user = uid ? db.users.find((u) => u.uid === uid) : undefined;
    if (!user) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }
    res.json({
      user: {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        barangay: user.barangay,
        streetAddress: user.streetAddress,
        provider: 'email',
        role: user.role || 'customer',
      },
      state: db.userStates[user.uid] || { cart: [], savedBouquets: [], orders: [] },
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (token) {
      const db = loadDatabase();
      delete db.sessions[token];
      saveDatabase(db);
    }
    res.json({ ok: true });
  });

  // Public Pickup-Only Reservation & Live Ticket Tracker Endpoints
  app.post('/api/tickets/reserve', (req: Request, res: Response) => {
    const body = req.body || {};
    const {
      id,
      recipientName,
      recipientPhone,
      pickupShopId,
      pickupDate,
      pickupSlot,
      pickupNotes,
      paymentMethod,
      subtotal,
      summaryText,
    } = body;

    if (!recipientName || !recipientPhone || !summaryText) {
      res.status(400).json({
        error: 'Claimant name, mobile number, and bouquet summary are required for pickup reservation.',
      });
      return;
    }

    const db = loadDatabase();
    const branch = getBranchById(db, String(pickupShopId || 'shop-lucao'));
    const seq = Number(db.ticketSeq || 106);
    db.ticketSeq = seq + 1;

    const ticketCode = `PK-${seq}`;
    const orderId =
      typeof id === 'string' && id.trim().length > 0
        ? id.trim().slice(0, 64)
        : `FV_${Math.floor(1000 + Math.random() * 9000)}`;

    // Pick an available on-duty/crafting florist at the chosen Dagupan branch if available
    const branchStaff = (db.staff || []).find(
      (s) => s.shopId === branch.id && (s.status === 'on_duty' || s.status === 'crafting'),
    );

    const nowIso = new Date().toISOString();
    const numericSubtotal = Math.max(0, Number(subtotal || 0));

    const reservation: StoredOrderItem = {
      id: orderId,
      ticketCode,
      fulfillmentMode: 'pickup',
      pickupShopId: branch.id,
      pickupShopName: branch.name,
      pickupBranchAddress: branch.street,
      pickupDate: String(pickupDate || nowIso.slice(0, 10)).slice(0, 20),
      pickupSlot: String(pickupSlot || 'Morning Counter (9:00 AM – 11:30 AM)').slice(0, 80),
      pickupNotes: pickupNotes ? String(pickupNotes).trim().slice(0, 200) : undefined,
      assignedStaffId: branchStaff?.id,
      assignedStaffName: branchStaff?.name,
      recipientName: String(recipientName).trim().slice(0, 80),
      recipientPhone: String(recipientPhone).trim().slice(0, 24),
      barangay: branch.barangay,
      streetLandmark: branch.street,
      deliverySlot: String(pickupSlot || 'Morning Counter (9:00 AM – 11:30 AM)').slice(0, 80),
      paymentMethod: String(paymentMethod || 'Pay at Counter (Cash)').slice(0, 40),
      status: 'preparing',
      subtotal: numericSubtotal,
      deliveryFee: 0,
      totalAmount: numericSubtotal,
      summaryText: String(summaryText).trim().slice(0, 300),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const token = getSessionToken(req);
    const uid = token ? db.sessions[token] : undefined;
    if (uid && db.userStates[uid]) {
      if (!Array.isArray(db.userStates[uid].orders)) {
        db.userStates[uid].orders = [];
      }
      db.userStates[uid].orders.unshift(reservation);
      db.userStates[uid].cart = [];
    } else {
      if (!Array.isArray(db.guestTickets)) db.guestTickets = [];
      db.guestTickets.unshift(reservation);
    }

    saveDatabase(db);
    res.status(201).json({
      ticket: reservation,
      liveTicket: toSanitizedTicket(reservation, db),
    });
  });

  app.get('/api/tickets/live', (req: Request, res: Response) => {
    const db = loadDatabase();
    const shopFilter = String(req.query.shopId || 'all');
    const all = collectAllOrders(db).filter((o) => o.status !== 'cancelled');
    const filtered =
      shopFilter !== 'all'
        ? all.filter((o) => (o.pickupShopId || 'shop-lucao') === shopFilter)
        : all;

    res.json({
      tickets: filtered.slice(0, 30).map((o) => toSanitizedTicket(o, db)),
      updatedAt: new Date().toISOString(),
    });
  });

  app.get('/api/tickets/:code', (req: Request, res: Response) => {
    const rawCode = String(req.params.code || '').trim().toLowerCase();
    if (!rawCode) {
      res.status(400).json({ error: 'Ticket code is required.' });
      return;
    }
    const db = loadDatabase();
    const all = collectAllOrders(db);
    const found = all.find(
      (o) =>
        (o.ticketCode || '').toLowerCase() === rawCode ||
        o.id.toLowerCase() === rawCode,
    );
    if (!found) {
      res.status(404).json({ error: `No pickup ticket found matching "${req.params.code}".` });
      return;
    }
    res.json({ ticket: toSanitizedTicket(found, db) });
  });

  app.patch('/api/tickets/:orderId/cancel', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const db = loadDatabase();
    const nowIso = new Date().toISOString();
    let targetOrder: StoredOrderItem | null = null;

    for (const state of Object.values(db.userStates)) {
      if (!Array.isArray(state.orders)) continue;
      const found = (state.orders as StoredOrderItem[]).find(
        (o) => o.id === orderId || o.ticketCode === orderId,
      );
      if (found) {
        targetOrder = found;
        break;
      }
    }

    if (!targetOrder && Array.isArray(db.guestTickets)) {
      const found = db.guestTickets.find(
        (o) => o.id === orderId || o.ticketCode === orderId,
      );
      if (found) targetOrder = found;
    }

    if (!targetOrder) {
      res.status(404).json({ error: 'Pickup reservation not found.' });
      return;
    }

    if (targetOrder.status !== 'preparing') {
      res.status(409).json({
        error: 'Only reservations still in Crafting stage can be cancelled online.',
      });
      return;
    }

    targetOrder.status = 'cancelled';
    targetOrder.updatedAt = nowIso;
    saveDatabase(db);
    res.json({ ok: true, ticket: targetOrder });
  });

  // Admin Overview, Live Ticket Tracker & Dagupan Staff Board Routes
  app.get('/api/admin/overview', (req: Request, res: Response) => {
    const db = loadDatabase();
    const adminUser = requireAdminUser(req, res, db);
    if (!adminUser) return;

    const allOrders = collectAllOrders(db);
    const customers = db.users.map((u) => {
      const state = db.userStates[u.uid] || { cart: [], savedBouquets: [], orders: [] };
      const userOrders = Array.isArray(state.orders)
        ? (state.orders as StoredOrderItem[])
        : [];
      const userBouquets = Array.isArray(state.savedBouquets) ? state.savedBouquets : [];
      const totalSpent = userOrders.reduce(
        (sum, ord) => sum + Number(ord.totalAmount || 0),
        0,
      );

      return {
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        phone: u.phone,
        barangay: u.barangay,
        streetAddress: u.streetAddress,
        role: u.role || 'customer',
        orderCount: userOrders.length,
        savedBouquetCount: userBouquets.length,
        totalSpent,
        createdAt: u.createdAt,
      };
    });

    const totalRevenue = allOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, ord) => sum + Number(ord.totalAmount || 0), 0);
    const activeOrdersCount = allOrders.filter(
      (o) => o.status === 'preparing' || o.status === 'ready_for_pickup' || o.status === 'out_for_delivery',
    ).length;
    const readyForPickupCount = allOrders.filter(
      (o) => o.status === 'ready_for_pickup',
    ).length;
    const deliveredOrdersCount = allOrders.filter(
      (o) => o.status === 'picked_up' || o.status === 'delivered',
    ).length;
    const nonAdminCustomers = customers.filter((c) => c.role !== 'admin');
    const totalSavedBouquetsCount = customers.reduce(
      (sum, c) => sum + c.savedBouquetCount,
      0,
    );

    const enrichedStaff = enrichStaffWithTicketCounts(db.staff || [], allOrders);
    const staffOnDutyCount = enrichedStaff.filter(
      (s) => s.status === 'on_duty' || s.status === 'crafting',
    ).length;

    res.json({
      overview: {
        totalRevenue,
        activeOrdersCount,
        readyForPickupCount,
        deliveredOrdersCount,
        staffOnDutyCount,
        totalCustomersCount: nonAdminCustomers.length,
        totalSavedBouquetsCount,
        orders: allOrders,
        customers: nonAdminCustomers,
        staff: enrichedStaff,
        shops: db.shops || SEED_SHOPS,
        catalog: db.catalog || SEED_CATALOG,
      },
    });
  });

  app.patch('/api/admin/orders/:orderId/status', (req: Request, res: Response) => {
    const db = loadDatabase();
    const adminUser = requireAdminUser(req, res, db);
    if (!adminUser) return;

    const { orderId } = req.params;
    const nextStatus = req.body?.status;
    if (
      nextStatus !== 'preparing' &&
      nextStatus !== 'ready_for_pickup' &&
      nextStatus !== 'picked_up' &&
      nextStatus !== 'cancelled' &&
      nextStatus !== 'out_for_delivery' &&
      nextStatus !== 'delivered'
    ) {
      res.status(400).json({ error: 'Invalid pickup ticket status.' });
      return;
    }

    const nowIso = new Date().toISOString();
    let foundOwnerUid: string | null = null;
    for (const [ownerUid, state] of Object.entries(db.userStates)) {
      if (!Array.isArray(state.orders)) continue;
      const idx = (state.orders as StoredOrderItem[]).findIndex((o) => o.id === orderId);
      if (idx >= 0) {
        (state.orders as StoredOrderItem[])[idx] = {
          ...(state.orders as StoredOrderItem[])[idx],
          status: nextStatus,
          updatedAt: nowIso,
        };
        foundOwnerUid = ownerUid;
        break;
      }
    }

    if (!foundOwnerUid && Array.isArray(db.guestTickets)) {
      const idx = db.guestTickets.findIndex((o) => o.id === orderId);
      if (idx >= 0) {
        db.guestTickets[idx] = {
          ...db.guestTickets[idx],
          status: nextStatus,
          updatedAt: nowIso,
        };
        foundOwnerUid = 'guest-pickup';
      }
    }

    if (!foundOwnerUid) {
      res.status(404).json({ error: 'Pickup ticket not found.' });
      return;
    }

    saveDatabase(db);
    res.json({ ok: true, orderId, status: nextStatus, ownerUid: foundOwnerUid });
  });

  app.patch('/api/admin/orders/:orderId/assign', (req: Request, res: Response) => {
    const db = loadDatabase();
    const adminUser = requireAdminUser(req, res, db);
    if (!adminUser) return;

    const { orderId } = req.params;
    const staffId = req.body?.staffId ? String(req.body.staffId) : '';
    const staffMember = staffId
      ? (db.staff || []).find((s) => s.id === staffId)
      : undefined;

    if (staffId && !staffMember) {
      res.status(404).json({ error: 'Dagupan staff member not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    let updated = false;

    for (const state of Object.values(db.userStates)) {
      if (!Array.isArray(state.orders)) continue;
      const idx = (state.orders as StoredOrderItem[]).findIndex((o) => o.id === orderId);
      if (idx >= 0) {
        (state.orders as StoredOrderItem[])[idx] = {
          ...(state.orders as StoredOrderItem[])[idx],
          assignedStaffId: staffMember?.id || undefined,
          assignedStaffName: staffMember?.name || undefined,
          updatedAt: nowIso,
        };
        updated = true;
        break;
      }
    }

    if (!updated && Array.isArray(db.guestTickets)) {
      const idx = db.guestTickets.findIndex((o) => o.id === orderId);
      if (idx >= 0) {
        db.guestTickets[idx] = {
          ...db.guestTickets[idx],
          assignedStaffId: staffMember?.id || undefined,
          assignedStaffName: staffMember?.name || undefined,
          updatedAt: nowIso,
        };
        updated = true;
      }
    }

    if (!updated) {
      res.status(404).json({ error: 'Pickup ticket not found.' });
      return;
    }

    if (staffMember && staffMember.status === 'on_duty') {
      staffMember.status = 'crafting';
    }

    saveDatabase(db);
    res.json({
      ok: true,
      orderId,
      assignedStaffId: staffMember?.id || null,
      assignedStaffName: staffMember?.name || null,
    });
  });

  app.delete('/api/admin/orders/:orderId', (req: Request, res: Response) => {
    const db = loadDatabase();
    const adminUser = requireAdminUser(req, res, db);
    if (!adminUser) return;

    const { orderId } = req.params;
    let removed = false;

    for (const state of Object.values(db.userStates)) {
      if (!Array.isArray(state.orders)) continue;
      const before = state.orders.length;
      state.orders = (state.orders as StoredOrderItem[]).filter((o) => o.id !== orderId);
      if (state.orders.length !== before) {
        removed = true;
        break;
      }
    }

    if (!removed && Array.isArray(db.guestTickets)) {
      const before = db.guestTickets.length;
      db.guestTickets = db.guestTickets.filter((o) => o.id !== orderId);
      if (db.guestTickets.length !== before) removed = true;
    }

    if (!removed) {
      res.status(404).json({ error: 'Pickup ticket not found.' });
      return;
    }

    saveDatabase(db);
    res.json({ ok: true, orderId });
  });

  app.get('/api/admin/staff', (req: Request, res: Response) => {
    const db = loadDatabase();
    const adminUser = requireAdminUser(req, res, db);
    if (!adminUser) return;

    const allOrders = collectAllOrders(db);
    res.json({
      staff: enrichStaffWithTicketCounts(db.staff || [], allOrders),
    });
  });

  app.post('/api/admin/staff', (req: Request, res: Response) => {
    const db = loadDatabase();
    const adminUser = requireAdminUser(req, res, db);
    if (!adminUser) return;

    const { name, role, shopId, shiftWindow, station, phoneExt } = req.body || {};
    if (!name || !role) {
      res.status(400).json({ error: 'Staff name and role are required.' });
      return;
    }

    const branch = getBranchById(db, String(shopId || 'shop-lucao'));
    const newStaff: StoredStaffMember = {
      id: `staff-${crypto.randomBytes(4).toString('hex')}`,
      name: String(name).trim().slice(0, 64),
      role: String(role).trim().slice(0, 64),
      shopId: branch.id,
      shopName: branch.name,
      barangay: branch.barangay,
      shiftWindow: String(shiftWindow || '8:00 AM – 5:00 PM').trim().slice(0, 40),
      status: 'on_duty',
      station: String(station || 'Main Counter Bench').trim().slice(0, 64),
      phoneExt: String(phoneExt || 'Local 105').trim().slice(0, 24),
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(db.staff)) db.staff = [];
    db.staff.push(newStaff);
    saveDatabase(db);

    res.status(201).json({ staff: { ...newStaff, activeTicketCount: 0, completedTicketCount: 0 } });
  });

  app.patch('/api/admin/staff/:staffId', (req: Request, res: Response) => {
    const db = loadDatabase();
    const adminUser = requireAdminUser(req, res, db);
    if (!adminUser) return;

    const { staffId } = req.params;
    const target = (db.staff || []).find((s) => s.id === staffId);
    if (!target) {
      res.status(404).json({ error: 'Dagupan staff member not found.' });
      return;
    }

    const { status, shopId, role, station, shiftWindow, name, phoneExt } = req.body || {};
    if (status !== undefined) {
      if (
        status !== 'on_duty' &&
        status !== 'crafting' &&
        status !== 'break' &&
        status !== 'off_duty'
      ) {
        res.status(400).json({ error: 'Invalid staff shift status.' });
        return;
      }
      target.status = status;
    }
    if (shopId !== undefined) {
      const branch = (db.shops || SEED_SHOPS).find((s) => s.id === String(shopId));
      if (branch) {
        target.shopId = branch.id;
        target.shopName = branch.name;
        target.barangay = branch.barangay;
      }
    }
    if (name) target.name = String(name).trim().slice(0, 64);
    if (role) target.role = String(role).trim().slice(0, 64);
    if (station) target.station = String(station).trim().slice(0, 64);
    if (shiftWindow) target.shiftWindow = String(shiftWindow).trim().slice(0, 40);
    if (phoneExt) target.phoneExt = String(phoneExt).trim().slice(0, 24);

    saveDatabase(db);
    res.json({ ok: true, staff: target });
  });

  app.delete('/api/admin/staff/:staffId', (req: Request, res: Response) => {
    const db = loadDatabase();
    const adminUser = requireAdminUser(req, res, db);
    if (!adminUser) return;

    const { staffId } = req.params;
    const before = (db.staff || []).length;
    db.staff = (db.staff || []).filter((s) => s.id !== staffId);
    if (db.staff.length === before) {
      res.status(404).json({ error: 'Dagupan staff member not found.' });
      return;
    }

    for (const state of Object.values(db.userStates)) {
      if (!Array.isArray(state.orders)) continue;
      for (const ord of state.orders as StoredOrderItem[]) {
        if (ord.assignedStaffId === staffId) {
          ord.assignedStaffId = undefined;
          ord.assignedStaffName = undefined;
        }
      }
    }
    if (Array.isArray(db.guestTickets)) {
      for (const ord of db.guestTickets) {
        if (ord.assignedStaffId === staffId) {
          ord.assignedStaffId = undefined;
          ord.assignedStaffName = undefined;
        }
      }
    }

    saveDatabase(db);
    res.json({ ok: true, staffId });
  });

  app.patch('/api/admin/shops/:shopId', (req: Request, res: Response) => {
    const db = loadDatabase();
    const adminUser = requireAdminUser(req, res, db);
    if (!adminUser) return;

    const { shopId } = req.params;
    if (!Array.isArray(db.shops)) db.shops = SEED_SHOPS.map((s) => ({ ...s }));
    const target = db.shops.find((s) => s.id === shopId);
    if (!target) {
      res.status(404).json({ error: 'Dagupan atelier branch not found.' });
      return;
    }

    const { pickupPrepMin, pickupHours, counterDesk, specialty, street, isOpen } =
      req.body || {};
    if (pickupPrepMin !== undefined) {
      const val = Number(pickupPrepMin);
      if (Number.isFinite(val) && val >= 5 && val <= 180) {
        target.pickupPrepMin = Math.round(val);
      }
    }
    if (pickupHours) target.pickupHours = String(pickupHours).trim().slice(0, 80);
    if (counterDesk) target.counterDesk = String(counterDesk).trim().slice(0, 80);
    if (specialty) target.specialty = String(specialty).trim().slice(0, 120);
    if (street) target.street = String(street).trim().slice(0, 160);
    if (typeof isOpen === 'boolean') target.isOpen = isOpen;

    saveDatabase(db);
    res.json({ ok: true, shop: target });
  });

  app.post('/api/admin/catalog', (req: Request, res: Response) => {
    const db = loadDatabase();
    const adminUser = requireAdminUser(req, res, db);
    if (!adminUser) return;

    const {
      name,
      shopId,
      category,
      occasion,
      price,
      stemCount,
      vaseLifeDays,
      fragrance,
      description,
      careTip,
      imageKey,
      defaultConfig,
    } = req.body || {};

    if (!name || !price || Number(price) <= 0) {
      res.status(400).json({ error: 'Bouquet name and positive price are required.' });
      return;
    }

    const branch = getBranchById(db, String(shopId || 'shop-lucao'));
    const validKey =
      imageKey === 'sampaguitaRose' ||
      imageKey === 'solarSunflower' ||
      imageKey === 'stargazerOrchid' ||
      imageKey === 'heroAtelier' ||
      imageKey === 'shopLucao' ||
      imageKey === 'shopTapuac' ||
      imageKey === 'tondaliganSunburst' ||
      imageKey === 'courtyardMedley' ||
      imageKey === 'benguetCrimson' ||
      imageKey === 'fiestaSampaguita' ||
      imageKey === 'cordilleraMauve'
        ? imageKey
        : 'sampaguitaRose';

    const newItem: StoredCatalogBouquet = {
      id: `bq-${crypto.randomBytes(4).toString('hex')}`,
      name: String(name).trim().slice(0, 90),
      shopId: branch.id,
      shopName: branch.name,
      barangay: branch.barangay,
      category:
        category === 'single_stems' ||
        category === 'tropical_native' ||
        category === 'dried_preserved'
          ? category
          : 'signature',
      occasion:
        occasion === 'sampaguita' || occasion === 'sympathy' || occasion === 'fiesta'
          ? occasion
          : 'romance',
      price: Math.max(100, Math.round(Number(price))),
      rating: 4.9,
      stemCount: Math.max(5, Math.min(36, Math.round(Number(stemCount || 12)))),
      vaseLifeDays: Math.max(3, Math.min(60, Math.round(Number(vaseLifeDays || 9)))),
      fragrance: String(fragrance || 'Fresh Benguet & Pangasinan Blooms').trim().slice(0, 80),
      description: String(
        description ||
          `Freshly hand-tied in Dagupan City at ${branch.name} for counter pickup.`,
      )
        .trim()
        .slice(0, 400),
      careTip: String(
        careTip || 'Trim stems at a 45° angle every two days and refresh cool water.',
      )
        .trim()
        .slice(0, 240),
      image: '',
      imageKey: validKey,
      inStock: true,
      defaultConfig: defaultConfig || {
        title: String(name).trim().slice(0, 80),
        stems: { rose: 5, sunflower: 2, stargazer: 1, orchid: 1, sampaguita: 3, eucalyptus: 3 },
        petalPalette: validKey === 'solarSunflower' ? 'solar' : validKey === 'stargazerOrchid' ? 'crimson' : 'blush',
        wrapStyle: 'kraft_linen',
        ribbonStyle: 'champagne',
      },
    };

    if (!Array.isArray(db.catalog)) db.catalog = SEED_CATALOG.map((c) => ({ ...c }));
    db.catalog.unshift(newItem);
    saveDatabase(db);
    res.status(201).json({ bouquet: newItem });
  });

  app.patch('/api/admin/catalog/:bouquetId', (req: Request, res: Response) => {
    const db = loadDatabase();
    const adminUser = requireAdminUser(req, res, db);
    if (!adminUser) return;

    const { bouquetId } = req.params;
    if (!Array.isArray(db.catalog)) db.catalog = SEED_CATALOG.map((c) => ({ ...c }));
    const target = db.catalog.find((c) => c.id === bouquetId);
    if (!target) {
      res.status(404).json({ error: 'Catalog bouquet not found.' });
      return;
    }

    const { name, price, inStock, shopId, vaseLifeDays, description, careTip, imageKey } =
      req.body || {};
    if (name) target.name = String(name).trim().slice(0, 90);
    if (price !== undefined) {
      const p = Number(price);
      if (Number.isFinite(p) && p >= 100) target.price = Math.round(p);
    }
    if (typeof inStock === 'boolean') target.inStock = inStock;
    if (shopId !== undefined) {
      const branch = getBranchById(db, String(shopId));
      target.shopId = branch.id;
      target.shopName = branch.name;
      target.barangay = branch.barangay;
    }
    if (vaseLifeDays !== undefined) {
      const d = Number(vaseLifeDays);
      if (Number.isFinite(d) && d >= 1 && d <= 90) target.vaseLifeDays = Math.round(d);
    }
    if (description) target.description = String(description).trim().slice(0, 400);
    if (careTip) target.careTip = String(careTip).trim().slice(0, 240);
    if (
      imageKey === 'sampaguitaRose' ||
      imageKey === 'solarSunflower' ||
      imageKey === 'stargazerOrchid' ||
      imageKey === 'heroAtelier' ||
      imageKey === 'shopLucao' ||
      imageKey === 'shopTapuac' ||
      imageKey === 'tondaliganSunburst' ||
      imageKey === 'courtyardMedley' ||
      imageKey === 'benguetCrimson' ||
      imageKey === 'fiestaSampaguita' ||
      imageKey === 'cordilleraMauve'
    ) {
      target.imageKey = imageKey;
    }

    saveDatabase(db);
    res.json({ ok: true, bouquet: target });
  });

  app.delete('/api/admin/catalog/:bouquetId', (req: Request, res: Response) => {
    const db = loadDatabase();
    const adminUser = requireAdminUser(req, res, db);
    if (!adminUser) return;

    const { bouquetId } = req.params;
    if (!Array.isArray(db.catalog)) db.catalog = SEED_CATALOG.map((c) => ({ ...c }));
    const before = db.catalog.length;
    db.catalog = db.catalog.filter((c) => c.id !== bouquetId);
    if (db.catalog.length === before) {
      res.status(404).json({ error: 'Catalog bouquet not found.' });
      return;
    }

    saveDatabase(db);
    res.json({ ok: true, bouquetId });
  });

  app.put('/api/user/state', (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const db = loadDatabase();
    const uid = db.sessions[token];
    if (!uid) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    const { cart, savedBouquets, orders, profileUpdates } = req.body || {};
    const current = db.userStates[uid] || { cart: [], savedBouquets: [], orders: [] };
    db.userStates[uid] = {
      cart: Array.isArray(cart) ? cart : current.cart,
      savedBouquets: Array.isArray(savedBouquets) ? savedBouquets : current.savedBouquets,
      orders: Array.isArray(orders) ? orders : current.orders,
    };

    if (profileUpdates && typeof profileUpdates === 'object') {
      const userIdx = db.users.findIndex((u) => u.uid === uid);
      if (userIdx >= 0) {
        if (profileUpdates.displayName) db.users[userIdx].displayName = String(profileUpdates.displayName).slice(0, 80);
        if (profileUpdates.phone) db.users[userIdx].phone = String(profileUpdates.phone).slice(0, 24);
        if (profileUpdates.barangay) db.users[userIdx].barangay = String(profileUpdates.barangay).slice(0, 64);
        if (profileUpdates.streetAddress) db.users[userIdx].streetAddress = String(profileUpdates.streetAddress).slice(0, 200);
      }
    }

    saveDatabase(db);
    res.json({ ok: true, state: db.userStates[uid] });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`FloraView Dagupan server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
