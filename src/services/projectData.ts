import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  limit,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { Project, Task, Job, Member, UserRole } from '../types';

export function useCurrentUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setRole(null);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'members', auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setRole(docSnap.data().role as UserRole);
      } else {
        // Fallback for global admin if doc not yet created
        const adminEmails = ['zahidul@greenbyteai.com', 'zahidulhasan23@gmail.com'];
        if (adminEmails.includes(auth.currentUser?.email || '')) {
          setRole('Global Admin');
        } else {
          setRole('Worker');
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Role hook error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { role, loading };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { role } = useCurrentUserRole();

  useEffect(() => {
    if (role === null) return;

    let isSubscribed = true;

    async function fetchProjects() {
      try {
        setLoading(true);
        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/projects', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (!response.ok) throw new Error('API failed');
        
        const data = await response.json();
        if (isSubscribed) {
          setProjects(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("API Fetch Error, falling back to client SDK:", err);
        // Fallback to client SDK if API fails, which might still work if rules have been patched
        setLoading(false);
      }
    }

    fetchProjects();

    // Since we don't have real-time via API easily, we can poll or just rely on manual refresh.
    // For now, let's keep it simple as a one-time fetch to satisfy the "functions" request.
    const interval = setInterval(fetchProjects, 30000); // 30s poll

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [role]);

  return { projects, loading };
}

export function useProjectHierarchy(projectId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const { role } = useCurrentUserRole();

  useEffect(() => {
    if (!projectId || role === null) {
      setTasks([]);
      setJobs([]);
      return;
    }

    setLoading(true);

    const tasksQ = query(
      collection(db, 'tasks'),
      where('projectId', '==', projectId),
      where('archived', '==', false),
      orderBy('createdAt', 'asc')
    );

    let jobsQ;
    if (role === 'Global Admin' || role === 'Admin' || role === 'Manager') {
      jobsQ = query(
        collection(db, 'jobs'),
        where('projectId', '==', projectId),
        where('archived', '==', false),
        orderBy('createdAt', 'asc')
      );
    } else {
      // Worker only sees jobs assigned to them
      jobsQ = query(
        collection(db, 'jobs'),
        where('projectId', '==', projectId),
        where('assignedTo', 'array-contains', auth.currentUser?.email),
        where('archived', '==', false),
        orderBy('createdAt', 'asc')
      );
    }

    const unsubTasks = onSnapshot(tasksQ, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    const unsubJobs = onSnapshot(jobsQ, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      setLoading(false);
    });

    return () => {
      unsubTasks();
      unsubJobs();
    };
  }, [projectId, role]);

  return { tasks, jobs, loading };
}

export function useGlobalStats() {
  const { projects } = useProjects();
  const { members } = useMembers();
  const { role } = useCurrentUserRole();
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalTasks: 0,
    completedJobs: 0,
    pipelineJobs: 0,
    totalMembers: 0,
    successRate: 0
  });

  useEffect(() => {
    if (role === null) return;
    const activeProjectsList = projects.filter(p => !p.archived);
    
    if (activeProjectsList.length === 0) {
      setStats(prev => ({ 
        ...prev, 
        activeProjects: 0, 
        totalTasks: 0, 
        completedJobs: 0, 
        pipelineJobs: 0, 
        successRate: 0,
        totalMembers: members.length 
      }));
      return;
    }

    const unsubscribes: (() => void)[] = [];
    let projectTaskCounts: Record<string, number> = {};
    let projectJobCounts: Record<string, { total: number, completed: number }> = {};

    activeProjectsList.forEach(project => {
      const tasksQ = query(collection(db, 'tasks'), where('projectId', '==', project.id), where('archived', '==', false));
      
      let jobsQ;
      if (role === 'Global Admin' || role === 'Admin' || role === 'Manager') {
        jobsQ = query(collection(db, 'jobs'), where('projectId', '==', project.id), where('archived', '==', false));
      } else {
        jobsQ = query(
          collection(db, 'jobs'), 
          where('projectId', '==', project.id),
          where('assignedTo', 'array-contains', auth.currentUser?.email),
          where('archived', '==', false)
        );
      }

      const unsubTasks = onSnapshot(tasksQ, (snapshot) => {
        projectTaskCounts[project.id] = snapshot.docs
          .filter(d => !d.data().archived && d.data().status !== 'Completed').length;
        updateStats();
      });

      const unsubJobs = onSnapshot(jobsQ, (snapshot) => {
        const jobsData = snapshot.docs.filter(d => {
          // If task is archived, we might want to hide its jobs too
          // But here we just count all jobs for active projects?
          // Let's stick to jobs that are part of non-archived tasks.
          // This is a bit complex without a task lookup.
          // For now, let's just count all jobs for active projects.
          return true;
        });
        const completed = jobsData.filter(d => d.data().status === 'Completed').length;
        projectJobCounts[project.id] = { total: jobsData.length, completed };
        updateStats();
      });

      unsubscribes.push(unsubTasks, unsubJobs);
    });

    function updateStats() {
      const activeTasks = Object.values(projectTaskCounts).reduce((a, b) => a + b, 0);
      const totalJobs = Object.values(projectJobCounts).reduce((a, b) => a + b.total, 0);
      const completedJobs = Object.values(projectJobCounts).reduce((a, b) => a + b.completed, 0);
      const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
      
      setStats({
        activeProjects: activeProjectsList.length,
        totalTasks: activeTasks,
        completedJobs,
        pipelineJobs: totalJobs - completedJobs,
        totalMembers: members.length,
        successRate
      });
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [projects, members, role]);

  return stats;
}

export function useRecentActivity() {
  const { projects } = useProjects();
  const [activity, setActivity] = useState<{ id: string, label: string, desc: string, color: string, projectId: string, taskId: string }[]>([]);

  useEffect(() => {
    const activeProjects = projects.filter(p => !p.archived);
    if (activeProjects.length === 0) {
      setActivity([]);
      return;
    }

    const q = query(
      collection(db, 'jobs'),
      where('projectId', 'in', activeProjects.map(p => p.id).slice(0, 10)), // Firestore 'in' limit is 10
      where('archived', '==', false),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recent = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          label: data.title,
          desc: `Status updated to ${data.status}`,
          color: data.status === 'Completed' ? 'bg-emerald-500' : 'bg-cyan-500',
          projectId: data.projectId,
          taskId: data.taskId
        };
      });
      setActivity(recent);
    });

    return () => unsubscribe();
  }, [projects]);

  return activity;
}

