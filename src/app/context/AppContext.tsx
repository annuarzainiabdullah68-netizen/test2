'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// --- MOCK REGISTRY & DATA ---
export interface RegistryEntry {
  Cmd: string;
  x: number;
  y: number;
  z: number;
  desc: string;
}

export const MOCK_REGISTRY: RegistryEntry[] = [
  { Cmd: "PT0", x: 3, y: 2, z: 0, desc: "Put Pin <PT0>\nSet Pin State." },
  { Cmd: "GP0", x: 2, y: 2, z: 1, desc: "Get Pin <GP0>\nSample [A1]int8 Pin as Input..." },
  { Cmd: "RTP", x: 3, y: 1, z: 0, desc: "Read Timer/Pulse" },
  { Cmd: "WFI", x: 1, y: 1, z: 0, desc: "Wait for Interrupt" },
  { Cmd: "PCN", x: 3, y: 4, z: 1, desc: "Pulse Counter" }
];

export interface RowItem {
  id: number;
  label: string;
  command: string;
}

export interface NodeItem {
  id: string;
  type: 'project' | 'tab' | 'section';
  name: string;
  x: number;
  y: number;
  parentId?: string;
  exec?: string;
  rows?: RowItem[];
}

export const INITIAL_NODES: Record<string, NodeItem> = {
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

export interface HexLine {
  offset: string;
  bytes: string;
  ascii: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  remark: string;
  lastEdit: string;
  nodes: Record<string, NodeItem>;
}

export const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: 'proj_1',
    name: 'Test Out',
    remark: 'Demo project showing peripheral outputs and counters',
    lastEdit: '2026-06-19 18:00:00',
    nodes: INITIAL_NODES
  }
];


interface AppContextType {
  usbConnected: boolean;
  setUsbConnected: (val: boolean) => void;
  fontSize: number;
  setFontSize: (val: number | ((prev: number) => number)) => void;
  theme: 'dark' | 'light';
  setTheme: (val: 'dark' | 'light' | ((prev: 'dark' | 'light') => 'dark' | 'light')) => void;
  nodes: Record<string, NodeItem>;
  setNodes: React.Dispatch<React.SetStateAction<Record<string, NodeItem>>>;
  registry: RegistryEntry[];
  setRegistry: React.Dispatch<React.SetStateAction<RegistryEntry[]>>;
  activeRow: RowItem | null;
  setActiveRow: (row: RowItem | null) => void;
  getCompiledHex: (row: RowItem | null) => HexLine[];
  
