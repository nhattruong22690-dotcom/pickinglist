"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { X, Camera, Zap, RefreshCw, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/shared/lib/utils";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const BarcodeScanner = ({ onScanSuccess, onClose }: BarcodeScannerProps) => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "barcode-scanner-container";

  useEffect(() => {
    let isMounted = true;
    const container = document.getElementById(containerId);

    const startScanner = async () => {
      // Add a small delay to ensure any previous session is fully closed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!isMounted) return;

      try {
        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (isMounted) onScanSuccess(decodedText);
          },
          () => {} // Ignore frame errors
        );

        if (isMounted) {
          setIsCameraReady(true);
          setIsScanning(true);
        }
      } catch (err: any) {
        if (isMounted) {
          // Suppress error in console since we handle it in the UI now
          console.warn("Scanner notice: Camera not available, switching to manual input mode.", err.name);
          setError("Không thể khởi động camera. Có thể camera đang bị ứng dụng khác sử dụng hoặc trình duyệt chưa được cấp quyền.");
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state !== Html5QrcodeScannerState.NOT_STARTED) {
          scannerRef.current.stop()
            .then(() => scannerRef.current?.clear())
            .catch(err => console.error("Error stopping scanner", err));
        }
      }
    };
  }, []); // Only run once on mount

  const toggleTorch = async () => {
    if (scannerRef.current && isScanning) {
      try {
        const nextTorchState = !torchOn;
        await scannerRef.current.applyVideoConstraints({
          // @ts-ignore - torch is not in standard types but supported by many browsers
          advanced: [{ torch: nextTorchState }]
        });
        setTorchOn(nextTorchState);
      } catch (err) {
        console.warn("Torch not supported on this device/browser");
      }
    }
  };

  const [manualCode, setManualCode] = useState("");

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 lg:p-12"
    >
      <div className="w-full max-w-lg aspect-square relative bg-white/5 border border-white/10 rounded-sm overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
        <div id={containerId} className="w-full h-full" />
        
        {/* Scanner Overlay UI */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div className="w-64 h-64 border-2 border-[var(--primary)]/30 relative">
            <motion.div 
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-[1px] bg-[var(--primary)] shadow-[0_0_15px_rgba(var(--primary-rgb),1)]" 
            />
            
            {/* Corners */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-[var(--primary)]" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-[var(--primary)]" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-[var(--primary)]" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-[var(--primary)]" />
          </div>
        </div>

        {!isCameraReady && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] gap-4">
            <RefreshCw size={32} className="text-[var(--primary)] animate-spin" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Đang kết nối camera...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0000] p-8 text-center gap-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-white font-black uppercase text-sm tracking-widest">Không thể mở Camera</h3>
              <p className="text-gray-500 text-[10px] uppercase leading-relaxed max-w-xs mx-auto">Thiết bị không có camera hoặc quyền truy cập bị từ chối.</p>
            </div>
            
            <form onSubmit={handleManualSubmit} className="w-full space-y-3 mt-4">
              <input 
                autoFocus
                type="text" 
                placeholder="NHẬP MÃ BARCODE TAY..." 
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full bg-white/5 border border-white/10 px-4 py-4 text-center text-xs font-black text-[var(--primary)] outline-none focus:border-[var(--primary)] transition-all"
              />
              <button 
                type="submit"
                className="w-full py-4 bg-[var(--primary)] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
              >
                Xác nhận mã
              </button>
            </form>

            <button 
              onClick={onClose}
              className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all mt-4"
            >
              Hủy bỏ
            </button>
          </div>
        )}
      </div>

      {!error && (
        <>
          <form onSubmit={handleManualSubmit} className="mt-8 w-full max-w-lg flex gap-2">
            <input 
              type="text" 
              placeholder="NHẬP MÃ TAY..." 
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 px-4 py-4 text-xs font-black text-white outline-none focus:border-[var(--primary)] transition-all"
            />
            <button 
              type="submit"
              className="px-8 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10"
            >
              Gửi
            </button>
          </form>

          <div className="mt-12 flex gap-8">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTorch}
              className={cn(
                "p-4 rounded-full border transition-all",
                torchOn ? "bg-[var(--primary)] border-[var(--primary)] text-black" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              )}
            >
              <Zap size={24} />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
            >
              <X size={24} />
            </motion.button>
          </div>
        </>
      )}

      <div className="mt-12 max-w-xs text-center">
        <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em] leading-relaxed">
          Sử dụng camera hoặc nhập mã thủ công
        </p>
      </div>
    </motion.div>
  );
};
