import { useState, useEffect, useMemo } from 'react';
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
import { Plus, Search, Download, Link2, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';

type SortKey = 'date' | 'project_name' | 'view' | 'type' | 'counterparty_name' | 'category_name' | 'amount' | 'legal_entity_name';

export default function Operations() {
  const [searchParams] = useSearchParams();
  const authUser = useAuth().user;
  const isAdmin = authUser?.role === 'admin';
  const isOperator = authUser?.role === 'operator';
  const [operations, setOperations] = useState<Operation[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; counterparty_id: string }[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; type: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [legalEntityFilter, setLegalEntityFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<{ open: boolean; target: Operation | null; field: 'act_status' | 'payment_status' | null; nextStatus?: string }>({ open: false, target: null, field: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<string>(searchParams.get('view') || 'all');
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('type') || 'all');
  const [projectFilter, setProjectFilter] = useState<string>(searchParams.get('project_id') || 'all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'desc' });

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
    setProjects(projs.map(p => ({ id: p.id, name: p.name, counterparty_id: p.counterparty_id })));
    setCounterparties(contrs);
    setCategories(cats.map(c => ({ id: c.id, name: c.name, type: c.type })));
    setStages(sts.map(s => ({ id: s.id, name: s.name })));
    setLegalEntities(les);
  }

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
      if (viewFilter !== 'all' && op.view !== viewFilter) return false;
      if (typeFilter !== 'all' && op.type !== typeFilter) return false;
      if (projectFilter !== 'all' && op.project_id !== projectFilter) return false;
      if (legalEntityFilter !== 'all' && op.legal_entity_id !== legalEntityFilter) return false;
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
  }, [operations, searchQuery, viewFilter, typeFilter, projectFilter, legalEntityFilter, sortConfig]);

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
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input placeholder="Поиск..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <Select value={viewFilter} onValueChange={setViewFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Вид" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все виды</SelectItem>
              <SelectItem value="Управленческий учёт">Управленческий учёт</SelectItem>
              <SelectItem value="Актирование">Актирование</SelectItem>
              <SelectItem value="Касса">Касса</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Тип" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="Приход">Приход</SelectItem>
              <SelectItem value="Расход">Расход</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Проект" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все проекты</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={legalEntityFilter} onValueChange={setLegalEntityFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Моё ЮЛ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все ЮЛ</SelectItem>
              {legalEntities.map(le => <SelectItem key={le.id} value={le.id}>{le.name}</SelectItem>)}
            </SelectContent>
          </Select>
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
                    <TableCell colSpan={9} className="text-center text-slate-400 py-12">Нет операций</TableCell>
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
