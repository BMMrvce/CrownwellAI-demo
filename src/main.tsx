import { MantineProvider } from '@mantine/core'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import '@mantine/core/styles.css'

// Initialize theme from localStorage or default to dark
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.classList.add(savedTheme);

createRoot(document.getElementById('root')!).render(
  <MantineProvider forceColorScheme='dark'>
    <App />
  </MantineProvider>,
)

