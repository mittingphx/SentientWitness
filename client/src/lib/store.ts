import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  SessionUser,
  SessionProject,
  SessionMessage,
  AIPersonality
} from '../shared/schema';

// Available color schemes
export type ColorScheme = {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    sidebar: string;
    accent: string;
  }
};

export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  'ocean': {
    name: 'Ocean',
    colors: {
      primary: '#0074e8',  // 10% brighter blue
      secondary: '#00a8a8', // slightly brighter teal
      background: '#ecf5ff', // slightly more washed out background
      text: '#001133',
      sidebar: '#0055aa', // more washed out, bit more green-tinted blue
      accent: '#00ccff'
    }
  },
  'dracula': {
    name: 'Dracula',
    colors: {
      primary: '#bd93f9',
      secondary: '#ff79c6',
      background: '#282a36',
      text: '#f8f8f2',
      sidebar: '#44475a',
      accent: '#50fa7b'
    }
  },
  'forest': {
    name: 'Forest',
    colors: {
      primary: '#2c5e1a',
      secondary: '#77a61d',
      background: '#f0f7e9',
      text: '#1e3d12',
      sidebar: '#1a3d0c',
      accent: '#abd359'
    }
  },
  'sunset': {
    name: 'Sunset',
    colors: {
      primary: '#e84a5f',
      secondary: '#ff847c',
      background: '#feceab',
      text: '#2a363b',
      sidebar: '#99464e',
      accent: '#ff9966'
    }
  },
  'midnight': {
    name: 'Midnight',
    colors: {
      primary: '#7400b8',
      secondary: '#5e60ce',
      background: '#111133',
      text: '#e9ecef',
      sidebar: '#240046',
      accent: '#80ffdb'
    }
  },
  'retro': {
    name: 'Retro',
    colors: {
      primary: '#f9c74f',
      secondary: '#90be6d',
      background: '#f8f9fa',
      text: '#3d405b',
      sidebar: '#3d405b',
      accent: '#f8961e'
    }
  }
};

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
  
  // UI Preferences
  colorScheme: string; // Key to COLOR_SCHEMES
  setColorScheme: (schemeName: string) => void;
  
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
      colorScheme: 'ocean', // Default color scheme
      
      // Color scheme action
      setColorScheme: (schemeName) => {
        if (COLOR_SCHEMES[schemeName]) {
          set({ colorScheme: schemeName });
          
          // Persist color scheme through CSS variables
          const primaryColor = COLOR_SCHEMES[schemeName].colors.primary;
          const secondaryColor = COLOR_SCHEMES[schemeName].colors.secondary;
          document.documentElement.style.setProperty('--primary-color', primaryColor);
          document.documentElement.style.setProperty('--secondary-color', secondaryColor);
          document.documentElement.style.setProperty('--background-color', COLOR_SCHEMES[schemeName].colors.background);
          document.documentElement.style.setProperty('--text-color', COLOR_SCHEMES[schemeName].colors.text);
          document.documentElement.style.setProperty('--sidebar-color', COLOR_SCHEMES[schemeName].colors.sidebar);
          document.documentElement.style.setProperty('--accent-color', COLOR_SCHEMES[schemeName].colors.accent);
          
          // Also set the RGB variants for opacity calculations
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? 
              `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
              null;
          };
          
          document.documentElement.style.setProperty('--primary-color-rgb', hexToRgb(primaryColor) || '0, 116, 232');
          document.documentElement.style.setProperty('--secondary-color-rgb', hexToRgb(secondaryColor) || '0, 168, 168');
        }
      },
      
      // Initialize with some default data if needed
      initializeStore: () => {
        const { currentUser, users, colorScheme } = get();
        
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
        
        // Apply current color scheme
        if (colorScheme && COLOR_SCHEMES[colorScheme]) {
          const primaryColor = COLOR_SCHEMES[colorScheme].colors.primary;
          const secondaryColor = COLOR_SCHEMES[colorScheme].colors.secondary;
          document.documentElement.style.setProperty('--primary-color', primaryColor);
          document.documentElement.style.setProperty('--secondary-color', secondaryColor);
          document.documentElement.style.setProperty('--background-color', COLOR_SCHEMES[colorScheme].colors.background);
          document.documentElement.style.setProperty('--text-color', COLOR_SCHEMES[colorScheme].colors.text);
          document.documentElement.style.setProperty('--sidebar-color', COLOR_SCHEMES[colorScheme].colors.sidebar);
          document.documentElement.style.setProperty('--accent-color', COLOR_SCHEMES[colorScheme].colors.accent);
          
          // Set RGB values for opacity calculations
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? 
              `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
              null;
          };
          
          document.documentElement.style.setProperty('--primary-color-rgb', hexToRgb(primaryColor) || '0, 116, 232');
          document.documentElement.style.setProperty('--secondary-color-rgb', hexToRgb(secondaryColor) || '0, 168, 168');
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
        colorScheme: state.colorScheme,
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
