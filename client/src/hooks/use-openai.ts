import { useState, useEffect, useCallback } from 'react';
import { OpenAIClient, OPENAI_MODELS } from '../lib/openai';

// Import the OpenAIMessage type from the client implementation
type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface UseOpenAIOptions {
  apiKey?: string;
  model?: string;
  onError?: (error: Error) => void;
}

// Define a consistent options interface for completion requests
interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  onError?: (error: Error) => void;
}

export interface UseOpenAIReturn {
  isLoading: boolean;
  error: Error | null;
  client: OpenAIClient | null;
  generateCompletion: (messages: OpenAIMessage[], options?: CompletionOptions) => Promise<string>;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  hasApiKey: boolean;
  availableModels: string[];
  apiKey: string | null;
}

/**
 * A hook for interacting with the OpenAI API
 */
export const useOpenAI = (hookOptions: UseOpenAIOptions = {}): UseOpenAIReturn => {
  const [client, setClient] = useState<OpenAIClient | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(hookOptions.apiKey || null);
  const [model, setModel] = useState<string>(hookOptions.model || 'gpt-4o');
  
  // Set the API key
  const handleSetApiKey = useCallback((key: string) => {
    setApiKey(key);
  }, []);
  
  // Set the model
  const handleSetModel = useCallback((newModel: string) => {
    setModel(newModel);
    if (client) {
      client.setModel(newModel);
    }
  }, [client]);
  
  // Initialize the client when the API key changes
  useEffect(() => {
    if (!apiKey) {
      setClient(null);
      return;
    }
    
    try {
      const newClient = new OpenAIClient(apiKey, model);
      setClient(newClient);
      setError(null);
    } catch (err) {
      console.error('Error initializing OpenAI client:', err);
      setClient(null);
      setError(err instanceof Error ? err : new Error('Unknown error initializing OpenAI client'));
      
      if (hookOptions.onError) {
        hookOptions.onError(err instanceof Error ? err : new Error('Unknown error initializing OpenAI client'));
      }
    }
  }, [apiKey, model, hookOptions.onError]);
  
  // Generate a completion from the OpenAI API
  const generateCompletion = useCallback(async (
    messages: OpenAIMessage[],
    completionOptions: CompletionOptions = {}
  ): Promise<string> => {
    if (!client) {
      throw new Error('OpenAI client not initialized. Set an API key first.');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.createChatCompletion(
        messages,
        completionOptions.temperature,
        completionOptions.maxTokens
      );
      
      return result;
    } catch (err) {
      console.error('Error generating completion:', err);
      const error = err instanceof Error ? err : new Error('Unknown error generating completion');
      setError(error);
      
      // Call the error handler if provided in completion options
      if (completionOptions.onError) {
        completionOptions.onError(error);
      } 
      // Fall back to the global error handler
      else if (hookOptions.onError) {
        hookOptions.onError(error);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [client, hookOptions.onError]);
  
  return {
    isLoading,
    error,
    client,
    generateCompletion,
    setApiKey: handleSetApiKey,
    setModel: handleSetModel,
    hasApiKey: Boolean(apiKey),
    availableModels: OPENAI_MODELS,
    apiKey
  };
};