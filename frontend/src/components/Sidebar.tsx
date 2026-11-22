import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Boxes,
  Workflow,
  CalendarCheck2,
  CalendarDays,
  AlertTriangle,
  PlayCircle,
  FileSpreadsheet,
  Settings,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  criticalConflictCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ criticalConflictCount = 0 }) => {
  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Roster Planner', path: '/roster', icon: CalendarDays },
    { name: 'Conflict Centre', path: '/conflicts', icon: AlertTriangle, badge: criticalConflictCount },
    { name: 'Scenario Walkthrough', path: '/scenario', icon: PlayCircle, highlight: true },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Brands & Rules', path: '/brands', icon: Building2 },
    { name: 'Pods', path: '/pods', icon: Boxes },
    { name: 'Processes', path: '/processes', icon: Workflow },
    { name: 'Availability & Leaves', path: '/leaves', icon: CalendarCheck2 },
    { name: 'Reports & Export', path: '/reports', icon: FileSpreadsheet },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-navy-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-indigo-100" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            RosterFlow
          </span>
          <span className="text-[10px] text-slate-400 block tracking-wider uppercase font-semibold">
            Workforce Ops OS
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
          Operations Core
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : item.highlight
                    ? 'bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60 hover:text-white border border-indigo-800/40'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500 text-white">
                  {item.badge}
                </span>
              )}
              {item.highlight && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Demo
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Operational Badge */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60">
        <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span className="font-medium text-slate-300">Coverage Engine</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Deterministic
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Multi-brand workforce constraint solver active.
          </p>
        </div>
      </div>
    </aside>
  );
};
