import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Target, Image as ImageIcon, FlaskConical, Lightbulb, Bell, Settings, ActivitySquare, CheckSquare, Globe, Search, Eye, BrainCircuit, History, Calculator, Shield, Zap, PenTool, Video, Rocket, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

const navGroups = [
  {
    title: 'OPERATIONS',
    items: [
      { name: 'Command Center', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Campaign Manager', path: '/campaigns', icon: Target },
      { name: 'Automations & Rules', path: '/performance', icon: TrendingUp }
    ]
  },
  {
    title: 'RESEARCH',
    items: [
      { name: 'Creative Analytics', path: '/creatives', icon: ImageIcon },
      { name: 'Market Intel', path: '/market', icon: Globe },
      { name: 'Pre-Funnel Analysis', path: '/pre-funnel', icon: BrainCircuit },
      { name: 'Optimization Logs', path: '/logs', icon: History },
      { name: 'Competitor Spy', path: '/ad-spy', icon: Eye },
      { name: 'Content Architect', path: '/content-architect', icon: PenTool },
      { name: 'Strategy Playbook', path: '/growth-planner', icon: Rocket },
      { name: 'Audience Architect', path: '/omni-engine', icon: BrainCircuit }
    ]
  },
  {
    title: 'SETTINGS',
    items: [
      { name: 'Global Settings', path: '/settings', icon: Settings }
    ]
  }
];

export function Sidebar() {
  return (
    <div className="w-64 bg-card text-foreground flex flex-col h-screen border-r border-border shrink-0 z-20">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Target className="w-5 h-5" />
          </div>
          <span className="font-semibold">MediaBuyer</span>
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar pb-8">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</h3>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group relative',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-105", isActive && "text-primary")} />
                      {item.name}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>System Status</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}
