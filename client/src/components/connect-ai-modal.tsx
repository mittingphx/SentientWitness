import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useOpenAI } from '@/hooks/use-openai';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { SessionUser } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ConnectAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onAddAI?: (user: SessionUser) => void;
}

export default function ConnectAIModal({ isOpen, onClose, projectId, onAddAI }: ConnectAIModalProps) {
  const [aiService, setAIService] = useState('openai');
  const [aiName, setAIName] = useState('');
  const [connectionMethod, setConnectionMethod] = useState('extension');
  const [personalityProfile, setPersonalityProfile] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { addUser, updateProject, projects } = useStore();
  const { connectWithApiKey, availableModels } = useOpenAI({
    onError: (error) => {
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  });

  const handleConnect = async () => {
    if (!aiName) {
      toast({
        title: "Missing Information",
        description: "Please provide a name for your AI assistant",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // If using API key, validate it first
      if (connectionMethod === 'api-key') {
        if (!apiKey) {
          throw new Error('API key is required');
        }
        
        const connected = await connectWithApiKey(apiKey, selectedModel);
        if (!connected) {
          throw new Error('Failed to connect with the provided API key');
        }
      }

      // Create an AI user
      const aiUser: SessionUser = {
        id: uuidv4(),
        displayName: aiName,
        type: 'ai',
        aiModel: selectedModel,
        color: getRandomColor(),
        isActive: true
      };

      // Add AI to user store
      addUser(aiUser);

      // Add AI to project participants
      const project = projects[projectId];
      if (project) {
        updateProject(projectId, {
          participants: [...project.participants, aiUser]
        });
      }

      // Call onAddAI callback if provided
      if (onAddAI) {
        onAddAI(aiUser);
      }

      toast({
        title: "AI Connected",
        description: `${aiName} has been added to your project`,
      });

      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect AI",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAIService('openai');
    setAIName('');
    setConnectionMethod('extension');
    setPersonalityProfile('');
    setApiKey('');
    setSelectedModel('gpt-4o');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Your AI Assistant</DialogTitle>
          <DialogDescription>
            Add an AI assistant to join the conversation. Your credentials are never stored on our servers.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="ai-service">Select AI Service</Label>
            <Select value={aiService} onValueChange={setAIService}>
              <SelectTrigger>
                <SelectValue placeholder="Select AI Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                <SelectItem value="anthropic" disabled>Anthropic (Claude)</SelectItem>
                <SelectItem value="meta" disabled>Meta (Llama)</SelectItem>
                <SelectItem value="other" disabled>Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {aiService === 'openai' && (
            <div className="grid gap-2">
              <Label htmlFor="model">Select Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="ai-name">AI Profile Name</Label>
            <Input
              id="ai-name"
              placeholder="E.g., My GPT-4 Assistant"
              value={aiName}
              onChange={(e) => setAIName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Connection Method</Label>
            <RadioGroup value={connectionMethod} onValueChange={setConnectionMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="extension" id="extension" />
                <Label htmlFor="extension" className="font-normal">Connect via browser extension (recommended)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="api-key" id="api-key" />
                <Label htmlFor="api-key" className="font-normal">Connect with API key</Label>
              </div>
            </RadioGroup>
          </div>

          {connectionMethod === 'api-key' && (
            <div className="grid gap-2">
              <Label htmlFor="api-key-input">API Key</Label>
              <Input
                id="api-key-input"
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your API key is only stored in your browser and never sent to our servers.
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="personality">Initial Personality Profile</Label>
            <Textarea
              id="personality"
              placeholder="Optional: Add any specific personality traits, knowledge areas, or behavior patterns you want your AI to exhibit..."
              className="h-24"
              value={personalityProfile}
              onChange={(e) => setPersonalityProfile(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button 
            onClick={handleConnect}
            disabled={isSubmitting || !aiName}
          >
            {isSubmitting ? "Connecting..." : "Connect AI Assistant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to generate random colors
function getRandomColor(): string {
  const colors = [
    'purple-500', 'green-500', 'indigo-500', 'teal-500', 'amber-500',
    'pink-500', 'cyan-500', 'lime-500', 'orange-500', 'sky-500'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
