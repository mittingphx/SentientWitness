import { useState } from 'react';
import { useStore } from '@/lib/store';
import { generateShareableUrl } from '@/lib/session';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy } from 'lucide-react';

interface ShareSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function ShareSessionModal({ isOpen, onClose, projectId }: ShareSessionModalProps) {
  const { projects, updateProject } = useStore();
  const { toast } = useToast();
  
  const project = projects[projectId];
  const sessionId = project?.sessionId || '';
  const sessionUrl = sessionId ? generateShareableUrl(sessionId) : '';
  
  const [passwordProtect, setPasswordProtect] = useState(!!project?.password);
  const [password, setPassword] = useState(project?.password || '');
  const [limitParticipants, setLimitParticipants] = useState(!!project?.maxParticipants);
  const [maxParticipants, setMaxParticipants] = useState(project?.maxParticipants || 10);
  const [emailAddresses, setEmailAddresses] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(sessionUrl);
    toast({
      title: "Link Copied",
      description: "Session link has been copied to clipboard"
    });
  };
  
  const handleShare = () => {
    if (!projectId) return;
    
    setIsSubmitting(true);
    
    try {
      // Update project settings
      updateProject(projectId, {
        password: passwordProtect ? password : undefined,
        maxParticipants: limitParticipants ? maxParticipants : undefined
      });
      
      // If email addresses are provided, send invitations
      if (emailAddresses.trim()) {
        // In a real implementation, this would send emails
        // For now, just show a toast
        toast({
          title: "Invitations Sent",
          description: `Invitations have been sent to ${emailAddresses.split(',').length} email addresses`
        });
      }
      
      toast({
        title: "Session Shared",
        description: "Your session is now ready to share"
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update session settings",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share This Session</DialogTitle>
          <DialogDescription>
            Share your session with others by sending them this link or inviting them directly.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="session-link">Session Link</Label>
            <div className="flex items-center">
              <Input
                id="session-link"
                value={sessionUrl}
                readOnly
                className="flex-1 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-14"
                onClick={handleCopyLink}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid gap-4">
            <Label>Security Options</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="password-protect"
                checked={passwordProtect}
                onCheckedChange={(checked) => setPasswordProtect(!!checked)}
              />
              <Label htmlFor="password-protect" className="font-normal">Password protect</Label>
            </div>
            
            {passwordProtect && (
              <div className="ml-6">
                <Input
                  type="password"
                  placeholder="Set password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="limit-participants"
                checked={limitParticipants}
                onCheckedChange={(checked) => setLimitParticipants(!!checked)}
              />
              <Label htmlFor="limit-participants" className="font-normal">Limit participants</Label>
            </div>
            
            {limitParticipants && (
              <div className="ml-6 flex items-center space-x-2">
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 10)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">participants</span>
              </div>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email-addresses">Share With</Label>
            <Input
              id="email-addresses"
              type="text"
              placeholder="Enter email addresses"
              value={emailAddresses}
              onChange={(e) => setEmailAddresses(e.target.value)}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Separate multiple emails with commas
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleShare}
            disabled={isSubmitting || (passwordProtect && !password)}
          >
            {isSubmitting ? "Sharing..." : "Share Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
