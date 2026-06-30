import { useState } from 'react';
import type { LegalEntity } from '@/types';
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

interface LegalEntitySelectProps {
  value: string;
  onChange: (id: string) => void;
  legalEntities: LegalEntity[];
  onCreated: (legalEntity: LegalEntity) => void;
  placeholder?: string;
  required?: boolean;
}

export default function LegalEntitySelect({
  value,
  onChange,
  legalEntities,
  onCreated,
  placeholder = 'Моё юридическое лицо',
  required,
}: LegalEntitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [inn, setInn] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !inn.trim()) return;
    setIsSaving(true);
    try {
      const created = await pocketbaseService.createLegalEntity({
        name: name.trim(),
        inn: inn.trim(),
        is_archived: false,
      });
      onCreated(created);
      onChange(created.id);
      setIsOpen(false);
      setName('');
      setInn('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="flex-1" {...(required ? { 'aria-required': 'true' } : {})}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {legalEntities.map(le => (
            <SelectItem key={le.id} value={le.id}>
              {le.name} <span className="text-slate-400 text-xs">({le.inn})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        title="Новое юридическое лицо"
      >
        <Plus className="w-4 h-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новое юридическое лицо</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Название</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>ИНН</Label>
              <Input value={inn} onChange={e => setInn(e.target.value)} required />
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
