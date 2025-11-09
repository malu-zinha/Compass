import React from 'react';

function ThumbsUpIcon({ size = 24, color = '#1a1a1a' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 22V11M2 13V20C2 21.1046 2.89543 22 4 22H16.4262C17.907 22 19.1662 20.9197 19.3914 19.4562L20.4683 12.4562C20.7479 10.6388 19.3411 9 17.5032 9H14C13.4477 9 13 8.55228 13 8V4.46584C13 3.10399 11.896 2 10.5342 2C10.2093 2 9.91498 2.1913 9.78306 2.48812L7.26394 8.5787C7.09896 8.94928 6.74538 9.16667 6.36178 9.16667H4C2.89543 9.16667 2 10.0621 2 11.1667V20C2 21.1046 2.89543 22 4 22H7Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default ThumbsUpIcon;

