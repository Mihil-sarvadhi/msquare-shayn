/// <reference types="vite/client" />

declare module 'react-svg-worldmap' {
  import type { ComponentType } from 'react';

  export type DataItem<T = number> = {
    country: string;
    value: T;
  };

  export interface WorldMapProps<T = number> {
    color?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'responsive';
    data: DataItem<T>[];
    valueSuffix?: string;
    backgroundColor?: string;
    tooltipBgColor?: string;
    tooltipTextColor?: string;
    richInteraction?: boolean;
    tooltipTextFunction?: (args: { countryName: string; countryValue?: T | null }) => string;
  }

  const WorldMap: ComponentType<WorldMapProps<number>>;
  export default WorldMap;
}
