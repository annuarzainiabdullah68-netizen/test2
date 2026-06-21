'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, RegistryEntry } from '../context/AppContext';

interface VariableConfig {
  type: string;
  name: string;
}

const DATA_TYPES_LIST = ['int8', 'int16', 'int32', 'int64', 'uint8', 'uint16', 'uint32', 'uint64', 'float', 'double', 'char', 'str', '*'];

export default function FuncBuild() {
  const { registry, setRegistry, fontSize, setPinMacros, setCmdDetails, playChime } = useApp();
  const router = useRouter();

  const handleExit = () => {
    router.push('/');
  };

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

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    filename: string;
    content: RegistryEntry[] | null;
    rawText: string;
    activeTab: 'list' | 'json';
  }>({
    isOpen: false,
    filename: '',
    content: null,
    rawText: '',
    activeTab: 'list'
  });

  const [pinRegister, setPinRegister] = useState<string>('');
  const isFirstRender = React.useRef(true);

  useEffect(() => {
    const storedPinRegister = localStorage.getItem('Pin Register') || localStorage.getItem('internalStorage') || localStorage.getItem('internalStorege');
    let parsed = null;
    if (storedPinRegister) {
      try {
        const loadedObj = JSON.parse(storedPinRegister);
        if (loadedObj && typeof loadedObj === 'object') {
          if (Array.isArray(loadedObj)) {
            parsed = loadedObj;
          } else {
            parsed = loadedObj["Pin Register"] || loadedObj["pinRegister"];
          }
        }
      } catch (e) {
        console.error("Failed to parse Pin Register", e);
      }
    }

    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      const linesText = parsed.map((p: any) => `${p.name || ''}${p.gpio !== undefined ? ' ' + p.gpio : ''}`).join('\n');
      setPinRegister(linesText);
    } else {
      const stored = localStorage.getItem('esp32_pin_register');
      if (stored) {
        setPinRegister(stored);
      } else {
        setPinRegister('');
      }
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    localStorage.setItem('esp32_pin_register', pinRegister);
    const lines = pinRegister.split('\n');
    const pinData = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        return { name: parts[0], gpio: parseInt(parts[1], 10) || 0 };
      }
      if (parts.length === 1 && parts[0].trim()) {
        return { name: parts[0], gpio: 0 };
      }
      return null;
    }).filter((p): p is { name: string; gpio: number } => p !== null);
    localStorage.setItem('Pin Register', JSON.stringify(pinData));

    // Read and update combined internalStorage
    const stored = localStorage.getItem('internalStorage') || localStorage.getItem('internalStorege');
    let currentStore: any = {};
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          currentStore = parsed;
        }
      } catch { }
    }
    currentStore["Pin Register"] = pinData;

    localStorage.setItem('internalStorage', JSON.stringify(currentStore));
    localStorage.setItem('internalStorege', JSON.stringify(currentStore));
    setPinMacros(pinData.map(p => p.name).filter(Boolean));
  }, [pinRegister, setPinMacros]);

  // Load and synchronize initial/loaded command details from registry/localStorage
  useEffect(() => {
    if (registry.length > 0) {
      const initialCmd = selectedCmd || registry[0].Cmd;
      const activeCmd = registry.some(r => r.Cmd === initialCmd) ? initialCmd : registry[0].Cmd;

      setSelectedCmd(activeCmd);
      setCmdName(activeCmd);

      const found = registry.find(r => r.Cmd === activeCmd);
      if (found) {
        setCmdDesc(found.desc || '');

        const storedDetails = localStorage.getItem('esp32_commands_details');
        const detailsMap = storedDetails ? JSON.parse(storedDetails) : {};
        const details = detailsMap[activeCmd];

        if (details) {
          setArgs(details.args || []);
          setInts(details.ints || []);
          setRets(details.rets || []);
        } else {
          if (found.Cmd === 'PT0') {
            setArgs([{ type: 'int8', name: 'pinOutput' }, { type: 'int16', name: 'markDelay' }, { type: 'int16', name: 'spaceDelay' }]);
            setInts([{ type: 'int8', name: 'state' }, { type: 'uint32', name: 'delay' }]);
            setRets([]);
          } else if (found.Cmd === 'GP0') {
            setArgs([{ type: 'int8', name: 'pinInput' }, { type: 'int16', name: 'debounce' }]);
            setInts([{ type: 'int8', name: 'lastState' }, { type: 'uint32', name: 'timer' }]);
            setRets([{ type: 'int8', name: 'val' }]);
          } else {
            setArgs(Array.from({ length: found.x }, (_, i) => ({ type: 'int8', name: `arg_${i}` })));
            setInts(Array.from({ length: found.y }, (_, i) => ({ type: 'int8', name: `int_${i}` })));
            setRets(Array.from({ length: found.z }, (_, i) => ({ type: 'int8', name: `ret_${i}` })));
          }
        }
      }
    }
  }, [registry]);

  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [viewModalTab, setViewModalTab] = useState<'pins' | 'cmds' | 'raw'>('pins');

  useEffect(() => {
    const stored = localStorage.getItem('esp32_commands_details');
    if (!stored) {
      const initialDetails: Record<string, any> = {
        ZZ0: {
          args: [{ type: 'int8', name: 'pinOutput' }, { type: 'int16', name: 'markDelay' }, { type: 'int16', name: 'spaceDelay' }],
          ints: [{ type: 'int8', name: 'state' }, { type: 'uint32', name: 'delay' }],
          rets: []
        },
        ZZ1: {
          args: [{ type: 'int8', name: 'pinInput' }, { type: 'int16', name: 'debounce' }],
          ints: [{ type: 'int8', name: 'lastState' }, { type: 'uint32', name: 'timer' }],
          rets: [{ type: 'int8', name: 'val' }]
        },
        ZZ2: {
          args: [{ type: 'int8', name: 'arg_0' }, { type: 'int8', name: 'arg_1' }, { type: 'int8', name: 'arg_2' }],
          ints: [{ type: 'int8', name: 'int_0' }],
          rets: []
        },
        ZZ3: {
          args: [{ type: 'int8', name: 'arg_0' }],
          ints: [{ type: 'int8', name: 'int_0' }],
          rets: []
        },
        ZZ4: {
          args: [{ type: 'int8', name: 'arg_0' }, { type: 'int8', name: 'arg_1' }, { type: 'int8', name: 'arg_2' }],
          ints: [{ type: 'int8', name: 'int_0' }, { type: 'int8', name: 'int_1' }, { type: 'int8', name: 'int_2' }, { type: 'int8', name: 'int_3' }],
          rets: [{ type: 'int8', name: 'ret_0' }]
        }
      };
      localStorage.setItem('esp32_commands_details', JSON.stringify(initialDetails));
    }
  }, []);

  // Dynamically save active command prototype changes into local details map immediately
  useEffect(() => {
    if (!selectedCmd) return;
    const storedDetails = localStorage.getItem('esp32_commands_details');
    const detailsMap = storedDetails ? JSON.parse(storedDetails) : {};

    const current = detailsMap[selectedCmd];
    if (
      !current ||
      JSON.stringify(current.args) !== JSON.stringify(args) ||
      JSON.stringify(current.ints) !== JSON.stringify(ints) ||
      JSON.stringify(current.rets) !== JSON.stringify(rets)
    ) {
      detailsMap[selectedCmd] = { args, ints, rets };
      localStorage.setItem('esp32_commands_details', JSON.stringify(detailsMap));
    }
  }, [args, ints, rets, selectedCmd]);

  const getSavedRegisters = () => {
    let pinData: { name: string; gpio: number }[] = [];
    let cmdData: any[] = [];

    // Parse current pin register state
    const lines = pinRegister.split('\n');
    pinData = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        return { name: parts[0], gpio: parseInt(parts[1], 10) || 0 };
      }
      return null;
    }).filter((p): p is { name: string; gpio: number } => p !== null);

    const storedDetails = localStorage.getItem('esp32_commands_details');
    const detailsMap = storedDetails ? JSON.parse(storedDetails) : {};
    cmdData = registry.map((item, idx) => {
      const details = detailsMap[item.Cmd] || {
        args: Array.from({ length: item.x }, (_, i) => ({ type: 'int8', name: `arg_${i}` })),
        ints: Array.from({ length: item.y }, (_, i) => ({ type: 'int8', name: `int_${i}` })),
        rets: Array.from({ length: item.z }, (_, i) => ({ type: 'int8', name: `ret_${i}` }))
      };
      return {
        index: idx + 1,
        Cmd: item.Cmd,
        x: item.x,
        y: item.y,
        z: item.z,
        desc: item.desc,
        args: details.args || [],
        ints: details.ints || [],
        rets: details.rets || []
      };
    });

    return { pinData, cmdData };
  };

  const handleOpenPins = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const content = evt.target?.result as string;
          let finalPinsText = content;
          if (file.name.endsWith('.json')) {
            const parsed = JSON.parse(content);
            let pinsArray: any[] = [];
            if (Array.isArray(parsed)) {
              pinsArray = parsed;
            } else if (parsed && typeof parsed === 'object') {
              pinsArray = parsed["Pin Register"] || parsed["pinRegister"] || [];
            }

            if (Array.isArray(pinsArray) && pinsArray.length > 0) {
              if (typeof pinsArray[0] === 'object' && pinsArray[0] !== null) {
                finalPinsText = pinsArray.map((p: any) => `${p.name || ''}${p.gpio !== undefined ? ' ' + p.gpio : ''}`).join('\n');
              } else {
                finalPinsText = pinsArray.join('\n');
              }
            }
          }

          setPinRegister(finalPinsText);

          // Save immediately to internalStorage, internalStorege and standard keys
          const lines = finalPinsText.split('\n');
          const pinData = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              return { name: parts[0], gpio: parseInt(parts[1], 10) || 0 };
            }
            if (parts.length === 1 && parts[0].trim()) {
              return { name: parts[0], gpio: 0 };
            }
            return null;
          }).filter((p): p is { name: string; gpio: number } => p !== null);

          localStorage.setItem('esp32_pin_register', finalPinsText);
          localStorage.setItem('Pin Register', JSON.stringify(pinData));
          localStorage.setItem('internalStorage', JSON.stringify(pinData));
          localStorage.setItem('internalStorege', JSON.stringify(pinData));
          setPinMacros(pinData.map(p => p.name).filter(Boolean));

          playChime();
          // alert("Pin register loaded and saved to internalStorage successfully!");
        } catch (err) {
          alert("Error parsing file: " + err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSavePins = () => {
    const blob = new Blob([pinRegister], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pin_register.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

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

        const storedDetails = localStorage.getItem('esp32_commands_details');
        const detailsMap = storedDetails ? JSON.parse(storedDetails) : {};
        const details = detailsMap[val];

        if (details) {
          setArgs(details.args || []);
          setInts(details.ints || []);
          setRets(details.rets || []);
        } else {
          if (found.Cmd === 'PT0') {
            setArgs([{ type: 'int8', name: 'pinOutput' }, { type: 'int16', name: 'markDelay' }, { type: 'int16', name: 'spaceDelay' }]);
            setInts([{ type: 'int8', name: 'state' }, { type: 'uint32', name: 'delay' }]);
            setRets([]);
          } else if (found.Cmd === 'GP0') {
            setArgs([{ type: 'int8', name: 'pinInput' }, { type: 'int16', name: 'debounce' }]);
            setInts([{ type: 'int8', name: 'lastState' }, { type: 'uint32', name: 'timer' }]);
            setRets([{ type: 'int8', name: 'val' }]);
          } else {
            setArgs(Array.from({ length: found.x }, (_, i) => ({ type: 'int8', name: `arg_${i}` })));
            setInts(Array.from({ length: found.y }, (_, i) => ({ type: 'int8', name: `int_${i}` })));
            setRets(Array.from({ length: found.z }, (_, i) => ({ type: 'int8', name: `ret_${i}` })));
          }
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
      const added = Array.from({ length: len - current.length }, (_, i) => ({
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
    const targetCmd = cmdName.toUpperCase();

    // 1. Update the registry
    let updatedRegistry: RegistryEntry[] = [];
    setRegistry(prev => {
      const exists = prev.some(item => item.Cmd === selectedCmd);
      if (exists) {
        updatedRegistry = prev.map(item => {
          if (item.Cmd === selectedCmd) {
            return {
              Cmd: targetCmd,
              desc: cmdDesc,
              x: args.length,
              y: ints.length,
              z: rets.length
            };
          }
          return item;
        });
      } else {
        updatedRegistry = [...prev, {
          Cmd: targetCmd,
          desc: cmdDesc,
          x: args.length,
          y: ints.length,
          z: rets.length
        }];
      }
      return updatedRegistry;
    });

    // We compute nextRegistry directly to use synchronously
    const nextRegistry = registry.map(item => {
      if (item.Cmd === selectedCmd) {
        return {
          Cmd: targetCmd,
          desc: cmdDesc,
          x: args.length,
          y: ints.length,
          z: rets.length
        };
      }
      return item;
    });
    if (!registry.some(r => r.Cmd === selectedCmd)) {
      nextRegistry.push({
        Cmd: targetCmd,
        desc: cmdDesc,
        x: args.length,
        y: ints.length,
        z: rets.length
      });
    }

    // 2. Update the details map
    const storedDetails = localStorage.getItem('esp32_commands_details');
    const detailsMap = storedDetails ? JSON.parse(storedDetails) : {};

    if (selectedCmd && selectedCmd !== targetCmd) {
      delete detailsMap[selectedCmd];
    }

    detailsMap[targetCmd] = {
      args: args,
      ints: ints,
      rets: rets
    };
    localStorage.setItem('esp32_commands_details', JSON.stringify(detailsMap));

    // 3. Save "Pin Register" parsed data
    const lines = pinRegister.split('\n');
    const pinData = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        return { name: parts[0], gpio: parseInt(parts[1], 10) || 0 };
      }
      if (parts.length === 1 && parts[0].trim()) {
        return { name: parts[0], gpio: 0 };
      }
      return null;
    }).filter(Boolean);
    localStorage.setItem('Pin Register', JSON.stringify(pinData));

    // 4. Save "Cmd Register" parsed data
    const cmdRegisterData = nextRegistry.map((item, idx) => {
      const details = detailsMap[item.Cmd] || {
        args: Array.from({ length: item.x }, (_, i) => ({ type: 'int8', name: `arg_${i}` })),
        ints: Array.from({ length: item.y }, (_, i) => ({ type: 'int8', name: `int_${i}` })),
        rets: Array.from({ length: item.z }, (_, i) => ({ type: 'int8', name: `ret_${i}` }))
      };
      return {
        index: idx + 1,
        Cmd: item.Cmd,
        x: item.x,
        y: item.y,
        z: item.z,
        desc: item.desc,
        args: details.args || [],
        ints: details.ints || [],
        rets: details.rets || []
      };
    });
    localStorage.setItem('Cmd Register', JSON.stringify(cmdRegisterData));

    // Save combined registers to internalStorage & internalStorege
    const combinedData = {
      "Pin Register": pinData,
      "Cmd Register": cmdRegisterData
    };
    localStorage.setItem('internalStorage', JSON.stringify(combinedData));
    localStorage.setItem('internalStorege', JSON.stringify(combinedData));

    // Update global context cmdDetails
    const cmdDetailsMap: Record<string, any> = {};
    cmdRegisterData.forEach((cmd: any) => {
      cmdDetailsMap[cmd.Cmd.toUpperCase()] = cmd;
    });
    setCmdDetails(cmdDetailsMap);

    setSelectedCmd(targetCmd);
    playChime();
    // alert(`Registers and command prototype '${targetCmd}' saved successfully!`);
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

    // Clean details map
    const storedDetails = localStorage.getItem('esp32_commands_details');
    const detailsMap = storedDetails ? JSON.parse(storedDetails) : {};
    delete detailsMap[selectedCmd];
    localStorage.setItem('esp32_commands_details', JSON.stringify(detailsMap));

    // Update Cmd Register in localStorage
    const cmdRegisterData = nextRegistry.map((item, idx) => {
      const details = detailsMap[item.Cmd] || {
        args: Array.from({ length: item.x }, (_, i) => ({ type: 'int8', name: `arg_${i}` })),
        ints: Array.from({ length: item.y }, (_, i) => ({ type: 'int8', name: `int_${i}` })),
        rets: Array.from({ length: item.z }, (_, i) => ({ type: 'int8', name: `ret_${i}` }))
      };
      return {
        index: idx + 1,
        Cmd: item.Cmd,
        x: item.x,
        y: item.y,
        z: item.z,
        desc: item.desc,
        args: details.args || [],
        ints: details.ints || [],
        rets: details.rets || []
      };
    });
    localStorage.setItem('Cmd Register', JSON.stringify(cmdRegisterData));

    // Update global context cmdDetails
    const cmdDetailsMap: Record<string, any> = {};
    cmdRegisterData.forEach((cmd: any) => {
      cmdDetailsMap[cmd.Cmd.toUpperCase()] = cmd;
    });
    setCmdDetails(cmdDetailsMap);

    // Pick a new selected item
    const nextSelected = nextRegistry[0];
    setSelectedCmd(nextSelected.Cmd);
    setCmdName(nextSelected.Cmd);
    setCmdDesc(nextSelected.desc);
    setArgs(Array.from({ length: nextSelected.x }, (_, i) => ({ type: 'int8', name: `arg_${i}` })));
    setInts(Array.from({ length: nextSelected.y }, (_, i) => ({ type: 'int8', name: `int_${i}` })));
    setRets(Array.from({ length: nextSelected.z }, (_, i) => ({ type: 'int8', name: `ret_${i}` })));
  };

  const handleExportRegistry = () => {
    const { pinData, cmdData } = getSavedRegisters();
    const exportData = {
      "Pin Register": pinData,
      "Cmd Register": cmdData
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'esp32_registers.json';
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
          const content = evt.target?.result as string;
          const imported = JSON.parse(content);

          let parsedRegistry: RegistryEntry[] = [];
          let parsedPinsText = '';

          if (imported && typeof imported === 'object' && !Array.isArray(imported)) {
            const pinRegData = imported["Pin Register"] || imported["pinRegister"];
            const cmdRegData = imported["Cmd Register"] || imported["cmdRegister"] || imported["registry"];

            if (Array.isArray(pinRegData)) {
              parsedPinsText = pinRegData.map((p: any) => `${p.name || ''} ${p.gpio ?? ''}`).join('\n');
            } else if (typeof pinRegData === 'string') {
              parsedPinsText = pinRegData;
            }

            if (Array.isArray(cmdRegData)) {
              parsedRegistry = cmdRegData.map((item: any) => ({
                Cmd: (item.Cmd || '').toUpperCase(),
                x: item.x ?? (item.args?.length || 0),
                y: item.y ?? (item.ints?.length || 0),
                z: item.z ?? (item.rets?.length || 0),
                desc: item.desc || ''
              }));

              const detailedConfigs: Record<string, any> = {};
              cmdRegData.forEach((item: any) => {
                if (item.Cmd) {
                  detailedConfigs[item.Cmd.toUpperCase()] = {
                    args: item.args || [],
                    ints: item.ints || [],
                    rets: item.rets || []
                  };
                }
              });
              localStorage.setItem('esp32_commands_details', JSON.stringify(detailedConfigs));
            }
          } else if (Array.isArray(imported)) {
            parsedRegistry = imported.map((item: any) => ({
              Cmd: (item.Cmd || '').toUpperCase(),
              x: item.x ?? (item.args?.length || 0),
              y: item.y ?? (item.ints?.length || 0),
              z: item.z ?? (item.rets?.length || 0),
              desc: item.desc || ''
            }));
          }

          if (parsedRegistry.length > 0) {
            setRegistry(parsedRegistry);
            if (parsedPinsText) {
              setPinRegister(parsedPinsText);
            }

            // Save Cmd Register in localStorage & update global context cmdDetails
            const storedDetails = localStorage.getItem('esp32_commands_details');
            const detailsMap = storedDetails ? JSON.parse(storedDetails) : {};
            const cmdRegisterData = parsedRegistry.map((item, idx) => {
              const details = detailsMap[item.Cmd] || {
                args: Array.from({ length: item.x }, (_, i) => ({ type: 'int8', name: `arg_${i}` })),
                ints: Array.from({ length: item.y }, (_, i) => ({ type: 'int8', name: `int_${i}` })),
                rets: Array.from({ length: item.z }, (_, i) => ({ type: 'int8', name: `ret_${i}` }))
              };
              return {
                index: idx + 1,
                Cmd: item.Cmd,
                x: item.x,
                y: item.y,
                z: item.z,
                desc: item.desc,
                args: details.args || [],
                ints: details.ints || [],
                rets: details.rets || []
              };
            });
            localStorage.setItem('Cmd Register', JSON.stringify(cmdRegisterData));

            const cmdDetailsMap: Record<string, any> = {};
            cmdRegisterData.forEach((cmd: any) => {
              cmdDetailsMap[cmd.Cmd.toUpperCase()] = cmd;
            });
            setCmdDetails(cmdDetailsMap);

            playChime();
            alert("Registers imported successfully and page repopulated!");

            const first = parsedRegistry[0];
            setSelectedCmd(first.Cmd);
            setCmdName(first.Cmd);
            setCmdDesc(first.desc || '');

            const details = detailsMap[first.Cmd];
            if (details) {
              setArgs(details.args || []);
              setInts(details.ints || []);
              setRets(details.rets || []);
            } else {
              if (first.Cmd === 'PT0') {
                setArgs([{ type: 'int8', name: 'pinOutput' }, { type: 'int16', name: 'markDelay' }, { type: 'int16', name: 'spaceDelay' }]);
                setInts([{ type: 'int8', name: 'state' }, { type: 'uint32', name: 'delay' }]);
                setRets([]);
              } else if (first.Cmd === 'GP0') {
                setArgs([{ type: 'int8', name: 'pinInput' }, { type: 'int16', name: 'debounce' }]);
                setInts([{ type: 'int8', name: 'lastState' }, { type: 'uint32', name: 'timer' }]);
                setRets([{ type: 'int8', name: 'val' }]);
              } else {
                setArgs(Array.from({ length: first.x }, (_, i) => ({ type: 'int8', name: `arg_${i}` })));
                setInts(Array.from({ length: first.y }, (_, i) => ({ type: 'int8', name: `int_${i}` })));
                setRets(Array.from({ length: first.z }, (_, i) => ({ type: 'int8', name: `ret_${i}` })));
              }
            }
          } else {
            alert("Invalid configuration format. Must contain a valid command list.");
          }
        } catch (err) {
          alert("Error parsing file: " + err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleView = () => {
    setShowViewModal(true);
  };

  const handleImportFromPreview = () => {
    if (previewModal.content && previewModal.content.length > 0) {
      setRegistry(previewModal.content);

      // Update Cmd Register in localStorage and global context cmdDetails
      const storedDetails = localStorage.getItem('esp32_commands_details');
      const detailsMap = storedDetails ? JSON.parse(storedDetails) : {};
      const cmdRegisterData = previewModal.content.map((item, idx) => {
        const details = detailsMap[item.Cmd] || {
          args: Array.from({ length: item.x }, (_, i) => ({ type: 'int8', name: `arg_${i}` })),
          ints: Array.from({ length: item.y }, (_, i) => ({ type: 'int8', name: `int_${i}` })),
          rets: Array.from({ length: item.z }, (_, i) => ({ type: 'int8', name: `ret_${i}` }))
        };
        return {
          index: idx + 1,
          Cmd: item.Cmd,
          x: item.x,
          y: item.y,
          z: item.z,
          desc: item.desc,
          args: details.args || [],
          ints: details.ints || [],
          rets: details.rets || []
        };
      });
      localStorage.setItem('Cmd Register', JSON.stringify(cmdRegisterData));

      const cmdDetailsMap: Record<string, any> = {};
      cmdRegisterData.forEach((cmd: any) => {
        cmdDetailsMap[cmd.Cmd.toUpperCase()] = cmd;
      });
      setCmdDetails(cmdDetailsMap);

      playChime();
      alert("Command registry imported successfully from preview!");
      const first = previewModal.content[0];
      setSelectedCmd(first.Cmd);
      setCmdName(first.Cmd);
      setCmdDesc(first.desc || '');
      if (first.Cmd === 'PT0') {
        setArgs([{ type: 'int8', name: 'pinOutput' }, { type: 'int16', name: 'markDelay' }, { type: 'int16', name: 'spaceDelay' }]);
        setInts([{ type: 'int8', name: 'state' }, { type: 'uint32', name: 'delay' }]);
        setRets([]);
      } else if (first.Cmd === 'GP0') {
        setArgs([{ type: 'int8', name: 'pinInput' }, { type: 'int16', name: 'debounce' }]);
        setInts([{ type: 'int8', name: 'lastState' }, { type: 'uint32', name: 'timer' }]);
        setRets([{ type: 'int8', name: 'val' }]);
      } else {
        setArgs(Array.from({ length: first.x }, (_, i) => ({ type: 'int8', name: `arg_${i}` })));
        setInts(Array.from({ length: first.y }, (_, i) => ({ type: 'int8', name: `int_${i}` })));
        setRets(Array.from({ length: first.z }, (_, i) => ({ type: 'int8', name: `ret_${i}` })));
      }
    }
    setPreviewModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="flex flex-col p-4 max-w-5xl mx-auto w-full transition-colors duration-200">
      <div className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">

        {/* Top: Command Select & Description */}
        <div className="flex flex-col sm:flex-row gap-4 shrink-0 items-stretch">
          <div className="sm:w-1/3 flex flex-col gap-4">
            <div>
              <label className="block text-[0.625rem] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider select-none">Command Type</label>
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

            <div className="flex flex-col flex-1">
              <label className="block text-[0.625rem] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider select-none">Pin Register</label>
              <textarea
                value={pinRegister}
                onChange={(e) => setPinRegister(e.target.value)}
                className="w-full flex-1 min-h-[9rem] bg-slate-50 dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 resize-none transition-colors leading-relaxed text-[0.8125rem] font-mono shadow-sm"
                placeholder="BTN_SW1&#10;LED_P1&#10;..."
              />
              <div className="flex gap-2 mt-2 h-10 shrink-0">
                <button
                  onClick={handleOpenPins}
                  className="flex-1 bg-slate-50 dark:bg-[#1c2434] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 hover:border-slate-400 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center"
                >
                  Open
                </button>
                <button
                  onClick={handleSavePins}
                  className="flex-1 bg-slate-50 dark:bg-[#1c2434] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 hover:border-slate-400 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          <div className="sm:w-2/3 flex flex-col">
            <label className="block text-[0.625rem] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider select-none">Description & Help Metadata</label>
            <textarea
              value={cmdDesc}
              onChange={(e) => setCmdDesc(e.target.value)}
              className="w-full flex-1 min-h-[14rem] bg-slate-50 dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 resize-none transition-colors leading-relaxed text-[0.8125rem] font-medium shadow-sm"
              placeholder="Provide a detailed description of the command behaviour, expected parameters, and peripheral mapping."
            />
          </div>
        </div>

        {/* Middle: Counts & Variable Lists */}
        <div className="flex flex-col md:flex-row gap-4 shrink-0">

          {/* Counters Box */}
          <div className="bg-slate-50 dark:bg-[#0a0f18]/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800/80 md:w-48 flex flex-col gap-3 transition-colors shadow-inner self-start w-full">
            <span className="text-[0.625rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">Counts</span>
            {(['args', 'ints', 'rets'] as const).map((type) => {
              const isActive = activePane === type;
              const isAtMax = panes[type].data.length >= 5;
              const labels = { args: 'Args#', ints: 'Ints#', rets: 'Rets#' };
              return (
                <div
                  key={type}
                  onClick={() => setActivePane(type)}
                  className={`flex items-center justify-between relative rounded-lg cursor-pointer transition-all p-2 select-none border ${isActive
                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 font-semibold'
                    : 'bg-white dark:bg-[#0a0f18] border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                >
                  <label className={`text-xs cursor-pointer transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>{labels[type]}</label>
                  <div className="flex items-center gap-1">
                    {isAtMax && (
                      <span className="text-[0.5625rem] text-amber-500 dark:text-amber-400 font-bold select-none" title="Maximum 5 reached">🔒</span>
                    )}
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={panes[type].data.length}
                      onChange={(e) => { setActivePane(type); handleLengthChange(type, e.target.value); }}
                      onFocus={() => setActivePane(type)}
                      onClick={(e) => e.stopPropagation()}
                      className={`w-12 bg-white dark:bg-[#121824] border text-center text-slate-800 dark:text-slate-200 rounded p-1 text-xs transition-colors focus:border-blue-500 outline-none shadow-sm font-bold ${isAtMax
                        ? 'border-amber-400 dark:border-amber-600 text-amber-600 dark:text-amber-400'
                        : 'border-slate-300 dark:border-slate-800'
                        }`}
                    />
                  </div>
                  {isActive && <div className="absolute right-0.5 top-1/2 -translate-y-1/2 text-yellow-500 text-[0.625rem] pointer-events-none drop-shadow-md">♦</div>}
                </div>
              );
            })}
          </div>

          {/* Variables List Pane */}
          <div
            className="flex-1 bg-slate-50 dark:bg-[#0a0f18]/30 rounded-xl p-3 border border-slate-200 dark:border-slate-800/80 transition-colors shadow-inner flex flex-col"
            style={{ height: '21.5rem' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[0.625rem] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider select-none">{panes[activePane].title}</div>
              {panes[activePane].data.length >= 5 && (
                <span className="text-[0.5625rem] text-amber-500 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded select-none">MAX 5</span>
              )}
            </div>
            <div className="space-y-2 pr-1 flex-1 overflow-y-auto">
              {panes[activePane].data.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-white dark:bg-[#121824] p-2 rounded-lg border border-slate-200 dark:border-slate-800/60 shadow-sm">
                  <span className="text-slate-400 dark:text-slate-500 text-[0.625rem] font-mono select-none w-6 text-right">#{idx + 1}</span>
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
            onClick={handleDelete}
            className="bg-slate-50 dark:bg-[#1c2434] text-red-600 dark:text-red-400 border border-slate-300 dark:border-slate-800 hover:bg-red-50 hover:border-red-300 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Delete Command
          </button>
          <button
            onClick={handleImportRegistry}
            className="bg-slate-55 dark:bg-[#1c2434] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 hover:border-slate-400 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Import
          </button>
          <button
            onClick={handleExportRegistry}
            className="bg-slate-55 dark:bg-[#1c2434] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 hover:border-slate-400 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Export
          </button>
          <button
            onClick={handleView}
            className="bg-slate-50 dark:bg-[#1c2434] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 hover:border-slate-400 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            View
          </button>
          <div className="flex-1"></div>
          <button
            onClick={handleExit}
            className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-slate-900 px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-emerald-500/20 cursor-pointer"
          >
            Exit
          </button>
          <button
            onClick={handleSave}
            className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-slate-900 px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-emerald-500/20 cursor-pointer"
          >
            Use This
          </button>
        </div>
      </div>

      {/* NEW COMMAND MODAL */}
      {showNewCmdModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="py-2.5 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Create New Command</h2>
            </div>
            <div className="p-4">
              <label className="block text-[0.625rem] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider select-none">Command Name</label>
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
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
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

      {/* PREVIEW FILE MODAL */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="py-2.5 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30 flex justify-between items-center shrink-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>Preview Registry:</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">{previewModal.filename}</span>
              </h2>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPreviewModal(prev => ({ ...prev, activeTab: 'list' }))}
                  className={`px-2 py-1 rounded text-[0.625rem] font-bold transition-all ${previewModal.activeTab === 'list'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  Command List
                </button>
                <button
                  onClick={() => setPreviewModal(prev => ({ ...prev, activeTab: 'json' }))}
                  className={`px-2 py-1 rounded text-[0.625rem] font-bold transition-all ${previewModal.activeTab === 'json'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  Raw JSON
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-[#0d121c]/40">
              {previewModal.activeTab === 'list' ? (
                <div className="space-y-3">
                  {previewModal.content?.map((cmd) => (
                    <div
                      key={cmd.Cmd}
                      className="bg-white dark:bg-[#121824] p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs font-mono text-slate-800 dark:text-slate-200">{cmd.Cmd}</span>
                        <div className="flex gap-2">
                          <span className="text-[0.625rem] bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/40">Args (X): {cmd.x}</span>
                          <span className="text-[0.625rem] bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-md border border-purple-100 dark:border-purple-900/40">Ints (Y): {cmd.y}</span>
                          <span className="text-[0.625rem] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/40">Rets (Z): {cmd.z}</span>
                        </div>
                      </div>
                      {cmd.desc && (
                        <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 font-medium whitespace-pre-wrap leading-normal border-t border-slate-100 dark:border-slate-800/60 pt-1.5 mt-0.5">
                          {cmd.desc}
                        </p>
                      )}
                    </div>
                  ))}
                  {(!previewModal.content || previewModal.content.length === 0) && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-6">
                      No commands found in this file.
                    </div>
                  )}
                </div>
              ) : (
                <pre className="w-full bg-[#0a0f18] text-slate-350 p-3 rounded-lg border border-slate-800 text-[0.625rem] font-mono whitespace-pre overflow-x-auto shadow-inner leading-relaxed select-all">
                  {previewModal.rawText}
                </pre>
              )}
            </div>

            <div className="py-2.5 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30 flex justify-between items-center shrink-0">
              <button
                onClick={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={handleImportFromPreview}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Import this Registry
              </button>
            </div>
          </div>
        </div>
      )}
      {/* VIEW REGISTER MODAL */}
      {showViewModal && (() => {
        const { pinData, cmdData } = getSavedRegisters();
        const exportJSON = JSON.stringify({ "Pin Register": pinData, "Cmd Register": cmdData }, null, 2);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
              <div className="py-2.5 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30 flex justify-between items-center shrink-0">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 select-none">
                  <span>View Registers</span>
                </h2>
                <div className="flex gap-1.5">
                  {(['pins', 'cmds', 'raw'] as const).map((tab) => {
                    const label = { pins: 'Pin Register', cmds: 'Cmd Register', raw: 'Raw JSON' }[tab];
                    return (
                      <button
                        key={tab}
                        onClick={() => setViewModalTab(tab)}
                        className={`px-2.5 py-1 rounded text-[0.625rem] font-bold transition-all cursor-pointer ${viewModalTab === tab
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-[#0d121c]/40">
                {viewModalTab === 'pins' && (
                  <div className="space-y-3">
                    <div className="text-[0.625rem] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-2 select-none">
                      Parsed Pin Mappings ({pinData.length} total)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {pinData.map((pin, i) => (
                        <div key={i} className="bg-white dark:bg-[#121824] p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-sm flex justify-between items-center font-mono text-xs">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">{pin.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#0a0f18] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800/50 font-bold">GPIO {pin.gpio}</span>
                        </div>
                      ))}
                      {pinData.length === 0 && (
                        <div className="col-span-full text-xs text-slate-400 dark:text-slate-500 italic py-6 text-center select-none bg-white dark:bg-[#121824] border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                          No pins configured. Add name and GPIO on the Pin Register sidebar.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {viewModalTab === 'cmds' && (
                  <div className="space-y-3">
                    <div className="text-[0.625rem] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-2 select-none">
                      Command Type Definitions ({cmdData.length} total)
                    </div>
                    {cmdData.map((cmd) => (
                      <div key={cmd.Cmd} className="bg-white dark:bg-[#121824] p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs font-mono text-slate-800 dark:text-slate-200">
                            <span className="text-slate-400 dark:text-slate-500 mr-2 font-sans">#{cmd.index}</span>
                            {cmd.Cmd}
                          </span>
                          <div className="flex gap-2">
                            <span className="text-[0.625rem] bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/40">Args (X): {cmd.x}</span>
                            <span className="text-[0.625rem] bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-md border border-purple-100 dark:border-purple-900/40">Ints (Y): {cmd.y}</span>
                            <span className="text-[0.625rem] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/40">Rets (Z): {cmd.z}</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-[#0a0f18]/60 p-2 rounded border border-slate-200 dark:border-slate-800/80 font-mono text-[0.6875rem] text-emerald-600 dark:text-emerald-400">
                          <span className="text-slate-400 dark:text-slate-500 mr-2 select-none">Prototype:</span>
                          {cmd.Cmd}: {cmd.rets.length > 0 ? cmd.rets.map((r: any) => r.type).join(', ') + ' ' : ''}({cmd.args.map((a: any) => a.type).join(', ')}){cmd.ints.length > 0 ? ' {' + cmd.ints.map((i: any) => i.type).join(', ') + '}' : ''}
                        </div>

                        {cmd.desc && (
                          <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400 whitespace-pre-wrap leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-2 mt-1">
                            {cmd.desc}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {viewModalTab === 'raw' && (
                  <pre className="w-full bg-[#0a0f18] text-slate-300 p-3 rounded-lg border border-slate-800 text-[0.625rem] font-mono whitespace-pre overflow-x-auto shadow-inner leading-relaxed select-all">
                    {exportJSON}
                  </pre>
                )}
              </div>

              <div className="py-2.5 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30 flex justify-between items-center shrink-0">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleExportRegistry}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  Download Config File
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
