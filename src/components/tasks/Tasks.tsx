import React, { useState } from 'react';
import { 
  useProjects, 
  useProjectHierarchy, 
  updateJobStatus, 
  updateJob, 
  deleteJob,
  useMembers,
  useCurrentUserRole
} from '../../services/projectData';
import { GlassCard, NeonButton } from '../ui/Glassmorphism';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Search,
  Filter,
  Calendar,
  User as UserIcon,
  ChevronRight,
  FolderOpen,
  Edit3,
  Trash2,
  Plus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Job, Status } from '../../types';
import { cn } from '../../lib/utils';

export default function Tasks({ 
  selectedProjectId, 
  setSelectedProjectId 
}: { 
  selectedProjectId: string | null; 
  setSelectedProjectId: (id: string | null) => void; 
}) {
  const { projects, loading: projectsLoading } = useProjects();
  const { members } = useMembers();
  const { tasks, jobs, loading: hierarchyLoading } = useProjectHierarchy(selectedProjectId);
  const { role } = useCurrentUserRole();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showArchived, setShowArchived] = useState(false);

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editJobData, setEditJobData] = useState({
    title: '',
    addingDate: '',
    finishingDate: '',
    assignedTo: ''
  });

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });

  const filteredJobs = jobs.filter(job => {
    const task = tasks.find(t => t.id === job.taskId);
    const isTaskArchived = task?.archived || false;
    
    if (!showArchived && isTaskArchived) return false;

    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const displayedProjects = projects.filter(p => showArchived || !p.archived);
  const canAddItems = role === 'Global Admin' || role === 'Admin';
  const canAssignJobs = role === 'Global Admin' || role === 'Admin' || role === 'Manager';

  const startEditingJob = (job: Job) => {
    setEditingJob(job);
    setEditJobData({
      title: job.title,
      addingDate: format(job.addingDate.toDate(), "yyyy-MM-dd"),
      finishingDate: job.finishingDate ? format(job.finishingDate.toDate(), "yyyy-MM-dd") : '',
      assignedTo: job.assignedTo.join(', ')
    });
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    const updateData: any = {
      title: editJobData.title,
      addingDate: Timestamp.fromDate(new Date(editJobData.addingDate)),
      assignedTo: typeof editJobData.assignedTo === 'string' 
        ? editJobData.assignedTo.split(',').map(s => s.trim()).filter(Boolean)
        : editJobData.assignedTo
    };

    if (editJobData.finishingDate) {
      updateData.finishingDate = Timestamp.fromDate(new Date(editJobData.finishingDate));
    }

    await updateJob(editingJob.id, updateData);

    setEditingJob(null);
  };

  const handleDeleteJob = (job: Job) => {
    setConfirmModal({
      show: true,
      title: 'Delete Job',
      message: `Are you sure you want to delete job "${job.title}"?`,
      type: 'danger',
      onConfirm: async () => {
        await deleteJob(job.id);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4">
          <select 
            value={selectedProjectId || ''} 
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500 transition-all text-white w-full sm:w-64"
          >
            <option value="" className="bg-[#050505]">Select Project Context...</option>
            {displayedProjects.map(p => (
              <option key={p.id} value={p.id} className="bg-[#050505]">{p.name} {p.archived ? '(Archived)' : ''}</option>
            ))}
          </select>

          <label className="flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/[0.08] transition-colors group w-full sm:w-auto">
            <div className={cn(
              "w-8 h-4 rounded-full relative transition-colors",
              showArchived ? "bg-cyan-500" : "bg-slate-700"
            )}>
              <div className={cn(
                "absolute top-1 w-2 h-2 rounded-full bg-white transition-all transform",
                showArchived ? "left-5" : "left-1"
              )} />
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={showArchived} 
              onChange={() => setShowArchived(!showArchived)} 
            />
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 group-hover:text-slate-300">Show Archived</span>
          </label>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              placeholder="Search jobs in context..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 text-slate-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
          {['All', 'New', 'In Progress', 'Completed'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                statusFilter === status 
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {selectedProjectId ? (
        <div className="space-y-6 pb-20">
          {filteredJobs.length === 0 && !hierarchyLoading && (
            <GlassCard className="flex flex-col items-center justify-center p-20 text-center text-slate-500 bg-white/[0.01]">
              <FolderOpen size={48} className="mb-4 opacity-10" />
              <p className="text-lg">No job nodes detected in this filter.</p>
            </GlassCard>
          )}

          <div className="grid grid-cols-1 gap-4">
            {filteredJobs.map(job => (
              <GlassCard key={job.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.04] group">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      animate={job.status === 'In Progress' ? {
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.7, 1],
                      } : {}}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className={cn(
                        "w-2 h-2 rounded-full",
                        job.status === 'Completed' ? 'bg-emerald-500' : 
                        job.status === 'In Progress' ? 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-purple-500'
                      )} 
                    />
                    <h5 className="font-semibold text-lg text-white group-hover:text-cyan-100 transition-colors truncate max-w-[150px] sm:max-w-none" title={job.title}>{job.title}</h5>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest flex items-center gap-2">
                       <span>Task: {tasks.find(t => t.id === job.taskId)?.title || 'Primary'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-500 uppercase font-bold tracking-widest pt-2">
                       <span className="flex items-center gap-1"><Clock size={12} className="text-cyan-500" /> Added: {format(job.addingDate.toDate(), 'MMM dd, yyyy')}</span>
                       <div className="flex items-center gap-2 group/date relative ml-auto">
                          {job.finishingDate && (
                             <span className="text-cyan-400">{format(job.finishingDate.toDate(), 'MMM dd, yyyy')}</span>
                          )}
                          <div className={cn(
                            "relative w-7 h-7 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 transition-colors group-hover/date:bg-white/10",
                            canAddItems ? "hover:border-cyan-500/50 cursor-pointer" : "cursor-default"
                          )} title={job.finishingDate ? format(job.finishingDate.toDate(), 'MMM dd, yyyy') : 'Finishing date'}>
                            <Calendar size={12} className={cn("transition-colors", job.finishingDate ? "text-cyan-500" : "text-slate-500")} />
                            {canAddItems && (
                              <input 
                                type="date"
                                value={job.finishingDate ? format(job.finishingDate.toDate(), 'yyyy-MM-dd') : ''}
                                onChange={(e) => {
                                  const date = e.target.value ? Timestamp.fromDate(new Date(e.target.value)) : null;
                                  updateJob(job.id, { finishingDate: date });
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer [color-scheme:dark]"
                              />
                            )}
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 group/assign">
                    <UserIcon size={14} className="text-cyan-500" />
                    {canAssignJobs ? (
                      <select
                        value={job.assignedTo && job.assignedTo.length > 0 ? job.assignedTo[0] : ''}
                        onChange={(e) => updateJob(job.id, { assignedTo: e.target.value ? [e.target.value] : [] })}
                        className="bg-transparent border-none text-[10px] uppercase font-bold tracking-widest text-slate-400 focus:ring-0 cursor-pointer hover:text-white transition-colors outline-none"
                      >
                        <option value="" className="bg-[#050505]">Unassigned</option>
                        {members.map(m => (
                          <option key={m.id} value={m.email} className="bg-[#050505]">{m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        {job.assignedTo && job.assignedTo.length > 0 ? members.find(m => m.email === job.assignedTo[0])?.name || job.assignedTo[0] : 'Unassigned'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <select 
                      value={job.status}
                      onChange={(e) => updateJobStatus(job.id, e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] uppercase font-bold tracking-widest outline-none focus:border-cyan-500 transition-all cursor-pointer text-slate-400 hover:text-white"
                    >
                      <option value="New" className="bg-[#050505]">New</option>
                      <option value="In Progress" className="bg-[#050505]">In Progress</option>
                      <option value="Completed" className="bg-[#050505]">Completed</option>
                    </select>

                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {canAddItems && (
                        <>
                          <button onClick={() => startEditingJob(job)} className="p-2 hover:bg-white/5 rounded-lg text-slate-600 hover:text-cyan-400"><Edit3 size={14} /></button>
                          <button onClick={() => handleDeleteJob(job)} className="p-2 hover:bg-white/5 rounded-lg text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-32 text-center border border-white/5 bg-white/[0.01] rounded-3xl">
          <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
            <Filter size={32} className="text-cyan-500/30" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Project Filter Required</h3>
          <p className="text-slate-500 max-w-sm text-sm">Please select a project context from the menu above to visualize its job stream.</p>
        </div>
      )}

      <AnimatePresence>
        {editingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-lg">
              <GlassCard className="p-10 bg-[#0a0a0a] border-white/20 shadow-2xl" hover={false}>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <Edit3 className="text-black" size={20} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Modify Job Node</h3>
                </div>
                <form onSubmit={handleUpdateJob} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Job Title</label>
                    <input 
                      type="text"
                      required
                      value={editJobData.title}
                      onChange={(e) => setEditJobData({ ...editJobData, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-cyan-500 transition-all text-white"
                      placeholder="Enter job title..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Adding Date</label>
                       <input 
                          type="date"
                          required
                          value={editJobData.addingDate}
                          onChange={(e) => setEditJobData({ ...editJobData, addingDate: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-cyan-500 transition-all text-white font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Finishing Date</label>
                       <input 
                          type="date"
                          value={editJobData.finishingDate}
                          onChange={(e) => setEditJobData({ ...editJobData, finishingDate: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-cyan-500 transition-all text-white font-mono"
                        />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Neural Allocation</label>
                    <select 
                      value={typeof editJobData.assignedTo === 'string' ? editJobData.assignedTo : (editJobData.assignedTo?.[0] || '')}
                      onChange={(e) => {
                        setEditJobData({ ...editJobData, assignedTo: e.target.value });
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-cyan-500 transition-all text-white"
                    >
                      <option value="">Unassigned</option>
                      {members.map(member => (
                        <option key={member.id} value={member.email} className="bg-[#050505]">{member.name} ({member.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-4 pt-6">
                    <NeonButton type="submit" variant="cyan" className="flex-1 py-3 text-xs uppercase tracking-[0.2em]">Update Job</NeonButton>
                    <button type="button" onClick={() => setEditingJob(null)} className="px-6 rounded-full hover:bg-white/5 transition-colors text-[10px] font-bold uppercase tracking-widest text-slate-500">Cancel</button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {confirmModal.show && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm">
              <GlassCard className="p-8 bg-[#0a0a0a] border-white/20 shadow-2xl" hover={false}>
                <div className="text-center space-y-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4",
                    confirmModal.type === 'danger' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    <Trash2 size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{confirmModal.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{confirmModal.message}</p>
                </div>
                <div className="flex gap-3 pt-8">
                  <NeonButton 
                    variant={confirmModal.type === 'danger' ? 'danger' : 'cyan'} 
                    className="flex-1 py-2.5 text-[10px] uppercase tracking-widest"
                    onClick={confirmModal.onConfirm}
                  >
                    Confirm Action
                  </NeonButton>
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                    className="flex-1 px-4 py-2.5 bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
