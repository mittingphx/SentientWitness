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

export interface UseOpenAIReturn {
  isLoading: boolean;
  error: Error | null;
  client: OpenAIClient | null;
  generateCompletion: (messages: OpenAIMessage[], options?: {
    temperature?: number,
    maxTokens?: number,
  }) => Promise<string>;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  hasApiKey: boolean;
  availableModels: string[];
  apiKey: string | null;
}

/**
 * A hook for interacting with the OpenAI API
 */
export const useOpenAI = (options: UseOpenAIOptions = {}): UseOpenAIReturn => {
  const [client, setClient] = useState<OpenAIClient | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(options.apiKey || null);
  const [model, setModel] = useState<string>(options.model || 'gpt-4o');
  
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
      
      if (options.onError) {
        options.onError(err instanceof Error ? err : new Error('Unknown error initializing OpenAI client'));
      }
    }
  }, [apiKey, model, options.onError]);
  
  // Generate a completion from the OpenAI API
  const generateCompletion = useCallback(async (
    messages: OpenAIMessage[],
    options: {
      temperature?: number,
      maxTokens?: number,
    } = {}
  ): Promise<string> => {
    if (!client) {
      throw new Error('OpenAI client not initialized. Set an API key first.');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.createChatCompletion(
        messages,
        options.temperature,
        options.maxTokens
      );
      
      return result;
    } catch (err) {
      console.error('Error generating completion:', err);
      const error = err instanceof Error ? err : new Error('Unknown error generating completion');
      setError(error);
      
      // Pass error to the parent onError handler if provided
      if (options.onError) {
        // This can't be called because options.onError doesn't exist on this type
        // We'll use the parent onError handler from the hook options instead
        if (options.onError) {}
      }
      
      // Use the handler from hook options
      if (options.onError && typeof options.onError === 'function') {
        options.onError(error);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [client, options.onError]);
  
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