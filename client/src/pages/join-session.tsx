import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useStore } from '@/lib/store';
import { sessionExists, getSessionBySessionId } from '@/lib/session';
import { useSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import { Brain, ArrowLeft, Lock, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import UserAvatar from '@/components/user-avatar';
import { generateFunnyName } from '@/lib/name-generator';

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
  const [sessionMode, setSessionMode] = useState<'multi' | 'single' | 'limited'>('multi');
  const [limitedUserCount, setLimitedUserCount] = useState(0);
  const [remainingSlots, setRemainingSlots] = useState<number | null>(null);
  
  // Parse the current URL for query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isProtected = searchParams.get('protected') === 'true';
    const mode = searchParams.get('mode') as 'single' | 'limited' | null;
    const predefinedName = searchParams.get('name');
    const userLimit = searchParams.get('limit');
    
    if (isProtected) {
      setIsPasswordRequired(true);
    }
    
    if (mode) {
      setSessionMode(mode);
    }
    
    if (predefinedName) {
      setDisplayName(decodeURIComponent(predefinedName));
    } else if (!displayName) {
      // If no name is provided and user doesn't have one, generate a funny name
      setDisplayName(generateFunnyName());
    }
    
    if (userLimit) {
      const limit = parseInt(userLimit, 10);
      if (!isNaN(limit)) {
        setLimitedUserCount(limit);
      }
    }
  }, [displayName]);
  
  // Load session info if sessionId is provided
  useEffect(() => {
    if (sessionId) {
      const session = getSessionBySessionId(sessionId);
      if (session) {
        setSessionInfo(session);
        setIsPasswordRequired(!!session.password);
        
        // Calculate remaining slots for limited mode
        if (sessionMode === 'limited' && limitedUserCount > 0) {
          setRemainingSlots(limitedUserCount - (session.participants?.length || 0));
        }
      }
    }
  }, [sessionId, sessionMode, limitedUserCount]);
  
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
    
    // Check session mode restrictions
    if (sessionMode === 'single') {
      // For single-user links, we don't need additional checks since the displayName 
      // is pre-filled and locked based on the URL parameter
    } else if (sessionMode === 'limited' && remainingSlots !== null && remainingSlots <= 0) {
      toast({
        title: "Session Full",
        description: "This session has reached its maximum number of participants",
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
                  
                  {/* Session badges */}
                  <div className="flex items-center gap-1">
                    {isPasswordRequired && (
                      <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                        <Lock className="h-3 w-3 mr-1" /> Password Protected
                      </div>
                    )}
                    
                    {sessionMode === 'single' && (
                      <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                        <User className="h-3 w-3 mr-1" /> Single-User Link
                      </div>
                    )}
                    
                    {sessionMode === 'limited' && (
                      <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                        <Users className="h-3 w-3 mr-1" /> Limited Users
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {sessionInfo.description || 'No description provided'}
                </p>
                
                {/* Info about limited slots if applicable */}
                {sessionMode === 'limited' && remainingSlots !== null && (
                  <div className={`text-sm mb-3 ${remainingSlots > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {remainingSlots > 0 ? (
                      <p>{remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining</p>
                    ) : (
                      <p>No slots remaining. This session is full.</p>
                    )}
                  </div>
                )}
                
                {/* Special message for single user links */}
                {sessionMode === 'single' && (
                  <div className="text-sm mb-3 text-blue-600 dark:text-blue-400">
                    <p>This link is specifically for: <strong>{displayName}</strong></p>
                  </div>
                )}
                
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
              <div className="flex justify-between items-center">
                <Label htmlFor="display-name">Your Display Name</Label>
                {!sessionMode && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={() => setDisplayName(generateFunnyName())}
                  >
                    Random Name
                  </Button>
                )}
              </div>
              <Input
                id="display-name"
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                readOnly={sessionMode === 'single'}
                className={sessionMode === 'single' ? 'bg-gray-50 dark:bg-gray-900/50' : ''}
              />
              {!sessionMode && (
                <p className="text-xs text-muted-foreground mt-1">
                  Fun random names can help protect your identity in public sessions
                </p>
              )}
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
