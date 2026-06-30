import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Operation, Counterparty, LegalEntity } from '@/types';
import { pocketbaseService } from '@/lib/pocketbaseService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import OperationFormDialog from '@/components/OperationFormDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Search, Download, Link2, ArrowUpDown, Calendar as CalendarIcon, X, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DateRange } from 'react-day-picker';

type SortKey = 'date' | 'project_name' | 'view' | 'type' | 'counterparty_name' | 'category_name' | 'stage_name' | 'amount' | 'legal_entity_name';

type FilterKey = 'date' | 'project' | 'view' | 'type' | 'counterparty' | 'category' | 'stage' | 'legalEntity' | 'actStatus' | 'paymentStatus' | 'amount' | 'comment';

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function CalendarDragSelector({ selected, onSelect }: { selected?: DateRange; onSelect: (range?: DateRange) => void }) {
  const [dragRange, setDragRange] = useState<DateRange | undefined>(selected);
  const [isDragging, setIsDragging] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const dayFromPoint = (clientX: number, clientY: number): Date | null => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!el) return null;
    const dayEl = el.closest('[data-day]') as HTMLElement | null;
    const iso = dayEl?.getAttribute('data-day');
    return iso ? parseIsoDate(iso) : null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const day = dayFromPoint(e.clientX, e.clientY);
    if (!day) return;
    setIsDragging(true);
    setDragRange({ from: day, to: day });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const day = dayFromPoint(e.clientX, e.clientY);
    if (!day) return;
    setDragRange(prev => ({ from: prev?.from || day, to: day }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setIsDragging(false);
    const range = dragRange?.from
      ? { from: dragRange.from, to: dragRange.to || dragRange.from }
      : undefined;
    setDragRange(undefined);
    if (range?.from) {
      onSelect(range);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <Calendar
        mode="range"
        className="[--cell-size:3rem] text-base"
        selected={dragRange || selected}
      />
    </div>
  );
}

type AmountFilter = { min: string; max: string };

const FILTER_LABELS: Record<FilterKey, string> = {
  date: 'Дата',
  project: 'Проект',
  view: 'Вид',
  type: 'Тип',
  counterparty: 'Контрагент',
  category: 'Статья',
  stage: 'Этап',
  legalEntity: 'Моё ЮЛ',
  actStatus: 'Статус акта',
  paymentStatus: 'Статус оплаты',
  amount: 'Сумма',
  comment: 'Комментарий',
};

const ALL_FILTER_KEYS: FilterKey[] = ['date', 'project', 'view', 'type', 'counterparty', 'category', 'stage', 'legalEntity', 'actStatus', 'paymentStatus', 'amount', 'comment'];

function formatDate(d?: Date) {
  if (!d) return '';
  return d.toLocaleDateString('ru-RU');
}

function dateStr(d?: Date) {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Operations() {
  const [searchParams] = useSearchParams();
  const authUser = useAuth().user;
  const isAdmin = authUser?.role === 'admin';
  const isOperator = authUser?.role === 'operator';
  const [operations, setOperations] = useState<Operation[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; counterparty_id: string; legal_entity_id?: string }[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; type: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<{ open: boolean; target: Operation | null; field: 'act_status' | 'payment_status' | null; nextStatus?: string }>({ open: false, target: null, field: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'desc' });

  // Dynamic filters
  const [activeFilters, setActiveFilters] = useState<FilterKey[]>(['view', 'type', 'project', 'legalEntity']);

  const [filterValues, setFilterValues] = useState<{
    date?: DateRange;
    project: string;
    view: string;
    type: string;
    counterparty: string;
    category: string;
    stage: string;
    legalEntity: string;
    actStatus: string;
    paymentStatus: string;
    amount: AmountFilter;
    comment: string;
  }>({
    project: searchParams.get('project_id') || 'all',
    view: searchParams.get('view') || 'all',
    type: searchParams.get('type') || 'all',
    counterparty: 'all',
    category: 'all',
    stage: 'all',
    legalEntity: 'all',
    actStatus: 'all',
    paymentStatus: 'all',
    amount: { min: '', max: '' },
    comment: '',
  });
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [ops, projs, contrs, cats, sts, les] = await Promise.all([
      pocketbaseService.getOperations(),
      pocketbaseService.getProjects(),
      pocketbaseService.getCounterparties(),
      pocketbaseService.getCategories(),
      pocketbaseService.getStages(),
      pocketbaseService.getLegalEntities(),
    ]);
    setOperations(ops);
    setProjects(projs.map(p => ({ id: p.id, name: p.name, counterparty_id: p.counterparty_id, legal_entity_id: p.legal_entity_id })));
    setCounterparties(contrs);
    setCategories(cats.map(c => ({ id: c.id, name: c.name, type: c.type })));
    setStages(sts.map(s => ({ id: s.id, name: s.name })));
    setLegalEntities(les);
  }

  const addFilter = (key: FilterKey) => {
    if (!activeFilters.includes(key)) {
      setActiveFilters(prev => [...prev, key]);
    }
  };

  const removeFilter = (key: FilterKey) => {
    setActiveFilters(prev => prev.filter(k => k !== key));
    setFilterValues(prev => {
      const next = { ...prev };
      if (key === 'date') {
        delete next.date;
      } else if (key === 'amount') {
        next.amount = { min: '', max: '' };
      } else if (key === 'comment') {
        next.comment = '';
      } else {
        (next as any)[key] = 'all';
      }
      return next;
    });
    if (key === 'date') setDatePopoverOpen(false);
  };

  const setFilter = (key: Exclude<FilterKey, 'date' | 'amount'>, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setActiveFilters(['view', 'type', 'project', 'legalEntity']);
    setFilterValues({
      project: 'all',
      view: 'all',
      type: 'all',
      counterparty: 'all',
      category: 'all',
      stage: 'all',
      legalEntity: 'all',
      actStatus: 'all',
      paymentStatus: 'all',
      amount: { min: '', max: '' },
      comment: '',
    });
    setSortConfig({ key: null, direction: 'desc' });
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: 'desc' };
    });
  };

  const sortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300" />;
    return <ArrowUpDown className={`w-3 h-3 ml-1 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />;
  };

  const filteredOps = useMemo(() => {
    const list = operations.filter(op => {
      if (searchQuery && !op.counterparty_name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !op.project_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      if (filterValues.date?.from && filterValues.date?.to) {
        const from = dateStr(filterValues.date.from);
        const to = dateStr(filterValues.date.to);
        if (op.date < from || op.date > to) return false;
      }
      if (activeFilters.includes('project') && filterValues.project !== 'all' && op.project_id !== filterValues.project) return false;
      if (activeFilters.includes('view') && filterValues.view !== 'all' && op.view !== filterValues.view) return false;
      if (activeFilters.includes('type') && filterValues.type !== 'all' && op.type !== filterValues.type) return false;
      if (activeFilters.includes('counterparty') && filterValues.counterparty !== 'all' && op.counterparty_id !== filterValues.counterparty) return false;
      if (activeFilters.includes('category') && filterValues.category !== 'all' && op.category_id !== filterValues.category) return false;
      if (activeFilters.includes('stage') && filterValues.stage !== 'all' && op.stage_id !== filterValues.stage) return false;
      if (activeFilters.includes('legalEntity') && filterValues.legalEntity !== 'all' && op.legal_entity_id !== filterValues.legalEntity) return false;
      if (activeFilters.includes('actStatus') && filterValues.actStatus !== 'all' && op.act_status !== filterValues.actStatus) return false;
      if (activeFilters.includes('paymentStatus') && filterValues.paymentStatus !== 'all' && op.payment_status !== filterValues.paymentStatus) return false;
      if (activeFilters.includes('amount')) {
        const min = parseFloat(filterValues.amount.min);
        const max = parseFloat(filterValues.amount.max);
        if (!isNaN(min) && op.amount < min) return false;
        if (!isNaN(max) && op.amount > max) return false;
      }
      if (activeFilters.includes('comment') && filterValues.comment && !op.comment.toLowerCase().includes(filterValues.comment.toLowerCase())) return false;
      return true;
    });

    list.sort((a, b) => {
      if (!sortConfig.key) return new Date(b.date).getTime() - new Date(a.date).getTime();
      const key = sortConfig.key;
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (key === 'amount') {
        aVal = a.amount;
        bVal = b.amount;
      } else {
        aVal = (a[key] as string | undefined) ?? '';
        bVal = (b[key] as string | undefined) ?? '';
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return list;
  }, [operations, searchQuery, filterValues, activeFilters, sortConfig]);

  const handleExport = () => {
    const data = filteredOps.map(op => ({
      'Дата': op.date,
      'Неделя': op.week,
      'Проект': op.project_name,
      'Вид': op.view,
      'Тип': op.type,
      'Контрагент': op.counterparty_name,
      'Статья': op.category_name,
      'Этап': op.stage_name,
      'Сумма': op.amount,
      'Моё ЮЛ': op.legal_entity_name || '',
      'Статус акта': op.act_status || '',
      'Статус оплаты': op.payment_status || '',
      'Комментарий': op.comment,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Операции');
    XLSX.writeFile(wb, 'operations.xlsx');
  };

  const handleArchive = async (id: string) => {
    await pocketbaseService.archiveOperation(id);
    await loadData();
  };

  const handleArchiveEditing = () => {
    if (!editingOp) return;
    handleArchive(editingOp.id);
    setIsFormOpen(false);
    setEditingOp(null);
  };

  const handleConfirmStatus = async () => {
    if (!confirmStatus.target || !confirmStatus.field || !confirmStatus.nextStatus) return;
    await pocketbaseService.updateOperation(confirmStatus.target.id, { [confirmStatus.field]: confirmStatus.nextStatus });
    setConfirmStatus({ open: false, target: null, field: null });
    await loadData();
  };

  const handleCounterpartyCreated = (c: Counterparty) => {
    setCounterparties(prev => [...prev, c]);
  };

  const handleLegalEntityCreated = (le: LegalEntity) => {
    setLegalEntities(prev => [...prev, le]);
  };

  const viewColors: Record<string, string> = {
    'Управленческий учёт': 'bg-blue-100 text-blue-700',
    'Актирование': 'bg-purple-100 text-purple-700',
    'Касса': 'bg-emerald-100 text-emerald-700',
  };

  const SortableHeader = ({ keyName, children, className }: { keyName: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={`cursor-pointer select-none ${className || ''}`} onClick={() => handleSort(keyName)}>
      <div className="flex items-center">
        {children}
        {sortIcon(keyName)}
      </div>
    </TableHead>
  );

  const inactiveFilters = ALL_FILTER_KEYS.filter(k => !activeFilters.includes(k));
  const dateActive = activeFilters.includes('date') && filterValues.date?.from && filterValues.date?.to;

  const FilterBadge = ({ filterKey, children }: { filterKey: FilterKey; children: React.ReactNode }) => (
    <div className="flex items-center gap-1 bg-slate-50 border rounded-md pl-2 pr-1 py-1">
      <span className="text-xs text-slate-500 whitespace-nowrap">{FILTER_LABELS[filterKey]}</span>
      {children}
      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => removeFilter(filterKey)}>
        <X className="w-3 h-3 text-slate-400" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Операции</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
          {(isAdmin || isOperator) && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditingOp(null); setIsFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Добавить
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input placeholder="Поиск..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          {/* Date filter chip */}
          {dateActive && (
            <FilterBadge filterKey="date">
              <span className="text-sm whitespace-nowrap">
                {formatDate(filterValues.date?.from)} — {formatDate(filterValues.date?.to)}
              </span>
            </FilterBadge>
          )}

          {/* Active select filters */}
          {activeFilters.includes('view') && (
            <FilterBadge filterKey="view">
              <Select value={filterValues.view} onValueChange={v => setFilter('view', v)}>
                <SelectTrigger className="w-36 h-7 border-0 bg-transparent shadow-none px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все виды</SelectItem>
                  <SelectItem value="Управленческий учёт">Управленческий учёт</SelectItem>
                  <SelectItem value="Актирование">Актирование</SelectItem>
                  <SelectItem value="Касса">Касса</SelectItem>
                </SelectContent>
              </Select>
            </FilterBadge>
          )}

          {activeFilters.includes('type') && (
            <FilterBadge filterKey="type">
              <Select value={filterValues.type} onValueChange={v => setFilter('type', v)}>
                <SelectTrigger className="w-28 h-7 border-0 bg-transparent shadow-none px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="Приход">Приход</SelectItem>
                  <SelectItem value="Расход">Расход</SelectItem>
                </SelectContent>
              </Select>
            </FilterBadge>
          )}

          {activeFilters.includes('project') && (
            <FilterBadge filterKey="project">
              <Select value={filterValues.project} onValueChange={v => setFilter('project', v)}>
                <SelectTrigger className="w-40 h-7 border-0 bg-transparent shadow-none px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все проекты</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterBadge>
          )}

          {activeFilters.includes('counterparty') && (
            <FilterBadge filterKey="counterparty">
              <Select value={filterValues.counterparty} onValueChange={v => setFilter('counterparty', v)}>
                <SelectTrigger className="w-40 h-7 border-0 bg-transparent shadow-none px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все контрагенты</SelectItem>
                  {counterparties.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterBadge>
          )}

          {activeFilters.includes('category') && (
            <FilterBadge filterKey="category">
              <Select value={filterValues.category} onValueChange={v => setFilter('category', v)}>
                <SelectTrigger className="w-40 h-7 border-0 bg-transparent shadow-none px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статьи</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterBadge>
          )}

          {activeFilters.includes('stage') && (
            <FilterBadge filterKey="stage">
              <Select value={filterValues.stage} onValueChange={v => setFilter('stage', v)}>
                <SelectTrigger className="w-40 h-7 border-0 bg-transparent shadow-none px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все этапы</SelectItem>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterBadge>
          )}

          {activeFilters.includes('legalEntity') && (
            <FilterBadge filterKey="legalEntity">
              <Select value={filterValues.legalEntity} onValueChange={v => setFilter('legalEntity', v)}>
                <SelectTrigger className="w-40 h-7 border-0 bg-transparent shadow-none px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все ЮЛ</SelectItem>
                  {legalEntities.map(le => <SelectItem key={le.id} value={le.id}>{le.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterBadge>
          )}

          {activeFilters.includes('actStatus') && (
            <FilterBadge filterKey="actStatus">
              <Select value={filterValues.actStatus} onValueChange={v => setFilter('actStatus', v)}>
                <SelectTrigger className="w-36 h-7 border-0 bg-transparent shadow-none px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="Подписан">Подписан</SelectItem>
                  <SelectItem value="Не подписан">Не подписан</SelectItem>
                </SelectContent>
              </Select>
            </FilterBadge>
          )}

          {activeFilters.includes('paymentStatus') && (
            <FilterBadge filterKey="paymentStatus">
              <Select value={filterValues.paymentStatus} onValueChange={v => setFilter('paymentStatus', v)}>
                <SelectTrigger className="w-36 h-7 border-0 bg-transparent shadow-none px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="Оплачен">Оплачен</SelectItem>
                  <SelectItem value="Не оплачен">Не оплачен</SelectItem>
                </SelectContent>
              </Select>
            </FilterBadge>
          )}

          {activeFilters.includes('amount') && (
            <FilterBadge filterKey="amount">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  placeholder="от"
                  className="w-20 h-7 px-1 text-sm"
                  value={filterValues.amount.min}
                  onChange={e => setFilterValues(prev => ({ ...prev, amount: { ...prev.amount, min: e.target.value } }))}
                />
                <span className="text-slate-400">—</span>
                <Input
                  type="number"
                  placeholder="до"
                  className="w-20 h-7 px-1 text-sm"
                  value={filterValues.amount.max}
                  onChange={e => setFilterValues(prev => ({ ...prev, amount: { ...prev.amount, max: e.target.value } }))}
                />
              </div>
            </FilterBadge>
          )}

          {activeFilters.includes('comment') && (
            <FilterBadge filterKey="comment">
              <Input
                placeholder="Поиск по комментарию"
                className="w-40 h-7 px-1 text-sm border-0 bg-transparent shadow-none"
                value={filterValues.comment}
                onChange={e => setFilterValues(prev => ({ ...prev, comment: e.target.value }))}
              />
            </FilterBadge>
          )}

          {/* Calendar filter */}
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon" className={dateActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}>
                <CalendarIcon className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <div className="text-sm text-slate-500 mb-2">Зажмите мышь на первой дате и потяните до конца периода</div>
              <CalendarDragSelector
                selected={filterValues.date}
                onSelect={(range) => {
                  setFilterValues(prev => ({ ...prev, date: range }));
                  if (range?.from && range.to) {
                    addFilter('date');
                    setDatePopoverOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          {/* Add filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
              {inactiveFilters.length === 0 && (
                <DropdownMenuItem disabled>Все фильтры добавлены</DropdownMenuItem>
              )}
              {inactiveFilters.map(key => (
                <DropdownMenuItem key={key} onClick={() => addFilter(key)}>
                  {FILTER_LABELS[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset filters */}
          <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
            <RotateCcw className="w-4 h-4 mr-1" /> Сброс
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader keyName="date">Дата</SortableHeader>
                  <SortableHeader keyName="project_name">Проект</SortableHeader>
                  <SortableHeader keyName="view">Вид</SortableHeader>
                  <SortableHeader keyName="type">Тип</SortableHeader>
                  <SortableHeader keyName="counterparty_name">Контрагент</SortableHeader>
                  <SortableHeader keyName="category_name">Статья</SortableHeader>
                  <SortableHeader keyName="stage_name">Этап</SortableHeader>
                  <SortableHeader keyName="amount" className="text-right">Сумма</SortableHeader>
                  <SortableHeader keyName="legal_entity_name">Моё ЮЛ</SortableHeader>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOps.map(op => (
                  <TableRow
                    key={op.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => { setEditingOp(op); setIsFormOpen(true); }}
                  >
                    <TableCell className="text-sm">{new Date(op.date).toLocaleDateString('ru-RU')}</TableCell>
                    <TableCell className="text-sm font-medium max-w-[180px] truncate">{op.project_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${viewColors[op.view] || ''}`}>
                        {op.view}
                      </Badge>
                      {op.parent_id && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link2 className="w-3 h-3 inline ml-1 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>Связанная запись</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={op.type === 'Приход' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                        {op.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{op.counterparty_name}</TableCell>
                    <TableCell className="text-sm">{op.category_name}</TableCell>
                    <TableCell className="text-sm">{op.stage_name}</TableCell>
                    <TableCell className={`text-right font-mono font-medium ${op.type === 'Приход' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {op.type === 'Приход' ? '+' : '-'}{op.amount.toLocaleString('ru-RU')} ₽
                    </TableCell>
                    <TableCell className="text-sm">{op.legal_entity_name}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      {op.act_status && (
                        <Badge
                          variant={op.act_status === 'Подписан' ? 'default' : 'destructive'}
                          className={`${op.act_status === 'Подписан' ? 'bg-emerald-500 text-xs' : 'text-xs'} cursor-pointer`}
                          onClick={e => {
                            e.stopPropagation();
                            setConfirmStatus({ open: true, target: op, field: 'act_status', nextStatus: op.act_status === 'Подписан' ? 'Не подписан' : 'Подписан' });
                          }}
                        >
                          {op.act_status}
                        </Badge>
                      )}
                      {op.payment_status && (
                        <Badge
                          variant={op.payment_status === 'Оплачен' ? 'default' : 'secondary'}
                          className={`${op.payment_status === 'Оплачен' ? 'bg-emerald-500 text-xs ml-1' : 'text-xs ml-1'} cursor-pointer`}
                          onClick={e => {
                            e.stopPropagation();
                            setConfirmStatus({ open: true, target: op, field: 'payment_status', nextStatus: op.payment_status === 'Оплачен' ? 'Не оплачен' : 'Оплачен' });
                          }}
                        >
                          {op.payment_status}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-slate-400 py-12">Нет операций</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <OperationFormDialog
        key={editingOp?.id || 'new'}
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingOp(null); }}
        operation={editingOp}
        projects={projects}
        counterparties={counterparties}
        categories={categories}
        stages={stages}
        legalEntities={legalEntities}
        onSaved={loadData}
        onCounterpartyCreated={handleCounterpartyCreated}
        onLegalEntityCreated={handleLegalEntityCreated}
        onArchive={isAdmin ? handleArchiveEditing : undefined}
      />

      <AlertDialog open={confirmStatus.open} onOpenChange={(open) => !open && setConfirmStatus({ open: false, target: null, field: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите изменение статуса</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStatus.field === 'act_status' && <>Изменить статус акта на «{confirmStatus.nextStatus}»?</>}
              {confirmStatus.field === 'payment_status' && <>Изменить статус оплаты на «{confirmStatus.nextStatus}»?</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmStatus({ open: false, target: null, field: null })}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStatus} className="bg-emerald-600 hover:bg-emerald-700">Подтвердить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
