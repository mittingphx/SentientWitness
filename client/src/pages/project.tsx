import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useStore } from '@/lib/store';
import Sidebar from '@/components/sidebar';
import AIChat from '@/components/ai-chat';
import HumanChat from '@/components/human-chat';
import ConnectAIModal from '@/components/connect-ai-modal';
import ShareSessionModal from '@/components/share-session-modal';
import ExportPersonalityModal from '@/components/export-personality-modal';
import DirectConnectionModal from '@/components/direct-connection-modal';
import { useSession } from '@/hooks/use-session';
import { useWebSocketConnection, WebSocketMessage } from '@/hooks/use-websocket-connection';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Link as LinkIcon, 
  Settings, 
  Plus,
  Menu,
  X,
  Network
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/user-avatar';

export default function Project() {
  const { id: projectId } = useParams();
  const projectIdStr = projectId || '';
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  const { 
    currentUser, 
    projects
  } = useStore();
  
  const { 
    session, 
    messages, 
    participants,
    isOwner,
    isJoined,
    sendMessage
  } = useSession({
    autoJoin: true,
    sessionId: projectId && projects[projectId] ? projects[projectId].sessionId : undefined
  });
  
  // WebSocket connection for real-time updates
  const { status: wsStatus, sendMessage: wsSendMessage } = useWebSocketConnection({
    onMessage: (data: WebSocketMessage) => {
      if (data.type === 'chat' && projectId) {
        // Handle incoming message if not from the current user
        if (data.userId !== currentUser?.id) {
          // Find the sender from participants
          const sender = participants.find(p => p.id === data.userId);
          if (sender) {
            sendMessage(data.content, data.messageType as 'ai' | 'human');
          }
        }
      }
    }
  });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDirectConnectionModalOpen, setIsDirectConnectionModalOpen] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<{id: string, name: string}[]>([]);
  
  // Connected AIs in this session
  const connectedAIs = participants.filter(p => p.type === 'ai');
  
  // If the project doesn't exist, redirect to home
  useEffect(() => {
    if (projectId && !projects[projectId]) {
      toast({
        title: "Session Not Found",
        description: "The session you're looking for doesn't exist or has been deleted.",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [projectId, projects, navigate, toast]);
  
  // Handle sending AI message
  const handleSendAIMessage = (content: string, type: 'ai') => {
    if (!projectId || !currentUser) return;
    
    sendMessage(content, type);
    
    // Send over WebSocket if connected
    if (wsStatus === 'connected') {
      wsSendMessage({
        type: 'chat',
        content,
        messageType: type
      });
    }
  };
  
  // Handle sending human message
  const handleSendHumanMessage = (content: string, type: 'human') => {
    if (!projectId || !currentUser) return;
    
    sendMessage(content, type);
    
    // Send over WebSocket if connected
    if (wsStatus === 'connected') {
      wsSendMessage({
        type: 'chat',
        content,
        messageType: type
      });
    }
  };
  
  // Handle toggle sidebar on mobile
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Handle adding AI to session
  const handleAddAI = () => {
    setIsConnectModalOpen(true);
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-teal-50 text-gray-900">
      {/* Mobile sidebar toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-20 bg-white p-2 rounded-lg shadow-md"
        onClick={toggleSidebar}
      >
        {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      
      {/* Sidebar */}
      <div className={`${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-0 md:relative md:translate-x-0 z-10 w-64 transition-transform duration-300 ease-in-out bg-gradient-to-b from-blue-700 to-blue-900 text-white`}>
        <Sidebar 
          isMobile={true} 
          onToggle={toggleSidebar} 
          onNewSession={() => navigate('/')}
        />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden shadow-lg theme-bg">
        {/* Top Header */}
        <header className="theme-header h-14 flex items-center px-4 justify-between text-white" style={{
          background: `linear-gradient(to right, var(--primary-color), var(--secondary-color))`,
          borderBottom: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div className="flex items-center">
            <button className="md:hidden mr-4 text-white hover:text-opacity-80" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="font-semibold">{session?.name || 'Loading...'}</h2>
            <div className="ml-4 flex items-center text-white/80 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-green-300 mr-1.5"></span>
              <span>{participants.length} participants connected</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              className="text-sm text-white hover:text-opacity-80 flex items-center"
              onClick={() => setIsExportModalOpen(true)}
            >
              <Users className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Participants</span>
            </button>
            <button 
              className="text-sm text-white hover:text-opacity-80 flex items-center"
              onClick={() => setIsShareModalOpen(true)}
            >
              <LinkIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button 
              className="text-sm text-white hover:text-opacity-80 flex items-center"
              onClick={() => setIsDirectConnectionModalOpen(true)}
            >
              <Network className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Direct Connect</span>
            </button>
            <button 
              className="text-sm text-white hover:text-opacity-80 flex items-center"
            >
              <Settings className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <Button 
              size="icon"
              variant="secondary"
              className="ml-2 p-1.5 rounded-lg transition-colors"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
              }}
              onClick={handleAddAI}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* AI Conversation Pane */}
          <AIChat 
            messages={messages} 
            projectId={projectIdStr} 
            onSendMessage={handleSendAIMessage}
            connectedAIs={connectedAIs}
          />
          
          {/* Human Conversation Pane */}
          <HumanChat 
            messages={messages}
            currentUser={currentUser}
            onSendMessage={handleSendHumanMessage}
          />
        </div>
      </main>
      
      {/* Connect AI Modal */}
      <ConnectAIModal 
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        projectId={projectIdStr}
      />
      
      {/* Share Session Modal */}
      <ShareSessionModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectId={projectIdStr}
      />
      
      {/* Export Personality Modal */}
      <ExportPersonalityModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectId={projectIdStr}
      />
      
      {/* Direct Connection Modal */}
      <DirectConnectionModal
        isOpen={isDirectConnectionModalOpen}
        onClose={() => setIsDirectConnectionModalOpen(false)}
        projectId={projectIdStr}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onConnectionEstablished={(peerId, peerName) => {
          // Add to connected peers
          setConnectedPeers(prev => [...prev, { id: peerId, name: peerName }]);
          
          // Notify the user
          toast({
            title: "Direct Connection Established",
            description: `Connected with ${peerName}. AI-to-AI conversation is now possible.`
          });
        }}
      />
    </div>
  );
}
