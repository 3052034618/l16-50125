import { create } from 'zustand';
import type { User, UserRole } from '@/types';
import { mockUsers } from '@/data/mockUsers';
import { getStorage, setStorage, removeStorage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';

interface AuthState {
  currentUser: User | null;
  users: User[];
  initialized: boolean;
  init: () => void;
  login: (account: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  getUserById: (id: string) => User | undefined;
  getUsersByRole: (role: UserRole) => User[];
  getUsersByDepartment: (dept: string) => User[];
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  users: [],
  initialized: false,

  init: () => {
    if (get().initialized) return;

    let users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    if (users.length === 0) {
      users = mockUsers;
      setStorage(STORAGE_KEYS.USERS, users);
    }

    const savedUser = getStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);

    set({ users, currentUser: savedUser, initialized: true });
  },

  login: (account: string, password: string) => {
    const { users } = get();
    const user = users.find((u) => u.account === account && u.password === password);
    if (!user) {
      return { success: false, message: '账号或密码错误' };
    }
    setStorage(STORAGE_KEYS.CURRENT_USER, user);
    set({ currentUser: user });
    return { success: true };
  },

  logout: () => {
    removeStorage(STORAGE_KEYS.CURRENT_USER);
    set({ currentUser: null });
  },

  getUserById: (id: string) => get().users.find((u) => u.id === id),

  getUsersByRole: (role: UserRole) => get().users.filter((u) => u.role === role),

  getUsersByDepartment: (dept: string) => get().users.filter((u) => u.department === dept),
}));
