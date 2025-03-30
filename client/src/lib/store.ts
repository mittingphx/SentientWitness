import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  SessionUser,
  SessionProject,
  SessionMessage,
  AIPersonality
} from '../shared/schema';

// Define the store state
interface StoreState {
  // Authentication
  currentUser: SessionUser | null;
  users: Record<string, SessionUser>;
  
  // Projects
  projects: Record<string, SessionProject>;
  currentProjectId: string | null;
  
  // Messages
  messages: Record<string, SessionMessage[]>;
  
  // AI Personalities
  personalities: Record<string, AIPersonality>;
  
  // API Keys
  apiKeys: Record<string, string>;
  
  // Actions
  initializeStore: () => void;
  setCurrentUser: (user: SessionUser) => void;
  addUser: (user: SessionUser) => void;
  updateUser: (id: string, updates: Partial<SessionUser>) => void;
  removeUser: (id: string) => void;
  
  createProject: (project: Omit<SessionProject, 'id'>) => string;
  updateProject: (id: string, updates: Partial<SessionProject>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  
  addMessage: (projectId: string, message: Omit<SessionMessage, 'id'>) => void;
  updateMessage: (projectId: string, messageId: string, updates: Partial<SessionMessage>) => void;
  deleteMessage: (projectId: string, messageId: string) => void;
  clearMessages: (projectId: string) => void;
  
  addPersonality: (personality: AIPersonality) => void;
  updatePersonality: (id: string, updates: Partial<AIPersonality>) => void;
  deletePersonality: (id: string) => void;
  
  storeApiKey: (service: string, key: string) => void;
  getApiKey: (service: string) => string | null;
  removeApiKey: (service: string) => void;
}

// Create the store
export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUser: null,
      users: {},
      projects: {},
      currentProjectId: null,
      messages: {},
      personalities: {},
      apiKeys: {},
      
      // Initialize with some default data if needed
      initializeStore: () => {
        const { currentUser, users } = get();
        
        // Create a default user if none exists
        if (!currentUser) {
          const defaultUser: SessionUser = {
            id: uuidv4(),
            displayName: 'Guest User',
            color: getRandomColor(),
            type: 'human',
            isActive: true
          };
          
          set({
            currentUser: defaultUser,
            users: { ...users, [defaultUser.id]: defaultUser }
          });
        }
      },
      
      // User actions
      setCurrentUser: (user) => {
        set(state => ({
          currentUser: user,
          users: { ...state.users, [user.id]: user }
        }));
      },
      
      addUser: (user) => {
        set(state => ({
          users: { ...state.users, [user.id]: user }
        }));
      },
      
      updateUser: (id, updates) => {
        set(state => {
          if (!state.users[id]) return state;
          
          const updatedUser = { ...state.users[id], ...updates };
          return {
            users: { ...state.users, [id]: updatedUser },
            currentUser: state.currentUser?.id === id 
              ? updatedUser 
              : state.currentUser
          };
        });
      },
      
      removeUser: (id) => {
        set(state => {
          const newUsers = { ...state.users };
          delete newUsers[id];
          
          return {
            users: newUsers,
            currentUser: state.currentUser?.id === id ? null : state.currentUser
          };
        });
      },
      
      // Project actions
      createProject: (projectData) => {
        const id = uuidv4();
        const project: SessionProject = {
          ...projectData,
          id
        };
        
        set(state => ({
          projects: { ...state.projects, [id]: project },
          messages: { ...state.messages, [id]: [] }
        }));
        
        return id;
      },
      
      updateProject: (id, updates) => {
        set(state => {
          if (!state.projects[id]) return state;
          
          return {
            projects: { 
              ...state.projects, 
              [id]: { ...state.projects[id], ...updates } 
            }
          };
        });
      },
      
      deleteProject: (id) => {
        set(state => {
          const newProjects = { ...state.projects };
          const newMessages = { ...state.messages };
          
          delete newProjects[id];
          delete newMessages[id];
          
          return {
            projects: newProjects,
            messages: newMessages,
            currentProjectId: state.currentProjectId === id 
              ? null 
              : state.currentProjectId
          };
        });
      },
      
      setCurrentProject: (id) => {
        set({ currentProjectId: id });
      },
      
      // Message actions
      addMessage: (projectId, messageData) => {
        const id = uuidv4();
        const message: SessionMessage = {
          ...messageData,
          id
        };
        
        set(state => {
          const projectMessages = state.messages[projectId] || [];
          return {
            messages: {
              ...state.messages,
              [projectId]: [...projectMessages, message]
            }
          };
        });
      },
      
      updateMessage: (projectId, messageId, updates) => {
        set(state => {
          const projectMessages = state.messages[projectId];
          if (!projectMessages) return state;
          
          const updatedMessages = projectMessages.map(msg => 
            msg.id === messageId ? { ...msg, ...updates } : msg
          );
          
          return {
            messages: {
              ...state.messages,
              [projectId]: updatedMessages
            }
          };
        });
      },
      
      deleteMessage: (projectId, messageId) => {
        set(state => {
          const projectMessages = state.messages[projectId];
          if (!projectMessages) return state;
          
          const updatedMessages = projectMessages.filter(msg => msg.id !== messageId);
          
          return {
            messages: {
              ...state.messages,
              [projectId]: updatedMessages
            }
          };
        });
      },
      
      clearMessages: (projectId) => {
        set(state => ({
          messages: {
            ...state.messages,
            [projectId]: []
          }
        }));
      },
      
      // Personality actions
      addPersonality: (personality) => {
        set(state => ({
          personalities: {
            ...state.personalities,
            [personality.name]: personality
          }
        }));
      },
      
      updatePersonality: (id, updates) => {
        set(state => {
          if (!state.personalities[id]) return state;
          
          return {
            personalities: {
              ...state.personalities,
              [id]: { ...state.personalities[id], ...updates }
            }
          };
        });
      },
      
      deletePersonality: (id) => {
        set(state => {
          const newPersonalities = { ...state.personalities };
          delete newPersonalities[id];
          
          return {
            personalities: newPersonalities
          };
        });
      },
      
      // API key actions
      storeApiKey: (service, key) => {
        set(state => ({
          apiKeys: { ...state.apiKeys, [service]: key }
        }));
      },
      
      getApiKey: (service) => {
        return get().apiKeys[service] || null;
      },
      
      removeApiKey: (service) => {
        set(state => {
          const newApiKeys = { ...state.apiKeys };
          delete newApiKeys[service];
          
          return {
            apiKeys: newApiKeys
          };
        });
      }
    }),
    {
      name: 'sentient-witness-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        users: state.users,
        projects: state.projects,
        messages: state.messages,
        personalities: state.personalities,
        apiKeys: state.apiKeys,
        currentUser: state.currentUser,
      }),
    }
  )
);

// Helper function to generate random colors
function getRandomColor(): string {
  const colors = [
    'blue-500', 'green-500', 'red-500', 'yellow-500', 'purple-500',
    'pink-500', 'indigo-500', 'teal-500', 'orange-500', 'cyan-500'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
