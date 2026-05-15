import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/Glassmorphism';
import { useGlobalStats, useRecentActivity } from '../../services/projectData';
import { Briefcase, Activity, CheckSquare, TrendingUp, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigation } from '../../context/NavigationContext';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) => (
  <GlassCard className="flex items-center gap-6 p-6 bg-white/[0.03]">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} shadow-lg`}>
      <Icon size={24} className="text-black" />
    </div>
    <div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-bold mt-0.5 text-foreground">{value}</h3>
    </div>
  </GlassCard>
);

const MOCK_HISTORICAL_DATA = [
  { time: '08:00', load: 45, throughput: 30 },
  { time: '09:00', load: 52, throughput: 35 },
  { time: '10:00', load: 48, throughput: 42 },
  { time: '11:00', load: 70, throughput: 60 },
  { time: '12:00', load: 61, throughput: 55 },
  { time: '13:00', load: 45, throughput: 45 },
  { time: '14:00', load: 38, throughput: 32 },
  { time: '15:00', load: 55, throughput: 50 },
  { time: '16:00', load: 65, throughput: 55 },
  { time: '17:00', load: 50, throughput: 40 },
];

export default function Overview() {
  const stats = useGlobalStats();
  const activity = useRecentActivity();
  const { focusJob } = useNavigation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-10">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={item}>
          <StatCard title="Active Projects" value={stats.activeProjects} icon={Briefcase} color="bg-cyan-500" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Tasks Pipeline" value={stats.totalTasks} icon={Activity} color="bg-purple-500" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Jobs Completed" value={stats.completedJobs} icon={CheckSquare} color="bg-emerald-500" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Efficiency Score" value={stats.completedJobs > 0 ? `${Math.round((stats.completedJobs / (stats.completedJobs + stats.pipelineJobs)) * 100)}%` : '0%'} icon={TrendingUp} color="bg-amber-400" />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-2 min-h-[400px] flex flex-col p-4 md:p-8 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Historical Stream Data</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Load</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Throughput</span>
              </div>
              <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-slate-500 font-bold ml-4">LIVE FEED</span>
            </div>
          </div>
          
          <div className="flex-1 w-full relative h-[300px]">
            {isMounted && (
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={MOCK_HISTORICAL_DATA}>
                    <defs>
                      <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      dy={10}
                    />
                    <YAxis 
                      hide 
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#fff'
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="load" 
                      stroke="#06b6d4" 
                      fillOpacity={1} 
                      fill="url(#colorLoad)" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="throughput" 
                      stroke="#a855f7" 
                      fillOpacity={1} 
                      fill="url(#colorThroughput)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="min-h-[400px] p-4 md:p-8 bg-white/[0.02]">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-8 flex items-center gap-2">
            <TrendingUp size={16} className="text-cyan-500" />
            Recent Protocols
          </h4>
          <div className="space-y-6">
            {activity.length === 0 && <p className="text-slate-500 text-xs italic">No recent protocol logs detected.</p>}
            {activity.map((alert, i) => (
              <div 
                key={i} 
                onClick={() => alert.projectId && alert.taskId && focusJob(alert.projectId, alert.taskId, alert.id)}
                className={`flex gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 transition-all group ${alert.projectId ? 'cursor-pointer hover:bg-white/[0.06] hover:border-cyan-500/30 shadow-lg' : 'cursor-default'}`}
              >
                <div className={`w-2 h-2 mt-1.5 rounded-full ${alert.color} animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <p className="text-foreground font-semibold text-sm">{alert.label}</p>
                    {alert.projectId && (
                      <ExternalLink size={12} className="text-slate-600 group-hover:text-cyan-500 transition-colors" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-1 font-bold">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Summary Footer */}
      <div className="flex flex-wrap gap-6">
        <GlassCard className="flex-1 min-w-[200px] p-4 bg-white/[0.03]">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Active Operatives</span>
          <p className="text-2xl font-bold text-white mt-1">{stats.totalMembers || 0}</p>
        </GlassCard>
        <GlassCard className="flex-1 min-w-[200px] p-4 bg-white/[0.03]">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Success Protocol Rate</span>
          <p className="text-2xl font-bold text-white mt-1">{stats.successRate || 0}%</p>
        </GlassCard>
        <div className="flex-1 min-w-[200px] p-4 bg-cyan-500 text-black rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <span className="text-[10px] text-black/60 uppercase font-bold tracking-widest">Active Pipeline Jobs</span>
          <p className="text-2xl font-bold mt-1">{stats.pipelineJobs || 0}</p>
        </div>
      </div>
    </div>
  );
}
