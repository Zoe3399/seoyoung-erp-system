import type { ReactNode } from 'react';
import { Plus, Search, X, type LucideIcon } from 'lucide-react';
import { formatMoney } from '../lib/format';

export type Tone = 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'purple' | 'yellow';

export function BrandIdentity({
  logoSrc,
  title,
  subtitle,
  variant = 'header',
}: {
  logoSrc: string;
  title: string;
  subtitle?: string;
  variant?: 'header' | 'login';
}) {
  return (
    <span className={`brand-identity brand-identity-${variant}`}>
      <span className="brand-identity-logo" aria-hidden="true">
        <img alt="" src={logoSrc} />
      </span>
      <span className="brand-identity-text">
        <strong>{title}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
    </span>
  );
}

export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <h2>{title}</h2>
        {action}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function RecordToolbar({
  search,
  filters,
  count,
  action,
}: {
  search?: ReactNode;
  filters?: ReactNode;
  count?: string;
  action?: ReactNode;
}) {
  return (
    <div className="record-toolbar">
      {search ? <div className="record-toolbar-search">{search}</div> : null}
      {filters ? <div className="record-toolbar-filters">{filters}</div> : null}
      {count ? <span className="record-toolbar-count">{count}</span> : null}
      {action ? <div className="record-toolbar-action">{action}</div> : null}
    </div>
  );
}

export function SearchInput({
  label,
  value,
  placeholder,
  onChange,
  suggestions = [],
  listId,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  listId?: string;
}) {
  const suggestionId = listId ?? `${label.replace(/\s+/g, '-')}-suggestions`;

  return (
    <label className="search-input">
      <span>{label}</span>
      <div>
        <Search size={16} />
        <input
          list={suggestions.length > 0 ? suggestionId : undefined}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      </div>
      {suggestions.length > 0 ? (
        <datalist id={suggestionId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      ) : null}
    </label>
  );
}

export function FilterTabs({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="filter-tabs" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          className={value === option.id ? 'selected' : ''}
          key={option.id}
          onClick={() => onChange(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function DetailDrawer({
  title,
  eyebrow,
  onClose,
  children,
  footer,
  variant = 'drawer',
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'drawer' | 'modal';
}) {
  return (
    <div className={`drawer-backdrop ${variant === 'modal' ? 'modal-detail-backdrop' : ''}`} role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="detail-drawer-title"
        aria-modal="true"
        className={`detail-drawer ${variant === 'modal' ? 'detail-drawer-modal' : ''}`}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-drawer-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id="detail-drawer-title">{title}</h2>
          </div>
          <button className="ghost-button" onClick={onClose} title="닫기" type="button">
            <X size={18} />
          </button>
        </header>
        <div className="detail-drawer-body">{children}</div>
        {footer ? <footer className="detail-drawer-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function ActionFooter({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="action-footer">
      {secondaryLabel ? (
        <button className="secondary-button" onClick={onSecondary} type="button">
          {secondaryLabel}
        </button>
      ) : null}
      <button className="primary-button" onClick={onPrimary} type="button">
        {primaryLabel}
      </button>
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: Tone;
}) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div className="kpi-icon">
        <Icon size={19} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function DataTable({
  columns,
  rows,
  onRowClick,
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
  onRowClick?: (rowIndex: number) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              className={onRowClick ? 'clickable-row' : undefined}
              key={`${rowIndex}-${String(row[0])}`}
              onClick={
                onRowClick
                  ? (event) => {
                      const target = event.target;
                      if (
                        target instanceof HTMLElement &&
                        target.closest('button, a, input, select, textarea')
                      ) {
                        return;
                      }

                      onRowClick(rowIndex);
                    }
                  : undefined
              }
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.target !== event.currentTarget) return;

                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onRowClick(rowIndex);
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
            >
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

export function PriorityItem({
  icon: Icon,
  tone,
  title,
  detail,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  detail: string;
}) {
  return (
    <article className="priority-item">
      <div className={`priority-icon ${tone}`}>
        <Icon size={17} />
      </div>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}

export function InfoItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="info-item">
      <Icon size={15} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function Typeahead({ label, value }: { label: string; value: string }) {
  return (
    <label className="typeahead">
      <span>{label}</span>
      <input defaultValue={value} />
    </label>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input defaultValue={value} />
    </label>
  );
}

export function ToolbarButtons() {
  return (
    <div className="toolbar-buttons">
      <button className="secondary-button" type="button">
        <Search size={16} />
        검색
      </button>
      <button className="primary-button" type="button">
        <Plus size={16} />
        등록
      </button>
    </div>
  );
}

export function LineItem({ label, name, amount }: { label: string; name: string; amount: number }) {
  return (
    <article className="line-item">
      <span>{label}</span>
      <strong>{name}</strong>
      <em>{formatMoney(amount)}</em>
    </article>
  );
}

export function CalcRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`calc-row ${strong ? 'strong' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function HistoryItem({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="history-item">
      <Icon size={18} />
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function SettingRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="setting-row">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}
