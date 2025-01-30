import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RegistrationData {
  email: string;
  username: string;
  password: string;
  fullName: string;
  userType: 'individual' | 'church';
  churchDetails?: {
    name: string;
    city: string;
    zipCode: string;
  };
  profileImage?: string;
  headerImage?: string;
}

interface RegistrationStore {
  data: Partial<RegistrationData>;
  currentStep: number;
  setData: (data: Partial<RegistrationData>) => void;
  setStep: (step: number) => void;
  clearData: () => void;
}

export const useRegistrationStore = create<RegistrationStore>()(
  persist(
    (set) => ({
      data: {},
      currentStep: 1,
      setData: (newData) => set((state) => ({ 
        data: { ...state.data, ...newData } 
      })),
      setStep: (step) => set({ currentStep: step }),
      clearData: () => set({ data: {}, currentStep: 1 }),
    }),
    {
      name: 'registration-store',
      partialize: (state) => ({
        data: state.data,
        currentStep: state.currentStep,
      }),
    }
  )
);