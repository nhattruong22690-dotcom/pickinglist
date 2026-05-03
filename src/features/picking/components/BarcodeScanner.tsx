"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Zap, RefreshCw, AlertTriangle, Keyboard } from "lucide-react";
import { motion } from "framer-motion";
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
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const containerId = "barcode-scanner-container";

  // Stable callback ref to avoid re-renders
  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        // ignore cleanup errors
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Đảm bảo scanner cũ đã dừng hoàn toàn
    await stopScanner();

    // Chờ iOS giải phóng tài nguyên camera
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!isMountedRef.current) return;

    try {
      const html5QrCode = new Html5Qrcode(containerId, { 
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ]
      });
      scannerRef.current = html5QrCode;

      // Bỏ qrbox để sử dụng toàn bộ khung hình, giúp camera dễ lấy nét các mã vạch dài
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
        },
        (decodedText) => {
          if (isMountedRef.current) {
            onScanSuccessRef.current(decodedText);
          }
        },
        () => {} // ignore per-frame errors
      );

      if (isMountedRef.current) {
        setIsCameraReady(true);
        setIsScanning(true);
        setError(null);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;

      const errName = err?.name || err?.message || "";
      console.warn("[Scanner]", errName);

      if (errName.includes("NotAllowedError") || errName.includes("Permission")) {
        setError("Bạn đã từ chối quyền camera. Vào Cài đặt > Safari > Camera và bật lại quyền cho trang web này.");
      } else if (errName.includes("NotFoundError")) {
        setError("Thiết bị không có camera phía sau.");
      } else {
        // NotReadableError hoặc lỗi khác — camera bận
        setError("Camera đang bận hoặc chưa sẵn sàng. Nhấn 'Thử lại' hoặc nhập mã bằng tay.");
      }
    }
  }, [stopScanner]);

  // Mount / Unmount
  useEffect(() => {
    isMountedRef.current = true;
    startScanner();

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  // Retry handler
  const handleRetry = useCallback(async () => {
    setError(null);
    setIsCameraReady(false);
    setIsScanning(false);
    setRetryCount(prev => prev + 1);
    await startScanner();
  }, [startScanner]);

  const toggleTorch = async () => {
    if (scannerRef.current && isScanning) {
      try {
        const next = !torchOn;
        await scannerRef.current.applyVideoConstraints({
          // @ts-ignore
          advanced: [{ torch: next }],
        });
        setTorchOn(next);
      } catch {
        console.warn("Torch not supported");
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) onScanSuccess(manualCode.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center"
    >
      {/* Camera viewport */}
      <div className="w-full flex-1 relative bg-black overflow-hidden">
        <div id={containerId} className="w-full h-full" />

        {/* Scanning overlay */}
        {isCameraReady && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[85%] h-[35%] border-2 border-[var(--primary)]/40 relative">
              <motion.div
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-[2px] bg-[var(--primary)] shadow-[0_0_20px_rgba(var(--primary-rgb),0.8)]"
              />
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-3 border-l-3 border-[var(--primary)]" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-3 border-r-3 border-[var(--primary)]" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-3 border-l-3 border-[var(--primary)]" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-3 border-r-3 border-[var(--primary)]" />
            </div>
          </div>
        )}

        {/* Loading state */}
        {!isCameraReady && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4">
            <RefreshCw size={40} className="text-[var(--primary)] animate-spin" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Đang kết nối camera...
            </span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-8 text-center gap-5">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <p className="text-xs font-bold text-gray-300 leading-relaxed max-w-xs">{error}</p>

            <button
              onClick={handleRetry}
              className="w-full max-w-xs py-4 bg-[var(--primary)] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
            >
              Thử lại
            </button>

            <form onSubmit={handleManualSubmit} className="w-full max-w-xs space-y-3 mt-2">
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
                className="w-full py-3 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
              >
                Xác nhận mã
              </button>
            </form>

            <button onClick={onClose} className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-widest mt-2">
              Đóng
            </button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="w-full bg-black/95 border-t border-white/10 p-4 pb-8 space-y-4">
        {/* Manual input row (always visible when camera works) */}
        {!error && (
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="HOẶC NHẬP MÃ TAY..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-xs font-black text-white outline-none focus:border-[var(--primary)] transition-all"
            />
            <button
              type="submit"
              className="px-6 bg-[var(--primary)] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
            >
              Gửi
            </button>
          </form>
        )}

        {/* Action buttons */}
        <div className="flex justify-center gap-6">
          {isScanning && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTorch}
              className={cn(
                "p-3 rounded-full border transition-all",
                torchOn
                  ? "bg-[var(--primary)] border-[var(--primary)] text-black"
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              )}
            >
              <Zap size={22} />
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
          >
            <X size={22} />
          </motion.button>
        </div>

        <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em] text-center">
          Đưa mã vạch vào khung hình hoặc nhập mã thủ công
        </p>
      </div>
    </motion.div>
  );
};
