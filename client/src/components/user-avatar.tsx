import { SessionUser } from '@shared/schema';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot } from 'lucide-react';

interface UserAvatarProps {
  user: SessionUser;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function UserAvatar({ user, size = 'sm' }: UserAvatarProps) {
  // Map size to appropriate classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  // Get user initials from display name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get color based on user's color property
  // Default to a gray for unknown colors
  const getColorClasses = (colorString: string) => {
    if (!colorString) return 'bg-gray-500 text-white';
    
    const colorMap: Record<string, string> = {
      'blue-500': 'bg-blue-500 text-white',
      'green-500': 'bg-green-500 text-white',
      'red-500': 'bg-red-500 text-white',
      'yellow-500': 'bg-yellow-500 text-white',
      'purple-500': 'bg-purple-500 text-white',
      'pink-500': 'bg-pink-500 text-white',
      'indigo-500': 'bg-indigo-500 text-white',
      'teal-500': 'bg-teal-500 text-white',
      'orange-500': 'bg-orange-500 text-white',
      'cyan-500': 'bg-cyan-500 text-white'
    };
    
    return colorMap[colorString] || 'bg-gray-500 text-white';
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${getColorClasses(user.color)}`}>
      {user.avatar ? (
        <img src={user.avatar} alt={user.displayName} />
      ) : (
        <AvatarFallback className={getColorClasses(user.color)}>
          {user.type === 'ai' ? (
            size === 'xs' ? (
              getInitials(user.displayName)
            ) : (
              <Bot className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
            )
          ) : (
            getInitials(user.displayName)
          )}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
