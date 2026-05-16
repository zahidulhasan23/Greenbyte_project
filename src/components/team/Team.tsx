import React, { useState, useEffect } from 'react';
import { useMembers, addMember, deleteMember, updateMember, useMemberActivity, useProjects, useCurrentUserRole } from '../../services/projectData';
import { GlassCard, NeonButton } from '../ui/Glassmorphism';
import { 
  Users, 
  Mail, 
  Shield, 
  ExternalLink, 
  UserPlus, 
  Plus, 
  Trash2, 
  Edit3,
  X,
  User,
  Clock,
  CheckCircle2,
  Circle,
  Activity,
  ChevronRight,
  Folder,
  Layers,
  Lock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Job, Project, Task } from '../../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

import { cn } from '../../lib/utils';

export default function Team({ 
  setActiveTab, 
  setSelectedProjectId 
}: { 
  setActiveTab: (tab: string) => void;
  setSelectedProjectId: (id: string | null) => void;
}) {
  const { members, loading } = useMembers();
  const { projects } = useProjects();
  const { role } = useCurrentUserRole();
  const [showAddModal, setShowAddModal] = useState(false);
  
  const canManageTeam = role === 'Global Admin' || role === 'Admin';
  const [showActivityModal, setShowActivityModal] = useState<string | null>(null); // member email
  const [editingMember, setEditingMember] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    password: ''
  });
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingMember) {
        await updateMember(editingMember.id, formData);
      } else {
        await addMember(formData);
      }
      closeModal();
    } catch (err: any) {
      console.error("Member Submit Error:", err);
      setError(err.message || "Failed to process operative authorization.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingMember(null);
    setError(null);
    setFormData({ name: '', email: '', role: '', password: '' });
  };

  const startEdit = (member: any) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      role: member.role || '',
      password: ''
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmModal({
      show: true,
      title: 'Decommission Operative',
      message: `Are you sure you want to decommission ${name} from the collaboration sector? This action will remove their profile from the matrix.`,
      onConfirm: async () => {
        await deleteMember(id);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  return (
    <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Collaboration Sector</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Manage project operatives and permissions.</p>
          </div>

          {canManageTeam && (
            <NeonButton 
              variant="cyan" 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 text-[10px] uppercase tracking-widest font-bold h-fit"
            >
              <UserPlus size={16} />
              <span>Add Operative</span>
            </NeonButton>
          )}
        </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : members.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <GlassCard key={member.id} className="p-6 bg-white/[0.02] border-white/5 hover:border-white/10 transition-all group relative">
              <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {canManageTeam && (
                  <>
                    <button onClick={() => startEdit(member)} className="p-2 hover:bg-white/5 rounded-lg text-slate-600 hover:text-cyan-400"><Edit3 size={14} /></button>
                    {member.email !== 'zahidul@greenbyteai.com' && (
                      <button onClick={() => handleDelete(member.id, member.name)} className="p-2 hover:bg-white/5 rounded-lg text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center shadow-lg">
                  <User size={24} className="text-slate-500" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm truncate max-w-[150px]">{member.name}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-cyan-500 font-bold uppercase tracking-widest">
                    <Shield size={10} />
                    <span>{member.role || 'Operative'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                  <Mail size={14} className="text-slate-500" />
                  <span className="text-xs text-slate-400 truncate">{member.email}</span>
                </div>
                
                <button 
                  onClick={() => setShowActivityModal(member.email)}
                  className="w-full py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  View Protocol Activity <ExternalLink size={12} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-32 text-center border border-white/5 bg-white/[0.01] rounded-3xl">
          <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
            <Users size={32} className="text-cyan-500/30" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Matrix Empty</h3>
          <p className="text-slate-500 max-w-sm text-sm">No operatives found in the database. Initialize team connections to proceed.</p>
        </div>
      )}

      {/* Activity Modal */}
      <MemberActivityModal 
        email={showActivityModal} 
        onClose={() => setShowActivityModal(null)} 
        memberName={members.find(m => m.email === showActivityModal)?.name || ''}
        projects={projects}
        onNavigate={(projId) => {
          setSelectedProjectId(projId);
          setActiveTab('projects');
          setShowActivityModal(null);
        }}
      />

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="w-full max-w-lg"
            >
              <GlassCard className="p-10 bg-[#0a0a0a] border-white/20 shadow-2xl" hover={false}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                      {editingMember ? <Edit3 size={20} className="text-black" /> : <UserPlus className="text-black" size={20} />}
                    </div>
                    <h3 className="text-2xl font-bold text-white">{editingMember ? 'Re-calibrate Operative' : 'Authorize New Operative'}</h3>
                  </div>
                  <button onClick={closeModal} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Full Identity</label>
                    <div className="relative">
                      <User size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-sm outline-none focus:border-cyan-500 transition-all text-white"
                        placeholder="Operative Name..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Neural Address (Email)</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-sm outline-none focus:border-cyan-500 transition-all text-white"
                        placeholder="email@nexus.grid"
                      />
                    </div>
                  </div>

                  {!editingMember && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center pl-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest text-left">Access Protocol (Password)</label>
                        <span className="text-[8px] text-cyan-500 font-bold uppercase tracking-widest">Required for Auth</span>
                      </div>
                      <div className="relative">
                        <Lock size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                          type="password"
                          required={!editingMember}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-sm outline-none focus:border-cyan-500 transition-all text-white"
                          placeholder="••••••••"
                        />
                      </div>
                      <p className="text-[8px] text-slate-600 uppercase tracking-widest font-bold mt-1 px-1 italic">This will create a neural link account for the operative.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Functional Designation (Role)</label>
                    <div className="relative">
                      <Shield size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      <select 
                        required
                        disabled={formData.email === 'zahidul@greenbyteai.com'}
                        value={formData.email === 'zahidul@greenbyteai.com' ? 'Admin' : formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className={cn(
                          "w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-10 py-4 text-sm outline-none focus:border-cyan-500 transition-all text-white appearance-none",
                          formData.email === 'zahidul@greenbyteai.com' ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                        )}
                      >
                        <option value="" disabled className="bg-[#0a0a0a]">Select Role...</option>
                        <option value="Admin" className="bg-[#0a0a0a]">Admin</option>
                        <option value="Manager" className="bg-[#0a0a0a]">Manager</option>
                        <option value="Worker" className="bg-[#0a0a0a]">Worker</option>
                      </select>
                      {formData.email !== 'zahidul@greenbyteai.com' && (
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                          <ChevronRight size={14} className="rotate-90" />
                        </div>
                      )}
                    </div>
                    {formData.email === 'zahidul@greenbyteai.com' && (
                      <p className="text-[8px] text-cyan-500 uppercase tracking-widest font-bold mt-1 px-1">Immutable Global Administrator Privilege</p>
                    )}
                  </div>

                  <div className="flex gap-4 pt-6">
                    <NeonButton 
                      type="submit" 
                      variant="cyan" 
                      disabled={submitting}
                      className="flex-1 py-3 text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                      {editingMember ? 'Update Matrix' : 'Initialize Operative'}
                    </NeonButton>
                    <button 
                      type="button" 
                      onClick={closeModal} 
                      disabled={submitting}
                      className="px-6 rounded-full hover:bg-white/5 transition-colors text-[10px] font-bold uppercase tracking-widest text-slate-500 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 mt-4"
                    >
                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400 font-medium">{error}</p>
                    </motion.div>
                  )}
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
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-500/10 text-red-500">
                    <Trash2 size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{confirmModal.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{confirmModal.message}</p>
                </div>
                <div className="flex gap-3 pt-8">
                  <NeonButton 
                    variant="danger" 
                    className="flex-1 py-2.5 text-[10px] uppercase tracking-widest"
                    onClick={confirmModal.onConfirm}
                  >
                    Confirm Action
                  </NeonButton>
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                    className="flex-1 px-4 py-2.5 bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/10 transition-all border border-white/10"
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

function MemberActivityModal({ 
  email, 
  onClose, 
  memberName, 
  projects,
  onNavigate 
}: { 
  email: string | null, 
  onClose: () => void, 
  memberName: string,
  projects: Project[],
  onNavigate: (projId: string) => void
}) {
  const { activity, loading } = useMemberActivity(email);
  const [tasks, setTasks] = useState<Record<string, string>>({});
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    async function fetchTaskNames() {
      if (activity.length === 0) return;
      
      const taskIds = Array.from(new Set(activity.map(j => j.taskId).filter(Boolean)));
      if (taskIds.length === 0) return;

      setLoadingTasks(true);
      try {
        // Fetch tasks in chunks (Firestore 'in' query limit is 30 in some versions, usually 10 for in)
        // Since we have up to 50 jobs, we might have many tasks.
        // Let's just fetch them.
        const taskNames: Record<string, string> = {};
        
        // Chunking for Firestore 'in' limitation
        const chunkSize = 10;
        for (let i = 0; i < taskIds.length; i += chunkSize) {
          const chunk = taskIds.slice(i, i + chunkSize);
          const q = query(collection(db, 'tasks'), where('__name__', 'in', chunk));
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
            taskNames[doc.id] = doc.data().title;
          });
        }
        setTasks(prev => ({ ...prev, ...taskNames }));
      } catch (err) {
        console.error("Error fetching task names:", err);
      } finally {
        setLoadingTasks(false);
      }
    }

    if (email) {
      fetchTaskNames();
    }
  }, [activity, email]);

  return (
    <AnimatePresence>
      {email && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }} 
            className="w-full max-w-2xl max-h-[85vh] flex flex-col"
          >
            <GlassCard className="flex-1 flex flex-col p-6 md:p-8 bg-[#0a0a0a] border-white/20 shadow-2xl overflow-hidden" hover={false}>
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Activity className="text-black" size={20} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">Protocol Logs</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Synchronizing activity for {memberName}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-[300px] scrollbar-hide">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Retrieving Neural Logs...</p>
                  </div>
                ) : activity.length > 0 ? (
                  activity.map((job) => {
                    const project = projects.find(p => p.id === job.projectId);
                    const taskName = tasks[job.taskId] || 'Loading...';

                    return (
                      <div key={job.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-white/[0.05] transition-all relative">
                        <div className="flex items-start gap-4 flex-1">
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
                              "w-2 h-2 rounded-full mt-1.5 shrink-0",
                              job.status === 'Completed' ? "bg-emerald-500" : 
                              job.status === 'In Progress' ? "bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.6)]" : "bg-purple-500"
                            )} 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-white truncate">{job.title}</p>
                              <span className={cn(
                                "text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-widest",
                                job.status === 'Completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                                job.status === 'In Progress' ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                              )}>
                                {job.status}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-y-1 gap-x-3">
                              <span className="flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase tracking-tight">
                                <Folder size={10} className="text-cyan-500/50" /> {project?.name || 'Unknown Sector'}
                              </span>
                              <ChevronRight size={8} className="text-slate-700 hidden xs:block" />
                              <span className="flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase tracking-tight">
                                <Layers size={10} className="text-purple-500/50" /> {taskName}
                              </span>
                              <span className="flex items-center gap-1 text-[9px] text-slate-600 font-bold ml-auto sm:ml-0">
                                <Clock size={10} /> {format(job.addingDate.toDate(), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => onNavigate(job.projectId)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-cyan-400 transition-all flex items-center justify-center gap-2 shrink-0 group/nav"
                        >
                          Navigate <ExternalLink size={10} className="group-hover/nav:translate-x-0.5 group-hover/nav:-translate-y-0.5 transition-transform" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-slate-500 text-sm">No protocol activity logs found for this operative.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 flex justify-end shrink-0">
                <button 
                  onClick={onClose}
                  className="px-6 py-2 bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all border border-white/10"
                >
                  Close Logs
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
