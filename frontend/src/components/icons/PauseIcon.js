import React from 'react';

function PauseIcon({ size = 24, color = '#1a1a1a' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="4" width="4" height="16" fill={color}/>
      <rect x="14" y="4" width="4" height="16" fill={color}/>
    </svg>
  );
}

export default PauseIcon;

