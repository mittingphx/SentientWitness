import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Types
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type DataHandler = (data: any) => void;
type SignalingMessage = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'peer-disconnect';
  senderId: string;
  targetId?: string;
  sessionId: string;
  payload: any;
};

interface PeerMessage {
  type: string;
  content: any;
  senderId: string;
  senderName?: string;
  timestamp: string;
}

// Hook configuration options
interface UsePeerConnectionOptions {
  onData?: DataHandler;
  onConnectionChange?: (status: ConnectionStatus, peerId?: string) => void;
  onError?: (error: any) => void;
}

// Return type for the hook
interface UsePeerConnectionReturn {
  status: ConnectionStatus;
  peerId: string | null;
  peerName: string | null;
  createOffer: (targetId: string, sessionId: string) => Promise<void>;
  acceptOffer: (offer: RTCSessionDescriptionInit, senderId: string, sessionId: string) => Promise<void>;
  sendData: (data: any) => boolean;
  closeConnection: () => void;
  localId: string;
  isInitiator: boolean;
}

/**
 * A hook for creating direct peer-to-peer connections between browsers
 */
export const usePeerConnection = (
  wsConnection: any,
  options: UsePeerConnectionOptions = {}
): UsePeerConnectionReturn => {
  const { onData, onConnectionChange, onError } = options;

  // State
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);
  
  // Generate a unique local ID for this peer
  const localId = useRef(uuidv4()).current;
  
  // References
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const currentSessionId = useRef<string | null>(null);

  // ICE servers configuration (STUN/TURN servers)
  // These are public STUN servers that help with NAT traversal
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  /**
   * Initialize a new peer connection
   */
  const initializePeerConnection = useCallback(() => {
    // Close any existing connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    try {
      // Create a new RTCPeerConnection
      const peerConnection = new RTCPeerConnection({ iceServers });
      peerConnectionRef.current = peerConnection;

      // Event listeners
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && wsConnection && currentSessionId.current && peerId) {
          // Send ICE candidate to peer via signaling server
          wsConnection.sendMessage({
            type: 'signaling',
            signalingType: 'ice-candidate',
            senderId: localId,
            targetId: peerId,
            sessionId: currentSessionId.current,
            payload: event.candidate
          });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        switch (peerConnection.connectionState) {
          case 'connected':
            setStatus('connected');
            if (onConnectionChange) onConnectionChange('connected', peerId || undefined);
            break;
          case 'disconnected':
          case 'failed':
          case 'closed':
            setStatus('disconnected');
            if (onConnectionChange) onConnectionChange('disconnected');
            break;
          default:
            break;
        }
      };

      peerConnection.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };

      return peerConnection;
    } catch (error) {
      console.error('Failed to create peer connection:', error);
      setStatus('error');
      if (onError) onError(error);
      return null;
    }
  }, [wsConnection, localId, peerId, onConnectionChange, onError]);

  /**
   * Set up and configure the data channel
   */
  const setupDataChannel = useCallback((dataChannel: RTCDataChannel) => {
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log('Data channel opened');
      setStatus('connected');
      if (onConnectionChange) onConnectionChange('connected', peerId || undefined);
    };

    dataChannel.onclose = () => {
      console.log('Data channel closed');
      setStatus('disconnected');
      if (onConnectionChange) onConnectionChange('disconnected');
    };

    dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      setStatus('error');
      if (onError) onError(error);
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onData) onData(data);
      } catch (error) {
        console.error('Error parsing message:', error);
        if (onError) onError(error);
      }
    };
  }, [onConnectionChange, onData, onError, peerId]);

  /**
   * Create an offer to initiate a peer connection
   */
  const createOffer = useCallback(async (targetId: string, sessionId: string) => {
    setStatus('connecting');
    setIsInitiator(true);
    setPeerId(targetId);
    currentSessionId.current = sessionId;

    const peerConnection = initializePeerConnection();
    if (!peerConnection) return;

    try {
      // Create a data channel
      const dataChannel = peerConnection.createDataChannel('data');
      setupDataChannel(dataChannel);

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send offer to peer via signaling server
      if (wsConnection) {
        wsConnection.sendMessage({
          type: 'signaling',
          signalingType: 'offer',
          senderId: localId,
          targetId,
          sessionId,
          payload: offer
        });
      }
    } catch (error) {
      console.error('Failed to create offer:', error);
      setStatus('error');
      if (onError) onError(error);
    }
  }, [initializePeerConnection, localId, setupDataChannel, wsConnection, onError]);

  /**
   * Accept an offer from a peer
   */
  const acceptOffer = useCallback(async (offer: RTCSessionDescriptionInit, senderId: string, sessionId: string) => {
    setStatus('connecting');
    setIsInitiator(false);
    setPeerId(senderId);
    currentSessionId.current = sessionId;

    const peerConnection = initializePeerConnection();
    if (!peerConnection) return;

    try {
      // Set remote description (the offer)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send answer to peer via signaling server
      if (wsConnection) {
        wsConnection.sendMessage({
          type: 'signaling',
          signalingType: 'answer',
          senderId: localId,
          targetId: senderId,
          sessionId,
          payload: answer
        });
      }
    } catch (error) {
      console.error('Failed to accept offer:', error);
      setStatus('error');
      if (onError) onError(error);
    }
  }, [initializePeerConnection, localId, wsConnection, onError]);

  /**
   * Handle an answer to our offer
   */
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Failed to handle answer:', error);
      setStatus('error');
      if (onError) onError(error);
    }
  }, [onError]);

  /**
   * Add an ICE candidate from the peer
   */
  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
      if (onError) onError(error);
    }
  }, [onError]);

  /**
   * Send data to the peer
   */
  const sendData = useCallback((data: any): boolean => {
    const dataChannel = dataChannelRef.current;
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        const message: PeerMessage = {
          type: data.type || 'data',
          content: data.content || data,
          senderId: localId,
          senderName: data.senderName,
          timestamp: new Date().toISOString()
        };
        
        dataChannel.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send data:', error);
        if (onError) onError(error);
        return false;
      }
    }
    return false;
  }, [localId, onError]);

  /**
   * Close the connection
   */
  const closeConnection = useCallback(() => {
    // Notify peer that we're disconnecting
    if (wsConnection && peerId && currentSessionId.current) {
      wsConnection.sendMessage({
        type: 'signaling',
        signalingType: 'peer-disconnect',
        senderId: localId,
        targetId: peerId,
        sessionId: currentSessionId.current,
        payload: null
      });
    }

    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Reset state
    setStatus('disconnected');
    setPeerId(null);
    setPeerName(null);
    currentSessionId.current = null;
    
    if (onConnectionChange) onConnectionChange('disconnected');
  }, [wsConnection, peerId, localId, onConnectionChange]);

  // Handle signaling messages from WebSocket
  useEffect(() => {
    if (!wsConnection) return;

    // Define the message handler
    const handleSignalingMessage = (message: any) => {
      if (message.type !== 'signaling' || message.targetId !== localId) {
        return;
      }

      switch (message.signalingType) {
        case 'offer':
          // Set peer info
          setPeerId(message.senderId);
          setPeerName(message.senderName || null);
          // Handle the offer (accept it automatically or notify UI)
          // For now, we'll just log it and expect the consumer to call acceptOffer
          console.log('Received offer from peer', message.senderId);
          break;
          
        case 'answer':
          if (message.senderId === peerId) {
            handleAnswer(message.payload);
          }
          break;
          
        case 'ice-candidate':
          if (message.senderId === peerId) {
            addIceCandidate(message.payload);
          }
          break;
          
        case 'peer-disconnect':
          if (message.senderId === peerId) {
            // Peer wants to disconnect
            closeConnection();
          }
          break;
          
        default:
          console.warn('Unknown signaling message type:', message.signalingType);
      }
    };

    // Set up listener for WebSocket messages
    const onWSMessage = (data: any) => {
      if (data.type === 'signaling') {
        handleSignalingMessage(data);
      }
    };

    // Add custom listener for signaling messages
    const originalOnMessage = wsConnection.onMessage;
    wsConnection.onMessage = (data: any) => {
      // First pass message to original handler
      if (originalOnMessage) originalOnMessage(data);
      // Then process signaling messages
      onWSMessage(data);
    };

    // Cleanup
    return () => {
      // Restore original onMessage
      wsConnection.onMessage = originalOnMessage;
    };
  }, [wsConnection, localId, peerId, handleAnswer, addIceCandidate, closeConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeConnection();
    };
  }, [closeConnection]);

  return {
    status,
    peerId,
    peerName,
    createOffer,
    acceptOffer,
    sendData,
    closeConnection,
    localId,
    isInitiator
  };
};