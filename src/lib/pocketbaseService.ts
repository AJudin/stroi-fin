import type {
  User, Counterparty, Category, Stage, Project, Operation, Planning, Contract
} from '@/types';
import { pb } from './pocketbase';

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay()) / 7);
}

function toUser(model: Record<string, unknown> | null): User | null {
  if (!model) return null;
  return {
    id: String(model.id),
    email: String(model.email),
    name: String(model.name || model.email),
    role: (model.role as User['role']) || 'operator',
    avatar: model.avatar ? String(model.avatar) : undefined,
  };
}

function expandName(record: Record<string, unknown>, field: string): string | undefined {
  const ex = (record.expand as Record<string, Record<string, unknown> | undefined>)?.[field];
  return ex ? String(ex.name || '') : undefined;
}

function mapCounterparty(r: Record<string, unknown>): Counterparty {
  return {
    id: String(r.id),
    name: String(r.name),
    inn: String(r.inn),
    type: r.type as Counterparty['type'],
    is_archived: Boolean(r.is_archived),
    created: String(r.created),
    updated: String(r.updated),
  };
}

function mapCategory(r: Record<string, unknown>): Category {
  return {
    id: String(r.id),
    name: String(r.name),
    type: r.type as Category['type'],
    project_id: r.project_id ? String(r.project_id) : undefined,
    is_archived: Boolean(r.is_archived),
    created: String(r.created),
    updated: String(r.updated),
  };
}

function mapStage(r: Record<string, unknown>): Stage {
  return {
    id: String(r.id),
    name: String(r.name),
    order: Number(r.order),
    project_id: r.project_id ? String(r.project_id) : undefined,
    is_archived: Boolean(r.is_archived),
    created: String(r.created),
    updated: String(r.updated),
  };
}

function mapProject(r: Record<string, unknown>): Project {
  return {
    id: String(r.id),
    name: String(r.name),
    counterparty_id: String(r.counterparty_id),
    counterparty_name: expandName(r, 'counterparty_id'),
    start_date: String(r.start_date),
    end_date: String(r.end_date),
    contracts: (r.contracts as Contract[]) || [],
    total_cost: Number(r.total_cost),
    status: r.status as Project['status'],
    created: String(r.created),
    updated: String(r.updated),
  };
}

function mapOperation(r: Record<string, unknown>): Operation {
  const rawDate = String(r.date);
  return {
    id: String(r.id),
    date: rawDate ? rawDate.slice(0, 10) : '',
    week: Number(r.week),
    project_id: String(r.project_id),
    project_name: expandName(r, 'project_id'),
    view: r.view as Operation['view'],
    type: r.type as Operation['type'],
    counterparty_id: String(r.counterparty_id),
    counterparty_name: expandName(r, 'counterparty_id'),
    category_id: r.category_id ? String(r.category_id) : '',
    category_name: expandName(r, 'category_id'),
    stage_id: r.stage_id ? String(r.stage_id) : '',
    stage_name: expandName(r, 'stage_id'),
    comment: String(r.comment || ''),
    amount: Number(r.amount),
    act_status: r.act_status as Operation['act_status'],
    payment_status: r.payment_status as Operation['payment_status'],
    is_archived: Boolean(r.is_archived),
    parent_id: r.parent_id ? String(r.parent_id) : null,
    created: String(r.created),
    updated: String(r.updated),
    updated_by: r.updated_by ? String(r.updated_by) : undefined,
  };
}

function mapPlanning(r: Record<string, unknown>): Planning {
  return {
    id: String(r.id),
    project_id: String(r.project_id),
    date: String(r.date),
    type: r.type as Planning['type'],
    category: String(r.category),
    stage_id: r.stage_id ? String(r.stage_id) : '',
    amount: Number(r.amount),
    comment: String(r.comment || ''),
    created: String(r.created),
    updated: String(r.updated),
  };
}

