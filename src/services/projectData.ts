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
        const adminEmails = ['zahidul@greenbyteai.com'];
        const userEmail = auth.currentUser?.email?.toLowerCase() || '';
        if (adminEmails.some(e => e.toLowerCase() === userEmail)) {
          setRole('Global Admin');
        } else {
          setRole('Worker');
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Role hook error:", error);
      // Fallback role on error
      const adminEmails = ['zahidul@greenbyteai.com'];
      const userEmail = auth.currentUser?.email?.toLowerCase() || '';
      if (adminEmails.some(e => e.toLowerCase() === userEmail)) {
        setRole('Global Admin');
      } else {
        setRole('Worker');
      }
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
        
        // Fallback to client SDK
        const q = query(
          collection(db, 'projects'),
          where('archived', '==', false),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          if (isSubscribed) {
            setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
            setLoading(false);
          }
        }, (clientErr) => {
          console.error("Client SDK fallback error:", clientErr);
          if (isSubscribed) setLoading(false);
        });
        
        return () => unsubscribe();
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

    let isSubscribed = true;
    
    async function fetchData() {
      try {
        setLoading(true);
        const idToken = await auth.currentUser?.getIdToken();
        const headers = { 'Authorization': `Bearer ${idToken}` };
        
        const [tasksRes, jobsRes] = await Promise.all([
          fetch(`/api/tasks?projectId=${projectId}`, { headers }),
          fetch(`/api/jobs?projectId=${projectId}`, { headers })
        ]);

        if (tasksRes.ok && jobsRes.ok) {
          const [tasksData, jobsData] = await Promise.all([tasksRes.json(), jobsRes.json()]);
          if (isSubscribed) {
            setTasks(tasksData);
            setJobs(jobsData);
          }
        } else {
          throw new Error('API failed');
        }
      } catch (err) {
        console.error("Hierarchy API Error, falling back to client SDK:", err);
        
        // Fallback to client SDK
        const tasksQ = query(
          collection(db, 'tasks'),
          where('projectId', '==', projectId),
          where('archived', '==', false),
          orderBy('createdAt', 'asc')
        );
        
        let jobsQ;
        const userEmail = auth.currentUser?.email?.toLowerCase();
        if (['Global Admin', 'Admin', 'Manager'].includes(role || '')) {
          jobsQ = query(
            collection(db, 'jobs'),
            where('projectId', '==', projectId),
            where('archived', '==', false),
            orderBy('createdAt', 'asc')
          );
        } else {
          jobsQ = query(
            collection(db, 'jobs'),
            where('projectId', '==', projectId),
            where('assignedTo', 'array-contains', userEmail),
            where('archived', '==', false),
            orderBy('createdAt', 'asc')
          );
        }

        const unsubTasks = onSnapshot(tasksQ, (snap) => {
          if (isSubscribed) setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
        });

        const unsubJobs = onSnapshot(jobsQ, (snap) => {
          if (isSubscribed) setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
        });

        return () => {
          unsubTasks();
          unsubJobs();
        };
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [projectId, role]);

  return { tasks, jobs, loading };
}

export function useGlobalStats() {
  const { projects } = useProjects();
  const { members } = useMembers(); // Members hook already updated to use API
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
    
    let isSubscribed = true;
    async function fetchStats() {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/dashboard-stats', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (isSubscribed) setStats(data);
        } else {
          throw new Error('API failed');
        }
      } catch (err) {
        console.error("Stats API error, falling back to basic calculation:", err);
        // Simple local stats as fallback
        const projectsCount = projects.length;
        setStats(prev => ({
          ...prev,
          activeProjects: projectsCount,
          totalTasks: 0, // Hard to calculate without all data
          totalMembers: members.length
        }));
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // 1 min refresh
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [role]);

  return stats;
}

export function useRecentActivity() {
  const [activity, setActivity] = useState<{ id: string, label: string, desc: string, color: string, projectId: string, taskId: string }[]>([]);
  const { role } = useCurrentUserRole();

  useEffect(() => {
    if (role === null) return;
    let isSubscribed = true;
    async function fetchActivity() {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/recent-activity', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (isSubscribed) setActivity(data);
        }
      } catch (err) {
        console.error("Activity API error:", err);
      }
    }

    fetchActivity();
    const interval = setInterval(fetchActivity, 60000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [role]);

  // Client Side Fallback for Activity
  useEffect(() => {
    if (activity.length > 0 || role === null) return;
    
    let q;
    const userEmail = auth.currentUser?.email?.toLowerCase();
    
    if (['Global Admin', 'Admin', 'Manager'].includes(role)) {
      q = query(
        collection(db, 'jobs'),
        where('archived', '==', false),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
    } else {
      q = query(
        collection(db, 'jobs'),
        where('assignedTo', 'array-contains', userEmail),
        where('archived', '==', false),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      setActivity(snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          label: data.title,
          desc: `Status updated to ${data.status}`,
          color: data.status === 'Completed' ? 'bg-emerald-500' : 'bg-cyan-500',
          projectId: data.projectId,
          taskId: data.taskId
        };
      }));
    }, (err) => console.error("Client Activity Fallback Error:", err));

    return () => unsub();
  }, [role, activity.length]);

  return activity;
}

