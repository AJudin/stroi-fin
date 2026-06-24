import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Project, Operation, Planning, Counterparty, Category, Stage, Contract } from '@/types';
import { pocketbaseService } from '@/lib/pocketbaseService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowLeft, Plus, ChevronDown, ChevronUp,
  Archive, Download, Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import OperationFormDialog from '@/components/OperationFormDialog';
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

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [planning, setPlanning] = useState<Planning[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  void stages;
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);
  const [isOpFormOpen, setIsOpFormOpen] = useState(false);
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [importReport, setImportReport] = useState<{ imported: number; errors: { row: number; message: string }[] } | null>(null);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<{ open: boolean; type: 'act' | 'payment' | 'contract'; target: Operation | Contract | null; projectId?: string; nextStatus?: string }>({ open: false, type: 'act', target: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin';
  const isOperator = user?.role === 'operator';
  const isManager = user?.role === 'project_manager';

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    if (!id) return;
    const [prj, ops, plan, contrs, cats, sts] = await Promise.all([
      pocketbaseService.getProject(id),
      pocketbaseService.getOperations({ project_id: id }),
      pocketbaseService.getPlanning(id),
      pocketbaseService.getCounterparties(),
      pocketbaseService.getCategories(id),
      pocketbaseService.getStages(id),
    ]);
    setProject(prj);
    setOperations(ops);
    setPlanning(plan);
    setCounterparties(contrs);
    setCategories(cats);
    setStages(sts);
  }

  const projectOps = useMemo(() => {
    return {
      management: operations.filter(o => o.view === 'Управленческий учёт'),
      acts: operations.filter(o => o.view === 'Актирование'),
      cash: operations.filter(o => o.view === 'Касса'),
    };
  }, [operations]);

  const balances = useMemo(() => {
    const signed = (ops: Operation[]) => ops.reduce((s, o) => s + (o.type === 'Приход' ? o.amount : -o.amount), 0);
    return {
      management: signed(projectOps.management),
      acts: signed(projectOps.acts),
      actsUnsigned: projectOps.acts.filter(o => o.act_status === 'Не подписан').reduce((s, o) => s + (o.type === 'Приход' ? o.amount : -o.amount), 0),
      cash: signed(projectOps.cash),
      cashUnpaid: projectOps.cash.filter(o => o.payment_status === 'Не оплачен').reduce((s, o) => s + (o.type === 'Приход' ? o.amount : -o.amount), 0),
      planning: planning.reduce((s, p) => s + (p.type === 'Приход' ? p.amount : -p.amount), 0),
    };
  }, [projectOps, planning]);

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Дата', 'Тип', 'Статья', 'Этап', 'Сумма', 'Комментарий'],
      ['15.07.2026', 'Приход', 'Оплата', 'Этап 1', '250000', 'Пример заполнения'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Планирование');
    XLSX.writeFile(wb, 'planning_template.xlsx');
  };

  const handleCounterpartyCreated = (c: Counterparty) => {
    setCounterparties(prev => [...prev, c]);
  };

  const handleConfirmStatus = async () => {
    if (!confirmStatus.target) return;
    if (confirmStatus.type === 'contract' && confirmStatus.projectId) {
      const contract = confirmStatus.target as Contract;
      const next: Contract = { ...contract, status: (confirmStatus.nextStatus as Contract['status']) || contract.status };
      await pocketbaseService.updateProject(confirmStatus.projectId, {
        contracts: project?.contracts.map(x => x.id === contract.id ? next : x) || [],
      });
    } else if (confirmStatus.type === 'act') {
      const op = confirmStatus.target as Operation;
      await pocketbaseService.updateOperation(op.id, { act_status: (confirmStatus.nextStatus as Operation['act_status']) || op.act_status });
    } else if (confirmStatus.type === 'payment') {
      const op = confirmStatus.target as Operation;
      await pocketbaseService.updateOperation(op.id, { payment_status: (confirmStatus.nextStatus as Operation['payment_status']) || op.payment_status });
    }
    setConfirmStatus({ open: false, type: 'act', target: null });
    await loadData();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = () => {
    setImportReport(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1, defval: '' }) as unknown as (string | number)[][];

    if (rows.length < 2) {
      setImportReport({ imported: 0, errors: [{ row: 1, message: 'Файл пуст или не содержит данных' }] });
      return;
    }

    const header = rows[0].map(h => String(h).trim().toLowerCase());
    const colIdx: Record<string, number> = {};
    ['дата', 'тип', 'статья', 'этап', 'сумма', 'комментарий'].forEach(name => {
      const idx = header.findIndex(h => h === name);
      if (idx >= 0) colIdx[name] = idx;
    });

    const errors: { row: number; message: string }[] = [];
    let imported = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const dateRaw = colIdx['дата'] !== undefined ? row[colIdx['дата']] : '';
      const typeRaw = colIdx['тип'] !== undefined ? row[colIdx['тип']] : '';
      const categoryRaw = colIdx['статья'] !== undefined ? row[colIdx['статья']] : '';
      const stageRaw = colIdx['этап'] !== undefined ? row[colIdx['этап']] : '';
      const amountRaw = colIdx['сумма'] !== undefined ? row[colIdx['сумма']] : '';
      const commentRaw = colIdx['комментарий'] !== undefined ? row[colIdx['комментарий']] : '';

      if (!dateRaw && !typeRaw && !categoryRaw && !amountRaw) continue;

      const typeStr = String(typeRaw).trim();
      const categoryStr = String(categoryRaw).trim();
      const stageStr = String(stageRaw).trim();
      const commentStr = String(commentRaw).trim();
      const amountNum = parseFloat(String(amountRaw).replace(/\s/g, '').replace(',', '.'));

      if (!dateRaw) {
        errors.push({ row: rowNum, message: 'Не указана дата' });
        continue;
      }
      if (!typeStr || (typeStr.toLowerCase() !== 'приход' && typeStr.toLowerCase() !== 'расход')) {
        errors.push({ row: rowNum, message: `Некорректный тип: "${typeStr}"` });
        continue;
      }
      if (!categoryStr) {
        errors.push({ row: rowNum, message: 'Не указана статья' });
        continue;
      }
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.push({ row: rowNum, message: `Некорректная сумма: "${amountRaw}"` });
        continue;
      }

      const dateValue = String(dateRaw).trim();
      let dateIso = dateValue;
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateValue)) {
        const [dd, mm, yyyy] = dateValue.split('.');
        dateIso = `${yyyy}-${mm}-${dd}`;
      }
      if (isNaN(new Date(dateIso).getTime())) {
        errors.push({ row: rowNum, message: `Некорректная дата: "${dateValue}"` });
        continue;
      }

      const type: Planning['type'] = typeStr.toLowerCase() === 'приход' ? 'Приход' : 'Расход';
      const categoryObj = categories.find(c => c.name.toLowerCase() === categoryStr.toLowerCase());
      const stageObj = stages.find(s => s.name.toLowerCase() === stageStr.toLowerCase());

      try {
        await pocketbaseService.createPlanning({
          project_id: id,
          date: dateIso,
          type,
          category: categoryObj ? categoryObj.name : categoryStr,
          stage_id: stageObj ? stageObj.id : '',
          amount: amountNum,
          comment: commentStr,
        });
        imported++;
      } catch (err) {
        errors.push({ row: rowNum, message: err instanceof Error ? err.message : 'Ошибка сохранения' });
      }
    }

    setImportReport({ imported, errors });
    if (fileInputRef.current) fileInputRef.current.value = '';
    await loadData();
  };

  if (!project) return <div className="p-8 text-center text-slate-400">Загрузка...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/projects">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
      </div>

      {/* Project Info Card */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Заказчик</p>
              <p className="font-medium">{project.counterparty_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Сроки</p>
              <p className="font-medium">{new Date(project.start_date).toLocaleDateString('ru-RU')} — {new Date(project.end_date).toLocaleDateString('ru-RU')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Стоимость</p>
              <p className="font-medium">{project.total_cost.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Договоры</p>
              <div className="flex flex-wrap gap-1">
                {project.contracts?.map(c => (
                  <Badge
                    key={c.id}
                    variant={c.status === 'Подписан' ? 'default' : 'destructive'}
                    className={`cursor-pointer ${c.status === 'Подписан' ? 'bg-emerald-500 text-xs' : 'text-xs'}`}
                    onClick={() => {
                      if (!project) return;
                      setConfirmStatus({
                        open: true, type: 'contract', target: c, projectId: project.id,
                        nextStatus: c.status === 'Подписан' ? 'Не подписан' : 'Подписан',
                      });
                    }}
                  >
                    {c.number || '—'} — {c.status} {c.amount > 0 && `(${c.amount.toLocaleString('ru-RU')} ₽)`}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Execution & Planning */}
      <Tabs defaultValue="execution">
        <TabsList>
          <TabsTrigger value="execution">Исполнение</TabsTrigger>
          <TabsTrigger value="planning">Планирование</TabsTrigger>
        </TabsList>

        {/* Execution */}
        <TabsContent value="execution" className="space-y-4 mt-4">
          {(isAdmin || isOperator) && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { setIsOpFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Добавить операцию
            </Button>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Management */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle
                    className="text-sm text-slate-500 cursor-pointer hover:text-emerald-600"
                    onClick={() => navigate(`/operations?project_id=${id}&view=${encodeURIComponent('Управленческий учёт')}`)}
                  >
                    Управленческий учёт
                  </CardTitle>
                  <span className={`text-lg font-bold ${balances.management >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {balances.management.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 max-h-64 overflow-auto">
                  {projectOps.management.map(op => (
                    <div
                      key={op.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm cursor-pointer hover:bg-slate-100"
                      onClick={() => { setEditingOp(op); setIsOpFormOpen(true); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{op.category_name} | {op.comment}</p>
                        <p className="text-xs text-slate-400">{new Date(op.date).toLocaleDateString('ru-RU')}</p>
                      </div>
                      <span className={`font-mono font-medium ml-2 ${op.type === 'Приход' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {op.type === 'Приход' ? '+' : '-'}{op.amount.toLocaleString('ru-RU')}
                      </span>
                    </div>
                  ))}
                  {projectOps.management.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Нет записей</p>}
                </div>
              </CardContent>
            </Card>

            {/* Acts */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle
                    className="text-sm text-slate-500 cursor-pointer hover:text-emerald-600"
                    onClick={() => navigate(`/operations?project_id=${id}&view=${encodeURIComponent('Актирование')}`)}
                  >
                    Актирование
                  </CardTitle>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${balances.acts >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {balances.acts.toLocaleString('ru-RU')} ₽
                    </span>
                    <p className="text-xs text-slate-500">Не подписано: {balances.actsUnsigned.toLocaleString('ru-RU')} ₽</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 max-h-64 overflow-auto">
                  {projectOps.acts.map(op => (
                    <div
                      key={op.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm cursor-pointer hover:bg-slate-100"
                      onClick={() => { setEditingOp(op); setIsOpFormOpen(true); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{op.comment}</p>
                        <p className="text-xs text-slate-400">{new Date(op.date).toLocaleDateString('ru-RU')}</p>
                      </div>
                      <div className="text-right ml-2">
                        <span className={`font-mono font-medium ${op.type === 'Приход' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {op.type === 'Приход' ? '+' : '-'}{op.amount.toLocaleString('ru-RU')}
                        </span>
                        {op.act_status && (
                          <Badge
                            variant={op.act_status === 'Подписан' ? 'default' : 'destructive'}
                            className={`text-[10px] ml-1 cursor-pointer ${op.act_status === 'Подписан' ? 'bg-emerald-500' : ''}`}
                            onClick={e => {
                              e.stopPropagation();
                              setConfirmStatus({
                                open: true, type: 'act', target: op,
                                nextStatus: op.act_status === 'Подписан' ? 'Не подписан' : 'Подписан',
                              });
                            }}
                          >
                            {op.act_status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {projectOps.acts.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Нет записей</p>}
                </div>
              </CardContent>
            </Card>

            {/* Cash */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle
                    className="text-sm text-slate-500 cursor-pointer hover:text-emerald-600"
                    onClick={() => navigate(`/operations?project_id=${id}&view=${encodeURIComponent('Касса')}`)}
                  >
                    Касса
                  </CardTitle>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${balances.cash >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {balances.cash.toLocaleString('ru-RU')} ₽
                    </span>
                    <p className="text-xs text-slate-500">Не оплачено: {balances.cashUnpaid.toLocaleString('ru-RU')} ₽</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 max-h-64 overflow-auto">
                  {projectOps.cash.map(op => (
                    <div
                      key={op.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm cursor-pointer hover:bg-slate-100"
                      onClick={() => { setEditingOp(op); setIsOpFormOpen(true); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{op.category_name} | {op.comment}</p>
                        <p className="text-xs text-slate-400">{new Date(op.date).toLocaleDateString('ru-RU')}</p>
                      </div>
                      <div className="text-right ml-2">
                        <span className={`font-mono font-medium ${op.type === 'Приход' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {op.type === 'Приход' ? '+' : '-'}{op.amount.toLocaleString('ru-RU')}
                        </span>
                        {op.payment_status && (
                          <Badge
                            variant={op.payment_status === 'Оплачен' ? 'default' : 'secondary'}
                            className={`text-[10px] ml-1 cursor-pointer ${op.payment_status === 'Оплачен' ? 'bg-emerald-500' : ''}`}
                            onClick={e => {
                              e.stopPropagation();
                              setConfirmStatus({
                                open: true, type: 'payment', target: op,
                                nextStatus: op.payment_status === 'Оплачен' ? 'Не оплачен' : 'Оплачен',
                              });
                            }}
                          >
                            {op.payment_status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {projectOps.cash.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Нет записей</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Planning */}
        <TabsContent value="planning" className="mt-4">
          <Collapsible open={isPlanningOpen} onOpenChange={setIsPlanningOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="mb-4">
                {isPlanningOpen ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                {isPlanningOpen ? 'Свернуть' : 'Развернуть'} планирование
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(isAdmin || isManager) && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => { setIsPlanFormOpen(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> Добавить
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="w-4 h-4 mr-1" /> Шаблон Excel
                </Button>
                {(isAdmin || isManager) && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleImport}
                      onClick={handleFileChange}
                    />
                    <Button size="sm" variant="outline" onClick={handleImportClick}>
                      <Upload className="w-4 h-4 mr-1" /> Импорт Excel
                    </Button>
                  </>
                )}
              </div>

              {importReport && (
                <div className={`p-3 rounded-lg text-sm ${importReport.errors.length > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                  <p className="font-medium">Импорт завершён</p>
                  <p>Импортировано: {importReport.imported} строк</p>
                  {importReport.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Ошибки ({importReport.errors.length}):</p>
                      <ul className="list-disc list-inside max-h-40 overflow-auto text-xs mt-1">
                        {importReport.errors.map((err, idx) => (
                          <li key={idx}>Строка {err.row}: {err.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">План проекта</CardTitle>
                    <span className={`text-lg font-bold ${balances.planning >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {balances.planning.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Статья</TableHead>
                        <TableHead className="text-right">Сумма</TableHead>
                        <TableHead>Комментарий</TableHead>
                        {(isAdmin || isManager) && <TableHead className="w-20"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planning.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{new Date(p.date).toLocaleDateString('ru-RU')}</TableCell>
                          <TableCell>
                            <Badge className={p.type === 'Приход' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                              {p.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{p.category}</TableCell>
                          <TableCell className={`text-right font-mono ${p.type === 'Приход' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {p.type === 'Приход' ? '+' : '-'}{p.amount.toLocaleString('ru-RU')} ₽
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">{p.comment}</TableCell>
                          {(isAdmin || isManager) && (
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                                onClick={async () => { await pocketbaseService.deletePlanning(p.id); await loadData(); }}>
                                <Archive className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {planning.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={isAdmin || isManager ? 6 : 5} className="text-center text-slate-400 py-8">Нет плановых данных</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>
      </Tabs>

      {/* Operation Form Dialog */}
      <OperationFormDialog
        open={isOpFormOpen}
        onClose={() => { setIsOpFormOpen(false); setEditingOp(null); }}
        operation={editingOp}
        projects={project ? [{ id: project.id, name: project.name, counterparty_id: project.counterparty_id }] : []}
        counterparties={counterparties}
        categories={categories}
        stages={stages}
        onSaved={loadData}
        onCounterpartyCreated={handleCounterpartyCreated}
      />

      {/* Status Change Confirmation */}
      <AlertDialog open={confirmStatus.open} onOpenChange={(open) => !open && setConfirmStatus({ open: false, type: 'act', target: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите изменение статуса</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStatus.type === 'contract' && confirmStatus.target && (
                <>Изменить статус договора «{(confirmStatus.target as Contract).number || '—'}» на «{confirmStatus.nextStatus}»?</>
              )}
              {confirmStatus.type === 'act' && confirmStatus.target && (
                <>Изменить статус акта на «{confirmStatus.nextStatus}»?</>
              )}
              {confirmStatus.type === 'payment' && confirmStatus.target && (
                <>Изменить статус оплаты на «{confirmStatus.nextStatus}»?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmStatus({ open: false, type: 'act', target: null })}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStatus} className="bg-emerald-600 hover:bg-emerald-700">Подтвердить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Planning Form Dialog */}
      <Dialog open={isPlanFormOpen} onOpenChange={() => setIsPlanFormOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новая плановая запись</DialogTitle></DialogHeader>
          <QuickPlanForm
            projectId={id || ''}
            categories={categories}
            _stages={stages}
            onSaved={loadData}
            onClose={() => setIsPlanFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickPlanForm({ projectId, categories, _stages, onSaved, onClose }:
  { projectId: string; categories: Category[]; _stages: Stage[]; onSaved: () => void; onClose: () => void;
  }) {
    void _stages;
    void projectId;
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'Приход' | 'Расход'>('Приход');
  const [category, setCategory] = useState('');
  const [stageId, setStageId] = useState('');
  void setStageId;
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await pocketbaseService.createPlanning({ date, project_id: projectId, type, category, stage_id: stageId, amount: parseFloat(amount), comment });
    onSaved();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
      <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Приход">Приход</SelectItem>
          <SelectItem value="Расход">Расход</SelectItem>
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger><SelectValue placeholder="Статья" /></SelectTrigger>
        <SelectContent>
          {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={stageId} onValueChange={setStageId}>
        <SelectTrigger><SelectValue placeholder="Этап" /></SelectTrigger>
        <SelectContent>
          {_stages.map((s: Stage) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input type="number" placeholder="Сумма" value={amount} onChange={e => setAmount(e.target.value)} required />
      <Input placeholder="Комментарий" value={comment} onChange={e => setComment(e.target.value)} />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">Создать</Button>
        <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
      </div>
    </form>
  );
}
