import { useState, useEffect, useMemo } from 'react';
import type { Operation, Counterparty, LegalEntity } from '@/types';
import { pocketbaseService } from '@/lib/pocketbaseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CounterpartySelect from './CounterpartySelect';
import LegalEntitySelect from './LegalEntitySelect';
import { Archive, Copy } from 'lucide-react';

interface OperationFormDialogProps {
  open: boolean;
  onClose: () => void;
  operation: Operation | null;
  projects: { id: string; name: string; counterparty_id: string; legal_entity_id?: string }[];
  counterparties: Counterparty[];
  legalEntities: LegalEntity[];
  categories: { id: string; name: string; type: string }[];
  stages: { id: string; name: string }[];
  onSaved: () => void;
  onCounterpartyCreated: (c: Counterparty) => void;
  onLegalEntityCreated: (le: LegalEntity) => void;
  onArchive?: () => void;
}

const ALL_VIEWS = ['Управленческий учёт', 'Актирование', 'Касса'] as const;

export default function OperationFormDialog({
  open, onClose, operation, projects, counterparties, legalEntities, categories, stages, onSaved, onCounterpartyCreated, onLegalEntityCreated, onArchive,
}: OperationFormDialogProps) {
  const [projectId, setProjectId] = useState(operation?.project_id || '');
  const [date, setDate] = useState(operation?.date || new Date().toISOString().split('T')[0]);
  const [views, setViews] = useState<string[]>(operation ? [operation.view] : ['Управленческий учёт']);
  const [type, setType] = useState<'Приход' | 'Расход'>(operation?.type || 'Приход');
  const [counterpartyId, setCounterpartyId] = useState(operation?.counterparty_id || '');
  const [legalEntityId, setLegalEntityId] = useState(operation?.legal_entity_id || '');
  const [categoryId, setCategoryId] = useState(operation?.category_id || '');
  const [stageId, setStageId] = useState(operation?.stage_id || '');
  const [amount, setAmount] = useState(operation?.amount?.toString() || '');
  const [comment, setComment] = useState(operation?.comment || '');
  const [actStatus, setActStatus] = useState<'Подписан' | 'Не подписан'>(operation?.act_status as 'Подписан' | 'Не подписан' || 'Не подписан');
  const [paymentStatus, setPaymentStatus] = useState<'Оплачен' | 'Не оплачен'>(operation?.payment_status as 'Оплачен' | 'Не оплачен' || 'Не оплачен');
  const [updateLinked, setUpdateLinked] = useState(false);

  // Duplicate dialog state
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [duplicateViews, setDuplicateViews] = useState<string[]>([]);
  const [dupActStatus, setDupActStatus] = useState<'Подписан' | 'Не подписан'>('Не подписан');
  const [dupPaymentStatus, setDupPaymentStatus] = useState<'Оплачен' | 'Не оплачен'>('Не оплачен');
  const [existingViews, setExistingViews] = useState<string[]>(operation ? [operation.view] : []);
  const [viewError, setViewError] = useState(false);

  const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  // Auto-select customer counterparty for income operations
  useEffect(() => {
    if (type === 'Приход' && project) {
      setCounterpartyId(project.counterparty_id);
    }
  }, [type, project]);

  // Auto-select project's legal entity for acts/cash when empty
  useEffect(() => {
    if (project && !legalEntityId && views.some(v => v === 'Актирование' || v === 'Касса')) {
      setLegalEntityId(project.legal_entity_id || '');
    }
  }, [project, views]);

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

  useEffect(() => {
    if (open) {
      setProjectId(operation?.project_id || '');
      setDate(operation?.date || new Date().toISOString().split('T')[0]);
      setViews(operation ? [operation.view] : ['Управленческий учёт']);
      setType(operation?.type || 'Приход');
      setCounterpartyId(operation?.counterparty_id || '');
      setLegalEntityId(operation?.legal_entity_id || '');
      setCategoryId(operation?.category_id || '');
      setStageId(operation?.stage_id || '');
      setAmount(operation?.amount?.toString() || '');
      setComment(operation?.comment || '');
      setActStatus(operation?.act_status as 'Подписан' | 'Не подписан' || 'Не подписан');
      setPaymentStatus(operation?.payment_status as 'Оплачен' | 'Не оплачен' || 'Не оплачен');
      setUpdateLinked(false);
      setDuplicateViews([]);
      setDupActStatus('Не подписан');
      setDupPaymentStatus('Не оплачен');
      setExistingViews(operation ? [operation.view] : []);
    }
  }, [open, operation]);

  useEffect(() => {
    async function loadLinked() {
      if (!operation) return;
      if (operation.parent_id) {
        const linked = await pocketbaseService.getOperations({ parent_id: operation.parent_id });
        setExistingViews(linked.map(op => op.view));
      } else {
        setExistingViews([operation.view]);
      }
    }
    if (open && operation) loadLinked();
  }, [open, operation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    const needsLegalEntity = views.some(v => v === 'Актирование' || v === 'Касса');
    const isValid = numAmount && projectId && counterpartyId && categoryId && stageId && views.length > 0 && (!needsLegalEntity || legalEntityId);
    setViewError(views.length === 0);
    if (!isValid) return;

    const baseData = {
      date, project_id: projectId, type,
      counterparty_id: counterpartyId, category_id: categoryId, stage_id: stageId,
      legal_entity_id: needsLegalEntity ? legalEntityId : undefined,
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
          legal_entity_id: operation.view === 'Актирование' || operation.view === 'Касса' ? legalEntityId : undefined,
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

  const handleDuplicate = async () => {
    if (!operation || duplicateViews.length === 0) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || !projectId || !counterpartyId) return;

    const baseData = {
      date, project_id: projectId, type,
      counterparty_id: counterpartyId, category_id: categoryId, stage_id: stageId,
      legal_entity_id: legalEntityId,
      comment, amount: numAmount,
      is_archived: false,
    };

    const groupId = operation.parent_id || `group_${Date.now()}`;

    // Link current operation to the group if it wasn't linked yet
    if (!operation.parent_id) {
      await pocketbaseService.updateOperation(operation.id, { parent_id: groupId });
    }

    for (const view of duplicateViews) {
      const data = {
        ...baseData,
        view: view as Operation['view'],
        act_status: view === 'Актирование' ? dupActStatus : null,
        payment_status: view === 'Касса' ? dupPaymentStatus : null,
        parent_id: groupId,
      };
      await pocketbaseService.createOperation(data);
    }

    setIsDuplicateOpen(false);
    onSaved();
    onClose();
  };

  const availableDuplicateViews = ALL_VIEWS.filter(v => !existingViews.includes(v));

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle>{operation ? 'Редактирование операции' : 'Новая операция'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Дата</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Проект</Label>
                <Select value={projectId} onValueChange={setProjectId} required>
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
                    onClick={() => { setViews(views.includes(v) ? views.filter(x => x !== v) : [...views, v]); setViewError(false); }}
                    disabled={!!operation}
                  >
                    {v}
                  </Button>
                ))}
              </div>
              {operation && <p className="text-xs text-slate-400">Вид нельзя изменить при редактировании</p>}
              {viewError && <p className="text-xs text-red-500">Выберите хотя бы один вид операции</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Тип</Label>
                <Select value={type} onValueChange={(v) => setType(v as 'Приход' | 'Расход')} required>
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
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Статья</Label>
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Этап</Label>
                <Select value={stageId} onValueChange={setStageId} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(views.includes('Актирование') || views.includes('Касса')) && (
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
            )}

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
                  Обновить связанные операции
                </Label>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {operation && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setIsDuplicateOpen(true)}
                    disabled={availableDuplicateViews.length === 0}
                  >
                    <Copy className="w-4 h-4" /> Дублировать в…
                  </Button>
                  {onArchive && (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-1 text-red-500 hover:text-red-600"
                      onClick={onArchive}
                    >
                      <Archive className="w-4 h-4" /> В архив
                    </Button>
                  )}
                </>
              )}
              <div className="flex-1"></div>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                {operation ? 'Сохранить' : 'Создать'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Duplicate dialog */}
      <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Дублировать операцию</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-500">Выберите виды учёта, в которые нужно создать копию операции. Дубли будут связаны с текущей операцией.</p>

            {availableDuplicateViews.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Операция уже есть во всех видах учёта</p>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap">
                  {availableDuplicateViews.map(v => (
                    <Button
                      key={v}
                      type="button"
                      variant={duplicateViews.includes(v) ? 'default' : 'outline'}
                      size="sm"
                      className={duplicateViews.includes(v) ? 'bg-emerald-600' : ''}
                      onClick={() => setDuplicateViews(duplicateViews.includes(v) ? duplicateViews.filter(x => x !== v) : [...duplicateViews, v])}
                    >
                      {v}
                    </Button>
                  ))}
                </div>

                {duplicateViews.includes('Актирование') && (
                  <div className="space-y-1.5">
                    <Label>Статус акта для дублей</Label>
                    <Select value={dupActStatus} onValueChange={(v) => setDupActStatus(v as 'Подписан' | 'Не подписан')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Подписан">Подписан</SelectItem>
                        <SelectItem value="Не подписан">Не подписан</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {duplicateViews.includes('Касса') && (
                  <div className="space-y-1.5">
                    <Label>Статус оплаты для дублей</Label>
                    <Select value={dupPaymentStatus} onValueChange={(v) => setDupPaymentStatus(v as 'Оплачен' | 'Не оплачен')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Оплачен">Оплачен</SelectItem>
                        <SelectItem value="Не оплачен">Не оплачен</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleDuplicate}
                disabled={duplicateViews.length === 0}
              >
                Дублировать
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsDuplicateOpen(false)}>Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
