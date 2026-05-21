import { StrictMode, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type TextareaHTMLAttributes } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
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
  DataTable,
  DetailDrawer,
  Field,
  FilterTabs,
  FormSection,
  HistoryItem,
  InfoItem,
  KpiCard,
  LineItem,
  Panel,
  PriorityItem,
  RecordToolbar,
  SearchInput,
  SettingRow,
  StatusPill,
  type Tone,
} from './components/common';
import { formatMoney } from './lib/format';
import './styles.css';

const BRAND_NAME = '경남차유리';
const SERVICE_NAME = `${BRAND_NAME} 업무관리`;
const LOGO_SRC = './gn-car-glass-logo.svg';
const LOGIN_STORAGE_KEYS = {
  autoLogin: 'seoyoung.login.autoLogin',
  rememberedId: 'seoyoung.login.rememberedId',
} as const;

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
  | 'ledger'
  | 'estimates'
  | 'work'
  | 'schedule'
  | 'claims'
  | 'inventory'
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

type NavSection = {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
};

type AppMode = 'worker' | 'admin';

type ModeOption = {
  id: AppMode;
  label: string;
  icon: LucideIcon;
  defaultPage: PageId;
};

type EstimateStatus = '견적중' | '부품확인' | '확정' | '작업전환' | '취소';
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
  customer: string;
  phone: string;
  vehicle: string;
  repair: string;
  area: string[];
  amount: number;
  status: EstimateStatus;
  source: string;
  createdAt: string;
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
  entry: CalendarEntry;
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
type InventoryFilter = 'all' | 'shortage' | 'check' | 'normal';
type PartnerFilter = 'all' | 'shop' | 'insurer' | 'supplier';
type AttachmentFilter = 'all' | 'estimate' | 'claim' | 'work' | 'base';
type SheetImportFilter = 'all' | 'core' | 'reference' | 'finance' | 'document' | 'secure';
type LedgerFilter = 'all' | 'sales' | 'kp' | 'insurance' | 'best' | 'inbound' | 'estimate' | 'card';
type LedgerCategory = '일반' | 'KP' | '보험' | '베스트' | '입고지원' | '견적' | '카드';
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

type WorkbookModule = {
  name: string;
  source: string;
  role: string;
  fields: string[];
  status: string;
  tone: Tone;
};

type CardSettlement = {
  date: string;
  brand: string;
  vehicle?: string;
  plate: string;
  amount: number;
  paid: number;
  feeRate: string;
  status: string;
  tone: Tone;
};

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

const WORKER_NAV_SECTIONS: NavSection[] = [
  {
    title: '개요',
    icon: LayoutDashboard,
    items: [{ id: 'dashboard', label: '홈', icon: LayoutDashboard }],
  },
  {
    title: '판매',
    icon: WalletCards,
    items: [
      { id: 'sales', label: '판매관리', icon: WalletCards, count: '4' },
      { id: 'inventory', label: '재고/입고', icon: Package, count: '2' },
      { id: 'customers', label: '고객', icon: UsersRound },
    ],
  },
  {
    title: '작업',
    icon: Wrench,
    items: [
      { id: 'estimates', label: '견적', icon: FileText, count: '7' },
      { id: 'work', label: '작업', icon: CalendarDays, count: '7' },
      { id: 'claims', label: '청구', icon: ReceiptText, count: '4' },
    ],
  },
];

const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: '개요',
    icon: LayoutDashboard,
    items: [{ id: 'dashboard', label: '홈', icon: LayoutDashboard }],
  },
  {
    title: '판매',
    icon: WalletCards,
    items: [
      { id: 'revenue', label: '매출', icon: ReceiptText, count: '월' },
      { id: 'sales', label: '판매관리', icon: WalletCards, count: '4' },
      { id: 'inventory', label: '재고/입고', icon: Package, count: '2' },
      { id: 'customers', label: '고객', icon: UsersRound },
    ],
  },
  {
    title: '작업',
    icon: Wrench,
    items: [
      { id: 'estimates', label: '견적', icon: FileText, count: '7' },
      { id: 'work', label: '작업', icon: CalendarDays, count: '7' },
      { id: 'schedule', label: '일정 관리', icon: CalendarDays, count: '5' },
      { id: 'claims', label: '청구', icon: ReceiptText, count: '4' },
      { id: 'ledger', label: '장부', icon: ReceiptText, count: '9' },
    ],
  },
  {
    title: '관리',
    icon: ShieldCheck,
    items: [
      { id: 'vehicles', label: '차량 정보', icon: Car },
      { id: 'partners', label: '거래처', icon: Building2 },
      { id: 'attachments', label: '자료', icon: FolderOpen },
      { id: 'sheetImport', label: '시트 전환', icon: Download, count: '16' },
      { id: 'settings', label: '설정', icon: ShieldCheck },
    ],
  },
];

const ALL_NAV_ITEMS: NavItem[] = Array.from(
  new Map(
    [...WORKER_NAV_SECTIONS, ...ADMIN_NAV_SECTIONS]
      .flatMap((section) => section.items)
      .map((item) => [item.id, item]),
  ).values(),
);

const MODE_OPTIONS: ModeOption[] = [
  { id: 'worker', label: '작업자', icon: UserRound, defaultPage: 'work' },
  { id: 'admin', label: '관리자', icon: ShieldCheck, defaultPage: 'revenue' },
];

const TOP_NAV_PAGE_IDS: PageId[] = ['dashboard', 'revenue', 'sales', 'estimates', 'work'];

const ESTIMATOR_OPTIONS = ['정보경', '정원철', '박승주'];
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
const GENERAL_TASK_CATEGORY_OPTIONS: GeneralTaskCategory[] = ['일반', '보험', '재고', '정산'];
const SCHEDULE_KIND_OPTIONS: ScheduleEventKind[] = ['작업', '일반', '청구', '휴무'];
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

const YEAR_CALENDAR = [
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
    estimateDate: '2026.05.20',
    estimatorName: '정보경',
    tradeType: '개인',
    customer: '김민수',
    phone: '010-3182-****',
    vehicle: '제네시스 GV80',
    repair: '전면유리 교체',
    area: ['전면유리', 'ADAS'],
    amount: 1280000,
    status: '확정',
    source: '카카오톡',
    createdAt: '05.20 10:14',
  },
  {
    no: 'EST-2026-0016',
    estimateDate: '2026.05.20',
    estimatorName: '정원철',
    tradeType: '개인',
    customer: '박지현',
    phone: '010-7751-****',
    vehicle: '기아 카니발',
    repair: '도어유리 교체',
    area: ['조수석 도어유리'],
    amount: 360000,
    status: '작업전환',
    source: '전화',
    createdAt: '05.20 09:32',
  },
  {
    no: 'EST-2026-0015',
    estimateDate: '2026.05.19',
    estimatorName: '정원철',
    tradeType: '업체',
    customer: '정비소 대성모터스',
    phone: '052-268-****',
    vehicle: '현대 스타리아',
    repair: '후면유리 교체',
    area: ['후면유리', '열선'],
    amount: 720000,
    status: '부품확인',
    source: '정비소',
    createdAt: '05.19 16:40',
  },
  {
    no: 'EST-2026-0014',
    estimateDate: '2026.05.19',
    estimatorName: '정보경',
    tradeType: '개인',
    customer: '최은우',
    phone: '',
    vehicle: 'BMW 520i',
    repair: '스톤칩 복원',
    area: ['전면유리'],
    amount: 85000,
    status: '견적중',
    source: '방문',
    createdAt: '05.19 13:18',
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
    division: '업체',
    company: '대성모터스',
    plateNumber: '12어0423',
    insuranceClaimAmount: 0,
    insurancePaidAmount: 0,
    paymentAmount: 420000,
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

const inventory: InventoryItem[] = [
  {
    partNo: 'G80-FR-ADAS',
    name: 'GV80 전면유리 ADAS',
    compatible: '제네시스 GV80 2021~',
    location: 'A-01',
    stock: 1,
    minimum: 2,
    centerPrice: 980000,
    claimPrice: 1180000,
    status: '부족',
  },
  {
    partNo: 'GLS-KA-2041',
    name: '카니발 조수석 도어유리',
    compatible: '기아 카니발 KA4',
    location: 'B-03',
    stock: 4,
    minimum: 2,
    centerPrice: 210000,
    claimPrice: 280000,
    status: '정상',
  },
  {
    partNo: 'STR-RR-H',
    name: '스타리아 후면유리 열선',
    compatible: '현대 스타리아',
    location: 'A-04',
    stock: 2,
    minimum: 2,
    centerPrice: 520000,
    claimPrice: 690000,
    status: '확인필요',
  },
  {
    partNo: 'UNI-SEAL-01',
    name: '유리 실란트',
    compatible: '공용',
    location: 'C-01',
    stock: 16,
    minimum: 8,
    centerPrice: 18000,
    claimPrice: 25000,
    status: '정상',
  },
];

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
    status: '판매완료',
    tone: 'green',
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

const partners: Partner[] = [
  {
    name: '대성모터스',
    type: '정비소',
    manager: '김과장',
    phone: '052-268-****',
    unpaid: 690000,
    files: '사업자등록증, 통장사본',
  },
  {
    name: '삼성화재',
    type: '보험사',
    manager: '박담당',
    phone: '02-2000-****',
    unpaid: 1180000,
    files: '담당자 명함',
  },
  {
    name: '울산유리도매',
    type: '매입처',
    manager: '최대표',
    phone: '052-901-****',
    unpaid: 0,
    files: '거래명세서',
  },
];

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

const ledgerFilterOptions: Array<{ id: LedgerFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'sales', label: '매출' },
  { id: 'kp', label: 'KP' },
  { id: 'insurance', label: '보험' },
  { id: 'best', label: '베스트' },
  { id: 'inbound', label: '입고지원' },
  { id: 'estimate', label: '견적' },
  { id: 'card', label: '카드' },
];

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

