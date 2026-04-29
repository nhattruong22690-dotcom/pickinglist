"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Play, CheckCircle, MoreVertical, Package, ArrowRight, Store, 
  Check, Save, Weight, Box, Search, Calendar, X, ChevronRight,
  ChevronLeft, ArrowLeft, ChevronDown, Scale, Layers
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { updateSessionStatus, updatePickingItem } from "../actions/picking";

// --- Sub-component for Picking Item Row ---

const PickingItemRow = ({ item, sessionId, onUpdate }: { item: any, sessionId: string, onUpdate: () => void }) => {
  const [actualQty, setActualQty] = useState(item.actualQty || "");
  const [isPicked, setIsPicked] = useState(item.isPicked);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setActualQty(item.actualQty || "");
    setIsPicked(item.isPicked);
  }, [item]);

  const handleManualSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const result = await updatePickingItem(item.id, sessionId, actualQty, isPicked);
    if (result.success) onUpdate();
    setIsSaving(false);
  };

  const handleTogglePicked = async () => {
    if (isSaving) return;
    
    const nextPickedState = !isPicked;
    let nextQty = actualQty;

    if (nextPickedState) {
      // Tích chọn: Lấy số lượng mục tiêu nếu chưa có
      if (!actualQty || actualQty === "0") {
        nextQty = item.quantity.toString();
        setActualQty(nextQty);
      }
    } else {
      // Bỏ tích: Reset về 0
      nextQty = "0";
      setActualQty("0");
    }

    setIsPicked(nextPickedState);
    setIsSaving(true);
    const result = await updatePickingItem(item.id, sessionId, nextQty, nextPickedState);
    if (result.success) onUpdate();
    setIsSaving(false);
  };

  return (
    <motion.div 
      initial={false}
      animate={{ 
        backgroundColor: isPicked ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0)",
        borderColor: isPicked ? "rgba(34, 197, 94, 0.3)" : "rgba(255, 255, 255, 0.05)"
      }}
      className={cn(
        "grid grid-cols-12 gap-3 py-6 px-4 border-b transition-all relative overflow-hidden",
        isPicked ? "border-green-500/30 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]" : "border-white/5"
      )}
    >
      {/* Visual Indicator for Picked State */}
      {isPicked && (
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"
        />
      )}

      {/* Checkbox Container */}
      <div className="col-span-2 flex items-center justify-center">
        <motion.button 
          whileTap={{ scale: 0.8 }}
          onClick={handleTogglePicked} 
          disabled={isSaving} 
          className={cn(
            "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all shadow-xl", 
            isPicked ? "bg-green-500 border-green-500 text-black scale-110" : "border-gray-700 hover:border-[var(--primary)] text-transparent"
          )}
        >
          <AnimatePresence mode="wait">
            {isPicked ? (
              <motion.div
                key="checked"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
              >
                <Check size={22} strokeWidth={4} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Info Container */}
      <div className="col-span-6 flex flex-col justify-center">
        <div className={cn(
          "text-sm font-black uppercase tracking-tight mb-2 transition-all", 
          isPicked ? "text-gray-400 line-through opacity-70" : "text-white"
        )}>
          {item.productName}
        </div>
        <div className="flex flex-wrap gap-3">
          {item.sku && <span className="text-[9px] bg-white/5 px-2 py-0.5 border border-white/10 text-gray-500 font-mono rounded-sm">{item.sku}</span>}
          <div className="flex items-center gap-3">
             {item.specs && <span className="text-[9px] text-gray-600 flex items-center gap-1"><Box size={10} /> {item.specs}</span>}
             {item.packages > 0 && <span className="text-[9px] text-[var(--primary)] font-bold flex items-center gap-1"><Layers size={10} /> {item.packages} KIỆN</span>}
             {item.totalWeightKg > 0 && <span className="text-[9px] text-[var(--accent)] font-bold flex items-center gap-1"><Scale size={10} /> {item.totalWeightKg}KG</span>}
          </div>
        </div>
      </div>

      {/* Action/Quantity Container */}
      <div className="col-span-4 flex flex-col items-end justify-center gap-2">
        <div className={cn(
          "text-sm font-black uppercase transition-all",
          isPicked ? "text-green-500" : "text-white"
        )}>
          {isPicked ? "ĐÃ XONG: " : "CẦN: "} {item.quantity}
        </div>
        
        <div className="flex items-center gap-1.5 mt-1">
          <div className="relative group">
            <input 
              type="number" 
              value={actualQty} 
              onChange={(e) => setActualQty(e.target.value)} 
              placeholder="0" 
              className={cn(
                "w-20 bg-white/5 border border-white/10 text-sm font-black text-center py-2 outline-none rounded-sm transition-all focus:border-[var(--accent)] focus:bg-white/10",
                isPicked ? "text-green-500" : "text-[var(--accent)]"
              )}
            />
          </div>
          <button 
            onClick={handleManualSave} 
            disabled={isSaving} 
            className={cn(
              "p-2 rounded-sm transition-all shadow-lg", 
              isSaving ? "opacity-50" : "hover:bg-[var(--accent)] hover:text-black bg-white/5 text-gray-500"
            )}
          >
            <Save size={18} className={isSaving ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// --- Modal Component ---

const PickingModal = ({ session, filteredSessions, onClose, onUpdate, onSwitchSession }: { 
  session: any, 
  filteredSessions: any[],
  onClose: () => void, 
  onUpdate: () => void,
  onSwitchSession: (s: any) => void
}) => {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const currentIndex = filteredSessions.findIndex(s => s.id === session.id);
  const pickedCount = session.items.filter((i: any) => i.isPicked).length;
  const totalCount = session.items.length;
  const progress = (pickedCount / totalCount) * 100;

  const totalWeightKg = session.items.reduce((acc: number, item: any) => acc + (parseFloat(item.totalWeightKg) || 0), 0).toFixed(2);
  const totalPackages = session.items.reduce((acc: number, item: any) => acc + (parseFloat(item.packages) || 0), 0).toFixed(2);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-black/95 backdrop-blur-md">
      <motion.div key={session.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full md:h-auto md:max-w-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header HUD */}
        <div className="px-4 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between gap-4">
           <button onClick={() => setIsSelectorOpen(!isSelectorOpen)} className="flex-1 flex items-center justify-between bg-black border border-white/10 px-4 py-3 group hover:border-[var(--primary)] transition-all">
              <div className="flex items-center gap-3 overflow-hidden">
                <Store className="text-[var(--primary)] shrink-0" size={20} />
                <span className="text-sm font-black text-white uppercase tracking-tighter truncate">{currentIndex + 1}. {session.supermarket}</span>
              </div>
              <ChevronDown className={cn("text-gray-500 group-hover:text-white transition-transform", isSelectorOpen && "rotate-180")} size={20} />
           </button>
           <div className="flex items-center gap-1">
              <button onClick={() => currentIndex > 0 && onSwitchSession(filteredSessions[currentIndex - 1])} disabled={currentIndex === 0} className="p-3 hover:bg-white/10 disabled:opacity-20 text-white transition-all"><ChevronLeft size={24} /></button>
              <button onClick={() => currentIndex < filteredSessions.length - 1 && onSwitchSession(filteredSessions[currentIndex + 1])} disabled={currentIndex === filteredSessions.length - 1} className="p-3 hover:bg-white/10 disabled:opacity-20 text-white transition-all"><ChevronRight size={24} /></button>
              <div className="w-[1px] h-6 bg-white/10 mx-2" />
              <button onClick={onClose} className="p-3 hover:bg-red-500/20 text-gray-500 hover:text-red-500 transition-all rounded-full"><X size={24} /></button>
           </div>
        </div>

        {/* Selector Overlay */}
        <AnimatePresence>
          {isSelectorOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="absolute top-[80px] left-0 w-full bg-[#0a0a0a] z-[110] border-b border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
              <div className="max-h-[60vh] overflow-y-auto">
                {filteredSessions.map((s, idx) => {
                  const pCount = s.items.filter((i: any) => i.isPicked).length;
                  const tCount = s.items.length;
                  const percent = Math.round((pCount / tCount) * 100);
                  const isCurrent = s.id === session.id;
                  return (
                    <button key={s.id} onClick={() => { onSwitchSession(s); setIsSelectorOpen(false); }} className={cn("w-full text-left px-6 py-6 border-b border-white/5 flex items-center justify-between transition-all active:bg-white/10", isCurrent ? "bg-[var(--primary)]/10 border-l-4 border-l-[var(--primary)]" : "hover:bg-white/[0.03] border-l-4 border-l-transparent")}>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Siêu thị {idx + 1}</span>
                        <span className={cn("text-lg font-black uppercase tracking-tight", isCurrent ? "text-[var(--primary)]" : "text-white")}>{s.supermarket}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] font-bold text-gray-500 uppercase">{pCount}/{tCount} MÓN</span>
                           <span className={cn("text-xl font-black", percent === 100 ? "text-green-500" : "text-[var(--accent)]")}>{percent}%</span>
                        </div>
                        <ChevronRight className="text-gray-700" size={20} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setIsSelectorOpen(false)} className="w-full py-4 bg-white/5 text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 hover:text-white transition-all">Đóng danh sách</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress & Weight HUD */}
        <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between gap-6">
           <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tiến độ nhặt hàng:</span>
              <div className="text-xl font-black text-white">{pickedCount}/{totalCount} <span className="text-[10px] text-gray-600 font-normal ml-2 tracking-widest">MÓN XONG</span></div>
           </div>
           <div className="flex flex-col items-end">
              <div className="flex items-center gap-6">
                 <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-[var(--primary)] uppercase tracking-widest flex items-center gap-1"><Layers size={10} /> Tổng Số Kiện:</span>
                    <div className="text-lg font-black text-white">{totalPackages}</div>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-widest flex items-center gap-1"><Scale size={10} /> Tổng Trọng Lượng:</span>
                    <div className="text-lg font-black text-white">{totalWeightKg} <span className="text-[10px] text-gray-600">KG</span></div>
                 </div>
              </div>
           </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] bg-black">
          <div className="space-y-0">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[10px] font-black text-gray-600 uppercase tracking-widest border-b border-white/10 sticky top-0 bg-black z-10">
                <div className="col-span-2 text-center">XÁC NHẬN</div>
                <div className="col-span-6">SẢN PHẨM</div>
                <div className="col-span-4 text-right">SỐ LƯỢNG</div>
              </div>
              {session.items.map((item: any) => (
                <PickingItemRow key={item.id} item={item} sessionId={session.id} onUpdate={onUpdate} />
              ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-between items-center">
          <button onClick={onClose} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-2"><ArrowLeft size={14} /> Quay lại</button>
          <button onClick={() => currentIndex < filteredSessions.length - 1 && onSwitchSession(filteredSessions[currentIndex + 1])} disabled={currentIndex === filteredSessions.length - 1} className="px-8 py-4 bg-[var(--primary)] text-black font-black uppercase text-xs tracking-widest hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">SIÊU THỊ TIẾP THEO</button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Kanban Card Component ---

const KanbanCard = ({ session, onStatusChange, onOpenPicking }: { session: any, onStatusChange: any, onOpenPicking: (s: any) => void }) => {
  const pickedCount = session.items.filter((i: any) => i.isPicked).length;
  const totalCount = session.items.length;
  const progress = (pickedCount / totalCount) * 100;
  const totalWeightKg = session.items.reduce((acc: number, item: any) => acc + (parseFloat(item.totalWeightKg) || 0), 0).toFixed(2);
  const totalPackages = session.items.reduce((acc: number, item: any) => acc + (parseFloat(item.packages) || 0), 0).toFixed(2);

  return (
    <motion.div layout className="glass-panel group relative border-t-2 border-t-transparent hover:border-t-[var(--primary)] transition-all overflow-hidden cursor-pointer" onClick={() => onOpenPicking(session)}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[9px] font-bold text-gray-600 tracking-widest uppercase">{session.weekKey}</span>
          <MoreVertical size={12} className="text-gray-800" />
        </div>
        <h4 className="text-sm font-black text-white uppercase tracking-tight mb-3 flex items-center gap-2">
           <Store size={14} className="text-[var(--primary)]" /> {session.supermarket}
        </h4>
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <Package size={12} className="text-gray-600" /> <span>{pickedCount}/{totalCount} món</span>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1 text-[10px] text-[var(--primary)] font-bold">
                <Layers size={12} /> <span>{totalPackages} kiện</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[var(--accent)] font-bold">
                <Scale size={12} /> <span>{totalWeightKg} kg</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1 group-hover:text-[var(--primary)] transition-colors">SOẠN <ChevronRight size={12} /></div>
        </div>
        <div className="w-full h-1 bg-white/5 mb-6 relative overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={cn("h-full", progress === 100 ? "bg-green-500" : "bg-[var(--accent)]")} />
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {session.status !== "COMPLETED" && (
            <button onClick={() => onStatusChange(session.id, session.status === "PENDING" ? "PROCESSING" : "COMPLETED")} className="flex-1 bg-white/5 hover:bg-[var(--primary)] hover:text-black text-[9px] font-bold py-2 uppercase tracking-widest transition-all">{session.status === "PENDING" ? "BẮT ĐẦU" : "XONG"}</button>
          )}
          {session.status !== "PENDING" && (
            <button onClick={() => onStatusChange(session.id, session.status === "COMPLETED" ? "PROCESSING" : "PENDING")} className="px-3 bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-[9px] font-bold py-2 uppercase transition-all">Lùi</button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// --- Main Kanban Board ---

export const KanbanBoard = ({ initialSessions }: { initialSessions: any[] }) => {
  const [sessions, setSessions] = useState(initialSessions);
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSession, setActiveSession] = useState<any | null>(null);

  const weekKeys = useMemo(() => {
    const keys = Array.from(new Set(initialSessions.map(s => s.weekKey)));
    return keys.sort((a, b) => b.localeCompare(a));
  }, [initialSessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const matchesWeek = selectedWeek === "all" || session.weekKey === selectedWeek;
      const matchesSearch = session.supermarket.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesWeek && matchesSearch;
    });
  }, [sessions, selectedWeek, searchQuery]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    await updateSessionStatus(id, newStatus);
  };

  const columns = [
    { id: "PENDING", title: "Chưa soạn", icon: Clock, color: "text-gray-400", border: "border-gray-500/20" },
    { id: "PROCESSING", title: "Đang soạn", icon: Play, color: "text-[var(--primary)]", border: "border-[var(--primary)]/20" },
    { id: "COMPLETED", title: "Hoàn tất", icon: CheckCircle, color: "text-green-500", border: "border-green-500/20" },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row gap-4 bg-[var(--secondary)] p-4 border border-white/5">
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" placeholder="Tìm kiếm tên siêu thị..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black border border-white/10 pl-10 pr-4 py-3 text-xs uppercase tracking-widest text-white focus:border-[var(--primary)] outline-none" />
        </div>
        <div className="w-full md:w-64 relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="w-full bg-black border border-white/10 pl-10 pr-10 py-3 text-xs uppercase text-white outline-none appearance-none cursor-pointer">
            <option value="all">TẤT CẢ CÁC ĐỢT</option>
            {weekKeys.map(key => (<option key={key} value={key}>{key}</option>))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {columns.map((col) => (
          <div key={col.id} className="flex flex-col gap-4">
            <div className={cn("flex items-center justify-between pb-2 border-b-2", col.border)}>
              <div className="flex items-center gap-2">
                <col.icon size={16} className={col.color} />
                <h3 className="text-xs font-black uppercase text-white">{col.title}</h3>
              </div>
              <span className="text-[10px] font-mono text-gray-500">{filteredSessions.filter(s => s.status === col.id).length}</span>
            </div>
            <div className="flex-1 space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredSessions.filter((s) => s.status === col.id).map((session) => (
                  <KanbanCard key={session.id} session={session} onStatusChange={handleStatusChange} onOpenPicking={setActiveSession} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {activeSession && (
          <PickingModal 
            session={activeSession} 
            filteredSessions={filteredSessions}
            onClose={() => setActiveSession(null)} 
            onUpdate={() => {}} 
            onSwitchSession={setActiveSession}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
