import React, { useEffect, useRef, useState, useCallback } from "react";
import init, { GPURenderer } from "./pkg/mandelbrot_wasm.js";
import "./App.css";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gpuRef = useRef<GPURenderer | null>(null);

  const [center, setCenter] = useState({ re: -0.5, im: 0.0 });
  const INITIAL_SCALE = 4.0 / window.innerHeight;
  const [scale, setScale] = useState(INITIAL_SCALE);

  const [fps, setFps] = useState(0);
  const fpsLastTime = useRef(performance.now());
  const fpsFrameCnt = useRef(0);
  const [showFps, setShowFps] = useState(true);

  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const pinchData = useRef<null | {
    initialDist: number;
    initialCenter: { re: number; im: number };
    initialScale: number;
    midpoint: { x: number; y: number };
  }>(null);

  useEffect(() => {
    init().then(() => {
      const gpu = new GPURenderer("mandelbrot", 500);
      gpuRef.current = gpu;
      gpu.render(center.re, center.im, scale);

      const onResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const c = canvasRef.current!;
        c.width = w;
        c.height = h;
        gpu.resize(w, h);
        gpu.render(center.re, center.im, scale);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    });
  }, []);

  useEffect(() => {
    let id: number;
    const loop = () => {
      gpuRef.current?.render(center.re, center.im, scale);

      fpsFrameCnt.current++;
      const now = performance.now();
      if (now - fpsLastTime.current >= 250) {
        setFps((fpsFrameCnt.current * 1000) / (now - fpsLastTime.current));
        fpsFrameCnt.current = 0;
        fpsLastTime.current = now;
      }

      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [center, scale]);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (!gpuRef.current) return;

      const dx = e.deltaX,
        dy = e.deltaY;
      const rect = canvasRef.current!.getBoundingClientRect();

      if (e.ctrlKey) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const zoom = dy < 0 ? 0.9 : 1.1;
        const newScale = Math.min(scale * zoom, INITIAL_SCALE);

        const cre = center.re + (x - rect.width / 2) * scale;
        const cim = center.im - (y - rect.height / 2) * scale;

        setScale(newScale);
        setCenter({
          re: cre - (x - rect.width / 2) * newScale,
          im: cim + (y - rect.height / 2) * newScale,
        });
      } else {
        setCenter((c) => ({
          re: c.re + dx * scale,
          im: c.im - dy * scale,
        }));
      }
    },
    [center, scale],
  );

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [onWheel]);

  useEffect(() => {
    const cvs = canvasRef.current!;
    const block = (e: Event) => e.preventDefault();
    cvs.addEventListener("gesturestart", block);
    cvs.addEventListener("gesturechange", block);
    cvs.addEventListener("gestureend", block);
    return () => {
      cvs.removeEventListener("gesturestart", block);
      cvs.removeEventListener("gesturechange", block);
      cvs.removeEventListener("gestureend", block);
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const [t0, t1] = Array.from(e.touches);
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      pinchData.current = {
        initialDist: Math.hypot(dx, dy),
        initialCenter: center,
        initialScale: scale,
        midpoint: {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        },
      };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      dragging.current = true;
      lastPos.current = { x: t.clientX, y: t.clientY };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const pd = pinchData.current;
    if (pd && e.touches.length === 2) {
      e.preventDefault();
      const [t0, t1] = Array.from(e.touches);
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.min(pd.initialScale * (pd.initialDist / dist), INITIAL_SCALE);

      const rect = canvasRef.current!.getBoundingClientRect();
      const x = pd.midpoint.x - rect.left;
      const y = pd.midpoint.y - rect.top;

      const cre = pd.initialCenter.re + (x - rect.width / 2) * pd.initialScale;
      const cim = pd.initialCenter.im - (y - rect.height / 2) * pd.initialScale;

      setScale(newScale);
      setCenter({
        re: cre - (x - rect.width / 2) * newScale,
        im: cim + (y - rect.height / 2) * newScale,
      });
    } else if (!pd && e.touches.length === 1 && dragging.current) {
      const t = e.touches[0];
      const dx = t.clientX - lastPos.current.x;
      const dy = t.clientY - lastPos.current.y;
      lastPos.current = { x: t.clientX, y: t.clientY };
      setCenter((c) => ({
        re: c.re - dx * scale,
        im: c.im + dy * scale,
      }));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchData.current = null;
    }

    if (e.touches.length === 1) {
      dragging.current = false;
    }

    if (e.touches.length === 0) {
      dragging.current = false;
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => {
    dragging.current = false;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setCenter((c) => ({
      re: c.re - dx * scale,
      im: c.im + dy * scale,
    }));
  };

  return (
    <div style={{ position: "relative" }}>
      <canvas
        id="mandelbrot"
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          display: "block",
          width: "100vw",
          height: "100vh",
          touchAction: "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
      />
      {showFps && (
        <div
          onClick={() => setShowFps(false)}
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "rgba(0,0,0,0.5)",
            color: "#0f0",
            padding: "4px",
            fontFamily: "monospace",
            zIndex: 1,
            cursor: "pointer",
          }}
        >
          FPS: {fps.toFixed(1)}
        </div>
      )}
    </div>
  );
}
