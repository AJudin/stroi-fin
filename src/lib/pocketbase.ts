import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';

export const pb = new PocketBase(PB_URL);

// Auth helpers
export const auth = {
  isAuthenticated: () => pb.authStore.isValid,
  getUser: () => pb.authStore.model,
  getToken: () => pb.authStore.token,
  logout: () => pb.authStore.clear(),
  login: (email: string, password: string) =>
    pb.collection('users').authWithPassword(email, password),
};

// Collection helpers
export const collections = {
  users: () => pb.collection('users'),
  projects: () => pb.collection('projects'),
  operations: () => pb.collection('operations'),
  planning: () => pb.collection('planning'),
  counterparties: () => pb.collection('counterparties'),
  categories: () => pb.collection('categories'),
  stages: () => pb.collection('stages'),
  auditLog: () => pb.collection('audit_log'),
};
