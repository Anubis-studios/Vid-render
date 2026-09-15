import { useState, useEffect, useCallback, useRef } from 'react';

// --- Types ---
type StageStatus = 'PENDING' | 'PROCESSING' | 'DONE';

interface StageData {
  id: number;
  title: string;
  color: string;
  barColor: string;
  status: StageStatus;
  detail: string;
  barWidth: number;
}

interface OutputData {
  id: string;
  duration: string;
  style: string;
  size: string;
  renderTime: string;
  imageUrl: string;
}

// --- Utility Functions ---
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateSceneJson(prompt: string): { style: string } {
  const style = prompt.includes('pixel') ? 'PIXEL' :
    prompt.includes('vapor') ? 'VAPOR' :
      prompt.includes('toon') ? 'TOON' : 'NEON';
  return { style };
}

function generateStoryboard(shots: number): { total: string } {
  let currentTime = 0;
  for (let i = 0; i < shots; i++) {
    currentTime += (Math.random() * 0.7 + 0.8);
  }
  return { total: currentTime.toFixed(2) };
}

// --- Header Component ---
function Header() {
  const [time, setTime] = useState('00:00:00');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="p-4 border-b border-gray-800 bg-black/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full animate-pulse"></div>
          <h1 className="text-xl font-bold tracking-wider text-white">
            GAME-KIT <span className="text-xs text-cyan-400 align-top">TURBO ENGINE v3.0</span>
          </h1>
        </div>
        <div className="flex gap-4 text-xs text-gray-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            SYSTEM ONLINE
          </div>
          <div>{time}</div>
        </div>
      </div>
    </header>
  );
}

// --- Control Panel Component ---
interface ControlPanelProps {
  prompt: string;
  setPrompt: (v: string) => void;
  shotCount: number;
  setShotCount: (v: number) => void;
  formatType: string;
  setFormatType: (v: string) => void;
  overrideFx: boolean;
  setOverrideFx: (v: boolean) => void;
  overrideMotion: boolean;
  setOverrideMotion: (v: boolean) => void;
  onStart: () => void;
  isRunning: boolean;
}

