import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2, Key, Trophy, Ghost } from 'lucide-react';

const App = () => {
  // State management
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [detectives, setDetectives] = useState([
    { name: 'Jake', row: 0, col: 0, hasKey: true, emoji: '🕵️', color: 'bg-blue-500' },
    { name: 'Amy', row: 4, col: 4, hasKey: false, emoji: '👮‍♀️', color: 'bg-pink-500' },
    { name: 'Rosa', row: 2, col: 0, hasKey: false, emoji: '🦸‍♀️', color: 'bg-purple-500' }
  ]);
  const [trophy, setTrophy] = useState({ row: 2, col: 2 });
  const [lockedDoors, setLockedDoors] = useState([
    { row: 1, col: 2 },
    { row: 2, col: 1 }
  ]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [simulationData, setSimulationData] = useState(null);
  const [winner, setWinner] = useState(null);
  const [floatingElements, setFloatingElements] = useState([]);
  
  const intervalRef = useRef(null);

  // Initialize floating elements
  useEffect(() => {
    const elements = [];
    const icons = ['🦇', '👻', '💀', '🎃', '🕷️', '🕸️', '🧛', '🧟'];
    for (let i = 0; i < 20; i++) {
      elements.push({
        id: i,
        icon: icons[Math.floor(Math.random() * icons.length)],
        left: Math.random() * 100,
        duration: 15 + Math.random() * 20,
        delay: Math.random() * 10,
        size: 1 + Math.random() * 2
      });
    }
    setFloatingElements(elements);
  }, []);

  // Multi-agent BFS algorithm with simultaneous movement
    // Multi-agent BFS algorithm (optimized and corrected)
  // Compute shortest path from each detective to the trophy individually
const runBFS = () => {
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];

  const isValid = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const lockedSet = new Set(lockedDoors.map(d => `${d.row},${d.col}`));

  // ---- Helper: BFS to get shortest path for one detective ----
  const bfsForDetective = (start, hasKey) => {
    const queue = [[start, [start]]];
    const visited = new Set([`${start.row},${start.col}`]);

    while (queue.length > 0) {
      const [pos, path] = queue.shift();
      if (pos.row === trophy.row && pos.col === trophy.col) {
        return path; // shortest path found
      }

      for (const [dr, dc] of directions) {
        const newR = pos.row + dr;
        const newC = pos.col + dc;
        if (!isValid(newR, newC)) continue;

        const key = `${newR},${newC}`;
        const isLocked = lockedSet.has(key);
        if (isLocked && !hasKey) continue; // can’t pass locked door

        if (!visited.has(key)) {
          visited.add(key);
          queue.push([{ row: newR, col: newC }, [...path, { row: newR, col: newC }]]);
        }
      }
    }
    return null; // no path exists
  };

  // ---- Compute each detective's shortest path ----
  const results = detectives.map(det => ({
    name: det.name,
    idx: detectives.indexOf(det),
    path: bfsForDetective({ row: det.row, col: det.col }, det.hasKey),
  }));

  // Filter out detectives who can't reach the trophy
  const valid = results.filter(r => r.path);

  if (valid.length === 0) {
    return { steps: [], winner: null, winnerPath: [] };
  }

  // ---- Determine how many steps to animate ----
  const maxSteps = Math.max(...valid.map(r => r.path.length));
  const steps = [];

  let winner = null;

  // Simulate all detectives moving step-by-step
  for (let step = 0; step < maxSteps; step++) {
    const currentPositions = valid.map(r => {
      const pos = r.path[Math.min(step, r.path.length - 1)];
      return { ...pos, name: r.name };
    });

    // Check if anyone reached the trophy this step
    const arrivals = valid.filter(r => r.path.length - 1 === step);
    if (arrivals.length > 0 && !winner) {
      // Lexicographically smallest name wins if tie
      winner = arrivals.sort((a, b) => a.name.localeCompare(b.name))[0];
      // Stop animation after this frame
      steps.push({ positions: currentPositions, step });
      return {
        steps,
        winner: { idx: winner.idx, name: winner.name },
        winnerPath: winner.path,
      };
    }

    // Record frame
    steps.push({ positions: currentPositions, step });
  }

  // Fallback: no one reached (shouldn’t happen if valid.length > 0)
  return {
    steps,
    winner: { idx: valid[0].idx, name: valid[0].name },
    winnerPath: valid[0].path,
  };
};




  // Start simulation
  const startSimulation = () => {
    if (detectives.length === 0) {
      alert('Please add at least one detective!');
      return;
    }
    
    const result = runBFS();
    setSimulationData(result);
    setWinner(result.winner);
    setCurrentStep(0);
    setIsSimulating(true);
    setIsPaused(false);
  };

  // Animation loop
  useEffect(() => {
    if (isSimulating && !isPaused && simulationData) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= simulationData.steps.length - 1) {
            setIsSimulating(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / speed);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSimulating, isPaused, speed, simulationData]);

  // Reset
  const reset = () => {
    setIsSimulating(false);
    setIsPaused(false);
    setCurrentStep(0);
    setSimulationData(null);
    setWinner(null);
  };

  const currentStepData = simulationData?.steps[currentStep];
  const currentUnlockedDoors = currentStepData?.unlockedDoors || new Set();
  const winnerPath = simulationData?.winnerPath || [];
  const showWinnerPath = currentStep === simulationData?.steps.length - 1 && winner;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/1267697/pexels-photo-1267697.jpeg?auto=compress&cs=tinysrgb&w=1920')",
          opacity: 0.3
        }}
      />
      
      {/* Floating Halloween Elements */}
      {floatingElements.map(elem => (
        <div
          key={elem.id}
          className="absolute animate-float pointer-events-none"
          style={{
            left: `${elem.left}%`,
            fontSize: `${elem.size}rem`,
            animationDuration: `${elem.duration}s`,
            animationDelay: `${elem.delay}s`,
            top: '-50px'
          }}
        >
          {elem.icon}
        </div>
      ))}

      <div className="relative z-10 container mx-auto p-4">
        {/* Title */}
        <h1 className="text-5xl font-bold text-center mb-8 text-orange-500 animate-pulse drop-shadow-[0_0_15px_rgba(255,165,0,0.8)]">
          🎃 Brooklyn Nine-Nine Halloween Heist 🎃
        </h1>

        {!isSimulating ? (
          /* Setup Mode */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Configuration */}
            <div className="space-y-6">
              {/* Grid Size */}
              <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl border-4 border-orange-600 shadow-[0_0_30px_rgba(255,165,0,0.5)] backdrop-blur-sm bg-opacity-70">
                <h2 className="text-2xl font-bold text-orange-400 mb-4 flex items-center gap-2">
                  🕸️ Grid Configuration
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-orange-300 mb-2">Rows (2-20)</label>
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={rows}
                      onChange={(e) => setRows(Math.min(20, Math.max(2, parseInt(e.target.value) || 2)))}
                      className="w-full px-3 py-2 bg-black border-2 border-orange-500 rounded text-orange-300 focus:border-orange-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-orange-300 mb-2">Columns (2-20)</label>
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={cols}
                      onChange={(e) => setCols(Math.min(20, Math.max(2, parseInt(e.target.value) || 2)))}
                      className="w-full px-3 py-2 bg-black border-2 border-orange-500 rounded text-orange-300 focus:border-orange-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Detectives */}
              <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl border-4 border-orange-600 shadow-[0_0_30px_rgba(255,165,0,0.5)] backdrop-blur-sm bg-opacity-70 relative">
                <div className="absolute -top-3 -right-3 text-4xl animate-bounce">🧛</div>
                <h2 className="text-2xl font-bold text-orange-400 mb-4 flex items-center gap-2">
                  🕵️ Detectives
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {detectives.map((det, idx) => (
                    <div key={idx} className="bg-black bg-opacity-60 p-3 rounded-lg border-2 border-orange-700 flex items-center gap-2">
                      <span className="text-3xl">{det.emoji}</span>
                      <input
                        type="text"
                        value={det.name}
                        onChange={(e) => {
                          const newDets = [...detectives];
                          newDets[idx].name = e.target.value;
                          setDetectives(newDets);
                        }}
                        className="flex-1 px-2 py-1 bg-gray-900 border border-orange-600 rounded text-orange-300 text-sm"
                        placeholder="Name"
                      />
                      <input
                        type="number"
                        value={det.row}
                        onChange={(e) => {
                          const newDets = [...detectives];
                          newDets[idx].row = Math.min(rows - 1, Math.max(0, parseInt(e.target.value) || 0));
                          setDetectives(newDets);
                        }}
                        className="w-16 px-2 py-1 bg-gray-900 border border-orange-600 rounded text-orange-300 text-sm"
                        placeholder="Row"
                      />
                      <input
                        type="number"
                        value={det.col}
                        onChange={(e) => {
                          const newDets = [...detectives];
                          newDets[idx].col = Math.min(cols - 1, Math.max(0, parseInt(e.target.value) || 0));
                          setDetectives(newDets);
                        }}
                        className="w-16 px-2 py-1 bg-gray-900 border border-orange-600 rounded text-orange-300 text-sm"
                        placeholder="Col"
                      />
                      <button
                        onClick={() => {
                          const newDets = [...detectives];
                          newDets[idx].hasKey = !newDets[idx].hasKey;
                          setDetectives(newDets);
                        }}
                        className={`p-2 rounded ${det.hasKey ? 'bg-yellow-600' : 'bg-gray-700'}`}
                      >
                        <Key size={16} />
                      </button>
                      <button
                        onClick={() => setDetectives(detectives.filter((_, i) => i !== idx))}
                        className="p-2 bg-red-700 rounded hover:bg-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const emojis = ['🕵️', '👮‍♀️', '🦸‍♀️', '💪', '👨‍✈️', '👩‍🚒', '🧙‍♂️', '🦹‍♂️'];
                    const colors = ['bg-blue-500', 'bg-pink-500', 'bg-purple-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-teal-500'];
                    setDetectives([...detectives, {
                      name: `Detective${detectives.length + 1}`,
                      row: 0,
                      col: 0,
                      hasKey: false,
                      emoji: emojis[detectives.length % emojis.length],
                      color: colors[detectives.length % colors.length]
                    }]);
                  }}
                  className="mt-3 w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  <Plus size={20} /> Add Detective
                </button>
              </div>

              {/* Trophy & Locked Doors */}
              <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl border-4 border-orange-600 shadow-[0_0_30px_rgba(255,165,0,0.5)] backdrop-blur-sm bg-opacity-70 relative">
                <div className="absolute -top-3 -left-3 text-4xl animate-spin" style={{animationDuration: '3s'}}>🎃</div>
                <h2 className="text-2xl font-bold text-orange-400 mb-4">🏆 Trophy Location</h2>
                <div className="flex gap-4 mb-6">
                  <input
                    type="number"
                    value={trophy.row}
                    onChange={(e) => setTrophy({ ...trophy, row: Math.min(rows - 1, Math.max(0, parseInt(e.target.value) || 0)) })}
                    className="flex-1 px-3 py-2 bg-black border-2 border-orange-500 rounded text-orange-300"
                    placeholder="Row"
                  />
                  <input
                    type="number"
                    value={trophy.col}
                    onChange={(e) => setTrophy({ ...trophy, col: Math.min(cols - 1, Math.max(0, parseInt(e.target.value) || 0)) })}
                    className="flex-1 px-3 py-2 bg-black border-2 border-orange-500 rounded text-orange-300"
                    placeholder="Column"
                  />
                </div>

                <h2 className="text-2xl font-bold text-orange-400 mb-4">🔒 Locked Doors</h2>
                <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                  {lockedDoors.map((door, idx) => (
                    <div key={idx} className="bg-black bg-opacity-60 p-2 rounded border-2 border-red-700 flex items-center gap-2">
                      <span className="text-red-500">🔒</span>
                      <span className="text-orange-300">Row: {door.row}, Col: {door.col}</span>
                      <button
                        onClick={() => setLockedDoors(lockedDoors.filter((_, i) => i !== idx))}
                        className="ml-auto p-1 bg-red-700 rounded hover:bg-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setLockedDoors([...lockedDoors, { row: 0, col: 0 }])}
                  className="w-full py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  <Plus size={20} /> Add Locked Door
                </button>
              </div>

              <button
                onClick={startSimulation}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-xl font-bold rounded-xl shadow-[0_0_30px_rgba(255,165,0,0.7)] transition-all transform hover:scale-105"
              >
                🎬 Start Heist Simulation
              </button>
            </div>

            {/* Right Panel - Preview Grid */}
            <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl border-4 border-orange-600 shadow-[0_0_30px_rgba(255,165,0,0.5)] backdrop-blur-sm bg-opacity-70 relative">
              <div className="absolute -top-4 -right-4 text-5xl">👻</div>
              <div className="absolute -bottom-4 -left-4 text-5xl">🦇</div>
              <h2 className="text-2xl font-bold text-orange-400 mb-4 text-center">🗺️ Precinct Preview</h2>
              <div 
                className="grid gap-2 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  maxWidth: '600px'
                }}
              >
                {Array.from({ length: rows }).map((_, r) =>
                  Array.from({ length: cols }).map((_, c) => {
                    const isLocked = lockedDoors.some(d => d.row === r && d.col === c);
                    const isTrophy = trophy.row === r && trophy.col === c;
                    const detsHere = detectives.filter(d => d.row === r && d.col === c);

                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`aspect-square border-4 rounded-lg flex items-center justify-center relative transition-all ${
                          isLocked ? 'bg-red-900 border-red-600 shadow-[0_0_15px_rgba(255,0,0,0.5)]' :
                          isTrophy ? 'bg-yellow-900 border-yellow-600 shadow-[0_0_15px_rgba(255,215,0,0.5)]' :
                          'bg-gray-800 border-orange-700'
                        }`}
                      >
                        {isTrophy && <Trophy className="text-yellow-400 animate-pulse" size={24} />}
                        {isLocked && <span className="text-2xl">🔒</span>}
                        {detsHere.map((det, idx) => (
                          <span key={idx} className="absolute text-2xl" style={{ transform: `translate(${idx * 8}px, ${idx * 8}px)` }}>
                            {det.emoji}
                          </span>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Simulation Mode */
          <div className="space-y-6">
            {/* Controls */}
            <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl border-4 border-orange-600 shadow-[0_0_30px_rgba(255,165,0,0.5)] backdrop-blur-sm bg-opacity-60 relative">
              <div className="absolute -top-3 -right-3 text-4xl animate-bounce">🧟</div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg flex items-center gap-2 shadow-lg transition-all"
                  >
                    {isPaused ? <Play size={20} /> : <Pause size={20} />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={reset}
                    className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 shadow-lg transition-all"
                  >
                    <RotateCcw size={20} /> Reset
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-orange-300 font-bold text-lg">⏱️ Step: {currentStep}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-300">🐌 Speed:</span>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-32"
                    />
                    <span className="text-orange-300 font-bold">{speed}x 🚀</span>
                  </div>
                </div>
              </div>

              {winner && currentStep === simulationData.steps.length - 1 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg border-2 border-yellow-500 text-center animate-pulse">
                  <p className="text-2xl font-bold text-yellow-300">
                    🏆 Winner: {winner.name} reached the trophy in {currentStep} minutes! 🏆
                  </p>
                </div>
              )}
            </div>

            {/* Grid */}
            <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl border-4 border-orange-600 shadow-[0_0_30px_rgba(255,165,0,0.5)] backdrop-blur-sm bg-opacity-60 relative">
              <div className="absolute -top-4 -left-4 text-5xl animate-bounce">💀</div>
              <div className="absolute -bottom-4 -right-4 text-5xl animate-pulse">🕷️</div>
              <div 
                className="grid gap-3 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  maxWidth: '800px'
                }}
              >
                {Array.from({ length: rows }).map((_, r) =>
                  Array.from({ length: cols }).map((_, c) => {
                    const lockedKey = `${r},${c}`;
                    const isLocked = lockedDoors.some(d => d.row === r && d.col === c);
                    const isUnlocked = currentUnlockedDoors.has(lockedKey);
                    const isTrophy = trophy.row === r && trophy.col === c;
                    const detsHere = currentStepData?.positions.filter(p => p.row === r && p.col === c) || [];
                    const isOnWinnerPath = showWinnerPath && winnerPath.some(p => p.row === r && p.col === c);

                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`aspect-square border-4 rounded-lg flex items-center justify-center relative transition-all duration-300 ${
                          isLocked && !isUnlocked ? 'bg-red-900 border-red-600 shadow-[0_0_20px_rgba(255,0,0,0.6)]' :
                          isLocked && isUnlocked ? 'bg-green-900 border-green-600 shadow-[0_0_20px_rgba(0,255,0,0.6)] animate-pulse' :
                          isTrophy ? 'bg-yellow-900 border-yellow-600 shadow-[0_0_20px_rgba(255,215,0,0.6)]' :
                          isOnWinnerPath ? 'bg-orange-800 border-orange-500 shadow-[0_0_20px_rgba(255,165,0,0.8)]' :
                          'bg-gray-800 bg-opacity-70 border-orange-700'
                        }`}
                      >
                        {isOnWinnerPath && <span className="absolute text-4xl animate-bounce">🎃</span>}
                        {isTrophy && <Trophy className="text-yellow-400 animate-pulse absolute" size={32} />}
                        {isLocked && !isUnlocked && <span className="text-3xl absolute">🔒</span>}
                        {isLocked && isUnlocked && <span className="text-3xl absolute">🔓</span>}
                        {detsHere.map((det, idx) => {
                          const detective = detectives.find(d => d.name === det.name);
                          return (
                            <div key={idx} className="absolute" style={{ transform: `translate(${idx * 10}px, ${idx * 10}px)` }}>
                              <span className="text-4xl drop-shadow-lg animate-bounce">{detective?.emoji}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detective Status */}
            <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl border-4 border-orange-600 shadow-[0_0_30px_rgba(255,165,0,0.5)] backdrop-blur-sm bg-opacity-60">
              <h3 className="text-2xl font-bold text-orange-400 mb-4">👥 Detective Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {detectives.map((det, idx) => {
                  const currentPos = currentStepData?.positions.find(p => p.name === det.name);
                  const isWinner = winner && winner.name === det.name;
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isWinner ? 'bg-yellow-900 border-yellow-500 shadow-[0_0_20px_rgba(255,215,0,0.8)] animate-pulse' :
                        'bg-gray-900 bg-opacity-70 border-orange-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl">{det.emoji}</span>
                        <span className="text-orange-300 font-bold">{det.name}</span>
                        {det.hasKey && <Key size={16} className="text-yellow-400" />}
                      </div>
                      <p className="text-orange-200 text-sm">
                        Position: ({currentPos?.row}, {currentPos?.col})
                      </p>
                      {isWinner && <p className="text-yellow-400 font-bold text-sm mt-1">🏆 WINNER! 🏆</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(-50px) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(50px);
            opacity: 0;
          }
        }
        
        .animate-float {
          animation: float linear infinite;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #ff6600;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #ff8800;
        }
      `}</style>
    </div>
  );
};

export default App;