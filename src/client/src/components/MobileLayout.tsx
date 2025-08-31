import React from 'react';
import { ReactNode } from 'react';
import type { MobileLayoutProps } from '../interfaces/dashboard';

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  return (
    <div className="mobile-layout">
      {children}
    </div>
  );
};

export default MobileLayout;
