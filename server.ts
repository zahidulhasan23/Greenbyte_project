import express from 'express';
import path from 'path';
import * as admin from 'firebase-admin';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

// Initialize Firebase Admin
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
    console.log('Firebase Admin initialized for project:', firebaseConfig.projectId);
  }
} catch (err) {
  console.error('Firebase Admin init error:', err);
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Target the specific database instance
  const db = admin.firestore(firebaseConfig.firestoreDatabaseId);
  console.log('Firestore initialized for database:', firebaseConfig.firestoreDatabaseId);

  // API routes
  app.get('/api/health', (req, res) => {
    console.log('Health check requested');
    res.json({ 
      status: 'ok', 
      databaseId: firebaseConfig.firestoreDatabaseId,
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
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email;

      if (!email) {
        return res.status(400).json({ error: 'Email missing from token' });
      }

      const adminEmails = ['zahidul@greenbyteai.com', 'zahidulhasan23@gmail.com'];
      const memberRef = db.collection('members').doc(uid);
      const doc = await memberRef.get();

      if (!doc.exists) {
        // Check for orphan by email
        const orphanQuery = await db.collection('members').where('email', '==', email).limit(1).get();
        let initialData: any = {
          name: decodedToken.name || email.split('@')[0],
          email: email,
          role: adminEmails.includes(email) ? 'Global Admin' : 'Worker',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          uid: uid
        };

        if (!orphanQuery.empty) {
          const orphan = orphanQuery.docs[0];
          initialData = {
            ...orphan.data(),
            uid: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
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
    } catch (error) {
      console.error('Error syncing user:', error);
      return res.status(500).json({ error: 'Failed to sync user' });
    }
  });

  app.get('/api/projects', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
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

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
