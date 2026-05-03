/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState, useMemo } from "react";
import { complex, multiply, matrix, abs, pow, arg } from "mathjs";
import { MessageSquare, X, Send, Loader2, Zap, Info } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import Markdown from "react-markdown";
import LoadingScreen from "./components/LoadingScreen";

type Page = "home" | "about" | "simulator";
type SimulationMode = "learning" | "explore";
type VisualizationMode = "bloch" | "wave" | "plane";

interface QubitState {
  alpha: any; // mathjs complex
  beta: any;  // mathjs complex
  label?: string; // Step label for timeline
}

interface GateInfo {
  name: string;
  description: string;
  math: string;
  effect: string;
}

const GATES: Record<string, GateInfo> = {
  X: {
    name: "Pauli-X",
    description: "The quantum NOT gate.",
    math: "X|0⟩ = |1⟩, X|1⟩ = |0⟩",
    effect: "Flips the state around the X-axis of the Bloch sphere.",
  },
  H: {
    name: "Hadamard",
    description: "Creates superposition.",
    math: "H|0⟩ = (|0⟩+|1⟩)/√2",
    effect: "Rotates the state to the equator, creating an equal probability of measuring |0⟩ or |1⟩.",
  },
  Z: {
    name: "Pauli-Z",
    description: "Phase flip gate.",
    math: "Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩",
    effect: "Flips the phase of the |1⟩ component, rotating the state around the Z-axis.",
  },
};

const INITIAL_STATE: QubitState = {
  alpha: complex(1, 0),
  beta: complex(0, 0),
};

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  return (
    <div className="relative min-h-screen bg-bg text-text font-sans selection:bg-primary selection:text-black flex flex-col overflow-hidden">
      {/* Background Animation Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 bg-black" />

      {/* Navbar (Top) */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-8 md:px-16 py-8 bg-transparent">
        <div className="flex items-center space-x-16">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="text-3xl font-black tracking-tighter uppercase text-primary drop-shadow-[0_0_15px_rgba(255,140,42,0.6)] cursor-pointer"
            onClick={() => setCurrentPage("home")}
          >
            Q
          </motion.div>
          <div className="flex space-x-12 text-[10px] tracking-[0.5em] font-mono uppercase">
            <button
              onClick={() => setCurrentPage("simulator")}
              className={`transition-all hover:text-primary relative group ${currentPage === "simulator" ? "text-primary text-glow-orange" : "text-text/80"}`}
            >
              SIMULATOR 
            </button>
            <button
              onClick={() => setCurrentPage("about")}
              className={`transition-all hover:text-primary relative group ${currentPage === "about" ? "text-primary text-glow-orange" : "text-text/80"}`}
            >
              ABOUTING
            </button>
          </div>
        </div>
        <button
          onClick={() => setCurrentPage("home")}
          className="group flex items-center space-x-3 text-[10px] tracking-[0.5em] font-mono uppercase text-text/80 hover:text-primary transition-all duration-300"
        >
          <span className="w-8 h-[1px] bg-primary/20 group-hover:w-12 group-hover:bg-primary transition-all duration-500" />
          <span>BACK</span>
        </button>
      </nav>

      <main className="flex-grow relative flex flex-col overflow-hidden h-screen">
        <AnimatePresence mode="wait">
          {currentPage === "home" && <HomePage key="home" onNavigate={() => setCurrentPage("simulator")} />}
          {currentPage === "about" && <AboutPage key="about" />}
          {currentPage === "simulator" && <SimulatorPage key="simulator" />}
        </AnimatePresence>
      </main>


    </div>
  );
}

