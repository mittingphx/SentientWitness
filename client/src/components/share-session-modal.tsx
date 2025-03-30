import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Share2,
  Copy,
  CheckCircle2,
  Link,
  Lock,
  Shield,
  EyeOff,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface ShareSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function ShareSessionModal({ isOpen, onClose, projectId }: ShareSessionModalProps) {
  const { toast } = useToast();
  
  // Share settings
  const [shareLink, setShareLink] = useState<string>('');
  const [isPasswordProtected, setIsPasswordProtected] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [isCreatingLink, setIsCreatingLink] = useState<boolean>(false);
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);
  
  // Generate the share link when the component mounts
  useEffect(() => {
    if (isOpen && projectId) {
      const baseUrl = window.location.origin;
      setShareLink(`${baseUrl}/join-session/${projectId}${isPasswordProtected ? '?protected=true' : ''}`);
    }
  }, [isOpen, projectId, isPasswordProtected]);
  
  // Update the link when password protection changes
  useEffect(() => {
    if (shareLink) {
      const baseUrl = window.location.origin;
      setShareLink(`${baseUrl}/join-session/${projectId}${isPasswordProtected ? '?protected=true' : ''}`);
    }
  }, [isPasswordProtected, projectId]);
  
  // Handle copying the share link
  const handleCopyLink = useCallback(() => {
    try {
      navigator.clipboard.writeText(shareLink);
      setIsLinkCopied(true);
      
      toast({
        title: 'Link Copied',
        description: 'Share link has been copied to clipboard',
        variant: 'default'
      });
      
      // Reset the copied state after a delay
      setTimeout(() => {
        setIsLinkCopied(false);
      }, 3000);
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: 'Copy Error',
        description: 'Failed to copy link to clipboard',
        variant: 'destructive'
      });
    }
  }, [shareLink, toast]);
  
  // Handle creating a password-protected link
  const handleCreateLink = useCallback(() => {
    if (!password.trim()) {
      toast({
        title: 'Missing Password',
        description: 'Please enter a password for the protected link',
        variant: 'destructive'
      });
      return;
    }
    
    setIsCreatingLink(true);
    
    // Simulate link creation with a delay
    setTimeout(() => {
      setIsCreatingLink(false);
      
      // In a real implementation, this would call an API to set the password
      // For now, we'll just update the UI
      
      toast({
        title: 'Link Created',
        description: 'Password-protected link has been created',
        variant: 'default'
      });
    }, 1000);
  }, [password, toast]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Session
          </DialogTitle>
          <DialogDescription>
            Share your session with others to collaborate in real-time.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-medium">Password Protection</Label>
                    <Switch
                      checked={isPasswordProtected}
                      onCheckedChange={setIsPasswordProtected}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Require users to enter a password before joining
                  </p>
                </div>
                
                {isPasswordProtected && (
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      <Lock className="h-3.5 w-3.5 inline-block mr-1" />
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a secure password"
                    />
                    <p className="text-xs text-muted-foreground">
                      Anyone with this password will be able to join your session
                    </p>
                    
                    <Button
                      onClick={handleCreateLink}
                      disabled={isCreatingLink || !password.trim()}
                      className="w-full mt-2"
                    >
                      {isCreatingLink ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Create Protected Link
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-2">
            <Label htmlFor="share-link" className="flex items-center gap-1.5">
              <Link className="h-4 w-4" />
              Share Link
            </Label>
            <div className="flex gap-2">
              <Input
                id="share-link"
                value={shareLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="shrink-0"
              >
                {isLinkCopied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isPasswordProtected ? (
                <span className="flex items-center gap-1">
                  <EyeOff className="h-3 w-3" />
                  Password-protected link
                </span>
              ) : (
                <span className="text-amber-500">
                  Anyone with this link can join your session
                </span>
              )}
            </p>
          </div>
        </div>
        
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}