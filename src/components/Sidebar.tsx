import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Target,
  Settings,
  LogOut,
  LayoutDashboard,
  Link2,
  Megaphone,
  FlaskConical,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useOS } from '../lib/OSContext';
import { useFilters } from '../lib/FilterContext';

export function Sidebar() {
  const { selectedBusiness, resetWorkspace } = useOS();
  const { allConnectedAccounts, connectedStores, connectedPlatformsStatus } = useFilters();

  const connectedPlatformsCount = Object.values(connectedPlatformsStatus).filter(Boolean).length;
  const totalLinkedItems = connectedPlatformsCount + allConnectedAccounts.length + connectedStores.length;

  const navGroups = [
    {
      title: 'المراقبة والربط (Tracking)',
      items: [
        {
          name: 'Connections & Stores',
          subtitle: 'المنصات والحسابات والمتاجر',
          path: '/connections',
          icon: Link2,
          badge: totalLinkedItems > 0 ? `${totalLinkedItems}` : 'Start',
        },
        {
          name: 'Overview',
          subtitle: 'لوحة أداء الحساب النشط',
          path: '/overview',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'التحليل والاستراتيجية (Intel)',
      items: [
        {
          name: 'Pre-Funnel Intel',
          subtitle: 'المنافسون + الحساب/المتجر',
          path: '/pre-funnel',
          icon: Target,
        },
      ],
    },
    {
      title: 'الحملات والإعلانات (Ads)',
      items: [
        {
          name: 'Campaigns',
          subtitle: 'متابعة وتعديل الحملات',
          path: '/campaigns',
          icon: Megaphone,
        },
        {
          name: 'Creative Lab',
          subtitle: 'أداء وتحليل الإعلانات',
          path: '/creatives',
          icon: FlaskConical,
        },
      ],
    },
  ];

  return (
    <div className="w-64 bg-card text-foreground flex flex-col h-screen border-r border-border shrink-0 z-20">
      <div className="p-6 pb-3">
        <h1 className="text-xl font-medium tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Target className="w-5 h-5" />
          </div>
          <span className="font-serif tracking-wide">Growth OS</span>
        </h1>
        {selectedBusiness && (
          <div className="mt-4 px-3 py-2 bg-muted/50 rounded-lg border border-border text-sm flex items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shrink-0" />
            <span className="truncate text-foreground font-medium">{selectedBusiness.name}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <h3 className="px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group relative',
                      isActive
                        ? 'bg-primary/15 text-primary border border-primary/20'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <item.icon
                          className={cn(
                            'w-4 h-4 shrink-0 transition-transform group-hover:scale-105',
                            isActive && 'text-primary'
                          )}
                        />
                        <div className="min-w-0">
                          <div className="truncate leading-tight">{item.name}</div>
                          <div className="text-[10px] text-gray-500 truncate mt-0.5">{item.subtitle}</div>
                        </div>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0',
                            totalLinkedItems > 0
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border mt-auto space-y-2 shrink-0">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )
          }
        >
          <Settings className="w-4 h-4" />
          Settings
        </NavLink>
        <button
          onClick={resetWorkspace}
          className="w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors border border-transparent"
        >
          <LogOut className="w-4 h-4" />
          Reset Workspace
        </button>
      </div>
    </div>
  );
}