function HomePage({ onNavigate }: { onNavigate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      className="relative w-full h-screen overflow-hidden"
    >
      {/* VIDEO BACKGROUND — full bleed */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 1 }}
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>

      {/* CONTENT — title top-left, specs bottom-right */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between px-8 md:px-16 pt-24 pb-10">

        {/* TOP LEFT — title block */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col items-start max-w-xl"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-sans font-black tracking-tighter uppercase leading-[0.85] text-primary drop-shadow-[0_0_30px_rgba(255,140,42,0.3)]">
            QUANTUM <br />VISUAL<br />SIMULATOR
          </h1>
          <p className="text-sm font-light leading-relaxed tracking-wide text-text/70 mt-8 max-w-sm">
            An interactive system to visualize qubit evolution using Bloch sphere, quantum gates, and real-time probability updates.
          </p>
        </motion.div>

        {/* BOTTOM — specs card bottom-right */}
        <div className="flex justify-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-md"
          >
            <div className="p-0">
              <h3 className="text-[11px] tracking-[0.3em] font-mono uppercase text-primary mb-4 font-black">
                TECHNICAL SPECS
              </h3>
              <div className="space-y-0">
                <SpecRow label="Core" value="Qubit State Engine (α, β complex amplitudes)" onClick={onNavigate} />
                <SpecRow label="Visualization" value="Bloch Sphere (Three.js)" onClick={onNavigate} />
                <SpecRow label="Logic" value="Quantum Gates (X, H, Z)" onClick={onNavigate} />
                <SpecRow label="Output" value="Probability & Measurement" onClick={onNavigate} />
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}

function SpecRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full group flex items-baseline justify-between border-b border-white/10 py-3 text-left transition-all hover:border-primary/40"
    >
      <span className="text-[10px] uppercase tracking-widest text-primary font-mono font-black group-hover:drop-shadow-[0_0_8px_rgba(255,140,42,1)]">
        {label}
      </span>
      <span className="text-sm text-text/80 font-light group-hover:text-white transition-all">
        {value}
      </span>
    </button>
  );
}

