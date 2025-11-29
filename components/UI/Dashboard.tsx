import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { authService, userService } from '../../services/firebase';
import { AppScreen, UserProfile } from '../../types';

const Dashboard: React.FC = () => {
  const { user, setCurrentScreen, score } = useStore();
  const [description, setDescription] = useState(user?.description || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [userRank, setUserRank] = useState(0);
  const [loading, setLoading] = useState(true);

  // 加载排行榜数据
  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        // 并行加载排行榜和用户排名
        const [leaderboardData, rankData] = await Promise.all([
          userService.getLeaderboard(10),
          userService.getUserRank(user.uid)
        ]);
        
        setLeaderboard(leaderboardData);
        setUserRank(rankData);
      } catch (error) {
        console.error("Failed to load leaderboard", error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [user]);

  // Sync user profile data on load
  useEffect(() => {
    if (user) {
      setDescription(user.description || '');
      // If we have a pending high score update from a previous game session
      if (score > user.highScore) {
         userService.updateStats(user.uid, score).then(() => {
           // 分数更新后重新加载排行榜
           const loadLeaderboard = async () => {
             try {
               const [leaderboardData, rankData] = await Promise.all([
                 userService.getLeaderboard(10),
                 userService.getUserRank(user.uid)
               ]);
               setLeaderboard(leaderboardData);
               setUserRank(rankData);
             } catch (error) {
               console.error("Failed to reload leaderboard", error);
             }
           };
           loadLeaderboard();
         });
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
            {userRank > 0 && (
              <div className="mt-3 text-sky-400 font-medium">
                Rank: #{userRank}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="md:col-span-3 bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Top Players</h3>
            {loading ? (
              <div className="flex justify-center items-center py-8 text-slate-400">
                Loading leaderboard...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No leaderboard data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="py-3 px-4 text-slate-400 font-medium">Rank</th>
                      <th className="py-3 px-4 text-slate-400 font-medium">Player</th>
                      <th className="py-3 px-4 text-slate-400 font-medium">High Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((player, index) => (
                      <tr 
                        key={player.uid} 
                        className={`py-3 border-b border-slate-700 ${player.uid === user.uid ? 'bg-slate-700/50' : ''}`}
                      >
                        <td className="py-3 px-4 font-mono text-slate-300">#{index + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${player.uid === user.uid ? 'bg-sky-400' : 'bg-slate-500'}`}></span>
                            <span className="text-white font-medium">
                              {player.displayName || 'Anonymous'}
                              {player.uid === user.uid && ' (You)'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                          {player.highScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
              <p className="text-slate-300 whitespace-pre-line">{description || 'No notes yet.'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;