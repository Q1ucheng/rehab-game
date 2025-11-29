import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, useBox } from '@react-three/cannon';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import { Platform } from './Platform';
import { Ball } from './Ball';
import HUD from '../UI/HUD';
import { useStore } from '../../store/useStore';
import { AppScreen } from '../../types';

// Reward Component
const Reward: React.FC<{ position: [number, number, number], onCollect: () => void }> = ({ position, onCollect }) => {
  const [ref] = useBox(() => ({
    isTrigger: true, // Sensor only
    args: [1, 1, 1],
    position,
    onCollide: (e) => {
      if (e.body.name !== 'reward') { // Simplistic check, ideally check collision groups
         onCollect();
      }
    }
  }));

  return (
    <mesh ref={ref as any} position={position}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
      <Text position={[0, 0.6, 0]} fontSize={0.3} color="white">
        +10
      </Text>
    </mesh>
  );
};

const GameScene: React.FC = () => {
  const { isPlaying, startGame, incrementScore, isGameOver, resetGame, setCurrentScreen, endGame } = useStore();
  const [rewardPos, setRewardPos] = useState<[number, number, number]>([2, 0.5, 2]);

  // Start game on mount
  useEffect(() => {
    startGame();
    return () => {
      endGame();
    }
  }, [startGame, endGame]);

  // Spawn new reward
  const handleCollect = () => {
    incrementScore(10);
    // Random position on platform (range -4 to 4 to stay safe)
    const x = (Math.random() - 0.5) * 8;
    const z = (Math.random() - 0.5) * 8;
    setRewardPos([x, 0.5, z]);
  };

  return (
    <div className="w-full h-full relative">
      <HUD />
      
      {isGameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center max-w-md w-full">
            <h2 className="text-3xl font-bold text-red-500 mb-4">Training Finished</h2>
            <p className="text-slate-300 mb-6">You have reached the failure limit. Great effort!</p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={resetGame}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold transition"
              >
                Try Again
              </button>
              <button 
                onClick={() => setCurrentScreen(AppScreen.DASHBOARD)}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition"
              >
                Exit to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      <Canvas shadows camera={{ position: [0, 8, 12], fov: 50 }}>
        <color attach="background" args={['#0f172a']} />
        
        <ambientLight intensity={0.5} />
        <spotLight 
          position={[10, 15, 10]} 
          angle={0.3} 
          penumbra={1} 
          intensity={1} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        <Physics gravity={[0, -9.81, 0]}>
          <Platform />
          {isPlaying && !isGameOver && (
            <>
              <Ball />
              <Reward position={rewardPos} onCollect={handleCollect} />
            </>
          )}
        </Physics>
        
        <Environment preset="city" />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.5} />
      </Canvas>
    </div>
  );
};

export default GameScene;