import { create } from 'zustand';

interface ApplicantState {
  whatsappNumber: string | null;
  isAuthenticated: boolean;
  profileCompletionPct: number;
  login: (phone: string) => void;
  logout: () => void;
  updateProgress: (pct: number) => void;
}

export const useApplicantStore = create<ApplicantState>((set) => ({
  whatsappNumber: null,
  isAuthenticated: false,
  profileCompletionPct: 0,
  login: (phone: string) => set({ whatsappNumber: phone, isAuthenticated: true }),
  logout: () => set({ whatsappNumber: null, isAuthenticated: false, profileCompletionPct: 0 }),
  updateProgress: (pct: number) => set({ profileCompletionPct: pct }),
}));