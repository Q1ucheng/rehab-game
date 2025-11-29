import { InputState } from '../types';

/**
 * INPUT AND PLATFORM ORIENTATION CONTROL MODULE
 * 
 * Responsibilities:
 * - Read from Gamepad API
 * - Normalize values
 * - Map to Pitch/Roll/Yaw
 * - Designed to be swapped for custom hardware signals later
 */

export class InputController {
  private static instance: InputController;
  private gamepadIndex: number | null = null;

  // Sensitivity settings
  private readonly MAX_TILT = Math.PI / 6; // 30 degrees max tilt
  private readonly ROTATION_SPEED = 0.05; // Smoothing factor

  private currentState: InputState = {
    pitch: 0,
    roll: 0,
    yaw: 0
  };

  private constructor() {
    (window as any).addEventListener("gamepadconnected", (e: any) => {
      console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index, e.gamepad.id,
        e.gamepad.buttons.length, e.gamepad.axes.length);
      this.gamepadIndex = e.gamepad.index;
    });

    (window as any).addEventListener("gamepaddisconnected", (e: any) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
      }
    });
  }

  public static getInstance(): InputController {
    if (!InputController.instance) {
      InputController.instance = new InputController();
    }
    return InputController.instance;
  }

  /**
   * Polls the current input device and returns the platform orientation.
   * Currently implements Xbox-style controller mapping.
   */
  public getOrientation(): InputState {
    const nav = navigator as any;
    const gamepads = nav.getGamepads ? nav.getGamepads() : [];
    
    if (this.gamepadIndex !== null && gamepads[this.gamepadIndex]) {
      const gp = gamepads[this.gamepadIndex];
      if (gp) {
        // Mapping Standard Gamepad:
        // Left Stick X (axes[0]) -> Roll (Z-axis rotation)
        // Left Stick Y (axes[1]) -> Pitch (X-axis rotation)
        // Triggers (buttons[6]/[7]) or Right Stick X -> Yaw (Y-axis rotation)

        const rawRoll = gp.axes[0] || 0;
        const rawPitch = gp.axes[1] || 0;
        
        // Deadzone
        const deadzone = 0.1;
        const roll = Math.abs(rawRoll) < deadzone ? 0 : rawRoll;
        const pitch = Math.abs(rawPitch) < deadzone ? 0 : rawPitch;

        // Yaw from triggers (L2/R2) typically buttons 6 and 7 which are analog values 0-1
        let yaw = 0;
        if (gp.buttons[6] && gp.buttons[7]) {
           yaw = (gp.buttons[7].value - gp.buttons[6].value); 
        }

        // Smooth interpolation could happen here, or raw mapping
        // We map -1 to 1 input to -MAX_TILT to +MAX_TILT
        
        this.currentState = {
            roll: -roll * this.MAX_TILT, // Inverted often feels more natural for "balancing"
            pitch: pitch * this.MAX_TILT,
            yaw: yaw * this.MAX_TILT
        };
      }
    } else {
        // Fallback: Keyboard controls for debugging
        // Arrow keys
        // We can implement a simple key state tracker if needed, 
        // but for now we return 0 or rely on Gamepad as primary per requirements.
    }

    return this.currentState;
  }
}