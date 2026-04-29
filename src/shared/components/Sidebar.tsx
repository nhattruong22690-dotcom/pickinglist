"use client";

import React from "react";
import { 
  LayoutDashboard,
  Boxes,
  Truck,
  FileUp,
  Columns4,
  Settings,
  ChevronRight
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";

export const Sidebar = ({ activeTab }: { activeTab: string }) => {
  const menuItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Tổng Quan", href: "/" },
    { id: "import", icon: FileUp, label: "Nhập Dữ Liệu", href: "/import" },
    { id: "picking", icon: Columns4, label: "Soạn Hàng", href: "/picking" },
    { id: "inventory", icon: Boxes, label: "Tồn Kho", href: "#" },
    { id: "shipping", icon: Truck, label: "Giao Hàng", href: "#" },
  ];

  return (
    <motion.aside 
      initial={{ width: 80 }}
      whileHover={{ width: 240 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-screen border-r border-white/10 flex flex-col py-8 glass-panel z-50 group/sidebar overflow-hidden sticky top-0"
    >
      {/* Logo */}
      <div className="flex items-center px-6 mb-12 gap-4">
        <div className="w-8 h-8 min-w-[32px] bg-[var(--primary)] flex items-center justify-center text-black font-black text-xl">
          W
        </div>
        <span className="text-white font-black tracking-tighter uppercase whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
          Warehouse <span className="text-[var(--primary)]">SaaS</span>
        </span>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 px-3">
        {menuItems.map((item) => (
          <Link key={item.id} href={item.href}>
            <div className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-none transition-all relative group/item",
              activeTab === item.id 
                ? "bg-[var(--primary)]/10 border-l-2 border-[var(--primary)]" 
                : "hover:bg-white/5 border-l-2 border-transparent"
            )}>
              <item.icon 
                className={cn(
                  "min-w-[24px] transition-transform duration-300 group-hover/item:scale-110",
                  activeTab === item.id ? "text-[var(--primary)]" : "text-gray-500 group-hover/item:text-white"
                )} 
                size={24} 
              />
              <span className={cn(
                "whitespace-nowrap uppercase text-[10px] font-bold tracking-widest transition-all duration-300 opacity-0 group-hover/sidebar:opacity-100",
                activeTab === item.id ? "text-white" : "text-gray-500 group-hover/item:text-white"
              )}>
                {item.label}
              </span>

              {/* Subtle indicator for active tab when collapsed */}
              {activeTab === item.id && (
                <div className="absolute right-0 w-1 h-4 bg-[var(--primary)] opacity-100 group-hover/sidebar:opacity-0 transition-opacity" />
              )}
            </div>
          </Link>
        ))}
      </nav>
      
      {/* Footer Info */}
      <div className="mt-auto px-6 space-y-6">
        <div className="flex items-center gap-4 text-gray-500 hover:text-white cursor-pointer transition-colors group/settings">
          <Settings size={20} className="min-w-[20px] group-hover/settings:rotate-90 transition-transform duration-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
            Cài đặt
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-[10px] -rotate-90 text-gray-700 font-bold whitespace-nowrap tracking-[0.5em] group-hover/sidebar:rotate-0 group-hover/sidebar:text-[8px] transition-all duration-300">
            v1.0.42
          </div>
          <div className="h-[1px] flex-1 bg-white/5 opacity-0 group-hover/sidebar:opacity-100 transition-opacity" />
        </div>
      </div>
    </motion.aside>
  );
};