export async function createProject(name: string) {
  try {
    const userEmail = auth.currentUser?.email?.toLowerCase();
    await addDoc(collection(db, 'projects'), {
      name,
      ownerId: auth.currentUser?.uid || 'anonymous',
      members: [userEmail || 'public'],
      createdAt: serverTimestamp(),
      archived: false
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'projects');
  }
}

export async function updateProject(id: string, data: Partial<Project>) {
  try {
    const finalData = { ...data };
    if (data.members) {
      finalData.members = data.members.map(m => m.toLowerCase());
    }
    await updateDoc(doc(db, 'projects', id), finalData);
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
    const normalizedJob = {
      ...job,
      assignedTo: job.assignedTo?.map(e => e.toLowerCase()) || []
    };
    await addDoc(collection(db, 'jobs'), {
      ...normalizedJob,
      createdAt: serverTimestamp(),
      archived: false
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'jobs');
  }
}

export async function updateJob(id: string, data: Partial<Job>) {
  try {
    const finalData = { ...data };
    if (data.assignedTo) {
      finalData.assignedTo = data.assignedTo.map(e => e.toLowerCase());
    }
    await updateDoc(doc(db, 'jobs', id), finalData);
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
      throw new Error('API failed');
    }

    const result = await response.json();
    console.log("User synced successfully via function:", result.status);
  } catch (err) {
    console.error("Failed to sync user via function, falling back to client SDK sync:", err);
    
    // Client SDK Sync
    try {
      const { uid, email, displayName } = auth.currentUser;
      if (!email) return;

      const memberRef = doc(db, 'members', uid);
      const docSnap = await getDoc(memberRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data.uid || data.email !== email.toLowerCase()) {
          await updateDoc(memberRef, { uid, email: email.toLowerCase() });
        }
      } else {
        const adminEmails = ['zahidul@greenbyteai.com'];
        const isGlobalAdmin = adminEmails.some(ae => ae.toLowerCase() === email.toLowerCase());
        
        const memberData = {
          name: displayName || email.split('@')[0],
          email: email.toLowerCase(),
          role: isGlobalAdmin ? 'Global Admin' : 'Worker',
          createdAt: serverTimestamp(),
          uid: uid
        };
        
        await setDoc(memberRef, memberData, { merge: true });
        console.log("User synced via Client SDK successfully");
      }

      // Always ensure other admin exists if current user is admin
      const adminEmails = ['zahidul@greenbyteai.com'];
      if (adminEmails.some(ae => ae.toLowerCase() === email.toLowerCase())) {
        const otherAdminEmail = adminEmails.find(e => e.toLowerCase() !== email.toLowerCase());
        if (otherAdminEmail) {
          const q = query(collection(db, 'members'), where('email', '==', otherAdminEmail.toLowerCase()));
          const otherSnap = await getDocs(q).catch(() => null);
          if (otherSnap && otherSnap.empty) {
            await addDoc(collection(db, 'members'), {
              name: otherAdminEmail.split('@')[0],
              email: otherAdminEmail.toLowerCase(),
              role: 'Global Admin',
              createdAt: serverTimestamp(),
              uid: ''
            }).catch(e => console.error("Failed to seed other admin:", e));
          }
        }
      }
    } catch (clientErr) {
      console.error("Client SDK sync error:", clientErr);
    }
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

    let isSubscribed = true;
    async function fetchTrashed() {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/trashed-items', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (isSubscribed) setItems(data);
        }
      } catch (err) {
        console.error("Trashed items API error:", err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    fetchTrashed();
    const interval = setInterval(fetchTrashed, 60000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [role]);

  return { items, loading };
}

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;
    async function fetchMembers() {
      try {
        setLoading(true);
        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/members', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          const uniqueMembers = data.reduce((acc: any[], current: any) => {
            const x = acc.find(item => item.email?.toLowerCase() === current.email?.toLowerCase());
            if (!x) return acc.concat([current]);
            return acc;
          }, []);
          if (isSubscribed) {
            setMembers(uniqueMembers);
            setLoading(false);
          }
          return;
        }
        throw new Error('API failed');
      } catch (err) {
        console.error("Members API Error, falling back to client SDK:", err);
        
        // Fallback to client SDK
        const q = query(
          collection(db, 'members'),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
          // Deduplicate by email
          const uniqueMembers = data.reduce((acc: any[], current: any) => {
            const x = acc.find(item => item.email?.toLowerCase() === current.email?.toLowerCase());
            if (!x) return acc.concat([current]);
            return acc;
          }, []);
          
          if (isSubscribed) {
            setMembers(uniqueMembers);
            setLoading(false);
          }
        }, (clientErr) => {
          console.error("Members client fallback error:", clientErr);
          if (isSubscribed) setLoading(false);
        });
        
        return () => unsubscribe();
      }
    }

    fetchMembers();
    const interval = setInterval(fetchMembers, 60000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
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
    const adminEmails = ['zahidul@greenbyteai.com'];
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
    const adminEmails = ['zahidul@greenbyteai.com'];
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
