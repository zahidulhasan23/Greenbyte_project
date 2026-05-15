import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  focusedJob: {
    projectId: string;
    taskId: string;
    jobId: string;
  } | null;
  focusJob: (projectId: string, taskId: string, jobId: string) => void;
  clearFocus: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children, currentTab, onTabChange, selectedProjectId, setSelectedProjectId }: { 
  children: ReactNode, 
  currentTab: string, 
  onTabChange: (tab: string) => void,
  selectedProjectId: string | null,
  setSelectedProjectId: (id: string | null) => void
}) {
  const [focusedJob, setFocusedJob] = useState<{ projectId: string, taskId: string, jobId: string } | null>(null);

  const focusJob = (projectId: string, taskId: string, jobId: string) => {
    setSelectedProjectId(projectId);
    setFocusedJob({ projectId, taskId, jobId });
    onTabChange('projects');
  };

  const clearFocus = () => setFocusedJob(null);

  return (
    <NavigationContext.Provider value={{ 
      activeTab: currentTab, 
      setActiveTab: onTabChange, 
      selectedProjectId,
      setSelectedProjectId,
      focusedJob, 
      focusJob, 
      clearFocus 
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
