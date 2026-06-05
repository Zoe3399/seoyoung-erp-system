export function formatMoney(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatMoneyInputValue(value: string | number | null | undefined) {
  const normalizedValue = String(value ?? '').replaceAll(',', '').trim();
  if (!normalizedValue) return '';

  const [integerPart = ''] = normalizedValue.replace(/[^\d.]/g, '').split('.');
  if (!integerPart) return '';

  const amount = Number(integerPart);
  return Number.isFinite(amount) ? amount.toLocaleString('ko-KR') : '';
}

export function parseMoneyInputValue(value: string) {
  const amount = Number(value.replaceAll(',', '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}
