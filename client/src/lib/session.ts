import { v4 as uuidv4 } from 'uuid';
import { useStore } from './store';
import { SessionUser, SessionProject, SessionMessage } from '@shared/schema';

// Generate a unique session ID
export function generateSessionId(): string {
  return uuidv4().slice(0, 8);
}

// Create a new project session
export function createSession(
  name: string,
  ownerId: string,
  options: {
    description?: string;
    password?: string;
    maxParticipants?: number;
  } = {}
): string {
  const { createProject } = useStore.getState();
  
  const sessionId = generateSessionId();
  
  const project: Omit<SessionProject, 'id'> = {
    name,
    description: options.description || '',
    status: 'active',
    created: new Date(),
    lastActive: new Date(),
    ownerId,
    sessionId,
    password: options.password,
    maxParticipants: options.maxParticipants,
    participants: []
  };
  
  return createProject(project);
}

// Join an existing session
export function joinSession(
  sessionId: string,
  user: SessionUser,
  password?: string
): { success: boolean; projectId?: string; error?: string } {
  const { projects, updateProject } = useStore.getState();
  
  // Find the project with the given session ID
  const project = Object.values(projects).find(p => p.sessionId === sessionId);
  
  if (!project) {
    return { success: false, error: 'Session not found' };
  }
  
  // Check password if required
  if (project.password && project.password !== password) {
    return { success: false, error: 'Incorrect password' };
  }
  
  // Check max participants
  if (project.maxParticipants && project.participants.length >= project.maxParticipants) {
    return { success: false, error: 'Session is full' };
  }
  
  // Add user to participants if not already there
  if (!project.participants.some(p => p.id === user.id)) {
    const updatedProject = {
      ...project,
      participants: [...project.participants, user],
      lastActive: new Date()
    };
    
    updateProject(project.id, updatedProject);
  }
  
  return { success: true, projectId: project.id };
}

// Leave a session
export function leaveSession(projectId: string, userId: string): boolean {
  const { projects, updateProject } = useStore.getState();
  
  const project = projects[projectId];
  if (!project) return false;
  
  // Remove user from participants
  const updatedParticipants = project.participants.filter(p => p.id !== userId);
  
  updateProject(projectId, {
    participants: updatedParticipants,
    lastActive: new Date()
  });
  
  return true;
}

// Check if a session exists
export function sessionExists(sessionId: string): boolean {
  const { projects } = useStore.getState();
  return Object.values(projects).some(p => p.sessionId === sessionId);
}

// Get session details by session ID
export function getSessionBySessionId(sessionId: string): SessionProject | null {
  const { projects } = useStore.getState();
  return Object.values(projects).find(p => p.sessionId === sessionId) || null;
}

// Generate a shareable URL for a session
export function generateShareableUrl(sessionId: string): string {
  const host = window.location.host;
  const protocol = window.location.protocol;
  return `${protocol}//${host}/join/${sessionId}`;
}

// Send a message to a session
export function sendMessage(
  projectId: string,
  sender: SessionUser,
  content: string,
  type: 'ai' | 'human' = 'human',
  metadata?: any
): void {
  const { addMessage, updateProject } = useStore.getState();
  
  const message: Omit<SessionMessage, 'id'> = {
    projectId,
    sender,
    content,
    timestamp: new Date(),
    type,
    metadata
  };
  
  addMessage(projectId, message);
  
  // Update last active time
  updateProject(projectId, { lastActive: new Date() });
}

// Get messages for a session
export function getSessionMessages(projectId: string): SessionMessage[] {
  const { messages } = useStore.getState();
  return messages[projectId] || [];
}
