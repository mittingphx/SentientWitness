import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SessionUser } from '../shared/schema';
import { Bot, User } from 'lucide-react';

interface UserAvatarProps {
  user: SessionUser;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function UserAvatar({ user, size = 'sm' }: UserAvatarProps) {
  // Determine the size class
  const sizeClass = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
  }[size];
  
  // Get the initials from the display name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Get the icon based on user type
  const getIcon = () => {
    if (user.type === 'ai') {
      return <Bot className="h-3/5 w-3/5" />;
    }
    return <User className="h-3/5 w-3/5" />;
  };
  
  return (
    <Avatar className={`${sizeClass} shrink-0`}>
      {user.avatar ? (
        <img src={user.avatar} alt={user.displayName} />
      ) : (
        <AvatarFallback
          style={{ backgroundColor: user.color }}
          className="text-white flex items-center justify-center"
        >
          {user.type === 'human' ? getInitials(user.displayName) : getIcon()}
        </AvatarFallback>
      )}
    </Avatar>
  );
}