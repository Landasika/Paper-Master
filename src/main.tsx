import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './core/zoteroCompat' // Load compatibility layer
import App from './App.tsx'

// Initialize database and sample data
async function initializeApp() {
  try {
    const zoteroDB = await import('./core/database/ZoteroDB');
    await zoteroDB.default.init();
    console.log('✅ Database initialized');

    // Check if data exists, if not add sample data
    const stats = zoteroDB.default.getStats();
    if (stats.items === 0) {
      console.log('📝 Database empty, adding sample data...');
      const seedData = await import('./core/database/seedData');
      await seedData.default();
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

initializeApp();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
