import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { InputController } from '../../services/inputController';

const HUD: React.FC = () => {
  const { score, fails, maxFails } = useStore();
  const lives = Math.max(0, maxFails - fails);
  
  const [deviceInfo, setDeviceInfo] = useState({ type: 'None', id: null, index: null });
  const [availableDevices, setAvailableDevices] = useState<Array<{index: number, id: string, type: string}>>([]);

  useEffect(() => {
    const updateDeviceInfo = () => {
      const info = InputController.getInstance().getDeviceInfo();
      setDeviceInfo(info);
      
      const devices = InputController.getInstance().listAvailableDevices();
      setAvailableDevices(devices);
    };

    updateDeviceInfo();
    const interval = setInterval(updateDeviceInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDeviceSwitch = (index: number) => {
    InputController.getInstance().switchToDevice(index);
  };

  return (
    <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start">
      {/* Score */}
      <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Score</p>
        <p className="text-4xl font-mono font-bold text-emerald-400">{score}</p>
      </div>

      {/* Controller Status Indicator */}
      <div className="flex flex-col items-center gap-2">
        <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Device Status</p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${deviceInfo.type !== 'None' ? 
              (deviceInfo.type === 'vJoy' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]') 
              : 'bg-red-500'}`} />
            <div className="text-sm text-white">
              <div>Type: {deviceInfo.type}</div>
              <div className="text-xs text-slate-400">
                ID: {deviceInfo.id ? deviceInfo.id.replace('Unknown Gamepad', 'vJoy Device') : 'Not connected'}
              </div>
              {deviceInfo.index !== null && (
                <div className="text-xs text-slate-500">Index: {deviceInfo.index}</div>
              )}
            </div>
          </div>
          
          {/* Device Selection (only show if multiple devices available) */}
          {availableDevices.length > 1 && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Switch Device</p>
              <div className="flex flex-col gap-1">
                {availableDevices.map(device => (
                  <button
                    key={device.index}
                    className={`text-xs px-2 py-1 rounded pointer-events-auto ${
                      deviceInfo.index === device.index 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    onClick={() => handleDeviceSwitch(device.index)}
                  >
                    {device.type}: {device.id.substring(0, 20)}...
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lives / Fails */}
      <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl text-right">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Stability</p>
        <div className="flex gap-2 mt-2 justify-end">
          {Array.from({ length: maxFails }).map((_, i) => (
            <div 
              key={i} 
              className={`w-3 h-3 rounded-full ${i < lives ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]' : 'bg-slate-700'}`}
            />
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-1">{lives} attempts remaining</p>
      </div>
    </div>
  );
};

export default HUD;