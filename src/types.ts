import { Timestamp } from 'firebase/firestore';

export type Status = 'New' | 'In Progress' | 'Completed';

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  createdAt: Timestamp;
  archived?: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: Status;
  createdAt: Timestamp;
  archived?: boolean;
}

export interface Job {
  id: string;
  taskId: string;
  projectId: string;
  title: string;
  addingDate: Timestamp;
  finishingDate?: Timestamp;
  status: Status;
  assignedTo: string[];
  createdAt: Timestamp;
}

export type UserRole = 'Global Admin' | 'Admin' | 'Manager' | 'Worker';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Timestamp;
}
