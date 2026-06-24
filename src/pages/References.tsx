import { useState, useEffect } from 'react';
import type { Counterparty, Category, Stage, Project } from '@/types';
import { mockService } from '@/lib/mockService';
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
import { Plus, Pencil, Archive, RotateCcw } from 'lucide-react';

export default function References() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('counterparties');
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
      mockService.getAllCounterparties(),
      mockService.getAllCategories(),
      mockService.getAllStages(),
      mockService.getProjects(),
    ]);
    setCounterparties(cp);
    setCategories(cats);
    setStages(sts);
    setProjects(prjs);
  }

  const handleArchive = async (id: string, collection: string) => {
    if (collection === 'counterparties') await mockService.updateCounterparty(id, { is_archived: true });
    else if (collection === 'categories') await mockService.updateCategory(id, { is_archived: true });
    else if (collection === 'stages') await mockService.updateStage(id, { is_archived: true });
    await loadData();
  };

  const handleRestore = async (id: string, collection: string) => {
    if (collection === 'counterparties') await mockService.updateCounterparty(id, { is_archived: false });
    else if (collection === 'categories') await mockService.updateCategory(id, { is_archived: false });
    else if (collection === 'stages') await mockService.updateStage(id, { is_archived: false });
    await loadData();
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
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Добавить
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="counterparties">Глобальные</TabsTrigger>
          <TabsTrigger value="categories">Проектные</TabsTrigger>
        </TabsList>

        <TabsContent value="counterparties" className="mt-4">
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
                      <TableRow key={item.id} className={item.is_archived ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.inn}</TableCell>
                        <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                        {isAdmin && (
                          <TableCell>
                            {showArchived ? (
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => handleRestore(item.id, 'counterparties')}>
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => { setEditingItem({ ...item, _type: 'counterparty' }); setIsFormOpen(true); }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                                  onClick={() => handleArchive(item.id, 'counterparties')}>
                                  <Archive className="w-3.5 h-3.5" />
                                </Button>
                              </div>
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
        </TabsContent>

        <TabsContent value="categories" className="mt-4 space-y-4">
          <Tabs defaultValue="categories">
            <TabsList>
              <TabsTrigger value="categories">Статьи</TabsTrigger>
              <TabsTrigger value="stages">Этапы</TabsTrigger>
            </TabsList>
            <TabsContent value="categories" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Проект</TableHead>
                        {isAdmin && <TableHead className="w-20"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.filter(c => c.is_archived === showArchived).map(item => (
                        <TableRow key={item.id} className={item.is_archived ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell><Badge className={item.type === 'Приход' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{item.type}</Badge></TableCell>
                          <TableCell>{projects.find(p => p.id === item.project_id)?.name || item.project_id}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              {showArchived ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRestore(item.id, 'categories')}>
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              ) : (
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem({ ...item, _type: 'category' }); setIsFormOpen(true); }}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleArchive(item.id, 'categories')}>
                                    <Archive className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {categories.filter(c => c.is_archived === showArchived).length === 0 && (
                        <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-slate-400 py-8">Нет записей</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="stages" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Порядок</TableHead>
                        <TableHead>Проект</TableHead>
                        {isAdmin && <TableHead className="w-20"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stages.filter(s => s.is_archived === showArchived).sort((a, b) => a.order - b.order).map(item => (
                        <TableRow key={item.id} className={item.is_archived ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.order}</TableCell>
                          <TableCell>{projects.find(p => p.id === item.project_id)?.name || item.project_id}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              {showArchived ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRestore(item.id, 'stages')}>
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              ) : (
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem({ ...item, _type: 'stage' }); setIsFormOpen(true); }}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleArchive(item.id, 'stages')}>
                                    <Archive className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {stages.filter(s => s.is_archived === showArchived).length === 0 && (
                        <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-slate-400 py-8">Нет записей</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <ReferenceFormDialog
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingItem(null); }}
        item={editingItem}
        activeTab={activeTab}
        projects={projects}
        onSaved={loadData}
      />
    </div>
  );
}

function ReferenceFormDialog({ open, onClose, item, activeTab, projects, onSaved }:
  {
    open: boolean; onClose: () => void; item: any;
    activeTab: string; projects: Project[]; onSaved: () => void;
  }) {
  const [formType, setFormType] = useState(item?._type || (activeTab === 'counterparties' ? 'counterparty' : 'category'));
  const [name, setName] = useState(item?.name || '');
  const [inn, setInn] = useState(item?.inn || '');
  const [type, setType] = useState(item?.type || 'Заказчик');
  const [categoryType, setCategoryType] = useState(item?.type || 'Расход');
  const [projectId, setProjectId] = useState(item?.project_id || '');
  const [order, setOrder] = useState(item?.order?.toString() || '1');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formType === 'counterparty') {
      if (item) await mockService.updateCounterparty(item.id, { name, inn, type });
      else await mockService.createCounterparty({ name, inn, type, is_archived: false });
    } else if (formType === 'category') {
      if (item) await mockService.updateCategory(item.id, { name, type: categoryType, project_id: projectId });
      else await mockService.createCategory({ name, type: categoryType, project_id: projectId, is_archived: false });
    } else if (formType === 'stage') {
      if (item) await mockService.updateStage(item.id, { name, order: parseInt(order), project_id: projectId });
      else await mockService.createStage({ name, order: parseInt(order), project_id: projectId, is_archived: false });
    }
    onSaved();
    onClose();
  };

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
