import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Users, Truck, Star, ChevronLeft, ChevronRight } from 'lucide-react';
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
        'relative flex flex-col bg-[#1A1208] transition-all duration-300 ease-in-out shrink-0 h-screen',
        collapsed ? 'w-[64px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-white/10 py-[18px]',
        collapsed ? 'justify-center px-0' : 'px-4 gap-3'
      )}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#B8860B]/20 shrink-0">
          <span className="text-[#B8860B] font-bold text-sm">S</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-semibold text-[13px] tracking-[0.15em] leading-none">SHAYN</p>
            <p className="text-white/35 text-[10px] tracking-wider uppercase mt-[3px]">Dashboard</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-[2px] overflow-hidden">
        {NAV.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex items-center rounded-lg py-[10px] text-[13px] font-medium transition-all duration-150 group',
                collapsed ? 'justify-center px-0 w-full' : 'px-3 gap-3',
                isActive
                  ? 'bg-[#B8860B]/15 text-[#B8860B]'
                  : 'text-white/50 hover:bg-white/[0.06] hover:text-white/85'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-full bg-[#B8860B]" />
                )}
                <Icon size={17} strokeWidth={1.6} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
                {collapsed && (
                  <span className="pointer-events-none absolute left-[calc(100%+8px)] z-50 hidden group-hover:flex items-center rounded-md bg-[#2a1f0e] border border-white/10 px-2.5 py-1.5 text-xs text-white whitespace-nowrap shadow-2xl">
                    {label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/10 p-2">
        <button
          onClick={toggle}
          className={cn(
            'flex items-center w-full rounded-lg py-2 text-white/30 hover:text-white/65 hover:bg-white/5 transition-colors',
            collapsed ? 'justify-center' : 'gap-2 px-3'
          )}
        >
          {collapsed
            ? <ChevronRight size={15} strokeWidth={1.5} />
            : (
              <>
                <ChevronLeft size={15} strokeWidth={1.5} />
                <span className="text-xs">Collapse</span>
              </>
            )
          }
        </button>
      </div>
    </aside>
  );
}