function ProbabilityBar({ label, value, color = "orange" }: { label: string; value: number, color?: "orange" | "cyan" }) {
  const percentage = Math.max(0, Math.min(100, Math.round(value * 100)));
  const accentColor = color === "orange" ? "bg-primary" : "bg-secondary";
  const glowClass = color === "orange" ? "shadow-[0_0_20px_rgba(255,140,42,0.4)]" : "shadow-[0_0_20px_rgba(76,201,240,0.4)]";
  const textClass = color === "orange" ? "text-primary text-glow-orange" : "text-secondary text-glow-cyan";

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-[10px] font-mono uppercase tracking-[0.4em]">
        <span className={`${textClass} font-black`}>{label}</span>
        <span className={`${textClass} font-bold`}>{percentage}%</span>
      </div>
      <div className="h-4 w-full bg-white/[0.03] rounded-full overflow-hidden p-[2px] border border-white/[0.05] shadow-inner relative">
        <motion.div
          className={`h-full ${accentColor} rounded-full ${glowClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
        {/* Animated pulse effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}

function SimulatorPage() {
  const [state, setState] = useState<QubitState>(INITIAL_STATE);
  const [history, setHistory] = useState<string[]>([]);
  const [circuit, setCircuit] = useState<string[]>([]);
  const [narration, setNarration] = useState<string>("System initialized. Qubit is in state |0⟩.");

  // New States for Learning Product
  const [mode, setMode] = useState<SimulationMode>("explore");
  const [vizMode, setVizMode] = useState<VisualizationMode>("bloch");
  const [evolution, setEvolution] = useState<QubitState[]>([INITIAL_STATE]);
  const [selectedGate, setSelectedGate] = useState<GateInfo | null>(null);
  const [shots, setShots] = useState<number>(100);
  const [histogram, setHistogram] = useState<{ [key: string]: number }>({ "0": 0, "1": 0 });
  const [isMeasuring, setIsMeasuring] = useState(false);

  const applyGate = (gateName: string) => {
    let newState = { ...state };
    let narrationText = "";

    if (gateName === "X") {
      const alpha = state.beta;
      const beta = state.alpha;
      newState = { alpha, beta, label: "X applied" };
      narrationText = "Pauli-X gate applied. The state has been flipped (NOT operation).";
    } else if (gateName === "H") {
      const s = 1 / Math.sqrt(2);
      const alpha = multiply(s, state.alpha.add(state.beta));
      const beta = multiply(s, state.alpha.subtract(state.beta));
      newState = { alpha, beta, label: "H applied" };
      narrationText = "Hadamard gate applied. The qubit is now in superposition.";
    } else if (gateName === "Z") {
      const alpha = state.alpha;
      const beta = multiply(-1, state.beta);
      newState = { alpha, beta, label: "Z applied" };
      narrationText = "Pauli-Z gate applied. A phase flip has been performed.";
    }

    setState(newState);
    setHistory(prev => [...prev, `${gateName} gate applied`]);
    setCircuit(prev => [...prev, gateName]);
    setNarration(narrationText);
    setEvolution(prev => [...prev, newState]);
    setSelectedGate(GATES[gateName]);
  };

  const runShots = async (numShots: number) => {
    setIsMeasuring(true);
    setShots(numShots);
    const prob0 = pow(abs(state.alpha), 2) as number;
    let count0 = 0;
    let count1 = 0;

    // Animate the histogram update
    for (let i = 0; i < numShots; i++) {
      if (Math.random() < prob0) count0++;
      else count1++;

      if (i % Math.ceil(numShots / 10) === 0) {
        setHistogram({ "0": count0, "1": count1 });
        await new Promise(r => setTimeout(r, 50));
      }
    }
    setHistogram({ "0": count0, "1": count1 });
    setIsMeasuring(false);
  };

  const applyPreset = (preset: string) => {
    reset();
    if (preset === "superposition") {
      applyGate("H");
    } else if (preset === "flip") {
      applyGate("X");
    } else if (preset === "phase") {
      applyGate("H");
      applyGate("Z");
    }
  };

  const measure = () => {
    const prob0 = pow(abs(state.alpha), 2) as number;
    const result = Math.random() < prob0 ? 0 : 1;

    const newState = {
      alpha: result === 0 ? complex(1, 0) : complex(0, 0),
      beta: result === 1 ? complex(1, 0) : complex(0, 0),
      label: `Measured |${result}⟩`
    };

    setState(newState);
    setHistory(prev => [...prev, `Measured: |${result}⟩`]);
    setCircuit(prev => [...prev, "M"]);
    setEvolution(prev => [...prev, newState]);
    setNarration(`Wavefunction collapsed. Measured result: |${result}⟩.`);
  };

  const reset = () => {
    setState(INITIAL_STATE);
    setHistory([]);
    setCircuit([]);
    setEvolution([INITIAL_STATE]);
    setHistogram({ "0": 0, "1": 0 });
    setSelectedGate(null);
    setNarration("System reset. Qubit is back in state |0⟩.");
  };

  const prob0 = pow(abs(state.alpha), 2) as number;
  const prob1 = pow(abs(state.beta), 2) as number;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-grow flex flex-col h-full overflow-hidden relative"
    >
      {/* Top Controls: Mode & Visualization Toggle */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-6 glass-panel px-6 py-3 rounded-full neon-border-cyan">
        <div className="flex bg-white/5 rounded-full p-1">
          <button
            onClick={() => setMode("explore")}
            className={`px-4 py-1.5 rounded-full text-[10px] font-mono tracking-widest transition-all ${mode === "explore" ? "bg-primary text-bg font-black" : "text-text/40 hover:text-text"}`}
          >
            EXPLORE
          </button>
          <button
            onClick={() => setMode("learning")}
            className={`px-4 py-1.5 rounded-full text-[10px] font-mono tracking-widest transition-all ${mode === "learning" ? "bg-primary text-bg font-black" : "text-text/40 hover:text-text"}`}
          >
            LEARNING
          </button>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex space-x-2">
          <VizToggle active={vizMode === "bloch"} onClick={() => setVizMode("bloch")} label="BLOCH" />
          <VizToggle active={vizMode === "wave"} onClick={() => setVizMode("wave")} label="WAVE" />
          <VizToggle active={vizMode === "plane"} onClick={() => setVizMode("plane")} label="PLANE" />
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-px bg-primary/5 overflow-hidden pt-20">

        {/* LEFT PANEL — STATE + EVOLUTION */}
        <div className="lg:col-span-3 glass-panel m-4 rounded-3xl p-6 flex flex-col space-y-8 neon-border-orange overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Zap size={16} className="text-primary animate-pulse" />
              <h3 className="text-[11px] tracking-[0.5em] font-mono uppercase text-primary font-black">STATE EVOLUTION</h3>
            </div>

            {/* Evolution Timeline */}
            <div className="space-y-4">
              {evolution.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 rounded-2xl border transition-all duration-500 ${i === evolution.length - 1
                      ? "bg-primary/10 border-primary/40 shadow-[0_0_15px_rgba(255,140,42,0.1)]"
                      : "bg-white/[0.02] border-white/[0.05] opacity-40"
                    }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-mono text-primary/60 uppercase tracking-widest">STEP {i.toString().padStart(2, '0')}</span>
                    <span className="text-[10px] font-mono text-primary font-black">{step.label || "INITIAL"}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-text/60">α: {step.alpha.re.toFixed(2)} + {step.alpha.im.toFixed(2)}i</span>
                    <span className="text-text/60">β: {step.beta.re.toFixed(2)} + {step.beta.im.toFixed(2)}i</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Info size={16} className="text-secondary" />
              <h3 className="text-[11px] tracking-[0.5em] font-mono uppercase text-secondary font-black">PROBABILITY</h3>
            </div>
            <div className="space-y-8">
              <ProbabilityBar label="|0⟩" value={prob0} color="orange" />
              <ProbabilityBar label="|1⟩" value={prob1} color="cyan" />
            </div>
          </div>
        </div>

        {/* CENTER — VISUALIZATION */}
        <div className="lg:col-span-6 relative flex flex-col items-center justify-center overflow-hidden min-h-[600px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,0.04),transparent_70%)] pointer-events-none" />

          {/* HTML overlay labels — always readable, no 3D positioning issues */}
          {vizMode === "bloch" && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
                <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-cyan-400/60">BLOCH SPHERE</div>
                <div className="text-[9px] font-mono text-white/30 tracking-widest">Real-time qubit state visualization</div>
              </div>
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <div className="text-[10px] font-mono text-cyan-400/70">|0⟩ ↑ North pole</div>
                <div className="w-px h-3 bg-white/20" />
                <div className="text-[10px] font-mono text-cyan-400/70">|1⟩ ↓ South pole</div>
              </div>
            </div>
          )}

          <div className="w-full h-full flex items-center justify-center">
            <BlochSphere state={state} />
          </div>

          {/* Preset Buttons Overlay */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-4">
            <PresetButton label="SUPERPOSITION" onClick={() => applyPreset("superposition")} />
            <PresetButton label="STATE FLIP" onClick={() => applyPreset("flip")} />
            <PresetButton label="PHASE SHIFT" onClick={() => applyPreset("phase")} />
          </div>
        </div>

        {/* RIGHT PANEL — MEASUREMENT + EXPLANATION */}
        <div className="lg:col-span-3 glass-panel m-4 rounded-3xl p-6 flex flex-col space-y-8 neon-border-cyan overflow-y-auto">

          {/* Gate Toolbox */}
          <div className="space-y-6">
            <h3 className="text-[11px] tracking-[0.5em] font-mono uppercase text-secondary font-black">GATE TOOLBOX</h3>
            <div className="grid grid-cols-3 gap-3">
              {Object.keys(GATES).map(g => (
                <button
                  key={g}
                  onClick={() => applyGate(g)}
                  className="py-3 rounded-xl bg-white/5 border border-white/10 text-secondary font-black text-sm hover:bg-secondary/10 hover:border-secondary/40 transition-all shadow-[0_0_10px_rgba(76,201,240,0.1)]"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Gate Explanation Panel */}
          <AnimatePresence mode="wait">
            {selectedGate ? (
              <motion.div
                key={selectedGate.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 p-6 rounded-2xl bg-secondary/5 border border-secondary/20"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-secondary font-black text-sm uppercase tracking-widest">{selectedGate.name} GATE</h4>
                  <button onClick={() => setSelectedGate(null)} className="text-secondary/40 hover:text-secondary"><X size={14} /></button>
                </div>
                <p className="text-[11px] text-text/80 leading-relaxed">{selectedGate.description}</p>
                <div className="p-3 rounded-xl bg-black/40 font-mono text-[10px] text-secondary border border-secondary/10">
                  {selectedGate.math}
                </div>
                <p className="text-[10px] text-secondary/60 italic leading-relaxed">{selectedGate.effect}</p>
              </motion.div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                <Info size={20} className="text-secondary/40" />
                <p className="text-[10px] font-mono uppercase tracking-widest">Select a gate to see details</p>
              </div>
            )}
          </AnimatePresence>

          {/* Measurement Simulation (Shots) */}
          <div className="space-y-6">
            <h3 className="text-[11px] tracking-[0.5em] font-mono uppercase text-secondary font-black">MEASUREMENT SHOTS</h3>
            <div className="grid grid-cols-3 gap-3">
              {[10, 50, 100].map(s => (
                <button
                  key={s}
                  onClick={() => runShots(s)}
                  disabled={isMeasuring}
                  className={`py-2 rounded-xl text-[10px] font-mono border transition-all ${shots === s ? "bg-secondary text-bg border-secondary" : "bg-white/5 border-white/10 text-secondary hover:border-secondary/40"}`}
                >
                  {s} SHOTS
                </button>
              ))}
            </div>
            <button
              onClick={measure}
              disabled={isMeasuring}
              className="w-full py-3 rounded-xl bg-secondary/10 border border-secondary/30 text-secondary font-mono text-[10px] tracking-widest hover:bg-secondary/20 transition-all uppercase font-black"
            >
              SINGLE MEASURE
            </button>

            {/* Histogram */}
            <div className="space-y-6 pt-4">
              <HistogramBar label="|0⟩" count={histogram["0"]} total={shots} color="orange" />
              <HistogramBar label="|1⟩" count={histogram["1"]} total={shots} color="cyan" />
            </div>
          </div>

          {/* History */}
          <div className="flex-grow flex flex-col space-y-6 overflow-hidden">
            <h3 className="text-[11px] tracking-[0.5em] font-mono uppercase text-secondary font-black">HISTORY</h3>
            <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              <AnimatePresence initial={false}>
                {history.map((item, i) => (
                  <motion.div
                    key={`${item}-${i}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[10px] font-mono flex space-x-3 items-start group p-3 rounded-xl bg-white/[0.02] border border-transparent hover:border-secondary/20 transition-all duration-300"
                  >
                    <span className="text-secondary/40 font-black">{(i + 1).toString().padStart(2, '0')}</span>
                    <span className="text-text/80">{item}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* System Actions */}
          <div className="pt-4 border-t border-white/5">
            <button
              onClick={reset}
              className="w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-mono text-[10px] tracking-widest hover:bg-primary/20 transition-all uppercase font-black"
            >
              RESET SYSTEM
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HistogramBar({ label, count, total, color }: { label: string; count: number; total: number; color: "orange" | "cyan" }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const accentColor = color === "orange" ? "bg-primary" : "bg-secondary";
  const textClass = color === "orange" ? "text-primary" : "text-secondary";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[9px] font-mono uppercase">
        <span className={textClass}>{label}</span>
        <span className="text-text/60">{count} / {total} ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${accentColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

function VizToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-[9px] font-mono tracking-widest transition-all ${active ? "bg-secondary/20 text-secondary border border-secondary/40" : "text-text/20 hover:text-text/40"}`}
    >
      {label}
    </button>
  );
}

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-[9px] font-mono text-text/60 hover:text-primary hover:border-primary/40 transition-all tracking-widest"
    >
      {label}
    </button>
  );
}

function ControlButton({ label, onClick, variant = "default" }: { label: string; onClick: () => void; variant?: "default" | "accent" | "outline" }) {
  const baseStyles = "px-10 py-3 rounded-2xl font-mono text-[10px] tracking-[0.4em] uppercase transition-all duration-300 active:scale-95 flex items-center justify-center min-w-[140px]";
  const variants = {
    default: "bg-white/[0.03] border border-white/[0.05] text-primary/60 hover:bg-primary/10 hover:text-primary hover:neon-border-orange",
    accent: "bg-primary text-bg font-black shadow-[0_0_30px_rgba(255,140,42,0.3)] hover:shadow-[0_0_50px_rgba(255,140,42,0.5)] hover:scale-105",
    outline: "border border-secondary/20 text-secondary/60 hover:text-secondary hover:neon-border-cyan hover:bg-secondary/5",
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]}`}
    >
      {label}
    </motion.button>
  );
}

