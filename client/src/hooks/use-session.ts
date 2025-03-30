import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { 
  createSession, 
  joinSession, 
  leaveSession, 
  sessionExists, 
  generateShareableUrl 
} from '@/lib/session';
import { SessionUser, SessionProject, SessionMessage } from '@shared/schema';

interface UseSessionOptions {
  autoJoin?: boolean;
  sessionId?: string;
  password?: string;
}

interface UseSessionReturn {
  session: SessionProject | null;
  messages: SessionMessage[];
  participants: SessionUser[];
  isOwner: boolean;
  isJoined: boolean;
  isLoading: boolean;
  error: string | null;
  createNewSession: (name: string, options?: any) => string;
  joinSessionById: (sessionId: string, password?: string) => Promise<boolean>;
  leaveCurrentSession: () => void;
  sendMessage: (content: string, type?: 'ai' | 'human') => void;
  updateSessionSettings: (updates: Partial<SessionProject>) => void;
  deleteSession: () => void;
  getShareableLink: () => string;
  addParticipant: (user: SessionUser) => void;
  removeParticipant: (userId: string) => void;
}

export const useSession = (options: UseSessionOptions = {}): UseSessionReturn => {
  const { 
    currentUser, 
    projects, 
    currentProjectId, 
    messages,
    setCurrentProject,
    updateProject,
    deleteProject,
    addMessage
  } = useStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const session = currentProjectId ? projects[currentProjectId] : null;
  const sessionMessages = currentProjectId ? (messages[currentProjectId] || []) : [];
  const participants = session?.participants || [];
  const isOwner = !!session && !!currentUser && session.ownerId === currentUser.id;
  const isJoined = !!session && !!currentUser && 
    participants.some(p => p.id === currentUser.id);
  
  // Auto-join session if specified
  useEffect(() => {
    if (options.autoJoin && options.sessionId && currentUser && !isJoined && !isLoading) {
      joinSessionById(options.sessionId, options.password);
    }
  }, [options.autoJoin, options.sessionId, currentUser, isJoined]);
  
  // Create a new session
  const createNewSession = useCallback((
    name: string,
    sessionOptions: {
      description?: string;
      password?: string;
      maxParticipants?: number;
    } = {}
  ) => {
    if (!currentUser) {
      setError('You must be logged in to create a session');
      return '';
    }
    
    setError(null);
    
    try {
      const projectId = createSession(name, currentUser.id, sessionOptions);
      
      // Add the current user as a participant
      const project = projects[projectId];
      updateProject(projectId, {
        participants: [currentUser]
      });
      
      setCurrentProject(projectId);
      return projectId;
    } catch (err) {
      setError('Failed to create session');
      return '';
    }
  }, [currentUser, projects, updateProject, setCurrentProject]);
  
  // Join a session by ID
  const joinSessionById = useCallback(async (
    sessionId: string,
    password?: string
  ) => {
    if (!currentUser) {
      setError('You must be logged in to join a session');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = joinSession(sessionId, currentUser, password);
      
      if (!result.success) {
        setError(result.error || 'Failed to join session');
        return false;
      }
      
      setCurrentProject(result.projectId!);
      return true;
    } catch (err) {
      setError('An error occurred while joining the session');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, setCurrentProject]);
  
  // Leave the current session
  const leaveCurrentSession = useCallback(() => {
    if (!currentUser || !currentProjectId) {
      return;
    }
    
    leaveSession(currentProjectId, currentUser.id);
    setCurrentProject(null);
  }, [currentUser, currentProjectId, setCurrentProject]);
  
  // Send a message to the current session
  const sendMessage = useCallback((
    content: string,
    type: 'ai' | 'human' = 'human'
  ) => {
    if (!currentUser || !currentProjectId || !content.trim()) {
      return;
    }
    
    const message: Omit<SessionMessage, 'id'> = {
      projectId: currentProjectId,
      sender: currentUser,
      content,
      timestamp: new Date(),
      type
    };
    
    addMessage(currentProjectId, message);
    
    // Update last active time
    updateProject(currentProjectId, { 
      lastActive: new Date() 
    });
  }, [currentUser, currentProjectId, addMessage, updateProject]);
  
  // Update session settings
  const updateSessionSettings = useCallback((updates: Partial<SessionProject>) => {
    if (!currentProjectId || !isOwner) {
      setError('Only the owner can update session settings');
      return;
    }
    
    updateProject(currentProjectId, updates);
  }, [currentProjectId, isOwner, updateProject]);
  
  // Delete the current session
  const deleteSession = useCallback(() => {
    if (!currentProjectId || !isOwner) {
      setError('Only the owner can delete a session');
      return;
    }
    
    deleteProject(currentProjectId);
    setCurrentProject(null);
  }, [currentProjectId, isOwner, deleteProject, setCurrentProject]);
  
  // Get a shareable link for the current session
  const getShareableLink = useCallback(() => {
    if (!session) {
      return '';
    }
    
    return generateShareableUrl(session.sessionId);
  }, [session]);
  
  // Add a participant to the current session
  const addParticipant = useCallback((user: SessionUser) => {
    if (!currentProjectId) {
      return;
    }
    
    const project = projects[currentProjectId];
    if (!project) {
      return;
    }
    
    // Don't add if already a participant
    if (project.participants.some(p => p.id === user.id)) {
      return;
    }
    
    updateProject(currentProjectId, {
      participants: [...project.participants, user]
    });
  }, [currentProjectId, projects, updateProject]);
  
  // Remove a participant from the current session
  const removeParticipant = useCallback((userId: string) => {
    if (!currentProjectId || !isOwner) {
      setError('Only the owner can remove participants');
      return;
    }
    
    const project = projects[currentProjectId];
    if (!project) {
      return;
    }
    
    updateProject(currentProjectId, {
      participants: project.participants.filter(p => p.id !== userId)
    });
  }, [currentProjectId, isOwner, projects, updateProject]);
  
  return {
    session,
    messages: sessionMessages,
    participants,
    isOwner,
    isJoined,
    isLoading,
    error,
    createNewSession,
    joinSessionById,
    leaveCurrentSession,
    sendMessage,
    updateSessionSettings,
    deleteSession,
    getShareableLink,
    addParticipant,
    removeParticipant
  };
};
