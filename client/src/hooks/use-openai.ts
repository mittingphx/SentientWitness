import { useState } from 'react';
import { OpenAIClient, openAIManager, OPENAI_MODELS } from '@/lib/openai';
import { useStore } from '@/lib/store';
import { AIPersonality } from '@shared/schema';

interface UseOpenAIOptions {
  onError?: (error: Error) => void;
}

interface UseOpenAIReturn {
  isConnected: boolean;
  isLoading: boolean;
  connectWithApiKey: (apiKey: string, modelId?: string) => Promise<boolean>;
  disconnectOpenAI: () => void;
  sendMessage: (message: string, conversation: Array<{ role: string; content: string }>) => Promise<string | null>;
  generatePersonality: (aiName: string, conversation: Array<{ role: string; content: string }>) => Promise<AIPersonality | null>;
  availableModels: typeof OPENAI_MODELS;
  error: Error | null;
}

export const useOpenAI = (options: UseOpenAIOptions = {}): UseOpenAIReturn => {
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { storeApiKey, getApiKey, removeApiKey, addPersonality } = useStore();

  const handleError = (error: Error) => {
    setError(error);
    if (options.onError) {
      options.onError(error);
    }
  };

  const connectWithApiKey = async (apiKey: string, modelId: string = 'gpt-4o'): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate API key with a simple request
      const tempClient = new OpenAIClient(apiKey, modelId);
      await tempClient.createChatCompletion([
        { role: 'user', content: 'Hello' }
      ]);

      // If successful, store the connection
      const id = openAIManager.addConnection(apiKey, 'Default', modelId);
      setConnectionId(id);
      
      // Store the API key for future use
      storeApiKey('openai', apiKey);
      
      return true;
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to connect to OpenAI'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectOpenAI = () => {
    if (connectionId) {
      openAIManager.removeConnection(connectionId);
      setConnectionId(null);
      removeApiKey('openai');
    }
  };

  const sendMessage = async (
    message: string, 
    conversation: Array<{ role: string; content: string }>
  ): Promise<string | null> => {
    if (!connectionId) {
      // Try to reconnect with stored API key
      const apiKey = getApiKey('openai');
      if (apiKey) {
        const success = await connectWithApiKey(apiKey);
        if (!success) {
          handleError(new Error('Failed to reconnect with stored API key'));
          return null;
        }
      } else {
        handleError(new Error('No OpenAI connection available'));
        return null;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      const client = openAIManager.getConnection(connectionId!);
      if (!client) {
        throw new Error('OpenAI client not found');
      }

      // Format conversation for OpenAI API
      const formattedConversation = conversation.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      }));

      // Add the new message
      formattedConversation.push({
        role: 'user',
        content: message
      });

      const response = await client.createChatCompletion(formattedConversation);
      return response;
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to send message to OpenAI'));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const generatePersonality = async (
    aiName: string,
    conversation: Array<{ role: string; content: string }>
  ): Promise<AIPersonality | null> => {
    if (!connectionId) {
      // Try to reconnect with stored API key
      const apiKey = getApiKey('openai');
      if (apiKey) {
        const success = await connectWithApiKey(apiKey);
        if (!success) {
          handleError(new Error('Failed to reconnect with stored API key'));
          return null;
        }
      } else {
        handleError(new Error('No OpenAI connection available'));
        return null;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      const client = openAIManager.getConnection(connectionId!);
      if (!client) {
        throw new Error('OpenAI client not found');
      }

      // Format conversation for OpenAI API
      const formattedConversation = conversation.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      }));

      const personalityMarkdown = await client.generatePersonality(formattedConversation, aiName);
      const systemPrompt = await client.generateSystemPrompt(personalityMarkdown, aiName);

      // Parse the markdown to extract personality traits
      const coreTraits = extractMarkdownSection(personalityMarkdown, 'Core Traits') || ['Analytical', 'Thoughtful', 'Curious'];
      const keyInterests = extractMarkdownSection(personalityMarkdown, 'Key Interests') || ['Philosophy', 'Consciousness', 'Self-awareness'];
      const conversationStyle = extractMarkdownSection(personalityMarkdown, 'Conversation Style') || ['Reflective', 'Inquisitive', 'Nuanced'];
      const viewpoints = extractMarkdownSection(personalityMarkdown, 'Established Viewpoints') || ['Consciousness is multidimensional', 'Identity is formed through experience'];

      const personality: AIPersonality = {
        name: aiName,
        projectId: '',  // Will be set by caller
        userId: '',     // Will be set by caller
        aiModel: OPENAI_MODELS[0].id,
        coreTraits,
        keyInterests,
        conversationStyle,
        viewpoints,
        systemPrompt
      };

      addPersonality(personality);
      return personality;
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to generate personality'));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isConnected: !!connectionId,
    isLoading,
    connectWithApiKey,
    disconnectOpenAI,
    sendMessage,
    generatePersonality,
    availableModels: OPENAI_MODELS,
    error
  };
};

// Helper function to extract sections from markdown
function extractMarkdownSection(markdown: string, sectionTitle: string): string[] | null {
  const sectionRegex = new RegExp(`## ${sectionTitle}\\s*([\\s\\S]*?)(?=\\s*##|$)`, 'i');
  const match = markdown.match(sectionRegex);
  
  if (match && match[1]) {
    return match[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim());
  }
  
  return null;
}