const workbookModules: WorkbookModule[] = [
  {
    name: '2026 장부',
    source: '마스터 입력',
    role: '작업일, 구분, 업체, 거래처, 차종, 작업내용, 품번, 차량번호, 금액을 한 번만 입력',
    fields: ['작업일', '구분', '업체', '거래처', '차종', '작업내용', '차량번호', '보험입금', '결제금액'],
    status: '입력폼',
    tone: 'blue',
  },
  {
    name: '매출',
    source: '2026 장부',
    role: '일/월별 총합계와 KP, 보험, 베스트, 입고지원, 일반 매출을 자동 집계',
    fields: ['총합계', 'KP', '보험', '베스트', '입고지원', '전월대비'],
    status: '대시보드',
    tone: 'green',
  },
  {
    name: 'KP',
    source: '2026 장부',
    role: '지급일, 유리지급가, 썬팅지급, 추가지급, 공제 금액을 정산',
    fields: ['입금금액', '유리지급가', '썬팅지급', '공제', '면책금+썬팅'],
    status: '정산뷰',
    tone: 'purple',
  },
  {
    name: '보험',
    source: '2026 장부',
    role: '보험사, 담당자, 청구경로, 접수번호, 면책금, 지급률까지 관리',
    fields: ['보험사', '접수번호', '청구금액', '입금금액', '면책금', '지급률'],
    status: '청구뷰',
    tone: 'orange',
  },
  {
    name: '베스트/입고지원',
    source: '2026 장부',
    role: '협력 채널 입금액과 지급일을 별도 정산 목록으로 분리',
    fields: ['작업일', '품번', '차량번호', '입금금액', '비고'],
    status: '거래처뷰',
    tone: 'yellow',
  },
  {
    name: '견적/카드',
    source: '견적, 카드',
    role: '견적은 장부 전환 대기열로, 카드는 지급금액/수수료율 정산으로 처리',
    fields: ['견적내용', '최종견적', '카드사', '지급금액', '수수료율'],
    status: '보조업무',
    tone: 'red',
  },
];

const cardSettlements: CardSettlement[] = [
  { date: '26.03.03', brand: '하나', plate: '368러4358', amount: 400000, paid: 394800, feeRate: '1.30%', status: '지급확인', tone: 'green' },
  { date: '26.03.06', brand: 'KB', plate: '20더3199', amount: 380000, paid: 374680, feeRate: '1.40%', status: '지급대기', tone: 'orange' },
  { date: '26.03.09', brand: '롯데', plate: '17더2738', amount: 300000, paid: 296100, feeRate: '1.30%', status: '지급대기', tone: 'orange' },
  { date: '26.03.11', brand: 'BC', plate: '45무4727', amount: 88000, paid: 87120, feeRate: '1.00%', status: '정산완료', tone: 'green' },
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

const defaultDashboardShortcuts: DashboardShortcut[] = [
  { title: '보험 청구 사이트', url: 'https://example.com/claim' },
  { title: '부품 주문 사이트', url: 'https://example.com/parts' },
  { title: '세금계산서 보관함', url: 'https://example.com/tax' },
];

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

function isAdminOnlyPage(page: PageId | null) {
  if (!page) return false;

  const workerPageIds = new Set(WORKER_NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.id)));
  const adminPageIds = new Set(ADMIN_NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.id)));
  return adminPageIds.has(page) && !workerPageIds.has(page);
}

