"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  ClipboardList, 
  Menu,
  X,
  ChevronRight,
  Database,
  BarChart3,
  FileUp
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  activeTab: "picking" | "master" | "dashboard" | "settings" | "import";
}

export const Sidebar = ({ activeTab }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: "picking", label: "Soạn hàng", icon: ClipboardList, href: "/picking" },
    { id: "import", label: "Nhập Excel", icon: FileUp, href: "/import" },
    { id: "master", label: "Dữ liệu gốc", icon: Database, href: "/master-data" },
    { id: "dashboard", label: "Thống kê", icon: BarChart3, href: "#" },
    { id: "settings", label: "Cài đặt", icon: Settings, href: "#" },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full py-8">
      {/* Brand Header */}
      <div className="px-6 mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--primary)] flex items-center justify-center rounded-sm">
            <span className="text-black font-black text-xl">P</span>
          </div>
          <div>
            <h2 className="text-white font-black tracking-tighter text-lg leading-none">PICKING</h2>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">SaaS / v1.0</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <Link 
              key={item.id} 
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "group flex items-center justify-between px-4 py-4 rounded-sm transition-all relative overflow-hidden",
                isActive 
                  ? "bg-[var(--primary)] text-black font-black" 
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-4 relative z-10">
                <item.icon size={20} className={cn(isActive ? "text-black" : "group-hover:text-[var(--primary)]")} />
                <span className="text-[10px] uppercase tracking-[0.2em]">{item.label}</span>
              </div>
              {isActive && (
                <motion.div 
                  layoutId="active-indicator"
                  className="absolute right-2 w-1.5 h-1.5 bg-black rounded-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pt-4 border-t border-white/5">
        <button className="w-full flex items-center gap-4 px-4 py-4 text-gray-600 hover:text-red-500 hover:bg-red-500/5 rounded-sm transition-all">
          <LogOut size={20} />
          <span className="text-[10px] uppercase tracking-[0.2em]">Đăng xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button - Moved to Top Left */}
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-6 left-6 z-[60] w-12 h-12 bg-black/40 backdrop-blur-xl border border-white/10 rounded-sm flex items-center justify-center text-white active:scale-95 transition-all shadow-2xl"
      >
        <Menu size={24} />
      </button>

      {/* Static Sidebar for Large Screens */}
      <aside className="hidden lg:flex w-72 h-screen border-r border-white/5 bg-black flex-col sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] lg:hidden"
            />
            
            {/* Drawer */}
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-[#0a0a0a] z-[80] border-r border-white/10 lg:hidden shadow-2xl shadow-black/100"
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white"
              >
                <X size={24} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
