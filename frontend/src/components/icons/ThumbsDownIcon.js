import React from 'react';

function ThumbsDownIcon({ size = 24, color = '#1a1a1a' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 2V13M22 11V4C22 2.89543 21.1046 2 20 2H7.57377C6.09296 2 4.83384 3.08029 4.60857 4.54382L3.53169 11.5438C3.25212 13.3612 4.65888 15 6.49684 15H10C10.5523 15 11 15.4477 11 16V19.5342C11 20.896 12.104 22 13.4658 22C13.7907 22 14.085 21.8087 14.2169 21.5119L16.7361 15.4213C16.901 15.0507 17.2546 14.8333 17.6382 14.8333H20C21.1046 14.8333 22 13.9379 22 12.8333V4C22 2.89543 21.1046 2 20 2H17Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default ThumbsDownIcon;

