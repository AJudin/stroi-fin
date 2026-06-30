import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project, Operation, Counterparty, Contract, LegalEntity } from '@/types';
import { pocketbaseService } from '@/lib/pocketbaseService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CounterpartySelect from '@/components/CounterpartySelect';
import LegalEntitySelect from '@/components/LegalEntitySelect';
import { Plus, Trash2 } from 'lucide-react';

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'project_manager';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [prjs, ops, contrs, les] = await Promise.all([
      pocketbaseService.getProjects(),
      pocketbaseService.getOperations(),
      pocketbaseService.getCounterparties(),
      pocketbaseService.getLegalEntities(),
    ]);
    setProjects(prjs);
    setOperations(ops);
    setCounterparties(contrs);
    setLegalEntities(les);
  }

  const getProjectBalance = (projectId: string, view: string) => {
    const ops = operations.filter(o => o.project_id === projectId && o.view === view && !o.is_archived);
    const income = ops.filter(o => o.type === 'Приход').reduce((s, o) => s + o.amount, 0);
    const expense = ops.filter(o => o.type === 'Расход').reduce((s, o) => s + o.amount, 0);
    return income - expense;
  };

  const handleCounterpartyCreated = (c: Counterparty) => {
    setCounterparties(prev => [...prev, c]);
  };

  const handleLegalEntityCreated = (le: LegalEntity) => {
    setLegalEntities(prev => [...prev, le]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Проекты</h1>
        {(isAdmin || isManager) && (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => { setEditingProject(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Новый проект
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Проект</TableHead>
                <TableHead>Заказчик</TableHead>
                <TableHead>Моё ЮЛ</TableHead>
                <TableHead className="text-right">Упр. учёт</TableHead>
                <TableHead className="text-right">Актирование</TableHead>
                <TableHead className="text-right">Касса</TableHead>
                <TableHead>Сроки</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map(p => (
                <TableRow
                  key={p.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.counterparty_name}</TableCell>
                  <TableCell>{p.legal_entity_name || '—'}</TableCell>
                  <TableCell className={`text-right font-mono ${getProjectBalance(p.id, 'Управленческий учёт') >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {getProjectBalance(p.id, 'Управленческий учёт').toLocaleString('ru-RU')} ₽
                  </TableCell>
                  <TableCell className={`text-right font-mono ${getProjectBalance(p.id, 'Актирование') >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {getProjectBalance(p.id, 'Актирование').toLocaleString('ru-RU')} ₽
                  </TableCell>
                  <TableCell className={`text-right font-mono ${getProjectBalance(p.id, 'Касса') >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {getProjectBalance(p.id, 'Касса').toLocaleString('ru-RU')} ₽
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(p.start_date).toLocaleDateString('ru-RU')} — {new Date(p.end_date).toLocaleDateString('ru-RU')}
                  </TableCell>
                </TableRow>
              ))}
              {projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-12">Нет проектов</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProjectFormDialog
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingProject(null); }}
        project={editingProject}
        counterparties={counterparties}
        legalEntities={legalEntities}
        onSaved={loadData}
        onCounterpartyCreated={handleCounterpartyCreated}
        onLegalEntityCreated={handleLegalEntityCreated}
      />
    </div>
  );
}

function ProjectFormDialog({ open, onClose, project, counterparties, legalEntities, onSaved, onCounterpartyCreated, onLegalEntityCreated }:
  {
    open: boolean; onClose: () => void; project: Project | null;
    counterparties: Counterparty[];
    legalEntities: LegalEntity[];
    onSaved: () => void;
    onCounterpartyCreated: (c: Counterparty) => void;
    onLegalEntityCreated: (le: LegalEntity) => void;
  }) {
  const [name, setName] = useState(project?.name || '');
  const [counterpartyId, setCounterpartyId] = useState(project?.counterparty_id || '');
  const [legalEntityId, setLegalEntityId] = useState(project?.legal_entity_id || '');
  const [startDate, setStartDate] = useState(project?.start_date || '');
  const [endDate, setEndDate] = useState(project?.end_date || '');
  const [totalCost, setTotalCost] = useState(project?.total_cost?.toString() || '');
  const [contracts, setContracts] = useState<Contract[]>(project?.contracts || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name, counterparty_id: counterpartyId, legal_entity_id: legalEntityId,
      start_date: startDate, end_date: endDate,
      total_cost: parseFloat(totalCost) || 0,
      contracts,
    };
    if (project) {
      await pocketbaseService.updateProject(project.id, data);
    } else {
      await pocketbaseService.createProject(data);
    }
    onSaved();
    onClose();
  };

  const addContract = () => {
    setContracts(prev => [...prev, { id: `ct_${Date.now()}`, number: '', status: 'Не подписан', amount: 0 }]);
  };

  const updateContract = (index: number, patch: Partial<Contract>) => {
    setContracts(prev => prev.map((c, i) => i === index ? { ...c, ...patch } : c));
  };

  const removeContract = (index: number) => {
    setContracts(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Редактирование проекта' : 'Новый проект'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Название проекта</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Заказчик</Label>
            <CounterpartySelect
              value={counterpartyId}
              onChange={setCounterpartyId}
              counterparties={counterparties}
              onCreated={onCounterpartyCreated}
              filterType="Заказчик"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Моё юридическое лицо</Label>
            <LegalEntitySelect
              value={legalEntityId}
              onChange={setLegalEntityId}
              legalEntities={legalEntities}
              onCreated={onLegalEntityCreated}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Дата старта</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Дата окончания</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Стоимость (₽)</Label>
            <Input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Договоры</Label>
              <Button type="button" variant="outline" size="sm" onClick={addContract}>
                <Plus className="w-4 h-4 mr-1" /> Добавить договор
              </Button>
            </div>
            <div className="space-y-2">
              {contracts.map((c, idx) => (
                <div key={c.id} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                  <div className="col-span-5 space-y-1.5">
                    <Label className="text-xs">№ договора</Label>
                    <Input value={c.number} onChange={e => updateContract(idx, { number: e.target.value })} placeholder="№ договора" required />
                  </div>
                  <div className="col-span-3 space-y-1.5">
                    <Label className="text-xs">Сумма</Label>
                    <Input type="number" value={c.amount || ''} onChange={e => updateContract(idx, { amount: parseFloat(e.target.value) || 0 })} placeholder="Сумма" required />
                  </div>
                  <div className="col-span-3 space-y-1.5">
                    <Label className="text-xs">Статус</Label>
                    <Select value={c.status} onValueChange={(v) => updateContract(idx, { status: v as Contract['status'] })} required>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Подписан">Подписан</SelectItem>
                        <SelectItem value="Не подписан">Не подписан</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => removeContract(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {contracts.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4 border rounded-lg">Нет договоров</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">Сохранить</Button>
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
