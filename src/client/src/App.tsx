import React from 'react';
import Dashboard from './components/Dashboard';
import '@radix-ui/themes/styles.css';
import '@fontsource/space-grotesk';
import './styles/globals.css';
import { Theme } from '@radix-ui/themes';
import { Toaster } from 'sonner';
import { UnifiedStateProvider } from './contexts/UnifiedStateContext';

const App: React.FC = () => {
  return (
    <Theme 
      accentColor="red" 
      grayColor="mauve" 
      radius="medium" 
      appearance="dark" 
      hasBackground={false}
      scaling="100%"
    >
      <UnifiedStateProvider>
        <Toaster position="top-right" theme="dark" richColors />
        <Dashboard />
      </UnifiedStateProvider>
    </Theme>
  );
};

export default App;