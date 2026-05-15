import React, { useState } from 'react';
import { GlassCard } from '../ui/Glassmorphism';
import { Trash2, RotateCcw, XCircle, Search, Info, HardDrive } from 'lucide-react';
import { useTrashedItems, restoreProject, restoreTask, restoreJob, permanentlyDeleteProject, permanentlyDeleteTask, permanentlyDeleteJob } from '../../services/projectData';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function Trash() {
  const { items, loading } = useTrashedItems();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'project' | 'task' | 'job'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleRestore = async (item: typeof items[0]) => {
    try {
      if (item.type === 'project') await restoreProject(item.id);
      else if (item.type === 'task') await restoreTask(item.id);
      else if (item.type === 'job') await restoreJob(item.id);
    } catch (err) {
      console.error("Restore failed:", err);
    }
  };

  const handlePermanentDelete = async (item: typeof items[0]) => {
    try {
      if (item.type === 'project') await permanentlyDeleteProject(item.id);
      else if (item.type === 'task') await permanentlyDeleteTask(item.id);
      else if (item.type === 'job') await permanentlyDeleteJob(item.id);
      setConfirmDelete(null);
    } catch (err) {
      console.error("Permanent delete failed:", err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
              <Trash2 className="text-red-500" size={20} />
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tighter uppercase italic">
              TRASH<span className="text-red-500">BIN</span>
            </h1>
          </div>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] pl-1">Data Recovery & Disposal</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group flex-1 md:flex-initial min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-500 transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search deleted items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-cyan-500 transition-all text-white placeholder:text-slate-600"
            />
          </div>
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
             {(['all', 'project', 'task', 'job'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 text-[9px] uppercase font-bold tracking-widest rounded-lg transition-all ${
                    filterType === type ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {type}s
                </button>
             ))}
          </div>
        </div>
      </div>

      <GlassCard className="p-4 border-amber-500/10 bg-amber-500/5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Info className="text-amber-500" size={16} />
          </div>
          <div>
            <h4 className="text-amber-500 font-bold uppercase tracking-widest text-[10px] mb-1">Retrieval Notice</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Items in the trash can be restored within 30 days of deletion. After this period, neural links are severed and data is permanently purged from the matrix.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group"
            >
              <GlassCard className="p-4 hover:border-white/20 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 ${
                      item.type === 'project' ? 'bg-emerald-500/10' : 
                      item.type === 'task' ? 'bg-cyan-500/10' : 'bg-purple-500/10'
                    }`}>
                      <HardDrive className={`${
                        item.type === 'project' ? 'text-emerald-500' : 
                        item.type === 'task' ? 'text-cyan-500' : 'text-purple-500'
                      }`} size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded border ${
                          item.type === 'project' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 
                          item.type === 'task' ? 'text-cyan-500 border-cyan-500/20 bg-cyan-500/5' : 'text-purple-500 border-purple-500/20 bg-purple-500/5'
                        }`}>
                          {item.type}
                        </span>
                        <h3 className="text-sm font-bold text-white tracking-tight">{item.title}</h3>
                      </div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                        Deleted on {item.archivedAt ? format(item.archivedAt.toDate(), 'PPP p') : 'Unknown Date'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleRestore(item)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 transition-all hover:text-white"
                      title="Restore"
                    >
                      <RotateCcw size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Restore</span>
                    </button>
                    
                    {confirmDelete === item.id ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handlePermanentDelete(item)}
                          className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest"
                        >
                          Confirm Purge
                        </button>
                        <button 
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConfirmDelete(item.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 transition-all hover:text-white"
                        title="Delete Permanently"
                      >
                        <Trash2 size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Purge</span>
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}

          {filteredItems.length === 0 && !loading && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 animate-pulse">
                <Trash2 className="text-slate-700" size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Trash is Empty</p>
                <p className="text-xs text-slate-600 mt-1">Matrix storage is optimized.</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
