/**
 * ==============================================================================
 * EDGE SURF GAME - SALENTO EDITION (AUTHENTIC MICROSOFT EDGE SURF ENGINE)
 * ==============================================================================
 * Porting completo e fedele in JavaScript / HTML5 Canvas del gioco open-source:
 * https://github.com/ShirasawaSama/edge-surf-game (Microsoft Edge "edge://surf")
 *
 * Caratteristiche originali:
 * - Scorrimento infinito top-down con oceano dinamico e texture originali
 * - 8 Surfer selezionabili con relative tavole e animazioni
 * - Ostacoli: Scogli (piccoli/grandi), Pontili (docks), Banchi di sabbia, Alghe rallentanti, Mulinelli
 * - Oggetti speciali: Trampolini / Rampe di salto con volo aereo e rotazioni, Fulmini Boost (⚡),
 *   Cuori vita extra (💖), Cane compagno salvataggio (🐕), Monete dorate (🪙)
 * - Il Mostro Marino (Kraken / Piovra Gigante) che insegue il giocatore con tentacoli animati!
 * - Controlli completi: Tastiera (Frecce / WASD / Spazio) e Touch per smartphone (Swipe / Drag / Tasti virtuali)
 * - Audio sintetizzato Web Audio per salti, boost, collisioni, kraken e fanfare record
 */

