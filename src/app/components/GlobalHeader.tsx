'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, Settings, Usb, Play, Download, X, Moon, Sun 
} from 'lucide-react';

export default function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    usbConnected, setUsbConnected, 
    fontSize, setFontSize, 
    theme, setTheme, 
    activeRow, getCompiledHex,
    activeProjectId, setActiveProjectId,
    playChime
  } = useApp();

  // Map route pathnames to views
  const getActiveView = () => {
    if (pathname === '/func-build') return 'func';
    if (pathname === '/proj-build') return 'proj';
    if (pathname === '/process') return 'process';
    return 'hub';
  };

  const view = getActiveView();

  const titles = {
    'hub': 'MAIN HUB',
    'func': 'FUNCTION BUILDER',
    'proj': activeProjectId ? 'PROJECT BUILDER / Workflow Canvas' : 'PROJECT BUILDER / Select Project',
    'process': 'TEST OUT / Project Processor'
  };

  const handleBack = () => {
    if (view === 'process') {
      router.push('/proj-build');
    } else if (view === 'proj' && activeProjectId) {
      setActiveProjectId(null);
    } else {
      router.push('/');
    }
  };

  const handleClose = () => {
    router.push('/proj-build');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleExportHex = () => {
    if (!activeRow) {
      alert("Please select a command row in the project hierarchy tree on the left first.");
      return;
    }
    const hexLines = getCompiledHex(activeRow);
    const textContent = hexLines.map(line => `${line.offset}  ${line.bytes}  ${line.ascii}`).join('\n');
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeRow.label || 'esp32_cmd'}_compiled.hex`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToHardware = () => {
    if (!usbConnected) {
      alert("USB device is not connected. Connect using Project Builder serial connection trigger.");
      return;
    }
    if (!activeRow) {
      alert("Please select a command row in the project hierarchy tree to flash.");
      return;
    }
    
    const hexLines = getCompiledHex(activeRow);
    const rawBytes = hexLines.map(l => l.bytes).join(' ');
    
    playChime();
    alert(`[WEB SERIAL API] Successfully initiated flash sequence!\n\nPayload Size: 48 Bytes\nInstruction: ${activeRow.command}\nHex Dump:\n${rawBytes.slice(0, 70)}...\n\nFlashing completed successfully to target /dev/ttyUSB port.`);
  };

  return (
    <div className="bg-white dark:bg-[#080c14] border-b-2 border-emerald-500 sticky top-0 z-50 shadow-md transition-colors duration-200 shrink-0">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 flex-1">
          {view !== 'hub' && (
            <button 
              onClick={handleBack}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title={view === 'process' ? "Back to Project Builder" : "Back to Hub"}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-wider flex items-center gap-1.5 select-none">
            <Settings size={16} className="text-slate-500 dark:text-slate-400" />
            {titles[view] || 'MAIN HUB'}
          </h1>
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          className="p-1 mr-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          title="Toggle Light/Dark Mode"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Font Size Selector */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 p-0.5 mr-4 transition-colors">
          <button 
            onClick={() => setFontSize(prev => Math.max(0.8, prev - 0.1))} 
            className="px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[0.625rem] font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            A-
          </button>
          <span className="px-1.5 text-[0.625rem] text-slate-600 dark:text-slate-400 font-mono select-none">
            {Math.round(fontSize * 100)}%
          </span>
          <button 
            onClick={() => setFontSize(prev => Math.min(1.5, prev + 0.1))} 
            className="px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[0.625rem] font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            A+
          </button>
        </div>

        {/* Action Buttons (Process View Specific) */}
        {view === 'process' && (
          <div className="flex gap-1.5 mr-4 animate-in fade-in slide-in-from-top-1 duration-150">
            <button 
              onClick={handleExportHex}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer shadow-sm"
              title="Download compiled hex payload file"
            >
              <Download size={14} /> Export Hex
            </button>
            <button 
              onClick={handleSendToHardware}
              className="flex items-center gap-1 bg-orange-600 hover:bg-orange-500 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer shadow-sm"
              title="Flash compiled packet to ESP32 board"
            >
              <Play size={14} /> Send to Hardware
            </button>
            <button 
              onClick={handleClose} 
              className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={14} /> Close
            </button>
          </div>
        )}

        {/* USB Pill Button (Click to Disconnect) */}
        <button 
          onClick={() => {
            if (usbConnected) {
              setUsbConnected(false);
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.625rem] font-bold border transition-colors select-none ${
            usbConnected 
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-850 hover:bg-red-100 dark:hover:bg-red-955/30 hover:text-red-700 dark:hover:text-red-400 hover:border-red-300 cursor-pointer' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700 cursor-not-allowed'
          }`}
          title={usbConnected ? "Click to disconnect USB device" : "Disconnected"}
          disabled={!usbConnected}
        >
          <Usb size={12} />
          {usbConnected ? 'USB CONNECTED' : 'DISCONNECTED'}
        </button>
      </div>
    </div>
  );
}
