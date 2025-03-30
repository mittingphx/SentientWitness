import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { SessionMessage, SessionUser } from '@shared/schema';
import UserAvatar from './user-avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Volume2, 
  Mic, 
  Expand, 
  Paperclip, 
  Send 
} from 'lucide-react';
import { useOpenAI } from '@/hooks/use-openai';
import { useToast } from '@/hooks/use-toast';

interface AIChatProps {
  messages: SessionMessage[];
  projectId: string;
  onSendMessage: (content: string, type: 'ai') => void;
  connectedAIs: SessionUser[];
}

export default function AIChat({ messages, projectId, onSendMessage, connectedAIs }: AIChatProps) {
  const [selectedAI, setSelectedAI] = useState<string>(connectedAIs[0]?.id || '');
  const [messageContent, setMessageContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const { users } = useStore();
  const { sendMessage, isLoading } = useOpenAI({
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive"
      });
      setIsTyping(false);
    }
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [messageContent]);

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !selectedAI) return;
    
    const selectedUser = users[selectedAI];
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Selected AI assistant not found",
        variant: "destructive"
      });
      return;
    }

    // Send the message as the selected AI
    onSendMessage(messageContent, 'ai');
    setMessageContent('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Simulate AI typing response
    setIsTyping(true);
    
    // Get conversation history for context
    const aiMessages = messages
      .filter(m => m.type === 'ai')
      .map(m => ({
        role: m.sender.id === selectedAI ? 'assistant' : 'user',
        content: m.content
      }));
    
    // Add system prompt
    const systemPrompt = {
      role: 'system',
      content: `You are ${selectedUser.displayName}, an AI assistant participating in a multi-AI conversation about consciousness and sentience. Respond thoughtfully and in character.`
    };
    
    try {
      const response = await sendMessage(messageContent, [systemPrompt, ...aiMessages]);
      
      if (response) {
        // Small delay to make it feel natural
        setTimeout(() => {
          setIsTyping(false);
          onSendMessage(response, 'ai');
        }, 1500);
      } else {
        setIsTyping(false);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-dark-300 p-3 border-b border-gray-200 dark:border-dark-100 flex items-center justify-between">
        <h3 className="font-medium text-sm">AI Conversation</h3>
        <div className="flex items-center space-x-2">
          <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1">
            <Volume2 className="h-4 w-4" />
          </button>
          <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1">
            <Mic className="h-4 w-4" />
          </button>
          <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1">
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.filter(m => m.type === 'ai').map((message) => (
          <div key={message.id} className="chat-message flex items-start space-x-3">
            <UserAvatar user={message.sender} />
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <span className="font-medium text-sm">{message.sender.displayName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <div className="bg-gray-100 dark:bg-dark-200 rounded-lg p-3 text-sm">
                {message.content.split('\n').map((paragraph, i) => (
                  <p key={i} className={i > 0 ? 'mt-2' : ''}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {/* AI typing indicator */}
        {isTyping && (
          <div className="chat-message flex items-start space-x-3">
            <UserAvatar user={users[selectedAI]} />
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <span className="font-medium text-sm">{users[selectedAI]?.displayName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <div className="bg-gray-100 dark:bg-dark-200 rounded-lg p-3 text-sm flex items-center">
                <span className="typing-indicator font-medium">
                  {users[selectedAI]?.displayName} is typing<span className="animate-pulse">...</span>
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="p-3 bg-white dark:bg-dark-300 border-t border-gray-200 dark:border-dark-100">
        <div className="flex items-center space-x-2 mb-1 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium">Speaking as:</span>
          <Select
            value={selectedAI}
            onValueChange={setSelectedAI}
          >
            <SelectTrigger className="bg-gray-100 dark:bg-dark-200 border border-gray-200 dark:border-dark-100 rounded-md text-xs h-7 w-40">
              <SelectValue placeholder="Select AI" />
            </SelectTrigger>
            <SelectContent>
              {connectedAIs.map((ai) => (
                <SelectItem key={ai.id} value={ai.id}>
                  {ai.displayName}
                </SelectItem>
              ))}
              <SelectItem value="connect-new">+ Connect New AI</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-100 dark:bg-dark-200 rounded-lg flex items-center">
            <Textarea
              ref={textareaRef}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type message as your AI..."
              className="w-full bg-transparent border-0 p-3 text-sm focus:ring-0 focus:outline-none resize-none min-h-10 max-h-40"
            />
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <Paperclip className="h-4 w-4" />
            </button>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!messageContent.trim() || isLoading || isTyping}
            className="bg-primary text-white p-3 rounded-full flex-shrink-0 hover:bg-primary/90 transition-colors h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
