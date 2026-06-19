import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Settings, Usb, Plus, Trash2, FileJson, 
  Save, Eye, Play, Download, X, Cpu, Maximize, ZoomIn, ZoomOut, Moon, Sun, GripVertical
} from 'lucide-react';

// --- MOCK DATA ---
const MOCK_REGISTRY = [
  { Cmd: "PT0", x: 3, y: 2, z: 0, desc: "Put Pin <PT0>\nSet Pin State." },
  { Cmd: "GP0", x: 2, y: 2, z: 1, desc: "Get Pin <GP0>\nSample [A1]int8 Pin as Input..." },
  { Cmd: "RTP", x: 3, y: 1, z: 0, desc: "Read Timer/Pulse" },
  { Cmd: "WFI", x: 1, y: 1, z: 0, desc: "Wait for Interrupt" },
  { Cmd: "PCN", x: 3, y: 4, z: 1, desc: "Pulse Counter" }
];

// --- INITIAL GRAPH STATE ---
const INITIAL_NODES = {
  'proj_1': { id: 'proj_1', type: 'project', name: 'Test Out', x: 100, y: 100 },
  'tab_1': { id: 'tab_1', parentId: 'proj_1', type: 'tab', name: 'TAB1', x: 220, y: 280 },
  'sec_1': { id: 'sec_1', parentId: 'tab_1', type: 'section', name: 'GGG', exec: '5000', x: 650, y: 320, rows: [
      { id: 1, label: "Signal", command: "PT0[BTN_SW2, 1200, ~, 1]" },
      { id: 2, label: "house", command: "LSS[, STA,User,Password]" },
      { id: 3, label: "", command: "MCG[Signal, 233, LED_P3]" }
    ]
  },
  'sec_2': { id: 'sec_2', parentId: 'tab_1', type: 'section', name: 'AAAA', exec: '0', x: 150, y: 550, rows: [
      { id: 4, label: "DSFS", command: "PTO[ , , ]" }
    ]
  },
  'sec_3': { id: 'sec_3', parentId: 'tab_1', type: 'section', name: 'SSSSS', exec: '5000', x: 400, y: 650, rows: [
      { id: 5, label: "EERR", command: "GP0[BTN_SW1, 200]" },
      { id: 6, label: "AAA", command: "RTP[LED_P8, , ]" }
    ]
  }
};

// --- DATA TYPES FOR VARIABLE SELECTION ---
const DATA_TYPES = ['int8', 'int16', 'int32', 'int64', 'uint8', 'uint16', 'uint32', 'uint64', 'float', 'double', 'char', 'str', '*'];

