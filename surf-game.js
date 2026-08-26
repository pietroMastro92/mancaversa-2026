/**
 * ==============================================================================
 * EDGE SURF GAME - SALENTO EDITION (AUTHENTIC MICROSOFT EDGE SURF ENGINE)
 * ==============================================================================
 * Porting 1:1 in JavaScript / HTML5 Canvas del videogioco open-source:
 * https://github.com/ShirasawaSama/edge-surf-game (Microsoft Edge "edge://surf")
 */

(function (window) {
  'use strict';

  const GAME_WIDTH = 480;
  const GAME_HEIGHT = 640;
  const SURFER_TOP_RATIO = 0.33;
  const ANIMATION_TIMER_MAX_VALUE = 40;

  // Hitboxes esatte da objects.c:
  // 0:SMALL, 1:BIG, 2:SLOWDOWN, 3:RIPPLE, 4:AMBIENT, 5:SANDBAR, 6:ISLAND, 7:INTERACT, 8:EFFECT, 9:DOCK
  const OBJECT_HITBOXES = [
    [32, 32],    // 0: SMALL_OBJECT (objects32.png)
    [64, 64],    // 1: BIG_OBJECT (objects64.png)
    [64, 64],    // 2: SLOWDOWN_OBJECT (slowdown64.png)
    [96, 96],    // 3: RIPPLE_OBJECT (ripple96.png)
    [64, 64],    // 4: AMBIENT_OBJECT (ambient64.png)
    [256, 128],  // 5: SAND_BAR_OBJECT (sandbar256.png)
    [1280, 512], // 6: ISLAND_OBJECT (island1280.png)
    [64, 64],    // 7: INTERACT_OBJECT (interact64.png)
    [128, 128],  // 8: EFFECT_OBJECT (effects128.png)
    [64, 64]     // 9: DOCK_OBJECT (docks64.png)
  ];

  const ASSET_SRC = {
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
  // WEB AUDIO SOUND EFFECTS
  // ----------------------------------------------------------------------------
  class EdgeSurfAudio {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      try {
        const s = localStorage.getItem('salento_edge_surf_muted');
        if (s !== null) this.isMuted = s === 'true';
      } catch (e) {}
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
      try { localStorage.setItem('salento_edge_surf_muted', this.isMuted); } catch (e) {}
      const btn = document.getElementById('btnSurfMute');
      if (btn) btn.textContent = this.isMuted ? '🔇 Muto' : '🔊 Audio';
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
      g.gain.setValueAtTime(0.25, t);
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
      osc.frequency.setValueAtTime(240, t);
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
      g.gain.setValueAtTime(0.2, t);
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
      g.gain.setValueAtTime(0.25, t);
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
      osc.frequency.linearRampToValueAtTime(55, t + 0.6);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    }
  }

  // ----------------------------------------------------------------------------
  // EDGE SURF ENGINE
  // ----------------------------------------------------------------------------
  class EdgeSurfEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = GAME_WIDTH;
      this.height = GAME_HEIGHT;

      this.images = {};
      this.imagesLoaded = false;
      this.waterPattern = null;
      this.audio = new EdgeSurfAudio();

      // Stato gioco da game.c
      this.started = false;
      this.paused = true;
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
      this.animationTimer = 0;

      this.objects = [];
      this.highScore = 0;
      this.bestDistance = 0;

      this.lastTime = 0;
      this.animId = null;

      // Touch drag
      this.isDragging = false;
      this.dragStartX = 0;
      this.lastTouchX = 0;

      this.loadHighScore();
      this.preloadImages();
    }

    preloadImages() {
      let loaded = 0;
      const keys = Object.keys(ASSET_SRC);
      const total = keys.length;

      keys.forEach((key) => {
        const img = new Image();
        img.src = ASSET_SRC[key];
        img.onload = () => {
          loaded++;
          if (loaded >= total) {
            this.imagesLoaded = true;
            this.createWaterPattern();
            this.updateCardUI();
          }
        };
        img.onerror = () => {
          loaded++;
          if (loaded >= total) {
            this.imagesLoaded = true;
            this.updateCardUI();
          }
        };
        this.images[key] = img;
      });
    }

    createWaterPattern() {
      if (this.ctx && this.images.background && this.images.background.complete) {
        this.waterPattern = this.ctx.createPattern(this.images.background, 'repeat');
      }
    }

    loadHighScore() {
      try {
        const saved = localStorage.getItem('salento_edge_surf_highscore_v2');
        if (saved) {
          const d = JSON.parse(saved);
          this.highScore = d.highScore || 0;
          this.bestDistance = d.bestDistance || 0;
          this.surfer = d.surfer || 0;
        }
      } catch (e) {}
    }

    saveHighScore() {
      try {
        const curScore = this.getScore();
        if (curScore > this.highScore) this.highScore = curScore;
        const curDist = Math.floor(this.distance / 10.0);
        if (curDist > this.bestDistance) this.bestDistance = curDist;

        localStorage.setItem('salento_edge_surf_highscore_v2', JSON.stringify({
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

      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;

      this.createWaterPattern();
      this.bindInputs();
      this.resetGame();

      this.lastTime = performance.now();
      if (this.animId) cancelAnimationFrame(this.animId);
      this.loop(this.lastTime);
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
      this.changeDirectionTimer = 0;
      this.rushTimer = 0;
      this.enemyTimer = 0;
      this.enemyStoped = false;
      this.enemyX = 0;
      this.enemyY = 0;
      this.boardBrokenTimer = 0;
      this.animationTimer = 1;

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
      this.surferAction = 3; // dritto
      this.makeStarterObjects();
    }

    setSurferCharacter(idx) {
      this.surfer = (idx + 8) % 8;
      this.saveHighScore();
      this.updateCardUI();
    }

    triggerBoost() {
      this.audio.init();
      this.audio.resume();

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
    // CREAZIONE OSTACOLI (objects.c exact logic)
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

      // KRAKEN SPAWN: dopo 300 metri (3000px) o evento casuale
      if (dis > 3000 && this.enemyTimer === 0 && Math.random() < 0.002) {
        this.enemyTimer = 1;
        this.enemyX = this.offset + (this.width / 2.0) - 64;
        this.enemyY = this.distance - 100;
        this.audio.playKraken();
      }
    }

    // --------------------------------------------------------------------------
    // COLLISIONI E FISICA
    // --------------------------------------------------------------------------
    isInvincible() {
      return this.fallTimer > 0 || this.invincibleTimer > 0;
    }

    kickDog() {
      if (!this.hasDog) return;
      this.hasDog = false;
      const px = this.width / 2.0;
      const py = this.height * SURFER_TOP_RATIO;
      const x = px + this.offset - 32;
      const y = py + this.distance - 32;
      this.objects.push(this.makeRippleObject(x - 16, y - 25));
      this.objects.push(this.makeInteractObject(x, y, 7));
    }

    hitPlayer() {
      if (this.isInvincible()) return;
      if (this.hasDog) {
        this.kickDog();
        this.invincibleTimer = 170;
        this.audio.playHit();
        return;
      }

      this.speed = 0;
      this.paused = true;
      if (--this.heart < 0) this.heart = 0;
      this.surferAction = 6;
      this.audio.playHit();

      if (this.heart < 1) {
        this.finished = true;
        this.animationTimer = 1;
        this.saveHighScore();
        this.showGameOverCard();
      } else {
        this.fallTimer = 1;
      }
    }

    showGameOverCard() {
      const modal = document.getElementById('surfGameOverModal');
      const finalScore = document.getElementById('surfFinalScore');
      const finalDist = document.getElementById('surfFinalDist');
      const finalBarrel = document.getElementById('surfFinalBarrel');
      const recordBadge = document.getElementById('surfNewRecordBadge');

      const isNew = this.getScore() >= this.highScore;

      if (finalScore) finalScore.textContent = this.getScore().toLocaleString();
      if (finalDist) finalDist.textContent = `${Math.floor(this.distance / 10.0)}m`;
      if (finalBarrel) finalBarrel.textContent = `🪙 x${this.coinCount} · ⚡ x${this.power}`;
      if (recordBadge) recordBadge.style.display = isNew ? 'inline-block' : 'none';

      if (modal) modal.classList.add('active');
    }

    calcOffset() {
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

          if (this.fallTimer) {
            this.fallTimer++;
            if (this.fallTimer > 180) {
              this.fallTimer = 0;
              this.surferAction = 3;
              this.paused = false;
              this.speed = this.initialSpeed;
              this.invincibleTimer = 1;
            }
          }

          if (this.invincibleTimer && this.surferAction !== 0) {
            this.invincibleTimer++;
            if (this.invincibleTimer > 250) this.invincibleTimer = 0;
          }

          if (this.flyingTimer > 0) this.flyingTimer--;
        }
      }

      if (this.started && !this.finished) {
        this.generateObjects();
      }
    }

    // --------------------------------------------------------------------------
    // RENDER GRAFICA ORIGINALE DI EDGE SURF
    // --------------------------------------------------------------------------
    draw() {
      const ctx = this.ctx;
      if (!ctx) return;

      const w = this.width;
      const h = this.height;

      // 1. PULIZIA TOTALE DELLO SFONDO: cancella completamente per evitare qualsiasi scia!
      ctx.fillStyle = '#38C2EE';
      ctx.fillRect(0, 0, w, h);

      // 2. Disegna l'oceano piastrellato
      const bgImg = this.images.background;
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        const startX = -((Math.floor(this.offset) % 256 + 256) % 256);
        const startY = -((Math.floor(this.distance) % 256 + 256) % 256);
        for (let x = startX - 256; x < w + 256; x += 256) {
          for (let y = startY - 256; y < h + 256; y += 256) {
            ctx.drawImage(bgImg, x, y);
          }
        }
      }

      if (this.started) {
        this.drawObjects(ctx);
        if (this.enemyTimer) this.drawEnemy(ctx);
        this.drawSurfer(ctx);
        if (this.finished) this.drawFinishViewer(ctx);
      } else {
        this.drawStarterViewer(ctx);
      }

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
      const playerY = this.height * SURFER_TOP_RATIO + 32;

      for (let i = this.objects.length - 1; i >= 0; i--) {
        const obj = this.objects[i];
        const type = obj.type;
        const boxX = OBJECT_HITBOXES[type][0];
        const boxY = OBJECT_HITBOXES[type][1];

        // Se l'oggetto è superato oltre lo schermo in alto
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

        // Render dello sprite
        const texture = this.getTextureForType(type);
        if (texture && texture.complete && texture.naturalWidth > 0) {
          if (!obj.once || obj.stage > 80) {
            const sx = boxX * obj.index;
            const sy = boxY * Math.floor((obj.stage - (obj.once ? 80 : 0)) / 14);
            ctx.drawImage(texture, sx, sy, boxX, boxY, Math.round(tx), Math.round(ty), boxX, boxY);
          }
        }

        // Avanzamento stage animazione
        if (obj.maxStage) {
          if (obj.once) {
            if (obj.stage <= obj.maxStage * 14 + 80) obj.stage++;
          } else if (++obj.stage > obj.maxStage * 14) {
            obj.stage = 0;
          }
        }

        if (this.finished) continue;

        // Collision Check con il player
        if (!this.flyingTimer && playerX > cx - x && playerX < cx + x && playerY > cy - y && playerY < cy + y) {
          switch (type) {
            case 7: // INTERACT_OBJECT
              switch (obj.index) {
                case 0: // Rampa di salto!
                  this.flyingTimer = 180;
                  if (this.enemyTimer) this.enemyStoped = true;
                  this.audio.playJump();
                  break;
                case 1: // Kraken spawn
                  if (!this.isInvincible()) {
                    this.enemyTimer = 1;
                    this.enemyX = obj.x;
                    this.enemyY = obj.y;
                    this.audio.playKraken();
                  }
                  break;
                case 2: // Fulmine Boost
                  if (this.power < 3) this.power++;
                  this.audio.playCollect();
                  break;
                case 3: // Cuore vita extra
                  if (this.heart < 3) this.heart++;
                  this.audio.playCollect();
                  break;
                case 4: // Moneta
                  this.coinCount++;
                  this.audio.playCollect();
                  break;
                case 6: // Cane compagno
                  this.hasDog = true;
                  this.audio.playCollect();
                  break;
              }
              this.objects.splice(i, 1);
              continue;

            case 0: // SMALL_OBJECT (piccolo scoglio): fa sbandare
              if (!this.isInvincible() && !this.changeDirectionTimer) {
                this.surferAction = 1 + Math.floor(Math.random() * 5);
                this.changeDirectionTimer = 40;
              }
              break;

            case 2: // SLOWDOWN_OBJECT (alghe)
              if (!this.isInvincible()) {
                this.speed = 1.5;
                this.rushTimer = 0;
              }
              break;

            case 3: // RIPPLE
            case 4: // AMBIENT
              break;

            default: // Scoglio grande, pontile, isola
              this.hitPlayer();
              break;
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

      if (this.enemyY + 200 < this.distance) {
        this.enemyX = this.enemyY = this.enemyTimer = 0;
        this.enemyStoped = false;
        return;
      }

      const enemyImg = this.images.enemy;
      const playerX = (this.width - 64) / 2.0 + 32;
      const playerY = this.height * SURFER_TOP_RATIO + 32;

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

        // Collisione Kraken con il Surfer
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
          this.saveHighScore();
          this.showGameOverCard();
          return;
        }
      }

      if (enemyImg && enemyImg.complete) {
        const sy = Math.floor((this.enemyTimer - 100) / 10) * 128;
        ctx.drawImage(enemyImg, 0, sy, 128, 128, Math.round(this.enemyX - this.offset), Math.round(this.enemyY - this.distance + 70), 128, 128);
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
        ctx.drawImage(boardImg, sx, boardSy, 64, 64, x, y, 64, 64);
      }
      if (playerImg && playerImg.complete) {
        ctx.drawImage(playerImg, sx, playerSy, 64, 64, x, y, 64, 64);
      }
      ctx.restore();
    }

    drawSurfer(ctx) {
      const left = (this.width - 64) / 2.0;
      const top = this.height * SURFER_TOP_RATIO;

      const alpha = (this.invincibleTimer && !this.surferAction) || Math.floor(this.invincibleTimer / 15) % 2 === 0 ? 1.0 : 0.45;
      const action = this.flyingTimer ? 9 + Math.floor((this.flyingTimer / 8) % 4) : this.surferAction;

      this.drawSurferOrigin(ctx, this.surfer, action, alpha, left, top);

      if (this.hasDog && this.images.player && this.images.player.complete) {
        ctx.drawImage(this.images.player, action * 64.0, 512, 64, 64, left, top, 64, 64);
      }

      // Ombra durante il salto
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
      const alpha = this.animationTimer / ANIMATION_TIMER_MAX_VALUE;
      const center = this.width / 2.0;
      const oLeft = (this.width - 64) / 2.0;
      const top = this.height * SURFER_TOP_RATIO;

      let left = oLeft - this.surfer * 84;
      for (let i = 0; i < 8; i++, left += 84) {
        const act = this.surfer === i ? 1 + (this.boardTimer >= 60 ? 4 - Math.floor((this.boardTimer - 60) / 12.0) : Math.floor(this.boardTimer / 12.0)) : 3;
        this.drawSurferOrigin(ctx, i, act, alpha, left, top);
      }

      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.85})`;
      ctx.font = 'bold 42px "Plus Jakarta Sans", sans-serif';
      ctx.fillText("LET'S SURF!", center, top - 80);

      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText("◄ TOCCA A SINISTRA / DESTRA PER SCEGLIERE ►", center, top + 95);

      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#D97706';
      ctx.fillText("🎮 TOCCA PER GIOCARE!", center, top + 135);

      ctx.restore();
    }

    drawFinishViewer(ctx) {
      const alpha = this.animationTimer / ANIMATION_TIMER_MAX_VALUE;
      const center = this.width / 2.0;
      const centerY = this.height / 2.0 - 50;

      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.95})`;
      ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
      ctx.fillText("GAME OVER!", center, centerY - 40);

      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText("Tocca o premi Spazio per ricominciare", center, centerY + 10);

      ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#EA580C';
      ctx.fillText(`Punti: ${this.getScore().toLocaleString()}`, center, centerY + 55);

      ctx.restore();
    }

    drawStatusBar(ctx) {
      const iface = this.images.interface;
      const center = this.width / 2.0;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(0, 0, this.width, 50);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 50);
      ctx.lineTo(this.width, 50);
      ctx.stroke();

      // Distanza centrale
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(`${Math.floor(this.distance / 10.0)} M`, center, 32);

      // Cuori (a sinistra)
      let hLeft = center - 80;
      for (let i = 0; i < 3; i++) {
        const isFull = i < this.heart;
        if (iface && iface.complete) {
          ctx.drawImage(iface, isFull ? 24 : 0, 0, 24, 24, hLeft, 13, 24, 24);
        } else {
          ctx.font = '16px sans-serif';
          ctx.fillText(isFull ? '💖' : '🖤', hLeft + 10, 30);
        }
        hLeft -= 26;
      }

      // Fulmini Boost (a destra)
      let pLeft = center + 56;
      for (let i = 0; i < 3; i++) {
        const isFull = i < this.power;
        if (iface && iface.complete) {
          ctx.drawImage(iface, isFull ? 24 : 0, 24, 24, 24, pLeft, 13, 24, 24);
        } else {
          ctx.font = '16px sans-serif';
          ctx.fillText(isFull ? '⚡' : '⚪', pLeft + 10, 30);
        }
        pLeft += 26;
      }

      // Cane e Monete
      let lLeft = 10;
      if (this.hasDog && iface && iface.complete) {
        ctx.drawImage(iface, 24, 48, 24, 24, lLeft, 14, 24, 24);
        lLeft += 28;
      }
      if (this.coinCount > 0) {
        if (iface && iface.complete) {
          ctx.drawImage(iface, 24, 72, 24, 24, lLeft, 15, 24, 24);
        }
        ctx.textAlign = 'left';
        ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#0F172A';
        ctx.fillText(`x${this.coinCount}`, lLeft + 26, 31);
      }

      ctx.restore();
    }

    // --------------------------------------------------------------------------
    // INPUT LISTENERS
    // --------------------------------------------------------------------------
    bindInputs() {
      if (!this.canvas) return;

      const handleStart = (e) => {
        e.preventDefault();
        this.audio.init();
        this.audio.resume();

        const touch = e.touches ? e.touches[0] : e;
        const rect = this.canvas.getBoundingClientRect();
        const curX = ((touch.clientX - rect.left) / rect.width) * this.width;

        if (!this.started || this.finished) {
          if (!this.started) {
            // Se clicca a sinistra/destra sulla schermata iniziale cambia personaggio
            if (curX < this.width * 0.35) {
              this.setSurferCharacter(this.surfer - 1);
              return;
            } else if (curX > this.width * 0.65) {
              this.setSurferCharacter(this.surfer + 1);
              return;
            }
          }
          this.startSurfing();
          return;
        }

        this.isDragging = true;
        this.dragStartX = curX;
        this.lastTouchX = curX;

        // Vira a sinistra o destra se tap diretto
        const center = this.width / 2.0;
        if (curX < center - 30) {
          this.steerLeft();
        } else if (curX > center + 30) {
          this.steerRight();
        } else {
          this.surferAction = 3;
        }
      };

      const handleMove = (e) => {
        if (!this.isDragging || !this.started || this.finished) return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const rect = this.canvas.getBoundingClientRect();
        const curX = ((touch.clientX - rect.left) / rect.width) * this.width;
        const dx = curX - this.lastTouchX;

        if (dx < -15) {
          this.surferAction = 1; // Hard left
        } else if (dx < -4) {
          this.surferAction = 2; // Gentle left
        } else if (dx > 15) {
          this.surferAction = 5; // Hard right
        } else if (dx > 4) {
          this.surferAction = 4; // Gentle right
        }
        this.lastTouchX = curX;
      };

      const handleEnd = (e) => {
        this.isDragging = false;
      };

      this.canvas.addEventListener('touchstart', handleStart, { passive: false });
      this.canvas.addEventListener('touchmove', handleMove, { passive: false });
      this.canvas.addEventListener('touchend', handleEnd, { passive: false });
      this.canvas.addEventListener('mousedown', handleStart);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);

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

    loop(timestamp) {
      this.update();
      this.draw();
      this.updateHUD();

      this.animId = requestAnimationFrame((t) => this.loop(t));
    }

    updateHUD() {
      const distEl = document.getElementById('surfLiveDist');
      const shellsEl = document.getElementById('surfLiveShells');

      if (distEl) distEl.textContent = `${Math.floor(this.distance / 10.0)}m`;
      if (shellsEl) shellsEl.textContent = `x${this.power}`;
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

  // Singleton
  window.SalentoSurf = new EdgeSurfEngine();

})(window);
