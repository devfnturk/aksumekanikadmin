import React, { FC } from 'react';
import { useLoading } from '../../contexts/LoadingContext';
import './LoadingLayer.css';
import logo from '../../img/aksuLogo.jpg' 
const LoadingLayer: FC = () => {
  const { isLoading } = useLoading();

  if (!isLoading) {
    return null;
  }

  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-spinner-container">
        <img src={logo} className="loading-logo" alt="Yükleniyor..." /> 
        
        <div className="loading-spinner"></div>
        <p className="loading-text">Yükleniyor...</p>
      </div>
    </div>
  );
};
export default LoadingLayer;