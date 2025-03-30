import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UseWebSocketReturn, WebSocketMessage } from './use-websocket';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type DataHandler = (data: any) => void;

export type SignalingContent = {
  signalingType: 'offer' | 'answer' | 'ice-candidate' | 'peer-disconnect';
  senderId: string;
  senderName?: string;
  targetId: string;
  sessionId: string;
  payload: any;
};

export interface PeerMessage {
  type: string;
  content: any;
  senderId: string;
  senderName?: string;
  timestamp: string;
}

export interface UsePeerConnectionOptions {
  onData?: DataHandler;
  onConnectionChange?: (status: ConnectionStatus, peerId?: string, peerName?: string) => void;
  onError?: (error: any) => void;
}

export interface UsePeerConnectionReturn {
  status: ConnectionStatus;
  peerId: string | null;
  peerName: string | null;
  createOffer: (targetId: string, targetName: string, sessionId: string) => Promise<void>;
  acceptOffer: (offer: RTCSessionDescriptionInit, senderId: string, senderName: string, sessionId: string) => Promise<void>;
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
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [isInitiator, setIsInitiator] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localIdRef = useRef<string>(uuidv4());
  
  // Generate a local ID
  const localId = localIdRef.current;
  
  // Set options
  const { onData, onConnectionChange, onError } = options;
  
  /**
   * Update connection status and notify through callback
   */
  const updateStatus = useCallback((newStatus: ConnectionStatus, connectedPeerId?: string, connectedPeerName?: string) => {
    setStatus(newStatus);
    
    if (newStatus === 'connected') {
      setPeerId(connectedPeerId || null);
      setPeerName(connectedPeerName || null);
    } else if (newStatus === 'disconnected') {
      setPeerId(null);
      setPeerName(null);
    }
    
    if (onConnectionChange) {
      onConnectionChange(newStatus, connectedPeerId, connectedPeerName);
    }
  }, [onConnectionChange]);
  
  /**
   * Handle a WebSocket message for signaling
   */
  useEffect(() => {
    const handleWebSocketMessage = (message: WebSocketMessage) => {
      if (message.type !== 'signaling') return;
      
      const signalingContent = message.content as SignalingContent;
      
      // Make sure the message is intended for us
      if (signalingContent.targetId !== localId) return;
      
      // Handle the signaling message based on its type
      switch (signalingContent.signalingType) {
        case 'offer':
          if (signalingContent.senderId && status === 'disconnected') {
            handleOffer(
              signalingContent.payload,
              signalingContent.senderId,
              signalingContent.senderName || 'Peer',
              signalingContent.sessionId
            );
          }
          break;
        case 'answer':
          if (signalingContent.senderId && status === 'connecting') {
            handleAnswer(signalingContent.payload);
          }
          break;
        case 'ice-candidate':
          if (peerConnectionRef.current) {
            addIceCandidate(signalingContent.payload);
          }
          break;
        case 'peer-disconnect':
          if (signalingContent.senderId === peerId) {
            closeConnection();
          }
          break;
      }
    };
    
    // Listen for WebSocket messages using a custom event
    const messageListener = (e: CustomEvent) => {
      const message = e.detail;
      handleWebSocketMessage(message);
    };
    
    window.addEventListener('websocket-message', messageListener as EventListener);
    
    return () => {
      window.removeEventListener('websocket-message', messageListener as EventListener);
    };
  }, [localId, peerId, status]);
  
  /**
   * Initialize a new peer connection
   */
  const initPeerConnection = useCallback(() => {
    try {
      // Close any existing connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      
      // Create a new peer connection
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ]
      };
      
      const pc = new RTCPeerConnection(configuration);
      
      // Set up event handlers
      pc.onicecandidate = (event) => {
        if (event.candidate && wsConnection.status === 'open' && peerId) {
          const signalingContent: SignalingContent = {
            signalingType: 'ice-candidate',
            senderId: localId,
            targetId: peerId,
            sessionId: sessionId || '',
            payload: event.candidate
          };
          
          wsConnection.sendMessage({
            type: 'signaling',
            content: signalingContent
          });
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'disconnected' || 
            pc.iceConnectionState === 'failed' || 
            pc.iceConnectionState === 'closed') {
          updateStatus('disconnected');
        }
      };
      
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };
      
