import { cn } from '@/lib/utils';

export type ConnectorKey = 'shopify' | 'meta_ads' | 'ga4' | 'judgeme' | 'ithink' | 'unicommerce';

interface BrandIconProps {
  connector: ConnectorKey | string;
  size?: number;
  className?: string;
}

const BRAND_BG: Record<string, string> = {
  shopify: '#95BF47',
  meta_ads: '#0866FF',
  ga4: '#F9AB00',
  judgeme: '#F7666B',
  ithink: '#1E3A8A',
  unicommerce: '#5B6CFF',
};

function Glyph({ connector }: { connector: string }) {
  switch (connector) {
    case 'shopify':
      return (
        <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 7h12l-1 13H7L6 7z" />
          <path d="M9 7a3 3 0 1 1 6 0" />
        </svg>
      );
    case 'meta_ads':
      return (
        <svg viewBox="0 0 24 24" width="72%" height="72%" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 16c0-5 3-9 6-9 2 0 3.5 1.5 5 4.5S17 16 19 16c1.5 0 2.5-1 2.5-2.5S20.5 11 19 11c-2 0-3.5 2-5 5s-3 4.5-5 4.5C5.5 20.5 3 18.5 3 16z" />
        </svg>
      );
    case 'ga4':
      return (
        <svg viewBox="0 0 24 24" width="62%" height="62%" fill="white" aria-hidden>
          <rect x="4" y="12" width="4" height="8" rx="1.5" />
          <rect x="10" y="8" width="4" height="12" rx="1.5" />
          <rect x="16" y="4" width="4" height="16" rx="1.5" />
        </svg>
      );
    case 'judgeme':
      return (
        <svg viewBox="0 0 24 24" width="68%" height="68%" fill="white" aria-hidden>
          <path d="M12 3l2.6 5.7 6.2.7-4.6 4.3 1.3 6.1L12 17l-5.5 2.8 1.3-6.1L3.2 9.4l6.2-.7L12 3z" />
        </svg>
      );
    case 'ithink':
      return (
        <svg viewBox="0 0 24 24" width="64%" height="64%" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 8l9-4 9 4v8l-9 4-9-4V8z" />
          <path d="M3 8l9 4 9-4" />
          <path d="M12 12v8" />
        </svg>
      );
    case 'unicommerce':
      return (
        <svg viewBox="0 0 24 24" width="62%" height="62%" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M7 6V4h10v2" />
          <path d="M3 12h18" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="60%" height="60%" fill="white" aria-hidden>
          <circle cx="12" cy="12" r="5" />
        </svg>
      );
  }
}

export function BrandIcon({ connector, size = 22, className }: BrandIconProps) {
  const bg = BRAND_BG[connector] ?? '#8C7B64';
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md shrink-0 shadow-sm',
        className,
      )}
      style={{ width: size, height: size, backgroundColor: bg }}
      aria-label={connector}
    >
      <Glyph connector={connector} />
    </span>
  );
}
