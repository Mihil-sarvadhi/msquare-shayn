/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { PanelInfo, PanelAI } from './Panel';

export interface DrawerPayload {
  mode: 'info' | 'ai';
  title: string;
  info?: PanelInfo;
  ai?: PanelAI;
}

interface DrawerContextValue {
  isOpen: boolean;
  payload: DrawerPayload | null;
  openInfo: (title: string, info: PanelInfo) => void;
  openAI: (title: string, ai: PanelAI) => void;
  close: () => void;
}

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState<DrawerPayload | null>(null);

  const openInfo = useCallback((title: string, info: PanelInfo) => {
    setPayload({ mode: 'info', title, info });
    setIsOpen(true);
  }, []);

  const openAI = useCallback((title: string, ai: PanelAI) => {
    setPayload({ mode: 'ai', title, ai });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <DrawerContext.Provider value={{ isOpen, payload, openInfo, openAI, close }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer(): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('useDrawer must be used inside DrawerProvider');
  return ctx;
}
