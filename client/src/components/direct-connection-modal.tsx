import { useState, useEffect } from 'react';
import { usePeerConnection } from '@/hooks/use-peer-connection';
import { useWebSocketConnection } from '@/hooks/use-websocket-connection';
import { useStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import UserAvatar from './user-avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Check, Clock, Network, X, RefreshCcw, Send } from 'lucide-react';

interface DirectConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onConnectionEstablished?: (peerId: string, peerName: string) => void;
}

export default function DirectConnectionModal({ 
  isOpen, 
  onClose, 
  projectId,
  onConnectionEstablished
}: DirectConnectionModalProps) {
  const { toast } = useToast();
  const { currentUser, projects } = useStore();
  const [targetUserId, setTargetUserId] = useState('');
  const [pendingRequests, setPendingRequests] = useState<{id: string, name: string}[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState<string | null>(null);
  
  // Get current session ID
  const sessionId = projects[projectId]?.sessionId;

  // Set up WebSocket connection for signaling
  const ws = useWebSocketConnection(sessionId, {
    onMessage: (data) => {
      // Handle signaling requests
      if (data.type === 'signaling' && data.signalingType === 'offer' && data.targetId === peerConnection.localId) {
        const newRequest = {
          id: data.senderId,
          name: data.senderName || 'Unknown user'
        };
        
        // Add to pending requests if not already there
        setPendingRequests(prev => {
          if (!prev.some(req => req.id === newRequest.id)) {
            return [...prev, newRequest];
          }
          return prev;
        });
        
        setShowRequests(true);
      }
    }
  });

  // Set up peer connection
  const peerConnection = usePeerConnection(ws, {
    onConnectionChange: (status, peerId) => {
      if (status === 'connected' && peerId) {
        toast({
          title: "Connection Established",
          description: `Direct connection established with ${peerConnection.peerName || 'peer'}`,
        });
        
        if (onConnectionEstablished) {
          onConnectionEstablished(peerId, peerConnection.peerName || 'Unknown');
        }
        
        // Close modal after successful connection
        onClose();
      } else if (status === 'disconnected') {
        if (connectionAttempt) {
          toast({
            title: "Connection Failed",
            description: "Failed to establish connection. Please try again.",
            variant: "destructive"
          });
        }
        setConnectionAttempt(null);
      }
    },
    onData: (data) => {
      // Handle data received from peer
      console.log('Received data from peer:', data);
    },
    onError: (error) => {
      toast({
        title: "Connection Error",
        description: error.message || "An error occurred with the peer connection",
        variant: "destructive"
      });
    }
  });

  // Handle direct connection request
  const handleConnectRequest = async () => {
    if (!targetUserId.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a user ID to connect to",
        variant: "destructive"
      });
      return;
    }

    if (!sessionId) {
      toast({
        title: "Error",
        description: "Session information is missing",
        variant: "destructive"
      });
      return;
    }

    setConnectionAttempt(targetUserId);
    
    // Create an offer and send it via the signaling channel
    try {
      await peerConnection.createOffer(targetUserId, sessionId);
      
      toast({
        title: "Connection Request Sent",
        description: "Waiting for peer to accept connection...",
      });
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to send connection request",
        variant: "destructive"
      });
      setConnectionAttempt(null);
    }
  };

  // Handle accepting a connection request
  const handleAcceptRequest = async (requestId: string) => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "Session information is missing",
        variant: "destructive"
      });
      return;
    }

    // Find the request in pending requests
    const request = pendingRequests.find(req => req.id === requestId);
    if (!request) return;
    
    // Wait for the offer message
    const waitForOffer = (retries = 5, delay = 500): Promise<RTCSessionDescriptionInit | null> => {
      return new Promise((resolve) => {
        // Check if we have an offer from this sender in ws.lastMessage
        if (ws.lastMessage && 
            ws.lastMessage.type === 'signaling' && 
            ws.lastMessage.signalingType === 'offer' && 
            ws.lastMessage.senderId === requestId) {
          resolve(ws.lastMessage.payload);
        } else if (retries > 0) {
          // Try again after delay
          setTimeout(() => {
            waitForOffer(retries - 1, delay).then(resolve);
          }, delay);
        } else {
          // Ran out of retries
          resolve(null);
        }
      });
    };
    
    const offer = await waitForOffer();
    
    if (!offer) {
      toast({
        title: "Connection Error",
        description: "Could not find connection offer. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Accept the offer
      await peerConnection.acceptOffer(offer, requestId, sessionId);
      
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Connection Accepted",
        description: "Establishing direct connection...",
      });
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to accept connection",
        variant: "destructive"
      });
    }
  };

  // Reject a connection request
  const handleRejectRequest = (requestId: string) => {
    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
  };

  // Cancel the current connection attempt
  const handleCancelConnect = () => {
    if (connectionAttempt) {
      peerConnection.closeConnection();
      setConnectionAttempt(null);
      
      toast({
        title: "Connection Cancelled",
        description: "Connection attempt was cancelled",
      });
    }
  };

  // Clean up on unmount or when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Don't close the connection if it's established and modal is just being closed
      if (peerConnection.status !== 'connected') {
        peerConnection.closeConnection();
        setConnectionAttempt(null);
      }
    }
  }, [isOpen, peerConnection]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Direct P2P Connection</DialogTitle>
          <DialogDescription>
            Create a direct connection with another user for AI-to-AI conversations without server intermediation.
          </DialogDescription>
        </DialogHeader>
        
        {/* Connection Status */}
        {peerConnection.status === 'connected' && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 mb-4 rounded-md flex items-center">
            <Check className="h-5 w-5 mr-2" />
            <div>
              <p className="font-medium">Connected</p>
              <p className="text-sm">Direct connection established with {peerConnection.peerName || 'peer'}</p>
            </div>
          </div>
        )}
        
        {/* Connection Form */}
        {peerConnection.status !== 'connected' && !showRequests && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-user">Connect to User ID</Label>
              <div className="flex gap-2">
                <Input 
                  id="target-user"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Enter user ID to connect with"
                  disabled={!!connectionAttempt}
                />
                
                {connectionAttempt ? (
                  <Button 
                    variant="destructive"
                    size="icon"
                    onClick={handleCancelConnect}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleConnectRequest}
                    disabled={!targetUserId.trim()}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
            
            {connectionAttempt && (
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 p-3 rounded-md flex items-center">
                <Clock className="h-5 w-5 mr-2 animate-spin" />
                <div>
                  <p className="font-medium">Connecting...</p>
                  <p className="text-sm">Waiting for peer to accept connection</p>
                </div>
              </div>
            )}
            
            {pendingRequests.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowRequests(true)}
              >
                <Network className="h-4 w-4 mr-2" />
                View Pending Requests ({pendingRequests.length})
              </Button>
            )}
          </div>
        )}
        
        {/* Connection Requests */}
        {showRequests && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Connection Requests</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowRequests(false)}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            
            {pendingRequests.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Network className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No pending connection requests</p>
              </div>
            )}
            
            {pendingRequests.map((request) => (
              <div 
                key={request.id}
                className="border rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar 
                    user={{
                      id: request.id,
                      displayName: request.name,
                      color: '#' + request.id.substr(0, 6),
                      type: 'human',
                      isActive: true
                    }}
                    size="sm"
                  />
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ID: {request.id.substr(0, 8)}...
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRejectRequest(request.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleAcceptRequest(request.id)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <DialogFooter className="mt-4 flex space-x-2 justify-between">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 rounded-full mr-1.5 bg-primary animate-pulse"></div>
            Your ID: <code className="ml-1 text-xs bg-gray-100 dark:bg-dark-300 px-1 py-0.5 rounded">{peerConnection.localId.substr(0, 8)}</code>
          </div>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}