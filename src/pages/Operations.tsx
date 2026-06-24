import { useState, useEffect, useMemo } from 'react';
import type { Operation, Counterparty } from '@/types';
import { pocketbaseService } from '@/lib/pocketbaseService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import CounterpartySelect from '@/components/CounterpartySelect';
import { Plus, Search, Download, Pencil, Archive, Link2, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';

type SortKey = 'date' | 'project_name' | 'view' | 'type' | 'counterparty_name' | 'category_name' | 'amount';

export default function Operations() {
  const authUser = useAuth().user;
  const isAdmin = authUser?.role === 'admin';
  const isOperator = authUser?.role === 'operator';
  const [operations, setOperations] = useState<Operation[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; counterparty_id: string }[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; type: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'desc' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [ops, projs, contrs, cats, sts] = await Promise.all([
      pocketbaseService.getOperations(),
      pocketbaseService.getProjects(),
      pocketbaseService.getCounterparties(),
      pocketbaseService.getCategories(),
      pocketbaseService.getStages(),
    ]);
    setOperations(ops);
    setProjects(projs.map(p => ({ id: p.id, name: p.name, counterparty_id: p.counterparty_id })));
    setCounterparties(contrs);
    setCategories(cats.map(c => ({ id: c.id, name: c.name, type: c.type })));
    setStages(sts.map(s => ({ id: s.id, name: s.name })));
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
  }, [operations, searchQuery, viewFilter, typeFilter, projectFilter, sortConfig]);

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

  const handleCounterpartyCreated = (c: Counterparty) => {
    setCounterparties(prev => [...prev, c]);
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
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOps.map(op => (
                  <TableRow key={op.id} className="hover:bg-slate-50">
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
                    <TableCell>
                      {op.act_status && (
                        <Badge variant={op.act_status === 'Подписан' ? 'default' : 'destructive'}
                          className={op.act_status === 'Подписан' ? 'bg-emerald-500 text-xs' : 'text-xs'}>
                          {op.act_status}
                        </Badge>
                      )}
                      {op.payment_status && (
                        <Badge variant={op.payment_status === 'Оплачен' ? 'default' : 'secondary'}
                          className={op.payment_status === 'Оплачен' ? 'bg-emerald-500 text-xs ml-1' : 'text-xs ml-1'}>
                          {op.payment_status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(isAdmin || isOperator) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => { setEditingOp(op); setIsFormOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                            onClick={() => handleArchive(op.id)}>
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
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
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingOp(null); }}
        operation={editingOp}
        projects={projects}
        counterparties={counterparties}
        categories={categories}
        stages={stages}
        onSaved={loadData}
        onCounterpartyCreated={handleCounterpartyCreated}
      />
    </div>
  );
}

function OperationFormDialog({ open, onClose, operation, projects, counterparties, categories, stages, onSaved, onCounterpartyCreated }:
  {
    open: boolean; onClose: () => void; operation: Operation | null;
    projects: { id: string; name: string; counterparty_id: string }[];
    counterparties: Counterparty[];
    categories: { id: string; name: string; type: string }[];
    stages: { id: string; name: string }[];
    onSaved: () => void;
    onCounterpartyCreated: (c: Counterparty) => void;
  }) {
  const [projectId, setProjectId] = useState(operation?.project_id || '');
  const [date, setDate] = useState(operation?.date || new Date().toISOString().split('T')[0]);
  const [views, setViews] = useState<string[]>(operation ? [operation.view] : ['Управленческий учёт']);
  const [type, setType] = useState<'Приход' | 'Расход'>(operation?.type || 'Приход');
  const [counterpartyId, setCounterpartyId] = useState(operation?.counterparty_id || '');
  const [categoryId, setCategoryId] = useState(operation?.category_id || '');
  const [stageId, setStageId] = useState(operation?.stage_id || '');
  const [amount, setAmount] = useState(operation?.amount?.toString() || '');
  const [comment, setComment] = useState(operation?.comment || '');
  const [actStatus, setActStatus] = useState<'Подписан' | 'Не подписан'>(operation?.act_status as 'Подписан' | 'Не подписан' || 'Не подписан');
  const [paymentStatus, setPaymentStatus] = useState<'Оплачен' | 'Не оплачен'>(operation?.payment_status as 'Оплачен' | 'Не оплачен' || 'Не оплачен');
  const [updateLinked, setUpdateLinked] = useState(false);

  const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  // Auto-select customer counterparty for income operations
  useEffect(() => {
    if (type === 'Приход' && project) {
      setCounterpartyId(project.counterparty_id);
    }
  }, [type, project]);

  // Filter categories by operation type
  const availableCategories = useMemo(() =>
    categories.filter(c => c.type === type),
    [categories, type]
  );

  useEffect(() => {
    if (categoryId && !availableCategories.find(c => c.id === categoryId)) {
      setCategoryId('');
    }
  }, [availableCategories, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || !projectId || !counterpartyId) return;

    const baseData = {
      date, project_id: projectId, type,
      counterparty_id: counterpartyId, category_id: categoryId, stage_id: stageId,
      comment, amount: numAmount,
      is_archived: false,
    };

    if (operation) {
      const data = {
        ...baseData,
        view: operation.view,
        act_status: operation.view === 'Актирование' ? actStatus : null,
        payment_status: operation.view === 'Касса' ? paymentStatus : null,
      };
      await pocketbaseService.updateOperation(operation.id, data);

      if (updateLinked && operation.parent_id) {
        const linked = await pocketbaseService.getOperations({ parent_id: operation.parent_id });
        const updatePayload = {
          date, project_id: projectId, type,
          counterparty_id: counterpartyId, category_id: categoryId, stage_id: stageId,
          comment, amount: numAmount,
        };
        await Promise.all(
          linked.filter(op => op.id !== operation.id).map(op =>
            pocketbaseService.updateOperation(op.id, updatePayload)
          )
        );
      }
    } else {
      const groupId = views.length > 1 ? `group_${Date.now()}` : null;
      for (const view of views) {
        const data = {
          ...baseData,
          view: view as Operation['view'],
          act_status: view === 'Актирование' ? actStatus : null,
          payment_status: view === 'Касса' ? paymentStatus : null,
          parent_id: groupId,
        };
        await pocketbaseService.createOperation(data);
      }
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{operation ? 'Редактирование операции' : 'Новая операция'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Дата</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Проект</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Вид операции</Label>
            <div className="flex gap-2 flex-wrap">
              {['Управленческий учёт', 'Актирование', 'Касса'].map(v => (
                <Button
                  key={v}
                  type="button"
                  variant={views.includes(v) ? 'default' : 'outline'}
                  size="sm"
                  className={views.includes(v) ? 'bg-emerald-600' : ''}
                  onClick={() => setViews(views.includes(v) ? views.filter(x => x !== v) : [...views, v])}
                  disabled={!!operation}
                >
                  {v}
                </Button>
              ))}
            </div>
            {operation && <p className="text-xs text-slate-400">Вид нельзя изменить при редактировании</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Тип</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'Приход' | 'Расход')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Приход">Приход</SelectItem>
                  <SelectItem value="Расход">Расход</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Контрагент</Label>
              <CounterpartySelect
                value={counterpartyId}
                onChange={setCounterpartyId}
                counterparties={counterparties}
                onCreated={onCounterpartyCreated}
                preferredId={type === 'Приход' && project ? project.counterparty_id : undefined}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Статья</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Этап</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Сумма</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>

          {views.includes('Актирование') && (
            <div className="space-y-1.5">
              <Label>Статус акта</Label>
              <Select value={actStatus} onValueChange={(v) => setActStatus(v as 'Подписан' | 'Не подписан')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Подписан">Подписан</SelectItem>
                  <SelectItem value="Не подписан">Не подписан</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {views.includes('Касса') && (
            <div className="space-y-1.5">
              <Label>Статус оплаты</Label>
              <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'Оплачен' | 'Не оплачен')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Оплачен">Оплачен</SelectItem>
                  <SelectItem value="Не оплачен">Не оплачен</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Комментарий</Label>
            <Input value={comment} onChange={e => setComment(e.target.value)} />
          </div>

          {operation?.parent_id && (
            <div className="flex items-center gap-2">
              <Checkbox id="updateLinked" checked={updateLinked} onCheckedChange={(v) => setUpdateLinked(Boolean(v))} />
              <Label htmlFor="updateLinked" className="text-sm font-normal cursor-pointer">
                Обновить связанные операции ({operation.parent_id})
              </Label>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {operation ? 'Сохранить' : 'Создать'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
