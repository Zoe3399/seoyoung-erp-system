import inventorySnapshotsJson from './generated/inventory_snapshots.json';
import partnersJson from './generated/partners.json';
import productItemsJson from './generated/product_items.json';
import mockDbSummaryJson from './generated/mock_db_summary.json';

export type MockProductUsageScope = '작업용' | '판매용' | '공용';
export type MockInventoryStatus = '정상' | '부족' | '확인필요';

export type MockProductItemRow = {
  sourceRow: number | null;
  itemCode: string;
  itemName: string;
  spec: string;
  inboundPrice: string;
  outboundPrice: string;
  exchangePrice: string;
  note: string;
};

export type MockInventorySnapshotRow = {
  sourceRow: number | null;
  itemCode: string;
  itemName: string;
  spec: string;
  previousQty: string;
  inboundQty: string;
  outboundQty: string;
  stockQty: string;
};

export type MockPartnerRow = {
  sourceRow: number | null;
  partnerCode: string;
  partnerName: string;
  representativeName: string;
  phone: string;
  mobile: string;
  fax: string;
  transferInfoStatus: string;
};

export type MockInventoryItem = {
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
  usageScope: MockProductUsageScope;
  compatible: string;
  location: string;
  stock: number;
  minimum: number;
  centerPrice: number;
  claimPrice: number;
  status: MockInventoryStatus;
};

export type MockPartner = {
  name: string;
  type: string;
  manager: string;
  phone: string;
  unpaid: number;
  files: string;
};

export type MockDbTables = {
  product_items: MockProductItemRow;
  inventory_snapshots: MockInventorySnapshotRow;
  partners: MockPartnerRow;
};

export const mockDb = {
  product_items: productItemsJson as MockProductItemRow[],
  inventory_snapshots: inventorySnapshotsJson as MockInventorySnapshotRow[],
  partners: partnersJson as MockPartnerRow[],
  summary: mockDbSummaryJson,
};

export function selectMockRows<TableName extends keyof MockDbTables>(tableName: TableName): Array<MockDbTables[TableName]> {
  return [...mockDb[tableName]] as Array<MockDbTables[TableName]>;
}

function parseNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(String(value).replaceAll(',', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function pickPrice(...values: Array<string | number | null | undefined>) {
  for (const value of values) {
    const parsed = parseNumber(value);
    if (parsed !== null) return Math.max(0, Math.round(parsed));
  }

  return 0;
}

function calculateStock(row: MockInventorySnapshotRow) {
  const explicitStock = parseNumber(row.stockQty);
  if (explicitStock !== null) return Math.max(0, Math.round(explicitStock));

  const previousQty = parseNumber(row.previousQty) ?? 0;
  const inboundQty = parseNumber(row.inboundQty) ?? 0;
  const outboundQty = parseNumber(row.outboundQty) ?? 0;

  return Math.max(0, Math.round(previousQty + inboundQty - outboundQty));
}

function resolveUsageScope(product?: MockProductItemRow): MockProductUsageScope {
  if (!product) return '작업용';

  const hasSalePrice = pickPrice(product.outboundPrice, product.exchangePrice) > 0;
  if (hasSalePrice) return '공용';
  if (product.note.includes('판매')) return '판매용';
  return '작업용';
}

function resolveInventoryStatus(stock: number, minimum: number): MockInventoryStatus {
  if (stock <= 0) return '부족';
  if (stock <= minimum) return '확인필요';
  return '정상';
}

function resolveInventoryName(row: MockInventorySnapshotRow, product?: MockProductItemRow) {
  return row.itemName || product?.itemName || row.itemCode;
}

function resolveCompatibleVehicle(row: MockInventorySnapshotRow, product?: MockProductItemRow) {
  return row.itemName || product?.itemName || '차종 미분류';
}

function resolvePartnerType(partnerName: string) {
  if (/보험|화재|해상|손해|렌터|렌트/.test(partnerName)) return '보험사';
  if (/유리|글라스|모비스|부품|상사|상회|도매|대리점/.test(partnerName)) return '매입처';
  return '정비소';
}

export function buildActualInventoryItems(): MockInventoryItem[] {
  const productByCode = new Map(mockDb.product_items.map((item) => [item.itemCode, item]));

  return mockDb.inventory_snapshots
    .filter((row) => {
      const itemCode = row.itemCode.trim();
      return itemCode.length > 0 && itemCode !== '합계';
    })
    .map((row, index) => {
      const product = productByCode.get(row.itemCode);
      const stock = calculateStock(row);
      const minimum = stock <= 1 ? 2 : 1;
      const centerPrice = pickPrice(product?.inboundPrice);
      const claimPrice = pickPrice(product?.exchangePrice, product?.outboundPrice, product?.inboundPrice);

      return {
        partNo: row.itemCode,
        name: resolveInventoryName(row, product),
        spec: row.spec || product?.spec || '',
        previousQty: row.previousQty,
        inboundQty: row.inboundQty,
        outboundQty: row.outboundQty,
        stockQty: row.stockQty,
        inboundPrice: product?.inboundPrice ?? '',
        outboundPrice: product?.outboundPrice ?? '',
        exchangePrice: product?.exchangePrice ?? '',
        note: product?.note ?? '',
        usageScope: resolveUsageScope(product),
        compatible: resolveCompatibleVehicle(row, product),
        location: `실재고-${String(index + 1).padStart(3, '0')}`,
        stock,
        minimum,
        centerPrice,
        claimPrice,
        status: resolveInventoryStatus(stock, minimum),
      };
    });
}

export function buildActualPartners(): MockPartner[] {
  return mockDb.partners
    .filter((row) => row.partnerName.trim().length > 0)
    .map((row) => {
      const contact = row.phone || row.mobile || row.fax || '-';
      const transferStatus = row.transferInfoStatus ? `이체정보 ${row.transferInfoStatus}` : '이체정보 미확인';

      return {
        name: row.partnerName,
        type: resolvePartnerType(row.partnerName),
        manager: row.representativeName || '-',
        phone: contact,
        unpaid: 0,
        files: `${transferStatus}${row.partnerCode ? ` · 코드 ${row.partnerCode}` : ''}`,
      };
    });
}