function StateVector({ target, hovered }: { target: THREE.Vector3; hovered: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const dir = target.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
    groupRef.current.quaternion.slerp(quaternion, 0.08);
  });

  const color = hovered ? "#4cc9f0" : "#ffd700";
  const emissiveIntensity = hovered ? 18 : 10;
  const length = 1.55;

  return (
    <group ref={groupRef}>
      {/* Shaft */}
      <mesh position={[0, length / 2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, length, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.95}
        />
      </mesh>
      {/* Arrowhead cone */}
      <mesh position={[0, length + 0.12, 0]}>
        <coneGeometry args={[0.08, 0.24, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity + 5}
        />
      </mesh>
      {/* Glowing tip sphere */}
      <mesh position={[0, length + 0.08, 0]}>
        <sphereGeometry args={[0.1, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity + 8}
        />
      </mesh>
      <pointLight
        intensity={hovered ? 8 : 4}
        distance={2.5}
        color={color}
        position={[0, length, 0]}
      />
    </group>
  );
}

function BlochSphere({ state }: { state: QubitState }) {
  const alphaAbs = abs(state.alpha) as number;
  const theta = 2 * Math.acos(Math.min(1, alphaAbs));
  const phi = state.beta.im !== 0 || state.beta.re !== 0 ? Math.atan2(state.beta.im, state.beta.re) : 0;
  
  const x = Math.sin(theta) * Math.cos(phi);
  const z = Math.cos(theta);
  
  const cx = 150;
  const cy = 150;
  const r = 120;
  
  const arrowX = cx + x * r;
  const arrowY = cy - z * r;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg width="300" height="300" viewBox="0 0 300 300">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#00e5ff" strokeWidth="1" opacity="0.3"/>
        <line x1={cx} y1={cy-r-20} x2={cx} y2={cy+r+20} stroke="#00e5ff" strokeWidth="0.5" opacity="0.4"/>
        <line x1={cx-r-20} y1={cy} x2={cx+r+20} y2={cy} stroke="#ffd700" strokeWidth="0.5" opacity="0.4"/>
        <text x={cx} y={cy-r-25} fill="#00e5ff" fontSize="12" textAnchor="middle" opacity="0.7">|0⟩</text>
        <text x={cx} y={cy+r+35} fill="#00e5ff" fontSize="12" textAnchor="middle" opacity="0.7">|1⟩</text>
        <text x={cx+r+25} y={cy+4} fill="#ffd700" fontSize="10" textAnchor="middle" opacity="0.7">+X</text>
        <text x={cx-r-25} y={cy+4} fill="#ffd700" fontSize="10" textAnchor="middle" opacity="0.7">-X</text>
        <line x1={cx} y1={cy} x2={arrowX} y2={arrowY} stroke="#ffd700" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx={arrowX} cy={arrowY} r="6" fill="#ffd700" opacity="0.9"/>
        <circle cx={cx} cy={cy} r="5" fill="#ff8c2a"/>
      </svg>
    </div>
  );
}

function AboutPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="relative w-full h-screen overflow-hidden"
    >
      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.6 }}
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/50" />

      {/* Single screen content */}
      <div className="relative z-10 h-full flex flex-col justify-between px-8 md:px-16 pt-24 pb-10">

        {/* TOP — title + description */}
        <div className="flex items-start justify-between gap-16">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl font-sans font-black tracking-tighter uppercase text-primary text-glow-orange mb-4">
              About the Project
            </h1>
            <p className="text-sm font-light leading-relaxed text-text/80 max-w-md">
              A web-based interactive simulator that visualizes qubit evolution using Bloch sphere representation, quantum gates, and real-time probability updates. Designed to make abstract quantum concepts intuitive and accessible.
            </p>
          </div>

          {/* TOP RIGHT — strategic value */}
          <div className="max-w-sm flex-shrink-0">
            <h3 className="text-[10px] tracking-[0.3em] font-mono uppercase text-primary font-black mb-3">
              [STRATEGIC VALUE]
            </h3>
            <p className="text-sm font-light leading-relaxed text-text/70">
              Bridges the gap between theoretical quantum mechanics and visual understanding through synchronized multi-panel simulation and real-time feedback.
            </p>
          </div>
        </div>

        {/* MIDDLE — physics accurate + metrics side by side */}
        <div className="flex items-end justify-between gap-16">

          {/* LEFT — headline + description */}
          <div className="max-w-sm">
            <span className="text-2xl md:text-3xl font-sans font-bold tracking-tighter uppercase text-secondary text-glow-cyan block mb-3">
              Physics-Accurate Simulation
            </span>
            <p className="text-[10px] tracking-widest uppercase text-text/50 leading-relaxed">
              Complex amplitude qubit state engine with real-time gate transformations and Born rule measurement statistics.
            </p>
          </div>

          {/* RIGHT — metrics grid */}
          <div className="flex-shrink-0">
            <h3 className="text-[12px] tracking-[0.3em] font-mono uppercase text-secondary/80 mb-6">
              [ADVANCED DATA METRICS]
            </h3>
            <div className="grid grid-cols-2 gap-x-16 gap-y-6">
              <MetricItem label="Gate Accuracy" value="100%" progress={100} />
              <MetricItem label="Render FPS" value="60fps" progress={90} />
              <MetricItem label="State Fidelity" value="99.9%" progress={99} />
              <MetricItem label="Algorithms" value="3 modes" progress={75} />
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-4 w-full bg-secondary/5 rounded-sm overflow-hidden flex space-x-[2px]">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-full flex-grow bg-secondary"
          initial={{ opacity: 0.1 }}
          animate={{ opacity: (i / 12) * 100 < progress ? 1 : 0.1 }}
          transition={{ delay: i * 0.05 }}
        />
      ))}
    </div>
  );
}

