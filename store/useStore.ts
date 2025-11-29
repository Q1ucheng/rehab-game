import { create } from 'zustand';
import { UserProfile, AppScreen } from '../types';

interface StoreState {
  // Session
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  currentScreen: AppScreen;
  setCurrentScreen: (screen: AppScreen) => void;

  // Game Data
  score: number;
  fails: number;
  maxFails: number;
  isGameOver: boolean;
  isPlaying: boolean;

  // Game Actions
  startGame: () => void;
  endGame: () => void;
  incrementScore: (points: number) => void;
  recordFail: () => void;
  resetGame: () => void;
}

export const useStore = create<StoreState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  currentScreen: AppScreen.AUTH,
  setCurrentScreen: (screen) => set({ currentScreen: screen }),

  score: 0,
  fails: 0,
  maxFails: 5,
  isGameOver: false,
  isPlaying: false,

  startGame: () => set({ 
    isPlaying: true, 
    isGameOver: false, 
    score: 0, 
    fails: 0 
  }),
  
  endGame: () => set({ isPlaying: false, isGameOver: true }),
  
  resetGame: () => set({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    fails: 0
  }),

  incrementScore: (points) => set((state) => ({ score: state.score + points })),
  
  recordFail: () => set((state) => {
    const newFails = state.fails + 1;
    if (newFails > state.maxFails) {
      return { fails: newFails, isGameOver: true, isPlaying: false };
    }
    return { fails: newFails };
  })
}));