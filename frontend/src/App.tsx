import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { RosterPlanner } from './pages/RosterPlanner';
import { ConflictCentre } from './pages/ConflictCentre';
import { ScenarioWalkthrough } from './pages/ScenarioWalkthrough';
import { Employees } from './pages/Employees';
import { Brands } from './pages/Brands';
import { Pods } from './pages/Pods';
import { Processes } from './pages/Processes';
import { Leaves } from './pages/Leaves';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { api, ValidationSummary } from './services/api';

export function App() {
  const [criticalConflictCount, setCriticalConflictCount] = useState<number>(0);

  const fetchGlobalConflicts = async () => {
    try {
      const res = await api.get<ValidationSummary>('/conflicts');
      setCriticalConflictCount(res.data.critical_count);
    } catch {
      // Ignore initial network or empty db errors
    }
  };

  useEffect(() => {
    fetchGlobalConflicts();
    const interval = setInterval(fetchGlobalConflicts, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
        <Sidebar criticalConflictCount={criticalConflictCount} />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/roster" element={<RosterPlanner />} />
            <Route path="/conflicts" element={<ConflictCentre />} />
            <Route path="/scenario" element={<ScenarioWalkthrough />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/brands" element={<Brands />} />
            <Route path="/pods" element={<Pods />} />
            <Route path="/processes" element={<Processes />} />
            <Route path="/leaves" element={<Leaves />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
