import React, { forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import { useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { InputController } from '../../services/inputController';
import { Euler, Quaternion } from 'three';

/**
 * Platform Component
 * Controlled by InputController
 * Kinematic Body -> Forces other objects to react, but isn't moved by them.
 */

export interface PlatformRef {
  getRotation: () => Euler;
}

const Platform = forwardRef<PlatformRef>((props, ref) => {
  const inputController = InputController.getInstance();
  const [currentRotation, setCurrentRotation] = useState<Euler>(new Euler());
  
  // Kinematic box: infinite mass for collision purposes, moved manually
  const [boxRef, api] = useBox(() => ({
    type: 'Kinematic',
    args: [10, 0.5, 10], // Width, Height, Depth
    material: {
      friction: 0.8,
      restitution: 0
    }
  }));

  // 监听物理体旋转变化并同步到视觉网格
  useEffect(() => {
    const unsubscribe = api.rotation.subscribe((rotation) => {
      const [x, y, z] = rotation;
      const newRotation = new Euler(x, y, z);
      setCurrentRotation(newRotation);
      
      // 同步到视觉网格
      if (boxRef.current) {
        const mesh = boxRef.current as any;
        mesh.rotation.copy(newRotation);
      }
      
      console.log('平台旋转同步到视觉网格:', {
        x: newRotation.x.toFixed(3),
        y: newRotation.y.toFixed(3),
        z: newRotation.z.toFixed(3)
      });
    });
    
    return unsubscribe;
  }, [api, boxRef]);

  // 使用useImperativeHandle暴露ref方法
  useImperativeHandle(ref, () => ({
    getRotation: () => {
      console.log('平台getRotation被调用，返回当前旋转:', {
        x: currentRotation.x.toFixed(3),
        y: currentRotation.y.toFixed(3),
        z: currentRotation.z.toFixed(3)
      });
      return currentRotation.clone();
    }
  }));

  useFrame(() => {
    // Get Input
    const { pitch, roll, yaw } = inputController.getOrientation();

    // 添加输入调试
    if (pitch !== 0 || roll !== 0 || yaw !== 0) {
      console.log('平台接收到输入:', { 
        pitch: pitch.toFixed(3), 
        roll: roll.toFixed(3), 
        yaw: yaw.toFixed(3) 
      });
    }

    // Calculate Euler angles
    const euler = new Euler(pitch, yaw, roll, 'XYZ');
    
    // Apply to Physics Body
    // api.rotation.set takes (x, y, z)
    api.rotation.set(euler.x, euler.y, euler.z);
    
    // 调试物理体旋转
    if (euler.x !== 0 || euler.y !== 0 || euler.z !== 0) {
      console.log('平台物理体旋转设置:', {
        x: euler.x.toFixed(3),
        y: euler.y.toFixed(3),
        z: euler.z.toFixed(3)
      });
    }
  });

  return (
    <mesh ref={boxRef} receiveShadow castShadow rotation={currentRotation}>
      <boxGeometry args={[10, 0.5, 10]} />
      <meshStandardMaterial color="#3b82f6" metalness={0.2} roughness={0.1} />
      
      {/* Visual Grid on top */}
      <gridHelper args={[10, 10, 0xffffff, 0x1e3a8a]} position={[0, 0.26, 0]} />
    </mesh>
  );
});

export { Platform };