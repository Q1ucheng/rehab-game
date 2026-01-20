import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox } from '@react-three/cannon';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import { Platform, PlatformRef } from './Platform';
import { Ball } from './Ball';
import HUD from '../UI/HUD';
import { useStore } from '../../store/useStore';
import { AppScreen } from '../../types';
import { Vector3, Euler, Quaternion } from 'three';

// 平台旋转监听组件（必须在Canvas内部）
const PlatformRotationListener: React.FC<{
  platformRef: React.RefObject<PlatformRef>;
  onRotationChange: (rotation: Euler) => void;
}> = ({ platformRef, onRotationChange }) => {
  useFrame(() => {
    if (platformRef.current) {
      const rotation = platformRef.current.getRotation();
      // 添加调试信息
      if (rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0) {
        console.log('平台旋转监听器检测到旋转:', {
          x: rotation.x.toFixed(3),
          y: rotation.y.toFixed(3),
          z: rotation.z.toFixed(3)
        });
      }
      onRotationChange(rotation);
    }
  });
  
  return null; // 这个组件不渲染任何内容
};

// Reward Component
const Reward: React.FC<{ 
  position: [number, number, number], 
  onCollect: () => void,
  platformRotation?: Euler 
}> = ({ position, onCollect, platformRotation }) => {
  const [ref, api] = useBox(() => ({
    isTrigger: true, // Sensor only
    args: [0.5, 0.5, 0.5],
    position,
    onCollide: (e) => {
      // 简化碰撞检测，只要碰撞就触发收集
      if (e.body) {
        console.log('奖励被收集! 碰撞对象:', e.body);
        onCollect();
      }
    }
  }));

  // 当位置变化时更新物理体位置
  useEffect(() => {
    api.position.set(position[0], position[1], position[2]);
    console.log('奖励位置更新:', position);
  }, [position, api]);

  // 应用平台旋转，使奖励与平板相对静止
  const applyPlatformRotation = () => {
    if (platformRotation && ref.current) {
      const mesh = ref.current as any;
      
      // 调试信息
      console.log('应用平台旋转到奖励:', {
        平台旋转: {
          x: platformRotation.x.toFixed(3),
          y: platformRotation.y.toFixed(3),
          z: platformRotation.z.toFixed(3)
        },
        奖励位置: position
      });
      
      // 关键修复：奖励应该与平台保持相同的旋转
      // 直接应用平台的旋转到奖励
      mesh.rotation.copy(platformRotation);
      
      // 计算旋转后的世界坐标位置
      const quaternion = new Quaternion().setFromEuler(platformRotation);
      const relativePosition = new Vector3(position[0], position[1], position[2]);
      const worldPosition = relativePosition.applyQuaternion(quaternion);
      
      // 更新物理体位置
      api.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
      
      // 更新视觉位置
      mesh.position.copy(worldPosition);
      
      console.log('旋转后奖励位置:', {
        x: worldPosition.x.toFixed(3),
        y: worldPosition.y.toFixed(3),
        z: worldPosition.z.toFixed(3)
      });
    }
  };

  useEffect(() => {
    console.log('平台旋转或位置变化，重新应用旋转');
    applyPlatformRotation();
  }, [platformRotation, position]);

  useFrame(() => {
    applyPlatformRotation();
  });

  return (
    <mesh ref={ref as any}>
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
  const [platformRotation, setPlatformRotation] = useState<Euler>(new Euler());
  const platformRef = useRef<PlatformRef>(null);

  // 添加平台旋转状态变化的调试
  useEffect(() => {
    console.log('平台旋转状态更新:', {
      x: platformRotation.x.toFixed(3),
      y: platformRotation.y.toFixed(3),
      z: platformRotation.z.toFixed(3)
    });
  }, [platformRotation]);

  // Start game on mount
  useEffect(() => {
    startGame();
    return () => {
      endGame();
    }
  }, [startGame, endGame]);

  // 增强的随机刷新功能
  const handleCollect = () => {
    incrementScore(10);
    
    // 随机位置生成（确保在平台范围内）
    const getRandomPosition = (): [number, number, number] => {
      const x = (Math.random() - 0.5) * 8; // -4 到 4
      const z = (Math.random() - 0.5) * 8; // -4 到 4
      const y = 0.5; // 固定在平台上方
      
      // 确保位置在平台范围内
      const distanceFromCenter = Math.sqrt(x*x + z*z);
      if (distanceFromCenter > 4) {
        // 如果超出平台范围，重新生成
        return getRandomPosition();
      }
      
      return [x, y, z];
    };

    const newPos = getRandomPosition();
    console.log(`奖励刷新到新位置: x=${newPos[0].toFixed(2)}, z=${newPos[2].toFixed(2)}`);
    setRewardPos(newPos);
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
          <Platform ref={platformRef} />
          {isPlaying && !isGameOver && (
            <>
              <Ball />
              <Reward 
                position={rewardPos} 
                onCollect={handleCollect}
                platformRotation={platformRotation}
              />
            </>
          )}
        </Physics>
        
        {/* 平台旋转监听组件 */}
        <PlatformRotationListener 
          platformRef={platformRef} 
          onRotationChange={setPlatformRotation} 
        />
        
        <Environment preset="city" />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.5} />
      </Canvas>
    </div>
  );
};

export default GameScene;