      peerConnectionRef.current = pc;
    } catch (error) {
      console.error('Error initializing peer connection:', error);
      updateStatus('error');
      
      if (onError) {
        onError(error);
      }
    }
  }, [localId, onError, peerId, sessionId, updateStatus, wsConnection]);
  
  /**
   * Set up and configure the data channel
   */
  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    console.log('Setting up data channel:', channel.label);
    
    channel.onopen = () => {
      console.log('Data channel is open');
      updateStatus('connected', peerId, peerName);
    };
    
    channel.onclose = () => {
      console.log('Data channel is closed');
      updateStatus('disconnected');
    };
    
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (onData) {
          onData(data);
        }
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };
    
    dataChannelRef.current = channel;
  }, [onData, peerId, peerName, updateStatus]);
  
  /**
   * Create an offer to initiate a peer connection
   */
  const createOffer = useCallback(async (targetId: string, targetName: string, chatSessionId: string) => {
    try {
      updateStatus('connecting');
      setIsInitiator(true);
      setSessionId(chatSessionId);
      
      // Initialize the peer connection
      initPeerConnection();
      
      if (!peerConnectionRef.current) {
        throw new Error('Peer connection not initialized');
      }
      
      // Create a data channel
      const dataChannel = peerConnectionRef.current.createDataChannel('chat', {
        ordered: true
      });
      
      setupDataChannel(dataChannel);
      
      // Create and set the local description (offer)
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      // Send the offer to the target peer through the WebSocket
      const signalingContent: SignalingContent = {
        signalingType: 'offer',
        senderId: localId,
        senderName: 'Me', // Will be replaced by actual username later
        targetId: targetId,
        sessionId: chatSessionId,
        payload: offer
      };
      
      wsConnection.sendMessage({
        type: 'signaling',
        content: signalingContent
      });
      
      // Set the peer ID
      setPeerId(targetId);
      setPeerName(targetName);
    } catch (error) {
      console.error('Error creating offer:', error);
      updateStatus('error');
      
      if (onError) {
        onError(error);
      }
    }
  }, [initPeerConnection, localId, onError, setupDataChannel, updateStatus, wsConnection]);
  
  /**
   * Accept an offer from a peer
   */
  const acceptOffer = useCallback(async (offer: RTCSessionDescriptionInit, senderId: string, senderName: string, chatSessionId: string) => {
    try {
      updateStatus('connecting');
      setIsInitiator(false);
      setSessionId(chatSessionId);
      
      // Initialize the peer connection
      initPeerConnection();
      
      if (!peerConnectionRef.current) {
        throw new Error('Peer connection not initialized');
      }
      
      // Set the remote description
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create and set the local description (answer)
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      // Send the answer back to the initiator
      const signalingContent: SignalingContent = {
        signalingType: 'answer',
        senderId: localId,
        senderName: 'Me', // Will be replaced by actual username later
        targetId: senderId,
        sessionId: chatSessionId,
        payload: answer
      };
      
      wsConnection.sendMessage({
        type: 'signaling',
        content: signalingContent
      });
      
      // Set the peer ID
      setPeerId(senderId);
      setPeerName(senderName);
    } catch (error) {
      console.error('Error accepting offer:', error);
      updateStatus('error');
      
      if (onError) {
        onError(error);
      }
    }
  }, [initPeerConnection, localId, onError, updateStatus, wsConnection]);
  
  /**
   * Handle an offer from a peer
   */
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, senderId: string, senderName: string, chatSessionId: string) => {
    try {
      // Accept the offer
      await acceptOffer(offer, senderId, senderName, chatSessionId);
    } catch (error) {
      console.error('Error handling offer:', error);
      updateStatus('error');
      
      if (onError) {
        onError(error);
      }
    }
  }, [acceptOffer, onError, updateStatus]);
  
  /**
   * Handle an answer to our offer
   */
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      if (!peerConnectionRef.current) {
        throw new Error('Peer connection not initialized');
      }
      
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
      updateStatus('error');
      
      if (onError) {
        onError(error);
      }
    }
  }, [onError, updateStatus]);
  
  /**
   * Add an ICE candidate from the peer
   */
  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      if (!peerConnectionRef.current) {
        throw new Error('Peer connection not initialized');
      }
      
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
      
      if (onError) {
        onError(error);
      }
    }
  }, [onError]);
  
  /**
   * Send data to the peer
   */
  const sendData = useCallback((data: any): boolean => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.error('Data channel not open');
      return false;
    }
    
    try {
      const message: PeerMessage = {
        type: data.type || 'message',
        content: data.content,
        senderId: localId,
        senderName: data.senderName || 'Me',
        timestamp: new Date().toISOString()
      };
      
      dataChannelRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending data:', error);
      return false;
    }
  }, [localId]);
  
  /**
   * Close the connection
   */
  const closeConnection = useCallback(() => {
    try {
      // Notify the peer that we're disconnecting
      if (peerId && wsConnection.status === 'open') {
        const signalingContent: SignalingContent = {
          signalingType: 'peer-disconnect',
          senderId: localId,
          targetId: peerId,
          sessionId: sessionId || '',
          payload: {}
        };
        
        wsConnection.sendMessage({
          type: 'signaling',
          content: signalingContent
        });
      }
      
      // Close the data channel
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      
      // Close the peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Reset state
      updateStatus('disconnected');
      setIsInitiator(false);
      setSessionId(null);
    } catch (error) {
      console.error('Error closing connection:', error);
      
      if (onError) {
        onError(error);
      }
    }
  }, [localId, onError, peerId, sessionId, updateStatus, wsConnection]);
  
  // Clean up when component unmounts
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