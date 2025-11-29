import { createRoot } from 'react-dom/client'
import './index.css'
import { AppProvider } from './contexts/AppContext'
import App from './App'

// Apply dark mode as default theme
const initializeTheme = () => {
  const saved = localStorage.getItem('coinet-theme');
  const isDark = saved ? saved === 'dark' : true; // Default to dark mode
  
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Save the theme preference if it doesn't exist
  if (!saved) {
    localStorage.setItem('coinet-theme', 'dark');
  }
};

initializeTheme();

createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <App />
  </AppProvider>
);
