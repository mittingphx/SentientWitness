import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useStore } from '@/lib/store';
import { sessionExists, getSessionBySessionId } from '@/lib/session';
import { useSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import { Brain, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import UserAvatar from '@/components/user-avatar';

export default function JoinSession() {
  const { sessionId } = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { currentUser, users } = useStore();
  const { joinSessionById } = useSession();
  
  const [customSessionId, setCustomSessionId] = useState(sessionId || '');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [isJoining, setIsJoining] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  
  // Load session info if sessionId is provided
  useEffect(() => {
    if (sessionId) {
      const session = getSessionBySessionId(sessionId);
      if (session) {
        setSessionInfo(session);
        setIsPasswordRequired(!!session.password);
      }
    }
  }, [sessionId]);
  
  const handleCheckSession = () => {
    if (!customSessionId.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a session ID",
        variant: "destructive"
      });
      return;
    }
    
    const exists = sessionExists(customSessionId);
    if (!exists) {
      toast({
        title: "Session Not Found",
        description: "The session ID you entered doesn't exist",
        variant: "destructive"
      });
      return;
    }
    
    const session = getSessionBySessionId(customSessionId);
    setSessionInfo(session);
    setIsPasswordRequired(!!session?.password);
  };
  
  const handleJoinSession = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to join a session",
        variant: "destructive"
      });
      return;
    }
    
    if (!customSessionId.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a session ID",
        variant: "destructive"
      });
      return;
    }
    
    if (isPasswordRequired && !password.trim()) {
      toast({
        title: "Missing Information",
        description: "This session requires a password",
        variant: "destructive"
      });
      return;
    }
    
    setIsJoining(true);
    
    try {
      // Update display name if changed
      let userToJoin = { ...currentUser };
      if (displayName !== currentUser.displayName) {
        userToJoin = { ...userToJoin, displayName };
      }
      
      const success = await joinSessionById(customSessionId, isPasswordRequired ? password : undefined);
      
      if (success) {
        toast({
          title: "Success",
          description: "You've joined the session successfully"
        });
        
        // Get project ID from session
        const session = getSessionBySessionId(customSessionId);
        if (session) {
          navigate(`/project/${session.id}`);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to join the session. Please check the session ID and password.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-dark-400 p-4">
      <header className="max-w-md mx-auto w-full mb-8 mt-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to home
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Join Session</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Connect to an existing Sentient Witness conversation</p>
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-md mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle>Join Session</CardTitle>
            <CardDescription>
              Enter the session ID and optional password to join an existing conversation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-id">Session ID</Label>
              <div className="flex space-x-2">
                <Input
                  id="session-id"
                  placeholder="Enter session ID"
                  value={customSessionId}
                  onChange={(e) => setCustomSessionId(e.target.value)}
                  disabled={!!sessionId || !!sessionInfo}
                />
                {!sessionInfo && !sessionId && (
                  <Button onClick={handleCheckSession}>Check</Button>
                )}
              </div>
            </div>
            
            {sessionInfo && (
              <div className="rounded-lg border p-3 bg-gray-50 dark:bg-dark-300">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">{sessionInfo.name}</h3>
                  {isPasswordRequired && (
                    <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                      <Lock className="h-3 w-3 mr-1" /> Password Protected
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {sessionInfo.description || 'No description provided'}
                </p>
                <div className="flex flex-wrap gap-1">
                  {sessionInfo.participants.slice(0, 5).map((participant: any) => (
                    <UserAvatar key={participant.id} user={participant} size="xs" />
                  ))}
                  {sessionInfo.participants.length > 5 && (
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-dark-100 flex items-center justify-center text-gray-600 dark:text-gray-400 text-xs">
                      +{sessionInfo.participants.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {isPasswordRequired && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter session password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="display-name">Your Display Name</Label>
              <Input
                id="display-name"
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoinSession}
              disabled={isJoining || !customSessionId || (isPasswordRequired && !password) || !displayName}
            >
              {isJoining ? "Joining..." : "Join Session"}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
