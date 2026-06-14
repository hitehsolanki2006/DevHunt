(() => {
  // Global Arcade State
  let activeGame = 'snake';
  
  // Game Instances / Intervals
  let snakeInterval = null;
  let runnerAnimationId = null;

  // High Scores Cache
  const highScores = {
    snake: parseInt(localStorage.getItem('arcade_snake_high') || '0', 10),
    runner: parseInt(localStorage.getItem('arcade_runner_high') || '0', 10),
    decrypt: parseInt(localStorage.getItem('arcade_decrypt_high') || '0', 10),
    sweeper: parseInt(localStorage.getItem('arcade_sweeper_high') || '0', 10)
  };

  // DOM Elements
  const tabButtons = document.querySelectorAll('.arcade-tab-btn');
  const gameContainers = document.querySelectorAll('.arcade-game-container');
  const instructionContent = document.getElementById('arcade-instruction-content');
  const resetBtn = document.getElementById('arcade-reset-btn');

  // Menu Elements
  const selectionMenu = document.getElementById('arcade-menu-view');
  const gameWorkspace = document.getElementById('arcade-arena-view');
  const backBtn = document.getElementById('arcade-back-btn');
  const tabsContainer = document.getElementById('arcade-tabs-container');
  const titleLabel = document.getElementById('arcade-title-label');

  // Overlay Elements
  const messageOverlay = document.getElementById('arcade-message-overlay');
  const overlayStatus = document.getElementById('arcade-overlay-title');
  const overlayDesc = document.getElementById('arcade-overlay-message');
  const overlayRestartBtn = document.getElementById('arcade-overlay-btn-restart');
  const overlayMenuBtn = document.getElementById('arcade-overlay-btn-menu');

  function showArcadeOverlay(statusText, descText, isSuccess) {
    if (!messageOverlay || !overlayStatus || !overlayDesc) return;
    overlayStatus.textContent = statusText;
    overlayStatus.style.color = isSuccess ? 'var(--green)' : 'var(--red)';
    overlayDesc.textContent = descText;
    messageOverlay.style.display = 'flex';
  }

  function hideArcadeOverlay() {
    if (messageOverlay) messageOverlay.style.display = 'none';
  }

  // Active High Score DOM bindings
  if (document.getElementById('hs-snake')) document.getElementById('hs-snake').textContent = highScores.snake;
  if (document.getElementById('hs-runner')) document.getElementById('hs-runner').textContent = highScores.runner;
  if (document.getElementById('hs-decrypt')) document.getElementById('hs-decrypt').textContent = highScores.decrypt;
  if (document.getElementById('hs-sweeper')) document.getElementById('hs-sweeper').textContent = highScores.sweeper;

  // Game Instruction Templates
  const instructions = {
    snake: `
      <p style="margin-bottom:10px;"><strong>GIT COMMIT SNAKE</strong></p>
      <p style="color:var(--muted); margin-bottom:10px;">Steer a branch pointer to ingest commit tags while avoiding merge conflicts.</p>
      <ul style="padding-left:16px; margin-bottom:10px; color:var(--text);">
        <li>Use <strong>WASD</strong> or <strong>Arrow Keys</strong> to steer.</li>
        <li>Collect glowing commit tags (<span style="color:var(--green)">feat:</span>, <span style="color:var(--cyan)">fix:</span>) to grow.</li>
        <li>Avoid hitting the grid walls or your own branch.</li>
        <li>Dodge red <strong>Merge Conflict [!]</strong> blocks.</li>
      </ul>
      <p style="color:var(--muted);">Every 5 commits merges a phase and clears conflicts.</p>
    `,
    runner: `
      <p style="margin-bottom:10px;"><strong>DATA LANE RUNNER</strong></p>
      <p style="color:var(--muted); margin-bottom:10px;">A 3-lane reflex runner. Pilot a data packet triangle down the bandwidth lanes.</p>
      <ul style="padding-left:16px; margin-bottom:10px; color:var(--text);">
        <li>Use <strong>A / D</strong> or <strong>Left / Right Arrows</strong> to switch lanes.</li>
        <li>Avoid falling red <strong>Malware Blocks</strong>.</li>
        <li>Collect green <strong>RAM Buffers</strong> to boost points.</li>
        <li>Speed scales up automatically over time.</li>
      </ul>
      <p style="color:var(--muted);">If integrity hits 0%, the stream terminates.</p>
    `,
    decrypt: `
      <p style="margin-bottom:10px;"><strong>TERMINAL DECRYPT</strong></p>
      <p style="color:var(--muted); margin-bottom:10px;">Fallout-style administrative login cipher hack.</p>
      <ul style="padding-left:16px; margin-bottom:10px; color:var(--text);">
        <li>Click a hexadecimal word from the selection grid.</li>
        <li>Each wrong guess reveals a "Likeness" score.</li>
        <li>Likeness tells you how many letters match the correct passcode at the exact same positions.</li>
        <li>You have 4 attempts before lockout.</li>
      </ul>
      <p style="color:var(--muted);">Use likeness clues to deduce the password.</p>
    `,
    sweeper: `
      <p style="margin-bottom:10px;"><strong>HEX MALWARE SWEEPER</strong></p>
      <p style="color:var(--muted); margin-bottom:10px;">A hex memory grid sweep. Clean corrupt sectors.</p>
      <ul style="padding-left:16px; margin-bottom:10px; color:var(--text);">
        <li><strong>Left-Click</strong> to reveal a memory address cell.</li>
        <li>The number shows how many adjacent sectors are infected with malware.</li>
        <li><strong>Right-Click</strong> to place a red flagged quarantine mark.</li>
        <li>Clear all 90 clean sectors to win.</li>
      </ul>
      <p style="color:var(--muted);">Do not click a corrupt malware cell!</p>
    `
  };

  // Consolidated global controls and navigation overrides (prevent window scrolling in arcade tab)
  window.addEventListener('keydown', (e) => {
    const activePanel = document.querySelector('.panel.active');
    if (!activePanel || activePanel.id !== 'panel-arcade') return;

    // Always prevent default for game-critical keys when arcade is active
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Escape'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    const key = e.key.toUpperCase();

    // Check if the overlay is visible
    const isOverlayVisible = messageOverlay && messageOverlay.style.display === 'flex';

    if (isOverlayVisible) {
      if (e.key === ' ' || key === 'SPACE' || e.code === 'Space') {
        hideArcadeOverlay();
        initGame(activeGame);
        return;
      }
      if (e.key === 'Escape' || e.code === 'Escape') {
        hideArcadeOverlay();
        showMenu();
        return;
      }
    } else {
      // Escape should quit the active arena and go back to selection menu
      if (gameWorkspace && gameWorkspace.style.display === 'flex') {
        if (e.key === 'Escape' || e.code === 'Escape') {
          showMenu();
          return;
        }
        // Space restarts if game is not running (snake)
        if ((e.key === ' ' || e.code === 'Space') && activeGame === 'snake' && !snakeInterval) {
          initGame('snake');
          return;
        }
        // Space starts runner if not running
        if ((e.key === ' ' || e.code === 'Space') && activeGame === 'runner' && !runnerAnimationId) {
          initGame('runner');
          return;
        }
      }
    }

    // Snake game controls (only when game is active)
    if (activeGame === 'snake' && snakeInterval) {
      if ((key === 'ARROWUP' || key === 'W') && snakeDir !== 'DOWN') snakeDir = 'UP';
      if ((key === 'ARROWDOWN' || key === 'S') && snakeDir !== 'UP') snakeDir = 'DOWN';
      if ((key === 'ARROWLEFT' || key === 'A') && snakeDir !== 'RIGHT') snakeDir = 'LEFT';
      if ((key === 'ARROWRIGHT' || key === 'D') && snakeDir !== 'LEFT') snakeDir = 'RIGHT';
    }

    // Runner game controls (only when game is active)
    if (activeGame === 'runner' && runnerAnimationId) {
      if ((key === 'ARROWLEFT' || key === 'A') && runnerPlayer && runnerPlayer.lane > 0) runnerPlayer.lane -= 1;
      if ((key === 'ARROWRIGHT' || key === 'D') && runnerPlayer && runnerPlayer.lane < 2) runnerPlayer.lane += 1;
    }
  }, true); // Use capture phase to intercept before other handlers

  // Helper to get CSS variables for dynamic themes
  function getThemeColor(varName, fallback) {
    return getComputedStyle(document.body).getPropertyValue(varName).trim() || fallback;
  }

  // Switch Stations (Tab selection & Launch)
  function launchGame(gameId) {
    activeGame = gameId;
    
    // Stop loops and hide overlays
    stopAllGames();
    hideArcadeOverlay();

    // Toggle nav classes
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.game === gameId));
    
    // Toggle containers: Canvas vs DOM containers
    const canvas = document.getElementById('arcade-canvas');
    if (canvas) {
      canvas.style.display = (gameId === 'snake' || gameId === 'runner') ? 'block' : 'none';
    }
    gameContainers.forEach(container => {
      container.style.display = container.id === `arcade-game-${gameId}` ? 'flex' : 'none';
    });

    // Update Header panel inside arena
    const titleEl = document.getElementById('arena-game-title');
    if (titleEl) {
      const titles = {
        snake: 'GIT COMMIT SNAKE',
        runner: 'DATA LANE RUNNER',
        decrypt: 'TERMINAL DECRYPT',
        sweeper: 'HEX MALWARE SWEEPER'
      };
      titleEl.textContent = titles[gameId] || 'GAME STATION';
    }
    
    const currentScoreEl = document.getElementById('arena-current-score');
    if (currentScoreEl) currentScoreEl.textContent = '0';
    
    const hsEl = document.getElementById('arena-high-score');
    if (hsEl) hsEl.textContent = highScores[gameId] || '0';

    // Load instructions
    instructionContent.innerHTML = instructions[gameId];

    // Show Workspace and hide Menu
    if (selectionMenu) selectionMenu.style.display = 'none';
    if (gameWorkspace) gameWorkspace.style.display = 'flex';

    // Boot specific game
    initGame(gameId);
  }

  function showMenu() {
    stopAllGames();
    hideArcadeOverlay();
    
    if (selectionMenu) selectionMenu.style.display = 'flex';
    if (gameWorkspace) gameWorkspace.style.display = 'none';
  }

  // Bind globals for inline HTML click handlers (bootArcadeGame, quitArcadeArena)
  window.bootArcadeGame = (gameId) => {
    launchGame(gameId);
  };

  window.quitArcadeArena = () => {
    showMenu();
  };

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => launchGame(btn.dataset.game));
  });

  resetBtn.addEventListener('click', () => {
    hideArcadeOverlay();
    initGame(activeGame);
  });

  if (overlayRestartBtn) {
    overlayRestartBtn.addEventListener('click', () => {
      hideArcadeOverlay();
      initGame(activeGame);
    });
  }

  if (overlayMenuBtn) {
    overlayMenuBtn.addEventListener('click', () => {
      hideArcadeOverlay();
      showMenu();
    });
  }

  function stopAllGames() {
    if (snakeInterval) {
      clearInterval(snakeInterval);
      snakeInterval = null;
    }
    if (runnerAnimationId) {
      cancelAnimationFrame(runnerAnimationId);
      runnerAnimationId = null;
    }
  }

  function initGame(gameId) {
    stopAllGames();
    if (gameId === 'snake') initSnake();
    if (gameId === 'runner') initRunner();
    if (gameId === 'decrypt') initDecrypt();
    if (gameId === 'sweeper') initSweeper();
  }


  /* ==========================================
     GAME 1: GIT COMMIT SNAKE
     ========================================== */
  let snake, snakeDir, snakeFood, snakeConflicts, snakeScore, snakeBranchIndex;
  const commitTypes = ['feat: auth', 'fix: sse', 'docs: api', 'refactor: db', 'test: lint', 'chore: config'];
  const branchNames = ['main', 'dev', 'feature/auth', 'hotfix/api', 'release/v1.0'];

  function initSnake() {
    const canvas = document.getElementById('arcade-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
    snakeDir = 'RIGHT';
    snakeScore = 0;
    snakeBranchIndex = 0;
    snakeConflicts = [];
    
    const scoreEl = document.getElementById('arena-current-score');
    if (scoreEl) scoreEl.textContent = snakeScore;
    
    const titleEl = document.getElementById('arena-game-title');
    if (titleEl) titleEl.textContent = `GIT COMMIT SNAKE [branch: ${branchNames[snakeBranchIndex]}]`;
    
    spawnSnakeFood();
    spawnSnakeConflict();

    if (snakeInterval) clearInterval(snakeInterval);
    snakeInterval = setInterval(() => {
      updateSnake();
      drawSnake(ctx, canvas);
    }, 120);
  }

  function spawnSnakeFood() {
    let attempts = 0;
    while (attempts < 100) {
      const fx = Math.floor(Math.random() * 20);
      const fy = Math.floor(Math.random() * 20);
      
      const onSnake = snake.some(part => part.x === fx && part.y === fy);
      const onConflict = snakeConflicts.some(c => c.x === fx && c.y === fy);
      
      if (!onSnake && !onConflict) {
        snakeFood = {
          x: fx,
          y: fy,
          text: commitTypes[Math.floor(Math.random() * commitTypes.length)]
        };
        return;
      }
      attempts++;
    }
    snakeFood = { x: 5, y: 5, text: 'feat: patch' };
  }

  function spawnSnakeConflict() {
    let attempts = 0;
    while (attempts < 100) {
      const cx = Math.floor(Math.random() * 20);
      const cy = Math.floor(Math.random() * 20);
      
      const onSnake = snake.some(part => part.x === cx && part.y === cy);
      const onFood = snakeFood && snakeFood.x === cx && snakeFood.y === cy;
      const onConflict = snakeConflicts.some(c => c.x === cx && c.y === cy);

      if (!onSnake && !onFood && !onConflict) {
        snakeConflicts.push({x: cx, y: cy});
        return;
      }
      attempts++;
    }
  }

  function updateSnake() {
    // Calculate new head
    const head = {x: snake[0].x, y: snake[0].y};
    if (snakeDir === 'UP') head.y -= 1;
    if (snakeDir === 'DOWN') head.y += 1;
    if (snakeDir === 'LEFT') head.x -= 1;
    if (snakeDir === 'RIGHT') head.x += 1;

    // Check collisions
    if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
      triggerSnakeGameOver();
      return;
    }

    if (snake.some(part => part.x === head.x && part.y === head.y)) {
      triggerSnakeGameOver();
      return;
    }

    if (snakeConflicts.some(c => c.x === head.x && c.y === head.y)) {
      triggerSnakeGameOver();
      return;
    }

    snake.unshift(head);

    // Check food collision
    if (head.x === snakeFood.x && head.y === snakeFood.y) {
      snakeScore += 10;
      const scoreEl = document.getElementById('arena-current-score');
      if (scoreEl) scoreEl.textContent = snakeScore;
      
      if (snakeScore > highScores.snake) {
        highScores.snake = snakeScore;
        localStorage.setItem('arcade_snake_high', snakeScore);
        const hsEl = document.getElementById('hs-snake');
        if (hsEl) hsEl.textContent = snakeScore;
        const arenaHs = document.getElementById('arena-high-score');
        if (arenaHs) arenaHs.textContent = snakeScore;
      }

      // Commit logs mechanics
      if (snakeScore % 50 === 0) {
        snakeBranchIndex = (snakeBranchIndex + 1) % branchNames.length;
        const titleEl = document.getElementById('arena-game-title');
        if (titleEl) titleEl.textContent = `GIT COMMIT SNAKE [branch: ${branchNames[snakeBranchIndex]}]`;
        // Merge! Clear some conflicts
        snakeConflicts = [];
      } else {
        // Grow and spawn another conflict
        spawnSnakeConflict();
      }
      
      spawnSnakeFood();
    } else {
      snake.pop();
    }
  }

  function drawSnake(ctx, canvas) {
    const bg = getThemeColor('--bg-2', '#1a202c');
    const border = getThemeColor('--border', '#2d3748');
    const green = getThemeColor('--green', '#22c55e');
    const accent = getThemeColor('--accent', '#3b82f6');
    const red = getThemeColor('--red', '#ef4444');
    const amber = getThemeColor('--amber', '#f59e0b');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = border;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw snake body (accent head, green tail)
    snake.forEach((part, index) => {
      ctx.fillStyle = index === 0 ? accent : green;
      ctx.fillRect(part.x * 20 + 1, part.y * 20 + 1, 18, 18);
    });

    // Draw conflicts (flat red)
    ctx.fillStyle = red;
    snakeConflicts.forEach(c => {
      ctx.fillRect(c.x * 20 + 1, c.y * 20 + 1, 18, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Courier';
      ctx.fillText('!', c.x * 20 + 7, c.y * 20 + 13);
      ctx.fillStyle = red;
    });

    // Draw commit food (flat amber)
    ctx.fillStyle = amber;
    ctx.fillRect(snakeFood.x * 20 + 1, snakeFood.y * 20 + 1, 18, 18);

    // Draw food tiny label
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px Courier';
    ctx.fillText('git', snakeFood.x * 20 + 2, snakeFood.y * 20 + 12);
  }

  function triggerSnakeGameOver() {
    clearInterval(snakeInterval);
    snakeInterval = null;
    showArcadeOverlay('GAME OVER', `Score: ${snakeScore}. Re-merge commit history!`, false);
  }


  /* ==========================================
     GAME 2: CYBERPUNK GRID RUNNER
     ========================================== */
  let runnerPlayer, runnerObstacles, runnerBuffers, runnerScore, runnerIntegrity, runnerSpeed;

  function initRunner() {
    const canvas = document.getElementById('arcade-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    runnerPlayer = { lane: 1 }; // Lanes: 0 (Left), 1 (Middle), 2 (Right)
    runnerObstacles = [];
    runnerBuffers = [];
    runnerScore = 0;
    runnerIntegrity = 100;
    runnerSpeed = 4; // falling pixels per frame
    
    const scoreEl = document.getElementById('arena-current-score');
    if (scoreEl) scoreEl.textContent = runnerScore;
    
    const titleEl = document.getElementById('arena-game-title');
    if (titleEl) titleEl.textContent = `DATA LANE RUNNER [integrity: ${runnerIntegrity}%]`;

    if (runnerAnimationId) cancelAnimationFrame(runnerAnimationId);
    
    function runLoop() {
      if (activeGame !== 'runner') return;
      updateRunner();
      drawRunner(ctx, canvas);
      if (runnerIntegrity <= 0) {
        stopAllGames();
        showArcadeOverlay('STREAM CORRUPTED', `Final Score: ${runnerScore}. Data stream integrity compromised!`, false);
        return;
      }
      runnerAnimationId = requestAnimationFrame(runLoop);
    }
    runnerAnimationId = requestAnimationFrame(runLoop);
  }

  function updateRunner() {
    runnerScore += 1;
    const scoreEl = document.getElementById('arena-current-score');
    if (scoreEl) scoreEl.textContent = runnerScore;
    
    if (runnerScore > highScores.runner) {
      highScores.runner = runnerScore;
      localStorage.setItem('arcade_runner_high', runnerScore);
      const hsEl = document.getElementById('hs-runner');
      if (hsEl) hsEl.textContent = runnerScore;
      const arenaHs = document.getElementById('arena-high-score');
      if (arenaHs) arenaHs.textContent = runnerScore;
    }

    // Scale difficulty
    if (runnerScore % 500 === 0) {
      runnerSpeed += 0.8;
    }

    // Random obstacle spawning
    if (Math.random() < 0.02) {
      runnerObstacles.push({
        lane: Math.floor(Math.random() * 3),
        y: -30,
        h: 24,
        w: 24
      });
    }

    // Random powerup spawn
    if (Math.random() < 0.01) {
      runnerBuffers.push({
        lane: Math.floor(Math.random() * 3),
        y: -30,
        r: 10
      });
    }

    // Move obstacles (loop backwards to safely splice items)
    for (let i = runnerObstacles.length - 1; i >= 0; i--) {
      const obs = runnerObstacles[i];
      obs.y += runnerSpeed;
      // Collide check
      if (obs.y > 310 && obs.y < 350 && obs.lane === runnerPlayer.lane) {
        runnerIntegrity -= 25;
        const titleEl = document.getElementById('arena-game-title');
        if (titleEl) titleEl.textContent = `DATA LANE RUNNER [integrity: ${runnerIntegrity}%]`;
        runnerObstacles.splice(i, 1);
      } else if (obs.y > 400) {
        runnerObstacles.splice(i, 1);
      }
    }

    // Move buffers (loop backwards to safely splice items)
    for (let i = runnerBuffers.length - 1; i >= 0; i--) {
      const buf = runnerBuffers[i];
      buf.y += runnerSpeed;
      if (buf.y > 310 && buf.y < 350 && buf.lane === runnerPlayer.lane) {
        runnerScore += 150;
        runnerIntegrity = Math.min(100, runnerIntegrity + 10);
        const titleEl = document.getElementById('arena-game-title');
        if (titleEl) titleEl.textContent = `DATA LANE RUNNER [integrity: ${runnerIntegrity}%]`;
        runnerBuffers.splice(i, 1);
      } else if (buf.y > 400) {
        runnerBuffers.splice(i, 1);
      }
    }
  }

  function drawRunner(ctx, canvas) {
    const bg = getThemeColor('--bg-2', '#1e293b');
    const border = getThemeColor('--border', '#475569');
    const accent = getThemeColor('--accent', '#3b82f6');
    const red = getThemeColor('--red', '#ef4444');
    const green = getThemeColor('--green', '#10b981');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const laneWidth = canvas.width / 3;

    // Draw dividers
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.setLineDash([15, 15]);
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, canvas.height);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw Player Data Packet (accent triangle)
    const px = runnerPlayer.lane * laneWidth + laneWidth / 2;
    const py = 340;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(px, py - 16);
    ctx.lineTo(px - 14, py + 14);
    ctx.lineTo(px + 14, py + 14);
    ctx.closePath();
    ctx.fill();

    // Draw obstacles (flat red blocks)
    ctx.fillStyle = red;
    runnerObstacles.forEach(obs => {
      const ox = obs.lane * laneWidth + laneWidth / 2 - obs.w / 2;
      ctx.fillRect(ox, obs.y, obs.w, obs.h);
    });

    // Draw buffers (flat green circles)
    ctx.fillStyle = green;
    runnerBuffers.forEach(buf => {
      const bx = buf.lane * laneWidth + laneWidth / 2;
      ctx.beginPath();
      ctx.arc(bx, buf.y, buf.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }


  /* ==========================================
     GAME 3: TERMINAL DECRYPT
     ========================================== */
  const wordPool = [
    'SOCKET', 'BUFFER', 'KERNEL', 'DOCKER', 'SYSTEM', 'THREAD', 'STREAM', 'MEMORY', 'CLIENT', 'SERVER',
    'SCRIPT', 'ROUTER', 'PORTAL', 'ENGINE', 'BINARY', 'VECTOR', 'LOGICS', 'MATRIX', 'STATUS', 'COMPLY'
  ];
  let decryptPasscode, decryptAttempts, decryptLogList, decryptWords;

  window.selectDecryptWord = (word) => {
    const input = document.getElementById('decrypt-input');
    if (input) {
      input.value = word;
      input.focus();
    }
  };

  function initDecrypt() {
    decryptAttempts = 4;
    decryptLogList = [];
    
    // Choose 8 random words
    const shuffled = [...wordPool].sort(() => 0.5 - Math.random());
    decryptWords = shuffled.slice(0, 8);
    decryptPasscode = decryptWords[Math.floor(Math.random() * decryptWords.length)];

    const titleEl = document.getElementById('arena-game-title');
    if (titleEl) titleEl.textContent = `TERMINAL DECRYPT [attempts: ${decryptAttempts}]`;

    // Render candidate passcodes in the console
    const consoleEl = document.getElementById('decrypt-console');
    if (consoleEl) {
      let consoleContent = `<div>> Initialized memory sweep... ready.</div>`;
      consoleContent += `<div>> SECURITY LOCKOUT DETECTED. CHOOSE PASSCODE:</div>`;
      
      const passcodesHtml = decryptWords.map(word => {
        return `<span class="decrypt-word-btn" style="cursor:pointer; text-decoration:underline; display:inline-block; margin:4px 8px 4px 0; font-weight:bold;" onclick="selectDecryptWord('${word}')">${word}</span>`;
      }).join(' ');
      
      consoleContent += `<div style="margin: 10px 0; line-height:1.8;">${passcodesHtml}</div>`;
      consoleEl.innerHTML = consoleContent;
      consoleEl.scrollTop = 0;
    }

    const enterBtn = document.getElementById('decrypt-enter-btn');
    const decryptInput = document.getElementById('decrypt-input');
    if (decryptInput) {
      decryptInput.value = '';
      decryptInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          const val = decryptInput.value.trim().toUpperCase();
          if (val) {
            submitDecryptWord(val);
            decryptInput.value = '';
          }
        }
      };
    }
    if (enterBtn) {
      enterBtn.onclick = () => {
        if (decryptInput) {
          const val = decryptInput.value.trim().toUpperCase();
          if (val) {
            submitDecryptWord(val);
            decryptInput.value = '';
          }
        }
      };
    }
  }

  function submitDecryptWord(word) {
    if (decryptAttempts <= 0) return;

    const consoleEl = document.getElementById('decrypt-console');
    if (!consoleEl) return;
    
    if (word === decryptPasscode) {
      const score = decryptAttempts * 250;
      consoleEl.innerHTML += `<div style="color:var(--green)">> ${word} -> ACCESS GRANTED! PASSWORD MATCH.</div>`;
      consoleEl.innerHTML += `<div style="color:var(--green)">> // LOCK CLEARED. Session decrypted. Score: ${score}</div>`;
      
      const scoreEl = document.getElementById('arena-current-score');
      if (scoreEl) scoreEl.textContent = score;

      if (score > highScores.decrypt) {
        highScores.decrypt = score;
        localStorage.setItem('arcade_decrypt_high', score);
        const hsEl = document.getElementById('hs-decrypt');
        if (hsEl) hsEl.textContent = score;
        const arenaHs = document.getElementById('arena-high-score');
        if (arenaHs) arenaHs.textContent = score;
      }
      
      showArcadeOverlay('ACCESS GRANTED', `Decryption Successful! Score: ${score}`, true);
    } else {
      decryptAttempts -= 1;
      const titleEl = document.getElementById('arena-game-title');
      if (titleEl) titleEl.textContent = `TERMINAL DECRYPT [attempts: ${decryptAttempts}]`;
      
      // Calculate likeness
      let likeness = 0;
      for (let i = 0; i < Math.min(word.length, decryptPasscode.length); i++) {
        if (word[i] === decryptPasscode[i]) likeness++;
      }
      
      consoleEl.innerHTML += `<div style="color:var(--red)">> ${word} -> ACCESS DENIED. Likeness = ${likeness}/${decryptPasscode.length}</div>`;
      
      if (decryptAttempts <= 0) {
        consoleEl.innerHTML += `<div style="color:var(--red)">> LOCKOUT EVENT TRIGGERED. System locked.</div>`;
        showArcadeOverlay('CONSOLE LOCKOUT', 'Passcode decryption failed. Access locked.', false);
      }
    }
    
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }


  /* ==========================================
     GAME 4: HEX MALWARE SWEEPER
     ========================================== */
  let sweeperGrid, sweeperMinesCount, sweeperRevealedCount, sweeperMinesLocations;
  
  function initSweeper() {
    sweeperMinesCount = 10;
    sweeperRevealedCount = 0;
    sweeperMinesLocations = [];
    sweeperGrid = [];
    
    document.getElementById('sweeper-flagged').textContent = 0;
    document.getElementById('sweeper-revealed').textContent = 0;
    
    const board = document.getElementById('sweeper-board');
    if (!board) return;
    board.innerHTML = '';
    
    // Build 10x10 matrix
    for (let r = 0; r < 10; r++) {
      sweeperGrid[r] = [];
      for (let c = 0; c < 10; c++) {
        sweeperGrid[r][c] = {
          row: r,
          col: c,
          isMine: false,
          revealed: false,
          flagged: false,
          adjMines: 0
        };
      }
    }

    // Place 10 mines
    let minesPlaced = 0;
    while (minesPlaced < sweeperMinesCount) {
      const mr = Math.floor(Math.random() * 10);
      const mc = Math.floor(Math.random() * 10);
      if (!sweeperGrid[mr][mc].isMine) {
        sweeperGrid[mr][mc].isMine = true;
        sweeperMinesLocations.push({row: mr, col: mc});
        minesPlaced++;
      }
    }

    // Calculate hints
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (!sweeperGrid[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
                if (sweeperGrid[nr][nc].isMine) count++;
              }
            }
          }
          sweeperGrid[r][c].adjMines = count;
        }
      }
    }

    // Render grid
    const hexCodes = ['00', '1A', '2E', '3C', '4F', '5A', '6B', '7C', '8D', '9E', 'A0', 'B1', 'C2', 'D3', 'E4', 'F5'];
    
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const cell = sweeperGrid[r][c];
        const el = document.createElement('div');
        el.className = 'sweeper-cell';
        // Generate random hex representation for visual fluff
        const randomHex = hexCodes[Math.floor(Math.random() * hexCodes.length)];
        el.textContent = randomHex;
        el.id = `sweeper-cell-${r}-${c}`;
        
        // Left click (reveal)
        el.addEventListener('click', (e) => {
          e.preventDefault();
          revealSweeperCell(cell);
        });

        // Right click (flag)
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          flagSweeperCell(cell);
        });

        board.appendChild(el);
      }
    }
  }

  function flagSweeperCell(cell) {
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    
    const el = document.getElementById(`sweeper-cell-${cell.row}-${cell.col}`);
    if (el) {
      el.classList.toggle('flagged', cell.flagged);
      el.textContent = cell.flagged ? 'MAL' : '00';
    }

    const flaggedCount = document.querySelectorAll('.sweeper-cell.flagged').length;
    document.getElementById('sweeper-flagged').textContent = flaggedCount;
  }

  function revealSweeperCell(cell) {
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;
    sweeperRevealedCount++;
    document.getElementById('sweeper-revealed').textContent = sweeperRevealedCount;
    
    const el = document.getElementById(`sweeper-cell-${cell.row}-${cell.col}`);
    if (!el) return;

    el.classList.add('revealed');

    if (cell.isMine) {
      el.style.backgroundColor = '#ef4444';
      el.textContent = '✖';
      triggerSweeperGameOver(false);
      return;
    }

    if (cell.adjMines > 0) {
      el.textContent = cell.adjMines;
      // standard color maps for Minesweeper
      const colors = ['#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#f43f5e'];
      el.style.color = colors[(cell.adjMines - 1) % colors.length];
    } else {
      el.textContent = ' ';
      // Auto-reveal adjacent cells
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cell.row + dr;
          const nc = cell.col + dc;
          if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
            revealSweeperCell(sweeperGrid[nr][nc]);
          }
        }
      }
    }

    // Win condition (90 cells revealed)
    if (sweeperRevealedCount === 90) {
      triggerSweeperGameOver(true);
    }
  }

  function triggerSweeperGameOver(won) {
    if (won) {
      const score = 1000;
      const scoreEl = document.getElementById('arena-current-score');
      if (scoreEl) scoreEl.textContent = score;

      if (score > highScores.sweeper) {
        highScores.sweeper = score;
        localStorage.setItem('arcade_sweeper_high', score);
        const hsEl = document.getElementById('hs-sweeper');
        if (hsEl) hsEl.textContent = score;
        const arenaHs = document.getElementById('arena-high-score');
        if (arenaHs) arenaHs.textContent = score;
      }
      showArcadeOverlay('SECTORS CLEANED', `Malware swept successfully! Score: ${score}`, true);
    } else {
      // Reveal all mines
      sweeperMinesLocations.forEach(loc => {
        const el = document.getElementById(`sweeper-cell-${loc.row}-${loc.col}`);
        if (el) {
          el.classList.add('revealed');
          el.style.backgroundColor = 'var(--red)';
          el.style.color = '#ffffff';
          el.textContent = '✖';
        }
      });
      showArcadeOverlay('MALWARE TRIGGERED', 'Corrupted sector block compromised!', false);
    }
  }

  // Load menu on load or if DOM already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      showMenu();
    });
  } else {
    showMenu();
  }

  // Make switch hooks available globally for app.js panel triggers
  window.initArcadePanel = () => {
    showMenu();
  };

  window.stopArcadePanel = () => {
    stopAllGames();
  };

})();

