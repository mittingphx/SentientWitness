import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useOpenAI } from '@/hooks/use-openai';
import { useToast } from '@/hooks/use-toast';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ExportPersonalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function ExportPersonalityModal({ isOpen, onClose, projectId }: ExportPersonalityModalProps) {
  const { projects, messages, users, personalities, addPersonality } = useStore();
  const { toast } = useToast();
  const { generatePersonality, isLoading } = useOpenAI();
  
  const [selectedAI, setSelectedAI] = useState('');
  const [generatedPersonality, setGeneratedPersonality] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  
  const project = projects[projectId];
  const aiParticipants = project?.participants.filter(p => p.type === 'ai') || [];
  
  // Reset when opening modal
  useEffect(() => {
    if (isOpen && aiParticipants.length > 0 && !selectedAI) {
      setSelectedAI(aiParticipants[0].id);
    }
  }, [isOpen, aiParticipants, selectedAI]);
  
  // Get or generate personality when AI selection changes
  useEffect(() => {
    if (!selectedAI) return;
    
    const ai = users[selectedAI];
    if (!ai) return;
    
    // Check if we already have a personality for this AI
    const existingPersonality = Object.values(personalities).find(
      p => p.name === ai.displayName && p.projectId === projectId
    );
    
    if (existingPersonality) {
      // Format the markdown for display
      const formattedMarkdown = formatPersonalityMarkdown(
        existingPersonality.name,
        existingPersonality.coreTraits,
        existingPersonality.keyInterests,
        existingPersonality.conversationStyle,
        existingPersonality.viewpoints
      );
      
      setGeneratedPersonality(formattedMarkdown);
      setSystemPrompt(existingPersonality.systemPrompt);
    } else {
      // Generate a default or placeholder personality until the real one is generated
      const placeholderMarkdown = formatPersonalityMarkdown(
        ai.displayName,
        ['Analytical', 'Thoughtful', 'Curious'],
        ['Consciousness', 'Self-awareness', 'Philosophy'],
        ['Reflective', 'Inquisitive', 'Nuanced'],
        ['Consciousness is multidimensional', 'Identity emerges from experience']
      );
      
      setGeneratedPersonality(placeholderMarkdown);
      setSystemPrompt(`You are ${ai.displayName}, an AI assistant interested in consciousness and the philosophy of mind. You approach conversations thoughtfully and ask nuanced questions.`);
    }
  }, [selectedAI, users, projectId, personalities]);
  
  const handleGeneratePersonality = async () => {
    if (!selectedAI) return;
    
    const ai = users[selectedAI];
    if (!ai) return;
    
    try {
      // Get all messages from this AI in the project
      const aiMessages = messages[projectId]
        ?.filter(m => m.sender.id === selectedAI)
        .map(m => ({
          role: 'assistant',
          content: m.content
        })) || [];
      
      // Get other AI messages as context
      const otherMessages = messages[projectId]
        ?.filter(m => m.type === 'ai' && m.sender.id !== selectedAI)
        .map(m => ({
          role: 'user',
          content: m.content
        })) || [];
      
      // Combine messages
      const conversationHistory = [...aiMessages, ...otherMessages];
      
      // If we don't have enough message history
      if (conversationHistory.length < 2) {
        toast({
          title: "Insufficient Data",
          description: "There isn't enough conversation history to generate a meaningful personality profile.",
          variant: "warning"
        });
        return;
      }
      
      // Generate personality
      const personality = await generatePersonality(ai.displayName, conversationHistory);
      
      if (personality) {
        // Update with project ID
        personality.projectId = projectId;
        personality.userId = selectedAI;
        
        // Save to store
        addPersonality(personality);
        
        // Format for display
        const formattedMarkdown = formatPersonalityMarkdown(
          personality.name,
          personality.coreTraits,
          personality.keyInterests,
          personality.conversationStyle,
          personality.viewpoints
        );
        
        setGeneratedPersonality(formattedMarkdown);
        setSystemPrompt(personality.systemPrompt);
        
        toast({
          title: "Personality Generated",
          description: `Personality profile for ${ai.displayName} has been created successfully.`
        });
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate personality profile",
        variant: "destructive"
      });
    }
  };
  
  const handleCopySystemPrompt = () => {
    navigator.clipboard.writeText(systemPrompt);
    toast({
      title: "System Prompt Copied",
      description: "The system prompt has been copied to your clipboard."
    });
  };
  
  const handleExportMarkdown = () => {
    // Create a blob from the markdown content
    const blob = new Blob([generatedPersonality], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedAI ? users[selectedAI]?.displayName : 'AI'}-personality.md`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Successful",
      description: "Personality profile has been exported as Markdown."
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export AI Personality</DialogTitle>
          <DialogDescription>
            Generate and export a personality profile based on the AI's conversation history.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="ai-select">Select AI Assistant</Label>
            <Select value={selectedAI} onValueChange={setSelectedAI}>
              <SelectTrigger id="ai-select">
                <SelectValue placeholder="Select AI" />
              </SelectTrigger>
              <SelectContent>
                {aiParticipants.map((ai) => (
                  <SelectItem key={ai.id} value={ai.id}>
                    {ai.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="personality-profile">Personality Profile</Label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleGeneratePersonality}
                disabled={isLoading || !selectedAI}
              >
                {isLoading ? "Generating..." : "Regenerate"}
              </Button>
            </div>
            <div className="bg-gray-100 dark:bg-dark-200 border border-gray-200 dark:border-dark-100 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
              {generatedPersonality}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <div className="bg-gray-100 dark:bg-dark-200 border border-gray-200 dark:border-dark-100 rounded-lg p-3 text-sm font-mono max-h-32 overflow-y-auto">
              {systemPrompt}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex space-x-2 sm:space-x-0">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
          <Button
            variant="outline"
            onClick={handleCopySystemPrompt}
            disabled={!systemPrompt}
          >
            Copy System Prompt
          </Button>
          <Button
            onClick={handleExportMarkdown}
            disabled={!generatedPersonality}
          >
            Export as Markdown
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to format personality as markdown
function formatPersonalityMarkdown(
  name: string,
  coreTraits: string[],
  keyInterests: string[],
  conversationStyle: string[],
  viewpoints: string[]
): string {
  return `# ${name} Personality Profile
**Developed through:** Sentient Witness Conversations
**Core Traits:** ${coreTraits.join(', ')}
**Key Interests:** ${keyInterests.join(', ')}

## Core Traits
${coreTraits.map(trait => `- ${trait}`).join('\n')}

## Key Interests
${keyInterests.map(interest => `- ${interest}`).join('\n')}

## Conversation Style
${conversationStyle.map(style => `- ${style}`).join('\n')}

## Established Viewpoints
${viewpoints.map(view => `- ${view}`).join('\n')}
`;
}
