import React, { useState } from 'react';

export interface AvatarProps {
  name: string;
  avatar?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isNeo?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatar,
  email,
  size = 'md',
  className = '',
  isNeo = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const initial = (name || email || 'U').trim().charAt(0).toUpperCase();

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm font-bold',
    xl: 'w-12 h-12 text-base font-bold',
  }[size];

  // Hash-based color palette for initials
  const colors = [
    'bg-emerald-600',
    'bg-indigo-600',
    'bg-blue-600',
    'bg-teal-600',
    'bg-sky-600',
    'bg-purple-600',
    'bg-amber-600',
    'bg-rose-600',
  ];
  const charCode = initial.charCodeAt(0) || 0;
  const bg = colors[charCode % colors.length];

  if (!avatar || imageError) {
    if (isNeo) {
      return (
        <div
          className={`${sizeClasses} border-2 border-black bg-[#FEF08A] text-black font-black flex items-center justify-center shrink-0 uppercase select-none ${className}`}
        >
          {initial}
        </div>
      );
    }

    return (
      <div
        className={`${sizeClasses} rounded-full ${bg} text-white font-bold flex items-center justify-center shadow-xs shrink-0 select-none ${className}`}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={avatar}
      alt={name || 'Avatar'}
      onError={() => setImageError(true)}
      className={`${sizeClasses} ${isNeo ? 'border-2 border-black' : 'rounded-full object-cover border border-slate-300 dark:border-slate-700'} shrink-0 ${className}`}
    />
  );
};
