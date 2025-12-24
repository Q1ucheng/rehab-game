import React from 'react';
import { useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { InputController } from '../../services/inputController';
import { Euler, Quaternion } from 'three';

/**
 * Platform Component
 * Controlled by InputController
 * Kinematic Body -> Forces other objects to react, but isn't moved by them.
 */

export const Platform: React.FC = () => {
  const inputController = InputController.getInstance();
  
  // Kinematic box: infinite mass for collision purposes, moved manually
  const [ref, api] = useBox(() => ({
    type: 'Kinematic',
    args: [10, 0.5, 10], // Width, Height, Depth
    material: {
      friction: 0.8,
      restitution: 0
    }
  }));

  useFrame(() => {
    // Get Input
    const { pitch, roll, yaw } = inputController.getOrientation();

    // Calculate Euler angles
    const euler = new Euler(pitch, yaw, roll, 'XYZ');
    
    // Apply to Physics Body
    // api.rotation.set takes (x, y, z)
    api.rotation.set(euler.x, euler.y, euler.z);
  });

  return (
    <mesh ref={ref as any} receiveShadow castShadow>
      <boxGeometry args={[10, 0.5, 10]} />
      <meshStandardMaterial color="#3b82f6" metalness={0.2} roughness={0.1} />
      
      {/* Visual Grid on top */}
      <gridHelper args={[10, 10, 0xffffff, 0x1e3a8a]} position={[0, 0.26, 0]} />
    </mesh>
  );
};