import { useState, useEffect, useCallback } from 'react';
import { useOpenAI } from '../hooks/use-openai';
import { useToast } from '@/hooks/use-toast';
import { OPENAI_MODELS } from '../lib/openai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bot,
  Key,
  Loader2,
  Link,
  Brain,
  PlugZap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { SessionUser } from '../shared/schema';

interface ConnectAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onAddAI?: (user: SessionUser) => void;
}

export default function ConnectAIModal({ isOpen, onClose, projectId, onAddAI }: ConnectAIModalProps) {
  const { toast } = useToast();
  
  // AI connection state
  const [aiName, setAiName] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const [personalityPrompt, setPersonalityPrompt] = useState<string>('');
  const [connecting, setConnecting] = useState<boolean>(false);
  
  // Setup OpenAI
  const openai = useOpenAI({
    model: selectedModel,
    onError: (error) => {
      console.error('OpenAI error:', error);
      toast({
        title: 'API Error',
        description: error.message,
        variant: 'destructive'
      });
      setConnecting(false);
    }
  });
  
  // Reset the form when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setAiName('');
      setSelectedModel('gpt-4o');
      setPersonalityPrompt('');
      setConnecting(false);
    }
  }, [isOpen]);
  
  // Handle connecting to the AI
  const handleConnectAI = useCallback(async () => {
    if (!aiName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for your AI',
        variant: 'destructive'
      });
      return;
    }
    
    if (!openai.hasApiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your OpenAI API key',
        variant: 'destructive'
      });
      return;
    }
    
    setConnecting(true);
    
    try {
      // Test the API connection with a simple request
      const testResponse = await openai.generateCompletion([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello!' }
      ]);
      
      console.log('Test response:', testResponse);
      
      // If we get here, the connection was successful
      toast({
        title: 'Connected',
        description: `Successfully connected to ${aiName} using ${selectedModel}`,
        variant: 'default'
      });
      
      // Create a SessionUser object for the AI
      const aiUser: SessionUser = {
        id: crypto.randomUUID(),
        displayName: aiName,
        color: getRandomColor(),
        type: 'ai',
        aiModel: selectedModel,
        isActive: true
      };
      
      // Call the onAddAI callback
      if (onAddAI) {
        onAddAI(aiUser);
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error connecting to AI:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Unknown error connecting to AI',
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
    }
  }, [aiName, onAddAI, onClose, openai, selectedModel, toast]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Connect AI Assistant
          </DialogTitle>
          <DialogDescription>
            Connect to an AI assistant using your OpenAI API key
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* API Key Input */}
          {!openai.hasApiKey && (
            <div className="space-y-2">
              <Label htmlFor="api-key" className="flex items-center gap-1.5">
                <Key className="h-4 w-4" />
                OpenAI API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                value={openai.hasApiKey ? '••••••••' : ''}
                onChange={(e) => openai.setApiKey(e.target.value)}
                placeholder="Enter your OpenAI API key"
              />
              <p className="text-xs text-muted-foreground">
                Your API key is only used in your browser and never stored on our servers.
              </p>
            </div>
          )}
          
          {/* AI Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="ai-name" className="flex items-center gap-1.5">
                <Bot className="h-4 w-4" />
                AI Name
              </Label>
              <Input
                id="ai-name"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                placeholder="Enter a name for your AI assistant"
              />
            </div>
            
            <div>
              <Label htmlFor="ai-model" className="flex items-center gap-1.5">
                <Brain className="h-4 w-4" />
                AI Model
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="ai-model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {OPENAI_MODELS.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedModel === 'gpt-4o' && 'GPT-4o is the newest and most capable model'}
                {selectedModel === 'gpt-4-turbo' && 'GPT-4 Turbo is fast and cost-effective'}
                {selectedModel === 'gpt-4' && 'GPT-4 is the previous generation model'}
                {selectedModel === 'gpt-3.5-turbo' && 'GPT-3.5 Turbo is faster but less capable'}
              </p>
            </div>
          </div>
          
          {/* Personality Note */}
          <div className="bg-muted/50 rounded-md p-3 text-sm flex items-start gap-2">
            <PlugZap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Customize AI Personality</p>
              <p className="text-muted-foreground mt-1">
                You can attach a custom personality to your AI after connecting. Click "Connect" to get started.
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="sm:flex-1">Cancel</Button>
          <Button 
            onClick={handleConnectAI}
            disabled={connecting || !aiName.trim() || !openai.hasApiKey}
            className="sm:flex-1"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Connect
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to generate a random color
function getRandomColor(): string {
  const colors = [
    '#f44336', // Red
    '#e91e63', // Pink
    '#9c27b0', // Purple
    '#673ab7', // Deep Purple
    '#3f51b5', // Indigo
    '#2196f3', // Blue
    '#03a9f4', // Light Blue
    '#00bcd4', // Cyan
    '#009688', // Teal
    '#4caf50', // Green
    '#8bc34a', // Light Green
    '#ffc107', // Amber
    '#ff9800', // Orange
    '#ff5722', // Deep Orange
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}