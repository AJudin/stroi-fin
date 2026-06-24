import { useMemo, useState } from 'react';
import type { Counterparty } from '@/types';
import { pocketbaseService } from '@/lib/pocketbaseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface CounterpartySelectProps {
  value: string;
  onChange: (id: string) => void;
  counterparties: Counterparty[];
  onCreated: (counterparty: Counterparty) => void;
  placeholder?: string;
  filterType?: Counterparty['type'];
  preferredId?: string;
}

export default function CounterpartySelect({
  value,
  onChange,
  counterparties,
  onCreated,
  placeholder = 'Контрагент',
  filterType,
  preferredId,
}: CounterpartySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [inn, setInn] = useState('');
  const [type, setType] = useState<Counterparty['type']>('Заказчик');
  const [isSaving, setIsSaving] = useState(false);

  const filtered = useMemo(() => {
    let list = filterType
      ? counterparties.filter(c => c.type === filterType)
      : [...counterparties];
    if (preferredId) {
      const preferred = list.find(c => c.id === preferredId);
      if (preferred) {
        list = [preferred, ...list.filter(c => c.id !== preferredId)];
      }
    }
    return list;
  }, [counterparties, filterType, preferredId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const created = await pocketbaseService.createCounterparty({
        name: name.trim(),
        inn: inn.trim(),
        type,
        is_archived: false,
      });
      onCreated(created);
      onChange(created.id);
      setIsOpen(false);
      setName('');
      setInn('');
      setType('Заказчик');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {filtered.map(c => (
            <SelectItem key={c.id} value={c.id}>
              {c.name} <span className="text-slate-400 text-xs">({c.type})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        title="Новый контрагент"
      >
        <Plus className="w-4 h-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новый контрагент</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Название</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>ИНН</Label>
              <Input value={inn} onChange={e => setInn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Тип</Label>
              <Select value={type} onValueChange={(v) => setType(v as Counterparty['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Заказчик">Заказчик</SelectItem>
                  <SelectItem value="Поставщик">Поставщик</SelectItem>
                  <SelectItem value="Подрядчик">Подрядчик</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={isSaving}>
                Создать
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
