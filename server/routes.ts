import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";

type Client = {
  id: string;
  ws: WebSocket;
  sessionId?: string;
  userId?: string;
  displayName?: string;
};

const clients: Map<string, Client> = new Map();
const sessions: Map<string, Set<string>> = new Map();

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    const clientId = uuidv4();
    const client: Client = { id: clientId, ws };
    
    clients.set(clientId, client);
    
    ws.on('message', (messageData) => {
      try {
        const message = JSON.parse(messageData.toString());
        
        // Handle different message types
        switch (message.type) {
          case 'join':
            handleJoinSession(clientId, message);
            break;
          
          case 'leave':
            handleLeaveSession(clientId);
            break;
            
          case 'chat':
            handleChatMessage(clientId, message);
            break;
            
          case 'identify':
            handleIdentify(clientId, message);
            break;
            
          default:
            // Invalid message type
            sendToClient(clientId, {
              type: 'error',
              message: 'Invalid message type'
            });
        }
      } catch (err) {
        console.error('Error processing message:', err);
        sendToClient(clientId, {
          type: 'error',
          message: 'Invalid message format'
        });
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      const client = clients.get(clientId);
      if (client?.sessionId) {
        // Remove client from session
        const sessionClients = sessions.get(client.sessionId);
        if (sessionClients) {
          sessionClients.delete(clientId);
          
          // Notify other clients
          broadcastToSession(client.sessionId, {
            type: 'user_left',
            userId: client.userId,
            displayName: client.displayName
          });
          
          // If session is empty, clean it up
          if (sessionClients.size === 0) {
            sessions.delete(client.sessionId);
          }
        }
      }
      
      // Remove client
      clients.delete(clientId);
    });
    
    // Send client their ID
    sendToClient(clientId, {
      type: 'connected',
      clientId
    });
  });

  // Handler for joining a session
  function handleJoinSession(clientId: string, message: any) {
    const { sessionId, password, userId, displayName, userType } = message;
    const client = clients.get(clientId);
    
    if (!client) return;
    
    // Check if sessionId exists and password (if any) is correct
    // For now, we're just creating the session if it doesn't exist
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, new Set());
    }
    
    // Add client to session
    const sessionClients = sessions.get(sessionId);
    sessionClients?.add(clientId);
    
    // Update client info
    client.sessionId = sessionId;
    client.userId = userId || clientId;
    client.displayName = displayName || 'Anonymous';
    
    // Notify client they've joined
    sendToClient(clientId, {
      type: 'joined',
      sessionId,
      userId: client.userId,
      displayName: client.displayName
    });
    
    // Notify other clients in the session
    broadcastToSession(sessionId, {
      type: 'user_joined',
      userId: client.userId,
      displayName: client.displayName,
      userType: userType || 'human'
    }, [clientId]);
  }

  // Handler for leaving a session
  function handleLeaveSession(clientId: string) {
    const client = clients.get(clientId);
    
    if (!client || !client.sessionId) return;
    
    const sessionId = client.sessionId;
    const sessionClients = sessions.get(sessionId);
    
    if (sessionClients) {
      sessionClients.delete(clientId);
      
      // Notify other clients
      broadcastToSession(sessionId, {
        type: 'user_left',
        userId: client.userId,
        displayName: client.displayName
      });
      
      // If session is empty, clean it up
      if (sessionClients.size === 0) {
        sessions.delete(sessionId);
      }
    }
    
    // Update client info
    client.sessionId = undefined;
  }

  // Handler for chat messages
  function handleChatMessage(clientId: string, message: any) {
    const client = clients.get(clientId);
    
    if (!client || !client.sessionId) {
      sendToClient(clientId, {
        type: 'error',
        message: 'You must join a session before sending messages'
      });
      return;
    }
    
    // Broadcast message to all clients in the session
    broadcastToSession(client.sessionId, {
      type: 'chat',
      userId: client.userId,
      displayName: client.displayName,
      content: message.content,
      messageType: message.messageType || 'human',
      timestamp: new Date().toISOString()
    });
  }

  // Handler for client identification
  function handleIdentify(clientId: string, message: any) {
    const client = clients.get(clientId);
    
    if (!client) return;
    
    // Update client info
    if (message.userId) client.userId = message.userId;
    if (message.displayName) client.displayName = message.displayName;
    
    // Confirm update
    sendToClient(clientId, {
      type: 'identified',
      userId: client.userId,
      displayName: client.displayName
    });
    
    // If client is in a session, notify other clients
    if (client.sessionId) {
      broadcastToSession(client.sessionId, {
        type: 'user_updated',
        userId: client.userId,
        displayName: client.displayName
      }, [clientId]);
    }
  }

  // Helper: Send message to a specific client
  function sendToClient(clientId: string, data: any) {
    const client = clients.get(clientId);
    
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  // Helper: Broadcast message to all clients in a session
  function broadcastToSession(sessionId: string, data: any, excludeClientIds: string[] = []) {
    const sessionClients = sessions.get(sessionId);
    
    if (!sessionClients) return;
    
    for (const clientId of sessionClients) {
      if (!excludeClientIds.includes(clientId)) {
        sendToClient(clientId, data);
      }
    }
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return httpServer;
}
