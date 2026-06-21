'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, RowItem } from '../context/AppContext';
import { Cpu } from 'lucide-react';
import { compileBytecode, generateHexDump } from '../../../hexconverter';

export default function ProcessView() {
  const router = useRouter();
  const { nodes, registry, activeRow, setActiveRow, getCompiledHex, usbConnected, activeProjectId, pinMacros, cmdDetails, setPendingEditRowId, setEditFromProcess } = useApp();

  useEffect(() => {
    if (!usbConnected) {
      router.replace('/');
    } else if (!activeProjectId) {
      router.replace('/proj-build');
    }
  }, [usbConnected, activeProjectId, router]);

  const cmdContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRow && cmdContainerRef.current) {
      const activeEl = cmdContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [activeRow]);

  const handleRowDoubleClick = (row: RowItem) => {
    setPendingEditRowId(row.id);
    setEditFromProcess(true);
    router.push('/proj-build');
  };

  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [startAddress, setStartAddress] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('esp32_start_address') || '';
    }
    return '';
  });
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [generatedJson, setGeneratedJson] = useState<string>('');
  const [modalMode, setModalMode] = useState<'json' | 'hex'>('json');
  const [hexDumpText, setHexDumpText] = useState<string>('');
  const [selectedHexSource, setSelectedHexSource] = useState<'activeRow' | 'myProg' | 'myString'>('activeRow');
  const [compiledProjectResult, setCompiledProjectResult] = useState<{ prog: Uint8Array; str: Uint8Array; startAddr: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('esp32_start_address', startAddress);
    }
  }, [startAddress]);

  // Reset selected source when activeProjectId changes
  useEffect(() => {
    setSelectedHexSource('activeRow');
  }, [activeProjectId]);

  // Auto-compile bytecode reactively whenever nodes, startAddress, or registry definitions change
  useEffect(() => {
    let startAddressDec = 0;
    if (startAddress.toLowerCase().startsWith('0x')) {
      startAddressDec = parseInt(startAddress.slice(2), 16);
    } else {
      startAddressDec = parseInt(startAddress, 10);
    }
    if (isNaN(startAddressDec)) {
      startAddressDec = 0;
    }

    const storedPins = localStorage.getItem('Pin Register');
    let pinReg: any[] = [];
    if (storedPins) {
      try {
        pinReg = JSON.parse(storedPins);
      } catch (e) {
        console.error(e);
      }
    }

    let cmdReg: any[] = [];
    const storedCmds = localStorage.getItem('Cmd Register');
    if (storedCmds) {
      try {
        const parsed = JSON.parse(storedCmds);
        if (Array.isArray(parsed)) {
          cmdReg = parsed.map((cmd: any) => ({
            index: cmd.index,
            Cmd: cmd.Cmd,
            args: cmd.args || [],
            ints: cmd.ints || [],
            rets: cmd.rets || []
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (cmdReg.length === 0 && cmdDetails) {
      cmdReg = Object.values(cmdDetails).map((cmd: any) => ({
        index: cmd.index,
        Cmd: cmd.Cmd,
        args: cmd.args || [],
        ints: cmd.ints || [],
        rets: cmd.rets || []
      }));
    }

    try {
      const resultTabs = [];
      let addressTracker = startAddressDec;
      
      const tabs = Object.values(nodes).filter(n => n.type === 'tab');
      let tabIdx = 1;
      for (const tab of tabs) {
        const resultSections = [];
        const sections = Object.values(nodes).filter(n => n.parentId === tab.id && n.type === 'section');
        let secIdx = 1;
        for (const sec of sections) {
          const resultRows = [];
          if (sec.rows) {
            let rowIdx = 1;
            for (const row of sec.rows) {
              resultRows.push({
                id: rowIdx,
                label: row.label || '',
                command: row.command,
                composeRowView: getComposedRowString(row)
              });
              rowIdx++;
              addressTracker += 48;
            }
          }
          resultSections.push({
            id: `sec_${secIdx}`,
            name: sec.name,
            exec: sec.exec,
            rows: resultRows
          });
          secIdx++;
        }
        resultTabs.push({
          id: `tab_${tabIdx}`,
          name: tab.name,
          sections: resultSections
        });
        tabIdx++;
      }

      const testJsonPayload = {
        startAddress: startAddress,
        startAddressDec: startAddressDec,
        tabs: resultTabs
      };

      const result = compileBytecode(testJsonPayload, cmdReg, pinReg, startAddressDec);
      setCompiledProjectResult({
        prog: result.prog,
        str: result.str,
        startAddr: startAddressDec
      });
    } catch (err) {
      console.warn("Auto-compile failed:", err);
    }
  }, [nodes, startAddress, cmdDetails, pinMacros, activeProjectId]);

  const getComposedRowString = (row: RowItem): string => {
    const match = row.command.match(/^([A-Z0-9_]+)\[(.*)\]$/);
    const cmdName = match ? match[1] : (row.command.split('[')[0] || 'CMD');
    const argsStr = match ? match[2] : '';
    const rowArgs = argsStr.split(',').map(s => s.trim());

    const details = cmdDetails[cmdName.toUpperCase()] || registry.find(r => r.Cmd === cmdName.toUpperCase());
    const prefix = row.label ? `${row.label} : ` : '';

    if (!details) {
      return `${prefix}${row.command}`;
    }

    const x = details.x ?? 0;
    const y = details.y ?? 0;
    const z = details.z ?? 0;

    const retTypes = (details.rets || Array.from({ length: z }, (_, i) => ({ type: 'int8', name: `ret_${i}` }))) as any[];
    let formattedRets = '';
    if (z > 0) {
      formattedRets = ' : ' + retTypes.map((r: any) => r.type).join(', ');
    }

    const argTypes = details.args || Array.from({ length: x }, (_, i) => ({ type: 'int8', name: `arg_${i}` }));
    const formattedArgsParts = [];
    for (let i = 0; i < x; i++) {
      const type = argTypes[i]?.type || 'int8';
      let val = rowArgs[i] !== undefined && rowArgs[i] !== '' ? rowArgs[i] : '';
      if (val) {
        if (type === 'str') {
          if (!val.startsWith('"') || !val.endsWith('"')) {
            val = `"${val}"`;
          }
        } else if (type === 'char') {
          if (!val.startsWith("'") || !val.endsWith("'")) {
            val = `'${val}'`;
          }
        }
        formattedArgsParts.push(`${type} ${val}`);
      } else {
        formattedArgsParts.push(type);
      }
    }
    const formattedArgs = formattedArgsParts.join(', ');

    const intTypes = (details.ints || Array.from({ length: y }, (_, i) => ({ type: 'int8', name: `int_${i}` }))) as any[];
    let formattedInts = '';
    if (y > 0) {
      formattedInts = ' {' + intTypes.map((r: any) => r.type).join(', ') + '}';
    }

    return `${prefix}${cmdName}${formattedRets} (${formattedArgs})${formattedInts}`;
  };

  const handleTestClick = () => {
    const addr = window.prompt("Enter Start Address (e.g. 0x08000000 or 1000):", startAddress || "0x00");
    if (addr === null) return;
    const cleanAddr = addr.trim();
    setStartAddress(cleanAddr);

    let currentAddress = 0;
    if (cleanAddr.toLowerCase().startsWith('0x')) {
      currentAddress = parseInt(cleanAddr.slice(2), 16);
    } else {
      currentAddress = parseInt(cleanAddr, 10);
    }
    if (isNaN(currentAddress)) {
      currentAddress = 0;
    }

    const resultTabs = [];
    let addressTracker = currentAddress;
    
    const tabs = Object.values(nodes).filter(n => n.type === 'tab');
    let tabIdx = 1;
    for (const tab of tabs) {
      const tabAddress = addressTracker;
      const resultSections = [];
      
      const sections = Object.values(nodes).filter(n => n.parentId === tab.id && n.type === 'section');
      let secIdx = 1;
      for (const sec of sections) {
        const secAddress = addressTracker;
        const resultRows = [];
        
        if (sec.rows) {
          let rowIdx = 1;
          for (const row of sec.rows) {
            resultRows.push({
              id: rowIdx,
              label: row.label || '',
              command: row.command,
              composeRowView: getComposedRowString(row)
            });
            
            rowIdx++;
            addressTracker += 48;
          }
        }
        
        resultSections.push({
          id: `sec_${secIdx}`,
          name: sec.name,
          exec: sec.exec,
          rows: resultRows
        });
        secIdx++;
      }
      
      resultTabs.push({
        id: `tab_${tabIdx}`,
        name: tab.name,
        sections: resultSections
      });
      tabIdx++;
    }

    const outputObj = {
      startAddress: cleanAddr,
      startAddressDec: currentAddress,
      tabs: resultTabs
    };

    setGeneratedJson(JSON.stringify(outputObj, null, 2));
    setModalMode('json');
    setShowJsonModal(true);
  };

  const handleProceedToHex = () => {
    let startAddressDec = 0;
    if (startAddress.toLowerCase().startsWith('0x')) {
      startAddressDec = parseInt(startAddress.slice(2), 16);
    } else {
      startAddressDec = parseInt(startAddress, 10);
    }
    if (isNaN(startAddressDec)) {
      startAddressDec = 0;
    }

    const storedPins = localStorage.getItem('Pin Register');
    let pinReg: any[] = [];
    if (storedPins) {
      try {
        pinReg = JSON.parse(storedPins);
      } catch (e) {
        console.error(e);
      }
    }

    let cmdReg: any[] = [];
    const storedCmds = localStorage.getItem('Cmd Register');
    if (storedCmds) {
      try {
        const parsed = JSON.parse(storedCmds);
        if (Array.isArray(parsed)) {
          cmdReg = parsed.map((cmd: any) => ({
            index: cmd.index,
            Cmd: cmd.Cmd,
            args: cmd.args || [],
            ints: cmd.ints || [],
            rets: cmd.rets || []
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (cmdReg.length === 0 && cmdDetails) {
      cmdReg = Object.values(cmdDetails).map((cmd: any) => ({
        index: cmd.index,
        Cmd: cmd.Cmd,
        args: cmd.args || [],
        ints: cmd.ints || [],
        rets: cmd.rets || []
      }));
    }

    try {
      const parsedJson = JSON.parse(generatedJson);
      const result = compileBytecode(parsedJson, cmdReg, pinReg, startAddressDec);
      const progDump = generateHexDump(result.prog, startAddressDec);
      const strDump = generateHexDump(result.str, 0);
      const hexDumpStr = `--- myProg ---\n${progDump}\n\n--- myString ---\n${strDump}`;
      setHexDumpText(hexDumpStr);
      setModalMode('hex');
    } catch (err) {
      console.error(err);
      alert("Failed to parse the generated JSON or compile bytecode.");
    }
  };

  const toggleNode = (id: string) => {
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Extract utilized hardware pins dynamically from all command rows
  const getUsedPins = () => {
    const pins = new Set<string>();
    const customPins = new Set<string>(pinMacros);

    Object.values(nodes).forEach(node => {
      if (node.type === 'section' && node.rows) {
        node.rows.forEach(row => {
          const match = row.command.match(/^[A-Z0-9_]+\[(.*)\]$/);
          if (match) {
            const args = match[1].split(',').map(s => s.trim());
            args.forEach(arg => {
              if (
                arg.startsWith('BTN_') || 
                arg.startsWith('LED_') || 
                arg.startsWith('GPIO_') || 
                customPins.has(arg)
              ) {
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



  const renderComposedRow = () => {
    if (!activeRow) return 'Select a command row from hierarchy...';

    // Parse command
    const match = activeRow.command.match(/^([A-Z0-9_]+)\[(.*)\]$/);
    const cmdName = match ? match[1] : (activeRow.command.split('[')[0] || 'CMD');
    const argsStr = match ? match[2] : '';
    const rowArgs = argsStr.split(',').map(s => s.trim());

    // Look up command details
    const details = cmdDetails[cmdName.toUpperCase()] || registry.find(r => r.Cmd === cmdName.toUpperCase());

    if (!details) {
      // Fallback if prototype is not found
      return (
        <span className="font-mono text-xs">
          {activeRow.label ? (
            <span className="text-orange-500 dark:text-orange-400 font-bold">
              {activeRow.label} :{' '}
            </span>
          ) : ''}
          {activeRow.command}
        </span>
      );
    }

    const x = details.x ?? 0;
    const y = details.y ?? 0;
    const z = details.z ?? 0;

    // Get argument inputs
    const argTypes = details.args || Array.from({ length: x }, (_, i) => ({ type: 'int8', name: `arg_${i}` }));
    const formattedArgs: React.ReactNode[] = [];
    for (let i = 0; i < x; i++) {
      const type = argTypes[i]?.type || 'int8';
      let val = rowArgs[i] !== undefined && rowArgs[i] !== '' ? rowArgs[i] : '';
      if (val) {
        if (type === 'str') {
          if (!val.startsWith('"') || !val.endsWith('"')) {
            val = `"${val}"`;
          }
        } else if (type === 'char') {
          if (!val.startsWith("'") || !val.endsWith("'")) {
            val = `'${val}'`;
          }
        }
      }
      formattedArgs.push(
        <span key={i}>
          {i > 0 && ', '}
          <span className="text-blue-500 dark:text-blue-400 font-bold italic">{type}</span>
          {val && ` ${val}`}
        </span>
      );
    }

    // Get internal variable types
    const intTypes = details.ints || Array.from({ length: y }, (_, i) => ({ type: 'int8', name: `int_${i}` }));
    const formattedInts: React.ReactNode[] = [];
    for (let i = 0; i < y; i++) {
      const type = intTypes[i]?.type || 'int8';
      formattedInts.push(
        <span key={i} className="text-emerald-500 dark:text-emerald-400 font-bold italic">
          {i > 0 && ', '}
          {type}
        </span>
      );
    }

    // Get return value types
    const retTypes = details.rets || Array.from({ length: z }, (_, i) => ({ type: 'int8', name: `ret_${i}` }));
    const formattedRets: React.ReactNode[] = [];
    for (let i = 0; i < z; i++) {
      const type = retTypes[i]?.type || 'int8';
      formattedRets.push(
        <span key={i} className="text-red-500 font-bold italic">
          {i > 0 && ', '}
          {type}
        </span>
      );
    }

    return (
      <span className="font-mono text-xs select-text">
        {activeRow.label && (
          <span className="text-orange-500 dark:text-orange-400 font-bold">
            {activeRow.label} :{' '}
          </span>
        )}
        <span className="text-emerald-600 dark:text-emerald-450 font-bold">{cmdName}</span>
        {formattedRets.length > 0 && (
          <>
            <span className="text-slate-500 dark:text-slate-400 font-bold"> : </span>
            {formattedRets}
          </>
        )}
        <span className="text-slate-500 dark:text-slate-400"> (</span>
        {formattedArgs}
        <span className="text-slate-500 dark:text-slate-400">)</span>
        {formattedInts.length > 0 && (
          <>
            <span className="text-slate-500 dark:text-slate-400">{" {"}</span>
            {formattedInts}
            <span className="text-slate-500 dark:text-slate-400">{"}"}</span>
          </>
        )}
      </span>
    );
  };

  const activeRowHexLines = getCompiledHex(activeRow);

  const getDisplayedHexLines = () => {
    if (selectedHexSource === 'activeRow' || !compiledProjectResult) {
      return activeRowHexLines;
    }
    const helper = (data: Uint8Array, startAddr: number) => {
      if (!data || data.length === 0) return [];
      const lines = [];
      const BYTES_PER_LINE = 16;
      let currentAddress = startAddr;
      for (let i = 0; i < data.length; i += BYTES_PER_LINE) {
        const chunk = data.slice(i, i + BYTES_PER_LINE);
        const offset = currentAddress.toString(16).padStart(8, '0').toUpperCase();
        const hexParts = Array.from(chunk).map(byte => byte.toString(16).padStart(2, '0').toUpperCase());
        const bytes = hexParts.join(' ').padEnd(BYTES_PER_LINE * 3 - 1, ' ');
        const ascii = Array.from(chunk).map(byte => (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.').join('');
        lines.push({ offset, bytes, ascii });
        currentAddress += BYTES_PER_LINE;
      }
      return lines;
    };

    if (selectedHexSource === 'myProg') {
      return helper(compiledProjectResult.prog, compiledProjectResult.startAddr);
    } else {
      return helper(compiledProjectResult.str, 0);
    }
  };

  const displayedHexLines = getDisplayedHexLines();

  const getPayloadMetadata = () => {
    if (selectedHexSource === 'activeRow' || !compiledProjectResult) {
      return {
        label: 'Active Row Payload Size:',
        value: '48 Bytes (Compiled packet)'
      };
    }
    if (selectedHexSource === 'myProg') {
      return {
        label: 'Project Bytecode Size:',
        value: `${compiledProjectResult.prog.length} Bytes`
      };
    }
    return {
      label: 'String Pool Size:',
      value: `${compiledProjectResult.str.length} Bytes`
    };
  };

  const metadata = getPayloadMetadata();

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0f172a] p-2 gap-2 overflow-hidden transition-colors duration-200 min-h-0">
      
      {/* Top Composer Bar */}
      <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 font-mono text-xs text-green-600 dark:text-emerald-450 flex items-center gap-2 transition-colors shrink-0 shadow-sm select-none">
        <span className="text-slate-500 dark:text-slate-400 text-[0.625rem] uppercase tracking-widest font-sans font-bold">Composed Row View:</span>
        <span className="font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
          {renderComposedRow()}
        </span>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        
        {/* Left Panel: Tree View */}
        <div className="col-span-12 md:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors shadow-sm min-h-0">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors shrink-0 select-none">
            <span className="text-[0.5625rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pr-1 truncate">
              Project execution logic tree
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[0.5625rem] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 font-mono">
                Start Address:
                <span className="text-amber-600 dark:text-amber-500 bg-slate-100 dark:bg-[#121824] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                  {startAddress || '0x00'}
                </span>
              </span>
              <button
                onClick={handleTestClick}
                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-md border border-slate-250 dark:border-slate-700/80 text-[0.5625rem] font-bold tracking-wider uppercase transition-colors shadow-sm cursor-pointer"
              >
                Test
              </button>
            </div>
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
                              <span>SEC: {sec.name} <span className="text-slate-450 dark:text-slate-500 text-[0.5625rem] font-normal font-sans">({sec.exec === '0' ? 'Immediate' : sec.exec === 'Once' ? 'Once' : `Delay: ${sec.exec}ms`})</span></span>
                            </div>
                            
                            {!isSecCollapsed && (
                              <div className="pl-3 border-l border-slate-100 dark:border-slate-800 ml-1.5 space-y-0.5">
                                {sec.rows && sec.rows.map((row, idx) => (
                                  <div 
                                    key={row.id} 
                                    onClick={() => setActiveRow(row)}
                                    onDoubleClick={() => handleRowDoubleClick(row)}
                                    className={`pl-2 py-1.5 cursor-pointer flex items-center gap-2 rounded-lg transition-all ${
                                      activeRow?.id === row.id 
                                        ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-slate-800 dark:text-slate-100 font-bold' 
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    <span className="text-slate-350 dark:text-slate-600 w-4 font-mono text-right shrink-0 select-none text-[0.625rem]">{idx + 1}</span>
                                    <span className="w-16 text-blue-600 dark:text-blue-400 font-bold truncate shrink-0" title={row.label}>{row.label || ''}</span>
                                    <span className="flex-1 font-mono text-[0.5625rem] leading-tight flex flex-wrap break-all truncate">{row.command}</span>
                                  </div>
                                ))}
                                {(!sec.rows || sec.rows.length === 0) && (
                                  <div className="text-[0.625rem] text-slate-400 dark:text-slate-500 italic py-1 pl-4 select-none">
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
              <span className="text-[0.625rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active command metadata</span>
            </div>
            
            <div 
              ref={cmdContainerRef}
              className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/40 font-mono text-[0.625rem] text-slate-600 dark:text-slate-400 space-y-1 transition-colors shrink-0 max-h-36 overflow-y-auto"
            >
              {registry.map(c => {
                const isActive = activeRow?.command.startsWith(c.Cmd);
                return (
                  <div 
                    key={c.Cmd} 
                    data-active={isActive ? "true" : "false"}
                    className={`flex gap-2 px-2 py-1 rounded-md transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-900/40'}`}
                  >
                    <span className="w-10 shrink-0 font-bold">{c.Cmd}</span>
                    <span className="truncate flex-1">{c.Cmd}: ({c.x} args) {"->"} {c.z} rets</span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#0a0f18]/30 rounded-xl m-2.5 flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-inner">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-1.5 select-none uppercase tracking-wider">Description Documentation</h4>
              <p className="text-[0.6875rem] text-slate-600 dark:text-slate-350 font-mono whitespace-pre-wrap leading-relaxed">
                {getActiveDesc()}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 h-28 flex flex-col overflow-hidden transition-colors shrink-0 shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 border-b border-slate-200 dark:border-slate-800 transition-colors shrink-0 select-none">
              <span className="text-[0.625rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Utilised Peripheral hardware pins</span>
            </div>
            <div className="p-2.5 flex flex-wrap gap-1.5 overflow-y-auto content-start flex-1 bg-slate-50 dark:bg-[#0a0f18]/10">
              {usedPins.map(pin => (
                <span 
                  key={pin} 
                  className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-300 text-[0.5625rem] font-semibold px-2 py-1 rounded-md flex items-center gap-1.5 transition-colors shadow-sm select-none"
                >
                  <Cpu size={11} className="text-slate-400 dark:text-slate-500" />
                  {pin}
                </span>
              ))}
              {usedPins.length === 0 && (
                <span className="text-slate-400 dark:text-slate-500 text-[0.625rem] italic py-2 px-1 select-none">
                  No peripheral pin macros mapped in the canvas.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Hex View */}
        <div className="col-span-12 md:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors shadow-sm min-h-0">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 border-b border-slate-200 dark:border-slate-800 transition-colors shrink-0 flex flex-col gap-1.5 select-none">
            <span className="text-[0.625rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hex payload preview generator</span>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg text-[0.5625rem] font-bold select-none border border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setSelectedHexSource('activeRow')}
                className={`flex-1 py-1 rounded transition-colors ${selectedHexSource === 'activeRow' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Active Row
              </button>
              <button 
                onClick={() => setSelectedHexSource('myProg')}
                className={`flex-1 py-1 rounded transition-colors ${selectedHexSource === 'myProg' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'} ${!compiledProjectResult ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!compiledProjectResult}
              >
                myProg
              </button>
              <button 
                onClick={() => setSelectedHexSource('myString')}
                className={`flex-1 py-1 rounded transition-colors ${selectedHexSource === 'myString' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'} ${!compiledProjectResult ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!compiledProjectResult}
              >
                myString
              </button>
            </div>
          </div>
          <div className="p-3 overflow-y-auto font-mono text-[0.625rem] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#0a0f18]/30 flex-1 transition-colors shadow-inner flex flex-col min-h-0 select-text">
             <div className="flex gap-2 mb-2 text-blue-600 dark:text-blue-400 font-bold border-b border-slate-200 dark:border-slate-800 pb-1 text-[0.5625rem] tracking-wider select-none">
                <div className="w-14">OFFSET</div>
                <div className="flex-1 flex justify-between">0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F</div>
                <div className="w-16 text-right">ASCII</div>
             </div>
             
             <div className="space-y-1 overflow-y-auto flex-1">
                {displayedHexLines.map((line, idx) => (
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
                {displayedHexLines.length === 0 && (
                  <div className="text-[0.625rem] text-slate-400 dark:text-slate-500 italic py-4 text-center select-none">
                    No data to display.
                  </div>
                )}
             </div>
             
             <div className="mt-3 bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shrink-0 select-none">
                <div className="text-[0.5625rem] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Payload metadata</div>
                <div className="text-[0.625rem] text-slate-600 dark:text-slate-300 font-semibold flex justify-between font-sans">
                  <span>{metadata.label}</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{metadata.value}</span>
                </div>
             </div>
          </div>
        </div>

      </div>

      {/* Generated JSON / Hex Dump Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 h-[80vh]">
            <div className="py-3.5 px-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#070b11] flex justify-between items-center shrink-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {modalMode === 'json' ? 'Generated Execution JSON' : 'Generated Hex Dump'}
              </h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(modalMode === 'json' ? generatedJson : hexDumpText);
                  alert("Copied to clipboard!");
                }}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {modalMode === 'json' ? 'Copy JSON' : 'Copy Hex Dump'}
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto min-h-0 bg-slate-50 dark:bg-[#0a0f18] text-slate-800 dark:text-slate-200">
              <pre className="text-left font-mono text-[0.625rem] leading-relaxed whitespace-pre-wrap select-all bg-white dark:bg-[#121824] p-4 border border-slate-200 dark:border-slate-800 rounded-xl h-full overflow-y-auto">
                {modalMode === 'json' ? generatedJson : hexDumpText}
              </pre>
            </div>

            <div className="py-3 px-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#070b11] flex justify-end gap-2 shrink-0">
              {modalMode === 'json' ? (
                <>
                  <button
                    onClick={handleProceedToHex}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Proceed
                  </button>
                  <button
                    onClick={() => setShowJsonModal(false)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer hover:opacity-95"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setModalMode('json')}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-250 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setShowJsonModal(false)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer hover:opacity-95"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
