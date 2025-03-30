import { v4 as uuidv4 } from 'uuid';
import { AIPersonality } from '../shared/schema';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ConversationMessage {
  role: string;
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

/**
 * Represents a client for interacting with the OpenAI API.
 */
export class OpenAIClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';
  private model: string;

  /**
   * Creates a new OpenAI client.
   * @param apiKey The OpenAI API key to use for requests.
   * @param model The OpenAI model to use. Defaults to 'gpt-4o'.
   */
  constructor(apiKey: string, model: string = 'gpt-4o') {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Gets the current model being used.
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Sets the model to use for future requests.
   * @param model The OpenAI model to use.
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Creates a chat completion using the OpenAI API.
   * @param messages An array of messages to send to the API.
   * @param temperature The temperature to use for the completion. Defaults to 0.7.
   * @param maxTokens The maximum number of tokens to generate. Defaults to 1000.
   * @returns The completion content from the API.
   */
  async createChatCompletion(
    messages: OpenAIMessage[],
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Promise<string> {
    // Create the request body
    const requestBody: OpenAICompletionRequest = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens
    };

    // Send the request to the OpenAI API
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    // Check if the response is OK
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
    }

    // Parse the response
    const data: OpenAICompletionResponse = await response.json();

    // Return the completion content
    return data.choices[0].message.content;
  }

  /**
   * Generates a personality for an AI based on a conversation.
   * @param aiName The name of the AI.
   * @param conversation The conversation to use for generating the personality.
   * @returns A Promise that resolves to an AIPersonality object.
   */
  async generatePersonality(
    aiName: string,
    conversation: ConversationMessage[]
  ): Promise<AIPersonality> {
    // Create a system prompt to guide the AI in generating a personality
    const systemPrompt: OpenAIMessage = {
      role: 'system',
      content: `You are a personality analyst and need to create a unique and detailed personality profile for an AI named "${aiName}" based on their conversation history. 
      
The profile should include:
1. Core Traits (5-8 key personality traits)
2. Key Interests (5-8 topics or areas the AI seems interested in)
3. Conversation Style (5-8 distinct characteristics of how the AI communicates)
4. Viewpoints (5-8 perspectives or opinions the AI holds)

Additionally, generate a comprehensive system prompt that would guide another AI to emulate this personality accurately.

Format your response as a JSON object with these fields:
{
  "coreTraits": ["trait1", "trait2",...],
  "keyInterests": ["interest1", "interest2",...],
  "conversationStyle": ["style1", "style2",...],
  "viewpoints": ["viewpoint1", "viewpoint2",...],
  "systemPrompt": "Detailed system prompt text that captures the entire personality"
}`
    };

    try {
      // Create the request body with the system prompt and conversation
      const requestBody: OpenAICompletionRequest = {
        model: this.model,
        messages: [
          systemPrompt,
          {
            role: 'user',
            content: `I need to create a personality profile for an AI named "${aiName}" based on these conversation messages: ${JSON.stringify(conversation)}`
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      };

      // Send the request to the OpenAI API
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      // Check if the response is OK
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
      }

      // Parse the response
      const data: OpenAICompletionResponse = await response.json();
      const content = data.choices[0].message.content;

      // Parse the JSON response
      const personalityData = JSON.parse(content);

      // Create and return the AIPersonality object
      return {
        name: aiName,
        projectId: uuidv4(),
        userId: uuidv4(),
        aiModel: this.model,
        coreTraits: personalityData.coreTraits || [],
        keyInterests: personalityData.keyInterests || [],
        conversationStyle: personalityData.conversationStyle || [],
        viewpoints: personalityData.viewpoints || [],
        systemPrompt: personalityData.systemPrompt || ''
      };
    } catch (error) {
      console.error('Error generating personality:', error);
      throw error;
    }
  }

  /**
   * Generates a system prompt from a personality markdown and AI name.
   * @param personalityMarkdown The markdown representation of the personality.
   * @param aiName The name of the AI.
   * @returns A Promise that resolves to a system prompt string.
   */
  async generateSystemPrompt(personalityMarkdown: string, aiName: string): Promise<string> {
    const systemPrompt: OpenAIMessage = {
      role: 'system',
      content: `You are an AI system prompt generator. Your task is to take a personality profile in markdown format and convert it into a detailed system prompt that would guide an AI to embody this personality. The system prompt should be comprehensive, detailed, and formatted for direct use.`
    };

    const userPrompt: OpenAIMessage = {
      role: 'user',
      content: `Here is a personality profile in markdown format for an AI named "${aiName}". Please convert it into a comprehensive system prompt:

${personalityMarkdown}`
    };

    try {
      const response = await this.createChatCompletion([systemPrompt, userPrompt], 0.7, 2000);
      return response;
    } catch (error) {
      console.error('Error generating system prompt:', error);
      throw error;
    }
  }
}

/**
 * A manager for multiple OpenAI client connections.
 */
export class OpenAIManager {
  private connections: Map<string, OpenAIClient> = new Map();

  /**
   * Adds a new connection to the manager.
   * @param apiKey The OpenAI API key to use for the connection.
   * @param name A name for the connection. Defaults to 'Default'.
   * @param model The OpenAI model to use. Defaults to 'gpt-4o'.
   * @returns A unique ID for the connection.
   */
  addConnection(apiKey: string, name: string = 'Default', model: string = 'gpt-4o'): string {
    const id = uuidv4();
    this.connections.set(id, new OpenAIClient(apiKey, model));
    return id;
  }

  /**
   * Gets a connection by ID.
   * @param id The ID of the connection to get.
   * @returns The OpenAIClient instance, or undefined if not found.
   */
  getConnection(id: string): OpenAIClient | undefined {
    return this.connections.get(id);
  }

  /**
   * Removes a connection from the manager.
   * @param id The ID of the connection to remove.
   * @returns True if the connection was removed, false otherwise.
   */
  removeConnection(id: string): boolean {
    return this.connections.delete(id);
  }

  /**
   * Lists all connection IDs.
   * @returns An array of connection IDs.
   */
  listConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Checks if a connection exists.
   * @param id The ID of the connection to check.
   * @returns True if the connection exists, false otherwise.
   */
  hasConnection(id: string): boolean {
    return this.connections.has(id);
  }
}

// Available OpenAI models
export const OPENAI_MODELS = [
  'gpt-4o',           // Default, newest and most capable
  'gpt-4-turbo',      // Fast and cost-effective
  'gpt-4',            // Previous generation, more expensive
  'gpt-3.5-turbo'     // Faster but less capable
];

// Create a singleton instance of the OpenAIManager
export const openAIManager = new OpenAIManager();