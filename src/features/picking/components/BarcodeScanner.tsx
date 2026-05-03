"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Zap, Keyboard, RefreshCw } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { createWorker } from "tesseract.js";

// Polyfill: import barcode-detector which provides native API or WASM fallback
import { BarcodeDetector as BarcodeDetectorPolyfill } from "barcode-detector";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
  mode?: "barcode" | "ocr";
}

// Beep sound as tiny inline audio (no external fetch = instant)
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1800;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 60 / 1000);
    setTimeout(() => ctx.close(), 200);
  } catch { /* silent */ }
};

export const BarcodeScanner = ({ onScanSuccess, onClose, mode = "barcode" }: BarcodeScannerProps) => {
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
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrFeedback, setOcrFeedback] = useState<string | null>(null);
  const workerRef = useRef<any>(null);

  const onScanRef = useRef(onScanSuccess);
  onScanRef.current = onScanSuccess;

  // --- OCR: Init worker once ---
  useEffect(() => {
    if (mode === "ocr") {
      (async () => {
        try {
          const w = await createWorker("eng");
          workerRef.current = w;
        } catch (e) { console.error("Tesseract init error", e); }
      })();
    }
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, [mode]);

  // --- OCR: Capture, crop, preprocess, recognize ---
  const handleCaptureAndOcr = async () => {
    if (!videoRef.current || !canvasRef.current || isOcrProcessing) return;
    if (!workerRef.current) { setOcrFeedback("Đang tải OCR, vui lòng chờ..."); return; }

    setIsOcrProcessing(true);
    setOcrFeedback(null);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;

      // Crop only the scan region (center 88% width, middle band)
      const cropX = Math.floor(vw * 0.06);
      const cropY = Math.floor(vh * 0.375);
      const cropW = Math.floor(vw * 0.88);
      const cropH = Math.floor(vh * 0.25);

      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      // Preprocess: grayscale + high contrast
      const imgData = ctx.getImageData(0, 0, cropW, cropH);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        const bw = gray > 128 ? 255 : 0; // binarize
        d[i] = d[i + 1] = d[i + 2] = bw;
      }
      ctx.putImageData(imgData, 0, 0);

      const { data: { text } } = await workerRef.current.recognize(canvas);

      if (text && text.trim()) {
        // Try to extract date pattern
        const dateMatch = text.match(/(\d{2})[\/\-\.\s](\d{2})[\/\-\.\s](\d{2,4})/);
        const contMatch = text.match(/(\d{6,8})/);

        if (dateMatch) {
          playBeep();
          onScanRef.current(text);
          setOcrFeedback(null);
        } else if (contMatch) {
          playBeep();
          onScanRef.current(text);
          setOcrFeedback(null);
        } else {
          setOcrFeedback(`Không tìm thấy ngày. OCR đọc: "${text.trim().slice(0, 40)}"`);
        }
      } else {
        setOcrFeedback("Không đọc được ký tự. Hãy đưa HSD gần camera hơn.");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      setOcrFeedback("Lỗi xử lý OCR. Thử lại.");
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // --- CORE: Start camera & detection loop ---
  const startCamera = useCallback(async () => {
    try {
      // 1. Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // @ts-ignore
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

      // 2. Attach to video element
      const video = videoRef.current!;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.setAttribute("autoplay", "true");
      await video.play();

      // 3. Mode handling
      if (mode === "barcode") {
        const Detector = (window as any).BarcodeDetector || BarcodeDetectorPolyfill;
        detectorRef.current = new Detector({
          formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"],
        });
        detectLoop();
      }

      if (mountedRef.current) {
        setIsReady(true);
        setError(null);
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = err?.name || err?.message || "";
      if (msg.includes("NotAllowed") || msg.includes("Permission")) {
        setError("Chưa cấp quyền Camera. Vào Cài đặt > Safari > Camera và bật quyền.");
      } else {
        setError("Không thể mở camera.");
      }
    }
  }, [mode]);

  // --- Detection loop for barcodes ---
  const detectLoop = useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || !mountedRef.current || mode !== "barcode") return;

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

          if (code !== lastCodeRef.current || now - lastTimeRef.current > 1000) {
            lastCodeRef.current = code;
            lastTimeRef.current = now;

            setLastScanned(code);
            setFlashBorder(true);
            setTimeout(() => mountedRef.current && setFlashBorder(false), 150);

            if (navigator.vibrate) navigator.vibrate(50);
            playBeep();
            onScanRef.current(code);
          }
        }
      } catch { /* ignore */ }

      if (mountedRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [mode]);

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
    <div className={cn("fixed inset-0 z-[200] bg-black flex flex-col transition-all duration-100", flashBorder && "ring-4 ring-inset ring-green-400")}>
      <div className="flex-1 relative overflow-hidden bg-black">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline autoPlay muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scan frame overlay */}
        {isReady && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-[3] bg-black/40" />
              <div className="flex-[2] flex">
                <div className="w-[6%] bg-black/40" />
                <div className="flex-1 relative">
                  <div className="absolute -top-[1px] -left-[1px] w-7 h-7 border-t-[3px] border-l-[3px] border-green-400 rounded-tl-sm" />
                  <div className="absolute -top-[1px] -right-[1px] w-7 h-7 border-t-[3px] border-r-[3px] border-green-400 rounded-tr-sm" />
                  <div className="absolute -bottom-[1px] -left-[1px] w-7 h-7 border-b-[3px] border-l-[3px] border-green-400 rounded-bl-sm" />
                  <div className="absolute -bottom-[1px] -right-[1px] w-7 h-7 border-b-[3px] border-r-[3px] border-green-400 rounded-br-sm" />
                  <div className={cn("absolute left-2 right-2 h-[2px] bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.6)] animate-[laserScan_1.5s_ease-in-out_infinite]", mode === "ocr" && "bg-blue-500 shadow-[0_0_8px_2px_rgba(59,130,246,0.6)]")} />
                </div>
                <div className="w-[6%] bg-black/40" />
              </div>
              <div className="flex-[3] bg-black/40" />
            </div>
          </div>
        )}

        {/* OCR Capture Button */}
        {isReady && mode === "ocr" && (
          <div className="absolute bottom-10 left-0 w-full flex flex-col items-center gap-3 pointer-events-auto">
             {ocrFeedback && (
               <div className="bg-red-500/90 backdrop-blur-sm px-4 py-2 rounded-lg max-w-[80%] text-center">
                 <span className="text-[11px] font-bold text-white">{ocrFeedback}</span>
               </div>
             )}
             <button 
               onClick={handleCaptureAndOcr}
               disabled={isOcrProcessing}
               className="w-20 h-20 bg-white/20 backdrop-blur-xl border-4 border-white/40 rounded-full flex items-center justify-center text-white active:scale-90 transition-all shadow-2xl relative"
             >
               {isOcrProcessing ? (
                 <RefreshCw size={32} className="animate-spin" />
               ) : (
                 <div className="w-14 h-14 bg-white rounded-full" />
               )}
               {isOcrProcessing && <div className="absolute -top-12 bg-black/80 px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">Đang xử lý OCR...</div>}
             </button>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-8 gap-5">
            <p className="text-sm font-bold text-red-400 text-center">{error}</p>
            <button onClick={() => { setError(null); setIsReady(false); startCamera(); }} className="px-8 py-3 bg-green-500 text-black text-xs font-black uppercase tracking-widest rounded-sm">Thử lại</button>
          </div>
        )}

        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 active:scale-90 transition-transform"><X size={20} /></button>
      </div>

      <div className="bg-black/95 border-t border-white/5 px-4 pt-3 pb-6 space-y-3">
        <div className="flex items-center justify-between min-h-[28px]">
          <div className="flex-1 overflow-hidden">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              {mode === "barcode" ? "Đưa mã vạch vào khung hình" : "Đưa hạn sử dụng vào khung và bấm nút chụp"}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {torchSupported && (
              <button onClick={toggleTorch} className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90", torchOn ? "bg-yellow-400 text-black" : "bg-white/10 text-white/60")}><Zap size={16} /></button>
            )}
            <button onClick={() => setShowManual(!showManual)} className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90", showManual ? "bg-green-400 text-black" : "bg-white/10 text-white/60")}><Keyboard size={16} /></button>
          </div>
        </div>

        {showManual && (
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input autoFocus type="text" placeholder="Nhập thủ công..." value={manualCode} onChange={(e) => setManualCode(e.target.value)} className="flex-1 bg-white/5 border border-white/10 px-3 py-2.5 text-sm font-mono text-white outline-none focus:border-green-400 transition-all rounded-sm" />
            <button type="submit" className="px-5 bg-green-500 text-black text-xs font-black uppercase tracking-widest rounded-sm">OK</button>
          </form>
        )}
      </div>

      <style jsx>{`
        @keyframes laserScan {
          0%, 100% { top: 35%; opacity: 0.8; }
          50% { top: 60%; opacity: 1; }
        }
      `}</style>
    </div>
  );
};
