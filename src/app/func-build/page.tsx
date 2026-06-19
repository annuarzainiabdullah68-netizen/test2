'use client';

import React, { useState } from 'react';
import { useApp, RegistryEntry } from '../context/AppContext';

interface VariableConfig {
  type: string;
  name: string;
}

const DATA_TYPES_LIST = ['int8', 'int16', 'int32', 'int64', 'uint8', 'uint16', 'uint32', 'uint64', 'float', 'double', 'char', 'str', '*'];

export default function FuncBuild() {
  const { registry, setRegistry } = useApp();

  // Lazy initialize select state based on current registry
  const [selectedCmd, setSelectedCmd] = useState<string>(() => 
    registry.length > 0 ? registry[0].Cmd : ''
  );

  const [cmdName, setCmdName] = useState<string>(() => 
    registry.length > 0 ? registry[0].Cmd : ''
  );

  const [cmdDesc, setCmdDesc] = useState<string>(() => 
    registry.length > 0 ? registry[0].desc : ''
  );
  
  const [args, setArgs] = useState<VariableConfig[]>(() => {
    if (registry.length > 0) {
      const initial = registry[0];
      if (initial.Cmd === 'PT0') {
        return [
          { type: 'int8', name: 'pinOutput' },
          { type: 'int16', name: 'markDelay' },
          { type: 'int16', name: 'spaceDelay' }
        ];
      }
      return Array.from({ length: initial.x }, (_, i) => ({ type: 'int8', name: `arg_${i}` }));
    }
    return [];
  });

  const [ints, setInts] = useState<VariableConfig[]>(() => {
    if (registry.length > 0) {
      const initial = registry[0];
      if (initial.Cmd === 'PT0') {
        return [
          { type: 'int8', name: 'state' },
          { type: 'uint32', name: 'delay' }
        ];
      }
      return Array.from({ length: initial.y }, (_, i) => ({ type: 'int8', name: `int_${i}` }));
    }
    return [];
  });

  const [rets, setRets] = useState<VariableConfig[]>(() => {
    if (registry.length > 0) {
      const initial = registry[0];
      return Array.from({ length: initial.z }, (_, i) => ({ type: 'int8', name: `ret_${i}` }));
    }
    return [];
  });

  const [activePane, setActivePane] = useState<'args' | 'ints' | 'rets'>('args'); 
  const [showNewCmdModal, setShowNewCmdModal] = useState<boolean>(false);
  const [newCmdInput, setNewCmdInput] = useState<string>('');

  const panes = {
    'args': { title: 'ARGUMENTS (ARGS)', data: args, setData: setArgs },
    'ints': { title: 'INTERNAL VARIABLES (INTS)', data: ints, setData: setInts },
    'rets': { title: 'RETURN VALUES (RETS)', data: rets, setData: setRets }
  };

  const handleCmdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'NEW') {
      setShowNewCmdModal(true);
    } else {
      setSelectedCmd(val);
      setCmdName(val);
      const found = registry.find(r => r.Cmd === val);
      if (found) {
        setCmdDesc(found.desc);
        if (found.Cmd === 'PT0') {
          setArgs([{type: 'int8', name: 'pinOutput'}, {type: 'int16', name: 'markDelay'}, {type: 'int16', name: 'spaceDelay'}]);
          setInts([{type: 'int8', name: 'state'}, {type: 'uint32', name: 'delay'}]);
          setRets([]);
        } else if (found.Cmd === 'GP0') {
          setArgs([{type: 'int8', name: 'pinInput'}, {type: 'int16', name: 'debounce'}]);
          setInts([{type: 'int8', name: 'lastState'}, {type: 'uint32', name: 'timer'}]);
          setRets([{type: 'int8', name: 'val'}]);
        } else {
          setArgs(Array.from({length: found.x}, (_, i) => ({type: 'int8', name: `arg_${i}`})));
          setInts(Array.from({length: found.y}, (_, i) => ({type: 'int8', name: `int_${i}`})));
          setRets(Array.from({length: found.z}, (_, i) => ({type: 'int8', name: `ret_${i}`})));
        }
      }
    }
  };

  const createNewCommand = () => {
    if (!newCmdInput.trim()) return;
    const newCmdName = newCmdInput.trim().toUpperCase();
    if (registry.some(r => r.Cmd === newCmdName)) {
      alert("Command already exists!");
      return;
    }
    const newCmd: RegistryEntry = { Cmd: newCmdName, x: 0, y: 0, z: 0, desc: `Description for ${newCmdName}` };
    setRegistry([...registry, newCmd]);
    setSelectedCmd(newCmdName);
    setCmdName(newCmdName);
    setCmdDesc(newCmd.desc);
    setArgs([]);
    setInts([]);
    setRets([]);
    setShowNewCmdModal(false);
    setNewCmdInput('');
  };

  const handleLengthChange = (type: 'args' | 'ints' | 'rets', val: string) => {
    let len = parseInt(val, 10) || 0;
    if (len > 5) len = 5; // Hard cap at maximum 5 elements
    if (len < 0) len = 0;
    
    const current = panes[type].data;
    const setter = panes[type].setData;

    if (len > current.length) {
      const added = Array.from({length: len - current.length}, (_, i) => ({
        type: 'int8', 
        name: `${type.slice(0, -1)}_${current.length + i}`
      }));
      setter([...current, ...added]);
    } else if (len < current.length) {
      setter(current.slice(0, len));
    }
  };

  const handleItemChange = (type: 'args' | 'ints' | 'rets', idx: number, field: 'type' | 'name', val: string) => {
    const current = [...panes[type].data];
    current[idx] = { ...current[idx], [field]: val };
    panes[type].setData(current);
  };

  const handleSave = () => {
    if (!cmdName.trim()) {
      alert("Command name cannot be empty.");
      return;
    }
    setRegistry(prev => prev.map(item => {
      if (item.Cmd === selectedCmd) {
        return {
          Cmd: cmdName.toUpperCase(),
          desc: cmdDesc,
          x: args.length,
          y: ints.length,
          z: rets.length
        };
      }
      return item;
    }));
    setSelectedCmd(cmdName.toUpperCase());
    alert(`Command prototype '${cmdName.toUpperCase()}' saved successfully!`);
  };

  const handleDelete = () => {
    if (registry.length <= 1) {
      alert("Cannot delete the only command prototype in the registry.");
      return;
    }
    const confirmDelete = window.confirm(`Are you sure you want to delete the command '${selectedCmd}'?`);
    if (!confirmDelete) return;

    const nextRegistry = registry.filter(r => r.Cmd !== selectedCmd);
    setRegistry(nextRegistry);

    // Pick a new selected item
    const nextSelected = nextRegistry[0];
    setSelectedCmd(nextSelected.Cmd);
    setCmdName(nextSelected.Cmd);
    setCmdDesc(nextSelected.desc);
    setArgs(Array.from({length: nextSelected.x}, (_, i) => ({type: 'int8', name: `arg_${i}`})));
    setInts(Array.from({length: nextSelected.y}, (_, i) => ({type: 'int8', name: `int_${i}`})));
    setRets(Array.from({length: nextSelected.z}, (_, i) => ({type: 'int8', name: `ret_${i}`})));
  };

  const handleExportRegistry = () => {
    const dataStr = JSON.stringify(registry, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'esp32_registry.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportRegistry = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target?.result as string);
          if (
            Array.isArray(imported) &&
            imported.every(
              (item) =>
                typeof item.Cmd === 'string' &&
                typeof item.x === 'number' &&
                typeof item.y === 'number' &&
                typeof item.z === 'number'
            )
          ) {
            setRegistry(imported);
            alert("Command registry imported successfully!");
            if (imported.length > 0) {
              const first = imported[0];
              setSelectedCmd(first.Cmd);
              setCmdName(first.Cmd);
              setCmdDesc(first.desc || '');
              if (first.Cmd === 'PT0') {
                setArgs([{type: 'int8', name: 'pinOutput'}, {type: 'int16', name: 'markDelay'}, {type: 'int16', name: 'spaceDelay'}]);
                setInts([{type: 'int8', name: 'state'}, {type: 'uint32', name: 'delay'}]);
                setRets([]);
              } else if (first.Cmd === 'GP0') {
                setArgs([{type: 'int8', name: 'pinInput'}, {type: 'int16', name: 'debounce'}]);
                setInts([{type: 'int8', name: 'lastState'}, {type: 'uint32', name: 'timer'}]);
                setRets([{type: 'int8', name: 'val'}]);
              } else {
                setArgs(Array.from({length: first.x}, (_, i) => ({type: 'int8', name: `arg_${i}`})));
                setInts(Array.from({length: first.y}, (_, i) => ({type: 'int8', name: `int_${i}`})));
                setRets(Array.from({length: first.z}, (_, i) => ({type: 'int8', name: `ret_${i}`})));
              }
            }
          } else {
            alert("Invalid registry format. Must be a JSON array of command definitions.");
          }
        } catch (err) {
          alert("Error parsing JSON file: " + err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-5xl mx-auto w-full transition-colors duration-205 min-h-0">
      <div className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col flex-1 gap-4 min-h-0">
        
        {/* Top: Command Select & Description */}
        <div className="flex flex-col sm:flex-row gap-4 shrink-0">
          <div className="sm:w-1/3">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider select-none">Command Type</label>
            <select 
              value={selectedCmd} 
              onChange={handleCmdChange}
              className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 transition-colors text-sm font-semibold shadow-sm"
            >
              {registry.map(c => <option key={c.Cmd} value={c.Cmd}>{c.Cmd}</option>)}
              <option disabled>──────────</option>
              <option value="NEW" className="font-bold text-blue-600 dark:text-blue-400">+ Create New Command...</option>
            </select>
          </div>
          <div className="sm:w-2/3">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider select-none">Description & Help Metadata</label>
            <textarea 
              rows={3}
              value={cmdDesc}
              onChange={(e) => setCmdDesc(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 resize-none transition-colors leading-relaxed text-[13px] font-medium shadow-sm"
              placeholder="Provide a detailed description of the command behaviour, expected parameters, and peripheral mapping."
            />
          </div>
        </div>

        {/* Middle: Counts & Variable Lists */}
        <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
          
          {/* Counters Box */}
          <div className="bg-slate-50 dark:bg-[#0a0f18]/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800/80 md:w-48 flex flex-col gap-3 transition-colors shadow-inner self-start w-full">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">Counts</span>
            {(['args', 'ints', 'rets'] as const).map((type) => {
              const isActive = activePane === type;
              const labels = { args: 'Args#', ints: 'Ints#', rets: 'Rets#' };
              return (
                <div 
                  key={type}
                  onClick={() => setActivePane(type)}
                  className={`flex items-center justify-between relative rounded-lg cursor-pointer transition-all p-2 select-none border ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 font-semibold' 
                      : 'bg-white dark:bg-[#0a0f18] border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <label className={`text-xs cursor-pointer transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>{labels[type]}</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="5" 
                    value={panes[type].data.length} 
                    onChange={(e) => handleLengthChange(type, e.target.value)} 
                    onClick={(e) => e.stopPropagation()}
                    className="w-12 bg-white dark:bg-[#121824] border border-slate-300 dark:border-slate-800 text-center text-slate-800 dark:text-slate-200 rounded p-1 text-xs transition-colors focus:border-blue-500 outline-none shadow-sm font-bold" 
                  />
                  {isActive && <div className="absolute right-0.5 top-1/2 -translate-y-1/2 text-yellow-500 text-[10px] pointer-events-none drop-shadow-md">♦</div>}
                </div>
              );
            })}
          </div>

          {/* Variables List Pane */}
          <div className="flex-1 bg-slate-50 dark:bg-[#0a0f18]/30 rounded-xl p-3 border border-slate-200 dark:border-slate-800/80 transition-colors shadow-inner flex flex-col min-h-0">
             <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 font-bold uppercase tracking-wider select-none">{panes[activePane].title}</div>
             <div className="space-y-2 overflow-y-auto flex-1 pr-1">
               {panes[activePane].data.map((item, idx) => (
                 <div key={idx} className="flex gap-2 items-center bg-white dark:bg-[#121824] p-2 rounded-lg border border-slate-200 dark:border-slate-800/60 shadow-sm">
                   <span className="text-slate-400 dark:text-slate-500 text-[10px] font-mono select-none w-6 text-right">#{idx + 1}</span>
                   <select 
                     value={item.type} 
                     onChange={(e) => handleItemChange(activePane, idx, 'type', e.target.value)} 
                     className="bg-slate-50 dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-md p-1.5 text-xs w-1/3 transition-colors outline-none focus:border-blue-500 font-mono font-medium"
                   >
                     {DATA_TYPES_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                   <input 
                     type="text" 
                     value={item.name} 
                     onChange={(e) => handleItemChange(activePane, idx, 'name', e.target.value)} 
                     placeholder={`var_${idx}`} 
                     className="bg-slate-50 dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-md p-1.5 text-xs flex-1 transition-colors outline-none focus:border-blue-500 font-medium" 
                   />
                 </div>
               ))}
               {panes[activePane].data.length === 0 && (
                 <div className="text-xs text-slate-400 dark:text-slate-500 italic py-4 text-center select-none bg-white dark:bg-[#121824] border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                   No variables configured. Increase the counter on the left to add items.
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Prototype preview */}
        <div className="bg-slate-100 dark:bg-[#0a0f18] p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 font-mono text-xs text-emerald-600 dark:text-emerald-400 transition-colors shadow-inner shrink-0 flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-550 font-semibold select-none">C++ Prototype:</span> 
          <span className="font-bold tracking-tight">
            {cmdName || 'CMD'}: {rets.length > 0 ? rets.map(r => r.type).join(', ') + ' ' : ''}({args.map(a => a.type).join(', ')}){ints.length > 0 ? ' {' + ints.map(i => i.type).join(', ') + '}' : ''}
          </span>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-200 dark:border-slate-800/80 pt-3 shrink-0">
          <button 
            onClick={() => setShowNewCmdModal(true)} 
            className="bg-yellow-100 dark:bg-yellow-600/10 text-yellow-800 dark:text-yellow-500 border border-yellow-300 dark:border-yellow-600/40 hover:bg-yellow-500 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Create New Command
          </button>
          <button 
            onClick={handleDelete}
            className="bg-slate-50 dark:bg-[#1c2434] text-red-600 dark:text-red-400 border border-slate-300 dark:border-slate-800 hover:bg-red-50 hover:border-red-300 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Delete Command
          </button>
          <button 
            onClick={handleImportRegistry}
            className="bg-slate-50 dark:bg-[#1c2434] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 hover:border-slate-400 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Import
          </button>
          <button 
            onClick={handleExportRegistry}
            className="bg-slate-50 dark:bg-[#1c2434] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 hover:border-slate-400 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Export
          </button>
          <div className="flex-1"></div>
          <button 
            onClick={handleSave}
            className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-slate-900 px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-emerald-500/20 cursor-pointer"
          >
            Save Prototype
          </button>
        </div>
      </div>

      {/* NEW COMMAND MODAL */}
      {showNewCmdModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="py-2.5 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30">
              <h2 className="text-sm font-bold text-slate-850 dark:text-slate-100">Create New Command</h2>
            </div>
            <div className="p-4">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider select-none">Command Name</label>
              <input 
                type="text" 
                value={newCmdInput}
                onChange={(e) => setNewCmdInput(e.target.value)}
                placeholder="e.g. GET_ADC"
                className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg p-2 text-sm focus:border-blue-500 outline-none font-bold uppercase shadow-sm"
                autoFocus
              />
            </div>
            <div className="py-2.5 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30 flex justify-end gap-2 shrink-0">
              <button 
                onClick={() => { setShowNewCmdModal(false); setNewCmdInput(''); }} 
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-800 text-slate-650 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={createNewCommand} 
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={!newCmdInput.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
