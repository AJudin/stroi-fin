import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Project, Operation, Planning, Counterparty, Category, Stage } from '@/types';
import { mockService } from '@/lib/mockService';
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
  Archive, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
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

  const isAdmin = user?.role === 'admin';
  const isOperator = user?.role === 'operator';
  const isManager = user?.role === 'project_manager';

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    if (!id) return;
    const [prj, ops, plan, contrs, cats, sts] = await Promise.all([
      mockService.getProject(id),
      mockService.getOperations({ project_id: id }),
      mockService.getPlanning(id),
      mockService.getCounterparties(),
      mockService.getCategories(id),
      mockService.getStages(id),
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

  const balances = useMemo(() => ({
    management: projectOps.management.reduce((s, o) => s + (o.type === 'Приход' ? o.amount : -o.amount), 0),
    acts: projectOps.acts.reduce((s, o) => s + (o.type === 'Приход' ? o.amount : -o.amount), 0),
    cash: projectOps.cash.reduce((s, o) => s + (o.type === 'Приход' ? o.amount : -o.amount), 0),
    planning: planning.reduce((s, p) => s + (p.type === 'Приход' ? p.amount : -p.amount), 0),
  }), [projectOps, planning]);

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Дата', 'Тип', 'Статья', 'Этап', 'Сумма', 'Комментарий'],
      ['15.07.2026', 'Приход', 'Оплата', 'Этап 1', '250000', 'Пример заполнения'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Планирование');
    XLSX.writeFile(wb, 'planning_template.xlsx');
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
                  <Badge key={c.id} variant={c.status === 'Подписан' ? 'default' : 'destructive'}
                    className={c.status === 'Подписан' ? 'bg-emerald-500 text-xs' : 'text-xs'}>
                    {c.number}
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
                  <CardTitle className="text-sm text-slate-500">Управленческий учёт</CardTitle>
                  <span className={`text-lg font-bold ${balances.management >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {balances.management.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 max-h-64 overflow-auto">
                  {projectOps.management.map(op => (
                    <div key={op.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
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
                  <CardTitle className="text-sm text-slate-500">Актирование</CardTitle>
                  <span className={`text-lg font-bold ${balances.acts >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {balances.acts.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 max-h-64 overflow-auto">
                  {projectOps.acts.map(op => (
                    <div key={op.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{op.comment}</p>
                        <p className="text-xs text-slate-400">{new Date(op.date).toLocaleDateString('ru-RU')}</p>
                      </div>
                      <div className="text-right ml-2">
                        <span className={`font-mono font-medium ${op.type === 'Приход' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {op.type === 'Приход' ? '+' : '-'}{op.amount.toLocaleString('ru-RU')}
                        </span>
                        {op.act_status && (
                          <Badge variant={op.act_status === 'Подписан' ? 'default' : 'destructive'}
                            className={`text-[10px] ml-1 ${op.act_status === 'Подписан' ? 'bg-emerald-500' : ''}`}>
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
                  <CardTitle className="text-sm text-slate-500">Касса</CardTitle>
                  <span className={`text-lg font-bold ${balances.cash >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {balances.cash.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 max-h-64 overflow-auto">
                  {projectOps.cash.map(op => (
                    <div key={op.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{op.category_name} | {op.comment}</p>
                        <p className="text-xs text-slate-400">{new Date(op.date).toLocaleDateString('ru-RU')}</p>
                      </div>
                      <div className="text-right ml-2">
                        <span className={`font-mono font-medium ${op.type === 'Приход' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {op.type === 'Приход' ? '+' : '-'}{op.amount.toLocaleString('ru-RU')}
                        </span>
                        {op.payment_status && (
                          <Badge variant={op.payment_status === 'Оплачен' ? 'default' : 'secondary'}
                            className={`text-[10px] ml-1 ${op.payment_status === 'Оплачен' ? 'bg-emerald-500' : ''}`}>
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
              <div className="flex gap-2">
                {(isAdmin || isManager) && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => { setIsPlanFormOpen(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> Добавить
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="w-4 h-4 mr-1" /> Шаблон Excel
                </Button>
              </div>

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
                                onClick={async () => { await mockService.deletePlanning(p.id); await loadData(); }}>
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
      <Dialog open={isOpFormOpen} onOpenChange={() => { setIsOpFormOpen(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новая операция</DialogTitle></DialogHeader>
          <QuickOpForm
            projectId={id || ''}
            counterparties={counterparties}
            categories={categories}
            _stages={stages}
            onSaved={loadData}
            onClose={() => { setIsOpFormOpen(false); }}
          />
        </DialogContent>
      </Dialog>

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

function QuickOpForm({ projectId, counterparties, categories, _stages, onSaved, onClose }:
  { projectId: string; counterparties: Counterparty[]; categories: Category[]; _stages: Stage[];
    onSaved: () => void; onClose: () => void;
  }) {
    void _stages;
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState<'Управленческий учёт' | 'Актирование' | 'Касса'>('Управленческий учёт');
  const [type, setType] = useState<'Приход' | 'Расход'>('Приход');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stageId, setStageId] = useState('');
  void setStageId;
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await mockService.createOperation({
      date, project_id: projectId, view, type,
      counterparty_id: counterpartyId, category_id: categoryId, stage_id: stageId,
      comment, amount: parseFloat(amount),
      act_status: view === 'Актирование' ? 'Не подписан' : null,
      payment_status: view === 'Касса' ? 'Не оплачен' : null,
      is_archived: false, parent_id: null,
    });
    onSaved();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
      <Select value={view} onValueChange={(v) => setView(v as typeof view)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Управленческий учёт">Управленческий учёт</SelectItem>
          <SelectItem value="Актирование">Актирование</SelectItem>
          <SelectItem value="Касса">Касса</SelectItem>
        </SelectContent>
      </Select>
      <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Приход">Приход</SelectItem>
          <SelectItem value="Расход">Расход</SelectItem>
        </SelectContent>
      </Select>
      <Select value={counterpartyId} onValueChange={setCounterpartyId}>
        <SelectTrigger><SelectValue placeholder="Контрагент" /></SelectTrigger>
        <SelectContent>
          {counterparties.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger><SelectValue placeholder="Статья" /></SelectTrigger>
        <SelectContent>
          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
    await mockService.createPlanning({ date, project_id: projectId, type, category, stage_id: stageId, amount: parseFloat(amount), comment });
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
