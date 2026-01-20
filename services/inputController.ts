import { InputState } from '../types';

/**
 * INPUT AND PLATFORM ORIENTATION CONTROL MODULE
 * 
 * Responsibilities:
 * - Read from Gamepad API (including vJoy virtual devices)
 * - Normalize values
 * - Map to Pitch/Roll/Yaw
 * - Support for Arduino + vJoy custom hardware
 */

export class InputController {
  private static instance: InputController;
  private gamepadIndex: number | null = null;
  private vJoyDeviceId: string | null = null;

  // Sensitivity settings
  private readonly MAX_TILT = Math.PI / 6; // 30 degrees max tilt
  private readonly ROTATION_SPEED = 0.05; // Smoothing factor

  // vJoy specific settings
  private readonly VJOY_DEADZONE = 0.05; // Smaller deadzone for precise control
  private readonly VJOY_SENSITIVITY = 1.2; // Increased sensitivity for rehabilitation
  
  // 新增：标准手柄的死区设置，减小到0.02以检测轻微输入
  private readonly STANDARD_DEADZONE = 0.02; // 从0.1减小到0.02

  private currentState: InputState = {
    pitch: 0,
    roll: 0,
    yaw: 0
  };

  private constructor() {
    this.setupGamepadListeners();
  }

  private setupGamepadListeners() {
    (window as any).addEventListener("gamepadconnected", (e: any) => {
      console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index, e.gamepad.id,
        e.gamepad.buttons.length, e.gamepad.axes.length);
      
      const isVJoy = this.isVJoyDevice(e.gamepad.id);
      console.log(`Device detection - ID: "${e.gamepad.id}", Is vJoy: ${isVJoy}`);
      
      // 新的设备选择逻辑：优先标准手柄，其次vJoy
      if (!isVJoy) {
        // 标准手柄优先
        console.log("Standard gamepad detected! Setting as primary controller...");
        this.gamepadIndex = e.gamepad.index;
        this.vJoyDeviceId = null;
      } else if (this.gamepadIndex === null) {
        // 如果没有标准手柄，使用vJoy设备
        console.log("vJoy device detected! Using as fallback controller...");
        this.vJoyDeviceId = e.gamepad.id;
        this.gamepadIndex = e.gamepad.index;
      } else {
        // 已经有标准手柄，忽略vJoy设备
        console.log("vJoy device detected but standard gamepad is already active. Ignoring vJoy.");
      }
    });

