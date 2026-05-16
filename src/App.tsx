/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { GlassCard, NeonButton } from './components/ui/Glassmorphism';
import { LayoutDashboard, LogIn, ShieldCheck } from 'lucide-react';
import Overview from './components/dashboard/Overview';
import Projects from './components/projects/Projects';
import Tasks from './components/tasks/Tasks';
import Team from './components/team/Team';
import Profile from './components/profile/Profile';
import Settings from './components/settings/Settings';
import Trash from './components/trash/Trash';
import { NavigationProvider } from './context/NavigationContext';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './services/firebase';
import { syncUser } from './services/projectData';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(auth.currentUser);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("App: Setting up onAuthStateChanged");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("App: onAuthStateChanged fired. User:", user?.email);
      setUser(user);
      if (user) {
        syncUser().catch(err => console.error("Sync user background error:", err));
      }
      setInitializing(false);
    });
    return () => unsubscribe();
  }, []);


  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || "Failed to login. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest animate-pulse">Synchronizing Neural Link...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <GlassCard className="p-8 md:p-12 text-center" hover={false}>
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                <LayoutDashboard className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tighter uppercase italic">
                  GREEN<span className="text-cyan-400">BYTE</span>
                </h1>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1 italic">Matrix Authentication</p>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:border-cyan-500 transition-all text-white"
                    placeholder="name@matrix.net"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Access Protocol (Password)</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:border-cyan-500 transition-all text-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 text-xs"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </motion.div>
              )}

              <NeonButton 
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn size={16} />
                )}
                Initialize Link
              </NeonButton>
            </form>



            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center gap-4 text-slate-700">
              <ShieldCheck size={20} className="opacity-20" />
              <p className="text-[8px] uppercase tracking-[0.2em] font-medium">Secured by Firefall Protocol 11.4</p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <NavigationProvider 
      currentTab={activeTab} 
      onTabChange={setActiveTab}
      selectedProjectId={selectedProjectId}
      setSelectedProjectId={setSelectedProjectId}
    >
      <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && <Overview />}
            {activeTab === 'projects' && (
              <Projects 
                selectedProjectId={selectedProjectId} 
                setSelectedProjectId={setSelectedProjectId} 
              />
            )}
            {activeTab === 'tasks' && (
              <Tasks 
                selectedProjectId={selectedProjectId} 
                setSelectedProjectId={setSelectedProjectId} 
              />
            )}
            {activeTab === 'team' && (
              <Team 
                setActiveTab={setActiveTab} 
                setSelectedProjectId={setSelectedProjectId} 
              />
            )}
            {activeTab === 'profile' && <Profile />}
            {activeTab === 'settings' && <Settings />}
            {activeTab === 'trash' && <Trash />}
          </motion.div>
        </AnimatePresence>
      </DashboardLayout>
    </NavigationProvider>
  );
}
