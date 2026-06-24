import type {
  User, Counterparty, Category, Stage, Project, Operation, Planning
} from '@/types';

export const mockUsers: User[] = [
  { id: '1', email: 'admin@company.local', name: 'Администратор', role: 'admin' },
  { id: '2', email: 'operator@company.local', name: 'Оператор', role: 'operator' },
  { id: '3', email: 'manager@company.local', name: 'Менеджер проекта', role: 'project_manager' },
];

export const mockCounterparties: Counterparty[] = [
  { id: 'c1', name: 'ООО "СтройГарант"', inn: '7701234567', type: 'Заказчик', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 'c2', name: 'ООО "МонтажПро"', inn: '7707654321', type: 'Заказчик', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 'c3', name: 'ООО "БетонСнаб"', inn: '7701112233', type: 'Поставщик', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 'c4', name: 'ИП Иванов С.А.', inn: '7704445556', type: 'Подрядчик', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 'c5', name: 'ООО "ЭлектроМир"', inn: '7707778889', type: 'Поставщик', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
];

export const mockProjects: Project[] = [
  {
    id: 'p1', name: 'ЖК "Солнечный" — Монтаж фасада',
    counterparty_id: 'c1', counterparty_name: 'ООО "СтройГарант"',
    start_date: '2026-02-01', end_date: '2026-08-30',
    contracts: [
      { id: 'ct1', number: 'Д-2026-001', status: 'Подписан', amount: 5000000 },
      { id: 'ct2', number: 'Д-2026-001-Д1', status: 'Не подписан', amount: 1200000 },
    ],
    total_cost: 6200000, status: 'active',
    created: '2026-02-01', updated: '2026-06-24',
  },
  {
    id: 'p2', name: 'ТЦ "Галерея" — Внутренняя отделка',
    counterparty_id: 'c2', counterparty_name: 'ООО "МонтажПро"',
    start_date: '2026-03-15', end_date: '2026-10-15',
    contracts: [
      { id: 'ct3', number: 'Д-2026-045', status: 'Подписан', amount: 8500000 },
    ],
    total_cost: 8500000, status: 'active',
    created: '2026-03-15', updated: '2026-06-24',
  },
  {
    id: 'p3', name: 'Складской комплекс — Электромонтаж',
    counterparty_id: 'c1', counterparty_name: 'ООО "СтройГарант"',
    start_date: '2026-05-01', end_date: '2026-09-30',
    contracts: [
      { id: 'ct4', number: 'Д-2026-089', status: 'Не подписан', amount: 3200000 },
    ],
    total_cost: 3200000, status: 'active',
    created: '2026-05-01', updated: '2026-06-24',
  },
];

export const mockCategories: Category[] = [
  { id: 'cat1', name: 'Материалы', type: 'Расход', project_id: 'p1', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 'cat2', name: 'Работы подрядчиков', type: 'Расход', project_id: 'p1', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 'cat3', name: 'Оплата по договору', type: 'Приход', project_id: 'p1', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 'cat4', name: 'Материалы', type: 'Расход', project_id: 'p2', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 'cat5', name: 'Отделочные работы', type: 'Расход', project_id: 'p2', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 'cat6', name: 'Аванс', type: 'Приход', project_id: 'p2', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 'cat7', name: 'Электрооборудование', type: 'Расход', project_id: 'p3', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 'cat8', name: 'Монтажные работы', type: 'Расход', project_id: 'p3', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 'cat9', name: 'Оплата по договору', type: 'Приход', project_id: 'p3', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
];

export const mockStages: Stage[] = [
  { id: 's1', name: 'Подготовка', order: 1, project_id: 'p1', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 's2', name: 'Монтаж каркаса', order: 2, project_id: 'p1', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 's3', name: 'Облицовка', order: 3, project_id: 'p1', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 's4', name: 'Демонтаж', order: 1, project_id: 'p2', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 's5', name: 'Черновая отделка', order: 2, project_id: 'p2', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 's6', name: 'Чистовая отделка', order: 3, project_id: 'p2', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 's7', name: 'Прокладка кабелей', order: 1, project_id: 'p3', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
  { id: 's8', name: 'Монтаж щитов', order: 2, project_id: 'p3', is_archived: false, created: '2026-01-01', updated: '2026-01-01' },
];

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay()) / 7);
}

