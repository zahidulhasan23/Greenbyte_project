import express from 'express';
import path from 'path';
import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

console.log('--- Server Starting ---');

async function startServer() {
  console.log('Server initialization function started');
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  let firebaseConfig: any;

  try {
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('Loaded firebase config for project:', firebaseConfig.projectId);
    } else {
      throw new Error('firebase-applet-config.json not found');
    }
  } catch (err) {
    console.error('CRITICAL: Failed to load firebase-applet-config.json', err);
    process.exit(1);
  }

  // Initialize Firebase Admin
  let currentApp: admin.app.App;
  try {
    if (admin.apps.length > 0) {
      await Promise.all(admin.apps.map(a => a?.delete().catch(() => {})));
    }
    
    // Force the project ID from the config
    currentApp = admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
    console.log('Admin App Initialized for Project:', currentApp.options.projectId);
  } catch (err) {
    console.error('Firebase Admin init error:', err);
    currentApp = admin.app();
  }

  // Target the specific database instance
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const db = getFirestore(currentApp, databaseId);
  const authAdmin = getAuth(currentApp);

  // Fallback Auth for audience mismatch
  const systemProject = 'ais-asia-southeast1-48b26cb9bc';
  const systemApp = admin.initializeApp({ projectId: systemProject }, 'system');
  const systemAuth = getAuth(systemApp);

  console.log('Final Admin App Project:', currentApp.options.projectId, 'Database:', databaseId);
  
  // API routes
  app.get('/api/health', async (req, res) => {
    let firestoreStatus = 'unknown';
    let dbDetails: any = {};
    try {
      const testDoc = db.collection('_health').doc('check');
      await testDoc.set({ lastCheck: FieldValue.serverTimestamp(), env: 'server' });
      firestoreStatus = 'ok';
      dbDetails.customDb = 'ok';
    } catch (e: any) {
      firestoreStatus = `error: ${e.message} (Code: ${e.code})`;
      console.error('HEALTH CHECK FAILED on custom DB:', e);
      dbDetails.customDb = e.message;
      
      try {
        const defaultDb = getFirestore(currentApp); // Try default
        await defaultDb.collection('_health').doc('check').set({ lastCheck: FieldValue.serverTimestamp(), db: 'default' });
        firestoreStatus += ' | (default) DB works!';
        dbDetails.defaultDb = 'ok';
      } catch (e2: any) {
        firestoreStatus += ` | (default) DB failed: ${e2.message}`;
        dbDetails.defaultDb = e2.message;
      }
    }

    res.json({ 
      status: 'ok', 
      firestore: firestoreStatus,
      dbDetails,
      projectId: currentApp.options.projectId,
      envProject: process.env.GOOGLE_CLOUD_PROJECT || 'not-set',
      databaseId: databaseId,
      time: new Date().toISOString()
    });
  });

  app.post('/api/sync-user', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      let decodedToken;
      try {
        decodedToken = await authAdmin.verifyIdToken(idToken);
      } catch (e: any) {
        console.warn('Primary verifyIdToken failed:', e.message);
        try {
          decodedToken = await systemAuth.verifyIdToken(idToken);
          console.log('System auth fallback worked.');
        } catch (e2: any) {
          console.error('System auth fallback failed:', e2.message);
          throw e; // throw original error
        }
      }
      
      const uid = decodedToken.uid;
      const email = decodedToken.email;

      console.log('Syncing user:', email, 'Project (Primary):', authAdmin.app.options.projectId);

      if (!email) {
        return res.status(400).json({ error: 'Email missing from token' });
      }

      const adminEmails = ['zahidul@greenbyteai.com'];
      const memberRef = db.collection('members').doc(uid);
      const doc = await memberRef.get();
      const normalizedEmail = email.toLowerCase();

      if (!doc.exists) {
        // Check for orphan by email
        const orphanQuery = await db.collection('members').where('email', '==', normalizedEmail).limit(1).get();
        let initialData: any = {
          name: decodedToken.name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          role: adminEmails.includes(normalizedEmail) ? 'Global Admin' : 'Worker',
          createdAt: FieldValue.serverTimestamp(),
          uid: uid
        };

        if (!orphanQuery.empty) {
          const orphan = orphanQuery.docs[0];
          initialData = {
            ...orphan.data(),
            uid: uid,
            createdAt: FieldValue.serverTimestamp()
          };
          if (orphan.id !== uid) {
            await orphan.ref.delete();
          }
        }

        await memberRef.set(initialData);
        return res.json({ status: 'created', role: initialData.role });
      } else {
        const data = doc.data()!;
        const updates: any = {};
        if (decodedToken.name && data.name !== decodedToken.name) {
          updates.name = decodedToken.name;
        }
        if (!data.uid) {
          updates.uid = uid;
        }
        if (Object.keys(updates).length > 0) {
          await memberRef.update(updates);
        }
        return res.json({ status: 'synced', role: data.role });
      }
    } catch (error: any) {
      console.error('Error syncing user:', error);
      return res.status(500).json({ 
        error: 'Failed to sync user', 
        details: error.message,
        code: error.code,
        project: authAdmin.app.options.projectId
      });
    }
  });

  app.get('/api/projects', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await authAdmin.verifyIdToken(idToken);
      const email = decodedToken.email;

      if (!email) {
        return res.status(400).json({ error: 'Email missing' });
      }

      const memberSnap = await db.collection('members').doc(decodedToken.uid).get();
      const role = memberSnap.exists ? memberSnap.data()?.role : 'Worker';

      let projectsQuery;
      if (['Global Admin', 'Admin', 'Manager'].includes(role)) {
        projectsQuery = db.collection('projects').where('archived', '==', false);
      } else {
        projectsQuery = db.collection('projects')
          .where('members', 'array-contains', email)
          .where('archived', '==', false);
      }

      const snapshot = await projectsQuery.orderBy('createdAt', 'desc').get();
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return res.json(projects);
    } catch (error) {
      console.error('Error fetching projects via API:', error);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  app.get('/api/tasks', async (req, res) => {
    const authHeader = req.headers.authorization;
    const { projectId } = req.query;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).end();
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    try {
      const decodedToken = await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1]);
      // Admins/Managers can see all, Workers check project membership
      const projectDoc = await db.collection('projects').doc(projectId as string).get();
      if (!projectDoc.exists) return res.status(404).end();
      
      const projectData = projectDoc.data()!;
      const memberSnap = await db.collection('members').doc(decodedToken.uid).get();
      const role = memberSnap.exists ? memberSnap.data()?.role : 'Worker';
      
      const isAuthorized = ['Global Admin', 'Admin', 'Manager'].includes(role) || 
                         (projectData.members && projectData.members.includes(decodedToken.email));

      if (!isAuthorized) return res.status(403).end();

      const snapshot = await db.collection('tasks')
        .where('projectId', '==', projectId)
        .where('archived', '==', false)
        .orderBy('createdAt', 'asc')
        .get();
      
      return res.json(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/jobs', async (req, res) => {
    const authHeader = req.headers.authorization;
    const { projectId } = req.query;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).end();
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    try {
      const decodedToken = await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1]);
      const memberSnap = await db.collection('members').doc(decodedToken.uid).get();
      const role = memberSnap.exists ? memberSnap.data()?.role : 'Worker';

      let jobsQuery = db.collection('jobs')
        .where('projectId', '==', projectId)
        .where('archived', '==', false);

      if (!['Global Admin', 'Admin', 'Manager'].includes(role)) {
        jobsQuery = jobsQuery.where('assignedTo', 'array-contains', decodedToken.email?.toLowerCase());
      }

      const snapshot = await jobsQuery.orderBy('createdAt', 'asc').get();
      return res.json(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/members', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).end();

    try {
      await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1]);
      const snapshot = await db.collection('members').orderBy('createdAt', 'desc').get();
      return res.json(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/dashboard-stats', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).end();

    try {
      const decodedToken = await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1]);
      const email = decodedToken.email;
      const memberSnap = await db.collection('members').doc(decodedToken.uid).get();
      const role = memberSnap.exists ? memberSnap.data()?.role : 'Worker';

      let projectsQuery = db.collection('projects').where('archived', '==', false);
      if (!['Global Admin', 'Admin', 'Manager'].includes(role)) {
        projectsQuery = projectsQuery.where('members', 'array-contains', email.toLowerCase());
      }
      
      const projectsSnap = await projectsQuery.get();
      const projectIds = projectsSnap.docs.map(d => d.id);
      
      if (projectIds.length === 0) {
        return res.json({
          activeProjects: 0,
          totalTasks: 0,
          completedJobs: 0,
          pipelineJobs: 0,
          totalMembers: (await db.collection('members').count().get()).data().count,
          successRate: 0
        });
      }

      // Consolidate counts (Batching counts is better than retrieving all docs)
      // Note: for simpler code we can just count
      const tasksSnap = await db.collection('tasks')
        .where('projectId', 'in', projectIds.slice(0, 30)) // Firestore limit for 'in'
        .where('archived', '==', false)
        .where('status', '!=', 'Completed')
        .get();

      let jobsQuery = db.collection('jobs')
        .where('projectId', 'in', projectIds.slice(0, 30))
        .where('archived', '==', false);
      
      if (!['Global Admin', 'Admin', 'Manager'].includes(role)) {
        jobsQuery = jobsQuery.where('assignedTo', 'array-contains', email.toLowerCase());
      }

      const jobsSnap = await jobsQuery.get();
      const jobs = jobsSnap.docs.map(d => d.data());
      const completedJobs = jobs.filter(j => j.status === 'Completed').length;
      
      const membersCount = (await db.collection('members').count().get()).data().count;

      return res.json({
        activeProjects: projectIds.length,
        totalTasks: tasksSnap.size,
        completedJobs: completedJobs,
        pipelineJobs: jobs.length - completedJobs,
        totalMembers: membersCount,
        successRate: jobs.length > 0 ? Math.round((completedJobs / jobs.length) * 100) : 0
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      return res.status(500).end();
    }
  });

  app.get('/api/recent-activity', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).end();

    try {
      const decodedToken = await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1]);
      const email = decodedToken.email;
      const memberSnap = await db.collection('members').doc(decodedToken.uid).get();
      const role = memberSnap.exists ? memberSnap.data()?.role : 'Worker';

      let projectsQuery = db.collection('projects').where('archived', '==', false);
      if (!['Global Admin', 'Admin', 'Manager'].includes(role)) {
        projectsQuery = projectsQuery.where('members', 'array-contains', email.toLowerCase());
      }
      
      const projectsSnap = await projectsQuery.get();
      const projectIds = projectsSnap.docs.map(d => d.id);
      
      if (projectIds.length === 0) return res.json([]);

      let jobsQuery = db.collection('jobs')
        .where('projectId', 'in', projectIds.slice(0, 30))
        .where('archived', '==', false);
      
      if (!['Global Admin', 'Admin', 'Manager'].includes(role)) {
        jobsQuery = jobsQuery.where('assignedTo', 'array-contains', email.toLowerCase());
      }

      const snapshot = await jobsQuery.orderBy('createdAt', 'desc').limit(5).get();
      const activity = snapshot.docs.map(doc => {
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
      
      return res.json(activity);
    } catch (error) {
      console.error("Recent activity info error:", error);
      return res.status(500).end();
    }
  });

  app.get('/api/trashed-items', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).end();

    try {
      const decodedToken = await authAdmin.verifyIdToken(authHeader.split('Bearer ')[1]);
      const memberSnap = await db.collection('members').doc(decodedToken.uid).get();
      const role = memberSnap.exists ? memberSnap.data()?.role : 'Worker';

      if (!['Global Admin', 'Admin', 'Manager'].includes(role)) {
        return res.json([]);
      }

      const [pSnap, tSnap, jSnap] = await Promise.all([
        db.collection('projects').where('archived', '==', true).get(),
        db.collection('tasks').where('archived', '==', true).get(),
        db.collection('jobs').where('archived', '==', true).get()
      ]);

      const projects = pSnap.docs.map(d => ({ id: d.id, type: 'project', title: d.data().name, archivedAt: d.data().archivedAt }));
      const tasks = tSnap.docs.map(d => ({ id: d.id, type: 'task', title: d.data().title, archivedAt: d.data().archivedAt }));
      const jobs = jSnap.docs.map(d => ({ id: d.id, type: 'job', title: d.data().title, archivedAt: d.data().archivedAt }));

      const all = [...projects, ...tasks, ...jobs].sort((a: any, b: any) => {
        const timeA = a.archivedAt?.toMillis() || 0;
        const timeB = b.archivedAt?.toMillis() || 0;
        return timeB - timeA;
      });

      return res.json(all);
    } catch (error) {
      return res.status(500).end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Detected development mode. Loading Vite...');
    try {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      console.log('Vite server created. Registering middleware...');
      app.use(vite.middlewares);
      console.log('Vite middleware registered successfully');
    } catch (viteError) {
      console.error('CRITICAL VITE ERROR:', viteError);
    }
  } else {
    console.log('Serving production build from /dist');
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.error('CRITICAL: dist folder not found in production mode');
    }
  }

  // Error handler (MUST be after all other routes and middlewares)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('SERVER ERROR:', err);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error', 
        details: err.message,
        project: currentApp.options.projectId,
        database: databaseId
      });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on 0.0.0.0:${PORT} at ${new Date().toISOString()}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
