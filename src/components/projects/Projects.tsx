import React, { useState } from 'react';
import { 
  useProjects, 
  useProjectHierarchy, 
  createProject, 
  updateProject,
  deleteProject,
  addTask, 
  updateTask,
  deleteTask,
  addJob,
  updateJob,
  deleteJob,
  updateJobStatus,
  useMembers,
  useCurrentUserRole
} from '../../services/projectData';
import { GlassCard, NeonButton } from '../ui/Glassmorphism';
import { 
  Plus, 
  Folder, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  User as UserIcon,
  ChevronRight,
  TrendingUp,
  Clock,
  ExternalLink,
  Loader2,
  Briefcase,
  Edit3,
  Trash2,
  Archive,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Project, Task, Job, Status } from '../../types';
import { cn } from '../../lib/utils';
import { useNavigation } from '../../context/NavigationContext';

const StatusIndicator = ({ status }: { status: string }) => {
  const styles = {
    'New': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'In Progress': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse shadow-[0_0_10px_#22d3ee]',
    'Completed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_#10b981]',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${styles[status as keyof typeof styles]}`}>
      {status}
    </span>
  );
};

export default function Projects({ 
  selectedProjectId, 
  setSelectedProjectId 
}: { 
  selectedProjectId: string | null; 
  setSelectedProjectId: (id: string | null) => void; 
}) {
  const { projects, loading: projectsLoading } = useProjects();
  const { members } = useMembers();
  const { tasks, jobs, loading: hierarchyLoading } = useProjectHierarchy(selectedProjectId);
  const { focusedJob, clearFocus } = useNavigation();
  const { role } = useCurrentUserRole();
  
  const canAddItems = role === 'Global Admin' || role === 'Admin';
  const canAssignJobs = role === 'Global Admin' || role === 'Admin' || role === 'Manager';
  
  const [showArchived, setShowArchived] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  
  const [showNewTask, setShowNewTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  
  const [showNewJob, setShowNewJob] = useState<string | null>(null); // taskId
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [newJobData, setNewJobData] = useState({
    title: '',
    addingDate: format(new Date(), "yyyy-MM-dd"),
    finishingDate: '',
    assignedTo: ''
  });

  const displayedProjects = projects.filter(p => showArchived || !p.archived);
  const displayedTasks = tasks.filter(t => showArchived || !t.archived);

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

  React.useEffect(() => {
    if (focusedJob && focusedJob.projectId === selectedProjectId && tasks.length > 0) {
      const taskExists = tasks.some(t => t.id === focusedJob.taskId);
      if (taskExists) {
        // Auto expand the task
        setExpandedTasks(prev => {
          if (prev[focusedJob.taskId]) return prev;
          return { ...prev, [focusedJob.taskId]: true };
        });
        
        // Scroll to the job after a short delay to allow for expansion animation
        const scrollTimer = setTimeout(() => {
          const element = document.getElementById(`job-${focusedJob.jobId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 800);

        return () => clearTimeout(scrollTimer);
      }
    }
  }, [focusedJob, selectedProjectId, tasks]);

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newState = { ...prev, [taskId]: !prev[taskId] };
      // If we're manually toggling and it's the focused task, we might want to keep it? 
      // But user intent usually wins.
      return newState;
    });
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    if (editingProject) {
      await updateProject(editingProject.id, { name: newProjectName });
    } else {
      await createProject(newProjectName);
    }
    setNewProjectName('');
    setShowNewProject(false);
    setEditingProject(null);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newTaskTitle.trim()) return;
    if (editingTask) {
      await updateTask(editingTask.id, { title: newTaskTitle });
    } else {
      await addTask(selectedProjectId, newTaskTitle);
    }
    setNewTaskTitle('');
    setShowNewTask(false);
    setEditingTask(null);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || (!showNewJob && !editingJob)) return;
    
    const assignedToArr = typeof newJobData.assignedTo === 'string' 
      ? newJobData.assignedTo.split(',').map(s => s.trim()).filter(Boolean)
      : newJobData.assignedTo;

    const jobData: any = {
      title: newJobData.title,
      addingDate: Timestamp.fromDate(new Date(newJobData.addingDate)),
      assignedTo: assignedToArr,
      status: editingJob ? editingJob.status : 'New' as Status,
    };

    if (newJobData.finishingDate) {
      jobData.finishingDate = Timestamp.fromDate(new Date(newJobData.finishingDate));
    }

    if (editingJob) {
      await updateJob(editingJob.id, jobData);
    } else {
      await addJob({
        ...jobData,
        taskId: showNewJob!,
        projectId: selectedProjectId,
      });
    }
    
    setShowNewJob(null);
    setEditingJob(null);
    setNewJobData({ title: '', addingDate: format(new Date(), "yyyy-MM-dd"), finishingDate: '', assignedTo: '' });
  };

  const startEditingProject = (p: Project) => {
    setEditingProject(p);
    setNewProjectName(p.name);
    setShowNewProject(true);
  };

  const startEditingTask = (t: Task) => {
    setEditingTask(t);
    setNewTaskTitle(t.title);
    setShowNewTask(true);
  };

  const startEditingJob = (j: Job) => {
    setEditingJob(j);
    setNewJobData({
      title: j.title,
      addingDate: format(j.addingDate.toDate(), "yyyy-MM-dd"),
      finishingDate: j.finishingDate ? format(j.finishingDate.toDate(), "yyyy-MM-dd") : '',
      assignedTo: j.assignedTo.join(', ')
    });
    setShowNewJob(j.taskId);
  };

  const handleArchiveProject = (p: Project) => {
    const action = p.archived ? 'Restore' : 'Archive';
    setConfirmModal({
      show: true,
      title: `${action} Project`,
      message: `Are you sure you want to ${action.toLowerCase()} project "${p.name}"?`,
      type: 'warning',
      onConfirm: async () => {
        await updateProject(p.id, { archived: !p.archived });
        if (!p.archived && selectedProjectId === p.id) setSelectedProjectId(null);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleDeleteProject = (p: Project) => {
    setConfirmModal({
      show: true,
      title: 'Delete Project',
      message: `Are you sure you want to delete project "${p.name}"? This action is irreversible.`,
      type: 'danger',
      onConfirm: async () => {
        await deleteProject(p.id);
        if (selectedProjectId === p.id) setSelectedProjectId(null);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleArchiveTask = (t: Task) => {
    const action = t.archived ? 'Restore' : 'Archive';
    setConfirmModal({
      show: true,
      title: `${action} Task`,
      message: `Are you sure you want to ${action.toLowerCase()} task "${t.title}"?`,
      type: 'warning',
      onConfirm: async () => {
        await updateTask(t.id, { archived: !t.archived });
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleDeleteTask = (t: Task) => {
    setConfirmModal({
      show: true,
      title: 'Delete Task',
      message: `Are you sure you want to delete task "${t.title}"?`,
      type: 'danger',
      onConfirm: async () => {
        await deleteTask(t.id);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleDeleteJob = (j: Job) => {
    setConfirmModal({
      show: true,
      title: 'Delete Job',
      message: `Are you sure you want to delete job "${j.title}"?`,
      type: 'danger',
      onConfirm: async () => {
        await deleteJob(j.id);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8 h-full min-h-[700px]">
      {/* Projects Sidebar */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Project Repository</h3>
            {canAddItems && (
              <button 
                onClick={() => setShowNewProject(true)}
                className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-cyan-400 border border-white/5"
              >
                <Plus size={18} />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
            <label className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-colors group flex-1">
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

            {/* Mobile/Tablet Project Select */}
            <div className="lg:hidden flex-1">
              <select 
                value={selectedProjectId || ''} 
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="" className="bg-[#050505]">Select Project...</option>
                {displayedProjects.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#050505]">{p.name} {p.archived ? '(Archived)' : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 flex-col gap-2 overflow-y-auto pr-2 max-h-[calc(100vh-350px)]">
          {projectsLoading ? (
             <div className="flex justify-center p-10"><Loader2 className="animate-spin text-cyan-500" /></div>
          ) : (
            displayedProjects.map(p => (
              <div 
                key={p.id}
                className={cn(
                  "group relative w-full rounded-xl border transition-all duration-300",
                  selectedProjectId === p.id 
                    ? "bg-white/5 border-white/10 shadow-lg" 
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]",
                  p.archived && "opacity-50 grayscale-[0.5]"
                )}
              >
                <button
                  onClick={() => setSelectedProjectId(p.id)}
                  className="w-full text-left p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <Folder size={16} className={cn(selectedProjectId === p.id ? "text-cyan-400" : "text-slate-600 group-hover:text-cyan-400")} />
                    <span className={cn("font-semibold text-sm truncate pr-16", selectedProjectId === p.id ? "text-white" : "group-hover:text-white")}>
                      {p.name}
                      {p.archived && <span className="ml-2 text-[8px] px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded uppercase">Archived</span>}
                    </span>
                  </div>
                </button>
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canAddItems && (
                    <>
                      <button onClick={() => startEditingProject(p)} className="p-1 hover:text-cyan-400 text-slate-600"><Edit3 size={14} /></button>
                      <button onClick={() => handleArchiveProject(p)} className={cn("p-1 text-slate-600", p.archived ? "hover:text-cyan-400" : "hover:text-amber-400")} title={p.archived ? "Restore Protocol" : "Archive Protocol"}>
                        {p.archived ? <X size={14} /> : <Archive size={14} />}
                      </button>
                      <button onClick={() => handleDeleteProject(p)} className="p-1 hover:text-red-400 text-slate-600"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Hierarchy View */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          {selectedProjectId ? (
            <motion.div 
              key={selectedProjectId}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Active Task Hierarchy</h3>
                {canAddItems && (
                  <NeonButton variant="cyan" onClick={() => setShowNewTask(true)} className="py-1.5 flex items-center gap-2">
                    <Plus size={16} /> New Task
                  </NeonButton>
                )}
              </div>

              {hierarchyLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin text-cyan-500" size={40} /></div>
              ) : (
                <div className="space-y-8 pb-20">
                  {displayedTasks.length === 0 && (
                    <GlassCard className="flex flex-col items-center justify-center p-20 text-center text-slate-500 bg-white/[0.01]">
                      <Circle size={48} className="mb-4 opacity-10" />
                      <p className="text-lg">GreenByte is currently quiescent.</p>
                      <p className="text-[10px] uppercase font-bold tracking-widest mt-2">Initialize new task thread to begin data stream.</p>
                    </GlassCard>
                  )}
                  {displayedTasks.map(task => (
                    <div key={task.id} className={cn("space-y-4 group/task", task.archived && "opacity-60 grayscale-[0.3]")}>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <div 
                          className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 cursor-pointer group/task-header"
                          onClick={() => toggleTaskExpansion(task.id)}
                        >
                          <div className="w-6 h-6 flex items-center justify-center rounded group-hover/task-header:bg-white/5 text-slate-400 transition-colors">
                            {expandedTasks[task.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                          <div className={cn(
                            "hidden sm:block w-0.5 h-6 transition-all duration-500 group-hover:h-8 shadow-[0_0_10px_rgba(34,211,238,0.5)]",
                            task.archived ? "bg-slate-700" : "bg-cyan-500"
                          )} />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg md:text-xl font-bold text-white tracking-tight truncate group-hover/task-header:text-cyan-400 transition-colors">
                              {task.title}
                            </h4>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Task Protocol Block</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover/task:opacity-100 transition-opacity ml-auto sm:ml-0">
                          {canAddItems && (
                            <>
                              <button onClick={() => startEditingTask(task)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"><Edit3 size={16} /></button>
                              <button onClick={() => handleArchiveTask(task)} className={cn("p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors", task.archived ? "hover:text-cyan-400" : "hover:text-amber-400")} title={task.archived ? "Restore Protocol" : "Archive Protocol"}>
                                {task.archived ? <X size={16} /> : <Archive size={16} />}
                              </button>
                              <button onClick={() => handleDeleteTask(task)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                              {!task.archived && (
                                <button 
                                  onClick={() => {
                                    setEditingJob(null);
                                    setNewJobData({ title: '', addingDate: format(new Date(), "yyyy-MM-dd"), finishingDate: '', assignedTo: '' });
                                    setShowNewJob(task.id);
                                  }}
                                  className="ml-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-cyan-400 flex items-center gap-2 transition-all"
                                >
                                  <Plus size={12} /> Inject Job
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {expandedTasks[task.id] && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid grid-cols-1 gap-4 pl-4"
                        >
                          {jobs.filter(j => j.taskId === task.id).map(job => (
                            <div 
                              key={job.id} 
                              id={`job-${job.id}`}
                              className={cn(
                                "bg-[#111] border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-white/10 hover:shadow-xl group/job relative",
                                focusedJob?.jobId === job.id 
                                  ? "border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)] bg-cyan-500/5 scale-[1.02] ring-2 ring-cyan-500/50 z-10" 
                                  : "border-white/5"
                              )}
                            >
                              {focusedJob?.jobId === job.id && (
                                <div className="absolute inset-0 bg-cyan-500/5 animate-pulse rounded-2xl pointer-events-none" />
                              )}
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                  <StatusIndicator status={job.status} />
                                  <h5 className="font-semibold text-lg text-white group-hover/job:text-cyan-100 transition-colors truncate max-w-[150px] sm:max-w-none" title={job.title}>{job.title}</h5>
                                  {focusedJob?.jobId === job.id && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); clearFocus(); }}
                                      className="p-1 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 rounded-lg transition-colors border border-cyan-500/30 ml-2"
                                      title="Clear focus"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                  <span>Process Node: {task.title}</span>
                                  <span className="flex items-center gap-1"><Clock size={10} className="text-cyan-500" /> Added: {format(job.addingDate.toDate(), 'MMM dd, yyyy')}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                                <div className="text-left md:text-right min-w-[max-content] group/date flex flex-col items-start md:items-end">
                                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1 text-emerald-400/80 group-hover/date:text-emerald-400 transition-colors">Finishing Date</p>
                                  <div className="relative flex items-center gap-2">
                                    {job.finishingDate && (
                                      <span className="text-xs font-mono text-white/60">{format(job.finishingDate.toDate(), 'MMM dd, yyyy')}</span>
                                    )}
                                    <div className={cn(
                                      "relative w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 transition-colors group-hover/date:bg-white/10",
                                      canAddItems ? "hover:border-cyan-500/50 cursor-pointer" : "cursor-default"
                                    )} title={job.finishingDate ? format(job.finishingDate.toDate(), 'MMM dd, yyyy') : 'Finishing date'}>
                                      <Calendar size={14} className={cn("transition-colors", job.finishingDate ? "text-cyan-500" : "text-slate-500")} />
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
                                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider outline-none focus:border-cyan-500 transition-all cursor-pointer text-slate-400 hover:text-white"
                                  >
                                    <option value="New" className="bg-[#050505]">New</option>
                                    <option value="In Progress" className="bg-[#050505]">In Progress</option>
                                    <option value="Completed" className="bg-[#050505]">Completed</option>
                                  </select>

                                  <div className="flex items-center gap-1 opacity-0 group-hover/job:opacity-100 transition-opacity">
                                    {canAddItems && (
                                      <>
                                        <button onClick={() => startEditingJob(job)} className="p-2 hover:bg-white/5 rounded-lg text-slate-600 hover:text-cyan-400"><Edit3 size={14} /></button>
                                        <button onClick={() => handleDeleteJob(job)} className="p-2 hover:bg-white/5 rounded-lg text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 rounded-3xl border border-white/5 bg-white/[0.01]">
              <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                <Briefcase size={48} className="text-cyan-500 opacity-20" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Quiescent GreenByte</h3>
              <p className="text-slate-500 max-w-sm">Select a project repository from the sector repository or initialize a new neural stream.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNewProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-md">
              <GlassCard className="p-10 bg-[#0a0a0a] border-white/20 shadow-2xl" hover={false}>
                <h3 className="text-2xl font-bold text-white mb-8 tracking-tight">{editingProject ? 'Project Modification' : 'Project Initialization'}</h3>
                <form onSubmit={handleCreateProject} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Unique Identifier</label>
                    <input 
                      autoFocus
                      required
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="e.g. HYPERION_REDESIGN"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all text-white font-mono"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <NeonButton type="submit" variant="cyan" className="flex-1 py-3 text-xs uppercase tracking-widest">{editingProject ? 'UPDATE' : 'AUTHORIZE'}</NeonButton>
                    <button type="button" onClick={() => setShowNewProject(false)} className="px-6 rounded-full hover:bg-white/5 transition-colors text-[10px] font-bold uppercase tracking-widest text-slate-500">Abort</button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {showNewTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-md">
              <GlassCard className="p-10 bg-[#0a0a0a] border-white/20 shadow-2xl" hover={false}>
                <h3 className="text-2xl font-bold text-white mb-8 tracking-tight">{editingTask ? 'Task Stream Update' : 'Task Sequence Entry'}</h3>
                <form onSubmit={handleCreateTask} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Protocol Name</label>
                    <input 
                      autoFocus
                      required
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="e.g. NEURAL_ENGINE_OPS"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all text-white font-mono"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <NeonButton type="submit" variant="cyan" className="flex-1 py-3 text-xs uppercase tracking-widest">{editingTask ? 'SYNC UPDATE' : 'SYNC PROTOCOL'}</NeonButton>
                    <button type="button" onClick={() => setShowNewTask(false)} className="px-6 rounded-full hover:bg-white/5 transition-colors text-[10px] font-bold uppercase tracking-widest text-slate-500">Cancel</button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {showNewJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-lg">
              <GlassCard className="p-10 bg-[#0a0a0a] border-white/20 shadow-2xl" hover={false}>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    {editingJob ? <Edit3 className="text-black" size={20} /> : <Plus className="text-black" size={24} />}
                  </div>
                  <h3 className="text-2xl font-bold text-white">{editingJob ? 'Job Parameter Modification' : 'Neural Job Specification'}</h3>
                </div>
                <form onSubmit={handleCreateJob} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Node Function</label>
                    <input 
                      autoFocus
                      required
                      value={newJobData.title}
                      onChange={(e) => setNewJobData({ ...newJobData, title: e.target.value })}
                      placeholder="e.g. Latency Optimization"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 outline-none focus:border-cyan-500 transition-all text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Activation Date</label>
                       <input 
                          type="date"
                          required
                          value={newJobData.addingDate}
                          onChange={(e) => setNewJobData({ ...newJobData, addingDate: e.target.value })}
                          className="[color-scheme:dark] w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 outline-none focus:border-cyan-500 transition-all text-white text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Finishing Date</label>
                       <input 
                          type="date"
                          value={newJobData.finishingDate}
                          onChange={(e) => setNewJobData({ ...newJobData, finishingDate: e.target.value })}
                          className="[color-scheme:dark] w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 outline-none focus:border-cyan-500 transition-all text-white text-sm"
                        />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Assigned Operative</label>
                    <select 
                      value={typeof newJobData.assignedTo === 'string' ? newJobData.assignedTo : (newJobData.assignedTo?.[0] || '')}
                      onChange={(e) => {
                        setNewJobData({ ...newJobData, assignedTo: e.target.value });
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 outline-none focus:border-cyan-500 transition-all text-white text-sm"
                    >
                      <option value="">Unassigned</option>
                      {members.map(member => (
                        <option key={member.id} value={member.email} className="bg-[#050505]">{member.name} ({member.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-4 pt-6">
                    <NeonButton type="submit" variant="cyan" className="flex-1 py-3 text-xs uppercase tracking-[0.2em]">{editingJob ? 'RE-DEPLOY' : 'Deploy Job'}</NeonButton>
                    <button type="button" onClick={() => { setShowNewJob(null); setEditingJob(null); }} className="px-6 rounded-full hover:bg-white/5 transition-colors text-[10px] font-bold uppercase tracking-widest text-slate-500">Force Abort</button>
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
                    {confirmModal.type === 'danger' ? <Trash2 size={24} /> : <Archive size={24} />}
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
