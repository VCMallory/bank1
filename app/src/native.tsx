import React from 'react';
import { createRoot } from 'react-dom/client';
import FinanceApp from './FinanceApp';
import './styles.css';
import './native.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><FinanceApp native/></React.StrictMode>);
