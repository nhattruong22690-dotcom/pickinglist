"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Play, CheckCircle, MoreVertical, Package, ArrowRight, Store, 
  Check, Save, Weight, Box, Search, Calendar, X, ChevronRight,
  ChevronLeft, ArrowLeft, ChevronDown, Scale, Layers, ChevronUp,
  LayoutDashboard, ClipboardList, Filter, Boxes, ScanBarcode, RefreshCw
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { updateSessionStatus, updatePickingItem } from "../actions/picking";
import { useRouter } from "next/navigation";
import { BarcodeScanner } from "./BarcodeScanner";

// --- Sub-component for Picking Item Row ---

const PickingItemRow = ({ item, sessionId, onUpdateLocal }: { item: any, sessionId: string, onUpdateLocal: (itemId: string, qty: string, picked: boolean) => void }) => {
  const [actualQty, setActualQty] = useState(item.actualQty || "");
  const [isCompleted, setIsCompleted] = useState(item.isPicked);
  const [isChecked, setIsChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setActualQty(item.actualQty || "");
    setIsCompleted(item.isPicked);
  }, [item]);

  const handleManualSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const completed = parseInt(actualQty) >= item.quantity;
    setIsCompleted(completed);
    // Optimistic Update
    onUpdateLocal(item.id, actualQty, completed);
    const result = await updatePickingItem(item.id, sessionId, actualQty, completed);
    setIsSaving(false);
  };

  const handleToggleChecked = () => {
    setIsChecked(!isChecked);
  };

  return (
    <motion.div 
      initial={false}
      animate={{ 
        backgroundColor: isCompleted ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0)",
        borderColor: isCompleted ? "rgba(34, 197, 94, 0.3)" : "rgba(255, 255, 255, 0.05)"
      }}
      className={cn(
        "grid grid-cols-12 gap-3 py-6 px-4 border-b transition-all relative overflow-hidden",
        isCompleted ? "border-green-500/30 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]" : "border-white/5"
      )}
    >
      {isCompleted && <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />}
      <div className="col-span-2 flex items-center justify-center">
        <motion.button whileTap={{ scale: 0.8 }} onClick={handleToggleChecked} className={cn("w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all shadow-xl", isChecked ? "bg-green-500 border-green-500 text-black scale-110" : "border-gray-700 text-transparent")}>
          <AnimatePresence mode="wait">
            {isChecked && <motion.div key="checked" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}><Check size={22} strokeWidth={4} /></motion.div>}
          </AnimatePresence>
        </motion.button>
      </div>
      <div className="col-span-6 flex flex-col justify-center">
        <div className={cn("text-sm font-black uppercase tracking-tight mb-2 transition-all", isCompleted ? "text-green-500 opacity-90" : "text-white")}>{item.productName}</div>
        <div className="flex flex-wrap gap-3">
          {item.sku && <span className="text-[9px] bg-white/5 px-2 py-0.5 border border-white/10 text-gray-500 font-mono rounded-sm">{item.sku}</span>}
          <div className="flex items-center gap-3">
             {item.specs && <span className="text-[9px] text-gray-600 flex items-center gap-1"><Box size={10} /> {item.specs}</span>}
             {item.packages > 0 && <span className="text-[9px] text-[var(--primary)] font-bold flex items-center gap-1"><Layers size={10} /> {item.packages} KIỆN</span>}
             {item.totalWeightKg > 0 && <span className="text-[9px] text-[var(--accent)] font-bold flex items-center gap-1"><Scale size={10} /> {item.totalWeightKg}KG</span>}
          </div>
        </div>
      </div>
      <div className="col-span-4 flex flex-col items-end justify-center gap-2">
        <div className={cn("text-sm font-black uppercase transition-all", isCompleted ? "text-green-500" : "text-white")}>{isCompleted ? "ĐÃ XONG: " : "CẦN: "} {item.quantity}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <input type="number" value={actualQty} onChange={(e) => setActualQty(e.target.value)} placeholder="0" className={cn("w-20 bg-white/5 border border-white/10 text-sm font-black text-center py-2 outline-none rounded-sm transition-all focus:border-[var(--accent)]", isCompleted ? "text-green-500" : "text-[var(--accent)]")} />
          <button onClick={handleManualSave} disabled={isSaving} className={cn("p-2 rounded-sm transition-all", isSaving ? "opacity-50" : "hover:bg-[var(--accent)] hover:text-black bg-white/5 text-gray-500")}><Save size={18} className={isSaving ? "animate-spin" : ""} /></button>
        </div>
      </div>
    </motion.div>
  );
};

