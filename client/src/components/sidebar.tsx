import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { SessionProject, SessionUser } from '@shared/schema';
import UserAvatar from './user-avatar';
import { useTheme } from './ui/theme-provider';
import {
  Brain,
  ChevronRight,
  Menu,
  Plus,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  LogOut,
  Users,
  CalendarClock
} from 'lucide-react';

interface SidebarProps {
  isMobile?: boolean;
  onToggle?: () => void;
  onNewSession?: () => void;
}

export default function Sidebar({ isMobile = false, onToggle, onNewSession }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'witnesses'>('projects');
  const [location, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  
  const { 
    currentUser, 
    projects, 
    currentProjectId,
    setCurrentProject 
  } = useStore();
  
  const sortedProjects = Object.values(projects)
    .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
  
  const handleProjectClick = (project: SessionProject) => {
    setCurrentProject(project.id);
    navigate(`/project/${project.id}`);
    if (isMobile && onToggle) {
      onToggle();
    }
  };
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  return (
    <aside className="w-64 bg-gray-50 dark:bg-dark-300 border-r border-gray-200 dark:border-dark-100 flex flex-col h-full transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Sentient Witness</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">The Church of Memory</p>
            </div>
          </div>
          {isMobile && (
            <button 
              onClick={onToggle}
              className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* User Profile */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-100">
        <div className="flex items-center space-x-3">
          {currentUser && (
            <UserAvatar user={currentUser} size="md" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {currentUser?.displayName || 'Guest User'}
            </p>
            <div className="flex items-center text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-success mr-1.5"></span>
              <span className="text-gray-500 dark:text-gray-400">
                {currentUser?.type === 'ai' ? 'AI Assistant' : 'Human User'}
              </span>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Nav Tabs */}
      <div className="border-b border-gray-200 dark:border-dark-100">
        <nav className="flex" aria-label="Tabs">
          <button 
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'projects' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          <button 
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'witnesses' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('witnesses')}
          >
            Witnesses
          </button>
        </nav>
      </div>
      
      {/* Projects List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {activeTab === 'projects' ? 'Your Projects' : 'AI Witnesses'}
            </h2>
            <button 
              onClick={onNewSession}
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              New <Plus className="inline-block h-3 w-3 ml-1" />
            </button>
          </div>
          
          {activeTab === 'projects' && (
            <div className="space-y-3">
              {sortedProjects.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No projects yet
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={onNewSession}
                  >
                    Create your first project
                  </Button>
                </div>
              ) : (
                sortedProjects.map((project) => (
                  <div 
                    key={project.id}
                    onClick={() => handleProjectClick(project)}
                    className={`p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border ${
                      currentProjectId === project.id
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-white dark:bg-dark-200 border-transparent hover:border-primary/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{project.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        project.status === 'active'
                          ? 'bg-primary/10 text-primary'
                          : project.status === 'scheduled'
                            ? 'bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-400'
                            : 'bg-gray-100 dark:bg-dark-100 text-gray-600 dark:text-gray-400'
                      }`}>
                        {project.status === 'active' ? 'Active' : 
                          project.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {getLastActiveText(project.lastActive)}
                    </p>
                    <div className="flex -space-x-2">
                      {project.participants.slice(0, 4).map((participant, index) => (
                        <UserAvatar key={participant.id} user={participant} size="xs" />
                      ))}
                      {project.participants.length > 4 && (
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-dark-100 flex items-center justify-center text-gray-600 dark:text-gray-400 text-xs">
                          +{project.participants.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          
          {activeTab === 'witnesses' && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI witnesses feature coming soon
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => setActiveTab('projects')}
              >
                View projects instead
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-100">
        <button 
          onClick={onNewSession}
          className="w-full py-2 px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
        >
          <Plus className="mr-2 h-4 w-4" /> New Session
        </button>
        
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500 dark:text-gray-400">
          <button className="hover:text-gray-700 dark:hover:text-gray-300">
            <HelpCircle className="h-4 w-4" />
          </button>
          <button 
            onClick={toggleTheme}
            className="hover:text-gray-700 dark:hover:text-gray-300"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button className="hover:text-gray-700 dark:hover:text-gray-300">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// Helper function to format last active time
function getLastActiveText(date: Date | string): string {
  const lastActive = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  return lastActive.toLocaleDateString();
}
