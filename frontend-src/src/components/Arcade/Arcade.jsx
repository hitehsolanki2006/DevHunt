import React, { useState, useEffect, useRef } from 'react';

const commitTypes = ['feat: auth', 'fix: sse', 'docs: api', 'refactor: db', 'test: lint', 'chore: config'];
const branchNames = ['main', 'dev', 'feature/auth', 'hotfix/api', 'release/v1.0'];

const wordPool = [
  'SOCKET', 'BUFFER', 'KERNEL', 'DOCKER', 'SYSTEM', 'THREAD', 'STREAM', 'MEMORY', 'CLIENT', 'SERVER',
  'SCRIPT', 'ROUTER', 'PORTAL', 'ENGINE', 'BINARY', 'VECTOR', 'LOGICS', 'MATRIX', 'STATUS', 'COMPLY'
];

export default function Arcade() {
  const [activeGame, setActiveGame] = useState(null); // null = menu, 'snake', 'runner', 'decrypt', 'sweeper'
  const [currentScore, setCurrentScore] = useState(0);
  const [highScores, setHighScores] = useState({
    snake: parseInt(localStorage.getItem('arcade_snake_high') || '0', 10),
    runner: parseInt(localStorage.getItem('arcade_runner_high') || '0', 10),
    decrypt: parseInt(localStorage.getItem('arcade_decrypt_high') || '0', 10),
    sweeper: parseInt(localStorage.getItem('arcade_sweeper_high') || '0', 10)
  });

  const [overlay, setOverlay] = useState({ show: false, title: '', message: '', success: false });

  // ── GAME 1: SNAKE STATE refs
  const snakeRef = useRef([{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}]);
  const snakeDirRef = useRef('RIGHT');
  const snakeFoodRef = useRef({ x: 5, y: 5, text: 'feat: patch' });
  const snakeConflictsRef = useRef([]);
  const snakeBranchIndexRef = useRef(0);
  const snakeScoreRef = useRef(0);
  const snakeIntervalRef = useRef(null);

  // ── GAME 2: RUNNER STATE refs
  const runnerPlayerRef = useRef({ lane: 1 });
  const runnerObstaclesRef = useRef([]);
  const runnerBuffersRef = useRef([]);
  const runnerScoreRef = useRef(0);
  const runnerIntegrityRef = useRef(100);
  const runnerSpeedRef = useRef(4);
  const runnerAnimRef = useRef(null);

  // ── GAME 3: DECRYPT STATE
  const [decryptAttempts, setDecryptAttempts] = useState(4);
  const [decryptWords, setDecryptWords] = useState([]);
  const [decryptPasscode, setDecryptPasscode] = useState('');
  const [decryptInput, setDecryptInput] = useState('');
  const [decryptLogs, setDecryptLogs] = useState([]);

  // ── GAME 4: SWEEPER STATE
  const [sweeperGrid, setSweeperGrid] = useState([]);
  const [sweeperMinesCount] = useState(10);
  const [sweeperFlaggedCount, setSweeperFlaggedCount] = useState(0);
  const [sweeperRevealedCount, setSweeperRevealedCount] = useState(0);

  const canvasRef = useRef(null);

  useEffect(() => {
    // Stop all loops on unmount
    return () => {
      stopAllGames();
    };
  }, []);

  const stopAllGames = () => {
    if (snakeIntervalRef.current) {
      clearInterval(snakeIntervalRef.current);
      snakeIntervalRef.current = null;
    }
    if (runnerAnimRef.current) {
      cancelAnimationFrame(runnerAnimRef.current);
      runnerAnimRef.current = null;
    }
  };

  const updateHighScore = (game, score) => {
    if (score > highScores[game]) {
      const newHighs = { ...highScores, [game]: score };
      setHighScores(newHighs);
      localStorage.setItem(`arcade_${game}_high`, score);
    }
  };

  const showOverlay = (title, message, success) => {
    setOverlay({ show: true, title, message, success });
  };

  const hideOverlay = () => {
    setOverlay({ show: false, title: '', message: '', success: false });
  };

  const launchGame = (gameId) => {
    stopAllGames();
    hideOverlay();
    setActiveGame(gameId);
    setCurrentScore(0);

    setTimeout(() => {
      initGame(gameId);
    }, 50);
  };

  const quitGame = () => {
    stopAllGames();
    hideOverlay();
    setActiveGame(null);
  };

  const initGame = (gameId) => {
    stopAllGames();
    if (gameId === 'snake') initSnake();
    if (gameId === 'runner') initRunner();
    if (gameId === 'decrypt') initDecrypt();
    if (gameId === 'sweeper') initSweeper();
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeGame) return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Escape'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (overlay.show) {
        if (e.key === ' ' || e.code === 'Space') {
          hideOverlay();
          initGame(activeGame);
        }
        if (e.key === 'Escape' || e.code === 'Escape') {
          hideOverlay();
          quitGame();
        }
        return;
      }

      if (e.key === 'Escape' || e.code === 'Escape') {
        quitGame();
        return;
      }

      if (activeGame === 'snake') {
        const key = e.key.toUpperCase();
        if ((key === 'ARROWUP' || key === 'W') && snakeDirRef.current !== 'DOWN') snakeDirRef.current = 'UP';
        if ((key === 'ARROWDOWN' || key === 'S') && snakeDirRef.current !== 'UP') snakeDirRef.current = 'DOWN';
        if ((key === 'ARROWLEFT' || key === 'A') && snakeDirRef.current !== 'RIGHT') snakeDirRef.current = 'LEFT';
        if ((key === 'ARROWRIGHT' || key === 'D') && snakeDirRef.current !== 'LEFT') snakeDirRef.current = 'RIGHT';
      }

      if (activeGame === 'runner') {
        const key = e.key.toUpperCase();
        if ((key === 'ARROWLEFT' || key === 'A') && runnerPlayerRef.current.lane > 0) runnerPlayerRef.current.lane -= 1;
        if ((key === 'ARROWRIGHT' || key === 'D') && runnerPlayerRef.current.lane < 2) runnerPlayerRef.current.lane += 1;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [activeGame, overlay]);

  /* =========================================================================
     SNAKE GAME LOGIC
     ========================================================================= */
  const initSnake = () => {
    snakeRef.current = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
    snakeDirRef.current = 'RIGHT';
    snakeScoreRef.current = 0;
    snakeBranchIndexRef.current = 0;
    snakeConflictsRef.current = [];
    setCurrentScore(0);

    spawnSnakeFood();
    spawnSnakeConflict();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (snakeIntervalRef.current) clearInterval(snakeIntervalRef.current);
    snakeIntervalRef.current = setInterval(() => {
      updateSnake();
      drawSnake(ctx, canvas);
    }, 120);
  };

  const spawnSnakeFood = () => {
    const fx = Math.floor(Math.random() * 20);
    const fy = Math.floor(Math.random() * 20);
    snakeFoodRef.current = {
      x: fx,
      y: fy,
      text: commitTypes[Math.floor(Math.random() * commitTypes.length)]
    };
  };

  const spawnSnakeConflict = () => {
    const cx = Math.floor(Math.random() * 20);
    const cy = Math.floor(Math.random() * 20);
    snakeConflictsRef.current.push({ x: cx, y: cy });
  };

  const updateSnake = () => {
    const head = { ...snakeRef.current[0] };
    if (snakeDirRef.current === 'UP') head.y -= 1;
    if (snakeDirRef.current === 'DOWN') head.y += 1;
    if (snakeDirRef.current === 'LEFT') head.x -= 1;
    if (snakeDirRef.current === 'RIGHT') head.x += 1;

    if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
      triggerSnakeGameOver();
      return;
    }

    if (snakeRef.current.some(part => part.x === head.x && part.y === head.y)) {
      triggerSnakeGameOver();
      return;
    }

    if (snakeConflictsRef.current.some(c => c.x === head.x && c.y === head.y)) {
      triggerSnakeGameOver();
      return;
    }

    snakeRef.current.unshift(head);

    if (head.x === snakeFoodRef.current.x && head.y === snakeFoodRef.current.y) {
      snakeScoreRef.current += 10;
      setCurrentScore(snakeScoreRef.current);
      updateHighScore('snake', snakeScoreRef.current);

      if (snakeScoreRef.current % 50 === 0) {
        snakeBranchIndexRef.current = (snakeBranchIndexRef.current + 1) % branchNames.length;
        snakeConflictsRef.current = [];
      } else {
        spawnSnakeConflict();
      }
      spawnSnakeFood();
    } else {
      snakeRef.current.pop();
    }
  };

  const drawSnake = (ctx, canvas) => {
    ctx.fillStyle = '#18181c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#2d2d36';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    snakeRef.current.forEach((part, index) => {
      ctx.fillStyle = index === 0 ? '#3b82f6' : '#34d399';
      ctx.fillRect(part.x * 20 + 1, part.y * 20 + 1, 18, 18);
    });

    ctx.fillStyle = '#f87171';
    snakeConflictsRef.current.forEach(c => {
      ctx.fillRect(c.x * 20 + 1, c.y * 20 + 1, 18, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Courier';
      ctx.fillText('!', c.x * 20 + 7, c.y * 20 + 13);
      ctx.fillStyle = '#f87171';
    });

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(snakeFoodRef.current.x * 20 + 1, snakeFoodRef.current.y * 20 + 1, 18, 18);
  };

  const triggerSnakeGameOver = () => {
    clearInterval(snakeIntervalRef.current);
    snakeIntervalRef.current = null;
    showOverlay('GAME OVER', `Final score is: ${snakeScoreRef.current}. Run package compilation again!`, false);
  };

  /* =========================================================================
     RUNNER GAME LOGIC
     ========================================================================= */
  const initRunner = () => {
    runnerPlayerRef.current = { lane: 1 };
    runnerObstaclesRef.current = [];
    runnerBuffersRef.current = [];
    runnerScoreRef.current = 0;
    runnerIntegrityRef.current = 100;
    runnerSpeedRef.current = 4;
    setCurrentScore(0);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (runnerAnimRef.current) cancelAnimationFrame(runnerAnimRef.current);

    const runLoop = () => {
      updateRunner();
      drawRunner(ctx, canvas);
      if (runnerIntegrityRef.current <= 0) {
        stopAllGames();
        showOverlay('STREAM CORRUPTED', `Data pipeline compromise score: ${runnerScoreRef.current}.`, false);
        return;
      }
      runnerAnimRef.current = requestAnimationFrame(runLoop);
    };
    runnerAnimRef.current = requestAnimationFrame(runLoop);
  };

  const updateRunner = () => {
    runnerScoreRef.current += 1;
    setCurrentScore(runnerScoreRef.current);
    updateHighScore('runner', runnerScoreRef.current);

    if (runnerScoreRef.current % 500 === 0) {
      runnerSpeedRef.current += 0.8;
    }

    if (Math.random() < 0.02) {
      runnerObstaclesRef.current.push({
        lane: Math.floor(Math.random() * 3),
        y: -30,
        h: 24,
        w: 24
      });
    }

    if (Math.random() < 0.01) {
      runnerBuffersRef.current.push({
        lane: Math.floor(Math.random() * 3),
        y: -30,
        r: 10
      });
    }

    // Move obstacles
    for (let i = runnerObstaclesRef.current.length - 1; i >= 0; i--) {
      const obs = runnerObstaclesRef.current[i];
      obs.y += runnerSpeedRef.current;
      if (obs.y > 310 && obs.y < 350 && obs.lane === runnerPlayerRef.current.lane) {
        runnerIntegrityRef.current -= 25;
        runnerObstaclesRef.current.splice(i, 1);
      } else if (obs.y > 400) {
        runnerObstaclesRef.current.splice(i, 1);
      }
    }

    // Move buffers
    for (let i = runnerBuffersRef.current.length - 1; i >= 0; i--) {
      const buf = runnerBuffersRef.current[i];
      buf.y += runnerSpeedRef.current;
      if (buf.y > 310 && buf.y < 350 && buf.lane === runnerPlayerRef.current.lane) {
        runnerScoreRef.current += 150;
        runnerIntegrityRef.current = Math.min(100, runnerIntegrityRef.current + 10);
        runnerBuffersRef.current.splice(i, 1);
      } else if (buf.y > 400) {
        runnerBuffersRef.current.splice(i, 1);
      }
    }
  };

  const drawRunner = (ctx, canvas) => {
    ctx.fillStyle = '#18181c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const laneWidth = canvas.width / 3;

    ctx.strokeStyle = '#2d2d36';
    ctx.lineWidth = 1;
    ctx.setLineDash([15, 15]);
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, canvas.height);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Player
    const px = runnerPlayerRef.current.lane * laneWidth + laneWidth / 2;
    const py = 340;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(px, py - 16);
    ctx.lineTo(px - 14, py + 14);
    ctx.lineTo(px + 14, py + 14);
    ctx.closePath();
    ctx.fill();

    // Obstacles
    ctx.fillStyle = '#f87171';
    runnerObstaclesRef.current.forEach(obs => {
      const ox = obs.lane * laneWidth + laneWidth / 2 - obs.w / 2;
      ctx.fillRect(ox, obs.y, obs.w, obs.h);
    });

    // Buffers
    ctx.fillStyle = '#34d399';
    runnerBuffersRef.current.forEach(buf => {
      const bx = buf.lane * laneWidth + laneWidth / 2;
      ctx.beginPath();
      ctx.arc(bx, buf.y, buf.r, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  /* =========================================================================
     DECRYPT GAME LOGIC
     ========================================================================= */
  const initDecrypt = () => {
    setDecryptAttempts(4);
    const shuffled = [...wordPool].sort(() => 0.5 - Math.random());
    const words = shuffled.slice(0, 8);
    const passcode = words[Math.floor(Math.random() * words.length)];
    
    setDecryptWords(words);
    setDecryptPasscode(passcode);
    setDecryptLogs([
      '> Initialized memory sweep... ready.',
      '> SECURITY LOCKOUT DETECTED. CHOOSE PASSCODE:'
    ]);
  };

  const handleSelectDecryptWord = (word) => {
    setDecryptInput(word);
  };

  const handleDecryptSubmit = () => {
    const word = decryptInput.trim().toUpperCase();
    if (!word || decryptAttempts <= 0) return;

    setDecryptInput('');

    if (word === decryptPasscode) {
      const score = decryptAttempts * 250;
      setCurrentScore(score);
      updateHighScore('decrypt', score);
      setDecryptLogs(prev => [
        ...prev,
        `> ${word} -> ACCESS GRANTED!`,
        `> Lock cleared. Score: ${score}`
      ]);
      showOverlay('ACCESS GRANTED', `Decryption successful! Score: ${score}`, true);
    } else {
      const newAttempts = decryptAttempts - 1;
      setDecryptAttempts(newAttempts);

      let likeness = 0;
      for (let i = 0; i < Math.min(word.length, decryptPasscode.length); i++) {
        if (word[i] === decryptPasscode[i]) likeness++;
      }

      setDecryptLogs(prev => [
        ...prev,
        `> ${word} -> ACCESS DENIED. Likeness = ${likeness}/${decryptPasscode.length}`
      ]);

      if (newAttempts <= 0) {
        showOverlay('ACCESS LOCKED', 'Lockout protocol triggered!', false);
      }
    }
  };

  /* =========================================================================
     SWEEPER GAME LOGIC
     ========================================================================= */
  const initSweeper = () => {
    setSweeperFlaggedCount(0);
    setSweeperRevealedCount(0);

    const grid = [];
    for (let r = 0; r < 10; r++) {
      grid[r] = [];
      for (let c = 0; c < 10; c++) {
        grid[r][c] = {
          row: r,
          col: c,
          isMine: false,
          revealed: false,
          flagged: false,
          adjMines: 0
        };
      }
    }

    // Place mines
    let placed = 0;
    while (placed < sweeperMinesCount) {
      const mr = Math.floor(Math.random() * 10);
      const mc = Math.floor(Math.random() * 10);
      if (!grid[mr][mc].isMine) {
        grid[mr][mc].isMine = true;
        placed++;
      }
    }

    // Calculate adjacencies
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (!grid[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10 && grid[nr][nc].isMine) {
                count++;
              }
            }
          }
          grid[r][c].adjMines = count;
        }
      }
    }

    setSweeperGrid(grid);
  };

  const handleSweeperLeftClick = (row, col) => {
    const grid = [...sweeperGrid];
    const cell = grid[row][col];
    if (cell.revealed || cell.flagged) return;

    if (cell.isMine) {
      // Reveal all mines
      grid.forEach(r => r.forEach(c => {
        if (c.isMine) c.revealed = true;
      }));
      setSweeperGrid(grid);
      showOverlay('MALWARE DETECTED', 'Infected node swept. Clean compile needed!', false);
      return;
    }

    // Flood fill algorithm
    const reveal = (r, c) => {
      if (r < 0 || r >= 10 || c < 0 || c >= 10) return;
      const target = grid[r][c];
      if (target.revealed || target.isMine || target.flagged) return;

      target.revealed = true;
      
      if (target.adjMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            reveal(r + dr, c + dc);
          }
        }
      }
    };

    reveal(row, col);

    // Calculate revealed count
    let revCount = 0;
    grid.forEach(r => r.forEach(c => {
      if (c.revealed) revCount++;
    }));

    setSweeperRevealedCount(revCount);
    setSweeperGrid(grid);

    if (revCount === 90) {
      updateHighScore('sweeper', 1000);
      setCurrentScore(1000);
      showOverlay('SYSTEM PURGED', 'Wiped memory core sectors completely!', true);
    }
  };

  const handleSweeperRightClick = (e, row, col) => {
    e.preventDefault();
    const grid = [...sweeperGrid];
    const cell = grid[row][col];
    if (cell.revealed) return;

    cell.flagged = !cell.flagged;
    
    let flagCount = 0;
    grid.forEach(r => r.forEach(c => {
      if (c.flagged) flagCount++;
    }));

    setSweeperFlaggedCount(flagCount);
    setSweeperGrid(grid);
  };

  return (
    <div className="panel active" id="panel-arcade" style={{ flexDirection: 'column', height: '100%', minHeight: '0', overflow: 'hidden', gap: '0' }}>
      <div className="arcade-main-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', height: '100%', overflow: 'hidden' }}>
        
        {/* Left Arena Workspace */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', position: 'relative' }}>
          
          {/* Overlay restart modal */}
          {overlay.show && (
            <div id="arcade-message-overlay" className="arcade-overlay" style={{ display: 'flex', position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' }}>
              <div className="arcade-overlay-content" style={{ textAlign: 'center' }}>
                <h2 style={{ color: overlay.success ? 'var(--green)' : 'var(--red)', fontSize: '24px', marginBottom: '8px' }}>{overlay.title}</h2>
                <p style={{ color: 'var(--text)', marginBottom: '20px' }}>{overlay.message}</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn-primary" onClick={() => launchGame(activeGame)}>SPACE to Restart</button>
                  <button className="btn-ghost" onClick={quitGame}>ESC to Menu</button>
                </div>
              </div>
            </div>
          )}

          {/* 1. SELECTION MENU VIEW */}
          {activeGame === null ? (
            <div id="arcade-menu-view" style={{ display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto', height: '100%', textAlign: 'left' }}>
              <h2 style={{ letterSpacing: '1px', marginBottom: '4px' }}>🎮 GAME ARCADE STATIONS</h2>
              <p className="muted" style={{ marginBottom: '20px' }}>Select an offline developer station below. Scores will persist in session.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', width: '100%' }}>
                <div className="arcade-selection-card" onClick={() => launchGame('snake')} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: 'var(--bg-2)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🐍</div>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold' }}>Git Commit Snake</h4>
                  <p className="muted" style={{ fontSize: '11px', margin: '4px 0' }}>Steer a branch pointer, ingest commits and dodge conflicts.</p>
                  <span style={{ fontSize: '11px', color: 'var(--cyan)' }}>High Score: {highScores.snake}</span>
                </div>

                <div className="arcade-selection-card" onClick={() => launchGame('runner')} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: 'var(--bg-2)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏃</div>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold' }}>Data Lane Runner</h4>
                  <p className="muted" style={{ fontSize: '11px', margin: '4px 0' }}>Switch lanes to collect RAM packets and dodge malwares.</p>
                  <span style={{ fontSize: '11px', color: 'var(--cyan)' }}>High Score: {highScores.runner}</span>
                </div>

                <div className="arcade-selection-card" onClick={() => launchGame('decrypt')} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: 'var(--bg-2)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔑</div>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold' }}>Terminal Decrypt</h4>
                  <p className="muted" style={{ fontSize: '11px', margin: '4px 0' }}>Decipher locks using similarity letters matching.</p>
                  <span style={{ fontSize: '11px', color: 'var(--cyan)' }}>High Score: {highScores.decrypt}</span>
                </div>

                <div className="arcade-selection-card" onClick={() => launchGame('sweeper')} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: 'var(--bg-2)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>💣</div>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold' }}>Hex Sweeper</h4>
                  <p className="muted" style={{ fontSize: '11px', margin: '4px 0' }}>Audit memory address maps to quarantine hidden malwares.</p>
                  <span style={{ fontSize: '11px', color: 'var(--cyan)' }}>High Score: {highScores.sweeper}</span>
                </div>
              </div>
            </div>
          ) : (
            // 2. ARENA ACTIVE PLAYVIEW
            <div id="arcade-arena-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                  {activeGame === 'snake' && '🐍 GIT COMMIT SNAKE'}
                  {activeGame === 'runner' && '🏃 DATA LANE RUNNER'}
                  {activeGame === 'decrypt' && '🔑 TERMINAL DECRYPT'}
                  {activeGame === 'sweeper' && '💣 HEX SWEEPER'}
                </span>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>Score: <b style={{ color: 'var(--accent)' }}>{currentScore}</b></span>
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>|</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)' }}>Personal Best: <b>{highScores[activeGame]}</b></span>
                </div>
                <button className="btn-ghost" onClick={quitGame} style={{ fontSize: '10px', padding: '3px 8px' }}>✕ Quit Game</button>
              </div>

              {/* Game Viewport container */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121214', overflow: 'hidden' }}>
                <canvas 
                  ref={canvasRef}
                  width="400" 
                  height="400" 
                  style={{ 
                    background: '#1e1e24', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)', 
                    display: (activeGame === 'snake' || activeGame === 'runner') ? 'block' : 'none', 
                    maxWidth: '100%', 
                    maxHeight: '100%' 
                  }}
                />

                {/* DOM View Decrypt */}
                {activeGame === 'decrypt' && (
                  <div style={{ width: '100%', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', fontFamily: 'var(--mono)', fontSize: '12px' }}>
                    <div style={{ flex: 1, background: '#0c0f12', border: '1px solid var(--border)', borderRadius: '4px', padding: '12px', overflowY: 'auto', marginBottom: '12px', color: '#38bdf8', lineHeight: '1.5', textAlign: 'left' }}>
                      {decryptLogs.map((log, idx) => <div key={idx}>{log}</div>)}
                      
                      <div style={{ margin: '12px 0' }}>
                        {decryptWords.map((word, idx) => (
                          <span 
                            key={idx} 
                            onClick={() => handleSelectDecryptWord(word)}
                            style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--green)', display: 'inline-block', marginRight: '12px', padding: '2px 0' }}
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>&gt; ENTER PASSCODE:</span>
                      <input 
                        type="text" 
                        value={decryptInput}
                        onChange={(e) => setDecryptInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleDecryptSubmit()}
                        style={{ flex: 1, fontFamily: 'var(--mono)', background: '#0c0f12', color: '#38bdf8', border: '1px solid var(--border)', outline: 'none', padding: '6px' }}
                      />
                      <button className="btn-primary" onClick={handleDecryptSubmit}>DECRYPT</button>
                    </div>
                  </div>
                )}

                {/* DOM View Sweeper */}
                {activeGame === 'sweeper' && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '380px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text)', marginBottom: '8px' }}>
                      <span>Threats Flagged: <b style={{ color: 'var(--red)' }}>{sweeperFlaggedCount}</b> / 10</span>
                      <span>Revealed Sectors: <b>{sweeperRevealedCount}</b> / 90</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 32px)', gap: '3px', background: '#121214', padding: '8px', border: '2px solid var(--border)', borderRadius: '6px' }}>
                      {sweeperGrid.map((row, r) => 
                        row.map((cell, c) => {
                          let text = '';
                          let cellStyle = {
                            width: '32px',
                            height: '32px',
                            background: 'var(--panel)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontFamily: 'var(--mono)',
                            fontWeight: 'bold',
                            userSelect: 'none'
                          };

                          if (cell.revealed) {
                            cellStyle.background = 'var(--bg-2)';
                            if (cell.isMine) {
                              text = '💣';
                              cellStyle.background = 'var(--red)';
                            } else if (cell.adjMines > 0) {
                              text = cell.adjMines.toString();
                              cellStyle.color = cell.adjMines === 1 ? 'var(--cyan)' : cell.adjMines === 2 ? 'var(--green)' : 'var(--amber)';
                            }
                          } else if (cell.flagged) {
                            text = '🚩';
                            cellStyle.color = 'var(--red)';
                          }

                          return (
                            <div 
                              key={`${r}-${c}`}
                              onClick={() => handleSweeperLeftClick(r, c)}
                              onContextMenu={(e) => handleSweeperRightClick(e, r, c)}
                              style={cellStyle}
                            >
                              {text}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Info pane instructions */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', borderColor: 'var(--border)', fontFamily: 'var(--mono)', fontSize: '11px', lineHeight: '1.6', overflowY: 'auto', textAlign: 'left' }}>
          <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '12px' }}>🕹️ CONTROLLER INSTRUCTIONS</h3>
          
          <div style={{ flex: 1 }}>
            {activeGame === 'snake' && (
              <>
                <p><strong>GIT COMMIT SNAKE</strong></p>
                <p className="muted" style={{ margin: '6px 0' }}>Steer a branch pointer to ingest commit tags while avoiding conflicts.</p>
                <ul style={{ paddingLeft: '16px', margin: '8px 0' }}>
                  <li>Use <strong>WASD</strong> or <strong>Arrow Keys</strong> to steer.</li>
                  <li>Collect glowing commit tags.</li>
                  <li>Avoid hitting the grid walls or your own branch.</li>
                  <li>Dodge red <strong>Merge Conflict [!]</strong> blocks.</li>
                </ul>
              </>
            )}
            {activeGame === 'runner' && (
              <>
                <p><strong>DATA LANE RUNNER</strong></p>
                <p className="muted" style={{ margin: '6px 0' }}>Pilot a data packet triangle down the bandwidth lanes.</p>
                <ul style={{ paddingLeft: '16px', margin: '8px 0' }}>
                  <li>Use <strong>A / D</strong> or <strong>Left / Right Arrows</strong> to switch lanes.</li>
                  <li>Avoid falling red <strong>Malware Blocks</strong>.</li>
                  <li>Collect green <strong>RAM Buffers</strong> to boost points.</li>
                </ul>
              </>
            )}
            {activeGame === 'decrypt' && (
              <>
                <p><strong>TERMINAL DECRYPT</strong></p>
                <p className="muted" style={{ margin: '6px 0' }}>Deductive security passcode hacking console simulation.</p>
                <ul style={{ paddingLeft: '16px', margin: '8px 0' }}>
                  <li>Click a hexadecimal word from the selection list.</li>
                  <li>Each wrong guess reveals a "Likeness" score showing matching letters.</li>
                  <li>You have 4 attempts before lockout.</li>
                </ul>
              </>
            )}
            {activeGame === 'sweeper' && (
              <>
                <p><strong>HEX SWEEPER</strong></p>
                <p className="muted" style={{ margin: '6px 0' }}>Audit memory address arrays to isolate malware cells.</p>
                <ul style={{ paddingLeft: '16px', margin: '8px 0' }}>
                  <li><strong>Left-Click</strong> to reveal a cell.</li>
                  <li>The number shows adjacent threats.</li>
                  <li><strong>Right-Click</strong> to place a quarantine flag.</li>
                </ul>
              </>
            )}
            {!activeGame && <p className="muted">Launch a game module to load detailed control inputs.</p>}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
            <button className="btn-primary" onClick={() => activeGame && initGame(activeGame)} style={{ width: '100%', fontSize: '11px', padding: '8px 0', fontWeight: 'bold' }}>
              🎮 RESTART MODULE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
