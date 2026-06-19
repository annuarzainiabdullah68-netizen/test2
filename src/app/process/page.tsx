'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, RowItem } from '../context/AppContext';
import { Cpu } from 'lucide-react';

export default function ProcessView() {
  const router = useRouter();
  const { nodes, registry, activeRow, setActiveRow, getCompiledHex, usbConnected, activeProjectId } = useApp();

  useEffect(() => {
    if (!usbConnected) {
      router.replace('/');
    } else if (!activeProjectId) {
      router.replace('/proj-build');
    }
  }, [usbConnected, activeProjectId, router]);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (id: string) => {
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Extract utilized hardware pins dynamically from all command rows
  const getUsedPins = () => {
    const pins = new Set<string>();
    Object.values(nodes).forEach(node => {
      if (node.type === 'section' && node.rows) {
        node.rows.forEach(row => {
          const match = row.command.match(/^[A-Z0-9_]+\[(.*)\]$/);
          if (match) {
            const args = match[1].split(',').map(s => s.trim());
            args.forEach(arg => {
              if (arg.startsWith('BTN_') || arg.startsWith('LED_') || arg.startsWith('GPIO_')) {
                pins.add(arg);
              }
            });
          }
        });
      }
    });
    return Array.from(pins);
  };

  const usedPins = getUsedPins();

  // Get description for current active command
  const getActiveDesc = () => {
    if (!activeRow) return "Select a command row in the project hierarchy to view description.";
    const cmdMatch = activeRow.command.match(/^([A-Z0-9_]+)\[/);
    const cmd = cmdMatch ? cmdMatch[1] : (activeRow.command.split('[')[0] || 'PT0');
    const found = registry.find(r => r.Cmd === cmd);
    return found ? found.desc : "No description metadata found for this command type.";
  };



  const hexLines = getCompiledHex(activeRow);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0f172a] p-2 gap-2 overflow-hidden transition-colors duration-200 min-h-0">
      
      {/* Top Composer Bar */}
      <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 font-mono text-xs text-green-600 dark:text-emerald-450 flex items-center gap-2 transition-colors shrink-0 shadow-sm select-none">
        <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest font-sans font-bold">Composed Row View:</span>
        <span className="font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
          {activeRow ? `${activeRow.label ? activeRow.label + ' : ' : ''}${activeRow.command}` : 'Select a command row from hierarchy...'}
        </span>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        
        {/* Left Panel: Tree View */}
        <div className="col-span-12 md:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors shadow-sm min-h-0">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors shrink-0 select-none">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project execution logic tree</span>
          </div>
          <div className="p-3 overflow-y-auto text-xs space-y-2 font-mono flex-1">
            
            {Object.values(nodes).filter(n => n.type === 'tab').map(tab => {
              const isTabCollapsed = !!collapsedNodes[tab.id];

              return (
                <div key={tab.id} className="mb-2">
                  <div className="flex items-center text-pink-600 dark:text-pink-400 font-bold mb-1 select-none">
                    <span 
                      onClick={() => toggleNode(tab.id)}
                      className="cursor-pointer w-5 h-5 flex items-center justify-center mr-1 text-center hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-md transition-colors font-bold text-sm"
                    >
                      {isTabCollapsed ? '+' : '-'}
                    </span>
                    <span className="tracking-wide">TAB: {tab.name}</span>
                  </div>
                  
                  {!isTabCollapsed && (
                    <div className="pl-4 border-l border-slate-100 dark:border-slate-800/80 ml-2 space-y-1.5">
                      {Object.values(nodes).filter(n => n.parentId === tab.id && n.type === 'section').map(sec => {
                        const isSecCollapsed = !!collapsedNodes[sec.id];
                        
                        return (
                          <div key={sec.id} className="mt-1">
                            <div className="flex items-center text-emerald-600 dark:text-emerald-500 font-semibold mb-1 select-none">
                              <span 
                                onClick={() => toggleNode(sec.id)}
                                className="cursor-pointer w-4 h-4 flex items-center justify-center mr-1 text-center hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded transition-colors font-bold text-xs"
                              >
                                {isSecCollapsed ? '+' : '-'}
                              </span>
                              <span>SEC: {sec.name} <span className="text-slate-450 dark:text-slate-500 text-[9px] font-normal font-sans">({sec.exec === '0' ? 'Immediate' : sec.exec === 'Once' ? 'Once' : `Delay: ${sec.exec}ms`})</span></span>
                            </div>
                            
                            {!isSecCollapsed && (
                              <div className="pl-3 border-l border-slate-100 dark:border-slate-850 ml-1.5 space-y-0.5">
                                {sec.rows && sec.rows.map((row, idx) => (
                                  <div 
                                    key={row.id} 
                                    onClick={() => setActiveRow(row)}
                                    className={`pl-2 py-1.5 cursor-pointer flex items-center gap-2 rounded-lg transition-all ${
                                      activeRow?.id === row.id 
                                        ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-slate-850 dark:text-slate-100 font-bold' 
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-855 border border-transparent text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    <span className="text-slate-350 dark:text-slate-600 w-4 font-mono text-right shrink-0 select-none text-[10px]">{idx + 1}</span>
                                    <span className="w-16 text-blue-600 dark:text-blue-400 font-bold truncate shrink-0" title={row.label}>{row.label || 'None'}</span>
                                    <span className="flex-1 font-mono text-[9px] leading-tight flex flex-wrap break-all truncate">{row.command}</span>
                                  </div>
                                ))}
                                {(!sec.rows || sec.rows.length === 0) && (
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 italic py-1 pl-4 select-none">
                                    Empty Section
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </div>

        {/* Center Panel: Command Context & Pins */}
        <div className="col-span-12 md:col-span-4 flex flex-col gap-2 min-h-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 flex-1 flex flex-col overflow-hidden transition-colors shadow-sm min-h-0">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 border-b border-slate-200 dark:border-slate-800 transition-colors shrink-0 select-none">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active command metadata</span>
            </div>
            
            <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/40 font-mono text-[10px] text-slate-655 dark:text-slate-400 space-y-1 transition-colors shrink-0 max-h-36 overflow-y-auto">
              {registry.map(c => {
                const isActive = activeRow?.command.startsWith(c.Cmd);
                return (
                  <div key={c.Cmd} className={`flex gap-2 px-2 py-1 rounded-md transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-900/40'}`}>
                    <span className="w-10 shrink-0 font-bold">{c.Cmd}</span>
                    <span className="truncate flex-1">{c.Cmd}: ({c.x} args) {"->"} {c.z} rets</span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#0a0f18]/30 rounded-xl m-2.5 flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-inner">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-1.5 select-none uppercase tracking-wider">Description Documentation</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-350 font-mono whitespace-pre-wrap leading-relaxed">
                {getActiveDesc()}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 h-28 flex flex-col overflow-hidden transition-colors shrink-0 shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 border-b border-slate-200 dark:border-slate-800 transition-colors shrink-0 select-none">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Utilised Peripheral hardware pins</span>
            </div>
            <div className="p-2.5 flex flex-wrap gap-1.5 overflow-y-auto content-start flex-1 bg-slate-50 dark:bg-[#0a0f18]/10">
              {usedPins.map(pin => (
                <span 
                  key={pin} 
                  className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-300 text-[9px] font-semibold px-2 py-1 rounded-md flex items-center gap-1.5 transition-colors shadow-sm select-none"
                >
                  <Cpu size={11} className="text-slate-400 dark:text-slate-500" />
                  {pin}
                </span>
              ))}
              {usedPins.length === 0 && (
                <span className="text-slate-400 dark:text-slate-500 text-[10px] italic py-2 px-1 select-none">
                  No peripheral pin macros mapped in the canvas.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Hex View */}
        <div className="col-span-12 md:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors shadow-sm min-h-0">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 border-b border-slate-200 dark:border-slate-800 transition-colors shrink-0 select-none">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hex payload preview generator</span>
          </div>
          <div className="p-3 overflow-y-auto font-mono text-[10px] text-slate-655 dark:text-slate-400 bg-slate-50 dark:bg-[#0a0f18]/30 flex-1 transition-colors shadow-inner flex flex-col min-h-0 select-text">
             <div className="flex gap-2 mb-2 text-blue-600 dark:text-blue-400 font-bold border-b border-slate-200 dark:border-slate-800 pb-1 text-[9px] tracking-wider select-none">
                <div className="w-14">OFFSET</div>
                <div className="flex-1 flex justify-between">0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F</div>
                <div className="w-16 text-right">ASCII</div>
             </div>
             
             <div className="space-y-1 overflow-y-auto flex-1">
               {hexLines.map((line, idx) => (
                 <div key={idx} className="flex gap-2 hover:bg-slate-100 dark:hover:bg-slate-900/50 py-0.5 rounded-md px-1 transition-colors">
                   <div className="w-14 text-slate-450 dark:text-slate-500 select-none">{line.offset}</div>
                   <div className="flex-1 flex justify-between text-slate-800 dark:text-slate-350 tracking-wider">
                     {line.bytes}
                   </div>
                   <div className="w-16 text-right text-slate-450 dark:text-slate-500 tracking-wider">
                     {line.ascii}
                   </div>
                 </div>
               ))}
             </div>
             
             <div className="mt-3 bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shrink-0 select-none">
               <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Payload metadata</div>
               <div className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold flex justify-between font-sans">
                 <span>Active Row Payload Size:</span>
                 <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">48 Bytes (Compiled packet)</span>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