function App() {
  const initialPage = readPageSearchParam();
  const [isAuthenticated, setIsAuthenticated] = useState(
    () =>
      readLoginStorageValue(LOGIN_STORAGE_KEYS.autoLogin) === 'true' &&
      Boolean(readLoginStorageValue(LOGIN_STORAGE_KEYS.rememberedId)),
  );
  const [appMode, setAppMode] = useState<AppMode>(() => (isAdminOnlyPage(initialPage) ? 'admin' : 'worker'));
  const [activePage, setActivePage] = useState<PageId>(() => initialPage ?? 'dashboard');
  const [customerModalId, setCustomerModalId] = useState<string | null>(null);
  const [isEstimateRegistrationOpen, setIsEstimateRegistrationOpen] = useState(false);
  const [isVehicleRegistrationOpen, setIsVehicleRegistrationOpen] = useState(false);
  const [vehicleCatalog, setVehicleCatalog] = useState<VehicleCatalogItem[]>(() =>
    mergeVehicleCatalog(defaultVehicleCatalog, readVehicleCatalogStorage()),
  );
  const [workRegistrationRequestId, setWorkRegistrationRequestId] = useState(0);
  const vehicleSuggestions = useMemo(() => buildVehicleSuggestions(vehicleCatalog), [vehicleCatalog]);
  const navSections = appMode === 'worker' ? WORKER_NAV_SECTIONS : ADMIN_NAV_SECTIONS;
  const navItems = navSections.flatMap((section) => section.items);
  const topNavItems = TOP_NAV_PAGE_IDS.map((id) => navItems.find((item) => item.id === id)).filter(
    (item): item is NavItem => Boolean(item),
  );
  const activeMode = MODE_OPTIONS.find((mode) => mode.id === appMode) ?? MODE_OPTIONS[0]!;
  const modalCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerModalId) ?? null,
    [customerModalId],
  );
  const activeNav = ALL_NAV_ITEMS.find((item) => item.id === activePage) ?? ALL_NAV_ITEMS[0]!;
  const primaryActionLabel =
    activePage === 'revenue'
      ? '리포트 저장'
      : activePage === 'sales'
      ? '판매 등록'
      : activePage === 'inventory'
        ? '입고 등록'
        : activePage === 'vehicles'
          ? '차량 추가'
        : activePage === 'work'
          ? '작업 등록'
          : activePage === 'schedule'
            ? '일정 등록'
            : '견적 등록';

  useEffect(() => {
    writeVehicleCatalogStorage(vehicleCatalog);
  }, [vehicleCatalog]);

  function handleModeChange(nextMode: AppMode) {
    const nextModeOption = MODE_OPTIONS.find((mode) => mode.id === nextMode) ?? MODE_OPTIONS[0]!;
    const nextSections = nextMode === 'worker' ? WORKER_NAV_SECTIONS : ADMIN_NAV_SECTIONS;
    const nextItems = nextSections.flatMap((section) => section.items);
    setAppMode(nextMode);
    if (!nextItems.some((item) => item.id === activePage)) {
      navigatePage(nextModeOption.defaultPage);
    }
  }

  function navigatePage(nextPage: PageId) {
    setActivePage(nextPage);
    setIsEstimateRegistrationOpen(false);
    setIsVehicleRegistrationOpen(false);
    updateUrlSearchParams({
      page: nextPage,
      ...(nextPage === 'work' ? {} : { workItem: null, workPage: null, workPageSize: null, workView: null }),
    });
  }

  function handlePrimaryAction() {
    if (activePage === 'estimates') {
      setIsEstimateRegistrationOpen(true);
      return;
    }

    if (activePage === 'vehicles') {
      setIsVehicleRegistrationOpen(true);
      return;
    }

    if (activePage === 'work') {
      setWorkRegistrationRequestId((current) => current + 1);
    }
  }

  function handleAddVehicle(draft: VehicleCatalogDraft) {
    const vehicle = createVehicleCatalogItem(draft);
    setVehicleCatalog((current) => mergeVehicleCatalog(current, [vehicle]));
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
              className={activePage === item.id ? 'active' : ''}
              key={item.id}
              onClick={() => navigatePage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="app-header-actions">
          <button>알림</button>
          <button>내 정보</button>
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
        <nav className="nav-list">
          <div className="mode-context">
            <span>{activeMode.label} 화면</span>
            <strong>{appMode === 'worker' ? '현장 업무 중심' : '전체 관리 중심'}</strong>
          </div>
          {navSections.map((section) => (
            <section className="nav-section" key={section.title}>
              <p className="nav-section-title">{section.title}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                    key={item.id}
                    onClick={() => navigatePage(item.id)}
                    title={item.label}
                    type="button"
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                    {item.count ? <em>{item.count}</em> : null}
                  </button>
                );
              })}
            </section>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">2026.05.20 수요일</p>
            <div className="topbar-title-row">
              <h1>{activeNav.label}</h1>
              <span>{activeMode.label} 화면</span>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={18} />
              <input placeholder="이름, 차량번호, 부품번호 검색" />
            </label>
            <button className="ghost-button">
              <Bell size={18} />
            </button>
            <button className="primary-button" onClick={handlePrimaryAction} type="button">
              <Plus size={17} />
              {primaryActionLabel}
            </button>
          </div>
        </header>

        {activePage === 'dashboard' && <Dashboard onOpenCustomer={() => navigatePage('customers')} />}
        {activePage === 'revenue' && <RevenuePage />}
        {activePage === 'sales' && <SalesPage />}
        {activePage === 'ledger' && <LedgerWorkbookPage vehicleModelSuggestions={vehicleSuggestions.model} />}
        {activePage === 'estimates' && (
          <EstimatesPage
            onOpenRegistration={() => setIsEstimateRegistrationOpen(true)}
            vehicleSuggestions={vehicleSuggestions}
          />
        )}
        {activePage === 'work' && (
          <WorkPage
            mode={appMode}
            openRegistrationToken={workRegistrationRequestId}
            vehicleModelSuggestions={vehicleSuggestions.model}
          />
        )}
        {activePage === 'schedule' && <SchedulePage />}
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
      </section>
    </main>
    {modalCustomer ? <CustomerDetailModal customer={modalCustomer} onClose={() => setCustomerModalId(null)} /> : null}
    {activePage === 'estimates' && isEstimateRegistrationOpen ? (
      <EstimateRegistrationModal
        onClose={() => setIsEstimateRegistrationOpen(false)}
        vehicleSuggestions={vehicleSuggestions}
      />
    ) : null}
    </>
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
          <DataTable
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
        <DataTable
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

function SalesPage() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'all' | 'sale' | 'purchase'>('all');
  const normalizedQuery = query.trim().toLowerCase();
  const saleRevenue = productSales
    .filter((sale) => sale.type === '상품판매')
    .reduce((sum, sale) => sum + sale.salePrice, 0);
  const purchaseWaiting = productSales.filter((sale) => sale.status === '입고대기').length;
  const availableStock = inventory.reduce((sum, item) => sum + item.stock, 0);
  const margin = productSales
    .filter((sale) => sale.type === '상품판매')
    .reduce((sum, sale) => sum + (sale.salePrice - sale.purchasePrice), 0);
  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          productSales.flatMap((sale) => [
            sale.no,
            sale.type,
            sale.customer,
            sale.tradeType,
            sale.itemName,
            sale.partNo,
            sale.paymentMethod,
            sale.status,
          ]),
        ),
      ),
    [],
  );
  const filteredSales = useMemo(
    () =>
      productSales.filter((sale) => {
        const target = [
          sale.no,
          sale.date,
          sale.type,
          sale.customer,
          sale.tradeType,
          sale.itemName,
          sale.partNo,
          sale.paymentMethod,
          sale.status,
        ]
          .join(' ')
          .toLowerCase();
        const matchesQuery = normalizedQuery.length === 0 || target.includes(normalizedQuery);
        const matchesMode =
          mode === 'all' || (mode === 'sale' && sale.type === '상품판매') || (mode === 'purchase' && sale.type === '매입입고');

        return matchesQuery && matchesMode;
      }),
    [mode, normalizedQuery],
  );

  return (
    <div className="page-stack sales-page">
      <section className="kpi-grid" aria-label="판매 요약">
        <KpiCard icon={WalletCards} label="상품 판매액" value={formatMoney(saleRevenue)} detail="작업 매출과 별도 관리" tone="blue" />
        <KpiCard icon={Package} label="판매가능 재고" value={`${availableStock}개`} detail={`${inventory.length}개 품목`} tone="green" />
        <KpiCard icon={Download} label="입고 대기" value={`${purchaseWaiting}건`} detail="매입 후 재고 반영 전" tone="orange" />
        <KpiCard icon={CreditCard} label="상품 마진" value={formatMoney(margin)} detail="판매가 - 매입가" tone="purple" />
        <KpiCard icon={AlertCircle} label="재고 부족" value={`${inventory.filter((item) => item.status === '부족').length}품목`} detail="판매 전 확인 필요" tone="red" />
      </section>

      <section className="sales-layout">
        <Panel title="상품 판매/매입 등록">
          <SalesRegistrationForm />
        </Panel>

        <Panel title="재고 연동">
          <div className="sale-flow">
            <article className="active">
              <strong>1. 매입</strong>
              <span>사온 물품과 원가 기록</span>
            </article>
            <article className="active">
              <strong>2. 입고</strong>
              <span>창고 위치와 수량 반영</span>
            </article>
            <article>
              <strong>3. 판매</strong>
              <span>고객/업체 판매 등록</span>
            </article>
            <article>
              <strong>4. 차감</strong>
              <span>판매 수량만큼 재고 차감</span>
            </article>
          </div>
          <div className="sale-stock-list">
            {inventory.slice(0, 4).map((item) => (
              <article key={`${item.partNo}-sale-stock`}>
                <div className="row-title">
                  <strong>{item.name}</strong>
                  <StatusPill label={item.status} tone={statusTone(item.status)} />
                </div>
                <p>{item.partNo} · {item.location}</p>
                <div className="stock-meter">
                  <span style={{ width: `${Math.min(100, (item.stock / Math.max(item.minimum * 2, 1)) * 100)}%` }} />
                </div>
                <small>현재 {item.stock}개 · 최소 {item.minimum}개 · 판매가 {formatMoney(item.claimPrice)}</small>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="판매/매입 내역">
        <RecordToolbar
          action={
            <button className="primary-button" type="button">
              <Plus size={16} />
              판매 등록
            </button>
          }
          count={`총 ${filteredSales.length}건`}
          filters={
            <FilterTabs
              ariaLabel="판매 내역 필터"
              onChange={(value) => setMode(value as 'all' | 'sale' | 'purchase')}
              options={[
                { id: 'all', label: '전체' },
                { id: 'sale', label: '상품판매' },
                { id: 'purchase', label: '매입입고' },
              ]}
              value={mode}
            />
          }
          search={
            <SearchInput
              label="판매 검색"
              listId="sales-search-suggestions"
              onChange={setQuery}
              placeholder="품목, 품번, 고객/업체, 결제상태 검색"
              suggestions={searchSuggestions}
              value={query}
            />
          }
        />
        <DataTable
          columns={['번호', '일자', '유형', '거래처', '품목', '수량', '매입/판매', '결제', '재고', '상태']}
          rows={filteredSales.map((sale) => [
            sale.no,
            sale.date,
            sale.type,
            `${sale.tradeType} · ${sale.customer}`,
            `${sale.itemName}\n${sale.partNo}`,
            `${sale.qty}개`,
            `${formatMoney(sale.purchasePrice)}\n${sale.salePrice ? formatMoney(sale.salePrice) : '-'}`,
            sale.paymentMethod,
            `${sale.stockAfter}개`,
            <StatusPill key={`${sale.no}-status`} label={sale.status} tone={sale.tone} />,
          ])}
        />
      </Panel>
    </div>
  );
}

function SalesRegistrationForm() {
  const [saleType, setSaleType] = useState<ProductSaleType>('상품판매');
  const [tradeType, setTradeType] = useState<EstimateTradeType>('업체');

  return (
    <form className="sales-registration-form" onSubmit={(event) => event.preventDefault()}>
      <div className="sales-mode-tabs" role="group" aria-label="판매 등록 유형">
        {(['상품판매', '매입입고'] as ProductSaleType[]).map((type) => (
          <button className={saleType === type ? 'selected' : ''} key={type} onClick={() => setSaleType(type)} type="button">
            {type}
          </button>
        ))}
      </div>

      <div className="sales-form-grid">
        <label className="estimate-control">
          <span>
            {saleType === '상품판매' ? '판매일' : '매입일'}
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
          <select defaultValue="UNI-SEAL-01" required>
            {inventory.map((item) => (
              <option key={`${item.partNo}-option`} value={item.partNo}>
                {item.name} · {item.partNo}
              </option>
            ))}
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
          <input defaultValue="18,000" inputMode="numeric" />
        </label>
        <label className="estimate-control">
          <span>판매단가</span>
          <input defaultValue={saleType === '상품판매' ? '25,000' : ''} inputMode="numeric" placeholder="판매 시 입력" />
        </label>
        <label className="estimate-control">
          <span>결제구분</span>
          <select defaultValue={saleType === '상품판매' ? '카드' : '매입'}>
            <option>카드</option>
            <option>현금</option>
            <option>계좌</option>
            <option>외상</option>
            <option>매입</option>
          </select>
        </label>
        <label className="estimate-control">
          <span>재고처리</span>
          <select defaultValue={saleType === '상품판매' ? '자동차감' : '입고대기'}>
            <option>자동차감</option>
            <option>입고완료</option>
            <option>입고대기</option>
            <option>보류</option>
          </select>
        </label>
        <label className="estimate-control full">
          <span>비고</span>
          <input placeholder="단순 상품판매, 작업과 별도 판매, 매입처 메모 등" />
        </label>
      </div>

      <div className="estimate-save-row">
        <button className="secondary-button" type="button">
          임시 저장
        </button>
        <button className="primary-button" type="submit">
          {saleType === '상품판매' ? '판매 저장' : '입고 저장'}
        </button>
      </div>
    </form>
  );
}

function EstimatesPage({
  onOpenRegistration,
  vehicleSuggestions,
}: {
  onOpenRegistration: () => void;
  vehicleSuggestions: VehicleSuggestionSet;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<EstimateFilter>('all');
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [workDraftEstimate, setWorkDraftEstimate] = useState<Estimate | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          estimates.flatMap((estimate) => [
            estimate.no,
            estimate.estimateDate,
            estimate.estimatorName,
            estimate.tradeType,
            estimate.customer,
            estimate.phone,
            estimate.vehicle,
            estimate.repair,
            estimate.source,
            ...estimate.area,
            ...vehicleSuggestions.model,
          ]).filter(Boolean),
        ),
      ),
    [vehicleSuggestions.model],
  );
  const filteredEstimates = useMemo(
    () =>
      estimates.filter((estimate) => {
        const target = [
          estimate.no,
          estimate.estimateDate,
          estimate.estimatorName,
          estimate.tradeType,
          estimate.customer,
          estimate.phone,
          estimate.vehicle,
          estimate.repair,
          estimate.area.join(' '),
          estimate.source,
        ]
          .join(' ')
          .toLowerCase();
        const matchesQuery = normalizedQuery.length === 0 || target.includes(normalizedQuery);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'pending' && estimate.status === '견적중') ||
          (filter === 'ready' && estimate.status === '확정') ||
          (filter === 'parts' && estimate.status === '부품확인');

        return matchesQuery && matchesFilter;
      }),
    [filter, normalizedQuery],
  );

  return (
    <div className="page-stack">
      <section className="workbench-grid">
        <Panel className="span-12" title="견적 목록">
          <RecordToolbar
            action={
              <button className="primary-button" onClick={onOpenRegistration} type="button">
                <Plus size={16} />
                견적 등록
              </button>
            }
            count={`총 ${filteredEstimates.length}건`}
            filters={
              <FilterTabs
                ariaLabel="견적 필터"
                onChange={(value) => setFilter(value as EstimateFilter)}
                options={[
                  { id: 'all', label: '전체' },
                  { id: 'pending', label: '견적중' },
                  { id: 'ready', label: '확정' },
                  { id: 'parts', label: '부품확인' },
                ]}
                value={filter}
              />
            }
            search={
              <SearchInput
                label="전체 검색"
                listId="estimate-search-suggestions"
                onChange={setQuery}
                placeholder="견적 담당자, 거래유형, 고객명, 차량, 연락처 검색"
                suggestions={searchSuggestions}
                value={query}
              />
            }
          />
          {filteredEstimates.length > 0 ? (
            <DataTable
              columns={['견적번호', '일자/견적자', '거래/고객', '차종', '수리부위', '금액', '상태', '작업', '상세']}
              onRowClick={(rowIndex) => setSelectedEstimate(filteredEstimates[rowIndex] ?? null)}
              rows={filteredEstimates.map((estimate) => [
                estimate.no,
                `${estimate.estimateDate}\n${estimate.estimatorName}`,
                `${estimate.tradeType} · ${estimate.customer}\n${estimate.phone || '연락처 미입력'}`,
                estimate.vehicle,
                `${estimate.repair}\n${estimate.area.join(', ')}`,
                formatMoney(estimate.amount),
                <StatusPill key={estimate.no} label={estimate.status} tone={statusTone(estimate.status)} />,
                estimate.status === '확정' ? (
                  <button
                    className="mini-button"
                    key={`${estimate.no}-work`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setWorkDraftEstimate(estimate);
                    }}
                    type="button"
                  >
                    작업 등록
                  </button>
                ) : (
                  <span className="muted" key={`${estimate.no}-dash`}>
                    -
                  </span>
                ),
                <button
                  className="mini-button"
                  key={`${estimate.no}-detail`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedEstimate(estimate);
                  }}
                  type="button"
                >
                  보기
                </button>,
              ])}
            />
          ) : (
            <div className="empty-state">
              <strong>검색 결과가 없습니다.</strong>
              <span>검색어를 줄이거나 필터를 전체로 변경해보세요.</span>
            </div>
          )}
        </Panel>

      </section>

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
          onClose={() => setWorkDraftEstimate(null)}
          vehicleModelSuggestions={vehicleSuggestions.model}
        />
      ) : null}
    </div>
  );
}

