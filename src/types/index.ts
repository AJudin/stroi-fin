export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'project_manager';
  avatar?: string;
}

export interface Counterparty {
  id: string;
  name: string;
  inn: string;
  type: 'Заказчик' | 'Поставщик' | 'Подрядчик';
  is_archived: boolean;
  created: string;
  updated: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'Приход' | 'Расход';
  project_id?: string;
  is_archived: boolean;
  created: string;
  updated: string;
}

export interface LegalEntity {
  id: string;
  name: string;
  inn: string;
  is_archived: boolean;
  created: string;
  updated: string;
}

export interface Stage {
  id: string;
  name: string;
  order: number;
  project_id?: string;
  is_archived: boolean;
  created: string;
  updated: string;
}

export interface Contract {
  id: string;
  number: string;
  status: 'Подписан' | 'Не подписан';
  amount: number;
}

export interface Project {
  id: string;
  name: string;
  counterparty_id: string;
  counterparty_name?: string;
  legal_entity_id?: string;
  legal_entity_name?: string;
  start_date: string;
  end_date: string;
  contracts: Contract[];
  total_cost: number;
  status: 'active' | 'completed' | 'archived';
  created: string;
  updated: string;
}

export interface Operation {
  id: string;
  date: string;
  week: number;
  project_id: string;
  project_name?: string;
  view: 'Управленческий учёт' | 'Актирование' | 'Касса';
  type: 'Приход' | 'Расход';
  counterparty_id: string;
  counterparty_name?: string;
  category_id: string;
  category_name?: string;
  stage_id: string;
  stage_name?: string;
  legal_entity_id?: string;
  legal_entity_name?: string;
  comment: string;
  amount: number;
  act_status: 'Подписан' | 'Не подписан' | null;
  payment_status: 'Оплачен' | 'Не оплачен' | null;
  is_archived: boolean;
  parent_id: string | null;
  created: string;
  updated: string;
  updated_by?: string;
}

export interface Planning {
  id: string;
  project_id: string;
  date: string;
  type: 'Приход' | 'Расход';
  category: string;
  stage_id: string;
  amount: number;
  comment: string;
  created: string;
  updated: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_email?: string;
  collection: string;
  record_id: string;
  action: 'create' | 'update' | 'delete' | 'archive';
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
}

export interface KPIData {
  management: number;
  acts_signed: number;
  acts_gross: number;
  cash_paid: number;
  cash_gross: number;
}

export interface ChartPoint {
  date: string;
  label: string;
  management: number;
  acts: number;
  cash: number;
}
