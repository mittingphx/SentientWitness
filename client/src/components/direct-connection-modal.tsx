import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Link,
  Users,
  Copy,
  Loader2,
  Check,
  AlertTriangle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface DirectConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onConnectionEstablished?: (peerId: string, peerName: string) => void;
  onOpenShareModal?: () => void;
}

export default function DirectConnectionModal({ 
  isOpen, 
  onClose, 
  projectId,
  onConnectionEstablished,
  onOpenShareModal
}: DirectConnectionModalProps) {
  const { toast } = useToast();
  
  // State for connect tab
  const [connectionCode, setConnectionCode] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [remoteName, setRemoteName] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  
  // State for host tab
  const [hostCode, setHostCode] = useState<string>('');
  const [hostName, setHostName] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<string>('connect');
  
  // Reset state when the modal opens
  useEffect(() => {
    if (isOpen) {
      setConnectionCode('');
      setUserName('');
      setRemoteName('');
      setIsConnecting(false);
      setHostCode('');
      setHostName('');
      setIsCopied(false);
      setIsWaiting(false);
      setActiveTab('connect');
      
      // Generate a random host code
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setHostCode(randomCode);
    }
  }, [isOpen]);
  
  // Handle creating a direct connection
  const handleConnect = useCallback(() => {
    if (!connectionCode.trim()) {
      toast({
        title: 'Missing Code',
        description: 'Please enter a connection code',
        variant: 'destructive'
      });
      return;
    }
    
    if (!userName.trim()) {
      toast({
        title: 'Missing Name',
        description: 'Please enter your name',
        variant: 'destructive'
      });
      return;
    }
    
    setIsConnecting(true);
    
    // Simulate a connection process with a delay
    setTimeout(() => {
      try {
        // This is where the actual WebRTC connection would be established
        // For now, we'll simulate a successful connection
        
        toast({
          title: 'Connected',
          description: `Successfully connected to ${remoteName || 'remote user'}`,
          variant: 'default'
        });
        
        // Call the onConnectionEstablished callback
        if (onConnectionEstablished) {
          const peerId = 'simulated-peer-id';
          onConnectionEstablished(peerId, remoteName || 'Remote User');
        }
        
        // Close the modal
        onClose();
      } catch (error) {
        console.error('Error connecting:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to establish connection. Please try again.',
          variant: 'destructive'
        });
        setIsConnecting(false);
      }
    }, 2000);
  }, [connectionCode, userName, remoteName, onConnectionEstablished, onClose, toast]);
  
  // Handle starting to host a session
  const handleHost = useCallback(() => {
    if (!hostName.trim()) {
      toast({
        title: 'Missing Name',
        description: 'Please enter your name',
        variant: 'destructive'
      });
      return;
    }
    
    setIsWaiting(true);
    
    toast({
      title: 'Hosting Session',
      description: 'Waiting for someone to connect...',
      variant: 'default'
    });
    
    // This is where the actual WebRTC hosting would be set up
    // For now, we'll just show the UI state
  }, [hostName, toast]);
  
  // Handle copying the host code
  const handleCopyCode = useCallback(() => {
    try {
      navigator.clipboard.writeText(hostCode);
      setIsCopied(true);
      
      toast({
        title: 'Copied',
        description: 'Connection code copied to clipboard',
        variant: 'default'
      });
      
      // Reset the copied state after a delay
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Error copying code:', error);
      toast({
        title: 'Copy Error',
        description: 'Failed to copy code to clipboard',
        variant: 'destructive'
      });
    }
  }, [hostCode, toast]);
  
  // Handle canceling the hosting session
  const handleCancelHost = useCallback(() => {
    setIsWaiting(false);
    
    toast({
      title: 'Hosting Canceled',
      description: 'You are no longer hosting a session',
      variant: 'default'
    });
  }, [toast]);
  
  // Handle opening the share modal
  const handleOpenShareModal = useCallback(() => {
    if (onOpenShareModal) {
      onClose();
      onOpenShareModal();
    }
  }, [onOpenShareModal, onClose]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Direct Connection
          </DialogTitle>
          <DialogDescription>
            Connect directly with another user to enable AI-to-AI conversation.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="connect" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connect">Connect</TabsTrigger>
            <TabsTrigger value="host">Host</TabsTrigger>
          </TabsList>
          
          <TabsContent value="connect">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Join a Session</CardTitle>
                <CardDescription>
                  Enter the connection code provided by the host.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="connection-code">Connection Code</Label>
                  <Input
                    id="connection-code"
                    value={connectionCode}
                    onChange={(e) => setConnectionCode(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g., A1B2C3)"
                    className="uppercase"
                    maxLength={10}
                    disabled={isConnecting}
                  />
                </div>
                
                <div>
                  <Label htmlFor="user-name">Your Name</Label>
                  <Input
                    id="user-name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={isConnecting}
                  />
                </div>
                
                <div>
                  <Label htmlFor="remote-name" className="text-muted-foreground">
                    Remote User's Name (Optional)
                  </Label>
                  <Input
                    id="remote-name"
                    value={remoteName}
                    onChange={(e) => setRemoteName(e.target.value)}
                    placeholder="Enter their name (if known)"
                    disabled={isConnecting}
                  />
                </div>
              </CardContent>
            </Card>
            
            <div className="mt-4 flex justify-between">
              <Button variant="outline" onClick={onClose} disabled={isConnecting}>
                Cancel
              </Button>
              <Button onClick={handleConnect} disabled={isConnecting || !connectionCode.trim() || !userName.trim()}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Connect
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="host">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Host a Session</CardTitle>
                <CardDescription>
                  Create a connection code for others to join.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="host-name">Your Name</Label>
                  <Input
                    id="host-name"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={isWaiting}
                  />
                </div>
                
                {!isWaiting ? (
                  <div className="mt-4 space-y-3">
                    <Button
                      className="w-full"
                      onClick={handleHost}
                      disabled={!hostName.trim()}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Start Hosting
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                          Or use a shareable link
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleOpenShareModal}
                    >
                      <Link className="mr-2 h-4 w-4" />
                      Create Shareable Link
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-md border p-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">Connection Code</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={handleCopyCode}
                        >
                          {isCopied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-2xl font-bold tracking-wider text-center my-2">
                        {hostCode}
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        Share this code with the person you want to connect with
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <AlertTriangle className="text-amber-500 h-5 w-5 mr-2" />
                      <span className="text-sm">Waiting for connection...</span>
                    </div>
                    
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleCancelHost}
                    >
                      Cancel Hosting
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}