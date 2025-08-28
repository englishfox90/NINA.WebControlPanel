import React from 'react';
import { ReactNode } from 'react';

interface MobileLayoutProps {
  children: ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  return (
    <div className="mobile-layout">
      {children}
    </div>
  );
};

export default MobileLayout;