"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Save, Calendar } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { savePickingSessions } from "../actions/picking";

export const ImportExcel = () => {
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [weekKey, setWeekKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
      
      if (rawData.length > 0) {
        setHeaders(rawData[0]);
        setData(rawData.slice(1));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = async () => {
    if (!weekKey) {
      setMessage({ type: 'error', text: "Vui lòng nhập Tuần (Week Key)!" });
      return;
    }

    setIsLoading(true);
    
    // Split into one session per row (supermarket)
    const sessionsToSave: any[] = [];
    
    data.forEach((row) => {
      const supermarket = row[0];
      if (!supermarket) return;

      const items: any[] = [];
      headers.slice(1).forEach((productName, index) => {
        const quantity = row[index + 1];
        if (quantity && parseInt(quantity) > 0) {
          items.push({
            productName,
            quantity: parseInt(quantity)
          });
        }
      });

      if (items.length > 0) {
        sessionsToSave.push({
          supermarket,
          items
        });
      }
    });

    const result = await savePickingSessions(weekKey, sessionsToSave);
    setIsLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: `Đã tạo ${sessionsToSave.length} Picking List thành công!` });
      setData([]);
      setHeaders([]);
      setWeekKey("");
    } else {
      setMessage({ type: 'error', text: "Lưu thất bại. Vui lòng thử lại." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-8 border-dashed border-2 border-white/10 flex flex-col items-center justify-center gap-4 group hover:border-[var(--primary)] transition-colors relative overflow-hidden">
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div className="p-4 bg-white/5 rounded-full group-hover:bg-[var(--primary)] group-hover:text-black transition-all">
          <Upload size={32} />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-white">Tải file Picking List (abc.xlsx)</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-tight mt-1">Hệ thống sẽ tự động tách mỗi dòng thành 1 Task Kanban</p>
        </div>
      </div>

      <AnimatePresence>
        {data.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-[var(--secondary)] p-6 border-l-4 border-[var(--primary)]">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Calendar size={12} className="text-[var(--primary)]" /> Nhập Mã Tuần
                </label>
                <input 
                  type="text" 
                  value={weekKey}
                  onChange={(e) => setWeekKey(e.target.value)}
                  placeholder="Ví dụ: TUAN-18-2026"
                  className="w-full bg-black border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--primary)] transition-colors uppercase font-mono"
                />
              </div>
              <button 
                onClick={handleSave}
                disabled={isLoading}
                className="cyber-button w-full md:w-auto flex items-center justify-center gap-2"
              >
                {isLoading ? "ĐANG TÁCH TASK..." : <><Save size={16} /> TẠO {data.length} PICKING LISTS</>}
              </button>
            </div>

            <div className="glass-panel overflow-hidden">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileSpreadsheet size={14} className="text-[var(--accent)]" /> Xem trước dữ liệu ({data.length} siêu thị)
                </h3>
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead className="sticky top-0 bg-[#1a1a1a] z-10">
                    <tr className="border-b border-white/10">
                      {headers.map((h, i) => (
                        <th key={i} className="p-3 font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        {headers.map((_, j) => (
                          <td key={j} className={cn("p-3 font-mono", j === 0 ? "text-white font-bold" : "text-gray-400")}>
                            {row[j] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {message && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "p-4 flex items-center gap-3 font-bold text-xs uppercase tracking-widest border",
            message.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
          )}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {message.text}
          <button 
            onClick={() => setMessage(null)}
            className="ml-auto opacity-50 hover:opacity-100"
          >
            Đóng
          </button>
        </motion.div>
      )}
    </div>
  );
};
