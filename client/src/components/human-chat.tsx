import { useState, useRef, useEffect } from 'react';
import { SessionMessage, SessionUser } from '@shared/schema';
import UserAvatar from './user-avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Expand, 
  Paperclip,
  Send 
} from 'lucide-react';

interface HumanChatProps {
  messages: SessionMessage[];
  currentUser: SessionUser | null;
  onSendMessage: (content: string, type: 'human') => void;
}

export default function HumanChat({ messages, currentUser, onSendMessage }: HumanChatProps) {
  const [messageContent, setMessageContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSendMessage = () => {
    if (!messageContent.trim() || !currentUser) return;
    
    onSendMessage(messageContent, 'human');
    setMessageContent('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="w-96 flex flex-col overflow-hidden bg-gray-50 dark:bg-dark-300">
      {/* Header */}
      <div className="bg-gray-100 dark:bg-dark-400 p-3 border-b border-gray-200 dark:border-dark-100 flex items-center justify-between">
        <h3 className="font-medium text-sm">Witness Chat</h3>
        <div className="flex items-center space-x-2">
          <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1">
            <Users className="h-4 w-4" />
          </button>
          <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1">
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.filter(m => m.type === 'human').map((message) => (
          <div key={message.id} className="chat-message flex items-start space-x-3">
            <UserAvatar user={message.sender} />
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <span className="font-medium text-sm">{message.sender.displayName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <div className="bg-white dark:bg-dark-200 rounded-lg p-3 text-sm">
                {message.content.split('\n').map((paragraph, i) => (
                  <p key={i} className={i > 0 ? 'mt-2' : ''}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="p-3 bg-white dark:bg-dark-400 border-t border-gray-200 dark:border-dark-100">
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
              placeholder="Type your message..."
              className="w-full bg-transparent border-0 p-3 text-sm focus:ring-0 focus:outline-none resize-none min-h-10 max-h-40"
            />
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <Paperclip className="h-4 w-4" />
            </button>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!messageContent.trim() || !currentUser}
            className="bg-gray-800 dark:bg-primary text-white p-3 rounded-full flex-shrink-0 hover:bg-gray-700 dark:hover:bg-primary/90 transition-colors h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
