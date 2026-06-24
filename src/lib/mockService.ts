import type {
  User, Counterparty, Category, Stage, Project, Operation, Planning
} from '@/types';
import {
  mockUsers, mockCounterparties, mockCategories, mockStages,
  mockProjects, mockOperations, mockPlanning
} from './mockData';

// In-memory stores (mutable for CRUD)
let users = [...mockUsers];
let counterparties = [...mockCounterparties];
let categories = [...mockCategories];
let stages = [...mockStages];
let projects = [...mockProjects];
let operations = [...mockOperations];
let planning = [...mockPlanning];

let currentUser: User | null = null;

export const mockAuth = {
  login: async (email: string, password: string): Promise<User> => {
    await new Promise(r => setTimeout(r, 300));
    const user = users.find(u => u.email === email);
    if (!user) throw new Error('Неверный email или пароль');
    // Simple password check for demo
    const expectedPassword = user.role === 'admin' ? 'admin12345' :
      user.role === 'operator' ? 'operator12345' : 'manager12345';
    if (password !== expectedPassword) throw new Error('Неверный email или пароль');
    currentUser = user;
    return user;
  },
  logout: () => { currentUser = null; },
  getCurrentUser: () => currentUser,
  isAuthenticated: () => currentUser !== null,
};

export const mockService = {
  // Users
  getUsers: () => Promise.resolve([...users]),

  // Counterparties
  getCounterparties: () => Promise.resolve(counterparties.filter(c => !c.is_archived)),
  getAllCounterparties: () => Promise.resolve([...counterparties]),
  getCounterparty: (id: string) => Promise.resolve(counterparties.find(c => c.id === id) || null),
  createCounterparty: (data: Omit<Counterparty, 'id' | 'created' | 'updated'>) => {
    const item: Counterparty = {
      ...data, id: `c${Date.now()}`, created: new Date().toISOString(), updated: new Date().toISOString()
    };
    counterparties = [...counterparties, item];
    return Promise.resolve(item);
  },
  updateCounterparty: (id: string, data: Partial<Counterparty>) => {
    counterparties = counterparties.map(c => c.id === id ? { ...c, ...data, updated: new Date().toISOString() } : c);
    return Promise.resolve(counterparties.find(c => c.id === id));
  },

  // Categories
  getCategories: (projectId?: string) => Promise.resolve(
    categories.filter(c => !c.is_archived && (!projectId || c.project_id === projectId))
  ),
  getAllCategories: () => Promise.resolve([...categories]),
  createCategory: (data: Omit<Category, 'id' | 'created' | 'updated'>) => {
    const item: Category = {
      ...data, id: `cat${Date.now()}`, created: new Date().toISOString(), updated: new Date().toISOString()
    };
    categories = [...categories, item];
    return Promise.resolve(item);
  },
  updateCategory: (id: string, data: Partial<Category>) => {
    categories = categories.map(c => c.id === id ? { ...c, ...data, updated: new Date().toISOString() } : c);
    return Promise.resolve(categories.find(c => c.id === id));
  },

  // Stages
  getStages: (projectId?: string) => Promise.resolve(
    stages.filter(s => s.project_id === projectId).sort((a, b) => a.order - b.order)
  ),
  getAllStages: () => Promise.resolve([...stages]),
  createStage: (data: Omit<Stage, 'id' | 'created' | 'updated'>) => {
    const item: Stage = {
      ...data, id: `s${Date.now()}`, created: new Date().toISOString(), updated: new Date().toISOString()
    };
    stages = [...stages, item];
    return Promise.resolve(item);
  },
  updateStage: (id: string, data: Partial<Stage>) => {
    stages = stages.map(s => s.id === id ? { ...s, ...data, updated: new Date().toISOString() } : s);
    return Promise.resolve(stages.find(s => s.id === id));
  },

  // Projects
  getProjects: () => Promise.resolve([...projects]),
  getProject: (id: string) => Promise.resolve(projects.find(p => p.id === id) || null),
  createProject: (data: Omit<Project, 'id' | 'created' | 'updated' | 'status'>) => {
    const item: Project = {
      ...data, id: `p${Date.now()}`, status: 'active',
      created: new Date().toISOString(), updated: new Date().toISOString()
    };
    projects = [...projects, item];
    return Promise.resolve(item);
  },
  updateProject: (id: string, data: Partial<Project>) => {
    projects = projects.map(p => p.id === id ? { ...p, ...data, updated: new Date().toISOString() } : p);
    return Promise.resolve(projects.find(p => p.id === id));
  },

  // Operations
  getOperations: (filters?: { project_id?: string; view?: string; type?: string }) => {
    let result = operations.filter(o => !o.is_archived);
    if (filters?.project_id) result = result.filter(o => o.project_id === filters.project_id);
    if (filters?.view) result = result.filter(o => o.view === filters.view);
    if (filters?.type) result = result.filter(o => o.type === filters.type);
    return Promise.resolve(result);
  },
  getOperation: (id: string) => Promise.resolve(operations.find(o => o.id === id) || null),
  createOperation: (data: Omit<Operation, 'id' | 'week' | 'created' | 'updated'>) => {
    const date = new Date(data.date);
    const start = new Date(date.getFullYear(), 0, 1);
    const week = Math.ceil((date.getTime() - start.getTime()) / 86400000 + start.getDay()) / 7;
    const item: Operation = {
      ...data, id: `o${Date.now()}`, week: Math.ceil(week),
      created: new Date().toISOString(), updated: new Date().toISOString()
    };
    operations = [...operations, item];
    return Promise.resolve(item);
  },
  updateOperation: (id: string, data: Partial<Operation>) => {
    operations = operations.map(o => o.id === id ? { ...o, ...data, updated: new Date().toISOString() } : o);
    return Promise.resolve(operations.find(o => o.id === id));
  },
  archiveOperation: (id: string) => {
    operations = operations.map(o => o.id === id ? { ...o, is_archived: true, updated: new Date().toISOString() } : o);
    return Promise.resolve(operations.find(o => o.id === id));
  },

  // Planning
  getPlanning: (projectId?: string) => {
    let result = [...planning];
    if (projectId) result = result.filter(p => p.project_id === projectId);
    return Promise.resolve(result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  },
  createPlanning: (data: Omit<Planning, 'id' | 'created' | 'updated'>) => {
    const item: Planning = {
      ...data, id: `pl${Date.now()}`, created: new Date().toISOString(), updated: new Date().toISOString()
    };
    planning = [...planning, item];
    return Promise.resolve(item);
  },
  updatePlanning: (id: string, data: Partial<Planning>) => {
    planning = planning.map(p => p.id === id ? { ...p, ...data, updated: new Date().toISOString() } : p);
    return Promise.resolve(planning.find(p => p.id === id));
  },
  deletePlanning: (id: string) => {
    planning = planning.filter(p => p.id !== id);
    return Promise.resolve(true);
  },
};