// --- Modal Component ---

const PickingModal = ({ session, filteredSessions, onClose, onUpdateLocal, onSwitchSession }: { session: any, filteredSessions: any[], onClose: () => void, onUpdateLocal: any, onSwitchSession: (s: any) => void }) => {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const currentIndex = filteredSessions.findIndex(s => s.id === session.id);
  const pickedCount = session.items.filter((i: any) => i.isPicked).length;
  const totalCount = session.items.length;
  const totalWeightKg = session.items.reduce((acc: number, item: any) => acc + (parseFloat(item.totalWeightKg) || 0), 0).toFixed(2);
  const totalPackages = session.items.reduce((acc: number, item: any) => acc + (parseFloat(item.packages) || 0), 0).toFixed(2);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedItem, setScannedItem] = useState<any | null>(null);
  const [scanQty, setScanQty] = useState("");
  const [scanWarning, setScanWarning] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-black/95 backdrop-blur-md">
      <motion.div key={session.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full md:h-auto md:max-w-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
        <div className="px-4 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between gap-4">
           <button onClick={() => setIsSelectorOpen(!isSelectorOpen)} className="flex-1 flex items-center justify-between bg-black border border-white/10 px-4 py-3 group hover:border-[var(--primary)] transition-all">
              <div className="flex items-center gap-3 overflow-hidden"><Store className="text-[var(--primary)] shrink-0" size={20} /><span className="text-sm font-black text-white uppercase tracking-tighter truncate">{currentIndex + 1}. {session.supermarket}</span></div>
              <ChevronDown className={cn("text-gray-500 group-hover:text-white transition-transform", isSelectorOpen && "rotate-180")} size={20} />
           </button>
           <div className="flex items-center gap-1">
              <button onClick={() => currentIndex > 0 && onSwitchSession(filteredSessions[currentIndex - 1])} disabled={currentIndex === 0} className="p-3 hover:bg-white/10 disabled:opacity-20 text-white transition-all"><ChevronLeft size={24} /></button>
              <button onClick={() => currentIndex < filteredSessions.length - 1 && onSwitchSession(filteredSessions[currentIndex + 1])} disabled={currentIndex === filteredSessions.length - 1} className="p-3 hover:bg-white/10 disabled:opacity-20 text-white transition-all"><ChevronRight size={24} /></button>
              <div className="w-[1px] h-6 bg-white/10 mx-2" />
              <button onClick={onClose} className="p-3 hover:bg-red-500/20 text-gray-500 hover:text-red-500 transition-all rounded-full"><X size={24} /></button>
           </div>
        </div>
        <AnimatePresence>{isSelectorOpen && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="absolute top-[80px] left-0 w-full bg-[#0a0a0a] z-[110] border-b border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"><div className="max-h-[60vh] overflow-y-auto">{filteredSessions.map((s, idx) => { const pCount = s.items.filter((i: any) => i.isPicked).length; const tCount = s.items.length; const percent = Math.round((pCount / tCount) * 100); const isCurrent = s.id === session.id; return (<button key={s.id} onClick={() => { onSwitchSession(s); setIsSelectorOpen(false); }} className={cn("w-full text-left px-6 py-6 border-b border-white/5 flex items-center justify-between transition-all active:bg-white/10", isCurrent ? "bg-[var(--primary)]/10 border-l-4 border-l-[var(--primary)]" : "hover:bg-white/[0.03] border-l-4 border-l-transparent")}><div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Siêu thị {idx + 1}</span><span className={cn("text-lg font-black uppercase tracking-tight", isCurrent ? "text-[var(--primary)]" : "text-white")}>{s.supermarket}</span></div><div className="flex items-center gap-4"><div className="flex flex-col items-end"><span className="text-[10px] font-bold text-gray-500 uppercase">{pCount}/{tCount} MÓN</span><span className={cn("text-xl font-black", percent === 100 ? "text-green-500" : "text-[var(--accent)]")}>{percent}%</span></div><ChevronRight className="text-gray-700" size={20} /></div></button>); })}</div><button onClick={() => setIsSelectorOpen(false)} className="w-full py-4 bg-white/5 text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 hover:text-white transition-all">Đóng danh sách</button></motion.div>)}</AnimatePresence>
        <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between gap-6">
           <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tiến độ nhặt hàng:</span><div className="text-xl font-black text-white">{pickedCount}/{totalCount} <span className="text-[10px] text-gray-600 font-normal ml-2 tracking-widest">MÓN XONG</span></div></div>
           <div className="flex flex-col items-end"><div className="flex items-center gap-6"><div className="flex flex-col items-end"><span className="text-[9px] font-bold text-[var(--primary)] uppercase tracking-widest flex items-center gap-1"><Layers size={10} /> Tổng Số Kiện:</span><div className="text-lg font-black text-white">{totalPackages}</div></div><div className="flex flex-col items-end"><span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-widest flex items-center gap-1"><Scale size={10} /> Tổng Trọng Lượng:</span><div className="text-lg font-black text-white">{totalWeightKg} <span className="text-[10px] text-gray-600">KG</span></div></div></div></div>
        </div>

        {/* --- LARGE SCAN BUTTON --- */}
        <div className="p-4 bg-black border-b border-white/10 flex justify-center">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsScannerOpen(true)}
            className="w-full max-w-sm py-8 bg-gradient-to-r from-[var(--primary)]/20 to-[var(--primary)]/5 border-2 border-[var(--primary)] flex flex-col items-center justify-center gap-3 relative overflow-hidden group transition-all hover:from-[var(--primary)]/30 hover:to-[var(--primary)]/10"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-50" />
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-50" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-[var(--primary)] text-black rounded-sm shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]">
                <ScanBarcode size={24} className="group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-lg font-black text-white uppercase tracking-tighter">QUÉT MÃ VẠCH</span>
                <span className="text-[9px] font-bold text-[var(--primary)]/70 uppercase tracking-[0.3em]">Bấm để bắt đầu nhặt hàng</span>
              </div>
            </div>
            
            {/* Background Decoration */}
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ScanBarcode size={100} />
            </div>
          </motion.button>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[60vh] bg-black">
          <div className="space-y-0">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[10px] font-black text-gray-600 uppercase tracking-widest border-b border-white/10 sticky top-0 bg-black z-10">
                <div className="col-span-2 text-center">XÁC NHẬN</div>
                <div className="col-span-6">SẢN PHẨM</div>
                <div className="col-span-4 text-right">SỐ LƯỢNG</div>
              </div>
              {session.items.map((item: any) => (<PickingItemRow key={item.id} item={item} sessionId={session.id} onUpdateLocal={onUpdateLocal} />))}
          </div>
        </div>
        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-between items-center">
          <button onClick={onClose} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-2"><ArrowLeft size={14} /> Quay lại</button>
          <button onClick={() => currentIndex < filteredSessions.length - 1 && onSwitchSession(filteredSessions[currentIndex + 1])} disabled={currentIndex === filteredSessions.length - 1} className="px-8 py-4 bg-[var(--primary)] text-black font-black uppercase text-xs tracking-widest hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">SIÊU THỊ TIẾP THEO</button>
        </div>

        {/* --- Barcode Scanner Overlay --- */}
        <AnimatePresence>
          {isScannerOpen && (
            <BarcodeScanner 
              onScanSuccess={(code) => {
                const matched = session.items.find((i: any) => 
                  (i.barcode && i.barcode.toString().trim() === code.trim()) || 
                  (i.sku && i.sku.toString().trim() === code.trim())
                );
                if (matched) {
                  if (matched.isPicked || (parseInt(matched.actualQty) >= matched.quantity)) {
                    setScanWarning(`Sản phẩm "${matched.productName}" đã được soạn đủ!`);
                    try { new Audio("https://assets.mixkit.co/active_storage/sfx/2859/2859-preview.mp3").play(); } catch(e) {}
                    return;
                  }
                  setScannedItem(matched);
                  setIsScannerOpen(false);
                  try { new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3").play(); } catch(e) {}
                  if (navigator.vibrate) navigator.vibrate(200);
                } else {
                  // Debug: gom danh sách barcode có trong đơn
                  const availableCodes = session.items.map((i: any) => i.barcode || i.sku).filter(Boolean).join(", ");
                  setScanWarning(`Mã "${code}" không có trong đơn!\nCác mã đang chờ: ${availableCodes || 'Không có mã nào trong đơn'}`);
                  try { new Audio("https://assets.mixkit.co/active_storage/sfx/2859/2859-preview.mp3").play(); } catch(e) {}
                  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                }
              }} 
              onClose={() => setIsScannerOpen(false)} 
            />
          )}
        </AnimatePresence>

        {/* --- Scanned Item Quantity Entry --- */}
        <AnimatePresence>
          {scannedItem && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                className="w-full max-w-sm bg-[#0f0f0f] border border-[var(--primary)] p-8 shadow-[0_0_50px_rgba(var(--primary-rgb),0.2)]"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center text-[var(--primary)] mb-2">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">{scannedItem.productName}</h3>
                  <div className="flex gap-4 mb-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">SKU: {scannedItem.sku}</span>
                    <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">CẦN: {scannedItem.quantity}</span>
                  </div>
                  
                  <div className="w-full space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Nhập số lượng thực tế:</label>
                      <input 
                        autoFocus
                        type="number" 
                        value={scanQty} 
                        onChange={(e) => setScanQty(e.target.value)}
                        placeholder={scannedItem.quantity.toString()}
                        className="w-full bg-black border-2 border-white/10 p-4 text-3xl font-black text-center text-[var(--primary)] outline-none focus:border-[var(--primary)] transition-all"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          setScannedItem(null);
                          setScanQty("");
                        }}
                        className="flex-1 py-4 bg-white/5 text-gray-400 font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all"
                      >
                        HỦY
                      </button>
                      <button 
                        onClick={async () => {
                          const qty = scannedItem.quantity.toString();
                          onUpdateLocal(scannedItem.id, qty, true);
                          await updatePickingItem(scannedItem.id, session.id, qty, true);
                          setScannedItem(null);
                          setScanQty("");
                        }}
                        className="flex-2 py-4 bg-white/10 text-white font-black uppercase text-xs tracking-widest hover:bg-white/20 transition-all border border-white/10"
                      >
                        LẤY ĐỦ
                      </button>
                      <button 
                        onClick={async () => {
                          const currentActual = parseInt(scannedItem.actualQty || "0");
                          const qty = scanQty || (currentActual + 1).toString();
                          const qtyNum = parseInt(qty);
                          const isFullyPicked = qtyNum >= scannedItem.quantity;
                          
                          onUpdateLocal(scannedItem.id, qty, isFullyPicked);
                          await updatePickingItem(scannedItem.id, session.id, qty, isFullyPicked);
                          setScannedItem(null);
                          setScanQty("");
                        }}
                        className="flex-3 py-4 bg-[var(--primary)] text-black font-black uppercase text-xs tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"
                      >
                        XÁC NHẬN
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Scan Warning Overlay --- */}
        <AnimatePresence>
          {scanWarning && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[250] bg-black/80 flex items-center justify-center p-6 backdrop-blur-md">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1a0000] border-2 border-red-500 p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                  <X size={32} />
                </div>
                <h3 className="text-xl font-black text-white uppercase mb-2">CẢNH BÁO</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">{scanWarning}</p>
                <button onClick={() => setScanWarning(null)} className="w-full py-4 bg-red-500 text-white font-black uppercase text-xs tracking-widest hover:brightness-110 transition-all">ĐÃ HIỂU</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// --- Summary View Component ---

const SummaryTable = ({ items }: { items: any[] }) => {
  const consolidated = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const key = item.productName;
      if (!map.has(key)) {
        map.set(key, { 
          name: item.productName, 
          sku: item.sku, 
          specs: parseFloat(item.specs) || 1,
          totalQty: 0,
          totalWeight: 0
        });
      }
      const entry = map.get(key);
      entry.totalQty += item.quantity;
      entry.totalWeight += parseFloat(item.totalWeightKg) || 0;
    });

    return Array.from(map.values()).map(entry => {
      const fullPackages = Math.floor(entry.totalQty / entry.specs);
      const remainderQty = entry.totalQty % entry.specs;
      const totalPackagesDecimal = (entry.totalQty / entry.specs).toFixed(2);

      return {
        ...entry,
        fullPackages,
        remainderQty,
        totalPackagesDecimal
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  return (
    <div className="glass-panel overflow-hidden border border-white/5">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Sản phẩm</th>
              <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">Tổng Số Lượng</th>
              <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">Tổng kiện (Hệ số)</th>
              <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-white bg-white/5">Kiện chẵn (Thùng)</th>
              <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-[var(--primary)] bg-[var(--primary)]/5">Lẻ (Cái)</th>
              <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-500 text-[var(--accent)]">Tổng Trọng Lượng</th>
            </tr>
          </thead>
          <tbody>
            {consolidated.map((row, idx) => (
              <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black uppercase text-white tracking-tight leading-none">{row.name}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-sm text-[10px] font-black text-gray-400">
                      <Box size={10} className="text-gray-600" /> {row.specs}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-center text-lg font-black text-white">{row.totalQty}</td>
                <td className="p-4 text-center text-lg font-black text-[#00f2ff] drop-shadow-[0_0_10px_rgba(0,242,255,0.3)]">{row.totalPackagesDecimal}</td>
                <td className="p-4 text-center bg-white/[0.02]">
                  {row.fullPackages > 0 && (
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="text-2xl font-black text-white">{row.fullPackages}</span>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Thùng</span>
                    </div>
                  )}
                </td>
                <td className="p-4 text-center bg-[var(--primary)]/5">
                  {row.remainderQty > 0 && (
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="text-2xl font-black text-[var(--primary)]">{row.remainderQty}</span>
                      <span className="text-[10px] font-black text-[var(--primary)]/60 uppercase tracking-tighter">Cái</span>
                    </div>
                  )}
                </td>
                <td className="p-4 text-right text-lg font-black text-[var(--accent)]">{row.totalWeight.toFixed(2)} <span className="text-[10px] text-gray-600">KG</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {consolidated.length === 0 && (
          <div className="p-20 text-center text-gray-600 uppercase text-[10px] font-black tracking-widest">
            Không có dữ liệu tổng hợp
          </div>
        )}
      </div>
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
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-gray-600 tracking-widest uppercase">{session.weekKey}</span>
            {session.pickingDate && <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase flex items-center gap-1"><Calendar size={10} /> {session.pickingDate}</span>}
          </div>
          <MoreVertical size={12} className="text-gray-800" />
        </div>
        <h4 className="text-sm font-black text-white uppercase tracking-tight mb-3 flex items-center gap-2"><Store size={14} className="text-[var(--primary)]" /> {session.supermarket}</h4>
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[10px] text-gray-400"><Package size={12} className="text-gray-600" /> <span>{pickedCount}/{totalCount} món</span></div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1 text-[10px] text-[var(--primary)] font-bold"><Layers size={12} /> <span>{totalPackages} kiện</span></div>
              <div className="flex items-center gap-1 text-[10px] text-[var(--accent)] font-bold"><Scale size={12} /> <span>{totalWeightKg} kg</span></div>
            </div>
          </div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1 group-hover:text-[var(--primary)] transition-colors">SOẠN <ChevronRight size={12} /></div>
        </div>
        <div className="w-full h-1 bg-white/5 mb-6 relative overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={cn("h-full", progress === 100 ? "bg-green-500" : "bg-[var(--accent)]")} /></div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {session.status !== "COMPLETED" && (<button onClick={() => onStatusChange(session.id, session.status === "PENDING" ? "PROCESSING" : "COMPLETED")} className="flex-1 bg-white/5 hover:bg-[var(--primary)] hover:text-black text-[9px] font-bold py-2 uppercase tracking-widest transition-all">{session.status === "PENDING" ? "BẮT ĐẦU" : "XONG"}</button>)}
          {session.status !== "PENDING" && (<button onClick={() => onStatusChange(session.id, session.status === "COMPLETED" ? "PROCESSING" : "PENDING")} className="px-3 bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-[9px] font-bold py-2 uppercase transition-all">Lùi</button>)}
        </div>
      </div>
    </motion.div>
  );
};

// --- Main Kanban Board ---

export const KanbanBoard = ({ initialSessions }: { initialSessions: any[] }) => {
  const [sessions, setSessions] = useState(initialSessions);
  const [activeTab, setActiveTab] = useState<"kanban" | "summary">("kanban");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({
    PENDING: false,
    PROCESSING: false,
    COMPLETED: false
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  // Sync state with server props
  useEffect(() => {
    setSessions(initialSessions);
    setIsSyncing(false); // turn off spinner when data arrives
  }, [initialSessions]);

  const handleSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    router.refresh();
    // Fallback if data doesn't change
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const updateItemLocally = (itemId: string, qty: string, picked: boolean) => {
    setSessions(prev => {
      return prev.map(session => {
        // Find if this session contains the item
        const hasItem = session.items.some((i: any) => i.id === itemId);
        if (!hasItem) return session;

        // Update the item
        const updatedItems = session.items.map((i: any) => 
          i.id === itemId ? { ...i, actualQty: qty, isPicked: picked } : i
        );

        // Recalculate Session Status Automatically
        const total = updatedItems.length;
        const pickedCount = updatedItems.filter((i: any) => i.isPicked).length;
        
        let newStatus = "PENDING";
        if (pickedCount === total && total > 0) {
          newStatus = "COMPLETED";
        } else if (pickedCount > 0) {
          newStatus = "PROCESSING";
        }

        const updatedSession = { ...session, items: updatedItems, status: newStatus };
        
        // If this is the active session in modal, update it too
        if (activeSession && activeSession.id === session.id) {
          setActiveSession(updatedSession);
        }

        return updatedSession;
      });
    });
  };

  const weekKeys = useMemo(() => {
    const keys = Array.from(new Set(sessions.map(s => s.weekKey).filter(Boolean)));
    return keys.sort((a, b) => b.localeCompare(a));
  }, [sessions]);

  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(sessions.map(s => s.pickingDate).filter(Boolean)));
    return dates.sort((a, b) => b.localeCompare(a));
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const matchesWeek = selectedWeek === "all" || session.weekKey === selectedWeek;
      const matchesDate = selectedDates.length === 0 || selectedDates.includes(session.pickingDate);
      const matchesSearch = session.supermarket.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesWeek && matchesDate && matchesSearch;
    });
  }, [sessions, selectedWeek, selectedDates, searchQuery]);

  const summaryItems = useMemo(() => {
    return filteredSessions.flatMap(s => s.items);
  }, [filteredSessions]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    await updateSessionStatus(id, newStatus);
  };

  const toggleDate = (date: string) => {
    setSelectedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  };

  const toggleColumn = (id: string) => {
    setExpandedCols(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const columns = [
    { 
      id: "PENDING", 
      title: "Chưa soạn", 
      icon: Clock, 
      color: "text-gray-400", 
      border: "border-gray-500/20",
      glowColor: "rgba(156, 163, 175, 0.8)"
    },
    { 
      id: "PROCESSING", 
      title: "Đang soạn", 
      icon: Play, 
      color: "text-[var(--primary)]", 
      border: "border-[var(--primary)]/20",
      glowColor: "rgba(0, 242, 255, 0.8)"
    },
    { 
      id: "COMPLETED", 
      title: "Hoàn tất", 
      icon: CheckCircle, 
      color: "text-green-500", 
      border: "border-green-500/20",
      glowColor: "rgba(34, 197, 94, 0.8)"
    },
  ];

  return (
    <div className="space-y-8 pb-20 relative">
      {/* Tab Navigation */}
      <div className="flex gap-2">
        <div className="flex flex-1 bg-white/5 p-1 border border-white/10 rounded-sm">
          <button onClick={() => setActiveTab("kanban")} className={cn("flex-1 py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all", activeTab === "kanban" ? "bg-[var(--primary)] text-black shadow-lg" : "text-gray-500 hover:text-white")}>
            <LayoutDashboard size={16} /> Bảng soạn hàng
          </button>
          <button onClick={() => setActiveTab("summary")} className={cn("flex-1 py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all", activeTab === "summary" ? "bg-[var(--primary)] text-black shadow-lg" : "text-gray-500 hover:text-white")}>
            <ClipboardList size={16} /> Tổng hợp số lượng
          </button>
        </div>
        <button 
          onClick={handleSync} 
          className="w-[46px] h-[46px] rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 shadow-lg"
          title="Đồng bộ dữ liệu từ Google Sheets"
        >
          <RefreshCw size={18} className={cn("text-gray-400", isSyncing && "animate-spin text-[var(--primary)]")} />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-[var(--secondary)] p-6 border border-white/5">
        <div className="flex-1 space-y-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input type="text" placeholder="Tìm kiếm tên siêu thị..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black border border-white/10 pl-10 pr-4 py-3 text-[10px] uppercase tracking-widest text-white focus:border-[var(--primary)] outline-none" />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest w-full mb-1 flex items-center gap-2"><Filter size={10} /> Chọn ngày soạn:</span>
            {availableDates.map(date => (
              <button key={date} onClick={() => toggleDate(date)} className={cn("px-4 py-2 text-[9px] font-bold uppercase tracking-widest border transition-all", selectedDates.includes(date) ? "bg-[var(--accent)] border-[var(--accent)] text-black" : "bg-white/5 border-white/10 text-gray-500 hover:border-white/30")}>
                {date}
              </button>
            ))}
            {availableDates.length > 0 && (
              <button onClick={() => setSelectedDates([])} className={cn("px-4 py-2 text-[9px] font-bold uppercase tracking-widest border border-dashed border-white/20 text-gray-500 hover:text-white transition-all", selectedDates.length === 0 && "opacity-0")}>Xóa chọn</button>
            )}
          </div>
        </div>

        <div className="w-full md:w-64">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="w-full bg-black border border-white/10 pl-10 pr-10 py-3 text-[10px] font-black uppercase tracking-widest text-white outline-none appearance-none cursor-pointer">
              <option value="all">TẤT CẢ CÁC TUẦN</option>
              {weekKeys.map(key => (<option key={key} value={key}>{key}</option>))}
            </select>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "kanban" ? (
          <motion.div key="kanban" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {columns.map((col) => {
              const isExpanded = expandedCols[col.id];
              const colSessions = filteredSessions.filter(s => s.status === col.id);
              return (
                <div key={col.id} className="flex flex-col gap-2">
                  <button onClick={() => toggleColumn(col.id)} className={cn("flex items-center justify-between p-4 border-b-2 transition-all bg-white/[0.02] md:bg-transparent md:cursor-default", col.border, isExpanded ? "border-b-2" : "border-b-0 md:border-b-2")}>
                    <div className="flex items-center gap-3">
                      <col.icon size={18} className={col.color} />
                      <div className="flex flex-col items-start">
                        <h3 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">{col.title}</h3>
                        {!isExpanded && (
                          <span 
                            className={cn("text-xs font-black md:hidden", col.color)}
                            style={{ textShadow: `0 0 10px ${col.glowColor}` }}
                          >
                            {colSessions.length} đơn hàng
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span 
                        className={cn("text-lg font-black hidden md:block", col.color)}
                        style={{ textShadow: `0 0 12px ${col.glowColor}` }}
                       >
                         {colSessions.length}
                       </span>
                       <div className="md:hidden">{isExpanded ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}</div>
                    </div>
                  </button>
                  <div className={cn("flex-1 md:block transition-all overflow-hidden", isExpanded ? "block h-auto" : "hidden h-0 md:h-auto")}>
                    <div className="space-y-4 pt-2">
                      <AnimatePresence mode="popLayout">{colSessions.map((session) => (<KanbanCard key={session.id} session={session} onStatusChange={handleStatusChange} onOpenPicking={setActiveSession} />))}</AnimatePresence>
                      {colSessions.length === 0 && isExpanded && (<div className="py-10 border border-dashed border-white/5 flex flex-col items-center justify-center gap-2 opacity-30"><Store size={24} className="text-gray-700" /><span className="text-[9px] font-bold uppercase tracking-widest">Trống</span></div>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div key="summary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <SummaryTable items={summaryItems} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeSession && (
          <PickingModal 
            session={activeSession} 
            filteredSessions={filteredSessions}
            onClose={() => setActiveSession(null)} 
            onUpdateLocal={updateItemLocally} 
            onSwitchSession={setActiveSession}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