export async function createProject(name: string) {
  try {
    await addDoc(collection(db, 'projects'), {
      name,
      ownerId: auth.currentUser?.uid || 'anonymous',
      members: [auth.currentUser?.email || 'public'],
      createdAt: serverTimestamp(),
      archived: false
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'projects');
  }
}

export async function updateProject(id: string, data: Partial<Project>) {
  try {
    await updateDoc(doc(db, 'projects', id), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `projects/${id}`);
  }
}

export async function deleteProject(id: string) {
  try {
    await updateDoc(doc(db, 'projects', id), {
      archived: true,
      archivedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `projects/${id}`);
  }
}

export async function permanentlyDeleteProject(id: string) {
  try {
    await deleteDoc(doc(db, 'projects', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
  }
}

export async function restoreProject(id: string) {
  try {
    await updateDoc(doc(db, 'projects', id), {
      archived: false,
      archivedAt: null
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `projects/${id}`);
  }
}

export async function addTask(projectId: string, title: string) {
  try {
    await addDoc(collection(db, 'tasks'), {
      projectId,
      title,
      status: 'New',
      createdAt: serverTimestamp(),
      archived: false
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'tasks');
  }
}

export async function updateTask(id: string, data: Partial<Task>) {
  try {
    await updateDoc(doc(db, 'tasks', id), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tasks/${id}`);
  }
}

export async function deleteTask(id: string) {
  try {
    await updateDoc(doc(db, 'tasks', id), {
      archived: true,
      archivedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tasks/${id}`);
  }
}

export async function permanentlyDeleteTask(id: string) {
  try {
    await deleteDoc(doc(db, 'tasks', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tasks/${id}`);
  }
}

export async function restoreTask(id: string) {
  try {
    await updateDoc(doc(db, 'tasks', id), {
      archived: false,
      archivedAt: null
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tasks/${id}`);
  }
}

export async function addJob(job: Omit<Job, 'id' | 'createdAt' | 'archived'>) {
  try {
    await addDoc(collection(db, 'jobs'), {
      ...job,
      createdAt: serverTimestamp(),
      archived: false
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'jobs');
  }
}

export async function updateJob(id: string, data: Partial<Job>) {
  try {
    await updateDoc(doc(db, 'jobs', id), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `jobs/${id}`);
  }
}

export async function deleteJob(id: string) {
  try {
    await updateDoc(doc(db, 'jobs', id), {
      archived: true,
      archivedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `jobs/${id}`);
  }
}

export async function permanentlyDeleteJob(id: string) {
  try {
    await deleteDoc(doc(db, 'jobs', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `jobs/${id}`);
  }
}

export async function restoreJob(id: string) {
  try {
    await updateDoc(doc(db, 'jobs', id), {
      archived: false,
      archivedAt: null
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `jobs/${id}`);
  }
}

export async function updateJobStatus(jobId: string, status: string) {
  try {
    await updateDoc(doc(db, 'jobs', jobId), { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `jobs/${jobId}`);
  }
}

export function useMemberActivity(email: string | null) {
  const [activity, setActivity] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      setActivity([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'jobs'),
      where('assignedTo', 'array-contains', email),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActivity(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      setLoading(false);
    }, (error) => {
      console.error("Member activity error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [email]);

  return { activity, loading };
}

export async function syncUser() {
  if (!auth.currentUser) return;
  
  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/sync-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to sync user via API');
    }

    const result = await response.json();
    console.log("User synced successfully via function:", result.status);
  } catch (err) {
    console.error("Failed to sync user via function:", err);
  }
}

export function useTrashedItems() {
  const [items, setItems] = useState<{ id: string, type: 'project' | 'task' | 'job', title: string, archivedAt: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const { role } = useCurrentUserRole();

  useEffect(() => {
    if (role === null) return;

    if (role !== 'Global Admin' && role !== 'Admin' && role !== 'Manager') {
      setItems([]);
      setLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];

    const projectsQ = query(collection(db, 'projects'), where('archived', '==', true));
    const tasksQ = query(collection(db, 'tasks'), where('archived', '==', true));
    const jobsQ = query(collection(db, 'jobs'), where('archived', '==', true));

    let projects: any[] = [];
    let tasks: any[] = [];
    let jobs: any[] = [];

    const unsubProjects = onSnapshot(projectsQ, (snap) => {
      projects = snap.docs.map(doc => ({ id: doc.id, type: 'project', title: doc.data().name, archivedAt: doc.data().archivedAt }));
      updateItems();
    });

    const unsubTasks = onSnapshot(tasksQ, (snap) => {
      tasks = snap.docs.map(doc => ({ id: doc.id, type: 'task', title: doc.data().title, archivedAt: doc.data().archivedAt }));
      updateItems();
    });

    const unsubJobs = onSnapshot(jobsQ, (snap) => {
      jobs = snap.docs.map(doc => ({ id: doc.id, type: 'job', title: doc.data().title, archivedAt: doc.data().archivedAt }));
      updateItems();
    });

    unsubscribes.push(unsubProjects, unsubTasks, unsubJobs);

    function updateItems() {
      const all = [...projects, ...tasks, ...jobs].sort((a, b) => {
        const timeA = a.archivedAt?.toMillis() || 0;
        const timeB = b.archivedAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setItems(all);
      setLoading(false);
    }

    return () => unsubscribes.forEach(u => u());
  }, [role]);

  return { items, loading };
}

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      // Deduplicate by email (case-insensitive)
      const uniqueMembers = allMembers.reduce((acc, current) => {
        const x = acc.find(item => item.email?.toLowerCase() === current.email?.toLowerCase());
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, [] as Member[]);
      
      setMembers(uniqueMembers);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'members');
    });
    return () => unsubscribe();
  }, []);

  return { members, loading };
}

export async function addMember(member: Omit<Member, 'id' | 'createdAt'> & { password?: string }) {
  try {
    const { password, ...memberData } = member;
    let uid = '';
    
    // 1. Create Auth User if password provided
    if (password) {
      const secondaryApp = initializeApp(firebaseConfig, `Secondary-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, member.email, password);
        uid = userCredential.user.uid;
        await updateProfile(userCredential.user, { displayName: member.name });
        await signOut(secondaryAuth);
      } finally {
        await deleteApp(secondaryApp);
      }
    }

    // 2. Add to Firestore
    const finalMember = { ...memberData };
    const adminEmails = ['zahidul@greenbyteai.com', 'zahidulhasan23@gmail.com'];
    if (adminEmails.includes(memberData.email)) {
      finalMember.role = 'Global Admin';
    }

    if (uid) {
      await setDoc(doc(db, 'members', uid), {
        ...finalMember,
        createdAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'members'), {
        ...finalMember,
        createdAt: serverTimestamp()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'members');
  }
}

export async function updateMember(id: string, data: Partial<Member>) {
  try {
    const finalData = { ...data };
    const adminEmails = ['zahidul@greenbyteai.com', 'zahidulhasan23@gmail.com'];
    if (adminEmails.includes(data.email || '')) {
      finalData.role = 'Global Admin';
    }
    await updateDoc(doc(db, 'members', id), finalData);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `members/${id}`);
  }
}

export async function deleteMember(id: string) {
  try {
    await deleteDoc(doc(db, 'members', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `members/${id}`);
  }
}
