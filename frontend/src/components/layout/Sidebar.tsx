import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Users, Truck, Star, Menu } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',  to: '/dashboard'  },
  { icon: TrendingUp,      label: 'Marketing',  to: '/marketing'  },
  { icon: Users,           label: 'Customers',  to: '/customers'  },
  { icon: Truck,           label: 'Operations', to: '/operations' },
  { icon: Star,            label: 'Reviews',    to: '/reviews'    },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-white border-r border-[#F0EBE0] transition-all duration-300 ease-in-out shrink-0 h-screen',
        collapsed ? 'w-[64px]' : 'w-[220px]'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center border-b border-[#F0EBE0] py-[14px]',
        collapsed ? 'flex-col gap-2 px-0 py-3' : 'px-4 justify-between'
      )}>
        {/* Logo */}
        <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#B8860B] shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          {!collapsed && (
            <span className="text-[#1A1208] font-bold text-[14px] tracking-[0.1em]">SHAYN</span>
          )}
        </div>

        {/* Hamburger toggle */}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[#8C7B64] hover:text-[#1A1208] hover:bg-[#F5F0E8] transition-colors"
        >
          <Menu size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-[2px] overflow-hidden">
        {NAV.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex items-center rounded-lg py-[9px] text-[13px] font-medium transition-all duration-150 group',
                collapsed ? 'justify-center px-0 w-full' : 'px-3 gap-3',
                isActive
                  ? 'bg-gold/10 text-gold'
                  : 'text-muted hover:bg-parch hover:text-ink'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-full bg-gold" />
                )}
                <Icon
                  size={17}
                  strokeWidth={1.6}
                  className={cn('shrink-0', isActive ? 'text-gold' : 'text-stone')}
                />
                {!collapsed && <span className="truncate">{label}</span>}
                {collapsed && (
                  <span className="pointer-events-none absolute left-[calc(100%+8px)] z-50 hidden group-hover:flex items-center rounded-md bg-ink px-2.5 py-1.5 text-xs text-white whitespace-nowrap shadow-xl">
                    {label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
