"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Zap, Keyboard } from "lucide-react";
import { cn } from "@/shared/lib/utils";

// Polyfill: import barcode-detector which provides native API or WASM fallback
import { BarcodeDetector as BarcodeDetectorPolyfill } from "barcode-detector";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

// Beep sound as tiny inline audio (no external fetch = instant)
const BEEP_FREQ = 1800;
const BEEP_DURATION = 60;
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = BEEP_FREQ;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + BEEP_DURATION / 1000);
    setTimeout(() => ctx.close(), 200);
  } catch { /* silent */ }
};

export const BarcodeScanner = ({ onScanSuccess, onClose }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const lastCodeRef = useRef<string>("");
  const lastTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [flashBorder, setFlashBorder] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const onScanRef = useRef(onScanSuccess);
  onScanRef.current = onScanSuccess;

  // --- CORE: Start camera & detection loop ---
  const startCamera = useCallback(async () => {
    try {
      // 1. Get camera stream — optimized constraints for barcode scanning
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // @ts-ignore — advanced constraints for iOS autofocus
          focusMode: { ideal: "continuous" },
        },
        audio: false,
      });

      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;

      // Check torch support
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() as any;
      if (caps?.torch) setTorchSupported(true);

      // Apply continuous focus if supported
      try {
        // @ts-ignore
        if (caps?.focusMode?.includes("continuous")) {
          // @ts-ignore
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
        }
      } catch { /* ignore */ }

      // 2. Attach to video element
      const video = videoRef.current!;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.setAttribute("autoplay", "true");
      await video.play();

      // 3. Create BarcodeDetector
      const Detector = (window as any).BarcodeDetector || BarcodeDetectorPolyfill;
      detectorRef.current = new Detector({
        formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"],
      });

      if (mountedRef.current) {
        setIsReady(true);
        setError(null);
      }

      // 4. Start detection loop
      detectLoop();
    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = err?.name || err?.message || "";
      if (msg.includes("NotAllowed") || msg.includes("Permission")) {
        setError("Chưa cấp quyền Camera. Vào Cài đặt > Safari > Camera và bật quyền.");
      } else if (msg.includes("NotFound")) {
        setError("Không tìm thấy camera.");
      } else {
        setError("Không thể mở camera. Thử đóng các ứng dụng khác đang dùng camera.");
      }
    }
  }, []);

  // --- Detection loop: runs every frame ---
  const detectLoop = useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || !mountedRef.current) return;

    const tick = async () => {
      if (!mountedRef.current || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0 && mountedRef.current) {
          const code = barcodes[0].rawValue;
          const now = Date.now();

          // Anti-duplicate: ignore same code within 1 second
          if (code !== lastCodeRef.current || now - lastTimeRef.current > 1000) {
            lastCodeRef.current = code;
            lastTimeRef.current = now;

            // Visual feedback
            setLastScanned(code);
            setFlashBorder(true);
            setTimeout(() => mountedRef.current && setFlashBorder(false), 150);

            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(50);
            playBeep();

            // Callback
            onScanRef.current(code);
          }
        }
      } catch {
        // BarcodeDetector.detect can throw on invalid frames — ignore
      }

      if (mountedRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // --- Torch toggle ---
  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      // @ts-ignore
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch { /* torch not supported */ }
  }, [torchOn]);

  // --- Lifecycle ---
  useEffect(() => {
    mountedRef.current = true;
    startCamera();

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [startCamera]);

  // --- Manual submit ---
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
      setManualCode("");
      setLastScanned(manualCode.trim());
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] bg-black flex flex-col transition-all duration-100",
        flashBorder && "ring-4 ring-inset ring-green-400"
      )}
    >
      {/* Camera viewport — fullscreen */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scan frame overlay */}
        {isReady && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Dim areas outside scan zone */}
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-[3] bg-black/40" />
              <div className="flex-[2] flex">
                <div className="w-[6%] bg-black/40" />
                <div className="flex-1 relative">
                  {/* Corner brackets */}
                  <div className="absolute -top-[1px] -left-[1px] w-7 h-7 border-t-[3px] border-l-[3px] border-green-400 rounded-tl-sm" />
                  <div className="absolute -top-[1px] -right-[1px] w-7 h-7 border-t-[3px] border-r-[3px] border-green-400 rounded-tr-sm" />
                  <div className="absolute -bottom-[1px] -left-[1px] w-7 h-7 border-b-[3px] border-l-[3px] border-green-400 rounded-bl-sm" />
                  <div className="absolute -bottom-[1px] -right-[1px] w-7 h-7 border-b-[3px] border-r-[3px] border-green-400 rounded-br-sm" />

                  {/* Laser line */}
                  <div
                    className="absolute left-2 right-2 h-[2px] bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.6)] animate-[laserScan_1.5s_ease-in-out_infinite]"
                  />
                </div>
                <div className="w-[6%] bg-black/40" />
              </div>
              <div className="flex-[3] bg-black/40" />
            </div>
          </div>
        )}

        {/* Loading */}
        {!isReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="w-10 h-10 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-8 gap-5">
            <p className="text-sm font-bold text-red-400 text-center leading-relaxed">{error}</p>
            <button
              onClick={() => { setError(null); setIsReady(false); startCamera(); }}
              className="px-8 py-3 bg-green-500 text-black text-xs font-black uppercase tracking-widest rounded-sm"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Close button — top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 active:scale-90 transition-transform"
        >
          <X size={20} />
        </button>
      </div>

      {/* Bottom bar — minimal */}
      <div className="bg-black/95 border-t border-white/5 px-4 pt-3 pb-6 space-y-3">
        {/* Last scanned code */}
        <div className="flex items-center justify-between min-h-[28px]">
          <div className="flex-1 overflow-hidden">
            {lastScanned ? (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
                <span className="text-sm font-mono font-bold text-green-400 truncate">{lastScanned}</span>
              </div>
            ) : (
              <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Đưa mã vạch vào khung hình</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {torchSupported && (
              <button
                onClick={toggleTorch}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90",
                  torchOn ? "bg-yellow-400 text-black" : "bg-white/10 text-white/60"
                )}
              >
                <Zap size={16} />
              </button>
            )}
            <button
              onClick={() => setShowManual(!showManual)}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90",
                showManual ? "bg-green-400 text-black" : "bg-white/10 text-white/60"
              )}
            >
              <Keyboard size={16} />
            </button>
          </div>
        </div>

        {/* Manual input — toggle */}
        {showManual && (
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Nhập mã vạch..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 px-3 py-2.5 text-sm font-mono text-white outline-none focus:border-green-400 transition-all rounded-sm"
            />
            <button
              type="submit"
              className="px-5 bg-green-500 text-black text-xs font-black uppercase tracking-widest rounded-sm active:scale-95 transition-transform"
            >
              OK
            </button>
          </form>
        )}
      </div>

      {/* Laser animation keyframes */}
      <style jsx>{`
        @keyframes laserScan {
          0%, 100% { top: 10%; }
          50% { top: 88%; }
        }
      `}</style>
    </div>
  );
};
