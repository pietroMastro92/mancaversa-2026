/**
 * ==============================================================================
 * SALENTO SURF - FULLSCREEN MOBILE FIRST & RETRO 8-BIT ENGINE
 * ==============================================================================
 * Fedele reimplementazione in JavaScript / HTML5 Canvas del celebre gioco
 * di surf infinito:
 * - Adattamento 100% Fullscreen su Smartphone senza bande nere
 * - Controlli Pop Glassmorphism a schermo & Touch Analogico sul mare
 * - Colonna sonora BGM, suoni sintetizzati ed effetti particellari
 * - Selezione 8 surfer 100% in-game nella schermata iniziale
 */

(function (window) {
  'use strict';

  const GAME_WIDTH = 480;
  const GAME_HEIGHT = 640;
  const SURFER_TOP = 0.33;
  const ANIMATION_TIMER_MAX_VALUE = 40;

  // Dimensioni hitbox originali da objects.c [width, height]
  const OBJECT_HITBOXES = [
    [32, 32],    // 0: SMALL_OBJECT
    [64, 64],    // 1: BIG_OBJECT
    [64, 64],    // 2: SLOWDOWN_OBJECT
    [96, 96],    // 3: RIPPLE_OBJECT
    [64, 64],    // 4: AMBIENT_OBJECT
    [256, 128],  // 5: SAND_BAR_OBJECT
    [1280, 512], // 6: ISLAND_OBJECT
    [64, 64],    // 7: INTERACT_OBJECT
    [128, 128],  // 8: EFFECT_OBJECT
    [64, 64]     // 9: DOCK_OBJECT
  ];

  const ASSET_PATHS = {
    background: './surf-assets/water256.png',
    surfer: './surf-assets/surfer64.png',
    player: './surf-assets/player64.png',
    board: './surf-assets/surfboard64.png',
    interface: './surf-assets/interface24.png',
    naughtySurfer: './surf-assets/surfer64.png',
    enemy: './surf-assets/enemy128.png',
    objectsSmall: './surf-assets/objects32.png',
    objectsBig: './surf-assets/objects64.png',
    slowdown: './surf-assets/slowdown64.png',
    ripple: './surf-assets/ripple96.png',
    ambient: './surf-assets/ambient64.png',
    sandbar: './surf-assets/sandbar256.png',
    island: './surf-assets/island1280.png',
    interact: './surf-assets/interact64.png',
    effects: './surf-assets/effects128.png',
    docks: './surf-assets/docks64.png'
  };

  // ----------------------------------------------------------------------------
  // AUDIO ENGINE (BGM & SFX)
  // ----------------------------------------------------------------------------
  class SalentoSurfAudio {
    constructor() {
      this.ctx = null;
      this.bgm = null;
      this.isMuted = false;
    }

    init() {
      if (!this.ctx) {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) this.ctx = new AudioCtx();
        } catch (e) {}
      }
      if (!this.bgm) {
        try {
          this.bgm = new Audio('./surf-assets/bgm.mp3');
          this.bgm.loop = true;
          this.bgm.volume = 0.45;
        } catch (e) {}
      }
    }

    unlockAudio() {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.bgm && !this.isMuted) {
        const p = this.bgm.play();
        if (p && typeof p.then === 'function') {
          p.catch(() => {});
        }
      }
      const btn = document.getElementById('btnSurfMute');
      if (btn) btn.innerHTML = `<span>${this.isMuted ? '🔇 Muto' : '🔊 Audio'}</span>`;
    }

    playMusic() {
      this.unlockAudio();
    }

    pauseMusic() {
      if (this.bgm) {
        try { this.bgm.pause(); } catch (e) {}
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      if (this.bgm) {
        if (this.isMuted) {
          try { this.bgm.pause(); } catch (e) {}
        } else {
          this.unlockAudio();
        }
      }
      const btn = document.getElementById('btnSurfMute');
      if (btn) {
        btn.innerHTML = `<span>${this.isMuted ? '🔇' : '🔊'}</span>`;
        if (this.isMuted) {
          btn.classList.add('muted');
        } else {
          btn.classList.remove('muted');
        }
      }
      return this.isMuted;
    }

    playSelect() {
      if (!this.ctx || this.isMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, t);
      osc.frequency.exponentialRampToValueAtTime(783.99, t + 0.08);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    }

    playJump() {
      if (!this.ctx || this.isMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(780, t + 0.22);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    }

    playBoost() {
      if (!this.ctx || this.isMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.28);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    }

    playCollect() {
      if (!this.ctx || this.isMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, t);
      osc.frequency.setValueAtTime(880, t + 0.08);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    }

    playHit() {
      if (!this.ctx || this.isMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(40, t + 0.3);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    }

    playKraken() {
      if (!this.ctx || this.isMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.linearRampToValueAtTime(55, t + 0.6);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    }

    playDog() {
      if (!this.ctx || this.isMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.12);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    }

    playCoin() {
      if (!this.ctx || this.isMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t);
      osc.frequency.setValueAtTime(1318.51, t + 0.08);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  }

  // ----------------------------------------------------------------------------
  // SALENTO SURF ENGINE CLASS
  // ----------------------------------------------------------------------------
  class SalentoSurfEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.activeCanvasId = null;
      this.width = GAME_WIDTH;
      this.height = GAME_HEIGHT;

      this.images = {};
      this.imagesLoaded = false;
      this.audio = new SalentoSurfAudio();

      // Stato gioco originale
      this.paused = true;
      this.started = false;
      this.finished = false;
      this.surfer = 0; // 0..7
      this.initialSpeed = 4;
      this.speed = 0;
      this.distance = 0;
      this.offset = 0;

      this.heart = 3;
      this.power = 0;
      this.coinCount = 0;
      this.hasDog = false;

      this.surferAction = 0; // 0:stop, 1:hard-L, 2:L, 3:straight, 4:R, 5:hard-R, 6:crash, 7:eaten
      this.invincibleTimer = 0;
      this.fallTimer = 0;
      this.boardTimer = 0;
      this.flyingTimer = 0;
      this.changeDirectionTimer = 0;
      this.rushTimer = 0;
      this.enemyTimer = 0;
      this.enemyStoped = false;
      this.enemyX = 0;
      this.enemyY = 0;
      this.boardBrokenTimer = 0;
      this.animationTimer = 1;

      this.naughtySurfer = { type: 0, action: 2, x: 0, y: 0, visible: false };
      this.objects = [];

      this.highScore = 0;
      this.bestDistance = 0;
      this.animId = null;

      // Touch & Analog Stick tracking
      this.isTouchSteering = false;
      this.touchX = this.width / 2.0;
      this.touchY = this.height * 0.75;
      this.touchStartX = this.width / 2.0;
      this.touchStartY = this.height * 0.75;
      this.damageFlashTimer = 0;

      this.loadSavedScores();
      this.loadImages();
    }

    loadSavedScores() {
      try {
        const saved = localStorage.getItem('salento_surf_best_score_v5');
        if (saved) {
          const d = JSON.parse(saved);
          this.highScore = d.highScore || 0;
          this.bestDistance = d.bestDistance || 0;
          this.surfer = d.surfer || 0;
        }
      } catch (e) {}
    }

    saveScores() {
      try {
        const curScore = this.getScore();
        if (curScore > this.highScore) this.highScore = curScore;
        const curDist = Math.floor(this.distance / 10.0);
        if (curDist > this.bestDistance) this.bestDistance = curDist;

        localStorage.setItem('salento_surf_best_score_v5', JSON.stringify({
          highScore: this.highScore,
          bestDistance: this.bestDistance,
          surfer: this.surfer
        }));
      } catch (e) {}
    }

    loadImages() {
      let count = 0;
      const keys = Object.keys(ASSET_PATHS);
      const total = keys.length;

      keys.forEach((k) => {
        const img = new Image();
        img.src = ASSET_PATHS[k];
        img.onload = () => {
          count++;
          if (count >= total) {
            this.imagesLoaded = true;
            this.updateCardUI();
          }
        };
        img.onerror = () => {
          count++;
          if (count >= total) {
            this.imagesLoaded = true;
            this.updateCardUI();
          }
        };
        this.images[k] = img;
      });
    }

    getScore() {
      return Math.floor(this.distance / 10.0) + (this.hasDog ? 1000 : 0) + (this.coinCount * 2000) + (this.power * 300);
    }

    isInvincible() {
      return this.fallTimer > 0 || this.invincibleTimer > 0;
    }

    isNaughtySurferExists() {
      return this.naughtySurfer.visible && this.naughtySurfer.action !== 2;
    }

    updateDimensions() {
      if (!this.canvas) return;
      if (this.activeCanvasId === 'surfGameCanvas') {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        this.width = winW;
        this.height = winH;

        this.canvas.width = Math.round(winW * dpr);
        this.canvas.height = Math.round(winH * dpr);
        this.canvas.style.width = `${winW}px`;
        this.canvas.style.height = `${winH}px`;

        if (this.ctx) {
          this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          this.ctx.imageSmoothingEnabled = false;
        }
      } else {
        this.width = GAME_WIDTH;
        this.height = GAME_HEIGHT;
        this.canvas.width = GAME_WIDTH;
        this.canvas.height = GAME_HEIGHT;
        this.canvas.style.width = '';
        this.canvas.style.height = '';
        if (this.ctx) {
          this.ctx.setTransform(1, 0, 0, 1, 0, 0);
          this.ctx.imageSmoothingEnabled = false;
        }
      }
    }

    init(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      this.activeCanvasId = canvasId;
      this.ctx = this.canvas.getContext('2d');
      this.updateDimensions();

      this.bindInputs();
      this.resetGame();

      if (this.animId) cancelAnimationFrame(this.animId);
      this.loop();
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
      this.boardTimer = 0;
      this.flyingTimer = 0;
      this.changeDirectionTimer = 0;
      this.rushTimer = 0;
      this.enemyTimer = 0;
      this.enemyStoped = false;
      this.enemyX = 0;
      this.enemyY = 0;
      this.boardBrokenTimer = 0;
      this.animationTimer = 1;
      this.naughtySurfer.visible = false;
      this.isTouchSteering = false;

      this.audio.pauseMusic();
      this.updateHUD();
      this.updateCardUI();
      this.updateControlButtonsUI();
    }

    startSurfing() {
      if (this.finished) {
        this.resetGame();
        return;
      }
      this.audio.playMusic();

      this.started = true;
      this.paused = false;
      this.speed = this.initialSpeed;
      this.surferAction = 3;
      this.makeStarterObjects();
      this.updateControlButtonsUI();
    }

    setSurferCharacter(idx) {
      this.surfer = (idx + 8) % 8;
      this.saveScores();
      this.updateCardUI();
      this.updateControlButtonsUI();
    }

    updateControlButtonsUI() {
      const actionsContainer = document.getElementById('surfInGameActions');
      const leftBtn = document.getElementById('btnMobileSteerLeft');
      const rightBtn = document.getElementById('btnMobileSteerRight');
      const brakeBtn = document.getElementById('btnMobileBrake');
      const boostBtn = document.getElementById('btnMobileBoost');

      if (leftBtn) leftBtn.style.display = 'none';
      if (rightBtn) rightBtn.style.display = 'none';
      if (brakeBtn) brakeBtn.style.display = 'none';

      if (!this.started || this.finished) {
        if (actionsContainer) actionsContainer.classList.add('start-mode');
        if (boostBtn) {
          boostBtn.classList.add('btn-start-mode');
          boostBtn.innerHTML = '<span style="font-size: 16px; font-weight: 900;">▶ INIZIA</span>';
          boostBtn.style.display = 'flex';
          boostBtn.style.opacity = '1';
        }
      } else {
        if (actionsContainer) actionsContainer.classList.remove('start-mode');
        if (boostBtn) {
          boostBtn.classList.remove('btn-start-mode');
          boostBtn.innerHTML = '<span style="font-size: 30px; line-height: 1;">⚡</span>';
          boostBtn.style.display = 'flex';
          if (this.power > 0) {
            boostBtn.style.opacity = '1';
            boostBtn.style.filter = 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.75))';
          } else {
            boostBtn.style.opacity = '0.45';
            boostBtn.style.filter = 'none';
          }
        }
      }
    }

    triggerBoost() {
      this.audio.init();
      if (this.paused || !this.started) {
        this.startSurfing();
        return;
      }
      if (!this.rushTimer && this.power > 0) {
        this.rushTimer = 1;
        this.power--;
        this.speed = this.initialSpeed * 2.2;
        if (!this.surferAction) this.surferAction = 3;
        this.audio.playBoost();
      }
    }

    steerLeft() {
      if (this.paused && this.started && !this.finished) {
        this.paused = false;
        this.speed = this.initialSpeed;
      }
      this.surferAction = this.surferAction === 2 ? 1 : 2;
    }

    steerRight() {
      if (this.paused && this.started && !this.finished) {
        this.paused = false;
        this.speed = this.initialSpeed;
      }
      this.surferAction = this.surferAction === 4 ? 5 : 4;
    }

    stopPlayer() {
      if (this.rushTimer) return;
      this.paused = true;
      this.speed = 0;
      this.surferAction = 0;
      this.rushTimer = 0;
    }

    // --------------------------------------------------------------------------
    // CREAZIONE OSTACOLI
    // --------------------------------------------------------------------------
    randomX() { return Math.random() * this.width + this.offset; }
    randomY() { return this.distance + this.height * (1 + Math.random()); }

    makeSmallObject(x, y, idx) {
      return { type: 0, index: idx !== undefined ? idx : Math.floor(Math.random() * 8), x, y, stage: 0, maxStage: 0, once: false };
    }
    makeBigObject(x, y, idx) {
      const index = idx !== undefined ? idx : Math.floor(Math.random() * 25);
      return { type: 1, index, x, y, stage: 0, maxStage: 0, once: false };
    }
    makeSlowdownObject(x, y) {
      return { type: 2, index: Math.floor(Math.random() * 9), x, y, stage: 0, maxStage: 2, once: false };
    }
    makeRippleObject(x, y) {
      return { type: 3, index: 0, x, y, stage: 0, maxStage: 2, once: false };
    }
    makeAmbientObject(x, y) {
      return { type: 4, index: Math.floor(Math.random() * 4), x, y, stage: 0, maxStage: 5, once: true };
    }
    makeSandBarObject(x, y) {
      return { type: 5, index: Math.floor(Math.random() * 4), x, y, stage: 0, maxStage: 0, once: false };
    }
    makeIslandObject(x, y) {
      return { type: 6, index: 0, x, y, stage: 0, maxStage: 0, once: false };
    }
    makeInteractObject(x, y, idx) {
      const index = idx !== undefined ? idx : Math.floor(Math.random() * 6);
      return { type: 7, index: index === 5 ? 6 : index, x, y, stage: 0, maxStage: 3, once: false };
    }
    makeEffectObject(x, y, idx) {
      return { type: 8, index: idx, x, y, stage: 0, maxStage: 2, once: false };
    }
    makeDockObject(x, y, idx) {
      this.objects.push({ type: 9, index: idx, x, y, stage: 0, maxStage: 0, once: false });
      if (idx < 7 && Math.random() > 0.5) {
        this.objects.push(this.makeSmallObject(x + 13 + Math.random() * 6, y + Math.random() * 10, 8 + Math.floor(Math.random() * 12)));
      }
    }
    makeDockOnTop(x, y, hasTop) {
      if (hasTop || Math.random() > 0.8) this.makeDockObject(x, y - 64, 4);
    }
    makeDocksObject(x, y, hasTop) {
      y += 64;
      if (Math.random() > 0.7) {
        const it = Math.random();
        this.makeDockObject(x, y, it > 0.5 ? 3 : 7);
        if (hasTop || it > 0.5) this.makeDockOnTop(x, y, hasTop);
      } else {
        let left = x;
        this.makeDockObject(left, y, 0);
        this.makeDockOnTop(left, y, hasTop);
        const count = Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          left += 64;
          const it = Math.random();
          this.makeDockObject(left, y, it > 0.75 ? 1 : it > 0.5 ? 7 : it > 0.25 ? 8 : 9);
          if (!hasTop && it > 0.75) this.makeDockOnTop(left, y, false);
        }
        left += 64;
        this.makeDockObject(left, y, 2);
        if (!hasTop) this.makeDockOnTop(left, y, false);
      }
    }

    makeStarterObjects() {
      const centerX = this.width / 2.0;
      const centerY = this.height / 2.0 + 64;

      this.objects.push(this.makeInteractObject(centerX - 64 - 20, centerY, 3)); // Heart
      this.objects.push(this.makeInteractObject(centerX, centerY, 2));            // Boost

      let x = centerX - 64 * 6;
      let y = centerY + 128;

      for (let i = 0; i < 10; i++) this.objects.push(this.makeSlowdownObject(x + Math.random() * 450 - 250, y + Math.random() * 300 - 200));
      for (let i = 0; i < 5; i++) this.objects.push(this.makeBigObject(x + Math.random() * 450 - 250, y + Math.random() * 300 - 200));
      for (let i = 0; i < 3; i++) this.objects.push(this.makeSmallObject(x + Math.random() * 450 - 250, y + Math.random() * 300 - 200));

      this.makeDockOnTop(x, y, true);
      this.makeDockObject(x, y, 0);
      x += 64; this.makeDockObject(x, y, 1);
      x += 64; this.makeDockObject(x, y, 8);
      x += 64; this.makeDockObject(x, y, 2);

      x = centerX + 96;
      for (let i = 0; i < 10; i++) this.objects.push(this.makeSlowdownObject(x + Math.random() * 450, y + Math.random() * 300 - 200));
      for (let i = 0; i < 5; i++) this.objects.push(this.makeBigObject(x + Math.random() * 450, y + Math.random() * 300 - 200));
      for (let i = 0; i < 3; i++) this.objects.push(this.makeSmallObject(x + Math.random() * 450, y + Math.random() * 300 - 200));

      this.makeDockObject(x, y, 0);
      x += 64; this.makeDockObject(x, y, 9);
      x += 64; this.makeDockObject(x, y, 1);
      x += 64; this.makeDockObject(x, y, 2);
      this.makeDockOnTop(x, y, true);
    }

    generateObjects() {
      if (this.paused) return;
      const dis = Math.floor(this.distance);
      const isFar = dis > 10000;
      let chanceModify = Math.floor(this.distance / 10000) * 0.03;
      if (chanceModify > 0.16) chanceModify = 0.16;

      if (dis % 73 <= this.speed && Math.random() > (0.45 - chanceModify)) this.objects.push(this.makeSmallObject(this.randomX(), this.randomY()));
      if (dis % 44 <= this.speed && Math.random() > (0.65 - chanceModify)) this.objects.push(this.makeSlowdownObject(this.randomX(), this.randomY()));
      if (dis % 133 <= this.speed && Math.random() > (0.93 - chanceModify)) this.objects.push(this.makeAmbientObject(this.randomX(), this.randomY()));
      if (dis % 633 <= this.speed && Math.random() > (0.5 - chanceModify)) this.makeDocksObject(this.randomX(), this.randomY(), false);

      if (isFar && dis % (this.height * 3) <= this.speed && Math.random() > 0.9) {
        const x = this.randomX();
        const y = this.randomY();
        this.objects.push(this.makeIslandObject(x, y));
        this.objects.push(this.makeInteractObject(x + 620, y + 94, 0));
        this.objects.push(this.makeEffectObject(x + 800, y + 140, 5));
      }

      if (dis % 175 <= this.speed && Math.random() > 0.7) {
        const x = this.randomX();
        const y = this.randomY();
        this.objects.push(this.makeRippleObject(x - 16, y - 18));
        this.objects.push(this.makeInteractObject(x, y));
      }

      if (dis % 77 <= this.speed && Math.random() > (0.36 - chanceModify)) {
        const x = this.randomX();
        const y = this.randomY();
        this.objects.push(this.makeRippleObject(x - 16, y - 18));
        this.objects.push(this.makeBigObject(x, y));
      }

      if (dis % 433 <= this.speed && Math.random() > (0.7 - chanceModify)) {
        const x = this.randomX();
        const y = this.randomY();
        this.objects.push(this.makeSandBarObject(x, y));
        if (Math.random() > 0.7) this.makeDocksObject(x + Math.random() * 198, y + 128, true);
      }

      // KRAKEN SPAWN: dopo 200 metri (2000px)
      if (dis > 2000 && this.enemyTimer === 0 && Math.random() < 0.003) {
        this.enemyTimer = 1;
        this.enemyX = this.offset + (this.width / 2.0) - 64;
        this.enemyY = this.distance - 100;
        this.audio.playKraken();
      }
    }

    // --------------------------------------------------------------------------
    // FISICA & COLLISIONI
    // --------------------------------------------------------------------------
    kickDog() {
      if (!this.hasDog) return;
      this.hasDog = false;
      const px = this.width / 2.0;
      const py = this.height * SURFER_TOP;
      const x = px + this.offset - 32;
      const y = py + this.distance - 32;
      this.objects.push(this.makeRippleObject(x - 16, y - 25));
      this.objects.push(this.makeInteractObject(x, y, 7));
    }

    hitPlayer(collidingObj) {
      if (this.isInvincible()) return;
      if (this.hasDog) {
        this.kickDog();
        this.invincibleTimer = 180;
        this.damageFlashTimer = 14;
        this.audio.playHit();
        return;
      }

      this.speed = 0;
      this.paused = true;
      if (--this.heart < 0) this.heart = 0;
      this.surferAction = 6;
      this.damageFlashTimer = 14;
      this.audio.playHit();
      this.invincibleTimer = 220; // Immunità estesa per dare tutto il tempo di disimpegnarsi

      // Rimuove l'ostacolo impattato per impedire blocchi/incastri ripetuti
      if (collidingObj) {
        collidingObj.y = -99999;
      }

      if (this.heart < 1) {
        this.finished = true;
        this.animationTimer = 1;
        const isNew = this.getScore() > this.highScore && this.getScore() > 0;
        this.saveScores();
        this.showGameOverModal(isNew);
      } else {
        this.fallTimer = 1;
      }
    }

    showGameOverModal(isNewRecord = false) {
      const modal = document.getElementById('surfGameOverModal');
      const finalScore = document.getElementById('surfFinalScore');
      const finalDist = document.getElementById('surfFinalDist');
      const finalBarrel = document.getElementById('surfFinalBarrel');
      const recordBadge = document.getElementById('surfNewRecordBadge');

      const curScore = this.getScore();
      const curDist = Math.floor(this.distance / 10.0);
      const isNew = isNewRecord || (curScore >= this.highScore && curScore > 0);

      if (finalScore) finalScore.textContent = curScore.toLocaleString();
      if (finalDist) finalDist.textContent = `${curDist}m`;
      if (finalBarrel) finalBarrel.textContent = `🪙 x${this.coinCount} · ⚡ x${this.power}`;
      if (recordBadge) {
        recordBadge.style.display = isNew ? 'inline-block' : 'none';
        if (isNew) recordBadge.textContent = '🏆 NUOVO RECORD!';
      }

      if (modal) modal.classList.add('active');

      // Salva automaticamente il punteggio nella Classifica Top 10 dei record singoli
      if (window.recordSurfScoreToLeaderboard) {
        window.recordSurfScoreToLeaderboard(curScore, curDist, this.surfer);
      }
    }

    calcOffset() {
      // Touch following analog steering
      if (this.isTouchSteering && !this.flyingTimer) {
        const baseX = this.touchStartX || (this.width / 2.0);
        const dx = this.touchX - baseX;

        // Se il surfer era bloccato o in caduta, muovere l'analogico lo sblocca all'istante
        if (Math.abs(dx) > 10 && (this.fallTimer || this.paused)) {
          this.fallTimer = 0;
          this.paused = false;
          this.speed = this.initialSpeed;
          if (!this.invincibleTimer) this.invincibleTimer = 180;
        }

        if (dx < -60) {
          this.surferAction = 1; // Hard left
        } else if (dx < -16) {
          this.surferAction = 2; // Gentle left
        } else if (dx > 60) {
          this.surferAction = 5; // Hard right
        } else if (dx > 16) {
          this.surferAction = 4; // Gentle right
        } else {
          this.surferAction = 3; // Straight
        }

        // Applica forza di disimpegno laterale
        if (this.paused && Math.abs(dx) > 10) {
          this.offset += (dx < 0 ? -3 : 3);
        }
      }

      if (this.paused) return;
      this.distance += this.speed;

      let ratio = 0;
      switch (this.surferAction) {
        case 1: ratio = -0.6; break;
        case 2: ratio = -0.2; break;
        case 4: ratio = 0.2; break;
        case 5: ratio = 0.6; break;
      }
      this.offset += ratio * this.speed;

      if (this.rushTimer) {
        if (this.rushTimer >= 600) {
          this.rushTimer = 0;
          this.speed = this.initialSpeed;
        } else {
          this.rushTimer++;
        }
      }
      if (this.speed < this.initialSpeed) {
        this.speed *= 1.01;
      }
    }

    update() {
      if (this.animationTimer && this.animationTimer < ANIMATION_TIMER_MAX_VALUE) {
        this.animationTimer++;
      }
      this.boardTimer = (this.boardTimer + 1) % 120;

      if (this.started) {
        if (this.changeDirectionTimer > 0) this.changeDirectionTimer--;
        if (!this.finished) {
          this.calcOffset();

          // Ripresa automatica fluida dopo la caduta
          if (this.fallTimer) {
            this.fallTimer++;
            if (this.fallTimer > 65) {
              this.fallTimer = 0;
              this.paused = false;
              this.speed = this.initialSpeed;
              this.surferAction = 3;
              this.invincibleTimer = 180;
            }
          }

          if (this.invincibleTimer) {
            this.invincibleTimer++;
            if (this.invincibleTimer > 180) this.invincibleTimer = 0;
          }

          if (this.flyingTimer > 0) this.flyingTimer--;
        }
      }

      if (this.started && !this.finished) {
        this.generateObjects();
      }
    }

    // --------------------------------------------------------------------------
    // RENDERING
    // --------------------------------------------------------------------------
    draw() {
      const ctx = this.ctx;
      if (!ctx) return;

      const w = this.width;
      const h = this.height;

      // 1. Sfondo mare a tutto schermo
      const center = w / 2.0;
      const grad = ctx.createLinearGradient(center, 0, center, h);
      grad.addColorStop(0, '#38C2EE');
      grad.addColorStop(1, '#2EC3D0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // 2. Onde animate piastrellate a modulo continuo
      const bgImg = this.images.background;
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        const offX = ((Math.floor(this.offset) % 256) + 256) % 256;
        const offY = ((Math.floor(this.distance) % 256) + 256) % 256;
        for (let x = -offX - 256; x < w + 256; x += 256) {
          for (let y = -offY - 256; y < h + 256; y += 256) {
            ctx.drawImage(bgImg, x, y, 256, 256);
          }
        }
      }

      // 3. Entità di gioco
      if (this.started) {
        this.drawObjects(ctx);
        if (this.enemyTimer) this.drawEnemy(ctx);
        this.drawSurfer(ctx);
        this.drawNaughtySurfer(ctx);

        // 4. Controllo Analogico Virtuale Visivo sul Canvas
        this.drawAnalogJoystick(ctx);

        // 5. Flash visivo danno / perdita cuore
        if (this.damageFlashTimer > 0) {
          ctx.save();
          ctx.fillStyle = `rgba(239, 68, 68, ${this.damageFlashTimer / 30})`;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
          this.damageFlashTimer--;
        }

        if (this.finished) this.drawFinishViewer(ctx);
      } else {
        this.drawStarterViewer(ctx);
      }

      // 6. Status Bar in alto
      this.drawStatusBar(ctx);
    }

    getTextureForType(type) {
      switch (type) {
        case 0: return this.images.objectsSmall;
        case 1: return this.images.objectsBig;
        case 2: return this.images.slowdown;
        case 3: return this.images.ripple;
        case 4: return this.images.ambient;
        case 5: return this.images.sandbar;
        case 6: return this.images.island;
        case 7: return this.images.interact;
        case 8: return this.images.effects;
        case 9: return this.images.docks;
        default: return this.images.objectsBig;
      }
    }

    drawObjects(ctx) {
      const playerX = this.width / 2.0;
      const playerY = this.height * SURFER_TOP + 32;

      for (let i = this.objects.length - 1; i >= 0; i--) {
        const obj = this.objects[i];
        const type = obj.type;
        const boxX = OBJECT_HITBOXES[type][0];
        const boxY = OBJECT_HITBOXES[type][1];

        if (obj.y + boxY < this.distance - 100) {
          this.objects.splice(i, 1);
          continue;
        }

        const maxX = boxX / 2;
        const maxY = boxY / 2;
        const tx = obj.x - this.offset;
        const ty = obj.y - this.distance;

        let x = maxX - 4;
        let y = maxY * 0.7;
        const cx = tx + maxX;
        const cy = ty + maxY;

        switch (type) {
          case 5: y = 20; break;
          case 7: if (obj.index === 1) { x = 70; y = 70; } break;
          case 9: x = 38; y = 38; break;
          case 6: y = 125; break;
        }

        const texture = this.getTextureForType(type);
        if (texture && texture.complete && texture.naturalWidth > 0) {
          if (!obj.once || obj.stage > 80) {
            const sx = boxX * obj.index;
            const sy = boxY * Math.floor((obj.stage - (obj.once ? 80 : 0)) / 14);
            ctx.drawImage(texture, sx, sy, boxX, boxY, Math.round(tx), Math.round(ty), boxX, boxY);
          }
        }

        if (obj.maxStage) {
          if (obj.once) {
            if (obj.stage <= obj.maxStage * 14 + 80) obj.stage++;
          } else if (++obj.stage > obj.maxStage * 14) {
            obj.stage = 0;
          }
        }

        if (this.finished) continue;

        if (!this.flyingTimer && playerX > cx - x && playerX < cx + x && playerY > cy - y && playerY < cy + y) {
          switch (type) {
            case 7: // INTERACT
              switch (obj.index) {
                case 0: // Rampa
                  this.flyingTimer = 300;
                  if (this.enemyTimer) this.enemyStoped = true;
                  this.audio.playJump();
                  break;
                case 1: // Kraken
                  if (!this.isInvincible()) {
                    this.enemyTimer = 1;
                    this.enemyX = obj.x;
                    this.enemyY = obj.y;
                    this.audio.playKraken();
                  }
                  break;
                case 2: // Boost
                  if (this.power < 5) this.power++;
                  this.audio.playCollect();
                  break;
                case 3: // Cuore
                  if (this.heart < 5) this.heart++;
                  this.audio.playCollect();
                  break;
                case 4: // Moneta
                  this.coinCount++;
                  this.audio.playCoin();
                  break;
                case 6: // Cane
                  this.hasDog = true;
                  this.audio.playDog();
                  break;
              }
              this.objects.splice(i, 1);
              continue;

            case 0: // Small object
              if (!this.isInvincible() && !this.changeDirectionTimer) {
                this.surferAction = 1 + Math.floor(Math.random() * 5);
                this.changeDirectionTimer = 40;
              }
              break;

            case 2: // Slowdown
              if (!this.isInvincible()) {
                this.speed = 1;
                this.rushTimer = 0;
              }
              break;

            case 3:
            case 4:
              break;

            default:
              this.hitPlayer(obj);
              this.objects.splice(i, 1);
              continue;
          }
        }
      }
    }

    drawEnemy(ctx) {
      if (this.boardBrokenTimer) {
        if (this.boardBrokenTimer < 59) this.boardBrokenTimer++;
      }
      if (++this.enemyTimer === 160) this.enemyTimer = 100;
      if (this.enemyTimer < 100) return;

      if (this.hasDog && this.enemyTimer === 105) {
        this.audio.playDog();
      }

      if (this.enemyY + 200 < this.distance) {
        this.enemyX = this.enemyY = this.enemyTimer = 0;
        this.enemyStoped = false;
        return;
      }

      const enemyImg = this.images.enemy;
      const playerX = (this.width - 64) / 2.0 + 32;
      const playerY = this.height * SURFER_TOP + 32;

      if (this.enemyStoped) {
        if (enemyImg && enemyImg.complete) {
          const sy = Math.floor(this.boardBrokenTimer / 10) * 128;
          ctx.drawImage(enemyImg, 128, sy, 128, 128, Math.round(this.enemyX - this.offset), Math.round(this.enemyY - this.distance), 128, 128);
        }
      } else {
        const tx = this.offset + playerX - 64;
        const ty = this.distance + playerY - 64;
        if (ty - this.enemyY > 6) this.enemyY += 4.3;
        this.enemyX += 2.0 * (this.enemyX > tx ? -1 : this.enemyX === tx ? 0 : 1);
        if (Math.abs(this.enemyX - tx) < 2.5) this.enemyX = tx;

        const nx = this.enemyX - this.offset + 64;
        const ny = this.enemyY - this.distance + 64;
        if (!this.isInvincible() && !this.flyingTimer && playerX > nx - 64 && playerX < nx + 64 && playerY > ny - 64 && playerY < ny + 64) {
          this.kickDog();
          this.paused = this.finished = this.enemyStoped = true;
          this.animationTimer = 1;
          this.heart = this.speed = 0;
          this.surferAction = 7;
          this.boardBrokenTimer = 1;
          this.audio.playKraken();
          const isNew = this.getScore() > this.highScore && this.getScore() > 0;
          this.saveScores();
          this.showGameOverModal(isNew);
          return;
        }
      }

      if (enemyImg && enemyImg.complete) {
        const sy = Math.floor((this.enemyTimer - 100) / 10) * 128;
        ctx.drawImage(enemyImg, 0, sy, 128, 128, Math.round(this.enemyX - this.offset), Math.round(this.enemyY - this.distance + 70), 128, 128);
      }
    }

    drawNaughtySurfer(ctx) {
      if (this.distance > 1000 && Math.random() > 0.9992) {
        if (!this.naughtySurfer.visible) {
          this.naughtySurfer.y = this.distance + 5;
          this.naughtySurfer.x = this.width * Math.random() + this.offset;
          this.naughtySurfer.type = Math.floor(Math.random() * 9);
          this.naughtySurfer.action = Math.floor(Math.random() * 2);
          this.naughtySurfer.visible = true;
        }
      }
      if (!this.naughtySurfer.visible) return;

      const dis = this.naughtySurfer.y - this.distance;
      if (dis < 0 || dis > this.height) {
        this.naughtySurfer.visible = false;
        return;
      }

      const sx = 64 * (this.naughtySurfer.type * 3 + this.naughtySurfer.action);
      if (this.naughtySurfer.action !== 2) {
        if (Math.random() > 0.97) this.naughtySurfer.action = this.naughtySurfer.action === 0 ? 1 : 0;
        this.naughtySurfer.y += 6;
        this.naughtySurfer.x += this.naughtySurfer.action === 0 ? -6 : 6;
      }

      const img = this.images.naughtySurfer;
      if (img && img.complete) {
        ctx.drawImage(img, sx, 65, 64, 64, Math.round(this.naughtySurfer.x - this.offset), Math.round(dis), 64, 64);
        ctx.drawImage(img, sx, 0, 64, 64, Math.round(this.naughtySurfer.x - this.offset), Math.round(dis), 64, 64);
      }

      const playerX = this.width / 2.0;
      const playerY = this.height * SURFER_TOP + 32;
      const nx = this.naughtySurfer.x - this.offset + 32;
      const ny = this.naughtySurfer.y - this.distance + 50;
      if (!this.isInvincible() && !this.flyingTimer && playerX > nx - 32 && playerX < nx + 32 && playerY > ny - 50 && playerY < ny + 20) {
        this.naughtySurfer.action = 2;
        this.hitPlayer();
      }
    }

    drawSurferOrigin(ctx, type, action, alpha, x, y) {
      const boardImg = this.images.board;
      const playerImg = this.images.player;

      const sx = action * 64.0;
      const boardSy = Math.floor((this.boardTimer % 30) / 10) * 64;
      const playerSy = type * 64.0;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (boardImg && boardImg.complete) {
        ctx.drawImage(boardImg, sx, boardSy, 64, 64, Math.round(x), Math.round(y), 64, 64);
      }
      if (playerImg && playerImg.complete) {
        ctx.drawImage(playerImg, sx, playerSy, 64, 64, Math.round(x), Math.round(y), 64, 64);
      }
      ctx.restore();
    }

    drawSurfer(ctx) {
      const left = (this.width - 64) / 2.0;
      const top = this.height * SURFER_TOP;

      const alpha = (this.invincibleTimer && !this.surferAction) || Math.floor(this.invincibleTimer / 15) % 2 === 0 ? 1.0 : 0.45;
      const action = this.flyingTimer ? 9 + Math.floor((this.flyingTimer / 8) % 4) : this.surferAction;

      this.drawSurferOrigin(ctx, this.surfer, action, alpha, left, top);

      if (this.hasDog && this.images.player && this.images.player.complete) {
        ctx.drawImage(this.images.player, action * 64.0, 512, 64, 64, Math.round(left), Math.round(top), 64, 64);
      }

      // Ombra del salto
      if (this.flyingTimer) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${this.flyingTimer > 50 ? 0.35 : this.flyingTimer / 150})`;
        ctx.beginPath();
        ctx.ellipse(left + 32, top + (this.flyingTimer > 50 ? 80.0 : 70.0 + this.flyingTimer / 5.0), 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    drawStarterViewer(ctx) {
      const center = this.width / 2.0;
      const oLeft = (this.width - 64) / 2.0;
      const top = this.height * SURFER_TOP;

      // Scorrimento orizzontale degli 8 Surfer
      let left = oLeft - this.surfer * 84;
      for (let i = 0; i < 8; i++, left += 84) {
        const act = this.surfer === i ? 1 + (this.boardTimer >= 60 ? 4 - Math.floor((this.boardTimer - 60) / 12.0) : Math.floor(this.boardTimer / 12.0)) : 3;
        const sAlpha = this.surfer === i ? 1.0 : 0.45;
        this.drawSurferOrigin(ctx, i, act, sAlpha, left, top);
      }

      ctx.save();
      ctx.textAlign = 'center';

      // Titolo SALENTO SURF
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 36px "FiraCode", "Plus Jakarta Sans", monospace, sans-serif';
      ctx.fillText("SALENTO SURF", center, top - 70);

      // Frecce touch ben visibili ed evidenziate per smartphone
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 2;

      // Freccia Sinistra (Cerchio bianco rialzato)
      if (this.surfer > 0) {
        ctx.beginPath();
        ctx.arc(oLeft - 26, top + 32, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('◄', oLeft - 26, top + 40);
      }

      // Freccia Destra (Cerchio bianco rialzato)
      if (this.surfer < 7) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(oLeft + 90, top + 32, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('►', oLeft + 90, top + 40);
      }

      // Istruzioni touch chiare
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 14px "FiraCode", "Plus Jakarta Sans", monospace, sans-serif';
      ctx.fillText("◄ TOCCA FRECCE PER SCEGLIERE ►", center, top + 95);

      // Bottone Play Centrale Pop
      const btnW = Math.min(290, this.width - 40);
      const btnH = 50;
      const btnX = center - btnW / 2;
      const btnY = top + 125;

      // Shadow del bottone
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.drawRoundedRect(ctx, btnX, btnY + 4, btnW, btnH, 25);
      ctx.fill();

      // Corpo bottone
      ctx.fillStyle = '#FF385C';
      this.drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 25);
      ctx.fill();

      // Bordo luminoso
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 17px "FiraCode", "Plus Jakarta Sans", monospace, sans-serif';
      ctx.fillText("▶ TOCCA PER PARTIRE!", center, btnY + 31);

      // Hint tastiera sotto
      ctx.fillStyle = '#475569';
      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText("Oppure premi Spazio o Invio", center, btnY + btnH + 20);

      ctx.restore();
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
      } else {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
      }
    }

    drawFinishViewer(ctx) {
      const center = this.width / 2.0;
      const centerY = this.height / 2.0 - 50;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 42px "FiraCode", "Plus Jakarta Sans", monospace, sans-serif';
      ctx.fillText("GAME OVER!", center, centerY - 40);

      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText("Tocca ovunque per fare un'altra partita", center, centerY + 10);

      ctx.font = 'bold 24px "FiraCode", monospace, sans-serif';
      ctx.fillStyle = '#EA580C';
      ctx.fillText(`Punti: ${this.getScore().toLocaleString()}`, center, centerY + 55);

      ctx.restore();
    }

    drawAnalogJoystick(ctx) {
      if (!this.started || this.finished) return;

      if (this.isTouchSteering) {
        const baseX = this.touchStartX || (this.width / 2.0);
        const baseY = this.touchStartY || (this.height * 0.72);

        ctx.save();

        // 1. Cerchio base esterno
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(baseX, baseY, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. Linea asse orizzontale
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(baseX - 42, baseY);
        ctx.lineTo(baseX + 42, baseY);
        ctx.stroke();

        // 3. Frecce guida sinistra/destra
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('◄', baseX - 32, baseY + 5);
        ctx.fillText('►', baseX + 32, baseY + 5);

        // 4. Knob mobile sotto il pollice
        const dx = Math.max(-42, Math.min(42, this.touchX - baseX));
        const knobX = baseX + dx;
        const knobY = baseY;

        // Ombra knob
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.arc(knobX, knobY + 3, 23, 0, Math.PI * 2);
        ctx.fill();

        // Corpo knob luminoso
        const knobGrad = ctx.createRadialGradient(knobX - 5, knobY - 5, 2, knobX, knobY, 23);
        knobGrad.addColorStop(0, '#FFFFFF');
        knobGrad.addColorStop(1, '#CBD5E1');
        ctx.fillStyle = knobGrad;
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(knobX, knobY, 23, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0284C7';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('🏄', knobX, knobY + 4);

        ctx.restore();
      }
    }

    drawStatusBar(ctx) {
      const iface = this.images.interface;
      const center = this.width / 2.0;
      const isFullscreen = this.activeCanvasId === 'surfGameCanvas';
      const topY = isFullscreen ? 12 : 6;
      const barHeight = 46;
      const barWidth = isFullscreen ? Math.min(this.width - 116, 360) : 320;
      const barX = center - barWidth / 2;

      ctx.save();

      // Sfondo Status Bar Glassmorphic con bordi arrotondati
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      this.drawRoundedRect(ctx, barX, topY, barWidth, barHeight, 24);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const spriteY = topY + Math.round((barHeight - 24) / 2);

      // 1. Vite / Cuori originali a sinistra (sprite 24x24 da interface24.png)
      let hLeft = barX + 16;
      for (let i = 0; i < 3; i++) {
        const isFull = i < this.heart;
        if (iface && iface.complete && iface.naturalWidth > 0) {
          ctx.drawImage(iface, isFull ? 24 : 0, 0, 24, 24, hLeft, spriteY, 24, 24);
        } else {
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(isFull ? '❤️' : '🖤', hLeft + 12, topY + 31);
        }
        hLeft += 28;
      }

      // 2. Distanza (Centro)
      ctx.textAlign = 'center';
      ctx.font = 'bold 17px "FiraCode", monospace, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(`${Math.floor(this.distance / 10.0)} M`, center, topY + 31);

      // 3. Fulmini Boost originali a destra (sprite 24x24 da interface24.png)
      let pRight = barX + barWidth - 36;
      for (let i = 2; i >= 0; i--) {
        const isFull = i < this.power;
        if (iface && iface.complete && iface.naturalWidth > 0) {
          ctx.drawImage(iface, isFull ? 24 : 0, 24, 24, 24, pRight, spriteY, 24, 24);
        } else {
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(isFull ? '⚡' : '⚪', pRight + 12, topY + 31);
        }
        pRight -= 28;
      }

      // 4. Cane e Monete (se presenti)
      let extraX = center + 52;
      if (this.hasDog && iface && iface.complete && iface.naturalWidth > 0) {
        ctx.drawImage(iface, 24, 48, 24, 24, extraX, spriteY, 24, 24);
        extraX += 28;
      }
      if (this.coinCount > 0) {
        if (iface && iface.complete && iface.naturalWidth > 0) {
          ctx.drawImage(iface, 24, 72, 24, 24, extraX, spriteY, 24, 24);
          extraX += 26;
        }
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px "FiraCode", monospace, sans-serif';
        ctx.fillStyle = '#B45309';
        ctx.fillText(`x${this.coinCount}`, extraX, topY + 30);
      }

      ctx.restore();
    }

    // --------------------------------------------------------------------------
    // INPUT LISTENERS MOBILE & DESKTOP
    // --------------------------------------------------------------------------
    bindInputs() {
      if (this.inputsBound) return;
      this.inputsBound = true;

      let lastTapTime = 0;
      let startTouchX = 0;
      let startTouchY = 0;
      let hasSwipedInStart = false;

      const getCanvasPos = (e) => {
        const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : e);
        const rect = this.canvas ? this.canvas.getBoundingClientRect() : { left: 0, top: 0, width: this.width, height: this.height };
        const w = rect.width || this.width || 1;
        const h = rect.height || this.height || 1;
        const x = ((touch.clientX - rect.left) / w) * this.width;
        const y = ((touch.clientY - rect.top) / h) * this.height;
        return { x, y };
      };

      const handlePointerDown = (e) => {
        if (e.cancelable && e.type.startsWith('touch')) {
          e.preventDefault();
        }
        this.audio.unlockAudio();

        const { x, y } = getCanvasPos(e);
        startTouchX = x;
        startTouchY = y;
        hasSwipedInStart = false;

        // Se siamo nella schermata iniziale o finale
        if (!this.started || this.finished) {
          if (this.finished) {
            this.resetGame();
            this.startSurfing();
            return;
          }

          const top = this.height * SURFER_TOP;
          const oLeft = (this.width - 64) / 2.0;

          // 1. Tocco preciso su Freccia Sinistra
          const isLeftArrow = Math.hypot(x - (oLeft - 26), y - (top + 32)) <= 38 || (x >= oLeft - 72 && x <= oLeft - 6 && y >= top - 10 && y <= top + 74);
          if (isLeftArrow) {
            this.audio.playSelect();
            this.setSurferCharacter(this.surfer - 1);
            return;
          }

          // 2. Tocco preciso su Freccia Destra
          const isRightArrow = Math.hypot(x - (oLeft + 90), y - (top + 32)) <= 38 || (x >= oLeft + 70 && x <= oLeft + 136 && y >= top - 10 && y <= top + 74);
          if (isRightArrow) {
            this.audio.playSelect();
            this.setSurferCharacter(this.surfer + 1);
            return;
          }

          // 3. Tocco sulle anteprime laterali dei surfer nella fascia orizzontale
          if (y >= top - 30 && y <= top + 90) {
            if (x < oLeft - 10) {
              this.audio.playSelect();
              this.setSurferCharacter(this.surfer - 1);
              return;
            }
            if (x > oLeft + 74) {
              this.audio.playSelect();
              this.setSurferCharacter(this.surfer + 1);
              return;
            }
          }

          // 4. In qualsiasi altro punto (pulsante Play, centro o tocco schermo): AVVIA SUBITO IL GIOCO!
          this.startSurfing();
          return;
        }

        // Double tap detection per Boost su smartphone durante il gioco
        const now = Date.now();
        if (now - lastTapTime < 300 && this.started && !this.paused && !this.finished) {
          this.triggerBoost();
          lastTapTime = 0;
          return;
        }
        lastTapTime = now;

        // Se il surfer era fermo (idle), riparte
        if (this.paused && !this.fallTimer) {
          this.paused = false;
          this.speed = this.initialSpeed;
          this.surferAction = 3;
        }

        this.isTouchSteering = true;
        this.touchStartX = x;
        this.touchStartY = y;
        this.touchX = x;
        this.touchY = y;
      };

      const handlePointerMove = (e) => {
        const { x, y } = getCanvasPos(e);

        // Se siamo in start screen, consentiamo anche lo swipe orizzontale per sfogliare i surfer
        if (!this.started || this.finished) {
          if (!hasSwipedInStart) {
            const dx = x - startTouchX;
            if (dx > 45) {
              hasSwipedInStart = true;
              this.audio.playSelect();
              this.setSurferCharacter(this.surfer - 1);
            } else if (dx < -45) {
              hasSwipedInStart = true;
              this.audio.playSelect();
              this.setSurferCharacter(this.surfer + 1);
            }
          }
          return;
        }

        if (!this.isTouchSteering || !this.started || this.finished) return;
        if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
        this.touchX = x;
        this.touchY = y;
      };

      const handlePointerUp = (e) => {
        this.isTouchSteering = false;
        hasSwipedInStart = false;
      };

      window.addEventListener('touchstart', (e) => {
        if (e.target && (e.target.id === 'surfGameCanvas' || e.target.id === 'surfPreviewCanvas')) {
          handlePointerDown(e);
        }
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (this.isTouchSteering || !this.started) {
          handlePointerMove(e);
        }
      }, { passive: false });

      window.addEventListener('touchend', handlePointerUp, { passive: false });
      window.addEventListener('touchcancel', handlePointerUp, { passive: false });

      window.addEventListener('mousedown', (e) => {
        if (e.target && (e.target.id === 'surfGameCanvas' || e.target.id === 'surfPreviewCanvas')) {
          handlePointerDown(e);
        }
      });
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);

      window.addEventListener('resize', () => {
        if (this.activeCanvasId === 'surfGameCanvas') {
          this.updateDimensions();
        }
      });

      // Tastiera Desktop
      window.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyF'].includes(e.code)) {
          this.audio.init();

          if (!this.started || this.finished) {
            if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown' || e.code === 'KeyS') {
              this.startSurfing();
              return;
            }
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
              this.audio.playSelect();
              this.setSurferCharacter(this.surfer - 1);
              return;
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
              this.audio.playSelect();
              this.setSurferCharacter(this.surfer + 1);
              return;
            }
          }

          if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            this.steerLeft();
          } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            this.steerRight();
          } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            if (this.paused) { this.paused = false; this.speed = this.initialSpeed; }
            this.surferAction = 3;
          } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
            this.stopPlayer();
          } else if (e.code === 'Space' || e.code === 'KeyF') {
            this.triggerBoost();
          }
        }
      });
    }

    loop() {
      try {
        this.update();
        this.draw();
        this.updateHUD();
      } catch (err) {
        console.error('SalentoSurf loop error:', err);
      }
      this.animId = requestAnimationFrame(() => this.loop());
    }

    updateHUD() {
      const distEl = document.getElementById('surfLiveDist');
      const shellsEl = document.getElementById('surfLiveShells');

      if (distEl) distEl.textContent = `${Math.floor(this.distance / 10.0)}m`;
      if (shellsEl) shellsEl.textContent = `x${this.power}`;

      const boostBtn = document.getElementById('btnMobileBoost');
      if (boostBtn && this.started && !this.finished) {
        boostBtn.innerHTML = '<span style="font-size: 34px; line-height: 1; display: flex; align-items: center; justify-content: center;">⚡</span>';
        if (this.power > 0) {
          boostBtn.style.opacity = '1';
          boostBtn.style.filter = 'drop-shadow(0 0 12px rgba(250, 204, 21, 0.85))';
        } else {
          boostBtn.style.opacity = '0.4';
          boostBtn.style.filter = 'none';
        }
      }
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

  window.SalentoSurf = new SalentoSurfEngine();

})(window);
