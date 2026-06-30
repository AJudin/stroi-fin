import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Operation, Project, Counterparty, Category, Stage, Contract } from '@/types';
import { pocketbaseService } from '@/lib/pocketbaseService';
import { useAuth } from '@/context/AuthContext';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart3, TrendingUp, AlertTriangle,
  FileText, FileCheck, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, ComposedChart, ReferenceLine, Label
} from 'recharts';

interface KPICardProps {
  title: string;
  primaryValue: number;
  secondaryValue?: number;
  secondaryLabel?: string;
  color: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function KPICard({ title, primaryValue, secondaryValue, secondaryLabel, color, icon, isOpen, onToggle }: KPICardProps) {
  const isPositive = primaryValue >= 0;
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${isOpen ? 'ring-2 ring-emerald-500' : ''}`}
      onClick={onToggle}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-slate-500 font-medium">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {primaryValue.toLocaleString('ru-RU')} ₽
            </p>
            {secondaryValue !== undefined && (
              <p className="text-xs text-slate-400 mt-1">
                {secondaryLabel}: {secondaryValue.toLocaleString('ru-RU')} ₽
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [operations, setOperations] = useState<Operation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [openBlock, setOpenBlock] = useState<string | null>('management');
  const [showRecords, setShowRecords] = useState(false);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<{ open: boolean; type: 'act' | 'contract' | 'op_act' | 'op_payment'; target: Operation | Contract | null; project?: Project; nextStatus?: string }>({ open: false, type: 'act', target: null });

  async function loadData() {
    const [ops, prjs, contrs, cats, sts] = await Promise.all([
      pocketbaseService.getOperations(),
      pocketbaseService.getProjects(),
      pocketbaseService.getCounterparties(),
      pocketbaseService.getCategories(),
      pocketbaseService.getStages(),
    ]);
    setOperations(ops);
    setProjects(prjs);
    setCounterparties(contrs);
    setCategories(cats);
    setStages(sts);
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleCounterpartyCreated = (c: Counterparty) => {
    setCounterparties(prev => [...prev, c]);
  };

  const handleArchive = async (id: string) => {
    await pocketbaseService.archiveOperation(id);
    await loadData();
  };

  const handleConfirmStatus = async () => {
    if (!confirmStatus.target) return;
    if (confirmStatus.type === 'act') {
      const act = confirmStatus.target as Operation;
      await pocketbaseService.updateOperation(act.id, { act_status: (confirmStatus.nextStatus as Operation['act_status']) || act.act_status });
    } else if (confirmStatus.type === 'op_act') {
      const op = confirmStatus.target as Operation;
      await pocketbaseService.updateOperation(op.id, { act_status: (confirmStatus.nextStatus as Operation['act_status']) || op.act_status });
    } else if (confirmStatus.type === 'op_payment') {
      const op = confirmStatus.target as Operation;
      await pocketbaseService.updateOperation(op.id, { payment_status: (confirmStatus.nextStatus as Operation['payment_status']) || op.payment_status });
    } else if (confirmStatus.type === 'contract' && confirmStatus.project) {
      const contract = confirmStatus.target as Contract;
      const next: Contract = { ...contract, status: (confirmStatus.nextStatus as Contract['status']) || contract.status };
      await pocketbaseService.updateProject(confirmStatus.project.id, {
        contracts: confirmStatus.project.contracts.map(x => x.id === contract.id ? next : x),
      });
    }
    setConfirmStatus({ open: false, type: 'act', target: null });
    await loadData();
  };

  const kpi = useMemo(() => {
    const mgmt = operations.filter(o => o.view === 'Управленческий учёт' && !o.is_archived);
    const acts = operations.filter(o => o.view === 'Актирование' && !o.is_archived);
    const cash = operations.filter(o => o.view === 'Касса' && !o.is_archived);

    const sum = (data: Operation[], filter?: string) => {
      const income = data.filter(o => o.type === 'Приход' && (!filter || o.act_status === filter || o.payment_status === filter))
        .reduce((s, o) => s + o.amount, 0);
      const expense = data.filter(o => o.type === 'Расход' && (!filter || o.act_status === filter || o.payment_status === filter))
        .reduce((s, o) => s + o.amount, 0);
      return income - expense;
    };

    return {
      management: sum(mgmt),
      acts_signed: sum(acts, 'Подписан'),
      acts_gross: sum(acts),
      cash_paid: sum(cash, 'Оплачен'),
      cash_gross: sum(cash),
    };
  }, [operations]);

  const cumulativeData = useMemo(() => {
    const today = new Date('2026-06-24');
    const dates: { date: Date; label: string }[] = [];
    for (let i = -45; i <= 45; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push({
        date: d,
        label: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
      });
    }

    const viewFilter = openBlock === 'management' ? 'Управленческий учёт' :
      openBlock === 'acts' ? 'Актирование' : 'Касса';

    const startDateStr = dates[0].date.toISOString().split('T')[0];
    let cumulative = operations
      .filter(o => o.view === viewFilter && !o.is_archived && o.date < startDateStr)
      .reduce((s, o) => s + (o.type === 'Приход' ? o.amount : -o.amount), 0);

    return dates.map(({ date, label }) => {
      const dateStr = date.toISOString().split('T')[0];
      const dayOps = operations.filter(o =>
        o.view === viewFilter && !o.is_archived && o.date === dateStr
      );
      const income = dayOps.filter(o => o.type === 'Приход').reduce((s, o) => s + o.amount, 0);
      const expense = dayOps.filter(o => o.type === 'Расход').reduce((s, o) => s + o.amount, 0);
      const value = income - expense;
      cumulative += value;
      return { label, value, cumulative: Math.round(cumulative), isFuture: date > today };
    });
  }, [operations, openBlock]);

  const unsignedActs = useMemo(() =>
    operations.filter(o => o.view === 'Актирование' && o.act_status === 'Не подписан' && !o.is_archived)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [operations]
  );

  const unsignedContracts = useMemo(() => {
    const list: { project: Project; contract: Project['contracts'][number] }[] = [];
    projects.forEach(p => {
      p.contracts?.filter(c => c.status === 'Не подписан').forEach(c => list.push({ project: p, contract: c }));
    });
    return list.sort((a, b) => new Date(a.project.start_date).getTime() - new Date(b.project.start_date).getTime());
  }, [projects]);

  const blockRecords = useMemo(() => {
    const viewFilter = openBlock === 'management' ? 'Управленческий учёт' :
      openBlock === 'acts' ? 'Актирование' : 'Касса';
    return operations.filter(o => o.view === viewFilter && !o.is_archived);
  }, [operations, openBlock]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Дашборд</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Управленческий учёт"
          primaryValue={kpi.management}
          color="bg-blue-100 text-blue-600"
          icon={<BarChart3 className="w-6 h-6" />}
          isOpen={openBlock === 'management'}
          onToggle={() => setOpenBlock(openBlock === 'management' ? null : 'management')}
        />
        <KPICard
          title="Актирование"
          primaryValue={kpi.acts_signed}
          secondaryValue={kpi.acts_gross}
          secondaryLabel="Валовый"
          color="bg-purple-100 text-purple-600"
          icon={<FileCheck className="w-6 h-6" />}
          isOpen={openBlock === 'acts'}
          onToggle={() => setOpenBlock(openBlock === 'acts' ? null : 'acts')}
        />
        <KPICard
          title="Касса"
          primaryValue={kpi.cash_paid}
          secondaryValue={kpi.cash_gross}
          secondaryLabel="Валовый"
          color="bg-emerald-100 text-emerald-600"
          icon={<TrendingUp className="w-6 h-6" />}
          isOpen={openBlock === 'cash'}
          onToggle={() => setOpenBlock(openBlock === 'cash' ? null : 'cash')}
        />
      </div>

      {/* Chart */}
      {openBlock && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {openBlock === 'management' ? 'Управленческий учёт' :
                  openBlock === 'acts' ? 'Актирование' : 'Касса'} — 90 дней
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRecords(!showRecords)}
              >
                {showRecords ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                Записи
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval={14}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v.toLocaleString('ru-RU')} ₽`, 'Баланс']}
                    labelFormatter={(l) => `Дата: ${l}`}
                  />
                  <ReferenceLine x={cumulativeData.find(d => !d.isFuture)?.label || ''} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={2}>
                    <Label value="Сегодня" position="insideTopLeft" fill="#f59e0b" fontSize={10} />
                  </ReferenceLine>
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray={undefined}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Records table */}
            {showRecords && (
              <div className="mt-4 border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Проект</TableHead>
                      <TableHead>Контрагент</TableHead>
                      <TableHead>Тип</TableHead>
                      {openBlock !== 'management' && <TableHead>Статус</TableHead>}
                      <TableHead className="text-right">Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockRecords.map(op => (
                      <TableRow
                        key={op.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => { setEditingOp(op); setIsFormOpen(true); }}
                      >
                        <TableCell>{new Date(op.date).toLocaleDateString('ru-RU')}</TableCell>
                        <TableCell className="font-medium">{op.project_name}</TableCell>
                        <TableCell>{op.counterparty_name}</TableCell>
                        <TableCell>
                          <Badge variant={op.type === 'Приход' ? 'default' : 'destructive'}
                            className={op.type === 'Приход' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                            {op.type}
                          </Badge>
                        </TableCell>
                        {openBlock !== 'management' && (
                          <TableCell>
                            {op.act_status && openBlock === 'acts' && (
                              <Badge
                                variant={op.act_status === 'Подписан' ? 'default' : 'destructive'}
                                className={op.act_status === 'Подписан' ? 'bg-emerald-500 text-xs cursor-pointer' : 'text-xs cursor-pointer'}
                                onClick={e => {
                                  e.stopPropagation();
                                  const next = op.act_status === 'Подписан' ? 'Не подписан' : 'Подписан';
                                  setConfirmStatus({ open: true, type: 'op_act', target: op, nextStatus: next });
                                }}
                              >
                                {op.act_status}
                              </Badge>
                            )}
                            {op.payment_status && openBlock === 'cash' && (
                              <Badge
                                variant={op.payment_status === 'Оплачен' ? 'default' : 'secondary'}
                                className={op.payment_status === 'Оплачен' ? 'bg-emerald-500 text-xs cursor-pointer' : 'text-xs cursor-pointer'}
                                onClick={e => {
                                  e.stopPropagation();
                                  const next = op.payment_status === 'Оплачен' ? 'Не оплачен' : 'Оплачен';
                                  setConfirmStatus({ open: true, type: 'op_payment', target: op, nextStatus: next });
                                }}
                              >
                                {op.payment_status}
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-mono">{op.amount.toLocaleString('ru-RU')} ₽</TableCell>
                      </TableRow>
                    ))}
                    {blockRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={openBlock === 'management' ? 5 : 6} className="text-center text-slate-400 py-8">Нет записей</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <OperationFormDialog
        key={editingOp?.id || 'new'}
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingOp(null); }}
        operation={editingOp}
        projects={projects.map(p => ({ id: p.id, name: p.name, counterparty_id: p.counterparty_id }))}
        counterparties={counterparties}
        categories={categories.map(c => ({ id: c.id, name: c.name, type: c.type }))}
        stages={stages.map(s => ({ id: s.id, name: s.name }))}
        onSaved={loadData}
        onCounterpartyCreated={handleCounterpartyCreated}
        onArchive={isAdmin && editingOp ? () => { handleArchive(editingOp.id); setIsFormOpen(false); setEditingOp(null); } : undefined}
      />

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Unsigned Acts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base">Не подписанные акты</CardTitle>
              {unsignedActs.length > 0 && (
                <Badge variant="destructive" className="text-xs">{unsignedActs.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-64 overflow-auto">
              {unsignedActs.map(act => {
                const daysOverdue = Math.floor((new Date('2026-06-24').getTime() - new Date(act.date).getTime()) / 86400000);
                return (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                    onClick={() => navigate(`/projects/${act.project_id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">{act.project_name}</p>
                      <p className="text-xs text-slate-500">{act.counterparty_name} | {act.amount.toLocaleString('ru-RU')} ₽</p>
                    </div>
                    <div className="text-right" onClick={e => { e.stopPropagation(); setConfirmStatus({ open: true, type: 'act', target: act, nextStatus: 'Подписан' }); }}>
                      <Badge variant="destructive" className="text-xs cursor-pointer">Не подписан</Badge>
                      <p className="text-xs text-slate-500 mt-1">{new Date(act.date).toLocaleDateString('ru-RU')}</p>
                      {daysOverdue > 0 && (
                        <p className="text-xs text-red-500 font-medium">{daysOverdue} дн. просрочки</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {unsignedActs.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Все акты подписаны</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unsigned Contracts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" />
              <CardTitle className="text-base">Не подписанные договоры</CardTitle>
              {unsignedContracts.length > 0 && (
                <Badge variant="destructive" className="text-xs">{unsignedContracts.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-64 overflow-auto">
              {unsignedContracts.map(({ project, contract }) => (
                <div
                  key={`${project.id}-${contract.id}`}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium">{project.name}</p>
                    <p className="text-xs text-slate-500">{contract.number || '—'} | {contract.amount.toLocaleString('ru-RU')} ₽ | {new Date(project.start_date).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <Badge
                    variant="destructive"
                    className="text-xs cursor-pointer"
                    onClick={e => { e.stopPropagation(); setConfirmStatus({ open: true, type: 'contract', target: contract, project, nextStatus: 'Подписан' }); }}
                  >
                    Не подписан
                  </Badge>
                </div>
              ))}
              {unsignedContracts.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Все договоры подписаны</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmStatus.open} onOpenChange={(open) => !open && setConfirmStatus({ open: false, type: 'act', target: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите изменение статуса</AlertDialogTitle>
            <AlertDialogDescription>
              {(confirmStatus.type === 'act' || confirmStatus.type === 'op_act') && confirmStatus.target && (
                <>Изменить статус акта на «{confirmStatus.nextStatus}»?</>
              )}
              {confirmStatus.type === 'op_payment' && confirmStatus.target && (
                <>Изменить статус оплаты на «{confirmStatus.nextStatus}»?</>
              )}
              {confirmStatus.type === 'contract' && confirmStatus.target && (
                <>Изменить статус договора «{(confirmStatus.target as Contract).number || '—'}» на «{confirmStatus.nextStatus}»?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmStatus({ open: false, type: 'act', target: null })}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStatus} className="bg-emerald-600 hover:bg-emerald-700">Подтвердить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