function ControlPanel({
  prompt, setPrompt, shotCount, setShotCount,
  formatType, setFormatType, overrideFx, setOverrideFx,
  overrideMotion, setOverrideMotion, onStart, isRunning
}: ControlPanelProps) {
  return (
    <div className="lg:col-span-4 space-y-4">
      {/* Prompt Input */}
      <div className="bg-gray-900/90 p-5 rounded-lg border border-gray-700 shadow-lg">
        <label className="block text-cyan-400 text-xs mb-2 font-bold uppercase tracking-widest">Input Sequence</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-24 bg-black/50 border border-gray-600 rounded p-3 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors resize-none font-mono"
          placeholder="Describe scene..."
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1 uppercase">Shots</label>
            <select
              value={shotCount}
              onChange={(e) => setShotCount(parseInt(e.target.value))}
              className="w-full bg-black/50 border border-gray-600 rounded p-2 text-xs text-white"
            >
              <option value={3}>3 Shots</option>
              <option value={4}>4 Shots</option>
              <option value={5}>5 Shots</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1 uppercase">Format</label>
            <select
              value={formatType}
              onChange={(e) => setFormatType(e.target.value)}
              className="w-full bg-black/50 border border-gray-600 rounded p-2 text-xs text-white"
            >
              <option value="loop">Loop</option>
              <option value="gif">GIF</option>
            </select>
          </div>
        </div>

        <button
          onClick={onStart}
          disabled={isRunning}
          className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded text-sm uppercase tracking-widest transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
        >
          {isRunning ? 'Rendering...' : 'Initiate Render'}
        </button>
      </div>

      {/* Director Overrides */}
      <div className="bg-gray-900/90 p-5 rounded-lg border border-gray-700 shadow-lg">
        <label className="block text-purple-400 text-xs mb-3 font-bold uppercase tracking-widest">Overrides</label>
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-xs text-gray-400 group-hover:text-white">MORE FX</span>
            <input
              type="checkbox"
              checked={overrideFx}
              onChange={(e) => setOverrideFx(e.target.checked)}
              className="w-3 h-3 accent-purple-500"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-xs text-gray-400 group-hover:text-white">MORE MOTION</span>
            <input
              type="checkbox"
              checked={overrideMotion}
              onChange={(e) => setOverrideMotion(e.target.checked)}
              className="w-3 h-3 accent-purple-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// --- Stage Card Component ---
interface StageCardProps {
  stage: StageData;
  children?: React.ReactNode;
}

function StageCard({ stage, children }: StageCardProps) {
  const statusColors: Record<StageStatus, string> = {
    PENDING: 'text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400',
    PROCESSING: 'text-[10px] bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded border border-yellow-700',
    DONE: 'text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-700',
  };

  const cardClass = `stage-card p-3 rounded relative overflow-hidden ${stage.status === 'PROCESSING' ? 'active' : ''} ${stage.status === 'DONE' ? 'completed' : ''}`;

  return (
    <div className={cardClass}>
      <div className="flex justify-between items-center mb-1">
        <h3 className={`font-bold text-sm ${stage.color}`}>
          {stage.id === 5 ? (
            <span className="flex items-center gap-2">
              {stage.title}
              <span className="text-[8px] bg-green-900 text-green-300 px-1 rounded border border-green-700">GPU ACCEL</span>
            </span>
          ) : stage.title}
        </h3>
        <span className={statusColors[stage.status]}>{stage.status}</span>
      </div>
      {children ? (
        children
      ) : (
        <div className="text-[10px] text-gray-500 h-4 overflow-hidden whitespace-nowrap">
          {stage.detail}
        </div>
      )}
      <div
        className={`absolute bottom-0 left-0 h-0.5 loader-bar bar-${stage.barColor}`}
        style={{ width: `${stage.barWidth}%` }}
      />
    </div>
  );
}

// --- Final Output Component ---
interface FinalOutputProps {
  data: OutputData | null;
  visible: boolean;
}

function FinalOutput({ data, visible }: FinalOutputProps) {
  if (!visible || !data) return null;

  return (
    <div className="mt-4 bg-gray-900 border border-green-500/30 p-4 rounded-lg shadow-[0_0_20px_rgba(0,255,0,0.1)] slide-up">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold text-green-400 uppercase">Generation Complete</h2>
        <button className="text-[10px] bg-green-900/50 text-green-300 px-3 py-1 rounded hover:bg-green-800 transition border border-green-700">
          DOWNLOAD MP4
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="aspect-video bg-black rounded border border-gray-700 relative overflow-hidden group">
          <img
            src={data.imageUrl}
            alt="Generated Video Thumbnail"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center cursor-pointer hover:scale-110 transition-transform border border-white/20">
              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 text-[9px] rounded text-white font-mono">00:06</div>
        </div>

        <div className="space-y-2 text-[10px] font-mono">
          <div className="flex justify-between border-b border-gray-800 pb-1">
            <span className="text-gray-500">VIDEO ID</span>
            <span className="text-cyan-400">{data.id}</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-1">
            <span className="text-gray-500">DURATION</span>
            <span className="text-white">{data.duration}</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-1">
            <span className="text-gray-500">STYLE</span>
            <span className="text-purple-400">{data.style}</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-1">
            <span className="text-gray-500">SIZE</span>
            <span className="text-white">{data.size}</span>
          </div>
          <div className="mt-2 p-2 bg-gray-800/50 rounded text-[9px] text-gray-400 italic border-l-2 border-green-500">
            "Rendered in <span className="text-green-400 font-bold">{data.renderTime}</span> using Turbo Engine."
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App Component ---
function App() {
  const [prompt, setPrompt] = useState('A neon cat jumping through a cyberpunk city with particle effects');
  const [shotCount, setShotCount] = useState(4);
  const [formatType, setFormatType] = useState('loop');
  const [overrideFx, setOverrideFx] = useState(false);
  const [overrideMotion, setOverrideMotion] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [outputData, setOutputData] = useState<OutputData | null>(null);

  const [statusText, setStatusText] = useState('WAITING...');
  const [statusColor, setStatusColor] = useState('bg-gray-600');
  const [pipelineStatus, setPipelineStatus] = useState('IDLE');

  const [stages, setStages] = useState<StageData[]>([
    { id: 1, title: '01. SYNTHESIS', color: 'text-cyan-400', barColor: 'cyan', status: 'PENDING', detail: 'Parsing prompt...', barWidth: 0 },
    { id: 2, title: '02. STORYBOARD', color: 'text-purple-400', barColor: 'purple', status: 'PENDING', detail: 'Generating shots...', barWidth: 0 },
    { id: 3, title: '03. PERFORMANCE', color: 'text-yellow-400', barColor: 'yellow', status: 'PENDING', detail: 'Simulating inputs...', barWidth: 0 },
    { id: 4, title: '04. DIRECTOR AI', color: 'text-red-400', barColor: 'red', status: 'PENDING', detail: 'Applying cinematic rules...', barWidth: 0 },
    { id: 5, title: '05. TURBO RENDER', color: 'text-green-400', barColor: 'green', status: 'PENDING', detail: '', barWidth: 0 },
    { id: 6, title: '06. EXPORT', color: 'text-blue-400', barColor: 'blue', status: 'PENDING', detail: 'Finalizing...', barWidth: 0 },
  ]);

  const [renderFrames, setRenderFrames] = useState<number[]>([]);
  const pipelineRef = useRef(false);

  const updateStage = useCallback((id: number, updates: Partial<StageData>) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const resetStages = useCallback(() => {
    setStages([
      { id: 1, title: '01. SYNTHESIS', color: 'text-cyan-400', barColor: 'cyan', status: 'PENDING', detail: 'Parsing prompt...', barWidth: 0 },
      { id: 2, title: '02. STORYBOARD', color: 'text-purple-400', barColor: 'purple', status: 'PENDING', detail: 'Generating shots...', barWidth: 0 },
      { id: 3, title: '03. PERFORMANCE', color: 'text-yellow-400', barColor: 'yellow', status: 'PENDING', detail: 'Simulating inputs...', barWidth: 0 },
      { id: 4, title: '04. DIRECTOR AI', color: 'text-red-400', barColor: 'red', status: 'PENDING', detail: 'Applying cinematic rules...', barWidth: 0 },
      { id: 5, title: '05. TURBO RENDER', color: 'text-green-400', barColor: 'green', status: 'PENDING', detail: '', barWidth: 0 },
      { id: 6, title: '06. EXPORT', color: 'text-blue-400', barColor: 'blue', status: 'PENDING', detail: 'Finalizing...', barWidth: 0 },
    ]);
    setRenderFrames([]);
  }, []);

  const runStage = useCallback(async (num: number, task: () => Promise<void>) => {
    // Activate
    updateStage(num, { status: 'PROCESSING', barWidth: 30 });
    await sleep(50);
    updateStage(num, { barWidth: 70 });

    // Execute Task
    await task();

    // Complete
    updateStage(num, { status: 'DONE', barWidth: 100 });
  }, [updateStage]);

  const startPipeline = useCallback(async () => {
    if (!prompt) {
      alert('Please enter a prompt');
      return;
    }
    if (pipelineRef.current) return;
    pipelineRef.current = true;

    setIsRunning(true);
    setShowOutput(false);
    setOutputData(null);
    resetStages();

    setStatusText('PROCESSING REQUEST...');
    setStatusColor('bg-yellow-500');
    setPipelineStatus('RUNNING');

    try {
      // --- STAGE 1: SYNTHESIS ---
      await runStage(1, async () => {
        await sleep(200);
        const data = generateSceneJson(prompt);
        updateStage(1, { detail: `STYLE: ${data.style} | MOOD: PLAYFUL` });
      });

      // --- STAGE 2: STORYBOARD ---
      let storyboardData: { total: string };
      await runStage(2, async () => {
        await sleep(200);
        storyboardData = generateStoryboard(shotCount);
        updateStage(2, { detail: `${shotCount} SHOTS GENERATED | TOTAL: ${storyboardData.total}s` });
      });

      // --- STAGE 3: PERFORMANCE ---
      await runStage(3, async () => {
        await sleep(150);
        updateStage(3, { detail: `GESTURES: ${randomInt(3, 8)} | MIC SAMPLES: ${randomInt(40, 80)} | MOTION ACTIVE` });
      });

      // --- STAGE 4: DIRECTOR AI ---
      await runStage(4, async () => {
        await sleep(200);
        updateStage(4, { detail: 'APPLIED: PAN_LEFT, ZOOM_IN, FX_INTENSITY++' });
      });

      // --- STAGE 5: TURBO RENDER ---
      await runStage(5, async () => {
        const renderStartTime = Date.now();
        const frames: number[] = [];

        for (let i = 0; i < 5; i++) {
          await sleep(100);
          frames.push((i + 1) * 20);
          setRenderFrames([...frames]);
          updateStage(5, { barWidth: (i + 1) * 20 });
        }

        const renderEndTime = Date.now();
        const renderDuration = ((renderEndTime - renderStartTime) / 1000).toFixed(2);
        updateStage(5, { detail: `RENDER COMPLETE: 180 FRAMES (${renderDuration}s)` });

        // Store render time for output
        (window as any).__renderTime = renderDuration;
      });

      // --- STAGE 6: EXPORT ---
      await runStage(6, async () => {
        await sleep(100);
        updateStage(6, { detail: 'SAVED TO DEVICE | READY' });

        const finalId = `CKT_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${randomInt(1000, 9999)}`;
        const styleData = generateSceneJson(prompt);
        const storyboardFinal = generateStoryboard(shotCount);
        const renderTime = (window as any).__renderTime || '0.0';

        const styleMap: Record<string, string> = {
          'NEON': 'cyberpunk neon cityscape',
          'PIXEL': 'pixel art landscape',
          'VAPOR': 'vaporwave aesthetic sunset',
          'TOON': 'cartoon style illustration'
        };

        const imagePrompt = `A high quality ${styleMap[styleData.style]} with a character jumping, vibrant colors, 4k`;
        const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=600&height=400&nologo=true`;

        setOutputData({
          id: finalId,
          duration: storyboardFinal.total + 's',
          style: styleData.style,
          size: (Math.random() * 2 + 2).toFixed(1) + ' MB',
          renderTime: renderTime + 's',
          imageUrl: imgUrl,
        });

        setShowOutput(true);
      });

      setStatusText('PIPELINE FINISHED SUCCESSFULLY');
      setStatusColor('bg-green-500');
      setPipelineStatus('COMPLETED');
    } catch (e) {
      setStatusText('ERROR OCCURRED');
      setStatusColor('bg-red-500');
      setPipelineStatus('ERROR');
    } finally {
      setIsRunning(false);
      pipelineRef.current = false;
    }
  }, [prompt, shotCount, resetStages, runStage, updateStage]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="scanlines"></div>

      <Header />

      <main className="flex-grow p-4 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        <ControlPanel
          prompt={prompt}
          setPrompt={setPrompt}
          shotCount={shotCount}
          setShotCount={setShotCount}
          formatType={formatType}
          setFormatType={setFormatType}
          overrideFx={overrideFx}
          setOverrideFx={setOverrideFx}
          overrideMotion={overrideMotion}
          setOverrideMotion={setOverrideMotion}
          onStart={startPipeline}
          isRunning={isRunning}
        />

        <div className="lg:col-span-8 space-y-3">
          {/* Status Bar */}
          <div className="bg-black/60 p-3 rounded border border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${statusColor} ${isRunning ? 'animate-pulse' : ''}`}></div>
              <span className="text-xs font-mono text-gray-400">{statusText}</span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              ENGINE STATUS: <span className="text-cyan-500">{pipelineStatus}</span>
            </div>
          </div>

          {/* Pipeline Stages */}
          <div className="space-y-2">
            {stages.map((stage) => (
              <StageCard key={stage.id} stage={stage}>
                {stage.id === 5 ? (
                  <>
                    <div className="flex gap-1 mt-2 h-8">
                      {renderFrames.map((pct, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gray-800 rounded border border-gray-600 flex items-center justify-center text-[8px] text-gray-500 animate-pulse"
                        >
                          GPU {pct}%
                        </div>
                      ))}
                    </div>
                    {stage.detail && (
                      <div className="text-[10px] text-gray-500 mt-1">{stage.detail}</div>
                    )}
                  </>
                ) : (
                  <div className="text-[10px] text-gray-500 h-4 overflow-hidden whitespace-nowrap">
                    {stage.detail}
                  </div>
                )}
              </StageCard>
            ))}
          </div>

          {/* Final Output */}
          <FinalOutput data={outputData} visible={showOutput} />
        </div>
      </main>
    </div>
  );
}

export default App;
