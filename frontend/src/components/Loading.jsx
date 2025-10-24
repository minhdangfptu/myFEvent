import React from 'react';
import loadingGif from '../assets/loading.gif';

const Loading = ({ size = 50 }) => {
  return (
    <div className="d-flex justify-content-center align-items-center">
      <img 
        src={loadingGif} 
        alt="Loading..." 
        style={{ 
          width: '10%',
          height: 'auto'
        }} 
      />
    </div>
  );
};

export default Loading;