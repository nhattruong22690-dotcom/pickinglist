"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Sidebar } from "@/shared/components/Sidebar";
import { 
  Search, Database, Save, RefreshCw, Barcode, CheckCircle, 
  AlertTriangle, Box, Package, ChevronRight, X, ScanBarcode
} from "lucide-react";
import { getProductMasterData, updateProductBarcode } from "@/features/picking/actions/picking";
import { cn } from "@/shared/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { BarcodeScanner } from "@/features/picking/components/BarcodeScanner";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [newBarcode, setNewBarcode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    const data = await getProductMasterData();
    setProducts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const handleStartEdit = (product: any) => {
    setEditingProduct(product.name);
    setNewBarcode(product.barcode || "");
  };

  const handleSave = async (productName: string) => {
    setIsSaving(true);
    const result = await updateProductBarcode(productName, newBarcode);
    if (result.success) {
      setMessage({ type: "success", text: `Đã cập nhật mã cho "${productName}"` });
      setProducts(prev => prev.map(p => p.name === productName ? { ...p, sku: newBarcode } : p));
      setEditingProduct(null);
    } else {
      setMessage({ type: "error", text: result.error || "Có lỗi xảy ra" });
    }
    setIsSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="min-h-screen flex bg-black overflow-hidden font-mono">
      <Sidebar activeTab="products" />

      <main className="flex-1 relative overflow-y-auto p-4 lg:p-8">
        <header className="flex flex-col lg:flex-row justify-between items-center lg:items-end mb-12 gap-4 text-center lg:text-left">
          <div className="flex flex-col items-center lg:items-start w-full">
            <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tighter uppercase">
              Sản_Phẩm
              <span className="text-[var(--primary)]">.</span>
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] mt-2">
              Master Data / Barcode Management / Inventory
            </p>
          </div>
        </header>

        <div className="max-w-5xl mx-auto space-y-6">
          {/* Search & Stats */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Tìm tên sản phẩm hoặc mã vạch..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-4 text-xs uppercase tracking-widest text-white focus:border-[var(--primary)] outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Tổng sản phẩm:</span>
                <span className="text-xl font-black text-white leading-none">{products.length}</span>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <button 
                onClick={fetchProducts}
                className="p-2 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              >
                <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Product List */}
          <div className="glass-panel border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500 w-12">#</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Tên Sản Phẩm</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Mã SKU (Cột A)</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Mã BARCODE (Cột F)</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={4} className="p-8 bg-white/[0.01]" />
                      </tr>
                    ))
                  ) : filteredProducts.map((product, idx) => (
                    <tr key={product.name} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4 text-[10px] font-bold text-gray-600">{idx + 1}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white uppercase tracking-tight">{product.name}</span>
                          <span className="text-[9px] text-gray-500 uppercase font-bold flex items-center gap-2 mt-1">
                            <Box size={10} /> {product.specs} • {product.weight}g
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-mono text-gray-400">{product.sku}</span>
                      </td>
                      <td className="p-4">
                        {editingProduct === product.name ? (
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                              <input 
                                autoFocus
                                type="text" 
                                value={newBarcode}
                                onChange={(e) => setNewBarcode(e.target.value)}
                                className="w-full bg-black border border-[var(--primary)] pl-10 pr-10 py-2 text-sm font-black text-[var(--primary)] outline-none"
                                onKeyDown={(e) => e.key === "Enter" && handleSave(product.name)}
                              />
                              <button 
                                onClick={() => setIsScannerOpen(true)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[var(--primary)]"
                              >
                                <ScanBarcode size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "text-sm font-mono font-black px-3 py-1 border rounded-sm",
                              product.barcode ? "bg-white/5 border-white/10 text-[var(--primary)]" : "bg-red-500/10 border-red-500/30 text-red-500"
                            )}>
                              {product.barcode || "CHƯA CÓ MÃ"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {editingProduct === product.name ? (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingProduct(null)}
                              className="px-4 py-2 bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                              Hủy
                            </button>
                            <button 
                              onClick={() => handleSave(product.name)}
                              disabled={isSaving}
                              className="px-4 py-2 bg-[var(--primary)] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                            >
                              {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                              Lưu
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleStartEdit(product)}
                            className="px-6 py-2 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:border-white/30 transition-all group-hover:border-[var(--primary)]/30 group-hover:text-[var(--primary)]"
                          >
                            Thiết lập
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Floating Message */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={cn(
                "fixed bottom-8 right-8 px-6 py-4 border-2 shadow-2xl z-50 flex items-center gap-3",
                message.type === "success" ? "bg-black border-green-500 text-green-500" : "bg-black border-red-500 text-red-500"
              )}
            >
              {message.type === "success" ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              <span className="text-xs font-black uppercase tracking-widest">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanner Overlay */}
        <AnimatePresence>
          {isScannerOpen && (
            <BarcodeScanner 
              onScanSuccess={(code) => {
                setNewBarcode(code);
                setIsScannerOpen(false);
              }}
              onClose={() => setIsScannerOpen(false)}
            />
          )}
        </AnimatePresence>
      </main>

      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[var(--primary)] opacity-[0.02] blur-[150px] -z-10 pointer-events-none" />
    </div>
  );
}
