/// <reference types="vite/client" />

declare module 'react-svg-worldmap' {
  import type { ComponentType, CSSProperties } from 'react';

  export type DataItem<T = number> = {
    country: string;
    value: T;
  };

  export interface CountryContext<T = number> {
    countryCode: string;
    countryName: string;
    countryValue?: T;
    color: string;
    minValue: number;
    maxValue: number;
    prefix: string;
    suffix: string;
  }

  export interface WorldMapProps<T = number> {
    color?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'responsive';
    data: DataItem<T>[];
    valueSuffix?: string;
    backgroundColor?: string;
    tooltipBgColor?: string;
    tooltipTextColor?: string;
    richInteraction?: boolean;
    strokeOpacity?: number;
    styleFunction?: (context: CountryContext<T>) => CSSProperties;
    tooltipTextFunction?: (args: CountryContext<T>) => string;
  }

  const WorldMap: ComponentType<WorldMapProps<number>>;
  export default WorldMap;

  export const regions: { name: string; code: string }[];
}
