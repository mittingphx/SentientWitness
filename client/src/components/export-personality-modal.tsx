import { useState, useEffect, useCallback } from 'react';
import { useOpenAI } from '../hooks/use-openai';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  FileDown,
  Copy as CopyIcon,
  Download,
  CloudUpload,
  Loader2,
  Check,
  Lock,
  Bot,
  Key
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { AIPersonality, SessionMessage } from '../shared/schema';

interface ExportPersonalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  messages?: SessionMessage[];
  apiKey?: string;
}

export default function ExportPersonalityModal({ 
  isOpen, 
  onClose,
  projectId,
  messages = [], 
  apiKey
}: ExportPersonalityModalProps) {
  const { toast } = useToast();
  
  // AI name state
  const [aiName, setAiName] = useState<string>('Assistant');
  
  // Tabs state
  const [activeTab, setActiveTab] = useState<string>('export');
  
  // Export personality state
  const [generatedPersonality, setGeneratedPersonality] = useState<AIPersonality | null>(null);
  const [personalityMarkdown, setPersonalityMarkdown] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Import personality state
  const [importedMarkdown, setImportedMarkdown] = useState<string>('');
  const [includeServerPrompt, setIncludeServerPrompt] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [serverApiKey, setServerApiKey] = useState<string>('');
  
  // Setup OpenAI
  const openai = useOpenAI({
    apiKey: apiKey,
    onError: (error) => {
      console.error('OpenAI error:', error);
      toast({
        title: 'API Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Filter AI messages from the conversation
  const aiMessages = messages.filter((m) => m.type === 'ai');
  
  // Reset the form when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('export');
      setAiName('Assistant');
      setGeneratedPersonality(null);
      setPersonalityMarkdown('');
      setImportedMarkdown('');
      setIncludeServerPrompt(false);
      setServerUrl('');
      setServerApiKey('');
    }
  }, [isOpen]);
  
  // Format the messages for the OpenAI API
  const formatMessagesForApi = useCallback(() => {
    return aiMessages.map((msg) => ({
      role: 'assistant',
      content: msg.content
    }));
  }, [aiMessages]);
  
  // Generate the personality from the AI messages
  const generatePersonality = useCallback(async () => {
    if (!openai.hasApiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your OpenAI API key to generate a personality.',
        variant: 'destructive'
      });
      return;
    }
    
    if (aiMessages.length === 0) {
      toast({
        title: 'No Messages',
        description: 'There are no AI messages to generate a personality from.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const formattedMessages = formatMessagesForApi();
      
      // Create OpenAI client if needed
      if (openai.client) {
        const personality = await openai.client.generatePersonality(aiName, formattedMessages);
        setGeneratedPersonality(personality);
        
        // Format the personality as markdown
        const markdown = formatPersonalityMarkdown(personality);
        setPersonalityMarkdown(markdown);
        
        toast({
          title: 'Personality Generated',
          description: 'AI personality has been successfully generated.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error generating personality:', error);
      toast({
        title: 'Generation Error',
        description: error instanceof Error ? error.message : 'Unknown error generating personality',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [aiMessages, aiName, formatMessagesForApi, openai.client, openai.hasApiKey, toast]);
  
  // Copy the markdown to the clipboard
  const copyMarkdown = useCallback(() => {
    try {
      navigator.clipboard.writeText(personalityMarkdown);
      toast({
        title: 'Copied',
        description: 'Personality markdown has been copied to clipboard',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error copying markdown:', error);
      toast({
        title: 'Copy Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      });
    }
  }, [personalityMarkdown, toast]);
  
  // Download the personality as a markdown file
  const downloadMarkdown = useCallback(() => {
    try {
      const fileName = `${aiName.replace(/\s+/g, '_').toLowerCase()}_personality.md`;
      const blob = new Blob([personalityMarkdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Downloaded',
        description: `Personality saved as ${fileName}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error downloading markdown:', error);
      toast({
        title: 'Download Error',
        description: 'Failed to download personality file',
        variant: 'destructive'
      });
    }
  }, [aiName, personalityMarkdown, toast]);
  
  // Parse the imported markdown into a personality
  const parseImportedMarkdown = useCallback(() => {
    try {
      const personality = parsePersonalityMarkdown(importedMarkdown);
      
      if (personality) {
        toast({
          title: 'Personality Imported',
          description: `Successfully imported ${personality.name}'s personality`,
          variant: 'default'
        });
        
        // Handle server prompt if needed
        if (includeServerPrompt && serverUrl) {
          // Add the server reference to the personality
          const updatedMarkdown = importedMarkdown + `\n\n## Server Reference\n- URL: ${serverUrl}\n- Key: ${serverApiKey ? '[Protected]' : 'None'}\n`;
          setImportedMarkdown(updatedMarkdown);
          
          toast({
            title: 'Server Information Added',
            description: 'External server reference has been added to the personality',
            variant: 'default'
          });
        }
      } else {
        toast({
          title: 'Invalid Format',
          description: 'The imported markdown does not contain a valid personality',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error parsing markdown:', error);
      toast({
        title: 'Import Error',
        description: error instanceof Error ? error.message : 'Unknown error importing personality',
        variant: 'destructive'
      });
    }
  }, [importedMarkdown, includeServerPrompt, serverUrl, serverApiKey, toast]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            AI Personality Export/Import
          </DialogTitle>
          <DialogDescription>
            Export AI personality traits or import a personality from markdown.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="export" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export Personality</TabsTrigger>
            <TabsTrigger value="import">Import Personality</TabsTrigger>
          </TabsList>
          
          <TabsContent value="export">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    AI Personality Generator
                  </CardTitle>
                  <CardDescription>
                    Generate a personality profile based on the AI's messages.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="ai-name">AI Name</Label>
                      <Input
                        id="ai-name"
                        value={aiName}
                        onChange={(e) => setAiName(e.target.value)}
                        placeholder="Enter a name for this AI"
                      />
                    </div>
                    
                    {!openai.hasApiKey && (
                      <div>
                        <Label htmlFor="openai-key">OpenAI API Key</Label>
                        <div className="flex gap-2 mt-1.5">
                          <Input
                            id="openai-key"
                            type="password"
                            value={openai.apiKey || ''}
                            onChange={(e) => openai.setApiKey(e.target.value)}
                            placeholder="Enter your OpenAI API key"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      Using {aiMessages.length} AI message{aiMessages.length !== 1 ? 's' : ''} for personality generation.
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={generatePersonality}
                    disabled={isGenerating || !openai.hasApiKey || aiMessages.length === 0}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        Generate Personality
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
              
              {generatedPersonality && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      {generatedPersonality.name}'s Personality
                    </CardTitle>
                    <CardDescription>
                      Generated personality profile in markdown format
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      className="h-[300px] font-mono text-sm"
                      value={personalityMarkdown}
                      readOnly
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={copyMarkdown}
                    >
                      <CopyIcon className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={downloadMarkdown}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="import">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Import AI Personality
                  </CardTitle>
                  <CardDescription>
                    Import a personality profile from markdown format.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="import-markdown">Personality Markdown</Label>
                      <Textarea
                        id="import-markdown"
                        className="h-[200px] font-mono text-sm"
                        value={importedMarkdown}
                        onChange={(e) => setImportedMarkdown(e.target.value)}
                        placeholder="# AI Name's Personality
## Core Traits
- Trait 1
- Trait 2

## Key Interests
- Interest 1
- Interest 2

## Conversation Style
- Style 1
- Style 2

## Viewpoints
- Viewpoint 1
- Viewpoint 2

## System Prompt
You are an AI with a specific personality..."
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="server-prompt"
                        checked={includeServerPrompt}
                        onCheckedChange={setIncludeServerPrompt}
                      />
                      <Label htmlFor="server-prompt" className="cursor-pointer">Include external personality server</Label>
                    </div>
                    
                    {includeServerPrompt && (
                      <div className="border rounded-md p-3 space-y-3">
                        <div>
                          <Label htmlFor="server-url">
                            <Lock className="h-3 w-3 inline-block mr-1" />
                            Personality Server URL
                          </Label>
                          <Input
                            id="server-url"
                            value={serverUrl}
                            onChange={(e) => setServerUrl(e.target.value)}
                            placeholder="https://your-personality-server.com/api"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="server-api-key">
                            <Key className="h-3 w-3 inline-block mr-1" />
                            Server API Key (Optional)
                          </Label>
                          <Input
                            id="server-api-key"
                            type="password"
                            value={serverApiKey}
                            onChange={(e) => setServerApiKey(e.target.value)}
                            placeholder="Enter server API key if required"
                          />
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          The personality server will be used to fetch additional prompts and data.
                          This enables premium personality features.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={parseImportedMarkdown}
                    disabled={!importedMarkdown.trim()}
                  >
                    <CloudUpload className="h-4 w-4 mr-2" />
                    Import Personality
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to format a personality as markdown
function formatPersonalityMarkdown(
  personality: AIPersonality,
): string {
  return `# ${personality.name}'s Personality

## Core Traits
${personality.coreTraits.map(trait => `- ${trait}`).join('\n')}

## Key Interests
${personality.keyInterests.map(interest => `- ${interest}`).join('\n')}

## Conversation Style
${personality.conversationStyle.map(style => `- ${style}`).join('\n')}

## Viewpoints
${personality.viewpoints.map(view => `- ${view}`).join('\n')}

## System Prompt
${personality.systemPrompt}

## AI Model
${personality.aiModel}`;
}

// Helper function to parse a markdown into a personality
function parsePersonalityMarkdown(markdown: string): AIPersonality | null {
  try {
    // Extract the name from the title
    const titleMatch = markdown.match(/^# ([^']+)(?:'s)? Personality/m);
    const name = titleMatch ? titleMatch[1].trim() : 'Unknown AI';
    
    // Extract sections
    const coreTraits = extractMarkdownSection(markdown, 'Core Traits') || [];
    const keyInterests = extractMarkdownSection(markdown, 'Key Interests') || [];
    const conversationStyle = extractMarkdownSection(markdown, 'Conversation Style') || [];
    const viewpoints = extractMarkdownSection(markdown, 'Viewpoints') || [];
    
    // Extract system prompt
    const systemPromptSection = markdown.split('## System Prompt')[1];
    let systemPrompt = '';
    if (systemPromptSection) {
      const nextSection = systemPromptSection.match(/\n## /);
      if (nextSection) {
        systemPrompt = systemPromptSection.substring(0, nextSection.index).trim();
      } else {
        systemPrompt = systemPromptSection.trim();
      }
    }
    
    // Extract AI model
    const modelSection = markdown.split('## AI Model')[1];
    let aiModel = 'gpt-4o';
    if (modelSection) {
      aiModel = modelSection.trim();
    }
    
    // Create the personality object
    return {
      name,
      projectId: '',
      userId: '',
      aiModel,
      coreTraits,
      keyInterests,
      conversationStyle,
      viewpoints,
      systemPrompt
    };
  } catch (error) {
    console.error('Error parsing personality markdown:', error);
    return null;
  }
}

// Helper function to extract a section from markdown
function extractMarkdownSection(markdown: string, sectionTitle: string): string[] | null {
  const sectionRegex = new RegExp(`## ${sectionTitle}\\s*\\n([\\s\\S]*?)(?:\\n## |$)`, 'm');
  const match = markdown.match(sectionRegex);
  
  if (!match || !match[1]) {
    return null;
  }
  
  return match[1]
    .trim()
    .split('\n')
    .filter(line => line.trim().startsWith('- '))
    .map(line => line.replace(/^- /, '').trim());
}