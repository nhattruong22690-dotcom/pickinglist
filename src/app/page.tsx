import React from "react";
import { Sidebar } from "@/shared/components/Sidebar";
import { Boxes, FileUp, Columns4, Activity, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="min-h-screen flex bg-black overflow-hidden font-mono">
      <Sidebar activeTab="dashboard" />

      <main className="flex-1 relative overflow-y-auto p-4 lg:p-8">
        <div className="hud-line absolute top-0 left-0 w-full opacity-20" />
        
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-4">
          <div>
            <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tighter uppercase">
              Dashboard_
              <span className="text-[var(--primary)]">.</span>
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] mt-2">
              Industrial SaaS / Overview / System Health
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Quick Stats */}
          <div className="glass-panel p-6 border-l-2 border-[var(--primary)]">
            <div className="flex justify-between items-start mb-4">
              <Activity size={20} className="text-[var(--primary)]" />
              <span className="text-[8px] font-bold text-gray-600 tracking-[0.3em]">REAL-TIME</span>
            </div>
            <p className="text-[10px] text-gray-500 uppercase mb-1">Hệ thống đang chạy</p>
            <h3 className="text-2xl font-black text-white uppercase italic">Active_Stable</h3>
          </div>

          <div className="glass-panel p-6 border-l-2 border-[var(--accent)]">
            <div className="flex justify-between items-start mb-4">
              <TrendingUp size={20} className="text-[var(--accent)]" />
              <span className="text-[8px] font-bold text-gray-600 tracking-[0.3em]">PERFORMANCE</span>
            </div>
            <p className="text-[10px] text-gray-500 uppercase mb-1">Độ trễ Database</p>
            <h3 className="text-2xl font-black text-white uppercase italic">12ms_Low</h3>
          </div>

          <div className="glass-panel p-6 border-l-2 border-red-500">
            <div className="flex justify-between items-start mb-4">
              <AlertCircle size={20} className="text-red-500" />
              <span className="text-[8px] font-bold text-gray-600 tracking-[0.3em]">WARNINGS</span>
            </div>
            <p className="text-[10px] text-gray-500 uppercase mb-1">Cảnh báo tồn kho</p>
            <h3 className="text-2xl font-black text-white uppercase italic">0_None</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Link href="/import" className="glass-panel p-10 group hover:border-[var(--primary)] transition-all">
            <div className="mb-6 w-12 h-12 bg-white/5 flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-black transition-all">
              <FileUp size={24} />
            </div>
            <h3 className="text-xl font-black text-white uppercase mb-2">Nhập Dữ Liệu Excel_</h3>
            <p className="text-xs text-gray-500 uppercase tracking-widest leading-relaxed">
              Tải lên file abc.xlsx để tự động phân tách task cho các siêu thị.
            </p>
          </Link>

          <Link href="/picking" className="glass-panel p-10 group hover:border-[var(--accent)] transition-all">
            <div className="mb-6 w-12 h-12 bg-white/5 flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-black transition-all">
              <Columns4 size={24} />
            </div>
            <h3 className="text-xl font-black text-white uppercase mb-2">Bắt Đầu Soạn Hàng_</h3>
            <p className="text-xs text-gray-500 uppercase tracking-widest leading-relaxed">
              Truy cập bảng Kanban để thực hiện picking list và cập nhật số lượng thực tế.
            </p>
          </Link>
        </div>
      </main>
      
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[var(--primary)] opacity-[0.02] blur-[150px] -z-10 pointer-events-none" />
    </div>
  );
}
