import React, { useState, useEffect } from 'react';
import { GlassCard, NeonButton } from '../ui/Glassmorphism';
import { Moon, Sun, Bell, Globe, Shield, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const Settings = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );
  const [notifications, setNotifications] = useState(
    localStorage.getItem('notifications') !== 'false'
  );
  const [language, setLanguage] = useState(
    localStorage.getItem('language') || 'English'
  );
  const [securityLevel, setSecurityLevel] = useState(
    localStorage.getItem('securityLevel') || 'High'
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [healthData, setHealthData] = useState([40, 70, 45, 90, 65, 80, 50, 95]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Simulate real-time monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      setHealthData(prev => {
        const newData = [...prev.slice(1), Math.floor(Math.random() * 60) + 40];
        return newData;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    setSaving(true);
    // Persist all settings
    localStorage.setItem('notifications', String(notifications));
    localStorage.setItem('language', language);
    localStorage.setItem('securityLevel', securityLevel);

    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1200);
  };

  const sections = [
    {
      title: 'Neural Interface',
      icon: Sun,
      description: 'Customize the visual output parameters.',
      content: (
        <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Visual Mode</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">{theme} Mode Active</p>
            </div>
          </div>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${theme === 'dark' ? 'bg-cyan-600' : 'bg-slate-500'}`}
          >
            <motion.div 
              animate={{ x: theme === 'dark' ? 24 : 0 }}
              className="w-4 h-4 bg-white rounded-full shadow-lg"
            />
          </button>
        </div>
      )
    },
    {
      title: 'Neural Pulse',
      icon: Bell,
      description: 'Manage auditory and visual interrupts.',
      content: (
        <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Bell size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Direct Notifications</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">{notifications ? 'Enabled' : 'Silenced'}</p>
            </div>
          </div>
          <button 
            onClick={() => setNotifications(!notifications)}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${notifications ? 'bg-cyan-600' : 'bg-slate-700'}`}
          >
            <motion.div 
              animate={{ x: notifications ? 24 : 0 }}
              className="w-4 h-4 bg-white rounded-full shadow-lg"
            />
          </button>
        </div>
      )
    }
  ];

  const selects = [
    {
      title: 'Matrix Dialect',
      icon: Globe,
      value: language,
      onChange: setLanguage,
      options: ['English', 'Spanish', 'French', 'Binary', 'Mandarin'],
      color: 'text-emerald-400'
    },
    {
      title: 'Firefall Protocol',
      icon: Shield,
      value: securityLevel,
      onChange: setSecurityLevel,
      options: ['High', 'Maximum', 'Nuclear', 'Stealth'],
      color: 'text-indigo-400'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">System Config Interface</h2>
          <p className="text-slate-500 text-sm">Fine-tune your neural link and matrix orchestration parameters.</p>
        </div>
        <div className="flex items-center gap-4">
          {saved && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-emerald-400"
            >
              <CheckCircle2 size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Config Synced</span>
            </motion.div>
          )}
          <NeonButton 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest min-w-[120px] justify-center"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Syncing...' : 'Sync Config'}
          </NeonButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {sections.map((section, idx) => (
            <GlassCard key={idx} className="p-6" hover={false}>
              <div className="flex items-center gap-3 mb-4">
                <section.icon size={18} className="text-slate-500" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">{section.title}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6">{section.description}</p>
              {section.content}
            </GlassCard>
          ))}
        </div>

        <div className="space-y-6">
          {selects.map((item, idx) => (
            <GlassCard key={idx} className="p-6" hover={false}>
              <div className="flex items-center gap-3 mb-6">
                <item.icon size={18} className="text-slate-500" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">{item.title}</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {item.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => item.onChange(opt)}
                    className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                      item.value === opt
                        ? `bg-cyan-500/10 border-cyan-500 ${item.color}`
                        : 'bg-white/[0.02] border-white/5 text-slate-500 hover:border-white/10'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </GlassCard>
          ))}
          
          <GlassCard className="p-6 overflow-hidden relative" hover={true}>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Neural Health</h3>
                <span className="text-[10px] text-cyan-400 font-mono animate-pulse">LIVE SYNC</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Stability analysis of your current connection.</p>
              <div className="flex items-end gap-1.5 h-12">
                {healthData.map((h, i) => (
                  <motion.div
                    key={i}
                    layout
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`flex-1 rounded-t-sm transition-colors duration-500 ${
                      h > 80 ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 
                      h < 50 ? 'bg-indigo-500/40' : 'bg-cyan-500/40'
                    }`}
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-between items-center text-[8px] uppercase tracking-tighter font-bold text-slate-600">
                <span>Latency: {Math.floor(Math.random() * 20) + 10}ms</span>
                <span>Bandwidth: 1.2 GB/s</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Settings;
