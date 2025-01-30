import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RegistrationData {
  id?: string;
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

// Set expiration time to 1 hour
const EXPIRATION_TIME = 1000 * 60 * 60; // 1 hour in milliseconds

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
      // Add storage event listener to clear data after expiration
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            const stored = localStorage.getItem('registration-store');
            if (stored) {
              const { timestamp } = JSON.parse(stored);
              if (Date.now() - timestamp > EXPIRATION_TIME) {
                state.clearData();
              }
            }
          }
        };
      },
      // Add timestamp to storage
      serialize: (state) => {
        return JSON.stringify({
          ...state,
          timestamp: Date.now(),
        });
      },
    }
  )
);