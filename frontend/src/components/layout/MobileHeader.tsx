import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Users, Truck, Star, Menu, X } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',  to: '/dashboard'  },
  { icon: TrendingUp,      label: 'Marketing',  to: '/marketing'  },
  { icon: Users,           label: 'Customers',  to: '/customers'  },
  { icon: Truck,           label: 'Operations', to: '/operations' },
  { icon: Star,            label: 'Reviews',    to: '/reviews'    },
];

export function MobileHeader() {
  const { mobileOpen, toggle, closeMobile } = useSidebar();

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-[#F0EBE0]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#B8860B]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <span className="text-[#1A1208] font-bold text-[13px] tracking-[0.1em]">SHAYN</span>
        </div>
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[#4B3E2E] hover:bg-[#F5F0E8] transition-colors"
        >
          {mobileOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        </button>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={closeMobile}
        />
      )}

      {/* Drawer */}
      <div className={cn(
        'md:hidden fixed top-0 left-0 z-50 h-full w-[240px] bg-white border-r border-[#F0EBE0] flex flex-col transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-[14px] border-b border-[#F0EBE0]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#B8860B]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <p className="text-[#1A1208] font-bold text-[13px] tracking-[0.1em] leading-none">SHAYN</p>
              <p className="text-[#8C7B64] text-[10px] tracking-wider uppercase mt-[3px]">Dashboard</p>
            </div>
          </div>
          <button onClick={closeMobile} className="w-7 h-7 flex items-center justify-center rounded-md text-[#8C7B64] hover:bg-[#F5F0E8] transition-colors">
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-[2px] overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8C7B64] px-3 pb-1 pt-1">Main</p>
          {NAV.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMobile}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 px-3 rounded-lg py-[10px] text-[13px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#B8860B]/10 text-[#B8860B]'
                    : 'text-[#4B3E2E] hover:bg-[#F5F0E8] hover:text-[#1A1208]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-full bg-[#B8860B]" />}
                  <Icon size={17} strokeWidth={1.6} className={cn('shrink-0', isActive ? 'text-[#B8860B]' : 'text-[#8C7B64]')} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
