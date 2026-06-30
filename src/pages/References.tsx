import { useState, useEffect } from 'react';
import type { Counterparty, Category, Stage, Project } from '@/types';
import { pocketbaseService } from '@/lib/pocketbaseService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Archive, RotateCcw } from 'lucide-react';

type Scope = 'global' | 'project';
type GlobalSubTab = 'counterparties' | 'categories' | 'stages';
type ProjectSubTab = 'categories' | 'stages';

export default function References() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Scope>('global');
  const [globalSubTab, setGlobalSubTab] = useState<GlobalSubTab>('counterparties');
  const [projectSubTab, setProjectSubTab] = useState<ProjectSubTab>('categories');
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [cp, cats, sts, prjs] = await Promise.all([
      pocketbaseService.getAllCounterparties(),
      pocketbaseService.getAllCategories(),
      pocketbaseService.getAllStages(),
      pocketbaseService.getProjects(),
    ]);
    setCounterparties(cp);
    setCategories(cats);
    setStages(sts);
    setProjects(prjs);
  }

  const handleArchive = async (id: string, collection: string) => {
    if (collection === 'counterparties') await pocketbaseService.updateCounterparty(id, { is_archived: true });
    else if (collection === 'categories') await pocketbaseService.updateCategory(id, { is_archived: true });
    else if (collection === 'stages') await pocketbaseService.updateStage(id, { is_archived: true });
    await loadData();
  };

  const handleRestore = async (id: string, collection: string) => {
    if (collection === 'counterparties') await pocketbaseService.updateCounterparty(id, { is_archived: false });
    else if (collection === 'categories') await pocketbaseService.updateCategory(id, { is_archived: false });
    else if (collection === 'stages') await pocketbaseService.updateStage(id, { is_archived: false });
    await loadData();
  };

  const openCreate = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const openEdit = (item: any, type: 'counterparty' | 'category' | 'stage') => {
    setEditingItem({ ...item, _type: type });
    setIsFormOpen(true);
  };

  const currentFormScope = editingItem
    ? (editingItem.project_id === undefined ? 'global' : (editingItem.project_id ? 'project' : 'global'))
    : activeTab;

  const CounterpartiesTable = () => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>ИНН</TableHead>
              <TableHead>Тип</TableHead>
              {isAdmin && <TableHead className="w-20"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {counterparties
              .filter(c => c.is_archived === showArchived)
              .map(item => (
                <TableRow
                  key={item.id}
                  className={`${item.is_archived ? 'opacity-50' : ''} cursor-pointer hover:bg-slate-50`}
                  onClick={() => openEdit(item, 'counterparty')}
                >
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.inn}</TableCell>
                  <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                  {isAdmin && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      {showArchived ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => handleRestore(item.id, 'counterparties')}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                          onClick={() => handleArchive(item.id, 'counterparties')}>
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            {counterparties.filter(c => c.is_archived === showArchived).length === 0 && (
              <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-slate-400 py-8">Нет записей</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const CategoriesTable = ({ scope }: { scope: Scope }) => {
    const list = categories.filter(c => c.is_archived === showArchived && (scope === 'global' ? !c.project_id : !!c.project_id));
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Тип</TableHead>
                {scope === 'project' && <TableHead>Проект</TableHead>}
                {isAdmin && <TableHead className="w-20"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(item => (
                <TableRow
                  key={item.id}
                  className={`${item.is_archived ? 'opacity-50' : ''} cursor-pointer hover:bg-slate-50`}
                  onClick={() => openEdit(item, 'category')}
                >
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell><Badge className={item.type === 'Приход' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{item.type}</Badge></TableCell>
                  {scope === 'project' && (
                    <TableCell>{projects.find(p => p.id === item.project_id)?.name || item.project_id}</TableCell>
                  )}
                  {isAdmin && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      {showArchived ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRestore(item.id, 'categories')}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleArchive(item.id, 'categories')}>
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow><TableCell colSpan={isAdmin ? (scope === 'project' ? 4 : 3) : (scope === 'project' ? 3 : 2)} className="text-center text-slate-400 py-8">Нет записей</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const StagesTable = ({ scope }: { scope: Scope }) => {
    const list = stages.filter(s => s.is_archived === showArchived && (scope === 'global' ? !s.project_id : !!s.project_id));
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Порядок</TableHead>
                {scope === 'project' && <TableHead>Проект</TableHead>}
                {isAdmin && <TableHead className="w-20"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.sort((a, b) => a.order - b.order).map(item => (
                <TableRow
                  key={item.id}
                  className={`${item.is_archived ? 'opacity-50' : ''} cursor-pointer hover:bg-slate-50`}
                  onClick={() => openEdit(item, 'stage')}
                >
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.order}</TableCell>
                  {scope === 'project' && (
                    <TableCell>{projects.find(p => p.id === item.project_id)?.name || item.project_id}</TableCell>
                  )}
                  {isAdmin && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      {showArchived ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRestore(item.id, 'stages')}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleArchive(item.id, 'stages')}>
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow><TableCell colSpan={isAdmin ? (scope === 'project' ? 4 : 3) : (scope === 'project' ? 3 : 2)} className="text-center text-slate-400 py-8">Нет записей</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Справочники</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? 'Активные' : 'Архив'}
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Добавить
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Scope)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="global">Глобальные</TabsTrigger>
          <TabsTrigger value="project">Проектные</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-4 space-y-4">
          <Tabs value={globalSubTab} onValueChange={(v) => setGlobalSubTab(v as GlobalSubTab)}>
            <TabsList>
              <TabsTrigger value="counterparties">Контрагенты</TabsTrigger>
              <TabsTrigger value="categories">Статьи</TabsTrigger>
              <TabsTrigger value="stages">Этапы</TabsTrigger>
            </TabsList>
            <TabsContent value="counterparties" className="mt-4"><CounterpartiesTable /></TabsContent>
            <TabsContent value="categories" className="mt-4"><CategoriesTable scope="global" /></TabsContent>
            <TabsContent value="stages" className="mt-4"><StagesTable scope="global" /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="project" className="mt-4 space-y-4">
          <Tabs value={projectSubTab} onValueChange={(v) => setProjectSubTab(v as ProjectSubTab)}>
            <TabsList>
              <TabsTrigger value="categories">Статьи</TabsTrigger>
              <TabsTrigger value="stages">Этапы</TabsTrigger>
            </TabsList>
            <TabsContent value="categories" className="mt-4"><CategoriesTable scope="project" /></TabsContent>
            <TabsContent value="stages" className="mt-4"><StagesTable scope="project" /></TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <ReferenceFormDialog
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingItem(null); }}
        item={editingItem}
        scope={currentFormScope}
        projects={projects}
        onSaved={loadData}
      />
    </div>
  );
}

function ReferenceFormDialog({ open, onClose, item, scope, projects, onSaved }:
  {
    open: boolean; onClose: () => void; item: any;
    scope: Scope; projects: Project[]; onSaved: () => void;
  }) {
  const determineFormType = () => {
    if (item?._type) return item._type;
    return 'counterparty';
  };
  const [formType, setFormType] = useState(determineFormType());
  const [name, setName] = useState(item?.name || '');
  const [inn, setInn] = useState(item?.inn || '');
  const [type, setType] = useState(item?.type || 'Заказчик');
  const [categoryType, setCategoryType] = useState(item?.type || 'Расход');
  const [projectId, setProjectId] = useState<string>(item?.project_id || '');
  const [order, setOrder] = useState(item?.order?.toString() || '1');

  useEffect(() => {
    setFormType(determineFormType());
    setName(item?.name || '');
    setInn(item?.inn || '');
    setType(item?.type || 'Заказчик');
    setCategoryType(item?.type || 'Расход');
    setProjectId(item?.project_id || '');
    setOrder(item?.order?.toString() || '1');
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formType === 'counterparty') {
      if (item) await pocketbaseService.updateCounterparty(item.id, { name, inn, type });
      else await pocketbaseService.createCounterparty({ name, inn, type, is_archived: false });
    } else if (formType === 'category') {
      const payload: Partial<Category> & { name: string; type: Category['type']; is_archived: boolean; project_id?: string } = {
        name, type: categoryType, is_archived: false,
      };
      if (projectId) payload.project_id = projectId;
      if (item) await pocketbaseService.updateCategory(item.id, payload);
      else await pocketbaseService.createCategory(payload as Omit<Category, 'id' | 'created' | 'updated'>);
    } else if (formType === 'stage') {
      const payload: Partial<Stage> & { name: string; order: number; is_archived: boolean; project_id?: string } = {
        name, order: parseInt(order), is_archived: false,
      };
      if (projectId) payload.project_id = projectId;
      if (item) await pocketbaseService.updateStage(item.id, payload);
      else await pocketbaseService.createStage(payload as Omit<Stage, 'id' | 'created' | 'updated'>);
    }
    onSaved();
    onClose();
  };

  const isGlobalScope = scope === 'global';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Редактирование' : 'Новая запись'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {!item && (
            <div className="space-y-1.5">
              <Label>Тип записи</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="counterparty">Контрагент</SelectItem>
                  <SelectItem value="category">Статья</SelectItem>
                  <SelectItem value="stage">Этап</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Название</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required />
          </div>

          {formType === 'counterparty' && (
            <>
              <div className="space-y-1.5">
                <Label>ИНН</Label>
                <Input value={inn} onChange={e => setInn(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Тип контрагента</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Заказчик">Заказчик</SelectItem>
                    <SelectItem value="Поставщик">Поставщик</SelectItem>
                    <SelectItem value="Подрядчик">Подрядчик</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {formType === 'category' && (
            <>
              <div className="space-y-1.5">
                <Label>Тип статьи</Label>
                <Select value={categoryType} onValueChange={setCategoryType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Приход">Приход</SelectItem>
                    <SelectItem value="Расход">Расход</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Проект</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {isGlobalScope && <SelectItem value="">Глобальная</SelectItem>}
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {formType === 'stage' && (
            <>
              <div className="space-y-1.5">
                <Label>Порядок</Label>
                <Input type="number" value={order} onChange={e => setOrder(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Проект</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {isGlobalScope && <SelectItem value="">Глобальная</SelectItem>}
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">Сохранить</Button>
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
