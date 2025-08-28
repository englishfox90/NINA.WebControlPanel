import React from 'react';
import Dashboard from './components/Dashboard';
import '@radix-ui/themes/styles.css';
import '@fontsource/space-grotesk';
import './styles/globals.css';
import { Theme } from '@radix-ui/themes';

const App: React.FC = () => {
  return (
    <Theme accentColor="red" grayColor="mauve" radius="medium" appearance="dark" data-has-background="false">
      <Dashboard />
    </Theme>
  );
};

export default App;