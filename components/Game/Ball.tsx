import React, { useEffect, useRef } from 'react';
import { useSphere } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store/useStore';
import { Vector3 } from 'three';

/**
 * BALL MOVEMENT CONTROL MODULE
 * 
 * Responsibilities:
 * - Physics body definition
 * - Attachment behavior (High damping, low restitution)
 * - Fall detection
 */

const RESET_POSITION: [number, number, number] = [0, 5, 0];

export const Ball: React.FC = () => {
  const { recordFail, isPlaying, isGameOver } = useStore();
  const position = useRef(new Vector3(0, 0, 0));

  // Physics Body
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position: RESET_POSITION,
    args: [0.5],
    material: {
      friction: 0.8, // High friction to make it controllable
      restitution: 0.0 // No bounce - "attached" feeling
    },
    linearDamping: 0.1,
    angularDamping: 0.1,
  }));

  // Subscription to track position for logic
  useEffect(() => {
    const unsubscribe = api.position.subscribe((v) => {
      position.current.set(v[0], v[1], v[2]);
    });
    return unsubscribe;
  }, [api.position]);

  // Reset ball when game starts or restarts
  useEffect(() => {
    if (isPlaying && !isGameOver) {
      api.position.set(...RESET_POSITION);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    }
  }, [isPlaying, isGameOver, api]);

  // Game Loop Logic for the Ball
  useFrame(() => {
    if (!isPlaying) return;

    // Fall detection logic
    // If ball drops below -5 in Y, it fell off the platform
    if (position.current.y < -5) {
      recordFail();
      // Reset position immediately to continue or stop if game over
      api.position.set(...RESET_POSITION);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    }

    // "Attachment" force (Optional)
    // If we really wanted to glue it, we could apply force towards platform center,
    // but the prompt implies falling is possible, so gravity is sufficient.
  });

  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#f43f5e" metalness={0.4} roughness={0.7} />
    </mesh>
  );
};