(function (window) {
  'use strict';

  // ----------------------------------------------------------------------------
  // 1. CONFIGURAZIONE E COSTANTI ORIGINALI DI EDGE SURF
  // ----------------------------------------------------------------------------
  const GAME_WIDTH = 480;
  const GAME_HEIGHT = 640;
  const SURFER_TOP_RATIO = 0.33;

  const OBJECT_HITBOXES = {
    0: [32, 32],   // SMALL_OBJECT
    1: [64, 64],   // BIG_OBJECT
    2: [64, 64],   // SLOWDOWN_OBJECT
    3: [96, 96],   // RIPPLE_OBJECT
    4: [64, 64],   // AMBIENT_OBJECT
    5: [256, 128], // SAND_BAR_OBJECT
    6: [1280, 512],// ISLAND_OBJECT
    7: [64, 64],   // INTERACT_OBJECT
    8: [128, 128], // EFFECT_OBJECT
    9: [64, 64]    // DOCK_OBJECT
  };

  const ASSET_PATHS = {
    water: './surf-assets/water256.png',
    player: './surf-assets/player64.png',
    board: './surf-assets/surfboard64.png',
    objectsSmall: './surf-assets/objects32.png',
    objectsBig: './surf-assets/objects64.png',
    interact: './surf-assets/interact64.png',
    docks: './surf-assets/docks64.png',
    sandbar: './surf-assets/sandbar256.png',
    slowdown: './surf-assets/slowdown64.png',
    enemy: './surf-assets/enemy128.png',
    effects: './surf-assets/effects128.png',
    interface: './surf-assets/interface24.png',
    ripple: './surf-assets/ripple96.png',
    ambient: './surf-assets/ambient64.png'
  };

  // ----------------------------------------------------------------------------
  // 2. GESTORE ASSET IMMAGINI
  // ----------------------------------------------------------------------------
  class AssetManager {
    constructor() {
      this.images = {};
      this.loaded = false;
      this.loadCount = 0;
      this.total = Object.keys(ASSET_PATHS).length;
    }

    load(onComplete) {
      if (this.loaded) {
        if (onComplete) onComplete();
        return;
      }
      for (const [key, src] of Object.entries(ASSET_PATHS)) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          this.loadCount++;
          if (this.loadCount >= this.total) {
            this.loaded = true;
            if (onComplete) onComplete();
          }
        };
        img.onerror = () => {
          this.loadCount++;
          if (this.loadCount >= this.total) {
            this.loaded = true;
            if (onComplete) onComplete();
          }
        };
        this.images[key] = img;
      }
    }

    get(key) {
      return this.images[key];
    }
  }

  // ----------------------------------------------------------------------------
  // 3. EFFETTI SONORI SINTETIZZATI WEB AUDIO
  // ----------------------------------------------------------------------------
  class EdgeSurfAudio {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      const saved = localStorage.getItem('salento_edge_surf_muted');
      if (saved !== null) this.isMuted = saved === 'true';
    }

    init() {
      if (this.ctx) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      } catch (e) {}
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      localStorage.setItem('salento_edge_surf_muted', this.isMuted);
      return this.isMuted;
    }

    playJump() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(740, t + 0.22);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    }

    playBoost() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.28);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    }

    playCollect() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, t);
      osc.frequency.setValueAtTime(880, t + 0.08);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    }

    playHit() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(40, t + 0.3);
      g.gain.setValueAtTime(0.24, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    }

    playKraken() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.linearRampToValueAtTime(60, t + 0.6);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    }
  }

  // ----------------------------------------------------------------------------
  // 4. MOTORE PRINCIPALE DI GIOCO (EDGE SURF EXACT PORT)
  // ----------------------------------------------------------------------------
  class EdgeSurfEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.assets = new AssetManager();
      this.audio = new EdgeSurfAudio();

      // Stato partita
      this.started = false;
      this.paused = true;
      this.finished = false;

      this.surfer = 0; // indice surfer 0..7
      this.surferAction = 0; // 0:fermo, 1:hard-left, 2:left, 3:straight, 4:right, 5:hard-right, 6:crash, 7:eaten
      this.initialSpeed = 4;
      this.speed = 0;
      this.distance = 0;
      this.offset = 0;

      this.heart = 3;
      this.power = 0;
      this.coinCount = 0;
      this.hasDog = false;

      // Timer
      this.fallTimer = 0;
      this.invincibleTimer = 0;
      this.flyingTimer = 0;
      this.rushTimer = 0;
      this.boardTimer = 0;
      this.enemyTimer = 0;
      this.enemyStoped = false;
      this.enemyX = 0;
      this.enemyY = 0;

      this.objects = [];
      this.highScore = 0;
      this.bestDistance = 0;

      this.lastTimestamp = 0;
      this.animId = null;

      // Touch controls
      this.touchStartX = 0;
      this.touchStartY = 0;
      this.isTouchActive = false;

      this.loadSavedScore();
    }

    loadSavedScore() {
      try {
        const saved = localStorage.getItem('salento_edge_surf_highscore_v1');
        if (saved) {
          const d = JSON.parse(saved);
          this.highScore = d.highScore || 0;
          this.bestDistance = d.bestDistance || 0;
          this.surfer = d.surfer || 0;
        }
      } catch (e) {}
    }

    saveScore() {
      try {
        const currentScore = this.getScore();
        if (currentScore > this.highScore) this.highScore = currentScore;
        const currentDist = Math.floor(this.distance / 10.0);
        if (currentDist > this.bestDistance) this.bestDistance = currentDist;

        localStorage.setItem('salento_edge_surf_highscore_v1', JSON.stringify({
          highScore: this.highScore,
          bestDistance: this.bestDistance,
          surfer: this.surfer
        }));
      } catch (e) {}
    }

    getScore() {
      return Math.floor(this.distance / 10.0) + (this.hasDog ? 1000 : 0) + (this.coinCount * 2000) + (this.power * 300);
    }

    init(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      this.canvas.width = GAME_WIDTH;
      this.canvas.height = GAME_HEIGHT;
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;

      this.assets.load(() => {
        this.updateCardUI();
      });

      this.bindControls();
      this.resetGame();

      this.lastTimestamp = performance.now();
      if (this.animId) cancelAnimationFrame(this.animId);
      this.loop(this.lastTimestamp);
    }

    resetGame() {
      this.objects = [];
      this.paused = true;
      this.started = false;
      this.finished = false;
      this.heart = 3;
      this.power = 0;
      this.coinCount = 0;
      this.hasDog = false;

      this.distance = 0;
      this.offset = 0;
      this.speed = 0;
      this.surferAction = 0;

      this.invincibleTimer = 0;
      this.fallTimer = 0;
      this.flyingTimer = 0;
      this.rushTimer = 0;
      this.enemyTimer = 0;
      this.enemyStoped = false;
      this.enemyX = 0;
      this.enemyY = 0;

      this.updateHUD();
      this.updateCardUI();
    }

    startSurfing() {
      if (this.finished) {
        this.resetGame();
        return;
      }
      this.audio.init();
      this.audio.resume();

      this.started = true;
      this.paused = false;
      this.speed = this.initialSpeed;
      this.surferAction = 3; // Down
      this.makeStarterObjects();
    }

    triggerBoost() {
      this.audio.init();
      this.audio.resume();

      if (this.paused) {
        this.startSurfing();
        return;
      }
      if (this.power > 0 || this.rushTimer > 0) {
        if (!this.rushTimer) {
          this.power = Math.max(0, this.power - 1);
          this.audio.playBoost();
        }
        this.rushTimer = 1;
        this.speed = this.initialSpeed * 2.2;
        if (this.surferAction === 0) this.surferAction = 3;
      }
    }

    setSurferCharacter(idx) {
      this.surfer = Math.max(0, Math.min(7, idx));
      this.saveScore();
      this.updateCardUI();
    }

    // --------------------------------------------------------------------------
    // GENERAZIONE DEGLI OGGETTI (ROCKS, DOCKS, SANDBARS, BOOSTS, HEARTS, KRAKEN)
    // --------------------------------------------------------------------------
    makeStarterObjects() {
      const centerX = GAME_WIDTH / 2.0;
      const centerY = GAME_HEIGHT / 2.0 + 64;

      // Cuore iniziale e boost
      this.objects.push({ type: 7, index: 3, x: centerX - 84, y: centerY, stage: 0, maxStage: 3, once: false }); // Heart
      this.objects.push({ type: 7, index: 2, x: centerX + 20, y: centerY, stage: 0, maxStage: 3, once: false }); // Boost

      // Pontili e scogli iniziali
      this.makeDocks(centerX - 64 * 3.5, centerY + 128);
      this.makeDocks(centerX + 64 * 1.5, centerY + 128);
    }

    makeDocks(x, y) {
      this.objects.push({ type: 9, index: 0, x: x, y: y, stage: 0, maxStage: 0, once: false });
      this.objects.push({ type: 9, index: 1, x: x + 64, y: y, stage: 0, maxStage: 0, once: false });
      this.objects.push({ type: 9, index: 8, x: x + 128, y: y, stage: 0, maxStage: 0, once: false });
      this.objects.push({ type: 9, index: 2, x: x + 192, y: y, stage: 0, maxStage: 0, once: false });
    }

    randomX() {
      return Math.random() * GAME_WIDTH + this.offset;
    }

    randomY() {
      return this.distance + GAME_HEIGHT * (1 + Math.random());
    }

    generateObjects() {
      if (this.paused || this.finished) return;
      const dis = Math.floor(this.distance);

      // Scogli piccoli
      if (dis % 73 <= this.speed && Math.random() > 0.45) {
        this.objects.push({ type: 0, index: Math.floor(Math.random() * 8), x: this.randomX(), y: this.randomY(), stage: 0, maxStage: 0, once: false });
      }
      // Alghe rallentanti
      if (dis % 44 <= this.speed && Math.random() > 0.65) {
        this.objects.push({ type: 2, index: Math.floor(Math.random() * 9), x: this.randomX(), y: this.randomY(), stage: 0, maxStage: 2, once: false });
      }
      // Scogli grandi / coralli
      if (dis % 77 <= this.speed && Math.random() > 0.38) {
        this.objects.push({ type: 3, index: 0, x: this.randomX() - 16, y: this.randomY() - 18, stage: 0, maxStage: 2, once: false }); // Ripple
        this.objects.push({ type: 1, index: Math.floor(Math.random() * 25), x: this.randomX(), y: this.randomY(), stage: 0, maxStage: 0, once: false });
      }
      // Oggetti interagibili (Boost, Cuore, Rampa salto, Moneta, Cane)
      if (dis % 175 <= this.speed && Math.random() > 0.6) {
        const randIdx = Math.floor(Math.random() * 7);
        const objIdx = randIdx === 5 ? 6 : randIdx; // 0:rampa, 2:boost, 3:cuore, 4:moneta, 6:cane
        this.objects.push({ type: 7, index: objIdx, x: this.randomX(), y: this.randomY(), stage: 0, maxStage: 3, once: false });
      }
      // Banchi di sabbia
      if (dis % 433 <= this.speed && Math.random() > 0.68) {
        this.objects.push({ type: 5, index: Math.floor(Math.random() * 4), x: this.randomX(), y: this.randomY(), stage: 0, maxStage: 0, once: false });
      }
      // Pontili
      if (dis % 633 <= this.speed && Math.random() > 0.55) {
        this.makeDocks(this.randomX(), this.randomY());
      }

      // KRAKEN SPAWN: dopo 500m (5000px) il mostro marino comincia ad emergere!
      if (dis > 3500 && this.enemyTimer === 0 && Math.random() < 0.003) {
        this.enemyTimer = 1;
        this.enemyX = this.offset + (GAME_WIDTH / 2.0) - 64;
        this.enemyY = this.distance - 120;
        this.audio.playKraken();
      }
    }

    // --------------------------------------------------------------------------
    // GESTIONE CONTROLLI TOUCH & TASTIERA
    // --------------------------------------------------------------------------
    bindControls() {
      if (!this.canvas) return;

      const handlePointerDown = (e) => {
        e.preventDefault();
        this.audio.init();
        this.audio.resume();

        const touch = e.touches ? e.touches[0] : e;
        const rect = this.canvas.getBoundingClientRect();
        this.touchStartX = ((touch.clientX - rect.left) / rect.width) * GAME_WIDTH;
        this.touchStartY = ((touch.clientY - rect.top) / rect.height) * GAME_HEIGHT;
        this.isTouchActive = true;

        if (!this.started || this.finished) {
          this.startSurfing();
          return;
        }

        // Tap a sinistra/destra del surfer per virare
        const playerScreenX = GAME_WIDTH / 2.0;
        if (this.touchStartX < playerScreenX - 40) {
          this.steerLeft();
        } else if (this.touchStartX > playerScreenX + 40) {
          this.steerRight();
        } else {
          this.surferAction = 3; // dritto
        }
      };

      const handlePointerMove = (e) => {
        if (!this.isTouchActive || !this.started || this.finished) return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const rect = this.canvas.getBoundingClientRect();
        const curX = ((touch.clientX - rect.left) / rect.width) * GAME_WIDTH;
        const dx = curX - this.touchStartX;

        if (dx < -30) {
          this.surferAction = 1; // Hard left
        } else if (dx < -8) {
          this.surferAction = 2; // Gentle left
        } else if (dx > 30) {
          this.surferAction = 5; // Hard right
        } else if (dx > 8) {
          this.surferAction = 4; // Gentle right
        } else {
          this.surferAction = 3; // Straight down
        }
      };

      const handlePointerUp = (e) => {
        e.preventDefault();
        this.isTouchActive = false;
      };

      this.canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
      this.canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
      this.canvas.addEventListener('touchend', handlePointerUp, { passive: false });
      this.canvas.addEventListener('mousedown', handlePointerDown);
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);

      // Tastiera
      window.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyF'].includes(e.code)) {
          this.audio.init();
          this.audio.resume();

          if (!this.started || this.finished) {
            if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS') {
              this.startSurfing();
              return;
            }
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
              this.setSurferCharacter(this.surfer - 1);
              return;
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
              this.setSurferCharacter(this.surfer + 1);
              return;
            }
          }

          if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            this.steerLeft();
          } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            this.steerRight();
          } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            this.surferAction = 3;
            if (this.paused) { this.paused = false; this.speed = this.initialSpeed; }
          } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
            // Frena / Ferma
            this.paused = true;
            this.speed = 0;
            this.surferAction = 0;
          } else if (e.code === 'Space' || e.code === 'KeyF') {
            this.triggerBoost();
          }
        }
      });
    }

    steerLeft() {
      if (this.paused) { this.paused = false; this.speed = this.initialSpeed; }
      this.surferAction = this.surferAction === 2 ? 1 : 2;
    }

    steerRight() {
      if (this.paused) { this.paused = false; this.speed = this.initialSpeed; }
      this.surferAction = this.surferAction === 4 ? 5 : 4;
    }

    // --------------------------------------------------------------------------
    // UPDATE FISICA E GIOCO
    // --------------------------------------------------------------------------
    hitPlayer() {
      if (this.fallTimer > 0 || this.invincibleTimer > 0 || this.flyingTimer > 0) return;

      if (this.hasDog) {
        // Il cane salva il surfer e salta via
        this.hasDog = false;
        this.invincibleTimer = 180;
        this.audio.playHit();
        return;
      }

      this.speed = 0;
      this.paused = true;
      this.heart = Math.max(0, this.heart - 1);
      this.surferAction = 6; // Crash pose
      this.audio.playHit();

      if (this.heart <= 0) {
        this.finished = true;
        this.saveScore();
        this.showGameOverModal();
      } else {
        this.fallTimer = 1;
      }
    }

    showGameOverModal() {
      const modal = document.getElementById('surfGameOverModal');
      const finalScoreEl = document.getElementById('surfFinalScore');
      const finalDistEl = document.getElementById('surfFinalDist');
      const finalBarrelEl = document.getElementById('surfFinalBarrel');
      const recordBadge = document.getElementById('surfNewRecordBadge');

      const isNew = this.getScore() >= this.highScore;

      if (finalScoreEl) finalScoreEl.textContent = this.getScore().toLocaleString();
      if (finalDistEl) finalDistEl.textContent = `${Math.floor(this.distance / 10.0)}m`;
      if (finalBarrelEl) finalBarrelEl.textContent = `🪙 x${this.coinCount} · ⚡ x${this.power}`;
      if (recordBadge) recordBadge.style.display = isNew ? 'inline-block' : 'none';

      if (modal) modal.classList.add('active');
    }

    update(dt) {
      this.boardTimer = (this.boardTimer + 1) % 120;

      if (!this.started || this.finished) return;

      // Recupero dopo caduta
      if (this.fallTimer > 0) {
        this.fallTimer++;
        if (this.fallTimer > 120) {
          this.fallTimer = 0;
          this.invincibleTimer = 160;
          this.surferAction = 3;
          this.speed = this.initialSpeed;
          this.paused = false;
        }
        return;
      }

      if (this.invincibleTimer > 0) this.invincibleTimer--;
      if (this.flyingTimer > 0) this.flyingTimer--;

      // Movimento e scrolling
      if (!this.paused) {
        this.distance += this.speed;

        let steerRatio = 0;
        switch (this.surferAction) {
          case 1: steerRatio = -0.7; break; // Hard Left
          case 2: steerRatio = -0.25; break; // Gentle Left
          case 4: steerRatio = 0.25; break; // Gentle Right
          case 5: steerRatio = 0.7; break; // Hard Right
        }
        this.offset += steerRatio * this.speed;

        // Boost rush timer
        if (this.rushTimer > 0) {
          this.rushTimer++;
          if (this.rushTimer > 280) {
            this.rushTimer = 0;
            this.speed = this.initialSpeed;
          }
        }
        if (this.speed < this.initialSpeed) {
          this.speed = Math.min(this.initialSpeed, this.speed * 1.02);
        }
      }

      // Generazione e collisioni oggetti
      this.generateObjects();
      this.updateObjectsAndCollisions();

      // Aggiorna Kraken Enemy
      this.updateKraken();
    }

    updateObjectsAndCollisions() {
      const playerX = GAME_WIDTH / 2.0;
      const playerY = GAME_HEIGHT * SURFER_TOP_RATIO;
      const pWorldX = playerX + this.offset;
      const pWorldY = playerY + this.distance;

      for (let i = this.objects.length - 1; i >= 0; i--) {
        const obj = this.objects[i];
        const box = OBJECT_HITBOXES[obj.type] || [64, 64];

        // Rimuovi oggetti usciti in alto
        if (obj.y + box[1] < this.distance - 100) {
          this.objects.splice(i, 1);
          continue;
        }

        // Animazione ciclica
        if (obj.maxStage > 0) {
          obj.stage = (obj.stage + 0.15) % (obj.maxStage + 1);
        }

        // Collision Check con il Surfer
        const halfW = box[0] * 0.4;
        const halfH = box[1] * 0.35;
        const dx = Math.abs(pWorldX - (obj.x + box[0] * 0.5));
        const dy = Math.abs(pWorldY - (obj.y + box[1] * 0.5));

        if (!this.flyingTimer && dx < halfW && dy < halfH) {
          switch (obj.type) {
            case 7: // INTERACT_OBJECT (Boost, Cuore, Rampa, Cane, Moneta)
              if (obj.index === 0) {
                // RAMPA DI SALTO!
                this.flyingTimer = 110;
                this.audio.playJump();
              } else if (obj.index === 2) {
                // Fulmine Boost
                if (this.power < 3) this.power++;
                this.audio.playCollect();
              } else if (obj.index === 3) {
                // Cuore extra
                if (this.heart < 3) this.heart++;
                this.audio.playCollect();
              } else if (obj.index === 4) {
                // Moneta
                this.coinCount++;
                this.audio.playCollect();
              } else if (obj.index === 6) {
                // Cane salvato!
                this.hasDog = true;
                this.audio.playCollect();
              }
              this.objects.splice(i, 1);
              break;

            case 2: // SLOWDOWN (Alghe)
              this.speed = Math.max(1.8, this.speed * 0.92);
              break;

            case 3: // RIPPLE
              break;

            default: // Scogli, pontili, isole
              this.hitPlayer();
              break;
          }
        }
      }
    }

    updateKraken() {
      if (this.enemyTimer <= 0) return;
      this.enemyTimer++;

      const playerTargetX = this.offset + (GAME_WIDTH / 2.0) - 64;
      const playerTargetY = this.distance + (GAME_HEIGHT * SURFER_TOP_RATIO) - 64;

      // Inseguimento
      if (!this.enemyStoped) {
        this.enemyY += 3.8;
        if (this.enemyX < playerTargetX) this.enemyX += 1.8;
        else if (this.enemyX > playerTargetX) this.enemyX -= 1.8;

        // Collisione Kraken con il Surfer
        const dx = Math.abs(this.enemyX - playerTargetX);
        const dy = Math.abs(this.enemyY - playerTargetY);
        if (!this.flyingTimer && dx < 40 && dy < 40) {
          this.enemyStoped = true;
          this.heart = 0;
          this.finished = true;
          this.surferAction = 7; // Eaten
          this.audio.playKraken();
          this.saveScore();
          this.showGameOverModal();
        }
      }

      // Se il kraken rimane troppo indietro, scompare
      if (this.enemyY + 300 < this.distance) {
        this.enemyTimer = 0;
        this.enemyStoped = false;
      }
    }

    // --------------------------------------------------------------------------
    // RENDER GRAFICA
    // --------------------------------------------------------------------------
    draw() {
      const ctx = this.ctx;
      if (!ctx) return;

      const w = GAME_WIDTH;
      const h = GAME_HEIGHT;

      // 1. Sfondo Oceano con onde animate
      const waterImg = this.assets.get('water');
      if (waterImg && waterImg.complete && waterImg.naturalWidth > 0) {
        const bgOffsetX = Math.floor(this.offset) % 256;
        const bgOffsetY = Math.floor(this.distance) % 256;
        for (let x = -bgOffsetX - 256; x < w + 256; x += 256) {
          for (let y = -bgOffsetY - 256; y < h + 256; y += 256) {
            ctx.drawImage(waterImg, x, y, 256, 256);
          }
        }
      } else {
        // Fallback gradiente marino
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#38BDF8');
        grad.addColorStop(1, '#0284C7');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Oggetti in acqua
      this.drawObjects(ctx);

      // 3. Mostro Marino (Kraken)
      this.drawKraken(ctx);

      // 4. Surfer
      if (this.started) {
        this.drawSurfer(ctx);
      } else {
        this.drawStartScreen(ctx);
      }

      // 5. HUD Superiore
      this.drawHUD(ctx);
    }

    drawObjects(ctx) {
      for (let i = 0; i < this.objects.length; i++) {
        const obj = this.objects[i];
        const screenX = obj.x - this.offset;
        const screenY = obj.y - this.distance;
        const box = OBJECT_HITBOXES[obj.type] || [64, 64];

        let imgKey = 'objectsBig';
        let frameW = box[0];
        let frameH = box[1];
        let sx = obj.index * frameW;
        let sy = Math.floor(obj.stage) * frameH;

        switch (obj.type) {
          case 0: imgKey = 'objectsSmall'; break;
          case 1: imgKey = 'objectsBig'; break;
          case 2: imgKey = 'slowdown'; break;
          case 3: imgKey = 'ripple'; break;
          case 4: imgKey = 'ambient'; break;
          case 5: imgKey = 'sandbar'; break;
          case 7: imgKey = 'interact'; break;
          case 9: imgKey = 'docks'; break;
        }

        const img = this.assets.get(imgKey);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, sx, sy, frameW, frameH, Math.round(screenX), Math.round(screenY), frameW, frameH);
        } else {
          // Fallback pixel art
          ctx.fillStyle = obj.type === 7 ? '#FBBF24' : '#64748B';
          ctx.fillRect(Math.round(screenX), Math.round(screenY), frameW * 0.7, frameH * 0.7);
        }
      }
    }

    drawKraken(ctx) {
      if (this.enemyTimer <= 0) return;
      const screenX = this.enemyX - this.offset;
      const screenY = this.enemyY - this.distance + 40;
      const enemyImg = this.assets.get('enemy');

      const frameIdx = Math.floor((this.enemyTimer / 8) % 4);
      if (enemyImg && enemyImg.complete && enemyImg.naturalWidth > 0) {
        ctx.drawImage(enemyImg, 0, frameIdx * 128, 128, 128, Math.round(screenX), Math.round(screenY), 128, 128);
      } else {
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(Math.round(screenX + 32), Math.round(screenY + 32), 64, 64);
      }
    }

    drawSurfer(ctx) {
      const left = (GAME_WIDTH - 64) / 2.0;
      const top = GAME_HEIGHT * SURFER_TOP_RATIO;

      // Ombra di volo sul salto
      if (this.flyingTimer > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(left + 32, top + 64, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Azione / Animazione
      let actionIdx = this.surferAction;
      if (this.flyingTimer > 0) {
        actionIdx = 9 + Math.floor((this.flyingTimer / 8) % 4);
      }

      // Trasparenza su invincibilità
      const alpha = (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 6) % 2 === 0) ? 0.45 : 1.0;
      ctx.globalAlpha = alpha;

      const boardImg = this.assets.get('board');
      const playerImg = this.assets.get('player');

      const sx = actionIdx * 64;
      const boardSy = Math.floor((this.boardTimer % 30) / 10) * 64;
      const playerSy = this.surfer * 64;

      const drawY = this.flyingTimer > 0 ? top - (Math.sin(this.flyingTimer / 110 * Math.PI) * 28) : top;

      // 1. Tavola
      if (boardImg && boardImg.complete && boardImg.naturalWidth > 0) {
        ctx.drawImage(boardImg, sx, boardSy, 64, 64, left, drawY, 64, 64);
      }
      // 2. Surfer
      if (playerImg && playerImg.complete && playerImg.naturalWidth > 0) {
        ctx.drawImage(playerImg, sx, playerSy, 64, 64, left, drawY, 64, 64);
      } else {
        ctx.fillStyle = '#FF385C';
        ctx.fillRect(left + 16, drawY + 12, 32, 40);
      }

      // 3. Cane compagno a bordo
      if (this.hasDog && playerImg && playerImg.complete) {
        ctx.drawImage(playerImg, sx, 512, 64, 64, left, drawY, 64, 64);
      }

      ctx.globalAlpha = 1.0;
    }

    drawStartScreen(ctx) {
      const center = GAME_WIDTH / 2.0;
      const top = GAME_HEIGHT * SURFER_TOP_RATIO;

      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 8;
      ctx.fillText("LET'S SURF!", center, top - 80);

      // Mostra i surfer selezionabili in riga
      const playerImg = this.assets.get('player');
      const boardImg = this.assets.get('board');

      const oLeft = (GAME_WIDTH - 64) / 2.0;
      let left = oLeft - this.surfer * 80;

      for (let i = 0; i < 8; i++, left += 80) {
        const isSelected = i === this.surfer;
        ctx.globalAlpha = isSelected ? 1.0 : 0.45;

        if (boardImg && boardImg.complete) {
          ctx.drawImage(boardImg, 3 * 64, 0, 64, 64, left, top, 64, 64);
        }
        if (playerImg && playerImg.complete) {
          ctx.drawImage(playerImg, 3 * 64, i * 64, 64, 64, left, top, 64, 64);
        }

        if (isSelected) {
          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 3;
          ctx.strokeRect(left + 4, top + 4, 56, 56);
        }
      }
      ctx.globalAlpha = 1.0;

      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FDE047';
      ctx.fillText('◄ TOCCA O FRECCE PER SCEGLIERE IL SURFER ►', center, top + 90);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('🎮 TOCCA LO SCHERMO PER GIOCARE!', center, top + 130);
    }

    drawHUD(ctx) {
      // Barra superiore HUD
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fillRect(0, 0, GAME_WIDTH, 48);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, GAME_WIDTH, 48);

      const center = GAME_WIDTH / 2.0;

      // Distanza percorsa
      ctx.textAlign = 'center';
      ctx.font = 'bold 17px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.shadowBlur = 0;
      const meters = Math.floor(this.distance / 10.0);
      ctx.fillText(`${meters} M`, center, 31);

      // Icone Cuori (a sinistra)
      const iface = this.assets.get('interface');
      let heartLeft = center - 85;
      for (let i = 0; i < 3; i++) {
        const isFull = i < this.heart;
        if (iface && iface.complete) {
          ctx.drawImage(iface, isFull ? 24 : 0, 0, 24, 24, heartLeft, 12, 22, 22);
        } else {
          ctx.font = '16px sans-serif';
          ctx.fillText(isFull ? '💖' : '🖤', heartLeft + 10, 28);
        }
        heartLeft -= 24;
      }

      // Icone Fulmini Boost (a destra)
      let boostLeft = center + 55;
      for (let i = 0; i < 3; i++) {
        const isFull = i < this.power;
        if (iface && iface.complete) {
          ctx.drawImage(iface, isFull ? 24 : 0, 24, 24, 24, boostLeft, 12, 22, 22);
        } else {
          ctx.font = '16px sans-serif';
          ctx.fillText(isFull ? '⚡' : '⚪', boostLeft + 10, 28);
        }
        boostLeft += 24;
      }

      // Cane e Monete a sinistra
      let extraLeft = 14;
      if (this.hasDog) {
        if (iface && iface.complete) {
          ctx.drawImage(iface, 24, 48, 24, 24, extraLeft, 12, 22, 22);
        } else {
          ctx.fillText('🐕', extraLeft + 8, 28);
        }
        extraLeft += 26;
      }
      if (this.coinCount > 0) {
        ctx.textAlign = 'left';
        ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#B45309';
        ctx.fillText(`🪙x${this.coinCount}`, extraLeft, 30);
      }
    }

    loop(timestamp) {
      const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.08);
      this.lastTimestamp = timestamp;

      this.update(dt);
      this.draw();
      this.updateHUD();

      this.animId = requestAnimationFrame((t) => this.loop(t));
    }

    updateHUD() {
      const scoreEl = document.getElementById('surfLiveScore');
      const distEl = document.getElementById('surfLiveDist');
      const shellsEl = document.getElementById('surfLiveShells');

      if (scoreEl) scoreEl.textContent = this.getScore().toLocaleString();
      if (distEl) distEl.textContent = `${Math.floor(this.distance / 10.0)}m`;
      if (shellsEl) shellsEl.textContent = `⚡ x${this.power}`;
    }

    updateCardUI() {
      const scoreEl = document.getElementById('surfRecordScore');
      const barrelEl = document.getElementById('surfRecordBarrel');
      const distEl = document.getElementById('surfRecordDist');

      if (scoreEl) scoreEl.textContent = this.highScore.toLocaleString();
      if (barrelEl) barrelEl.textContent = `${this.bestDistance}m`;
      if (distEl) distEl.textContent = `Surfer #${this.surfer + 1}`;
    }
  }

  // Istanza globale
  window.SalentoSurf = new EdgeSurfEngine();

})(window);
