import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { authService, userService } from '../../services/firebase';
import { AppScreen } from '../../types';

const Dashboard: React.FC = () => {
  const { user, setCurrentScreen, score } = useStore();
  const [description, setDescription] = useState(user?.description || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync user profile data on load
  useEffect(() => {
    if (user) {
      setDescription(user.description || '');
      // If we have a pending high score update from a previous game session
      if (score > user.highScore) {
         userService.updateStats(user.uid, score);
      }
    }
  }, [user, score]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await userService.updateStats(user.uid, user.highScore, description);
    setSaving(false);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await authService.logout();
    // State update handled by listener in App.tsx
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900 p-6 md:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome, {user.displayName}</h1>
            <p className="text-slate-400">Rehabilitation Dashboard</p>
          </div>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800 transition"
          >
            Sign Out
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Action */}
          <div className="md:col-span-2 bg-gradient-to-r from-sky-600 to-emerald-600 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <h2 className="text-2xl font-bold text-white mb-4 relative z-10">Ready for training?</h2>
            <p className="text-white/80 mb-8 max-w-md relative z-10">
              Connect your Xbox controller or use the custom grip device. 
              Keep the ball on the platform to improve stability and motor control.
            </p>
            <button
              onClick={() => setCurrentScreen(AppScreen.GAME)}
              className="relative z-10 bg-white text-sky-700 px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-play"></i> Start Session
            </button>
          </div>

          {/* Stats Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col justify-center items-center">
            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Personal Best</p>
            <div className="text-6xl font-mono font-bold text-emerald-400 mb-2">
              {Math.max(user.highScore, score)}
            </div>
            <p className="text-slate-500 text-sm">Points</p>
          </div>

          {/* Profile / Notes */}
          <div className="md:col-span-3 bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Medical Notes / Status</h3>
              <button 
                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                className="text-sky-400 hover:text-sky-300 text-sm font-medium"
              >
                {isEditing ? (saving ? 'Saving...' : 'Save') : 'Edit'}
              </button>
            </div>
            
            {isEditing ? (
              <textarea
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-300 focus:ring-2 focus:ring-sky-500 outline-none min-h-[100px]"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.currentTarget.value)}
                placeholder="Enter rehabilitation notes, current pain levels, or doctor's instructions..."
              />
            ) : (
              <div className="bg-slate-900/50 rounded-lg p-4 min-h-[100px]">
                <p className="text-slate-300 whitespace-pre-wrap">
                  {description || "No notes recorded yet."}
                </p>
              </div>
            )}
          </div>
          
          {/* Instructions */}
           <div className="md:col-span-3 bg-slate-800 border border-slate-700 rounded-2xl p-6 mt-4">
            <h3 className="text-lg font-bold text-white mb-4">Instructions</h3>
            <div className="grid md:grid-cols-2 gap-4 text-slate-400 text-sm">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0">1</div>
                    <p>Connect a Gamepad (Xbox/PlayStation) to your computer. Press any button to activate.</p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0">2</div>
                    <p>Use the <strong>Left Stick</strong> to tilt the platform (Pitch & Roll).</p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0">3</div>
                    <p>Use <strong>Triggers</strong> (L2/R2) to rotate the platform (Yaw).</p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0">4</div>
                    <p>Collect green cubes for points. Avoid letting the red ball fall off the edge!</p>
                </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Dashboard;