    (window as any).addEventListener("gamepaddisconnected", (e: any) => {
      if (this.gamepadIndex === e.gamepad.index) {
        console.log(`Gamepad disconnected: "${e.gamepad.id}"`);
        
        // 断开连接后，尝试重新选择设备
        this.gamepadIndex = null;
        this.vJoyDeviceId = null;
        
        // 自动选择下一个可用设备
        this.autoSelectDevice();
      }
    });
  }

  /**
   * Detect if the device is a vJoy virtual controller
   */
  private isVJoyDevice(deviceId: string): boolean {
    const lowerId = deviceId.toLowerCase();
    
    // Enhanced vJoy detection with more patterns
    return lowerId.includes('vjoy') || 
           lowerId.includes('virtual') ||
           lowerId.includes('joystick') ||
           lowerId.includes('feed') ||  // vJoy vendor ID pattern
           lowerId.includes('face') ||  // vJoy product ID pattern
           lowerId.includes('unknown') || // Common for virtual devices
           lowerId.includes('hid') ||   // Human Interface Device
           lowerId.includes('usb') ||   // USB device indicator
           /vjoy.*device/i.test(deviceId) || // vJoy device pattern
           /virtual.*joystick/i.test(deviceId); // Virtual joystick pattern
  }

  /**
   * Get the appropriate deadzone based on device type
   */
  private getDeadzone(): number {
    return this.vJoyDeviceId ? this.VJOY_DEADZONE : this.STANDARD_DEADZONE;
  }

  /**
   * Get the appropriate sensitivity based on device type
   */
  private getSensitivity(): number {
    return this.vJoyDeviceId ? this.VJOY_SENSITIVITY : 1.0;
  }

  public static getInstance(): InputController {
    if (!InputController.instance) {
      InputController.instance = new InputController();
    }
    return InputController.instance;
  }

  /**
   * Auto-select the best available device
   */
  private autoSelectDevice(): void {
    const nav = navigator as any;
    const gamepads = nav.getGamepads ? nav.getGamepads() : [];
    const availableGamepads = gamepads.filter(gp => gp);
    
    if (availableGamepads.length === 0) {
      console.log("No gamepads available for auto-selection");
      return;
    }
    
    // 优先选择标准手柄
    const standardGamepad = availableGamepads.find(gp => !this.isVJoyDevice(gp.id));
    if (standardGamepad) {
      this.gamepadIndex = standardGamepad.index;
      this.vJoyDeviceId = null;
      console.log(`Auto-selected standard gamepad: "${standardGamepad.id}"`);
    } else {
      // 如果没有标准手柄，选择vJoy设备
      const vJoyGamepad = availableGamepads.find(gp => this.isVJoyDevice(gp.id));
      if (vJoyGamepad) {
        this.gamepadIndex = vJoyGamepad.index;
        this.vJoyDeviceId = vJoyGamepad.id;
        console.log(`Auto-selected vJoy device: "${vJoyGamepad.id}"`);
      }
    }
  }

  /**
   * Polls the current input device and returns the platform orientation.
   * Supports both standard gamepads and vJoy virtual devices.
   */
  public getOrientation(): InputState {
    const nav = navigator as any;
    const gamepads = nav.getGamepads ? nav.getGamepads() : [];
    
    // 如果没有活动设备，尝试自动选择
    if (this.gamepadIndex === null && gamepads.some(gp => gp)) {
      console.log("No active device, attempting auto-selection...");
      this.autoSelectDevice();
    }
    
    if (this.gamepadIndex !== null && gamepads[this.gamepadIndex]) {
      const gp = gamepads[this.gamepadIndex];
      if (gp) {
        const isVJoy = this.vJoyDeviceId !== null;
        const deadzone = this.getDeadzone();
        const sensitivity = this.getSensitivity();

        console.log(`Input - Device: ${isVJoy ? 'vJoy' : 'Standard'}, ID: "${gp.id}", Axes: ${gp.axes.map(a => a.toFixed(2))}`);

        // Enhanced mapping for vJoy devices
        let rawRoll, rawPitch, rawYaw;

        if (isVJoy) {
          // vJoy mapping - more flexible for custom hardware
          // Typically vJoy axes: 0=X, 1=Y, 2=Z, 3=Rx, 4=Ry, 5=Rz
          rawRoll = gp.axes[0] || 0;   // X-axis -> Roll
          rawPitch = gp.axes[1] || 0;  // Y-axis -> Pitch
          rawYaw = gp.axes[2] || 0;    // Z-axis -> Yaw
          
          // 新增：适配Python脚本的Z轴映射
          // 由于Python脚本将0-1023映射到1-32768，需要反向映射回-1到1的范围
          if (rawYaw !== 0) {
            // 将vJoy的Z轴值(1-32768)映射回-1到1的范围
            rawYaw = (rawYaw * 2) - 1; // 标准化到-1到1
          }
          
          // Alternative: if using rotary encoder or additional axis
          if (gp.axes.length > 3) {
            rawYaw = gp.axes[3] || 0; // Rx-axis -> Yaw (alternative)
          }
          
          // Debug vJoy axis mapping
          console.log(`vJoy axis mapping - Roll(X): ${rawRoll.toFixed(3)}, Pitch(Y): ${rawPitch.toFixed(3)}, Yaw(Z/Rx): ${rawYaw.toFixed(3)}`);
        } else {
          // Standard gamepad mapping (backward compatible)
          rawRoll = gp.axes[0] || 0;   // Left Stick X -> Roll
          rawPitch = gp.axes[1] || 0;  // Left Stick Y -> Pitch
          rawYaw = 0;
          
          // Yaw from triggers for standard controllers
          if (gp.buttons[6] && gp.buttons[7]) {
            rawYaw = (gp.buttons[7].value - gp.buttons[6].value);
          }
        }

        // Apply deadzone
        const roll = Math.abs(rawRoll) < deadzone ? 0 : rawRoll;
        const pitch = Math.abs(rawPitch) < deadzone ? 0 : rawPitch;
        const yaw = Math.abs(rawYaw) < deadzone ? 0 : rawYaw;

        // Apply sensitivity and mapping
        const tiltMultiplier = this.MAX_TILT * sensitivity;
        
        this.currentState = {
            roll: -roll * tiltMultiplier, // Inverted for natural balancing
            pitch: pitch * tiltMultiplier,
            yaw: yaw * tiltMultiplier
        };
        
        console.log(`Final orientation - Roll: ${this.currentState.roll.toFixed(3)}, Pitch: ${this.currentState.pitch.toFixed(3)}, Yaw: ${this.currentState.yaw.toFixed(3)}`);
      }
    } else {
        // Enhanced debug information
        const availableGamepads = gamepads.filter(gp => gp).map((gp, idx) => `${idx}: "${gp.id}" (${gp.buttons.length} buttons, ${gp.axes.length} axes)`);
        console.log("No active gamepad detected. Available gamepads:", availableGamepads);
    }

    return this.currentState;
  }

  /**
   * Manual override for testing or calibration
   */
  public setManualOrientation(pitch: number, roll: number, yaw: number): void {
    this.currentState = { pitch, roll, yaw };
  }

  /**
   * Get current device information for debugging
   */
  public getDeviceInfo(): { type: string; index: number | null; id: string | null } {
    const nav = navigator as any;
    const gamepads = nav.getGamepads ? nav.getGamepads() : [];
    const gp = this.gamepadIndex !== null ? gamepads[this.gamepadIndex] : null;
    
    return {
      type: this.vJoyDeviceId ? 'vJoy' : 'Standard',
      index: this.gamepadIndex,
      id: gp ? gp.id : null
    };
  }

  /**
   * Switch to a specific device by index
   */
  public switchToDevice(index: number): boolean {
    const nav = navigator as any;
    const gamepads = nav.getGamepads ? nav.getGamepads() : [];
    const targetGamepad = gamepads[index];
    
    if (targetGamepad) {
      this.gamepadIndex = index;
      this.vJoyDeviceId = this.isVJoyDevice(targetGamepad.id) ? targetGamepad.id : null;
      console.log(`Switched to device ${index}: "${targetGamepad.id}"`);
      return true;
    }
    
    console.log(`Failed to switch to device ${index}: not found`);
    return false;
  }

  /**
   * List all available devices for debugging
   */
  public listAvailableDevices(): Array<{index: number, id: string, type: string}> {
    const nav = navigator as any;
    const gamepads = nav.getGamepads ? nav.getGamepads() : [];
    
    return gamepads
      .filter(gp => gp)
      .map(gp => ({
        index: gp.index,
        id: gp.id,
        type: this.isVJoyDevice(gp.id) ? 'vJoy' : 'Standard'
      }));
  }

  /**
   * Force reconnection to vJoy device (useful for debugging)
   */
  public forceReconnectToVJoy(): void {
    console.log("Forcing vJoy reconnection...");
    this.vJoyDeviceId = null;
    this.gamepadIndex = null;
    
    const nav = navigator as any;
    const gamepads = nav.getGamepads ? nav.getGamepads() : [];
    const vJoyGamepad = gamepads.find(gp => gp && this.isVJoyDevice(gp.id));
    
    if (vJoyGamepad) {
      this.vJoyDeviceId = vJoyGamepad.id;
      this.gamepadIndex = vJoyGamepad.index;
      console.log(`Reconnected to vJoy device: "${vJoyGamepad.id}"`);
    } else {
      console.log("No vJoy device found for reconnection");
    }
  }
}