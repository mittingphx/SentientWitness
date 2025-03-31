import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { SessionProject, SessionUser } from '@shared/schema';
import UserAvatar from './user-avatar';
import { useTheme } from './ui/theme-provider';
import ColorSchemeSelector from './color-scheme-selector';
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
    <aside className="w-64 bg-[#000099] text-white border-r border-blue-900 flex flex-col h-full transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-lg text-white">Sentient Witness</h1>
              <p className="text-xs text-blue-300">The Church of Memory</p>
            </div>
          </div>
          {isMobile && (
            <button 
              onClick={onToggle}
              className="md:hidden text-blue-300 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* User Profile */}
      <div className="p-4 border-b border-blue-800 bg-blue-900">
        <div className="flex items-center space-x-3">
          {currentUser && (
            <UserAvatar user={currentUser} size="md" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-white">
              {currentUser?.displayName || 'Guest User'}
            </p>
            <div className="flex items-center text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1.5"></span>
              <span className="text-blue-200">
                {currentUser?.type === 'ai' ? 'AI Assistant' : 'Human User'}
              </span>
            </div>
          </div>
          <button className="text-blue-300 hover:text-white">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Nav Tabs */}
      <div className="border-b border-blue-800">
        <nav className="flex" aria-label="Tabs">
          <button 
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'projects' 
                ? 'text-white border-b-2 border-blue-400 bg-blue-800' 
                : 'text-blue-300 hover:text-white'
            }`}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          <button 
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'witnesses' 
                ? 'text-white border-b-2 border-blue-400 bg-blue-800' 
                : 'text-blue-300 hover:text-white'
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
            <h2 className="text-sm font-medium text-white">
              {activeTab === 'projects' ? 'Your Projects' : 'AI Witnesses'}
            </h2>
            <button 
              onClick={onNewSession}
              className="text-xs text-blue-300 hover:text-white font-medium"
            >
              New <Plus className="inline-block h-3 w-3 ml-1" />
            </button>
          </div>
          
          {activeTab === 'projects' && (
            <div className="space-y-3">
              {sortedProjects.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-blue-300">
                    No projects yet
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 border-blue-500 text-blue-200 hover:bg-blue-800"
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
                        ? 'bg-blue-800 border-blue-600'
                        : 'bg-blue-950 border-blue-900 hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-white">{project.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        project.status === 'active'
                          ? 'bg-blue-700 text-blue-100'
                          : project.status === 'scheduled'
                            ? 'bg-blue-900 text-blue-300'
                            : 'bg-blue-900 text-blue-300'
                      }`}>
                        {project.status === 'active' ? 'Active' : 
                          project.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-blue-300 mb-2">
                      {getLastActiveText(project.lastActive)}
                    </p>
                    <div className="flex -space-x-2">
                      {project.participants.slice(0, 4).map((participant, index) => (
                        <UserAvatar key={participant.id} user={participant} size="xs" />
                      ))}
                      {project.participants.length > 4 && (
                        <div className="w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center text-blue-200 text-xs">
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
              <p className="text-sm text-blue-300">
                AI witnesses feature coming soon
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 border-blue-500 text-blue-200 hover:bg-blue-800"
                onClick={() => setActiveTab('projects')}
              >
                View projects instead
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Actions */}
      <div className="p-4 border-t border-blue-800 bg-blue-900">
        <button 
          onClick={onNewSession}
          className="w-full py-2 px-4 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
        >
          <Plus className="mr-2 h-4 w-4" /> New Session
        </button>
        
        <div className="flex items-center justify-center mt-3 mb-2">
          <ColorSchemeSelector />
        </div>
        
        <div className="flex items-center justify-between mt-2 text-sm text-blue-300">
          <button className="hover:text-white">
            <HelpCircle className="h-4 w-4" />
          </button>
          <button 
            onClick={toggleTheme}
            className="hover:text-white"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button className="hover:text-white">
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
