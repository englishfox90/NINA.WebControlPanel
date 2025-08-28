import React from 'react';
import Dashboard from './components/Dashboard';
import '@radix-ui/themes/styles.css';
import '@fontsource/space-grotesk';
import './styles/globals.css';
import './styles/dashboard.css';
import './styles/mobile.css';
import './styles/settings.css';
import { Theme } from '@radix-ui/themes';

const App: React.FC = () => {
  return (
    <Theme accentColor="red" grayColor="mauve" radius="small">
      <div className="app">
        <Dashboard />
      </div>
    </Theme>
  );
};

export default App;