export const mockOperations: Operation[] = [
  // Project 1 — Management
  { id: 'o1', date: '2026-02-05', week: getWeekNumber('2026-02-05'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Управленческий учёт', type: 'Приход', counterparty_id: 'c1', counterparty_name: 'ООО "СтройГарант"', category_id: 'cat3', category_name: 'Оплата по договору', stage_id: 's1', stage_name: 'Подготовка', comment: 'Аванс 30%', amount: 1500000, act_status: null, payment_status: null, is_archived: false, parent_id: null, created: '2026-02-05', updated: '2026-02-05' },
  { id: 'o2', date: '2026-02-10', week: getWeekNumber('2026-02-10'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Управленческий учёт', type: 'Расход', counterparty_id: 'c3', counterparty_name: 'ООО "БетонСнаб"', category_id: 'cat1', category_name: 'Материалы', stage_id: 's1', stage_name: 'Подготовка', comment: 'Поставка бетона', amount: 450000, act_status: null, payment_status: null, is_archived: false, parent_id: null, created: '2026-02-10', updated: '2026-02-10' },
  { id: 'o3', date: '2026-03-01', week: getWeekNumber('2026-03-01'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Управленческий учёт', type: 'Расход', counterparty_id: 'c4', counterparty_name: 'ИП Иванов С.А.', category_id: 'cat2', category_name: 'Работы подрядчиков', stage_id: 's2', stage_name: 'Монтаж каркаса', comment: 'Подготовка площадки', amount: 280000, act_status: null, payment_status: null, is_archived: false, parent_id: null, created: '2026-03-01', updated: '2026-03-01' },
  { id: 'o4', date: '2026-04-15', week: getWeekNumber('2026-04-15'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Управленческий учёт', type: 'Приход', counterparty_id: 'c1', counterparty_name: 'ООО "СтройГарант"', category_id: 'cat3', category_name: 'Оплата по договору', stage_id: 's2', stage_name: 'Монтаж каркаса', comment: 'Этап 2 — 40%', amount: 2000000, act_status: null, payment_status: null, is_archived: false, parent_id: null, created: '2026-04-15', updated: '2026-04-15' },
  { id: 'o5', date: '2026-05-10', week: getWeekNumber('2026-05-10'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Управленческий учёт', type: 'Расход', counterparty_id: 'c3', counterparty_name: 'ООО "БетонСнаб"', category_id: 'cat1', category_name: 'Материалы', stage_id: 's3', stage_name: 'Облицовка', comment: 'Панели фасадные', amount: 680000, act_status: null, payment_status: null, is_archived: false, parent_id: null, created: '2026-05-10', updated: '2026-05-10' },
  { id: 'o6', date: '2026-06-20', week: getWeekNumber('2026-06-20'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Управленческий учёт', type: 'Расход', counterparty_id: 'c4', counterparty_name: 'ИП Иванов С.А.', category_id: 'cat2', category_name: 'Работы подрядчиков', stage_id: 's3', stage_name: 'Облицовка', comment: 'Монтаж панелей', amount: 320000, act_status: null, payment_status: null, is_archived: false, parent_id: null, created: '2026-06-20', updated: '2026-06-20' },
  // Project 1 — Acts
  { id: 'o7', date: '2026-02-10', week: getWeekNumber('2026-02-10'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Актирование', type: 'Расход', counterparty_id: 'c3', counterparty_name: 'ООО "БетонСнаб"', category_id: 'cat1', category_name: 'Материалы', stage_id: 's1', stage_name: 'Подготовка', comment: 'Поставка бетона', amount: 450000, act_status: 'Подписан', payment_status: null, is_archived: false, parent_id: 'o2', created: '2026-02-10', updated: '2026-02-10' },
  { id: 'o8', date: '2026-04-15', week: getWeekNumber('2026-04-15'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Актирование', type: 'Приход', counterparty_id: 'c1', counterparty_name: 'ООО "СтройГарант"', category_id: 'cat3', category_name: 'Оплата по договору', stage_id: 's2', stage_name: 'Монтаж каркаса', comment: 'Этап 2 — 40%', amount: 2000000, act_status: 'Подписан', payment_status: null, is_archived: false, parent_id: 'o4', created: '2026-04-15', updated: '2026-04-15' },
  { id: 'o9', date: '2026-06-20', week: getWeekNumber('2026-06-20'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Актирование', type: 'Расход', counterparty_id: 'c4', counterparty_name: 'ИП Иванов С.А.', category_id: 'cat2', category_name: 'Работы подрядчиков', stage_id: 's3', stage_name: 'Облицовка', comment: 'Монтаж панелей', amount: 320000, act_status: 'Не подписан', payment_status: null, is_archived: false, parent_id: 'o6', created: '2026-06-20', updated: '2026-06-20' },
  // Project 1 — Cash
  { id: 'o10', date: '2026-02-05', week: getWeekNumber('2026-02-05'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Касса', type: 'Приход', counterparty_id: 'c1', counterparty_name: 'ООО "СтройГарант"', category_id: 'cat3', category_name: 'Оплата по договору', stage_id: 's1', stage_name: 'Подготовка', comment: 'Аванс 30%', amount: 1500000, act_status: null, payment_status: 'Оплачен', is_archived: false, parent_id: 'o1', created: '2026-02-05', updated: '2026-02-05' },
  { id: 'o11', date: '2026-02-10', week: getWeekNumber('2026-02-10'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Касса', type: 'Расход', counterparty_id: 'c3', counterparty_name: 'ООО "БетонСнаб"', category_id: 'cat1', category_name: 'Материалы', stage_id: 's1', stage_name: 'Подготовка', comment: 'Поставка бетона', amount: 450000, act_status: null, payment_status: 'Оплачен', is_archived: false, parent_id: 'o2', created: '2026-02-10', updated: '2026-02-10' },
  { id: 'o12', date: '2026-04-15', week: getWeekNumber('2026-04-15'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Касса', type: 'Приход', counterparty_id: 'c1', counterparty_name: 'ООО "СтройГарант"', category_id: 'cat3', category_name: 'Оплата по договору', stage_id: 's2', stage_name: 'Монтаж каркаса', comment: 'Этап 2 — 40%', amount: 2000000, act_status: null, payment_status: 'Оплачен', is_archived: false, parent_id: 'o4', created: '2026-04-15', updated: '2026-04-15' },
  { id: 'o13', date: '2026-06-20', week: getWeekNumber('2026-06-20'), project_id: 'p1', project_name: 'ЖК "Солнечный"', view: 'Касса', type: 'Расход', counterparty_id: 'c4', counterparty_name: 'ИП Иванов С.А.', category_id: 'cat2', category_name: 'Работы подрядчиков', stage_id: 's3', stage_name: 'Облицовка', comment: 'Монтаж панелей', amount: 320000, act_status: null, payment_status: 'Не оплачен', is_archived: false, parent_id: 'o6', created: '2026-06-20', updated: '2026-06-20' },

  // Project 2
  { id: 'o14', date: '2026-04-01', week: getWeekNumber('2026-04-01'), project_id: 'p2', project_name: 'ТЦ "Галерея"', view: 'Управленческий учёт', type: 'Приход', counterparty_id: 'c2', counterparty_name: 'ООО "МонтажПро"', category_id: 'cat6', category_name: 'Аванс', stage_id: 's4', stage_name: 'Демонтаж', comment: 'Аванс 25%', amount: 2125000, act_status: null, payment_status: null, is_archived: false, parent_id: null, created: '2026-04-01', updated: '2026-04-01' },
  { id: 'o15', date: '2026-04-20', week: getWeekNumber('2026-04-20'), project_id: 'p2', project_name: 'ТЦ "Галерея"', view: 'Управленческий учёт', type: 'Расход', counterparty_id: 'c5', counterparty_name: 'ООО "ЭлектроМир"', category_id: 'cat4', category_name: 'Материалы', stage_id: 's5', stage_name: 'Черновая отделка', comment: 'Кабель ВВГ', amount: 890000, act_status: null, payment_status: null, is_archived: false, parent_id: null, created: '2026-04-20', updated: '2026-04-20' },
  { id: 'o16', date: '2026-05-15', week: getWeekNumber('2026-05-15'), project_id: 'p2', project_name: 'ТЦ "Галерея"', view: 'Управленческий учёт', type: 'Расход', counterparty_id: 'c4', counterparty_name: 'ИП Иванов С.А.', category_id: 'cat5', category_name: 'Отделочные работы', stage_id: 's5', stage_name: 'Черновая отделка', comment: 'Штукатурка стен', amount: 560000, act_status: null, payment_status: null, is_archived: false, parent_id: null, created: '2026-05-15', updated: '2026-05-15' },

  // Project 2 — Acts
  { id: 'o17', date: '2026-04-01', week: getWeekNumber('2026-04-01'), project_id: 'p2', project_name: 'ТЦ "Галерея"', view: 'Актирование', type: 'Приход', counterparty_id: 'c2', counterparty_name: 'ООО "МонтажПро"', category_id: 'cat6', category_name: 'Аванс', stage_id: 's4', stage_name: 'Демонтаж', comment: 'Аванс 25%', amount: 2125000, act_status: 'Подписан', payment_status: null, is_archived: false, parent_id: 'o14', created: '2026-04-01', updated: '2026-04-01' },

  // Project 2 — Cash
  { id: 'o18', date: '2026-04-01', week: getWeekNumber('2026-04-01'), project_id: 'p2', project_name: 'ТЦ "Галерея"', view: 'Касса', type: 'Приход', counterparty_id: 'c2', counterparty_name: 'ООО "МонтажПро"', category_id: 'cat6', category_name: 'Аванс', stage_id: 's4', stage_name: 'Демонтаж', comment: 'Аванс 25%', amount: 2125000, act_status: null, payment_status: 'Оплачен', is_archived: false, parent_id: 'o14', created: '2026-04-01', updated: '2026-04-01' },
  { id: 'o19', date: '2026-04-20', week: getWeekNumber('2026-04-20'), project_id: 'p2', project_name: 'ТЦ "Галерея"', view: 'Касса', type: 'Расход', counterparty_id: 'c5', counterparty_name: 'ООО "ЭлектроМир"', category_id: 'cat4', category_name: 'Материалы', stage_id: 's5', stage_name: 'Черновая отделка', comment: 'Кабель ВВГ', amount: 890000, act_status: null, payment_status: 'Оплачен', is_archived: false, parent_id: 'o15', created: '2026-04-20', updated: '2026-04-20' },

  // Project 3 — Management
  { id: 'o20', date: '2026-06-01', week: getWeekNumber('2026-06-01'), project_id: 'p3', project_name: 'Складской комплекс', view: 'Управленческий учёт', type: 'Расход', counterparty_id: 'c5', counterparty_name: 'ООО "ЭлектроМир"', category_id: 'cat7', category_name: 'Электрооборудование', stage_id: 's7', stage_name: 'Прокладка кабелей', comment: 'Щиты распределительные', amount: 750000, act_status: null, payment_status: null, is_archived: false, parent_id: null, created: '2026-06-01', updated: '2026-06-01' },
];

export const mockPlanning: Planning[] = [
  { id: 'pl1', project_id: 'p1', date: '2026-07-01', type: 'Приход', category: 'Оплата по договору', stage_id: 's3', amount: 1500000, comment: 'Завершающий платёж 30%', created: '2026-02-01', updated: '2026-02-01' },
  { id: 'pl2', project_id: 'p1', date: '2026-07-15', type: 'Расход', category: 'Материалы', stage_id: 's3', amount: 400000, comment: 'Герметик, крепёж', created: '2026-02-01', updated: '2026-02-01' },
  { id: 'pl3', project_id: 'p1', date: '2026-08-01', type: 'Расход', category: 'Работы подрядчиков', stage_id: 's3', amount: 200000, comment: 'Финальные работы', created: '2026-02-01', updated: '2026-02-01' },
  { id: 'pl4', project_id: 'p2', date: '2026-08-01', type: 'Расход', category: 'Отделочные работы', stage_id: 's6', amount: 1200000, comment: 'Плитка, ламинат', created: '2026-03-15', updated: '2026-03-15' },
  { id: 'pl5', project_id: 'p2', date: '2026-09-01', type: 'Приход', category: 'Аванс', stage_id: 's6', amount: 2500000, comment: 'Этап 2 — 30%', created: '2026-03-15', updated: '2026-03-15' },
];
