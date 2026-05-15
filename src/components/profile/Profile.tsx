import React, { useState } from 'react';
import { GlassCard, NeonButton } from '../ui/Glassmorphism';
import { User, Mail, Shield, Calendar, Award, ShieldCheck, Activity, Edit3, Check, X, Loader2 } from 'lucide-react';
import { auth } from '../../services/firebase';
import { updateProfile } from 'firebase/auth';
import { motion } from 'motion/react';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const user = auth.currentUser;
  const isAdmin = user?.email === 'zahidul@greenbyteai.com';

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setLoading(true);
    setSuccess(false);
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName
      });
      setSuccess(true);
      setIsEditing(false);
      // Auto-hide success message
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Profile Update Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Clearance Level', value: isAdmin ? 'L-9 Global Admin' : 'L-7 Operative', icon: ShieldCheck, color: 'text-cyan-400' },
    { label: 'Neural Activity', value: 'Overclocked', icon: Activity, color: 'text-emerald-400' },
    { label: 'Sector Merits', value: '1,420', icon: Award, color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Profile Card */}
        <div className="w-full md:w-1/3">
          <GlassCard className="p-8 text-center" hover={false}>
            <div className="relative inline-block mb-6">
              <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl text-white font-bold shadow-2xl overflow-hidden border-2 border-white/20">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user?.displayName?.charAt(0) || 'U'
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-4 border-panel bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="relative">
                  <input 
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-white/5 border border-border-color rounded-xl px-4 py-2 text-sm text-foreground outline-none focus:border-cyan-500 transition-all text-center"
                    placeholder="Enter Matrix Name"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Apply
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setIsEditing(false); setDisplayName(user?.displayName || ''); }}
                    className="px-3 bg-white/5 hover:bg-white/10 text-slate-400 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-border-color"
                  >
                    <X size={12} />
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-foreground tracking-tight leading-none mb-2">
                  {user?.displayName || 'Unknown Operative'}
                </h2>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mb-6 italic">Active Neural Link</p>
                
                <div className="pt-8">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full text-[10px] uppercase tracking-widest py-3 border border-border-color bg-white/5 hover:bg-white/10 text-slate-500 dark:text-slate-300 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold group"
                  >
                    <Edit3 size={14} className="text-cyan-500 group-hover:scale-110 transition-transform" />
                    Edit Matrix Identity
                  </button>
                </div>
              </>
            )}

            {success && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[8px] text-emerald-400 uppercase font-bold tracking-widest mt-4"
              >
                Calibration Complete
              </motion.p>
            )}
            
            <div className="space-y-3 pt-6 mt-6 border-t border-border-color">
              <div className="flex items-center gap-3 text-slate-500">
                <Mail size={16} className="text-cyan-500/60" />
                <span className="text-sm truncate">{user?.email || 'unlinked@matrix.net'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <Calendar size={16} className="text-cyan-500/60" />
                <span className="text-sm">Active Sector Entry: 2024.05.14</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Stats and Details */}
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((stat, idx) => (
              <GlassCard key={idx} className="p-6 relative overflow-hidden" hover={true}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon size={16} className={stat.color} />
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{stat.label}</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">{stat.value}</span>
                </div>
                <div className="absolute top-0 right-0 p-2 opacity-10">
                   <stat.icon size={48} className={stat.color} />
                </div>
              </GlassCard>
            ))}
          </div>

          <GlassCard className="p-8" hover={false}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-foreground tracking-tight">Access Log & Capabilities</h3>
              <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                Real-time Sync
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest mb-1">
                    <span className="text-slate-500">Project Mastery</span>
                    <span className="text-cyan-400">88%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 border border-border-color rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '88%' }}
                      className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest mb-1">
                    <span className="text-slate-500">Task Velocity</span>
                    <span className="text-indigo-400">94%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 border border-border-color rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '94%' }}
                      className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white/[0.02] border border-border-color rounded-2xl space-y-3">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Neural Directives</p>
                <ul className="space-y-2">
                  {['Sector Alpha Authorization', 'Neural Link Stability: 99.9%', 'Encrypted Data Stream Active'].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="w-1 h-1 bg-cyan-500 rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Profile;
