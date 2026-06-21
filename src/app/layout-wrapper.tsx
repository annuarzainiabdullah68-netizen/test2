'use client';

import React, { useEffect, useState } from 'react';
import { AppContextProvider, useApp } from './context/AppContext';
import GlobalHeader from './components/GlobalHeader';

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { theme, fontSize } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.fontSize = `${fontSize * 24}px`;
    }
  }, [fontSize]);

  // Sync theme with HTML tag to make sure Tailwind dark: styles work globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  if (!mounted) {
    return (
      <div className="dark min-h-full flex flex-col flex-1">
        <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-[#0a0f18] text-slate-900 dark:text-slate-100 font-sans">
          <main className="flex-1 flex flex-col min-h-0 relative" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme} min-h-full flex flex-col flex-1`}>
      <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-[#0a0f18] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
        <GlobalHeader />
        <main className="flex-1 flex flex-col min-h-0 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AppContextProvider>
      <InnerLayout>{children}</InnerLayout>
    </AppContextProvider>
  );
}