  projects: ProjectItem[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectItem[]>>;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  createProject: (name: string, remark: string) => void;
  deleteProject: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [usbConnected, setUsbConnected] = useState<boolean>(false);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('esp32_projects');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse stored projects", e);
        }
      }
    }
    return DEFAULT_PROJECTS;
  });

  const setActiveProjectId = (id: string | null) => {
    setActiveProjectIdState(id);
    if (id) {
      const proj = projects.find(p => p.id === id);
      if (proj) {
        setNodes(proj.nodes);
        // Find the first row in the new nodes to set activeRow
        const firstTab = Object.values(proj.nodes).find(n => n.type === 'tab');
        if (firstTab) {
          const firstSec = Object.values(proj.nodes).find(n => n.parentId === firstTab.id && n.type === 'section');
          if (firstSec && firstSec.rows && firstSec.rows.length > 0) {
            setActiveRow(firstSec.rows[0]);
            return;
          }
        }
      }
    }
    setActiveRow(null);
  };

  const createProject = (name: string, remark: string) => {
    const projId = `proj_${Date.now()}`;
    const tabId = `tab_${Date.now()}`;
    const newProjNodes: Record<string, NodeItem> = {
      [projId]: { id: projId, type: 'project', name: name, x: 100, y: 100 },
      [tabId]: { id: tabId, parentId: projId, type: 'tab', name: 'TAB1', x: 220, y: 280 }
    };
    
    const now = new Date();
    const formattedDate = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + ' ' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0') + ':' + 
      String(now.getSeconds()).padStart(2, '0');

    const newProject: ProjectItem = {
      id: projId,
      name,
      remark,
      lastEdit: formattedDate,
      nodes: newProjNodes
    };

    setProjects(prev => {
      const next = [newProject, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('esp32_projects', JSON.stringify(next));
      }
      return next;
    });
  };

  const deleteProject = (id: string) => {
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('esp32_projects', JSON.stringify(next));
      }
      return next;
    });
    if (activeProjectId === id) {
      setActiveProjectIdState(null);
      setNodes({});
      setActiveRow(null);
    }
  };

  const [activeRow, setActiveRow] = useState<RowItem | null>(null);
  
  // Lazy State Initializations for local storage
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedFontSize = localStorage.getItem('esp32_font_size');
      if (storedFontSize) {
        const parsed = parseFloat(storedFontSize);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 1.0;
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('esp32_theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
      }
    }
    return 'dark';
  });

  const [nodes, setNodes] = useState<Record<string, NodeItem>>({});


  const [registry, setRegistry] = useState<RegistryEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const storedRegistry = localStorage.getItem('esp32_registry');
      if (storedRegistry) {
        try {
          return JSON.parse(storedRegistry);
        } catch (e) {
          console.error("Failed to parse stored registry", e);
        }
      }
    }
    return MOCK_REGISTRY;
  });

  // Compile active row command into simulated binary/hex representation
  const getCompiledHex = (row: RowItem | null): HexLine[] => {
    if (!row) {
      return [
        { offset: '00000000', bytes: '00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00', ascii: '................' }
      ];
    }
    const cmdMatch = row.command.match(/^([A-Z0-9_]+)\[(.*)\]$/);
    const cmdName = cmdMatch ? cmdMatch[1] : (row.command.split('[')[0] || 'CMD');
    const argsStr = cmdMatch ? cmdMatch[2] : '';
    const args = argsStr.split(',').map(s => s.trim()).filter(Boolean);

    // Build command bytes
    const cmdBytes = Array.from(cmdName).map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase());
    while (cmdBytes.length < 4) cmdBytes.push('00'); // Pad command name to 4 bytes

    // Build argument bytes
    const argBytes: string[] = [];
    args.forEach(arg => {
      if (arg.startsWith('BTN_') || arg.startsWith('LED_') || arg.startsWith('GPIO_')) {
        const num = parseInt(arg.replace(/[^0-9]/g, ''), 10) || 8;
        argBytes.push(num.toString(16).padStart(2, '0').toUpperCase());
      } else {
        const numVal = parseInt(arg, 10);
        if (!isNaN(numVal)) {
          if (numVal > 255 || numVal < 0) {
            const high = ((numVal >> 8) & 0xff).toString(16).padStart(2, '0').toUpperCase();
            const low = (numVal & 0xff).toString(16).padStart(2, '0').toUpperCase();
            argBytes.push(high, low);
          } else {
            argBytes.push(numVal.toString(16).padStart(2, '0').toUpperCase());
          }
        } else if (arg === '~' || !arg) {
          argBytes.push('00');
        } else {
          Array.from(arg).forEach(char => {
            argBytes.push(char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase());
          });
        }
      }
    });

    // Combine payload bytes
    const payload = [...cmdBytes, ...argBytes];
    // Pad to 48 bytes (3 lines of 16 bytes)
    while (payload.length < 48) {
      payload.push('00');
    }

    const rows = [];
    for (let i = 0; i < 3; i++) {
      const offset = (i * 16).toString(16).padStart(8, '0').toUpperCase();
      const block = payload.slice(i * 16, (i + 1) * 16);
      const bytes = block.join(' ');
      const ascii = block.map(hex => {
        const code = parseInt(hex, 16);
        if (code >= 32 && code <= 126) {
          return String.fromCharCode(code);
        }
        return '.';
      }).join('');
      rows.push({ offset, bytes, ascii });
    }
    return rows;
  };

  // Synchronize nodes updates with projects list
  useEffect(() => {
    if (activeProjectId && nodes && Object.keys(nodes).length > 0) {
      setProjects(prev => {
        const index = prev.findIndex(p => p.id === activeProjectId);
        if (index !== -1 && JSON.stringify(prev[index].nodes) !== JSON.stringify(nodes)) {
          const now = new Date();
          const formattedDate = now.getFullYear() + '-' + 
            String(now.getMonth() + 1).padStart(2, '0') + '-' + 
            String(now.getDate()).padStart(2, '0') + ' ' + 
            String(now.getHours()).padStart(2, '0') + ':' + 
            String(now.getMinutes()).padStart(2, '0') + ':' + 
            String(now.getSeconds()).padStart(2, '0');

          const updatedProjects = [...prev];
          updatedProjects[index] = {
            ...updatedProjects[index],
            lastEdit: formattedDate,
            nodes: nodes
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem('esp32_projects', JSON.stringify(updatedProjects));
          }
          return updatedProjects;
        }
        return prev;
      });
    }
  }, [nodes, activeProjectId]);


  useEffect(() => {
    localStorage.setItem('esp32_registry', JSON.stringify(registry));
  }, [registry]);

  useEffect(() => {
    localStorage.setItem('esp32_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('esp32_font_size', fontSize.toString());
  }, [fontSize]);

  // Listen for Web Serial physical board connection and disconnection events
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      // Check for already paired devices on application mount
      (navigator as any).serial.getPorts().then((ports: any[]) => {
        if (ports && ports.length > 0) {
          setUsbConnected(true);
        }
      }).catch((err: any) => {
        console.warn("Failed to check pre-paired ports on mount:", err);
      });

      const handleDisconnect = () => {
        setUsbConnected(false);
      };
      
      const handleConnect = () => {
        setUsbConnected(true);
      };

      (navigator as any).serial.addEventListener('disconnect', handleDisconnect);
      (navigator as any).serial.addEventListener('connect', handleConnect);

      return () => {
        (navigator as any).serial.removeEventListener('disconnect', handleDisconnect);
        (navigator as any).serial.removeEventListener('connect', handleConnect);
      };
    }
  }, []);


  return (
    <AppContext.Provider value={{
      usbConnected, setUsbConnected,
      fontSize, setFontSize,
      theme, setTheme,
      nodes, setNodes,
      registry, setRegistry,
      activeRow, setActiveRow,
      getCompiledHex,
      
      projects, setProjects,
      activeProjectId, setActiveProjectId,
      createProject,
      deleteProject
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
}
