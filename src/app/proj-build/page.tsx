'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, NodeItem, RowItem } from '../context/AppContext';
import { 
  Plus, Trash2, Maximize, ZoomIn, ZoomOut, GripVertical, Cpu 
} from 'lucide-react';

interface EditRowState {
  id: number | null;
  label: string;
  command: string;
  args: string[];
}

interface EditNodeState {
  isOpen: boolean;
  nodeId: string | null;
  name: string;
  exec: string;
  manualReq: string;
}

interface PromptModalState {
  isOpen: boolean;
  type: 'tab' | 'section' | 'row' | '';
  title: string;
  targetParent: string | null;
}

export default function ProjBuild() {
  const router = useRouter();
  const { 
    nodes, setNodes, registry, usbConnected, setUsbConnected,
    projects, setProjects, activeProjectId, setActiveProjectId, createProject, deleteProject 
  } = useApp();

  useEffect(() => {
    if (!usbConnected) {
      router.replace('/');
    }
  }, [usbConnected, router]);

  // --- PROJECT SELECTION STATE ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjRemark, setNewProjRemark] = useState("");

  // --- PROJECT EDITING STATE ---
  const [editProjectData, setEditProjectData] = useState({
    isOpen: false,
    projId: '',
    name: '',
    remark: ''
  });

  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
  const [showEditRowModal, setShowEditRowModal] = useState<boolean>(false);
  const [promptModal, setPromptModal] = useState<PromptModalState>({ isOpen: false, type: '', title: '', targetParent: null });
  const [newItemName, setNewItemName] = useState<string>('');
  const [executionMode, setExecutionMode] = useState<string>('0');
  const [manualReqNumber, setManualReqNumber] = useState<string>('');
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null); 
  const [canvasDraggedItem, setCanvasDraggedItem] = useState<{ secId: string; rowIndex: number } | null>(null); 
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [modalRows, setModalRows] = useState<RowItem[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isNodeDragging, setIsNodeDragging] = useState<boolean>(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  const [editNodeModal, setEditNodeModal] = useState<EditNodeState>({ isOpen: false, nodeId: null, name: '', exec: '0', manualReq: '' });
  const [editRowData, setEditRowData] = useState<EditRowState>({ id: null, label: '', command: 'PT0', args: [] });

  const isModalOpen = showGroupModal || showEditRowModal || promptModal.isOpen || editNodeModal.isOpen;

  const handleWheel = React.useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.3, scale + delta), 2.5);
    
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
  }, [scale, pan]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isModalOpen) return;
    
    const listener = (e: WheelEvent) => handleWheel(e);
    canvas.addEventListener('wheel', listener, { passive: false });
    return () => canvas.removeEventListener('wheel', listener);
  }, [isModalOpen, handleWheel]);

  const handleEditProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjectData.name.trim()) return;
    if (editProjectData.name.length > 12) {
      alert("Project Name must be 12 characters or less.");
      return;
    }

    const now = new Date();
    const formattedDate = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + ' ' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0') + ':' + 
      String(now.getSeconds()).padStart(2, '0');

    setProjects(prev => {
      const next = prev.map(p => {
        if (p.id === editProjectData.projId) {
          const updatedNodes = { ...p.nodes };
          if (updatedNodes[p.id]) {
            updatedNodes[p.id] = {
              ...updatedNodes[p.id],
              name: editProjectData.name.trim()
            };
          }
          return {
            ...p,
            name: editProjectData.name.trim(),
            remark: editProjectData.remark.trim(),
            lastEdit: formattedDate,
            nodes: updatedNodes
          };
        }
        return p;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('esp32_projects', JSON.stringify(next));
      }
      return next;
    });

    setEditProjectData({ isOpen: false, projId: '', name: '', remark: '' });
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    if (newProjName.length > 12) {
      alert("Project Name must be 12 characters or less.");
      return;
    }
    createProject(newProjName.trim(), newProjRemark.trim());
    setNewProjName("");
    setNewProjRemark("");
    setShowCreateModal(false);
  };

  const handleExit = () => {
    setUsbConnected(false);
    router.push('/');
  };

  if (!activeProjectId) {
    // Sort projects by lastEdit descending
    const sortedProjects = [...projects].sort((a, b) => b.lastEdit.localeCompare(a.lastEdit));

    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0a0f18] p-6 transition-colors duration-200">
        <div className="w-full max-w-4xl bg-white dark:bg-[#121824] rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col h-[520px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          
          {/* Header Bar */}
          <div className="border-b border-slate-200 dark:border-slate-800/80 px-6 py-5 flex items-center justify-between shrink-0 select-none bg-slate-50/50 dark:bg-[#161f30]/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-lg">
                <Cpu size={20} />
              </div>
              <div className="text-left">
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-wide uppercase">
                  Project Builder
                </h2>
                <p className="text-[0.625rem] text-slate-500 dark:text-slate-400 font-medium">Select an existing execution workspace or configure a new flow</p>
              </div>
            </div>
          </div>

          {/* Main Card Area */}
          <div className="flex-1 bg-white dark:bg-[#121824] p-6 flex flex-col min-h-0 select-text">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-widest select-none text-left">
              Project List
            </h3>

            {/* Table Container */}
            <div className="flex-1 border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden flex flex-col bg-slate-50/50 dark:bg-[#0a0f18]/30 min-h-0 shadow-sm">
              
              {/* Table Headers */}
              <div className="flex bg-slate-100 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-800/60 py-3 px-5 font-bold text-[0.625rem] text-[#d97706] dark:text-amber-500 uppercase tracking-wider select-none">
                <div className="w-[30%] text-left">Project Name</div>
                <div className="w-[45%] px-2 text-left">Remark</div>
                <div className="w-[20%] text-right">Last Edit</div>
                <div className="w-[5%]"></div>
              </div>

              {/* Table Body (Limited to 7 items/lines, scrollbar if needed) */}
              <div className="flex-1 overflow-y-auto max-h-[260px] divide-y divide-slate-150 dark:divide-slate-800/60">
                {sortedProjects.map((proj) => (
                  <div 
                    key={proj.id}
                    onDoubleClick={() => setActiveProjectId(proj.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditProjectData({
                        isOpen: true,
                        projId: proj.id,
                        name: proj.name,
                        remark: proj.remark || ''
                      });
                    }}
                    className="relative flex py-3.5 px-5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/30 cursor-pointer font-medium transition-all items-center group"
                    title={proj.remark ? `Remark: ${proj.remark}\n\nDouble-click to open · Right-click to edit` : "Double-click to open · Right-click to edit"}
                  >
                    {/* Left hover indicator bar */}
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#d97706] dark:bg-amber-500 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

                    <div className="w-[30%] font-bold text-slate-800 dark:text-slate-100 truncate pr-2 uppercase tracking-wide text-left flex items-center gap-1.5">
                      {proj.name}
                    </div>
                    <div className="w-[45%] px-2 text-slate-500 dark:text-slate-400 truncate text-left" title={proj.remark || ''}>
                      {proj.remark
                        ? proj.remark.split('\n')[proj.remark.split('\n').length - 1].trim() || proj.remark.trim()
                        : <span className="italic opacity-30">No description provided</span>
                      }
                    </div>
                    <div className="w-[20%] text-right font-mono text-[0.625rem] text-slate-400 dark:text-slate-500 shrink-0">
                      {proj.lastEdit}
                    </div>
                    <div className="w-[5%] text-right shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete project "${proj.name}"?`)) {
                            deleteProject(proj.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded-md transition-all cursor-pointer hover:bg-red-50 dark:hover:bg-red-955/20"
                        title="Delete Project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {sortedProjects.length === 0 && (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 italic select-none">
                    No projects found. Click "New" to create your first execution workflow.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 mt-5 shrink-0 select-none">
              <button 
                onClick={handleExit}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl transition-all cursor-pointer hover:border-slate-350 dark:hover:border-slate-700"
                title="Disconnect USB & return to Main Hub"
              >
                Exit
              </button>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer"
                title="Create a new workflow project"
              >
                <Plus size={14} />
                New Project
              </button>
            </div>

          </div>
        </div>

        {/* CREATE PROJECT MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form 
              onSubmit={handleCreateProjectSubmit}
              className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="py-4 px-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0c121e]">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Create New Project</h2>
              </div>
              
              <div className="p-5 space-y-4 text-left">
                <div>
                  <label className="block text-[0.625rem] font-extrabold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-widest">
                    Project Name (Max 12 characters)
                  </label>
                  <input 
                    type="text" 
                    required
                    maxLength={12}
                    value={newProjName}
                    onChange={(e) => {
                      if (e.target.value.length <= 12) {
                        setNewProjName(e.target.value);
                      }
                    }}
                    placeholder="e.g. BLINK_LED"
                    className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl p-2.5 text-xs focus:border-emerald-500 outline-none font-bold uppercase shadow-sm transition-all focus:ring-2 focus:ring-emerald-500/20"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[0.625rem] font-extrabold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-widest">
                    Remark / Description
                  </label>
                  <textarea 
                    value={newProjRemark}
                    onChange={(e) => setNewProjRemark(e.target.value)}
                    placeholder="Enter project description (optional)..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl p-2.5 text-xs focus:border-emerald-500 outline-none shadow-sm font-medium resize-none transition-all focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="py-3 px-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0c121e] flex justify-end gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => { setShowCreateModal(false); setNewProjName(""); setNewProjRemark(""); }} 
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newProjName.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        )}

        {/* EDIT PROJECT MODAL */}
        {editProjectData.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form 
              onSubmit={handleEditProjectSubmit}
              className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="py-4 px-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0c121e]">
                <h2 className="text-sm font-bold text-slate-850 dark:text-slate-100">Edit Project Details</h2>
              </div>
              
              <div className="p-5 space-y-4 text-left">
                <div>
                  <label className="block text-[0.625rem] font-extrabold text-slate-400 dark:text-slate-505 mb-1.5 uppercase tracking-widest text-left">
                    Project Name (Max 12 characters)
                  </label>
                  <input 
                    type="text" 
                    required
                    maxLength={12}
                    value={editProjectData.name}
                    onChange={(e) => {
                      if (e.target.value.length <= 12) {
                        setEditProjectData(prev => ({ ...prev, name: e.target.value }));
                      }
                    }}
                    placeholder="e.g. BLINK_LED"
                    className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl p-2.5 text-xs focus:border-emerald-500 outline-none font-bold uppercase shadow-sm transition-all focus:ring-2 focus:ring-emerald-500/20"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[0.625rem] font-extrabold text-slate-400 dark:text-slate-505 mb-1.5 uppercase tracking-widest text-left">
                    Remark / Description
                  </label>
                  <textarea 
                    value={editProjectData.remark}
                    onChange={(e) => setEditProjectData(prev => ({ ...prev, remark: e.target.value }))}
                    placeholder="Enter project description..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl p-2.5 text-xs focus:border-emerald-500 outline-none shadow-sm font-medium resize-none transition-all focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="py-3 px-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0c121e] flex justify-end gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => setEditProjectData({ isOpen: false, projId: '', name: '', remark: '' })} 
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!editProjectData.name.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  const moveNodeSubtree = (nodeId: string, dx: number, dy: number, updatedNodes: Record<string, NodeItem>) => {
    if (!updatedNodes[nodeId]) return;
    updatedNodes[nodeId].x += dx;
    updatedNodes[nodeId].y += dy;
    Object.values(updatedNodes).forEach(child => {
      if (child.parentId === nodeId) {
        moveNodeSubtree(child.id, dx, dy, updatedNodes);
      }
    });
  };

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
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

        let foundTarget: string | null = null;
        const draggedType = nodes[draggingNodeId].type;

        Object.values(nodes).forEach(n => {
          if (n.id === draggingNodeId) return;
          
          const isValid = (draggedType === 'section' && n.type === 'tab') || (draggedType === 'tab' && n.type === 'project');
          if (isValid) {
            const cx = n.x + 56;
            const cy = n.y + 48;
            const dist = Math.sqrt((cx - canvasMouseX) ** 2 + (cy - canvasMouseY) ** 2);
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

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.id === 'canvas-bg' || target.id === 'edges-svg' || target.tagName === 'svg') {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
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

  const handleOpenGroupModal = (secId: string) => {
    setActiveSectionId(secId);
    if (nodes[secId] && nodes[secId].rows) {
      setModalRows([...(nodes[secId].rows || [])]);
      setShowGroupModal(true);
    }
  };

  const handleSaveGroupModal = () => {
    if (activeSectionId) {
      setNodes(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        if (next[activeSectionId]) {
          next[activeSectionId].rows = modalRows;
        }
        return next;
      });
    }
    setShowGroupModal(false);
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (index: number) => {
    if (draggedIndex === null) return;
    const newRows = [...modalRows];
    const draggedRow = newRows.splice(draggedIndex, 1)[0];
    newRows.splice(index, 0, draggedRow);
    setModalRows(newRows);
    setDraggedIndex(null);
  };

  const handleCanvasDragStart = (e: React.DragEvent, secId: string, rowIndex: number) => {
    e.stopPropagation();
    setCanvasDraggedItem({ secId, rowIndex });
  };
  
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleCanvasDrop = (e: React.DragEvent, targetSecId: string, targetRowIndex?: number) => {
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

  const addRow = () => setModalRows([...modalRows, { id: Date.now(), label: "New", command: "PT0[BTN_SW1, 1000]" }]);
  const removeRow = (index: number) => setModalRows(modalRows.filter((_, i) => i !== index));
  const updateRow = (index: number, field: 'label' | 'command', value: string) => {
    const newRows = [...modalRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setModalRows(newRows);
  };

  const handleEditSection = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes[nodeId];
    let execMode = node.exec || '0';
    let manualReq = '';
    if (execMode.startsWith('Manual:')) {
      execMode = 'Manual';
      manualReq = node.exec?.replace('Manual:', '').trim() || '';
    }
    setEditNodeModal({ isOpen: true, nodeId: nodeId, name: node.name || '', exec: execMode, manualReq: manualReq });
  };

  const saveEditSection = () => {
    if (editNodeModal.nodeId) {
      setNodes(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        if (next[editNodeModal.nodeId!]) {
          next[editNodeModal.nodeId!].name = editNodeModal.name;
          next[editNodeModal.nodeId!].exec = editNodeModal.exec === 'Manual' ? `Manual: ${editNodeModal.manualReq}` : editNodeModal.exec;
        }
        return next;
      });
    }
    setEditNodeModal({ isOpen: false, nodeId: null, name: '', exec: '0', manualReq: '' });
  };

  const deleteSection = () => {
    if (editNodeModal.nodeId) {
      const node = nodes[editNodeModal.nodeId];
      if (node && node.rows && node.rows.length > 0) {
        alert("Cannot delete section with rows. Empty the section first.");
        return; 
      }
      
      setNodes(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        delete next[editNodeModal.nodeId!];
        return next;
      });
    }
    setEditNodeModal({ isOpen: false, nodeId: null, name: '', exec: '0', manualReq: '' });
  };

  const handleEditRow = (e: React.MouseEvent, row: RowItem) => {
    e.stopPropagation();
    // Parse prototype format like PT0[BTN_SW2, 1200, 200, 1] into state
    const match = row.command.match(/^([A-Z0-9_]+)\[(.*)\]$/);
    let cmd = 'PT0';
    let rowArgs: string[] = [];
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
       const next: Record<string, NodeItem> = JSON.parse(JSON.stringify(prev));
       Object.values(next).forEach((node) => {
         if (node.type === 'section' && node.rows) {
           const idx = node.rows.findIndex((r) => r.id === editRowData.id);
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

  const deleteRowFromDeepModal = (rowId: number | null) => {
    if (!rowId) return;
    setNodes(prev => {
      const next: Record<string, NodeItem> = JSON.parse(JSON.stringify(prev));
      Object.values(next).forEach((node) => {
        if (node.type === 'section' && node.rows) {
          node.rows = node.rows.filter((r) => r.id !== rowId);
        }
      });
      return next;
    });
    setShowEditRowModal(false);
  };

  return (
    <div 
      className={`flex-1 flex flex-col bg-slate-50 dark:bg-[#0a0f18] overflow-hidden relative transition-colors duration-200 select-none ${isNodeDragging ? 'cursor-grabbing' : 'cursor-default'}`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleGlobalMouseMove}
      onMouseUp={stopInteractions}
      onMouseLeave={stopInteractions}
      onContextMenu={(e) => e.preventDefault()}
      ref={canvasRef}
    >
      {/* Zoom / Pan Controls */}
      <div className="absolute top-3 left-3 z-20 flex gap-2">
        <button onClick={() => setScale(s => Math.min(s + 0.15, 2.5))} className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-200 shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"><ZoomIn size={14} /></button>
        <button onClick={() => setScale(s => Math.max(s - 0.15, 0.3))} className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-655 dark:text-slate-200 shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"><ZoomOut size={14} /></button>
        <button onClick={() => { setScale(1); setPan({x:0, y:0}); }} className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-655 dark:text-slate-200 shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"><Maximize size={14} /></button>
      </div>

      {/* Compile Button */}
      <div className="absolute top-3 right-3 z-20">
         <button onClick={() => router.push('/process')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer">
           Compile Workflow <Maximize size={12}/>
         </button>
      </div>

      {/* Interactive Grid Canvas */}
      <div 
        id="canvas-bg"
        className={`w-[10000px] h-[10000px] absolute origin-top-left transition-transform duration-75 ${isNodeDragging ? 'cursor-grabbing' : 'cursor-default'}`}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
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
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-highlight" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Edge Connector Splines */}
          {Object.values(nodes).map(node => {
            if (!node.parentId || !nodes[node.parentId]) return null;
            const parent = nodes[node.parentId];
            const x1 = parent.x + 56;
            const y1 = parent.y + 48;
            const x2 = node.x + 56;
            const y2 = node.y + 48;
            const d = `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
            return (
              <path 
                key={`edge-${node.id}`} 
                d={d} 
                className="stroke-slate-400 dark:stroke-slate-500" 
                strokeWidth="2" 
                fill="none" 
                opacity="0.85" 
              />
            );
          })}
        </svg>

        {/* Nodes Canvas */}
        {Object.values(nodes).map((node) => {
          const isDragged = draggingNodeId === node.id;
          const isHoveredTarget = hoveredTargetId === node.id;

          return (
            <div 
              key={node.id} 
              className="absolute" 
              style={{ 
                left: node.x, 
                top: node.y, 
                width: 112, 
                height: 96,
                zIndex: isDragged ? 50 : 10
              }}
            >
              <div className="relative group flex flex-col items-center w-full h-full">
                {node.type === 'section' && (
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wider absolute -top-5 whitespace-nowrap">EXEC: {node.exec}</span>
                )}
                
                {/* Hexagonal Node Design */}
                <svg 
                  width="112" height="96" viewBox="0 0 112 96" 
                  className={`overflow-visible ${isDragged ? 'cursor-grabbing drop-shadow-2xl opacity-80' : 'cursor-default drop-shadow-lg'}`}
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
                    opacity={isHoveredTarget ? "0.9" : "0.7"} 
                  />
                  <path 
                    d="M 28 4 L 84 4 L 108 48 L 84 92 L 28 92 L 4 48 Z" 
                    fill={`url(#grad-${node.type})`} 
                    stroke={isHoveredTarget ? "#fbbf24" : "rgba(255,255,255,0.3)"} 
                    strokeWidth={isHoveredTarget ? "3" : "1"} 
                  />
                </svg>

                {/* Node Label Text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white dark:bg-[#161b24] border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded shadow-md text-slate-850 dark:text-white font-bold text-[9px] whitespace-nowrap pointer-events-none uppercase tracking-wide">
                  {node.name}
                </div>

                {/* Plus add child node button */}
                <button 
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => {
                    let targetType: 'tab' | 'section' | 'row' = 'tab';
                    if (node.type === 'tab') targetType = 'section';
                    if (node.type === 'section') targetType = 'row';
                    setPromptModal({ isOpen: true, type: targetType, title: `Create New ${targetType}`, targetParent: node.id });
                  }} 
                  className={`absolute top-0 right-0 -mr-2 -mt-1 w-5 h-5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-lg z-20 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all cursor-pointer ${isNodeDragging ? 'hidden' : ''}`}
                  title={`Add ${node.type === 'project' ? 'Tab' : node.type === 'tab' ? 'Section' : 'Instruction Row'}`}
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Rows List (Only for Section Nodes) */}
              {node.type === 'section' && node.rows && (
                <div className="absolute top-[102px] left-1/2 -translate-x-1/2 flex items-center gap-1">
                  <div 
                    onDoubleClick={(e) => { e.stopPropagation(); handleOpenGroupModal(node.id); }} 
                    onDragOver={handleCanvasDragOver}
                    onDrop={(e) => handleCanvasDrop(e, node.id)}
                    className="bg-white/95 dark:bg-[#121824]/95 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 min-w-[220px] shadow-2xl hover:border-slate-350 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-0.5 min-h-[30px] flex flex-col">
                      {node.rows.map((row, rowIndex) => (
                        <div 
                          key={row.id} 
                          draggable
                          onDragStart={(e) => handleCanvasDragStart(e, node.id, rowIndex)}
                          onDragOver={handleCanvasDragOver}
                          onDrop={(e) => handleCanvasDrop(e, node.id, rowIndex)}
                          onDoubleClick={(e) => handleEditRow(e, row)} 
                          className={`flex items-stretch bg-slate-100 dark:bg-[#1f293d] border border-slate-200 dark:border-slate-800 h-[24px] rounded-md text-[9px] font-bold text-slate-750 dark:text-slate-300 shadow-sm overflow-hidden group hover:brightness-105 cursor-grab active:cursor-grabbing transition-opacity ${canvasDraggedItem?.secId === node.id && canvasDraggedItem?.rowIndex === rowIndex ? 'opacity-40 border-2 border-dashed border-slate-400' : ''}`}
                        >
                          {row.label && (
                            <div className="bg-slate-200 dark:bg-[#1e345c] text-slate-800 dark:text-blue-200 px-1.5 w-12 flex items-center justify-center border-r border-slate-300 dark:border-slate-800 shrink-0 truncate">
                              {row.label}
                            </div>
                          )}
                          <div className="px-2 flex items-center flex-1 tracking-tight truncate font-mono text-[8px]">
                            {row.command}
                          </div>
                        </div>
                      ))}
                      {node.rows.length === 0 && (
                        <div className="h-[24px] flex items-center justify-center text-slate-400 dark:text-slate-500 text-[9px] italic pointer-events-none rounded-md border border-dashed border-slate-250 dark:border-slate-800">
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

      {/* --- MODAL WORKFLOWS --- */}

      {/* 1. Prompt Modal (Add Tab / Section / Row) */}
      {promptModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121824] border border-slate-250 dark:border-slate-800 rounded-xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="py-2.5 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30">
              <h2 className="text-sm font-bold text-slate-850 dark:text-slate-100">{promptModal.title}</h2>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Name (Max 12 chars)</label>
                <input 
                  type="text" 
                  value={newItemName}
                  onChange={(e) => {
                    if (e.target.value.length <= 12) setNewItemName(e.target.value);
                  }}
                  placeholder={`Enter ${promptModal.type} label...`}
                  className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-350 dark:border-slate-800 text-slate-855 dark:text-slate-200 rounded-lg p-2 text-xs focus:border-blue-500 outline-none font-semibold shadow-sm"
                  autoFocus
                />
              </div>
              
              {promptModal.type === 'section' && (
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Execution Mode</label>
                  <select 
                    value={executionMode}
                    onChange={(e) => setExecutionMode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-350 dark:border-slate-800 text-slate-855 dark:text-slate-200 rounded-lg p-2 text-xs focus:border-blue-500 outline-none font-semibold shadow-sm"
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
                      placeholder="Enter specific request offset (e.g. 15)"
                      className="w-full mt-2 bg-slate-50 dark:bg-[#0a0f18] border border-slate-350 dark:border-slate-800 text-slate-855 dark:text-slate-200 rounded-lg p-2 text-xs focus:border-blue-500 outline-none shadow-sm"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="py-2.5 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30 flex justify-end gap-2 shrink-0">
              <button 
                onClick={() => { setPromptModal({ isOpen: false, type: '', title: '', targetParent: null }); setNewItemName(''); setManualReqNumber(''); }} 
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-800 text-slate-650 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => { 
                  const parentNode = nodes[promptModal.targetParent!];
                  const newId = `${promptModal.type}_${Date.now()}`;
                  
                  setNodes(prev => {
                    const next = JSON.parse(JSON.stringify(prev));
                    if (promptModal.type === 'tab') {
                      next[newId] = { id: newId, parentId: parentNode.id, type: 'tab', name: newItemName, x: parentNode.x + 120, y: parentNode.y + 180 };
                    } else if (promptModal.type === 'section') {
                      next[newId] = { id: newId, parentId: parentNode.id, type: 'section', name: newItemName, exec: executionMode === 'Manual' ? `Manual: ${manualReqNumber}` : executionMode, x: parentNode.x + 200, y: parentNode.y + 150, rows: [] };
                    } else if (promptModal.type === 'row') {
                      if (!next[parentNode.id].rows) next[parentNode.id].rows = [];
                      next[parentNode.id].rows.push({ id: Date.now(), label: newItemName, command: "PT0[BTN_SW1, 1000]" });
                    }
                    return next;
                  });

                  setPromptModal({ isOpen: false, type: '', title: '', targetParent: null }); 
                  setNewItemName(''); 
                  setManualReqNumber('');
                }} 
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={!newItemName.trim() || (executionMode === 'Manual' && !manualReqNumber.trim())}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Edit Section Modal */}
      {editNodeModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121824] border border-slate-250 dark:border-slate-800 rounded-xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="py-2.5 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30">
              <h2 className="text-sm font-bold text-slate-855 dark:text-slate-100">Edit Section</h2>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Name (Max 12 chars)</label>
                <input 
                  type="text" 
                  value={editNodeModal.name}
                  onChange={(e) => {
                    if (e.target.value.length <= 12) setEditNodeModal(prev => ({...prev, name: e.target.value}));
                  }}
                  className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-350 dark:border-slate-800 text-slate-855 dark:text-slate-200 rounded-lg p-2 text-xs focus:border-blue-500 outline-none font-semibold shadow-sm"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Execution Mode</label>
                <select 
                  value={editNodeModal.exec}
                  onChange={(e) => setEditNodeModal(prev => ({...prev, exec: e.target.value}))}
                  className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-350 dark:border-slate-800 text-slate-855 dark:text-slate-200 rounded-lg p-2 text-xs focus:border-blue-500 outline-none font-semibold shadow-sm"
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
                    placeholder="Enter manual request offset"
                    className="w-full mt-2 bg-slate-50 dark:bg-[#0a0f18] border border-slate-350 dark:border-slate-800 text-slate-855 dark:text-slate-200 rounded-lg p-2 text-xs focus:border-blue-500 outline-none shadow-sm"
                  />
                )}
              </div>
            </div>

            <div className="py-2.5 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30 flex justify-between items-center shrink-0">
              <button 
                onClick={deleteSection}
                className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Delete Section"
              >
                <Trash2 size={16} />
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditNodeModal({ isOpen: false, nodeId: null, name: '', exec: '0', manualReq: '' })} 
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-800 text-slate-650 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveEditSection} 
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  disabled={!editNodeModal.name.trim() || (editNodeModal.exec === 'Manual' && !editNodeModal.manualReq.trim())}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Edit Row Group Modal (Double click row container) */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh] animate-in fade-in duration-150">
            <div className="py-2.5 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30">
              <h2 className="text-sm font-bold text-slate-855 dark:text-slate-100">Edit Row Group</h2>
            </div>

            <div className="p-4 space-y-1.5 overflow-y-auto flex-1">
              {modalRows.map((row, index) => (
                <div 
                  key={row.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className={`flex items-center gap-2 bg-slate-50 dark:bg-[#0a0f18]/40 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group ${draggedIndex === index ? 'opacity-40 border-dashed border-slate-400' : ''}`}
                >
                  <div className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-600 group-hover:text-slate-500 p-1 shrink-0" title="Drag to reorder">
                    <GripVertical size={14} />
                  </div>
                  
                  <span className="text-slate-400 text-[10px] w-4 text-right font-mono select-none">{index + 1}.</span>
                  
                  <input 
                    type="text" 
                    value={row.label} 
                    onChange={(e) => updateRow(index, 'label', e.target.value)}
                    className="w-1/4 bg-white dark:bg-[#0a0f18] border border-slate-355 text-slate-800 dark:text-slate-200 rounded-lg p-2 text-xs focus:border-blue-500 outline-none font-semibold shadow-sm" 
                    placeholder="Row label" 
                  />
                  <input 
                    type="text" 
                    value={row.command} 
                    onChange={(e) => updateRow(index, 'command', e.target.value)}
                    className="flex-1 bg-white dark:bg-[#0a0f18] border border-slate-355 text-slate-800 dark:text-slate-200 rounded-lg p-2 text-xs focus:border-blue-500 outline-none font-mono shadow-sm" 
                    placeholder="Instruction mapping (e.g. PT0[LED_P8, 1000])"
                  />
                  
                  <button onClick={() => removeRow(index)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-850 p-2 rounded-lg transition-colors cursor-pointer" title="Delete Row">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {modalRows.length === 0 && (
                <div className="text-xs text-slate-400 dark:text-slate-500 italic py-6 text-center border border-dashed border-slate-200 dark:border-slate-855 rounded-xl">
                  No execution logic blocks added. Click {"\"Add Row\""} to build code segments.
                </div>
              )}
            </div>

            <div className="py-2.5 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30 flex justify-between items-center shrink-0">
              <button onClick={addRow} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-500 font-bold text-xs px-3 py-2 cursor-pointer">
                <Plus size={15} /> Add Row
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowGroupModal(false)} className="px-3 py-1.5 border border-slate-300 dark:border-slate-800 text-slate-655 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleSaveGroupModal} className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer">Save Group</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Edit Row Modal (Double click individual row) */}
      {showEditRowModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121824] border border-slate-250 dark:border-slate-850 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in duration-150">
            <div className="py-2.5 px-4 border-b border-slate-200 dark:border-slate-805 bg-slate-50 dark:bg-[#0a0f18]/30 shrink-0">
              <h2 className="text-sm font-bold text-slate-855 dark:text-slate-100">Deep Property Inspection</h2>
            </div>
            
            <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">
              
              <div className="grid grid-cols-2 gap-4 shrink-0">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Row Label</label>
                  <input 
                    type="text" 
                    value={editRowData.label} 
                    onChange={e => setEditRowData({...editRowData, label: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-355 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg p-2 text-xs focus:border-blue-500 outline-none font-semibold shadow-sm" 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Target Command Prototype</label>
                  <select 
                    value={editRowData.command}
                    onChange={e => {
                      const newCmd = e.target.value;
                      const found = registry.find(r => r.Cmd === newCmd);
                      const newLen = found ? found.x : 0;
                      setEditRowData({
                        ...editRowData,
                        command: newCmd,
                        args: Array.from({ length: newLen }, (_, i) => editRowData.args[i] || '')
                      });
                    }}
                    className="w-full bg-slate-50 dark:bg-[#0a0f18] border border-slate-355 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg p-2 text-xs focus:border-blue-500 outline-none font-semibold shadow-sm"
                  >
                    {registry.map(c => <option key={c.Cmd} value={c.Cmd}>{c.Cmd}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[300px]">
                
                {/* Left panel inside modal */}
                <div className="flex flex-col gap-3 min-h-0">
                  <div className="bg-slate-55 dark:bg-[#0a0f18]/30 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 shrink-0 shadow-inner">
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider select-none">Constructed instruction</label>
                    <div className="w-full bg-white dark:bg-[#121824] border border-slate-300 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 rounded-lg p-2 text-xs font-mono font-bold select-all tracking-tight shadow-sm">
                      {editRowData.command}[{editRowData.args.join(', ')}]
                    </div>
                  </div>

                  <div className="bg-slate-55 dark:bg-[#0a0f18]/30 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 flex-1 flex flex-col min-h-0 shadow-inner">
                    <div className="flex flex-col min-h-0 flex-1">
                      <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider select-none shrink-0">Available Peripheral Pin Macros</label>
                      <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-24 content-start pr-1">
                        {['BTN_SW1', 'BTN_SW2', 'BTN_SW3', 'BTN_SW4', 'BTN_SW5', 'BTN_SW6', 'LED_P1', 'LED_P2', 'LED_P3', 'LED_P4', 'LED_P5', 'LED_P6', 'LED_P7', 'LED_P8', 'LED_P9', 'LED_P10', 'LED_P11', 'LED_P12', 'LED_P13', 'LED_P14'].map(pin => (
                          <button 
                            key={pin} 
                            onClick={() => {
                              const newArgs = [...editRowData.args];
                              if (newArgs.length > 0) newArgs[0] = pin; 
                              setEditRowData({...editRowData, args: newArgs});
                            }}
                            className="bg-white dark:bg-[#1a2434] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-mono px-2 py-1 rounded-md border border-slate-300 dark:border-slate-800 transition-colors shadow-sm cursor-pointer"
                          >
                            {pin}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 pt-2 mt-2 border-t border-slate-200 dark:border-slate-800/60 flex flex-col">
                      <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider select-none shrink-0">Row Group Labels Context</label>
                      <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-16 pr-1">
                        {['DSFS', 'Signal', 'uuuu', 'XXX', 'house', 'rr', 'Sini'].map(lbl => (
                          <button 
                            key={lbl} 
                            onClick={() => {
                              const newArgs = [...editRowData.args];
                              if (newArgs.length > 1) newArgs[1] = lbl;
                              setEditRowData({...editRowData, args: newArgs});
                            }}
                            className="bg-white dark:bg-[#1a2434] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-mono px-2 py-1 rounded-md border border-slate-300 dark:border-slate-800 transition-colors shadow-sm cursor-pointer"
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right panel inside modal */}
                <div className="flex flex-col min-h-0">
                  <div className="bg-slate-55 dark:bg-[#0a0f18]/30 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 flex flex-col flex-1 min-h-0 shadow-inner">
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider select-none shrink-0">Prototype Documentation Description</label>
                    <div className="flex-1 w-full bg-white dark:bg-[#121824] border border-slate-300 dark:border-slate-800 text-slate-750 dark:text-slate-300 rounded-lg p-3 text-[11px] font-medium overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-sm">
                      {registry.find(r => r.Cmd === editRowData.command)?.desc || "No documentation metadata configured for this command prototype."}
                    </div>
                  </div>
                </div>

              </div>

              {/* Dynamic Arguments fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 items-start border-t border-slate-200 dark:border-slate-800/80 pt-3">
                <div className="bg-slate-55 dark:bg-[#0a0f18]/30 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 flex flex-col justify-center gap-1.5 w-full shadow-inner select-none font-semibold text-xs">
                  <div className="flex items-center justify-between px-2 py-1 bg-white dark:bg-[#121824] rounded-lg border border-slate-200 dark:border-slate-800">
                     <span className="text-slate-655 dark:text-slate-400">Args Limit (X)</span>
                     <div className="w-12 bg-slate-50 dark:bg-[#0a0f18] border border-slate-355 border-slate-300 dark:border-slate-805 text-center text-slate-800 dark:text-slate-200 rounded-md py-0.5 text-[10px] font-mono font-bold shadow-sm">
                       {editRowData.args.length}
                     </div>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 bg-white dark:bg-[#121824] rounded-lg border border-slate-200 dark:border-slate-800">
                     <span className="text-slate-655 dark:text-slate-400">Internal Vars (Y)</span>
                     <div className="w-12 bg-slate-50 dark:bg-[#0a0f18] border border-slate-355 border-slate-300 dark:border-slate-805 text-center text-slate-800 dark:text-slate-200 rounded-md py-0.5 text-[10px] font-mono font-bold shadow-sm">
                       {registry.find(r => r.Cmd === editRowData.command)?.y || 0}
                     </div>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 bg-white dark:bg-[#121824] rounded-lg border border-slate-200 dark:border-slate-800">
                     <span className="text-slate-655 dark:text-slate-400">Returns (Z)</span>
                     <div className="w-12 bg-slate-50 dark:bg-[#0a0f18] border border-slate-355 border-slate-300 dark:border-slate-805 text-center text-slate-800 dark:text-slate-200 rounded-md py-0.5 text-[10px] font-mono font-bold shadow-sm">
                       {registry.find(r => r.Cmd === editRowData.command)?.z || 0}
                     </div>
                  </div>
                </div>

                <div className="bg-slate-55 dark:bg-[#0a0f18]/30 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 w-full shadow-inner max-h-36 overflow-y-auto">
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider select-none">Argument Input Values</label>
                  <div className="space-y-1">
                    {editRowData.args.map((arg, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white dark:bg-[#121824] p-1 rounded-lg border border-slate-200 dark:border-slate-800/50 shadow-sm">
                        <span className="text-slate-400 dark:text-slate-505 text-[10px] w-6 font-mono text-right select-none">A{idx+1}</span>
                        <span className="text-orange-500 dark:text-orange-400 text-[9px] w-8 font-mono font-bold select-none">int8</span>
                        <input 
                          type="text" 
                          value={arg} 
                          onChange={e => {
                            const newArgs = [...editRowData.args];
                            newArgs[idx] = e.target.value;
                            setEditRowData({...editRowData, args: newArgs});
                          }}
                          className="flex-1 bg-slate-50 dark:bg-[#0a0f18] border border-slate-355 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-md p-1 text-xs focus:border-blue-500 outline-none font-mono" 
                        />
                      </div>
                    ))}
                    {editRowData.args.length === 0 && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-505 italic py-2 select-none text-center">
                        This command requires no arguments.
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            <div className="py-2.5 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f18]/30 flex justify-between items-center shrink-0">
              <button 
                onClick={() => deleteRowFromDeepModal(editRowData.id)}
                className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                title="Delete Row"
              >
                <Trash2 size={16} />
              </button>
              
              <div className="flex gap-2">
                <button onClick={() => setShowEditRowModal(false)} className="px-3 py-1.5 border border-slate-300 dark:border-slate-800 text-slate-655 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer font-medium">Cancel</button>
                <button onClick={saveEditRow} className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer">Save Row</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
