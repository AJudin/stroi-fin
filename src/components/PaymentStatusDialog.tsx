import { useState, useEffect } from 'react';
import type { Operation } from '@/types';
import { pocketbaseService } from '@/lib/pocketbaseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PaymentStatusDialogProps {
  operation: Operation | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function PaymentStatusDialog({ operation, open, onClose, onSaved }: PaymentStatusDialogProps) {
  const [status, setStatus] = useState<Operation['payment_status']>(operation?.payment_status || 'Не оплачен');
  const [paidAmount, setPaidAmount] = useState(operation?.paid_amount?.toString() || '');

  useEffect(() => {
    setStatus(operation?.payment_status || 'Не оплачен');
    setPaidAmount(operation?.paid_amount?.toString() || '');
  }, [operation, open]);

  const amount = operation?.amount || 0;

  const handleStatusSelect = (next: NonNullable<Operation['payment_status']>) => {
    setStatus(next);
    if (next === 'Оплачен') {
      setPaidAmount(amount.toString());
    } else if (next === 'Не оплачен') {
      setPaidAmount('0');
    }
  };

  const handleSave = async () => {
    if (!operation) return;
    const payload: Partial<Operation> = { payment_status: status };
    if (status === 'Оплачен') {
      payload.paid_amount = amount;
    } else if (status === 'Не оплачен') {
      payload.paid_amount = 0;
    } else if (status === 'Частично оплачен') {
      const value = parseFloat(paidAmount);
      if (isNaN(value) || value <= 0 || value > amount) return;
      payload.paid_amount = value;
    }
    await pocketbaseService.updateOperation(operation.id, payload);
    onSaved();
    onClose();
  };

  const isValid = status !== 'Частично оплачен' || (() => {
    const value = parseFloat(paidAmount);
    return !isNaN(value) && value > 0 && value <= amount;
  })();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Статус оплаты</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="text-sm text-slate-500">
            Сумма операции: <span className="font-medium text-slate-700">{amount.toLocaleString('ru-RU')} ₽</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={status === 'Не оплачен' ? 'default' : 'outline'}
              size="sm"
              className={status === 'Не оплачен' ? 'bg-red-500 hover:bg-red-600' : ''}
              onClick={() => handleStatusSelect('Не оплачен')}
            >
              Не оплачен
            </Button>
            <Button
              type="button"
              variant={status === 'Частично оплачен' ? 'default' : 'outline'}
              size="sm"
              className={status === 'Частично оплачен' ? 'bg-amber-500 hover:bg-amber-600' : ''}
              onClick={() => handleStatusSelect('Частично оплачен')}
            >
              Частично
            </Button>
            <Button
              type="button"
              variant={status === 'Оплачен' ? 'default' : 'outline'}
              size="sm"
              className={status === 'Оплачен' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
              onClick={() => handleStatusSelect('Оплачен')}
            >
              Оплачен
            </Button>
          </div>

          {status === 'Частично оплачен' && (
            <div className="space-y-1.5">
              <Label>Оплаченная сумма</Label>
              <Input
                type="number"
                value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)}
                placeholder={`макс. ${amount.toLocaleString('ru-RU')} ₽`}
              />
              {paidAmount && (parseFloat(paidAmount) <= 0 || parseFloat(paidAmount) > amount) && (
                <p className="text-xs text-red-500">Сумма должна быть больше 0 и не превышать {amount.toLocaleString('ru-RU')} ₽</p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
            <Button type="button" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={!isValid}>
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
