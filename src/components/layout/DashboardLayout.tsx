import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  Users, 
  Settings,
  Plus,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useGlobalStats, useCurrentUserRole } from '../../services/projectData';
import { auth } from '../../services/firebase';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group",
      active 
        ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 dark:text-cyan-400" 
        : "text-slate-500 dark:text-slate-400 hover:text-foreground hover:bg-white/5"
    )}
  >
    <Icon size={18} className={cn("transition-colors", active ? "text-cyan-500" : "text-slate-500 group-hover:text-cyan-500")} />
    <span className="font-medium text-sm">{label}</span>
    {active && <ChevronRight size={14} className="ml-auto" />}
  </button>
);

export const DashboardLayout = ({ 
  children, 
  activeTab, 
  setActiveTab 
}: { 
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const stats = useGlobalStats();
  const { role } = useCurrentUserRole();
  const efficiency = stats.completedJobs > 0 
    ? Math.round((stats.completedJobs / (stats.completedJobs + stats.pipelineJobs)) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden font-sans">
      {/* Sidebar overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-panel border-r border-border-color flex flex-col p-6 transition-transform duration-300 lg:relative lg:translate-x-0 lg:flex",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <LayoutDashboard className="text-white" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-foreground uppercase">GREEN<span className="text-cyan-400">BYTE</span></span>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest -mt-1">Projects</span>
            </div>
          </div>
          <button 
            className="lg:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeTab === 'overview'} 
            onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
          />
          <SidebarItem 
            icon={Briefcase} 
            label="All Projects" 
            active={activeTab === 'projects'} 
            onClick={() => { setActiveTab('projects'); setIsSidebarOpen(false); }}
          />
          {(role === 'Global Admin' || role === 'Admin') && (
            <SidebarItem 
              icon={Users} 
              label="Team Members" 
              active={activeTab === 'team'} 
              onClick={() => { setActiveTab('team'); setIsSidebarOpen(false); }}
            />
          )}
          {(role === 'Global Admin' || role === 'Admin' || role === 'Manager') && (
            <SidebarItem 
              icon={Trash2} 
              label="Trash Bin" 
              active={activeTab === 'trash'} 
              onClick={() => { setActiveTab('trash'); setIsSidebarOpen(false); }}
            />
          )}
          <div className="border-t border-border-color my-4 pt-4">
            {(role === 'Global Admin' || role === 'Admin') && (
              <SidebarItem 
                icon={Settings} 
                label="System Config" 
                active={activeTab === 'settings'} 
                onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} 
              />
            )}
          </div>
        </nav>

        <div className="mt-auto space-y-6">
          <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-border-color rounded-2xl">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Grid Pulse</p>
            <div className="flex justify-between items-end">
              <span className="text-2xl font-bold text-foreground">{efficiency}%</span>
              <span className="text-[10px] text-emerald-400 mb-1 font-bold">Sync OK</span>
            </div>
            <div className="w-full h-1 bg-white/10 mt-3 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-1000"
                style={{ width: `${efficiency}%` }}
              ></div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-6 border-t border-border-color">
            <button 
              onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-2xl transition-all duration-300 text-left group",
                activeTab === 'profile' ? "bg-white/5 border border-border-color shadow-sm" : "hover:bg-white/5"
              )}
            >
              <div className="relative">
                <div className={cn(
                  "h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg overflow-hidden border transition-colors",
                  activeTab === 'profile' ? "border-cyan-400" : "border-border-color group-hover:border-cyan-400/50"
                )}>
                  {auth.currentUser?.photoURL ? (
                    <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    auth.currentUser?.displayName?.charAt(0) || 'U'
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-panel bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={cn(
                  "text-xs font-bold tracking-tight truncate transition-colors",
                  activeTab === 'profile' ? "text-cyan-500 font-extrabold" : "text-foreground"
                )}>
                  {auth.currentUser?.displayName || 'User Operative'}
                </span>
                <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">
                  {role || 'Loading...'}
                </span>
              </div>
              {activeTab === 'profile' && <ChevronRight size={12} className="ml-auto text-cyan-400" />}
            </button>
            
            <button 
              onClick={() => auth.signOut()}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all border border-transparent hover:border-red-500/10"
            >
              <LogOut size={16} />
              Terminate Link
            </button>
            <div className="pt-2 text-center">
              <span className="text-[10px] text-slate-600 font-mono tracking-widest uppercase opacity-40">System Release v2.2.0</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-0 bg-main-gradient">
        {/* Top Header */}
        <header className="h-20 flex justify-between items-center px-4 md:px-10">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-slate-400 hover:text-white bg-white/5 rounded-lg border border-white/10"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">
                <span>GreenByte</span>
                <ChevronRight size={10} />
                <span className="text-cyan-500 capitalize">{activeTab}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight capitalize">
                {activeTab === 'overview' ? 'Dashboard Overview' : `${activeTab} Control`}
              </h1>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-foreground tracking-tight capitalize">
                {activeTab}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <div className="relative hidden md:block">
              <input 
                type="text" 
                placeholder="Search jobs..." 
                className="bg-white/5 border border-border-color rounded-full px-5 py-2 text-sm w-40 lg:w-64 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-foreground placeholder:text-slate-600 transition-all opacity-80 focus:opacity-100"
              />
            </div>
            <div className="md:hidden p-2 bg-white/5 rounded-lg border border-border-color text-slate-500">
              <LayoutDashboard size={20} className="text-cyan-500" />
            </div>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 scrollbar-hide">
          {children}
        </div>
      </main>
    </div>
  );
};
