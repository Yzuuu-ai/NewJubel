import React from 'react';
const LineClamp = ({ children, lines = 2, className = '' }) => {
  const style = {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  };
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
};
export default LineClamp;
