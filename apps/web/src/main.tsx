import { StrictMode, useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type DragEvent, type FormEvent, type ReactNode, type SetStateAction, type TextareaHTMLAttributes } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Camera,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Database,
  Download,
  FileText,
  FolderOpen,
  ExternalLink,
  LayoutDashboard,
  MapPin,
  Package,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  ActionFooter,
  BrandIdentity,
  CalcRow,
  DetailDrawer,
  Field,
  FilterTabs,
  FormSection,
  HistoryItem,
  InfoItem,
  KpiCard,
  LineItem,
  ListColumnTable,
  Panel,
  PriorityItem,
  RecordToolbar,
  SearchInput,
  SettingRow,
  StatusPill,
  type SearchSuggestion,
  type Tone,
} from './components/common';
import { buildActualInventoryItems, buildActualPartners, selectMockRows, type MockProductItemRow } from './data/mock/database';
import { formatMoney, formatMoneyInputValue, parseMoneyInputValue } from './lib/format';
import './styles.css';

declare global {
  interface Window {
    __seoyoungErpRoot?: ReturnType<typeof createRoot>;
  }
}

const BRAND_NAME = '경남차유리';
const SERVICE_NAME = `${BRAND_NAME} 업무관리`;
const LOGO_SRC = './gn-car-glass-logo.svg';
const LOGIN_STORAGE_KEYS = {
  autoLogin: 'seoyoung.login.autoLogin',
  rememberedId: 'seoyoung.login.rememberedId',
} as const;
const CARD_SALES_STORAGE_KEY = 'seoyoung.cardSales.overrides';

function readLoginStorageValue(key: string) {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLoginStorageValue(key: string, value: string) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Browser storage can be unavailable in privacy modes.
  }
}

function removeLoginStorageValue(key: string) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Browser storage can be unavailable in privacy modes.
  }
}

function readSearchParam(name: string) {
  if (typeof window === 'undefined') return null;

  return new URL(window.location.href).searchParams.get(name);
}

function readPositiveIntSearchParam(name: string, fallback: number) {
  const value = Number(readSearchParam(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readPageSearchParam(): PageId | null {
  const page = readSearchParam('page');
  return ALL_NAV_ITEMS.some((item) => item.id === page) ? (page as PageId) : null;
}

function readWorkViewSearchParam(): WorkerWorkView | null {
  const view = readSearchParam('workView');
  return view === 'calendar' || view === 'list' ? view : null;
}

function updateUrlSearchParams(updates: Record<string, string | null>) {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value.length === 0) {
      url.searchParams.delete(key);
      return;
    }

    url.searchParams.set(key, value);
  });
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

type PageId =
  | 'dashboard'
  | 'revenue'
  | 'sales'
  | 'purchase'
  | 'cardSales'
  | 'paymentList'
  | 'ledger'
  | 'warranty'
  | 'priceBook'
  | 'estimates'
  | 'work'
  | 'workKp'
  | 'workInsurance'
  | 'workBest'
  | 'workInbound'
  | 'schedule'
  | 'claims'
  | 'inventory'
  | 'statisticsKp'
  | 'statisticsBest'
  | 'statisticsInsurance'
  | 'statisticsInbound'
  | 'bulkManagementList'
  | 'integratedList'
  | 'partNumberList'
  | 'vehicles'
  | 'customers'
  | 'partners'
  | 'attachments'
  | 'sheetImport'
  | 'settings';

type NavItem = {
  id: PageId;
  label: string;
  icon: LucideIcon;
  count?: string;
};

type SidebarNavNode = {
  id: string;
  label: string;
  icon: LucideIcon;
  pageId?: PageId;
  count?: string;
  children?: SidebarNavNode[];
};

type SidebarNavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: SidebarNavNode[];
};

type SidebarNavPath = {
  group: SidebarNavGroup;
  node: SidebarNavNode;
  leaf?: SidebarNavNode;
};

type AppMode = 'worker' | 'admin' | 'db';
type WorkAppMode = Extract<AppMode, 'worker' | 'admin'>;

type ModeOption = {
  id: AppMode;
  label: string;
  icon: LucideIcon;
  defaultPage: PageId;
};

type EstimateStatus = '견적중' | '부품확인' | '확정' | '작업전환' | '취소';
type EstimateListStatus = '대기' | '재고확인' | '확정';
type EstimateOutsourceType = '일반' | '외주' | '소개';
type EstimateOutsourceFilter = 'all' | EstimateOutsourceType;
type EstimateStatusFilter = 'stock' | 'outsource' | 'intro';
type WorkStatus = '예정' | '진행중' | '완료' | '보류';
type WorkVisitType = '방문' | '출장' | '픽업' | '탁송';
type ClaimStatus = '청구대기' | '청구완료' | '일부입금' | '입금완료';
type GeneralTaskCategory = '일반' | '보험' | '재고' | '정산';
type EstimateTradeType = '개인' | '업체';

type Estimate = {
  no: string;
  estimateDate: string;
  estimatorName: string;
  tradeType: EstimateTradeType;
  outsourceType: EstimateOutsourceType;
  customer: string;
  phone: string;
  vehicle: string;
  plateNumber: string;
  vin: string;
  repair: string;
  area: string[];
  repairType: string;
  estimateContent: string;
  deductibleAmount?: number;
  tintAmount?: number;
  paymentAmount?: number;
  amount: number;
  status: EstimateStatus;
  source: string;
  createdAt: string;
  scheduledWorkDate?: string;
  scheduledWorkTime?: string;
  scheduledVisit?: WorkVisitType;
  scheduledTechnician?: string;
};

type WorkOrder = {
  time: string;
  customer: string;
  vehicle: string;
  repair: string;
  visit: WorkVisitType;
  address: string;
  technician: string;
  status: WorkStatus;
  stock: string;
};

type GeneralTask = {
  time: string;
  title: string;
  category: GeneralTaskCategory;
  detail: string;
  owner: string;
  status: WorkStatus;
};

type CalendarEntry = { kind: 'work'; order: WorkOrder } | { kind: 'todo'; task: GeneralTask };
type CalendarEntryRef = { kind: 'work' | 'todo'; index: number };
type CalendarPanelMode = 'list' | 'detail';
type WorkRuntimeStatus = WorkStatus | '완료대기';
type WorkRuntimeNow = { dateKey: string; minutes: number };
type WorkListFilter = 'all' | 'scheduled' | 'active' | 'done';
type WorkerWorkView = 'calendar' | 'list';
type WorkerWorkKind = '작업' | '일반';
type WorkPageSize = 20 | 50 | 100;
type WorkPaymentMethod = '카드' | '계좌이체';
type WorkPaymentEntry = {
  id: string;
  method: WorkPaymentMethod;
  amount: string;
  cardCompany: string;
  customCardCompany: string;
  bankName: string;
  customBankName: string;
  accountNumber: string;
  accountHolder: string;
};
type WorkerWorkSortKey =
  | 'date'
  | 'time'
  | 'division'
  | 'company'
  | 'customer'
  | 'vehicle'
  | 'plateNumber'
  | 'title'
  | 'stock'
  | 'insuranceClaimAmount'
  | 'paymentAmount'
  | 'status';
type WorkColumnFilterKey =
  | 'division'
  | 'company'
  | 'customer'
  | 'vehicle'
  | 'plateNumber'
  | 'title'
  | 'stock'
  | 'status'
  | 'owner'
  | 'visit'
  | 'paymentStatus';
type WorkColumnFilterRule = { id: string; key: WorkColumnFilterKey; value: string };
type WorkRecordDraft = Pick<
  WorkerWorkListRecord,
  'date' | 'time' | 'kind' | 'customer' | 'vehicle' | 'title' | 'owner' | 'location' | 'status' | 'stock' | 'paymentAmount' | 'paymentStatus' | 'payments'
> & {
  visit: WorkVisitType;
  memo: string;
};

type WorkRegistrationFormDraft = {
  date: string;
  visit: WorkVisitType;
  time: string;
  division: string;
  company: string;
  customer: string;
  vehicle: string;
  plateNumber: string;
  title: string;
  stock: string;
  insuranceClaimAmount: string;
  insurancePaidAmount: string;
  paymentAmount: string;
  paymentStatus: string;
  status: WorkStatus;
  owner: string;
  address: string;
};

type WorkerWorkListRecord = {
  id: string;
  date: string;
  time: string;
  kind: WorkerWorkKind;
  division: string;
  company: string;
  customer: string;
  vehicle: string;
  plateNumber: string;
  title: string;
  owner: string;
  location: string;
  status: WorkStatus;
  stock: string;
  insuranceClaimAmount: number;
  insurancePaidAmount: number;
  paymentAmount: number;
  paymentStatus: string;
  payments: WorkPaymentEntry[];
  addressPayload?: {
    roadAddress: string;
    detailAddress: string;
    latitude?: number;
    longitude?: number;
    source: string;
  };
  entry: CalendarEntry;
};

type WorkScheduleMoveRequest = {
  record: WorkerWorkListRecord;
  nextDate: string;
  nextTime: string;
  targetLabel: string;
};

type SortDirection = 'asc' | 'desc';

type ScheduleEventKind = '작업' | '일반' | '청구' | '휴무';
type ScheduleEvent = {
  id: string;
  date: string;
  time: string;
  kind: ScheduleEventKind;
  title: string;
  owner: string;
  target: string;
  status: string;
  memo: string;
};
type ScheduleFilter = 'all' | 'work' | 'general' | 'claim' | 'leave';

type PaymentScheduleStatus = '결제예정' | '결제완료' | '부분결제' | '연체';
type PaymentScheduleFilter = 'all' | 'scheduled' | 'paid' | 'partial' | 'overdue';
type PaymentScheduleGroupFilter = 'all' | 'purchase' | 'work' | 'transfer' | 'card' | 'cashOther';
type PaymentScheduleItem = {
  id: string;
  date: string;
  partner: string;
  item: string;
  amount: number;
  paidAmount: number;
  status: PaymentScheduleStatus;
  method: string;
  source: string;
  memo: string;
};
type PaymentCalendarHoliday = {
  date: string;
  name: string;
};
type AccountingDaySummary = {
  paymentCount: number;
  cardCount: number;
  accountCount: number;
  totalCount: number;
  paymentAmount: number;
  cardDepositAmount: number;
  accountReceiptAmount: number;
};
type PaymentCalendarCell = {
  key: string;
  day: string;
  date: string;
  payments: PaymentScheduleItem[];
  accountingSummary: AccountingDaySummary;
  holidayName?: string | undefined;
  isToday: boolean;
};
type PaymentScheduleDraft = {
  date: string;
  partner: string;
  item: string;
  amount: string;
  paidAmount: string;
  status: PaymentScheduleStatus;
  method: string;
  source: string;
  memo: string;
};

type PurchaseVariability = '고정' | '변동';
type PurchasePaymentStatus = PaymentScheduleStatus;
type PurchaseEntry = {
  id: string;
  baseMonth: string;
  paymentMonth: string;
  dueDate: string;
  variability: PurchaseVariability;
  category: string;
  partner: string;
  bank: string;
  accountNumber: string;
  amount: number;
  paidAmount: number;
  invoiceIssued: boolean;
  status: PurchasePaymentStatus;
  memo: string;
};
type PurchaseFilter = 'all' | 'fixed' | 'variable' | 'unpaid' | 'paid';
type PaymentRepeat = 'none' | 'monthly' | 'quarterly' | 'halfYear' | 'yearly';
type PaymentPeriodBasis = 'base' | 'payment' | 'custom';
type PaymentListSort = 'dueAsc' | 'dueDesc' | 'amountDesc' | 'partnerAsc';
type ManualPaymentRule = {
  id: string;
  startDate: string;
  partner: string;
  item: string;
  amount: number;
  paidAmount: number;
  variability: PurchaseVariability;
  category: string;
  bank: string;
  accountNumber: string;
  invoiceIssued: boolean;
  status: PurchasePaymentStatus;
  repeat: PaymentRepeat;
  endDate: string;
  memo: string;
};
type ManualPaymentDraft = {
  startDate: string;
  partner: string;
  item: string;
  amount: string;
  paidAmount: string;
  variability: PurchaseVariability;
  category: string;
  bank: string;
  accountNumber: string;
  invoiceIssued: 'Y' | 'N';
  status: PurchasePaymentStatus;
  repeat: PaymentRepeat;
  endDate: string;
  memo: string;
};
type PaymentListSourceItem = {
  id: string;
  baseMonth: string;
  paymentMonth: string;
  dueDate: string;
  variability: PurchaseVariability;
  category: string;
  partner: string;
  bank: string;
  accountNumber: string;
  amount: number;
  paidAmount: number;
  invoiceIssued: boolean;
  status: PurchasePaymentStatus;
  source: '구매관리' | '수기등록' | '작업';
  memo: string;
};
type PaymentPartnerAggregate = {
  key: string;
  baseMonth: string;
  paymentMonth: string;
  partner: string;
  amount: number;
  paidAmount: number;
  variability: string;
  category: string;
  bank: string;
  accountNumber: string;
  invoiceSummary: string;
  status: PurchasePaymentStatus;
  dueDateSummary: string;
  sourceSummary: string;
  entries: PaymentListSourceItem[];
};

type Claim = {
  no: string;
  customer: string;
  vehicle: string;
  type: string;
  insurer: string;
  claimAmount: number;
  paidAmount: number;
  customerAmount: number;
  status: ClaimStatus;
};

type InventoryItem = {
  partNo: string;
  name: string;
  spec: string;
  previousQty: string;
  inboundQty: string;
  outboundQty: string;
  stockQty: string;
  inboundPrice: string;
  outboundPrice: string;
  exchangePrice: string;
  note: string;
  usageScope: ProductUsageScope;
  compatible: string;
  location: string;
  stock: number;
  minimum: number;
  centerPrice: number;
  claimPrice: number;
  status: '정상' | '부족' | '확인필요';
};

type ProductSaleStatus = '판매완료' | '결제대기' | '출고대기' | '입고대기';
type ProductSaleType = '상품판매' | '매입입고';
type ProductUsageScope = '작업용' | '판매용' | '공용';

type ProductSale = {
  no: string;
  date: string;
  type: ProductSaleType;
  customer: string;
  tradeType: EstimateTradeType;
  itemName: string;
  partNo: string;
  qty: number;
  purchasePrice: number;
  salePrice: number;
  paymentMethod: string;
  stockAfter: number;
  status: ProductSaleStatus;
  tone: Tone;
};

type RevenuePeriod = 'day' | 'week' | 'month' | 'year' | 'custom';
type RevenueStream = 'all' | 'work' | 'sales';

type RevenuePoint = {
  label: string;
  work: number;
  sales: number;
};

type RevenueDateRange = {
  start: string;
  end: string;
};

type RevenueLedgerSummary = {
  label: string;
  kp: number;
  insurance: number;
  best: number;
  inbound: number;
  retail: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  vin: string;
  totalSales: number;
  unpaid: number;
  lastWork: string;
  memo: string;
  files: string[];
};

type CustomerFilter = 'all' | 'unpaid' | 'clear' | 'recent';
type EstimateFilter = 'all' | 'pending' | 'ready' | 'parts';
type ClaimFilter = 'all' | 'wait' | 'partial' | 'paid';
type InventoryStockFilter = 'all' | 'hasStock' | 'emptyStock' | 'negativeStock';
type InventoryMovementFilter = 'all' | 'inbound' | 'outbound' | 'changed' | 'noMovement';
type InventoryPriceFilter = 'all' | 'hasInboundPrice' | 'hasOutboundPrice' | 'hasExchangePrice' | 'missingPrice';
type InventorySort = 'codeAsc' | 'nameAsc' | 'stockDesc' | 'stockAsc' | 'inboundDesc' | 'outboundDesc';
type InventoryColumnFilterKey =
  | 'partNo'
  | 'name'
  | 'spec'
  | 'previousQty'
  | 'inboundQty'
  | 'outboundQty'
  | 'stockQty'
  | 'inboundPrice'
  | 'outboundPrice'
  | 'exchangePrice'
  | 'note';
type InventoryColumnFilterRule = { id: string; key: InventoryColumnFilterKey; value: string };
type InventorySearchState = {
  code: string;
  name: string;
  spec: string;
  note: string;
  stock: InventoryStockFilter;
  movement: InventoryMovementFilter;
  price: InventoryPriceFilter;
  sort: InventorySort;
};
type SalesProductFilter = 'all' | 'saleOnly' | 'shared' | 'alert' | 'ready';
type PartnerFilter = 'all' | 'shop' | 'insurer' | 'supplier';
type AttachmentFilter = 'all' | 'estimate' | 'claim' | 'work' | 'base';
type SheetImportFilter = 'all' | 'core' | 'reference' | 'finance' | 'document' | 'secure';
type LedgerSheetId = 'salesLedger' | 'kp' | 'insurance' | 'estimate' | 'best' | 'inbound' | 'repairShop' | 'cardLedger';
type WarrantyFilter = 'all' | 'unissued' | 'issued' | 'check';
type PriceBookFilter = 'all' | 'best' | 'service' | 'tint' | 'filmCut';
type WarrantyStatus = '미발행' | '발행완료' | '확인필요';
type LedgerCategory = '일반' | 'KP' | '보험' | '베스트' | '입고지원' | '견적' | '정비공장' | '카드';
type CalendarView = 'day' | 'week' | 'month' | 'year';

type DashboardShortcut = {
  title: string;
  url: string;
};

type Partner = {
  name: string;
  type: string;
  manager: string;
  phone: string;
  unpaid: number;
  files: string;
};

type AttachmentItem = {
  name: string;
  target: string;
  type: '견적' | '청구' | '작업' | '기준정보';
  owner: string;
};

type SheetReviewItem = {
  sheet: string;
  role: string;
  module: string;
  dbTarget: string;
  action: string;
  status: string;
  risk: string;
  tone: Tone;
  filter: SheetImportFilter;
  rows: string;
  notes: string;
  sampleFields: string[];
};

type StagingRecord = {
  source: string;
  title: string;
  target: string;
  owner: string;
  status: string;
  next: string;
  tone: Tone;
};

type ModelCandidate = {
  name: string;
  purpose: string;
  fields: string[];
};

type LedgerRecord = {
  no: string;
  date: string;
  time: string;
  category: LedgerCategory;
  company: string;
  partner: string;
  vehicle: string;
  work: string;
  partNo: string;
  plate: string;
  claimAmount: number;
  dueDate: string;
  depositAmount: number;
  paymentAmount: number;
  paymentMethod: string;
  memo: string;
  status: string;
  tone: Tone;
};

type LedgerSheetRow = {
  key: string;
  searchText: string;
  cells: ReactNode[];
  amount: number;
  status: string;
};

type CardSettlement = {
  workDate?: string;
  date: string;
  category?: string;
  company?: string;
  brand: string;
  vehicle?: string;
  plate: string;
  amount: number;
  paid: number;
  depositDate?: string;
  feeRate: string;
  status: string;
  tone: Tone;
  source?: string;
};

type AddressSearchResult = {
  id: string;
  placeName: string;
  roadAddress: string;
  jibunAddress: string;
  latitude: number;
  longitude: number;
  postalCode?: string;
};

type WarrantyRecord = {
  id: string;
  type: string;
  workDate: string;
  customerName: string;
  customerPhone: string;
  vehicle: string;
  plate: string;
  workDescription: string;
  partNo: string;
  frontFilm: string;
  sideFirstFilm: string;
  sideRearFilm: string;
  repairContent: string;
  status: WarrantyStatus;
  tone: Tone;
};

type WarrantyDraft = WarrantyRecord & {
  memo: string;
};

type PriceBookRow = {
  id: string;
  source: '베스트단가표' | '썬팅' | '필름재단';
  category: string;
  target: string;
  item: string;
  spec: string;
  price?: number;
  width?: string;
  height?: string;
  vatIncluded?: boolean;
  memo?: string;
  tone: Tone;
};

type ProductListField = 'itemCode' | 'itemName' | 'spec' | 'inboundPrice' | 'outboundPrice' | 'exchangePrice' | 'note';

type ProductListRow = MockProductItemRow & {
  id: string;
};

type ProductListDraft = Record<ProductListField, string>;

type EstimateConversion = {
  date: string;
  owner: string;
  vehicle: string;
  plate: string;
  estimate: string;
  next: string;
  tone: Tone;
};

type VehicleInfoCategory = '차량정보' | '필름재단';

type VehicleCatalogItem = {
  id: string;
  brand: string;
  model: string;
  series: string;
  yearRange: string;
  category: string;
  infoCategory?: VehicleInfoCategory;
  filmCutWidth?: string;
  filmCutHeight?: string;
  filmCutNote?: string;
  aliases: string[];
  source: string;
  memo: string;
  updatedAt: string;
  usageCount: number;
};

type VehicleCatalogDraft = {
  brand: string;
  model: string;
  series: string;
  yearRange: string;
  category: string;
  infoCategory: VehicleInfoCategory;
  filmCutWidth: string;
  filmCutHeight: string;
  filmCutNote: string;
  aliases: string;
  memo: string;
};

type VehicleCatalogFilter = 'all' | 'domestic' | 'imported' | 'filmCut' | 'recent';

type VehicleSuggestionSet = {
  lookup: string[];
  model: string[];
  brand: string[];
  yearRange: string[];
};

type GlobalSearchSuggestion = {
  id: string;
  value: string;
  label: string;
  detail: string;
  pageId: PageId;
  customerId?: string;
};

type CustomerLinkedSectionId = 'vehicle' | 'estimates' | 'work' | 'claims' | 'sales' | 'attachments';

type CustomerLinkedItem = {
  id: string;
  title: string;
  detail: string;
  pageId: PageId;
  meta?: string;
  status?: string;
  tone?: Tone;
};

type CustomerLinkedSection = {
  id: CustomerLinkedSectionId;
  title: string;
  icon: LucideIcon;
  pageId: PageId;
  countLabel: string;
  detail: string;
  emptyLabel: string;
  items: CustomerLinkedItem[];
};

function compactTextParts(parts: Array<string | number | undefined | null>) {
  return parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}

function normalizeLinkedText(value: string | number | undefined | null) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function splitCustomerVehicle(customer: Customer) {
  const [model = '', plate = ''] = customer.vehicle.split('/').map((part) => part.trim());
  return { model, plate };
}

function customerVehicleAliases(customer: Customer) {
  const { model, plate } = splitCustomerVehicle(customer);
  const aliases = new Set<string>();

  [customer.vehicle, model, plate, customer.vin].forEach((value) => {
    const normalized = normalizeLinkedText(value);
    if (normalized.length >= 2) aliases.add(normalized);
  });

  model
    .split(/\s+/)
    .slice(1)
    .forEach((token) => {
      const normalized = normalizeLinkedText(token);
      if (normalized.length >= 2) aliases.add(normalized);
    });

  return Array.from(aliases);
}

function matchesCustomerRecord(customer: Customer, parts: Array<string | number | undefined | null>) {
  const target = normalizeLinkedText(parts.join(' '));
  if (!target) return false;

  const directTokens = [customer.name, customer.phone, customer.vin].map(normalizeLinkedText).filter(Boolean);
  if (directTokens.some((token) => target.includes(token))) return true;

  return customerVehicleAliases(customer).some((alias) => target.includes(alias));
}

function matchesCustomerIdentity(customer: Customer, parts: Array<string | number | undefined | null>) {
  const target = normalizeLinkedText(parts.join(' '));
  if (!target) return false;

  return [customer.name, customer.phone, customer.vin].map(normalizeLinkedText).filter(Boolean).some((token) => target.includes(token));
}

function firstLine(value: string) {
  return value.split('\n')[0]?.trim() || value;
}

function countLabel(count: number, unit = '건') {
  return `${count}${unit}`;
}

function sectionDetail(items: CustomerLinkedItem[], emptyLabel: string) {
  return items[0]?.title ? `최근 ${items[0].title}` : emptyLabel;
}

function buildCustomerLinkedSections(customer: Customer): CustomerLinkedSection[] {
  const { model, plate } = splitCustomerVehicle(customer);
  const vehicleItems: CustomerLinkedItem[] = [
    {
      id: `vehicle-${customer.id}`,
      title: customer.vehicle,
      detail: compactTextParts([model, plate, customer.vin]),
      pageId: 'vehicles',
      status: '차량',
      tone: 'blue',
    },
  ];
  const estimateItems: CustomerLinkedItem[] = estimates
    .filter((estimate) =>
      matchesCustomerRecord(customer, [
        estimate.no,
        estimate.customer,
        estimate.phone,
        estimate.vehicle,
        estimate.repair,
        estimate.area.join(' '),
      ]),
    )
    .map((estimate) => ({
      id: `estimate-${estimate.no}`,
      title: estimate.no,
      detail: compactTextParts([estimate.estimateDate, estimate.customer, estimate.vehicle, estimate.repair]),
      pageId: 'estimates',
      meta: formatMoney(estimate.amount),
      status: estimate.status,
      tone: statusTone(estimate.status),
    }));
  const workItems: CustomerLinkedItem[] = workerWorkListRecords
    .filter((record) =>
      matchesCustomerRecord(customer, [
        record.id,
        record.date,
        record.time,
        record.customer,
        record.vehicle,
        record.plateNumber,
        record.title,
        record.company,
        record.location,
        record.stock,
      ]),
    )
    .map((record) => ({
      id: `work-${record.id}`,
      title: firstLine(record.title),
      detail: compactTextParts([record.date, record.time, record.customer, record.vehicle, record.owner]),
      pageId: 'work',
      status: record.status,
      tone: statusTone(record.status),
    }));
  const claimItems: CustomerLinkedItem[] = claims
    .filter((claim) =>
      matchesCustomerRecord(customer, [claim.no, claim.customer, claim.vehicle, claim.type, claim.insurer, claim.status]),
    )
    .map((claim) => ({
      id: `claim-${claim.no}`,
      title: claim.no,
      detail: compactTextParts([claim.type, claim.insurer, claim.customer, claim.vehicle]),
      pageId: 'claims',
      meta: formatMoney(claim.claimAmount || claim.customerAmount),
      status: claim.status,
      tone: statusTone(claim.status),
    }));
  const saleItems: CustomerLinkedItem[] = productSales
    .filter((sale) =>
      matchesCustomerIdentity(customer, [
        sale.no,
        sale.customer,
        sale.itemName,
        sale.partNo,
        sale.paymentMethod,
        sale.status,
      ]),
    )
    .map((sale) => ({
      id: `sale-${sale.no}`,
      title: sale.no,
      detail: compactTextParts([sale.date, sale.type, sale.customer, sale.itemName, sale.partNo]),
      pageId: 'sales',
      meta: formatMoney(sale.salePrice || sale.purchasePrice),
      status: sale.status,
      tone: statusTone(sale.status),
    }));
  const attachmentItems: CustomerLinkedItem[] = [
    ...attachments
      .filter((file) => matchesCustomerRecord(customer, [file.name, file.target, file.type, file.owner]))
      .map((file) => ({
        id: `attachment-${file.name}`,
        title: file.name,
        detail: compactTextParts([file.type, file.target, file.owner]),
        pageId: 'attachments' as PageId,
        status: file.type,
        tone: statusTone(file.type),
      })),
    ...customer.files.map((fileName, index) => ({
      id: `customer-file-${customer.id}-${index}`,
      title: fileName,
      detail: compactTextParts(['고객 기본 자료', customer.name]),
      pageId: 'attachments' as PageId,
      status: '자료',
      tone: 'gray' as Tone,
    })),
  ];

  return [
    {
      id: 'vehicle',
      title: '차량',
      icon: Car,
      pageId: 'vehicles',
      countLabel: countLabel(vehicleItems.length, '대'),
      detail: compactTextParts([model, plate, customer.vin]),
      emptyLabel: '연결 차량 없음',
      items: vehicleItems,
    },
    {
      id: 'estimates',
      title: '견적',
      icon: FileText,
      pageId: 'estimates',
      countLabel: countLabel(estimateItems.length),
      detail: sectionDetail(estimateItems, '연결 견적 없음'),
      emptyLabel: '연결된 견적이 없습니다.',
      items: estimateItems,
    },
    {
      id: 'work',
      title: '작업',
      icon: Wrench,
      pageId: 'work',
      countLabel: countLabel(workItems.length),
      detail: sectionDetail(workItems, '연결 작업 없음'),
      emptyLabel: '연결된 작업이 없습니다.',
      items: workItems,
    },
    {
      id: 'claims',
      title: '청구',
      icon: ReceiptText,
      pageId: 'claims',
      countLabel: countLabel(claimItems.length),
      detail: customer.unpaid > 0 ? `미수 ${formatMoney(customer.unpaid)}` : sectionDetail(claimItems, '미수 없음'),
      emptyLabel: '연결된 청구가 없습니다.',
      items: claimItems,
    },
    {
      id: 'sales',
      title: '판매',
      icon: CreditCard,
      pageId: 'sales',
      countLabel: countLabel(saleItems.length),
      detail: sectionDetail(saleItems, '연결 판매 없음'),
      emptyLabel: '연결된 판매가 없습니다.',
      items: saleItems,
    },
    {
      id: 'attachments',
      title: '자료',
      icon: FolderOpen,
      pageId: 'attachments',
      countLabel: countLabel(attachmentItems.length, '개'),
      detail: sectionDetail(attachmentItems, '연결 자료 없음'),
      emptyLabel: '연결된 자료가 없습니다.',
      items: attachmentItems,
    },
  ];
}

function buildCustomerSearchTokens(customer: Customer, sections?: CustomerLinkedSection[]) {
  const activeSections = sections ?? buildCustomerLinkedSections(customer);

  return [
    customer.name,
    customer.phone,
    customer.vehicle,
    customer.vin,
    customer.memo,
    customer.lastWork,
    ...activeSections.flatMap((section) => [
      section.title,
      section.countLabel,
      section.detail,
      ...section.items.flatMap((item) => [item.title, item.detail, item.meta, item.status]),
    ]),
  ].filter((value): value is string => Boolean(value));
}

function buildGlobalSearchSuggestions(vehicleSuggestions: VehicleSuggestionSet): GlobalSearchSuggestion[] {
  const suggestions: GlobalSearchSuggestion[] = [];
  const seen = new Set<string>();

  function addSuggestion(suggestion: GlobalSearchSuggestion) {
    const key = `${suggestion.pageId}|${suggestion.value}|${suggestion.label}|${suggestion.detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push(suggestion);
  }

  ALL_NAV_ITEMS.forEach((item) => {
    addSuggestion({
      id: `page-${item.id}`,
      value: item.label,
      label: item.label,
      detail: '화면 바로가기',
      pageId: item.id,
    });
  });

  customers.forEach((customer) => {
    addSuggestion({
      id: `customer-${customer.id}`,
      value: customer.name,
      label: customer.name,
      detail: compactTextParts(['고객', customer.phone, customer.vehicle]),
      pageId: 'customers',
      customerId: customer.id,
    });
  });

  estimates.forEach((estimate) => {
    addSuggestion({
      id: `estimate-${estimate.no}`,
      value: estimate.no,
      label: compactTextParts([estimate.no, estimate.customer]),
      detail: compactTextParts(['견적', estimate.vehicle, estimate.repair]),
      pageId: 'estimates',
    });
  });

  workerWorkListRecords.forEach((record) => {
    addSuggestion({
      id: `work-${record.id}`,
      value: record.plateNumber || record.customer,
      label: compactTextParts([record.customer, record.plateNumber]),
      detail: compactTextParts(['작업', record.date, record.vehicle, record.title]),
      pageId: 'work',
    });
  });

  claims.forEach((claim) => {
    addSuggestion({
      id: `claim-${claim.no}`,
      value: claim.no,
      label: compactTextParts([claim.no, claim.customer]),
      detail: compactTextParts(['청구', claim.vehicle, claim.insurer, claim.status]),
      pageId: 'claims',
    });
  });

  productSales.forEach((sale) => {
    addSuggestion({
      id: `sale-${sale.no}`,
      value: sale.partNo,
      label: compactTextParts([sale.partNo, sale.itemName]),
      detail: compactTextParts(['판매', sale.customer, sale.status]),
      pageId: 'sales',
    });
  });

  inventory.slice(0, 40).forEach((item) => {
    addSuggestion({
      id: `inventory-${item.partNo}`,
      value: item.partNo,
      label: compactTextParts([item.partNo, item.name]),
      detail: compactTextParts(['재고', item.spec, `${item.stockQty || item.stock}개`]),
      pageId: 'inventory',
    });
  });

  partners.slice(0, 40).forEach((partner, index) => {
    addSuggestion({
      id: `partner-${index}-${partner.name}`,
      value: partner.name,
      label: partner.name,
      detail: compactTextParts(['거래처', partner.type, partner.manager, partner.phone]),
      pageId: 'partners',
    });
  });

  attachments.forEach((file) => {
    addSuggestion({
      id: `attachment-${file.name}`,
      value: file.name,
      label: file.name,
      detail: compactTextParts(['자료', file.target, file.owner]),
      pageId: 'attachments',
    });
  });

  vehicleSuggestions.lookup.slice(0, 24).forEach((vehicle, index) => {
    addSuggestion({
      id: `vehicle-${index}-${vehicle}`,
      value: vehicle,
      label: vehicle,
      detail: '차량 정보 후보',
      pageId: 'vehicles',
    });
  });

  return suggestions;
}

const WORKER_NAV_GROUPS: SidebarNavGroup[] = [
  {
    id: 'overview',
    label: '홈',
    icon: LayoutDashboard,
    items: [{ id: 'worker-dashboard', label: '홈', icon: LayoutDashboard, pageId: 'dashboard' }],
  },
  {
    id: 'work',
    label: '작업',
    icon: Wrench,
    items: [
      { id: 'worker-estimates', label: '견적', icon: FileText, pageId: 'estimates', count: '7' },
      {
        id: 'worker-work',
        label: '작업',
        icon: CalendarDays,
        pageId: 'work',
        count: '7',
        children: [
          { id: 'worker-work-integrated', label: '통합', icon: LayoutDashboard, pageId: 'work' },
          { id: 'worker-work-kp', label: 'KP', icon: ReceiptText, pageId: 'workKp' },
          { id: 'worker-work-insurance', label: '보험', icon: ShieldCheck, pageId: 'workInsurance' },
          { id: 'worker-work-best', label: '베스트', icon: CheckCircle2, pageId: 'workBest' },
          { id: 'worker-work-inbound', label: '입고지원', icon: Package, pageId: 'workInbound' },
        ],
      },
      { id: 'worker-claims', label: '청구', icon: ReceiptText, pageId: 'claims', count: '4' },
    ],
  },
  {
    id: 'sales',
    label: '판매',
    icon: WalletCards,
    items: [
      { id: 'worker-sales', label: '판매 관리', icon: WalletCards, pageId: 'sales', count: '4' },
      { id: 'worker-sales-inventory', label: '재고관리', icon: Package, pageId: 'inventory' },
      { id: 'worker-purchase', label: '구매관리', icon: Package, pageId: 'purchase', count: '2' },
    ],
  },
  {
    id: 'statistics',
    label: '통계',
    icon: ReceiptText,
    items: [
      { id: 'worker-revenue', label: '매출', icon: ReceiptText, pageId: 'revenue', count: '월' },
      { id: 'worker-statistics-kp', label: 'KP', icon: ReceiptText, pageId: 'statisticsKp' },
      { id: 'worker-statistics-best', label: '베스트', icon: CheckCircle2, pageId: 'statisticsBest' },
      { id: 'worker-statistics-insurance', label: '보험', icon: ShieldCheck, pageId: 'statisticsInsurance' },
      { id: 'worker-statistics-inbound', label: '입고지원', icon: Package, pageId: 'statisticsInbound' },
    ],
  },
];

const ADMIN_NAV_GROUPS: SidebarNavGroup[] = [
  {
    id: 'overview',
    label: '홈',
    icon: LayoutDashboard,
    items: [{ id: 'admin-dashboard', label: '홈', icon: LayoutDashboard, pageId: 'dashboard' }],
  },
  {
    id: 'management',
    label: '관리',
    icon: ShieldCheck,
    items: [
      { id: 'admin-schedule', label: '회계 일정 관리', icon: CalendarDays, pageId: 'schedule', count: '5' },
      { id: 'admin-card-sales', label: '카드매출', icon: CreditCard, pageId: 'cardSales' },
      { id: 'admin-payment-list', label: '대금결제리스트', icon: Database, pageId: 'paymentList' },
      { id: 'admin-warranty', label: '보증서', icon: ShieldCheck, pageId: 'warranty', count: '3' },
    ],
  },
];

const DB_NAV_GROUPS: SidebarNavGroup[] = [
  {
    id: 'inventory',
    label: '재고',
    icon: Package,
    items: [{ id: 'db-inventory', label: '재고관리', icon: Package, pageId: 'inventory', count: '2' }],
  },
  {
    id: 'part-number-list',
    label: '품목리스트',
    icon: FileText,
    items: [{ id: 'db-part-number-list', label: '품목리스트', icon: FileText, pageId: 'partNumberList' }],
  },
  {
    id: 'vehicles',
    label: '차량 정보',
    icon: Car,
    items: [{ id: 'db-vehicles', label: '차량 정보', icon: Car, pageId: 'vehicles' }],
  },
  {
    id: 'attachments',
    label: '자료',
    icon: FolderOpen,
    items: [{ id: 'db-attachments', label: '자료', icon: FolderOpen, pageId: 'attachments' }],
  },
  {
    id: 'customers',
    label: '고객',
    icon: UsersRound,
    items: [{ id: 'db-customers', label: '고객', icon: UsersRound, pageId: 'customers' }],
  },
];

function sidebarGroupsForMode(mode: AppMode) {
  if (mode === 'worker') return WORKER_NAV_GROUPS;
  if (mode === 'admin') return ADMIN_NAV_GROUPS;
  return DB_NAV_GROUPS;
}

function collectSidebarNavItems(groups: SidebarNavGroup[]) {
  const items: NavItem[] = [];

  function collectNode(node: SidebarNavNode) {
    if (node.pageId) {
      const item: NavItem = { id: node.pageId, label: node.label, icon: node.icon };
      if (node.count !== undefined) item.count = node.count;
      items.push(item);
    }

    node.children?.forEach(collectNode);
  }

  groups.forEach((group) => group.items.forEach(collectNode));
  return items;
}

function findNodeByPageId(nodes: SidebarNavNode[] | undefined, pageId: PageId): SidebarNavNode | null {
  if (!nodes) return null;

  for (const node of nodes) {
    const child = findNodeByPageId(node.children, pageId);
    if (child) return child;
    if (node.pageId === pageId) return node;
  }

  return null;
}

function findSidebarNavPath(mode: AppMode, pageId: PageId): SidebarNavPath | null {
  for (const group of sidebarGroupsForMode(mode)) {
    for (const node of group.items) {
      const leaf = findNodeByPageId(node.children, pageId);
      if (leaf) return { group, node, leaf };
      if (node.pageId === pageId) return { group, node };
    }
  }

  return null;
}

function nodeContainsPage(node: SidebarNavNode, pageId: PageId) {
  return node.pageId === pageId || Boolean(findNodeByPageId(node.children, pageId));
}

const ALL_NAV_ITEMS: NavItem[] = Array.from(
  new Map(
    [
      ...collectSidebarNavItems(WORKER_NAV_GROUPS),
      ...collectSidebarNavItems(ADMIN_NAV_GROUPS),
      ...collectSidebarNavItems(DB_NAV_GROUPS),
    ].map((item) => [item.id, item]),
  ).values(),
);

const MODE_OPTIONS: ModeOption[] = [
  { id: 'worker', label: '작업자', icon: UserRound, defaultPage: 'work' },
  { id: 'admin', label: '관리자', icon: ShieldCheck, defaultPage: 'dashboard' },
  { id: 'db', label: 'DB', icon: Database, defaultPage: 'inventory' },
];

const TOP_NAV_PAGE_IDS: PageId[] = ['dashboard', 'revenue', 'sales', 'estimates', 'work'];

const PLACEHOLDER_PAGE_IDS = new Set<PageId>([
  'workKp',
  'workInsurance',
  'workBest',
  'workInbound',
  'statisticsBest',
  'statisticsInsurance',
  'statisticsInbound',
  'bulkManagementList',
  'integratedList',
]);

const ESTIMATOR_OPTIONS = ['정보경', '정원철', '박승주'];
const ESTIMATE_LIST_STATUS_OPTIONS: EstimateListStatus[] = ['대기', '재고확인', '확정'];
const ESTIMATE_OUTSOURCE_OPTIONS: EstimateOutsourceType[] = ['일반', '외주', '소개'];
const ESTIMATE_DEFAULT_INSURANCE_TYPE = '자차';
const ESTIMATE_INSURANCE_TYPE_OPTIONS = [ESTIMATE_DEFAULT_INSURANCE_TYPE, '대물', '배상책임'];
const ESTIMATE_DEFAULT_PERIOD_START = '2026-06-01';
const ESTIMATE_DEFAULT_PERIOD_END = '2026-06-08';
const INQUIRY_SOURCE_OPTIONS = ['전화', '문자', '정비소 소개', '거래처', '방문', '글로벌 홈페이지'];
const CLAIM_TYPE_OPTIONS = ['일반', '자차', '대물(무과실)', '대물(과실)', '배상책임'];
const WORK_TYPE_OPTIONS = ['교체', '복원', '탈부착', '썬팅', '기타'];
const WORK_STATUS_OPTIONS: WorkStatus[] = ['예정', '진행중', '완료', '보류'];
const WORK_VISIT_OPTIONS: WorkVisitType[] = ['방문', '출장', '픽업', '탁송'];
const WORK_DIVISION_OPTIONS = ['일반', '보험', '입고지원', '업체', '베스트', 'KP'];
const PAYMENT_STATUS_OPTIONS = ['Y', 'N'];
const PAYMENT_METHOD_OPTIONS: WorkPaymentMethod[] = ['카드', '계좌이체'];
const CARD_COMPANY_OPTIONS = ['신한카드', '삼성카드', '현대카드', '롯데카드', 'KB국민카드', 'BC카드', 'NH농협카드', '하나카드', '우리카드', '기타'];
const BANK_OPTIONS = ['국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행', '부산은행', '경남은행', '카카오뱅크', '토스뱅크', '기타'];
const ADDRESS_SEARCH_RESULTS: AddressSearchResult[] = [
  {
    id: 'gn-glass-shop',
    placeName: '경남차유리 작업장',
    roadAddress: '울산광역시 남구 삼산로 255',
    jibunAddress: '울산광역시 남구 삼산동 1523-3',
    latitude: 35.5389,
    longitude: 129.3383,
    postalCode: '44705',
  },
  {
    id: 'ulsan-hyundai-bluehands',
    placeName: '언양현대블루핸즈',
    roadAddress: '울산광역시 울주군 언양읍 반구대로 130',
    jibunAddress: '울산광역시 울주군 언양읍 동부리 253-1',
    latitude: 35.5688,
    longitude: 129.1267,
    postalCode: '44946',
  },
  {
    id: 'daesung-motors',
    placeName: '정비소 대성모터스',
    roadAddress: '울산광역시 남구 산업로 625',
    jibunAddress: '울산광역시 남구 삼산동 1590-1',
    latitude: 35.5415,
    longitude: 129.3371,
    postalCode: '44716',
  },
  {
    id: 'global-partner',
    placeName: '글로벌',
    roadAddress: '울산광역시 북구 진장유통로 16',
    jibunAddress: '울산광역시 북구 진장동 285-3',
    latitude: 35.5766,
    longitude: 129.3558,
    postalCode: '44248',
  },
];
const GENERAL_TASK_CATEGORY_OPTIONS: GeneralTaskCategory[] = ['일반', '보험', '재고', '정산'];
const SCHEDULE_KIND_OPTIONS: ScheduleEventKind[] = ['작업', '일반', '청구', '휴무'];
const PAYMENT_SCHEDULE_STATUS_OPTIONS: PaymentScheduleStatus[] = ['결제예정', '결제완료', '부분결제', '연체'];
const PAYMENT_SCHEDULE_FILTER_OPTIONS: Array<{ id: PaymentScheduleFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'scheduled', label: '결제예정' },
  { id: 'paid', label: '결제완료' },
  { id: 'partial', label: '부분결제' },
  { id: 'overdue', label: '연체' },
];
const PAYMENT_SCHEDULE_GROUP_FILTER_OPTIONS: Array<{ id: PaymentScheduleGroupFilter; label: string }> = [
  { id: 'all', label: '전체 구분' },
  { id: 'purchase', label: '매입·입고' },
  { id: 'work', label: '작업·정산' },
  { id: 'transfer', label: '계좌이체' },
  { id: 'card', label: '카드결제' },
  { id: 'cashOther', label: '현금·기타' },
];
const KOREAN_WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const PAYMENT_CALENDAR_HOLIDAYS_BY_YEAR: Record<number, PaymentCalendarHoliday[]> = {
  2026: [
    { date: '2026.01.01', name: '신정' },
    { date: '2026.02.16', name: '설날 연휴' },
    { date: '2026.02.17', name: '설날' },
    { date: '2026.02.18', name: '설날 연휴' },
    { date: '2026.03.01', name: '삼일절' },
    { date: '2026.03.02', name: '대체공휴일' },
    { date: '2026.05.01', name: '근로자의 날' },
    { date: '2026.05.05', name: '어린이날' },
    { date: '2026.05.24', name: '부처님오신날' },
    { date: '2026.05.25', name: '대체공휴일' },
    { date: '2026.06.03', name: '지방선거일' },
    { date: '2026.06.06', name: '현충일' },
    { date: '2026.08.15', name: '광복절' },
    { date: '2026.08.17', name: '대체공휴일' },
    { date: '2026.09.24', name: '추석 연휴' },
    { date: '2026.09.25', name: '추석' },
    { date: '2026.09.26', name: '추석 연휴' },
    { date: '2026.10.03', name: '개천절' },
    { date: '2026.10.05', name: '대체공휴일' },
    { date: '2026.10.09', name: '한글날' },
    { date: '2026.12.25', name: '성탄절' },
  ],
  2027: [
    { date: '2027.01.01', name: '신정' },
    { date: '2027.02.06', name: '설날 연휴' },
    { date: '2027.02.07', name: '설날' },
    { date: '2027.02.08', name: '설날 연휴' },
    { date: '2027.02.09', name: '대체공휴일' },
    { date: '2027.03.01', name: '삼일절' },
    { date: '2027.05.01', name: '근로자의 날' },
    { date: '2027.05.05', name: '어린이날' },
    { date: '2027.05.13', name: '부처님오신날' },
    { date: '2027.06.06', name: '현충일' },
    { date: '2027.08.15', name: '광복절' },
    { date: '2027.08.16', name: '대체공휴일' },
    { date: '2027.09.14', name: '추석 연휴' },
    { date: '2027.09.15', name: '추석' },
    { date: '2027.09.16', name: '추석 연휴' },
    { date: '2027.10.03', name: '개천절' },
    { date: '2027.10.04', name: '대체공휴일' },
    { date: '2027.10.09', name: '한글날' },
    { date: '2027.10.11', name: '대체공휴일' },
    { date: '2027.12.25', name: '성탄절' },
    { date: '2027.12.27', name: '대체공휴일' },
  ],
};
const PURCHASE_FILTER_OPTIONS: Array<{ id: PurchaseFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'fixed', label: '고정' },
  { id: 'variable', label: '변동' },
  { id: 'unpaid', label: '미결' },
  { id: 'paid', label: '완료' },
];
const PAYMENT_REPEAT_OPTIONS: Array<{ id: PaymentRepeat; label: string; intervalMonths: number | null }> = [
  { id: 'none', label: '없음', intervalMonths: null },
  { id: 'monthly', label: '매월', intervalMonths: 1 },
  { id: 'quarterly', label: '3개월', intervalMonths: 3 },
  { id: 'halfYear', label: '6개월', intervalMonths: 6 },
  { id: 'yearly', label: '1년', intervalMonths: 12 },
];
const WORK_PAGE_SIZE_OPTIONS: WorkPageSize[] = [20, 50, 100];
const WORK_COLUMN_FILTER_OPTIONS: Array<{ key: WorkColumnFilterKey; label: string }> = [
  { key: 'division', label: '구분' },
  { key: 'company', label: '업체' },
  { key: 'customer', label: '거래처' },
  { key: 'vehicle', label: '차종' },
  { key: 'plateNumber', label: '차량번호' },
  { key: 'title', label: '작업내용' },
  { key: 'stock', label: '사용품번' },
  { key: 'status', label: '상태' },
  { key: 'owner', label: '견적서 작성자' },
  { key: 'visit', label: '방문 방식' },
  { key: 'paymentStatus', label: '결제여부' },
];
const INVENTORY_DEFAULT_SEARCH: InventorySearchState = {
  code: '',
  name: '',
  spec: '',
  note: '',
  stock: 'all',
  movement: 'all',
  price: 'all',
  sort: 'codeAsc',
};
const INVENTORY_COLUMN_FILTER_OPTIONS: Array<{ key: InventoryColumnFilterKey; label: string }> = [
  { key: 'partNo', label: '품목코드' },
  { key: 'name', label: '품목명' },
  { key: 'spec', label: '규격' },
  { key: 'previousQty', label: '전일재고' },
  { key: 'inboundQty', label: '입고수량' },
  { key: 'outboundQty', label: '출고수량' },
  { key: 'stockQty', label: '재고수량' },
  { key: 'inboundPrice', label: '입고단가' },
  { key: 'outboundPrice', label: '출고단가' },
  { key: 'exchangePrice', label: '교환단가' },
  { key: 'note', label: '적요' },
];
const REPAIR_AREA_OPTIONS = ['전면', '후면', '앞문(운)', '앞문(조)', '뒷문(운)', '뒷문(조)', '앞삼각(운)', '앞삼각(조)', 'QTR(운)', 'QTR(조)', '루프/파노라마', '기타'];
const VEHICLE_LOOKUP_SUGGESTIONS = ['11호5871', '12어0423', '46로6650', '울산12바5122', '제네시스 GV80', 'K5 JF', '니로 SG2', '아이오닉5'];
const PART_LOOKUP_SUGGESTIONS = ['86111-AT080', '86110-D4480', 'D4070(D5100)', '86111-3R660', '86110-3S190', '86110-3S151', 'AA140', 'AR020', 'GI030'];
const CUSTOMER_LOOKUP_SUGGESTIONS = ['김민수', '박지현', '최은우', '정비소 대성모터스', '강동산업', '010-4615-6770', '010-2823-3914'];
const VEHICLE_CATALOG_STORAGE_KEY = 'seoyoung.vehicleCatalog';
const DOMESTIC_VEHICLE_BRANDS = new Set(['현대', '기아', '제네시스']);

const CALENDAR_VIEWS: Array<{ id: CalendarView; label: string }> = [
  { id: 'day', label: '일' },
  { id: 'week', label: '주' },
  { id: 'month', label: '월' },
  { id: 'year', label: '년' },
];
const WORK_DAY_TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const workRef = (index: number): CalendarEntryRef => ({ kind: 'work', index });
const todoRef = (index: number): CalendarEntryRef => ({ kind: 'todo', index });

const WEEK_CALENDAR = [
  { day: '월', date: '18', entries: [workRef(0)] },
  { day: '화', date: '19', entries: [todoRef(1)] },
  { day: '수', date: '20', entries: [workRef(1), todoRef(0), workRef(2), todoRef(1), todoRef(2), workRef(3)] },
  { day: '목', date: '21', entries: [workRef(0)] },
  { day: '금', date: '22', entries: [workRef(2), todoRef(2)] },
  { day: '토', date: '23', entries: [] },
  { day: '일', date: '24', entries: [] },
];

const MONTH_ENTRY_DAYS = new Map<number, CalendarEntryRef[]>([
  [7, [workRef(0)]],
  [12, [workRef(2)]],
  [19, [todoRef(1)]],
  [20, [workRef(1), todoRef(0), workRef(2), todoRef(1), todoRef(2), workRef(3)]],
  [21, [workRef(0)]],
  [22, [workRef(2), todoRef(2)]],
  [26, [workRef(1)]],
]);

const YEAR_CALENDAR: Array<[string, string, string]> = [
  ['1월', '18건', '보험 7'],
  ['2월', '21건', '출장 8'],
  ['3월', '24건', '정비소 6'],
  ['4월', '20건', '미수 2'],
  ['5월', '29건', '오늘 7'],
  ['6월', '예정 9건', '예약 4'],
  ['7월', '예정 3건', '성수기 대비'],
  ['8월', '예정 2건', '휴가 일정'],
  ['9월', '예정 5건', '보험 2'],
  ['10월', '예정 4건', '출장 1'],
  ['11월', '예정 1건', '점검'],
  ['12월', '예정 2건', '마감'],
];

const estimates: Estimate[] = [
  {
    no: 'EST-2026-0017',
    estimateDate: '2026.06.02',
    estimatorName: '정보경',
    tradeType: '개인',
    outsourceType: '일반',
    customer: '김민수',
    phone: '010-1234-1234',
    vehicle: '제네시스 GV80',
    plateNumber: '00가1234',
    vin: 'KMHGV80A2136700601',
    repair: '전면유리 교체',
    area: ['전면유리', 'ADAS'],
    repairType: '보험(자차,대물)',
    estimateContent:
      'A2136700601(=4402/3203) // WINDSHIELD // 1237000\n* 센서/카메라 2EA/HUD/16~현재\n└ 0601은 열선이 있고\n└ 4402는 개선되어 나오면서 브라켓에 열선있음',
    deductibleAmount: 3000000,
    tintAmount: 2000000,
    paymentAmount: 500000,
    amount: 1280000,
    status: '확정',
    source: '카카오톡',
    createdAt: '06.02 10:14',
    scheduledWorkDate: '2026.06.03',
    scheduledWorkTime: '11:00',
    scheduledVisit: '출장',
    scheduledTechnician: '정하늘',
  },
  {
    no: 'EST-2026-0016',
    estimateDate: '2026.06.03',
    estimatorName: '정원철',
    tradeType: '개인',
    outsourceType: '소개',
    customer: '언양현대블루핸즈',
    phone: '010-5678-1234',
    vehicle: '기아 카니발',
    plateNumber: '울산006바2222',
    vin: 'KNAKA4A1234567890',
    repair: '도어유리 교체',
    area: ['조수석 도어유리'],
    repairType: '일반',
    estimateContent: '조수석 도어유리 교체\n부자재 포함 견적',
    deductibleAmount: 0,
    tintAmount: 0,
    paymentAmount: 360000,
    amount: 360000,
    status: '작업전환',
    source: '전화',
    createdAt: '06.03 09:32',
    scheduledWorkDate: '2026.06.04',
    scheduledWorkTime: '09:30',
    scheduledVisit: '방문',
    scheduledTechnician: '이준호',
  },
  {
    no: 'EST-2026-0015',
    estimateDate: '2026.06.04',
    estimatorName: '정원철',
    tradeType: '업체',
    outsourceType: '외주',
    customer: '정비소 대성모터스',
    phone: '052-268-5678',
    vehicle: '현대 스타리아',
    plateNumber: '00가5678',
    vin: 'KMHSTARIA987654321',
    repair: '후면유리 교체',
    area: ['후면유리', '열선'],
    repairType: '보험(자차)',
    estimateContent: '후면유리 교체\n열선 포함',
    deductibleAmount: 350000,
    tintAmount: 0,
    paymentAmount: 720000,
    amount: 720000,
    status: '부품확인',
    source: '정비소',
    createdAt: '06.04 16:40',
  },
  {
    no: 'EST-2026-0014',
    estimateDate: '2026.06.05',
    estimatorName: '정보경',
    tradeType: '개인',
    outsourceType: '일반',
    customer: '최은우',
    phone: '010-8899-5678',
    vehicle: 'BMW 520i',
    plateNumber: '00가1234',
    vin: 'WBA520I1234567890',
    repair: '스톤칩 복원',
    area: ['전면유리'],
    repairType: '보험(배상책임)',
    estimateContent: '전면유리 스톤칩 복원',
    deductibleAmount: 0,
    tintAmount: 0,
    paymentAmount: 85000,
    amount: 85000,
    status: '견적중',
    source: '방문',
    createdAt: '06.05 13:18',
  },
  {
    no: 'EST-2026-0013',
    estimateDate: '2026.06.08',
    estimatorName: '정보경',
    tradeType: '업체',
    outsourceType: '외주',
    customer: '글로벌',
    phone: '010-9999-5678',
    vehicle: '제네시스 GV80',
    plateNumber: '00가1234',
    vin: 'KMHGV80B2136700602',
    repair: '후면유리 탈부착',
    area: ['후면유리'],
    repairType: '보험(자차,대물)',
    estimateContent: '후면유리 탈부착\n외주 작업 연결',
    deductibleAmount: 350000,
    tintAmount: 0,
    paymentAmount: 1500000,
    amount: 1500000,
    status: '확정',
    source: '정비소',
    createdAt: '06.08 15:05',
  },
];

const workOrders: WorkOrder[] = [
  {
    time: '09:30',
    customer: '박지현',
    vehicle: '기아 카니발',
    repair: '조수석 도어유리 교체',
    visit: '방문',
    address: '경남차유리 작업장',
    technician: '이준호',
    status: '진행중',
    stock: 'GLS-KA-2041 1개',
  },
  {
    time: '11:00',
    customer: '김민수',
    vehicle: '제네시스 GV80',
    repair: '전면유리 교체 + ADAS',
    visit: '출장',
    address: '울산 남구 삼산동',
    technician: '정하늘',
    status: '예정',
    stock: 'G80-FR-ADAS 1개',
  },
  {
    time: '14:30',
    customer: '대성모터스',
    vehicle: '현대 스타리아',
    repair: '후면유리 교체',
    visit: '출장',
    address: '대성모터스 공업사',
    technician: '이준호',
    status: '예정',
    stock: 'STR-RR-H 1개',
  },
  {
    time: '17:00',
    customer: '최은우',
    vehicle: 'BMW 520i',
    repair: '스톤칩 복원',
    visit: '방문',
    address: '경남차유리 작업장',
    technician: '정하늘',
    status: '보류',
    stock: '복원 키트',
  },
];

const generalTasks: GeneralTask[] = [
  {
    time: '10:00',
    title: '보험 접수번호 확인',
    category: '보험',
    detail: '김민수 GV80 접수번호 받은 뒤 청구 준비',
    owner: '정하늘',
    status: '예정',
  },
  {
    time: '13:30',
    title: '부품 발주 확인',
    category: '재고',
    detail: 'GV80 전면유리 ADAS 입고 가능 시간 확인',
    owner: '이준호',
    status: '진행중',
  },
  {
    time: '16:00',
    title: '거래처 입금 확인',
    category: '정산',
    detail: '대성모터스 부분 입금 290,000원 확인',
    owner: '정하늘',
    status: '예정',
  },
];

const todayEntries: CalendarEntry[] = [
  ...workOrders.map((order) => ({ kind: 'work' as const, order })),
  ...generalTasks.map((task) => ({ kind: 'todo' as const, task })),
].sort((a, b) => entryTime(a).localeCompare(entryTime(b)));

const extraWorkListEntries: Array<{ date: string; entry: CalendarEntry }> = [
  {
    date: '2026.05.17',
    entry: {
      kind: 'work',
      order: {
        time: '10:30',
        customer: '서부카',
        vehicle: '현대 포터2',
        repair: '전면유리 교체',
        visit: '방문',
        address: '경남차유리 작업장',
        technician: '이준호',
        status: '완료',
        stock: 'PORTER-FR 1개',
      },
    },
  },
  {
    date: '2026.05.18',
    entry: {
      kind: 'work',
      order: {
        time: '15:00',
        customer: '글로벌',
        vehicle: '니로 SG2',
        repair: '전면유리 교환+썬팅',
        visit: '출장',
        address: '울산 울주군',
        technician: '정하늘',
        status: '완료',
        stock: '86111-AT080 1개',
      },
    },
  },
  {
    date: '2026.05.21',
    entry: {
      kind: 'todo',
      task: {
        time: '09:00',
        title: '카드 정산 확인',
        category: '정산',
        detail: 'BC/삼성 카드 지급액과 장부 결제금액 대조',
        owner: '정보경',
        status: '예정',
      },
    },
  },
  {
    date: '2026.05.22',
    entry: {
      kind: 'work',
      order: {
        time: '11:30',
        customer: '대성모터스',
        vehicle: '기아 K5',
        repair: '측면유리 교체',
        visit: '출장',
        address: '대성모터스 공업사',
        technician: '이준호',
        status: '예정',
        stock: 'K5-SIDE 1개',
      },
    },
  },
];

const WORK_LEDGER_FIELD_OVERRIDES: Record<string, Partial<WorkerWorkListRecord>> = {
  'today-0': {
    division: '일반',
    company: '-',
    plateNumber: '46로6650',
    insuranceClaimAmount: 0,
    insurancePaidAmount: 0,
    paymentAmount: 360000,
    paymentStatus: 'Y',
  },
  'today-1': {
    division: '보험',
    company: '삼성화재',
    plateNumber: '293나4481',
    insuranceClaimAmount: 1180000,
    insurancePaidAmount: 0,
    paymentAmount: 100000,
    paymentStatus: 'N',
  },
  'today-2': {
    division: '입고지원',
    company: '현대해상',
    plateNumber: '144노5321',
    insuranceClaimAmount: 690000,
    insurancePaidAmount: 400000,
    paymentAmount: 0,
    paymentStatus: 'N',
  },
  'today-3': {
    division: '일반',
    company: '-',
    plateNumber: '45무4727',
    insuranceClaimAmount: 0,
    insurancePaidAmount: 0,
    paymentAmount: 85000,
    paymentStatus: 'Y',
  },
  'extra-0': {
    division: '일반',
    company: '-',
    plateNumber: '19가3912',
    insuranceClaimAmount: 0,
    insurancePaidAmount: 0,
    paymentAmount: 55000,
    paymentStatus: 'Y',
  },
  'extra-1': {
    date: '26.04.06',
    time: '출장 11:00 ~ 12:00',
    division: '입고지원',
    company: '오픈링크',
    customer: '글로벌',
    vehicle: 'GN7 그랜저',
    plateNumber: '174하8041',
    title: '전면유리 교환+썬팅(루마)\n* 올산 울주군 청량읍 율리 293-4\n* 10시 ~ 11시 사이에 먼저 연락 달라고 함',
    stock: 'N1030',
    insuranceClaimAmount: 1000000,
    insurancePaidAmount: 650000,
    paymentAmount: 300000,
    paymentStatus: 'Y',
  },
  'extra-3': {
    date: '2026.04.15',
    division: 'KP',
    company: '롯데',
    plateNumber: '222하9493',
    insuranceClaimAmount: 449020,
    insurancePaidAmount: 0,
    paymentAmount: 0,
    paymentStatus: 'N',
  },
};

const workerWorkListRecords: WorkerWorkListRecord[] = [
  ...todayEntries.map((entry, index) => makeWorkerWorkListRecord(entry, '2026.05.20', `today-${index}`)),
  ...extraWorkListEntries.map((item, index) => makeWorkerWorkListRecord(item.entry, item.date, `extra-${index}`)),
];

const claims: Claim[] = [
  {
    no: 'CLM-2026-0088',
    customer: '김민수',
    vehicle: '제네시스 GV80',
    type: '자차',
    insurer: '삼성화재',
    claimAmount: 1180000,
    paidAmount: 0,
    customerAmount: 100000,
    status: '청구대기',
  },
  {
    no: 'CLM-2026-0087',
    customer: '대성모터스',
    vehicle: '현대 스타리아',
    type: '정비소 청구',
    insurer: '현대해상',
    claimAmount: 690000,
    paidAmount: 400000,
    customerAmount: 0,
    status: '일부입금',
  },
  {
    no: 'CLM-2026-0086',
    customer: '박지현',
    vehicle: '기아 카니발',
    type: '일반',
    insurer: '-',
    claimAmount: 0,
    paidAmount: 360000,
    customerAmount: 360000,
    status: '입금완료',
  },
];

const inventory: InventoryItem[] = buildActualInventoryItems();

const productSales: ProductSale[] = [
  {
    no: 'SAL-2026-0031',
    date: '26.05.21',
    type: '상품판매',
    customer: '서부카',
    tradeType: '업체',
    itemName: '유리 실란트',
    partNo: 'UNI-SEAL-01',
    qty: 4,
    purchasePrice: 72000,
    salePrice: 112000,
    paymentMethod: '계좌7725',
    stockAfter: 12,
    status: '판매완료',
    tone: 'green',
  },
  {
    no: 'SAL-2026-0030',
    date: '26.05.20',
    type: '상품판매',
    customer: '김민수',
    tradeType: '개인',
    itemName: '발수코팅 키트',
    partNo: 'COAT-R01',
    qty: 1,
    purchasePrice: 18000,
    salePrice: 35000,
    paymentMethod: '카드/KB',
    stockAfter: 7,
    status: '출고대기',
    tone: 'orange',
  },
  {
    no: 'PUR-2026-0018',
    date: '26.05.20',
    type: '매입입고',
    customer: '대리점',
    tradeType: '업체',
    itemName: '카니발 조수석 도어유리',
    partNo: 'GLS-KA-2041',
    qty: 3,
    purchasePrice: 630000,
    salePrice: 0,
    paymentMethod: '매입',
    stockAfter: 4,
    status: '입고대기',
    tone: 'orange',
  },
  {
    no: 'SAL-2026-0029',
    date: '26.05.19',
    type: '상품판매',
    customer: '대성모터스',
    tradeType: '업체',
    itemName: 'GV80 전면유리 ADAS',
    partNo: 'G80-FR-ADAS',
    qty: 1,
    purchasePrice: 980000,
    salePrice: 1180000,
    paymentMethod: '외상',
    stockAfter: 1,
    status: '결제대기',
    tone: 'red',
  },
];

const purchaseEntries: PurchaseEntry[] = [
  {
    id: 'purchase-001',
    baseMonth: '2026.05',
    paymentMonth: '2026.06',
    dueDate: '2026.06.05',
    variability: '고정',
    category: '급여',
    partner: '정보경',
    bank: '국민',
    accountNumber: '54780204131478',
    amount: 1000000,
    paidAmount: 0,
    invoiceIssued: false,
    status: '결제예정',
    memo: '월 급여 지급 예정',
  },
  {
    id: 'purchase-002',
    baseMonth: '2026.05',
    paymentMonth: '2026.06',
    dueDate: '2026.06.05',
    variability: '고정',
    category: '임대료',
    partner: '안민자',
    bank: '농협',
    accountNumber: '00000000000000',
    amount: 1000000,
    paidAmount: 0,
    invoiceIssued: false,
    status: '결제예정',
    memo: '사업장 임대료',
  },
  {
    id: 'purchase-003',
    baseMonth: '2026.05',
    paymentMonth: '2026.06',
    dueDate: '2026.06.05',
    variability: '변동',
    category: '매입(유리)',
    partner: '우신유리(주)',
    bank: '국민',
    accountNumber: '00000000000000',
    amount: 1000000,
    paidAmount: 0,
    invoiceIssued: false,
    status: '결제예정',
    memo: '전면 유리 매입',
  },
  {
    id: 'purchase-004',
    baseMonth: '2026.05',
    paymentMonth: '2026.06',
    dueDate: '2026.06.05',
    variability: '고정',
    category: '보험료',
    partner: '[건강보험]산재',
    bank: '-',
    accountNumber: '-',
    amount: 1000000,
    paidAmount: 0,
    invoiceIssued: false,
    status: '결제예정',
    memo: '4대보험 정기 지출',
  },
  {
    id: 'purchase-005',
    baseMonth: '2026.05',
    paymentMonth: '2026.06',
    dueDate: '2026.06.12',
    variability: '변동',
    category: '부자재',
    partner: '현대모비스 부산점',
    bank: '신한',
    accountNumber: '110122030405',
    amount: 850000,
    paidAmount: 850000,
    invoiceIssued: true,
    status: '결제완료',
    memo: '부자재 세금계산서 수취 완료',
  },
  {
    id: 'purchase-006',
    baseMonth: '2026.05',
    paymentMonth: '2026.06',
    dueDate: '2026.06.18',
    variability: '변동',
    category: '매입(유리)',
    partner: '우신유리(주)',
    bank: '국민',
    accountNumber: '00000000000000',
    amount: 630000,
    paidAmount: 300000,
    invoiceIssued: true,
    status: '부분결제',
    memo: '카니발 도어유리 입고분 일부 지급',
  },
  {
    id: 'purchase-007',
    baseMonth: '2026.04',
    paymentMonth: '2026.05',
    dueDate: '2026.05.28',
    variability: '변동',
    category: '외주',
    partner: '진주 썬팅마스터',
    bank: '기업',
    accountNumber: '020300401234',
    amount: 400000,
    paidAmount: 0,
    invoiceIssued: true,
    status: '연체',
    memo: '외주 시공비 지급 확인 필요',
  },
  {
    id: 'purchase-008',
    baseMonth: '2026.06',
    paymentMonth: '2026.07',
    dueDate: '2026.07.05',
    variability: '고정',
    category: '급여',
    partner: '정보경',
    bank: '국민',
    accountNumber: '54780204131478',
    amount: 1000000,
    paidAmount: 0,
    invoiceIssued: false,
    status: '결제예정',
    memo: '월 급여 지급 예정',
  },
];

const revenuePeriodOptions: Array<{ id: RevenuePeriod; label: string; detail: string }> = [
  { id: 'day', label: '일', detail: '최근 7일 일별' },
  { id: 'week', label: '주', detail: '최근 8주 주별' },
  { id: 'month', label: '월', detail: '최근 반기 월별' },
  { id: 'year', label: '년', detail: '최근 5년 연도별' },
  { id: 'custom', label: '기간', detail: '원하는 날짜 직접 선택' },
];

const revenueStreamOptions: Array<{ id: RevenueStream; label: string; detail: string; tone: Tone }> = [
  { id: 'all', label: '통합매출보기', detail: '작업+판매 합산', tone: 'blue' },
  { id: 'work', label: '작업 매출만 보기', detail: '시공/보험/일반 작업', tone: 'purple' },
  { id: 'sales', label: '판매 매출만 보기', detail: '물품 단독 판매', tone: 'green' },
];

const revenueSeries: Record<RevenuePeriod, RevenuePoint[]> = {
  day: [
    { label: '5.15', work: 2600000, sales: 420000 },
    { label: '5.16', work: 2100000, sales: 310000 },
    { label: '5.17', work: 3200000, sales: 840000 },
    { label: '5.18', work: 2800000, sales: 360000 },
    { label: '5.19', work: 3600000, sales: 1180000 },
    { label: '5.20', work: 4100000, sales: 1260000 },
    { label: '5.21', work: 3300000, sales: 570000 },
  ],
  week: [
    { label: '4월 1주', work: 7600000, sales: 1200000 },
    { label: '4월 2주', work: 8700000, sales: 1640000 },
    { label: '4월 3주', work: 10400000, sales: 1780000 },
    { label: '4월 4주', work: 14200000, sales: 2580000 },
    { label: '5월 1주', work: 8000000, sales: 1400000 },
    { label: '5월 2주', work: 11000000, sales: 2200000 },
    { label: '5월 3주', work: 9500000, sales: 3100000 },
    { label: '5월 4주', work: 13000000, sales: 1800000 },
  ],
  month: [
    { label: '2025.12', work: 40600000, sales: 9500000 },
    { label: '2026.01', work: 28500000, sales: 4200000 },
    { label: '2026.02', work: 31400000, sales: 5100000 },
    { label: '2026.03', work: 36100000, sales: 6800000 },
    { label: '2026.04', work: 40900000, sales: 7200000 },
    { label: '2026.05', work: 47500000, sales: 9400000 },
  ],
  year: [
    { label: '2022', work: 342000000, sales: 61000000 },
    { label: '2023', work: 386000000, sales: 68400000 },
    { label: '2024', work: 424000000, sales: 78000000 },
    { label: '2025', work: 466000000, sales: 84200000 },
    { label: '2026', work: 225800000, sales: 39700000 },
  ],
  custom: [
    { label: '05.01', work: 5200000, sales: 820000 },
    { label: '05.05', work: 6200000, sales: 910000 },
    { label: '05.09', work: 4800000, sales: 1320000 },
    { label: '05.13', work: 7600000, sales: 1800000 },
    { label: '05.17', work: 6800000, sales: 1540000 },
    { label: '05.21', work: 7200000, sales: 2100000 },
  ],
};

const revenuePreviousSeries: Record<RevenuePeriod, RevenuePoint[]> = {
  day: [
    { label: '5.14', work: 2950000, sales: 430000 },
    { label: '5.15', work: 2600000, sales: 420000 },
    { label: '5.16', work: 2100000, sales: 310000 },
    { label: '5.17', work: 3200000, sales: 840000 },
    { label: '5.18', work: 2800000, sales: 360000 },
    { label: '5.19', work: 3600000, sales: 1180000 },
    { label: '5.20', work: 4100000, sales: 1260000 },
  ],
  week: [
    { label: '3월 4주', work: 7000000, sales: 980000 },
    { label: '4월 1주', work: 7600000, sales: 1200000 },
    { label: '4월 2주', work: 8700000, sales: 1640000 },
    { label: '4월 3주', work: 10400000, sales: 1780000 },
    { label: '4월 4주', work: 14200000, sales: 2580000 },
    { label: '5월 1주', work: 8000000, sales: 1400000 },
    { label: '5월 2주', work: 11000000, sales: 2200000 },
    { label: '5월 3주', work: 9500000, sales: 3100000 },
  ],
  month: [
    { label: '2025.11', work: 38200000, sales: 8300000 },
    { label: '2025.12', work: 40600000, sales: 9500000 },
    { label: '2026.01', work: 28500000, sales: 4200000 },
    { label: '2026.02', work: 31400000, sales: 5100000 },
    { label: '2026.03', work: 36100000, sales: 6800000 },
    { label: '2026.04', work: 40900000, sales: 7200000 },
  ],
  year: [
    { label: '2021', work: 318000000, sales: 54000000 },
    { label: '2022', work: 342000000, sales: 61000000 },
    { label: '2023', work: 386000000, sales: 68400000 },
    { label: '2024', work: 424000000, sales: 78000000 },
    { label: '2025', work: 466000000, sales: 84200000 },
  ],
  custom: [
    { label: '05.01', work: 4700000, sales: 720000 },
    { label: '05.05', work: 5800000, sales: 860000 },
    { label: '05.09', work: 4400000, sales: 1160000 },
    { label: '05.13', work: 6900000, sales: 1460000 },
    { label: '05.17', work: 6200000, sales: 1380000 },
    { label: '05.21', work: 6600000, sales: 1830000 },
  ],
};

const revenueLedgerSummaries: RevenueLedgerSummary[] = [
  { label: '26.01 합계', kp: 0, insurance: 0, best: 0, inbound: 0, retail: 0 },
  { label: '26.02 합계', kp: 0, insurance: 0, best: 0, inbound: 0, retail: 0 },
  { label: '26.03 합계', kp: 0, insurance: 0, best: 0, inbound: 0, retail: 0 },
  { label: '26.04 합계', kp: 21280330, insurance: 4868275, best: 7443000, inbound: 499900, retail: 19815059 },
  { label: '26.05 합계', kp: 1280000, insurance: 4838420, best: 2058000, inbound: 1704300, retail: 20477468 },
  { label: '26.06 합계', kp: 0, insurance: 0, best: 0, inbound: 0, retail: 0 },
  { label: '26.07 합계', kp: 0, insurance: 0, best: 0, inbound: 0, retail: 0 },
  { label: '26.08 합계', kp: 0, insurance: 0, best: 0, inbound: 0, retail: 0 },
  { label: '26.09 합계', kp: 0, insurance: 0, best: 0, inbound: 0, retail: 0 },
  { label: '26.10 합계', kp: 0, insurance: 0, best: 0, inbound: 0, retail: 0 },
  { label: '26.11 합계', kp: 0, insurance: 0, best: 0, inbound: 0, retail: 0 },
  { label: '26.12 합계', kp: 0, insurance: 0, best: 0, inbound: 0, retail: 0 },
];

const customers: Customer[] = [
  {
    id: 'c1',
    name: '김민수',
    phone: '010-3182-****',
    vehicle: '제네시스 GV80 / 80가****',
    vin: 'KMH*********2491',
    totalSales: 2560000,
    unpaid: 1280000,
    lastWork: '2026.05.20 전면유리 교체',
    memo: '보험 접수번호 확인 후 청구 진행',
    files: ['파손사진_0520.jpg', '보험접수증.pdf'],
  },
  {
    id: 'c2',
    name: '박지현',
    phone: '010-7751-****',
    vehicle: '기아 카니발 / 43두****',
    vin: 'KNA*********8831',
    totalSales: 980000,
    unpaid: 0,
    lastWork: '2026.05.20 도어유리 교체',
    memo: '방문 결제 완료',
    files: ['작업후사진.jpg'],
  },
  {
    id: 'c3',
    name: '대성모터스',
    phone: '052-268-****',
    vehicle: '현대 스타리아 / 120서****',
    vin: 'KMJ*********9033',
    totalSales: 3720000,
    unpaid: 690000,
    lastWork: '2026.05.19 후면유리 교체',
    memo: '월말 정산 거래처',
    files: ['사업자등록증.pdf', '청구서_0087.pdf'],
  },
  {
    id: 'c4',
    name: '이서윤',
    phone: '010-4492-****',
    vehicle: '기아 쏘렌토 / 158서****',
    vin: 'KND*********1104',
    totalSales: 430000,
    unpaid: 0,
    lastWork: '2026.05.18 도어유리 교체',
    memo: '재방문 가능성 높음, 동일 부위 이력 확인',
    files: ['작업사진_0518.jpg'],
  },
  {
    id: 'c5',
    name: '한빛자동차',
    phone: '052-711-****',
    vehicle: '현대 아반떼 / 29하****',
    vin: 'KMH*********7742',
    totalSales: 2140000,
    unpaid: 320000,
    lastWork: '2026.05.17 후면유리 교체',
    memo: '정비소 청구, 월말 정산 대상',
    files: ['거래명세서_0517.pdf', '세금계산서_대기.pdf'],
  },
  {
    id: 'c6',
    name: '조현우',
    phone: '010-6230-****',
    vehicle: 'BMW X5 / 62누****',
    vin: 'WBA*********5210',
    totalSales: 1380000,
    unpaid: 0,
    lastWork: '2026.05.16 썬루프 점검',
    memo: '수입차 부품 입고 전 연락 필요',
    files: ['부품견적서_BMW.pdf'],
  },
  {
    id: 'c7',
    name: '울산렌트카',
    phone: '052-901-****',
    vehicle: '현대 스타리아 / 177허****',
    vin: 'KMJ*********2238',
    totalSales: 4860000,
    unpaid: 890000,
    lastWork: '2026.05.15 전면유리 교체',
    memo: '렌트 차량 다수, 차량번호 검색 중요',
    files: ['사업자등록증.pdf', '차량목록.xlsx'],
  },
  {
    id: 'c8',
    name: '오민재',
    phone: '010-8840-****',
    vehicle: '테슬라 Model Y / 31모****',
    vin: 'LRW*********7719',
    totalSales: 920000,
    unpaid: 120000,
    lastWork: '2026.05.14 전면유리 복원',
    memo: 'ADAS 보정 여부 확인 후 안내',
    files: ['파손사진_테슬라.jpg'],
  },
];

const partners: Partner[] = buildActualPartners();

const attachments: AttachmentItem[] = [
  { name: '파손사진_김민수_0520.jpg', target: 'EST-2026-0017', type: '견적', owner: '김민수' },
  { name: '보험접수증_삼성화재.pdf', target: 'CLM-2026-0088', type: '청구', owner: '김민수' },
  { name: '작업후사진_카니발.jpg', target: 'WO-2026-0042', type: '작업', owner: '박지현' },
  { name: '대성모터스_사업자등록증.pdf', target: '거래처', type: '기준정보', owner: '대성모터스' },
];

const sheetReviewItems: SheetReviewItem[] = [
  {
    sheet: '청구 계산기',
    role: '보험사/입고지원 청구 산식',
    module: '청구',
    dbTarget: 'ClaimRule, ClaimLineTemplate',
    action: '수식은 규칙으로 분리하고, 결과값은 청구 생성 시 다시 계산',
    status: '검토필요',
    risk: '보험사별 VAT/할인/공임 규칙이 셀 수식에 숨어 있음',
    tone: 'orange',
    filter: 'core',
    rows: '303칸 · 수식 72개',
    notes: '센터가, 면책금, 삼성/AXA 입고지원, 실리콘/부자재/ADAS 보정 단가를 계산합니다.',
    sampleFields: ['보험사', '수입/국산', '센터가', '면책금', '공임', '청구합계'],
  },
  {
    sheet: '거래처 미결 메모',
    role: '미수/미지급 추적',
    module: '정산',
    dbTarget: 'SettlementMemo, PaymentFollowUp',
    action: '차량번호 기준으로 기존 작업/청구와 연결 후보 표시',
    status: 'DB후보',
    risk: '금액 대신 표시값과 긴 통화 메모가 섞여 있음',
    tone: 'blue',
    filter: 'core',
    rows: '82칸',
    notes: '글로벌 등 거래처별 미결건, 계산서 여부, 지급 예정 메모를 관리합니다.',
    sampleFields: ['거래처', '작업일자', '작업구분', '차종', '차량번호', '미결금액', '지급여부'],
  },
  {
    sheet: '썬팅 가격표',
    role: '전면 썬팅 상품/단가',
    module: '가격표',
    dbTarget: 'ServicePriceCatalog',
    action: '브랜드/시리즈/농도/성능/시공가를 표준 단가로 등록',
    status: 'DB후보',
    risk: '숨김 열에 표준시공가격이 있어 가져오기 전 확인 필요',
    tone: 'blue',
    filter: 'reference',
    rows: '86칸',
    notes: '3M, 루마, T-NINE, ANYGARD, RAYNO 등 필름별 가격과 성능값입니다.',
    sampleFields: ['반사여부', '등급', '브랜드', '시리즈', '농도', 'IRR', 'TSER', '가격'],
  },
  {
    sheet: '매입/지출',
    role: '거래처 계좌와 월별 지급',
    module: '정산',
    dbTarget: 'Payable, VendorBankAccount',
    action: '계좌는 권한 제한, 지급 건은 전표/출금 후보로 분리',
    status: '보안분리',
    risk: '은행/계좌번호/급여성 지출이 함께 있어 권한 설계 필요',
    tone: 'red',
    filter: 'finance',
    rows: '455칸 · 수식 156개 · 메모 5개',
    notes: '고정/변동 지출, 거래처 은행정보, 계산서/결제일을 함께 봅니다.',
    sampleFields: ['구분', '기준월', '결제일', '거래처', '은행', '계좌번호', '금액', '계산서'],
  },
  {
    sheet: '복원 동의서',
    role: '고객 서명 양식',
    module: '문서',
    dbTarget: 'DocumentTemplate',
    action: '양식 템플릿화 후 작업 상세에서 고객정보 자동 채움',
    status: '양식화',
    risk: '출력 레이아웃과 법적 고지 문구 보존 필요',
    tone: 'purple',
    filter: 'document',
    rows: '울산/평택 양식',
    notes: '복원 작업 안내, 동의 문구, 작업 내역서가 들어 있습니다.',
    sampleFields: ['작업일자', '브랜드/차종', '차량번호', '보험사', '성함', '연락처'],
  },
  {
    sheet: '참고 Q&A',
    role: '작업자 업무 지식',
    module: '업무 지식',
    dbTarget: 'KnowledgeNote',
    action: '출처/일자/내용으로 저장하고 작업 화면에서 검색',
    status: 'DB후보',
    risk: '카톡/구두 답변성 자료라 최신성 확인 필요',
    tone: 'blue',
    filter: 'reference',
    rows: '147칸',
    notes: '복원 차감, 수입차 단가, ADAS 보정 청구 같은 현장 판단 기준입니다.',
    sampleFields: ['일자', '출처', '수신', '경로', '내용'],
  },
  {
    sheet: '지급 스케줄',
    role: '수기 결제 일정 달력',
    module: '정산',
    dbTarget: 'RecurringPaymentSchedule',
    action: '정기 지급/수기 지급을 일정 알림으로 변환',
    status: '검토필요',
    risk: '자동 달력 수식이 많아 원본 입력영역과 표시영역 분리 필요',
    tone: 'orange',
    filter: 'finance',
    rows: '968칸 · 수식 850개',
    notes: '본사 매입대금 같은 반복 결제 항목을 월간 달력으로 보여줍니다.',
    sampleFields: ['일자', '구분', '결제항목', '대금', '월간 표시'],
  },
  {
    sheet: '연차',
    role: '직원 연차/결근 계산',
    module: '인사',
    dbTarget: 'EmployeeLeaveLedger',
    action: '직원별 연차 발생/차감 이력으로 분리',
    status: '보류',
    risk: 'MVP 범위 밖이지만 내부 운영 편의성은 큼',
    tone: 'gray',
    filter: 'finance',
    rows: '2,403칸 · 수식 1,912개',
    notes: '입사일, 근속개월, 발생 연차, 결근 차감을 계산합니다.',
    sampleFields: ['직원명', '입사일', '근속개월', '발생', '차감', '잔여'],
  },
  {
    sheet: '썬팅 보증서',
    role: '시공 보증 출력물',
    module: '문서',
    dbTarget: 'DocumentTemplate',
    action: '작업 완료 후 보증서 PDF 생성 버튼으로 연결',
    status: '양식화',
    risk: '브랜드별 보증 문구와 시공내역 선택값 필요',
    tone: 'purple',
    filter: 'document',
    rows: '52칸',
    notes: '고객명, 차종, 시공날짜, 시공내역을 채워 출력하는 보증서입니다.',
    sampleFields: ['고객/성함', '브랜드/차종', '시공날짜', '시공내역'],
  },
  {
    sheet: '필름 재단',
    role: '차종별 필름 치수',
    module: '작업 보조',
    dbTarget: 'FilmCutSpec',
    action: '차종 선택 시 가로/세로 치수 자동 안내',
    status: 'DB후보',
    risk: '동일 차종 연식 범위와 제조사 표준화 필요',
    tone: 'blue',
    filter: 'reference',
    rows: '455칸',
    notes: '제조사, 분류, 연식, 차종명, 가로/세로 재단값을 담고 있습니다.',
    sampleFields: ['제조사', '분류', '종류', '연식', '차종명', '가로', '세로'],
  },
  {
    sheet: '회계 코드',
    role: '계정과목 추천표',
    module: '정산',
    dbTarget: 'AccountingCodeMap',
    action: '전표 등록 시 거래 성격에 맞는 계정코드 후보 제공',
    status: 'DB후보',
    risk: '세무사 기준과 맞는지 확정 필요',
    tone: 'blue',
    filter: 'finance',
    rows: '402칸',
    notes: '자산/부채/매출/비용 계정코드와 거래별 추천 코드를 담고 있습니다.',
    sampleFields: ['분류', '계정코드', '계정과목', '의미', '실제 예시'],
  },
  {
    sheet: '베스트 단가표',
    role: '거래처별 부품/작업 단가',
    module: '가격표',
    dbTarget: 'PartnerPriceCatalog',
    action: '거래처 베스트 전용 단가표로 등록하고 장부 결제금액 제안',
    status: 'DB후보',
    risk: '차량명/품명 표현이 자유형이라 중복 정리 필요',
    tone: 'blue',
    filter: 'reference',
    rows: '216칸 · 메모 2개',
    notes: '차량명, 부품명, 공급금액, 품번과 썬팅/탈부착 단가가 섞여 있습니다.',
    sampleFields: ['차량명', '부품명', '공급금액', '품번', '구분'],
  },
  {
    sheet: '외부 계정 정보',
    role: '업무 사이트 로그인 정보',
    module: '보안',
    dbTarget: 'CredentialVaultItem',
    action: 'DB 일반 테이블 금지, 별도 암호화 금고와 접근 로그 필요',
    status: '보안분리',
    risk: 'ID/PW 원문이 포함되어 마스킹/권한/감사로그 필수',
    tone: 'red',
    filter: 'secure',
    rows: '105칸',
    notes: '보험/은행/외부 ERP 등 업무 사이트 계정이 들어 있어 일반 화면 노출을 막아야 합니다.',
    sampleFields: ['구분', '코드', 'ID', 'P/W', '링크', '비고'],
  },
  {
    sheet: '창고이동 재고',
    role: '창고 입고/사용 이력',
    module: '재고',
    dbTarget: 'InventoryTransaction',
    action: '품번별 입고/사용/전표여부로 재고 이력 후보 생성',
    status: 'DB후보',
    risk: '실물 없음, 호환품번, 전표누락 같은 메모를 보존해야 함',
    tone: 'blue',
    filter: 'core',
    rows: '539칸',
    notes: '수입차 유리 품번, 품목명, 날짜, 입고, 사용, 전표여부, 비고를 담고 있습니다.',
    sampleFields: ['품번', '품목', '날짜', '입고', '사용', '전표여부', '비고'],
  },
];

const stagingRecords: StagingRecord[] = [
  {
    source: '거래처 미결 메모',
    title: '글로벌 · 오픈링크 GV70 미결',
    target: '청구/미수',
    owner: '정산 담당',
    status: '연결 후보',
    next: '차량번호로 기존 작업 찾기',
    tone: 'orange',
  },
  {
    source: '창고이동 재고',
    title: '(S)51317440767 BMW X5 G05',
    target: '재고 입고',
    owner: '재고 담당',
    status: '확인필요',
    next: '실물 없음 메모 보존',
    tone: 'red',
  },
  {
    source: '썬팅 가격표',
    title: 'T-NINE R100 30%',
    target: '시공 단가',
    owner: '작업 담당',
    status: '저장 후보',
    next: '브랜드/등급 중복 확인',
    tone: 'blue',
  },
  {
    source: '외부 계정 정보',
    title: '업무 사이트 계정 묶음',
    target: '보안 금고',
    owner: '관리자',
    status: '분리 필요',
    next: '비밀번호 마스킹 및 접근권한 지정',
    tone: 'red',
  },
];

const modelCandidates: ModelCandidate[] = [
  {
    name: 'SourceSheetImport',
    purpose: '엑셀 원본과 시트별 분석 결과를 그대로 보관',
    fields: ['fileName', 'sheetName', 'rowRange', 'checksum', 'importedAt', 'reviewStatus'],
  },
  {
    name: 'ReferencePriceCatalog',
    purpose: '썬팅/베스트/보험 청구 단가를 검색 가능한 기준정보로 전환',
    fields: ['sourceType', 'partnerId', 'vehicleModel', 'serviceName', 'partNo', 'price', 'vatIncluded'],
  },
  {
    name: 'InventoryTransactionDraft',
    purpose: '창고이동 시트를 재고 입출고 후보로 검토',
    fields: ['partNoRaw', 'itemNameRaw', 'occurredAt', 'inQty', 'outQty', 'voucherFlag', 'memo'],
  },
  {
    name: 'CredentialVaultItem',
    purpose: '외부 사이트 ID/PW를 일반 DB가 아닌 암호화 금고로 분리',
    fields: ['serviceName', 'loginId', 'secretRef', 'url', 'allowedRoles', 'lastAccessedAt'],
  },
];

const ledgerSheetTabs: Array<{ id: LedgerSheetId; label: string; source: string; tone: Tone }> = [
  { id: 'salesLedger', label: '매출장부', source: 'Google Sheet · 2026 장부', tone: 'blue' },
  { id: 'kp', label: 'KP', source: 'Google Sheet · KP', tone: 'purple' },
  { id: 'insurance', label: '보험', source: 'Google Sheet · 보험', tone: 'orange' },
  { id: 'estimate', label: '견적', source: 'Google Sheet · 견적', tone: 'yellow' },
  { id: 'best', label: '베스트', source: 'Google Sheet · 베스트', tone: 'green' },
  { id: 'inbound', label: '입고지원', source: 'Google Sheet · 입고지원', tone: 'blue' },
  { id: 'repairShop', label: '정비공장', source: 'Google Sheet · 정비공장', tone: 'red' },
  { id: 'cardLedger', label: '카드 장부', source: 'Google Sheet · 카드', tone: 'green' },
];

const warrantyFilterOptions: Array<{ id: WarrantyFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'unissued', label: '미발행' },
  { id: 'issued', label: '발행완료' },
  { id: 'check', label: '확인필요' },
];

const priceBookFilterOptions: Array<{ id: PriceBookFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'best', label: '베스트 유리' },
  { id: 'service', label: '작업 단가' },
  { id: 'tint', label: '썬팅' },
  { id: 'filmCut', label: '필름 재단' },
];

const productListColumns: Array<{ key: ProductListField; label: string }> = [
  { key: 'itemCode', label: '품목코드' },
  { key: 'itemName', label: '품목명' },
  { key: 'spec', label: '규격정보' },
  { key: 'inboundPrice', label: '입고단가' },
  { key: 'outboundPrice', label: '출고단가' },
  { key: 'exchangePrice', label: '교환단가' },
  { key: 'note', label: '적요' },
];

const bestVehiclePriceSeed: Array<[string, string, number]> = [
  ['캐스퍼', '기본', 286000],
  ['캐스퍼', '센터, 이탈', 297000],
  ['베뉴', '기본', 308000],
  ['CN7', '모든유리', 319000],
  ['DN8', '저급', 341000],
  ['DN8', '중급', 385000],
  ['DN8', '고급', 495000],
  ['DN8', '허드', 740000],
  ['IG', '저급', 420000],
  ['IG', '중급', 462000],
  ['IG', '고급', 495000],
  ['IG', '허드', 760000],
  ['GN7', '저급', 460000],
  ['GN7', '고급', 480000],
  ['GN7', '허드', 760000],
  ['G80', '허드제외유리', 480000],
  ['G80', '허드', 980000],
  ['G70', '저급', 420000],
  ['G70', '중급', 460000],
  ['G70', '허드', 730000],
  ['G90', '저급', 470000],
  ['G90', '중급', 490000],
  ['G90', '허드', 1050000],
  ['GV80', '저급', 484000],
  ['GV80', '중급', 520000],
  ['GV80', '허드', 890000],
  ['GV70', '저급', 396000],
  ['GV70', '중급', 420000],
  ['GV70', '허드', 720000],
  ['GV60', '일반', 470000],
  ['GV60', '블박', 490000],
  ['GV60', '허드', 720000],
  ['코나', '고급', 462000],
  ['코나', '허드', 720000],
  ['NX4', '기본', 300000],
  ['NX4', '중급', 320000],
  ['NX4', '고급', 340000],
  ['TM', '기본', 385000],
  ['TM', '중급', 407000],
  ['TM', '고급', 440000],
  ['TM', '허드', 690000],
  ['MX5', '기본', 390000],
  ['MX5', '중급', 410000],
  ['MX5', '허드', 690000],
  ['펠리세이드', '기본', 390000],
  ['펠리세이드', '중급', 420000],
  ['펠리세이드', '허드', 790000],
  ['펠리 3세대', '허드', 820000],
  ['아이오닉5', '기본', 380000],
  ['아이오닉5', '중급', 420000],
  ['아이오닉5', '고급', 460000],
  ['아이오닉5', '허드', 720000],
  ['아이오닉6', '기본', 380000],
  ['아이오닉6', '중급', 400000],
  ['아이오닉6', '허드', 650000],
];

const bestServicePriceSeed: Array<[string, string, string, number]> = [
  ['유리', '전면유리', '불가', 0],
  ['유리', '후면유리', '강화유리 RV 탈부착', 110000],
  ['유리', '후면유리', '강화유리 승용 탈부착', 121000],
  ['유리', '승용', '이중유리 (파손위험)', 143000],
  ['썬팅', '승용, RV', '문짝유리 썬팅', 33000],
  ['썬팅', '승용, RV', '그린반사 썬팅', 44000],
  ['썬팅', '승용, RV', '후면유리 썬팅', 55000],
  ['썬팅', '승용, RV', '그린반사 썬팅', 0],
  ['썬팅', '승용, RV', '고정창유리 썬팅', 22000],
  ['썬팅', '승용, RV', '그린반사 썬팅', 33000],
  ['썬팅', '승용, RV', '전면유리 필름제거', 22000],
];

const tintPriceSeed: Array<[string, string, string, string, string, string, string, number]> = [
  ['비반사', '기본', '3M', 'XP', '35%', '38%', '48%', 100000],
  ['비반사', '기본', '루마', 'GG', '35%', '정보없음', '42%', 100000],
  ['비반사', '기본', 'T-NINE', 'R1', '30%', '61%', '50%', 120000],
  ['비반사', '중급', 'T-NINE', 'R70', '30%', '80%', '51%', 150000],
  ['비반사', '중급', 'ANYGARD', 'BLACK6', '30%', '60.3%', '51.6%', 150000],
  ['비반사', '상급', 'T-NINE', 'R100', '30%', '88%', '65%', 200000],
  ['비반사', '상급', 'ANYGARD', 'BLACK8', '30%', '82%', '60%', 250000],
  ['비반사', '상급', 'RAYNO', 'PhantomS', '35%', '92%', '57.4%', 250000],
  ['반사(에메랄드)', '중급', 'T-NINE', 'V1', '27%', '79%', '62%', 150000],
  ['반반사(그린)', '상급', 'ANYGARD', 'AP-80R', '30%', '81.8%', '63.7%', 250000],
];

const filmCutSeed: Array<[string, string, string, string, string, string, string, string?]> = [
  ['기아', '승용', '준중형', '2018~2021', '뉴 K3 BD', '78', '1,400'],
  ['기아', '승용', '경차', '2008~2011', '뉴모닝 SA', '78', '1,300'],
  ['기아', '승용', '경차', '2011~현재', '레이', '65', '1,450'],
  ['기아', 'RV', '대형SUV', '2008~현재', '모하비', '77', '1,480'],
  ['기아', 'RV', 'RV/MPV', '2005~현재', '봉고3', '73', '1,480'],
  ['기아', 'RV', '소형SUV', '2019~현재', '셀토스', '78', '1,410'],
  ['기아', 'RV', '소형SUV', '2017~현재', '스토닉', '77', '1,350'],
  ['기아', 'RV', '중형SUV', '2015~2021', '스포티지 (QL)', '79', '1,450'],
  ['기아', 'RV', '중형SUV', '2021~현재', '스포티지 (MQ5)', '80', '1,430'],
  ['기아', 'RV', '중형SUV', '2015~2020', '쏘렌토 (UM)', '78.5', '1,470'],
  ['기아', 'RV', '중형SUV', '2020~현재', '쏘렌토 (MQ4)', '76', '1,470'],
  ['기아', '승용', '소형', '2008~현재', '쏘울', '73.5', '1,400'],
  ['기아', '승용', '준대형', '2016~2019', '올 뉴 K7(YG)', '74.5', '1,480'],
  ['기아', 'RV', 'RV/MPV', '2015~2020', '카니발 (YP)', '89', '1,550'],
  ['기아', 'RV', 'RV/MPV', '2020~현재', '카니발 (KA4)', '87', '1,600'],
  ['쌍용', 'RV', '중형SUV', '2022~현재', '토레스', '76', '1,400'],
  ['기아', 'RV', '소형SUV', '2024~현재', 'EV3', '81', '1,400'],
  ['기아', '승용', '중형', '2021~현재', 'EV6', '94', '1,420'],
  ['기아', '승용', '경차', '2017~현재', 'JA모닝', '77', '1,250'],
  ['기아', '승용', '준중형', '2015~2018', 'K3 YD', '74.5', '1,450'],
  ['기아', '승용', '중형', '2019~현재', 'K5 (DL3)', '74', '1,450'],
  ['기아', '승용', '준대형', '2016~2019', 'K7 (YG)', '74.5', '1,490'],
  ['기아', '승용', '준대형', '2021~현재', 'K8', '73', '1,480'],
  ['기아', '승용', '대형', '2012~현재', 'K9', '72', '1,450'],
  ['기타', '승용', '수입/기타', '', '아우디', '78', '1,450'],
  ['기타', 'RV', '소형SUV', '', '니로', '75', '1,470'],
  ['기타', '승용', '수입/기타', '', '테슬라', '95', '1,400'],
  ['기타', 'RV', '소형SUV', '', '트랙스', '79.5', '1,350'],
  ['현대', '승용', '준대형', '2022~현재', '그랜저 (GN7)', '70', '1,470'],
  ['현대', '승용', '준대형', '2022~현재', '그랜저 (GN7)', '70', '1,450'],
  ['현대', '승용', '준대형', '2016~2020', '그랜저 (IG)', '73.5', '1,450'],
  ['현대', '승용', '준대형', '2020~2022', '그랜저 (IG F/L)', '74', '1,450'],
  ['현대', 'RV', 'RV/MPV', '2021~현재', '스타리아', '105', '1,550'],
  ['현대', 'RV', '중형SUV', '2012~2018', '싼타페 (DM)', '78', '1,410'],
  ['현대', 'RV', '중형SUV', '2018~2020', '싼타페 (TM)', '77', '1,480'],
  ['현대', 'RV', '중형SUV', '2023~현재', '싼타페 (MX5)', '80', '1,520', '확인필요'],
  ['현대', '승용', '중형', '2019~현재', '쏘나타 (DN8)', '74.5', '1,450'],
  ['현대', '승용', '준중형', '2015~2020', '아반떼 (AD)', '80', '1,350', '가로 가능'],
  ['현대', '승용', '준중형', '2020~현재', '아반떼 (CN7)', '78', '1,470'],
  ['현대', '승용', '중형', '2021~현재', '아이오닉5', '86', '1,500'],
  ['현대', '승용', '중형', '2022~현재', '아이오닉6 (CE)', '80.5', '1,450'],
  ['현대', '승용', '대형', '2000~2015', '에쿠스', '74', '1,450'],
  ['현대', '승용', '대형', '2013~2016', '제네시스 (DH)', '73', '1,480'],
  ['현대', '승용', '대형', '2015~2018', '제네시스 EQ900', '73', '1,450'],
  ['현대', '승용', '준대형', '2016~2020', '제네시스 G80 (DH)', '73', '1,430', '확인필요'],
  ['현대', '승용', '준대형', '2023~현재', '제네시스 G80 (RG3 F/L)', '75', '1,480'],
  ['현대', '승용', '준대형', '2020~현재', '제네시스 G80 (RG3)', '74.5', '1,480'],
  ['현대', '승용', '대형', '2015~2021', '제네시스 G90', '76.5', '1,500'],
  ['현대', '승용', '대형', '2022~현재', '제네시스 G90 (RS4)', '76', '1,510'],
  ['현대', '승용', '중형', '2021~현재', '제네시스 GV60', '77', '1,470', '확인필요'],
  ['현대', 'RV', '중형SUV', '2024~', '제네시스 GV60', '76', '1,500', '확인필요'],
  ['현대', 'RV', '대형SUV', '2020~현재', '제네시스 GV80', '76.5', '1,470'],
  ['현대', 'RV', '소형SUV', '2017~2022', '코나 (OS)', '72', '1,390'],
  ['현대', 'RV', '소형SUV', '2023~현재', '코나 (SX2)', '75', '1,420'],
  ['현대', 'RV', '중형SUV', '2020~현재', '투싼 (NX4)', '78.5', '1,450'],
  ['현대', 'RV', '중형SUV', '2015~2020', '투싼 (TL)', '81', '1,450'],
  ['현대', 'RV', '중형SUV', '2020~현재', '투싼 NX4', '78.5', '1,400'],
  ['현대', 'RV', '대형SUV', '2018~현재', '팰리세이드', '75', '1,500'],
  ['현대', 'RV', 'RV/MPV', '2004~현재', '포터2', '76.5', '1,480'],
  ['현대', 'RV', '중형SUV', '2020~현재', 'GV70 구형', '75', '1,480'],
  ['현대', 'RV', '중형SUV', '2022~현재', 'GV70 신형(EV)', '75.5', '1,480'],
  ['기타', 'RV', '중형SUV', '', '뉴쏘렌토', '79', '1,450'],
  ['현대', 'RV', '대형SUV', '', '펠리세이드 신형', '78.5', '1,550'],
];

const priceBookRows: PriceBookRow[] = [
  ...bestVehiclePriceSeed.map(([vehicle, part, price], index) => ({
    id: `best-vehicle-${index}`,
    source: '베스트단가표' as const,
    category: '차량유리',
    target: vehicle,
    item: part,
    spec: '공급가액 · VAT 포함',
    price,
    vatIncluded: true,
    tone: 'blue' as Tone,
  })),
  ...bestServicePriceSeed.map(([category, target, item, price], index) => ({
    id: `best-service-${index}`,
    source: '베스트단가표' as const,
    category: '작업단가',
    target: `${category} · ${target}`,
    item,
    spec: '공급가액 · VAT 포함',
    price,
    vatIncluded: true,
    tone: 'orange' as Tone,
  })),
  ...tintPriceSeed.map(([reflection, grade, brand, series, density, irr, tser, price], index) => ({
    id: `tint-${index}`,
    source: '썬팅' as const,
    category: reflection,
    target: brand,
    item: series,
    spec: `${grade} · 농도 ${density} · IRR ${irr} · TSER ${tser}`,
    price,
    vatIncluded: true,
    tone: 'green' as Tone,
  })),
  ...filmCutSeed.map(([maker, division, type, yearRange, model, width, height, memo], index) => ({
    id: `film-cut-${index}`,
    source: '필름재단' as const,
    category: `${maker} · ${division}`,
    target: model,
    item: '전면 필름 재단',
    spec: `${type}${yearRange ? ` · ${yearRange}` : ''}`,
    width,
    height,
    ...(memo ? { memo } : {}),
    tone: memo ? ('yellow' as Tone) : ('purple' as Tone),
  })),
];

const initialProductListRows: ProductListRow[] = selectMockRows('product_items').map((row, index) => ({
  ...row,
  id: `product-${row.sourceRow ?? index + 2}-${row.itemCode || index}`,
}));

const ledgerRecords: LedgerRecord[] = [
  {
    no: 'KP01',
    date: '26.04.01',
    time: '출장',
    category: 'KP',
    company: '롯데',
    partner: '-',
    vehicle: '니로',
    work: '전면유리 교환+썬팅(루마)',
    partNo: 'AT080',
    plate: '172하2232',
    claimAmount: 0,
    dueDate: '26.04.30',
    depositAmount: 422070,
    paymentAmount: 0,
    paymentMethod: '-',
    memo: '경주 출장',
    status: '입금예정',
    tone: 'blue',
  },
  {
    no: 'KP05',
    date: '26.04.03',
    time: '-',
    category: 'KP',
    company: '우성',
    partner: '-',
    vehicle: '그랜져',
    work: '전면유리 교환+썬팅',
    partNo: 'G8800',
    plate: '194호5781',
    claimAmount: 0,
    dueDate: '26.04.03',
    depositAmount: 130000,
    paymentAmount: 350000,
    paymentMethod: '카드/롯데',
    memo: '우성',
    status: '부분정산',
    tone: 'orange',
  },
  {
    no: '일반01',
    date: '26.04.01',
    time: '-',
    category: '일반',
    company: '-',
    partner: '-',
    vehicle: 'K7 YG',
    work: '복원',
    partNo: '-',
    plate: '19가3912',
    claimAmount: 0,
    dueDate: '-',
    depositAmount: 0,
    paymentAmount: 55000,
    paymentMethod: '카드/KB',
    memo: '-',
    status: '매출완료',
    tone: 'green',
  },
  {
    no: '베스트01',
    date: '26.04.03',
    time: '-',
    category: '베스트',
    company: '-',
    partner: '베스트',
    vehicle: 'G80',
    work: '전면유리 교환+썬팅',
    partNo: 'JI020',
    plate: '180하7997',
    claimAmount: 0,
    dueDate: '-',
    depositAmount: 805000,
    paymentAmount: 0,
    paymentMethod: '-',
    memo: '보험입금 기준 정산',
    status: '정산반영',
    tone: 'purple',
  },
  {
    no: '입고지원01',
    date: '26.04.06',
    time: '출장 11:00',
    category: '입고지원',
    company: '오픈링크',
    partner: '글로벌',
    vehicle: 'GN7 그랜저',
    work: '전면유리 교환+썬팅(루마)',
    partNo: 'N1030',
    plate: '174하8041',
    claimAmount: 0,
    dueDate: '-',
    depositAmount: 0,
    paymentAmount: 300000,
    paymentMethod: '계좌/스마트아이디어',
    memo: '면책금 30, 계산서 4/6',
    status: '계산서대기',
    tone: 'yellow',
  },
  {
    no: '보험01',
    date: '26.04.07',
    time: '-',
    category: '보험',
    company: '삼성',
    partner: '상북현대',
    vehicle: '펠리',
    work: '후면유리 탈착',
    partNo: '-',
    plate: '144노5321',
    claimAmount: 170905,
    dueDate: '-',
    depositAmount: 0,
    paymentAmount: 0,
    paymentMethod: '-',
    memo: '보험사/담당자/접수번호 수기 보강',
    status: '청구대기',
    tone: 'red',
  },
  {
    no: '일반07',
    date: '26.04.07',
    time: '방문 14:00',
    category: '일반',
    company: '-',
    partner: '글로벌',
    vehicle: 'NQ5 스포티지',
    work: '후면유리 교환+썬팅',
    partNo: '87110-P1000',
    plate: '122하8692',
    claimAmount: 0,
    dueDate: '-',
    depositAmount: 0,
    paymentAmount: 330000,
    paymentMethod: '카드/삼성',
    memo: '일반수리 전환',
    status: '카드정산',
    tone: 'blue',
  },
  {
    no: '정비01',
    date: '26.04.09',
    time: '-',
    category: '정비공장',
    company: '-',
    partner: '대성모터스',
    vehicle: '카니발 KA4',
    work: '전면유리 교환',
    partNo: '86111-R0000',
    plate: '177허2238',
    claimAmount: 0,
    dueDate: '26.04.30',
    depositAmount: 0,
    paymentAmount: 260000,
    paymentMethod: '계좌/월말',
    memo: '정비공장 월말 정산',
    status: '미수',
    tone: 'red',
  },
  {
    no: '정비02',
    date: '26.04.12',
    time: '입고 10:30',
    category: '정비공장',
    company: '현대해상',
    partner: '상북현대',
    vehicle: '쏘렌토 MQ4',
    work: '전면유리 교체 보험건',
    partNo: '86111-P2100',
    plate: '201나9044',
    claimAmount: 385000,
    dueDate: '26.04.25',
    depositAmount: 385000,
    paymentAmount: 0,
    paymentMethod: '보험입금',
    memo: '계산서 발행 완료',
    status: '입금완료',
    tone: 'green',
  },
  {
    no: '견적-12',
    date: '26.05.11',
    time: '예약 전',
    category: '견적',
    company: '정보경',
    partner: '방문',
    vehicle: '니로 SG2',
    work: '전면유리.차음.습기.차선.HI',
    partNo: '86111-AT080',
    plate: '11호5871',
    claimAmount: 0,
    dueDate: '-',
    depositAmount: 0,
    paymentAmount: 420000,
    paymentMethod: '견적',
    memo: '작업일 입력 시 2026 장부로 전환',
    status: '전환대기',
    tone: 'orange',
  },
  {
    no: '카드-BC01',
    date: '26.03.11',
    time: '-',
    category: '카드',
    company: 'BC',
    partner: '카드',
    vehicle: '일반',
    work: '카드 매출 정산',
    partNo: '-',
    plate: '45무4727',
    claimAmount: 0,
    dueDate: '26.03.13',
    depositAmount: 87120,
    paymentAmount: 88000,
    paymentMethod: '카드/BC',
    memo: '수수료율 자동 계산',
    status: '정산완료',
    tone: 'green',
  },
];

const cardSettlements: CardSettlement[] = [
  { workDate: '26.05.21', date: '26.05.19', category: '일반', company: '-', brand: 'NH', plate: '00기0000', amount: 100000, paid: 99000, depositDate: '26.05.23', feeRate: '0.9900', status: '입금확인', tone: 'green' },
  { workDate: '26.05.21', date: '26.05.21', category: '보험', company: '삼성', brand: 'KB', plate: '12가9380', amount: 300000, paid: 297000, depositDate: '26.05.25', feeRate: '0.9900', status: '입금확인', tone: 'green' },
  { workDate: '26.05.23', date: '26.05.23', category: 'KP', company: '우성', brand: 'BC', plate: '14아9481', amount: 380000, paid: 377150, depositDate: '26.05.27', feeRate: '0.9925', status: '입금확인', tone: 'green' },
  { workDate: '26.05.26', date: '26.05.23', category: '입고지원', company: '오픈링크', brand: '하나', plate: '64오8745', amount: 600000, paid: 594000, depositDate: '26.05.25', feeRate: '0.9900', status: '입금확인', tone: 'green' },
  { workDate: '26.05.23', date: '26.05.23', category: '입고지원', company: '삼성', brand: 'NH', plate: '85고9548', amount: 400000, paid: 0, feeRate: '', status: '입금대기', tone: 'orange' },
  { workDate: '26.05.23', date: '26.05.23', category: '일반', company: '-', brand: 'NH', plate: '67우9872', amount: 450000, paid: 0, feeRate: '', status: '입금대기', tone: 'orange' },
];

const warrantyRecords: WarrantyRecord[] = [
  {
    id: 'warranty-001',
    type: '썬팅',
    workDate: '2026-05-21',
    customerName: '김민준',
    customerPhone: '010-3393-6835',
    vehicle: '현대 그랜저(GN7)',
    plate: '368러4358',
    workDescription: '전면 썬팅시공',
    partNo: 'RAYNO-R2-45',
    frontFilm: '[RAYNO] Presto R2 (45%)',
    sideFirstFilm: '',
    sideRearFilm: '',
    repairContent: '필름 시공 후 주의사항 안내 완료',
    status: '미발행',
    tone: 'red',
  },
  {
    id: 'warranty-002',
    type: '썬팅',
    workDate: '2026-05-17',
    customerName: '박서연',
    customerPhone: '010-8838-2468',
    vehicle: 'SM5',
    plate: '100러5323',
    workDescription: '전체 썬팅시공',
    partNo: 'TNINE-R100',
    frontFilm: '[T-NINE] R100 (30%)',
    sideFirstFilm: '[T-NINE] R100 (30%)',
    sideRearFilm: '[RAYNO] PRESTO R1 (5%)',
    repairContent: '전체 유리 필름 시공 및 열차단 필름 보증 안내',
    status: '발행완료',
    tone: 'green',
  },
  {
    id: 'warranty-003',
    type: '썬팅',
    workDate: '2026-05-13',
    customerName: '이도현',
    customerPhone: '010-2048-7712',
    vehicle: '니로 SG2',
    plate: '11호5871',
    workDescription: '전면유리 교환 후 썬팅',
    partNo: 'LLUMAR-CT-35',
    frontFilm: '[LLumar] CTX (35%)',
    sideFirstFilm: '',
    sideRearFilm: '',
    repairContent: '전면유리 교환 작업 후 전면 필름 재시공',
    status: '확인필요',
    tone: 'orange',
  },
];

const estimateConversions: EstimateConversion[] = [
  {
    date: '26.05.11',
    owner: '정보경',
    vehicle: '니로 SG2',
    plate: '11호5871',
    estimate: '전면유리 교환+썬팅, 42만원',
    next: '작업일/예약시간 확정 후 장부 전환',
    tone: 'orange',
  },
  {
    date: '26.05.04',
    owner: '정보경',
    vehicle: 'K5 JF',
    plate: '12어0423',
    estimate: '정품 52만, 비품 47만',
    next: '정품/비품 선택 확인',
    tone: 'blue',
  },
  {
    date: '26.04.24',
    owner: '정원철',
    vehicle: '아이오닉5',
    plate: '울산12바5122',
    estimate: '전면유리 교체45 + 썬팅20',
    next: '고객 예약 응답 대기',
    tone: 'gray',
  },
];

const ledgerSheetColumns: Record<LedgerSheetId, string[]> = {
  salesLedger: ['번호', '작업일', '구분', '업체', '거래처', '차량번호', '차종', '작업내용', '청구금액', '입금액', '결제금액', '상태'],
  kp: ['번호', '작업일', '업체', '차량번호', '차종', '작업내용', '지급일', '입금액', '결제금액', '비고', '상태'],
  insurance: ['번호', '작업일', '보험사', '정비공장', '차량번호', '차종', '작업내용', '접수/품번', '청구금액', '입금액', '상태'],
  estimate: ['번호', '견적일', '고객/거래처', '차량번호', '차종', '견적내용', '견적금액', '다음 처리', '상태'],
  best: ['번호', '작업일', '거래처', '차량번호', '차종', '품번', '작업내용', '입금금액', '비고', '상태'],
  inbound: ['번호', '작업일', '입고지원처', '거래처', '차량번호', '차종', '품번', '작업내용', '결제금액', '비고', '상태'],
  repairShop: ['번호', '작업일', '정비공장', '보험/업체', '차량번호', '차종', '작업내용', '청구/결제', '계산서/메모', '상태'],
  cardLedger: ['전표', '결제일', '카드사', '차량번호', '매출금액', '입금금액', '수수료율', '수수료', '상태'],
};

function LedgerMoneyCell({ value }: { value: number }) {
  return <span className="ledger-sheet-money">{value > 0 ? formatMoney(value) : '-'}</span>;
}

function ledgerRecordAmount(record: LedgerRecord) {
  return record.depositAmount + record.paymentAmount;
}

function ledgerSearchParts(record: LedgerRecord) {
  return [
    record.no,
    record.date,
    record.time,
    record.category,
    record.company,
    record.partner,
    record.vehicle,
    record.work,
    record.partNo,
    record.plate,
    record.paymentMethod,
    record.memo,
    record.status,
    record.claimAmount,
    record.depositAmount,
    record.paymentAmount,
  ];
}

function createLedgerSheetRow({
  key,
  cells,
  status,
  amount,
  searchParts,
}: {
  key: string;
  cells: ReactNode[];
  status: string;
  amount: number;
  searchParts: Array<string | number>;
}): LedgerSheetRow {
  return {
    key,
    cells,
    status,
    amount,
    searchText: searchParts.join(' ').toLowerCase(),
  };
}

function estimateAmountFromText(value: string) {
  const tenThousandMatch = value.match(/(\d+)\s*만/);
  if (!tenThousandMatch?.[1]) return 0;
  return Number(tenThousandMatch[1]) * 10000;
}

const repairShopPartners = new Set(['대성모터스', '상북현대', '글로벌']);

const salesLedgerRows = ledgerRecords
  .filter((record) => record.category !== '견적')
  .map((record) =>
    createLedgerSheetRow({
      key: `${record.no}-sales-ledger`,
      cells: [
        record.no,
        `${record.date}\n${record.time}`,
        record.category,
        record.company,
        record.partner,
        record.plate,
        record.vehicle,
        `${record.work}\n${record.partNo}`,
        <LedgerMoneyCell key={`${record.no}-claim`} value={record.claimAmount} />,
        <LedgerMoneyCell key={`${record.no}-deposit`} value={record.depositAmount} />,
        <LedgerMoneyCell key={`${record.no}-payment`} value={record.paymentAmount} />,
        <StatusPill key={`${record.no}-status`} label={record.status} tone={record.tone} />,
      ],
      status: record.status,
      amount: ledgerRecordAmount(record),
      searchParts: ledgerSearchParts(record),
    }),
  );

const kpLedgerRows = ledgerRecords
  .filter((record) => record.category === 'KP')
  .map((record) =>
    createLedgerSheetRow({
      key: `${record.no}-kp`,
      cells: [
        record.no,
        `${record.date}\n${record.time}`,
        record.company,
        record.plate,
        record.vehicle,
        `${record.work}\n${record.partNo}`,
        record.dueDate,
        <LedgerMoneyCell key={`${record.no}-kp-deposit`} value={record.depositAmount} />,
        <LedgerMoneyCell key={`${record.no}-kp-payment`} value={record.paymentAmount} />,
        record.memo,
        <StatusPill key={`${record.no}-kp-status`} label={record.status} tone={record.tone} />,
      ],
      status: record.status,
      amount: ledgerRecordAmount(record),
      searchParts: ledgerSearchParts(record),
    }),
  );

const insuranceLedgerRows = ledgerRecords
  .filter((record) => record.category === '보험' || (record.category === '정비공장' && record.claimAmount > 0))
  .map((record) =>
    createLedgerSheetRow({
      key: `${record.no}-insurance`,
      cells: [
        record.no,
        `${record.date}\n${record.time}`,
        record.company,
        record.partner,
        record.plate,
        record.vehicle,
        record.work,
        record.partNo,
        <LedgerMoneyCell key={`${record.no}-insurance-claim`} value={record.claimAmount} />,
        <LedgerMoneyCell key={`${record.no}-insurance-deposit`} value={record.depositAmount} />,
        <StatusPill key={`${record.no}-insurance-status`} label={record.status} tone={record.tone} />,
      ],
      status: record.status,
      amount: record.claimAmount,
      searchParts: ledgerSearchParts(record),
    }),
  );

const estimateLedgerRows = estimateConversions.map((item, index) => {
  const amount = estimateAmountFromText(item.estimate);

  return createLedgerSheetRow({
    key: `${item.date}-${item.plate}-estimate`,
    cells: [
      `견적-${String(index + 1).padStart(2, '0')}`,
      item.date,
      item.owner,
      item.plate,
      item.vehicle,
      item.estimate,
      <LedgerMoneyCell key={`${item.date}-${item.plate}-estimate-amount`} value={amount} />,
      item.next,
      <StatusPill key={`${item.date}-${item.plate}-estimate-status`} label="전환대기" tone={item.tone} />,
    ],
    status: '전환대기',
    amount,
    searchParts: [item.date, item.owner, item.vehicle, item.plate, item.estimate, item.next, amount],
  });
});

const bestLedgerRows = ledgerRecords
  .filter((record) => record.category === '베스트')
  .map((record) =>
    createLedgerSheetRow({
      key: `${record.no}-best`,
      cells: [
        record.no,
        `${record.date}\n${record.time}`,
        record.partner,
        record.plate,
        record.vehicle,
        record.partNo,
        record.work,
        <LedgerMoneyCell key={`${record.no}-best-deposit`} value={record.depositAmount} />,
        record.memo,
        <StatusPill key={`${record.no}-best-status`} label={record.status} tone={record.tone} />,
      ],
      status: record.status,
      amount: record.depositAmount,
      searchParts: ledgerSearchParts(record),
    }),
  );

const inboundLedgerRows = ledgerRecords
  .filter((record) => record.category === '입고지원')
  .map((record) =>
    createLedgerSheetRow({
      key: `${record.no}-inbound`,
      cells: [
        record.no,
        `${record.date}\n${record.time}`,
        record.company,
        record.partner,
        record.plate,
        record.vehicle,
        record.partNo,
        record.work,
        <LedgerMoneyCell key={`${record.no}-inbound-payment`} value={record.paymentAmount + record.depositAmount} />,
        record.memo,
        <StatusPill key={`${record.no}-inbound-status`} label={record.status} tone={record.tone} />,
      ],
      status: record.status,
      amount: ledgerRecordAmount(record),
      searchParts: ledgerSearchParts(record),
    }),
  );

const repairShopLedgerRows = ledgerRecords
  .filter((record) => record.category === '정비공장' || repairShopPartners.has(record.partner))
  .map((record) =>
    createLedgerSheetRow({
      key: `${record.no}-repair-shop`,
      cells: [
        record.no,
        `${record.date}\n${record.time}`,
        record.partner,
        record.company,
        record.plate,
        record.vehicle,
        `${record.work}\n${record.partNo}`,
        `${record.claimAmount ? `청구 ${formatMoney(record.claimAmount)}\n` : ''}${ledgerRecordAmount(record) ? `결제 ${formatMoney(ledgerRecordAmount(record))}` : '-'}`,
        record.memo,
        <StatusPill key={`${record.no}-repair-status`} label={record.status} tone={record.tone} />,
      ],
      status: record.status,
      amount: record.claimAmount || ledgerRecordAmount(record),
      searchParts: ledgerSearchParts(record),
    }),
  );

const cardLedgerRows = cardSettlements.map((item, index) => {
  const fee = Math.max(0, item.amount - item.paid);

  return createLedgerSheetRow({
    key: `${item.date}-${item.brand}-${item.plate}-card-ledger`,
    cells: [
      `카드-${String(index + 1).padStart(2, '0')}`,
      item.date,
      item.brand,
      item.plate,
      <LedgerMoneyCell key={`${item.date}-${item.brand}-${item.plate}-amount`} value={item.amount} />,
      <LedgerMoneyCell key={`${item.date}-${item.brand}-${item.plate}-paid`} value={item.paid} />,
      item.feeRate,
      <LedgerMoneyCell key={`${item.date}-${item.brand}-${item.plate}-fee`} value={fee} />,
      <StatusPill key={`${item.date}-${item.brand}-${item.plate}-status`} label={item.status} tone={item.tone} />,
    ],
    status: item.status,
    amount: item.paid,
    searchParts: [item.date, item.brand, item.plate, item.amount, item.paid, item.feeRate, item.status],
  });
});

const ledgerSheetRowsById: Record<LedgerSheetId, LedgerSheetRow[]> = {
  salesLedger: salesLedgerRows,
  kp: kpLedgerRows,
  insurance: insuranceLedgerRows,
  estimate: estimateLedgerRows,
  best: bestLedgerRows,
  inbound: inboundLedgerRows,
  repairShop: repairShopLedgerRows,
  cardLedger: cardLedgerRows,
};

const defaultDashboardShortcuts: DashboardShortcut[] = [
  { title: '보험 청구 사이트', url: 'https://example.com/claim' },
  { title: '부품 주문 사이트', url: 'https://example.com/parts' },
  { title: '세금계산서 보관함', url: 'https://example.com/tax' },
];
const defaultPaymentShortcuts: DashboardShortcut[] = [...defaultDashboardShortcuts];

const vehicleCatalogSeed: Omit<VehicleCatalogItem, 'source' | 'updatedAt' | 'usageCount'>[] = [
  {
    id: 'vehicle-genesis-gv80',
    brand: '제네시스',
    model: 'GV80',
    series: 'JX1',
    yearRange: '2020~',
    category: 'SUV',
    aliases: ['제네시스 GV80', 'GV80'],
    memo: '전면유리 작업 시 ADAS 보정 여부 확인',
  },
  {
    id: 'vehicle-kia-carnival-ka4',
    brand: '기아',
    model: '카니발',
    series: 'KA4',
    yearRange: '2020~',
    category: 'MPV',
    infoCategory: '필름재단',
    filmCutWidth: '87',
    filmCutHeight: '1,600',
    filmCutNote: '',
    aliases: ['기아 카니발', '카니발', '카니발 KA4'],
    memo: '도어유리와 전면유리 작업 이력 있음',
  },
  {
    id: 'vehicle-hyundai-staria',
    brand: '현대',
    model: '스타리아',
    series: 'US4',
    yearRange: '2021~',
    category: 'MPV',
    infoCategory: '필름재단',
    filmCutWidth: '105',
    filmCutHeight: '1,550',
    filmCutNote: '',
    aliases: ['현대 스타리아', '스타리아'],
    memo: '렌트/업체 차량에서 반복 작업',
  },
  {
    id: 'vehicle-bmw-520i',
    brand: 'BMW',
    model: '520i',
    series: '5시리즈',
    yearRange: '수입',
    category: '수입 세단',
    aliases: ['BMW 520i', 'BMW 5시리즈', '520i'],
    memo: '수입차 부품 입고 전 확인 필요',
  },
  {
    id: 'vehicle-hyundai-porter2',
    brand: '현대',
    model: '포터2',
    series: 'HR',
    yearRange: '2004~',
    category: '화물',
    aliases: ['현대 포터2', '포터2'],
    memo: '상용차 전면유리 작업 이력',
  },
  {
    id: 'vehicle-kia-niro-sg2',
    brand: '기아',
    model: '니로',
    series: 'SG2',
    yearRange: '2022~',
    category: 'SUV',
    aliases: ['기아 니로', '니로', '니로 SG2'],
    memo: '차음/습기/차선 옵션 후보',
  },
  {
    id: 'vehicle-kia-k5-jf',
    brand: '기아',
    model: 'K5',
    series: 'JF',
    yearRange: '2015~2020',
    category: '세단',
    aliases: ['기아 K5', 'K5', 'K5 JF'],
    memo: '측면유리 작업 이력',
  },
  {
    id: 'vehicle-kia-k7-yg',
    brand: '기아',
    model: 'K7',
    series: 'YG',
    yearRange: '2016~2021',
    category: '세단',
    infoCategory: '필름재단',
    filmCutWidth: '74.5',
    filmCutHeight: '1,480',
    filmCutNote: '',
    aliases: ['K7', 'K7 YG'],
    memo: '복원 작업 이력',
  },
  {
    id: 'vehicle-hyundai-grandeur-gn7',
    brand: '현대',
    model: '그랜저',
    series: 'GN7',
    yearRange: '2022~',
    category: '세단',
    infoCategory: '필름재단',
    filmCutWidth: '70',
    filmCutHeight: '1,470',
    filmCutNote: '',
    aliases: ['GN7 그랜저', '그랜저', '그랜져'],
    memo: '장부 표기 그랜져/그랜저 모두 후보 처리',
  },
  {
    id: 'vehicle-genesis-g80',
    brand: '제네시스',
    model: 'G80',
    series: 'RG3',
    yearRange: '2020~',
    category: '세단',
    aliases: ['제네시스 G80', 'G80'],
    memo: '베스트/보험 정산 이력',
  },
  {
    id: 'vehicle-hyundai-palisade',
    brand: '현대',
    model: '팰리세이드',
    series: 'LX2',
    yearRange: '2018~',
    category: 'SUV',
    aliases: ['현대 팰리세이드', '팰리세이드', '펠리'],
    memo: '장부 축약명 펠리 포함',
  },
  {
    id: 'vehicle-kia-sportage-nq5',
    brand: '기아',
    model: '스포티지',
    series: 'NQ5',
    yearRange: '2021~',
    category: 'SUV',
    infoCategory: '필름재단',
    filmCutWidth: '80',
    filmCutHeight: '1,430',
    filmCutNote: '원본 시트 MQ5 표기',
    aliases: ['기아 스포티지', '스포티지', 'NQ5 스포티지'],
    memo: '후면유리/썬팅 작업 후보',
  },
  {
    id: 'vehicle-hyundai-avante',
    brand: '현대',
    model: '아반떼',
    series: 'CN7',
    yearRange: '2020~',
    category: '세단',
    infoCategory: '필름재단',
    filmCutWidth: '78',
    filmCutHeight: '1,470',
    filmCutNote: '',
    aliases: ['현대 아반떼', '아반떼'],
    memo: '고객 차량 이력',
  },
  {
    id: 'vehicle-bmw-x5',
    brand: 'BMW',
    model: 'X5',
    series: 'G05',
    yearRange: '수입',
    category: '수입 SUV',
    aliases: ['BMW X5', 'X5'],
    memo: '썬루프 점검 이력',
  },
  {
    id: 'vehicle-tesla-model-y',
    brand: '테슬라',
    model: 'Model Y',
    series: 'Model Y',
    yearRange: '2020~',
    category: '전기 SUV',
    aliases: ['테슬라 Model Y', 'Tesla Model Y', 'Model Y'],
    memo: 'ADAS 보정 안내 필요',
  },
  {
    id: 'vehicle-hyundai-ioniq5',
    brand: '현대',
    model: '아이오닉5',
    series: 'NE',
    yearRange: '2021~',
    category: '전기차',
    infoCategory: '필름재단',
    filmCutWidth: '86',
    filmCutHeight: '1,500',
    filmCutNote: '',
    aliases: ['현대 아이오닉5', '아이오닉5'],
    memo: '카드/견적 전환 이력',
  },
  {
    id: 'vehicle-kia-ev3',
    brand: '기아',
    model: 'EV3',
    series: 'EV3',
    yearRange: '2024~',
    category: '전기차',
    infoCategory: '필름재단',
    filmCutWidth: '81',
    filmCutHeight: '1,400',
    filmCutNote: '',
    aliases: ['기아 EV3', 'EV3'],
    memo: '필름재단 시트 기준',
  },
  {
    id: 'vehicle-kia-ev6',
    brand: '기아',
    model: 'EV6',
    series: 'EV6',
    yearRange: '2021~',
    category: '전기차',
    infoCategory: '필름재단',
    filmCutWidth: '94',
    filmCutHeight: '1,420',
    filmCutNote: '',
    aliases: ['기아 EV6', 'EV6'],
    memo: '필름재단 시트 기준',
  },
];

function getVehicleDisplayName(vehicle: Pick<VehicleCatalogItem, 'brand' | 'model'>) {
  return `${vehicle.brand} ${vehicle.model}`.trim();
}

function uniqueNonEmptyStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values
    .map((value) => value?.trim() ?? '')
    .filter((value) => {
      if (value.length === 0) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeVehicleModelValue(value: string) {
  const baseValue = value
    .split('/')[0]
    ?.replace(/\s+\d{4}~.*$/, '')
    .replace(/\s+/g, ' ')
    .trim() ?? '';

  return ['-', '공용', '일반'].includes(baseValue) ? '' : baseValue;
}

function addVehicleUsage(
  usageMap: Map<string, { count: number; sources: Set<string> }>,
  value: string | null | undefined,
  source: string,
) {
  const normalizedValue = normalizeVehicleModelValue(value ?? '');
  if (!normalizedValue) return;

  const key = normalizedValue.toLowerCase();
  const current = usageMap.get(key) ?? { count: 0, sources: new Set<string>() };
  current.count += 1;
  current.sources.add(source);
  usageMap.set(key, current);
}

function buildVehicleUsageMap() {
  const usageMap = new Map<string, { count: number; sources: Set<string> }>();

  estimates.forEach((estimate) => addVehicleUsage(usageMap, estimate.vehicle, '견적'));
  workerWorkListRecords.forEach((record) => addVehicleUsage(usageMap, record.vehicle, '작업'));
  claims.forEach((claim) => addVehicleUsage(usageMap, claim.vehicle, '청구'));
  customers.forEach((customer) => addVehicleUsage(usageMap, customer.vehicle, '고객'));
  ledgerRecords.forEach((record) => addVehicleUsage(usageMap, record.vehicle, '장부'));
  cardSettlements.forEach((record) => addVehicleUsage(usageMap, record.vehicle ?? record.plate, '카드'));
  estimateConversions.forEach((record) => addVehicleUsage(usageMap, record.vehicle, '견적전환'));
  inventory.forEach((item) => addVehicleUsage(usageMap, item.compatible, '재고'));

  return usageMap;
}

function resolveVehicleUsage(
  seed: Omit<VehicleCatalogItem, 'source' | 'updatedAt' | 'usageCount'>,
  usageMap: Map<string, { count: number; sources: Set<string> }>,
) {
  const lookupKeys = uniqueNonEmptyStrings([
    getVehicleDisplayName(seed),
    seed.model,
    seed.series,
    ...seed.aliases,
  ]).map((value) => value.toLowerCase());
  const sources = new Set<string>();
  let count = 0;

  lookupKeys.forEach((key) => {
    const usage = usageMap.get(key);
    if (!usage) return;
    count += usage.count;
    usage.sources.forEach((source) => sources.add(source));
  });

  return {
    count,
    source: sources.size > 0 ? Array.from(sources).join('/') : '기존 자료',
  };
}

function buildInitialVehicleCatalog(): VehicleCatalogItem[] {
  const usageMap = buildVehicleUsageMap();

  return vehicleCatalogSeed.map((seed) => {
    const usage = resolveVehicleUsage(seed, usageMap);
    return {
      ...seed,
      source: usage.source,
      updatedAt: '2026.05.21',
      usageCount: usage.count,
    };
  });
}

const defaultVehicleCatalog = buildInitialVehicleCatalog();

function isVehicleCatalogItem(value: unknown): value is VehicleCatalogItem {
  if (typeof value !== 'object' || value === null) return false;

  const item = value as Partial<Record<keyof VehicleCatalogItem, unknown>>;
  const validInfoCategory =
    item.infoCategory === undefined || item.infoCategory === '차량정보' || item.infoCategory === '필름재단';
  const validFilmCutFields =
    (item.filmCutWidth === undefined || typeof item.filmCutWidth === 'string') &&
    (item.filmCutHeight === undefined || typeof item.filmCutHeight === 'string') &&
    (item.filmCutNote === undefined || typeof item.filmCutNote === 'string');

  return (
    typeof item.id === 'string' &&
    typeof item.brand === 'string' &&
    typeof item.model === 'string' &&
    typeof item.series === 'string' &&
    typeof item.yearRange === 'string' &&
    typeof item.category === 'string' &&
    validInfoCategory &&
    validFilmCutFields &&
    Array.isArray(item.aliases) &&
    item.aliases.every((alias) => typeof alias === 'string') &&
    typeof item.source === 'string' &&
    typeof item.memo === 'string' &&
    typeof item.updatedAt === 'string' &&
    typeof item.usageCount === 'number'
  );
}

function readVehicleCatalogStorage() {
  if (typeof window === 'undefined') return [];

  try {
    const rawValue = window.localStorage.getItem(VEHICLE_CATALOG_STORAGE_KEY);
    if (!rawValue) return [];
    const parsedValue: unknown = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue.filter(isVehicleCatalogItem) : [];
  } catch {
    return [];
  }
}

function writeVehicleCatalogStorage(catalog: VehicleCatalogItem[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(VEHICLE_CATALOG_STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    // Browser storage can be unavailable in privacy modes.
  }
}

function mergeVehicleCatalogItem(existing: VehicleCatalogItem, incoming: VehicleCatalogItem): VehicleCatalogItem {
  const infoCategory = incoming.infoCategory ?? existing.infoCategory;
  const filmCutWidth = incoming.filmCutWidth?.trim() ? incoming.filmCutWidth : existing.filmCutWidth;
  const filmCutHeight = incoming.filmCutHeight?.trim() ? incoming.filmCutHeight : existing.filmCutHeight;
  const filmCutNote = incoming.filmCutNote?.trim() ? incoming.filmCutNote : existing.filmCutNote;

  return {
    ...existing,
    ...incoming,
    aliases: uniqueNonEmptyStrings([...existing.aliases, ...incoming.aliases]),
    ...(infoCategory ? { infoCategory } : {}),
    ...(filmCutWidth ? { filmCutWidth } : {}),
    ...(filmCutHeight ? { filmCutHeight } : {}),
    ...(filmCutNote ? { filmCutNote } : {}),
    usageCount: Math.max(existing.usageCount, incoming.usageCount),
    memo: incoming.memo.trim() ? incoming.memo : existing.memo,
  };
}

function mergeVehicleCatalog(catalog: VehicleCatalogItem[], additions: VehicleCatalogItem[]) {
  const byModel = new Map<string, VehicleCatalogItem>();

  [...catalog, ...additions].forEach((vehicle) => {
    const key = getVehicleDisplayName(vehicle).toLowerCase();
    const existing = byModel.get(key);
    byModel.set(key, existing ? mergeVehicleCatalogItem(existing, vehicle) : vehicle);
  });

  return Array.from(byModel.values()).sort((a, b) => getVehicleDisplayName(a).localeCompare(getVehicleDisplayName(b), 'ko'));
}

function formatVehicleUpdatedDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function parseVehicleAliases(value: string) {
  return uniqueNonEmptyStrings(value.split(/[\n,]/));
}

function createVehicleCatalogItem(draft: VehicleCatalogDraft): VehicleCatalogItem {
  const brand = draft.brand.trim();
  const model = draft.model.trim();
  const displayName = `${brand} ${model}`.trim();
  const aliases = uniqueNonEmptyStrings([displayName, model, ...parseVehicleAliases(draft.aliases)]);

  return {
    id: `vehicle-admin-${Date.now()}`,
    brand,
    model,
    series: draft.series.trim() || '-',
    yearRange: draft.yearRange.trim() || '-',
    category: draft.category.trim() || '미분류',
    infoCategory: draft.infoCategory,
    ...(draft.infoCategory === '필름재단'
      ? {
          filmCutWidth: draft.filmCutWidth.trim(),
          filmCutHeight: draft.filmCutHeight.trim(),
          filmCutNote: draft.filmCutNote.trim(),
        }
      : {}),
    aliases,
    source: '관리자 추가',
    memo: draft.memo.trim() || '신규 차량 정보',
    updatedAt: formatVehicleUpdatedDate(),
    usageCount: 0,
  };
}

function buildVehiclePlateSuggestions() {
  return uniqueNonEmptyStrings([
    ...VEHICLE_LOOKUP_SUGGESTIONS,
    ...customers.map((customer) => customer.vehicle.split('/')[1]?.trim()),
    ...workerWorkListRecords.map((record) => record.plateNumber),
    ...ledgerRecords.map((record) => record.plate),
    ...cardSettlements.map((record) => record.plate),
    ...estimateConversions.map((record) => record.plate),
  ]);
}

function buildVehicleSuggestions(catalog: VehicleCatalogItem[]): VehicleSuggestionSet {
  const modelSuggestions = uniqueNonEmptyStrings(
    catalog.flatMap((vehicle) => [
      getVehicleDisplayName(vehicle),
      vehicle.model,
      vehicle.series,
      ...vehicle.aliases,
    ]),
  );
  const brandSuggestions = uniqueNonEmptyStrings(catalog.map((vehicle) => vehicle.brand));
  const yearRangeSuggestions = uniqueNonEmptyStrings(catalog.map((vehicle) => vehicle.yearRange).filter((yearRange) => yearRange !== '-'));

  return {
    lookup: uniqueNonEmptyStrings([...buildVehiclePlateSuggestions(), ...modelSuggestions, ...brandSuggestions]),
    model: modelSuggestions,
    brand: brandSuggestions,
    yearRange: yearRangeSuggestions,
  };
}

function isDomesticVehicle(vehicle: VehicleCatalogItem) {
  return DOMESTIC_VEHICLE_BRANDS.has(vehicle.brand);
}

function isFilmCutVehicle(vehicle: VehicleCatalogItem) {
  return (
    vehicle.infoCategory === '필름재단' ||
    Boolean(vehicle.filmCutWidth?.trim()) ||
    Boolean(vehicle.filmCutHeight?.trim()) ||
    Boolean(vehicle.filmCutNote?.trim())
  );
}

function formatFilmCutSize(vehicle: VehicleCatalogItem) {
  const width = vehicle.filmCutWidth?.trim();
  const height = vehicle.filmCutHeight?.trim();
  const note = vehicle.filmCutNote?.trim();
  if (!width && !height && !note) return '-';

  return [
    `가로 ${width || '-'}`,
    `세로 ${height || '-'}`,
    note ? `비고 ${note}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

const WARRANTY_DEFAULT_REPAIR_CONTENT = `다음 사항은 필름 시공 후 주의사항이오니 반드시 숙지해 주십시오.

- 필름 시공 후 유리와의 완전한 접착을 위해 7일 동안은 유리를 닦지 마십시오.
- 내부에서 유리를 닦으실 때는 알코올 성분은 쓰지 마시고 미온수와 마른 수건으로 닦아주십시오.
- 연마제가 포함되어 있는 패드, 클리너, 공업용 강력 글라스 클리너 등은 사용하지 마십시오.
- 시공된 필름의 가장자리를 뜯지 마십시오.
- 습기로 인한 물자국이나 얼룩은 최소 7일 ~ 30일 후 자연스럽게 없어집니다.
- 전면유리에 부착된 블랙박스, 하이패스, 스티커는 7일 후에 위치변경 가능합니다.`;

function createWarrantyDraft(record?: WarrantyRecord): WarrantyDraft {
  if (record) {
    return { ...record, memo: '' };
  }

  return {
    id: `warranty-${Date.now()}`,
    type: '썬팅',
    workDate: new Date().toISOString().slice(0, 10),
    customerName: '',
    customerPhone: '',
    vehicle: '',
    plate: '',
    workDescription: '전체 썬팅시공',
    partNo: '',
    frontFilm: '',
    sideFirstFilm: '',
    sideRearFilm: '',
    repairContent: WARRANTY_DEFAULT_REPAIR_CONTENT,
    status: '미발행',
    tone: 'orange',
    memo: '',
  };
}

function isWarrantySourceWorkRecord(record: WorkerWorkListRecord) {
  if (record.kind !== '작업' || record.status !== '완료') return false;

  const target = [record.title, record.stock, record.vehicle, record.company].join(' ');
  return /썬팅|필름|틴팅|tint|rayno|레이노|t-nine|티나인|llumar|루마|3m/i.test(target);
}

function findWarrantyCustomerPhone(record: WorkerWorkListRecord) {
  const customerName = record.customer.trim();
  const customer = customers.find(
    (item) =>
      item.name === customerName ||
      item.name.includes(customerName) ||
      customerName.includes(item.name) ||
      matchesCustomerRecord(item, [record.customer, record.vehicle, record.plateNumber]),
  );
  if (customer?.phone) return customer.phone;

  const estimate = estimates.find(
    (item) =>
      item.customer === record.customer &&
      (item.vehicle === record.vehicle || normalizeWorkDate(item.scheduledWorkDate ?? '') === normalizeWorkDate(record.date)),
  );
  return estimate?.phone ?? '';
}

function normalizeWarrantyPartNoFromWork(record: WorkerWorkListRecord) {
  const stock = record.stock.trim();
  if (!stock || stock === '-') return '';
  return stock.replace(/\s+\d+개$/u, '');
}

function inferWarrantyFilmFromWork(record: WorkerWorkListRecord) {
  const target = [record.title, record.stock].join(' ');
  if (/rayno|레이노/i.test(target)) return '[RAYNO] 시공 필름';
  if (/t-nine|티나인/i.test(target)) return '[T-NINE] 시공 필름';
  if (/llumar|루마/i.test(target)) return '[LLumar] 시공 필름';
  if (/3m/i.test(target)) return '[3M] 시공 필름';
  return '';
}

function createWarrantyDraftFromWorkRecord(record: WorkerWorkListRecord, current?: WarrantyDraft): WarrantyDraft {
  const base = current ?? createWarrantyDraft();
  const workDate = normalizeWorkDate(record.date) || base.workDate;
  const workDescription = firstLine(record.title) || base.workDescription || '썬팅시공';
  const status: WarrantyStatus = base.status === '발행완료' ? base.status : '미발행';
  const frontFilm = inferWarrantyFilmFromWork(record) || base.frontFilm;

  return normalizeWarrantyDraft({
    ...base,
    type: '썬팅',
    workDate,
    customerName: record.customer,
    customerPhone: findWarrantyCustomerPhone(record) || base.customerPhone,
    vehicle: record.vehicle,
    plate: record.plateNumber === '-' ? base.plate : record.plateNumber,
    workDescription,
    partNo: normalizeWarrantyPartNoFromWork(record) || base.partNo,
    frontFilm,
    repairContent: `${workDescription} 작업 후 필름 보증 안내`,
    status,
    tone: getWarrantyTone(status, workDate),
  });
}

function formatWarrantySourceWorkLabel(record: WorkerWorkListRecord) {
  return compactTextParts([
    normalizeWorkDate(record.date) || record.date,
    record.customer,
    record.vehicle,
    record.plateNumber === '-' ? '' : record.plateNumber,
    firstLine(record.title),
  ]);
}

function isPastWarrantyWorkDate(workDate: string) {
  const workDateValue = parseDateInput(workDate);
  if (!workDateValue) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  workDateValue.setHours(0, 0, 0, 0);
  return workDateValue.getTime() < today.getTime();
}

function isUnissuedWarranty(record: Pick<WarrantyRecord, 'status' | 'workDate'>) {
  return record.status === '미발행' && isPastWarrantyWorkDate(record.workDate);
}

function getWarrantyTone(status: WarrantyStatus, workDate?: string): Tone {
  if (status === '발행완료') return 'green';
  if (status === '확인필요') return 'orange';
  if (workDate && isPastWarrantyWorkDate(workDate)) return 'red';
  return 'orange';
}

function normalizeWarrantyDraft(draft: WarrantyDraft): WarrantyDraft {
  return {
    ...draft,
    type: draft.type.trim() || '썬팅',
    workDate: draft.workDate || new Date().toISOString().slice(0, 10),
    customerName: draft.customerName.trim() || '-',
    customerPhone: draft.customerPhone.trim(),
    vehicle: draft.vehicle.trim(),
    plate: draft.plate.trim(),
    workDescription: draft.workDescription.trim() || '썬팅시공',
    partNo: draft.partNo.trim(),
    frontFilm: draft.frontFilm.trim(),
    sideFirstFilm: draft.sideFirstFilm.trim(),
    sideRearFilm: draft.sideRearFilm.trim(),
    repairContent: draft.repairContent.trim(),
    memo: draft.memo.trim(),
    tone: getWarrantyTone(draft.status, draft.workDate),
  };
}

function createWarrantyRecordFromDraft(draft: WarrantyDraft): WarrantyRecord {
  const normalized = normalizeWarrantyDraft(draft);
  const { memo: _memo, ...record } = normalized;
  return record;
}

function formatWarrantyFilmSummary(draft: Pick<WarrantyDraft, 'frontFilm' | 'sideFirstFilm' | 'sideRearFilm'>) {
  return [
    draft.frontFilm ? `전면 ${draft.frontFilm}` : '',
    draft.sideFirstFilm ? `측(1열) ${draft.sideFirstFilm}` : '',
    draft.sideRearFilm ? `측(2열)+후면 ${draft.sideRearFilm}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function printText(value: string) {
  return escapeHtml(value.trim() || '-').replace(/\n/g, '<br>');
}

function buildWarrantyPrintHtml(draft: WarrantyDraft) {
  const normalized = normalizeWarrantyDraft(draft);
  const filmSummary = formatWarrantyFilmSummary(normalized) || '-';
  const repairContent =
    normalized.repairContent ||
    WARRANTY_DEFAULT_REPAIR_CONTENT;

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>썬팅 필름 보증서 - ${escapeHtml(normalized.plate || normalized.vehicle || '미리보기')}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f2f4f6; color: #1f2937; font-family: "Malgun Gothic", Arial, sans-serif; }
    .print-toolbar { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px; }
    .print-toolbar button { min-height: 36px; padding: 0 14px; border: 0; border-radius: 8px; background: #3182f6; color: #fff; font-weight: 800; cursor: pointer; }
    .warranty-paper { width: 210mm; min-height: 297mm; margin: 0 auto 24px; padding: 18mm 16mm; background: #fff; border: 1px solid #d8dee8; }
    .warranty-paper-header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 16px; border-bottom: 4px solid #283592; }
    .warranty-company strong { display: block; color: #283592; font-size: 22px; }
    .warranty-company span, .warranty-meta { color: #667085; font-size: 12px; line-height: 1.6; text-align: right; }
    .warranty-title { padding: 26px 0 22px; text-align: center; }
    .warranty-title h1 { margin: 0; color: #283592; font-size: 34px; letter-spacing: 0; }
    .warranty-title p { margin: 8px 0 0; color: #98a2b3; font-size: 17px; }
    .warranty-subtitle { margin-top: 12px; color: #4e5968; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { min-height: 44px; padding: 12px 10px; border: 1px solid #222; font-size: 14px; line-height: 1.55; vertical-align: middle; }
    th { width: 18%; background: #f1f3f5; color: #4e5968; text-align: center; font-weight: 800; }
    td { color: #111827; }
    .notice-title { margin-top: 18px; padding: 10px; border: 1px solid #222; border-bottom: 0; background: #f1f3f5; text-align: center; font-weight: 900; }
    .notice-box { min-height: 178px; padding: 18px; border: 1px solid #222; font-size: 13px; line-height: 1.9; white-space: pre-line; }
    .warranty-sign { display: grid; gap: 10px; justify-items: center; margin-top: 30px; text-align: center; }
    .warranty-sign strong { font-size: 24px; font-weight: 500; }
    .warranty-seal-row { display: flex; align-items: center; gap: 14px; color: #4e5968; font-size: 16px; font-weight: 800; }
    .warranty-seal { display: inline-grid; place-items: center; width: 58px; height: 58px; border: 2px solid #d92d20; border-radius: 50%; color: #d92d20; font-weight: 900; }
    .warranty-confirm { color: #4e5968; font-size: 13px; }
    @media print {
      body { background: #fff; }
      .print-toolbar { display: none; }
      .warranty-paper { margin: 0; border: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar"><button onclick="window.print()">PDF 저장/인쇄</button></div>
  <article class="warranty-paper">
    <header class="warranty-paper-header">
      <div class="warranty-company">
        <strong>${escapeHtml(BRAND_NAME)}</strong>
        <span>자동차 유리 · 썬팅 시공 보증 관리</span>
      </div>
      <div class="warranty-meta">보증서 번호: ${escapeHtml(normalized.id)}<br>발행일: ${escapeHtml(normalized.workDate)}</div>
    </header>
    <section class="warranty-title">
      <h1>썬팅 필름 보증서</h1>
      <p>Genuine Product Certification</p>
      <div class="warranty-subtitle">본 시공은 ${escapeHtml(BRAND_NAME)}에서 진행하였습니다.</div>
    </section>
    <table>
      <tbody>
        <tr><th>고객 성함</th><td>${printText(normalized.customerName)}</td><th>고객 연락처</th><td>${printText(normalized.customerPhone)}</td></tr>
        <tr><th>브랜드/차종</th><td>${printText(normalized.vehicle)}</td><th>필름사양</th><td>${printText(filmSummary)}</td></tr>
        <tr><th>시공날짜</th><td>${printText(normalized.workDate)}</td><th>차량번호</th><td>${printText(normalized.plate)}</td></tr>
        <tr><th>시공내역</th><td colspan="3">${printText(normalized.workDescription)}</td></tr>
      </tbody>
    </table>
    <div class="notice-title">수리원인 및 정비 내용</div>
    <div class="notice-box">${printText(repairContent)}</div>
    <footer class="warranty-sign">
      <strong>${escapeHtml(BRAND_NAME)}</strong>
      <div class="warranty-seal-row"><span>대표</span><span class="warranty-seal">인</span></div>
      <span class="warranty-confirm">위와 같이 수리내용을 확인합니다.</span>
    </footer>
  </article>
</body>
</html>`;
}

function appModeForPage(page: PageId | null): AppMode {
  if (!page) return 'worker';

  const workerPageIds = new Set(collectSidebarNavItems(WORKER_NAV_GROUPS).map((item) => item.id));
  const adminPageIds = new Set(collectSidebarNavItems(ADMIN_NAV_GROUPS).map((item) => item.id));
  const dbPageIds = new Set(collectSidebarNavItems(DB_NAV_GROUPS).map((item) => item.id));

  if (dbPageIds.has(page) && !workerPageIds.has(page)) return 'db';
  if (adminPageIds.has(page) && !workerPageIds.has(page)) return 'admin';
  return 'worker';
}

function modeDetailLabel(mode: AppMode) {
  if (mode === 'worker') return '현장 업무 중심';
  if (mode === 'admin') return '전체 관리 중심';
  return '기준 데이터 중심';
}

function defaultModePage(mode: AppMode) {
  return MODE_OPTIONS.find((option) => option.id === mode)?.defaultPage ?? 'dashboard';
}

function normalizeInitialPage(mode: AppMode, page: PageId | null) {
  if (mode === 'worker' && (!page || page === 'dashboard')) return defaultModePage(mode);
  return page ?? defaultModePage(mode);
}

function preferredGroupNode(group: SidebarNavGroup) {
  return group.items.find((item) => item.children?.length) ?? group.items[0] ?? null;
}

function firstPageInNode(node: SidebarNavNode | null) {
  if (!node) return null;
  return node.pageId ?? node.children?.find((child) => child.pageId)?.pageId ?? null;
}

function defaultExpandedGroupIds(mode: AppMode) {
  return new Set(
    sidebarGroupsForMode(mode)
      .filter((group) => group.items.length > 1 || group.items.some((item) => item.children?.length))
      .map((group) => group.id),
  );
}

function defaultExpandedNodeIds(mode: AppMode) {
  void mode;
  return new Set<string>();
}

function App() {
  const initialPage = readPageSearchParam();
  const initialMode = appModeForPage(initialPage);
  const initialActivePage = normalizeInitialPage(initialMode, initialPage);
  const initialSidebarPath = findSidebarNavPath(initialMode, initialActivePage);
  const todayHeaderLabel = useMemo(() => formatTodayHeaderLabel(), []);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () =>
      readLoginStorageValue(LOGIN_STORAGE_KEYS.autoLogin) === 'true' &&
      Boolean(readLoginStorageValue(LOGIN_STORAGE_KEYS.rememberedId)),
  );
  const [appMode, setAppMode] = useState<AppMode>(() => initialMode);
  const [activePage, setActivePage] = useState<PageId>(() => initialActivePage);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [activeGroupId, setActiveGroupId] = useState(() => initialSidebarPath?.group.id ?? 'overview');
  const [activeNodeId, setActiveNodeId] = useState(() => initialSidebarPath?.node.id ?? null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => defaultExpandedGroupIds(initialMode));
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => defaultExpandedNodeIds(initialMode));
  const [customerModalId, setCustomerModalId] = useState<string | null>(null);
  const [isEstimateRegistrationOpen, setIsEstimateRegistrationOpen] = useState(false);
  const [isVehicleRegistrationOpen, setIsVehicleRegistrationOpen] = useState(false);
  const [workRecords, setWorkRecords] = useState<WorkerWorkListRecord[]>(() =>
    workerWorkListRecords.filter((record) => record.kind === '작업'),
  );
  const [vehicleCatalog, setVehicleCatalog] = useState<VehicleCatalogItem[]>(() =>
    mergeVehicleCatalog(defaultVehicleCatalog, readVehicleCatalogStorage()),
  );
  const [purchasePartnerFilter, setPurchasePartnerFilter] = useState(() => readSearchParam('purchasePartner') ?? '');
  const [purchaseMonthFilter, setPurchaseMonthFilter] = useState(() => readSearchParam('purchaseMonth') ?? '');
  const vehicleSuggestions = useMemo(() => buildVehicleSuggestions(vehicleCatalog), [vehicleCatalog]);
  const globalSearchSuggestions = useMemo(() => buildGlobalSearchSuggestions(vehicleSuggestions), [vehicleSuggestions]);
  const globalSearchOptions = useMemo<SearchSuggestion[]>(
    () =>
      globalSearchSuggestions.map((suggestion) => ({
        id: suggestion.id,
        value: suggestion.value,
        label: suggestion.label,
        detail: suggestion.detail,
      })),
    [globalSearchSuggestions],
  );
  const navGroups = sidebarGroupsForMode(appMode);
  const navItems = collectSidebarNavItems(navGroups);
  const activeGroup = navGroups.find((group) => group.id === activeGroupId) ?? navGroups[0]!;
  const activeNode = activeGroup.items.find((item) => item.id === activeNodeId) ?? activeGroup.items[0] ?? null;
  const topNavItems = TOP_NAV_PAGE_IDS.map((id) => navItems.find((item) => item.id === id)).filter(
    (item): item is NavItem => Boolean(item),
  );
  const activeMode = MODE_OPTIONS.find((mode) => mode.id === appMode) ?? MODE_OPTIONS[0]!;
  const activeModeDetail = modeDetailLabel(appMode);
  const modalCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerModalId) ?? null,
    [customerModalId],
  );
  const workPaymentScheduleItems = useMemo(() => workRecordsToPaymentScheduleItems(workRecords), [workRecords]);
  const cardSalesSettlements = useMemo(() => [...workRecordsToCardSettlements(workRecords), ...cardSettlements], [workRecords]);
  const activeNav = ALL_NAV_ITEMS.find((item) => item.id === activePage) ?? ALL_NAV_ITEMS[0]!;
  useEffect(() => {
    writeVehicleCatalogStorage(vehicleCatalog);
  }, [vehicleCatalog]);

  useEffect(() => {
    const path = findSidebarNavPath(appMode, activePage);
    if (!path) return;

    setActiveGroupId(path.group.id);
    setActiveNodeId(path.node.id);
  }, [activePage, appMode]);

  function handleModeChange(nextMode: AppMode) {
    const nextModeOption = MODE_OPTIONS.find((mode) => mode.id === nextMode) ?? MODE_OPTIONS[0]!;
    const nextGroups = sidebarGroupsForMode(nextMode);
    const nextPage = nextModeOption.defaultPage;
    const nextPath = findSidebarNavPath(nextMode, nextPage);
    setAppMode(nextMode);
    setActiveGroupId(nextPath?.group.id ?? nextGroups[0]?.id ?? 'overview');
    setActiveNodeId(nextPath?.node.id ?? null);
    setExpandedGroupIds(defaultExpandedGroupIds(nextMode));
    setExpandedNodeIds(defaultExpandedNodeIds(nextMode));
    navigatePage(nextPage);
  }

  function handleGroupSelect(group: SidebarNavGroup) {
    const isSinglePageGroup = group.items.length === 1 && !group.items[0]?.children?.length;
    const isExpanded = expandedGroupIds.has(group.id);

    if (!isSinglePageGroup) {
      setExpandedGroupIds((current) => {
        const next = new Set(current);
        if (isExpanded) {
          next.delete(group.id);
        } else {
          next.add(group.id);
        }
        return next;
      });
    }

    const currentNode = group.items.find((item) => item.pageId === activePage || nodeContainsPage(item, activePage));
    const nextNode = currentNode ?? preferredGroupNode(group);
    setActiveGroupId(group.id);
    setActiveNodeId(nextNode?.id ?? null);

    if (isSinglePageGroup) {
      const firstNode = group.items[0];
      if (firstNode?.pageId) navigatePage(firstNode.pageId);
      return;
    }

    const nextPage = !isExpanded && !currentNode ? firstPageInNode(nextNode) : null;
    if (nextPage) {
      navigatePage(nextPage);
    }
  }

  function handleNodeSelect(node: SidebarNavNode) {
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = expandedNodeIds.has(node.id);
    setActiveNodeId(node.id);

    if (hasChildren) {
      setExpandedNodeIds((current) => {
        const next = new Set(current);
        if (isExpanded) {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
        return next;
      });

      if (!isExpanded) {
        const nextPage = node.pageId ?? node.children?.find((child) => child.pageId)?.pageId;
        if (nextPage) navigatePage(nextPage);
      }
      return;
    }

    if (node.pageId) {
      navigatePage(node.pageId);
      return;
    }

    const firstChildPage = findNodeByPageId(node.children, activePage)?.pageId ?? node.children?.find((child) => child.pageId)?.pageId;
    if (firstChildPage) {
      navigatePage(firstChildPage);
    }
  }

  function navigatePage(nextPage: PageId) {
    if (nextPage !== 'purchase') {
      setPurchasePartnerFilter('');
      setPurchaseMonthFilter('');
    }
    setActivePage(nextPage);
    setIsEstimateRegistrationOpen(false);
    setIsVehicleRegistrationOpen(false);
    updateUrlSearchParams({
      page: nextPage,
      ...(nextPage === 'purchase' ? {} : { purchasePartner: null, purchaseMonth: null }),
      ...(nextPage === 'work' ? {} : { workItem: null, workPage: null, workPageSize: null, workView: null }),
    });
  }

  function openPurchasePartner(partner: string, monthKey: string) {
    const nextPage: PageId = 'purchase';
    setAppMode(appModeForPage(nextPage));
    setPurchasePartnerFilter(partner);
    setPurchaseMonthFilter(monthKey);
    setActivePage(nextPage);
    setIsEstimateRegistrationOpen(false);
    setIsVehicleRegistrationOpen(false);
    updateUrlSearchParams({
      page: nextPage,
      purchasePartner: partner,
      purchaseMonth: monthKey,
      workItem: null,
      workPage: null,
      workPageSize: null,
      workView: null,
    });
  }

  function openPaymentSource(payment: PaymentScheduleItem) {
    if (payment.id.startsWith('work-payment-')) {
      const nextPage: PageId = 'work';
      const workItem = payment.id.replace(/^work-payment-/u, '');
      setAppMode(appModeForPage(nextPage));
      setPurchasePartnerFilter('');
      setPurchaseMonthFilter('');
      setActivePage(nextPage);
      setIsEstimateRegistrationOpen(false);
      setIsVehicleRegistrationOpen(false);
      updateUrlSearchParams({
        page: nextPage,
        workView: 'list',
        workPage: '1',
        workPageSize: '20',
        workItem,
        purchasePartner: null,
        purchaseMonth: null,
      });
      return;
    }

    openPurchasePartner(payment.partner, paymentMonthKeyFromDate(payment.date));
  }

  function handleGlobalSearchSelect(value: string) {
    const selectedSuggestion = globalSearchSuggestions.find((suggestion) => suggestion.value === value);
    if (!selectedSuggestion) return;

    const nextMode = appModeForPage(selectedSuggestion.pageId);
    setAppMode(nextMode);
    setCustomerModalId(selectedSuggestion.customerId ?? null);
    navigatePage(selectedSuggestion.pageId);
  }

  function handleCustomerDetailNavigate(page: PageId) {
    setAppMode(appModeForPage(page));
    setCustomerModalId(null);
    navigatePage(page);
  }

  function isTopNavActive(item: NavItem) {
    if (activePage === item.id) return true;

    const activePath = findSidebarNavPath(appMode, activePage);
    return item.id === 'sales' && activePath?.group.id === 'sales';
  }

  function handleAddVehicle(draft: VehicleCatalogDraft) {
    const vehicle = createVehicleCatalogItem(draft);
    setVehicleCatalog((current) => mergeVehicleCatalog(current, [vehicle]));
  }

  function handleCreateEstimateWorkRecord(record: WorkerWorkListRecord) {
    setWorkRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);
  }

  function renderSidebarNode(node: SidebarNavNode, depth: 3 | 4): ReactNode {
    const Icon = node.icon;
    const hasChildren = Boolean(node.children?.length);
    const isOpen = hasChildren && expandedNodeIds.has(node.id);
    const isActive = node.pageId === activePage || nodeContainsPage(node, activePage);

    return (
      <div className="nav-tree-node" key={node.id}>
        <button
          className={`nav-item nav-tree-item nav-tree-level-${depth} ${hasChildren ? 'has-children' : ''} ${
            isActive ? 'active' : ''
          } ${isOpen ? 'open' : ''}`}
          onClick={() => handleNodeSelect(node)}
          title={node.label}
          type="button"
        >
          <Icon size={16} />
          <span>{node.label}</span>
          <span className="nav-trailing">
            {node.count ? <em>{node.count}</em> : null}
            {hasChildren ? <ChevronRight className="nav-chevron" size={14} /> : null}
          </span>
        </button>
        {isOpen ? (
          <div className="nav-tree-children">
            {node.children?.map((child) => renderSidebarNode(child, 4))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <>
    <main className="app-shell">
      <header className="app-header">
        <button className="app-header-brand" onClick={() => navigatePage('dashboard')}>
          <BrandIdentity logoSrc={LOGO_SRC} title={SERVICE_NAME} />
        </button>
        <nav className="app-top-nav" aria-label="상단 메뉴">
          {topNavItems.map((item) => (
            <button
              className={isTopNavActive(item) ? 'active' : ''}
              key={item.id}
              onClick={() => navigatePage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="app-header-tools">
          <SearchInput
            className="global-search-typeahead app-header-global-search"
            label="빠른 검색"
            labelHidden
            listId="global-search"
            onChange={setGlobalSearchQuery}
            onSelect={handleGlobalSearchSelect}
            placeholder="이름, 차량번호, 부품번호 검색"
            suggestions={globalSearchOptions}
            value={globalSearchQuery}
          />
          <div className="app-header-actions">
            <button>알림</button>
            <button>내 정보</button>
          </div>
        </div>
      </header>

      <aside className="sidebar" aria-label="주요 메뉴">
        <div className="sidebar-rail" aria-label="화면 모드">
          {MODE_OPTIONS.map((mode) => {
            const ModeIcon = mode.icon;
            return (
              <button
                className={appMode === mode.id ? 'active' : ''}
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                title={`${mode.label} 화면`}
                type="button"
              >
                <ModeIcon size={17} />
              </button>
            );
          })}
        </div>
        <nav className="nav-list" aria-label={`${activeMode.label} 메뉴`}>
            <div className="mode-context">
              <span>{activeMode.label} 화면</span>
              <strong>{activeModeDetail}</strong>
            </div>
          <section className="nav-section nav-tree">
            <p className="nav-section-title">2차 메뉴</p>
            {navGroups.map((group) => {
              const Icon = group.icon;
              const isOpen = expandedGroupIds.has(group.id);
              const isSinglePageGroup = group.items.length === 1 && !group.items[0]?.children?.length;
              const isActive = group.items.some((item) => item.pageId === activePage || nodeContainsPage(item, activePage));

              return (
                <div className="nav-tree-group" key={group.id}>
                  <button
                    className={`nav-item nav-tree-item nav-tree-level-2 ${isActive ? 'active' : ''} ${
                      isOpen ? 'open' : ''
                    }`}
                    onClick={() => handleGroupSelect(group)}
                    title={group.label}
                    type="button"
                  >
                    <Icon size={17} />
                    <span>{group.label}</span>
                    {!isSinglePageGroup ? (
                      <span className="nav-trailing">
                        <ChevronRight className="nav-chevron" size={14} />
                      </span>
                    ) : null}
                  </button>
                  {!isSinglePageGroup && isOpen ? (
                    <div className="nav-tree-children">
                      {group.items.map((item) => renderSidebarNode(item, 3))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{todayHeaderLabel}</p>
            <div className="topbar-title-row">
              <h1>{activeNav.label}</h1>
              <span>{activeMode.label} 화면</span>
            </div>
          </div>
        </header>

        {activePage === 'dashboard' && <Dashboard onOpenCustomer={() => navigatePage('customers')} />}
        {activePage === 'revenue' && <RevenuePage />}
        {activePage === 'sales' && <SalesPage />}
        {activePage === 'purchase' && (
          <PurchasePage
            monthFilter={purchaseMonthFilter}
            partnerFilter={purchasePartnerFilter}
          />
        )}
        {activePage === 'paymentList' && (
          <PaymentListPage
            onOpenPurchasePartner={openPurchasePartner}
            workRecords={workRecords}
          />
        )}
        {activePage === 'ledger' && <LedgerWorkbookPage vehicleModelSuggestions={vehicleSuggestions.model} />}
        {activePage === 'cardSales' && <CardSalesPage settlements={cardSalesSettlements} />}
        {activePage === 'statisticsKp' && (
          <KpStatisticsPage
            setWorkRecords={setWorkRecords}
            workRecords={workRecords}
          />
        )}
        {activePage === 'estimates' && (
          <EstimatesPage
            onCreateWorkRecord={handleCreateEstimateWorkRecord}
            onOpenRegistration={() => setIsEstimateRegistrationOpen(true)}
            vehicleSuggestions={vehicleSuggestions}
          />
        )}
        {activePage === 'work' && (
          <WorkPage
            mode={appMode === 'admin' ? 'admin' : 'worker'}
            setWorkRecords={setWorkRecords}
            vehicleModelSuggestions={vehicleSuggestions.model}
            workRecords={workRecords}
          />
        )}
        {activePage === 'schedule' && (
          <SchedulePage
            cardSettlements={cardSalesSettlements}
            linkedPayments={workPaymentScheduleItems}
            onOpenPaymentSource={openPaymentSource}
            workRecords={workRecords}
          />
        )}
        {(activePage === 'priceBook' || activePage === 'partNumberList') && <PriceBookPage />}
        {activePage === 'warranty' && (
          <WarrantyPage
            vehicleModelSuggestions={vehicleSuggestions.model}
            workRecords={workRecords}
          />
        )}
        {activePage === 'claims' && <ClaimsPage />}
        {activePage === 'inventory' && <InventoryPage />}
        {activePage === 'vehicles' && (
          <VehicleInformationPage
            isAddOpen={isVehicleRegistrationOpen}
            onAddVehicle={handleAddVehicle}
            onCloseAdd={() => setIsVehicleRegistrationOpen(false)}
            onOpenAdd={() => setIsVehicleRegistrationOpen(true)}
            vehicles={vehicleCatalog}
            vehicleSuggestions={vehicleSuggestions}
          />
        )}
        {activePage === 'customers' && <CustomersPage onOpenCustomer={setCustomerModalId} />}
        {activePage === 'partners' && <PartnersPage />}
        {activePage === 'attachments' && <AttachmentsPage />}
        {activePage === 'sheetImport' && <SheetImportPage />}
        {activePage === 'settings' && <SettingsPage />}
        {PLACEHOLDER_PAGE_IDS.has(activePage) && <PlaceholderPage item={activeNav} modeLabel={activeMode.label} />}
      </section>
    </main>
    {modalCustomer ? (
      <CustomerDetailModal
        customer={modalCustomer}
        onClose={() => setCustomerModalId(null)}
        onNavigate={handleCustomerDetailNavigate}
      />
    ) : null}
    {activePage === 'estimates' && isEstimateRegistrationOpen ? (
      <EstimateRegistrationModal
        onCreateWorkRecord={handleCreateEstimateWorkRecord}
        onClose={() => setIsEstimateRegistrationOpen(false)}
        vehicleSuggestions={vehicleSuggestions}
      />
    ) : null}
    </>
  );
}

function PlaceholderPage({ item, modeLabel }: { item: NavItem; modeLabel: string }) {
  const Icon = item.icon;

  return (
    <section className="placeholder-page">
      <div className="placeholder-icon">
        <Icon size={22} />
      </div>
      <div>
        <p className="eyebrow">{modeLabel} 화면</p>
        <h2>{item.label}</h2>
        <span>세부 화면 준비중</span>
      </div>
    </section>
  );
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const savedLoginId = readLoginStorageValue(LOGIN_STORAGE_KEYS.rememberedId) ?? '';
  const hasSavedAutoLogin =
    savedLoginId.length > 0 && readLoginStorageValue(LOGIN_STORAGE_KEYS.autoLogin) === 'true';
  const [loginId, setLoginId] = useState(savedLoginId);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberId, setRememberId] = useState(savedLoginId.length > 0);
  const [autoLogin, setAutoLogin] = useState(hasSavedAutoLogin);
  const canSubmit = loginId.trim().length > 0 && password.trim().length > 0;
  const testAccount = {
    id: 'test',
    password: 'test123@',
  };

  function saveLoginPreferences(normalizedLoginId: string) {
    removeLoginStorageValue(LOGIN_STORAGE_KEYS.autoLogin);

    if (rememberId || autoLogin) {
      writeLoginStorageValue(LOGIN_STORAGE_KEYS.rememberedId, normalizedLoginId);
    } else {
      removeLoginStorageValue(LOGIN_STORAGE_KEYS.rememberedId);
    }

    if (autoLogin) {
      writeLoginStorageValue(LOGIN_STORAGE_KEYS.autoLogin, 'true');
    }
  }

  return (
    <main className="login-page">
      <form
        className="login-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit) return;

          const normalizedLoginId = loginId.trim();

          if (normalizedLoginId === testAccount.id && password === testAccount.password) {
            setErrorMessage('');
            saveLoginPreferences(normalizedLoginId);
            onLogin();
            return;
          }

          setErrorMessage('아이디 또는 비밀번호를 확인해주세요.');
        }}
      >
        <div className="login-brand">
          <BrandIdentity logoSrc={LOGO_SRC} title={SERVICE_NAME} variant="login" />
        </div>

        <div className="login-fields">
          <input
            autoComplete="username"
            onChange={(event) => {
              setLoginId(event.target.value);
              setErrorMessage('');
            }}
            placeholder="아이디"
            value={loginId}
          />
          <input
            autoComplete="current-password"
            onChange={(event) => {
              setPassword(event.target.value);
              setErrorMessage('');
            }}
            placeholder="비밀번호"
            type="password"
            value={password}
          />
        </div>

        <div className="login-options">
          <label className="login-option">
            <input
              checked={rememberId}
              onChange={(event) => {
                const checked = event.target.checked;
                setRememberId(checked);
                if (!checked) {
                  setAutoLogin(false);
                }
              }}
              type="checkbox"
            />
            <span>ID 저장</span>
          </label>
          <label className="login-option">
            <input
              checked={autoLogin}
              onChange={(event) => {
                const checked = event.target.checked;
                setAutoLogin(checked);
                if (checked) {
                  setRememberId(true);
                }
              }}
              type="checkbox"
            />
            <span>자동로그인</span>
          </label>
        </div>

        <p className="login-test-account">테스트 계정: 아이디 test / 비밀번호 test123@</p>
        {errorMessage ? <p className="login-error">{errorMessage}</p> : null}

        <button className="login-button" disabled={!canSubmit} type="submit">
          로그인하기
        </button>

        {/* <div className="login-links">
          <button type="button">아이디 찾기</button>
          <span />
          <button type="button">비밀번호 찾기</button>
        </div> */}
      </form>
    </main>
  );
}

function Dashboard({ onOpenCustomer }: { onOpenCustomer: () => void }) {
  const [shortcutTitle, setShortcutTitle] = useState('');
  const [shortcutUrl, setShortcutUrl] = useState('');
  const [shortcuts, setShortcuts] = useState<DashboardShortcut[]>(defaultDashboardShortcuts);
  const canAddShortcut = shortcutTitle.trim().length > 0 && shortcutUrl.trim().length > 0;

  function handleAddShortcut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAddShortcut) return;

    setShortcuts((current) => [
      ...current,
      {
        title: shortcutTitle.trim(),
        url: normalizeUrl(shortcutUrl),
      },
    ]);
    setShortcutTitle('');
    setShortcutUrl('');
  }

  return (
    <div className="page-stack">
      <section className="kpi-grid" aria-label="오늘 요약">
        <KpiCard icon={CalendarDays} label="오늘 할 일" value="7건" detail="작업 4 · 일반 3" tone="blue" />
        <KpiCard icon={FileText} label="견적 대기" value="7건" detail="부품확인 3" tone="orange" />
        <KpiCard icon={ReceiptText} label="청구 대기" value="4건" detail="보험 3 · 정비소 1" tone="purple" />
        <KpiCard icon={WalletCards} label="미수금" value="1,970,000원" detail="2개 거래처" tone="red" />
        <KpiCard icon={Package} label="부족 재고" value="2품목" detail="전면유리 우선" tone="yellow" />
      </section>

      <section className="dashboard-grid">
        <Panel
          className="span-8"
          title="오늘 작업"
          action={
            <div className="segmented-control">
              <button className="selected">일</button>
              <button>주</button>
              <button>월</button>
            </div>
          }
        >
          <div className="work-timeline">
            {workOrders.map((order) => (
              <article className="timeline-card" key={`${order.time}-${order.customer}`}>
                <time>{order.time}</time>
                <div>
                  <div className="row-title">
                    <strong>{order.repair}</strong>
                    <StatusPill label={order.status} tone={statusTone(order.status)} />
                  </div>
                  <p>{order.customer} · {order.vehicle}</p>
                  <div className="meta-line">
                    <span>
                      <MapPin size={14} />
                      {order.visit} · {order.address}
                    </span>
                    <span>
                      <UserRound size={14} />
                      {order.technician}
                    </span>
                    <span>
                      <Package size={14} />
                      {order.stock}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="span-4" title="처리 필요">
          <div className="priority-list">
            <PriorityItem icon={AlertCircle} tone="red" title="보험 접수번호 확인" detail="김민수 · GV80" />
            <PriorityItem icon={Package} tone="yellow" title="부족 재고 발주" detail="GV80 전면유리 ADAS" />
            <PriorityItem icon={WalletCards} tone="orange" title="부분 입금 확인" detail="대성모터스 290,000원" />
            <PriorityItem icon={Camera} tone="blue" title="작업 사진 올리기" detail="카니발 도어유리" />
          </div>
        </Panel>

        <Panel className="span-7" title="최근 견적">
          <ListColumnTable
            columns={['견적번호', '고객/차량', '수리', '금액', '상태']}
            rows={estimates.slice(0, 4).map((estimate) => [
              estimate.no,
              `${estimate.customer} · ${estimate.vehicle}`,
              estimate.repair,
              formatMoney(estimate.amount),
              <StatusPill key={estimate.no} label={estimate.status} tone={statusTone(estimate.status)} />,
            ])}
          />
        </Panel>

        <Panel className="span-5" title="업무 바로가기">
          <form className="shortcut-form" onSubmit={handleAddShortcut}>
            <input
              aria-label="바로가기 제목"
              onChange={(event) => setShortcutTitle(event.target.value)}
              placeholder="제목"
              value={shortcutTitle}
            />
            <input
              aria-label="바로가기 링크"
              onChange={(event) => setShortcutUrl(event.target.value)}
              placeholder="https://..."
              value={shortcutUrl}
            />
            <button className="primary-button" disabled={!canAddShortcut} type="submit">
              추가
            </button>
          </form>
          <div className="shortcut-list">
            {shortcuts.map((shortcut) => (
              <a
                className="shortcut-link"
                href={shortcut.url}
                key={`${shortcut.title}-${shortcut.url}`}
                rel="noreferrer"
                target="_blank"
              >
                <span>{shortcut.title}</span>
                <ExternalLink size={15} />
              </a>
            ))}
          </div>
          <p className="helper-text">현재는 프로토타입용 임시 추가이며, 새로고침하면 초기값으로 돌아갑니다.</p>
        </Panel>

        <Panel
          className="span-12"
          title="고객 상세"
          action={
            <button className="text-button" onClick={onOpenCustomer}>
              전체 보기
              <ChevronRight size={16} />
            </button>
          }
        >
          <CustomerSnapshot customer={customers[0]!} />
        </Panel>
      </section>
    </div>
  );
}

function revenueValue(point: RevenuePoint, stream: RevenueStream) {
  if (stream === 'work') return point.work;
  if (stream === 'sales') return point.sales;
  return point.work + point.sales;
}

function revenueSeriesTotal(series: RevenuePoint[], stream: RevenueStream) {
  return series.reduce((sum, point) => sum + revenueValue(point, stream), 0);
}

function formatSignedMoney(value: number) {
  if (value === 0) return formatMoney(0);
  return `${value > 0 ? '+' : '-'}${formatMoney(Math.abs(value))}`;
}

function formatChangeRate(diff: number, previous: number) {
  if (previous <= 0) return diff > 0 ? '신규' : '0.0%';
  return `${diff > 0 ? '+' : ''}${((diff / previous) * 100).toFixed(1)}%`;
}

function formatLedgerAmount(value: number, zeroValue = '0') {
  return value === 0 ? zeroValue : value.toLocaleString('ko-KR');
}

function revenueLedgerTotal(summary: RevenueLedgerSummary) {
  return summary.kp + summary.insurance + summary.best + summary.inbound + summary.retail;
}

function revenueLedgerChange(current: number, previous: number) {
  if (current === 0) return '-';
  if (previous <= 0) return '신규';
  const rate = ((current - previous) / previous) * 100;

  return `${rate > 0 ? '+' : ''}${rate.toFixed(1)}%`;
}

function revenueChangeTone(diff: number): Tone {
  if (diff > 0) return 'blue';
  if (diff < 0) return 'red';
  return 'gray';
}

function revenueChangeClass(diff: number) {
  if (diff > 0) return 'up';
  if (diff < 0) return 'down';
  return 'flat';
}

function revenueChangeLabel(diff: number) {
  if (diff > 0) return `이전보다 ${formatMoney(Math.abs(diff))} 상승`;
  if (diff < 0) return `이전보다 ${formatMoney(Math.abs(diff))} 감소`;
  return '이전과 동일';
}

function revenuePreviousLabel(period: RevenuePeriod) {
  const labels: Record<RevenuePeriod, string> = {
    day: '전일',
    week: '전주',
    month: '전월',
    year: '전년',
    custom: '이전 동일 기간',
  };

  return labels[period];
}

function formatDateTick(date: Date) {
  return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')}`;
}

function withCustomRangeLabels(series: RevenuePoint[], range: RevenueDateRange) {
  const startDate = new Date(`${range.start}T00:00:00`);
  const endDate = new Date(`${range.end}T00:00:00`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || series.length === 0) {
    return series;
  }

  const startTime = startDate.getTime();
  const dateDistance = endDate.getTime() - startTime;

  return series.map((point, index) => {
    const ratio = series.length === 1 ? 0 : index / (series.length - 1);
    const tickDate = new Date(startTime + dateDistance * ratio);

    return {
      ...point,
      label: formatDateTick(tickDate),
    };
  });
}

function formatCompactMoney(value: number) {
  if (value >= 100000000) return `${(value / 100000000).toFixed(value % 100000000 === 0 ? 0 : 1)}억`;
  if (value >= 10000) return `${Math.round(value / 10000).toLocaleString('ko-KR')}만`;
  return formatMoney(value);
}

function revenueLinePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function RevenueLineChart({
  series,
  previousSeries,
  stream,
  previousLabel,
}: {
  series: RevenuePoint[];
  previousSeries: RevenuePoint[];
  stream: RevenueStream;
  previousLabel: string;
}) {
  const width = 720;
  const height = 150;
  const padding = { top: 14, right: 16, bottom: 28, left: 48 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  const currentValues = series.map((point) => ({ label: point.label, value: revenueValue(point, stream) }));
  const previousValues = previousSeries.map((point, index) => ({
    label: series[index]?.label ?? point.label,
    value: revenueValue(point, stream),
  }));
  const maxValue = Math.max(...currentValues.map((point) => point.value), ...previousValues.map((point) => point.value), 1);
  const currentPoints = currentValues.map((point, index) => {
    const x = padding.left + (series.length <= 1 ? 0 : (graphWidth / (series.length - 1)) * index);
    const y = padding.top + graphHeight - (point.value / maxValue) * graphHeight;

    return { ...point, x, y };
  });
  const previousPoints = previousValues.map((point, index) => {
    const x = padding.left + (previousValues.length <= 1 ? 0 : (graphWidth / (previousValues.length - 1)) * index);
    const y = padding.top + graphHeight - (point.value / maxValue) * graphHeight;

    return { ...point, x, y };
  });
  const currentPath = revenueLinePath(currentPoints);
  const previousPath = revenueLinePath(previousPoints);
  const firstPoint = currentPoints[0];
  const lastPoint = currentPoints[currentPoints.length - 1];
  const areaPath = firstPoint && lastPoint ? `${currentPath} L ${lastPoint.x} ${padding.top + graphHeight} L ${firstPoint.x} ${padding.top + graphHeight} Z` : '';
  const labelStep = Math.max(1, Math.ceil(currentPoints.length / 6));
  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="revenue-line-chart">
      <div className="revenue-line-legend">
        <span className="current">현재 선택 기간</span>
        <span className="previous">{previousLabel}</span>
      </div>
      <svg aria-label="매출 동향 선그래프" role="img" viewBox={`0 0 ${width} ${height}`}>
        {gridTicks.map((tick) => {
          const y = padding.top + graphHeight * tick;
          const value = maxValue * (1 - tick);

          return (
            <g key={tick}>
              <line className="grid-line" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text className="axis-label y-label" x={padding.left - 10} y={y + 4}>
                {formatCompactMoney(value)}
              </text>
            </g>
          );
        })}
        {areaPath ? <path className="line-area" d={areaPath} /> : null}
        {previousPath ? <path className="line previous-line" d={previousPath} /> : null}
        {currentPath ? <path className="line current-line" d={currentPath} /> : null}
        {previousPoints.map((point, index) => (
          <circle className="line-dot previous-dot" cx={point.x} cy={point.y} key={`${point.label}-previous-${index}`} r="2.8">
            <title>{`${point.label} ${previousLabel} ${formatMoney(point.value)}`}</title>
          </circle>
        ))}
        {currentPoints.map((point, index) => (
          <circle className="line-dot current-dot" cx={point.x} cy={point.y} key={`${point.label}-current-${index}`} r="3.4">
            <title>{`${point.label} 현재 ${formatMoney(point.value)}`}</title>
          </circle>
        ))}
        {currentPoints.map((point, index) =>
          index % labelStep === 0 || index === currentPoints.length - 1 ? (
            <text className="axis-label x-label" key={`${point.label}-label-${index}`} x={point.x} y={height - 14}>
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function RevenuePage() {
  const [period, setPeriod] = useState<RevenuePeriod>('month');
  const [stream, setStream] = useState<RevenueStream>('all');
  const [customRange, setCustomRange] = useState<RevenueDateRange>({ start: '2026-05-01', end: '2026-05-21' });
  const baseSeries = revenueSeries[period];
  const basePreviousSeries = revenuePreviousSeries[period];
  const series = period === 'custom' ? withCustomRangeLabels(baseSeries, customRange) : baseSeries;
  const previousSeries = period === 'custom' ? withCustomRangeLabels(basePreviousSeries, customRange) : basePreviousSeries;
  const selectedPeriod = revenuePeriodOptions.find((option) => option.id === period) ?? revenuePeriodOptions[2]!;
  const selectedStream = revenueStreamOptions.find((option) => option.id === stream) ?? revenueStreamOptions[0]!;
  const previousLabel = revenuePreviousLabel(period);
  const periodDetail = period === 'custom' ? `${customRange.start} ~ ${customRange.end}` : selectedPeriod.detail;
  const currentSummary =
    period === 'custom'
      ? {
          label: '합계',
          work: series.reduce((sum, point) => sum + point.work, 0),
          sales: series.reduce((sum, point) => sum + point.sales, 0),
        }
      : (series[series.length - 1] ?? { label: '현재', work: 0, sales: 0 });
  const previousSummary =
    period === 'custom'
      ? {
          label: '이전 합계',
          work: previousSeries.reduce((sum, point) => sum + point.work, 0),
          sales: previousSeries.reduce((sum, point) => sum + point.sales, 0),
        }
      : (previousSeries[previousSeries.length - 1] ?? { label: '이전', work: 0, sales: 0 });
  const totalWork = currentSummary.work;
  const totalSales = currentSummary.sales;
  const selectedTotal = revenueValue({ label: '합계', work: totalWork, sales: totalSales }, stream);
  const previousTotal = revenueValue(previousSummary, stream);
  const diff = selectedTotal - previousTotal;
  const currentKpiDetail = `${previousLabel} 대비 ${formatSignedMoney(diff)} · ${formatChangeRate(diff, previousTotal)}`;
  const bestPoint = series.reduce((best, point) => (revenueValue(point, stream) > revenueValue(best, stream) ? point : best), series[0]!);
  const average = Math.round(revenueSeriesTotal(series, stream) / Math.max(series.length, 1));
  const totalRevenue = totalWork + totalSales;
  const workShare = totalRevenue > 0 ? (totalWork / totalRevenue) * 100 : 0;
  const salesShare = totalRevenue > 0 ? (totalSales / totalRevenue) * 100 : 0;
  const updateCustomRange = (field: keyof RevenueDateRange, value: string) => {
    setCustomRange((current) => ({ ...current, [field]: value }));
  };
  const ledgerYearSummary = revenueLedgerSummaries.reduce<RevenueLedgerSummary>(
    (sum, row) => ({
      label: '2026',
      kp: sum.kp + row.kp,
      insurance: sum.insurance + row.insurance,
      best: sum.best + row.best,
      inbound: sum.inbound + row.inbound,
      retail: sum.retail + row.retail,
    }),
    { label: '2026', kp: 0, insurance: 0, best: 0, inbound: 0, retail: 0 },
  );
  return (
    <div className="page-stack revenue-page">
      <section className={`revenue-current-card ${stream}`}>
        <div>
          <p className="eyebrow">현재 보고 있는 매출</p>
          <h2>
            {selectedPeriod.label} 기준 · {selectedStream.label}
          </h2>
          <span>{periodDetail} · {selectedStream.detail}</span>
        </div>
        <strong>{formatMoney(selectedTotal)}</strong>
      </section>

      <section className="revenue-controls">
        <Panel title="기간 선택">
          <div className="revenue-period-panel">
            <div className="revenue-option-grid period">
              {revenuePeriodOptions.map((option) => (
                <button className={period === option.id ? 'selected' : ''} key={option.id} onClick={() => setPeriod(option.id)} type="button">
                  <strong>{option.label}</strong>
                  <span>{option.detail}</span>
                </button>
              ))}
            </div>
            {period === 'custom' ? (
              <div className="revenue-date-range">
                <label>
                  <span>시작일</span>
                  <input
                    onChange={(event) => updateCustomRange('start', event.currentTarget.value)}
                    onInput={(event) => updateCustomRange('start', event.currentTarget.value)}
                    type="date"
                    value={customRange.start}
                  />
                </label>
                <label>
                  <span>종료일</span>
                  <input
                    onChange={(event) => updateCustomRange('end', event.currentTarget.value)}
                    onInput={(event) => updateCustomRange('end', event.currentTarget.value)}
                    type="date"
                    value={customRange.end}
                  />
                </label>
              </div>
            ) : null}
          </div>
        </Panel>
        <Panel title="매출 유형 선택">
          <div className="revenue-option-grid stream">
            {revenueStreamOptions.map((option) => (
              <button className={stream === option.id ? `selected ${option.id}` : option.id} key={option.id} onClick={() => setStream(option.id)} type="button">
                <strong>{option.label}</strong>
                <span>{option.detail}</span>
              </button>
            ))}
          </div>
        </Panel>
      </section>

      <section className="kpi-grid" aria-label="매출 KPI">
        <KpiCard icon={ReceiptText} label="현재 매출" value={formatMoney(selectedTotal)} detail={currentKpiDetail} tone={selectedStream.tone} />
        <KpiCard icon={CalendarDays} label={`${previousLabel} 매출`} value={formatMoney(previousTotal)} detail="비교 기준 매출" tone="gray" />
        <KpiCard icon={WalletCards} label="증감 금액" value={formatSignedMoney(diff)} detail={revenueChangeLabel(diff)} tone={revenueChangeTone(diff)} />
        <KpiCard icon={AlertCircle} label="증감률" value={formatChangeRate(diff, previousTotal)} detail={diff >= 0 ? '이전 기간 대비 상승' : '이전 기간 대비 감소'} tone={revenueChangeTone(diff)} />
        <KpiCard icon={CheckCircle2} label="평균/최고 구간" value={formatMoney(average)} detail={`${bestPoint.label} ${formatMoney(revenueValue(bestPoint, stream))}`} tone="orange" />
      </section>

      <Panel title="기간별 매출 상세">
        <ListColumnTable
          columns={['기간', '현재 매출', '증감 금액', '증감률', '작업/판매']}
          rows={series.map((point, index) => {
            const previousPoint = previousSeries[index] ?? { label: point.label, work: 0, sales: 0 };
            const currentValue = revenueValue(point, stream);
            const previousValue = revenueValue(previousPoint, stream);
            const rowDiff = currentValue - previousValue;

            return [
              point.label,
              <strong key={`${period}-${stream}-${point.label}-current`}>{formatMoney(currentValue)}</strong>,
              <span className={`revenue-change ${revenueChangeClass(rowDiff)}`} key={`${period}-${stream}-${point.label}-diff`}>
                {formatSignedMoney(rowDiff)}
              </span>,
              formatChangeRate(rowDiff, previousValue),
              `${formatMoney(point.work)} / ${formatMoney(point.sales)}`,
            ];
          })}
        />
      </Panel>

      <Panel className="revenue-ledger-panel" title="매출 분류별 월 집계">
        <div className="revenue-ledger-title">2026 작업매출</div>
        <div className="revenue-ledger-table-wrap">
          <table className="revenue-ledger-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>총합계</th>
                <th>KP</th>
                <th>보험</th>
                <th>베스트</th>
                <th>입고지원</th>
                <th>
                  매출
                  <span>(일반/면책금/공장)</span>
                </th>
                <th>전월대비</th>
              </tr>
            </thead>
            <tbody>
              <tr className="summary-row">
                <th>{ledgerYearSummary.label}</th>
                <td>{formatLedgerAmount(revenueLedgerTotal(ledgerYearSummary))}</td>
                <td>{formatLedgerAmount(ledgerYearSummary.kp, '')}</td>
                <td>{formatLedgerAmount(ledgerYearSummary.insurance, '')}</td>
                <td>{formatLedgerAmount(ledgerYearSummary.best, '')}</td>
                <td>{formatLedgerAmount(ledgerYearSummary.inbound, '')}</td>
                <td>{formatLedgerAmount(ledgerYearSummary.retail)}</td>
                <td>-</td>
              </tr>
              {revenueLedgerSummaries.map((row, index) => {
                const total = revenueLedgerTotal(row);
                const previousTotal = index > 0 ? revenueLedgerTotal(revenueLedgerSummaries[index - 1]!) : 0;
                const change = revenueLedgerChange(total, previousTotal);

                return (
                  <tr key={row.label}>
                    <th>{row.label}</th>
                    <td>{formatLedgerAmount(total)}</td>
                    <td>{formatLedgerAmount(row.kp, '')}</td>
                    <td>{formatLedgerAmount(row.insurance, '')}</td>
                    <td>{formatLedgerAmount(row.best, '')}</td>
                    <td>{formatLedgerAmount(row.inbound, '')}</td>
                    <td>{formatLedgerAmount(row.retail)}</td>
                    <td className={change.startsWith('-') ? 'down' : change.startsWith('+') || change === '신규' ? 'up' : ''}>{change}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <section className="revenue-chart-grid">
        <Panel className="revenue-chart-panel" title={`${selectedPeriod.label} 매출 동향 선그래프`}>
          <div className="revenue-legend">
            <span className={stream === 'all' || stream === 'work' ? 'active work' : 'work'}>작업 매출</span>
            <span className={stream === 'all' || stream === 'sales' ? 'active sales' : 'sales'}>판매 매출</span>
            <strong>평균 {formatMoney(average)}</strong>
          </div>
          <RevenueLineChart previousLabel={previousLabel} previousSeries={previousSeries} series={series} stream={stream} />
        </Panel>

        <Panel title="매출 구성">
          <div className="revenue-mix">
            <article>
              <div className="row-title">
                <strong>작업 매출 비중</strong>
                <span>{workShare.toFixed(1)}%</span>
              </div>
              <div className="stock-meter">
                <span className="work" style={{ width: `${workShare}%` }} />
              </div>
              <p>보험, 일반, KP, 베스트, 입고지원 등 작업 기반 매출</p>
            </article>
            <article>
              <div className="row-title">
                <strong>판매 매출 비중</strong>
                <span>{salesShare.toFixed(1)}%</span>
              </div>
              <div className="stock-meter">
                <span className="sales" style={{ width: `${salesShare}%` }} />
              </div>
              <p>물품을 매입한 뒤 작업과 별도로 판매한 매출</p>
            </article>
            <div className="revenue-selected-note">
              <StatusPill label={selectedStream.label} tone={selectedStream.tone} />
              <span>{selectedPeriod.label} 기준으로 {selectedStream.detail}을 보고 있습니다.</span>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function getProductUsageTone(scope: ProductUsageScope): Tone {
  if (scope === '작업용') return 'blue';
  if (scope === '판매용') return 'green';
  return 'purple';
}

const productImportColumns = [
  '상품코드',
  '상품명',
  '상품용도',
  '판매가능',
  '차종/호환',
  '창고위치',
  '현재재고',
  '최소재고',
  '매입단가',
  '판매단가',
  '거래처',
  '비고',
];

const productImportSamples = [
  ['UNI-SEAL-01', '유리 실란트', '판매용', 'Y', '공용', 'C-01', '16', '8', '18000', '25000', '대리점', '작업/판매 모두 확인'],
  ['GV80-FR-ADAS', 'GV80 전면유리 ADAS', '공용', 'Y', '제네시스 GV80 2021~', 'A-01', '1', '2', '980000', '1180000', '베스트', '재고 부족 알림'],
  ['STR-RR-H', '스타리아 후면유리 열선', '작업용', 'N', '현대 스타리아', 'A-04', '2', '2', '520000', '0', '베스트', '작업 투입용'],
];

function salesProductCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadProductImportTemplate() {
  const csv = [productImportColumns, ...productImportSamples].map((row) => row.map(salesProductCsvCell).join(',')).join('\r\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = '상품_일괄등록_양식.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function SalesPage() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SalesProductFilter>('all');
  const [isSalesRegistrationOpen, setIsSalesRegistrationOpen] = useState(false);
  const [isProductImportOpen, setIsProductImportOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const sellableItems = useMemo(() => inventory.filter((item) => item.usageScope !== '작업용'), []);
  const salesOrders = useMemo(() => productSales.filter((sale) => sale.type === '상품판매'), []);
  const latestSaleByPartNo = useMemo(() => {
    const nextSales = new Map<string, ProductSale>();
    salesOrders.forEach((sale) => {
      if (!nextSales.has(sale.partNo)) nextSales.set(sale.partNo, sale);
    });
    return nextSales;
  }, [salesOrders]);
  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          sellableItems.flatMap((item) => [
            item.partNo,
            item.name,
            item.usageScope,
            item.compatible,
            item.location,
            item.status,
            latestSaleByPartNo.get(item.partNo)?.customer,
          ]).filter((value): value is string => Boolean(value)),
        ),
      ),
    [latestSaleByPartNo, sellableItems],
  );
  const filteredProducts = useMemo(
    () =>
      sellableItems.filter((item) => {
        const latestSale = latestSaleByPartNo.get(item.partNo);
        const target = [
          item.partNo,
          item.name,
          item.usageScope,
          item.compatible,
          item.location,
          item.status,
          latestSale?.customer,
          latestSale?.status,
        ]
          .join(' ')
          .toLowerCase();
        const matchesQuery = normalizedQuery.length === 0 || target.includes(normalizedQuery);
        const matchesMode =
          mode === 'all' ||
          (mode === 'saleOnly' && item.usageScope === '판매용') ||
          (mode === 'shared' && item.usageScope === '공용') ||
          (mode === 'alert' && (item.status !== '정상' || item.stock <= item.minimum)) ||
          (mode === 'ready' && item.status === '정상' && item.stock > item.minimum);

        return matchesQuery && matchesMode;
      }),
    [latestSaleByPartNo, mode, normalizedQuery, sellableItems],
  );

  return (
    <div className="page-stack sales-page">
      <section className="workbench-grid">
        <Panel className="span-12 sales-orders-panel sales-product-list-panel" title="판매 상품 목록">
          <RecordToolbar
            action={
              <div className="sales-toolbar-actions">
                <button className="secondary-button" onClick={() => setIsProductImportOpen(true)} type="button">
                  <Download size={16} />
                  상품 일괄등록
                </button>
                <button className="primary-button" onClick={() => setIsSalesRegistrationOpen(true)} type="button">
                  <Plus size={16} />
                  판매 등록
                </button>
              </div>
            }
            count={`총 ${filteredProducts.length}품목`}
            filters={
              <FilterTabs
                ariaLabel="판매 상품 필터"
                onChange={(value) => setMode(value as SalesProductFilter)}
                options={[
                  { id: 'all', label: '전체' },
                  { id: 'saleOnly', label: '판매용' },
                  { id: 'shared', label: '공용' },
                  { id: 'alert', label: '부족/확인' },
                  { id: 'ready', label: '판매가능' },
                ]}
                value={mode}
              />
            }
            search={
              <SearchInput
                label="판매 검색"
                listId="sales-search-suggestions"
                onChange={setQuery}
                placeholder="품목, 품번, 차종/호환, 위치, 상태 검색"
                suggestions={searchSuggestions}
                value={query}
              />
            }
          />
          <ListColumnTable
            columns={['품목/품번', '호환/위치', '용도', '재고', '판매단가', '최근 판매', '상태', '판매 체크']}
            rows={filteredProducts.map((item) => {
              const latestSale = latestSaleByPartNo.get(item.partNo);
              const grossMargin = Math.max(item.claimPrice - item.centerPrice, 0);

              return [
                <div className="sales-product-cell" key={`${item.partNo}-product`}>
                  <strong>{item.name}</strong>
                  <span>{item.partNo}</span>
                </div>,
                <div className="sales-inventory-cell" key={`${item.partNo}-location`}>
                  <span>{item.compatible}</span>
                  <small>{item.location}</small>
                </div>,
                <StatusPill key={`${item.partNo}-scope`} label={item.usageScope} tone={getProductUsageTone(item.usageScope)} />,
                `${item.stock}개\n최소 ${item.minimum}개`,
                `${formatMoney(item.claimPrice)}\n마진 ${formatMoney(grossMargin)}`,
                latestSale ? `${latestSale.date}\n${latestSale.customer}` : '판매 이력 없음',
                <div className="sales-status-cell" key={`${item.partNo}-status`}>
                  <StatusPill label={item.status} tone={statusTone(item.status)} />
                  <span>{item.stock <= item.minimum ? '판매 전 확인' : '판매 가능'}</span>
                </div>,
                <div className="sales-row-actions" key={`${item.partNo}-actions`}>
                  <button className="mini-button" type="button">
                    판매 체크
                  </button>
                </div>,
              ];
            })}
          />
        </Panel>
      </section>

      {isSalesRegistrationOpen ? (
        <DetailDrawer
          eyebrow="판매관리"
          onClose={() => setIsSalesRegistrationOpen(false)}
          title="판매 등록"
          variant="modal"
        >
          <SalesRegistrationForm onClose={() => setIsSalesRegistrationOpen(false)} />
        </DetailDrawer>
      ) : null}

      {isProductImportOpen ? (
        <DetailDrawer
          eyebrow="상품 마스터"
          onClose={() => setIsProductImportOpen(false)}
          title="판매상품 엑셀 일괄등록"
          variant="modal"
        >
          <ProductBulkImportPanel />
        </DetailDrawer>
      ) : null}
    </div>
  );
}

function ProductBulkImportPanel() {
  const pasteSample = [productImportColumns, ...productImportSamples.slice(0, 2)].map((row) => row.join('\t')).join('\n');

  return (
    <div className="product-import-panel">
      <div className="product-import-actions">
        <button className="secondary-button" onClick={downloadProductImportTemplate} type="button">
          <Download size={16} />
          양식 다운로드
        </button>
        <button className="primary-button" type="button">
          <CheckCircle2 size={16} />
          붙여넣기 검증
        </button>
      </div>

      <div className="template-column-list" aria-label="상품 등록 양식 컬럼">
        {productImportColumns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>

      <label className="excel-paste-box">
        <span>엑셀 내용 붙여넣기</span>
        <textarea defaultValue={pasteSample} rows={7} />
      </label>

      <div className="import-rule-list">
        <article>
          <strong>상품용도</strong>
          <span>작업용, 판매용, 공용 중 하나로 입력합니다.</span>
        </article>
        <article>
          <strong>판매가능</strong>
          <span>판매 상품은 Y, 작업 투입 전용은 N으로 관리합니다.</span>
        </article>
        <article>
          <strong>검증 항목</strong>
          <span>상품코드 중복, 숫자 금액, 재고 수량, 필수값 누락을 확인합니다.</span>
        </article>
      </div>
    </div>
  );
}

function SalesRegistrationForm({ onClose }: { onClose?: () => void }) {
  const [tradeType, setTradeType] = useState<EstimateTradeType>('업체');
  const selectableInventory = inventory.filter((item) => item.usageScope !== '작업용');
  const defaultPartNo = selectableInventory[0]?.partNo ?? '';

  return (
    <form className="sales-registration-form" onSubmit={(event) => event.preventDefault()}>
      <div className="sales-form-grid">
        <label className="estimate-control">
          <span>
            판매일
            <em>필수</em>
          </span>
          <input defaultValue="2026-05-21" required type="date" />
        </label>
        <div className="estimate-control">
          <span>
            거래유형
            <em>필수</em>
          </span>
          <div className="trade-segment" role="group" aria-label="거래유형">
            {(['개인', '업체'] as EstimateTradeType[]).map((type) => (
              <button className={tradeType === type ? 'selected' : ''} key={type} onClick={() => setTradeType(type)} type="button">
                {type}
              </button>
            ))}
          </div>
        </div>
        <label className="estimate-control">
          <span>{tradeType === '업체' ? '업체명' : '고객명'}</span>
          <input placeholder={tradeType === '업체' ? '거래 업체명' : '고객명'} />
        </label>
        <label className="estimate-control">
          <span>연락처</span>
          <input inputMode="tel" placeholder="010-0000-0000" />
        </label>
        <label className="estimate-control full">
          <span>
            품목
            <em>필수</em>
          </span>
          <select defaultValue={defaultPartNo} required>
            {selectableInventory.map((item) => (
              <option key={`${item.partNo}-option`} value={item.partNo}>
                {item.name} · {item.partNo} · {item.usageScope}
              </option>
            ))}
          </select>
        </label>
        <label className="estimate-control">
          <span>상품용도</span>
          <select defaultValue="판매용">
            <option>판매용</option>
            <option>공용</option>
          </select>
        </label>
        <label className="estimate-control">
          <span>
            수량
            <em>필수</em>
          </span>
          <input defaultValue="1" min="1" required type="number" />
        </label>
        <label className="estimate-control">
          <span>창고위치</span>
          <input defaultValue="C-01" />
        </label>
        <label className="estimate-control">
          <span>매입단가</span>
          <input defaultValue="18,000" inputMode="numeric" onChange={formatMoneyInputElement} />
        </label>
        <label className="estimate-control">
          <span>판매단가</span>
          <input defaultValue="25,000" inputMode="numeric" onChange={formatMoneyInputElement} placeholder="판매 시 입력" />
        </label>
        <label className="estimate-control">
          <span>결제구분</span>
          <select defaultValue="카드">
            <option>카드</option>
            <option>현금</option>
            <option>계좌</option>
            <option>외상</option>
          </select>
        </label>
        <label className="estimate-control">
          <span>재고처리</span>
          <select defaultValue="자동차감">
            <option>자동차감</option>
            <option>출고대기</option>
            <option>보류</option>
          </select>
        </label>
        <label className="estimate-control full">
          <span>비고</span>
          <input placeholder="단순 상품판매, 작업과 별도 판매, 거래처 메모 등" />
        </label>
      </div>

      <div className="estimate-save-row">
        <button className="secondary-button" onClick={onClose} type="button">
          닫기
        </button>
        <button className="primary-button" type="submit">
          판매 저장
        </button>
      </div>
    </form>
  );
}

function hasEstimateWorkSchedule(estimate: Estimate) {
  return Boolean(estimate.scheduledWorkDate);
}

function formatEstimateWorkSchedule(estimate: Estimate) {
  if (!estimate.scheduledWorkDate) return '미정';

  return `${estimate.scheduledWorkDate}\n${estimate.scheduledWorkTime ?? '시간 미정'} · ${estimate.scheduledVisit ?? '방식 미정'} · ${
    estimate.scheduledTechnician ?? '담당 미정'
  }`;
}

function normalizeEstimateDateInput(value: string) {
  const trimmedValue = value.trim();
  const digits = trimmedValue.replace(/\D/g, '');

  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmedValue)) {
    const [year = '', month = '', day = ''] = trimmedValue.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  if (digits.length > 4) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}${digits.length > 6 ? `-${digits.slice(6, 8)}` : ''}`;
  return digits;
}

function normalizeEstimateTimeRangeInput(value: string) {
  if (value.includes(':') || value.includes('~')) return value.replace(/[^\d:\s~]/g, '');

  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)} ~ ${digits.slice(4, 6)}:${digits.slice(6, 8)}`;
}

function compactEstimateSearchValue(value: string) {
  return value.toLowerCase().replace(/[^0-9a-z가-힣]+/gi, '');
}

function getEstimateSearchTerms(value: string) {
  return value
    .split(/[\s,，、/|]+/)
    .map(compactEstimateSearchValue)
    .filter(Boolean);
}

function matchesEstimateSearchTerms(value: string, target: string) {
  const terms = getEstimateSearchTerms(value);
  if (terms.length === 0) return true;

  const normalizedTarget = compactEstimateSearchValue(target);
  return terms.some((term) => normalizedTarget.includes(term));
}

function estimateDisplayStatus(estimate: Estimate): EstimateListStatus {
  if (estimate.status === '부품확인') return '재고확인';
  if (estimate.status === '확정' || estimate.status === '작업전환') return '확정';
  return '대기';
}

function estimateListStatusTone(status: EstimateListStatus): Tone {
  if (status === '재고확인') return 'red';
  if (status === '확정') return 'blue';
  return 'gray';
}

function isEstimateInPeriod(estimate: Estimate, startDate: string, endDate: string) {
  const estimateDate = parseDateInput(estimate.estimateDate);
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!estimateDate || !start || !end) return true;

  return estimateDate >= start && estimateDate <= end;
}

function EstimatesPage({
  onCreateWorkRecord,
  onOpenRegistration,
  vehicleSuggestions,
}: {
  onCreateWorkRecord: (record: WorkerWorkListRecord) => void;
  onOpenRegistration: () => void;
  vehicleSuggestions: VehicleSuggestionSet;
}) {
  const [periodStart, setPeriodStart] = useState(ESTIMATE_DEFAULT_PERIOD_START);
  const [periodEnd, setPeriodEnd] = useState(ESTIMATE_DEFAULT_PERIOD_END);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [estimatorFilter, setEstimatorFilter] = useState('all');
  const [statusFilters, setStatusFilters] = useState<EstimateStatusFilter[]>([]);
  const [outsourceFilter, setOutsourceFilter] = useState<EstimateOutsourceFilter>('all');
  const [partnerQuery, setPartnerQuery] = useState('');
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [estimateStatuses, setEstimateStatuses] = useState<Record<string, EstimateListStatus>>(() =>
    Object.fromEntries(estimates.map((estimate) => [estimate.no, estimateDisplayStatus(estimate)])),
  );
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [workDraftEstimate, setWorkDraftEstimate] = useState<Estimate | null>(null);
  const [copyNotice, setCopyNotice] = useState('');
  const copyNoticeTimerRef = useRef<number | null>(null);

  const estimatorOptions = useMemo(() => Array.from(new Set([...ESTIMATOR_OPTIONS, ...estimates.map((estimate) => estimate.estimatorName)])), []);
  const vehicleSuggestionsForSearch = useMemo(
    () =>
      Array.from(
        new Set(
          estimates
            .flatMap((estimate) => [estimate.vehicle, estimate.plateNumber, estimate.vin, ...vehicleSuggestions.model])
            .filter(Boolean),
        ),
      ),
    [vehicleSuggestions.model],
  );
  const partnerSuggestions = useMemo(() => Array.from(new Set(estimates.map((estimate) => estimate.customer).filter(Boolean))), []);
  const phoneSuggestions = useMemo(() => Array.from(new Set(estimates.map((estimate) => estimate.phone).filter(Boolean))), []);
  const filteredEstimates = useMemo(
    () =>
      estimates.filter((estimate) => {
        const displayStatus = estimateStatuses[estimate.no] ?? estimateDisplayStatus(estimate);
        const matchesPeriod = isEstimateInPeriod(estimate, periodStart, periodEnd);
        const matchesEstimator = estimatorFilter === 'all' || estimate.estimatorName === estimatorFilter;
        const matchesStatus =
          statusFilters.length === 0 ||
          statusFilters.some((statusFilter) => {
            if (statusFilter === 'stock') return displayStatus === '재고확인';
            if (statusFilter === 'outsource') return estimate.outsourceType === '외주';
            return estimate.outsourceType === '소개';
          });
        const matchesOutsource = outsourceFilter === 'all' || estimate.outsourceType === outsourceFilter;
        const matchesPartner = matchesEstimateSearchTerms(partnerQuery, estimate.customer);
        const matchesVehicle = matchesEstimateSearchTerms(vehicleQuery, `${estimate.vehicle} ${estimate.plateNumber} ${estimate.vin}`);
        const matchesPhone = matchesEstimateSearchTerms(phoneQuery, estimate.phone);

        return matchesPeriod && matchesEstimator && matchesStatus && matchesOutsource && matchesPartner && matchesVehicle && matchesPhone;
      }),
    [estimateStatuses, estimatorFilter, outsourceFilter, partnerQuery, periodEnd, periodStart, phoneQuery, statusFilters, vehicleQuery],
  );

  useEffect(
    () => () => {
      if (copyNoticeTimerRef.current !== null) window.clearTimeout(copyNoticeTimerRef.current);
    },
    [],
  );

  function updatePeriodStart(value: string) {
    setPeriodStart(normalizeEstimateDateInput(value));
  }

  function updatePeriodEnd(value: string) {
    setPeriodEnd(normalizeEstimateDateInput(value));
  }

  function toggleEstimateStatusFilter(filterId: EstimateStatusFilter) {
    setStatusFilters((current) =>
      current.includes(filterId) ? current.filter((item) => item !== filterId) : [...current, filterId],
    );
  }

  function applyEstimateQuickPeriod(kind: '1week' | '1month' | '3months' | '6months' | '1year') {
    const end = parseDateInput(periodEnd) ?? parseDateInput(ESTIMATE_DEFAULT_PERIOD_END) ?? new Date(2026, 5, 8);
    const start =
      kind === '1week'
        ? addDays(end, -7)
        : kind === '1month'
          ? addMonths(end, -1)
          : kind === '3months'
            ? addMonths(end, -3)
            : kind === '6months'
              ? addMonths(end, -6)
              : addMonths(end, -12);

    setPeriodStart(formatDateInputValue(start));
    setPeriodEnd(formatDateInputValue(end));
  }

  function resetEstimateSearch() {
    setPeriodStart(ESTIMATE_DEFAULT_PERIOD_START);
    setPeriodEnd(ESTIMATE_DEFAULT_PERIOD_END);
    setEstimatorFilter('all');
    setStatusFilters([]);
    setOutsourceFilter('all');
    setPartnerQuery('');
    setVehicleQuery('');
    setPhoneQuery('');
    setIsDatePickerOpen(false);
  }

  function updateEstimateListStatus(estimate: Estimate, status: EstimateListStatus) {
    setEstimateStatuses((current) => ({ ...current, [estimate.no]: status }));
    if (status === '확정') setWorkDraftEstimate(estimate);
  }

  function openEstimateWorkConversion(estimate: Estimate) {
    setEstimateStatuses((current) => ({ ...current, [estimate.no]: '확정' }));
    setWorkDraftEstimate(estimate);
  }

  function showEstimateCopyNotice(value: string) {
    if (copyNoticeTimerRef.current !== null) window.clearTimeout(copyNoticeTimerRef.current);

    const preview = value.length > 18 ? `${value.slice(0, 18)}...` : value;
    setCopyNotice(`복사됨: ${preview}`);
    copyNoticeTimerRef.current = window.setTimeout(() => setCopyNotice(''), 1500);
  }

  function copyEstimateText(value: string) {
    const selectedText = window.getSelection()?.toString().trim();
    if (selectedText) return;

    const text = value.trim();
    if (!text || !navigator.clipboard) return;

    void navigator.clipboard.writeText(text).then(() => showEstimateCopyNotice(text));
  }

  function CopyableEstimateText({
    children,
    className = '',
    value,
  }: {
    children?: ReactNode;
    className?: string;
    value: string;
  }) {
    return (
      <span className={`estimate-copy-text ${className}`.trim()} onClick={() => copyEstimateText(value)} title="클릭하면 복사됩니다">
        {children ?? value}
      </span>
    );
  }

  return (
    <div className="page-stack estimates-page">
      <Panel className="estimate-list-panel" title="견적 목록">
        <div className="estimate-search-panel" aria-label="견적 조회 조건">
          <div className="estimate-filter-line estimate-filter-line-primary">
            <div className="estimate-filter-field estimate-period-field">
              <span className="estimate-filter-label">기간</span>
              <div className="estimate-period-control">
                <input aria-label="견적 기간 시작일" inputMode="numeric" onChange={(event) => updatePeriodStart(event.target.value)} onFocus={() => setIsDatePickerOpen(true)} placeholder="YYYY-MM-DD" value={periodStart} />
                <span>~</span>
                <input aria-label="견적 기간 종료일" inputMode="numeric" onChange={(event) => updatePeriodEnd(event.target.value)} onFocus={() => setIsDatePickerOpen(true)} placeholder="YYYY-MM-DD" value={periodEnd} />
                <button className="ghost-button" onClick={() => setIsDatePickerOpen((current) => !current)} title="기간 선택" type="button">
                  <CalendarDays size={16} />
                </button>
                {isDatePickerOpen ? (
                  <div className="estimate-period-popover">
                    <label>
                      <span>시작일</span>
                      <input onChange={(event) => setPeriodStart(event.target.value)} type="date" value={periodStart} />
                    </label>
                    <label>
                      <span>종료일</span>
                      <input onChange={(event) => setPeriodEnd(event.target.value)} type="date" value={periodEnd} />
                    </label>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="estimate-quick-range">
              {[
                { id: '1week', label: '1주' },
                { id: '1month', label: '1개월' },
                { id: '3months', label: '3개월' },
                { id: '6months', label: '6개월' },
                { id: '1year', label: '1년' },
              ].map((option) => (
                <button key={option.id} onClick={() => applyEstimateQuickPeriod(option.id as Parameters<typeof applyEstimateQuickPeriod>[0])} type="button">
                  {option.label}
                </button>
              ))}
            </div>
            <label className="estimate-filter-field estimate-estimator-field">
              <span className="estimate-filter-label">담당자</span>
              <select className="estimate-filter-select" onChange={(event) => setEstimatorFilter(event.target.value)} value={estimatorFilter}>
                <option value="all">전체</option>
                {estimatorOptions.map((estimator) => (
                  <option key={estimator} value={estimator}>{estimator}</option>
                ))}
              </select>
            </label>
            <div className="estimate-filter-field estimate-status-field">
              <span className="estimate-filter-label">상태</span>
              <div className="estimate-checkbox-group">
                <label><input checked={statusFilters.length === 0} onChange={() => setStatusFilters([])} type="checkbox" />전체</label>
                <label><input checked={statusFilters.includes('stock')} onChange={() => toggleEstimateStatusFilter('stock')} type="checkbox" />재고확인</label>
                <label><input checked={statusFilters.includes('outsource')} onChange={() => toggleEstimateStatusFilter('outsource')} type="checkbox" />외주</label>
                <label><input checked={statusFilters.includes('intro')} onChange={() => toggleEstimateStatusFilter('intro')} type="checkbox" />소개</label>
              </div>
            </div>
          </div>

          <div className="estimate-filter-line estimate-filter-line-secondary">
            <div className="estimate-filter-field estimate-outsource-field">
              <span className="estimate-filter-label">외주여부</span>
              <div className="estimate-checkbox-group">
                <label><input checked={outsourceFilter === 'all'} onChange={() => setOutsourceFilter('all')} type="radio" />전체</label>
                {ESTIMATE_OUTSOURCE_OPTIONS.map((option) => (
                  <label key={option}><input checked={outsourceFilter === option} onChange={() => setOutsourceFilter(option)} type="radio" />{option}</label>
                ))}
              </div>
            </div>
            <label className="estimate-icon-search estimate-partner-search">
              <span>거래처</span>
              <div>
                <Search size={16} />
                <input list="estimate-partner-search-suggestions" onChange={(event) => setPartnerQuery(event.target.value)} placeholder="거래처명" value={partnerQuery} />
              </div>
            </label>
            <label className="estimate-icon-search">
              <span>차종/차량번호/차대번호</span>
              <div>
                <Search size={16} />
                <input list="estimate-vehicle-list-search-suggestions" onChange={(event) => setVehicleQuery(event.target.value)} placeholder="차종, 차량번호, 차대번호" value={vehicleQuery} />
              </div>
            </label>
            <label className="estimate-icon-search">
              <span>연락처</span>
              <div>
                <Search size={16} />
                <input inputMode="tel" list="estimate-phone-search-suggestions" onChange={(event) => setPhoneQuery(event.target.value)} placeholder="연락처" value={phoneQuery} />
              </div>
            </label>
            <div className="estimate-search-actions">
              <button className="primary-button" onClick={() => setIsDatePickerOpen(false)} type="button">조회</button>
              <button className="secondary-button" onClick={resetEstimateSearch} type="button">초기화</button>
            </div>
            <span className="estimate-list-count">총 {filteredEstimates.length}건</span>
            <button className="primary-button" onClick={onOpenRegistration} type="button">
              <Plus size={16} />
              견적등록
            </button>
          </div>

          <datalist id="estimate-partner-search-suggestions">
            {partnerSuggestions.map((partner) => <option key={partner} value={partner} />)}
          </datalist>
          <datalist id="estimate-vehicle-list-search-suggestions">
            {vehicleSuggestionsForSearch.map((suggestion) => <option key={suggestion} value={suggestion} />)}
          </datalist>
          <datalist id="estimate-phone-search-suggestions">
            {phoneSuggestions.map((phone) => <option key={phone} value={phone} />)}
          </datalist>
        </div>

        {filteredEstimates.length > 0 ? (
          <ListColumnTable
            className="estimate-list-table"
            columns={['견적일', '담당자', '구분', '거래처', '차량정보', '수리부위', '견적내용', '수리구분', '금액', '연락처', '상태', '보기']}
            rows={filteredEstimates.map((estimate) => {
              const displayStatus = estimateStatuses[estimate.no] ?? estimateDisplayStatus(estimate);
              const isStockCheck = displayStatus === '재고확인';
              const estimateAreaText = estimate.area.join(', ');
              const amountText = formatMoney(estimate.amount);
              const phoneText = estimate.phone || '연락처 미입력';
              return [
                <CopyableEstimateText key={`${estimate.no}-date`} value={estimate.estimateDate} />,
                <CopyableEstimateText key={`${estimate.no}-estimator`} value={estimate.estimatorName} />,
                <CopyableEstimateText key={`${estimate.no}-outsource`} value={estimate.outsourceType} />,
                <CopyableEstimateText className="estimate-customer-cell" key={`${estimate.no}-customer`} value={estimate.customer || '-'}>
                  {estimate.customer || '-'}
                </CopyableEstimateText>,
                <div className={isStockCheck ? 'estimate-vehicle-cell needs-stock' : 'estimate-vehicle-cell'} key={`${estimate.no}-vehicle`}>
                  <CopyableEstimateText value={estimate.vehicle}>
                    <strong>{estimate.vehicle}</strong>
                  </CopyableEstimateText>
                  <CopyableEstimateText className={isStockCheck ? 'estimate-plate-cell needs-stock' : 'estimate-plate-cell'} value={estimate.plateNumber}>
                    {estimate.plateNumber}
                  </CopyableEstimateText>
                </div>,
                <CopyableEstimateText key={`${estimate.no}-area`} value={estimateAreaText}>{estimateAreaText}</CopyableEstimateText>,
                <CopyableEstimateText className="estimate-content-cell" key={`${estimate.no}-content`} value={estimate.estimateContent}>{estimate.estimateContent}</CopyableEstimateText>,
                <CopyableEstimateText key={`${estimate.no}-repair-type`} value={estimate.repairType} />,
                <CopyableEstimateText key={`${estimate.no}-amount`} value={amountText}>{amountText}</CopyableEstimateText>,
                <CopyableEstimateText key={`${estimate.no}-phone`} value={phoneText}>{phoneText}</CopyableEstimateText>,
                <select className={`estimate-status-select ${isStockCheck ? 'stock-check' : ''} ${displayStatus === '확정' ? 'confirmed' : ''}`} key={`${estimate.no}-status`} onChange={(event) => updateEstimateListStatus(estimate, event.target.value as EstimateListStatus)} value={displayStatus}>
                  {ESTIMATE_LIST_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                </select>,
                <div className="estimate-followup-actions" key={`${estimate.no}-actions`}>
                  <button className="mini-button" onClick={() => openEstimateWorkConversion(estimate)} type="button">작업전환</button>
                  <button className="mini-button" onClick={() => setSelectedEstimate(estimate)} type="button">상세</button>
                </div>,
              ];
            })}
          />
        ) : (
          <div className="empty-state">
            <strong>검색 결과가 없습니다.</strong>
            <span>기간이나 조회 조건을 바꿔 다시 검색해보세요.</span>
          </div>
        )}
      </Panel>
      {copyNotice ? <div className="estimate-copy-toast" role="status">{copyNotice}</div> : null}

      {selectedEstimate ? (
        <EstimateDetailModal
          estimate={selectedEstimate}
          onClose={() => setSelectedEstimate(null)}
          onOpenWorkDraft={(estimate) => {
            setSelectedEstimate(null);
            setWorkDraftEstimate(estimate);
          }}
          vehicleSuggestions={vehicleSuggestions}
        />
      ) : null}

      {workDraftEstimate ? (
        <WorkRegistrationDrawer
          estimate={workDraftEstimate}
          onCreateWorkRecord={onCreateWorkRecord}
          onClose={() => setWorkDraftEstimate(null)}
          vehicleModelSuggestions={vehicleSuggestions.model}
        />
      ) : null}
    </div>
  );
}

function EstimateRegistrationModal({
  onCreateWorkRecord,
  onClose,
  vehicleSuggestions,
}: {
  onCreateWorkRecord: (record: WorkerWorkListRecord) => void;
  onClose: () => void;
  vehicleSuggestions: VehicleSuggestionSet;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="estimate-registration-title"
        aria-modal="true"
        className="customer-modal estimate-registration-modal estimate-registration-client-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">견적</p>
            <h2 id="estimate-registration-title">견적 등록</h2>
          </div>
          <button className="ghost-button" onClick={onClose} title="닫기" type="button">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body estimate-registration-modal-body">
          <EstimateRegistrationPanel
            onCreateWorkRecord={onCreateWorkRecord}
            onSubmitComplete={onClose}
            vehicleSuggestions={vehicleSuggestions}
          />
        </div>
      </section>
    </div>
  );
}

function EstimateRegistrationPanel({
  estimate,
  onCreateWorkRecord,
  onSubmitComplete,
  submitLabel = '견적등록',
  vehicleSuggestions,
}: {
  estimate?: Estimate;
  onCreateWorkRecord?: (record: WorkerWorkListRecord) => void;
  onSubmitComplete?: () => void;
  submitLabel?: string;
  vehicleSuggestions: VehicleSuggestionSet;
}) {
  const estimatorOptions = ['사용자1', '사용자2', '사용자3'];
  const [estimateDate, setEstimateDate] = useState(estimate?.estimateDate.replace(/\./g, '-') ?? '');
  const [estimatorName, setEstimatorName] = useState(estimate?.estimatorName ?? '');
  const [repairDivision, setRepairDivision] = useState<'일반' | '보험'>(estimate?.repairType?.startsWith('보험') ? '보험' : '일반');
  const [insuranceTypes, setInsuranceTypes] = useState<string[]>(() => {
    if (!estimate?.repairType?.startsWith('보험')) return [];
    const initialInsuranceTypes = ESTIMATE_INSURANCE_TYPE_OPTIONS.filter((type) => estimate.repairType.includes(type));
    return initialInsuranceTypes.length > 0 ? initialInsuranceTypes : [ESTIMATE_DEFAULT_INSURANCE_TYPE];
  });
  const [outsourceType, setOutsourceType] = useState<EstimateOutsourceType>(estimate?.outsourceType ?? '일반');
  const [outsourcePartner, setOutsourcePartner] = useState(outsourceType === '일반' ? '' : estimate?.customer ?? '');
  const [phone, setPhone] = useState(formatPhoneInputValue(estimate?.phone ?? ''));
  const [vehicle, setVehicle] = useState(estimate?.vehicle ?? '');
  const [plateNumber, setPlateNumber] = useState(estimate?.plateNumber ?? '');
  const [vin, setVin] = useState(estimate?.vin ?? '');
  const [repairArea, setRepairArea] = useState(estimate?.area.join(', ') ?? '');
  const [partNo, setPartNo] = useState('');
  const [tintSpec, setTintSpec] = useState('');
  const [estimateContent, setEstimateContent] = useState(estimate?.estimateContent ?? '');
  const [replacementAmount, setReplacementAmount] = useState(formatMoneyInputValue(estimate?.deductibleAmount ?? ''));
  const [tintAmount, setTintAmount] = useState(formatMoneyInputValue(estimate?.tintAmount ?? ''));
  const [paymentAmount, setPaymentAmount] = useState(formatMoneyInputValue(estimate?.paymentAmount ?? estimate?.amount ?? ''));
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [purchasePartner, setPurchasePartner] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [lookupTarget, setLookupTarget] = useState<'outsourcePartner' | 'vehicle' | 'partNo' | 'purchasePartner' | null>(null);
  const [lookupQuery, setLookupQuery] = useState('');
  const partnerSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          [...partners.map((partner) => partner.name), ...CUSTOMER_LOOKUP_SUGGESTIONS, ...estimates.map((item) => item.customer)]
            .filter(Boolean),
        ),
      ),
    [],
  );
  const lookupConfig = lookupTarget
    ? {
        outsourcePartner: {
          title: '거래처 검색',
          placeholder: '거래처명 입력',
          suggestions: partnerSuggestions,
          canCreate: true,
          onSelect: setOutsourcePartner,
        },
        vehicle: {
          title: '차종 검색',
          placeholder: '차종 입력',
          suggestions: vehicleSuggestions.model,
          canCreate: false,
          onSelect: setVehicle,
        },
        partNo: {
          title: '품번 검색',
          placeholder: '품번 입력',
          suggestions: PART_LOOKUP_SUGGESTIONS,
          canCreate: false,
          onSelect: setPartNo,
        },
        purchasePartner: {
          title: '매입처 검색',
          placeholder: '매입처명 입력',
          suggestions: partnerSuggestions,
          canCreate: true,
          onSelect: setPurchasePartner,
        },
      }[lookupTarget]
    : null;
  const filteredLookupSuggestions = lookupConfig
    ? lookupConfig.suggestions.filter((suggestion) => suggestion.toLowerCase().includes(lookupQuery.trim().toLowerCase())).slice(0, 8)
    : [];
  const selectedPaymentMethod = paymentMethods.includes('카드')
    ? '카드'
    : paymentMethods.includes('계좌')
      ? '계좌'
      : paymentMethods.includes('현금')
        ? '현금'
        : '';
  const claimTypeValue = repairDivision === '일반' ? '일반' : `보험(${(insuranceTypes.length > 0 ? insuranceTypes : [ESTIMATE_DEFAULT_INSURANCE_TYPE]).join(', ')})`;
  const nativeEstimateDate = /^\d{4}-\d{2}-\d{2}$/.test(estimateDate) ? estimateDate : '';
  const nativePurchaseDate = /^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) ? purchaseDate : '';
  const clientFieldClass = (span: 3 | 4 | 6 | 8 | 12, extraClass = '') =>
    `estimate-client-field-unit span-${span} ${extraClass}`.trim();

  function formatPhoneInputValue(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  function selectRepairDivision(nextDivision: '일반' | '보험') {
    setRepairDivision(nextDivision);
    if (nextDivision === '일반') {
      setInsuranceTypes([]);
      return;
    }

    setInsuranceTypes((current) => (current.length > 0 ? current : [ESTIMATE_DEFAULT_INSURANCE_TYPE]));
  }

  function toggleInsuranceType(type: string) {
    setRepairDivision('보험');
    setInsuranceTypes((current) => {
      if (current.includes(type)) return current.length === 1 ? current : current.filter((item) => item !== type);
      return [...current, type];
    });
  }

  function updateOutsourceType(nextType: EstimateOutsourceType) {
    setOutsourceType(nextType);
    if (nextType === '일반') setOutsourcePartner('');
  }

  function updateCalculatedAmount(nextReplacementAmount: string, nextTintAmount: string) {
    const nextReplacement = formatMoneyInputValue(nextReplacementAmount);
    const nextTint = formatMoneyInputValue(nextTintAmount);
    setReplacementAmount(nextReplacement);
    setTintAmount(nextTint);

    if (nextReplacement || nextTint) {
      setPaymentAmount(formatMoneyInputValue(parseMoneyInputValue(nextReplacement) + parseMoneyInputValue(nextTint)));
    }
  }

  function togglePaymentMethod(method: string) {
    setPaymentMethods((current) => (current.includes(method) ? current.filter((item) => item !== method) : [...current, method]));
  }

  function openLookup(target: NonNullable<typeof lookupTarget>, initialQuery = '') {
    setLookupTarget(target);
    setLookupQuery(initialQuery);
  }

  function selectLookupValue(value: string) {
    lookupConfig?.onSelect(value);
    setLookupTarget(null);
    setLookupQuery('');
  }

  return (
    <form
      className="estimate-registration-form estimate-client-form"
      id="estimate-registration-client-form"
      onSubmit={(event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const shouldCreateWork = submitter?.dataset.intent === 'work';
        const formData = new FormData(event.currentTarget);
        if (shouldCreateWork) {
          formData.set('scheduledWorkDate', estimateDate || ESTIMATE_DEFAULT_PERIOD_END);
        }
        const record = createEstimateWorkRecordFromFormData(formData, shouldCreateWork);
        if (record) {
          onCreateWorkRecord?.(record);
        }
        onSubmitComplete?.();
      }}
    >
      <input name="tradeType" type="hidden" value={outsourceType === '일반' ? '개인' : '업체'} />
      <input name="customer" type="hidden" value={outsourcePartner || purchasePartner} />
      <input name="claimType" type="hidden" value={claimTypeValue} />
      <input name="workType" type="hidden" value="교체" />
      <input name="finalEstimateContent" type="hidden" value={estimateContent} />
      <input name="paymentMethod" type="hidden" value={selectedPaymentMethod} />
      <input name="cardCompany" type="hidden" value={CARD_COMPANY_OPTIONS[0] ?? ''} />
      <input name="scheduledWorkDate" type="hidden" value="" />

      <div className="estimate-client-grid">
        <div className={clientFieldClass(3)}>
          <label className="estimate-client-label" htmlFor="client-estimate-date">견적일자</label>
          <div className="estimate-client-icon-input date">
            <input
              id="client-estimate-date"
              inputMode="numeric"
              onChange={(event) => setEstimateDate(normalizeEstimateDateInput(event.target.value))}
              placeholder="YYYY-MM-DD"
              required
              value={estimateDate}
            />
            <CalendarDays size={15} />
            <input
              aria-label="견적일자 날짜 선택"
              className="estimate-client-date-native"
              onChange={(event) => setEstimateDate(event.target.value)}
              type="date"
              value={nativeEstimateDate}
            />
          </div>
        </div>

        <div className={clientFieldClass(3)}>
          <label className="estimate-client-label" htmlFor="client-estimator">견적담당자</label>
          <select id="client-estimator" name="estimatorName" onChange={(event) => setEstimatorName(event.target.value)} required value={estimatorName}>
            <option value="">선택</option>
            {estimatorOptions.map((name) => <option key={name}>{name}</option>)}
          </select>
        </div>

        <div className={clientFieldClass(6, 'estimate-client-repair-field')}>
          <span className="estimate-client-label">수리구분</span>
          <div className="estimate-repair-control">
            <div aria-label="수리구분" className="estimate-repair-primary" role="radiogroup">
              <label className={repairDivision === '일반' ? 'selected' : ''}>
                <input checked={repairDivision === '일반'} name="repairDivision" onChange={() => selectRepairDivision('일반')} type="radio" />
                일반
              </label>
              <label className={repairDivision === '보험' ? 'selected' : ''}>
                <input checked={repairDivision === '보험'} name="repairDivision" onChange={() => selectRepairDivision('보험')} type="radio" />
                보험
              </label>
            </div>
            {repairDivision === '보험' ? (
              <div aria-label="보험 유형" className="estimate-insurance-options">
                <span>보험유형</span>
                {ESTIMATE_INSURANCE_TYPE_OPTIONS.map((type) => (
                  <label key={type} className={insuranceTypes.includes(type) ? 'selected' : ''}>
                    <input checked={insuranceTypes.includes(type)} onChange={() => toggleInsuranceType(type)} type="checkbox" />
                    {type}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className={clientFieldClass(8, 'estimate-client-outsource')}>
          <span className="estimate-client-label">외주여부</span>
          <div className="estimate-client-outsource-control">
            <div className="estimate-client-checks">
              {ESTIMATE_OUTSOURCE_OPTIONS.map((type) => (
                <label key={type}><input checked={outsourceType === type} onChange={() => updateOutsourceType(type)} type="checkbox" />{type}</label>
              ))}
            </div>
            <div className="estimate-client-icon-input">
              <input
                onChange={(event) => setOutsourcePartner(event.target.value)}
                placeholder={outsourceType === '일반' ? '' : '거래처 검색'}
                required={outsourceType !== '일반'}
                value={outsourcePartner}
              />
              <button onClick={() => openLookup('outsourcePartner', outsourcePartner)} title="거래처 검색" type="button">
                <Search size={23} />
              </button>
            </div>
          </div>
        </div>

        <div className={clientFieldClass(4)}>
          <label className="estimate-client-label" htmlFor="client-phone">연락처</label>
          <input id="client-phone" inputMode="tel" onChange={(event) => setPhone(formatPhoneInputValue(event.target.value))} value={phone} />
        </div>

        <div className={clientFieldClass(4)}>
          <label className="estimate-client-label" htmlFor="client-vehicle">차종</label>
          <div className="estimate-client-icon-input">
            <input id="client-vehicle" name="vehicle" onChange={(event) => setVehicle(event.target.value)} value={vehicle} />
            <button onClick={() => openLookup('vehicle', vehicle)} title="차종 검색" type="button">
              <Search size={23} />
            </button>
          </div>
        </div>

        <div className={clientFieldClass(4)}>
          <label className="estimate-client-label" htmlFor="client-plate">차량번호</label>
          <input id="client-plate" name="plateNumber" onChange={(event) => setPlateNumber(event.target.value)} value={plateNumber} />
        </div>

        <div className={clientFieldClass(4)}>
          <label className="estimate-client-label" htmlFor="client-vin">차대번호</label>
          <input id="client-vin" onChange={(event) => setVin(event.target.value)} value={vin} />
        </div>

        <div className={clientFieldClass(6)}>
          <label className="estimate-client-label" htmlFor="client-repair-area">수리부위</label>
          <input id="client-repair-area" name="repairArea" onChange={(event) => setRepairArea(event.target.value)} value={repairArea} />
        </div>

        <div className={clientFieldClass(6)}>
          <label className="estimate-client-label" htmlFor="client-part-no">품번/썬팅</label>
          <div className="estimate-client-split">
            <div className="estimate-client-icon-input">
              <input id="client-part-no" name="partNo" onChange={(event) => setPartNo(event.target.value)} value={partNo} />
              <button onClick={() => openLookup('partNo', partNo)} title="품번 검색" type="button">
                <Search size={22} />
              </button>
            </div>
            <input aria-label="썬팅 사양" onChange={(event) => setTintSpec(event.target.value)} value={tintSpec} />
          </div>
        </div>

        <label className={clientFieldClass(8, 'estimate-client-content-field')} htmlFor="client-estimate-content">
          <span className="estimate-client-label">견적내용</span>
          <AutoResizeTextarea
            id="client-estimate-content"
            minHeight={196}
            name="estimateContent"
            onChange={setEstimateContent}
            placeholder="견적내용 입력"
            required
            value={estimateContent}
          />
        </label>

        <div className={clientFieldClass(4, 'estimate-client-payment')}>
          <div className="estimate-client-money-row">
            <label className="estimate-client-subfield" htmlFor="client-replacement-amount">
              <span>교체/면책금</span>
              <input
                id="client-replacement-amount"
                inputMode="numeric"
                onChange={(event) => updateCalculatedAmount(event.target.value, tintAmount)}
                value={replacementAmount}
              />
            </label>
            <label className="estimate-client-subfield" htmlFor="client-tint-amount">
              <span>썬팅</span>
              <input
                id="client-tint-amount"
                inputMode="numeric"
                onChange={(event) => updateCalculatedAmount(replacementAmount, event.target.value)}
                value={tintAmount}
              />
            </label>
          </div>
          <label className="estimate-client-subfield" htmlFor="client-payment-amount">
            <span>결제금액</span>
            <input
              id="client-payment-amount"
              inputMode="numeric"
              name="paymentAmount"
              onChange={(event) => setPaymentAmount(formatMoneyInputValue(event.target.value))}
              value={paymentAmount}
            />
          </label>
          <div className="estimate-client-payment-methods">
            <span>결제구분</span>
            <div className="estimate-client-checks">
              {['카드', '계좌', '현금'].map((method) => (
                <label key={method}><input checked={paymentMethods.includes(method)} onChange={() => togglePaymentMethod(method)} type="checkbox" />{method}</label>
              ))}
            </div>
          </div>
        </div>

        <div className={clientFieldClass(4)}>
          <label className="estimate-client-label" htmlFor="client-purchase-partner">매입처</label>
          <div className="estimate-client-icon-input">
            <input id="client-purchase-partner" onChange={(event) => setPurchasePartner(event.target.value)} value={purchasePartner} />
            <button onClick={() => openLookup('purchasePartner', purchasePartner)} title="매입처 검색" type="button">
              <Search size={23} />
            </button>
          </div>
        </div>

        <div className={clientFieldClass(4)}>
          <label className="estimate-client-label" htmlFor="client-purchase-amount">매입금액</label>
          <input
            id="client-purchase-amount"
            inputMode="numeric"
            onChange={(event) => setPurchaseAmount(formatMoneyInputValue(event.target.value))}
            value={purchaseAmount}
          />
        </div>

        <div className={clientFieldClass(4)}>
          <label className="estimate-client-label" htmlFor="client-purchase-date">매입예정일</label>
          <div className="estimate-client-icon-input date">
            <input
              id="client-purchase-date"
              inputMode="numeric"
              onChange={(event) => setPurchaseDate(normalizeEstimateDateInput(event.target.value))}
              value={purchaseDate}
            />
            <CalendarDays size={15} />
            <input
              aria-label="매입예정일 날짜 선택"
              className="estimate-client-date-native"
              onChange={(event) => setPurchaseDate(event.target.value)}
              type="date"
              value={nativePurchaseDate}
            />
          </div>
        </div>
      </div>

      <div className="estimate-client-actions estimate-client-actions-footer">
        {onCreateWorkRecord ? <button className="estimate-client-submit secondary" data-intent="work" type="submit">작업등록</button> : null}
        <button className="estimate-client-submit primary" data-intent="estimate" type="submit">{submitLabel}</button>
      </div>

      {lookupConfig ? (
        <div className="estimate-client-lookup-backdrop" role="presentation" onMouseDown={() => setLookupTarget(null)}>
          <section className="estimate-client-lookup" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <h3>{lookupConfig.title}</h3>
              {lookupConfig.canCreate ? <button type="button">신규 등록</button> : null}
            </header>
            <input
              autoFocus
              onChange={(event) => setLookupQuery(event.target.value)}
              placeholder={lookupConfig.placeholder}
              value={lookupQuery}
            />
            <div className="estimate-client-lookup-list">
              {filteredLookupSuggestions.length > 0 ? filteredLookupSuggestions.map((suggestion) => (
                <button key={suggestion} onClick={() => selectLookupValue(suggestion)} type="button">{suggestion}</button>
              )) : <span>검색 결과가 없습니다.</span>}
            </div>
          </section>
        </div>
      ) : null}
    </form>
  );
}

function buildInitialScheduleEvents(): ScheduleEvent[] {
  return [
    ...workOrders.map((order, index) => ({
      id: `work-${index}`,
      date: '2026.05.20',
      time: order.time,
      kind: '작업' as const,
      title: order.repair,
      owner: order.technician,
      target: `${order.customer} · ${order.vehicle}`,
      status: order.status,
      memo: `${order.visit} · ${order.address} · ${order.stock}`,
    })),
    ...generalTasks.map((task, index) => ({
      id: `general-${index}`,
      date: '2026.05.20',
      time: task.time,
      kind: '일반' as const,
      title: task.title,
      owner: task.owner,
      target: task.category,
      status: task.status,
      memo: task.detail,
    })),
    ...claims.slice(0, 3).map((claim, index) => ({
      id: `claim-${index}`,
      date: `2026.05.${21 + index}`,
      time: index === 0 ? '10:00' : '15:00',
      kind: '청구' as const,
      title: `${claim.insurer} ${claim.status}`,
      owner: '정보경',
      target: `${claim.customer} · ${claim.vehicle}`,
      status: claim.status,
      memo: `청구 ${formatMoney(claim.claimAmount)} / 고객결제 ${formatMoney(claim.customerAmount)}`,
    })),
    {
      id: 'leave-0',
      date: '2026.05.24',
      time: '종일',
      kind: '휴무',
      title: '정하늘 개인 휴무',
      owner: '정하늘',
      target: '개인 휴무',
      status: '휴무',
      memo: '작업 배정 제외',
    },
    {
      id: 'leave-1',
      date: '2026.05.27',
      time: '오후',
      kind: '휴무',
      title: '이준호 오후 반차',
      owner: '이준호',
      target: '개인 일정',
      status: '휴무',
      memo: '오전 작업만 배정',
    },
  ];
}

const paymentScheduleSeed: PaymentScheduleItem[] = [
  {
    id: 'payment-001',
    date: '2026.05.21',
    partner: '(주)한국유리',
    item: '전면 유리 매입건',
    amount: 2500000,
    paidAmount: 0,
    status: '결제예정',
    method: '계좌이체',
    source: '매입입고',
    memo: 'GV80 전면유리 입고분',
  },
  {
    id: 'payment-002',
    date: '2026.05.21',
    partner: '현대모비스 부산점',
    item: '부자재(실리콘 외)',
    amount: 850000,
    paidAmount: 850000,
    status: '결제완료',
    method: '카드',
    source: '자재 매입',
    memo: '월말 세금계산서 수취',
  },
  {
    id: 'payment-003',
    date: '2026.05.24',
    partner: 'SK렌터카 정비팀',
    item: '월간 정비 수수료 정산',
    amount: 1150000,
    paidAmount: 650000,
    status: '부분결제',
    method: '계좌이체',
    source: '작업 정산',
    memo: '잔액 500,000원 확인 필요',
  },
  {
    id: 'payment-004',
    date: '2026.05.18',
    partner: '진주 썬팅마스터',
    item: '외주 작업 비용',
    amount: 400000,
    paidAmount: 0,
    status: '연체',
    method: '현금',
    source: '외주',
    memo: '담당자 확인 후 지급',
  },
  {
    id: 'payment-005',
    date: '2026.05.27',
    partner: '대성모터스',
    item: '거래처 월 정산',
    amount: 1780000,
    paidAmount: 0,
    status: '결제예정',
    method: '계좌이체',
    source: '거래처 미결',
    memo: '청구서 발행 후 결제 예정',
  },
];

function createPaymentScheduleDraft(): PaymentScheduleDraft {
  return {
    date: '2026-05-21',
    partner: '',
    item: '',
    amount: '',
    paidAmount: '0',
    status: '결제예정',
    method: '계좌이체',
    source: '매입입고',
    memo: '',
  };
}

function createPaymentScheduleDraftFromItem(payment: PaymentScheduleItem): PaymentScheduleDraft {
  return {
    date: paymentDateInputValue(payment.date),
    partner: payment.partner,
    item: payment.item,
    amount: payment.amount.toLocaleString('ko-KR'),
    paidAmount: payment.paidAmount.toLocaleString('ko-KR'),
    status: payment.status,
    method: payment.method,
    source: payment.source,
    memo: payment.memo,
  };
}

function normalizePaymentDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.replaceAll('-', '.');
  }

  return value.trim();
}

function parseMoneyText(value: string) {
  return parseMoneyInputValue(value);
}

function formatMoneyInputElement(event: ChangeEvent<HTMLInputElement>) {
  event.currentTarget.value = formatMoneyInputValue(event.currentTarget.value);
}

function parseDateInput(value: string) {
  const match = value.trim().match(/^(\d{4})[-.](\d{1,2})[-.](\d{1,2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMonthKey(year: number, monthIndex: number) {
  return `${year}.${String(monthIndex + 1).padStart(2, '0')}`;
}

function monthKeyFromDate(value: string) {
  const date = parseDateInput(value);
  return date ? formatMonthKey(date.getFullYear(), date.getMonth()) : '';
}

function monthIndexFromKey(monthKey: string) {
  const [year = 2026, month = 1] = monthKey.split('.').map(Number);
  if (!year || !month) return 0;

  return year * 12 + month - 1;
}

function shiftMonthKey(monthKey: string, offset: number) {
  const [year = 2026, month = 1] = monthKey.split('.').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return formatMonthKey(date.getFullYear(), date.getMonth());
}

function formatMonthLabel(monthKey: string) {
  const [year = '2026', month = '01'] = monthKey.split('.');
  return `${year}년 ${Number(month)}월`;
}

function formatShortMonth(monthKey: string) {
  const [year = '2026', month = '01'] = monthKey.split('.');
  return `${year.slice(2)}.${month}`;
}

function formatDateInputFromMonth(monthKey: string, day: number) {
  const [year = 2026, month = 1] = monthKey.split('.').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

function formatDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function addMonths(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + amount);
  return nextDate;
}

function formatDisplayDateFromInput(value: string) {
  return normalizePaymentDate(value);
}

function summarizeValues(values: string[], maxItems = 2) {
  const uniqueValues = Array.from(new Set(values.filter((value) => value.trim().length > 0)));
  if (uniqueValues.length === 0) return '-';
  if (uniqueValues.length <= maxItems) return uniqueValues.join(', ');
  return `${uniqueValues.slice(0, maxItems).join(', ')} 외 ${uniqueValues.length - maxItems}`;
}

function createManualPaymentDraft(monthKey = '2026.05'): ManualPaymentDraft {
  return {
    startDate: formatDateInputFromMonth(monthKey, 21),
    partner: '',
    item: '',
    amount: '',
    paidAmount: '0',
    variability: '고정',
    category: '직접등록',
    bank: '',
    accountNumber: '',
    invoiceIssued: 'N',
    status: '결제예정',
    repeat: 'none',
    endDate: formatDateInputFromMonth(shiftMonthKey(monthKey, 12), 28),
    memo: '',
  };
}

function createManualPaymentRule(draft: ManualPaymentDraft): ManualPaymentRule {
  const amount = parseMoneyText(draft.amount);
  const paidAmount = draft.status === '결제완료' ? amount : parseMoneyText(draft.paidAmount);

  return {
    id: `manual-payment-${Date.now()}`,
    startDate: draft.startDate,
    partner: draft.partner.trim() || '거래처 미입력',
    item: draft.item.trim() || '수기 결제',
    amount,
    paidAmount: Math.min(amount, Math.max(0, paidAmount)),
    variability: draft.variability,
    category: draft.category.trim() || '직접등록',
    bank: draft.bank.trim() || '-',
    accountNumber: draft.accountNumber.trim() || '-',
    invoiceIssued: draft.invoiceIssued === 'Y',
    status: draft.status,
    repeat: draft.repeat,
    endDate: draft.endDate,
    memo: draft.memo.trim() || '수기 등록',
  };
}

function manualRuleOccurrenceForMonth(rule: ManualPaymentRule, monthKey: string): PaymentListSourceItem | null {
  const startDate = parseDateInput(rule.startDate);
  if (!startDate) return null;

  const startMonthKey = formatMonthKey(startDate.getFullYear(), startDate.getMonth());
  const monthDelta = monthIndexFromKey(monthKey) - monthIndexFromKey(startMonthKey);
  if (monthDelta < 0) return null;

  const repeatOption = PAYMENT_REPEAT_OPTIONS.find((option) => option.id === rule.repeat);
  if (rule.repeat === 'none' && monthDelta !== 0) return null;
  if (repeatOption?.intervalMonths && monthDelta % repeatOption.intervalMonths !== 0) return null;

  const [year = 2026, month = 1] = monthKey.split('.').map(Number);
  const occurrenceDay = Math.min(startDate.getDate(), new Date(year, month, 0).getDate());
  const occurrenceDate = `${year}-${String(month).padStart(2, '0')}-${String(occurrenceDay).padStart(2, '0')}`;
  const endDate = parseDateInput(rule.endDate);
  const occurrence = parseDateInput(occurrenceDate);
  if (endDate && occurrence && occurrence > endDate) return null;

  return {
    id: `${rule.id}-${monthKey}`,
    baseMonth: monthKey,
    paymentMonth: monthKey,
    dueDate: formatDisplayDateFromInput(occurrenceDate),
    variability: rule.variability,
    category: rule.category,
    partner: rule.partner,
    bank: rule.bank,
    accountNumber: rule.accountNumber,
    amount: rule.amount,
    paidAmount: rule.paidAmount,
    invoiceIssued: rule.invoiceIssued,
    status: rule.status,
    source: '수기등록',
    memo: `${rule.item}${rule.repeat === 'none' ? '' : ` · 반복 ${repeatOption?.label ?? ''}`}${rule.memo ? ` · ${rule.memo}` : ''}`,
  };
}

function buildPaymentListSourceItems(
  monthKey: string,
  manualRules: ManualPaymentRule[],
  periodBasis: PaymentPeriodBasis = 'base',
  workRecords: WorkerWorkListRecord[] = [],
): PaymentListSourceItem[] {
  const purchaseItems = purchaseEntries
    .filter((entry) => (periodBasis === 'payment' ? entry.paymentMonth === monthKey : entry.baseMonth === monthKey))
    .map((entry): PaymentListSourceItem => ({
      id: entry.id,
      baseMonth: entry.baseMonth,
      paymentMonth: entry.paymentMonth,
      dueDate: entry.dueDate,
      variability: entry.variability,
      category: entry.category,
      partner: entry.partner,
      bank: entry.bank,
      accountNumber: entry.accountNumber,
      amount: entry.amount,
      paidAmount: entry.paidAmount,
      invoiceIssued: entry.invoiceIssued,
      status: entry.status,
      source: '구매관리',
      memo: entry.memo,
    }));
  const manualItems = manualRules
    .map((rule) => manualRuleOccurrenceForMonth(rule, monthKey))
    .filter((item): item is PaymentListSourceItem => Boolean(item));
  const workItems = workRecordsToPaymentListSourceItems(workRecords).filter((item) =>
    periodBasis === 'payment' ? item.paymentMonth === monthKey : item.baseMonth === monthKey,
  );

  return [...purchaseItems, ...manualItems, ...workItems];
}

function isDisplayDateInRange(displayDate: string, startDate: string, endDate: string) {
  const date = parseDateInput(displayDate);
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!date || !start || !end) return true;

  return date >= start && date <= end;
}

function buildPaymentListSourceItemsForRange(
  startDate: string,
  endDate: string,
  manualRules: ManualPaymentRule[],
  workRecords: WorkerWorkListRecord[] = [],
): PaymentListSourceItem[] {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!start || !end || start > end) return [];

  const purchaseItems = purchaseEntries
    .filter((entry) => isDisplayDateInRange(entry.dueDate, startDate, endDate))
    .map((entry): PaymentListSourceItem => ({
      id: entry.id,
      baseMonth: entry.baseMonth,
      paymentMonth: entry.paymentMonth,
      dueDate: entry.dueDate,
      variability: entry.variability,
      category: entry.category,
      partner: entry.partner,
      bank: entry.bank,
      accountNumber: entry.accountNumber,
      amount: entry.amount,
      paidAmount: entry.paidAmount,
      invoiceIssued: entry.invoiceIssued,
      status: entry.status,
      source: '구매관리',
      memo: entry.memo,
    }));
  const manualItems: PaymentListSourceItem[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= endMonth) {
    const monthKey = formatMonthKey(cursor.getFullYear(), cursor.getMonth());
    manualRules.forEach((rule) => {
      const occurrence = manualRuleOccurrenceForMonth(rule, monthKey);
      if (occurrence && isDisplayDateInRange(occurrence.dueDate, startDate, endDate)) {
        manualItems.push(occurrence);
      }
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const workItems = workRecordsToPaymentListSourceItems(workRecords).filter((entry) =>
    isDisplayDateInRange(entry.dueDate, startDate, endDate),
  );

  return [...purchaseItems, ...manualItems, ...workItems];
}

function resolveAggregatePaymentStatus(entries: PaymentListSourceItem[]): PurchasePaymentStatus {
  if (entries.some((entry) => entry.status === '연체')) return '연체';
  if (entries.every((entry) => entry.status === '결제완료')) return '결제완료';
  if (entries.some((entry) => entry.status === '부분결제' || entry.paidAmount > 0)) return '부분결제';
  return '결제예정';
}

function buildPaymentPartnerAggregates(items: PaymentListSourceItem[]): PaymentPartnerAggregate[] {
  const groups = new Map<string, PaymentListSourceItem[]>();

  items.forEach((item) => {
    const key = `${item.baseMonth}|${item.partner}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return Array.from(groups.entries()).map(([key, entries]) => {
    const amount = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const paidAmount = entries.reduce((sum, entry) => sum + entry.paidAmount, 0);
    const invoiceCount = entries.filter((entry) => entry.invoiceIssued).length;
    const invoiceSummary =
      invoiceCount === entries.length ? 'Y' : invoiceCount === 0 ? 'N' : `${invoiceCount}/${entries.length}`;

    return {
      key,
      baseMonth: entries[0]!.baseMonth,
      paymentMonth: summarizeValues(entries.map((entry) => formatShortMonth(entry.paymentMonth))),
      partner: entries[0]!.partner,
      amount,
      paidAmount,
      variability: summarizeValues(entries.map((entry) => entry.variability)),
      category: summarizeValues(entries.map((entry) => entry.category)),
      bank: summarizeValues(entries.map((entry) => entry.bank)),
      accountNumber: summarizeValues(entries.map((entry) => entry.accountNumber), 1),
      invoiceSummary,
      status: resolveAggregatePaymentStatus(entries),
      dueDateSummary: summarizeValues(entries.map((entry) => entry.dueDate), 2),
      sourceSummary: summarizeValues(entries.map((entry) => entry.source)),
      entries,
    };
  });
}

function paymentStatusTone(status: PaymentScheduleStatus): Tone {
  if (status === '결제완료') return 'green';
  if (status === '부분결제') return 'orange';
  if (status === '연체') return 'red';
  return 'blue';
}

function matchesPaymentFilter(payment: PaymentScheduleItem, filter: PaymentScheduleFilter) {
  if (filter === 'all') return true;
  if (filter === 'scheduled') return payment.status === '결제예정';
  if (filter === 'paid') return payment.status === '결제완료';
  if (filter === 'partial') return payment.status === '부분결제';
  return payment.status === '연체';
}

function matchesPaymentGroupFilter(payment: PaymentScheduleItem, groupFilter: PaymentScheduleGroupFilter) {
  if (groupFilter === 'all') return true;

  const sourceText = compactPaymentSearchValue(`${payment.source} ${payment.item}`);
  const methodText = compactPaymentSearchValue(payment.method);

  if (groupFilter === 'purchase') return /매입|입고|자재|구매/u.test(sourceText);
  if (groupFilter === 'work') return /작업|정산|외주|거래처|자동등록/u.test(sourceText);
  if (groupFilter === 'transfer') return /계좌|이체/u.test(methodText);
  if (groupFilter === 'card') return /카드/u.test(methodText);
  return !/계좌|이체|카드/u.test(methodText);
}

function compactPaymentSearchValue(value: string) {
  return value.toLowerCase().replace(/[^0-9a-z가-힣]+/gi, '');
}

function paymentStatusSearchAliases(payment: PaymentScheduleItem) {
  const balanceAmount = Math.max(0, payment.amount - payment.paidAmount);
  const baseAliases =
    payment.status === '결제예정'
      ? ['예정', '대기', '미지급', '미결', '미결제', '잔액있음']
      : payment.status === '결제완료'
        ? ['완료', '완납', '지급완료', '잔액없음']
        : payment.status === '부분결제'
          ? ['부분', '일부', '일부결제', '부분지급', '잔액있음']
          : ['연체', '지연', '미지급', '미결', '미결제', '잔액있음'];

  return balanceAmount > 0 ? [...baseAliases, '잔액', '미수'] : [...baseAliases, '정산완료'];
}

function buildPaymentSearchText(payment: PaymentScheduleItem) {
  const balanceAmount = Math.max(0, payment.amount - payment.paidAmount);
  const paymentDateInput = payment.date.replaceAll('.', '-');
  const paymentMonth = payment.date.split('.').slice(0, 2).join('.');

  return [
    payment.date,
    paymentDateInput,
    paymentMonth,
    payment.partner,
    payment.item,
    payment.status,
    payment.method,
    payment.source,
    payment.memo,
    String(payment.amount),
    payment.amount.toLocaleString('ko-KR'),
    formatMoney(payment.amount),
    String(payment.paidAmount),
    payment.paidAmount.toLocaleString('ko-KR'),
    formatMoney(payment.paidAmount),
    String(balanceAmount),
    balanceAmount.toLocaleString('ko-KR'),
    formatMoney(balanceAmount),
    `지급 ${payment.paidAmount}`,
    `지급액 ${payment.paidAmount}`,
    `잔액 ${balanceAmount}`,
    ...paymentStatusSearchAliases(payment),
    balanceAmount > 0 ? '미지급 미결제 잔액있음' : '잔액없음 완납',
  ]
    .join(' ')
    .toLowerCase();
}

function matchesPaymentSearch(payment: PaymentScheduleItem, normalizedQuery: string) {
  if (!normalizedQuery) return true;

  const searchText = buildPaymentSearchText(payment);
  const compactSearchText = compactPaymentSearchValue(searchText);
  const tokens = normalizedQuery.split(/\s+/u).map((token) => token.trim()).filter(Boolean);

  return tokens.every((token) => {
    if (searchText.includes(token)) return true;

    const compactToken = compactPaymentSearchValue(token);
    return compactToken.length > 0 && compactSearchText.includes(compactToken);
  });
}

function filterPaymentScheduleItems(
  payments: PaymentScheduleItem[],
  filter: PaymentScheduleFilter,
  normalizedQuery: string,
  groupFilter: PaymentScheduleGroupFilter = 'all',
) {
  return payments.filter(
    (payment) =>
      matchesPaymentFilter(payment, filter) &&
      matchesPaymentGroupFilter(payment, groupFilter) &&
      matchesPaymentSearch(payment, normalizedQuery),
  );
}

function paymentDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatPaymentDateKey(date: Date) {
  return `${date.getFullYear()}.${paymentDatePart(date.getMonth() + 1)}.${paymentDatePart(date.getDate())}`;
}

function getPaymentScheduleToday() {
  return formatPaymentDateKey(new Date());
}

function getDefaultPaymentScheduleMonth() {
  return paymentMonthKeyFromDate(getPaymentScheduleToday());
}

function formatTodayHeaderLabel(date = new Date()) {
  return `${formatPaymentDateKey(date)} ${KOREAN_WEEKDAY_LABELS[date.getDay()]}요일`;
}

function parsePaymentMonthKey(monthKey: string) {
  const [yearText, monthText] = monthKey.split('.');
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;

  return { year, monthIndex: month - 1 };
}

function paymentMonthKeyFromDate(date: string) {
  return date.split('.').slice(0, 2).join('.');
}

function accountingDateKeyFromDate(value: string) {
  const normalizedDate = normalizeWorkDate(value);
  if (normalizedDate) return normalizedDate.replaceAll('-', '.');

  return normalizePaymentDate(value).replaceAll('-', '.');
}

function accountingMonthKeyFromDate(value: string) {
  return accountingDateKeyFromDate(value).split('.').slice(0, 2).join('.');
}

function formatPaymentMonthKey(year: number, monthIndex: number) {
  const normalizedDate = new Date(year, monthIndex, 1);
  return `${normalizedDate.getFullYear()}.${paymentDatePart(normalizedDate.getMonth() + 1)}`;
}

function formatPaymentMonthLabel(monthKey: string) {
  const month = parsePaymentMonthKey(monthKey);
  if (!month) return monthKey;

  return `${month.year}년 ${month.monthIndex + 1}월`;
}

function shiftPaymentMonth(monthKey: string, offset: number) {
  const month = parsePaymentMonthKey(monthKey) ?? parsePaymentMonthKey(getDefaultPaymentScheduleMonth())!;
  return formatPaymentMonthKey(month.year, month.monthIndex + offset);
}

function daysInPaymentMonth(monthKey: string) {
  const month = parsePaymentMonthKey(monthKey) ?? parsePaymentMonthKey(getDefaultPaymentScheduleMonth())!;
  return new Date(month.year, month.monthIndex + 1, 0).getDate();
}

function paymentDateForMonthDay(monthKey: string, day: number) {
  return `${monthKey}.${paymentDatePart(day)}`;
}

function paymentDateInputValue(date: string) {
  return accountingDateKeyFromDate(date).replaceAll('.', '-');
}

function paymentDateKeyInputValue(date: string) {
  return date.replaceAll('.', '-');
}

function alignPaymentDateToMonth(date: string, monthKey: string) {
  const day = Number(date.split('.')[2] ?? '1');
  const safeDay = Math.min(Math.max(Number.isFinite(day) && day > 0 ? day : 1, 1), daysInPaymentMonth(monthKey));
  return paymentDateForMonthDay(monthKey, safeDay);
}

function createPaymentScheduleItem(draft: PaymentScheduleDraft): PaymentScheduleItem {
  const amount = parseMoneyText(draft.amount);
  const paidAmount = draft.status === '결제완료' ? amount : parseMoneyText(draft.paidAmount);

  return {
    id: `payment-${Date.now()}`,
    date: normalizePaymentDate(draft.date) || '2026.05.21',
    partner: draft.partner.trim() || '거래처 미입력',
    item: draft.item.trim() || '결제 항목 미입력',
    amount,
    paidAmount: Math.min(amount, Math.max(0, paidAmount)),
    status: draft.status,
    method: draft.method.trim() || '계좌이체',
    source: draft.source.trim() || '직접등록',
    memo: draft.memo.trim() || '메모 없음',
  };
}

function downloadPaymentScheduleCsv(rows: PaymentScheduleItem[], startDate: string, endDate: string) {
  const headers = ['결제일자', '거래처', '결제항목', '금액', '지급액', '잔액', '상태', '결제수단', '출처', '메모'];
  const body = rows.map((payment) => [
    payment.date,
    payment.partner,
    payment.item,
    payment.amount,
    payment.paidAmount,
    Math.max(0, payment.amount - payment.paidAmount),
    payment.status,
    payment.method,
    payment.source,
    payment.memo,
  ]);
  const csv = `\uFEFF${[headers, ...body].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `결제상세_${startDate.replaceAll('.', '')}_${endDate.replaceAll('.', '')}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function PurchasePage({
  monthFilter,
  partnerFilter,
}: {
  monthFilter: string;
  partnerFilter: string;
}) {
  const [selectedMonth, setSelectedMonth] = useState(monthFilter || '2026.05');
  const [query, setQuery] = useState(partnerFilter);
  const [filter, setFilter] = useState<PurchaseFilter>('all');
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    setQuery(partnerFilter);
    if (monthFilter) setSelectedMonth(monthFilter);
  }, [monthFilter, partnerFilter]);

  const purchaseSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          purchaseEntries.flatMap((entry) => [
            entry.partner,
            entry.category,
            entry.bank,
            entry.accountNumber,
            entry.status,
          ]),
        ),
      ),
    [],
  );
  const filteredPurchases = useMemo(
    () =>
      purchaseEntries.filter((entry) => {
        const matchesMonth = entry.baseMonth === selectedMonth;
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [
            entry.baseMonth,
            entry.paymentMonth,
            entry.dueDate,
            entry.variability,
            entry.category,
            entry.partner,
            entry.bank,
            entry.accountNumber,
            entry.status,
            entry.memo,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'fixed' && entry.variability === '고정') ||
          (filter === 'variable' && entry.variability === '변동') ||
          (filter === 'unpaid' && entry.status !== '결제완료') ||
          (filter === 'paid' && entry.status === '결제완료');

        return matchesMonth && matchesQuery && matchesFilter;
      }),
    [filter, normalizedQuery, selectedMonth],
  );
  const totalAmount = filteredPurchases.reduce((sum, entry) => sum + entry.amount, 0);
  const paidAmount = filteredPurchases.reduce((sum, entry) => sum + entry.paidAmount, 0);
  const partnerCount = new Set(filteredPurchases.map((entry) => entry.partner)).size;
  const invoicePendingCount = filteredPurchases.filter((entry) => !entry.invoiceIssued).length;

  function changeMonth(offset: number) {
    const nextMonth = shiftMonthKey(selectedMonth, offset);
    setSelectedMonth(nextMonth);
    updateUrlSearchParams({ purchaseMonth: nextMonth });
  }

  function clearLinkedFilter() {
    setQuery('');
    updateUrlSearchParams({ purchasePartner: null });
  }

  return (
    <div className="page-stack purchase-page">
      {partnerFilter ? (
        <section className="purchase-linked-filter">
          <div>
            <strong>{partnerFilter}</strong>
            <span>대금결제리스트 상세에서 이동한 거래처 필터가 적용되어 있습니다.</span>
          </div>
          <button className="secondary-button" onClick={clearLinkedFilter} type="button">
            필터 해제
          </button>
        </section>
      ) : null}

      <section className="kpi-grid" aria-label="구매관리 요약">
        <KpiCard icon={Package} label="매입/지출 합계" value={formatMoney(totalAmount)} detail={`${formatMonthLabel(selectedMonth)} 기준`} tone="blue" />
        <KpiCard icon={CheckCircle2} label="지급 완료" value={formatMoney(paidAmount)} detail={`${filteredPurchases.filter((entry) => entry.status === '결제완료').length}건 완료`} tone="green" />
        <KpiCard icon={AlertCircle} label="미지급 잔액" value={formatMoney(Math.max(0, totalAmount - paidAmount))} detail="결제예정/부분/연체 포함" tone="orange" />
        <KpiCard icon={Building2} label="거래처" value={`${partnerCount}곳`} detail="기준월 내 매입처" tone="purple" />
        <KpiCard icon={FileText} label="계산서 미수취" value={`${invoicePendingCount}건`} detail="계산서 N 또는 확인 필요" tone={invoicePendingCount > 0 ? 'red' : 'green'} />
      </section>

      <Panel
        className="purchase-list-panel"
        title="구매관리 리스트"
        action={
          <div className="payment-month-control compact-month-control">
            <button className="ghost-button" title="이전 달" onClick={() => changeMonth(-1)} type="button">
              <ChevronLeft size={16} />
            </button>
            <strong>{formatMonthLabel(selectedMonth)}</strong>
            <button className="ghost-button" title="다음 달" onClick={() => changeMonth(1)} type="button">
              <ChevronRight size={16} />
            </button>
          </div>
        }
      >
        <RecordToolbar
          count={`총 ${filteredPurchases.length}건`}
          filters={
            <FilterTabs
              ariaLabel="구매관리 필터"
              onChange={(value) => setFilter(value as PurchaseFilter)}
              options={PURCHASE_FILTER_OPTIONS}
              value={filter}
            />
          }
          search={
            <SearchInput
              label="구매관리 검색"
              listId="purchase-search-suggestions"
              onChange={setQuery}
              placeholder="거래처, 구분, 은행, 계좌번호 검색"
              suggestions={purchaseSuggestions}
              value={query}
            />
          }
        />
        <ListColumnTable
          columns={['기준월', '결제월', '변동', '구분', '거래처', '은행', '계좌번호', '금액', '계산서', '결제여부', '메모']}
          rows={filteredPurchases.map((entry) => [
            formatShortMonth(entry.baseMonth),
            formatShortMonth(entry.paymentMonth),
            entry.variability,
            entry.category,
            <strong key={`${entry.id}-partner`}>{entry.partner}</strong>,
            entry.bank,
            entry.accountNumber,
            formatMoney(entry.amount),
            entry.invoiceIssued ? 'Y' : 'N',
            <div className="payment-status-stack" key={`${entry.id}-status`}>
              {entry.amount > 0 && entry.paidAmount >= entry.amount ? <span>{entry.dueDate}</span> : null}
              <StatusPill label={entry.status} tone={paymentStatusTone(entry.status)} />
            </div>,
            entry.memo,
          ])}
        />
        {filteredPurchases.length === 0 ? (
          <div className="empty-state">
            <strong>구매관리 내역이 없습니다.</strong>
            <span>기준월을 바꾸거나 검색 조건을 초기화해보세요.</span>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function PaymentListPage({
  onOpenPurchasePartner,
  workRecords,
}: {
  onOpenPurchasePartner: (partner: string, monthKey: string) => void;
  workRecords: WorkerWorkListRecord[];
}) {
  const [selectedMonth, setSelectedMonth] = useState('2026.05');
  const [manualRules, setManualRules] = useState<ManualPaymentRule[]>([]);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [draft, setDraft] = useState<ManualPaymentDraft>(() => createManualPaymentDraft('2026.05'));
  const [searchDraft, setSearchDraft] = useState({
    periodBasis: 'base' as PaymentPeriodBasis,
    periodStart: '2026-05-21',
    periodEnd: '2026-05-28',
    quickRange: '1week',
    variability: 'all',
    category: '',
    partner: '',
    invoice: 'all',
    payment: 'all',
    sort: 'dueAsc' as PaymentListSort,
  });
  const [appliedSearch, setAppliedSearch] = useState(searchDraft);
  const appliedMonthKey = monthKeyFromDate(appliedSearch.periodStart) || selectedMonth;
  const workPaymentListItems = useMemo(() => workRecordsToPaymentListSourceItems(workRecords), [workRecords]);
  const sourceItems = useMemo(
    () =>
      appliedSearch.periodBasis === 'custom'
        ? buildPaymentListSourceItemsForRange(appliedSearch.periodStart, appliedSearch.periodEnd, manualRules, workRecords)
        : buildPaymentListSourceItems(appliedMonthKey, manualRules, appliedSearch.periodBasis, workRecords),
    [appliedMonthKey, appliedSearch.periodBasis, appliedSearch.periodEnd, appliedSearch.periodStart, manualRules, workRecords],
  );
  const aggregates = useMemo(() => buildPaymentPartnerAggregates(sourceItems), [sourceItems]);
  const filteredAggregates = useMemo(
    () => {
      const filtered = aggregates.filter((aggregate) => {
        const categoryQuery = appliedSearch.category.trim().toLowerCase();
        const partnerQuery = appliedSearch.partner.trim().toLowerCase();
        const matchesVariability =
          appliedSearch.variability === 'all' || aggregate.entries.some((entry) => entry.variability === appliedSearch.variability);
        const matchesCategory =
          categoryQuery.length === 0 ||
          aggregate.entries.some((entry) => entry.category.toLowerCase().includes(categoryQuery));
        const matchesPartner = partnerQuery.length === 0 || aggregate.partner.toLowerCase().includes(partnerQuery);
        const matchesInvoice =
          appliedSearch.invoice === 'all' ||
          (appliedSearch.invoice === 'Y' && aggregate.entries.some((entry) => entry.invoiceIssued)) ||
          (appliedSearch.invoice === 'N' && aggregate.entries.some((entry) => !entry.invoiceIssued));
        const matchesPayment =
          appliedSearch.payment === 'all' ||
          (appliedSearch.payment === 'Y' && aggregate.status === '결제완료') ||
          (appliedSearch.payment === 'N' && aggregate.status !== '결제완료');

        return matchesVariability && matchesCategory && matchesPartner && matchesInvoice && matchesPayment;
      });

      return [...filtered].sort((left, right) => {
        if (appliedSearch.sort === 'amountDesc') return right.amount - left.amount;
        if (appliedSearch.sort === 'partnerAsc') return left.partner.localeCompare(right.partner, 'ko-KR');

        const leftDate = parseDateInput(left.entries[0]?.dueDate ?? '')?.getTime() ?? 0;
        const rightDate = parseDateInput(right.entries[0]?.dueDate ?? '')?.getTime() ?? 0;
        return appliedSearch.sort === 'dueDesc' ? rightDate - leftDate : leftDate - rightDate;
      });
    },
    [aggregates, appliedSearch],
  );
  const filteredListAmount = filteredAggregates.reduce((sum, aggregate) => sum + aggregate.amount, 0);
  const monthlySummaryBasis = appliedSearch.periodBasis === 'payment' ? 'payment' : 'base';
  const currentMonthItems = useMemo(
    () => buildPaymentListSourceItems(appliedMonthKey, manualRules, monthlySummaryBasis, workRecords),
    [appliedMonthKey, manualRules, monthlySummaryBasis, workRecords],
  );
  const currentMonthAmount = currentMonthItems.reduce((sum, item) => sum + item.amount, 0);
  const previousMonthItems = useMemo(
    () => buildPaymentListSourceItems(shiftMonthKey(appliedMonthKey, -1), manualRules, monthlySummaryBasis, workRecords),
    [appliedMonthKey, manualRules, monthlySummaryBasis, workRecords],
  );
  const previousMonthAmount = previousMonthItems.reduce((sum, item) => sum + item.amount, 0);
  const amountChange = currentMonthAmount - previousMonthAmount;
  const partnerSuggestions = useMemo(
    () => Array.from(new Set([...purchaseEntries.map((entry) => entry.partner), ...manualRules.map((rule) => rule.partner), ...workPaymentListItems.map((item) => item.partner)])),
    [manualRules, workPaymentListItems],
  );
  const categorySuggestions = useMemo(
    () => Array.from(new Set([...purchaseEntries.map((entry) => entry.category), ...manualRules.map((rule) => rule.category), ...workPaymentListItems.map((item) => item.category)])),
    [manualRules, workPaymentListItems],
  );

  function updateSearch<Key extends keyof typeof searchDraft>(key: Key, value: (typeof searchDraft)[Key]) {
    setSearchDraft((current) => ({ ...current, [key]: value }));
  }

  function resetSearch() {
    const nextSearch = {
      periodBasis: 'base' as const,
      periodStart: '2026-05-21',
      periodEnd: '2026-05-28',
      quickRange: '1week',
      variability: 'all',
      category: '',
      partner: '',
      invoice: 'all',
      payment: 'all',
      sort: 'dueAsc' as const,
    };
    setSelectedMonth('2026.05');
    setSearchDraft(nextSearch);
    setAppliedSearch(nextSearch);
  }

  function applyQuickPeriod(kind: 'today' | '3days' | '1week' | '2weeks' | '1month' | '3months' | '6months' | '1year') {
    const baseDate = parseDateInput(formatDateInputFromMonth(selectedMonth, 21)) ?? new Date(2026, 4, 21);
    const range =
      kind === 'today'
        ? { start: baseDate, end: baseDate }
        : kind === '3days'
          ? { start: baseDate, end: addDays(baseDate, 2) }
          : kind === '1week'
            ? { start: baseDate, end: addDays(baseDate, 7) }
            : kind === '2weeks'
              ? { start: baseDate, end: addDays(baseDate, 13) }
              : kind === '1month'
                ? { start: baseDate, end: addMonths(baseDate, 1) }
                : kind === '3months'
                  ? { start: baseDate, end: addMonths(baseDate, 3) }
                  : kind === '6months'
                    ? { start: baseDate, end: addMonths(baseDate, 6) }
                    : { start: baseDate, end: addMonths(baseDate, 12) };

    setSearchDraft((current) => ({
      ...current,
      periodStart: formatDateInputValue(range.start),
      periodEnd: formatDateInputValue(range.end),
      quickRange: kind,
    }));
    setSelectedMonth(formatMonthKey(range.start.getFullYear(), range.start.getMonth()));
  }

  function updateDraft<Key extends keyof ManualPaymentDraft>(key: Key, value: ManualPaymentDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addManualPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextRule = createManualPaymentRule(draft);

    setManualRules((current) => [nextRule, ...current]);
    setDraft(createManualPaymentDraft(selectedMonth));
    setIsRegistrationOpen(false);
  }

  return (
    <div className="page-stack payment-list-page">
      <section className="payment-list-top-grid" aria-label="대금결제 검색 및 요약">
        <div className="payment-list-search-panel" aria-label="대금결제 검색 조건">
          <div className="payment-filter-line period">
            <span className="payment-filter-label">기간</span>
            <div className="payment-radio-group">
              {[
                { id: 'base', label: '기준월' },
                { id: 'payment', label: '결제월' },
                { id: 'custom', label: '기간' },
              ].map((option) => (
                <label key={option.id}>
                  <input
                    checked={searchDraft.periodBasis === option.id}
                    onChange={() => {
                      updateSearch('periodBasis', option.id as PaymentPeriodBasis);
                      if (option.id !== 'custom') updateSearch('quickRange', '');
                    }}
                    type="radio"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <div className="payment-date-range">
              <input
                aria-label="기간 시작일"
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSearchDraft((current) => ({ ...current, periodStart: nextValue, quickRange: '' }));
                  setSelectedMonth(monthKeyFromDate(nextValue) || selectedMonth);
                }}
                type="date"
                value={searchDraft.periodStart}
              />
              <span>~</span>
              <input
                aria-label="기간 종료일"
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSearchDraft((current) => ({ ...current, periodEnd: nextValue, quickRange: '' }));
                }}
                type="date"
                value={searchDraft.periodEnd}
              />
            </div>
            <div className="payment-quick-range">
              {[
                { id: 'today', label: '오늘' },
                { id: '3days', label: '3일' },
                { id: '1week', label: '1주' },
                { id: '2weeks', label: '2주' },
                { id: '1month', label: '1개월' },
                { id: '3months', label: '3개월' },
                { id: '6months', label: '6개월' },
                { id: '1year', label: '1년' },
              ].map((option) => (
                <button
                  className={searchDraft.quickRange === option.id ? 'active' : ''}
                  key={option.id}
                  onClick={() => applyQuickPeriod(option.id as Parameters<typeof applyQuickPeriod>[0])}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="payment-filter-line">
            <span className="payment-filter-label">변동</span>
            <div className="payment-radio-group">
              <label>
                <input checked={searchDraft.variability === '고정'} onChange={() => updateSearch('variability', '고정')} type="radio" />
                고정
              </label>
              <label>
                <input checked={searchDraft.variability === '변동'} onChange={() => updateSearch('variability', '변동')} type="radio" />
                변동
              </label>
            </div>
            <label className="payment-icon-search">
              <span>구분</span>
              <div>
                <button onClick={() => setAppliedSearch(searchDraft)} title="구분 검색" type="button">
                  <Search size={16} />
                </button>
                <input
                  list="payment-category-suggestions"
                  onChange={(event) => updateSearch('category', event.target.value)}
                  placeholder="구분"
                  value={searchDraft.category}
                />
              </div>
            </label>
            <label className="payment-icon-search">
              <span>거래처</span>
              <div>
                <button onClick={() => setAppliedSearch(searchDraft)} title="거래처 검색" type="button">
                  <Search size={16} />
                </button>
                <input
                  list="payment-partner-suggestions"
                  onChange={(event) => updateSearch('partner', event.target.value)}
                  placeholder="거래처명"
                  value={searchDraft.partner}
                />
              </div>
            </label>
            <label className="payment-sort-field">
              <span>정렬</span>
              <select onChange={(event) => updateSearch('sort', event.target.value as PaymentListSort)} value={searchDraft.sort}>
                <option value="dueAsc">결제일 빠른순</option>
                <option value="dueDesc">결제일 늦은순</option>
                <option value="amountDesc">금액 높은순</option>
                <option value="partnerAsc">거래처 가나다순</option>
              </select>
            </label>
          </div>

          <div className="payment-filter-line tail">
            <span className="payment-filter-label">계산서</span>
            <div className="payment-radio-group compact">
              <label>
                <input checked={searchDraft.invoice === 'Y'} onChange={() => updateSearch('invoice', 'Y')} type="radio" />
                Y
              </label>
              <label>
                <input checked={searchDraft.invoice === 'N'} onChange={() => updateSearch('invoice', 'N')} type="radio" />
                N
              </label>
            </div>
            <span className="payment-filter-label">결제여부</span>
            <div className="payment-radio-group compact">
              <label>
                <input checked={searchDraft.payment === 'Y'} onChange={() => updateSearch('payment', 'Y')} type="radio" />
                Y
              </label>
              <label>
                <input checked={searchDraft.payment === 'N'} onChange={() => updateSearch('payment', 'N')} type="radio" />
                N
              </label>
            </div>
            <div className="payment-search-actions">
              <button className="primary-button" onClick={() => setAppliedSearch(searchDraft)} type="button">
                검색
              </button>
              <button className="secondary-button" onClick={resetSearch} type="button">
                초기화
              </button>
            </div>
          </div>

          <datalist id="payment-category-suggestions">
            {categorySuggestions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <datalist id="payment-partner-suggestions">
            {partnerSuggestions.map((partner) => (
              <option key={partner} value={partner} />
            ))}
          </datalist>
        </div>

        <div className="payment-list-top-kpis">
          <article>
            <span className="inline-kpi-icon blue">
              <ReceiptText size={18} />
            </span>
            <span>당월 지출</span>
            <strong>{formatMoney(currentMonthAmount)}</strong>
            <small>전월 대비 {amountChange >= 0 ? '+' : ''}{formatMoney(amountChange)}</small>
          </article>
          <article>
            <span className="inline-kpi-icon gray">
              <CalendarDays size={18} />
            </span>
            <span>전월 지출</span>
            <strong>{formatMoney(previousMonthAmount)}</strong>
            <small>비교 기준 매입</small>
          </article>
        </div>
      </section>

      <Panel
        className="payment-list-table-panel"
        title="전체 대금결제 리스트"
        action={
          <div className="payment-list-panel-actions">
            <span className="payment-list-header-count">
              총 {filteredAggregates.length}건 · 합계 {filteredListAmount.toLocaleString('ko-KR')}원
            </span>
            <button className="primary-button" onClick={() => setIsRegistrationOpen(true)} type="button">
              <Plus size={16} />
              수기 결제 추가
            </button>
          </div>
        }
      >
        <ListColumnTable
          columns={['기준월', '결제월', '변동', '구분', '거래처', '은행', '계좌번호', '금액', '계산서', '결제여부']}
          onRowClick={(rowIndex) => {
            const aggregate = filteredAggregates[rowIndex];
            if (aggregate) onOpenPurchasePartner(aggregate.partner, aggregate.baseMonth);
          }}
          rows={filteredAggregates.map((aggregate) => [
            formatShortMonth(aggregate.baseMonth),
            aggregate.paymentMonth,
            aggregate.variability,
            aggregate.category,
            <div className="payment-partner-cell" key={`${aggregate.key}-partner`}>
              <strong>{aggregate.partner}</strong>
              <span>{aggregate.sourceSummary}</span>
            </div>,
            aggregate.bank,
            aggregate.accountNumber,
            formatMoney(aggregate.amount),
            aggregate.invoiceSummary,
            <div className="payment-status-stack" key={`${aggregate.key}-status`}>
              {aggregate.amount > 0 && aggregate.paidAmount >= aggregate.amount ? <span>{aggregate.dueDateSummary}</span> : null}
              <StatusPill label={aggregate.status} tone={paymentStatusTone(aggregate.status)} />
            </div>,
          ])}
        />
        {filteredAggregates.length === 0 ? (
          <div className="empty-state">
            <strong>검색 결과가 없습니다.</strong>
            <span>기간이나 거래처 조건을 바꿔 다시 검색해보세요.</span>
          </div>
        ) : null}
      </Panel>

      {isRegistrationOpen ? (
        <DetailDrawer
          eyebrow="대금결제"
          onClose={() => setIsRegistrationOpen(false)}
          title="수기 대금결제 추가"
          variant="modal"
        >
          <form className="payment-registration-form" onSubmit={addManualPayment}>
            <div className="sales-form-grid">
              <label className="estimate-control">
                <span>
                  시작 결제일
                  <em>필수</em>
                </span>
                <input onChange={(event) => updateDraft('startDate', event.target.value)} required type="date" value={draft.startDate} />
              </label>
              <label className="estimate-control">
                <span>
                  거래처
                  <em>필수</em>
                </span>
                <input onChange={(event) => updateDraft('partner', event.target.value)} placeholder="거래처명" required value={draft.partner} />
              </label>
              <label className="estimate-control">
                <span>반복</span>
                <select onChange={(event) => updateDraft('repeat', event.target.value as PaymentRepeat)} value={draft.repeat}>
                  {PAYMENT_REPEAT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="estimate-control">
                <span>종료일</span>
                <input onChange={(event) => updateDraft('endDate', event.target.value)} type="date" value={draft.endDate} />
              </label>
              <label className="estimate-control">
                <span>변동</span>
                <select onChange={(event) => updateDraft('variability', event.target.value as PurchaseVariability)} value={draft.variability}>
                  <option>고정</option>
                  <option>변동</option>
                </select>
              </label>
              <label className="estimate-control">
                <span>구분</span>
                <input onChange={(event) => updateDraft('category', event.target.value)} placeholder="급여, 임대료, 매입(유리)" value={draft.category} />
              </label>
              <label className="estimate-control full">
                <span>
                  결제항목
                  <em>필수</em>
                </span>
                <input onChange={(event) => updateDraft('item', event.target.value)} placeholder="정기 지출 또는 수기 결제 항목" required value={draft.item} />
              </label>
              <label className="estimate-control">
                <span>
                  금액
                  <em>필수</em>
                </span>
                <input inputMode="numeric" onChange={(event) => updateDraft('amount', formatMoneyInputValue(event.target.value))} placeholder="1,000,000" required value={draft.amount} />
              </label>
              <label className="estimate-control">
                <span>지급액</span>
                <input inputMode="numeric" onChange={(event) => updateDraft('paidAmount', formatMoneyInputValue(event.target.value))} placeholder="0" value={draft.paidAmount} />
              </label>
              <label className="estimate-control">
                <span>은행</span>
                <input onChange={(event) => updateDraft('bank', event.target.value)} placeholder="국민, 농협" value={draft.bank} />
              </label>
              <label className="estimate-control">
                <span>계좌번호</span>
                <input onChange={(event) => updateDraft('accountNumber', event.target.value)} placeholder="000000000000" value={draft.accountNumber} />
              </label>
              <label className="estimate-control">
                <span>계산서</span>
                <select onChange={(event) => updateDraft('invoiceIssued', event.target.value as 'Y' | 'N')} value={draft.invoiceIssued}>
                  <option>Y</option>
                  <option>N</option>
                </select>
              </label>
              <label className="estimate-control">
                <span>결제여부</span>
                <select onChange={(event) => updateDraft('status', event.target.value as PaymentScheduleStatus)} value={draft.status}>
                  {PAYMENT_SCHEDULE_STATUS_OPTIONS.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="estimate-control full">
                <span>메모</span>
                <textarea onChange={(event) => updateDraft('memo', event.target.value)} placeholder="반복 조건, 증빙, 확인 메모" value={draft.memo} />
              </label>
            </div>
            <div className="payment-repeat-note">
              <strong>반복 자동 반영</strong>
              <span>선택한 반복 주기와 종료일에 맞는 월에만 이 수기 결제 건이 대금결제 리스트에 합산됩니다.</span>
            </div>
            <div className="estimate-save-row">
              <button className="secondary-button" onClick={() => setIsRegistrationOpen(false)} type="button">
                닫기
              </button>
              <button className="primary-button" type="submit">
                수기 결제 저장
              </button>
            </div>
          </form>
        </DetailDrawer>
      ) : null}

    </div>
  );
}

function createAccountingDaySummary(): AccountingDaySummary {
  return {
    paymentCount: 0,
    cardCount: 0,
    accountCount: 0,
    totalCount: 0,
    paymentAmount: 0,
    cardDepositAmount: 0,
    accountReceiptAmount: 0,
  };
}

function addAccountingDaySummary(
  summaries: Map<string, AccountingDaySummary>,
  date: string,
  update: Partial<Omit<AccountingDaySummary, 'totalCount'>>,
) {
  const key = accountingDateKeyFromDate(date);
  const current = summaries.get(key) ?? createAccountingDaySummary();
  const next = {
    ...current,
    paymentCount: current.paymentCount + (update.paymentCount ?? 0),
    cardCount: current.cardCount + (update.cardCount ?? 0),
    accountCount: current.accountCount + (update.accountCount ?? 0),
    paymentAmount: current.paymentAmount + (update.paymentAmount ?? 0),
    cardDepositAmount: current.cardDepositAmount + (update.cardDepositAmount ?? 0),
    accountReceiptAmount: current.accountReceiptAmount + (update.accountReceiptAmount ?? 0),
  };
  next.totalCount = next.paymentCount + next.cardCount + next.accountCount;
  summaries.set(key, next);
}

function cardSettlementAccountingDate(settlement: CardSettlement) {
  if (settlement.depositDate) return accountingDateKeyFromDate(settlement.depositDate);
  if (settlement.paid > 0) return accountingDateKeyFromDate(defaultCardDepositDate(settlement.date));
  return accountingDateKeyFromDate(settlement.date);
}

function SchedulePage({
  cardSettlements: scheduleCardSettlements,
  linkedPayments,
  onOpenPaymentSource,
  workRecords,
}: {
  cardSettlements: CardSettlement[];
  linkedPayments: PaymentScheduleItem[];
  onOpenPaymentSource: (payment: PaymentScheduleItem) => void;
  workRecords: WorkerWorkListRecord[];
}) {
  const [manualPayments, setManualPayments] = useState<PaymentScheduleItem[]>(paymentScheduleSeed);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PaymentScheduleFilter>('all');
  const [groupFilter, setGroupFilter] = useState<PaymentScheduleGroupFilter>('all');
  const todayPaymentDate = useMemo(() => getPaymentScheduleToday(), []);
  const defaultPaymentMonth = useMemo(() => paymentMonthKeyFromDate(todayPaymentDate), [todayPaymentDate]);
  const [selectedMonth, setSelectedMonth] = useState(defaultPaymentMonth);
  const [selectedDate, setSelectedDate] = useState(todayPaymentDate);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [listRangeStart, setListRangeStart] = useState(() => paymentDateKeyInputValue(todayPaymentDate));
  const [listRangeEnd, setListRangeEnd] = useState(() => paymentDateKeyInputValue(todayPaymentDate));
  const [draft, setDraft] = useState<PaymentScheduleDraft>(() => createPaymentScheduleDraft());
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentDownloadNotice, setPaymentDownloadNotice] = useState<{ id: number; message: string } | null>(null);
  const [shortcutTitle, setShortcutTitle] = useState('');
  const [shortcutUrl, setShortcutUrl] = useState('');
  const [shortcuts, setShortcuts] = useState<DashboardShortcut[]>(defaultPaymentShortcuts);
  const [settlementMemo, setSettlementMemo] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const canAddShortcut = shortcutTitle.trim().length > 0 && shortcutUrl.trim().length > 0;
  const payments = useMemo(() => [...linkedPayments, ...manualPayments], [linkedPayments, manualPayments]);
  const selectedPayment = useMemo(
    () => payments.find((payment) => payment.id === selectedPaymentId) ?? null,
    [payments, selectedPaymentId],
  );
  const canEditSelectedPaymentInSchedule = selectedPayment
    ? manualPayments.some((payment) => payment.id === selectedPayment.id)
    : false;
  const monthPayments = useMemo(() => payments.filter((payment) => paymentMonthKeyFromDate(payment.date) === selectedMonth), [payments, selectedMonth]);
  const normalizedListRangeStartDate = normalizePaymentDate(listRangeStart);
  const normalizedListRangeEndDate = normalizePaymentDate(listRangeEnd);
  const listRangeStartDate = normalizedListRangeStartDate || selectedDate;
  const listRangeEndDate = normalizedListRangeEndDate || listRangeStartDate;
  const [listRangeFromDate, listRangeToDate] =
    listRangeStartDate <= listRangeEndDate ? [listRangeStartDate, listRangeEndDate] : [listRangeEndDate, listRangeStartDate];
  const listRangeLabel =
    listRangeFromDate === listRangeToDate ? `${listRangeFromDate} 기준` : `${listRangeFromDate} ~ ${listRangeToDate}`;
  const listRangePayments = useMemo(
    () =>
      payments.filter((payment) => {
        const paymentDate = accountingDateKeyFromDate(payment.date);
        return paymentDate >= listRangeFromDate && paymentDate <= listRangeToDate;
      }),
    [listRangeFromDate, listRangeToDate, payments],
  );
  const monthCardSettlements = useMemo(
    () => scheduleCardSettlements.filter((settlement) => accountingMonthKeyFromDate(cardSettlementAccountingDate(settlement)) === selectedMonth),
    [scheduleCardSettlements, selectedMonth],
  );
  const monthAccountTransferReceipts = useMemo(
    () =>
      workRecords
        .flatMap((record) =>
          record.payments
            .filter((payment) => payment.method === '계좌이체' && parseWorkAmountInput(payment.amount) > 0)
            .map((payment, index) => ({
              id: `${record.id}-account-transfer-${index}`,
              date: accountingDateKeyFromDate(record.date),
              amount: parseWorkAmountInput(payment.amount),
              customer: record.customer,
              title: record.title,
              vehicle: record.vehicle,
            })),
        )
        .filter((receipt) => accountingMonthKeyFromDate(receipt.date) === selectedMonth),
    [workRecords, selectedMonth],
  );
  const selectedMonthParts = parsePaymentMonthKey(selectedMonth) ?? parsePaymentMonthKey(defaultPaymentMonth)!;
  const selectedMonthLabel = formatPaymentMonthLabel(selectedMonth);
  const holidaysByDate = useMemo(
    () => new Map((PAYMENT_CALENDAR_HOLIDAYS_BY_YEAR[selectedMonthParts.year] ?? []).map((holiday) => [holiday.date, holiday.name])),
    [selectedMonthParts.year],
  );
  const selectedMonthHolidayCount = useMemo(
    () => Array.from(holidaysByDate.keys()).filter((date) => paymentMonthKeyFromDate(date) === selectedMonth).length,
    [holidaysByDate, selectedMonth],
  );
  const totalScheduledAmount = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const completedAmount = monthPayments.reduce((sum, payment) => sum + payment.paidAmount, 0);
  const completedPaymentCount = monthPayments.filter((payment) => payment.status === '결제완료').length;
  const todayPayments = payments.filter((payment) => payment.date === todayPaymentDate);
  const todayPaymentAmount = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const cardSalesAmount = monthCardSettlements.reduce((sum, settlement) => sum + settlement.amount, 0);
  const cardDepositAmount = monthCardSettlements.reduce((sum, settlement) => sum + settlement.paid, 0);
  const cardPendingAmount = monthCardSettlements.reduce((sum, settlement) => sum + Math.max(0, settlement.amount - settlement.paid), 0);
  const cardPendingCount = monthCardSettlements.filter((settlement) => settlement.paid <= 0).length;
  const accountTransferReceiptAmount = monthAccountTransferReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const filteredPayments = useMemo(
    () => filterPaymentScheduleItems(listRangePayments, filter, normalizedQuery, groupFilter),
    [filter, groupFilter, listRangePayments, normalizedQuery],
  );
  const paymentFilterOptions = useMemo(
    () =>
      PAYMENT_SCHEDULE_FILTER_OPTIONS.map((option) => {
        const count = filterPaymentScheduleItems(listRangePayments, option.id, normalizedQuery, groupFilter).length;
        return {
          ...option,
          label: `${option.label} ${count}`,
        };
      }),
    [groupFilter, listRangePayments, normalizedQuery],
  );
  const paymentGroupFilterOptions = useMemo(
    () =>
      PAYMENT_SCHEDULE_GROUP_FILTER_OPTIONS.map((option) => {
        const count = filterPaymentScheduleItems(listRangePayments, filter, normalizedQuery, option.id).length;
        return {
          ...option,
          label: `${option.label} ${count}`,
        };
      }),
    [filter, listRangePayments, normalizedQuery],
  );
  const accountingSummaryByDate = useMemo(() => {
    const summaries = new Map<string, AccountingDaySummary>();
    monthPayments.forEach((payment) =>
      addAccountingDaySummary(summaries, payment.date, {
        paymentCount: 1,
        paymentAmount: payment.amount,
      }),
    );
    monthCardSettlements.forEach((settlement) =>
      addAccountingDaySummary(summaries, cardSettlementAccountingDate(settlement), {
        cardCount: 1,
        cardDepositAmount: settlement.paid,
      }),
    );
    monthAccountTransferReceipts.forEach((receipt) =>
      addAccountingDaySummary(summaries, receipt.date, {
        accountCount: 1,
        accountReceiptAmount: receipt.amount,
      }),
    );
    return summaries;
  }, [monthPayments, monthCardSettlements, monthAccountTransferReceipts]);
  const selectedDateAccountingSummary = accountingSummaryByDate.get(selectedDate) ?? createAccountingDaySummary();
  const selectedDateHolidayName = holidaysByDate.get(selectedDate);
  const paymentSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          listRangePayments.flatMap((payment) => [
            payment.partner,
            payment.item,
            payment.status,
            payment.method,
            payment.source,
            formatMoney(payment.amount),
            formatMoney(Math.max(0, payment.amount - payment.paidAmount)),
          ]),
        ),
      ),
    [listRangePayments],
  );
  const calendarCells = useMemo<PaymentCalendarCell[]>(() => {
    const emptyCells = Array.from({ length: new Date(selectedMonthParts.year, selectedMonthParts.monthIndex, 1).getDay() }, (_, index) => ({
      key: `empty-${index}`,
      day: '',
      date: '',
      payments: [],
      accountingSummary: createAccountingDaySummary(),
      isToday: false,
    }));

    return [
      ...emptyCells,
      ...Array.from({ length: daysInPaymentMonth(selectedMonth) }, (_, index) => {
        const day = index + 1;
        const date = paymentDateForMonthDay(selectedMonth, day);
        return {
          key: date,
          day: String(day),
          date,
          payments: monthPayments.filter((payment) => payment.date === date),
          accountingSummary: accountingSummaryByDate.get(date) ?? createAccountingDaySummary(),
          holidayName: holidaysByDate.get(date),
          isToday: date === todayPaymentDate,
        };
      }),
    ];
  }, [accountingSummaryByDate, holidaysByDate, monthPayments, selectedMonth, selectedMonthParts.monthIndex, selectedMonthParts.year, todayPaymentDate]);
  function updateDraft<Key extends keyof PaymentScheduleDraft>(key: Key, value: PaymentScheduleDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setPaymentListRangeToDate(date: string) {
    const nextValue = paymentDateKeyInputValue(date);
    setListRangeStart(nextValue);
    setListRangeEnd(nextValue);
  }

  function selectPaymentCalendarDate(date: string) {
    const nextValue = paymentDateKeyInputValue(date);
    setSelectedDate(date);

    if (!normalizedListRangeStartDate || normalizedListRangeEndDate) {
      setListRangeStart(nextValue);
      setListRangeEnd('');
      return;
    }

    if (date < normalizedListRangeStartDate) {
      setListRangeStart(nextValue);
      setListRangeEnd('');
      return;
    }

    setListRangeEnd(nextValue);
  }

  function movePaymentMonth(offset: number) {
    const nextMonth = shiftPaymentMonth(selectedMonth, offset);
    setSelectedMonth(nextMonth);
  }

  function movePaymentCalendarToToday() {
    const nextToday = getPaymentScheduleToday();
    setSelectedMonth(paymentMonthKeyFromDate(nextToday));
    setSelectedDate(nextToday);
    setPaymentListRangeToDate(nextToday);
  }

  function openPaymentRegistration() {
    setDraft(createPaymentScheduleDraft());
    setEditingPaymentId(null);
    setSelectedPaymentId(null);
    setIsRegistrationOpen(true);
  }

  function closePaymentForm() {
    setDraft(createPaymentScheduleDraft());
    setEditingPaymentId(null);
    setIsRegistrationOpen(false);
  }

  function openPaymentEdit(payment: PaymentScheduleItem) {
    setDraft(createPaymentScheduleDraftFromItem(payment));
    setEditingPaymentId(payment.id);
    setSelectedPaymentId(null);
    setIsRegistrationOpen(true);
  }

  function handlePaymentInfoEdit() {
    if (!selectedPayment) return;

    if (canEditSelectedPaymentInSchedule) {
      openPaymentEdit(selectedPayment);
      return;
    }

    setSelectedPaymentId(null);
    onOpenPaymentSource(selectedPayment);
  }

  useEffect(() => {
    if (!paymentDownloadNotice) return undefined;

    const timer = window.setTimeout(() => setPaymentDownloadNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [paymentDownloadNotice]);

  function downloadVisiblePaymentList() {
    if (filteredPayments.length === 0) {
      setPaymentDownloadNotice({
        id: Date.now(),
        // 회계 일정 관리에서 결제 정보 없이 엑셀 다운요청 했을 경우
        message: '다운로드할 결제 정보가 없습니다.',
      });
      return;
    }

    downloadPaymentScheduleCsv(filteredPayments, listRangeFromDate, listRangeToDate);
  }

  function submitPaymentSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPayment = createPaymentScheduleItem(draft);

    if (editingPaymentId) {
      const editedPayment = { ...nextPayment, id: editingPaymentId };
      setManualPayments((current) => current.map((payment) => (payment.id === editingPaymentId ? editedPayment : payment)));
      setSelectedMonth(paymentMonthKeyFromDate(editedPayment.date));
      setSelectedDate(editedPayment.date);
      setPaymentListRangeToDate(editedPayment.date);
      closePaymentForm();
      return;
    }

    setManualPayments((current) => [nextPayment, ...current]);
    setSelectedMonth(paymentMonthKeyFromDate(nextPayment.date));
    setSelectedDate(nextPayment.date);
    setPaymentListRangeToDate(nextPayment.date);
    closePaymentForm();
  }

  function handleAddShortcut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAddShortcut) return;

    setShortcuts((current) => [
      ...current,
      {
        title: shortcutTitle.trim(),
        url: normalizeUrl(shortcutUrl),
      },
    ]);
    setShortcutTitle('');
    setShortcutUrl('');
  }

  return (
    <div className="page-stack settlement-page">
      {paymentDownloadNotice ? (
        <div className="payment-download-toast" key={paymentDownloadNotice.id} role="status" aria-live="polite">
          {paymentDownloadNotice.message}
        </div>
      ) : null}
      <section className="kpi-grid" aria-label="회계 일정 KPI">
        <KpiCard icon={ReceiptText} label={`${selectedMonthLabel} 총 결제 예정액`} value={formatMoney(totalScheduledAmount)} detail={`지급 일정 ${monthPayments.length}건`} tone="blue" />
        <KpiCard icon={CheckCircle2} label={`${selectedMonthLabel} 결제 완료`} value={formatMoney(completedAmount)} detail={`${completedPaymentCount}건 완료`} tone="green" />
        <KpiCard
          icon={CalendarDays}
          label="오늘 결제"
          value={`${todayPayments.length}건`}
          detail={`${todayPaymentDate} · ${formatMoney(todayPaymentAmount)}`}
          tone="purple"
        />
        <KpiCard
          icon={CreditCard}
          label={`${selectedMonthLabel} 카드매출 입금`}
          value={formatMoney(cardDepositAmount)}
          detail={`매출 ${formatMoney(cardSalesAmount)} · 미입금 ${formatMoney(cardPendingAmount)} (${cardPendingCount}건)`}
          tone={cardPendingCount > 0 ? 'orange' : 'purple'}
        />
        <KpiCard
          icon={WalletCards}
          label={`${selectedMonthLabel} 계좌이체 매출`}
          value={formatMoney(accountTransferReceiptAmount)}
          detail={`작업 계좌입금 ${monthAccountTransferReceipts.length}건`}
          tone="yellow"
        />
      </section>

      <section className="settlement-layout">
        <Panel
          className="payment-calendar-panel"
          title="회계 캘린더"
          action={
            <div className="payment-month-control payment-calendar-month-control" aria-label="월 선택">
              <button className="ghost-button" onClick={() => movePaymentMonth(-1)} title="이전 달" type="button">
                <ChevronLeft size={16} />
              </button>
              <strong>{selectedMonthLabel}</strong>
              <button className="ghost-button" onClick={() => movePaymentMonth(1)} title="다음 달" type="button">
                <ChevronRight size={16} />
              </button>
              <button className="secondary-button payment-today-button" onClick={movePaymentCalendarToToday} type="button">
                오늘
              </button>
            </div>
          }
        >
          <div className="payment-calendar-weekdays">
            {['일', '월', '화', '수', '목', '금', '토'].map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="payment-calendar-grid">
            {calendarCells.map((cell) => {
              const hasDate = cell.date.length > 0;
              const isRangeStart = hasDate && cell.date === normalizedListRangeStartDate;
              const isRangeEnd = hasDate && cell.date === normalizedListRangeEndDate && cell.date !== normalizedListRangeStartDate;
              const isInRange =
                Boolean(hasDate && normalizedListRangeStartDate && normalizedListRangeEndDate) &&
                cell.date > normalizedListRangeStartDate &&
                cell.date < normalizedListRangeEndDate;

              return (
                <button
                  aria-label={
                    cell.date
                      ? [
                          cell.date,
                          cell.isToday ? '오늘' : null,
                          cell.holidayName,
                          isRangeStart ? '조회 시작일' : null,
                          isRangeEnd ? '조회 종료일' : null,
                          `회계 일정 ${cell.accountingSummary.totalCount}건`,
                        ]
                          .filter(Boolean)
                          .join(' ')
                      : undefined
                  }
                  className={`payment-calendar-day ${isRangeStart ? 'selected range-start' : ''} ${
                    isRangeEnd ? 'range-end' : ''
                  } ${isInRange ? 'in-range' : ''} ${cell.isToday ? 'is-today' : ''} ${cell.holidayName ? 'has-holiday' : ''} ${
                    cell.payments.some((payment) => payment.status === '연체') ? 'has-overdue' : ''
                  }`}
                  disabled={!cell.date}
                  key={cell.key}
                  onClick={() => selectPaymentCalendarDate(cell.date)}
                  title={cell.holidayName ? `${cell.date} ${cell.holidayName}` : cell.date}
                  type="button"
                >
                  <span className="payment-calendar-day-number">{cell.day}</span>
                  {cell.isToday ? <strong className="payment-calendar-today-label">오늘</strong> : null}
                  {cell.holidayName ? <small className="payment-calendar-holiday">{cell.holidayName}</small> : null}
                  {cell.accountingSummary.totalCount > 0 ? <em>{cell.accountingSummary.totalCount}</em> : null}
                </button>
              );
            })}
          </div>
          <div className="payment-day-summary">
            <strong>{selectedDate} 회계 요약</strong>
            <span>
              {selectedDateAccountingSummary.totalCount}건 · 지급 {formatMoney(selectedDateAccountingSummary.paymentAmount)}
              {' · '}카드입금 {formatMoney(selectedDateAccountingSummary.cardDepositAmount)}
              {' · '}계좌입금 {formatMoney(selectedDateAccountingSummary.accountReceiptAmount)}
              {selectedDateHolidayName ? ` · ${selectedDateHolidayName}` : ''}
            </span>
            <span>{selectedMonthLabel} 공휴일 {selectedMonthHolidayCount}일</span>
          </div>
        </Panel>

        <Panel
          className="payment-detail-panel"
          title={`결제 상세 리스트 (${listRangeLabel})`}
          action={
            <div className="payment-detail-header-actions">
              <button className="secondary-button" onClick={downloadVisiblePaymentList} type="button">
                <Download size={16} />
                엑셀 다운로드
              </button>
            </div>
          }
        >
          <RecordToolbar
            search={
              <SearchInput
                label="거래처명 검색"
                labelHidden
                listId="payment-schedule-search-suggestions"
                onChange={setQuery}
                placeholder="거래처, 결제항목, 상태 검색"
                suggestions={paymentSuggestions}
                value={query}
              />
            }
            count={`총 ${filteredPayments.length}건`}
            filters={
              <div className="payment-detail-filter-row">
                <FilterTabs
                  ariaLabel="대금결제 상태 필터"
                  onChange={(value) => setFilter(value as PaymentScheduleFilter)}
                  options={paymentFilterOptions}
                  value={filter}
                />
                <label className="payment-detail-group-filter">
                  <span>구분</span>
                  <select onChange={(event) => setGroupFilter(event.target.value as PaymentScheduleGroupFilter)} value={groupFilter}>
                    {paymentGroupFilterOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            }
            action={
              <div className="payment-detail-toolbar-actions">
                <button className="primary-button" onClick={openPaymentRegistration} type="button">
                  <Plus size={16} />
                  결제 등록
                </button>
              </div>
            }
          />
          <ListColumnTable
            className={`payment-detail-table ${filteredPayments.length >= 6 ? 'scrollable' : ''}`}
            columns={['결제일자', '거래처', '결제항목', '금액', '지급/잔액', '상태']}
            emptyMessage="결제 정보가 없습니다."
            onRowClick={(rowIndex) => {
              const payment = filteredPayments[rowIndex];
              if (!payment) return;
              setSelectedPaymentId(payment.id);
            }}
            rows={filteredPayments.map((payment) => [
              <time className="payment-date-cell" dateTime={payment.date.replaceAll('.', '-')} key={`${payment.id}-date`}>
                {payment.date}
              </time>,
              <strong className="payment-partner-name" key={`${payment.id}-partner`}>
                {payment.partner}
              </strong>,
              <div className="payment-item-cell" key={`${payment.id}-item`}>
                <strong>{payment.item}</strong>
                <span>{payment.source} · {payment.method}</span>
              </div>,
              <span className="payment-money-cell" key={`${payment.id}-amount`}>
                {formatMoney(payment.amount)}
              </span>,
              <div className="payment-balance-cell" key={`${payment.id}-balance`}>
                <strong>{formatMoney(payment.paidAmount)}</strong>
                <span>잔액 {formatMoney(Math.max(0, payment.amount - payment.paidAmount))}</span>
              </div>,
              <span className="payment-status-cell" key={`${payment.id}-status`}>
                <StatusPill label={payment.status} tone={paymentStatusTone(payment.status)} />
              </span>,
            ])}
          />
        </Panel>
      </section>

      <section className="settlement-bottom-grid">
        <Panel title="업무 바로가기">
          <form className="shortcut-form" onSubmit={handleAddShortcut}>
            <input
              aria-label="바로가기 제목"
              onChange={(event) => setShortcutTitle(event.target.value)}
              placeholder="제목"
              value={shortcutTitle}
            />
            <input
              aria-label="바로가기 링크"
              onChange={(event) => setShortcutUrl(event.target.value)}
              placeholder="https://..."
              value={shortcutUrl}
            />
            <button className="primary-button" disabled={!canAddShortcut} type="submit">
              추가
            </button>
          </form>
          <div className="shortcut-list">
            {shortcuts.map((shortcut) => (
              <a
                className="shortcut-link"
                href={shortcut.url}
                key={`${shortcut.title}-${shortcut.url}`}
                rel="noreferrer"
                target="_blank"
              >
                <span>{shortcut.title}</span>
                <ExternalLink size={15} />
              </a>
            ))}
          </div>
          <p className="helper-text">현재는 프로토타입용 임시 추가이며, 새로고침하면 초기값으로 돌아갑니다.</p>
        </Panel>

        <Panel title="업무 메모">
          <label className="settlement-memo-box">
            <span>결제 관련 특이사항</span>
            <AutoResizeTextarea
              minHeight={160}
              onChange={setSettlementMemo}
              placeholder="거래처별 지급 조건, 연체 사유, 증빙 확인 메모를 입력하세요."
              value={settlementMemo}
            />
          </label>
        </Panel>
      </section>

      {selectedPayment ? (
        <DetailDrawer
          eyebrow="결제 상세"
          footer={
            <div className="payment-detail-modal-footer">
              <button className="secondary-button" onClick={() => setSelectedPaymentId(null)} type="button">
                닫기
              </button>
              <button className="primary-button" onClick={handlePaymentInfoEdit} type="button">
                정보 수정
              </button>
            </div>
          }
          onClose={() => setSelectedPaymentId(null)}
          title={selectedPayment.partner}
          variant="modal"
        >
          <div className="payment-detail-modal-summary">
            <div>
              <span>결제항목</span>
              <strong>{selectedPayment.item}</strong>
              <small>{selectedPayment.source} · {selectedPayment.method}</small>
            </div>
            <StatusPill label={selectedPayment.status} tone={paymentStatusTone(selectedPayment.status)} />
          </div>
          <div className="payment-detail-modal-amounts">
            <article>
              <span>결제 금액</span>
              <strong>{formatMoney(selectedPayment.amount)}</strong>
            </article>
            <article>
              <span>지급액</span>
              <strong>{formatMoney(selectedPayment.paidAmount)}</strong>
            </article>
            <article>
              <span>잔액</span>
              <strong>{formatMoney(Math.max(0, selectedPayment.amount - selectedPayment.paidAmount))}</strong>
            </article>
          </div>
          <div className="payment-detail-modal-grid">
            <InfoItem icon={CalendarDays} label="결제일자" value={selectedPayment.date} />
            <InfoItem icon={Building2} label="거래처" value={selectedPayment.partner} />
            <InfoItem icon={ReceiptText} label="결제항목" value={selectedPayment.item} />
            <InfoItem icon={CreditCard} label="결제수단" value={selectedPayment.method} />
            <InfoItem icon={Database} label="연결업무" value={selectedPayment.source} />
            <InfoItem icon={WalletCards} label="상태" value={selectedPayment.status} />
          </div>
          <div className="payment-detail-modal-memo">
            <strong>메모</strong>
            <p>{selectedPayment.memo || '등록된 메모가 없습니다.'}</p>
          </div>
          <p className="helper-text">
            {canEditSelectedPaymentInSchedule
              ? '이 결제 정보는 일정 화면에서 바로 수정할 수 있습니다.'
              : '작업 자동등록 정보는 원본 작업 페이지로 이동해 수정합니다.'}
          </p>
        </DetailDrawer>
      ) : null}

      {isRegistrationOpen ? (
        <DetailDrawer
          eyebrow="대금결제"
          onClose={closePaymentForm}
          title={editingPaymentId ? '결제 일정 수정' : '결제 일정 등록'}
          variant="modal"
        >
          <form className="payment-registration-form" onSubmit={submitPaymentSchedule}>
            <div className="sales-form-grid">
              <label className="estimate-control">
                <span>
                  결제일자
                  <em>필수</em>
                </span>
                <input onChange={(event) => updateDraft('date', event.target.value)} required type="date" value={draft.date} />
              </label>
              <label className="estimate-control">
                <span>
                  거래처
                  <em>필수</em>
                </span>
                <input onChange={(event) => updateDraft('partner', event.target.value)} placeholder="거래처명" required value={draft.partner} />
              </label>
              <label className="estimate-control full">
                <span>
                  결제항목
                  <em>필수</em>
                </span>
                <input onChange={(event) => updateDraft('item', event.target.value)} placeholder="전면 유리 매입건, 외주 작업 비용 등" required value={draft.item} />
              </label>
              <label className="estimate-control">
                <span>
                  금액
                  <em>필수</em>
                </span>
                <input inputMode="numeric" onChange={(event) => updateDraft('amount', formatMoneyInputValue(event.target.value))} placeholder="2,500,000" required value={draft.amount} />
              </label>
              <label className="estimate-control">
                <span>지급액</span>
                <input inputMode="numeric" onChange={(event) => updateDraft('paidAmount', formatMoneyInputValue(event.target.value))} placeholder="0" value={draft.paidAmount} />
              </label>
              <label className="estimate-control">
                <span>상태</span>
                <select onChange={(event) => updateDraft('status', event.target.value as PaymentScheduleStatus)} value={draft.status}>
                  {PAYMENT_SCHEDULE_STATUS_OPTIONS.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="estimate-control">
                <span>결제수단</span>
                <select onChange={(event) => updateDraft('method', event.target.value)} value={draft.method}>
                  <option>계좌이체</option>
                  <option>카드</option>
                  <option>현금</option>
                  <option>외상</option>
                </select>
              </label>
              <label className="estimate-control">
                <span>연결업무</span>
                <select onChange={(event) => updateDraft('source', event.target.value)} value={draft.source}>
                  <option>매입입고</option>
                  <option>자재 매입</option>
                  <option>작업 정산</option>
                  <option>거래처 미결</option>
                  <option>외주</option>
                  <option>직접등록</option>
                </select>
              </label>
              <label className="estimate-control full">
                <span>메모</span>
                <textarea onChange={(event) => updateDraft('memo', event.target.value)} placeholder="증빙, 지급 조건, 확인 담당자 메모" value={draft.memo} />
              </label>
            </div>
            <div className="estimate-save-row">
              <button className="secondary-button" onClick={closePaymentForm} type="button">
                닫기
              </button>
              <button className="primary-button" type="submit">
                {editingPaymentId ? '수정 저장' : '결제 일정 저장'}
              </button>
            </div>
          </form>
        </DetailDrawer>
      ) : null}

    </div>
  );
}

type KpVatMode = '별' | '포' | '-';
type KpSettlementDraft = {
  paymentDate: string;
  glassAmount: string;
  glassVat: KpVatMode;
  tintPaymentAmount: string;
  tintVat: KpVatMode;
  extraAmount: string;
  extraVat: KpVatMode;
  deductionAmount: string;
  waiverAmount: string;
  tintingAmount: string;
};
type KpSettlementBaseRow = {
  id: string;
  workRecordId?: string;
  partner: string;
  workDate: string;
  vehicle: string;
  plateNumber: string;
  source: '기본' | '작업';
  draft: KpSettlementDraft;
};
type KpPeriodBasis = 'work' | 'payment';

const KP_VAT_OPTIONS: KpVatMode[] = ['별', '포', '-'];
const KP_SETTLEMENT_SEED_ROWS: KpSettlementBaseRow[] = [
  {
    id: 'kp-seed-001',
    partner: '아마존',
    workDate: '26.04.15',
    vehicle: '팰리세이드',
    plateNumber: '181호4828',
    source: '기본',
    draft: {
      paymentDate: '2026-04-30',
      glassAmount: '414,800',
      glassVat: '별',
      tintPaymentAmount: '',
      tintVat: '-',
      extraAmount: '20,000',
      extraVat: '별',
      deductionAmount: '',
      waiverAmount: '',
      tintingAmount: '60,000',
    },
  },
  {
    id: 'kp-seed-002',
    partner: '롯데',
    workDate: '26.04.15',
    vehicle: 'KA4 카니발',
    plateNumber: '222하9493',
    source: '기본',
    draft: {
      paymentDate: '2026-04-30',
      glassAmount: '268,200',
      glassVat: '별',
      tintPaymentAmount: '80,000',
      tintVat: '별',
      extraAmount: '60,000',
      extraVat: '별',
      deductionAmount: '',
      waiverAmount: '',
      tintingAmount: '',
    },
  },
  {
    id: 'kp-seed-003',
    partner: '오릭스',
    workDate: '26.04.15',
    vehicle: 'KA4 카니발',
    plateNumber: '156호3801',
    source: '기본',
    draft: {
      paymentDate: '2026-04-30',
      glassAmount: '295,020',
      glassVat: '포',
      tintPaymentAmount: '22,000',
      tintVat: '포',
      extraAmount: '',
      extraVat: '-',
      deductionAmount: '',
      waiverAmount: '',
      tintingAmount: '140,000',
    },
  },
  {
    id: 'kp-seed-004',
    partner: '롯데',
    workDate: '26.04.16',
    vehicle: 'GN7그랜저',
    plateNumber: '181허3164',
    source: '기본',
    draft: {
      paymentDate: '2026-04-30',
      glassAmount: '314,600',
      glassVat: '별',
      tintPaymentAmount: '80,000',
      tintVat: '별',
      extraAmount: '60,000',
      extraVat: '별',
      deductionAmount: '',
      waiverAmount: '',
      tintingAmount: '',
    },
  },
];

function createKpDraftFromWorkRecord(record: WorkerWorkListRecord): KpSettlementDraft {
  const paidAmount = record.insurancePaidAmount > 0 ? record.insurancePaidAmount.toLocaleString('ko-KR') : '';
  return {
    paymentDate: normalizeWorkDate(record.date) || '2026-05-21',
    glassAmount: paidAmount || (record.insuranceClaimAmount > 0 ? record.insuranceClaimAmount.toLocaleString('ko-KR') : ''),
    glassVat: '포',
    tintPaymentAmount: '',
    tintVat: '-',
    extraAmount: '',
    extraVat: '-',
    deductionAmount: '',
    waiverAmount: '',
    tintingAmount: '',
  };
}

function buildKpBaseRows(workRecords: WorkerWorkListRecord[]): KpSettlementBaseRow[] {
  const workRows = workRecords
    .filter((record) => record.kind === '작업' && (record.division === 'KP' || record.company === 'KP'))
    .map((record): KpSettlementBaseRow => ({
      id: `kp-work-${record.id}`,
      workRecordId: record.id,
      partner: record.company === 'KP' ? record.customer : record.company,
      workDate: cardSettlementDateFromWorkDate(record.date),
      vehicle: record.vehicle,
      plateNumber: record.plateNumber,
      source: '작업',
      draft: createKpDraftFromWorkRecord(record),
    }));

  return [...workRows, ...KP_SETTLEMENT_SEED_ROWS];
}

function applyKpVat(amount: number, mode: KpVatMode) {
  if (amount <= 0) return 0;
  if (mode === '별') return Math.round(amount * 1.1);
  return amount;
}

function calculateKpPaidAmount(draft: KpSettlementDraft) {
  const glassAmount = applyKpVat(parseMoneyText(draft.glassAmount), draft.glassVat);
  const tintPaymentAmount = applyKpVat(parseMoneyText(draft.tintPaymentAmount), draft.tintVat);
  const extraAmount = applyKpVat(parseMoneyText(draft.extraAmount), draft.extraVat);
  const deductionAmount = parseMoneyText(draft.deductionAmount);
  const waiverAmount = parseMoneyText(draft.waiverAmount);

  return Math.max(0, glassAmount + tintPaymentAmount + extraAmount - deductionAmount - waiverAmount);
}

function formatKpDisplayDate(value: string) {
  const normalized = normalizeWorkDate(value);
  return normalized ? cardSettlementDateFromWorkDate(normalized) : value;
}

function kpCsvCell(value: string | number) {
  const text = String(value).replace(/\r?\n/g, ' ');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadKpStatisticsCsv(rows: Array<KpSettlementBaseRow & { draft: KpSettlementDraft; paidAmount: number }>) {
  const headers = ['업체(거래처)', '작업일', '지급일', '차종', '차량번호', '지급금액', '유리지급가', '유리VAT', '썬팅지급가', '썬팅VAT', '추가지급가', '추가VAT', '공제금액', '면책금', '썬팅'];
  const body = rows.map((row) => [
    row.partner,
    row.workDate,
    formatKpDisplayDate(row.draft.paymentDate),
    row.vehicle,
    row.plateNumber,
    row.paidAmount,
    parseMoneyText(row.draft.glassAmount),
    row.draft.glassVat,
    parseMoneyText(row.draft.tintPaymentAmount),
    row.draft.tintVat,
    parseMoneyText(row.draft.extraAmount),
    row.draft.extraVat,
    parseMoneyText(row.draft.deductionAmount),
    parseMoneyText(row.draft.waiverAmount),
    parseMoneyText(row.draft.tintingAmount),
  ]);
  const csv = [headers, ...body].map((row) => row.map(kpCsvCell).join(',')).join('\r\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `KP정산_${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function KpStatisticsPage({
  setWorkRecords,
  workRecords,
}: {
  setWorkRecords: Dispatch<SetStateAction<WorkerWorkListRecord[]>>;
  workRecords: WorkerWorkListRecord[];
}) {
  const [periodBasis, setPeriodBasis] = useState<KpPeriodBasis>('work');
  const [periodStart, setPeriodStart] = useState('2026-04-15');
  const [periodEnd, setPeriodEnd] = useState('2026-04-30');
  const [partnerQuery, setPartnerQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const [partnerFilter, setPartnerFilter] = useState<Set<string>>(new Set());
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, KpSettlementDraft>>({});
  const [selectedRow, setSelectedRow] = useState<(KpSettlementBaseRow & { draft: KpSettlementDraft; paidAmount: number }) | null>(null);
  const baseRows = useMemo(() => buildKpBaseRows(workRecords), [workRecords]);
  const rows = useMemo(
    () =>
      baseRows.map((row) => {
        const draft = drafts[row.id] ?? row.draft;
        return {
          ...row,
          draft,
          paidAmount: calculateKpPaidAmount(draft),
        };
      }),
    [baseRows, drafts],
  );
  const partnerSuggestions = useMemo(() => Array.from(new Set(baseRows.map((row) => row.partner))).sort((a, b) => a.localeCompare(b, 'ko-KR')), [baseRows]);
  const filteredRows = useMemo(() => {
    const normalizedPartnerQuery = partnerQuery.trim().toLowerCase();
    const normalizedKeyword = keyword.trim().toLowerCase();
    const start = normalizeWorkDate(periodStart);
    const end = normalizeWorkDate(periodEnd);

    return rows.filter((row) => {
      const rowDate = normalizeWorkDate(periodBasis === 'payment' ? row.draft.paymentDate : row.workDate);
      const matchesDate = (!start || !rowDate || rowDate >= start) && (!end || !rowDate || rowDate <= end);
      const matchesPartnerSelection = partnerFilter.size === 0 || partnerFilter.has(row.partner);
      const matchesPartnerQuery = normalizedPartnerQuery.length === 0 || row.partner.toLowerCase().includes(normalizedPartnerQuery);
      const haystack = [
        row.partner,
        row.workDate,
        row.vehicle,
        row.plateNumber,
        row.paidAmount,
        row.draft.paymentDate,
        row.draft.glassAmount,
        row.draft.tintPaymentAmount,
        row.draft.extraAmount,
      ]
        .join(' ')
        .toLowerCase();
      const matchesKeyword = normalizedKeyword.length === 0 || haystack.includes(normalizedKeyword);

      return matchesDate && matchesPartnerSelection && matchesPartnerQuery && matchesKeyword;
    });
  }, [keyword, partnerFilter, partnerQuery, periodBasis, periodEnd, periodStart, rows]);
  const totalPaidAmount = filteredRows.reduce((sum, row) => sum + row.paidAmount, 0);
  const reflectedCount = filteredRows.filter((row) => row.workRecordId && row.paidAmount > 0).length;
  const kpListSummary = `총 ${filteredRows.length}건 · 지급합계 ${totalPaidAmount.toLocaleString('ko-KR')}원 · 작업 반영 ${reflectedCount}건`;

  useEffect(() => {
    const reflectedRows = rows.filter((row) => row.workRecordId && row.paidAmount > 0);
    if (reflectedRows.length === 0) return;

    setWorkRecords((current) => {
      let changed = false;
      const nextRecords = current.map((record) => {
        const reflectedRow = reflectedRows.find((row) => row.workRecordId === record.id);
        if (!reflectedRow || record.insurancePaidAmount === reflectedRow.paidAmount) return record;

        changed = true;
        return { ...record, insurancePaidAmount: reflectedRow.paidAmount };
      });

      return changed ? nextRecords : current;
    });
  }, [rows, setWorkRecords]);

  function syncKpPaidAmountToWork(row: KpSettlementBaseRow, paidAmount: number) {
    if (!row.workRecordId && !row.plateNumber) return;

    setWorkRecords((current) =>
      current.map((record) => {
        const matches = row.workRecordId ? record.id === row.workRecordId : record.plateNumber === row.plateNumber;
        return matches ? { ...record, insurancePaidAmount: paidAmount } : record;
      }),
    );
  }

  function updateDraft(row: KpSettlementBaseRow & { draft: KpSettlementDraft }, key: keyof KpSettlementDraft, value: string) {
    const nextDraft = { ...row.draft, [key]: value };
    const paidAmount = calculateKpPaidAmount(nextDraft);
    setDrafts((current) => ({ ...current, [row.id]: nextDraft }));
    syncKpPaidAmountToWork(row, paidAmount);
  }

  function selectQuickRange(days: number) {
    const start = parseDateInput(periodStart) ?? new Date(2026, 4, 21);
    setPeriodEnd(formatDateInputValue(addDays(start, days - 1)));
  }

  function resetFilters() {
    setPeriodBasis('work');
    setPeriodStart('2026-04-15');
    setPeriodEnd('2026-04-30');
    setPartnerQuery('');
    setKeyword('');
    setPartnerFilter(new Set());
  }

  function togglePartner(partner: string) {
    setPartnerFilter((current) => {
      const next = new Set(current);
      if (next.has(partner)) {
        next.delete(partner);
      } else {
        next.add(partner);
      }
      return next;
    });
  }

  const vatSelect = (row: KpSettlementBaseRow & { draft: KpSettlementDraft }, key: 'glassVat' | 'tintVat' | 'extraVat') => (
    <select
      className="kp-inline-select"
      key={`${row.id}-${key}`}
      onChange={(event) => updateDraft(row, key, event.target.value as KpVatMode)}
      value={row.draft[key]}
    >
      {KP_VAT_OPTIONS.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
  const amountInput = (row: KpSettlementBaseRow & { draft: KpSettlementDraft }, key: keyof KpSettlementDraft, placeholder = '0') => (
    <input
      className="kp-inline-input"
      inputMode="numeric"
      key={`${row.id}-${key}`}
      onChange={(event) => updateDraft(row, key, formatMoneyInputValue(event.target.value))}
      placeholder={placeholder}
      value={row.draft[key]}
    />
  );
  const amountVatInput = (
    row: KpSettlementBaseRow & { draft: KpSettlementDraft },
    amountKey: keyof KpSettlementDraft,
    vatKey: 'glassVat' | 'tintVat' | 'extraVat',
  ) => (
    <div className="kp-amount-vat-cell" key={`${row.id}-${amountKey}-${vatKey}`}>
      {amountInput(row, amountKey)}
      {vatSelect(row, vatKey)}
    </div>
  );

  return (
    <div className="page-stack kp-statistics-page">
      <section className="kp-filter-panel" aria-label="KP 검색 조건">
        <div className="kp-filter-row kp-period-row">
          <strong>기간</strong>
          <div className="kp-radio-group">
            <label>
              <input checked={periodBasis === 'work'} onChange={() => setPeriodBasis('work')} type="radio" />
              작업일
            </label>
            <label>
              <input checked={periodBasis === 'payment'} onChange={() => setPeriodBasis('payment')} type="radio" />
              지급일
            </label>
          </div>
          <div className="kp-date-range">
            <input onChange={(event) => setPeriodStart(event.target.value)} type="date" value={periodStart} />
            <span>~</span>
            <input onChange={(event) => setPeriodEnd(event.target.value)} type="date" value={periodEnd} />
          </div>
          <div className="kp-quick-range">
            <button type="button" onClick={() => setPeriodStart(formatDateInputValue(new Date(2026, 4, 20)))}>오늘</button>
            <button type="button" onClick={() => selectQuickRange(3)}>3일</button>
            <button className="active" type="button" onClick={() => selectQuickRange(7)}>1주</button>
            <button type="button" onClick={() => selectQuickRange(14)}>2주</button>
            <button type="button" onClick={() => setPeriodEnd(formatDateInputValue(addMonths(parseDateInput(periodStart) ?? new Date(), 1)))}>1개월</button>
          </div>
        </div>
        <div className="kp-filter-row kp-search-row">
          <strong>업체</strong>
          <SearchInput
            className="kp-partner-search"
            label="업체"
            labelHidden
            listId="kp-partner-search-suggestions"
            onChange={setPartnerQuery}
            placeholder="업체명"
            suggestions={partnerSuggestions}
            value={partnerQuery}
          />
          <button className="secondary-button" onClick={() => setIsPartnerModalOpen(true)} type="button">
            <Search size={15} />
            업체 선택
          </button>
          <input
            className="kp-keyword-input"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="차량번호/브랜드/모델명/부품번호"
            value={keyword}
          />
          <div className="kp-filter-actions">
            <button className="primary-button" type="button">검색</button>
            <button className="secondary-button" onClick={resetFilters} type="button">초기화</button>
          </div>
        </div>
      </section>

      <Panel
        className="kp-table-panel"
        title="KP 정산 리스트"
        action={
          <div className="kp-panel-actions">
            <span className="kp-list-summary">{kpListSummary}</span>
            <button className="secondary-button" onClick={() => downloadKpStatisticsCsv(filteredRows)} type="button">
              <Download size={16} />
              EXCEL 추출
            </button>
          </div>
        }
      >
        <ListColumnTable
          columns={['업체', '작업일', '지급일', '차종', '차량번호', '지급액', '유리', '썬팅', '추가', '공제', '면책', '팅']}
          onRowClick={(rowIndex) => {
            const row = filteredRows[rowIndex];
            if (row) setSelectedRow(row);
          }}
            rows={filteredRows.map((row) => [
              row.partner,
              row.workDate,
            <input
              className="kp-inline-input date"
              key={`${row.id}-payment-date`}
              onChange={(event) => updateDraft(row, 'paymentDate', event.target.value)}
              type="date"
              value={normalizeWorkDate(row.draft.paymentDate)}
            />,
              row.vehicle,
              row.plateNumber,
            <strong className="kp-paid-amount" key={`${row.id}-paid`}>{row.paidAmount.toLocaleString('ko-KR')}</strong>,
            amountVatInput(row, 'glassAmount', 'glassVat'),
            amountVatInput(row, 'tintPaymentAmount', 'tintVat'),
            amountVatInput(row, 'extraAmount', 'extraVat'),
            amountInput(row, 'deductionAmount'),
            amountInput(row, 'waiverAmount'),
            amountInput(row, 'tintingAmount'),
          ])}
        />
      </Panel>

      <section className="kp-help-grid">
        <article>
          <strong>계산식</strong>
          <span>지급금액 = 유리지급가 + 썬팅지급가 + 추가지급가 - 공제금액 - 면책금</span>
          <span>VAT가 '별'이면 해당 지급가에 1.1을 곱하고, '포'이면 입력값 그대로 계산합니다.</span>
        </article>
        <article>
          <strong>작업 자동 반영</strong>
          <span>작업 화면에서 생성된 KP 건은 차량번호/작업 ID로 연결됩니다.</span>
          <span>지급금액이 계산되면 연결된 작업의 보험입금액에 즉시 반영됩니다.</span>
        </article>
      </section>

      {isPartnerModalOpen ? (
        <DetailDrawer
          eyebrow="KP"
          onClose={() => setIsPartnerModalOpen(false)}
          title="업체 선택"
          variant="modal"
        >
          <div className="kp-partner-modal">
            {partnerSuggestions.map((partner) => (
              <label key={partner}>
                <input checked={partnerFilter.has(partner)} onChange={() => togglePartner(partner)} type="checkbox" />
                <span>{partner}</span>
              </label>
            ))}
            <div className="estimate-save-row">
              <button className="secondary-button" onClick={() => setPartnerFilter(new Set())} type="button">전체 해제</button>
              <button className="primary-button" onClick={() => setIsPartnerModalOpen(false)} type="button">적용</button>
            </div>
          </div>
        </DetailDrawer>
      ) : null}

      {selectedRow ? (
        <DetailDrawer
          eyebrow="KP 상세"
          onClose={() => setSelectedRow(null)}
          title={`${selectedRow.partner} · ${selectedRow.plateNumber}`}
          variant="modal"
        >
          <div className="detail-grid">
            <Field label="작업일" value={selectedRow.workDate} />
            <Field label="지급일" value={formatKpDisplayDate(selectedRow.draft.paymentDate)} />
            <Field label="차종" value={selectedRow.vehicle} />
            <Field label="지급금액" value={formatMoney(selectedRow.paidAmount)} />
            <Field label="작업 반영" value={selectedRow.workRecordId ? '연결됨' : '수기/기본행'} />
          </div>
        </DetailDrawer>
      ) : null}
    </div>
  );
}

type CardSalesSort = 'workAsc' | 'paymentAsc' | 'amountDesc' | 'cardAsc';
type CardSalesDepositFilter = 'all' | 'pending' | 'deposited';
type CardSalesSearchState = {
  category: string;
  company: string;
  plate: string;
  card: string;
  deposit: CardSalesDepositFilter;
  sort: CardSalesSort;
};
type CardSalesOverride = {
  depositDate: string;
  depositAmount: string;
};
type CardSalesStorageState = {
  overrides: Record<string, CardSalesOverride>;
  bulkDepositDate: string;
};

const CARD_SALES_DEFAULT_SEARCH: CardSalesSearchState = {
  category: '',
  company: '',
  plate: '',
  card: '',
  deposit: 'all',
  sort: 'workAsc',
};

function formatCardSalesMoneyInput(value: string) {
  return formatMoneyInputValue(value);
}

function normalizeCardSalesDateInput(value: string) {
  const trimmedValue = value.trim();
  const compactDateMatch = trimmedValue.match(/^(\d{4})(\d{2})(\d{2})$/);
  const normalized = compactDateMatch
    ? `${compactDateMatch[1]}-${compactDateMatch[2]}-${compactDateMatch[3]}`
    : normalizeWorkDate(trimmedValue);
  const parsedDate = normalized ? parseDateInput(normalized) : null;
  return parsedDate && formatDateInputValue(parsedDate) === normalized ? normalized : '';
}

function formatCardSalesDateTypingValue(value: string) {
  return value.replace(/[^\d-]/g, '').slice(0, 10);
}

function isCardSalesOverride(value: unknown): value is CardSalesOverride {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.depositDate === 'string' && typeof item.depositAmount === 'string';
}

function readCardSalesStorage(): CardSalesStorageState {
  const fallback = {
    overrides: {},
    bulkDepositDate: todayDateInputValue(),
  };
  if (typeof window === 'undefined') return fallback;

  try {
    const rawValue = window.localStorage.getItem(CARD_SALES_STORAGE_KEY);
    if (!rawValue) return fallback;
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== 'object') return fallback;

    const state = parsedValue as Record<string, unknown>;
    const rawOverrides = state.overrides && typeof state.overrides === 'object' ? (state.overrides as Record<string, unknown>) : {};
    const overrides = Object.fromEntries(
      Object.entries(rawOverrides)
        .filter((entry): entry is [string, CardSalesOverride] => isCardSalesOverride(entry[1]))
        .map(([key, value]) => [
          key,
          {
            depositDate: normalizeCardSalesDateInput(value.depositDate),
            depositAmount: formatCardSalesMoneyInput(value.depositAmount),
          },
        ]),
    );

    return {
      overrides,
      bulkDepositDate: normalizeCardSalesDateInput(String(state.bulkDepositDate ?? '')) || fallback.bulkDepositDate,
    };
  } catch {
    return fallback;
  }
}

function writeCardSalesStorage(state: CardSalesStorageState) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(CARD_SALES_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Browser storage can be unavailable in privacy modes.
  }
}

function CardSalesDateInput({
  ariaLabel,
  className = '',
  onChange,
  onFocus,
  required = false,
  value,
}: {
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
  onFocus?: (input: HTMLInputElement) => void;
  required?: boolean;
  value: string;
}) {
  const pickerRef = useRef<HTMLInputElement | null>(null);

  function applyDateValue(nextValue: string, options: { forceNormalize?: boolean } = {}) {
    const normalizedValue = normalizeCardSalesDateInput(nextValue);
    if (normalizedValue) {
      onChange(normalizedValue);
      return;
    }

    if (options.forceNormalize) {
      onChange('');
      return;
    }

    onChange(formatCardSalesDateTypingValue(nextValue));
  }

  function openCalendarPicker() {
    const picker = pickerRef.current;
    if (!picker) return;

    picker.showPicker?.();
    picker.focus();
  }

  return (
    <span className={`card-sales-date-field ${className}`}>
      <input
        aria-label={ariaLabel}
        inputMode="numeric"
        onBlur={(event) => applyDateValue(event.target.value, { forceNormalize: true })}
        onChange={(event) => applyDateValue(event.target.value)}
        onFocus={(event) => onFocus?.(event.currentTarget)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            event.currentTarget.select();
          }
        }}
        onPaste={(event) => {
          const normalizedValue = normalizeCardSalesDateInput(event.clipboardData.getData('text'));
          if (!normalizedValue) return;

          event.preventDefault();
          onChange(normalizedValue);
        }}
        placeholder="yyyy-mm-dd"
        required={required}
        type="text"
        value={value}
      />
      <button aria-label={`${ariaLabel} 달력 열기`} onClick={openCalendarPicker} type="button">
        <CalendarDays size={15} />
      </button>
      <input
        aria-hidden="true"
        className="card-sales-hidden-date-picker"
        onChange={(event) => onChange(event.target.value)}
        ref={pickerRef}
        tabIndex={-1}
        type="date"
        value={normalizeCardSalesDateInput(value)}
      />
    </span>
  );
}

function cardSalesKey(settlement: CardSettlement, index: number) {
  return `${settlement.workDate ?? settlement.date}-${settlement.date}-${settlement.brand}-${settlement.plate}-${settlement.source ?? index}`;
}

function normalizeCardSalesDate(value: string) {
  const normalized = normalizeWorkDate(value);
  if (!normalized) return value.trim();
  const [year = '2026', month = '01', day = '01'] = normalized.split('-');
  return `${year.slice(2)}.${month}.${day}`;
}

function defaultCardDepositDate(value: string) {
  const normalized = normalizeWorkDate(value);
  if (!normalized) return '';
  const date = parseDateInput(normalized);
  return date ? formatDateInputValue(addDays(date, 2)) : '';
}

function todayDateInputValue() {
  return formatDateInputValue(new Date());
}

function CardSalesPage({ settlements }: { settlements: CardSettlement[] }) {
  const initialCardSalesStorage = useMemo(() => readCardSalesStorage(), []);
  const [searchDraft, setSearchDraft] = useState<CardSalesSearchState>(CARD_SALES_DEFAULT_SEARCH);
  const [appliedSearch, setAppliedSearch] = useState<CardSalesSearchState>(CARD_SALES_DEFAULT_SEARCH);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, CardSalesOverride>>(() => initialCardSalesStorage.overrides);
  const [bulkDepositDate, setBulkDepositDate] = useState(() => initialCardSalesStorage.bulkDepositDate);
  const [bulkDepositAmount, setBulkDepositAmount] = useState('');
  const rows = useMemo(
    () =>
      settlements.map((settlement, index) => {
        const key = cardSalesKey(settlement, index);
        const override = overrides[key];
        const defaultDepositAmount = settlement.paid > 0 ? settlement.paid.toLocaleString('ko-KR') : '';
        const depositAmountText = override?.depositAmount ?? defaultDepositAmount;
        const depositAmount = parseMoneyText(depositAmountText);
        const fee = depositAmount > 0 ? Math.max(0, settlement.amount - depositAmount) : 0;
        const rate = depositAmount > 0 && settlement.amount > 0 ? (depositAmount / settlement.amount).toFixed(4) : settlement.feeRate;

        return {
          key,
          settlement,
          workDate: normalizeCardSalesDate(settlement.workDate ?? settlement.date),
          paymentDate: normalizeCardSalesDate(settlement.date),
          category: settlement.category ?? '작업',
          company: settlement.company ?? '-',
          depositDate: normalizeWorkDate(
            override?.depositDate ?? settlement.depositDate ?? (settlement.paid > 0 ? defaultCardDepositDate(settlement.date) : ''),
          ),
          depositAmountText,
          depositAmount,
          fee,
          rate,
        };
      }),
    [overrides, settlements],
  );
  const filteredRows = useMemo(() => {
    const categoryQuery = appliedSearch.category.trim().toLowerCase();
    const companyQuery = appliedSearch.company.trim().toLowerCase();
    const plateQuery = appliedSearch.plate.trim().toLowerCase();
    const cardQuery = appliedSearch.card.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const matchesCategory = categoryQuery.length === 0 || row.category.toLowerCase().includes(categoryQuery);
      const matchesCompany = companyQuery.length === 0 || row.company.toLowerCase().includes(companyQuery);
      const matchesPlate =
        plateQuery.length === 0 ||
        row.settlement.plate.toLowerCase().includes(plateQuery) ||
        (row.settlement.vehicle ?? '').toLowerCase().includes(plateQuery);
      const matchesCard = cardQuery.length === 0 || row.settlement.brand.toLowerCase().includes(cardQuery);
      const matchesDeposit =
        appliedSearch.deposit === 'all' ||
        (appliedSearch.deposit === 'pending' && row.depositAmount <= 0) ||
        (appliedSearch.deposit === 'deposited' && row.depositAmount > 0);

      return matchesCategory && matchesCompany && matchesPlate && matchesCard && matchesDeposit;
    });

    return [...filtered].sort((left, right) => {
      if (appliedSearch.sort === 'amountDesc') return right.settlement.amount - left.settlement.amount;
      if (appliedSearch.sort === 'cardAsc') return left.settlement.brand.localeCompare(right.settlement.brand, 'ko-KR');
      if (appliedSearch.sort === 'paymentAsc') return left.paymentDate.localeCompare(right.paymentDate, 'ko-KR');
      return left.workDate.localeCompare(right.workDate, 'ko-KR');
    });
  }, [appliedSearch, rows]);
  const selectableFilteredRows = filteredRows.filter((row) => row.depositAmount <= 0);
  const selectedRows = rows.filter((row) => row.depositAmount <= 0 && selectedKeys.has(row.key));
  const selectedAmount = selectedRows.reduce((sum, row) => sum + row.settlement.amount, 0);
  const selectedDepositAmount = selectedRows.reduce((sum, row) => sum + row.depositAmount, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.settlement.amount, 0);
  const totalDepositAmount = rows.reduce((sum, row) => sum + row.depositAmount, 0);
  const totalFee = rows.reduce((sum, row) => sum + row.fee, 0);
  const pendingCount = rows.filter((row) => row.depositAmount <= 0).length;
  const categorySuggestions = useMemo(() => Array.from(new Set(rows.map((row) => row.category))).filter(Boolean), [rows]);
  const companySuggestions = useMemo(() => Array.from(new Set(rows.map((row) => row.company))).filter(Boolean), [rows]);
  const plateSuggestions = useMemo(
    () => Array.from(new Set(rows.flatMap((row) => [row.settlement.plate, row.settlement.vehicle]).filter((value): value is string => Boolean(value)))),
    [rows],
  );
  const cardSuggestions = useMemo(() => Array.from(new Set(rows.map((row) => row.settlement.brand))).filter(Boolean), [rows]);
  const allFilteredSelected = selectableFilteredRows.length > 0 && selectableFilteredRows.every((row) => selectedKeys.has(row.key));

  useEffect(() => {
    const selectableKeys = new Set(rows.filter((row) => row.depositAmount <= 0).map((row) => row.key));
    setSelectedKeys((current) => {
      const next = new Set<string>();
      let changed = false;
      current.forEach((key) => {
        if (selectableKeys.has(key)) {
          next.add(key);
        } else {
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [rows]);

  useEffect(() => {
    writeCardSalesStorage({ overrides, bulkDepositDate });
  }, [bulkDepositDate, overrides]);

  function updateOverride(key: string, field: keyof CardSalesOverride, value: string) {
    const nextValue = field === 'depositAmount' ? formatCardSalesMoneyInput(value) : value;
    setOverrides((current) => ({
      ...current,
      [key]: {
        depositDate: current[key]?.depositDate ?? '',
        depositAmount: current[key]?.depositAmount ?? '',
        [field]: nextValue,
      },
    }));
  }

  function updateCardSalesSearch<Key extends keyof CardSalesSearchState>(key: Key, value: CardSalesSearchState[Key]) {
    setSearchDraft((current) => ({ ...current, [key]: value }));
  }

  function applyCardSalesSearch() {
    setAppliedSearch(searchDraft);
  }

  function resetCardSalesSearch() {
    setSearchDraft(CARD_SALES_DEFAULT_SEARCH);
    setAppliedSearch(CARD_SALES_DEFAULT_SEARCH);
  }

  function setDefaultDepositDateIfEmpty(key: string, currentDepositDate: string, input: HTMLInputElement) {
    if (currentDepositDate) return;

    const today = todayDateInputValue();
    input.value = today;
    updateOverride(key, 'depositDate', today);
  }

  function toggleSelected(key: string, canSelect: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (!canSelect) {
        next.delete(key);
        return next;
      }
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleAllFiltered(checked: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      selectableFilteredRows.forEach((row) => {
        if (checked) {
          next.add(row.key);
        } else {
          next.delete(row.key);
        }
      });
      return next;
    });
  }

  function applyBulkDeposit() {
    const bulkAmount = parseMoneyText(bulkDepositAmount);
    if (selectedRows.length === 0 || selectedAmount <= 0 || bulkAmount <= 0) return;

    const rate = bulkAmount / selectedAmount;
    setOverrides((current) => {
      const next = { ...current };
      selectedRows.forEach((row) => {
        next[row.key] = {
          depositDate: bulkDepositDate,
          depositAmount: Math.round(row.settlement.amount * rate).toLocaleString('ko-KR'),
        };
      });
      return next;
    });
  }

  return (
    <div className="page-stack card-sales-page">
      <section className="card-sales-summary-strip" aria-label="카드매출 요약">
        <span>
          카드 결제금액
          <strong>{formatMoney(totalAmount)}</strong>
          <em>총 {rows.length}건</em>
        </span>
        <span>
          입금금액
          <strong>{formatMoney(totalDepositAmount)}</strong>
          <em>수기입력/자동계산 합산</em>
        </span>
        <span>
          수수료
          <strong>{formatMoney(totalFee)}</strong>
          <em>입금 입력 행 기준</em>
        </span>
        <span>
          입금대기
          <strong>{pendingCount}건</strong>
          <em>입금일자/금액 미입력</em>
        </span>
      </section>

      <Panel
        className="card-sales-panel"
        title="카드매출 목록"
      >
        <div className="card-sales-search-panel" aria-label="카드매출 검색 조건">
          <div className="card-sales-filter-grid">
            <SearchInput
              className="card-sales-filter-input"
              label="구분"
              listId="card-sales-category-suggestions"
              onChange={(value) => updateCardSalesSearch('category', value)}
              placeholder="구분"
              suggestions={categorySuggestions}
              value={searchDraft.category}
            />
            <SearchInput
              className="card-sales-filter-input"
              label="업체"
              listId="card-sales-company-suggestions"
              onChange={(value) => updateCardSalesSearch('company', value)}
              placeholder="업체"
              suggestions={companySuggestions}
              value={searchDraft.company}
            />
            <SearchInput
              className="card-sales-filter-input"
              label="차량번호"
              listId="card-sales-plate-suggestions"
              onChange={(value) => updateCardSalesSearch('plate', value)}
              placeholder="차량번호/차종"
              suggestions={plateSuggestions}
              value={searchDraft.plate}
            />
            <SearchInput
              className="card-sales-filter-input"
              label="카드사"
              listId="card-sales-card-suggestions"
              onChange={(value) => updateCardSalesSearch('card', value)}
              placeholder="카드사"
              suggestions={cardSuggestions}
              value={searchDraft.card}
            />
            <label className="card-sales-filter-select">
              <span>입금여부</span>
              <select onChange={(event) => updateCardSalesSearch('deposit', event.target.value as CardSalesDepositFilter)} value={searchDraft.deposit}>
                <option value="all">전체</option>
                <option value="pending">입금대기</option>
                <option value="deposited">입금완료</option>
              </select>
            </label>
            <label className="card-sales-filter-select">
              <span>정렬</span>
              <select onChange={(event) => updateCardSalesSearch('sort', event.target.value as CardSalesSort)} value={searchDraft.sort}>
                <option value="workAsc">작업일 빠른순</option>
                <option value="paymentAsc">결제일 빠른순</option>
                <option value="amountDesc">결제금액 높은순</option>
                <option value="cardAsc">카드사 가나다순</option>
              </select>
            </label>
            <div className="card-sales-search-actions">
              <button className="primary-button" onClick={applyCardSalesSearch} type="button">검색</button>
              <button className="secondary-button" onClick={resetCardSalesSearch} type="button">초기화</button>
            </div>
          </div>
          <div className="card-sales-result-count">총 {filteredRows.length}건 · 선택 {selectedRows.length}건</div>
        </div>
        <div className="card-sales-bulk-row">
          <div className="card-sales-selected-summary" aria-label="선택 일괄입금 요약">
            <span>
              <em>대상 결제금액</em>
              <strong>{selectedAmount.toLocaleString('ko-KR')}원</strong>
            </span>
            <span>
              <em>입력된 입금금액</em>
              <strong>{selectedDepositAmount.toLocaleString('ko-KR')}원</strong>
            </span>
          </div>
          <div className="card-bulk-controls">
            <label>
              <span>입금일자</span>
              <CardSalesDateInput ariaLabel="일괄입금 입금일자" onChange={setBulkDepositDate} value={bulkDepositDate} />
            </label>
            <label>
              <span>일괄입금액</span>
              <input
                inputMode="numeric"
                onChange={(event) => setBulkDepositAmount(formatCardSalesMoneyInput(event.target.value))}
                placeholder="입금금액"
                value={bulkDepositAmount}
              />
            </label>
            <button className="primary-button" disabled={selectedRows.length === 0 || parseMoneyText(bulkDepositAmount) <= 0} onClick={applyBulkDeposit} type="button">
              계산
            </button>
          </div>
        </div>
        <ListColumnTable
          columns={[
            <input
              aria-label="전체 선택"
              checked={allFilteredSelected}
              className="card-sales-select-all-checkbox"
              disabled={selectableFilteredRows.length === 0}
              key="card-sales-select-all"
              onChange={(event) => toggleAllFiltered(event.target.checked)}
              type="checkbox"
            />,
            '작업일',
            '결제일',
            '구분',
            '업체',
            '차량번호',
            '결제금액',
            '카드사',
            '입금일자',
            '입금금액',
            '수수료',
            '%',
          ]}
          rows={filteredRows.map((row) => {
            const canSelect = row.depositAmount <= 0;
            return [
              <input
                aria-label={`${row.settlement.plate} ${canSelect ? '선택' : '입금완료'}`}
                checked={canSelect && selectedKeys.has(row.key)}
                disabled={!canSelect}
                key={`${row.key}-select`}
                onChange={() => toggleSelected(row.key, canSelect)}
                title={canSelect ? undefined : '입금금액이 입력된 건은 일괄입금 대상에서 제외됩니다'}
                type="checkbox"
              />,
              row.workDate,
              row.paymentDate,
              row.category,
              row.company,
              row.settlement.plate,
              row.settlement.amount.toLocaleString('ko-KR'),
              row.settlement.brand,
              <CardSalesDateInput
                ariaLabel={`${row.settlement.plate} 입금일자`}
                className="card-sales-inline-input"
                key={`${row.key}-deposit-date`}
                onChange={(value) => updateOverride(row.key, 'depositDate', value)}
                onFocus={(input) => setDefaultDepositDateIfEmpty(row.key, row.depositDate, input)}
                value={row.depositDate}
              />,
              <input
                className="card-sales-inline-input money"
                inputMode="numeric"
                key={`${row.key}-deposit-amount`}
                onChange={(event) => updateOverride(row.key, 'depositAmount', event.target.value)}
                placeholder="입금금액"
                value={row.depositAmountText}
              />,
              row.fee > 0 ? row.fee.toLocaleString('ko-KR') : '',
              row.rate,
            ];
          })}
        />
      </Panel>
    </div>
  );
}

function WorkPage({
  mode,
  setWorkRecords,
  vehicleModelSuggestions,
  workRecords,
}: {
  mode: WorkAppMode;
  setWorkRecords: Dispatch<SetStateAction<WorkerWorkListRecord[]>>;
  vehicleModelSuggestions: string[];
  workRecords: WorkerWorkListRecord[];
}) {
  const [calendarView, setCalendarView] = useState<CalendarView>('day');
  const [workViewByMode, setWorkViewByMode] = useState<Record<WorkAppMode, WorkerWorkView>>({
    worker: readWorkViewSearchParam() ?? 'calendar',
    admin: readWorkViewSearchParam() ?? 'list',
  });
  const [workListPage, setWorkListPage] = useState(() => readPositiveIntSearchParam('workPage', 1));
  const [workPageSize, setWorkPageSize] = useState<WorkPageSize>(() => {
    const size = readPositiveIntSearchParam('workPageSize', 20);
    return WORK_PAGE_SIZE_OPTIONS.includes(size as WorkPageSize) ? (size as WorkPageSize) : 20;
  });
  const [workListFilter, setWorkListFilter] = useState<WorkListFilter>('all');
  const [workListQuery, setWorkListQuery] = useState('');
  const [workDateFrom, setWorkDateFrom] = useState('');
  const [workDateTo, setWorkDateTo] = useState('');
  const [workColumnFilterDraftKey, setWorkColumnFilterDraftKey] = useState<WorkColumnFilterKey>('division');
  const [workColumnFilterDraftValue, setWorkColumnFilterDraftValue] = useState('');
  const [workColumnFilters, setWorkColumnFilters] = useState<WorkColumnFilterRule[]>([]);
  const [workSortKey, setWorkSortKey] = useState<WorkerWorkSortKey>('date');
  const [workSortDirection, setWorkSortDirection] = useState<SortDirection>('desc');
  const [selectedWorkRecordId, setSelectedWorkRecordId] = useState<string | null>(() => readSearchParam('workItem'));
  const [isWorkRegistrationOpen, setIsWorkRegistrationOpen] = useState(false);
  const [completionOrder, setCompletionOrder] = useState<WorkOrder | null>(null);
  const [draggedWorkRecordId, setDraggedWorkRecordId] = useState<string | null>(null);
  const [pendingScheduleMove, setPendingScheduleMove] = useState<WorkScheduleMoveRequest | null>(null);
  const currentWorkView = workViewByMode[mode];
  const selectedWorkRecord = useMemo(
    () => workRecords.find((record) => record.id === selectedWorkRecordId) ?? null,
    [selectedWorkRecordId, workRecords],
  );
  const normalizedWorkListQuery = workListQuery.trim().toLowerCase();
  const currentCalendarDate = '2026.05.20';
  const currentCalendarDateKey = normalizeWorkDate(currentCalendarDate);
  const currentCalendarMonthKey = workMonthKeyFromDate(currentCalendarDate);
  const workRuntimeNow = useMemo(() => createWorkRuntimeNow(currentCalendarDateKey), [currentCalendarDateKey]);
  const [calendarPanelMode, setCalendarPanelMode] = useState<CalendarPanelMode>('detail');
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState(currentCalendarDateKey);
  const [selectedCalendarMonthKey, setSelectedCalendarMonthKey] = useState(currentCalendarMonthKey);
  const calendarWorkRecords = useMemo(
    () => workRecords.filter((record) => record.kind === '작업' && record.entry.kind === 'work'),
    [workRecords],
  );
  const currentDayWorkRecords = useMemo(
    () => calendarWorkRecords.filter((record) => normalizeWorkDate(record.date) === currentCalendarDateKey),
    [calendarWorkRecords, currentCalendarDateKey],
  );
  const weekCalendarCells = useMemo(
    () =>
      WEEK_CALENDAR.map((day) => {
        const date = `2026.05.${day.date.padStart(2, '0')}`;
        return {
          ...day,
          fullDate: date,
          records: calendarWorkRecords.filter((record) => normalizeWorkDate(record.date) === normalizeWorkDate(date)),
        };
      }),
    [calendarWorkRecords],
  );
  const monthCells = useMemo(
    () => [
      ...Array.from({ length: 4 }, (_, index) => ({ key: `empty-${index}`, date: '', fullDate: '', records: [] as WorkerWorkListRecord[] })),
      ...Array.from({ length: 31 }, (_, index) => {
        const date = index + 1;
        const fullDate = `2026.05.${String(date).padStart(2, '0')}`;
        return {
          key: String(date),
          date: String(date),
          fullDate,
          records: calendarWorkRecords.filter((record) => normalizeWorkDate(record.date) === normalizeWorkDate(fullDate)),
        };
      }),
    ],
    [calendarWorkRecords],
  );
  const workListSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          workRecords.flatMap((record) => [
            record.date,
            record.time,
            record.kind,
            record.division,
            record.company,
            record.customer,
            record.vehicle,
            record.plateNumber,
            record.title,
            record.owner,
            record.location,
            record.status,
            record.stock,
            String(record.insuranceClaimAmount),
            String(record.insurancePaidAmount),
            String(record.paymentAmount),
            record.paymentStatus,
            ...record.payments.flatMap((payment) => [
              payment.method,
              payment.cardCompany,
              payment.customCardCompany,
              payment.bankName,
              payment.customBankName,
              payment.accountNumber,
              payment.accountHolder,
            ]),
          ]),
        ),
      ),
    [workRecords],
  );
  const workColumnFilterValues = useMemo(
    () =>
      Array.from(new Set(workRecords.map((record) => getWorkColumnFilterValue(record, workColumnFilterDraftKey)).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, 'ko'),
      ),
    [workColumnFilterDraftKey, workRecords],
  );
  const filteredWorkerWorkRecords = useMemo(() => {
    const columnFilterGroups = workColumnFilters.reduce((groups, filter) => {
      const value = filter.value.trim();
      if (!value) return groups;

      const values = groups.get(filter.key) ?? new Set<string>();
      values.add(value);
      groups.set(filter.key, values);
      return groups;
    }, new Map<WorkColumnFilterKey, Set<string>>());

    const filtered = workRecords.filter((record) => {
      const normalizedDate = normalizeWorkDate(record.date);
      const matchesQuery =
        normalizedWorkListQuery.length === 0 ||
        [
          record.date,
          record.time,
          record.kind,
          record.division,
          record.company,
          record.customer,
          record.vehicle,
          record.plateNumber,
          record.title,
          record.owner,
          record.location,
          record.status,
          record.stock,
          String(record.insuranceClaimAmount),
          String(record.insurancePaidAmount),
          String(record.paymentAmount),
          record.paymentStatus,
          ...record.payments.flatMap((payment) => [
            payment.method,
            payment.cardCompany,
            payment.customCardCompany,
            payment.bankName,
            payment.customBankName,
            payment.accountNumber,
            payment.accountHolder,
          ]),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedWorkListQuery);
      const matchesDateFrom = !workDateFrom || (normalizedDate.length > 0 && normalizedDate >= workDateFrom);
      const matchesDateTo = !workDateTo || (normalizedDate.length > 0 && normalizedDate <= workDateTo);
      const matchesColumnFilter =
        columnFilterGroups.size === 0 ||
        Array.from(columnFilterGroups.entries()).every(([key, values]) => values.has(getWorkColumnFilterValue(record, key)));

      const matchesFilter =
        workListFilter === 'all' ||
        (workListFilter === 'scheduled' && (record.status === '예정' || record.status === '보류')) ||
        (workListFilter === 'active' && record.status === '진행중') ||
        (workListFilter === 'done' && record.status === '완료');

      return matchesQuery && matchesDateFrom && matchesDateTo && matchesColumnFilter && matchesFilter;
    });

    return [...filtered].sort((a, b) => {
      const direction = workSortDirection === 'asc' ? 1 : -1;
      const aValue = a[workSortKey];
      const bValue = b[workSortKey];

      return String(aValue).localeCompare(String(bValue), 'ko') * direction;
    });
  }, [
    normalizedWorkListQuery,
    workColumnFilters,
    workDateFrom,
    workDateTo,
    workListFilter,
    workRecords,
    workSortDirection,
    workSortKey,
  ]);
  const workListTotalPages = Math.max(1, Math.ceil(filteredWorkerWorkRecords.length / workPageSize));
  const visibleWorkerWorkRecords = filteredWorkerWorkRecords.slice(
    (workListPage - 1) * workPageSize,
    workListPage * workPageSize,
  );
  const calendarUsesScopedList = calendarView === 'month' || calendarView === 'year';
  const selectedCalendarRecord = selectedWorkRecord ?? (calendarUsesScopedList ? null : currentDayWorkRecords[0] ?? calendarWorkRecords[0] ?? null);
  const calendarPanelListRecords = useMemo(() => {
    const records =
      calendarView === 'year'
        ? calendarWorkRecords.filter((record) => workMonthKeyFromDate(record.date) === selectedCalendarMonthKey)
        : calendarWorkRecords.filter((record) => normalizeWorkDate(record.date) === selectedCalendarDateKey);

    return [...records].sort((left, right) => {
      const dateCompare = normalizeWorkDate(left.date).localeCompare(normalizeWorkDate(right.date));
      return dateCompare !== 0 ? dateCompare : left.time.localeCompare(right.time);
    });
  }, [calendarView, calendarWorkRecords, selectedCalendarDateKey, selectedCalendarMonthKey]);
  const calendarPanelListTitle =
    calendarView === 'year'
      ? `${formatWorkMonthScopeLabel(selectedCalendarMonthKey)} 작업 목록`
      : `${formatWorkDateScopeLabel(selectedCalendarDateKey)} 작업 목록`;
  const showCalendarPanelList = calendarUsesScopedList && calendarPanelMode === 'list';
  const selectedCalendarRuntimeStatus = selectedCalendarRecord ? resolveWorkRuntimeStatus(selectedCalendarRecord, workRuntimeNow) : null;
  const completionPendingRecords = useMemo(
    () => currentDayWorkRecords.filter((record) => resolveWorkRuntimeStatus(record, workRuntimeNow) === '완료대기'),
    [currentDayWorkRecords, workRuntimeNow],
  );

  useEffect(() => {
    if (workListPage <= workListTotalPages) return;
    handleWorkListPageChange(workListTotalPages);
  }, [workListPage, workListTotalPages]);

  useEffect(() => {
    setWorkListPage(1);
  }, [normalizedWorkListQuery, workColumnFilters, workDateFrom, workDateTo, workListFilter, workPageSize]);

  useEffect(() => {
    if (currentWorkView !== 'list') return;

    updateUrlSearchParams({
      page: 'work',
      workView: 'list',
      workPage: String(workListPage),
      workPageSize: String(workPageSize),
      ...(selectedWorkRecordId ? { workItem: selectedWorkRecordId } : {}),
    });
  }, [currentWorkView, selectedWorkRecordId, workListPage, workPageSize]);

  function handleWorkSort(nextKey: WorkerWorkSortKey) {
    if (workSortKey === nextKey) {
      setWorkSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setWorkSortKey(nextKey);
    setWorkSortDirection(nextKey === 'date' ? 'desc' : 'asc');
  }

  function setCurrentWorkView(nextView: WorkerWorkView) {
    setWorkViewByMode((current) => ({ ...current, [mode]: nextView }));
    updateUrlSearchParams({
      page: 'work',
      workView: nextView,
      ...(nextView === 'list'
        ? { workPage: String(workListPage), workPageSize: String(workPageSize) }
        : { workPage: null, workPageSize: null }),
    });
  }

  function handleWorkPageSizeChange(nextPageSize: WorkPageSize) {
    setWorkPageSize(nextPageSize);
    setWorkListPage(1);
    updateUrlSearchParams({
      page: 'work',
      workView: 'list',
      workPage: '1',
      workPageSize: String(nextPageSize),
      ...(selectedWorkRecordId ? { workItem: selectedWorkRecordId } : {}),
    });
  }

  function handleWorkListPageChange(nextPage: number) {
    const boundedPage = Math.min(Math.max(nextPage, 1), workListTotalPages);
    setWorkListPage(boundedPage);
    updateUrlSearchParams({
      page: 'work',
      workView: 'list',
      workPage: String(boundedPage),
      workPageSize: String(workPageSize),
      ...(selectedWorkRecordId ? { workItem: selectedWorkRecordId } : {}),
    });
  }

  function addWorkColumnFilter(nextValue = workColumnFilterDraftValue) {
    const value = nextValue.trim();
    if (!value) return;

    setWorkColumnFilters((current) => [
      ...current,
      { id: `work-filter-${Date.now()}-${current.length}`, key: workColumnFilterDraftKey, value },
    ]);
    setWorkColumnFilterDraftValue('');
    setWorkListPage(1);
  }

  function removeWorkColumnFilter(filterId: string) {
    setWorkColumnFilters((current) => current.filter((filter) => filter.id !== filterId));
    setWorkListPage(1);
  }

  function resetWorkFilters() {
    setWorkDateFrom('');
    setWorkDateTo('');
    setWorkColumnFilters([]);
    setWorkColumnFilterDraftValue('');
    setWorkListQuery('');
    setWorkListFilter('all');
    setWorkListPage(1);
  }

  function handleCalendarViewChange(nextView: CalendarView) {
    setCalendarView(nextView);
    if (nextView === 'month') {
      setCalendarPanelMode('list');
      setSelectedCalendarDateKey(currentCalendarDateKey);
      closeWorkRecord();
      return;
    }

    if (nextView === 'year') {
      setCalendarPanelMode('list');
      setSelectedCalendarMonthKey(currentCalendarMonthKey);
      closeWorkRecord();
      return;
    }

    setCalendarPanelMode('detail');
    closeWorkRecord();
  }

  function selectCalendarDate(fullDate: string) {
    const nextDateKey = normalizeWorkDate(fullDate);
    if (!nextDateKey) return;

    setSelectedCalendarDateKey(nextDateKey);
    setSelectedCalendarMonthKey(workMonthKeyFromDate(fullDate));
    setCalendarPanelMode('list');
    closeWorkRecord();
  }

  function selectCalendarMonth(monthLabel: string) {
    setSelectedCalendarMonthKey(workMonthKeyFromLabel(monthLabel));
    setCalendarPanelMode('list');
    closeWorkRecord();
  }

  function openWorkRecord(record: WorkerWorkListRecord) {
    setSelectedWorkRecordId(record.id);
    updateUrlSearchParams({
      page: 'work',
      workView: currentWorkView,
      workPage: String(workListPage),
      workPageSize: String(workPageSize),
      workItem: record.id,
    });
  }

  function openCalendarWorkRecord(record: WorkerWorkListRecord) {
    setCalendarPanelMode('detail');
    openWorkRecord(record);
  }

  function returnToCalendarPanelList() {
    setCalendarPanelMode('list');
    closeWorkRecord();
  }

  function closeWorkRecord() {
    setSelectedWorkRecordId(null);
    updateUrlSearchParams({
      page: 'work',
      workView: currentWorkView,
      workPage: currentWorkView === 'list' ? String(workListPage) : null,
      workPageSize: currentWorkView === 'list' ? String(workPageSize) : null,
      workItem: null,
    });
  }

  function saveWorkRecord(recordId: string, draft: WorkRecordDraft) {
    setWorkRecords((current) =>
      current.map((record) => (record.id === recordId ? applyWorkRecordDraft(record, draft) : record)),
    );
  }

  function registerWorkRecord(draft: WorkRegistrationFormDraft) {
    const nextRecord = createWorkRecordFromRegistrationDraft(draft);
    setWorkRecords((current) => [nextRecord, ...current]);
    setWorkListPage(1);
    setCurrentWorkView('list');
    setIsWorkRegistrationOpen(false);
  }

  function moveWorkSchedule(record: WorkerWorkListRecord, nextDate: string, nextTime: string) {
    setWorkRecords((current) =>
      current.map((item) => (item.id === record.id ? moveWorkRecordSchedule(item, nextDate, nextTime) : item)),
    );
  }

  function requestWorkScheduleMove(record: WorkerWorkListRecord, nextDate: string, nextTime: string, targetLabel: string) {
    if (record.date === nextDate && record.time === nextTime) return;

    if (record.status === '완료') {
      setPendingScheduleMove({ record, nextDate, nextTime, targetLabel });
      return;
    }

    moveWorkSchedule(record, nextDate, nextTime);
  }

  function handleWorkScheduleDragStart(record: WorkerWorkListRecord, event: DragEvent<HTMLButtonElement>) {
    setDraggedWorkRecordId(record.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', record.id);
  }

  function handleWorkScheduleDrop(
    nextDate: string,
    nextTime: string | null,
    targetLabel: string,
    event: DragEvent<HTMLElement>,
  ) {
    event.preventDefault();
    const recordId = event.dataTransfer.getData('text/plain') || draggedWorkRecordId;
    setDraggedWorkRecordId(null);
    if (!recordId) return;

    const record = workRecords.find((item) => item.id === recordId);
    if (!record || record.kind !== '작업') return;

    requestWorkScheduleMove(record, nextDate, nextTime ?? record.time, targetLabel);
  }

  function confirmPendingScheduleMove() {
    if (!pendingScheduleMove) return;

    moveWorkSchedule(pendingScheduleMove.record, pendingScheduleMove.nextDate, pendingScheduleMove.nextTime);
    setPendingScheduleMove(null);
  }

  const viewSwitch = (
    <div className="work-view-switch-row">
      <div>
        <strong>{currentWorkView === 'calendar' ? '캘린더 보기' : '리스트 보기'}</strong>
        <span>{modeDetailLabel(mode)}</span>
      </div>
      <button
        className="secondary-button"
        onClick={() => setCurrentWorkView(currentWorkView === 'calendar' ? 'list' : 'calendar')}
        type="button"
      >
        {currentWorkView === 'calendar' ? <FileText size={16} /> : <CalendarDays size={16} />}
        {currentWorkView === 'calendar' ? '리스트 보기' : '캘린더 보기'}
      </button>
    </div>
  );

  if (currentWorkView === 'list') {
    return (
      <div className="page-stack worker-work-list-page">
        {viewSwitch}
        <Panel
          action={
            <button className="secondary-button" onClick={() => downloadWorkListCsv(filteredWorkerWorkRecords)} type="button">
              <Download size={16} />
              엑셀 다운로드
            </button>
          }
          title="전체 작업 리스트"
        >
          <RecordToolbar
            action={
              <button className="primary-button" onClick={() => setIsWorkRegistrationOpen(true)} type="button">
                <Plus size={16} />
                예외 작업 등록
              </button>
            }
            count={`총 ${filteredWorkerWorkRecords.length}건`}
            filters={
              <div className="work-list-filter wide">
                <button className={workListFilter === 'all' ? 'selected' : ''} onClick={() => setWorkListFilter('all')} type="button">
                  전체
                </button>
                <button className={workListFilter === 'scheduled' ? 'selected' : ''} onClick={() => setWorkListFilter('scheduled')} type="button">
                  예정
                </button>
                <button className={workListFilter === 'active' ? 'selected' : ''} onClick={() => setWorkListFilter('active')} type="button">
                  진행
                </button>
                <button className={workListFilter === 'done' ? 'selected' : ''} onClick={() => setWorkListFilter('done')} type="button">
                  완료
                </button>
              </div>
            }
            search={
              <SearchInput
                label="작업 검색"
                listId="worker-work-list-search"
                onChange={setWorkListQuery}
                placeholder="날짜, 고객, 차량, 견적서 작성자, 상태 검색"
                suggestions={workListSuggestions}
                value={workListQuery}
              />
            }
          />
          <div className="work-list-advanced-filters">
            <label>
              <span>작업 기간</span>
              <input onChange={(event) => setWorkDateFrom(event.target.value)} type="date" value={workDateFrom} />
            </label>
            <label>
              <span>~</span>
              <input onChange={(event) => setWorkDateTo(event.target.value)} type="date" value={workDateTo} />
            </label>
            <label>
              <span>필터 컬럼</span>
              <select
                onChange={(event) => {
                  setWorkColumnFilterDraftKey(event.target.value as WorkColumnFilterKey);
                  setWorkColumnFilterDraftValue('');
                }}
                value={workColumnFilterDraftKey}
              >
                {WORK_COLUMN_FILTER_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>값 선택</span>
              <input
                list="work-column-filter-values"
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setWorkColumnFilterDraftValue(nextValue);
                  if (workColumnFilterValues.includes(nextValue)) {
                    addWorkColumnFilter(nextValue);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  addWorkColumnFilter();
                }}
                placeholder="값 검색 후 선택"
                value={workColumnFilterDraftValue}
              />
              <datalist id="work-column-filter-values">
                {workColumnFilterValues.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </label>
            <button className="secondary-button" onClick={() => addWorkColumnFilter()} type="button">
              필터 추가
            </button>
            <button
              className="secondary-button"
              onClick={resetWorkFilters}
              type="button"
            >
              필터 초기화
            </button>
            {workColumnFilters.length > 0 ? (
              <div className="work-active-filters" aria-label="적용된 필터">
                {workColumnFilters.map((filter) => {
                  const option = WORK_COLUMN_FILTER_OPTIONS.find((item) => item.key === filter.key);

                  return (
                    <button key={filter.id} onClick={() => removeWorkColumnFilter(filter.id)} type="button">
                      <span>{option?.label ?? filter.key}</span>
                      <strong>{filter.value}</strong>
                      <X size={13} />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <SortableWorkListTable
            onOpen={openWorkRecord}
            onSort={handleWorkSort}
            records={visibleWorkerWorkRecords}
            sortDirection={workSortDirection}
            sortKey={workSortKey}
          />
          <div className="work-list-pagination-row">
            <div className="page-size-control" aria-label="페이지당 보기">
              {WORK_PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  className={workPageSize === size ? 'selected' : ''}
                  key={size}
                  onClick={() => handleWorkPageSizeChange(size)}
                  type="button"
                >
                  {size}개
                </button>
              ))}
            </div>
            <PaginationControls currentPage={workListPage} onChange={handleWorkListPageChange} totalPages={workListTotalPages} />
          </div>
        </Panel>

        {selectedWorkRecord ? (
          <WorkRecordDetailDrawer
            onClose={closeWorkRecord}
            onComplete={(order) => {
              closeWorkRecord();
              setCompletionOrder(order);
            }}
            onSave={saveWorkRecord}
            record={selectedWorkRecord}
            vehicleModelSuggestions={vehicleModelSuggestions}
          />
        ) : null}

        {completionOrder ? <WorkCompletionDrawer order={completionOrder} onClose={() => setCompletionOrder(null)} /> : null}

        {isWorkRegistrationOpen ? (
          <WorkListRegistrationDrawer
            onClose={() => setIsWorkRegistrationOpen(false)}
            onSave={registerWorkRecord}
            vehicleModelSuggestions={vehicleModelSuggestions}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="page-stack">
      {viewSwitch}
      <section className="work-calendar-layout">
      <section className="panel work-calendar-panel">
        <div className="panel-body">
        <div className="calendar-toolbar">
          <div>
            <strong>2026년 5월</strong>
            <div className="calendar-summary">
              <span>오늘 작업 {currentDayWorkRecords.length}건</span>
              <span>작업 {calendarWorkRecords.length}건</span>
              <span>작업 카드는 길게 선택해 이동</span>
            </div>
          </div>
          <div className="calendar-actions">
            <div className="calendar-view-tabs" role="tablist" aria-label="일정 보기">
              {CALENDAR_VIEWS.map((view) => (
                <button
                  aria-selected={calendarView === view.id}
                  className={calendarView === view.id ? 'selected' : ''}
                  key={view.id}
                  onClick={() => handleCalendarViewChange(view.id)}
                  role="tab"
                  type="button"
                >
                  {view.label}
                </button>
              ))}
            </div>
            <div className="calendar-register-actions">
              <button className="primary-button" onClick={() => setIsWorkRegistrationOpen(true)} type="button">
                <Plus size={16} />
                예외 작업 등록
              </button>
            </div>
          </div>
        </div>

        {calendarView === 'day' ? (
          <div className="calendar-day-view">
            {WORK_DAY_TIME_SLOTS.map(
              (slot) => {
                const slotRecords = currentDayWorkRecords.filter((record) => record.time.startsWith(slot.slice(0, 2)));
                return (
                  <article
                    className={`calendar-time-row calendar-drop-target ${slotRecords.length > 0 ? 'has-job' : ''} ${
                      draggedWorkRecordId ? 'drag-ready' : ''
                    }`}
                    key={slot}
                    onDragOver={(event) => {
                      if (!draggedWorkRecordId) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(event) => handleWorkScheduleDrop(currentCalendarDate, slot, `${currentCalendarDate} ${slot}`, event)}
                  >
                    <time>{slot}</time>
                    <div className="calendar-time-cell">
                      {slotRecords.map((record) => (
                        <CalendarJob
                          draggable
                          entry={record.entry}
                          isDragging={draggedWorkRecordId === record.id}
                          key={record.id}
                          onDragEnd={() => setDraggedWorkRecordId(null)}
                          onDragStart={(event) => handleWorkScheduleDragStart(record, event)}
                          onSelect={() => openCalendarWorkRecord(record)}
                          selected={selectedCalendarRecord?.id === record.id}
                          status={resolveWorkRuntimeStatus(record, workRuntimeNow)}
                        />
                      ))}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        ) : null}

        {calendarView === 'week' ? (
          <div className="calendar-week-view">
            {weekCalendarCells.map((day) => (
              <article
                className={`calendar-day-column calendar-drop-target ${draggedWorkRecordId ? 'drag-ready' : ''}`}
                key={`${day.day}-${day.date}`}
                onDragOver={(event) => {
                  if (!draggedWorkRecordId) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => handleWorkScheduleDrop(day.fullDate, null, `${day.fullDate} 기존 시간`, event)}
              >
                <header>
                  <span>{day.day}</span>
                  <strong>{day.date}</strong>
                </header>
                <div className="calendar-day-jobs">
                  {day.records.length > 0 ? (
                    day.records.map((record) => (
                      <CalendarJob
                        compact
                        draggable
                        entry={record.entry}
                        isDragging={draggedWorkRecordId === record.id}
                        key={`${day.date}-${record.id}`}
                        onDragEnd={() => setDraggedWorkRecordId(null)}
                        onDragStart={(event) => handleWorkScheduleDragStart(record, event)}
                        onSelect={() => openCalendarWorkRecord(record)}
                        selected={selectedCalendarRecord?.id === record.id}
                        status={resolveWorkRuntimeStatus(record, workRuntimeNow)}
                      />
                    ))
                  ) : (
                    <span className="calendar-empty">일정 없음</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {calendarView === 'month' ? (
          <div className="calendar-month-view">
            {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
              <div className="calendar-weekday" key={day}>{day}</div>
            ))}
            {monthCells.map((cell) => (
              <article
                className={`calendar-month-cell calendar-drop-target ${cell.date === '20' ? 'today' : ''} ${
                  !cell.fullDate ? 'empty' : ''
                } ${cell.fullDate && normalizeWorkDate(cell.fullDate) === selectedCalendarDateKey ? 'selected' : ''} ${
                  draggedWorkRecordId && cell.fullDate ? 'drag-ready' : ''
                }`}
                key={cell.key}
                onClick={() => {
                  if (!cell.fullDate) return;
                  selectCalendarDate(cell.fullDate);
                }}
                onDragOver={(event) => {
                  if (!draggedWorkRecordId || !cell.fullDate) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                  if (!cell.fullDate) return;
                  handleWorkScheduleDrop(cell.fullDate, null, `${cell.fullDate} 기존 시간`, event);
                }}
              >
                <time>{cell.date}</time>
                  {cell.records.slice(0, 2).map((record) => (
                  <CalendarJob
                    mini
                    draggable
                    entry={record.entry}
                    isDragging={draggedWorkRecordId === record.id}
                    key={`${cell.key}-${record.id}`}
                    onDragEnd={() => setDraggedWorkRecordId(null)}
                    onDragStart={(event) => handleWorkScheduleDragStart(record, event)}
                    onSelect={() => openCalendarWorkRecord(record)}
                    selected={selectedCalendarRecord?.id === record.id}
                    status={resolveWorkRuntimeStatus(record, workRuntimeNow)}
                  />
                ))}
                {cell.records.length > 2 ? (
                  <span className="calendar-more">+{cell.records.length - 2}</span>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        {calendarView === 'year' ? (
          <div className="calendar-year-view">
            {YEAR_CALENDAR.map(([month, count, detail]) => {
              const monthKey = workMonthKeyFromLabel(month);

              return (
              <button className={selectedCalendarMonthKey === monthKey ? 'selected' : ''} key={month} onClick={() => selectCalendarMonth(month)} type="button">
                <strong>{month}</strong>
                <span>{count}</span>
                <small>{detail}</small>
              </button>
              );
            })}
          </div>
        ) : null}
        </div>
      </section>

      <Panel
        action={
          showCalendarPanelList ? (
            <span className="work-panel-count">{calendarPanelListRecords.length}건</span>
          ) : selectedCalendarRecord ? (
            <div className={`work-detail-panel-actions ${calendarUsesScopedList ? 'with-back' : ''}`}>
              {calendarUsesScopedList ? (
                <button className="text-button work-detail-back-button" onClick={returnToCalendarPanelList} type="button">
                  <ChevronLeft size={16} />
                  목록
                </button>
              ) : null}
              {selectedCalendarRuntimeStatus ? (
                <StatusPill label={selectedCalendarRuntimeStatus} tone={statusTone(selectedCalendarRuntimeStatus)} />
              ) : null}
            </div>
          ) : undefined
        }
        className="work-detail-panel"
        title={showCalendarPanelList ? calendarPanelListTitle : '작업 상세 내용'}
      >
        {showCalendarPanelList ? (
          <CalendarWorkRecordList
            onOpen={openCalendarWorkRecord}
            records={calendarPanelListRecords}
            runtimeNow={workRuntimeNow}
            scopeLabel={calendarPanelListTitle}
          />
        ) : selectedCalendarRecord ? (
          <WorkRecordInlineDetailPanel
            onComplete={(order) => setCompletionOrder(order)}
            record={selectedCalendarRecord}
          />
        ) : (
          <div className="empty-state">
            <strong>작업 일정이 없습니다.</strong>
            <span>선택 가능한 작업이 등록되면 여기에 표시됩니다.</span>
          </div>
        )}
      </Panel>
      </section>

      <section className="workbench-grid">
        <Panel
          action={<span className={`work-panel-count ${completionPendingRecords.length > 0 ? 'danger' : ''}`}>{completionPendingRecords.length}건</span>}
          className="span-7"
          title="선택한 작업 처리"
        >
          <WorkCompletionPendingList
            onComplete={(record) => {
              if (record.entry.kind !== 'work') return;
              setCompletionOrder(record.entry.order);
            }}
            onOpen={openCalendarWorkRecord}
            records={completionPendingRecords}
          />
        </Panel>

        <Panel className="span-5" title="현장 메모">
          <div className="memo-card">
            <Clock3 size={18} />
            <div>
              <strong>14:30 출장 전 확인</strong>
              <p>스타리아 후면유리 열선 타입. 대성모터스 담당자 도착 전 연락 필요.</p>
            </div>
          </div>
        </Panel>
      </section>

      {completionOrder ? (
        <WorkCompletionDrawer order={completionOrder} onClose={() => setCompletionOrder(null)} />
      ) : null}

      {isWorkRegistrationOpen ? (
        <WorkListRegistrationDrawer
          onClose={() => setIsWorkRegistrationOpen(false)}
          onSave={registerWorkRecord}
          vehicleModelSuggestions={vehicleModelSuggestions}
        />
      ) : null}

      {pendingScheduleMove ? (
        <CompletedWorkScheduleMoveDialog
          request={pendingScheduleMove}
          onCancel={() => setPendingScheduleMove(null)}
          onConfirm={confirmPendingScheduleMove}
        />
      ) : null}
    </div>
  );
}

function CompletedWorkScheduleMoveDialog({
  request,
  onCancel,
  onConfirm,
}: {
  request: WorkScheduleMoveRequest;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        aria-labelledby="completed-work-move-title"
        aria-modal="true"
        className="customer-modal schedule-move-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">일정 변경 확인</p>
            <h2 id="completed-work-move-title">완료된 작업입니다. 일정을 변경할까요?</h2>
          </div>
          <button className="ghost-button" onClick={onCancel} title="닫기" type="button">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">
          <div className="schedule-move-summary">
            <InfoItem icon={Wrench} label="작업" value={request.record.title} />
            <InfoItem icon={Car} label="차량" value={`${request.record.customer} · ${request.record.vehicle}`} />
            <InfoItem icon={Clock3} label="현재 일정" value={`${request.record.date} ${request.record.time}`} />
            <InfoItem icon={CalendarDays} label="변경 일정" value={`${request.nextDate} ${request.nextTime}`} />
          </div>
          <p className="helper-text">완료된 작업의 일정 변경은 장부, 보증서, 결제 기록과 맞지 않을 수 있어 한 번 더 확인합니다.</p>
        </div>
        <footer className="modal-footer">
          <button className="secondary-button" onClick={onCancel} type="button">
            취소
          </button>
          <button className="primary-button" onClick={onConfirm} type="button">
            일정변경
          </button>
        </footer>
      </section>
    </div>
  );
}

function CalendarWorkRecordList({
  records,
  runtimeNow,
  scopeLabel,
  onOpen,
}: {
  records: WorkerWorkListRecord[];
  runtimeNow: WorkRuntimeNow;
  scopeLabel: string;
  onOpen: (record: WorkerWorkListRecord) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="empty-state">
        <strong>작업 일정이 없습니다.</strong>
        <span>{scopeLabel}에 등록된 작업이 없습니다.</span>
      </div>
    );
  }

  return (
    <div className="calendar-panel-work-list">
      {records.map((record) => {
        const runtimeStatus = resolveWorkRuntimeStatus(record, runtimeNow);

        return (
          <button className="calendar-panel-work-item" key={record.id} onClick={() => onOpen(record)} type="button">
            <time>{formatWorkDateTimeLabel(record)}</time>
            <div>
              <div className="row-title">
                <strong>{record.title}</strong>
                <StatusPill label={runtimeStatus} tone={statusTone(runtimeStatus)} />
              </div>
              <p>{record.customer} · {record.vehicle}</p>
              <div className="meta-line">
                <span>{record.owner}</span>
                <span>{record.stock}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function WorkCompletionPendingList({
  records,
  onOpen,
  onComplete,
}: {
  records: WorkerWorkListRecord[];
  onOpen: (record: WorkerWorkListRecord) => void;
  onComplete: (record: WorkerWorkListRecord) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="empty-state compact">
        <strong>완료대기 작업이 없습니다.</strong>
        <span>작업 완료 후 정산과 부품 차감으로 이어집니다.</span>
      </div>
    );
  }

  return (
    <div className="completion-pending-list">
      {records.map((record) => (
        <article className="completion-pending-item" key={record.id}>
          <time>{formatWorkDateTimeLabel(record)}</time>
          <div>
            <div className="row-title">
              <strong>{record.title}</strong>
              <StatusPill label="완료대기" tone="red" />
            </div>
            <p>{record.customer} · {record.vehicle} · {record.stock}</p>
            <div className="work-item-actions">
              <button onClick={() => onOpen(record)} type="button">상세</button>
              <button onClick={() => onComplete(record)} type="button">완료 처리</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function WorkRecordInlineDetailPanel({
  record,
  onComplete,
}: {
  record: WorkerWorkListRecord;
  onComplete: (order: WorkOrder) => void;
}) {
  const workEntry = record.kind === '작업' && record.entry.kind === 'work' ? record.entry : null;
  const isWorkRecord = workEntry !== null;
  const visit = workEntry?.order.visit ?? '방문';
  const { address } = parseWorkLocation(record.location, visit);
  const detailTitle = isWorkRecord ? record.title : record.customer;
  const detailMemo = isWorkRecord ? '작업 전 고객 연락 및 부품 확인' : record.title;
  const scheduleLabel = isWorkRecord ? `${record.date} ${visit} ${record.time}` : `${record.date} ${record.time}`;

  return (
    <article className="work-inline-detail">
      <div className="work-inline-heading">
        <div>
          <span>{isWorkRecord ? '선택 작업' : '선택 일정'}</span>
          <strong>{detailTitle}</strong>
        </div>
      </div>

      <div className="work-inline-summary">
        <InfoItem icon={Clock3} label="일시" value={scheduleLabel} />
        <InfoItem icon={UserRound} label={isWorkRecord ? '고객' : '제목'} value={record.customer} />
        <InfoItem icon={Car} label="차량" value={record.vehicle} />
        <InfoItem icon={Wrench} label="작업자" value={record.owner} />
        <InfoItem icon={MapPin} label={isWorkRecord ? '주소/위치' : '분류'} value={address} />
        <InfoItem icon={Package} label="사용 부품" value={record.stock} />
      </div>

      <div className="work-inline-section">
        <span>{isWorkRecord ? '작업내용' : '상세 내용'}</span>
        <p>{record.title}</p>
      </div>

      <div className="work-inline-section">
        <span>메모</span>
        <p>{detailMemo}</p>
      </div>

      {workEntry ? (
        <div className="work-inline-ledger">
          <div>
            <span>보험청구액</span>
            <strong>{formatWorkLedgerAmount(record.insuranceClaimAmount)}</strong>
          </div>
          <div>
            <span>보험입금액</span>
            <strong>{formatWorkLedgerAmount(record.insurancePaidAmount)}</strong>
          </div>
          <div>
            <span>결제금액</span>
            <strong>{formatWorkLedgerAmount(record.paymentAmount)}</strong>
          </div>
          <div>
            <span>결제여부</span>
            <strong className={record.paymentStatus === 'Y' ? 'payment-status-y' : ''}>{record.paymentStatus}</strong>
          </div>
        </div>
      ) : null}

      {workEntry ? (
        <div className="work-inline-actions">
          <button className="primary-button" disabled={record.status === '완료'} onClick={() => onComplete(workEntry.order)} type="button">
            <CheckCircle2 size={16} />
            작업 완료 처리
          </button>
          <button className="secondary-button" type="button">
            <ReceiptText size={16} />
            연결 견적
          </button>
          <button className="secondary-button" type="button">
            <Camera size={16} />
            자료 첨부
          </button>
        </div>
      ) : null}
    </article>
  );
}

function formatWorkLedgerAmount(value: number) {
  return value > 0 ? value.toLocaleString('ko-KR') : '-';
}

function parseWorkAmountInput(value: string) {
  return parseMoneyInputValue(value);
}

function formDataText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeWorkDate(value: string) {
  const [rawYear, rawMonth, rawDay] = value.split(/[.-]/).map((part) => part.trim());
  if (!rawYear || !rawMonth || !rawDay) return '';

  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year.padStart(4, '0')}-${rawMonth.padStart(2, '0')}-${rawDay.padStart(2, '0')}`;
}

const WORK_COMPLETION_WAIT_MINUTES = 90;

function createWorkRuntimeNow(dateKey: string): WorkRuntimeNow {
  const now = new Date();
  return {
    dateKey,
    minutes: now.getHours() * 60 + now.getMinutes(),
  };
}

function workTimeToMinutes(value: string) {
  const [rawHour, rawMinute] = value.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

function resolveWorkRuntimeStatus(record: WorkerWorkListRecord, runtimeNow: WorkRuntimeNow): WorkRuntimeStatus {
  if (record.status === '완료' || record.status === '보류') return record.status;

  const recordDateKey = normalizeWorkDate(record.date);
  if (!recordDateKey) return record.status;
  if (recordDateKey > runtimeNow.dateKey) return '예정';
  if (recordDateKey < runtimeNow.dateKey) return '완료대기';

  const startMinutes = workTimeToMinutes(record.time);
  if (runtimeNow.minutes < startMinutes) return '예정';
  if (runtimeNow.minutes >= startMinutes + WORK_COMPLETION_WAIT_MINUTES) return '완료대기';
  return '진행중';
}

function workMonthKeyFromDate(value: string) {
  return normalizeWorkDate(value).slice(0, 7) || '2026-05';
}

function workMonthKeyFromLabel(label: string) {
  const month = Number(label.replace(/[^\d]/g, ''));
  return `2026-${String(month || 5).padStart(2, '0')}`;
}

function formatWorkDateScopeLabel(dateKey: string) {
  const [, rawMonth, rawDay] = dateKey.split('-');
  const month = Number(rawMonth);
  const day = Number(rawDay);
  if (!month || !day) return '선택 날짜';
  return `${month}월 ${day}일`;
}

function formatWorkMonthScopeLabel(monthKey: string) {
  const [, rawMonth] = monthKey.split('-');
  const month = Number(rawMonth);
  return month ? `${month}월` : '선택 월';
}

function formatWorkDateTimeLabel(record: WorkerWorkListRecord) {
  const dateKey = normalizeWorkDate(record.date);
  return dateKey ? `${formatWorkDateScopeLabel(dateKey)} ${record.time}` : `${record.date} ${record.time}`;
}

function isAutoLinkedWorkRecord(record: WorkerWorkListRecord) {
  return record.id.startsWith('estimate-work-') || record.id.startsWith('custom-');
}

function cardBrandLabel(cardCompany: string, customCardCompany = '') {
  const label = cardCompany === '기타' ? customCardCompany.trim() : cardCompany.trim();
  return (label || '카드').replace(/카드$/u, '');
}

function workPaymentMethodLabel(payment: WorkPaymentEntry) {
  if (payment.method === '카드') return cardBrandLabel(payment.cardCompany, payment.customCardCompany);
  const bankName = payment.bankName === '기타' ? payment.customBankName : payment.bankName;
  return bankName.trim() || payment.method;
}

function resolveWorkRecordPaymentStatus(record: WorkerWorkListRecord): PaymentScheduleStatus {
  if (record.paymentAmount <= 0) return '결제예정';
  const paidAmount = sumWorkPayments(record.payments);
  if (paidAmount >= record.paymentAmount) return '결제완료';
  if (paidAmount > 0) return '부분결제';
  return '결제예정';
}

function workRecordsToPaymentScheduleItems(records: WorkerWorkListRecord[]): PaymentScheduleItem[] {
  return records
    .filter((record) => isAutoLinkedWorkRecord(record) && record.paymentAmount > 0)
    .map((record): PaymentScheduleItem => {
      const status = resolveWorkRecordPaymentStatus(record);
      return {
        id: `work-payment-${record.id}`,
        date: normalizePaymentDate(record.date),
        partner: record.customer,
        item: record.title,
        amount: record.paymentAmount,
        paidAmount: Math.min(record.paymentAmount, sumWorkPayments(record.payments)),
        status,
        method: summarizeValues(record.payments.map(workPaymentMethodLabel), 1),
        source: '작업 자동등록',
        memo: `${record.vehicle} ${record.plateNumber} · ${record.owner}`,
      };
    });
}

function workRecordsToPaymentListSourceItems(records: WorkerWorkListRecord[]): PaymentListSourceItem[] {
  return records
    .filter((record) => isAutoLinkedWorkRecord(record) && record.paymentAmount > 0)
    .map((record): PaymentListSourceItem => {
      const normalizedDate = normalizeWorkDate(record.date);
      const monthKey = monthKeyFromDate(normalizedDate) || '2026.05';
      const status = resolveWorkRecordPaymentStatus(record);
      return {
        id: `work-payment-list-${record.id}`,
        baseMonth: monthKey,
        paymentMonth: monthKey,
        dueDate: normalizePaymentDate(record.date),
        variability: '변동',
        category: record.division || '작업',
        partner: record.customer,
        bank: summarizeValues(record.payments.map((payment) => payment.method), 1),
        accountNumber: summarizeValues(record.payments.map(workPaymentMethodLabel), 1),
        amount: record.paymentAmount,
        paidAmount: Math.min(record.paymentAmount, sumWorkPayments(record.payments)),
        invoiceIssued: false,
        status,
        source: '작업',
        memo: `${record.title} · ${record.vehicle} ${record.plateNumber}`,
      };
    });
}

function cardSettlementDateFromWorkDate(value: string) {
  const normalizedDate = normalizeWorkDate(value);
  if (!normalizedDate) return normalizePaymentDate(value);
  const [year = '2026', month = '01', day = '01'] = normalizedDate.split('-');
  return `${year.slice(2)}.${month}.${day}`;
}

function workRecordsToCardSettlements(records: WorkerWorkListRecord[]): CardSettlement[] {
  return records
    .filter((record) => isAutoLinkedWorkRecord(record))
    .flatMap((record) =>
      record.payments
        .filter((payment) => payment.method === '카드' && parseWorkAmountInput(payment.amount) > 0)
        .map((payment, index): CardSettlement => {
          const amount = parseWorkAmountInput(payment.amount);
          const feeRate = '1.30%';
          return {
            date: cardSettlementDateFromWorkDate(record.date),
            brand: cardBrandLabel(payment.cardCompany, payment.customCardCompany),
            vehicle: record.vehicle,
            plate: record.plateNumber,
            amount,
            paid: Math.round(amount * 0.987),
            feeRate,
            status: record.paymentStatus === 'Y' ? '자동등록' : '입력확인',
            tone: record.paymentStatus === 'Y' ? 'blue' : 'orange',
            source: `${record.customer} · ${record.title}${index > 0 ? ` #${index + 1}` : ''}`,
          };
        }),
    );
}

function createEstimateWorkRecordFromFormData(formData: FormData, autoCreateWork: boolean): WorkerWorkListRecord | null {
  const workDate = formDataText(formData, 'scheduledWorkDate');
  if (!autoCreateWork || !workDate) return null;

  const paymentAmountText = formDataText(formData, 'paymentAmount');
  const paymentAmount = parseWorkAmountInput(paymentAmountText);
  const paymentMethod = formDataText(formData, 'paymentMethod');
  const isCardPayment = paymentMethod === '카드';
  const isAccountPayment = paymentMethod === '계좌' || paymentMethod === '계좌이체';
  const cardCompany = formDataText(formData, 'cardCompany') || CARD_COMPANY_OPTIONS[0] || '';
  const owner = formDataText(formData, 'scheduledTechnician') || formDataText(formData, 'estimatorName') || ESTIMATOR_OPTIONS[0] || '';
  const visit = (formDataText(formData, 'scheduledVisit') as WorkVisitType) || '방문';
  const repairArea = formDataText(formData, 'repairArea');
  const workType = formDataText(formData, 'workType');
  const finalContent = formDataText(formData, 'finalEstimateContent');
  const estimateContent = formDataText(formData, 'estimateContent');
  const claimType = formDataText(formData, 'claimType') || '일반';
  const plateNumber = formDataText(formData, 'plateNumber') || '-';
  const title =
    finalContent ||
    [workType, repairArea].filter(Boolean).join(' ') ||
    estimateContent ||
    '견적 연결 작업';
  const payments: WorkPaymentEntry[] =
    paymentAmount > 0 && (isCardPayment || isAccountPayment)
      ? [
          {
            ...createEmptyWorkPaymentEntry(0, String(paymentAmount)),
            method: isCardPayment ? '카드' : '계좌이체',
            cardCompany,
          },
        ]
      : [];
  const draft: WorkRegistrationFormDraft = {
    date: workDate,
    visit: WORK_VISIT_OPTIONS.includes(visit) ? visit : '방문',
    time: formDataText(formData, 'scheduledWorkTime') || '시간 미정',
    division: claimType === '일반' ? '일반' : '보험',
    company: formDataText(formData, 'tradeType') || claimType,
    customer: formDataText(formData, 'customer') || '-',
    vehicle: formDataText(formData, 'vehicle') || '-',
    plateNumber,
    title,
    stock: formDataText(formData, 'partNo') || '-',
    insuranceClaimAmount: formDataText(formData, 'insuranceClaimAmount'),
    insurancePaidAmount: '',
    paymentAmount: paymentAmountText,
    paymentStatus: paymentAmount > 0 && payments.length > 0 ? 'Y' : 'N',
    status: '예정',
    owner,
    address: draftAddressFromVisit(WORK_VISIT_OPTIONS.includes(visit) ? visit : '방문'),
  };
  const record = createWorkRecordFromRegistrationDraft(draft);

  return {
    ...record,
    id: `estimate-work-${Date.now()}`,
    payments,
    paymentStatus: resolveWorkPaymentStatus(paymentAmount, payments),
  };
}

function draftAddressFromVisit(visit: WorkVisitType) {
  return visit === '방문' ? '경남차유리 작업장' : `${visit}지 미정`;
}

function getWorkColumnFilterValue(record: WorkerWorkListRecord, key: WorkColumnFilterKey) {
  if (key === 'visit') return record.entry.kind === 'work' ? record.entry.order.visit : record.division;

  return String(record[key] ?? '');
}

function getInventoryColumnFilterValue(item: InventoryItem, key: InventoryColumnFilterKey) {
  if (key === 'stockQty') return item.stockQty || `${item.stock}`;

  return String(item[key] ?? '');
}

function getInventoryQuantity(value: string) {
  return parseMoneyInputValue(value);
}

function getInventoryStockQuantity(item: InventoryItem) {
  return getInventoryQuantity(item.stockQty || `${item.stock}`);
}

function hasInventoryValue(value: string) {
  return value.trim().length > 0;
}

function inventoryMatchesSearch(item: InventoryItem, search: InventorySearchState) {
  const codeQuery = search.code.trim().toLowerCase();
  const nameQuery = search.name.trim().toLowerCase();
  const specQuery = search.spec.trim().toLowerCase();
  const noteQuery = search.note.trim().toLowerCase();
  const stockQty = getInventoryStockQuantity(item);
  const inboundQty = getInventoryQuantity(item.inboundQty);
  const outboundQty = getInventoryQuantity(item.outboundQty);
  const hasInboundPrice = hasInventoryValue(item.inboundPrice);
  const hasOutboundPrice = hasInventoryValue(item.outboundPrice);
  const hasExchangePrice = hasInventoryValue(item.exchangePrice);
  const priceAndNoteText = [item.note, item.inboundPrice, item.outboundPrice, item.exchangePrice].join(' ').toLowerCase();
  const matchesText =
    (codeQuery.length === 0 || item.partNo.toLowerCase().includes(codeQuery)) &&
    (nameQuery.length === 0 || item.name.toLowerCase().includes(nameQuery)) &&
    (specQuery.length === 0 || item.spec.toLowerCase().includes(specQuery)) &&
    (noteQuery.length === 0 || priceAndNoteText.includes(noteQuery));
  const matchesStock =
    search.stock === 'all' ||
    (search.stock === 'hasStock' && stockQty > 0) ||
    (search.stock === 'emptyStock' && stockQty === 0) ||
    (search.stock === 'negativeStock' && stockQty < 0);
  const matchesMovement =
    search.movement === 'all' ||
    (search.movement === 'inbound' && inboundQty !== 0) ||
    (search.movement === 'outbound' && outboundQty !== 0) ||
    (search.movement === 'changed' && (inboundQty !== 0 || outboundQty !== 0)) ||
    (search.movement === 'noMovement' && inboundQty === 0 && outboundQty === 0);
  const matchesPrice =
    search.price === 'all' ||
    (search.price === 'hasInboundPrice' && hasInboundPrice) ||
    (search.price === 'hasOutboundPrice' && hasOutboundPrice) ||
    (search.price === 'hasExchangePrice' && hasExchangePrice) ||
    (search.price === 'missingPrice' && !hasInboundPrice && !hasOutboundPrice && !hasExchangePrice);

  return matchesText && matchesStock && matchesMovement && matchesPrice;
}

function sortInventoryItems(items: InventoryItem[], sort: InventorySort) {
  return [...items].sort((left, right) => {
    if (sort === 'nameAsc') return left.name.localeCompare(right.name, 'ko-KR');
    if (sort === 'stockDesc') return getInventoryStockQuantity(right) - getInventoryStockQuantity(left);
    if (sort === 'stockAsc') return getInventoryStockQuantity(left) - getInventoryStockQuantity(right);
    if (sort === 'inboundDesc') return getInventoryQuantity(right.inboundQty) - getInventoryQuantity(left.inboundQty);
    if (sort === 'outboundDesc') return Math.abs(getInventoryQuantity(right.outboundQty)) - Math.abs(getInventoryQuantity(left.outboundQty));

    return left.partNo.localeCompare(right.partNo, 'ko-KR');
  });
}

function csvCell(value: string | number) {
  const text = String(value).replace(/\r?\n/g, '\n');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadInventoryRows(rows: InventoryItem[]) {
  const headers = ['품목코드', '품목명', '규격', '전일재고', '입고수량', '출고수량', '재고수량', '입고단가', '출고단가', '교환단가', '적요'];
  const csvRows = [
    headers,
    ...rows.map((item) => [
      item.partNo,
      item.name,
      item.spec,
      item.previousQty,
      item.inboundQty,
      item.outboundQty,
      item.stockQty || `${item.stock}`,
      item.inboundPrice,
      item.outboundPrice,
      item.exchangePrice,
      item.note,
    ]),
  ];
  const csv = csvRows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = '재고리스트.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function workPaymentSummary(payments: WorkPaymentEntry[]) {
  return payments
    .filter((payment) => payment.amount.trim().length > 0)
    .map((payment) => {
      const company =
        payment.method === '카드'
          ? payment.cardCompany === '기타' ? payment.customCardCompany : payment.cardCompany
          : payment.bankName === '기타' ? payment.customBankName : payment.bankName;
      return `${payment.method} ${company} ${payment.amount}`;
    })
    .join('\n');
}

function downloadWorkListCsv(records: WorkerWorkListRecord[]) {
  const headers = [
    '작업일',
    '방문방식',
    '시간',
    '구분',
    '업체',
    '거래처',
    '차종',
    '차량번호',
    '작업내용',
    '사용품번',
    '보험청구액',
    '보험입금액',
    '결제금액',
    '결제여부',
    '상태',
    '견적서 작성자',
    '위치',
    '결제정보',
  ];
  const rows = records.map((record) => [
    record.date,
    record.entry.kind === 'work' ? record.entry.order.visit : '',
    record.time,
    record.division,
    record.company,
    record.customer,
    record.vehicle,
    record.plateNumber,
    record.title,
    record.stock,
    record.insuranceClaimAmount,
    record.insurancePaidAmount,
    record.paymentAmount,
    record.paymentStatus,
    record.status,
    record.owner,
    record.location,
    workPaymentSummary(record.payments),
  ]);
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `작업리스트_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createEmptyWorkPaymentEntry(index: number, amount = ''): WorkPaymentEntry {
  return {
    id: `payment-${Date.now()}-${index}`,
    method: '카드',
    amount,
    cardCompany: CARD_COMPANY_OPTIONS[0] ?? '',
    customCardCompany: '',
    bankName: BANK_OPTIONS[0] ?? '',
    customBankName: '',
    accountNumber: '',
    accountHolder: '',
  };
}

function buildInitialWorkPayments(record: Pick<WorkerWorkListRecord, 'paymentAmount' | 'paymentStatus' | 'payments'>) {
  if (record.payments.length > 0) return record.payments;
  if (record.paymentStatus !== 'Y' || record.paymentAmount <= 0) return [createEmptyWorkPaymentEntry(0)];

  return [createEmptyWorkPaymentEntry(0, String(record.paymentAmount))];
}

function sumWorkPayments(payments: WorkPaymentEntry[]) {
  return payments.reduce((sum, payment) => sum + parseWorkAmountInput(payment.amount), 0);
}

function resolveWorkPaymentStatus(paymentAmount: number, payments: WorkPaymentEntry[]) {
  return paymentAmount > 0 && sumWorkPayments(payments) === paymentAmount ? 'Y' : 'N';
}

function createWorkRecordFromRegistrationDraft(draft: WorkRegistrationFormDraft): WorkerWorkListRecord {
  const address = draft.address.trim() || (draft.visit === '방문' ? '경남차유리 작업장' : `${draft.visit}지 미정`);
  const order: WorkOrder = {
    time: draft.time.trim() || '-',
    customer: draft.customer.trim() || '-',
    vehicle: draft.vehicle.trim() || '-',
    repair: draft.title.trim() || '-',
    visit: draft.visit,
    address,
    technician: draft.owner.trim() || ESTIMATOR_OPTIONS[0] || '-',
    status: draft.status,
    stock: draft.stock.trim() || '-',
  };

  return {
    id: `custom-${Date.now()}`,
    date: draft.date.trim() || '2026.05.20',
    time: order.time,
    kind: '작업',
    division: draft.division.trim() || '일반',
    company: draft.company.trim() || '-',
    customer: order.customer,
    vehicle: order.vehicle,
    plateNumber: draft.plateNumber.trim() || '-',
    title: order.repair,
    owner: order.technician,
    location: `${draft.visit} · ${address}`,
    status: draft.status,
    stock: order.stock,
    insuranceClaimAmount: parseWorkAmountInput(draft.insuranceClaimAmount),
    insurancePaidAmount: parseWorkAmountInput(draft.insurancePaidAmount),
    paymentAmount: parseWorkAmountInput(draft.paymentAmount),
    paymentStatus:
      draft.paymentStatus === 'Y' && parseWorkAmountInput(draft.paymentAmount) > 0
        ? 'Y'
        : 'N',
    payments:
      draft.paymentStatus === 'Y' && parseWorkAmountInput(draft.paymentAmount) > 0
        ? [createEmptyWorkPaymentEntry(0, draft.paymentAmount)]
        : [],
    entry: { kind: 'work', order },
  };
}

function WorkLedgerSplitCell({ values, align = 'left' }: { values: string[]; align?: 'left' | 'right' }) {
  return (
    <div className={`work-ledger-split ${align === 'right' ? 'right' : ''}`}>
      {values.map((value, index) => (
        <span key={`${value}-${index}`}>{value}</span>
      ))}
    </div>
  );
}

function WorkPaymentStatusCell({ amount, status }: { amount: number; status: string }) {
  return (
    <div className={`work-ledger-split right work-payment-status ${status === 'Y' ? 'paid' : ''}`}>
      <span>{formatWorkLedgerAmount(amount)}</span>
      <span>{status}</span>
    </div>
  );
}

function workRecordTimeLines(record: WorkerWorkListRecord) {
  const visitType = record.entry.kind === 'work' ? record.entry.order.visit : record.division;
  const normalizedTime = record.time.startsWith(visitType) ? record.time.slice(visitType.length).trim() : record.time;

  return [visitType || '-', normalizedTime || '-'];
}

function SortableWorkListTable({
  records,
  sortKey,
  sortDirection,
  onSort,
  onOpen,
}: {
  records: WorkerWorkListRecord[];
  sortKey: WorkerWorkSortKey;
  sortDirection: SortDirection;
  onSort: (key: WorkerWorkSortKey) => void;
  onOpen: (record: WorkerWorkListRecord) => void;
}) {
  const columns: Array<{ key: WorkerWorkSortKey; label: string; subLabel?: string }> = [
    { key: 'date', label: '작업일' },
    { key: 'time', label: '시간' },
    { key: 'division', label: '구분', subLabel: '업체' },
    { key: 'customer', label: '거래처' },
    { key: 'vehicle', label: '차종', subLabel: '차량번호' },
    { key: 'title', label: '작업내용' },
    { key: 'stock', label: '사용품번' },
    { key: 'insuranceClaimAmount', label: '보험청구액', subLabel: '보험입금액' },
    { key: 'paymentAmount', label: '결제금액', subLabel: '결제여부' },
    { key: 'status', label: '상태' },
  ];

  return (
    <div className="table-wrap sortable-work-table">
      <table>
        <colgroup>
          <col className="work-col-date" />
          <col className="work-col-time" />
          <col className="work-col-division" />
          <col className="work-col-partner" />
          <col className="work-col-vehicle" />
          <col className="work-col-content" />
          <col className="work-col-part" />
          <col className="work-col-money" />
          <col className="work-col-payment" />
          <col className="work-col-status" />
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>
                <button onClick={() => onSort(column.key)} type="button">
                  <span className="work-table-heading">
                    <span>{column.label}</span>
                    {column.subLabel ? <small>{column.subLabel}</small> : null}
                  </span>
                  <span className="sort-indicator">{sortKey === column.key ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr className="clickable-row" key={record.id} onClick={() => onOpen(record)}>
              <td>{record.date}</td>
              <td>
                <WorkLedgerSplitCell values={workRecordTimeLines(record)} />
              </td>
              <td>
                <WorkLedgerSplitCell values={[record.division, record.company]} />
              </td>
              <td>{record.customer}</td>
              <td>
                <WorkLedgerSplitCell values={[record.vehicle, record.plateNumber]} />
              </td>
              <td className="work-ledger-content">{record.title}</td>
              <td>{record.stock}</td>
              <td>
                <WorkLedgerSplitCell
                  align="right"
                  values={[formatWorkLedgerAmount(record.insuranceClaimAmount), formatWorkLedgerAmount(record.insurancePaidAmount)]}
                />
              </td>
              <td>
                <WorkPaymentStatusCell amount={record.paymentAmount} status={record.paymentStatus} />
              </td>
              <td>
                <StatusPill label={record.status} tone={statusTone(record.status)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 ? (
        <div className="empty-state">
          <strong>검색 결과가 없습니다.</strong>
          <span>검색어를 줄이거나 필터를 전체로 변경해보세요.</span>
        </div>
      ) : null}
    </div>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="pagination-controls" aria-label="작업 리스트 페이지">
      <button disabled={currentPage === 1} onClick={() => onChange(currentPage - 1)} type="button">
        이전
      </button>
      {pages.map((page) => (
        <button className={currentPage === page ? 'selected' : ''} key={page} onClick={() => onChange(page)} type="button">
          {page}
        </button>
      ))}
      <button disabled={currentPage === totalPages} onClick={() => onChange(currentPage + 1)} type="button">
        다음
      </button>
    </div>
  );
}

function CalendarJob({
  entry,
  compact = false,
  mini = false,
  draggable = false,
  isDragging = false,
  onDragEnd,
  onDragStart,
  onSelect,
  selected = false,
  status,
}: {
  entry: CalendarEntry;
  compact?: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  mini?: boolean;
  onDragEnd?: () => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onSelect?: () => void;
  selected?: boolean;
  status?: WorkRuntimeStatus;
}) {
  const displayStatus = status ?? entryStatus(entry);
  const tone = statusTone(displayStatus);
  const dragProps = {
    draggable,
    onDragEnd,
    onDragStart,
    title: draggable ? '길게 선택해서 다른 시간이나 날짜로 이동' : undefined,
  };

  if (entry.kind === 'todo') {
    const task = entry.task;

    return (
      <button
        className={`calendar-job todo tone-${tone} ${compact ? 'compact' : ''} ${mini ? 'mini' : ''} ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          onSelect?.();
        }}
        type="button"
        {...dragProps}
      >
        <div className="row-title">
          <strong>{task.title}</strong>
          {!mini ? <StatusPill label={displayStatus} tone={tone} /> : null}
        </div>
        {!mini ? <p>{task.detail}</p> : null}
        <div className="meta-line">
          <span>{task.time}</span>
          <span>{task.category}</span>
          {!compact && !mini ? <span>{task.owner}</span> : null}
        </div>
      </button>
    );
  }

  const { order } = entry;

  return (
    <button
      className={`calendar-job tone-${tone} ${compact ? 'compact' : ''} ${mini ? 'mini' : ''} ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      type="button"
      {...dragProps}
    >
      <div className="row-title">
        <strong>{mini ? order.repair : order.customer}</strong>
        {!mini ? <StatusPill label={displayStatus} tone={tone} /> : null}
      </div>
      {!mini ? <p>{order.repair}</p> : null}
      <div className="meta-line">
        <span>{order.time}</span>
        <span>{order.vehicle}</span>
        {!compact && !mini ? <span>{order.technician}</span> : null}
      </div>
    </button>
  );
}

function resolveCalendarEntry(ref: CalendarEntryRef): CalendarEntry {
  if (ref.kind === 'work') {
    return { kind: 'work', order: workOrders[ref.index]! };
  }

  return { kind: 'todo', task: generalTasks[ref.index]! };
}

function entryTime(entry: CalendarEntry) {
  return entry.kind === 'work' ? entry.order.time : entry.task.time;
}

function entryTitle(entry: CalendarEntry) {
  return entry.kind === 'work' ? entry.order.repair : entry.task.title;
}

function entryStatus(entry: CalendarEntry) {
  return entry.kind === 'work' ? entry.order.status : entry.task.status;
}

function makeWorkerWorkListRecord(entry: CalendarEntry, date: string, id: string): WorkerWorkListRecord {
  if (entry.kind === 'work') {
    const { order } = entry;
    return applyWorkLedgerOverride({
      id,
      date,
      time: order.time,
      kind: '작업',
      division: order.visit === '방문' ? '일반' : '업체',
      company: order.visit,
      customer: order.customer,
      vehicle: order.vehicle,
      plateNumber: '-',
      title: order.repair,
      owner: order.technician,
      location: `${order.visit} · ${order.address}`,
      status: order.status,
      stock: order.stock,
      insuranceClaimAmount: 0,
      insurancePaidAmount: 0,
      paymentAmount: 0,
      paymentStatus: 'N',
      payments: [],
      entry,
    });
  }

  const { task } = entry;
  return applyWorkLedgerOverride({
    id,
    date,
    time: task.time,
    kind: '일반',
    division: task.category,
    company: '-',
    customer: task.title,
    vehicle: '-',
    plateNumber: '-',
    title: task.detail,
    owner: task.owner,
    location: task.category,
    status: task.status,
    stock: '-',
    insuranceClaimAmount: 0,
    insurancePaidAmount: 0,
    paymentAmount: 0,
    paymentStatus: 'N',
    payments: [],
    entry,
  });
}

function applyWorkLedgerOverride(record: WorkerWorkListRecord): WorkerWorkListRecord {
  return {
    ...record,
    ...(WORK_LEDGER_FIELD_OVERRIDES[record.id] ?? {}),
  };
}

function workRecordToDraft(record: WorkerWorkListRecord): WorkRecordDraft {
  const visit = record.entry.kind === 'work' ? record.entry.order.visit : '방문';
  const { address } = parseWorkLocation(record.location, visit);
  const payments = buildInitialWorkPayments(record);

  return {
    date: record.date,
    time: record.time,
    kind: record.kind,
    visit,
    customer: record.customer,
    vehicle: record.vehicle,
    title: record.title,
    owner: record.owner,
    location: record.kind === '작업' ? address : record.location,
    status: record.status,
    stock: record.stock,
    paymentAmount: record.paymentAmount,
    paymentStatus: resolveWorkPaymentStatus(record.paymentAmount, payments),
    payments,
    memo: record.kind === '작업' ? '작업 전 고객 연락 및 부품 확인' : record.title,
  };
}

function isWorkVisitType(value: string): value is WorkVisitType {
  return WORK_VISIT_OPTIONS.includes(value as WorkVisitType);
}

function parseWorkLocation(location: string, fallbackVisit: WorkVisitType = '방문'): Pick<WorkOrder, 'visit' | 'address'> {
  const [visitCandidate, ...addressParts] = location.split('·').map((part) => part.trim()).filter(Boolean);
  const visit = visitCandidate && isWorkVisitType(visitCandidate) ? visitCandidate : fallbackVisit;
  const address = addressParts.length > 0 ? addressParts.join(' · ') : location.trim();

  return {
    visit,
    address: address || (visit === '방문' ? '경남차유리 작업장' : `${visit}지 미정`),
  };
}

function moveWorkRecordSchedule(record: WorkerWorkListRecord, nextDate: string, nextTime: string): WorkerWorkListRecord {
  if (record.entry.kind !== 'work') {
    return {
      ...record,
      date: nextDate,
      time: nextTime,
    };
  }

  const order: WorkOrder = {
    ...record.entry.order,
    time: nextTime,
  };

  return {
    ...record,
    date: nextDate,
    time: nextTime,
    entry: { kind: 'work', order },
  };
}

function applyWorkRecordDraft(record: WorkerWorkListRecord, draft: WorkRecordDraft): WorkerWorkListRecord {
  const paymentStatus = resolveWorkPaymentStatus(draft.paymentAmount, draft.payments);

  if (draft.kind === '작업') {
    const { address } = parseWorkLocation(draft.location, draft.visit);
    const order: WorkOrder = {
      time: draft.time,
      customer: draft.customer,
      vehicle: draft.vehicle,
      repair: draft.title,
      visit: draft.visit,
      address,
      technician: draft.owner,
      status: draft.status,
      stock: draft.stock,
    };

    return {
      ...record,
      date: draft.date,
      time: draft.time,
      kind: '작업',
      customer: draft.customer,
      vehicle: draft.vehicle,
      title: draft.title,
      owner: draft.owner,
      location: `${draft.visit} · ${address}`,
      status: draft.status,
      stock: draft.stock,
      paymentAmount: draft.paymentAmount,
      paymentStatus,
      payments: draft.payments,
      entry: { kind: 'work', order },
    };
  }

  const category = GENERAL_TASK_CATEGORY_OPTIONS.includes(draft.location as GeneralTaskCategory)
    ? (draft.location as GeneralTaskCategory)
    : '일반';
  const task: GeneralTask = {
    time: draft.time,
    title: draft.customer,
    category,
    detail: draft.title,
    owner: draft.owner,
    status: draft.status,
  };

  return {
    ...record,
    date: draft.date,
    time: draft.time,
    kind: '일반',
    customer: draft.customer,
    vehicle: '-',
    title: draft.title,
    owner: draft.owner,
    location: category,
    status: draft.status,
    stock: '-',
    paymentAmount: draft.paymentAmount,
    paymentStatus,
    payments: draft.payments,
    entry: { kind: 'todo', task },
  };
}

function draftToWorkOrder(draft: WorkRecordDraft): WorkOrder {
  const { address } = parseWorkLocation(draft.location, draft.visit);
  return {
    time: draft.time,
    customer: draft.customer,
    vehicle: draft.vehicle,
    repair: draft.title,
    visit: draft.visit,
    address,
    technician: draft.owner,
    status: draft.status,
    stock: draft.stock,
  };
}

type AutoResizeTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
};

function AutoResizeTextarea({ value, onChange, minHeight = 96, className = '', ...props }: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
  }, [minHeight, value]);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
  }

  return (
    <textarea
      {...props}
      ref={textareaRef}
      className={['auto-height-textarea', className].filter(Boolean).join(' ')}
      onChange={handleChange}
      value={value}
    />
  );
}

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim();
  if (/^https?:\/\//i.test(trimmedUrl)) return trimmedUrl;
  return `https://${trimmedUrl}`;
}

function EstimateDetailModal({
  estimate,
  onClose,
  onOpenWorkDraft,
  vehicleSuggestions,
}: {
  estimate: Estimate;
  onClose: () => void;
  onOpenWorkDraft: (estimate: Estimate) => void;
  vehicleSuggestions: VehicleSuggestionSet;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="estimate-detail-title"
        aria-modal="true"
        className={`customer-modal estimate-detail-modal ${isEditing ? 'editing' : ''}`}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">{isEditing ? '견적 수정' : '견적 상세'}</p>
            <h2 id="estimate-detail-title">{estimate.no}</h2>
          </div>
          <button className="ghost-button" onClick={onClose} title="닫기" type="button">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body estimate-detail-modal-body">
          {isEditing ? (
            <EstimateRegistrationPanel
              estimate={estimate}
              onSubmitComplete={onClose}
              submitLabel="저장하기"
              vehicleSuggestions={vehicleSuggestions}
            />
          ) : (
            <>
              <div className="drawer-summary">
                <div>
                  <span>고객</span>
                  <strong>{estimate.customer}</strong>
                </div>
                <div>
                  <span>견적금액</span>
                  <strong>{formatMoney(estimate.amount)}</strong>
                </div>
                <div>
                  <span>상태</span>
                  <StatusPill label={estimate.status} tone={statusTone(estimate.status)} />
                </div>
              </div>

              <FormSection title="기본 정보">
                <div className="detail-fields">
                  <InfoItem icon={UserRound} label="견적 담당자" value={estimate.estimatorName} />
                  <InfoItem icon={Building2} label="거래" value={`${estimate.tradeType} · ${estimate.source}`} />
                  <InfoItem icon={Clock3} label="견적일자" value={estimate.estimateDate} />
                  <InfoItem icon={CreditCard} label="연락처" value={estimate.phone || '미입력'} />
                  <InfoItem icon={Car} label="차량" value={estimate.vehicle} />
                  <InfoItem icon={Wrench} label="수리" value={estimate.repair} />
                  <InfoItem icon={Package} label="부위" value={estimate.area.join(', ')} />
                  <InfoItem icon={Clock3} label="접수" value={estimate.createdAt} />
                </div>
              </FormSection>

            </>
          )}
        </div>

        {!isEditing ? (
          <footer className="modal-footer">
            <button className="secondary-button" onClick={onClose} type="button">
              닫기
            </button>
            <button className="secondary-button" onClick={() => onOpenWorkDraft(estimate)} type="button">
              작업 일정 확인
            </button>
            <button className="primary-button" onClick={() => setIsEditing(true)} type="button">
              수정하기
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  );
}

function WorkListRegistrationDrawer({
  vehicleModelSuggestions,
  onClose,
  onSave,
}: {
  vehicleModelSuggestions: string[];
  onClose: () => void;
  onSave: (draft: WorkRegistrationFormDraft) => void;
}) {
  const [draft, setDraft] = useState<WorkRegistrationFormDraft>({
    date: '2026.05.20',
    visit: '출장',
    time: '11:00 ~ 12:00',
    division: '입고지원',
    company: '오픈링크',
    customer: '',
    vehicle: '',
    plateNumber: '',
    title: '',
    stock: '',
    insuranceClaimAmount: '',
    insurancePaidAmount: '',
    paymentAmount: '',
    paymentStatus: 'N',
    status: '예정',
    owner: ESTIMATOR_OPTIONS[0] ?? '',
    address: '',
  });

  function updateDraft<Key extends keyof WorkRegistrationFormDraft>(key: Key, value: WorkRegistrationFormDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(draft);
  }

  return (
    <DetailDrawer
      eyebrow="예외 작업 등록"
      footer={
        <div className="action-footer">
          <button className="secondary-button" onClick={onClose} type="button">
            닫기
          </button>
          <button className="primary-button" form="work-list-registration-form" type="submit">
            예외 작업 등록
          </button>
        </div>
      }
      onClose={onClose}
      title="작업 리스트 등록"
      variant="modal"
    >
      <form className="estimate-registration-form" id="work-list-registration-form" onSubmit={handleSubmit}>
        <FormSection title="일정">
          <div className="estimate-form-grid">
            <label className="estimate-control">
              <span>작업일</span>
              <input onChange={(event) => updateDraft('date', event.target.value)} value={draft.date} />
            </label>
            <label className="estimate-control">
              <span>방문 방식</span>
              <select onChange={(event) => updateDraft('visit', event.target.value as WorkVisitType)} value={draft.visit}>
                {WORK_VISIT_OPTIONS.map((visit) => (
                  <option key={visit}>{visit}</option>
                ))}
              </select>
            </label>
            <label className="estimate-control">
              <span>시간</span>
              <input onChange={(event) => updateDraft('time', event.target.value)} placeholder="11:00 ~ 12:00" value={draft.time} />
            </label>
            <label className="estimate-control">
              <span>상태</span>
              <select onChange={(event) => updateDraft('status', event.target.value as WorkStatus)} value={draft.status}>
                {WORK_STATUS_OPTIONS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="estimate-control">
              <span>견적서 작성자</span>
              <select onChange={(event) => updateDraft('owner', event.target.value)} value={draft.owner}>
                {ESTIMATOR_OPTIONS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="estimate-control">
              <span>주소/위치</span>
              <input onChange={(event) => updateDraft('address', event.target.value)} value={draft.address} />
            </label>
          </div>
        </FormSection>

        <FormSection title="리스트 항목">
          <div className="estimate-form-grid">
            <label className="estimate-control">
              <span>구분</span>
              <select onChange={(event) => updateDraft('division', event.target.value)} value={draft.division}>
                {WORK_DIVISION_OPTIONS.map((division) => (
                  <option key={division}>{division}</option>
                ))}
              </select>
            </label>
            <label className="estimate-control">
              <span>업체</span>
              <input onChange={(event) => updateDraft('company', event.target.value)} value={draft.company} />
            </label>
            <label className="estimate-control">
              <span>거래처</span>
              <input onChange={(event) => updateDraft('customer', event.target.value)} value={draft.customer} />
            </label>
            <label className="estimate-control">
              <span>차종</span>
              <input list="work-list-registration-vehicle-model-suggestions" onChange={(event) => updateDraft('vehicle', event.target.value)} value={draft.vehicle} />
            </label>
            <label className="estimate-control">
              <span>차량번호</span>
              <input onChange={(event) => updateDraft('plateNumber', event.target.value)} value={draft.plateNumber} />
            </label>
            <label className="estimate-control">
              <span>사용품번</span>
              <input onChange={(event) => updateDraft('stock', event.target.value)} value={draft.stock} />
            </label>
            <label className="estimate-control full">
              <span>작업내용</span>
              <textarea onChange={(event) => updateDraft('title', event.target.value)} value={draft.title} />
            </label>
          </div>
        </FormSection>

        <FormSection title="금액">
          <div className="estimate-form-grid">
            <label className="estimate-control">
              <span>보험청구액</span>
              <input inputMode="numeric" onChange={(event) => updateDraft('insuranceClaimAmount', formatMoneyInputValue(event.target.value))} value={draft.insuranceClaimAmount} />
            </label>
            <label className="estimate-control">
              <span>보험입금액</span>
              <input inputMode="numeric" onChange={(event) => updateDraft('insurancePaidAmount', formatMoneyInputValue(event.target.value))} value={draft.insurancePaidAmount} />
            </label>
            <label className="estimate-control">
              <span>결제금액</span>
              <input inputMode="numeric" onChange={(event) => updateDraft('paymentAmount', formatMoneyInputValue(event.target.value))} value={draft.paymentAmount} />
            </label>
            <label className="estimate-control">
              <span>결제여부</span>
              <select onChange={(event) => updateDraft('paymentStatus', event.target.value)} value={draft.paymentStatus}>
                {PAYMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>
        </FormSection>
      </form>
      <datalist id="work-list-registration-vehicle-model-suggestions">
        {vehicleModelSuggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </DetailDrawer>
  );
}

function WorkRegistrationDrawer({
  estimate,
  onCreateWorkRecord,
  onClose,
  vehicleModelSuggestions,
}: {
  estimate: Estimate;
  onCreateWorkRecord: (record: WorkerWorkListRecord) => void;
  onClose: () => void;
  vehicleModelSuggestions: string[];
}) {
  const initialWorkDate = estimate.scheduledWorkDate?.replace(/\./g, '-') ?? ESTIMATE_DEFAULT_PERIOD_END;
  const [vehicleModel, setVehicleModel] = useState(estimate.vehicle);
  const [plateNumber, setPlateNumber] = useState(estimate.plateNumber);
  const [workDate, setWorkDate] = useState(initialWorkDate);
  const [workTime, setWorkTime] = useState(estimate.scheduledWorkTime ?? '15:00 ~ 15:30');
  const [visitType, setVisitType] = useState<WorkVisitType>(estimate.scheduledVisit ?? '방문');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressSearchResult | null>(null);
  const [isAddressLookupOpen, setIsAddressLookupOpen] = useState(false);
  const [addressLookupQuery, setAddressLookupQuery] = useState('');
  const [estimateContent, setEstimateContent] = useState(estimate.estimateContent);
  const [workContent, setWorkContent] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(formatMoneyInputValue(estimate.paymentAmount ?? estimate.amount));
  const [workPayments, setWorkPayments] = useState<WorkPaymentEntry[]>(() => [createEmptyWorkPaymentEntry(0)]);
  const [saveMessage, setSaveMessage] = useState('');
  const deductibleAmount = estimate.deductibleAmount === undefined ? '-' : formatMoney(estimate.deductibleAmount);
  const tintAmount = estimate.tintAmount === undefined ? '-' : formatMoney(estimate.tintAmount);
  const estimatePaymentAmount = formatMoney(estimate.paymentAmount ?? estimate.amount);
  const paymentTargetAmount = parseWorkAmountInput(paymentAmount);
  const validWorkPayments = useMemo(() => workPayments.filter((payment) => parseWorkAmountInput(payment.amount) > 0), [workPayments]);
  const paymentTotal = sumWorkPayments(validWorkPayments);
  const resolvedPaymentStatus = resolveWorkPaymentStatus(paymentTargetAmount, validWorkPayments);
  const addressCoordinateTitle = selectedAddress
    ? `좌표 ${selectedAddress.latitude.toFixed(6)}, ${selectedAddress.longitude.toFixed(6)}`
    : undefined;
  const workAddressPayload = useMemo(() => {
    const payload: NonNullable<WorkerWorkListRecord['addressPayload']> = {
      roadAddress: address.trim(),
      detailAddress: addressDetail.trim(),
      source: selectedAddress ? 'address-search' : 'manual',
    };
    if (selectedAddress) {
      payload.latitude = selectedAddress.latitude;
      payload.longitude = selectedAddress.longitude;
    }
    return payload;
  }, [address, addressDetail, selectedAddress]);
  const filteredAddressResults = useMemo(() => {
    const normalizedQuery = compactEstimateSearchValue(addressLookupQuery || address);
    if (!normalizedQuery) return ADDRESS_SEARCH_RESULTS;

    return ADDRESS_SEARCH_RESULTS.filter((item) =>
      compactEstimateSearchValue(`${item.placeName} ${item.roadAddress} ${item.jibunAddress} ${item.postalCode ?? ''}`).includes(normalizedQuery),
    );
  }, [address, addressLookupQuery]);

  function updateWorkPaymentDraft<Key extends keyof WorkPaymentEntry>(paymentId: string, key: Key, value: WorkPaymentEntry[Key]) {
    setWorkPayments((current) =>
      current.map((payment) => (payment.id === paymentId ? { ...payment, [key]: value } : payment)),
    );
  }

  function addWorkPaymentEntry() {
    setWorkPayments((current) => [...current, createEmptyWorkPaymentEntry(current.length)]);
  }

  function removeWorkPaymentEntry(paymentId: string) {
    setWorkPayments((current) => (current.length <= 1 ? current : current.filter((payment) => payment.id !== paymentId)));
  }

  function openAddressLookup() {
    setAddressLookupQuery(address);
    setIsAddressLookupOpen(true);
  }

  function selectAddressResult(result: AddressSearchResult) {
    setAddress(result.roadAddress);
    setSelectedAddress(result);
    setIsAddressLookupOpen(false);
  }

  function saveConversionDraft() {
    setSaveMessage(
      workAddressPayload.latitude !== undefined && workAddressPayload.longitude !== undefined
        ? '변경내용이 임시 저장되었습니다. 주소 좌표 포함'
        : '변경내용이 임시 저장되었습니다.',
    );
  }

  function buildWorkConversionRecord() {
    const addressText = [workAddressPayload.roadAddress, workAddressPayload.detailAddress].filter(Boolean).join(' ');
    const title =
      workContent.trim() ||
      estimateContent.trim() ||
      estimate.repair ||
      estimate.area.join(', ') ||
      '견적 연결 작업';
    const draft: WorkRegistrationFormDraft = {
      date: workDate,
      visit: visitType,
      time: workTime || '시간 미정',
      division: estimate.repairType.startsWith('보험') ? '보험' : '일반',
      company: estimate.outsourceType,
      customer: estimate.customer || '-',
      vehicle: vehicleModel || estimate.vehicle || '-',
      plateNumber: plateNumber || estimate.plateNumber || '-',
      title,
      stock: estimate.status === '부품확인' ? '재고확인' : '-',
      insuranceClaimAmount: '',
      insurancePaidAmount: '',
      paymentAmount,
      paymentStatus: resolvedPaymentStatus,
      status: '예정',
      owner: estimate.scheduledTechnician || estimate.estimatorName,
      address: addressText,
    };
    const record = createWorkRecordFromRegistrationDraft(draft);

    return {
      ...record,
      id: `estimate-work-${estimate.no}-${Date.now()}`,
      paymentAmount: paymentTargetAmount,
      paymentStatus: resolvedPaymentStatus,
      payments: validWorkPayments,
      addressPayload: workAddressPayload,
    };
  }

  function convertToWork() {
    onCreateWorkRecord(buildWorkConversionRecord());
    onClose();
  }

  return (
    <DetailDrawer
      eyebrow="견적"
      footer={
        <div className="estimate-work-footer">
          <span>{saveMessage}</span>
          <ActionFooter
            onPrimary={convertToWork}
            onSecondary={saveConversionDraft}
            primaryLabel="작업으로 전환"
            secondaryLabel="변경내용 저장"
          />
        </div>
      }
      onClose={onClose}
      title="작업 전환"
      variant="modal"
    >
      <section className="form-section estimate-work-main-section">
        <div className="estimate-work-grid">
          <label className="estimate-control estimate-work-vehicle">
            <span>차량정보</span>
            <div className="estimate-work-inline-inputs">
              <input
                list="work-registration-vehicle-model-suggestions"
                onChange={(event) => setVehicleModel(event.target.value)}
                value={vehicleModel}
              />
              <input onChange={(event) => setPlateNumber(event.target.value)} value={plateNumber} />
            </div>
          </label>
          <label className="estimate-control">
            <span>연동 견적코드</span>
            <input readOnly value={estimate.no} />
          </label>
          <label className="estimate-control">
            <span>
              작업일시
              <em>필수</em>
            </span>
            <CardSalesDateInput
              ariaLabel="작업일시 날짜"
              className="estimate-work-date-field"
              onChange={setWorkDate}
              required
              value={workDate}
            />
          </label>
          <label className="estimate-control">
            <span>시간</span>
            <input
              inputMode="numeric"
              onChange={(event) => setWorkTime(normalizeEstimateTimeRangeInput(event.target.value))}
              placeholder="15:00 ~ 15:30"
              value={workTime}
            />
          </label>
          <label className="estimate-control">
            <span>
              작업방식
              <em>필수</em>
            </span>
            <select onChange={(event) => setVisitType(event.target.value as WorkVisitType)} required value={visitType}>
              {WORK_VISIT_OPTIONS.map((visit) => (
                <option key={visit}>{visit}</option>
              ))}
            </select>
          </label>
          <label className="estimate-control estimate-work-address">
            <span>주소</span>
            <div className="estimate-work-address-control" title={addressCoordinateTitle}>
              <div className="estimate-work-address-search">
                <input
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setSelectedAddress(null);
                  }}
                  placeholder="주소 검색"
                  value={address}
                />
                <button onClick={openAddressLookup} title="주소 검색" type="button">
                  <Search size={16} />
                </button>
              </div>
              <input
                aria-label="상세주소"
                onChange={(event) => setAddressDetail(event.target.value)}
                placeholder="상세주소"
                value={addressDetail}
              />
            </div>
          </label>
          <label className="estimate-control full">
            <span>견적내용</span>
            <AutoResizeTextarea minHeight={142} onChange={setEstimateContent} value={estimateContent} />
          </label>
          <label className="estimate-control full">
            <span>작업내용</span>
            <AutoResizeTextarea minHeight={48} onChange={setWorkContent} placeholder="작업내용 입력" value={workContent} />
          </label>
          <label className="estimate-control">
            <span>수리구분</span>
            <input readOnly value={estimate.repairType} />
          </label>
          <label className="estimate-control">
            <span>면책금</span>
            <input readOnly value={deductibleAmount} />
          </label>
          <label className="estimate-control">
            <span>썬팅</span>
            <input readOnly value={tintAmount} />
          </label>
          <label className="estimate-control">
            <span>견적 결제금액</span>
            <input readOnly value={estimatePaymentAmount} />
          </label>
        </div>
      </section>

      <FormSection title="결제 내용">
        <div className="payment-summary-grid">
          <label className="estimate-control">
            <span>결제금액</span>
            <input
              inputMode="numeric"
              onChange={(event) => setPaymentAmount(formatMoneyInputValue(event.target.value))}
              placeholder="0"
              value={paymentAmount}
            />
          </label>
          <div className="payment-summary-item">
            <span>입력 합계</span>
            <strong>{formatWorkLedgerAmount(paymentTotal)}</strong>
          </div>
          <div className="payment-summary-item">
            <span>결제여부</span>
            <strong className={resolvedPaymentStatus === 'Y' ? 'payment-status-y' : ''}>{resolvedPaymentStatus}</strong>
          </div>
        </div>

        <div className="payment-entry-list">
          {workPayments.map((payment, index) => (
            <article className="payment-entry-card" key={payment.id}>
              <div className="payment-entry-head">
                <strong>결제 {index + 1}</strong>
                {workPayments.length > 1 ? (
                  <button
                    aria-label={`결제 ${index + 1} 삭제`}
                    className="mini-button payment-remove-button"
                    onClick={() => removeWorkPaymentEntry(payment.id)}
                    title="결제 삭제"
                    type="button"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
              <div className="payment-entry-grid">
                <label className="estimate-control">
                  <span>결제 방식</span>
                  <select
                    onChange={(event) => updateWorkPaymentDraft(payment.id, 'method', event.target.value as WorkPaymentMethod)}
                    value={payment.method}
                  >
                    {PAYMENT_METHOD_OPTIONS.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                </label>
                <label className="estimate-control">
                  <span>결제액</span>
                  <input
                    inputMode="numeric"
                    onChange={(event) => updateWorkPaymentDraft(payment.id, 'amount', formatMoneyInputValue(event.target.value))}
                    placeholder="0"
                    value={formatMoneyInputValue(payment.amount)}
                  />
                </label>
                {payment.method === '카드' ? (
                  <>
                    <label className="estimate-control">
                      <span>카드사</span>
                      <input
                        list="estimate-work-card-company-suggestions"
                        onChange={(event) => updateWorkPaymentDraft(payment.id, 'cardCompany', event.target.value)}
                        value={payment.cardCompany}
                      />
                    </label>
                    {payment.cardCompany === '기타' ? (
                      <label className="estimate-control">
                        <span>카드사 직접 입력</span>
                        <input
                          onChange={(event) => updateWorkPaymentDraft(payment.id, 'customCardCompany', event.target.value)}
                          value={payment.customCardCompany}
                        />
                      </label>
                    ) : null}
                  </>
                ) : (
                  <>
                    <label className="estimate-control">
                      <span>은행</span>
                      <input
                        list="estimate-work-bank-suggestions"
                        onChange={(event) => updateWorkPaymentDraft(payment.id, 'bankName', event.target.value)}
                        value={payment.bankName}
                      />
                    </label>
                    {payment.bankName === '기타' ? (
                      <label className="estimate-control">
                        <span>은행 직접 입력</span>
                        <input
                          onChange={(event) => updateWorkPaymentDraft(payment.id, 'customBankName', event.target.value)}
                          value={payment.customBankName}
                        />
                      </label>
                    ) : null}
                    <label className="estimate-control">
                      <span>계좌번호</span>
                      <input
                        onChange={(event) => updateWorkPaymentDraft(payment.id, 'accountNumber', event.target.value)}
                        value={payment.accountNumber}
                      />
                    </label>
                    <label className="estimate-control">
                      <span>예금주</span>
                      <input
                        onChange={(event) => updateWorkPaymentDraft(payment.id, 'accountHolder', event.target.value)}
                        value={payment.accountHolder}
                      />
                    </label>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="payment-add-row">
          <button className="secondary-button" onClick={addWorkPaymentEntry} type="button">
            <Plus size={16} />
            결제 추가
          </button>
        </div>
      </FormSection>

      <datalist id="work-registration-vehicle-model-suggestions">
        {vehicleModelSuggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <datalist id="estimate-work-card-company-suggestions">
        {CARD_COMPANY_OPTIONS.map((company) => (
          <option key={company} value={company} />
        ))}
      </datalist>
      <datalist id="estimate-work-bank-suggestions">
        {BANK_OPTIONS.map((bank) => (
          <option key={bank} value={bank} />
        ))}
      </datalist>
      {isAddressLookupOpen ? (
        <div className="estimate-address-lookup-backdrop" onMouseDown={() => setIsAddressLookupOpen(false)} role="presentation">
          <section aria-modal="true" className="estimate-address-lookup" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <header>
              <h3>주소 검색</h3>
              <button aria-label="주소 검색 닫기" onClick={() => setIsAddressLookupOpen(false)} type="button">
                <X size={16} />
              </button>
            </header>
            <div className="estimate-address-search-input">
              <Search size={16} />
              <input
                autoFocus
                onChange={(event) => setAddressLookupQuery(event.target.value)}
                placeholder="도로명, 지번, 거래처명 검색"
                value={addressLookupQuery}
              />
            </div>
            <div className="estimate-address-result-list">
              {filteredAddressResults.length > 0 ? filteredAddressResults.map((result) => (
                <button key={result.id} onClick={() => selectAddressResult(result)} type="button">
                  <strong>{result.placeName}</strong>
                  <span>{result.roadAddress}</span>
                  <small>{result.jibunAddress} · {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}</small>
                </button>
              )) : <span>검색 결과가 없습니다.</span>}
            </div>
          </section>
        </div>
      ) : null}
    </DetailDrawer>
  );
}

function WorkRecordDetailDrawer({
  record,
  onClose,
  onComplete,
  onSave,
  vehicleModelSuggestions,
}: {
  record: WorkerWorkListRecord;
  onClose: () => void;
  onComplete: (order: WorkOrder) => void;
  onSave: (recordId: string, draft: WorkRecordDraft) => void;
  vehicleModelSuggestions: string[];
}) {
  const [draft, setDraft] = useState(() => workRecordToDraft(record));
  const [savedDraft, setSavedDraft] = useState(() => workRecordToDraft(record));
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const isWorkRecord = draft.kind === '작업';
  const paymentTotal = sumWorkPayments(draft.payments);
  const resolvedPaymentStatus = resolveWorkPaymentStatus(draft.paymentAmount, draft.payments);

  useEffect(() => {
    const nextDraft = workRecordToDraft(record);
    setDraft(nextDraft);
    setSavedDraft(nextDraft);
    setShowUnsavedPrompt(false);
  }, [record.id]);

  function updateDraft<Key extends keyof WorkRecordDraft>(key: Key, value: WorkRecordDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updatePaymentDraft<Key extends keyof WorkPaymentEntry>(paymentId: string, key: Key, value: WorkPaymentEntry[Key]) {
    setDraft((current) => ({
      ...current,
      payments: current.payments.map((payment) => (payment.id === paymentId ? { ...payment, [key]: value } : payment)),
    }));
  }

  function addPaymentEntry() {
    setDraft((current) => ({
      ...current,
      payments: [...current.payments, createEmptyWorkPaymentEntry(current.payments.length)],
    }));
  }

  function removePaymentEntry(paymentId: string) {
    setDraft((current) => {
      if (current.payments.length <= 1) return current;

      return {
        ...current,
        payments: current.payments.filter((payment) => payment.id !== paymentId),
      };
    });
  }

  function handleSave({ closeAfterSave = false } = {}) {
    const normalizedDraft = {
      ...draft,
      paymentStatus: resolveWorkPaymentStatus(draft.paymentAmount, draft.payments),
    };
    onSave(record.id, normalizedDraft);
    setDraft(normalizedDraft);
    setSavedDraft(normalizedDraft);
    setShowUnsavedPrompt(false);
    if (closeAfterSave) {
      onClose();
    }
  }

  function requestClose() {
    if (isDirty) {
      setShowUnsavedPrompt(true);
      return;
    }

    onClose();
  }

  return (
    <DetailDrawer
      eyebrow={isWorkRecord ? '작업 상세' : '일정 상세'}
      footer={
        <div className="work-detail-footer">
          <button className="secondary-button" onClick={requestClose} type="button">
            닫기
          </button>
          {isWorkRecord ? (
            <button className="secondary-button" onClick={() => onComplete(draftToWorkOrder(draft))} type="button">
              작업 완료 처리
            </button>
          ) : null}
          <button className="primary-button" disabled={!isDirty} onClick={() => handleSave()} type="button">
            변경 저장
          </button>
        </div>
      }
      onClose={requestClose}
      title={draft.title}
      variant="modal"
    >
      <div className="drawer-summary">
        <div>
          <span>일자/방문방식/시간</span>
          <strong>{draft.date} {isWorkRecord ? `${draft.visit} ` : ''}{draft.time}</strong>
        </div>
        <div>
          <span>{isWorkRecord ? '고객' : '제목'}</span>
          <strong>{draft.customer}</strong>
        </div>
        <div>
          <span>상태</span>
          <StatusPill label={draft.status} tone={statusTone(draft.status)} />
        </div>
      </div>

      <FormSection title={isWorkRecord ? '작업 상세 수정' : '일정 상세 수정'}>
        <div className="detail-edit-grid">
          <label className="estimate-control">
            <span>일자</span>
            <input onChange={(event) => updateDraft('date', event.target.value)} value={draft.date} />
          </label>
          <label className="estimate-control">
            <span>시간</span>
            <input onChange={(event) => updateDraft('time', event.target.value)} value={draft.time} />
          </label>
          {isWorkRecord ? (
            <label className="estimate-control">
              <span>방문 방식</span>
              <select onChange={(event) => updateDraft('visit', event.target.value as WorkVisitType)} value={draft.visit}>
                {WORK_VISIT_OPTIONS.map((visit) => (
                  <option key={visit}>{visit}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="estimate-control">
            <span>{isWorkRecord ? '고객/거래처' : '일정 제목'}</span>
            <input onChange={(event) => updateDraft('customer', event.target.value)} value={draft.customer} />
          </label>
          <label className="estimate-control">
            <span>차량</span>
            <input
              disabled={!isWorkRecord}
              list="work-record-vehicle-model-suggestions"
              onChange={(event) => updateDraft('vehicle', event.target.value)}
              value={draft.vehicle}
            />
          </label>
          <label className="estimate-control full">
            <span>{isWorkRecord ? '작업내용' : '상세 내용'}</span>
            <AutoResizeTextarea onChange={(value) => updateDraft('title', value)} value={draft.title} />
          </label>
          <label className="estimate-control">
            <span>견적서 작성자</span>
            <select onChange={(event) => updateDraft('owner', event.target.value)} value={draft.owner}>
              {ESTIMATOR_OPTIONS.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="estimate-control">
            <span>상태</span>
            <select onChange={(event) => updateDraft('status', event.target.value as WorkStatus)} value={draft.status}>
              {WORK_STATUS_OPTIONS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="estimate-control">
            <span>{isWorkRecord ? '주소/위치' : '분류'}</span>
            {isWorkRecord ? (
              <input onChange={(event) => updateDraft('location', event.target.value)} value={draft.location} />
            ) : (
              <select onChange={(event) => updateDraft('location', event.target.value)} value={draft.location}>
                {GENERAL_TASK_CATEGORY_OPTIONS.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            )}
          </label>
          <label className="estimate-control">
            <span>사용 부품</span>
            <input disabled={!isWorkRecord} onChange={(event) => updateDraft('stock', event.target.value)} value={draft.stock} />
          </label>
          <label className="estimate-control full">
            <span>메모</span>
            <textarea onChange={(event) => updateDraft('memo', event.target.value)} value={draft.memo} />
          </label>
        </div>
      </FormSection>

      {isWorkRecord ? (
        <FormSection title="결제 내용">
          <div className="payment-summary-grid">
            <label className="estimate-control">
              <span>결제금액</span>
              <input
                inputMode="numeric"
                onChange={(event) => updateDraft('paymentAmount', parseWorkAmountInput(event.target.value))}
                placeholder="0"
                value={draft.paymentAmount > 0 ? draft.paymentAmount.toLocaleString('ko-KR') : ''}
              />
            </label>
            <div className="payment-summary-item">
              <span>입력 합계</span>
              <strong>{formatWorkLedgerAmount(paymentTotal)}</strong>
            </div>
            <div className="payment-summary-item">
              <span>결제여부</span>
              <strong className={resolvedPaymentStatus === 'Y' ? 'payment-status-y' : ''}>{resolvedPaymentStatus}</strong>
            </div>
          </div>

          <div className="payment-entry-list">
            {draft.payments.map((payment, index) => (
              <article className="payment-entry-card" key={payment.id}>
                <div className="payment-entry-head">
                  <strong>결제 {index + 1}</strong>
                  {draft.payments.length > 1 ? (
                    <button
                      aria-label={`결제 ${index + 1} 삭제`}
                      className="mini-button payment-remove-button"
                      onClick={() => removePaymentEntry(payment.id)}
                      title="결제 삭제"
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
                <div className="payment-entry-grid">
                  <label className="estimate-control">
                    <span>결제 방식</span>
                    <select
                      onChange={(event) => updatePaymentDraft(payment.id, 'method', event.target.value as WorkPaymentMethod)}
                      value={payment.method}
                    >
                      {PAYMENT_METHOD_OPTIONS.map((method) => (
                        <option key={method}>{method}</option>
                      ))}
                    </select>
                  </label>
                  <label className="estimate-control">
                    <span>결제액</span>
                    <input
                      inputMode="numeric"
                      onChange={(event) => updatePaymentDraft(payment.id, 'amount', formatMoneyInputValue(event.target.value))}
                      placeholder="0"
                      value={formatMoneyInputValue(payment.amount)}
                    />
                  </label>
                  {payment.method === '카드' ? (
                    <>
                      <label className="estimate-control">
                        <span>카드사</span>
                        <input
                          list="work-card-company-suggestions"
                          onChange={(event) => updatePaymentDraft(payment.id, 'cardCompany', event.target.value)}
                          value={payment.cardCompany}
                        />
                      </label>
                      {payment.cardCompany === '기타' ? (
                        <label className="estimate-control">
                          <span>카드사 직접 입력</span>
                          <input
                            onChange={(event) => updatePaymentDraft(payment.id, 'customCardCompany', event.target.value)}
                            value={payment.customCardCompany}
                          />
                        </label>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <label className="estimate-control">
                        <span>은행</span>
                        <input
                          list="work-bank-suggestions"
                          onChange={(event) => updatePaymentDraft(payment.id, 'bankName', event.target.value)}
                          value={payment.bankName}
                        />
                      </label>
                      {payment.bankName === '기타' ? (
                        <label className="estimate-control">
                          <span>은행 직접 입력</span>
                          <input
                            onChange={(event) => updatePaymentDraft(payment.id, 'customBankName', event.target.value)}
                            value={payment.customBankName}
                          />
                        </label>
                      ) : null}
                      <label className="estimate-control">
                        <span>계좌번호</span>
                        <input
                          onChange={(event) => updatePaymentDraft(payment.id, 'accountNumber', event.target.value)}
                          value={payment.accountNumber}
                        />
                      </label>
                      <label className="estimate-control">
                        <span>예금주</span>
                        <input
                          onChange={(event) => updatePaymentDraft(payment.id, 'accountHolder', event.target.value)}
                          value={payment.accountHolder}
                        />
                      </label>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="payment-add-row">
            <button className="secondary-button" onClick={addPaymentEntry} type="button">
              <Plus size={16} />
              결제 추가
            </button>
          </div>
        </FormSection>
      ) : null}

      <datalist id="work-record-vehicle-model-suggestions">
        {vehicleModelSuggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <datalist id="work-card-company-suggestions">
        {CARD_COMPANY_OPTIONS.map((company) => (
          <option key={company} value={company} />
        ))}
      </datalist>
      <datalist id="work-bank-suggestions">
        {BANK_OPTIONS.map((bank) => (
          <option key={bank} value={bank} />
        ))}
      </datalist>

      <FormSection title="연결 업무">
        <div className="linked-actions">
          <button type="button">연결 견적 보기</button>
          <button type="button">청구 생성 미리보기</button>
          <button type="button">자료 첨부</button>
        </div>
      </FormSection>

      {showUnsavedPrompt ? (
        <UnsavedChangesDialog
          onCancel={() => setShowUnsavedPrompt(false)}
          onSave={() => handleSave({ closeAfterSave: true })}
        />
      ) : null}
    </DetailDrawer>
  );
}

function UnsavedChangesDialog({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="unsaved-dialog-backdrop" role="presentation" onMouseDown={(event) => event.stopPropagation()}>
      <section className="unsaved-dialog" role="alertdialog" aria-modal="true" aria-labelledby="unsaved-dialog-title">
        <h3 id="unsaved-dialog-title">수정 항목이 있습니다.</h3>
        <p>저장하시겠습니까?</p>
        <div>
          <button className="secondary-button" onClick={onCancel} type="button">
            취소
          </button>
          <button className="primary-button" onClick={onSave} type="button">
            저장
          </button>
        </div>
      </section>
    </div>
  );
}

function WorkCompletionDrawer({ order, onClose }: { order: WorkOrder; onClose: () => void }) {
  return (
    <DetailDrawer
      eyebrow="작업 완료"
      footer={<ActionFooter primaryLabel="완료 처리 미리보기" secondaryLabel="닫기" onSecondary={onClose} />}
      onClose={onClose}
      title={`${order.customer} 완료 처리`}
    >
      <div className="flow-steps">
        <article className="active">
          <CheckCircle2 size={18} />
          <strong>작업 확인</strong>
          <span>{order.repair}</span>
        </article>
        <article>
          <Camera size={18} />
          <strong>사진 첨부</strong>
          <span>작업 전/후 사진</span>
        </article>
        <article>
          <Package size={18} />
          <strong>재고 차감</strong>
          <span>{order.stock}</span>
        </article>
        <article>
          <ReceiptText size={18} />
          <strong>청구 연결</strong>
          <span>청구서 생성 대기</span>
        </article>
      </div>

      <FormSection title="사진/자료">
        <div className="attachment-dropzone">
          <Camera size={20} />
          <strong>사진 올리기 영역</strong>
          <span>프로토타입에서는 파일 저장 없이 첨부 위치만 확인합니다.</span>
        </div>
      </FormSection>

      <FormSection title="자동 연결 미리보기">
        <div className="calculation-list">
          <CalcRow label="재고 차감" value={order.stock} />
          <CalcRow label="청구 생성" value="작업 완료 후 생성" />
          <CalcRow label="작업 상태" value="완료 예정" strong />
        </div>
      </FormSection>
    </DetailDrawer>
  );
}

function ClaimDetailDrawer({ claim, onClose }: { claim: Claim; onClose: () => void }) {
  return (
    <DetailDrawer
      eyebrow="청구 상세"
      footer={<ActionFooter primaryLabel="입금 처리 미리보기" secondaryLabel="닫기" onSecondary={onClose} />}
      onClose={onClose}
      title={claim.no}
    >
      <div className="drawer-summary">
        <div>
          <span>고객</span>
          <strong>{claim.customer}</strong>
        </div>
        <div>
          <span>보험사</span>
          <strong>{claim.insurer}</strong>
        </div>
        <div>
          <span>상태</span>
          <StatusPill label={claim.status} tone={statusTone(claim.status)} />
        </div>
      </div>
      <FormSection title="청구 금액">
        <div className="calculation-list">
          <CalcRow label="청구금액" value={formatMoney(claim.claimAmount)} />
          <CalcRow label="입금액" value={formatMoney(claim.paidAmount)} />
          <CalcRow label="고객결제" value={formatMoney(claim.customerAmount)} />
          <CalcRow label="미수" value={formatMoney(Math.max(claim.claimAmount - claim.paidAmount, 0))} strong />
        </div>
      </FormSection>
      <FormSection title="입금 처리">
        <Field label="입금일" value="2026.05.20" />
        <Field label="입금액" value={formatMoney(claim.claimAmount - claim.paidAmount)} />
      </FormSection>
    </DetailDrawer>
  );
}

function InventoryDetailDrawer({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  return (
    <DetailDrawer
      eyebrow="재고 상세"
      footer={<ActionFooter primaryLabel="입출고 등록 미리보기" secondaryLabel="닫기" onSecondary={onClose} />}
      onClose={onClose}
      title={item.partNo}
    >
      <div className="drawer-summary">
        <div>
          <span>품목명</span>
          <strong>{item.name}</strong>
        </div>
        <div>
          <span>규격</span>
          <strong>{item.spec || '-'}</strong>
        </div>
        <div>
          <span>재고수량</span>
          <strong>{item.stockQty || `${item.stock}`}</strong>
        </div>
        <div>
          <span>품목코드</span>
          <strong>{item.partNo}</strong>
        </div>
      </div>
      <FormSection title="재고리스트">
        <div className="detail-fields">
          <InfoItem icon={Database} label="전일재고" value={item.previousQty || '-'} />
          <InfoItem icon={Download} label="입고수량" value={item.inboundQty || '-'} />
          <InfoItem icon={Upload} label="출고수량" value={item.outboundQty || '-'} />
          <InfoItem icon={Package} label="재고수량" value={item.stockQty || `${item.stock}`} />
        </div>
      </FormSection>
      <FormSection title="품목리스트 단가">
        <div className="detail-fields">
          <InfoItem icon={CreditCard} label="입고단가" value={formatProductListPrice(item.inboundPrice) || '-'} />
          <InfoItem icon={WalletCards} label="출고단가" value={formatProductListPrice(item.outboundPrice) || '-'} />
          <InfoItem icon={ReceiptText} label="교환단가" value={formatProductListPrice(item.exchangePrice) || '-'} />
          <InfoItem icon={FileText} label="적요" value={item.note || '-'} />
        </div>
      </FormSection>
    </DetailDrawer>
  );
}

function AttachmentDetailDrawer({ file, onClose }: { file: AttachmentItem; onClose: () => void }) {
  return (
    <DetailDrawer
      eyebrow="자료 상세"
      footer={<ActionFooter primaryLabel="연결 업무 열기" secondaryLabel="닫기" onSecondary={onClose} />}
      onClose={onClose}
      title={file.name}
    >
      <div className="drawer-summary">
        <div>
          <span>구분</span>
          <strong>{file.type}</strong>
        </div>
        <div>
          <span>연결 업무</span>
          <strong>{file.target}</strong>
        </div>
        <div>
          <span>고객/거래처</span>
          <strong>{file.owner}</strong>
        </div>
      </div>
      <FormSection title="파일 미리보기">
        <div className="attachment-dropzone">
          <Download size={20} />
          <strong>파일 보기 영역</strong>
          <span>프로토타입에서는 실제 파일 다운로드 없이 연결 구조만 확인합니다.</span>
        </div>
      </FormSection>
      <FormSection title="연결 정보">
        <div className="linked-actions">
          <button type="button">고객 상세</button>
          <button type="button">견적/작업/청구 상세</button>
          <button type="button">자료 교체</button>
        </div>
      </FormSection>
    </DetailDrawer>
  );
}

function ClaimsPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ClaimFilter>('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(claims.flatMap((claim) => [claim.no, claim.customer, claim.vehicle, claim.type, claim.insurer])),
      ),
    [],
  );
  const filteredClaims = useMemo(
    () =>
      claims.filter((claim) => {
        const target = [claim.no, claim.customer, claim.vehicle, claim.type, claim.insurer, claim.status]
          .join(' ')
          .toLowerCase();
        const matchesQuery = normalizedQuery.length === 0 || target.includes(normalizedQuery);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'wait' && claim.status === '청구대기') ||
          (filter === 'partial' && claim.status === '일부입금') ||
          (filter === 'paid' && claim.status === '입금완료');

        return matchesQuery && matchesFilter;
      }),
    [filter, normalizedQuery],
  );

  return (
    <>
    <section className="workbench-grid">
      <Panel className="span-12" title="청구/입금 현황">
        <RecordToolbar
          action={
            <button className="primary-button" type="button">
              <Plus size={16} />
              청구 등록
            </button>
          }
          count={`총 ${filteredClaims.length}건`}
          filters={
            <FilterTabs
              ariaLabel="청구 필터"
              onChange={(value) => setFilter(value as ClaimFilter)}
              options={[
                { id: 'all', label: '전체' },
                { id: 'wait', label: '청구대기' },
                { id: 'partial', label: '일부입금' },
                { id: 'paid', label: '입금완료' },
              ]}
              value={filter}
            />
          }
          search={
            <SearchInput
              label="전체 검색"
              listId="claim-search-suggestions"
              onChange={setQuery}
              placeholder="고객명, 차량, 보험사, 청구번호 검색"
              suggestions={searchSuggestions}
              value={query}
            />
          }
        />
        <ListColumnTable
          columns={['청구번호', '고객/차량', '구분', '보험사', '청구금액', '입금액', '고객결제', '상태']}
          onRowClick={(rowIndex) => {
            const claim = filteredClaims[rowIndex];
            if (claim) setSelectedClaim(claim);
          }}
          rows={filteredClaims.map((claim) => [
            claim.no,
            `${claim.customer}\n${claim.vehicle}`,
            claim.type,
            claim.insurer,
            formatMoney(claim.claimAmount),
            formatMoney(claim.paidAmount),
            formatMoney(claim.customerAmount),
            <StatusPill key={claim.no} label={claim.status} tone={statusTone(claim.status)} />,
          ])}
        />
      </Panel>

      <Panel className="span-6" title="다이렉트 청구">
        <div className="line-items">
          <LineItem label="유리" name="GV80 전면유리 ADAS" amount={980000} />
          <LineItem label="공임" name="전면유리 교체 공임" amount={180000} />
          <LineItem label="보정" name="ADAS 정적 보정" amount={120000} />
        </div>
      </Panel>

      <Panel className="span-6" title="자동 계산">
        <div className="calculation-list">
          <CalcRow label="공급가" value="1,280,000원" />
          <CalcRow label="부가세" value="128,000원" />
          <CalcRow label="청구합계" value="1,408,000원" strong />
          <CalcRow label="자기부담금" value="100,000원" />
          <CalcRow label="보험 지급책임액" value="1,308,000원" strong />
        </div>
      </Panel>
    </section>
    {selectedClaim ? <ClaimDetailDrawer claim={selectedClaim} onClose={() => setSelectedClaim(null)} /> : null}
    </>
  );
}

function InventoryPage() {
  const [searchDraft, setSearchDraft] = useState<InventorySearchState>(INVENTORY_DEFAULT_SEARCH);
  const [appliedSearch, setAppliedSearch] = useState<InventorySearchState>(INVENTORY_DEFAULT_SEARCH);
  const [columnFilterDraftKey, setColumnFilterDraftKey] = useState<InventoryColumnFilterKey>('partNo');
  const [columnFilterDraftValue, setColumnFilterDraftValue] = useState('');
  const [columnFilters, setColumnFilters] = useState<InventoryColumnFilterRule[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const codeSuggestions = useMemo(() => uniqueNonEmptyStrings(inventory.map((item) => item.partNo)), []);
  const nameSuggestions = useMemo(() => uniqueNonEmptyStrings(inventory.map((item) => item.name)), []);
  const specSuggestions = useMemo(() => uniqueNonEmptyStrings(inventory.map((item) => item.spec)), []);
  const noteSuggestions = useMemo(
    () => uniqueNonEmptyStrings(inventory.flatMap((item) => [item.note, item.inboundPrice, item.outboundPrice, item.exchangePrice])),
    [],
  );
  const columnFilterValues = useMemo(
    () =>
      uniqueNonEmptyStrings(inventory.map((item) => getInventoryColumnFilterValue(item, columnFilterDraftKey))).sort((left, right) =>
        left.localeCompare(right, 'ko-KR', { numeric: true }),
      ),
    [columnFilterDraftKey],
  );
  const columnFilterGroups = useMemo(
    () =>
      columnFilters.reduce((groups, filter) => {
        const values = groups.get(filter.key) ?? new Set<string>();
        values.add(filter.value);
        groups.set(filter.key, values);
        return groups;
      }, new Map<InventoryColumnFilterKey, Set<string>>()),
    [columnFilters],
  );
  const filteredInventory = useMemo(() => {
    const filtered = inventory.filter((item) => {
      const matchesColumnFilters =
        columnFilterGroups.size === 0 ||
        Array.from(columnFilterGroups.entries()).every(([key, values]) => values.has(getInventoryColumnFilterValue(item, key)));

      return inventoryMatchesSearch(item, appliedSearch) && matchesColumnFilters;
    });

    return sortInventoryItems(filtered, appliedSearch.sort);
  }, [appliedSearch, columnFilterGroups]);
  const hasStockCount = inventory.filter((item) => getInventoryStockQuantity(item) > 0).length;
  const inboundCount = inventory.filter((item) => getInventoryQuantity(item.inboundQty) !== 0).length;
  const outboundCount = inventory.filter((item) => getInventoryQuantity(item.outboundQty) !== 0).length;
  const missingPriceCount = inventory.filter(
    (item) => !hasInventoryValue(item.inboundPrice) && !hasInventoryValue(item.outboundPrice) && !hasInventoryValue(item.exchangePrice),
  ).length;

  function updateSearch<Key extends keyof InventorySearchState>(key: Key, value: InventorySearchState[Key]) {
    setSearchDraft((current) => ({ ...current, [key]: value }));
  }

  function applySearch() {
    setAppliedSearch(searchDraft);
  }

  function resetFilters() {
    setSearchDraft(INVENTORY_DEFAULT_SEARCH);
    setAppliedSearch(INVENTORY_DEFAULT_SEARCH);
    setColumnFilterDraftKey('partNo');
    setColumnFilterDraftValue('');
    setColumnFilters([]);
  }

  function addColumnFilter(nextValue = columnFilterDraftValue) {
    const value = nextValue.trim();
    if (!value) return;

    setColumnFilters((current) => {
      if (current.some((filter) => filter.key === columnFilterDraftKey && filter.value === value)) return current;

      return [
        ...current,
        {
          id: `${columnFilterDraftKey}-${value}-${Date.now()}`,
          key: columnFilterDraftKey,
          value,
        },
      ];
    });
    setColumnFilterDraftValue('');
  }

  function removeColumnFilter(filterId: string) {
    setColumnFilters((current) => current.filter((filter) => filter.id !== filterId));
  }

  return (
    <div className="page-stack inventory-page">
      <section className="inventory-summary-strip" aria-label="재고 요약">
        <span>
          전체 재고
          <strong>{inventory.length.toLocaleString('ko-KR')}건</strong>
          <em>재고리스트 기준</em>
        </span>
        <span>
          재고있음
          <strong>{hasStockCount.toLocaleString('ko-KR')}건</strong>
          <em>재고수량 1 이상</em>
        </span>
        <span>
          입고수량
          <strong>{inboundCount.toLocaleString('ko-KR')}건</strong>
          <em>입고수량 입력</em>
        </span>
        <span>
          출고수량
          <strong>{outboundCount.toLocaleString('ko-KR')}건</strong>
          <em>출고수량 입력</em>
        </span>
        <span>
          단가없음
          <strong>{missingPriceCount.toLocaleString('ko-KR')}건</strong>
          <em>품목리스트 단가 미입력</em>
        </span>
      </section>
      <section className="workbench-grid">
        <Panel
          action={
            <div className="inventory-header-actions">
              <button className="secondary-button" onClick={() => downloadInventoryRows(filteredInventory)} type="button">
                <Download size={16} />
                엑셀 다운로드
              </button>
            </div>
          }
          className="span-12 inventory-list-panel"
          title="전체 재고 목록"
        >
          <div className="inventory-search-panel" aria-label="재고 검색 조건">
            <div className="inventory-filter-grid">
              <SearchInput
                className="inventory-filter-input"
                label="품목코드"
                listId="inventory-code-suggestions"
                onChange={(value) => updateSearch('code', value)}
                placeholder="품목코드"
                suggestions={codeSuggestions}
                value={searchDraft.code}
              />
              <SearchInput
                className="inventory-filter-input"
                label="품목명"
                listId="inventory-name-suggestions"
                onChange={(value) => updateSearch('name', value)}
                placeholder="품목명"
                suggestions={nameSuggestions}
                value={searchDraft.name}
              />
              <SearchInput
                className="inventory-filter-input"
                label="규격"
                listId="inventory-spec-suggestions"
                onChange={(value) => updateSearch('spec', value)}
                placeholder="규격"
                suggestions={specSuggestions}
                value={searchDraft.spec}
              />
              <SearchInput
                className="inventory-filter-input"
                label="적요/단가"
                listId="inventory-note-suggestions"
                onChange={(value) => updateSearch('note', value)}
                placeholder="적요 또는 단가"
                suggestions={noteSuggestions}
                value={searchDraft.note}
              />
              <label className="inventory-filter-select">
                <span>재고상태</span>
                <select onChange={(event) => updateSearch('stock', event.target.value as InventoryStockFilter)} value={searchDraft.stock}>
                  <option value="all">전체</option>
                  <option value="hasStock">재고있음</option>
                  <option value="emptyStock">재고없음</option>
                  <option value="negativeStock">마이너스</option>
                </select>
              </label>
              <label className="inventory-filter-select">
                <span>입출고</span>
                <select onChange={(event) => updateSearch('movement', event.target.value as InventoryMovementFilter)} value={searchDraft.movement}>
                  <option value="all">전체</option>
                  <option value="inbound">입고 있음</option>
                  <option value="outbound">출고 있음</option>
                  <option value="changed">입/출고 있음</option>
                  <option value="noMovement">입/출고 없음</option>
                </select>
              </label>
              <label className="inventory-filter-select">
                <span>단가</span>
                <select onChange={(event) => updateSearch('price', event.target.value as InventoryPriceFilter)} value={searchDraft.price}>
                  <option value="all">전체</option>
                  <option value="hasInboundPrice">입고단가 있음</option>
                  <option value="hasOutboundPrice">출고단가 있음</option>
                  <option value="hasExchangePrice">교환단가 있음</option>
                  <option value="missingPrice">단가없음</option>
                </select>
              </label>
              <label className="inventory-filter-select">
                <span>정렬</span>
                <select onChange={(event) => updateSearch('sort', event.target.value as InventorySort)} value={searchDraft.sort}>
                  <option value="codeAsc">품목코드순</option>
                  <option value="nameAsc">품목명순</option>
                  <option value="stockDesc">재고 많은순</option>
                  <option value="stockAsc">재고 적은순</option>
                  <option value="inboundDesc">입고 많은순</option>
                  <option value="outboundDesc">출고 많은순</option>
                </select>
              </label>
              <div className="inventory-search-actions">
                <button className="primary-button" onClick={applySearch} type="button">검색</button>
                <button className="secondary-button" onClick={resetFilters} type="button">초기화</button>
              </div>
            </div>
            <div className="inventory-result-count">
              총 {filteredInventory.length.toLocaleString('ko-KR')}건 · 컬럼필터 {columnFilters.length}개
            </div>
          </div>
          <div className="inventory-advanced-filters">
            <label>
              <span>필터 컬럼</span>
              <select
                onChange={(event) => {
                  setColumnFilterDraftKey(event.target.value as InventoryColumnFilterKey);
                  setColumnFilterDraftValue('');
                }}
                value={columnFilterDraftKey}
              >
                {INVENTORY_COLUMN_FILTER_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>값 선택</span>
              <input
                list="inventory-column-filter-values"
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setColumnFilterDraftValue(nextValue);
                  if (columnFilterValues.includes(nextValue)) {
                    addColumnFilter(nextValue);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  addColumnFilter();
                }}
                placeholder="값 검색 후 선택"
                value={columnFilterDraftValue}
              />
              <datalist id="inventory-column-filter-values">
                {columnFilterValues.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </label>
            <button className="secondary-button" onClick={() => addColumnFilter()} type="button">
              필터 추가
            </button>
            <button className="secondary-button" onClick={resetFilters} type="button">
              필터 초기화
            </button>
            {columnFilters.length > 0 ? (
              <div className="work-active-filters inventory-active-filters" aria-label="적용된 필터">
                {columnFilters.map((filter) => {
                  const option = INVENTORY_COLUMN_FILTER_OPTIONS.find((item) => item.key === filter.key);

                  return (
                    <button key={filter.id} onClick={() => removeColumnFilter(filter.id)} type="button">
                      <span>{option?.label ?? filter.key}</span>
                      <strong>{filter.value}</strong>
                      <X size={13} />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <ListColumnTable
            columns={[
              '품목코드',
              '품목명',
              '규격',
              '전일재고',
              '입고수량',
              '출고수량',
              '재고수량',
              '입고단가',
              '출고단가',
              '교환단가',
            ]}
            onRowClick={(rowIndex) => {
              const item = filteredInventory[rowIndex];
              if (item) setSelectedItem(item);
            }}
            rows={filteredInventory.map((item) => [
              item.partNo,
              item.name,
              item.spec,
              item.previousQty,
              item.inboundQty,
              item.outboundQty,
              item.stockQty || `${item.stock}`,
              formatProductListPrice(item.inboundPrice),
              formatProductListPrice(item.outboundPrice),
              formatProductListPrice(item.exchangePrice),
            ])}
          />
        </Panel>
      </section>
      {selectedItem ? <InventoryDetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} /> : null}
    </div>
  );
}

function LegacyCustomersPage({
  selectedCustomer,
  selectedCustomerId,
  onSelectCustomer,
}: {
  selectedCustomer: Customer;
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
}) {
  return (
    <section className="customer-layout">
      <Panel title="고객 목록" className="customer-list-panel">
        <div className="customer-list">
          {customers.map((customer) => (
            <button
              className={`customer-list-item ${selectedCustomerId === customer.id ? 'active' : ''}`}
              key={customer.id}
              onClick={() => onSelectCustomer(customer.id)}
            >
              <strong>{customer.name}</strong>
              <span>{customer.phone}</span>
              <small>{customer.vehicle}</small>
            </button>
          ))}
        </div>
      </Panel>

      <div className="customer-detail-stack">
        <Panel title="고객 상세">
          <CustomerSnapshot customer={selectedCustomer} />
        </Panel>

        <Panel title="업무 이력">
          <div className="history-grid">
            <HistoryItem icon={FileText} title="견적" value="3건" detail="최근 EST-2026-0017" />
            <HistoryItem icon={Wrench} title="작업" value="2건" detail={selectedCustomer.lastWork} />
            <HistoryItem icon={ReceiptText} title="청구" value={formatMoney(selectedCustomer.unpaid)} detail="미수 기준" />
            <HistoryItem icon={FolderOpen} title="자료" value={`${selectedCustomer.files.length}개`} detail={selectedCustomer.files.join(', ')} />
          </div>
        </Panel>
      </div>
    </section>
  );
}

function VehicleInformationPage({
  vehicles,
  vehicleSuggestions,
  isAddOpen,
  onOpenAdd,
  onCloseAdd,
  onAddVehicle,
}: {
  vehicles: VehicleCatalogItem[];
  vehicleSuggestions: VehicleSuggestionSet;
  isAddOpen: boolean;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
  onAddVehicle: (draft: VehicleCatalogDraft) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<VehicleCatalogFilter>('all');
  const normalizedQuery = query.trim().toLowerCase();
  const adminAddedCount = vehicles.filter((vehicle) => vehicle.source === '관리자 추가').length;
  const filmCutCount = vehicles.filter(isFilmCutVehicle).length;
  const totalUsageCount = vehicles.reduce((sum, vehicle) => sum + vehicle.usageCount, 0);
  const searchSuggestions = useMemo(
    () =>
      uniqueNonEmptyStrings([
        ...vehicleSuggestions.lookup,
        ...vehicles.flatMap((vehicle) => [
          getVehicleDisplayName(vehicle),
          vehicle.brand,
          vehicle.model,
          vehicle.series,
          vehicle.yearRange,
          vehicle.category,
          vehicle.infoCategory,
          formatFilmCutSize(vehicle),
          vehicle.source,
          vehicle.memo,
          ...vehicle.aliases,
        ]),
      ]),
    [vehicleSuggestions.lookup, vehicles],
  );
  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) => {
        const target = [
          getVehicleDisplayName(vehicle),
          vehicle.brand,
          vehicle.model,
          vehicle.series,
          vehicle.yearRange,
          vehicle.category,
          vehicle.infoCategory,
          formatFilmCutSize(vehicle),
          vehicle.source,
          vehicle.memo,
          ...vehicle.aliases,
        ]
          .join(' ')
          .toLowerCase();
        const matchesQuery = normalizedQuery.length === 0 || target.includes(normalizedQuery);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'domestic' && isDomesticVehicle(vehicle)) ||
          (filter === 'imported' && !isDomesticVehicle(vehicle)) ||
          (filter === 'filmCut' && isFilmCutVehicle(vehicle)) ||
          (filter === 'recent' && vehicle.source === '관리자 추가');

        return matchesQuery && matchesFilter;
      }),
    [filter, normalizedQuery, vehicles],
  );

  return (
    <div className="page-stack vehicle-info-page">
      <section className="kpi-grid" aria-label="차량 정보 요약">
        <KpiCard icon={Car} label="차량 마스터" value={`${vehicles.length}대`} detail="기존 자료에서 모은 차종" tone="blue" />
        <KpiCard icon={Search} label="입력 후보" value={`${vehicleSuggestions.model.length}개`} detail="견적·작업 typeahead 반영" tone="green" />
        <KpiCard icon={Package} label="필름재단" value={`${filmCutCount}대`} detail="가로·세로 사이즈 보유" tone="purple" />
        <KpiCard icon={Plus} label="관리자 추가" value={`${adminAddedCount}대`} detail="새 차종 직접 업데이트" tone="orange" />
        <KpiCard icon={FileText} label="사용 이력" value={`${totalUsageCount}건`} detail="견적·작업·장부 기준" tone="yellow" />
      </section>

      <Panel title="차량 정보">
        <RecordToolbar
          action={
            <button className="primary-button" onClick={onOpenAdd} type="button">
              <Plus size={16} />
              차량 추가
            </button>
          }
          count={`총 ${filteredVehicles.length}대`}
          filters={
            <FilterTabs
              ariaLabel="차량 정보 필터"
              onChange={(value) => setFilter(value as VehicleCatalogFilter)}
              options={[
                { id: 'all', label: '전체' },
                { id: 'domestic', label: '국산' },
                { id: 'imported', label: '수입/전기' },
                { id: 'filmCut', label: '필름재단' },
                { id: 'recent', label: '최근 추가' },
              ]}
              value={filter}
            />
          }
          search={
            <SearchInput
              label="차량 검색"
              listId="vehicle-info-search-suggestions"
              onChange={setQuery}
              placeholder="브랜드, 모델, 세대, 별칭 검색"
              suggestions={searchSuggestions}
              value={query}
            />
          }
        />

        {filteredVehicles.length > 0 ? (
          <ListColumnTable
            columns={['브랜드/모델', '세대/연식', '분류', '입력 카테고리', '필름재단', '별칭', '출처', '메모']}
            rows={filteredVehicles.map((vehicle) => [
              <div className="vehicle-name-cell" key={`${vehicle.id}-name`}>
                <strong>{getVehicleDisplayName(vehicle)}</strong>
                <span>{vehicle.updatedAt} 업데이트</span>
              </div>,
              `${vehicle.series}\n${vehicle.yearRange}`,
              vehicle.category,
              <StatusPill
                key={`${vehicle.id}-category`}
                label={vehicle.infoCategory ?? '차량정보'}
                tone={isFilmCutVehicle(vehicle) ? 'purple' : 'gray'}
              />,
              formatFilmCutSize(vehicle),
              <div className="schema-tags" key={`${vehicle.id}-aliases`}>
                {vehicle.aliases.slice(0, 4).map((alias) => (
                  <span key={`${vehicle.id}-${alias}`}>{alias}</span>
                ))}
              </div>,
              vehicle.source,
              vehicle.memo,
            ])}
          />
        ) : (
          <div className="empty-state">
            <strong>검색 결과가 없습니다.</strong>
            <span>검색어를 줄이거나 필터를 전체로 변경해보세요.</span>
          </div>
        )}
      </Panel>

      {isAddOpen ? (
        <VehicleAddDrawer
          onAddVehicle={onAddVehicle}
          onClose={onCloseAdd}
          vehicleSuggestions={vehicleSuggestions}
        />
      ) : null}
    </div>
  );
}

function VehicleAddDrawer({
  vehicleSuggestions,
  onClose,
  onAddVehicle,
}: {
  vehicleSuggestions: VehicleSuggestionSet;
  onClose: () => void;
  onAddVehicle: (draft: VehicleCatalogDraft) => void;
}) {
  const [draft, setDraft] = useState<VehicleCatalogDraft>({
    brand: '',
    model: '',
    series: '',
    yearRange: '',
    category: 'SUV',
    infoCategory: '차량정보',
    filmCutWidth: '',
    filmCutHeight: '',
    filmCutNote: '',
    aliases: '',
    memo: '',
  });
  const isFilmCutCategory = draft.infoCategory === '필름재단';
  const canSubmit = draft.brand.trim().length > 0 && draft.model.trim().length > 0;

  function updateDraft<Key extends keyof VehicleCatalogDraft>(key: Key, value: VehicleCatalogDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit() {
    if (!canSubmit) return;

    onAddVehicle(draft);
    onClose();
  }

  return (
    <DetailDrawer
      eyebrow="차량 정보"
      footer={
        <div className="action-footer">
          <button className="secondary-button" onClick={onClose} type="button">
            닫기
          </button>
          <button className="primary-button" disabled={!canSubmit} onClick={handleSubmit} type="button">
            차량 추가
          </button>
        </div>
      }
      onClose={onClose}
      title="차량 추가"
    >
      <form
        className="estimate-registration-form"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <FormSection title="기본 정보">
          <div className="estimate-form-grid">
            <label className="estimate-control full">
              <span>입력 카테고리</span>
              <select
                onChange={(event) => updateDraft('infoCategory', event.target.value as VehicleInfoCategory)}
                value={draft.infoCategory}
              >
                <option>차량정보</option>
                <option>필름재단</option>
              </select>
            </label>
            <label className="estimate-control">
              <span>
                브랜드
                <em>필수</em>
              </span>
              <input
                list="vehicle-add-brand-suggestions"
                onChange={(event) => updateDraft('brand', event.target.value)}
                placeholder="현대, 기아, BMW 등"
                required
                value={draft.brand}
              />
            </label>
            <label className="estimate-control">
              <span>
                모델명
                <em>필수</em>
              </span>
              <input
                list="vehicle-add-model-suggestions"
                onChange={(event) => updateDraft('model', event.target.value)}
                placeholder="쏘렌토, EV3, Model Y 등"
                required
                value={draft.model}
              />
            </label>
            <label className="estimate-control">
              <span>세대/코드</span>
              <input
                onChange={(event) => updateDraft('series', event.target.value)}
                placeholder="MQ4, GN7, KA4 등"
                value={draft.series}
              />
            </label>
            <label className="estimate-control">
              <span>연식 범위</span>
              <input
                list="vehicle-add-year-suggestions"
                onChange={(event) => updateDraft('yearRange', event.target.value)}
                placeholder="2024~"
                value={draft.yearRange}
              />
            </label>
            <label className="estimate-control">
              <span>분류/종류</span>
              <select onChange={(event) => updateDraft('category', event.target.value)} value={draft.category}>
                <option>승용</option>
                <option>RV</option>
                <option>SUV</option>
                <option>세단</option>
                <option>MPV</option>
                <option>경차</option>
                <option>소형</option>
                <option>준중형</option>
                <option>중형</option>
                <option>준대형</option>
                <option>대형</option>
                <option>화물</option>
                <option>전기차</option>
                <option>수입 세단</option>
                <option>수입 SUV</option>
                <option>기타</option>
              </select>
            </label>
            <label className="estimate-control full">
              <span>별칭</span>
              <input
                onChange={(event) => updateDraft('aliases', event.target.value)}
                placeholder="쉼표로 구분: 쏘렌토 MQ4, Sorento"
                value={draft.aliases}
              />
            </label>
            <label className="estimate-control full">
              <span>메모</span>
              <textarea
                onChange={(event) => updateDraft('memo', event.target.value)}
                placeholder="ADAS, 열선, 파노라마 등 작업 시 확인할 내용"
                value={draft.memo}
              />
            </label>
          </div>
        </FormSection>

        {isFilmCutCategory ? (
          <FormSection title="필름재단">
            <div className="estimate-form-grid">
              <label className="estimate-control">
                <span>가로</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => updateDraft('filmCutWidth', event.target.value)}
                  placeholder="예: 78"
                  value={draft.filmCutWidth}
                />
              </label>
              <label className="estimate-control">
                <span>세로</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => updateDraft('filmCutHeight', event.target.value)}
                  placeholder="예: 1,470"
                  value={draft.filmCutHeight}
                />
              </label>
              <label className="estimate-control full">
                <span>비고</span>
                <input
                  onChange={(event) => updateDraft('filmCutNote', event.target.value)}
                  placeholder="예: 가로 가능, ??, F/L 구분 필요"
                  value={draft.filmCutNote}
                />
              </label>
            </div>
          </FormSection>
        ) : null}

        <datalist id="vehicle-add-brand-suggestions">
          {vehicleSuggestions.brand.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        <datalist id="vehicle-add-model-suggestions">
          {vehicleSuggestions.model.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        <datalist id="vehicle-add-year-suggestions">
          {vehicleSuggestions.yearRange.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      </form>
    </DetailDrawer>
  );
}

function CustomersPage({ onOpenCustomer }: { onOpenCustomer: (customerId: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('all');
  const normalizedQuery = query.trim().toLowerCase();
  const linkedSectionsByCustomerId = useMemo(
    () => new Map(customers.map((customer) => [customer.id, buildCustomerLinkedSections(customer)])),
    [],
  );
  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          customers.flatMap((customer) => buildCustomerSearchTokens(customer, linkedSectionsByCustomerId.get(customer.id))),
        ),
      ),
    [linkedSectionsByCustomerId],
  );
  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const target = buildCustomerSearchTokens(customer, linkedSectionsByCustomerId.get(customer.id)).join(' ').toLowerCase();
        const matchesQuery = normalizedQuery.length === 0 || target.includes(normalizedQuery);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'unpaid' && customer.unpaid > 0) ||
          (filter === 'clear' && customer.unpaid === 0) ||
          (filter === 'recent' && customer.lastWork.includes('2026.05'));

        return matchesQuery && matchesFilter;
      }),
    [filter, linkedSectionsByCustomerId, normalizedQuery],
  );

  return (
    <Panel
      title="고객/차량 목록"
    >
      <RecordToolbar
        action={
          <button className="primary-button" type="button">
            <Plus size={16} />
            고객 등록
          </button>
        }
        count={`총 ${filteredCustomers.length}건`}
        filters={
          <FilterTabs
            ariaLabel="고객 필터"
            onChange={(value) => setFilter(value as CustomerFilter)}
            options={[
              { id: 'all', label: '전체' },
              { id: 'unpaid', label: '미수' },
              { id: 'clear', label: '정상' },
              { id: 'recent', label: '최근 작업' },
            ]}
            value={filter}
          />
        }
        search={
          <SearchInput
            label="전체 검색"
            listId="customer-search-suggestions"
            onChange={setQuery}
            placeholder="고객명, 연락처, 차량번호, 차대번호, 메모 검색"
            suggestions={searchSuggestions}
            value={query}
          />
        }
      />

      {filteredCustomers.length > 0 ? (
        <ListColumnTable
          columns={['고객명', '연락처', '차량', '연결 업무', '매출', '미수', '최근 작업', '상태']}
          onRowClick={(rowIndex) => {
            const customer = filteredCustomers[rowIndex];
            if (customer) onOpenCustomer(customer.id);
          }}
          rows={filteredCustomers.map((customer) => {
            const linkedSections = linkedSectionsByCustomerId.get(customer.id) ?? buildCustomerLinkedSections(customer);

            return [
              <button className="customer-name-button" key={`${customer.id}-name`} onClick={() => onOpenCustomer(customer.id)}>
                <strong>{customer.name}</strong>
                <span>{customer.memo}</span>
              </button>,
              customer.phone,
              <span className="customer-vehicle-cell" key={`${customer.id}-vehicle`}>
                <strong>{customer.vehicle}</strong>
                <small>{customer.vin}</small>
              </span>,
              <CustomerLinkedMiniSummary key={`${customer.id}-linked`} sections={linkedSections} />,
              formatMoney(customer.totalSales),
              formatMoney(customer.unpaid),
              customer.lastWork,
              <StatusPill
                key={`${customer.id}-status`}
                label={customer.unpaid > 0 ? '미수' : '정상'}
                tone={customer.unpaid > 0 ? 'red' : 'green'}
              />,
            ];
          })}
        />
      ) : (
        <div className="empty-state">
          <strong>검색 결과가 없습니다.</strong>
          <span>검색어를 줄이거나 필터를 전체로 변경해보세요.</span>
        </div>
      )}
    </Panel>
  );
}

function CustomerLinkedMiniSummary({ sections }: { sections: CustomerLinkedSection[] }) {
  const visibleSections = sections.filter((section) => section.id !== 'vehicle' && section.items.length > 0);

  if (visibleSections.length === 0) {
    return <span className="customer-linked-empty">연결 업무 없음</span>;
  }

  return (
    <div className="customer-linked-mini">
      {visibleSections.slice(0, 4).map((section) => {
        const Icon = section.icon;

        return (
          <span key={section.id}>
            <Icon size={13} />
            {section.title} {section.items.length}
          </span>
        );
      })}
    </div>
  );
}

function CustomerLinkedWorkPanel({
  sections,
  onNavigate,
}: {
  sections: CustomerLinkedSection[];
  onNavigate: (page: PageId) => void;
}) {
  const totalLinkedItems = sections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <section className="customer-linked-panel">
      <div className="customer-linked-heading">
        <div>
          <h3 className="section-title">연결 정보</h3>
          <p>고객명, 차량명, 차량번호, 차대번호로 연결된 업무를 한 번에 모았습니다.</p>
        </div>
        <strong>{totalLinkedItems}건</strong>
      </div>

      <div className="customer-linked-summary-grid">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <button
              className="customer-linked-summary-card"
              key={section.id}
              onClick={() => onNavigate(section.pageId)}
              type="button"
            >
              <Icon size={18} />
              <span>{section.title}</span>
              <strong>{section.countLabel}</strong>
              <small>{section.detail}</small>
            </button>
          );
        })}
      </div>

      <div className="customer-linked-section-list">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <section className="customer-linked-section" key={section.id}>
              <header>
                <div>
                  <Icon size={17} />
                  <div>
                    <h4>{section.title}</h4>
                    <span>{section.countLabel}</span>
                  </div>
                </div>
                <button className="text-button" onClick={() => onNavigate(section.pageId)} type="button">
                  <ExternalLink size={14} />
                  페이지로 이동
                </button>
              </header>

              {section.items.length > 0 ? (
                <div className="customer-linked-items">
                  {section.items.slice(0, 4).map((item) => (
                    <button
                      className="customer-linked-item"
                      key={item.id}
                      onClick={() => onNavigate(item.pageId)}
                      type="button"
                    >
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                      </div>
                      <div className="customer-linked-item-meta">
                        {item.meta ? <em>{item.meta}</em> : null}
                        {item.status ? <StatusPill label={item.status} tone={item.tone ?? 'gray'} /> : null}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="customer-linked-empty-box">{section.emptyLabel}</div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function CustomerDetailModal({
  customer,
  onClose,
  onNavigate,
}: {
  customer: Customer;
  onClose: () => void;
  onNavigate: (page: PageId) => void;
}) {
  const linkedSections = useMemo(() => buildCustomerLinkedSections(customer), [customer]);

  return (
    <DetailDrawer
      eyebrow="고객 상세"
      footer={<ActionFooter primaryLabel="수정 저장" secondaryLabel="닫기" onSecondary={onClose} />}
      onClose={onClose}
      title={customer.name}
    >
      <CustomerSnapshot customer={customer} />
      <CustomerLinkedWorkPanel sections={linkedSections} onNavigate={onNavigate} />
    </DetailDrawer>
  );
}

function PartnersPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PartnerFilter>('all');
  const normalizedQuery = query.trim().toLowerCase();
  const searchSuggestions = useMemo(
    () => Array.from(new Set(partners.flatMap((partner) => [partner.name, partner.type, partner.manager, partner.phone]))),
    [],
  );
  const filteredPartners = useMemo(
    () =>
      partners.filter((partner) => {
        const target = [partner.name, partner.type, partner.manager, partner.phone, partner.files].join(' ').toLowerCase();
        const matchesQuery = normalizedQuery.length === 0 || target.includes(normalizedQuery);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'shop' && partner.type === '정비소') ||
          (filter === 'insurer' && partner.type === '보험사') ||
          (filter === 'supplier' && partner.type === '매입처');

        return matchesQuery && matchesFilter;
      }),
    [filter, normalizedQuery],
  );

  return (
    <Panel title="거래처/정비소/보험사">
      <RecordToolbar
        action={
          <button className="primary-button" type="button">
            <Plus size={16} />
            거래처 등록
          </button>
        }
        count={`총 ${filteredPartners.length}건`}
        filters={
          <FilterTabs
            ariaLabel="거래처 필터"
            onChange={(value) => setFilter(value as PartnerFilter)}
            options={[
              { id: 'all', label: '전체' },
              { id: 'shop', label: '정비소' },
              { id: 'insurer', label: '보험사' },
              { id: 'supplier', label: '매입처' },
            ]}
            value={filter}
          />
        }
        search={
          <SearchInput
            label="전체 검색"
            listId="partner-search-suggestions"
            onChange={setQuery}
            placeholder="업체명, 담당자, 연락처 검색"
            suggestions={searchSuggestions}
            value={query}
          />
        }
      />
      <ListColumnTable
        columns={['구분', '업체명', '담당자', '연락처', '미수/미지급', '자료']}
        rows={filteredPartners.map((partner) => [
          partner.type,
          partner.name,
          partner.manager,
          partner.phone,
          formatMoney(partner.unpaid),
          partner.files,
        ])}
      />
    </Panel>
  );
}

function AttachmentsPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AttachmentFilter>('all');
  const [selectedFile, setSelectedFile] = useState<AttachmentItem | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const searchSuggestions = useMemo(
    () => Array.from(new Set(attachments.flatMap((file) => [file.name, file.target, file.type, file.owner]))),
    [],
  );
  const filteredAttachments = useMemo(
    () =>
      attachments.filter((file) => {
        const target = [file.name, file.target, file.type, file.owner].join(' ').toLowerCase();
        const matchesQuery = normalizedQuery.length === 0 || target.includes(normalizedQuery);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'estimate' && file.type === '견적') ||
          (filter === 'claim' && file.type === '청구') ||
          (filter === 'work' && file.type === '작업') ||
          (filter === 'base' && file.type === '기준정보');

        return matchesQuery && matchesFilter;
      }),
    [filter, normalizedQuery],
  );

  return (
    <>
    <Panel title="업무 자료">
      <RecordToolbar
        action={
          <button className="primary-button" type="button">
            <Plus size={16} />
            자료 등록
          </button>
        }
        count={`총 ${filteredAttachments.length}건`}
        filters={
          <FilterTabs
            ariaLabel="자료 필터"
            onChange={(value) => setFilter(value as AttachmentFilter)}
            options={[
              { id: 'all', label: '전체' },
              { id: 'estimate', label: '견적' },
              { id: 'claim', label: '청구' },
              { id: 'work', label: '작업' },
              { id: 'base', label: '기준정보' },
            ]}
            value={filter}
          />
        }
        search={
          <SearchInput
            label="전체 검색"
            listId="attachment-search-suggestions"
            onChange={setQuery}
            placeholder="파일명, 연결 업무, 고객/거래처 검색"
            suggestions={searchSuggestions}
            value={query}
          />
        }
      />
      <ListColumnTable
        columns={['파일명', '연결 업무', '구분', '고객/거래처']}
        onRowClick={(rowIndex) => {
          const file = filteredAttachments[rowIndex];
          if (file) setSelectedFile(file);
        }}
        rows={filteredAttachments.map((file) => [
          file.name,
          file.target,
          file.type,
          file.owner,
        ])}
      />
    </Panel>
    {selectedFile ? <AttachmentDetailDrawer file={selectedFile} onClose={() => setSelectedFile(null)} /> : null}
    </>
  );
}

function LedgerWorkbookPage({ vehicleModelSuggestions }: { vehicleModelSuggestions: string[] }) {
  const [query, setQuery] = useState('');
  const [activeSheetId, setActiveSheetId] = useState<LedgerSheetId>('salesLedger');
  const normalizedQuery = query.trim().toLowerCase();
  const activeSheet = ledgerSheetTabs.find((sheet) => sheet.id === activeSheetId) ?? ledgerSheetTabs[0]!;
  const activeSheetRows = ledgerSheetRowsById[activeSheet.id];
  const filteredRows = useMemo(
    () => activeSheetRows.filter((row) => normalizedQuery.length === 0 || row.searchText.includes(normalizedQuery)),
    [activeSheetRows, normalizedQuery],
  );
  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...ledgerRecords.flatMap((record) => [
              record.no,
              record.category,
              record.company,
              record.partner,
              record.vehicle,
              record.plate,
              record.paymentMethod,
              record.status,
            ]),
            ...cardSettlements.flatMap((item) => [item.brand, item.plate, item.status]),
            ...vehicleModelSuggestions,
          ].filter(Boolean),
        ),
      ),
    [vehicleModelSuggestions],
  );
  const totalRevenue = ledgerRecords.reduce((sum, record) => sum + record.depositAmount + record.paymentAmount, 0);
  const claimTotal = ledgerRecords.reduce((sum, record) => sum + record.claimAmount, 0);
  const cardTotal = cardSettlements.reduce((sum, item) => sum + item.paid, 0);
  const sheetTotal = filteredRows.reduce((sum, row) => sum + row.amount, 0);
  const pendingCount = filteredRows.filter((row) => /대기|미수|예정|확인/.test(row.status)).length;

  return (
    <div className="page-stack ledger-workbook-page">
      <section className="kpi-grid" aria-label="장부 요약">
        <KpiCard icon={ReceiptText} label="4월 장부 합계" value={formatMoney(totalRevenue)} detail="보험입금+결제금액 기준" tone="blue" />
        <KpiCard icon={WalletCards} label="보험 청구" value={formatMoney(claimTotal)} detail="청구금액 별도 추적" tone="orange" />
        <KpiCard icon={CreditCard} label="카드 입금" value={formatMoney(cardTotal)} detail="카드 장부 지급액 기준" tone="green" />
        <KpiCard icon={FileText} label={activeSheet.label} value={`${filteredRows.length}건`} detail="현재 목록 행 수" tone={activeSheet.tone} />
        <KpiCard icon={CheckCircle2} label="장부 시트" value={`${ledgerSheetTabs.length}개`} detail={`확인 필요 ${pendingCount}건 · ${formatMoney(sheetTotal)}`} tone="purple" />
      </section>

      <Panel
        action={
          <span className="ledger-source-chip">
            <Download size={14} />
            {activeSheet.source}
          </span>
        }
        className="ledger-sheet-panel"
        title={`${activeSheet.label} 목록`}
      >
        <div className="ledger-sheet-tabs">
          <FilterTabs
            ariaLabel="장부 시트"
            onChange={(value) => {
              setActiveSheetId(value as LedgerSheetId);
              setQuery('');
            }}
            options={ledgerSheetTabs}
            value={activeSheetId}
          />
        </div>
          <RecordToolbar
            action={
              <button className="primary-button" type="button">
                <Plus size={16} />
                행 추가
              </button>
            }
            count={`총 ${filteredRows.length}행`}
            search={
              <SearchInput
                label="장부 검색"
                listId="ledger-search-suggestions"
                onChange={setQuery}
                placeholder="차량번호, 업체, 금액, 상태 검색"
                suggestions={searchSuggestions}
                value={query}
              />
            }
          />
          <div className="ledger-sheet-meta">
            <span>합계 {formatMoney(sheetTotal)}</span>
            <span>확인 필요 {pendingCount}건</span>
            <span>{activeSheet.source}</span>
          </div>
          <ListColumnTable
            columns={['행', ...ledgerSheetColumns[activeSheet.id]]}
            rows={filteredRows.map((row, rowIndex) => [
              <span className="ledger-row-number" key={`${row.key}-row-number`}>
                {rowIndex + 1}
              </span>,
              ...row.cells,
            ])}
          />
      </Panel>
    </div>
  );
}

function normalizePriceBookText(value: string) {
  return value
    .toLowerCase()
    .replace(/[()\s./-]/g, '')
    .replace(/제네시스/g, '')
    .replace(/그랜저/g, 'gn')
    .replace(/아반떼/g, 'cn')
    .replace(/펠리세이드/g, '팰리세이드');
}

function priceBookSearchText(row: PriceBookRow) {
  return [
    row.source,
    row.category,
    row.target,
    row.item,
    row.spec,
    row.memo,
    row.width,
    row.height,
    row.price ? String(row.price) : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function matchesPriceBookFilter(row: PriceBookRow, filter: PriceBookFilter) {
  if (filter === 'all') return true;
  if (filter === 'best') return row.source === '베스트단가표' && row.category === '차량유리';
  if (filter === 'service') return row.category === '작업단가';
  if (filter === 'tint') return row.source === '썬팅';
  return row.source === '필름재단';
}

function isConnectedFilmCut(row: PriceBookRow, focusText: string) {
  const target = normalizePriceBookText(row.target);
  const focus = normalizePriceBookText(focusText);
  if (focus.length < 2) return false;

  const codeMatches = focusText.match(/[A-Za-z0-9]{2,}/g) ?? [];
  return target.includes(focus) || focus.includes(target) || codeMatches.some((code) => target.includes(code.toLowerCase()));
}

function formatPriceBookAmount(row: PriceBookRow) {
  if (row.price !== undefined) return formatMoney(row.price);
  if (row.width && row.height) return `가로 ${row.width} · 세로 ${row.height}`;
  return '-';
}

function downloadPriceBookTemplate() {
  const columns = ['출처', '구분', '차종/브랜드', '품목', '사양', '금액', '재단가로', '재단세로', 'VAT포함', '비고'];
  const rows = priceBookRows.slice(0, 30).map((row) => [
    row.source,
    row.category,
    row.target,
    row.item,
    row.spec,
    row.price !== undefined ? String(row.price) : '',
    row.width ?? '',
    row.height ?? '',
    row.vatIncluded ? 'Y' : 'N',
    row.memo ?? '',
  ]);
  const csv = [columns, ...rows].map((row) => row.map(salesProductCsvCell).join(',')).join('\r\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = '기준정보_단가표_양식.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function productListRowToDraft(row?: ProductListRow | MockProductItemRow): ProductListDraft {
  return {
    itemCode: row?.itemCode ?? '',
    itemName: row?.itemName ?? '',
    spec: row?.spec ?? '',
    inboundPrice: row?.inboundPrice ?? '',
    outboundPrice: row?.outboundPrice ?? '',
    exchangePrice: row?.exchangePrice ?? '',
    note: row?.note ?? '',
  };
}

function productListSearchText(row: ProductListRow) {
  return productListColumns.map((column) => row[column.key]).join(' ');
}

function formatProductListPrice(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';

  const parsed = Number(trimmedValue.replaceAll(',', ''));
  if (!Number.isFinite(parsed)) return trimmedValue;
  return parsed.toLocaleString('ko-KR');
}

function productListRowCells(row: ProductListRow) {
  return [
    <strong key={`${row.id}-code`}>{row.itemCode}</strong>,
    row.itemName,
    row.spec,
    formatProductListPrice(row.inboundPrice),
    formatProductListPrice(row.outboundPrice),
    formatProductListPrice(row.exchangePrice),
    row.note,
  ];
}

function downloadProductListRows(rows: ProductListRow[]) {
  const csvRows = [
    productListColumns.map((column) => column.label),
    ...rows.map((row) => productListColumns.map((column) => row[column.key] ?? '')),
  ];
  const csv = csvRows.map((row) => row.map(salesProductCsvCell).join(',')).join('\r\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = '품목리스트.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeProductListHeader(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function parseDelimitedText(text: string, delimiter: ',' | '\t') {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const normalizedText = text.replace(/^\ufeff/, '');

  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index];
    const nextChar = normalizedText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((value) => value.trim().length > 0));
}

function parseProductListImportText(text: string): ProductListRow[] {
  const firstLine = text.replace(/^\ufeff/, '').split(/\r?\n/, 1)[0] ?? '';
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  const rows = parseDelimitedText(text, delimiter);
  if (rows.length === 0) return [];

  const headerMap = new Map(productListColumns.map((column) => [normalizeProductListHeader(column.label), column.key]));
  const firstRowKeys = rows[0]!.map((cell) => headerMap.get(normalizeProductListHeader(cell)));
  const hasHeader = firstRowKeys.filter(Boolean).length >= 3;
  const fieldKeys = hasHeader ? firstRowKeys : productListColumns.map((column) => column.key);
  const bodyRows = hasHeader ? rows.slice(1) : rows;
  const importKey = Date.now().toString(36);

  return bodyRows
    .map((cells, index) => {
      const draft = productListRowToDraft();
      fieldKeys.forEach((key, cellIndex) => {
        if (!key) return;
        draft[key] = cells[cellIndex]?.trim() ?? '';
      });

      return {
        ...draft,
        sourceRow: index + 2,
        id: `import-${importKey}-${index}-${draft.itemCode || 'row'}`,
      };
    })
    .filter((row) => productListColumns.some((column) => row[column.key].trim().length > 0));
}

function PriceBookPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [productRows, setProductRows] = useState<ProductListRow[]>(initialProductListRows);
  const [selectedId, setSelectedId] = useState(initialProductListRows[0]?.id ?? '');
  const [editDraft, setEditDraft] = useState<ProductListDraft>(() => productListRowToDraft(initialProductListRows[0]));
  const [registrationDraft, setRegistrationDraft] = useState<ProductListDraft>(() => productListRowToDraft());
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = useMemo(
    () =>
      productRows.filter(
        (row) => normalizedQuery.length === 0 || productListSearchText(row).toLowerCase().includes(normalizedQuery),
      ),
    [normalizedQuery, productRows],
  );
  const selectedRow = productRows.find((row) => row.id === selectedId) ?? filteredRows[0] ?? productRows[0];
  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          productRows.flatMap((row) => [row.itemCode, row.itemName, row.spec, row.note]),
        ),
      ).filter(Boolean),
    [productRows],
  );
  const inboundPriceCount = productRows.filter((row) => row.inboundPrice.trim().length > 0).length;
  const outboundPriceCount = productRows.filter((row) => row.outboundPrice.trim().length > 0).length;
  const exchangePriceCount = productRows.filter((row) => row.exchangePrice.trim().length > 0).length;
  const memoCount = productRows.filter((row) => row.note.trim().length > 0).length;

  useEffect(() => {
    if (!selectedRow) return;
    setEditDraft(productListRowToDraft(selectedRow));
  }, [selectedRow?.id]);

  function updateEditDraft(key: ProductListField, value: string) {
    setEditDraft((current) => ({ ...current, [key]: value }));
  }

  function updateRegistrationDraft(key: ProductListField, value: string) {
    setRegistrationDraft((current) => ({ ...current, [key]: value }));
  }

  function selectProductRow(row: ProductListRow) {
    setSelectedId(row.id);
    setEditDraft(productListRowToDraft(row));
  }

  function saveSelectedProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRow) return;

    setProductRows((current) => current.map((row) => (row.id === selectedRow.id ? { ...row, ...editDraft } : row)));
  }

  function addProductRow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextRow: ProductListRow = {
      ...registrationDraft,
      sourceRow: null,
      id: `product-new-${Date.now()}`,
    };

    setProductRows((current) => [nextRow, ...current]);
    setSelectedId(nextRow.id);
    setEditDraft(productListRowToDraft(nextRow));
    setRegistrationDraft(productListRowToDraft());
    setIsRegistrationOpen(false);
  }

  async function handleProductListFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const importedRows = parseProductListImportText(text);
    if (importedRows.length > 0) {
      setProductRows(importedRows);
      setSelectedId(importedRows[0]!.id);
      setEditDraft(productListRowToDraft(importedRows[0]));
      setQuery('');
    }
    event.target.value = '';
  }

  return (
    <div className="page-stack price-book-page">
      <section className="kpi-grid" aria-label="품목리스트 요약">
        <KpiCard icon={Package} label="품목 전체" value={`${productRows.length.toLocaleString('ko-KR')}건`} detail="품목리스트 원본 행" tone="blue" />
        <KpiCard icon={ReceiptText} label="입고단가" value={`${inboundPriceCount.toLocaleString('ko-KR')}건`} detail="입고단가 입력 품목" tone="orange" />
        <KpiCard icon={WalletCards} label="출고단가" value={`${outboundPriceCount.toLocaleString('ko-KR')}건`} detail="출고단가 입력 품목" tone="green" />
        <KpiCard icon={ShieldCheck} label="교환단가" value={`${exchangePriceCount.toLocaleString('ko-KR')}건`} detail="교환단가 입력 품목" tone="purple" />
        <KpiCard icon={FileText} label="적요" value={`${memoCount.toLocaleString('ko-KR')}건`} detail="비고/메모 입력 품목" tone="yellow" />
      </section>

      <section className="workbench-grid">
        <Panel
          className="span-8 product-list-panel"
          title="품목리스트"
          action={
            <div className="price-book-actions">
              <button className="secondary-button" onClick={() => fileInputRef.current?.click()} type="button">
                <Upload size={16} />
                엑셀 등록
              </button>
              <button className="secondary-button" onClick={() => downloadProductListRows(productRows)} type="button">
                <Download size={16} />
                엑셀 다운로드
              </button>
              <button className="primary-button" onClick={() => setIsRegistrationOpen(true)} type="button">
                <Plus size={16} />
                신규 등록
              </button>
            </div>
          }
        >
          <input
            accept=".csv,.tsv,.txt"
            className="visually-hidden"
            onChange={handleProductListFileChange}
            ref={fileInputRef}
            type="file"
          />
          <RecordToolbar
            count={`총 ${filteredRows.length.toLocaleString('ko-KR')}건`}
            search={
              <SearchInput
                label="품목 검색"
                listId="product-list-search-suggestions"
                onChange={setQuery}
                placeholder="품목코드, 품목명, 규격정보, 적요 검색"
                suggestions={searchSuggestions}
                value={query}
              />
            }
          />
          <ListColumnTable
            columns={productListColumns.map((column) => column.label)}
            onRowClick={(rowIndex) => selectProductRow(filteredRows[rowIndex]!)}
            rows={filteredRows.map(productListRowCells)}
          />
        </Panel>

        <Panel className="span-4 product-edit-panel" title="선택 품목 수정">
          {selectedRow ? (
            <form className="product-list-edit-form" onSubmit={saveSelectedProduct}>
              {productListColumns.map((column) => (
                <label className="estimate-control" key={`edit-${column.key}`}>
                  <span>{column.label}</span>
                  {column.key === 'note' ? (
                    <textarea onChange={(event) => updateEditDraft(column.key, event.target.value)} value={editDraft[column.key]} />
                  ) : (
                    <input
                      inputMode={column.key.includes('Price') ? 'numeric' : undefined}
                      onChange={(event) =>
                        updateEditDraft(
                          column.key,
                          column.key.includes('Price') ? formatMoneyInputValue(event.target.value) : event.target.value,
                        )
                      }
                      value={column.key.includes('Price') ? formatMoneyInputValue(editDraft[column.key]) : editDraft[column.key]}
                    />
                  )}
                </label>
              ))}
              <button className="primary-button full" type="submit">
                수정 저장
              </button>
            </form>
          ) : (
            <p className="helper-text">등록된 품목이 없습니다.</p>
          )}
        </Panel>
      </section>

      {isRegistrationOpen ? (
        <DetailDrawer
          eyebrow="품목리스트"
          onClose={() => setIsRegistrationOpen(false)}
          title="품목 등록"
          variant="modal"
        >
          <form className="price-book-registration-form" onSubmit={addProductRow}>
            <div className="sales-form-grid">
              {productListColumns.map((column) => (
                <label className={column.key === 'spec' || column.key === 'note' ? 'estimate-control full' : 'estimate-control'} key={`register-${column.key}`}>
                  <span>
                    {column.label}
                    {column.key === 'itemCode' || column.key === 'itemName' ? <em>필수</em> : null}
                  </span>
                  {column.key === 'note' ? (
                    <textarea
                      onChange={(event) => updateRegistrationDraft(column.key, event.target.value)}
                      value={registrationDraft[column.key]}
                    />
                  ) : (
                    <input
                      inputMode={column.key.includes('Price') ? 'numeric' : undefined}
                      onChange={(event) =>
                        updateRegistrationDraft(
                          column.key,
                          column.key.includes('Price') ? formatMoneyInputValue(event.target.value) : event.target.value,
                        )
                      }
                      required={column.key === 'itemCode' || column.key === 'itemName'}
                      value={column.key.includes('Price') ? formatMoneyInputValue(registrationDraft[column.key]) : registrationDraft[column.key]}
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="estimate-save-row">
              <button className="secondary-button" onClick={() => setIsRegistrationOpen(false)} type="button">
                닫기
              </button>
              <button className="primary-button" type="submit">
                품목 저장
              </button>
            </div>
          </form>
        </DetailDrawer>
      ) : null}
    </div>
  );
}

function WarrantyCertificatePreview({ draft }: { draft: WarrantyDraft }) {
  const normalized = normalizeWarrantyDraft(draft);
  const filmSummary = formatWarrantyFilmSummary(normalized) || '-';
  const repairContent = normalized.repairContent || WARRANTY_DEFAULT_REPAIR_CONTENT;
  const displayValue = (value: string) => value.trim() || '-';

  return (
    <article className="warranty-paper" aria-label="썬팅 필름 보증서 미리보기">
      <header className="warranty-paper-header">
        <div className="warranty-company">
          <strong>{BRAND_NAME}</strong>
          <span>자동차 유리 · 썬팅 시공 보증 관리</span>
        </div>
        <div className="warranty-meta">
          <span>보증서 번호: {normalized.id}</span>
          <span>발행일: {displayValue(normalized.workDate)}</span>
        </div>
      </header>
      <section className="warranty-title">
        <h3>썬팅 필름 보증서</h3>
        <p>Genuine Product Certification</p>
        <span>본 시공은 {BRAND_NAME}에서 진행하였습니다.</span>
      </section>
      <table className="warranty-certificate-table">
        <tbody>
          <tr>
            <th>고객 성함</th>
            <td>{displayValue(normalized.customerName)}</td>
            <th>고객 연락처</th>
            <td>{displayValue(normalized.customerPhone)}</td>
          </tr>
          <tr>
            <th>브랜드/차종</th>
            <td>{displayValue(normalized.vehicle)}</td>
            <th>필름사양</th>
            <td>{filmSummary}</td>
          </tr>
          <tr>
            <th>시공날짜</th>
            <td>{displayValue(normalized.workDate)}</td>
            <th>차량번호</th>
            <td>{displayValue(normalized.plate)}</td>
          </tr>
          <tr>
            <th>시공내역</th>
            <td colSpan={3}>{displayValue(normalized.workDescription)}</td>
          </tr>
        </tbody>
      </table>
      <div className="warranty-notice-title">수리원인 및 정비 내용</div>
      <div className="warranty-notice-box">{repairContent}</div>
      <footer className="warranty-sign">
        <strong>{BRAND_NAME}</strong>
        <div className="warranty-seal-row">
          <span>대표</span>
          <span className="warranty-seal">인</span>
        </div>
        <span>위와 같이 수리내용을 확인합니다.</span>
      </footer>
    </article>
  );
}

function WarrantyPage({
  vehicleModelSuggestions,
  workRecords,
}: {
  vehicleModelSuggestions: string[];
  workRecords: WorkerWorkListRecord[];
}) {
  const [records, setRecords] = useState<WarrantyRecord[]>(warrantyRecords);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<WarrantyFilter>('all');
  const [draft, setDraft] = useState<WarrantyDraft>(() => createWarrantyDraft());
  const [selectedSourceWorkId, setSelectedSourceWorkId] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<WarrantyDraft | null>(null);
  const [pdfDraft, setPdfDraft] = useState<WarrantyDraft | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const warrantySourceWorks = useMemo(
    () =>
      [...workRecords]
        .filter(isWarrantySourceWorkRecord)
        .sort((left, right) => (normalizeWorkDate(right.date) || right.date).localeCompare(normalizeWorkDate(left.date) || left.date)),
    [workRecords],
  );
  const selectedSourceWork = useMemo(
    () => warrantySourceWorks.find((record) => record.id === selectedSourceWorkId) ?? null,
    [selectedSourceWorkId, warrantySourceWorks],
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [
            record.type,
            record.workDate,
            record.customerName,
            record.customerPhone,
            record.vehicle,
            record.plate,
            record.workDescription,
            record.partNo,
            record.frontFilm,
            record.sideFirstFilm,
            record.sideRearFilm,
            record.status,
            isUnissuedWarranty(record) ? '미발행건' : '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'unissued' && isUnissuedWarranty(record)) ||
          (filter === 'issued' && record.status === '발행완료') ||
          (filter === 'check' && record.status === '확인필요');

        return matchesQuery && matchesFilter;
      }),
    [filter, normalizedQuery, records],
  );
  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          records.flatMap((record) => [
            record.customerName,
            record.customerPhone,
            record.vehicle,
            record.plate,
            record.partNo,
            ...vehicleModelSuggestions,
          ]),
        ),
      ).filter(Boolean),
    [records, vehicleModelSuggestions],
  );
  const unissuedCount = records.filter(isUnissuedWarranty).length;
  const issuedCount = records.filter((record) => record.status === '발행완료').length;
  const checkCount = records.filter((record) => record.status === '확인필요').length;

  function updateDraftField<K extends keyof WarrantyDraft>(key: K, value: WarrantyDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function findSourceWorkForWarranty(record: WarrantyRecord) {
    return (
      warrantySourceWorks.find((workRecord) => {
        const sameDate = normalizeWorkDate(workRecord.date) === normalizeWorkDate(record.workDate);
        const samePlate = workRecord.plateNumber !== '-' && workRecord.plateNumber === record.plate;
        const sameVehicle = workRecord.vehicle === record.vehicle;
        return sameDate && (samePlate || sameVehicle);
      }) ?? null
    );
  }

  function handleSourceWorkChange(sourceWorkId: string) {
    setSelectedSourceWorkId(sourceWorkId);
    const sourceWork = warrantySourceWorks.find((record) => record.id === sourceWorkId);
    if (!sourceWork) return;

    setDraft((current) => createWarrantyDraftFromWorkRecord(sourceWork, current));
  }

  function openNewWarranty() {
    setSelectedSourceWorkId('');
    setDraft(createWarrantyDraft());
    setIsEditorOpen(true);
  }

  function openExistingWarranty(record: WarrantyRecord) {
    setSelectedSourceWorkId(findSourceWorkForWarranty(record)?.id ?? '');
    setDraft(createWarrantyDraft(record));
    setIsEditorOpen(true);
  }

  function saveDraft(nextDraft = draft) {
    const normalized = normalizeWarrantyDraft(nextDraft);
    const record = createWarrantyRecordFromDraft(normalized);
    setRecords((current) =>
      current.some((item) => item.id === record.id)
        ? current.map((item) => (item.id === record.id ? record : item))
        : [record, ...current],
    );
    setDraft(normalized);
    return normalized;
  }

  function handleSaveOnly() {
    saveDraft();
    setIsEditorOpen(false);
  }

  function handlePreview() {
    const normalized = saveDraft();
    setIsEditorOpen(false);
    setPreviewDraft(normalized);
  }

  function handleMarkIssued(nextDraft: WarrantyDraft) {
    const issuedDraft = saveDraft({ ...nextDraft, status: '발행완료', tone: 'green' });
    setPreviewDraft(null);
    setPdfDraft(issuedDraft);
  }

  return (
    <div className="page-stack warranty-page">
      <section className="kpi-grid" aria-label="보증서 요약">
        <KpiCard icon={ShieldCheck} label="보증서 전체" value={`${records.length}건`} detail="썬팅 보증서 발행 대상" tone="blue" />
        <KpiCard icon={AlertCircle} label="미발행건" value={`${unissuedCount}건`} detail="작업일 경과 후 발행 안 됨" tone="red" />
        <KpiCard icon={CheckCircle2} label="발행완료" value={`${issuedCount}건`} detail="PDF 출력/전달 완료 기준" tone="green" />
        <KpiCard icon={AlertCircle} label="확인필요" value={`${checkCount}건`} detail="차량/필름 정보 확인 대상" tone="orange" />
        <KpiCard icon={Car} label="템플릿" value="A4" detail="BOB0 썬팅보증서 항목 반영" tone="purple" />
      </section>

      <Panel
        title="보증서 목록"
        action={
          <button className="primary-button" onClick={openNewWarranty} type="button">
            <Plus size={16} />
            보증서 작성
          </button>
        }
      >
        <RecordToolbar
          count={`총 ${filteredRecords.length}건`}
          filters={
            <FilterTabs
              ariaLabel="보증서 상태 필터"
              onChange={(value) => setFilter(value as WarrantyFilter)}
              options={warrantyFilterOptions}
              value={filter}
            />
          }
          search={
            <SearchInput
              label="보증서 검색"
              listId="warranty-search-suggestions"
              onChange={setQuery}
              placeholder="차량번호, 고객, 차종, 필름 검색"
              suggestions={searchSuggestions}
              value={query}
            />
          }
        />
        <ListColumnTable
          columns={['구분', '작업일', '차종', '차량번호', '작업내역', '품번', '썬팅', '보증서', '정보']}
          onRowClick={(rowIndex) => openExistingWarranty(filteredRecords[rowIndex]!)}
          rows={filteredRecords.map((record) => [
            record.type,
            record.workDate,
            record.vehicle,
            record.plate,
            record.workDescription,
            record.partNo || '-',
            formatWarrantyFilmSummary(record) || '-',
            <StatusPill key={`${record.id}-status`} label={record.status} tone={getWarrantyTone(record.status, record.workDate)} />,
            <div className="warranty-table-actions" key={`${record.id}-actions`}>
              <button className="mini-button" onClick={() => openExistingWarranty(record)} type="button">
                상세
              </button>
              <button className="mini-button" onClick={() => setPdfDraft(createWarrantyDraft(record))} type="button">
                PDF 출력
              </button>
            </div>,
          ])}
        />
      </Panel>

      {isEditorOpen ? (
        <DetailDrawer
          eyebrow="썬팅보증서"
          footer={
            <div className="warranty-action-footer">
              <button className="secondary-button" onClick={() => setIsEditorOpen(false)} type="button">
                닫기
              </button>
              <button className="secondary-button" onClick={handleSaveOnly} type="button">
                임시저장
              </button>
              <button className="primary-button" onClick={handlePreview} type="button">
                <FileText size={16} />
                PDF 미리보기
              </button>
            </div>
          }
          onClose={() => setIsEditorOpen(false)}
          title="보증서 작성"
        >
          <FormSection title="작업 정보 불러오기">
            <div className="warranty-source-loader">
              <label>
                <span>썬팅 작업</span>
                <select onChange={(event) => handleSourceWorkChange(event.target.value)} value={selectedSourceWorkId}>
                  <option value="">직접 입력</option>
                  {warrantySourceWorks.map((record) => (
                    <option key={record.id} value={record.id}>
                      {formatWarrantySourceWorkLabel(record)}
                    </option>
                  ))}
                </select>
              </label>
              {selectedSourceWork ? (
                <div className="warranty-source-summary">
                  <strong>{compactTextParts([selectedSourceWork.customer, selectedSourceWork.vehicle])}</strong>
                  <span>
                    {compactTextParts([
                      normalizeWorkDate(selectedSourceWork.date) || selectedSourceWork.date,
                      selectedSourceWork.time,
                      selectedSourceWork.plateNumber === '-' ? '' : selectedSourceWork.plateNumber,
                      selectedSourceWork.stock,
                    ])}
                  </span>
                  <p>{firstLine(selectedSourceWork.title)}</p>
                </div>
              ) : warrantySourceWorks.length === 0 ? (
                <div className="warranty-source-summary empty">
                  <span>완료된 썬팅 작업 없음</span>
                </div>
              ) : null}
            </div>
          </FormSection>

          <FormSection title="고객 및 차량">
            <div className="warranty-form-grid">
              <label>
                <span>구분</span>
                <input onChange={(event) => updateDraftField('type', event.target.value)} value={draft.type} />
              </label>
              <label>
                <span>작업일</span>
                <input
                  onChange={(event) => updateDraftField('workDate', event.target.value)}
                  type="date"
                  value={draft.workDate}
                />
              </label>
              <label>
                <span>고객 성함</span>
                <input
                  onChange={(event) => updateDraftField('customerName', event.target.value)}
                  placeholder="고객명"
                  value={draft.customerName}
                />
              </label>
              <label>
                <span>고객 연락처</span>
                <input
                  onChange={(event) => updateDraftField('customerPhone', event.target.value)}
                  placeholder="010-0000-0000"
                  value={draft.customerPhone}
                />
              </label>
              <label>
                <span>브랜드/차종</span>
                <input
                  list="warranty-vehicle-suggestions"
                  onChange={(event) => updateDraftField('vehicle', event.target.value)}
                  placeholder="현대 그랜저(GN7)"
                  value={draft.vehicle}
                />
              </label>
              <label>
                <span>차량번호</span>
                <input
                  onChange={(event) => updateDraftField('plate', event.target.value)}
                  placeholder="123가4567"
                  value={draft.plate}
                />
              </label>
              <label className="wide">
                <span>시공내역</span>
                <input
                  onChange={(event) => updateDraftField('workDescription', event.target.value)}
                  placeholder="전체 썬팅시공"
                  value={draft.workDescription}
                />
              </label>
            </div>
          </FormSection>

          <FormSection title="필름 사양">
            <div className="warranty-form-grid">
              <label>
                <span>품번</span>
                <input
                  onChange={(event) => updateDraftField('partNo', event.target.value)}
                  placeholder="RAYNO-R2-45"
                  value={draft.partNo}
                />
              </label>
              <label>
                <span>발행 상태</span>
                <select
                  onChange={(event) => updateDraftField('status', event.target.value as WarrantyStatus)}
                  value={draft.status}
                >
                  <option value="미발행">미발행</option>
                  <option value="발행완료">발행완료</option>
                  <option value="확인필요">확인필요</option>
                </select>
              </label>
              <label>
                <span>전면</span>
                <input
                  onChange={(event) => updateDraftField('frontFilm', event.target.value)}
                  placeholder="[RAYNO] Presto R2 (45%)"
                  value={draft.frontFilm}
                />
              </label>
              <label>
                <span>측(1열)</span>
                <input
                  onChange={(event) => updateDraftField('sideFirstFilm', event.target.value)}
                  placeholder="[T-NINE] R100 (30%)"
                  value={draft.sideFirstFilm}
                />
              </label>
              <label className="wide">
                <span>측(2열)+후면</span>
                <input
                  onChange={(event) => updateDraftField('sideRearFilm', event.target.value)}
                  placeholder="[RAYNO] PRESTO R1 (5%)"
                  value={draft.sideRearFilm}
                />
              </label>
            </div>
          </FormSection>

          <FormSection title="수리원인 및 정비 내용">
            <div className="warranty-form-grid">
              <label className="wide">
                <span>보증서 본문</span>
                <textarea
                  onChange={(event) => updateDraftField('repairContent', event.target.value)}
                  rows={9}
                  value={draft.repairContent}
                />
              </label>
              <label className="wide">
                <span>내부 메모</span>
                <textarea
                  onChange={(event) => updateDraftField('memo', event.target.value)}
                  placeholder="고객에게 표시되지 않는 메모"
                  rows={3}
                  value={draft.memo}
                />
              </label>
            </div>
          </FormSection>

          <datalist id="warranty-vehicle-suggestions">
            {vehicleModelSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </DetailDrawer>
      ) : null}

      {previewDraft ? (
        <DetailDrawer
          eyebrow="PDF 미리보기"
          footer={
            <div className="action-footer">
              <button className="secondary-button" onClick={() => setPreviewDraft(null)} type="button">
                닫기
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  setPdfDraft(previewDraft);
                  setPreviewDraft(null);
                }}
                type="button"
              >
                <ExternalLink size={16} />
                PDF 보기/출력
              </button>
            </div>
          }
          onClose={() => setPreviewDraft(null)}
          title="보증서 미리보기"
          variant="modal"
        >
          <div className="warranty-preview-shell">
            <WarrantyCertificatePreview draft={previewDraft} />
          </div>
        </DetailDrawer>
      ) : null}
      {pdfDraft ? (
        <DetailDrawer
          eyebrow="A4 출력 보기"
          footer={
            <div className="action-footer warranty-pdf-footer">
              <button className="secondary-button" onClick={() => setPdfDraft(null)} type="button">
                닫기
              </button>
              <button className="secondary-button" onClick={() => handleMarkIssued(pdfDraft)} type="button">
                <CheckCircle2 size={16} />
                발행완료 처리
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  const frame = document.getElementById('warranty-pdf-frame') as HTMLIFrameElement | null;
                  frame?.contentWindow?.focus();
                  frame?.contentWindow?.print();
                }}
                type="button"
              >
                <Download size={16} />
                PDF 저장/인쇄
              </button>
            </div>
          }
          onClose={() => setPdfDraft(null)}
          title="PDF 출력"
          variant="modal"
        >
          <div className="warranty-pdf-viewer-shell">
            <iframe
              className="warranty-pdf-frame"
              id="warranty-pdf-frame"
              srcDoc={buildWarrantyPrintHtml(pdfDraft)}
              title="보증서 PDF 출력"
            />
          </div>
        </DetailDrawer>
      ) : null}
    </div>
  );
}

function SheetImportPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SheetImportFilter>('all');
  const [selectedSheetName, setSelectedSheetName] = useState(sheetReviewItems[0]!.sheet);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredSheets = useMemo(
    () =>
      sheetReviewItems.filter((item) => {
        const target = [item.sheet, item.role, item.module, item.dbTarget, item.status, item.risk, item.notes]
          .join(' ')
          .toLowerCase();
        const matchesQuery = normalizedQuery.length === 0 || target.includes(normalizedQuery);
        const matchesFilter = filter === 'all' || item.filter === filter;

        return matchesQuery && matchesFilter;
      }),
    [filter, normalizedQuery],
  );
  const selectedSheet = sheetReviewItems.find((item) => item.sheet === selectedSheetName) ?? sheetReviewItems[0]!;
  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(sheetReviewItems.flatMap((item) => [item.sheet, item.module, item.dbTarget, item.role, item.status])),
      ),
    [],
  );
  const dbReadyCount = sheetReviewItems.filter((item) => item.status === 'DB후보').length;
  const secureCount = sheetReviewItems.filter((item) => item.filter === 'secure' || item.status === '보안분리').length;
  const formulaSheets = sheetReviewItems.filter((item) => item.rows.includes('수식')).length;
  const documentSheets = sheetReviewItems.filter((item) => item.filter === 'document').length;

  return (
    <div className="page-stack sheet-import-page">
      <section className="kpi-grid" aria-label="시트 전환 요약">
        <KpiCard icon={FolderOpen} label="원본 시트" value="16개" detail="BOB0.xlsx 기준" tone="blue" />
        <KpiCard icon={CheckCircle2} label="DB 후보" value={`${dbReadyCount}개`} detail="검토 후 기준정보로 전환" tone="green" />
        <KpiCard icon={AlertCircle} label="보안 분리" value={`${secureCount}개`} detail="계정/계좌/권한 제한" tone="red" />
        <KpiCard icon={ReceiptText} label="수식 포함" value={`${formulaSheets}개`} detail="계산 규칙으로 분리" tone="orange" />
        <KpiCard icon={FileText} label="문서 양식" value={`${documentSheets}개`} detail="PDF 템플릿 후보" tone="purple" />
      </section>

      <section className="workbench-grid">
        <Panel className="span-8" title="시트별 전환 검토">
          <RecordToolbar
            action={
              <button className="primary-button" type="button">
                <Download size={16} />
                검토안 저장
              </button>
            }
            count={`총 ${filteredSheets.length}개`}
            filters={
              <FilterTabs
                ariaLabel="시트 전환 필터"
                onChange={(value) => setFilter(value as SheetImportFilter)}
                options={[
                  { id: 'all', label: '전체' },
                  { id: 'core', label: '핵심업무' },
                  { id: 'reference', label: '기준정보' },
                  { id: 'finance', label: '정산' },
                  { id: 'document', label: '문서' },
                  { id: 'secure', label: '보안' },
                ]}
                value={filter}
              />
            }
            search={
              <SearchInput
                label="시트 검색"
                listId="sheet-import-search-suggestions"
                onChange={setQuery}
                placeholder="시트명, 업무, DB 후보 검색"
                suggestions={searchSuggestions}
                value={query}
              />
            }
          />
          <ListColumnTable
            columns={['시트', '업무화 방향', 'DB 후보', '상태', '검토']}
            rows={filteredSheets.map((item) => [
              `${item.sheet}\n${item.rows}`,
              `${item.module} · ${item.role}`,
              item.dbTarget,
              <StatusPill key={`${item.sheet}-status`} label={item.status} tone={item.tone} />,
              <button
                className="mini-button"
                key={`${item.sheet}-select`}
                onClick={() => setSelectedSheetName(item.sheet)}
                type="button"
              >
                보기
              </button>,
            ])}
          />
        </Panel>

        <Panel className="span-4" title="선택 시트">
          <div className="sheet-detail-card">
            <div className="row-title">
              <strong>{selectedSheet.sheet}</strong>
              <StatusPill label={selectedSheet.status} tone={selectedSheet.tone} />
            </div>
            <p>{selectedSheet.notes}</p>
            <div className="sheet-field-list">
              {selectedSheet.sampleFields.map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>
            <div className="sheet-decision-box">
              <strong>DB 넣기 전 판단</strong>
              <span>{selectedSheet.action}</span>
            </div>
            <div className="sheet-risk-box">
              <strong>주의</strong>
              <span>{selectedSheet.risk}</span>
            </div>
          </div>
        </Panel>
      </section>

      <section className="workbench-grid">
        <Panel className="span-5" title="검토 큐">
          <div className="sheet-queue-list">
            {stagingRecords.map((record) => (
              <article className="sheet-queue-item" key={`${record.source}-${record.title}`}>
                <div className="row-title">
                  <strong>{record.title}</strong>
                  <StatusPill label={record.status} tone={record.tone} />
                </div>
                <p>{record.source}</p>
                <div className="meta-line">
                  <span>{record.target}</span>
                  <span>{record.owner}</span>
                </div>
                <div className="sheet-next-action">{record.next}</div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="span-7" title="DB 반영 전 구조">
          <div className="import-flow">
            <article className="active">
              <strong>1. 원본 보관</strong>
              <span>파일, 시트명, 행 범위, 원본값</span>
            </article>
            <article className="active">
              <strong>2. 자동 분류</strong>
              <span>가격표, 재고, 정산, 문서, 보안</span>
            </article>
            <article>
              <strong>3. 검토 큐</strong>
              <span>중복, 수식, 민감정보 확인</span>
            </article>
            <article>
              <strong>4. 확정 저장</strong>
              <span>업무 테이블 또는 보안 금고</span>
            </article>
          </div>
          <div className="model-candidate-grid">
            {modelCandidates.map((model) => (
              <article key={model.name}>
                <strong>{model.name}</strong>
                <p>{model.purpose}</p>
                <div className="schema-tags">
                  {model.fields.map((field) => (
                    <span key={`${model.name}-${field}`}>{field}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="보안 자료 처리 원칙">
        <div className="security-review-row">
          <div>
            <strong>외부 계정 정보</strong>
            <span>아이디와 비밀번호는 일반 기준정보나 메모 DB에 저장하지 않고, 암호화된 별도 저장소와 접근 로그로 관리합니다.</span>
          </div>
          <div className="security-mask">
            <span>ID</span>
            <strong>kn****</strong>
          </div>
          <div className="security-mask">
            <span>P/W</span>
            <strong>********</strong>
          </div>
          <button className="secondary-button" type="button">
            <ShieldCheck size={16} />
            관리자 전용
          </button>
        </div>
      </Panel>
    </div>
  );
}

function SettingsPage() {
  return (
    <section className="workbench-grid">
      <Panel className="span-6" title="사용자 권한">
        <div className="settings-list">
          <SettingRow title="관리자" detail="금액 수정, 청구 확정, 재고 조정, 입금 처리" />
          <SettingRow title="직원" detail="견적 등록, 작업 처리, 사진 올리기" />
          <SettingRow title="조회" detail="목록 조회, 상세 조회" />
        </div>
      </Panel>
      <Panel className="span-6" title="자동 계산 기준">
        <div className="settings-list">
          <SettingRow title="부가세" detail="공급가 x 10%" />
          <SettingRow title="미수금" detail="청구합계 - 입금합계" />
          <SettingRow title="재고" detail="입고 - 출고 + 조정" />
        </div>
      </Panel>
    </section>
  );
}

function CustomerSnapshot({ customer }: { customer: Customer }) {
  return (
    <div className="customer-snapshot">
      <div className="avatar">{customer.name.slice(0, 1)}</div>
      <div className="snapshot-main">
        <div className="row-title">
          <strong>{customer.name}</strong>
          {customer.unpaid > 0 ? <StatusPill label="미수" tone="red" /> : <StatusPill label="정상" tone="green" />}
        </div>
        <p>{customer.phone}</p>
        <div className="info-grid">
          <InfoItem icon={Car} label="차량" value={customer.vehicle} />
          <InfoItem icon={ShieldCheck} label="차대번호" value={customer.vin} />
          <InfoItem icon={CreditCard} label="매출" value={formatMoney(customer.totalSales)} />
          <InfoItem icon={WalletCards} label="미수" value={formatMoney(customer.unpaid)} />
        </div>
        <div className="memo-line">{customer.memo}</div>
      </div>
    </div>
  );
}

function statusTone(status: string): Tone {
  const map: Record<string, Tone> = {
    견적중: 'blue',
    부품확인: 'orange',
    확정: 'green',
    작업전환: 'purple',
    취소: 'gray',
    예정: 'blue',
    진행중: 'orange',
    완료: 'green',
    보류: 'gray',
    청구대기: 'orange',
    청구완료: 'purple',
    일부입금: 'yellow',
    입금완료: 'green',
    정상: 'green',
    부족: 'red',
    미발행: 'red',
    완료대기: 'red',
    확인필요: 'orange',
  };

  return map[status] ?? 'gray';
}

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = window.__seoyoungErpRoot ?? createRoot(rootElement);
  window.__seoyoungErpRoot = root;
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
