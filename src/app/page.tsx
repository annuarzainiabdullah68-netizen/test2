'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './context/AppContext';
import { ArrowLeft, Settings, Cpu } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { usbConnected, setUsbConnected } = useApp();

  const handleProjectBuilderClick = async () => {
    if (usbConnected) {
      router.push('/proj-build');
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        // 1. Evaluate if a USB device is already paired
        const ports = await (navigator as any).serial.getPorts();
        if (ports && ports.length > 0) {
          // If already paired, just do the connection and route directly
          setUsbConnected(true);
          router.push('/proj-build');
          return;
        }

        // 2. If false, trigger navigator.serial.requestPort() with strict ttyUSB filtering
        // Common USB to UART bridge controllers and development boards:
        // - 0x10c4: Silicon Labs (CP210x, CP2102 etc.)
        // - 0x1a86: Qinheng (CH340, CH341, CH9102 etc.)
        // - 0x0403: FTDI (FT232R etc.)
        // - 0x067b: Prolific (PL2303)
        // - 0x303a: Espressif (ESP32-S2/S3 USB CDC)
        // - 0x2341: Arduino
        // - 0x16c0: Teensy / PJRC
        // - 0x2e8a: Raspberry Pi (Pico/RP2040)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (navigator as any).serial.requestPort({
          filters: [
            { usbVendorId: 0x10c4 },
            { usbVendorId: 0x1a86 },
            { usbVendorId: 0x0403 },
            { usbVendorId: 0x067b },
            { usbVendorId: 0x303a },
            { usbVendorId: 0x2341 },
            { usbVendorId: 0x16c0 },
            { usbVendorId: 0x2e8a }
          ]
        });
        setUsbConnected(true);
        router.push('/proj-build');
      } else {
        const proceed = window.confirm("Web Serial API is not supported or disabled in this browser. Simulate CP210x /dev/ttyUSB connection instead?");
        if (proceed) {
          setUsbConnected(true);
          router.push('/proj-build');
        }
      }
    } catch (err) {
      console.warn("User cancelled serial device selection or error occurred", err);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0a0f18] p-6 transition-colors duration-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {/* Function Builder Path */}
        <button 
          onClick={() => router.push('/func-build')}
          className="group relative bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl dark:shadow-2xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-blue-900/10 dark:hover:shadow-blue-950/20 transition-all duration-300 text-left overflow-hidden flex flex-col h-64 cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-900 dark:text-white">
            <Settings size={140} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Function Builder</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
            Construct and manage C++ command prototypes (`RowRegistry`) for the ESP32 firmware dynamically.
          </p>
          <div className="mt-auto flex items-center text-sm text-blue-600 dark:text-blue-400 font-semibold transition-transform group-hover:translate-x-1 duration-200">
            Open Builder <ArrowLeft className="ml-1 rotate-180" size={14} />
          </div>
        </button>

        {/* Project Builder Path */}
        <button 
          onClick={handleProjectBuilderClick}
          className="group relative bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl dark:shadow-2xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-emerald-900/10 dark:hover:shadow-emerald-950/20 transition-all duration-300 text-left overflow-hidden flex flex-col h-64 cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-900 dark:text-white">
            <Cpu size={140} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Project Builder</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
            Visually construct execution logic using node workflows. <strong className="text-slate-700 dark:text-slate-300">Requires USB Serial connection</strong> to access.
          </p>
          <div className="mt-auto flex items-center text-sm text-emerald-600 dark:text-emerald-400 font-semibold transition-transform group-hover:translate-x-1 duration-200">
            Connect & Open <ArrowLeft className="ml-1 rotate-180" size={14} />
          </div>
        </button>
      </div>
    </div>
  );
}
