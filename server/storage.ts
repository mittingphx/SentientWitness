import { 
  type User, 
  type Project, 
  type Message,
  type Participant,
  type InsertUser, 
  type InsertProject, 
  type InsertMessage,
  type InsertParticipant,
  type SessionUser,
  type SessionProject,
  type SessionMessage,
  type AIPersonality
} from "../shared/schema";
import { v4 as uuidv4 } from 'uuid';

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByDisplayName(displayName: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getProjectBySessionId(sessionId: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  getAllProjects(): Promise<Project[]>;
  getProjectsForUser(userId: string): Promise<Project[]>;
  
  // Participant operations
  addParticipant(participant: InsertParticipant): Promise<Participant>;
  removeParticipant(projectId: string, userId: string): Promise<boolean>;
  getProjectParticipants(projectId: string): Promise<Participant[]>;
  
  // Message operations
  getMessages(projectId: string): Promise<Message[]>;
  addMessage(message: InsertMessage): Promise<Message>;
  
  // Session operations (client-side objects for in-memory use)
  getSessionUser(id: string): Promise<SessionUser | undefined>;
  getSessionProject(id: string): Promise<SessionProject | undefined>;
  
  // AI Personality operations
  getPersonality(name: string, projectId: string): Promise<AIPersonality | undefined>;
  addPersonality(personality: AIPersonality): Promise<AIPersonality>;
  updatePersonality(name: string, projectId: string, updates: Partial<AIPersonality>): Promise<AIPersonality | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private participants: Map<string, Participant[]>;
  private messages: Map<string, Message[]>;
  private personalities: Map<string, AIPersonality>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.participants = new Map();
    this.messages = new Map();
    this.personalities = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByDisplayName(displayName: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.displayName.toLowerCase() === displayName.toLowerCase()
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = crypto?.randomUUID?.() || uuidv4();
    const createdAt = new Date();
    const newUser: User = { 
      ...user, 
      id, 
      createdAt,
      // Ensure required fields have default values
      avatar: user.avatar || null,
      type: user.type || "human",
      aiModel: user.aiModel || null,
      isActive: user.isActive !== undefined ? user.isActive : true
    };
    
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Project operations
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectBySessionId(sessionId: string): Promise<Project | undefined> {
    return Array.from(this.projects.values()).find(
      (project) => project.sessionId === sessionId
    );
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = uuidv4();
    const created = new Date();
    const lastActive = new Date();
    
    const newProject: Project = {
      ...project,
      id,
      created,
      lastActive,
      // Ensure required fields have default values
      description: project.description || null,
      status: project.status || "active",
      password: project.password || null,
      maxParticipants: project.maxParticipants || null
    };
    
    this.projects.set(id, newProject);
    // Initialize empty participants and messages arrays
    this.participants.set(id, []);
    this.messages.set(id, []);
    
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { 
      ...project, 
      ...updates,
      lastActive: new Date() 
    };
    
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    if (!this.projects.has(id)) return false;
    
    this.projects.delete(id);
    this.participants.delete(id);
    this.messages.delete(id);
    
    return true;
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProjectsForUser(userId: string): Promise<Project[]> {
    const allProjects = Array.from(this.projects.values());
    const userProjects = allProjects.filter(project => {
      // Check if user is the owner
      if (project.ownerId === userId) return true;
      
      // Check if user is a participant
      const projectParticipants = this.participants.get(project.id) || [];
      return projectParticipants.some(p => p.userId === userId);
    });
    
    return userProjects;
  }

  // Participant operations
  async addParticipant(participant: InsertParticipant): Promise<Participant> {
    const id = uuidv4();
    const joinedAt = new Date();
    
    const newParticipant: Participant = {
      ...participant,
      id,
      joinedAt,
      // Ensure required fields have default values
      isActive: participant.isActive !== undefined ? participant.isActive : true
    };
    
    const projectParticipants = this.participants.get(participant.projectId) || [];
    projectParticipants.push(newParticipant);
    this.participants.set(participant.projectId, projectParticipants);
    
    return newParticipant;
  }

  async removeParticipant(projectId: string, userId: string): Promise<boolean> {
    const projectParticipants = this.participants.get(projectId);
    if (!projectParticipants) return false;
    
    const updatedParticipants = projectParticipants.filter(p => p.userId !== userId);
    this.participants.set(projectId, updatedParticipants);
    
    return true;
  }

  async getProjectParticipants(projectId: string): Promise<Participant[]> {
    return this.participants.get(projectId) || [];
  }

  // Message operations
  async getMessages(projectId: string): Promise<Message[]> {
    return this.messages.get(projectId) || [];
  }

  async addMessage(message: InsertMessage): Promise<Message> {
    const id = uuidv4();
    const timestamp = new Date();
    
    const newMessage: Message = {
      ...message,
      id,
      timestamp,
      // Ensure required fields have default values
      metadata: message.metadata || null
    };
    
    const projectMessages = this.messages.get(message.projectId) || [];
    projectMessages.push(newMessage);
    this.messages.set(message.projectId, projectMessages);
    
    return newMessage;
  }

  // Session operations - these convert DB entities to client-side objects
  async getSessionUser(id: string): Promise<SessionUser | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    return {
      id: user.id,
      displayName: user.displayName,
      avatar: user.avatar || undefined,
      color: user.color,
      type: user.type,
      aiModel: user.aiModel || undefined,
      isActive: user.isActive
    };
  }

  async getSessionProject(id: string): Promise<SessionProject | undefined> {
    const project = await this.getProject(id);
    if (!project) return undefined;
    
    const participants = await this.getProjectParticipants(id);
    const messages = await this.getMessages(id);
    
    // Convert participants to SessionUsers
    const sessionUsers: SessionUser[] = [];
    for (const participant of participants) {
      const user = await this.getUser(participant.userId);
      if (user) {
        sessionUsers.push({
          id: user.id,
          displayName: user.displayName,
          avatar: user.avatar || undefined,
          color: user.color,
          type: user.type,
          aiModel: user.aiModel || undefined,
          isActive: participant.isActive
        });
      }
    }
    
    // Convert messages to SessionMessages
    const sessionMessages: SessionMessage[] = [];
    for (const message of messages) {
      const user = await this.getUser(message.senderId);
      if (user) {
        sessionMessages.push({
          id: message.id,
          projectId: message.projectId,
          sender: {
            id: user.id,
            displayName: user.displayName,
            avatar: user.avatar || undefined,
            color: user.color,
            type: user.type,
            aiModel: user.aiModel || undefined,
            isActive: true
          },
          content: message.content,
          timestamp: message.timestamp,
          type: message.type,
          metadata: message.metadata ? JSON.parse(message.metadata) : undefined
        });
      }
    }
    
    return {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      status: project.status,
      created: project.created,
      lastActive: project.lastActive,
      ownerId: project.ownerId,
      sessionId: project.sessionId,
      password: project.password || undefined,
      maxParticipants: project.maxParticipants || undefined,
      participants: sessionUsers,
      messages: sessionMessages
    };
  }

  // AI Personality operations
  async getPersonality(name: string, projectId: string): Promise<AIPersonality | undefined> {
    const key = `${projectId}:${name}`;
    return this.personalities.get(key);
  }

  async addPersonality(personality: AIPersonality): Promise<AIPersonality> {
    const key = `${personality.projectId}:${personality.name}`;
    this.personalities.set(key, personality);
    return personality;
  }

  async updatePersonality(name: string, projectId: string, updates: Partial<AIPersonality>): Promise<AIPersonality | undefined> {
    const key = `${projectId}:${name}`;
    const personality = this.personalities.get(key);
    if (!personality) return undefined;
    
    const updatedPersonality = { ...personality, ...updates };
    this.personalities.set(key, updatedPersonality);
    return updatedPersonality;
  }
}

export const storage = new MemStorage();
