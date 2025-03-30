import { v4 as uuidv4 } from 'uuid';

// Define the OpenAI API interfaces
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' } | { type: 'text' };
}

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Class to handle OpenAI API interactions
export class OpenAIClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o') {
    this.apiKey = apiKey;
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    this.model = model;
  }

  // Method to send a completion request to the OpenAI API
  async createChatCompletion(
    messages: OpenAIMessage[],
    options: {
      temperature?: number;
      max_tokens?: number;
      response_format?: 'json_object' | 'text';
    } = {}
  ): Promise<string> {
    const requestBody: OpenAICompletionRequest = {
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
    };

    if (options.response_format) {
      requestBody.response_format = { type: options.response_format };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as OpenAICompletionResponse;
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }

  // Method to generate an AI personality based on previous conversations
  async generatePersonality(
    conversationHistory: OpenAIMessage[],
    aiName: string
  ): Promise<string> {
    const systemPrompt: OpenAIMessage = {
      role: 'system',
      content: `Analyze the conversation history of an AI assistant named ${aiName} and generate a personality profile in markdown format. The profile should include:
1. Core traits (3-5 adjectives)
2. Key interests (3-5 topics)
3. Conversation style (3-5 characteristics)
4. Established viewpoints (3-5 beliefs or positions)
5. A system prompt that captures this personality for future conversations

Format the response as a markdown document with appropriate sections and formatting.`
    };

    const response = await this.createChatCompletion(
      [systemPrompt, ...conversationHistory],
      { temperature: 0.7 }
    );

    return response;
  }

  // Method to generate a system prompt from a personality profile
  async generateSystemPrompt(personalityMarkdown: string, aiName: string): Promise<string> {
    const systemPrompt: OpenAIMessage = {
      role: 'system',
      content: `Based on the following personality profile for an AI assistant named ${aiName}, generate a concise system prompt that captures the essence of this personality for use in future conversations.

${personalityMarkdown}

Create a system prompt that is 2-3 paragraphs long and clearly defines the AI's personality, interests, and conversational style.`
    };

    const response = await this.createChatCompletion(
      [systemPrompt],
      { temperature: 0.7 }
    );

    return response;
  }
}

// Class to handle OpenAI account connections and management
export class OpenAIManager {
  private connections: Map<string, OpenAIClient> = new Map();

  // Add a new OpenAI connection
  addConnection(apiKey: string, name: string = 'Default', model: string = 'gpt-4o'): string {
    const id = uuidv4();
    this.connections.set(id, new OpenAIClient(apiKey, model));
    return id;
  }

  // Get an existing OpenAI connection
  getConnection(id: string): OpenAIClient | undefined {
    return this.connections.get(id);
  }

  // Remove an OpenAI connection
  removeConnection(id: string): boolean {
    return this.connections.delete(id);
  }

  // List all connections
  listConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  // Check if a connection exists
  hasConnection(id: string): boolean {
    return this.connections.has(id);
  }
}

// Export available models
export const OPENAI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o (Latest)', provider: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' }
];

// Export a singleton instance of the OpenAI manager
export const openAIManager = new OpenAIManager();
