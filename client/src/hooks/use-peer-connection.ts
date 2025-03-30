import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UseWebSocketReturn } from './use-websocket-connection';

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

interface UsePeerConnectionOptions {
  onData?: DataHandler;
  onConnectionChange?: (status: ConnectionStatus, peerId?: string) => void;
  onError?: (error: any) => void;
}

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
  wsConnection: UseWebSocketReturn,
  options: UsePeerConnectionOptions = {}
): UsePeerConnectionReturn => {
  const { onData, onConnectionChange, onError } = options;
  
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);
  
  const localId = useRef(uuidv4()).current;
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  
  /**
   * Initialize a new peer connection
   */
  const initPeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    
    // Configure ICE servers (STUN/TURN) for NAT traversal
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ]
    };
    
    const pc = new RTCPeerConnection(configuration);
    peerConnection.current = pc;
    
    // Handle ICE candidate events
    pc.onicecandidate = (event) => {
      if (event.candidate && peerId && wsConnection.status === 'connected') {
        const signalingMessage: SignalingMessage = {
          type: 'ice-candidate',
          senderId: localId,
          targetId: peerId,
          sessionId: '',  // Will be set by the caller
          payload: event.candidate
        };
        
        wsConnection.sendMessage({
          type: 'signaling',
          signalingType: 'ice-candidate',
          targetId: peerId,
          senderId: localId,
          payload: event.candidate
        });
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      switch(pc.connectionState) {
        case 'connected':
          setStatus('connected');
          if (onConnectionChange) onConnectionChange('connected', peerId);
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          setStatus('disconnected');
          if (onConnectionChange) onConnectionChange('disconnected');
          break;
        case 'connecting':
          setStatus('connecting');
          if (onConnectionChange) onConnectionChange('connecting');
          break;
      }
    };
    
    // Handle data channel events when we're the receiver (not initiator)
    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };
    
    return pc;
  }, [localId, peerId, wsConnection, onConnectionChange]);
  
  /**
   * Set up and configure the data channel
   */
  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    dataChannel.current = channel;
    
    channel.onopen = () => {
      setStatus('connected');
      if (onConnectionChange) onConnectionChange('connected', peerId);
    };
    
    channel.onclose = () => {
      setStatus('disconnected');
      if (onConnectionChange) onConnectionChange('disconnected');
    };
    
    channel.onerror = (error) => {
      setStatus('error');
      if (onError) onError(error);
    };
    
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle peer identification
        if (message.type === 'peer-identity') {
          setPeerId(message.senderId);
          setPeerName(message.senderName);
        }
        
        if (onData) {
          onData(message);
        }
      } catch (err) {
        console.error('Failed to parse message from peer:', err);
      }
    };
  }, [peerId, onConnectionChange, onData, onError]);
  
  /**
   * Create an offer to initiate a peer connection
   */
  const createOffer = useCallback(async (targetId: string, sessionId: string) => {
    try {
      setPeerId(targetId);
      setIsInitiator(true);
      
      const pc = initPeerConnection();
      
      // Create a data channel as the initiator
      const channel = pc.createDataChannel('data');
      setupDataChannel(channel);
      
      // Create and send an offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      wsConnection.sendMessage({
        type: 'signaling',
        signalingType: 'offer',
        senderId: localId,
        senderName: 'User ' + localId.substring(0, 5),
        targetId,
        sessionId,
        payload: offer
      });
      
      setStatus('connecting');
    } catch (error) {
      setStatus('error');
      if (onError) onError(error);
      throw error;
    }
  }, [localId, initPeerConnection, setupDataChannel, wsConnection, onError]);
  
  /**
   * Accept an offer from a peer
   */
  const acceptOffer = useCallback(async (offer: RTCSessionDescriptionInit, senderId: string, sessionId: string) => {
    try {
      setPeerId(senderId);
      setIsInitiator(false);
      
      const pc = initPeerConnection();
      
      // Set the remote description from the offer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create and send an answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      wsConnection.sendMessage({
        type: 'signaling',
        signalingType: 'answer',
        senderId: localId,
        senderName: 'User ' + localId.substring(0, 5),
        targetId: senderId,
        sessionId,
        payload: answer
      });
      
      setStatus('connecting');
    } catch (error) {
      setStatus('error');
      if (onError) onError(error);
      throw error;
    }
  }, [localId, initPeerConnection, wsConnection, onError]);
  
  /**
   * Handle an answer to our offer
   */
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      if (!peerConnection.current) {
        throw new Error('No peer connection established');
      }
      
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      setStatus('error');
      if (onError) onError(error);
    }
  }, [onError]);
  
  /**
   * Add an ICE candidate from the peer
   */
  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      if (!peerConnection.current) {
        throw new Error('No peer connection established');
      }
      
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      if (onError) onError(error);
    }
  }, [onError]);
  
  /**
   * Send data to the peer
   */
  const sendData = useCallback((data: any): boolean => {
    if (!dataChannel.current || dataChannel.current.readyState !== 'open') {
      return false;
    }
    
    try {
      const message: PeerMessage = {
        type: typeof data === 'object' && data.type ? data.type : 'data',
        content: data,
        senderId: localId,
        senderName: 'User ' + localId.substring(0, 5),
        timestamp: new Date().toISOString()
      };
      
      dataChannel.current.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error('Error sending data:', err);
      return false;
    }
  }, [localId]);
  
  /**
   * Close the connection
   */
  const closeConnection = useCallback(() => {
    // Send disconnection signal if we have a peer
    if (peerId && wsConnection.status === 'connected') {
      wsConnection.sendMessage({
        type: 'signaling',
        signalingType: 'peer-disconnect',
        senderId: localId,
        targetId: peerId,
        sessionId: '',
        payload: null
      });
    }
    
    // Close data channel
    if (dataChannel.current) {
      dataChannel.current.close();
      dataChannel.current = null;
    }
    
    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    setPeerId(null);
    setPeerName(null);
    setStatus('disconnected');
    setIsInitiator(false);
  }, [localId, peerId, wsConnection]);
  
  // Handle WebSocket signaling messages
  useEffect(() => {
    const handleSignalingMessage = (message: any) => {
      if (!message || message.type !== 'signaling') return;
      
      // Only process messages targeting this client
      if (message.targetId && message.targetId !== localId) return;
      
      switch (message.signalingType) {
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
            closeConnection();
          }
          break;
      }
    };
    
    if (wsConnection.lastMessage) {
      handleSignalingMessage(wsConnection.lastMessage);
    }
  }, [wsConnection.lastMessage, localId, peerId, handleAnswer, addIceCandidate, closeConnection]);
  
  // Clean up on unmount
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