function EstimateRegistrationModal({
  onClose,
  vehicleSuggestions,
}: {
  onClose: () => void;
  vehicleSuggestions: VehicleSuggestionSet;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="estimate-registration-title"
        aria-modal="true"
        className="customer-modal estimate-registration-modal"
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
          <EstimateRegistrationPanel onSubmitComplete={onClose} vehicleSuggestions={vehicleSuggestions} />
        </div>
      </section>
    </div>
  );
}

function EstimateRegistrationPanel({
  estimate,
  onSubmitComplete,
  submitLabel = '견적 저장',
  vehicleSuggestions,
}: {
  estimate?: Estimate;
  onSubmitComplete?: () => void;
  submitLabel?: string;
  vehicleSuggestions: VehicleSuggestionSet;
}) {
  const [tradeType, setTradeType] = useState<EstimateTradeType>(estimate?.tradeType ?? '개인');
  const [lookupQuery, setLookupQuery] = useState('');
  const estimateDateValue = estimate?.estimateDate.replace(/\./g, '-') ?? '2026-05-21';
  const estimateContentValue = estimate ? `${estimate.repair}\n${estimate.area.join(', ')}` : '전면유리.차음.습기.차선.HI\n86111-AT080';
  const finalEstimateContentValue = estimate ? `${estimate.repair} / ${estimate.area.join(', ')}` : '교체 35만 + 썬팅 10만\n현금/카드 조건 확인';
  const registrationSearchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...CUSTOMER_LOOKUP_SUGGESTIONS,
            ...vehicleSuggestions.lookup,
            ...PART_LOOKUP_SUGGESTIONS,
            ...estimates.flatMap((estimate) => [
              estimate.no,
              estimate.customer,
              estimate.phone,
              estimate.vehicle,
              estimate.repair,
              estimate.source,
              ...estimate.area,
            ]),
          ].filter(Boolean),
        ),
      ),
    [vehicleSuggestions.lookup],
  );

  return (
    <form
      className="estimate-registration-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmitComplete?.();
      }}
    >
      <div className="estimate-required-strip">
        <span>필수</span>
        <strong>견적일자 · 견적 담당자 · 견적내용</strong>
      </div>

      <FormSection title="필수 입력">
        <div className="estimate-form-grid">
          <SearchInput
            label="빠른 검색"
            listId="estimate-registration-search-suggestions"
            onChange={setLookupQuery}
            placeholder="차량번호, 고객명, 차종, 품번, 연락처 검색"
            suggestions={registrationSearchSuggestions}
            value={lookupQuery}
          />
          <label className="estimate-control">
            <span>
              견적일자
              <em>필수</em>
            </span>
            <input defaultValue={estimateDateValue} required type="date" />
          </label>
          <label className="estimate-control">
            <span>
              견적 담당자
              <em>필수</em>
            </span>
            <select defaultValue={estimate?.estimatorName ?? ESTIMATOR_OPTIONS[0]} required>
              {ESTIMATOR_OPTIONS.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="estimate-control full">
            <span>
              견적내용
              <em>필수</em>
            </span>
            <textarea defaultValue={estimateContentValue} required />
          </label>
        </div>
      </FormSection>

      <FormSection title="선택 입력">
        <div className="estimate-form-grid">
          <label className="estimate-control">
            <span>{tradeType === '업체' ? '업체명' : '고객명'}</span>
            <div className="lookup-control">
              <input
                defaultValue={estimate?.customer}
                list="estimate-customer-suggestions"
                placeholder={tradeType === '업체' ? '거래 업체명' : '고객명'}
              />
              <button type="button">
                <Search size={14} />
                검색
              </button>
            </div>
          </label>
          <label className="estimate-control">
            <span>전화번호</span>
            <input defaultValue={estimate?.phone} inputMode="tel" placeholder="010-0000-0000" />
          </label>
          <div className="estimate-control">
            <span>
              거래유형
            </span>
            <div className="trade-segment" role="group" aria-label="거래유형">
              {(['개인', '업체'] as EstimateTradeType[]).map((type) => (
                <button
                  className={tradeType === type ? 'selected' : ''}
                  key={type}
                  onClick={() => setTradeType(type)}
                  type="button"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <label className="estimate-control">
            <span>문의경로</span>
            <select defaultValue={estimate?.source ?? '전화'}>
              {INQUIRY_SOURCE_OPTIONS.map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>
          </label>
          <label className="estimate-control">
            <span>차량번호</span>
            <div className="lookup-control">
              <input list="estimate-vehicle-lookup-suggestions" placeholder="12가3456" />
              <button type="button">
                <Search size={14} />
                조회
              </button>
            </div>
          </label>
          <label className="estimate-control">
            <span>차대번호</span>
            <input placeholder="VIN" />
          </label>
          <label className="estimate-control">
            <span>브랜드/시리즈</span>
            <div className="lookup-control">
              <input list="estimate-vehicle-brand-suggestions" placeholder="브랜드 또는 시리즈" />
              <button type="button">
                <Search size={14} />
                검색
              </button>
            </div>
          </label>
          <label className="estimate-control">
            <span>모델명</span>
            <input defaultValue={estimate?.vehicle} list="estimate-vehicle-model-suggestions" placeholder="차종/모델명" />
          </label>
          <label className="estimate-control">
            <span>년식</span>
            <input list="estimate-vehicle-year-suggestions" placeholder="연식" />
          </label>
          <label className="estimate-control">
            <span>청구/보험 구분</span>
            <select defaultValue="일반">
              {CLAIM_TYPE_OPTIONS.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="estimate-control">
            <span>작업구분</span>
            <select defaultValue="교체">
              {WORK_TYPE_OPTIONS.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="estimate-control">
            <span>수리부위</span>
            <input
              defaultValue={estimate?.area.join(', ')}
              list="estimate-repair-area-suggestions"
              placeholder="전면, QTR(조), 루프/파노라마"
            />
          </label>
          <label className="estimate-control">
            <span>부품번호</span>
            <div className="lookup-control">
              <input list="estimate-part-suggestions" placeholder="86111-AT080" />
              <button type="button">
                <Search size={14} />
                검색
              </button>
            </div>
          </label>
          <label className="estimate-control">
            <span>옵션</span>
            <input placeholder="차음, 열선, 센서, 차선 등" />
          </label>
          <label className="estimate-control">
            <span>썬팅</span>
            <input placeholder="3M, 루마, 애니가드 등" />
          </label>
          <label className="estimate-control">
            <span>입고처/매입처</span>
            <input placeholder="매입처" />
          </label>
          <label className="estimate-control">
            <span>매입금액</span>
            <input inputMode="numeric" placeholder="원" />
          </label>
          <label className="estimate-control full">
            <span>최종견적내용</span>
            <textarea defaultValue={finalEstimateContentValue} />
          </label>
          <label className="estimate-control full">
            <span>비고</span>
            <input placeholder="방문, 글로벌 홈페이지, 소개 등" />
          </label>
        </div>
      </FormSection>

      <FormSection title="결제 정보">
        <div className="estimate-form-grid">
          <label className="estimate-control">
            <span>결제수단</span>
            <select defaultValue="">
              <option value="">선택</option>
              <option>현금</option>
              <option>카드</option>
              <option>계좌</option>
              <option>보험</option>
            </select>
          </label>
          <label className="estimate-control">
            <span>자기부담금</span>
            <select defaultValue="">
              <option value="">선택</option>
              <option>0%</option>
              <option>20%</option>
              <option>30%</option>
              <option>50%</option>
              <option>기타</option>
            </select>
          </label>
          <label className="estimate-control">
            <span>보험청구금액</span>
            <input inputMode="numeric" placeholder="원" />
          </label>
          <label className="estimate-control">
            <span>결제금액</span>
            <input defaultValue={estimate?.amount ? String(estimate.amount) : undefined} inputMode="numeric" placeholder="원" />
          </label>
        </div>
      </FormSection>

      <FormSection title="작업 정보">
        <div className="estimate-form-grid">
          <label className="estimate-control">
            <span>작업일</span>
            <input type="date" />
          </label>
          <label className="estimate-control">
            <span>작업시간</span>
            <select defaultValue="">
              <option value="">시간 미정</option>
              <option>오전</option>
              <option>오후</option>
              <option>10:00</option>
              <option>14:00</option>
              <option>16:00</option>
            </select>
          </label>
          <label className="estimate-control">
            <span>방문/출장</span>
            <select defaultValue="">
              <option value="">선택</option>
              <option>방문</option>
              <option>출장</option>
              <option>탁송</option>
            </select>
          </label>
          <label className="estimate-control">
            <span>출장자</span>
            <select defaultValue="">
              <option value="">선택</option>
              {ESTIMATOR_OPTIONS.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
      </FormSection>

      <div className="estimate-save-row">
        <button className="secondary-button" type="button">
          임시 저장
        </button>
        <button className="primary-button" type="submit">
          {submitLabel}
        </button>
      </div>
      <datalist id="estimate-customer-suggestions">
        {CUSTOMER_LOOKUP_SUGGESTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <datalist id="estimate-vehicle-lookup-suggestions">
        {vehicleSuggestions.lookup.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <datalist id="estimate-vehicle-model-suggestions">
        {vehicleSuggestions.model.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <datalist id="estimate-vehicle-brand-suggestions">
        {vehicleSuggestions.brand.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <datalist id="estimate-vehicle-year-suggestions">
        {vehicleSuggestions.yearRange.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <datalist id="estimate-part-suggestions">
        {PART_LOOKUP_SUGGESTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <datalist id="estimate-repair-area-suggestions">
        {REPAIR_AREA_OPTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
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

function SchedulePage() {
  const [events, setEvents] = useState<ScheduleEvent[]>(() => buildInitialScheduleEvents());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ScheduleFilter>('all');
  const [draft, setDraft] = useState({
    date: '2026.05.21',
    time: '오전',
    kind: '일반' as ScheduleEventKind,
    title: '',
    owner: ESTIMATOR_OPTIONS[0] ?? '',
    target: '',
    memo: '',
  });
  const normalizedQuery = query.trim().toLowerCase();
  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesFilter =
          filter === 'all' ||
          (filter === 'work' && event.kind === '작업') ||
          (filter === 'general' && event.kind === '일반') ||
          (filter === 'claim' && event.kind === '청구') ||
          (filter === 'leave' && event.kind === '휴무');
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [event.date, event.time, event.kind, event.title, event.owner, event.target, event.status, event.memo]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery);

        return matchesFilter && matchesQuery;
      }),
    [events, filter, normalizedQuery],
  );
  const scheduleSuggestions = useMemo(
    () => Array.from(new Set(events.flatMap((event) => [event.title, event.owner, event.target, event.kind, event.status]))),
    [events],
  );

  function updateDraft<Key extends keyof typeof draft>(key: Key, value: (typeof draft)[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addScheduleEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;

    setEvents((current) => [
      {
        id: `custom-${Date.now()}`,
        date: draft.date,
        time: draft.time,
        kind: draft.kind,
        title,
        owner: draft.owner,
        target: draft.target.trim() || (draft.kind === '휴무' ? '개인 휴무' : '회사 일정'),
        status: draft.kind === '휴무' ? '휴무' : '예정',
        memo: draft.memo.trim() || '메모 없음',
      },
      ...current,
    ]);
    setDraft((current) => ({ ...current, title: '', target: '', memo: '' }));
  }

  return (
    <div className="page-stack">
      <section className="kpi-grid" aria-label="일정 요약">
        <KpiCard icon={CalendarDays} label="전체 일정" value={`${events.length}건`} detail="작업·일반·청구·휴무" tone="blue" />
        <KpiCard icon={Wrench} label="작업 일정" value={`${events.filter((event) => event.kind === '작업').length}건`} detail="작업 페이지와 연결" tone="green" />
        <KpiCard icon={ReceiptText} label="청구 일정" value={`${events.filter((event) => event.kind === '청구').length}건`} detail="청구 확인일 포함" tone="orange" />
        <KpiCard icon={UserRound} label="개인 휴무" value={`${events.filter((event) => event.kind === '휴무').length}건`} detail="직원별 배정 참고" tone="purple" />
      </section>

      <section className="schedule-layout">
        <Panel className="schedule-list-panel" title="전체 일정">
          <RecordToolbar
            count={`총 ${filteredEvents.length}건`}
            filters={
              <FilterTabs
                ariaLabel="일정 필터"
                onChange={(value) => setFilter(value as ScheduleFilter)}
                options={[
                  { id: 'all', label: '전체' },
                  { id: 'work', label: '작업' },
                  { id: 'general', label: '일반' },
                  { id: 'claim', label: '청구' },
                  { id: 'leave', label: '휴무' },
                ]}
                value={filter}
              />
            }
            search={
              <SearchInput
                label="일정 검색"
                listId="schedule-search-suggestions"
                onChange={setQuery}
                placeholder="날짜, 담당자, 차량, 청구, 휴무 검색"
                suggestions={scheduleSuggestions}
                value={query}
              />
            }
          />
          <div className="schedule-list">
            {filteredEvents.map((event) => (
              <article className={`schedule-item ${event.kind === '휴무' ? 'leave' : ''}`} key={event.id}>
                <time>
                  <strong>{event.date}</strong>
                  <span>{event.time}</span>
                </time>
                <div>
                  <div className="row-title">
                    <strong>{event.title}</strong>
                    <StatusPill label={event.status} tone={statusTone(event.status)} />
                  </div>
                  <p>{event.target}</p>
                  <div className="meta-line">
                    <span>{event.kind}</span>
                    <span>{event.owner}</span>
                    <span>{event.memo}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="schedule-form-panel" title="일정 등록">
          <form className="schedule-form" onSubmit={addScheduleEvent}>
            <label className="estimate-control">
              <span>일자</span>
              <input onChange={(event) => updateDraft('date', event.target.value)} value={draft.date} />
            </label>
            <label className="estimate-control">
              <span>시간</span>
              <input onChange={(event) => updateDraft('time', event.target.value)} placeholder="오전, 오후, 14:00, 종일" value={draft.time} />
            </label>
            <label className="estimate-control">
              <span>일정 구분</span>
              <select onChange={(event) => updateDraft('kind', event.target.value as ScheduleEventKind)} value={draft.kind}>
                {SCHEDULE_KIND_OPTIONS.map((kind) => (
                  <option key={kind}>{kind}</option>
                ))}
              </select>
            </label>
            <label className="estimate-control">
              <span>대상자/담당자</span>
              <select onChange={(event) => updateDraft('owner', event.target.value)} value={draft.owner}>
                {ESTIMATOR_OPTIONS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
                <option>정하늘</option>
                <option>이준호</option>
              </select>
            </label>
            <label className="estimate-control full">
              <span>제목</span>
              <input onChange={(event) => updateDraft('title', event.target.value)} placeholder="예: 정하늘 휴무, 보험 청구 확인, 거래처 미팅" value={draft.title} />
            </label>
            <label className="estimate-control full">
              <span>연결 대상</span>
              <input onChange={(event) => updateDraft('target', event.target.value)} placeholder="고객/차량/청구번호/거래처 등" value={draft.target} />
            </label>
            <label className="estimate-control full">
              <span>메모</span>
              <textarea onChange={(event) => updateDraft('memo', event.target.value)} placeholder="휴무 사유, 청구 확인 내용, 전체 공유 메모" value={draft.memo} />
            </label>
            <button className="primary-button" type="submit">
              <Plus size={16} />
              일정 저장
            </button>
          </form>
        </Panel>
      </section>
    </div>
  );
}

function WorkPage({
  mode,
  openRegistrationToken,
  vehicleModelSuggestions,
}: {
  mode: AppMode;
  openRegistrationToken: number;
  vehicleModelSuggestions: string[];
}) {
  const [calendarView, setCalendarView] = useState<CalendarView>('day');
  const [workViewByMode, setWorkViewByMode] = useState<Record<AppMode, WorkerWorkView>>({
    worker: readWorkViewSearchParam() ?? 'calendar',
    admin: readWorkViewSearchParam() ?? 'list',
  });
  const [workRecords, setWorkRecords] = useState<WorkerWorkListRecord[]>(() =>
    workerWorkListRecords.filter((record) => record.kind === '작업'),
  );
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
  const currentWorkView = workViewByMode[mode];
  const selectedWorkRecord = useMemo(
    () => workRecords.find((record) => record.id === selectedWorkRecordId) ?? null,
    [selectedWorkRecordId, workRecords],
  );
  const normalizedWorkListQuery = workListQuery.trim().toLowerCase();
  const filteredTodayEntries = todayEntries.filter((entry) => {
    if (entry.kind !== 'work') return false;
    if (workListFilter === 'scheduled') return entry.order.status === '예정' || entry.order.status === '보류';
    if (workListFilter === 'active') return entry.order.status === '진행중';
    if (workListFilter === 'done') return entry.order.status === '완료';
    return true;
  });
  const monthCells = [
    ...Array.from({ length: 4 }, (_, index) => ({ key: `empty-${index}`, date: '', entries: [] as CalendarEntryRef[] })),
    ...Array.from({ length: 31 }, (_, index) => {
      const date = index + 1;
      return { key: String(date), date: String(date), entries: MONTH_ENTRY_DAYS.get(date) ?? [] };
    }),
  ];
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

  useEffect(() => {
    if (openRegistrationToken <= 0) return;
    setIsWorkRegistrationOpen(true);
  }, [openRegistrationToken]);

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

  function openCalendarEntry(entry: CalendarEntry) {
    const record = findRecordForEntry(workRecords, entry);
    if (record) {
      openWorkRecord(record);
    }
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

  const viewSwitch = (
    <div className="work-view-switch-row">
      <div>
        <strong>{currentWorkView === 'calendar' ? '캘린더 보기' : '리스트 보기'}</strong>
        <span>{mode === 'worker' ? '현장 업무 중심' : '전체 관리 중심'}</span>
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
                작업 등록
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
              <span>오늘 작업 {todayEntries.filter((entry) => entry.kind === 'work').length}건</span>
              <span>작업 {workOrders.length}건</span>
              <span>일반 일정은 일정 관리에서 확인</span>
            </div>
          </div>
          <div className="calendar-actions">
            <div className="calendar-view-tabs" role="tablist" aria-label="일정 보기">
              {CALENDAR_VIEWS.map((view) => (
                <button
                  aria-selected={calendarView === view.id}
                  className={calendarView === view.id ? 'selected' : ''}
                  key={view.id}
                  onClick={() => setCalendarView(view.id)}
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
                작업 등록
              </button>
            </div>
          </div>
        </div>

        {calendarView === 'day' ? (
          <div className="calendar-day-view">
            {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(
              (slot) => {
                const slotEntries = todayEntries.filter((entry) => entry.kind === 'work' && entryTime(entry).startsWith(slot.slice(0, 2)));
                return (
                  <article className={`calendar-time-row ${slotEntries.length > 0 ? 'has-job' : ''}`} key={slot}>
                    <time>{slot}</time>
                    <div className="calendar-time-cell">
                      {slotEntries.map((entry) => (
                        <CalendarJob
                          entry={entry}
                          key={`${entry.kind}-${entryTime(entry)}-${entryTitle(entry)}`}
                          onSelect={() => openCalendarEntry(entry)}
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
            {WEEK_CALENDAR.map((day) => (
              <article className="calendar-day-column" key={`${day.day}-${day.date}`}>
                <header>
                  <span>{day.day}</span>
                  <strong>{day.date}</strong>
                </header>
                <div className="calendar-day-jobs">
                  {day.entries.some((entryRef) => entryRef.kind === 'work') ? (
                    day.entries.filter((entryRef) => entryRef.kind === 'work').map((entryRef) => (
                      <CalendarJob
                        compact
                        entry={resolveCalendarEntry(entryRef)}
                        key={`${day.date}-${entryRef.kind}-${entryRef.index}`}
                        onSelect={() => openCalendarEntry(resolveCalendarEntry(entryRef))}
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
              <article className={`calendar-month-cell ${cell.date === '20' ? 'today' : ''}`} key={cell.key}>
                <time>{cell.date}</time>
                  {cell.entries.filter((entryRef) => entryRef.kind === 'work').slice(0, 2).map((entryRef) => (
                  <CalendarJob
                    mini
                    entry={resolveCalendarEntry(entryRef)}
                    key={`${cell.key}-${entryRef.kind}-${entryRef.index}`}
                    onSelect={() => openCalendarEntry(resolveCalendarEntry(entryRef))}
                  />
                ))}
                {cell.entries.filter((entryRef) => entryRef.kind === 'work').length > 2 ? (
                  <span className="calendar-more">+{cell.entries.filter((entryRef) => entryRef.kind === 'work').length - 2}</span>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        {calendarView === 'year' ? (
          <div className="calendar-year-view">
            {YEAR_CALENDAR.map(([month, count, detail]) => (
              <article className={month === '5월' ? 'selected' : ''} key={month}>
                <strong>{month}</strong>
                <span>{count}</span>
                <small>{detail}</small>
              </article>
            ))}
          </div>
        ) : null}
        </div>
      </section>

      <Panel
        className="work-list-panel"
        title="오늘 작업"
        action={
          <div className="work-list-filter">
            <button
              className={workListFilter === 'all' ? 'selected' : ''}
              onClick={() => setWorkListFilter('all')}
              type="button"
            >
              전체
            </button>
            <button
              className={workListFilter === 'scheduled' ? 'selected' : ''}
              onClick={() => setWorkListFilter('scheduled')}
              type="button"
            >
              예정
            </button>
            <button
              className={workListFilter === 'active' ? 'selected' : ''}
              onClick={() => setWorkListFilter('active')}
              type="button"
            >
              진행
            </button>
          </div>
        }
      >
        <div className="daily-work-list">
          {filteredTodayEntries.map((entry) => (
            <TodayListItem
              entry={entry}
              key={`${entry.kind}-${entryTime(entry)}-${entryTitle(entry)}`}
              onComplete={() => entry.kind === 'work' ? setCompletionOrder(entry.order) : openCalendarEntry(entry)}
              onOpen={() => openCalendarEntry(entry)}
            />
          ))}
        </div>
      </Panel>
      </section>

      <section className="workbench-grid">
        <Panel className="span-7" title="선택한 작업 처리">
          <div className="completion-grid">
            <div className="step-card active">
              <CheckCircle2 size={18} />
              <strong>작업 정보</strong>
              <span>카니발 도어유리 교체</span>
            </div>
            <div className="step-card">
              <Camera size={18} />
              <strong>사진 올리기</strong>
              <span>작업 후 2장</span>
            </div>
            <div className="step-card">
              <Package size={18} />
              <strong>재고 차감</strong>
              <span>GLS-KA-2041 1개</span>
            </div>
            <div className="step-card">
              <ReceiptText size={18} />
              <strong>전표 생성</strong>
              <span>360,000원</span>
            </div>
          </div>
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
    </div>
  );
}

function TodayListItem({
  entry,
  onOpen,
  onComplete,
}: {
  entry: CalendarEntry;
  onOpen: () => void;
  onComplete: () => void;
}) {
  if (entry.kind === 'todo') {
    const task = entry.task;

    return (
      <article className="daily-work-item todo">
        <time>{task.time}</time>
        <div>
          <div className="row-title">
            <strong>{task.title}</strong>
            <StatusPill label={task.status} tone={statusTone(task.status)} />
          </div>
          <p>{task.detail}</p>
          <div className="meta-line">
            <span>{task.category}</span>
            <span>{task.owner}</span>
        </div>
        <div className="work-item-actions">
          <button onClick={onOpen} type="button">메모</button>
          <button onClick={onComplete} type="button">완료</button>
        </div>
        </div>
      </article>
    );
  }

  const { order } = entry;

  return (
    <article className="daily-work-item">
      <time>{order.time}</time>
      <div>
        <div className="row-title">
          <strong>{order.repair}</strong>
          <StatusPill label={order.status} tone={statusTone(order.status)} />
        </div>
        <p>{order.customer} · {order.vehicle}</p>
        <div className="meta-line">
          <span>{order.visit}</span>
          <span>{order.technician}</span>
          <span>{order.stock}</span>
        </div>
        <div className="work-item-actions">
          <button onClick={onOpen} type="button">상세</button>
          <button onClick={onComplete} type="button">완료</button>
        </div>
      </div>
    </article>
  );
}

function formatWorkLedgerAmount(value: number) {
  return value > 0 ? value.toLocaleString('ko-KR') : '-';
}

function parseWorkAmountInput(value: string) {
  const normalizedValue = value.replace(/[^\d]/g, '');
  return normalizedValue ? Number(normalizedValue) : 0;
}

function normalizeWorkDate(value: string) {
  const [rawYear, rawMonth, rawDay] = value.split(/[.-]/).map((part) => part.trim());
  if (!rawYear || !rawMonth || !rawDay) return '';

  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year.padStart(4, '0')}-${rawMonth.padStart(2, '0')}-${rawDay.padStart(2, '0')}`;
}

function getWorkColumnFilterValue(record: WorkerWorkListRecord, key: WorkColumnFilterKey) {
  if (key === 'visit') return record.entry.kind === 'work' ? record.entry.order.visit : record.division;

  return String(record[key] ?? '');
}

function csvCell(value: string | number) {
  const text = String(value).replace(/\r?\n/g, '\n');
  return `"${text.replace(/"/g, '""')}"`;
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
          <col className="work-col-detail" />
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
            <th>상세</th>
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
              <td>
                <button
                  className="mini-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(record);
                  }}
                  type="button"
                >
                  보기
                </button>
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
  onSelect,
}: {
  entry: CalendarEntry;
  compact?: boolean;
  mini?: boolean;
  onSelect?: () => void;
}) {
  if (entry.kind === 'todo') {
    const task = entry.task;

    return (
      <button className={`calendar-job todo ${compact ? 'compact' : ''} ${mini ? 'mini' : ''}`} onClick={onSelect} type="button">
        <div className="row-title">
          <strong>{task.title}</strong>
          {!mini ? <StatusPill label={task.status} tone={statusTone(task.status)} /> : null}
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
    <button className={`calendar-job ${compact ? 'compact' : ''} ${mini ? 'mini' : ''}`} onClick={onSelect} type="button">
      <div className="row-title">
        <strong>{mini ? order.repair : order.customer}</strong>
        {!mini ? <StatusPill label={order.status} tone={statusTone(order.status)} /> : null}
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

function findRecordForEntry(records: WorkerWorkListRecord[], entry: CalendarEntry) {
  return records.find((record) => {
    if (record.entry === entry) return true;
    if (record.entry.kind !== entry.kind) return false;

    if (entry.kind === 'work' && record.entry.kind === 'work') {
      return record.entry.order === entry.order || (record.customer === entry.order.customer && record.time === entry.order.time);
    }

    if (entry.kind === 'todo' && record.entry.kind === 'todo') {
      return record.entry.task === entry.task || (record.customer === entry.task.title && record.time === entry.task.time);
    }

    return false;
  });
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

              <FormSection title="작업 전환 전 확인">
                <div className="flow-check-list">
                  <span>작업일과 시간을 입력하면 캘린더에 표시됩니다.</span>
                  <span>부품번호와 보험 접수번호는 몰라도 임시 등록할 수 있습니다.</span>
                  <span>금액, 고객, 차량 정보는 작업 등록 화면으로 이어집니다.</span>
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
              작업으로 등록
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
      eyebrow="작업 등록"
      footer={
        <div className="action-footer">
          <button className="secondary-button" onClick={onClose} type="button">
            닫기
          </button>
          <button className="primary-button" form="work-list-registration-form" type="submit">
            작업 등록
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
              <input onChange={(event) => updateDraft('insuranceClaimAmount', event.target.value)} value={draft.insuranceClaimAmount} />
            </label>
            <label className="estimate-control">
              <span>보험입금액</span>
              <input onChange={(event) => updateDraft('insurancePaidAmount', event.target.value)} value={draft.insurancePaidAmount} />
            </label>
            <label className="estimate-control">
              <span>결제금액</span>
              <input onChange={(event) => updateDraft('paymentAmount', event.target.value)} value={draft.paymentAmount} />
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
  onClose,
  vehicleModelSuggestions,
}: {
  estimate: Estimate;
  onClose: () => void;
  vehicleModelSuggestions: string[];
}) {
  const [visitType, setVisitType] = useState<WorkVisitType>('출장');

  return (
    <DetailDrawer
      eyebrow="작업 등록"
      footer={<ActionFooter primaryLabel="캘린더 등록 미리보기" secondaryLabel="닫기" onSecondary={onClose} />}
      onClose={onClose}
      title={`${estimate.customer} 작업 등록`}
    >
      <div className="drawer-summary">
        <div>
          <span>연결 견적</span>
          <strong>{estimate.no}</strong>
        </div>
        <div>
          <span>차량</span>
          <strong>{estimate.vehicle}</strong>
        </div>
        <div>
          <span>작업내용</span>
          <strong>{estimate.repair}</strong>
        </div>
      </div>

      <FormSection title="일정">
        <Field label="작업일" value="2026.05.20" />
        <Field label="작업시간" value="11:00" />
        <label className="estimate-control">
          <span>방문 방식</span>
          <select onChange={(event) => setVisitType(event.target.value as WorkVisitType)} value={visitType}>
            {WORK_VISIT_OPTIONS.map((visit) => (
              <option key={visit}>{visit}</option>
            ))}
          </select>
        </label>
      </FormSection>

      <FormSection title="작업 정보">
        <label className="estimate-control">
          <span>차량</span>
          <input defaultValue={estimate.vehicle} list="work-registration-vehicle-model-suggestions" />
        </label>
        <Field label="작업자" value="정하늘" />
        <Field label="작업 메모" value="전면유리 교체 후 ADAS 보정 확인" />
        <Field label="사용 부품" value="G80-FR-ADAS 1개" />
      </FormSection>

      <datalist id="work-registration-vehicle-model-suggestions">
        {vehicleModelSuggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <p className="helper-text">프로토타입에서는 실제 저장하지 않고, 작업 등록 화면 흐름만 확인합니다.</p>
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
                      onChange={(event) => updatePaymentDraft(payment.id, 'amount', event.target.value)}
                      placeholder="0"
                      value={payment.amount}
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
          <span>품명</span>
          <strong>{item.name}</strong>
        </div>
        <div>
          <span>재고</span>
          <strong>{item.stock}개</strong>
        </div>
        <div>
          <span>상태</span>
          <StatusPill label={item.status} tone={statusTone(item.status)} />
        </div>
      </div>
      <FormSection title="부품 정보">
        <div className="detail-fields">
          <InfoItem icon={Car} label="호환" value={item.compatible} />
          <InfoItem icon={Package} label="위치" value={item.location} />
          <InfoItem icon={CreditCard} label="센터가" value={formatMoney(item.centerPrice)} />
          <InfoItem icon={ReceiptText} label="청구단가" value={formatMoney(item.claimPrice)} />
        </div>
      </FormSection>
      <FormSection title="입출고 이력">
        <div className="flow-check-list">
          <span>입고 2개 · 울산유리도매</span>
          <span>출고 1개 · 작업 WO-2026-0042 연결</span>
          <span>최소 재고 {item.minimum}개 기준으로 부족 여부를 표시합니다.</span>
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
        <DataTable
          columns={['청구번호', '고객/차량', '구분', '보험사', '청구금액', '입금액', '고객결제', '상태', '상세']}
          rows={filteredClaims.map((claim) => [
            claim.no,
            `${claim.customer}\n${claim.vehicle}`,
            claim.type,
            claim.insurer,
            formatMoney(claim.claimAmount),
            formatMoney(claim.paidAmount),
            formatMoney(claim.customerAmount),
            <StatusPill key={claim.no} label={claim.status} tone={statusTone(claim.status)} />,
            <button className="mini-button" key={`${claim.no}-open`} onClick={() => setSelectedClaim(claim)} type="button">
              보기
            </button>,
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
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const totalStockCount = inventory.reduce((sum, item) => sum + item.stock, 0);
  const shortageItems = inventory.filter((item) => item.stock < item.minimum);
  const checkItems = inventory.filter((item) => statusTone(item.status) === 'orange');
  const stockValue = inventory.reduce((sum, item) => sum + item.stock * item.centerPrice, 0);
  const claimValue = inventory.reduce((sum, item) => sum + item.stock * item.claimPrice, 0);
  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(inventory.flatMap((item) => [item.partNo, item.name, item.compatible, item.location, item.status])),
      ),
    [],
  );
  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) => {
        const target = [item.partNo, item.name, item.compatible, item.location, item.status].join(' ').toLowerCase();
        const matchesQuery = normalizedQuery.length === 0 || target.includes(normalizedQuery);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'shortage' && item.status === '부족') ||
          (filter === 'check' && item.status === '확인필요') ||
          (filter === 'normal' && item.status === '정상');

        return matchesQuery && matchesFilter;
      }),
    [filter, normalizedQuery],
  );

  return (
    <div className="page-stack">
      <section className="kpi-grid" aria-label="부품 재고 요약">
        <KpiCard
          icon={Package}
          label="총 보유수량"
          value={`${totalStockCount}개`}
          detail={`${inventory.length}개 품목`}
          tone="blue"
        />
        <KpiCard
          icon={AlertCircle}
          label="부족 재고"
          value={`${shortageItems.length}품목`}
          detail={shortageItems[0]?.name ?? '발주 필요 없음'}
          tone={shortageItems.length > 0 ? 'red' : 'green'}
        />
        <KpiCard
          icon={CheckCircle2}
          label="확인 필요"
          value={`${checkItems.length}품목`}
          detail={checkItems[0]?.name ?? '확인 대기 없음'}
          tone={checkItems.length > 0 ? 'orange' : 'green'}
        />
        <KpiCard icon={CreditCard} label="재고 금액" value={formatMoney(stockValue)} detail="센터가 기준" tone="purple" />
        <KpiCard
          icon={ReceiptText}
          label="청구 기준 금액"
          value={formatMoney(claimValue)}
          detail={`예상 차이 ${formatMoney(claimValue - stockValue)}`}
          tone="yellow"
        />
      </section>

      <section className="workbench-grid">
        <Panel className="span-12" title="부품/재고">
          <RecordToolbar
            action={
              <button className="primary-button" type="button">
                <Plus size={16} />
                부품 등록
              </button>
            }
            count={`총 ${filteredInventory.length}건`}
            filters={
              <FilterTabs
                ariaLabel="재고 필터"
                onChange={(value) => setFilter(value as InventoryFilter)}
                options={[
                  { id: 'all', label: '전체' },
                  { id: 'shortage', label: '부족' },
                  { id: 'check', label: '확인필요' },
                  { id: 'normal', label: '정상' },
                ]}
                value={filter}
              />
            }
            search={
              <SearchInput
                label="전체 검색"
                listId="inventory-search-suggestions"
                onChange={setQuery}
                placeholder="부품번호, 품명, 호환차종, 위치 검색"
                suggestions={searchSuggestions}
                value={query}
              />
            }
          />
          <DataTable
            columns={['부품번호', '품명', '호환차종', '위치', '재고', '센터가', '보험청구단가', '상태', '상세']}
            rows={filteredInventory.map((item) => [
              item.partNo,
              item.name,
              item.compatible,
              item.location,
              `${item.stock} / 최소 ${item.minimum}`,
              formatMoney(item.centerPrice),
              formatMoney(item.claimPrice),
              <StatusPill key={item.partNo} label={item.status} tone={statusTone(item.status)} />,
              <button className="mini-button" key={`${item.partNo}-open`} onClick={() => setSelectedItem(item)} type="button">
                보기
              </button>,
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
          <DataTable
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
  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          customers.flatMap((customer) => [
            customer.name,
            customer.phone,
            customer.vehicle,
            customer.vin,
            customer.memo,
          ]),
        ),
      ),
    [],
  );
  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const target = [customer.name, customer.phone, customer.vehicle, customer.vin, customer.memo, customer.lastWork]
          .join(' ')
          .toLowerCase();
        const matchesQuery = normalizedQuery.length === 0 || target.includes(normalizedQuery);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'unpaid' && customer.unpaid > 0) ||
          (filter === 'clear' && customer.unpaid === 0) ||
          (filter === 'recent' && customer.lastWork.includes('2026.05'));

        return matchesQuery && matchesFilter;
      }),
    [filter, normalizedQuery],
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
        <DataTable
          columns={['고객명', '연락처', '차량', '차대번호', '매출', '미수', '최근 작업', '상태', '상세']}
          rows={filteredCustomers.map((customer) => [
            <button className="customer-name-button" key={`${customer.id}-name`} onClick={() => onOpenCustomer(customer.id)}>
              <strong>{customer.name}</strong>
              <span>{customer.memo}</span>
            </button>,
            customer.phone,
            customer.vehicle,
            customer.vin,
            formatMoney(customer.totalSales),
            formatMoney(customer.unpaid),
            customer.lastWork,
            <StatusPill
              key={`${customer.id}-status`}
              label={customer.unpaid > 0 ? '미수' : '정상'}
              tone={customer.unpaid > 0 ? 'red' : 'green'}
            />,
            <button className="mini-button" key={`${customer.id}-open`} onClick={() => onOpenCustomer(customer.id)}>
              보기
            </button>,
          ])}
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

function CustomerDetailModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <DetailDrawer
      eyebrow="고객 상세"
      footer={<ActionFooter primaryLabel="수정 저장" secondaryLabel="닫기" onSecondary={onClose} />}
      onClose={onClose}
      title={customer.name}
    >
      <CustomerSnapshot customer={customer} />
      <section>
        <h3 className="section-title">업무 이력</h3>
        <div className="history-grid">
          <HistoryItem icon={FileText} title="견적" value="3건" detail="최근 EST-2026-0017" />
          <HistoryItem icon={Wrench} title="작업" value="2건" detail={customer.lastWork} />
          <HistoryItem icon={ReceiptText} title="청구" value={formatMoney(customer.unpaid)} detail="미수 기준" />
          <HistoryItem icon={FolderOpen} title="자료" value={`${customer.files.length}개`} detail={customer.files.join(', ')} />
        </div>
      </section>
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
      <DataTable
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
      <DataTable
        columns={['파일명', '연결 업무', '구분', '고객/거래처', '상세']}
        rows={filteredAttachments.map((file) => [
          file.name,
          file.target,
          file.type,
          file.owner,
          <button className="mini-button" key={`${file.name}-open`} onClick={() => setSelectedFile(file)} type="button">
            보기
          </button>,
        ])}
      />
    </Panel>
    {selectedFile ? <AttachmentDetailDrawer file={selectedFile} onClose={() => setSelectedFile(null)} /> : null}
    </>
  );
}

function LedgerWorkbookPage({ vehicleModelSuggestions }: { vehicleModelSuggestions: string[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [selectedNo, setSelectedNo] = useState(ledgerRecords[0]!.no);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRecords = useMemo(
    () =>
      ledgerRecords.filter((record) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [
            record.no,
            record.date,
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
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'sales' && (record.paymentAmount > 0 || record.depositAmount > 0)) ||
          (filter === 'kp' && record.category === 'KP') ||
          (filter === 'insurance' && record.category === '보험') ||
          (filter === 'best' && record.category === '베스트') ||
          (filter === 'inbound' && record.category === '입고지원') ||
          (filter === 'estimate' && record.category === '견적') ||
          (filter === 'card' && (record.category === '카드' || record.paymentMethod.includes('카드')));

        return matchesQuery && matchesFilter;
      }),
    [filter, normalizedQuery],
  );
  const selectedRecord = ledgerRecords.find((record) => record.no === selectedNo) ?? ledgerRecords[0]!;
  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          ledgerRecords.flatMap((record) => [
            record.no,
            record.category,
            record.company,
            record.partner,
            record.vehicle,
            record.plate,
            record.paymentMethod,
            ...vehicleModelSuggestions,
          ]),
        ),
      ),
    [vehicleModelSuggestions],
  );
  const totalRevenue = ledgerRecords.reduce((sum, record) => sum + record.depositAmount + record.paymentAmount, 0);
  const claimTotal = ledgerRecords.reduce((sum, record) => sum + record.claimAmount, 0);
  const cardTotal = ledgerRecords.reduce(
    (sum, record) => sum + (record.paymentMethod.includes('카드') ? record.paymentAmount : 0),
    0,
  );
  const pendingCount = ledgerRecords.filter((record) => ['청구대기', '전환대기', '지급대기'].includes(record.status)).length;

  return (
    <div className="page-stack ledger-workbook-page">
      <section className="kpi-grid" aria-label="장부 요약">
        <KpiCard icon={ReceiptText} label="4월 장부 합계" value={formatMoney(totalRevenue)} detail="보험입금+결제금액 기준" tone="blue" />
        <KpiCard icon={WalletCards} label="보험 청구" value={formatMoney(claimTotal)} detail="청구금액 별도 추적" tone="orange" />
        <KpiCard icon={CreditCard} label="카드 매출" value={formatMoney(cardTotal)} detail="카드 시트 수수료 연결" tone="green" />
        <KpiCard icon={FileText} label="전환 대기" value={`${pendingCount}건`} detail="청구/견적/카드 확인 필요" tone="red" />
        <KpiCard icon={CheckCircle2} label="구현 시트" value="9개" detail="장부·매출·KP·보험·카드 포함" tone="purple" />
      </section>

      <section className="ledger-compose-grid">
        <Panel className="ledger-main-panel" title="새 장부 입력">
          <div className="ledger-entry-card">
            <div className="ledger-entry-head">
              <div>
                <p className="eyebrow">2026 장부 입력 폼</p>
                <strong>{selectedRecord.no} · {selectedRecord.vehicle}</strong>
              </div>
              <StatusPill label={selectedRecord.status} tone={selectedRecord.tone} />
            </div>
            <div className="ledger-entry-grid">
              <label>
                <span>구분</span>
                <select defaultValue={selectedRecord.category}>
                  <option>일반</option>
                  <option>KP</option>
                  <option>보험</option>
                  <option>베스트</option>
                  <option>입고지원</option>
                </select>
              </label>
              <label>
                <span>작업일</span>
                <input defaultValue={selectedRecord.date} />
              </label>
              <label>
                <span>시간</span>
                <input defaultValue={selectedRecord.time} />
              </label>
              <label>
                <span>업체</span>
                <input defaultValue={selectedRecord.company} />
              </label>
              <label>
                <span>거래처</span>
                <input defaultValue={selectedRecord.partner} />
              </label>
              <label>
                <span>차종</span>
                <input defaultValue={selectedRecord.vehicle} list="ledger-vehicle-model-suggestions" />
              </label>
              <label className="wide">
                <span>작업내용</span>
                <input defaultValue={selectedRecord.work} />
              </label>
              <label>
                <span>사용품번</span>
                <input defaultValue={selectedRecord.partNo} />
              </label>
              <label>
                <span>차량번호</span>
                <input defaultValue={selectedRecord.plate} />
              </label>
              <label>
                <span>보험청구</span>
                <input defaultValue={selectedRecord.claimAmount ? formatMoney(selectedRecord.claimAmount) : ''} />
              </label>
              <label>
                <span>보험입금</span>
                <input defaultValue={selectedRecord.depositAmount ? formatMoney(selectedRecord.depositAmount) : ''} />
              </label>
              <label>
                <span>결제금액</span>
                <input defaultValue={selectedRecord.paymentAmount ? formatMoney(selectedRecord.paymentAmount) : ''} />
              </label>
              <label>
                <span>결제구분</span>
                <input defaultValue={selectedRecord.paymentMethod} />
              </label>
            </div>
            <div className="ledger-entry-actions">
              <button className="secondary-button" type="button">
                <Camera size={16} />
                사진 첨부
              </button>
              <button className="secondary-button" type="button">
                <Download size={16} />
                엑셀 원본 보기
              </button>
              <button className="primary-button" type="button">
                <Plus size={16} />
                장부 저장
              </button>
            </div>
          </div>

          <RecordToolbar
            action={
              <button className="primary-button" type="button">
                <Plus size={16} />
                행 추가
              </button>
            }
            count={`총 ${filteredRecords.length}건`}
            filters={
              <FilterTabs
                ariaLabel="장부 필터"
                onChange={(value) => setFilter(value as LedgerFilter)}
                options={ledgerFilterOptions}
                value={filter}
              />
            }
            search={
              <SearchInput
                label="장부 검색"
                listId="ledger-search-suggestions"
                onChange={setQuery}
                placeholder="차량번호, 품번, 업체, 구분 검색"
                suggestions={searchSuggestions}
                value={query}
              />
            }
          />
          <DataTable
            columns={['번호', '작업일', '구분', '업체/거래처', '차량', '작업내용', '금액', '상태', '보기']}
            rows={filteredRecords.map((record) => [
              record.no,
              `${record.date}\n${record.time}`,
              record.category,
              `${record.company}\n${record.partner}`,
              `${record.vehicle}\n${record.plate}`,
              `${record.work}\n${record.partNo}`,
              `${record.claimAmount ? `청구 ${formatMoney(record.claimAmount)}\n` : ''}${record.depositAmount ? `입금 ${formatMoney(record.depositAmount)}\n` : ''}${record.paymentAmount ? `결제 ${formatMoney(record.paymentAmount)}` : '-'}`,
              <StatusPill key={`${record.no}-status`} label={record.status} tone={record.tone} />,
              <button className="mini-button" key={`${record.no}-select`} onClick={() => setSelectedNo(record.no)} type="button">
                열기
              </button>,
            ])}
          />
          <datalist id="ledger-vehicle-model-suggestions">
            {vehicleModelSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </Panel>

        <Panel className="ledger-side-panel" title="첨부 · 정산">
          <div className="ledger-phone-shell">
            <div className="ledger-phone-top">
              <strong>옵션</strong>
              <span>{selectedRecord.plate}</span>
            </div>
            <div className="ledger-photo-grid">
              <button type="button">
                <Camera size={18} />
                전
              </button>
              <button type="button">
                <Camera size={18} />
                후
              </button>
            </div>
            <div className="ledger-side-metrics">
              <InfoItem icon={Car} label="차량" value={selectedRecord.vehicle} />
              <InfoItem icon={CreditCard} label="결제" value={selectedRecord.paymentMethod} />
              <InfoItem icon={WalletCards} label="입금" value={formatMoney(selectedRecord.depositAmount + selectedRecord.paymentAmount)} />
            </div>
            <div className="ledger-side-note">
              <strong>비고</strong>
              <span>{selectedRecord.memo}</span>
            </div>
          </div>
        </Panel>
      </section>

      <section className="workbench-grid">
        <Panel className="span-7" title="시트별 구현 범위">
          <div className="ledger-module-grid">
            {workbookModules.map((module) => (
              <article key={module.name}>
                <div className="row-title">
                  <strong>{module.name}</strong>
                  <StatusPill label={module.status} tone={module.tone} />
                </div>
                <p>{module.source} · {module.role}</p>
                <div className="schema-tags">
                  {module.fields.map((field) => (
                    <span key={`${module.name}-${field}`}>{field}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="span-5" title="카드 정산">
          <div className="card-settlement-list">
            {cardSettlements.map((item) => (
              <article key={`${item.date}-${item.brand}-${item.plate}`}>
                <div className="row-title">
                  <strong>{item.brand} · {item.plate}</strong>
                  <StatusPill label={item.status} tone={item.tone} />
                </div>
                <div className="ledger-money-row">
                  <span>{item.date}</span>
                  <strong>{formatMoney(item.amount)}</strong>
                  <span>지급 {formatMoney(item.paid)} · {item.feeRate}</span>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="견적 전환 대기">
        <div className="estimate-conversion-list">
          {estimateConversions.map((item) => (
            <article key={`${item.date}-${item.vehicle}-${item.plate}`}>
              <div>
                <div className="row-title">
                  <strong>{item.vehicle}</strong>
                  <StatusPill label={item.owner} tone={item.tone} />
                </div>
                <p>{item.date} · {item.plate} · {item.estimate}</p>
              </div>
              <span>{item.next}</span>
              <button className="mini-button" type="button">
                장부 전환
              </button>
            </article>
          ))}
        </div>
      </Panel>
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
          <DataTable
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
    확인필요: 'orange',
  };

  return map[status] ?? 'gray';
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