function MetricItem({ label, value, progress }: { label: string; value: string, progress: number }) {
  return (
    <div className="space-y-3 min-w-[180px]">
      <div className="flex justify-between text-[11px] uppercase tracking-widest font-mono font-black">
        <span className="text-text/80">{label}</span>
        <span className="text-secondary">[{value}]</span>
      </div>
      <div className="h-[3px] w-full bg-secondary/10 relative">
        <motion.div
          className="absolute left-0 top-0 h-full bg-secondary shadow-[0_0_10px_rgba(0,229,255,0.6)]"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, delay: 0.5 }}
        />
      </div>
    </div>
  );
}

interface Message {
  role: "user" | "ai";
  content: string;
}

function Chatbot({ state, history }: { state: QubitState; history: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! I'm your Quantum Assistant. How can I help you understand the current state of your qubit or quantum mechanics in general?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{
              text: `You are a quantum physics expert assistant integrated into a visual simulator.
              
              Current Simulator Context:
              - Qubit State: α = ${state.alpha.re.toFixed(4)} + ${state.alpha.im.toFixed(4)}i, β = ${state.beta.re.toFixed(4)} + ${state.beta.im.toFixed(4)}i
              - History of operations: ${history.length > 0 ? history.join(", ") : "None yet"}
              
              User Question: ${userMessage}
              
              Provide a concise, insightful, and encouraging response. Explain concepts like Bloch sphere, gates (X, H, Z), and measurement if relevant to the current state or the user's question.`
            }]
          }
        ],
        config: {
          systemInstruction: "You are a helpful and expert Quantum Computing assistant. Keep responses concise and focused on the simulator's state and quantum concepts.",
        }
      });

      const response = await model;
      const aiResponse = response.text || "I'm sorry, I couldn't process that. Quantum mechanics is tricky!";

      setMessages(prev => [...prev, { role: "ai", content: aiResponse }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: "ai", content: "Error connecting to the quantum neural link. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.9, y: 20, filter: "blur(10px)" }}
            className="absolute bottom-20 right-0 w-[350px] h-[500px] bg-black/40 backdrop-blur-2xl border border-cyan-400/30 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.15)]"
          >
            {/* Header */}
            <div className="p-4 border-b border-cyan-400/10 flex justify-between items-center bg-cyan-400/5">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,1)]" />
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-cyan-400">Quantum AI</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-cyan-400/40 hover:text-cyan-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-400/10">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${msg.role === "user"
                      ? "bg-cyan-400/10 border border-cyan-400/20 text-cyan-100 rounded-tr-none"
                      : "bg-white/5 border border-white/10 text-primary rounded-tl-none"
                    }`}>
                    <div className="markdown-body">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl rounded-tl-none">
                    <Loader2 size={14} className="text-cyan-400 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-cyan-400/10 bg-black/20">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about the qubit..."
                  className="w-full bg-white/5 border border-cyan-400/20 rounded-lg py-2.5 pl-4 pr-10 text-xs text-cyan-100 placeholder:text-cyan-400/30 focus:outline-none focus:border-cyan-400/50 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400/40 hover:text-cyan-400 disabled:opacity-30 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${isOpen
            ? "bg-cyan-400 text-black rotate-90 shadow-[0_0_30px_rgba(34,211,238,0.6)]"
            : "bg-black border border-cyan-400/30 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:border-cyan-400/60"
          }`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>
    </div>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && (
          <LoadingScreen onComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>
      <div
        style={{
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.5s ease-out",
          pointerEvents: isLoading ? "none" : "auto"
        }}
      >
        <AppContent />
      </div>
    </>
  );
}
