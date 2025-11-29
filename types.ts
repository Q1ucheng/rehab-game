export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  description: string;
  highScore: number;
}

export interface GameState {
  isPlaying: boolean;
  score: number;
  fails: number;
  maxFails: number;
  isGameOver: boolean;
}

export interface InputState {
  pitch: number; // Rotation X
  roll: number;  // Rotation Z
  yaw: number;   // Rotation Y
}

export enum AppScreen {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  GAME = 'GAME'
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// Extend JSX.IntrinsicElements for React Three Fiber
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
      boxGeometry: any;
      gridHelper: any;
      ambientLight: any;
      spotLight: any;
      pointLight: any;
      color: any;
    }
  }
}
