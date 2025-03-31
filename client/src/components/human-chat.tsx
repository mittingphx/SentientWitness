import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send,
  Mic,
  MicOff,
  MessageCircle
} from 'lucide-react';
import UserAvatar from './user-avatar';
import { SessionMessage, SessionUser } from '../shared/schema';
import VoiceInput from './voice-input';

interface HumanChatProps {
  messages: SessionMessage[];
  currentUser: SessionUser | null;
  onSendMessage: (content: string, type: 'human') => void;
  sendToAI?: boolean;
  setSendToAI?: (value: boolean) => void;
}

export default function HumanChat({ 
  messages, 
  currentUser, 
  onSendMessage,
  sendToAI = true,
  setSendToAI
}: HumanChatProps) {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState<string>('');
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
  
  // Handle sending a message
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;
    
    if (!currentUser) {
      toast({
        title: 'Not connected',
        description: 'Please connect to the chat first',
        variant: 'destructive'
      });
      return;
    }
    
    onSendMessage(newMessage, 'human');
    setNewMessage('');
  }, [currentUser, newMessage, onSendMessage, toast]);
  
  // Handle key press in the textarea
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  
  // Handle voice transcript
  const handleVoiceTranscript = useCallback((text: string) => {
    setNewMessage((prev) => {
      const newText = prev.trim() ? `${prev} ${text}` : text;
      return newText;
    });
  }, []);
  
  // Toggle voice input
  const toggleVoice = useCallback(() => {
    setIsVoiceActive(!isVoiceActive);
    
    if (!isVoiceActive) {
      toast({
        title: 'Voice Input Activated',
        description: 'Speak now and your words will be transcribed',
        variant: 'default'
      });
    }
  }, [isVoiceActive, toast]);
  
  return (
    <div className="flex flex-col h-full bg-teal-50">
      <div className="p-3 border-b flex items-center justify-between bg-teal-100">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-teal-800">Human Chat</h2>
        </div>
        
        {setSendToAI && (
          <div className="flex items-center gap-2">
            <label className="text-sm cursor-pointer text-teal-800" htmlFor="send-to-ai">
              Send to AI
            </label>
            <input
              type="checkbox"
              id="send-to-ai"
              checked={sendToAI}
              onChange={(e) => setSendToAI(e.target.checked)}
              className="checkbox"
            />
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1 p-4 bg-teal-50">
        <div className="space-y-4">
          {messages.filter(m => m.type === 'human').map((message) => (
            <div key={message.id} className="chat-message bg-white rounded-lg p-3 shadow-sm border border-teal-100">
              <div className="flex items-start gap-3">
                <UserAvatar user={message.sender} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-teal-800">{message.sender.displayName}</span>
                    <span className="text-xs text-teal-600">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t bg-teal-100">
        <div className="flex items-end gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="min-h-[80px] resize-none bg-white border-teal-200 focus:border-teal-400 focus:ring-teal-300"
          />
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={toggleVoice} 
              size="icon" 
              variant={isVoiceActive ? "default" : "outline"}
              className={`rounded-full ${isVoiceActive ? 'bg-teal-600 hover:bg-teal-700' : 'bg-teal-100 text-teal-700 border-teal-300 hover:bg-teal-200'}`}
              title={isVoiceActive ? "Stop voice input" : "Start voice input"}
            >
              {isVoiceActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button 
              onClick={handleSendMessage} 
              size="icon"
              className="rounded-full bg-teal-600 hover:bg-teal-700"
              disabled={!newMessage.trim() || !currentUser}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {isVoiceActive && (
          <div className="mt-2 bg-teal-200 p-2 rounded">
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              autoSubmitAfterSilence
              silenceTimeout={2000}
              className="w-full"
            />
          </div>
        )}
        
        {!currentUser && (
          <p className="text-xs text-teal-700 mt-2 font-medium">
            Please connect to participate in the conversation
          </p>
        )}
      </div>
    </div>
  );
}