export const pbAuth = {
  login: async (email: string, password: string): Promise<User> => {
    const auth = await pb.collection('users').authWithPassword(email, password);
    const user = toUser(auth.record as Record<string, unknown>);
    if (!user) throw new Error('Ошибка авторизации');
    return user;
  },
  logout: () => { pb.authStore.clear(); },
  getCurrentUser: (): User | null => toUser(pb.authStore.model as Record<string, unknown> | null),
  isAuthenticated: (): boolean => pb.authStore.isValid,
};

export const pocketbaseService = {
  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await pb.collection('users').getFullList({ sort: 'name' });
    return res.map(r => toUser(r as Record<string, unknown>)).filter(Boolean) as User[];
  },

  // Counterparties
  getCounterparties: async (): Promise<Counterparty[]> => {
    const res = await pb.collection('counterparties').getFullList({
      filter: 'is_archived = false',
      sort: 'name',
    });
    return res.map(mapCounterparty);
  },
  getAllCounterparties: async (): Promise<Counterparty[]> => {
    const res = await pb.collection('counterparties').getFullList({ sort: 'name' });
    return res.map(mapCounterparty);
  },
  getCounterparty: async (id: string): Promise<Counterparty | null> => {
    try {
      const r = await pb.collection('counterparties').getOne(id);
      return mapCounterparty(r as Record<string, unknown>);
    } catch { return null; }
  },
  createCounterparty: async (data: Omit<Counterparty, 'id' | 'created' | 'updated'>): Promise<Counterparty> => {
    const r = await pb.collection('counterparties').create(data);
    return mapCounterparty(r as Record<string, unknown>);
  },
  updateCounterparty: async (id: string, data: Partial<Counterparty>): Promise<Counterparty | undefined> => {
    const r = await pb.collection('counterparties').update(id, data);
    return r ? mapCounterparty(r as Record<string, unknown>) : undefined;
  },

  // Categories
  getCategories: async (projectId?: string): Promise<Category[]> => {
    const filterParts = ['is_archived = false'];
    if (projectId) {
      filterParts.push(`(project_id = "" || project_id = "${projectId}")`);
    }
    const res = await pb.collection('categories').getFullList({
      filter: filterParts.join(' && '),
      sort: 'name',
    });
    return res.map(mapCategory);
  },
  getAllCategories: async (): Promise<Category[]> => {
    const res = await pb.collection('categories').getFullList({ sort: 'name' });
    return res.map(mapCategory);
  },
  createCategory: async (data: Omit<Category, 'id' | 'created' | 'updated'>): Promise<Category> => {
    const r = await pb.collection('categories').create(data);
    return mapCategory(r as Record<string, unknown>);
  },
  updateCategory: async (id: string, data: Partial<Category>): Promise<Category | undefined> => {
    const r = await pb.collection('categories').update(id, data);
    return r ? mapCategory(r as Record<string, unknown>) : undefined;
  },

  // Stages
  getStages: async (projectId?: string): Promise<Stage[]> => {
    const filterParts: string[] = [];
    if (projectId) {
      filterParts.push(`(project_id = "" || project_id = "${projectId}")`);
    }
    const res = await pb.collection('stages').getFullList({
      filter: filterParts.join(' && ') || undefined,
      sort: 'order',
    });
    return res.map(mapStage);
  },
  getAllStages: async (): Promise<Stage[]> => {
    const res = await pb.collection('stages').getFullList({ sort: 'order' });
    return res.map(mapStage);
  },
  createStage: async (data: Omit<Stage, 'id' | 'created' | 'updated'>): Promise<Stage> => {
    const r = await pb.collection('stages').create(data);
    return mapStage(r as Record<string, unknown>);
  },
  updateStage: async (id: string, data: Partial<Stage>): Promise<Stage | undefined> => {
    const r = await pb.collection('stages').update(id, data);
    return r ? mapStage(r as Record<string, unknown>) : undefined;
  },

  // Projects
  getProjects: async (): Promise<Project[]> => {
    const res = await pb.collection('projects').getFullList({
      expand: 'counterparty_id',
      sort: '-start_date',
    });
    return res.map(mapProject);
  },
  getProject: async (id: string): Promise<Project | null> => {
    try {
      const r = await pb.collection('projects').getOne(id, { expand: 'counterparty_id' });
      return mapProject(r as Record<string, unknown>);
    } catch { return null; }
  },
  createProject: async (data: Omit<Project, 'id' | 'created' | 'updated' | 'status'>): Promise<Project> => {
    const payload = { ...data, status: 'active' };
    const r = await pb.collection('projects').create(payload);
    return mapProject(r as Record<string, unknown>);
  },
  updateProject: async (id: string, data: Partial<Project>): Promise<Project | undefined> => {
    const r = await pb.collection('projects').update(id, data);
    return r ? mapProject(r as Record<string, unknown>) : undefined;
  },

  // Operations
  getOperations: async (filters?: { project_id?: string; view?: string; type?: string; parent_id?: string | null }): Promise<Operation[]> => {
    const parts = ['is_archived = false'];
    if (filters?.project_id) parts.push(`project_id = "${filters.project_id}"`);
    if (filters?.view) parts.push(`view = "${filters.view}"`);
    if (filters?.type) parts.push(`type = "${filters.type}"`);
    if (filters?.parent_id) parts.push(`parent_id = "${filters.parent_id}"`);
    const res = await pb.collection('operations').getFullList({
      filter: parts.join(' && '),
      expand: 'project_id,counterparty_id,category_id,stage_id',
      sort: '-date',
    });
    return res.map(mapOperation);
  },
  getOperation: async (id: string): Promise<Operation | null> => {
    try {
      const r = await pb.collection('operations').getOne(id, { expand: 'project_id,counterparty_id,category_id,stage_id' });
      return mapOperation(r as Record<string, unknown>);
    } catch { return null; }
  },
  createOperation: async (data: Omit<Operation, 'id' | 'week' | 'created' | 'updated'>): Promise<Operation> => {
    const payload: Record<string, unknown> = {
      ...data,
      week: getWeekNumber(data.date),
    };
    if (!payload.category_id) delete payload.category_id;
    if (!payload.stage_id) delete payload.stage_id;
    if (!payload.parent_id) delete payload.parent_id;
    const r = await pb.collection('operations').create(payload);
    return mapOperation(r as Record<string, unknown>);
  },
  updateOperation: async (id: string, data: Partial<Operation>): Promise<Operation | undefined> => {
    const payload: Record<string, unknown> = { ...data };
    if (data.date) payload.week = getWeekNumber(data.date);
    if (payload.category_id === '') delete payload.category_id;
    if (payload.stage_id === '') delete payload.stage_id;
    if (payload.parent_id === '' || payload.parent_id === null) delete payload.parent_id;
    const r = await pb.collection('operations').update(id, payload);
    return r ? mapOperation(r as Record<string, unknown>) : undefined;
  },
  archiveOperation: async (id: string): Promise<Operation | undefined> => {
    const r = await pb.collection('operations').update(id, { is_archived: true });
    return r ? mapOperation(r as Record<string, unknown>) : undefined;
  },

  // Planning
  getPlanning: async (projectId?: string): Promise<Planning[]> => {
    const filter = projectId ? `project_id = "${projectId}"` : '';
    const res = await pb.collection('planning').getFullList({
      filter,
      expand: 'stage_id',
      sort: 'date',
    });
    return res.map(mapPlanning);
  },
  createPlanning: async (data: Omit<Planning, 'id' | 'created' | 'updated'>): Promise<Planning> => {
    const payload: Record<string, unknown> = { ...data };
    if (!payload.stage_id) delete payload.stage_id;
    const r = await pb.collection('planning').create(payload);
    return mapPlanning(r as Record<string, unknown>);
  },
  updatePlanning: async (id: string, data: Partial<Planning>): Promise<Planning | undefined> => {
    const payload: Record<string, unknown> = { ...data };
    if (payload.stage_id === '') delete payload.stage_id;
    const r = await pb.collection('planning').update(id, payload);
    return r ? mapPlanning(r as Record<string, unknown>) : undefined;
  },
  deletePlanning: async (id: string): Promise<boolean> => {
    try {
      await pb.collection('planning').delete(id);
      return true;
    } catch { return false; }
  },
};
