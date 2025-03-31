import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot,
  RefreshCw,
  Volume2,
  VolumeX,
  Loader2,
  Download
} from 'lucide-react';
import UserAvatar from './user-avatar';
import VoiceOutput from './voice-output';
import { SessionMessage, SessionUser } from '../shared/schema';

interface AIChatProps {
  messages: SessionMessage[];
  projectId: string;
  onSendMessage: (content: string, type: 'ai') => void;
  connectedAIs: SessionUser[];
}

export default function AIChat({ 
  messages, 
  projectId, 
  onSendMessage,
  connectedAIs
}: AIChatProps) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);
  const [textToSpeak, setTextToSpeak] = useState<string>('');
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Format timestamp for display
  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Handle toggling speech synthesis for a message
  const handleToggleSpeech = useCallback((message: SessionMessage) => {
    if (currentSpeakingId === message.id) {
      // Stop current speech
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
      setTextToSpeak('');
    } else {
      // Start new speech
      setIsSpeaking(true);
      setCurrentSpeakingId(message.id);
      setTextToSpeak(message.content);
    }
  }, [currentSpeakingId]);
  
  // Handle speech start
  const handleSpeechStart = useCallback(() => {
    setIsSpeaking(true);
  }, []);
  
  // Handle speech end
  const handleSpeechEnd = useCallback(() => {
    setIsSpeaking(false);
    setCurrentSpeakingId(null);
    setTextToSpeak('');
  }, []);
  
  // Filter AI messages
  const aiMessages = messages.filter(m => m.type === 'ai');
  
  // Export current AI conversation as text
  const exportConversation = useCallback(() => {
    try {
      const conversationText = aiMessages.map((msg) => {
        return `${msg.sender.displayName} (${new Date(msg.timestamp).toLocaleString()}):\n${msg.content}\n\n`;
      }).join('');
      
      const fileName = `ai_conversation_${projectId.substring(0, 8)}.txt`;
      const blob = new Blob([conversationText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Conversation Exported',
        description: `Saved as ${fileName}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error exporting conversation:', error);
      toast({
        title: 'Export Error',
        description: 'Failed to export the conversation',
        variant: 'destructive'
      });
    }
  }, [aiMessages, projectId, toast]);
  
  return (
    <div className="flex flex-col h-full" style={{backgroundColor: 'var(--ai-bg)'}}>
      <div className="p-3 border-b flex items-center justify-between" style={{backgroundColor: 'var(--ai-header)'}}>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" style={{color: 'var(--ai-accent)'}} />
          <h2 className="text-lg font-semibold" style={{color: 'var(--ai-text)'}}>AI Chat</h2>
          {connectedAIs.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full" 
              style={{
                backgroundColor: 'rgba(var(--primary-color-rgb), 0.15)',
                color: 'var(--ai-text)'
              }}>
              {connectedAIs.length} AI{connectedAIs.length !== 1 ? 's' : ''} connected
            </span>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={exportConversation}
          disabled={aiMessages.length === 0}
          className="flex items-center gap-1 border hover:bg-opacity-70"
          style={{
            backgroundColor: 'rgba(var(--primary-color-rgb), 0.15)',
            color: 'var(--ai-text)',
            borderColor: 'rgba(var(--primary-color-rgb), 0.3)'
          }}
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4" style={{backgroundColor: 'var(--ai-bg)'}}>
        <div className="space-y-4">
          {aiMessages.length === 0 ? (
            <div className="text-center p-8 rounded-lg" style={{
              backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)',
              color: 'var(--ai-text)'
            }}>
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-60" style={{color: 'var(--ai-accent)'}} />
              <p className="font-medium" style={{color: 'var(--ai-text)'}}>No AI messages yet</p>
              <p className="text-sm mt-2" style={{color: 'var(--ai-accent)'}}>
                Connect an AI or wait for an AI to join the conversation.
              </p>
            </div>
          ) : (
            aiMessages.map((message) => (
              <div key={message.id} className="chat-message rounded-lg p-3 shadow-sm border" style={{
                backgroundColor: 'white',
                borderColor: 'rgba(var(--primary-color-rgb), 0.2)'
              }}>
                <div className="flex items-start gap-3">
                  <UserAvatar user={message.sender} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{color: 'var(--ai-text)'}}>{message.sender.displayName}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{
                          backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)',
                          color: 'var(--ai-accent)'
                        }}>
                          {message.sender.aiModel}
                        </span>
                        <span className="text-xs" style={{color: 'var(--ai-accent)'}}>
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 rounded-full hover:bg-opacity-10"
                        style={{
                          color: 'var(--ai-accent)'
                        }}
                        onClick={() => handleToggleSpeech(message)}
                        title={currentSpeakingId === message.id ? "Stop speaking" : "Speak this message"}
                      >
                        {currentSpeakingId === message.id ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="mt-1 text-sm whitespace-pre-wrap" style={{color: 'var(--text-color)'}}>
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {isGenerating && (
            <div className="flex items-center justify-center py-4 rounded-lg" style={{
              backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)',
              color: 'var(--ai-text)'
            }}>
              <Loader2 className="h-6 w-6 animate-spin" style={{color: 'var(--ai-accent)'}} />
              <span className="ml-2">AI is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Speech synthesis component (hidden) */}
      {isSpeaking && (
        <div className="hidden">
          <VoiceOutput 
            text={textToSpeak}
            autoPlay
            onStart={handleSpeechStart}
            onEnd={handleSpeechEnd}
          />
        </div>
      )}
    </div>
  );
}