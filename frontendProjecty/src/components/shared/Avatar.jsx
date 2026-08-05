import { useState } from 'react';
import { API_ORIGIN } from '../../services/api';

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-xl',
};

const initialsOf = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
};

const resolveSrc = (avatarUrl) => {
  if (!avatarUrl) return null;
  return avatarUrl.startsWith('http') ? avatarUrl : `${API_ORIGIN}${avatarUrl}`;
};

export const Avatar = ({ name, avatarUrl, size = 'md', className = '' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const src = resolveSrc(avatarUrl);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        onError={() => setImgFailed(true)}
        className={`shrink-0 rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary ${sizeClass} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
};

export default Avatar;
