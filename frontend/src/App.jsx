import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { ShieldAlert, Radio, History, Home } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import LiveDashboard from './pages/LiveDashboard';
import HistoricalReplay from './pages/HistoricalReplay';
import 'maplibre-gl/dist/maplibre-gl.css';
import './index.css';

function AppShell() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="h-screen w-screen flex flex-col font-sans bg-space-deep">
      {/* Top Navigation — hidden on landing page */}
      {!isLanding && (
        <header className="h-14 md:h-16 glass-panel border-b border-x-0 border-t-0 border-slate-700/20 flex items-center px-4 md:px-6 justify-between z-20 mx-1 md:mx-2 mt-1 md:mt-2">
          <div className="flex items-center gap-2 md:gap-3">
            <NavLink to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
              <ShieldAlert className="text-brand-amber h-6 w-6 md:h-7 md:w-7" style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.3))' }} />
              <div className="hidden sm:block">
                <h1 className="text-sm md:text-base lg:text-lg font-bold tracking-wider gradient-text leading-tight uppercase">FLOODWATCH</h1>
                <p className="text-[8px] md:text-[9px] text-slate-500 uppercase tracking-[0.2em]">AI Disaster Intelligence</p>
              </div>
            </NavLink>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-0.5 md:gap-1 bg-slate-800/30 rounded-full p-0.5 md:p-1 border border-slate-700/20 max-w-[200px] sm:max-w-none overflow-x-auto no-scrollbar">
            <NavLink to="/" end className={({ isActive }) => `flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-medium transition-all whitespace-nowrap ${isActive ? 'bg-slate-700/40 text-white border border-slate-600/40' : 'text-slate-500 border border-transparent'}`}>
              <Home className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden xs:inline">Home</span>
            </NavLink>
            <NavLink to="/live" className={({ isActive }) => `flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-medium transition-all whitespace-nowrap ${isActive ? 'bg-brand-green/10 text-brand-green border border-brand-green/25 shadow-[0_0_12px_rgba(34,197,94,0.08)]' : 'text-slate-500 border border-transparent'}`}>
              <Radio className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden xs:inline">Live Monitor</span>
            </NavLink>
            <NavLink to="/replay" className={({ isActive }) => `flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-medium transition-all whitespace-nowrap ${isActive ? 'bg-brand-amber/10 text-brand-amber border border-brand-amber/25 shadow-[0_0_12px_rgba(245,158,11,0.08)]' : 'text-slate-500 border border-transparent'}`}>
              <History className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden xs:inline">Archive</span>
            </NavLink>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-brand-green animate-pulse shadow-[0_0_8px_#22c55e]"></div>
            <span className="hidden md:inline text-[10px] text-slate-500 uppercase tracking-widest leading-none">Systems Online</span>
          </div>
        </header>
      )}

      {/* Page Content */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/live" element={<LiveDashboard />} />
        <Route path="/replay" element={<HistoricalReplay />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
