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
  userType?: 'human' | 'ai';
  peerConnections?: Set<string>; // Track peer connections
};

const clients: Map<string, Client> = new Map();
const sessions: Map<string, Set<string>> = new Map();

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

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
    
    // Convert Set to Array to avoid TypeScript error
    Array.from(sessionClients).forEach(clientId => {
      if (!excludeClientIds.includes(clientId)) {
        sendToClient(clientId, data);
      }
    });
  }

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
    client.userType = userType || 'human';
    
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
      userType: client.userType
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
    if (message.userType) client.userType = message.userType;
    
    // Confirm update
    sendToClient(clientId, {
      type: 'identified',
      userId: client.userId,
      displayName: client.displayName,
      userType: client.userType
    });
    
    // If client is in a session, notify other clients
    if (client.sessionId) {
      broadcastToSession(client.sessionId, {
        type: 'user_updated',
        userId: client.userId,
        displayName: client.displayName,
        userType: client.userType
      }, [clientId]);
    }
  }

  // Handler for WebRTC signaling messages
  function handleSignalingMessage(clientId: string, message: any) {
    const client = clients.get(clientId);
    
    if (!client || !client.sessionId) {
      sendToClient(clientId, {
        type: 'error',
        message: 'You must join a session before sending signaling messages'
      });
      return;
    }
    
    const { signalingType, targetId, sessionId, payload } = message;
    
    // Validate that client is in the session they're sending for
    if (client.sessionId !== sessionId) {
      sendToClient(clientId, {
        type: 'error',
        message: 'You can only send signaling messages for your current session'
      });
      return;
    }
    
    // Make sure the target client exists and is in the same session
    const targetClient = clients.get(targetId);
    if (!targetClient || targetClient.sessionId !== sessionId) {
      sendToClient(clientId, {
        type: 'error',
        message: 'Target client not found in session'
      });
      return;
    }
    
    // Initialize peer connection tracking if needed
    if (!client.peerConnections) {
      client.peerConnections = new Set();
    }
    
    // For offer messages, record that this client is trying to connect to target
    if (signalingType === 'offer') {
      client.peerConnections.add(targetId);
    }
    
    // Add sender info to the message
    const forwardedMessage = {
      ...message,
      senderName: client.displayName,
      userType: client.userType
    };
    
    // Forward the signaling message to the target client
    sendToClient(targetId, forwardedMessage);
  }

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

          case 'signaling':
            handleSignalingMessage(clientId, message);
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

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return httpServer;
}