// --- GLOBAL HEADER COMPONENT ---
const GlobalHeader = ({ view, setView, usbConnected, fontSize, setFontSize, theme, toggleTheme }) => {
  const titles = {
    'hub': 'MAIN HUB',
    'func': 'FUNCTION BUILDER',
    'proj': 'PROJECT BUILDER / Workflow Canvas',
    'process': 'TEST OUT / Project Processor'
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b-2 border-emerald-500 sticky top-0 z-50 shadow-md transition-colors duration-200">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-2 flex-1">
          {view !== 'hub' && (
            <button 
              onClick={() => view === 'process' ? setView('proj') : setView('hub')}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 transition-colors"
              title={view === 'process' ? "Back to Project Builder" : "Back to Hub"}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-wider flex items-center gap-1.5">
            <Settings size={16} className="text-slate-500 dark:text-slate-400" />
            {titles[view]}
          </h1>
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          className="p-1 mr-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 transition-colors"
          title="Toggle Light/Dark Mode"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Font Size Selector */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 p-0.5 mr-4 transition-colors">
          <button onClick={() => setFontSize(Math.max(0.8, fontSize - 0.1))} className="px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300">A-</button>
          <span className="px-1.5 text-[10px] text-slate-600 dark:text-slate-400 font-mono">{Math.round(fontSize * 100)}%</span>
          <button onClick={() => setFontSize(Math.min(1.5, fontSize + 0.1))} className="px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300">A+</button>
        </div>

        {/* Action Buttons (Process View Specific) */}
        {view === 'process' && (
          <div className="flex gap-1.5 mr-4">
            <button className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded text-xs font-semibold text-white transition-colors">
              <Download size={14} /> Export Hex
            </button>
            <button className="flex items-center gap-1 bg-orange-600 hover:bg-orange-500 px-2 py-1 rounded text-xs font-semibold text-white transition-colors">
              <Play size={14} /> Send to Hardware
            </button>
            <button onClick={() => setView('hub')} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 px-2 py-1 rounded text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors">
              <X size={14} /> Close
            </button>
          </div>
        )}

        {/* USB Pill */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border transition-colors ${
          usbConnected 
            ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' 
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
        }`}>
          <Usb size={12} />
          {usbConnected ? 'USB CONNECTED' : 'DISCONNECTED'}
        </div>
      </div>
    </div>
  );
};

// --- MAIN HUB VIEW ---
const MainHub = ({ setView, setUsbConnected, usbConnected }) => {
  const handleProjectBuilderClick = async () => {
    if (usbConnected) {
      setView('proj');
      return;
    }
    try {
      if ('serial' in navigator) {
        await navigator.serial.requestPort({ filters: [] });
        setUsbConnected(true);
        setView('proj');
      } else {
        const proceed = window.confirm("Web Serial API not supported or disabled in this environment. Simulate successful connection anyway?");
        if (proceed) {
          setUsbConnected(true);
          setView('proj');
        }
      }
    } catch (err) {
      console.warn("User cancelled pairing or error occurred", err);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
        <button 
          onClick={() => setView('func')}
          className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-xl dark:shadow-2xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-blue-900/20 transition-all text-left overflow-hidden flex flex-col h-56"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Settings size={100} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Function Builder</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Construct and manage C++ command prototypes (RowRegistry) for the ESP32.</p>
          <div className="mt-auto flex items-center text-sm text-blue-600 dark:text-blue-400 font-semibold">
            Open Builder <ArrowLeft className="ml-1 rotate-180" size={14} />
          </div>
        </button>

        <button 
          onClick={handleProjectBuilderClick}
          className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-xl dark:shadow-2xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-emerald-900/20 transition-all text-left overflow-hidden flex flex-col h-56"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Cpu size={100} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Project Builder</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Visually construct execution logic. <strong className="text-slate-700 dark:text-slate-300">Requires USB Serial connection</strong> to proceed.</p>
          <div className="mt-auto flex items-center text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
            Connect & Open <ArrowLeft className="ml-1 rotate-180" size={14} />
          </div>
        </button>
      </div>
    </div>
  );
};

// --- FUNCTION BUILDER VIEW ---
const FuncBuild = () => {
  const [registry, setRegistry] = useState(MOCK_REGISTRY);
  const [selectedCmd, setSelectedCmd] = useState(MOCK_REGISTRY[0].Cmd);

  const [cmdName, setCmdName] = useState(MOCK_REGISTRY[0].Cmd);
  const [cmdDesc, setCmdDesc] = useState(MOCK_REGISTRY[0].desc);
  const [args, setArgs] = useState([{type: 'int8', name: 'pinOutput'}, {type: 'int16', name: 'markDelay'}, {type: 'int16', name: 'spaceDelay'}]);
  const [ints, setInts] = useState([{type: 'int8', name: 'state'}, {type: 'uint32', name: 'delay'}]);
  const [rets, setRets] = useState([]);

  const [activePane, setActivePane] = useState('args'); 
  const [showNewCmdModal, setShowNewCmdModal] = useState(false);
  const [newCmdInput, setNewCmdInput] = useState("");

  const panes = {
    'args': { title: 'ARGUMENTS (ARGS)', data: args, setData: setArgs },
    'ints': { title: 'INTERNAL VARIABLES (INTS)', data: ints, setData: setInts },
    'rets': { title: 'RETURN VALUES (RETS)', data: rets, setData: setRets }
  };

  const handleCmdChange = (e) => {
    const val = e.target.value;
    if (val === 'NEW') {
      setShowNewCmdModal(true);
    } else {
      setSelectedCmd(val);
      setCmdName(val);
      const found = registry.find(r => r.Cmd === val);
      if (found) {
        setCmdDesc(found.desc);
        // Automatically sync lengths and generate variables based on the selected command
        setArgs(Array.from({length: found.x}, (_, i) => ({type: 'int8', name: `var_${i}`})));
        setInts(Array.from({length: found.y}, (_, i) => ({type: 'int8', name: `var_${i}`})));
        setRets(Array.from({length: found.z}, (_, i) => ({type: 'int8', name: `var_${i}`})));
      }
    }
  };

  const createNewCommand = () => {
    if (!newCmdInput.trim()) return;
    const newCmd = { Cmd: newCmdInput, x: 0, y: 0, z: 0, desc: `Description for ${newCmdInput}` };
    setRegistry([...registry, newCmd]);
    setSelectedCmd(newCmdInput);
    setCmdName(newCmdInput);
    setCmdDesc(newCmd.desc);
    setArgs([]);
    setInts([]);
    setRets([]);
    setShowNewCmdModal(false);
    setNewCmdInput('');
  };

  const handleLengthChange = (type, val) => {
    let len = parseInt(val, 10) || 0;
    if (len > 5) len = 5; // Hard cap at maximum 5 elements
    if (len < 0) len = 0;
    
    const current = panes[type].data;
    const setter = panes[type].setData;

    if (len > current.length) {
      const added = Array.from({length: len - current.length}, () => ({type: 'int8', name: ''}));
      setter([...current, ...added]);
    } else if (len < current.length) {
      setter(current.slice(0, len));
    }
  };

  const handleItemChange = (type, idx, field, val) => {
    const current = [...panes[type].data];
    current[idx][field] = val;
    panes[type].setData(current);
  };

  return (
    <div className="p-2 max-w-5xl mx-auto flex flex-col flex-1 w-full transition-colors duration-200">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 shadow-xl transition-colors flex flex-col h-full gap-2">
        
        {/* Top: Command & Description */}
        <div className="flex gap-2">
          <div className="w-1/3">
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5 uppercase tracking-wider">COMMAND</label>
            <select 
              value={selectedCmd} 
              onChange={handleCmdChange}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-blue-500 transition-colors text-sm"
            >
              {registry.map(c => <option key={c.Cmd} value={c.Cmd}>{c.Cmd}</option>)}
              <option disabled>──────────</option>
              <option value="NEW" className="font-bold text-blue-600 dark:text-blue-400">+ Create New Command...</option>
            </select>
          </div>
          <div className="w-2/3">
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5 uppercase tracking-wider">DESCRIPTION</label>
            <textarea 
              rows="7"
              value={cmdDesc}
              onChange={(e) => setCmdDesc(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-blue-500 resize-none transition-colors leading-relaxed text-[13px]"
            />
          </div>
        </div>

        {/* Middle: Counts & Variable Lists */}
        <div className="flex gap-2 flex-1 min-h-0">
          
          {/* Counters Box */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-300 dark:border-slate-600 w-36 flex flex-col gap-2 transition-colors shadow-inner self-start">
            {['args', 'ints', 'rets'].map((type) => {
              const isActive = activePane === type;
              const labels = { args: 'Args#', ints: 'Ints#', rets: 'Rets#' };
              return (
                <div 
                  key={type}
                  onClick={() => setActivePane(type)}
                  className={`flex items-center justify-between relative rounded cursor-pointer transition-colors group p-0.5 pr-4`}
                >
                  <label className={`text-xs font-bold cursor-pointer transition-colors ${isActive ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`}>{labels[type]}</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="5" 
                    value={panes[type].data.length} 
                    onChange={(e) => handleLengthChange(type, e.target.value)} 
                    className="w-12 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-center text-slate-800 dark:text-slate-200 rounded p-0.5 text-xs transition-colors focus:border-blue-500 outline-none shadow-sm" 
                  />
                  {isActive && <div className="absolute right-0.5 text-yellow-500 text-[14px] leading-none pointer-events-none drop-shadow-md">♦</div>}
                </div>
              );
            })}
          </div>

          {/* Variables List Pane */}
          <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-200 dark:border-slate-700/50 transition-colors shadow-inner overflow-y-auto h-48">
             <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider">{panes[activePane].title}</div>
             <div className="space-y-1">
               {panes[activePane].data.map((item, idx) => (
                 <div key={idx} className="flex gap-1">
                   <select 
                     value={item.type} 
                     onChange={(e) => handleItemChange(activePane, idx, 'type', e.target.value)} 
                     className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded p-1 text-xs w-1/3 transition-colors outline-none focus:border-blue-500"
                   >
                     {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                   <input 
                     type="text" 
                     value={item.name} 
                     onChange={(e) => handleItemChange(activePane, idx, 'name', e.target.value)} 
                     placeholder={`var_${idx}`} 
                     className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded p-1 text-xs flex-1 transition-colors outline-none focus:border-blue-500" 
                   />
                 </div>
               ))}
               {panes[activePane].data.length === 0 && (
                 <div className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                   No variables. Increase count.
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Prototype */}
        <div className="bg-slate-100 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-green-600 dark:text-green-400 transition-colors shadow-inner shrink-0">
          <span className="text-slate-500">Prototype: </span> 
          {cmdName}: {rets.length > 0 ? rets.map(r => r.type).join(', ') + ' ' : ''}({args.map(a => a.type).join(', ')}){ints.length > 0 ? ' ' + ints.map(i => i.type).join(', ') : ''}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-200 dark:border-slate-700 pt-2 shrink-0">
          <button onClick={() => setShowNewCmdModal(true)} className="bg-yellow-100 dark:bg-yellow-600/20 text-yellow-700 dark:text-yellow-500 border border-yellow-300 dark:border-yellow-600/50 hover:bg-yellow-500 hover:text-white px-3 py-1 rounded text-[11px] font-bold transition-colors">New</button>
          <button className="bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-400 border border-slate-300 dark:border-slate-600 hover:bg-red-100 dark:hover:bg-red-900/50 px-3 py-1 rounded text-[11px] font-bold transition-colors">Delete</button>
          <div className="flex-1"></div>
          <button className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1 rounded text-[11px] font-bold transition-colors">Import</button>
          <button className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1 rounded text-[11px] font-bold transition-colors">Export</button>
          <button className="bg-yellow-400 dark:bg-yellow-500 text-slate-900 hover:bg-yellow-500 dark:hover:bg-yellow-400 px-5 py-1 rounded text-[11px] font-bold transition-colors shadow-sm">Save</button>
        </div>
      </div>

      {/* NEW COMMAND MODAL */}
      {showNewCmdModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="py-1 px-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Create New Command</h2>
            </div>
            <div className="p-2">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">COMMAND NAME</label>
              <input 
                type="text" 
                value={newCmdInput}
                onChange={(e) => setNewCmdInput(e.target.value)}
                placeholder="e.g. NEW_CMD"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded p-1 text-sm focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>
            <div className="py-1 px-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-1">
              <button 
                onClick={() => { setShowNewCmdModal(false); setNewCmdInput(''); }} 
                className="px-2 py-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={createNewCommand} 
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
};

// --- PROJECT BUILDER VIEW ---
const ProjBuild = ({ setView, nodes, setNodes }) => {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showEditRowModal, setShowEditRowModal] = useState(false);
  const [promptModal, setPromptModal] = useState({ isOpen: false, type: '', title: '', targetParent: null });
  const [newItemName, setNewItemName] = useState("");
  const [executionMode, setExecutionMode] = useState("0");
  const [manualReqNumber, setManualReqNumber] = useState("");
  
  const [draggedIndex, setDraggedIndex] = useState(null); 
  const [canvasDraggedItem, setCanvasDraggedItem] = useState(null); 
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [modalRows, setModalRows] = useState([]);

  const canvasRef = React.useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [isNodeDragging, setIsNodeDragging] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const [hoveredTargetId, setHoveredTargetId] = useState(null);

  const [editNodeModal, setEditNodeModal] = useState({ isOpen: false, nodeId: null, name: '', exec: '0', manualReq: '' });
  const [editRowData, setEditRowData] = useState({ id: null, label: '', command: 'PT0', args: ['BTN_SW2', '1200', '200', '1'] });

  const isModalOpen = showGroupModal || showEditRowModal || promptModal.isOpen || editNodeModal.isOpen;

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.2, scale + delta), 3);
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const newPan = {
        x: cursorX - (cursorX - pan.x) * (newScale / scale),
        y: cursorY - (cursorY - pan.y) * (newScale / scale)
      };
      setPan(newPan);
    }
    setScale(newScale);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isModalOpen) return;
    
    const listener = (e) => handleWheel(e);
    canvas.addEventListener('wheel', listener, { passive: false });
    return () => canvas.removeEventListener('wheel', listener);
  }, [scale, pan, isModalOpen]);

  const moveNodeSubtree = (nodeId, dx, dy, updatedNodes) => {
    if (!updatedNodes[nodeId]) return;
    updatedNodes[nodeId].x += dx;
    updatedNodes[nodeId].y += dy;
    Object.values(updatedNodes).forEach(child => {
      if (child.parentId === nodeId) {
        moveNodeSubtree(child.id, dx, dy, updatedNodes);
      }
    });
  };

  const handleGlobalMouseMove = (e) => {
    if (isPanning) {
      setPan(p => ({ x: p.x + e.clientX - lastMousePos.x, y: p.y + e.clientY - lastMousePos.y }));
    } else if (isNodeDragging && draggingNodeId) {
      const dx = (e.clientX - lastMousePos.x) / scale;
      const dy = (e.clientY - lastMousePos.y) / scale;
      
      setNodes(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        moveNodeSubtree(draggingNodeId, dx, dy, next);
        return next;
      });

      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const canvasMouseX = (e.clientX - rect.left - pan.x) / scale;
        const canvasMouseY = (e.clientY - rect.top - pan.y) / scale;

        let foundTarget = null;
        const draggedType = nodes[draggingNodeId].type;

        Object.values(nodes).forEach(n => {
          if (n.id === draggingNodeId) return;
          
          const isValid = (draggedType === 'section' && n.type === 'tab') || (draggedType === 'tab' && n.type === 'project');
          if (isValid) {
            const cx = n.x + 56;
            const cy = n.y + 48;
            const dist = Math.sqrt((cx - canvasMouseX)**2 + (cy - canvasMouseY)**2);
            if (dist < 60) {
              foundTarget = n.id;
            }
          }
        });
        
        setHoveredTargetId(foundTarget);
      }
    }
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseDown = (e) => {
    if (e.target.id === 'canvas-bg' || e.target.id === 'edges-svg') {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    setIsNodeDragging(true);
    setDraggingNodeId(nodeId);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const stopInteractions = () => {
    if (isNodeDragging && draggingNodeId && hoveredTargetId) {
      setNodes(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        next[draggingNodeId].parentId = hoveredTargetId;
        return next;
      });
    }

    setIsPanning(false);
    setIsNodeDragging(false);
    setDraggingNodeId(null);
    setHoveredTargetId(null);
  };

  const handleOpenGroupModal = (secId) => {
    setActiveSectionId(secId);
    if (nodes[secId] && nodes[secId].rows) {
      setModalRows([...nodes[secId].rows]);
      setShowGroupModal(true);
    }
  };

  const handleSaveGroupModal = () => {
    setNodes(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next[activeSectionId]) {
        next[activeSectionId].rows = modalRows;
      }
      return next;
    });
    setShowGroupModal(false);
  };

  const handleDragStart = (index) => setDraggedIndex(index);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (index) => {
    if (draggedIndex === null) return;
    const newRows = [...modalRows];
    const draggedRow = newRows.splice(draggedIndex, 1)[0];
    newRows.splice(index, 0, draggedRow);
    setModalRows(newRows);
    setDraggedIndex(null);
  };

  const handleCanvasDragStart = (e, secId, rowIndex) => {
    e.stopPropagation();
    setCanvasDraggedItem({ secId, rowIndex });
  };
  const handleCanvasDragOver = (e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };
  const handleCanvasDrop = (e, targetSecId, targetRowIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canvasDraggedItem) return;

    const sourceSecId = canvasDraggedItem.secId;
    const sourceRowIndex = canvasDraggedItem.rowIndex;

    if (sourceSecId === targetSecId && sourceRowIndex === targetRowIndex) {
      setCanvasDraggedItem(null);
      return;
    }

    setNodes(prevNodes => {
      const next = JSON.parse(JSON.stringify(prevNodes));
      const draggedRow = next[sourceSecId].rows.splice(sourceRowIndex, 1)[0];

      if (targetRowIndex !== undefined) {
        next[targetSecId].rows.splice(targetRowIndex, 0, draggedRow);
      } else {
        next[targetSecId].rows.push(draggedRow);
      }
      return next;
    });
    setCanvasDraggedItem(null);
  };

  const addRow = () => setModalRows([...modalRows, { id: Date.now(), label: "", command: "" }]);
  const removeRow = (index) => setModalRows(modalRows.filter((_, i) => i !== index));
  const updateRow = (index, field, value) => {
    const newRows = [...modalRows];
    newRows[index][field] = value;
    setModalRows(newRows);
  };

  const handleEditSection = (e, nodeId) => {
    e.stopPropagation();
    const node = nodes[nodeId];
    let execMode = node.exec;
    let manualReq = '';
    if (execMode && execMode.startsWith('Manual:')) {
      execMode = 'Manual';
      manualReq = node.exec.replace('Manual:', '').trim();
    }
    setEditNodeModal({ isOpen: true, nodeId: nodeId, name: node.name || '', exec: execMode || '0', manualReq: manualReq });
  };

  const saveEditSection = () => {
    setNodes(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next[editNodeModal.nodeId]) {
        next[editNodeModal.nodeId].name = editNodeModal.name;
        next[editNodeModal.nodeId].exec = editNodeModal.exec === 'Manual' ? `Manual: ${editNodeModal.manualReq}` : editNodeModal.exec;
      }
      return next;
    });
    setEditNodeModal({ isOpen: false, nodeId: null, name: '', exec: '0', manualReq: '' });
  };

  const deleteSection = () => {
    const node = nodes[editNodeModal.nodeId];
    if (node && node.rows && node.rows.length > 0) return; 
    
    setNodes(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      delete next[editNodeModal.nodeId];
      return next;
    });
    setEditNodeModal({ isOpen: false, nodeId: null, name: '', exec: '0', manualReq: '' });
  };

  const handleEditRow = (e, row) => {
    e.stopPropagation();
    // Parse prototype format like PT0[BTN_SW2, 1200, 200, 1] into state
    const match = row.command.match(/^([A-Z0-9_]+)\[(.*)\]$/);
    let cmd = 'PT0';
    let rowArgs = [];
    if (match) {
      cmd = match[1];
      rowArgs = match[2].split(',').map(s => s.trim());
    } else {
      cmd = row.command.split('[')[0] || 'PT0';
    }
    setEditRowData({ id: row.id, label: row.label || '', command: cmd, args: rowArgs });
    setShowEditRowModal(true);
  };

  const saveEditRow = () => {
    setNodes(prev => {
       const next = JSON.parse(JSON.stringify(prev));
       // Find and update the row in the tree
       Object.values(next).forEach(node => {
         if (node.type === 'section' && node.rows) {
           const idx = node.rows.findIndex(r => r.id === editRowData.id);
           if (idx !== -1) {
             node.rows[idx].label = editRowData.label;
             node.rows[idx].command = `${editRowData.command}[${editRowData.args.join(', ')}]`;
           }
         }
       });
       return next;
    });
    setShowEditRowModal(false);
  };

  return (
    <div 
      className={`flex-1 flex flex-col bg-slate-50 dark:bg-[#0a0f18] overflow-hidden relative transition-colors duration-200 select-none ${isPanning ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleGlobalMouseMove}
      onMouseUp={stopInteractions}
      onMouseLeave={stopInteractions}
      onContextMenu={(e) => e.preventDefault()}
      ref={canvasRef}
    >
      <div className="absolute top-2 left-2 z-20 flex gap-1">
        <button onClick={() => setScale(s => Math.min(s + 0.2, 3))} className="p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><ZoomIn size={14} /></button>
        <button onClick={() => setScale(s => Math.max(s - 0.2, 0.2))} className="p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><ZoomOut size={14} /></button>
        <button onClick={() => { setScale(1); setPan({x:0, y:0}); }} className="p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><Maximize size={14} /></button>
      </div>

      <div className="absolute top-2 right-2 z-20">
         <button onClick={() => setView('process')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold shadow-lg flex items-center gap-1">
           Compile <ArrowLeft className="rotate-180" size={12}/>
         </button>
      </div>

      <div 
        id="canvas-bg"
        className={isNodeDragging ? '' : 'cursor-grab'}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', position: 'absolute', width: '10000px', height: '10000px' }}
      >
        <svg id="edges-svg" className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="grad-project" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="grad-tab" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <linearGradient id="grad-section" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-highlight" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {Object.values(nodes).map(node => {
            if (!node.parentId || !nodes[node.parentId]) return null;
            const parent = nodes[node.parentId];
            const x1 = parent.x + 56;
            const y1 = parent.y + 48;
            const x2 = node.x + 56;
            const y2 = node.y + 48;
            const d = `M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`;
            return <path key={`edge-${node.id}`} d={d} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="2" fill="none" opacity="0.8" />
          })}
        </svg>

        {Object.values(nodes).map((node) => {
          const isDragged = draggingNodeId === node.id;
          const isHoveredTarget = hoveredTargetId === node.id;

          return (
            <div 
              key={node.id} 
              className="absolute" 
              style={{ 
                left: node.x, top: node.y, 
                width: 112, height: 96,
                zIndex: isDragged ? 50 : 10
              }}
            >
              <div className="relative group flex flex-col items-center w-full h-full">
                {node.type === 'section' && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wider absolute -top-5 whitespace-nowrap">EXEC: {node.exec}</span>
                )}
                
                <svg 
                  width="112" height="96" viewBox="0 0 112 96" 
                  className={`overflow-visible cursor-pointer ${isDragged ? 'drop-shadow-2xl opacity-80' : 'drop-shadow-xl'}`}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (node.type === 'section') handleEditSection(e, node.id);
                  }}
                >
                  <path 
                    d="M 28 4 L 84 4 L 108 48 L 84 92 L 28 92 L 4 48 Z" 
                    fill={`url(#grad-${node.type})`} 
                    filter={isHoveredTarget ? "url(#glow-highlight)" : "url(#glow)"} 
                    opacity={isHoveredTarget ? "0.9" : "0.6"} 
                  />
                  <path 
                    d="M 28 4 L 84 4 L 108 48 L 84 92 L 28 92 L 4 48 Z" 
                    fill={`url(#grad-${node.type})`} 
                    stroke={isHoveredTarget ? "#fbbf24" : "rgba(255,255,255,0.4)"} 
                    strokeWidth={isHoveredTarget ? "4" : "1"} 
                  />
                </svg>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white dark:bg-[#161b22] border border-slate-300 dark:border-slate-600 px-3 py-1 rounded shadow-lg text-slate-800 dark:text-white font-bold text-[10px] whitespace-nowrap pointer-events-none uppercase">
                  {node.name}
                </div>

                <button 
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => {
                    let targetType = 'tab';
                    if(node.type === 'tab') targetType = 'section';
                    if(node.type === 'section') targetType = 'row';
                    setPromptModal({ isOpen: true, type: targetType, title: `Create New ${targetType}`, targetParent: node.id });
                  }} 
                  className={`absolute top-0 right-0 -mr-2 -mt-1 w-5 h-5 rounded-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-500 text-slate-600 dark:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-xl z-20 hover:bg-slate-100 dark:hover:bg-slate-500 transition-all cursor-pointer ${isNodeDragging ? 'hidden' : ''}`}
                  title={`Add child to ${node.name}`}
                >
                  <Plus size={12} />
                </button>
              </div>

              {node.type === 'section' && (
                <div className="absolute top-[104px] left-1/2 -translate-x-1/2 flex items-center gap-1">
                  <div 
                    onDoubleClick={(e) => { e.stopPropagation(); handleOpenGroupModal(node.id); }} 
                    onDragOver={handleCanvasDragOver}
                    onDrop={(e) => handleCanvasDrop(e, node.id)}
                    className="bg-white/90 dark:bg-[#121822]/90 p-1 pb-4 rounded-lg border border-slate-300 dark:border-slate-700/60 min-w-[240px] shadow-2xl cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                  >
                    <div className="space-y-0.5 min-h-[30px]">
                      {node.rows.map((row, rowIndex) => (
                        <div 
                          key={row.id} 
                          draggable
                          onDragStart={(e) => handleCanvasDragStart(e, node.id, rowIndex)}
                          onDragOver={handleCanvasDragOver}
                          onDrop={(e) => handleCanvasDrop(e, node.id, rowIndex)}
                          onDoubleClick={(e) => handleEditRow(e, row)} 
                          className={`flex items-stretch bg-slate-100 dark:bg-[#23354f] border border-slate-200 dark:border-transparent h-[26px] rounded text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-sm overflow-hidden group hover:brightness-105 cursor-grab active:cursor-grabbing transition-opacity ${canvasDraggedItem?.secId === node.id && canvasDraggedItem?.rowIndex === rowIndex ? 'opacity-40 border-2 border-dashed border-slate-400' : ''}`}
                        >
                          {row.label && (
                            <div className="bg-slate-200 dark:bg-[#1b4382] text-slate-800 dark:text-blue-100 px-2 w-14 flex items-center justify-center border-r border-slate-300 dark:border-[#8ab2f8]/20 shrink-0">
                              {row.label}
                            </div>
                          )}
                          <div className="px-2 flex items-center flex-1 tracking-tight">
                            {row.command}
                          </div>
                        </div>
                      ))}
                      {node.rows.length === 0 && (
                        <div className="h-[26px] flex items-center justify-center text-slate-400 dark:text-slate-500 text-[10px] italic pointer-events-none rounded border border-dashed border-slate-300 dark:border-slate-600">
                          Drop rows here
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {promptModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="py-1 px-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{promptModal.title}</h2>
            </div>

            <div className="p-2">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">NAME (Max 12 chars)</label>
              <input 
                type="text" 
                value={newItemName}
                onChange={(e) => {
                  if (e.target.value.length <= 12) setNewItemName(e.target.value);
                }}
                placeholder={`Enter ${promptModal.type} name...`}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded p-1 text-xs focus:border-blue-500 outline-none"
                autoFocus
              />
              
              {promptModal.type === 'section' && (
                <div className="mt-1">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">EXECUTION MODE</label>
                  <select 
                    value={executionMode}
                    onChange={(e) => setExecutionMode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded p-1 text-xs focus:border-blue-500 outline-none"
                  >
                    <option value="0">0 = Immediately</option>
                    <option value="5000">5000 = 5 seconds</option>
                    <option value="Once">Once = One time only</option>
                    <option value="Manual">Manual = Request number</option>
                  </select>
                  
                  {executionMode === 'Manual' && (
                    <input 
                      type="number"
                      value={manualReqNumber}
                      onChange={(e) => setManualReqNumber(e.target.value)}
                      placeholder="Enter request number..."
                      className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded p-1 text-xs focus:border-blue-500 outline-none"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="py-1 px-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-1">
              <button 
                onClick={() => { setPromptModal({ isOpen: false, type: '', title: '', targetParent: null }); setNewItemName(''); setManualReqNumber(''); }} 
                className="px-2 py-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => { 
                  const parentNode = nodes[promptModal.targetParent];
                  const newId = `${promptModal.type}_${Date.now()}`;
                  
                  setNodes(prev => {
                    const next = JSON.parse(JSON.stringify(prev));
                    if (promptModal.type === 'tab') {
                      next[newId] = { id: newId, parentId: parentNode.id, type: 'tab', name: newItemName, x: parentNode.x + 120, y: parentNode.y + 180 };
                    } else if (promptModal.type === 'section') {
                      next[newId] = { id: newId, parentId: parentNode.id, type: 'section', name: newItemName, exec: executionMode === 'Manual' ? `Manual: ${manualReqNumber}` : executionMode, x: parentNode.x + 200, y: parentNode.y + 150, rows: [] };
                    } else if (promptModal.type === 'row') {
                      next[parentNode.id].rows.push({ id: Date.now(), label: newItemName, command: "Empty Command" });
                    }
                    return next;
                  });

                  setPromptModal({ isOpen: false, type: '', title: '', targetParent: null }); 
                  setNewItemName(''); 
                  setManualReqNumber('');
                }} 
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newItemName.trim() || (executionMode === 'Manual' && !manualReqNumber.trim())}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {editNodeModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="py-1 px-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Edit Section</h2>
            </div>

            <div className="p-2">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">NAME (Max 12 chars)</label>
              <input 
                type="text" 
                value={editNodeModal.name}
                onChange={(e) => {
                  if (e.target.value.length <= 12) setEditNodeModal(prev => ({...prev, name: e.target.value}));
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded p-1 text-xs focus:border-blue-500 outline-none"
                autoFocus
              />
              
              <div className="mt-1">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">EXECUTION MODE</label>
                <select 
                  value={editNodeModal.exec}
                  onChange={(e) => setEditNodeModal(prev => ({...prev, exec: e.target.value}))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded p-1 text-xs focus:border-blue-500 outline-none"
                >
                  <option value="0">0 = Immediately</option>
                  <option value="5000">5000 = 5 seconds</option>
                  <option value="Once">Once = One time only</option>
                  <option value="Manual">Manual = Request number</option>
                </select>
                
                {editNodeModal.exec === 'Manual' && (
                  <input 
                    type="number"
                    value={editNodeModal.manualReq}
                    onChange={(e) => setEditNodeModal(prev => ({...prev, manualReq: e.target.value}))}
                    placeholder="Enter request number..."
                    className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded p-1 text-xs focus:border-blue-500 outline-none"
                  />
                )}
              </div>
            </div>

            <div className="py-1 px-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              {(() => {
                const node = nodes[editNodeModal.nodeId];
                const hasRows = node && node.rows && node.rows.length > 0;
                return (
                  <div className="flex items-center group relative">
                    <button 
                      onClick={deleteSection}
                      disabled={hasRows}
                      className={`p-1 rounded transition-colors ${hasRows ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })()}
              
              <div className="flex gap-1">
                <button 
                  onClick={() => setEditNodeModal({ isOpen: false, nodeId: null, name: '', exec: '0', manualReq: '' })} 
                  className="px-2 py-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveEditSection} 
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!editNodeModal.name.trim() || (editNodeModal.exec === 'Manual' && !editNodeModal.manualReq.trim())}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="py-1 px-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Edit Row Group</h2>
            </div>

            <div className="p-2 space-y-0.5 max-h-[60vh] overflow-y-auto">
              {modalRows.map((row, index) => (
                <div 
                  key={row.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className={`flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/30 p-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-colors group ${draggedIndex === index ? 'opacity-40 border-dashed border-slate-400 dark:border-slate-500' : ''}`}
                >
                  <div className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 p-0.5" title="Drag to reorder">
                    <GripVertical size={14} />
                  </div>
                  
                  <span className="text-slate-500 text-[10px] w-3 text-right font-mono">{index + 1}.</span>
                  
                  <input 
                    type="text" 
                    value={row.label} 
                    onChange={(e) => updateRow(index, 'label', e.target.value)}
                    className="w-1/3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded p-1 text-xs focus:border-blue-500 outline-none" 
                    placeholder="Row Name" 
                  />
                  <input 
                    type="text" 
                    value={row.command} 
                    onChange={(e) => updateRow(index, 'command', e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded p-1 text-xs focus:border-blue-500 outline-none font-mono" 
                    placeholder="Command"
                  />
                  
                  <button onClick={() => removeRow(index)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800 p-1 rounded transition-colors" title="Delete Row">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="py-1 px-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <button onClick={addRow} className="flex items-center gap-1 text-orange-500 hover:text-orange-400 font-bold text-[11px] px-2 py-1">
                <Plus size={14} /> Add Row
              </button>
              <div className="flex gap-1">
                <button onClick={() => setShowGroupModal(false)} className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold transition-colors">Cancel</button>
                <button onClick={handleSaveGroupModal} className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-[11px] font-bold transition-colors shadow-sm">Save Group</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditRowModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2">
          <div className="bg-white dark:bg-[#121822] border border-slate-200 dark:border-slate-700 rounded-lg w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="py-1 px-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Edit Row</h2>
            </div>
            
            <div className="p-2 flex flex-col gap-2 flex-1 overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-2 shrink-0">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wider">ROW LABEL</label>
                  <input 
                    type="text" 
                    value={editRowData.label} 
                    onChange={e => setEditRowData({...editRowData, label: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded p-1 text-xs focus:border-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wider">COMMAND</label>
                  <select 
                    value={editRowData.command}
                    onChange={e => setEditRowData({...editRowData, command: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded p-1 text-xs focus:border-blue-500 outline-none"
                  >
                    <option value="PT0">PT0</option>
                    <option value="GP0">GP0</option>
                    <option value="PTI">PTI</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-1 min-h-[300px]">
                
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <div className="flex flex-col gap-1 h-full">
                    <div className="bg-slate-50 dark:bg-[#1a2332] border border-slate-200 dark:border-slate-700 rounded p-1.5 shrink-0">
                      <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wider">CONSTRUCTED</label>
                      <div className="w-full bg-white dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded p-1 text-[11px] font-mono">
                        {editRowData.command}[{editRowData.args.join(', ')}]
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-[#1a2332] border border-slate-200 dark:border-slate-700 rounded p-1.5 flex-1 flex flex-col min-h-0">
                      <div className="flex flex-col min-h-0 flex-1">
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider shrink-0">AVAILABLE PINS</label>
                        <div className="flex flex-wrap gap-1 overflow-y-auto max-h-24 content-start pr-1">
                          {['BTN_SW1', 'BTN_SW2', 'BTN_SW3', 'BTN_SW4', 'BTN_SW5', 'BTN_SW6', 'LED_P1', 'LED_P2', 'LED_P3', 'LED_P4', 'LED_P5', 'LED_P6', 'LED_P7', 'LED_P8', 'LED_P9', 'LED_P10', 'LED_P11', 'LED_P12', 'LED_P13', 'LED_P14'].map(pin => (
                            <button 
                              key={pin} 
                              onClick={() => {
                                const newArgs = [...editRowData.args];
                                if(newArgs.length > 0) newArgs[0] = pin; // Auto fill first arg for demo
                                setEditRowData({...editRowData, args: newArgs});
                              }}
                              className="bg-white dark:bg-[#2a3649] hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-[9px] font-mono px-1 py-0.5 rounded border border-slate-300 dark:border-slate-600 transition-colors"
                            >
                              {pin}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 pt-1 mt-0.5 border-t border-slate-200 dark:border-slate-700/50 flex flex-col">
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider shrink-0">LABELS</label>
                        <div className="flex flex-wrap gap-1 overflow-y-auto max-h-16 pr-1">
                          {['DSFS', 'Signal', 'uuuu', 'XXX', 'house', 'rr', 'Sini'].map(lbl => (
                            <button key={lbl} className="bg-white dark:bg-[#2a3649] hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-[9px] font-mono px-1 py-0.5 rounded border border-slate-300 dark:border-slate-600 transition-colors">{lbl}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col h-full">
                    <div className="bg-slate-50 dark:bg-[#1a2332] border border-slate-200 dark:border-slate-700 rounded p-1.5 flex flex-col flex-1 min-h-0">
                      <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wider shrink-0">DESCRIPTION</label>
                      <div className="flex-1 w-full bg-white dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 rounded p-1.5 text-[11px] font-sans overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                        {`Pulse Pin with Timer <${editRowData.command}>\n[A1]int8 Pin Output, [A2]int16 mark and [A3]int16 space in unit milli second (limited to 30 second), [A4]int8 markHigh: 0 = Low to High, 1 = High to Low.\n\n(Scroll for more details)\nAdditional execution details can be provided here.\nMake sure to review pin configurations.`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 shrink-0 items-start">
                  <div className="bg-slate-50 dark:bg-[#1a2332] border border-slate-200 dark:border-slate-700 rounded p-1.5 flex flex-col justify-center gap-1 w-full h-full">
                    <div className="flex items-center px-1.5 py-0.5 border border-yellow-600/50 rounded relative">
                       <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-16">Args#</span>
                       <div className="w-10 bg-white dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-700 text-center text-slate-800 dark:text-slate-200 rounded py-0.5 text-[10px] font-mono">{editRowData.args.length}</div>
                       <div className="absolute right-2 text-yellow-500 text-sm leading-none">♦</div>
                    </div>
                    <div className="flex items-center px-1.5 py-0.5">
                       <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-16">Ints#</span>
                       <div className="w-10 bg-white dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-700 text-center text-slate-800 dark:text-slate-200 rounded py-0.5 text-[10px] font-mono">0</div>
                    </div>
                    <div className="flex items-center px-1.5 py-0.5">
                       <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-16">Rets#</span>
                       <div className="w-10 bg-white dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-700 text-center text-slate-800 dark:text-slate-200 rounded py-0.5 text-[10px] font-mono">0</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#1a2332] border border-slate-200 dark:border-slate-700 rounded p-1.5 w-full overflow-y-auto max-h-36">
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">ARGUMENTS</label>
                    <div className="space-y-0.5">
                      {editRowData.args.map((arg, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <span className="text-slate-500 text-[10px] w-4 font-mono">A{idx+1}</span>
                          <span className="text-orange-500 dark:text-orange-400 text-[10px] w-8 font-mono font-bold">int8</span>
                          <span className="text-blue-600 dark:text-blue-400 text-[10px] w-12 font-mono truncate" title="pinOutput">arg_{idx}</span>
                          <input 
                            type="text" 
                            value={arg} 
                            onChange={e => {
                              const newArgs = [...editRowData.args];
                              newArgs[idx] = e.target.value;
                              setEditRowData({...editRowData, args: newArgs});
                            }}
                            className="flex-1 bg-white dark:bg-[#0a0f18] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded p-0.5 text-xs focus:border-blue-500 outline-none font-mono" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="py-1 px-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
              <button className="text-slate-500 hover:text-red-500 p-1 transition-colors" title="Delete Row"><Trash2 size={14}/></button>
              <div className="flex gap-1">
                <button onClick={() => setShowEditRowModal(false)} className="px-3 py-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-100 dark:bg-slate-800 text-[11px] font-bold transition-colors">Cancel</button>
                <button onClick={saveEditRow} className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-[11px] font-bold transition-colors shadow-sm">Save Row</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- PROCESS MODULE VIEW ---
const ProcessView = ({ nodes }) => {
  const [activeRow, setActiveRow] = useState(null);
  const [collapsedNodes, setCollapsedNodes] = useState({});

  const toggleNode = (id) => {
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const firstTab = Object.values(nodes).find(n => n.type === 'tab');
    if (firstTab) {
      const firstSec = Object.values(nodes).find(n => n.parentId === firstTab.id && n.type === 'section');
      if (firstSec && firstSec.rows && firstSec.rows.length > 0) {
        setActiveRow(firstSec.rows[0]);
      }
    }
  }, [nodes]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0f172a] p-1 gap-1 overflow-hidden transition-colors duration-200">
      
      {/* Top Composer Bar */}
      <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-1.5 font-mono text-xs text-green-600 dark:text-green-400 flex items-center gap-2 transition-colors">
        <span className="text-slate-500 text-[10px] uppercase tracking-widest font-sans font-bold">Row View:</span>
        {activeRow ? `${activeRow.label ? activeRow.label + ':' : ''}${activeRow.command}` : 'Select a row to view...'}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-1 min-h-0">
        
        {/* Left Panel: Tree View */}
        <div className="col-span-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-colors">
          <div className="bg-slate-100 dark:bg-slate-900/50 p-1 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center transition-colors">
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">View</span>
          </div>
          <div className="p-1 overflow-y-auto text-xs space-y-0 font-mono">
            
            {Object.values(nodes).filter(n => n.type === 'tab').map(tab => {
              const isTabCollapsed = !!collapsedNodes[tab.id];

              return (
                <div key={tab.id} className="mb-1">
                  <div className="flex items-baseline text-pink-600 dark:text-pink-500 font-bold mb-0.5">
                    <span 
                      onClick={() => toggleNode(tab.id)}
                      className="cursor-pointer w-4 inline-block text-center mr-0.5 select-none hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded transition-colors"
                    >
                      {isTabCollapsed ? '+' : '-'}
                    </span>
                    <span>{tab.name}</span>
                  </div>
                  
                  {!isTabCollapsed && (
                    <div className="pl-3">
                      {Object.values(nodes).filter(n => n.parentId === tab.id && n.type === 'section').map(sec => {
                        const isSecCollapsed = !!collapsedNodes[sec.id];
                        
                        return (
                          <div key={sec.id} className="mt-0.5">
                            <div className="flex items-baseline text-emerald-600 dark:text-emerald-500 mb-0.5">
                              <span 
                                onClick={() => toggleNode(sec.id)}
                                className="cursor-pointer w-4 inline-block text-center mr-0.5 select-none hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded transition-colors"
                              >
                                {isSecCollapsed ? '+' : '-'}
                              </span>
                              <span>{sec.name} <span className="text-slate-500 text-[10px] font-normal">({sec.exec})</span></span>
                            </div>
                            
                            {!isSecCollapsed && (
                              <div>
                                {sec.rows.map((row, idx) => (
                                  <div 
                                    key={row.id} 
                                    onClick={() => setActiveRow(row)}
                                    className={`pl-2 py-0.5 cursor-pointer flex gap-1 ${activeRow?.id === row.id ? 'bg-blue-100 dark:bg-blue-900/40 border-l-2 border-blue-500 dark:border-blue-400 text-slate-800 dark:text-slate-200' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded text-slate-500 dark:text-slate-400'}`}
                                  >
                                    <span className="text-slate-400 dark:text-slate-600 w-3 font-mono text-right shrink-0">{idx + 1}</span>
                                    <span className="w-10 text-blue-500 dark:text-blue-400 truncate shrink-0" title={row.label}>{row.label}</span>
                                    <span className="flex-1 font-mono text-[10px] leading-tight flex flex-wrap">{row.command}</span>
                                  </div>
                                ))}
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
        <div className="col-span-4 flex flex-col gap-1">
          <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex-1 flex flex-col overflow-hidden transition-colors">
            <div className="bg-slate-100 dark:bg-slate-900/50 p-1 border-b border-slate-200 dark:border-slate-700 transition-colors">
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Used Command</span>
            </div>
            
            <div className="p-1 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-[10px] text-slate-600 dark:text-slate-400 space-y-0 transition-colors">
              <div className="flex gap-2 px-1 py-0"><span className="w-6">GP0</span><span>GP0: int8 (int8, int16) int8</span></div>
              <div className="flex gap-2 px-1 py-0 bg-blue-600 text-white rounded"><span className="w-6 font-bold">PT0</span><span>PT0 (int8, int16, int16, int8) int8, uint32</span></div>
              <div className="flex gap-2 px-1 py-0"><span className="w-6">PTI</span><span>PTI: int8 (int8, str, *)</span></div>
            </div>

            <div className="p-1.5 bg-slate-100 dark:bg-slate-100/10 rounded m-1 flex-1 overflow-y-auto">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-[11px] mb-1">Description</h4>
              <p className="text-[10px] text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap leading-tight">
                Put Pin &lt;PT0&gt;{'\n'}
                Set the state of the targeted output pin. {'\n'}
                Arg1 requires hardware pin macro. {'\n'}
                Arg2 defines duration (ms).
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 h-20 flex flex-col overflow-hidden transition-colors">
            <div className="bg-slate-100 dark:bg-slate-900/50 p-1 border-b border-slate-200 dark:border-slate-700 transition-colors">
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Used Pins</span>
            </div>
            <div className="p-1 flex flex-wrap gap-1 overflow-y-auto content-start">
              <span className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[9px] px-1 py-0.5 rounded flex items-center gap-1 transition-colors"><Cpu size={10} className="text-slate-500"/> BTN_SW2</span>
              <span className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[9px] px-1 py-0.5 rounded flex items-center gap-1 transition-colors"><Cpu size={10} className="text-slate-500"/> LED_P6</span>
              <span className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[9px] px-1 py-0.5 rounded flex items-center gap-1 transition-colors"><Cpu size={10} className="text-slate-500"/> LED_P8</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Hex View */}
        <div className="col-span-5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-colors">
          <div className="bg-slate-100 dark:bg-slate-900/50 p-1 border-b border-slate-200 dark:border-slate-700 transition-colors">
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Hex View</span>
          </div>
          <div className="p-1.5 overflow-y-auto font-mono text-[9px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#0f172a] flex-1 transition-colors">
             <div className="flex gap-1 mb-1 text-blue-600 dark:text-blue-400 font-bold border-b border-slate-200 dark:border-slate-700 pb-1">
                <div className="w-12">OFFSET</div>
                <div className="flex-1 flex justify-between tracking-widest">0 1 2 3 4 5 6 7 8 9 A B C D E F</div>
                <div className="w-20 text-right">ASCII</div>
             </div>
             
             <div className="flex gap-1 hover:bg-slate-200 dark:hover:bg-slate-800/50 py-0 rounded transition-colors">
               <div className="w-12 text-slate-400 dark:text-slate-500">00000000</div>
               <div className="flex-1 flex justify-between text-slate-700 dark:text-slate-300 tracking-widest">50 54 30 00 03 00 00 00 02 00 00 00 00 00 00 00</div>
               <div className="w-20 text-right text-slate-400 dark:text-slate-500 tracking-widest">PT0.........</div>
             </div>
             <div className="flex gap-1 hover:bg-slate-200 dark:hover:bg-slate-800/50 py-0 rounded transition-colors">
               <div className="w-12 text-slate-400 dark:text-slate-500">00000010</div>
               <div className="flex-1 flex justify-between text-slate-700 dark:text-slate-300 tracking-widest">47 50 30 00 02 00 00 00 02 00 00 00 01 00 00 00</div>
               <div className="w-20 text-right text-slate-400 dark:text-slate-500 tracking-widest">GP0.........</div>
             </div>
             <div className="flex gap-1 hover:bg-slate-200 dark:hover:bg-slate-800/50 py-0 rounded transition-colors">
               <div className="w-12 text-slate-400 dark:text-slate-500">00000020</div>
               <div className="flex-1 flex justify-between text-slate-700 dark:text-slate-300 tracking-widest">FF FF FF FF 00 00 00 00 00 00 00 00 00 00 00 00</div>
               <div className="w-20 text-right text-slate-400 dark:text-slate-500 tracking-widest">............</div>
             </div>
             
             <div className="flex gap-1 hover:bg-slate-200 dark:hover:bg-slate-800/50 py-0 rounded transition-colors">
               <div className="w-12 text-slate-400 dark:text-slate-500">00000030</div>
               <div className="flex-1 flex justify-between text-slate-700 dark:text-slate-300 tracking-widest">50 54 30 00 03 00 00 00 02 00 00 00 00 00 00 00</div>
               <div className="w-20 text-right text-slate-400 dark:text-slate-500 tracking-widest">PT0.........</div>
             </div>
             <div className="flex gap-1 hover:bg-slate-200 dark:hover:bg-slate-800/50 py-0 rounded transition-colors">
               <div className="w-12 text-slate-400 dark:text-slate-500">00000040</div>
               <div className="flex-1 flex justify-between text-slate-700 dark:text-slate-300 tracking-widest">47 50 30 00 02 00 00 00 02 00 00 00 01 00 00 00</div>
               <div className="w-20 text-right text-slate-400 dark:text-slate-500 tracking-widest">GP0.........</div>
             </div>
             <div className="flex gap-1 hover:bg-slate-200 dark:hover:bg-slate-800/50 py-0 rounded transition-colors">
               <div className="w-12 text-slate-400 dark:text-slate-500">00000050</div>
               <div className="flex-1 flex justify-between text-slate-700 dark:text-slate-300 tracking-widest">FF FF FF FF 00 00 00 00 00 00 00 00 00 00 00 00</div>
               <div className="w-20 text-right text-slate-400 dark:text-slate-500 tracking-widest">............</div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('proj'); // 'hub', 'func', 'proj', 'process'
  const [usbConnected, setUsbConnected] = useState(true);
  const [fontSize, setFontSize] = useState(1.0);
  const [theme, setTheme] = useState('dark');
  const [nodes, setNodes] = useState(INITIAL_NODES); 

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize * 16}px`;
  }, [fontSize]);

  return (
    <div className={`${theme} transition-colors duration-200`}>
      <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-[#0a0f18] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 overflow-x-hidden">
        <GlobalHeader 
          view={view} 
          setView={setView} 
          usbConnected={usbConnected} 
          fontSize={fontSize} 
          setFontSize={setFontSize} 
          theme={theme}
          toggleTheme={toggleTheme}
        />
        
        {view === 'hub' && <MainHub setView={setView} setUsbConnected={setUsbConnected} usbConnected={usbConnected} />}
        {view === 'func' && <FuncBuild />}
        {view === 'proj' && <ProjBuild setView={setView} nodes={nodes} setNodes={setNodes} />}
        {view === 'process' && <ProcessView nodes={nodes} />}

      </div>
    </div>
  );
}