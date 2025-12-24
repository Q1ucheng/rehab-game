import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import { AppScreen } from './types';
import AuthScreen from './components/UI/AuthScreen';
import Dashboard from './components/UI/Dashboard';
import GameScene from './components/Game/GameScene';
import { initializeAuthListener } from './services/firebase';

const App: React.FC = () => {
  const { currentScreen, setCurrentScreen, setUser } = useStore();

  useEffect(() => {
    // Initialize Firebase Auth Listener
    const unsubscribe = initializeAuthListener((user) => {
      if (user) {
        setUser(user);
        if (currentScreen === AppScreen.AUTH) {
          setCurrentScreen(AppScreen.DASHBOARD);
        }
      } else {
        setUser(null);
        setCurrentScreen(AppScreen.AUTH);
      }
    });
    return () => unsubscribe();
  }, [setCurrentScreen, setUser, currentScreen]);

  return (
    <div className="w-full h-screen relative bg-slate-900 text-white overflow-hidden">
      {currentScreen === AppScreen.AUTH && <AuthScreen />}
      {currentScreen === AppScreen.DASHBOARD && <Dashboard />}
      {currentScreen === AppScreen.GAME && <GameScene />}
      <p style={{ position: 'fixed', bottom: 4, right: 8, fontSize: 12 }}>
        Build: {import.meta.env.VITE_BUILD_TIME}
      </p>
    </div>
  );
};

export default App;