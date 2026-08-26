/**
 * ==============================================================================
 * SALENTO PIXEL SURF - RETRO MOBILE SURFING ENGINE
 * ==============================================================================
 * Un mini-gioco pixel-art a tema surf sulle onde del Salento per PietroBnB.
 * Supporta controlli touch one-finger & arcade, fisica delle onde procedurali,
 * rotazioni/trick aerei, tubi/barrel, particelle, audio sintetizzato 8-bit
 * e salvataggio record in localStorage & Bacheca Live.
 */

(function (window) {
  'use strict';

  // ----------------------------------------------------------------------------
  // 1. COSTANTI E CONFIGURAZIONE DI GIOCO
  // ----------------------------------------------------------------------------
  const GAME_CONFIG = {
    CANVAS_WIDTH: 420,
    CANVAS_HEIGHT: 240,
    GRAVITY: 0.28,
    PUMP_ACCEL: 0.35,
    AIR_ROTATION_SPEED: 0.13,
    MAX_SPEED_X: 12.0,
    MIN_SPEED_X: 3.2,
    DEFAULT_SPEED_X: 4.8,
    WAVE_BASE_Y: 155,
    SEABED_BASE_Y: 215,
    BARREL_THRESHOLD_DIST: 55,
  };

  // Skin sbloccabili / selezionabili
  const SURFER_SKINS = {
    pietro: {
      id: 'pietro',
      name: 'Pietro Superhost',
      emoji: '😎',
      hairColor: '#4A2E18',
      skinColor: '#FFCC99',
      trunksColor: '#FF385C', // Rosso Rausch PietroBnB
      boardColor: '#FFFFFF',
      boardStripe: '#FF385C',
      glasses: true,
      description: 'Superhost del Salento con occhiali da sole e stile impeccabile.'
    },
    delfino: {
      id: 'delfino',
      name: 'Delfino Anonimo',
      emoji: '🐬',
      hairColor: '#0284C7',
      skinColor: '#BAE6FD',
      trunksColor: '#0369A1',
      boardColor: '#E0F2FE',
      boardStripe: '#0284C7',
      glasses: true,
      description: 'Nuota e surfa veloce come un vero delfino dello Ionio.'
    },
    fenicottero: {
      id: 'fenicottero',
      name: 'Fenicottero Rosa',
      emoji: '🦩',
      hairColor: '#DB2777',
      skinColor: '#FBCFE8',
      trunksColor: '#BE185D',
      boardColor: '#FFF1F2',
      boardStripe: '#F43F5E',
      glasses: true,
      description: 'Elegante e acrobatico sulle onde di Baia Verde.'
    },
    scirocco: {
      id: 'scirocco',
      name: 'Scirocco Rider',
      emoji: '🌪️',
      hairColor: '#EA580C',
      skinColor: '#FED7AA',
      trunksColor: '#C2410C',
      boardColor: '#FEF08A',
      boardStripe: '#EA580C',
      glasses: true,
      description: 'Cavalca le onde più alte e impetuose con la tavola d\'oro.'
    }
  };

  // ----------------------------------------------------------------------------
  // 2. SINTETIZZATORE AUDIO WEB AUDIO 8-BIT (ZERO ASSET ESTERNI)
  // ----------------------------------------------------------------------------
  class RetroAudioSynth {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.waveNoiseNode = null;
      this.waveGainNode = null;
      this.waveFilterNode = null;
      this.isInitialized = false;

      const savedMute = localStorage.getItem('salento_surf_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
    }

    init() {
      if (this.isInitialized) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.initWaveAmbience();
        this.isInitialized = true;
      } catch (e) {
        console.warn('Web Audio non supportato o bloccato:', e);
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      localStorage.setItem('salento_surf_muted', this.isMuted);
      if (this.waveGainNode) {
        this.waveGainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.04, this.ctx ? this.ctx.currentTime : 0);
      }
      return this.isMuted;
    }

    initWaveAmbience() {
      if (!this.ctx) return;
      try {
        // Generatore rumore bianco per il suono continuo dell'oceano
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        this.waveFilterNode = this.ctx.createBiquadFilter();
        this.waveFilterNode.type = 'lowpass';
        this.waveFilterNode.frequency.value = 420;

        this.waveGainNode = this.ctx.createGain();
        this.waveGainNode.gain.value = this.isMuted ? 0 : 0.035;

        whiteNoise.connect(this.waveFilterNode);
        this.waveFilterNode.connect(this.waveGainNode);
        this.waveGainNode.connect(this.ctx.destination);
        whiteNoise.start(0);
        this.waveNoiseNode = whiteNoise;
      } catch (e) {
        // Silenzia errori se autoplay è limitato
      }
    }

    setWaveFilter(freq, volume = 0.04) {
      if (!this.ctx || !this.waveFilterNode || !this.waveGainNode || this.isMuted) return;
      const t = this.ctx.currentTime;
      this.waveFilterNode.frequency.setTargetAtTime(freq, t, 0.1);
      this.waveGainNode.gain.setTargetAtTime(this.isMuted ? 0 : volume, t, 0.1);
    }

    playJump() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(680, t + 0.16);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    }

    playTrick() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, i) => {
        const t = this.ctx.currentTime + i * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.11);
      });
    }

    playCleanLanding() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(580, t + 0.12);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    }

    playShellCollect() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1320, t + 0.06);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    }

    playBarrelSound() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      this.setWaveFilter(850, 0.09);
    }

    playWipeout() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.linearRampToValueAtTime(60, t + 0.35);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    }

    playNewRecord() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((freq, i) => {
        const t = this.ctx.currentTime + i * 0.09;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.24);
      });
    }
  }

  // ----------------------------------------------------------------------------
  // 3. MOTORE PARTICELLE RETRO PIXEL
  // ----------------------------------------------------------------------------
  class PixelParticleSystem {
    constructor() {
      this.particles = [];
      this.maxParticles = 140;
    }

    add(x, y, vx, vy, color, size = 2, life = 30, type = 'foam') {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }
      this.particles.push({
        x,
        y,
        vx,
        vy,
        color,
        size,
        life,
        maxLife: life,
        type
      });
    }

    createSplash(x, y, count = 12, color = '#FFFFFF') {
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI * 0.8 + Math.random() * Math.PI * 0.6;
        const speed = 1.5 + Math.random() * 3.8;
        this.add(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          color,
          Math.random() > 0.5 ? 2 : 3,
          20 + Math.floor(Math.random() * 15),
          'splash'
        );
      }
    }

    createBarrelSpray(x, y) {
      for (let i = 0; i < 3; i++) {
        const colors = ['#FFFFFF', '#E0F7FA', '#80DEEA', '#FFE082'];
        const col = colors[Math.floor(Math.random() * colors.length)];
        this.add(
          x + (Math.random() * 20 - 10),
          y + (Math.random() * 20 - 10),
          -1.5 - Math.random() * 2,
          -0.5 + (Math.random() * 1.5 - 0.75),
          col,
          2,
          16 + Math.floor(Math.random() * 10),
          'spray'
        );
      }
    }

    update() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        if (p.type === 'splash' || p.type === 'spray') {
          p.vy += 0.15; // gravità gocce
        }

        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    draw(ctx, cameraX) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const screenX = Math.round(p.x - cameraX);
        const screenY = Math.round(p.y);

        ctx.fillStyle = p.color;
        ctx.fillRect(screenX, screenY, p.size, p.size);
      }
    }

    clear() {
      this.particles = [];
    }
  }

  // ----------------------------------------------------------------------------
  // 4. GENERATORE ONDE PROCEDURALI E FONDALE
  // ----------------------------------------------------------------------------
  class SalentoWaveWorld {
    constructor() {
      this.shells = [];
      this.boosts = [];
      this.fishes = [];
      this.decorations = [];
      this.initWorldElements();
    }

    initWorldElements() {
      this.shells = [];
      this.boosts = [];
      this.fishes = [];

      // Genera conchiglie e pesciolini per i primi 25,000 pixel
      for (let x = 300; x < 25000; x += 180 + Math.random() * 220) {
        const waveH = this.getWaveHeight(x, 0);
        this.shells.push({
          x: x,
          y: waveH - 30 - Math.random() * 50,
          collected: false,
          animOffset: Math.random() * Math.PI * 2
        });

        // Speed boost orbs
        if (Math.random() < 0.25) {
          this.boosts.push({
            x: x + 80,
            y: waveH - 20,
            collected: false
          });
        }
      }

      // Pesciolini sottomarini
      for (let x = 100; x < 25000; x += 120 + Math.random() * 150) {
        this.fishes.push({
          x: x,
          y: GAME_CONFIG.WAVE_BASE_Y + 25 + Math.random() * 40,
          vx: -(0.5 + Math.random() * 0.8),
          color: Math.random() > 0.5 ? '#FFD54F' : '#FF7043',
          size: Math.random() > 0.5 ? 3 : 4
        });
      }
    }

    // Calcola l'altezza dell'onda (Y) in base alla coordinata globale X e al tempo
    getWaveHeight(worldX, timeSec = 0) {
      const baseY = GAME_CONFIG.WAVE_BASE_Y;

      // Swell principale
      const swell1 = Math.sin(worldX * 0.008 + timeSec * 1.5) * 28;
      // Cresta secondaria più ripida
      const swell2 = Math.sin(worldX * 0.018 - timeSec * 0.8) * 14;
      // Dettaglio micro-increspatura
      const chop = Math.sin(worldX * 0.045 + timeSec * 3) * 4;

      // Sezione speciale onde ripide per salti spettacolari a intervalli regolari
      const rampCycle = Math.sin(worldX * 0.002);
      const rampExtra = rampCycle > 0.4 ? (rampCycle - 0.4) * 40 : 0;

      return baseY + swell1 + swell2 + chop - rampExtra;
    }

    // Calcola la pendenza / angolo della superficie dell'onda
    getWaveSlope(worldX, timeSec = 0) {
      const delta = 4;
      const y1 = this.getWaveHeight(worldX - delta, timeSec);
      const y2 = this.getWaveHeight(worldX + delta, timeSec);
      return Math.atan2(y2 - y1, delta * 2);
    }

    // Calcola il fondale sabbioso con dune
    getSeabedHeight(worldX) {
      const baseY = GAME_CONFIG.SEABED_BASE_Y;
      const dune = Math.sin(worldX * 0.006) * 16 + Math.sin(worldX * 0.02) * 6;
      return baseY + dune;
    }

    // Determina se il punto si trova all'interno del barile / tubo dell'onda
    isInBarrelPocket(worldX, worldY, timeSec = 0) {
      const waveY = this.getWaveHeight(worldX, timeSec);
      const slope = this.getWaveSlope(worldX, timeSec);

      // Una pendenza negativa ripida (salita dell'onda) con il surfer vicino alla parete
      const isSteepWave = slope < -0.35;
      const isPocketDepth = worldY >= waveY - 35 && worldY <= waveY + 12;

      return isSteepWave && isPocketDepth;
    }

    update(timeSec) {
      // Aggiorna nuoto dei pesciolini
      for (let i = 0; i < this.fishes.length; i++) {
        const f = this.fishes[i];
        f.x += f.vx;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 5. FISICA E STATO DEL SURFER
  // ----------------------------------------------------------------------------
  class SalentoSurfer {
    constructor(skinId = 'pietro') {
      this.skin = SURFER_SKINS[skinId] || SURFER_SKINS.pietro;
      this.reset();
    }

    reset() {
      this.x = 120;
      this.y = GAME_CONFIG.WAVE_BASE_Y - 20;
      this.vx = GAME_CONFIG.DEFAULT_SPEED_X;
      this.vy = 0;
      this.angle = 0;
      this.angularVelocity = 0;
      this.state = 'SURFING'; // 'SURFING', 'AIRBORNE', 'IN_BARREL', 'WIPEOUT'
      this.isPumping = false;
      this.airTime = 0;
      this.airRotations = 0;
      this.totalAngleTurned = 0;
      this.barrelTimer = 0;
      this.maxAirHeight = 0;
      this.wipeoutTimer = 0;
      this.comboCount = 0;
      this.score = 0;
      this.distance = 0;
      this.shellsCollected = 0;
      this.currentTrickText = '';
      this.trickTextTimer = 0;
      this.boardTailTrail = [];
    }

    setSkin(skinId) {
      if (SURFER_SKINS[skinId]) {
        this.skin = SURFER_SKINS[skinId];
      }
    }

    startPump() {
      if (this.state === 'WIPEOUT') return;
      this.isPumping = true;
    }

    releasePump() {
      this.isPumping = false;
    }

    update(world, particleSys, audioSynth, timeSec) {
      if (this.state === 'WIPEOUT') {
        this.updateWipeout(world, particleSys);
        return;
      }

      const waveY = world.getWaveHeight(this.x, timeSec);
      const waveSlope = world.getWaveSlope(this.x, timeSec);

      // Aggiorna distanza percorsa
      this.distance = Math.floor(this.x / 10);

      // Salva scia della tavola
      this.boardTailTrail.push({ x: this.x, y: this.y, life: 12 });
      if (this.boardTailTrail.length > 18) this.boardTailTrail.shift();
      for (let i = this.boardTailTrail.length - 1; i >= 0; i--) {
        this.boardTailTrail[i].life--;
        if (this.boardTailTrail[i].life <= 0) {
          this.boardTailTrail.splice(i, 1);
        }
      }

      // Check In-Barrel
      const inBarrel = world.isInBarrelPocket(this.x, this.y, timeSec);
      if (inBarrel && this.state !== 'AIRBORNE') {
        this.state = 'IN_BARREL';
        this.barrelTimer += 1 / 60;
        this.score += 8; // Punti continui nel tubo!
        particleSys.createBarrelSpray(this.x, this.y);
        audioSynth.playBarrelSound();

        if (Math.random() < 0.2) {
          this.showTrickText('🌊 BARREL RIDER! +100', '#38BDF8');
          this.score += 100;
        }
      } else if (this.state === 'IN_BARREL' && !inBarrel) {
        this.state = 'SURFING';
        audioSynth.setWaveFilter(450, 0.04);
      }

      // FISICA IN ARIA
      if (this.state === 'AIRBORNE') {
        this.airTime += 1 / 60;
        this.vy += GAME_CONFIG.GRAVITY;

        // Se l'utente tiene premuto in aria -> esegui acrobazie / flip!
        if (this.isPumping) {
          this.angle += GAME_CONFIG.AIR_ROTATION_SPEED;
          this.totalAngleTurned += GAME_CONFIG.AIR_ROTATION_SPEED;
        } else {
          // Lieve stabilizzazione aerodinamica
          this.angle += this.angularVelocity;
          this.angularVelocity *= 0.94;
        }

        this.x += this.vx;
        this.y += this.vy;

        const currentAirH = Math.max(0, waveY - this.y);
        if (currentAirH > this.maxAirHeight) {
          this.maxAirHeight = Math.floor(currentAirH);
        }

        // Controllo atterraggio sull'onda
        if (this.y >= waveY - 2) {
          this.handleLanding(waveSlope, particleSys, audioSynth);
        }

      } else {
        // FISICA SULL'ONDA (SURFING O PUMPING)
        this.airTime = 0;

        if (this.isPumping) {
          // Tucking / Pumping: aumenta velocità scendendo lungo la pendenza
          const accel = Math.sin(waveSlope) * GAME_CONFIG.PUMP_ACCEL * 1.8;
          this.vx += accel;
          this.vx = Math.min(GAME_CONFIG.MAX_SPEED_X, Math.max(GAME_CONFIG.MIN_SPEED_X, this.vx));

          // Emetti schiuma mentre si fa carving
          if (Math.random() < 0.4) {
            particleSys.add(this.x - 6, this.y + 4, -this.vx * 0.4, -1, '#FFFFFF', 2, 14, 'spray');
          }
        } else {
          // Attrito naturale se non si pompa
          this.vx += (GAME_CONFIG.DEFAULT_SPEED_X - this.vx) * 0.02;
        }

        // Segui il profilo dell'onda
        this.x += this.vx;
        this.y = waveY;
        this.angle = waveSlope;

        // CHECK LANCIO DALLA CRESTA DELL'ONDA (AIR LAUNCH)
        // Se la pendenza è verso l'alto e la velocità è sufficiente -> decollo!
        if (waveSlope < -0.38 && this.vx > 5.2 && !this.isPumping) {
          this.launchAirborne(waveSlope, audioSynth, particleSys);
        }

        // Punti per scorrimento e carving
        this.score += Math.floor(this.vx * 0.15);
      }

      // Check raccolta conchiglie e power-up
      this.checkCollectibles(world, audioSynth, particleSys);

      // Aggiorna timer testo trick
      if (this.trickTextTimer > 0) {
        this.trickTextTimer--;
      }
    }

    launchAirborne(waveSlope, audioSynth, particleSys) {
      this.state = 'AIRBORNE';
      // Converti la velocità orizzontale in slancio verticale basato sull'inclinazione
      this.vy = -Math.abs(this.vx * Math.sin(waveSlope) * 1.6) - 4.5;
      this.vx = this.vx * 0.95;
      this.angularVelocity = -0.04;
      this.totalAngleTurned = 0;

      particleSys.createSplash(this.x, this.y, 8, '#E0F7FA');
      audioSynth.playJump();

      if (navigator.vibrate) {
        try { navigator.vibrate(20); } catch (e) {}
      }
    }

    handleLanding(waveSlope, particleSys, audioSynth) {
      // Normalizza gli angoli tra -PI e PI
      let angleDiff = Math.abs(this.normalizeAngle(this.angle) - this.normalizeAngle(waveSlope));
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      // Calcola rotazioni complete
      const fullRotations = Math.floor(Math.abs(this.totalAngleTurned) / (Math.PI * 2));

      // Atterraggio corretto (angolo allineato entro ~45 gradi)
      if (angleDiff < 0.8) {
        this.state = 'SURFING';
        this.y = this.y;
        this.angle = waveSlope;
        this.vy = 0;

        // Boost di velocità per atterraggio pulito
        this.vx = Math.min(GAME_CONFIG.MAX_SPEED_X, this.vx + 2.4);
        this.comboCount++;

        particleSys.createSplash(this.x, this.y, 14, '#FFFFFF');
        audioSynth.playCleanLanding();

        // Assegna punti per trick completati
        if (fullRotations >= 2) {
          const pts = 1200 * this.comboCount;
          this.score += pts;
          this.showTrickText(`🔥 720 MEGA SPIN! +${pts}`, '#F59E0B');
          audioSynth.playTrick();
        } else if (fullRotations === 1) {
          const pts = 500 * this.comboCount;
          this.score += pts;
          this.showTrickText(`✨ 360 AIR FLIP! +${pts}`, '#10B981');
          audioSynth.playTrick();
        } else if (this.maxAirHeight > 55) {
          const pts = 300 * this.comboCount;
          this.score += pts;
          this.showTrickText(`🚀 BIG AIR SALENTO! +${pts}`, '#6366F1');
        } else {
          this.showTrickText(`👌 CLEAN LANDING! x${this.comboCount}`, '#38BDF8');
        }

        if (navigator.vibrate) {
          try { navigator.vibrate([25, 40, 25]); } catch (e) {}
        }
      } else {
        // WIPEOUT! Atterraggio di punta o schienata
        this.triggerWipeout(particleSys, audioSynth);
      }
    }

    triggerWipeout(particleSys, audioSynth) {
      this.state = 'WIPEOUT';
      this.wipeoutTimer = 75; // frames
      this.comboCount = 0;
      this.vy = -3;
      this.vx = this.vx * 0.3;

      particleSys.createSplash(this.x, this.y, 22, '#FFFFFF');
      audioSynth.playWipeout();
      this.showTrickText('💥 WIPEOUT!', '#EF4444');

      if (navigator.vibrate) {
        try { navigator.vibrate([60, 50, 100]); } catch (e) {}
      }
    }

    updateWipeout(world, particleSys) {
      this.wipeoutTimer--;
      this.x += this.vx;
      this.y += this.vy;
      this.vy += GAME_CONFIG.GRAVITY * 0.8;
      this.angle += 0.15;

      const waveY = world.getWaveHeight(this.x, 0);
      if (this.y > waveY + 8) {
        this.y = waveY + 8;
        this.vx *= 0.9;
        this.vy = 0;
      }

      if (this.wipeoutTimer <= 0) {
        // Respawn morbido
        this.state = 'SURFING';
        this.y = waveY;
        this.angle = world.getWaveSlope(this.x, 0);
        this.vx = GAME_CONFIG.DEFAULT_SPEED_X;
        this.vy = 0;
      }
    }

    checkCollectibles(world, audioSynth, particleSys) {
      // Conchiglie
      for (let i = 0; i < world.shells.length; i++) {
        const s = world.shells[i];
        if (!s.collected && Math.abs(this.x - s.x) < 22 && Math.abs(this.y - s.y) < 26) {
          s.collected = true;
          this.shellsCollected++;
          this.score += 150;
          this.showTrickText('🐚 +150', '#FBBF24');
          particleSys.createSplash(s.x, s.y, 6, '#FBBF24');
          audioSynth.playShellCollect();
        }
      }

      // Boost orbs
      for (let i = 0; i < world.boosts.length; i++) {
        const b = world.boosts[i];
        if (!b.collected && Math.abs(this.x - b.x) < 24 && Math.abs(this.y - b.y) < 26) {
          b.collected = true;
          this.vx = Math.min(GAME_CONFIG.MAX_SPEED_X, this.vx + 4);
          this.score += 250;
          this.showTrickText('⚡ SPEED BOOST! +250', '#EC4899');
          particleSys.createSplash(b.x, b.y, 10, '#EC4899');
          audioSynth.playTrick();
        }
      }
    }

    normalizeAngle(ang) {
      ang = ang % (2 * Math.PI);
      if (ang > Math.PI) ang -= 2 * Math.PI;
      if (ang < -Math.PI) ang += 2 * Math.PI;
      return ang;
    }

    showTrickText(text, color = '#FFFFFF') {
      this.currentTrickText = text;
      this.trickTextColor = color;
      this.trickTextTimer = 48;
    }

    draw(ctx, cameraX) {
      const screenX = Math.round(this.x - cameraX);
      const screenY = Math.round(this.y);

      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.rotate(this.angle);

      // Disegna Tavola da Surf in Pixel Art
      this.drawSurfboard(ctx);

      // Disegna Personaggio Surfer in Pixel Art
      this.drawSurferCharacter(ctx);

      ctx.restore();

      // Disegna Testo Trick Aereo Flottante
      if (this.trickTextTimer > 0) {
        ctx.save();
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.trickTextColor || '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        const textY = screenY - 28 - (48 - this.trickTextTimer) * 0.4;
        ctx.fillText(this.currentTrickText, screenX, textY);
        ctx.restore();
      }
    }

    drawSurfboard(ctx) {
      const s = this.skin;
      // Tavola da surf affusolata pixel-art
      ctx.fillStyle = s.boardColor || '#FFFFFF';
      ctx.fillRect(-18, 4, 36, 4);
      ctx.fillRect(-15, 3, 30, 6);
      ctx.fillRect(-20, 5, 4, 2); // Punta
      ctx.fillRect(17, 5, 2, 2);  // Coda

      // Pinna posteriore (Fin)
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(10, 8, 4, 3);

      // Riga centrale colorata della tavola
      ctx.fillStyle = s.boardStripe || '#FF385C';
      ctx.fillRect(-14, 5, 28, 2);
    }

    drawSurferCharacter(ctx) {
      const s = this.skin;
      const isCrouched = this.isPumping || this.state === 'IN_BARREL';

      // Posizione verticale busto/gambe
      const hipY = isCrouched ? 0 : -4;
      const headY = isCrouched ? -8 : -15;

      // Gambe & Costume da bagno
      ctx.fillStyle = s.skinColor;
      ctx.fillRect(-6, hipY + 4, 4, 4); // Gamba posteriore
      ctx.fillRect(2, hipY + 4, 4, 4);  // Gamba anteriore

      // Costume (Rausch Red per Pietro, ecc.)
      ctx.fillStyle = s.trunksColor;
      ctx.fillRect(-7, hipY, 14, 5);

      // Busto / Torace
      ctx.fillStyle = s.skinColor;
      ctx.fillRect(-5, headY + 5, 10, 6);

      // Braccia per equilibrio
      if (this.state === 'AIRBORNE') {
        // Braccia alzate per trick aereo!
        ctx.fillRect(-10, headY + 2, 4, 4);
        ctx.fillRect(6, headY + 2, 4, 4);
      } else {
        // Braccia tese per surf balance
        ctx.fillRect(-9, headY + 7, 4, 3);
        ctx.fillRect(5, headY + 7, 4, 3);
      }

      // Testa
      ctx.fillStyle = s.skinColor;
      ctx.fillRect(-4, headY - 4, 8, 8);

      // Capelli
      ctx.fillStyle = s.hairColor;
      ctx.fillRect(-5, headY - 6, 10, 4);
      ctx.fillRect(-5, headY - 4, 3, 3);

      // Occhiali da sole da Superhost 😎
      if (s.glasses) {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(-1, headY - 2, 6, 3);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(1, headY - 2, 1, 1); // Riflesso sole
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 6. RENDERER GRAFICO RETRO E PARALLASSE SALENTO
  // ----------------------------------------------------------------------------
  class SalentoSurfRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.clouds = [
        { x: 50, y: 25, speed: 0.15, size: 24 },
        { x: 180, y: 40, speed: 0.22, size: 36 },
        { x: 320, y: 20, speed: 0.12, size: 20 },
        { x: 450, y: 35, speed: 0.18, size: 30 }
      ];
    }

    render(world, surfer, particleSys, cameraX, timeSec) {
      const ctx = this.ctx;
      const width = GAME_CONFIG.CANVAS_WIDTH;
      const height = GAME_CONFIG.CANVAS_HEIGHT;

      ctx.clearRect(0, 0, width, height);

      // 1. Cielo Salentino (Gradient Gradiente Soleggiato)
      const skyGradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.WAVE_BASE_Y);
      skyGradient.addColorStop(0, '#7FD1F7'); // Azzurro cielo
      skyGradient.addColorStop(0.65, '#BAE6FD');
      skyGradient.addColorStop(1, '#FEF08A'); // Luce calda dell'orizzonte
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Sole Pixel Luminoso con Bagliore
      this.drawPixelSun(ctx, width - 65, 35);

      // 3. Nuvole Pixel in Parallasse
      this.drawPixelClouds(ctx, cameraX);

      // 4. Silhouette Costa di Gallipoli / Faraglioni all'Orizzonte
      this.drawCoastalHorizon(ctx, cameraX);

      // 5. Onde e Corpo d'Acqua Stratificato (Pixel Water)
      this.drawLayeredOcean(ctx, world, cameraX, timeSec);

      // 6. Fondale Marino con Sabbia, Dune e Pesciolini
      this.drawSeabedAndFlora(ctx, world, cameraX);

      // 7. Scia della tavola e Particelle
      this.drawBoardTrail(ctx, surfer, cameraX);
      particleSys.draw(ctx, cameraX);

      // 8. Collezionabili (Conchiglie & Boost)
      this.drawCollectibles(ctx, world, cameraX, timeSec);

      // 9. Surfer Personaggio
      surfer.draw(ctx, cameraX);

      // 10. Schiuma Cresta e Barile in primo piano
      this.drawWaveFoamLip(ctx, world, cameraX, timeSec);
    }

    drawPixelSun(ctx, sunX, sunY) {
      // Glow esterno
      ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
      ctx.fill();

      // Disco solare pixelato
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(sunX - 12, sunY - 12, 24, 24);
      ctx.fillRect(sunX - 14, sunY - 8, 28, 16);
      ctx.fillRect(sunX - 8, sunY - 14, 16, 28);

      // Centro bianco luminoso
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sunX - 6, sunY - 6, 12, 12);
    }

    drawPixelClouds(ctx, cameraX) {
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < this.clouds.length; i++) {
        const c = this.clouds[i];
        const cx = ((c.x - cameraX * c.speed) % (GAME_CONFIG.CANVAS_WIDTH + 80) + GAME_CONFIG.CANVAS_WIDTH + 80) % (GAME_CONFIG.CANVAS_WIDTH + 80) - 40;

        ctx.fillRect(cx, c.y, c.size, 8);
        ctx.fillRect(cx + 4, c.y - 4, c.size - 8, 14);
        ctx.fillRect(cx + 8, c.y - 7, c.size - 16, 18);
      }
    }

    drawCoastalHorizon(ctx, cameraX) {
      const baseY = GAME_CONFIG.WAVE_BASE_Y - 14;
      ctx.fillStyle = '#6B7280'; // Montagnetta / Costa lontana

      // Promontorio Gallipoli & Torre del Pizzo in parallasse lenta
      for (let x = 0; x < GAME_CONFIG.CANVAS_WIDTH; x += 4) {
        const worldX = x + cameraX * 0.12;
        const hillH = Math.sin(worldX * 0.005) * 14 + Math.sin(worldX * 0.015) * 6;
        if (hillH > 4) {
          ctx.fillRect(x, baseY - hillH, 4, hillH);
        }
      }

      // Mare calmo all'orizzonte (linea turchese tenue)
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(0, baseY, GAME_CONFIG.CANVAS_WIDTH, 14);
    }

    drawLayeredOcean(ctx, world, cameraX, timeSec) {
      const width = GAME_CONFIG.CANVAS_WIDTH;
      const height = GAME_CONFIG.CANVAS_HEIGHT;

      // Disegna colonne verticali pixelate per creare la stratificazione dell'acqua come nello screenshot
      const step = 2; // Risoluzione orizzontale colonne d'acqua

      for (let sx = 0; sx < width; sx += step) {
        const worldX = sx + cameraX;
        const waveY = Math.round(world.getWaveHeight(worldX, timeSec));
        const seabedY = Math.round(world.getSeabedHeight(worldX));

        // 1. Strato Cresta / Superficie Turchese Chiaro (#22D3EE)
        ctx.fillStyle = '#22D3EE';
        ctx.fillRect(sx, waveY, step, 10);

        // 2. Strato Intermedio Salento Cyan (#0284C7)
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(sx, waveY + 10, step, 22);

        // 3. Strato Ionio Profondo Blu Marino (#0369A1 / #0C4A6E)
        ctx.fillStyle = '#0369A1';
        ctx.fillRect(sx, waveY + 32, step, Math.max(0, seabedY - (waveY + 32)));

        // 4. Schiuma superficiale bianca pixelata sulla cresta
        if (Math.sin(worldX * 0.08 + timeSec * 4) > 0.3) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(sx, waveY - 1, step, 3);
        }
      }
    }

    drawSeabedAndFlora(ctx, world, cameraX) {
      const width = GAME_CONFIG.CANVAS_WIDTH;
      const height = GAME_CONFIG.CANVAS_HEIGHT;
      const step = 3;

      for (let sx = 0; sx < width; sx += step) {
        const worldX = sx + cameraX;
        const seabedY = Math.round(world.getSeabedHeight(worldX));

        // Sabbia dorata del Salento (#D97706 / #B45309)
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(sx, seabedY, step, 6);

        // Rocce e scogli sottostanti (#78350F)
        ctx.fillStyle = '#92400E';
        ctx.fillRect(sx, seabedY + 6, step, height - (seabedY + 6));
      }

      // Pesciolini sottomarini
      for (let i = 0; i < world.fishes.length; i++) {
        const f = world.fishes[i];
        const sx = Math.round(f.x - cameraX);
        if (sx > -20 && sx < width + 20) {
          ctx.fillStyle = f.color;
          ctx.fillRect(sx, Math.round(f.y), f.size + 2, f.size);
          ctx.fillRect(sx + f.size + 2, Math.round(f.y) - 1, 2, f.size + 2); // Coda
        }
      }
    }

    drawBoardTrail(ctx, surfer, cameraX) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (let i = 0; i < surfer.boardTailTrail.length; i++) {
        const pt = surfer.boardTailTrail[i];
        const sx = Math.round(pt.x - cameraX);
        const sy = Math.round(pt.y);
        const size = Math.max(1, Math.floor(pt.life / 3));
        ctx.fillRect(sx, sy, size, size);
      }
    }

    drawCollectibles(ctx, world, cameraX, timeSec) {
      const width = GAME_CONFIG.CANVAS_WIDTH;

      // Conchiglie 🐚
      for (let i = 0; i < world.shells.length; i++) {
        const s = world.shells[i];
        if (s.collected) continue;
        const sx = Math.round(s.x - cameraX);
        if (sx > -20 && sx < width + 20) {
          const floatY = s.y + Math.sin(timeSec * 4 + s.animOffset) * 3;
          ctx.fillStyle = '#FDE68A';
          ctx.fillRect(sx - 4, Math.round(floatY) - 4, 8, 8);
          ctx.fillStyle = '#F59E0B';
          ctx.fillRect(sx - 2, Math.round(floatY) - 2, 4, 4);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(sx - 3, Math.round(floatY) - 3, 2, 2);
        }
      }

      // Boost Orbs ⚡
      for (let i = 0; i < world.boosts.length; i++) {
        const b = world.boosts[i];
        if (b.collected) continue;
        const sx = Math.round(b.x - cameraX);
        if (sx > -20 && sx < width + 20) {
          const floatY = b.y + Math.sin(timeSec * 6) * 4;
          ctx.fillStyle = '#F43F5E';
          ctx.fillRect(sx - 5, Math.round(floatY) - 5, 10, 10);
          ctx.fillStyle = '#FDE047';
          ctx.fillRect(sx - 2, Math.round(floatY) - 4, 4, 8);
        }
      }
    }

    drawWaveFoamLip(ctx, world, cameraX, timeSec) {
      // Effetto ricciolo schiuma sulla cresta anteriore
      const width = GAME_CONFIG.CANVAS_WIDTH;
      for (let sx = 0; sx < width; sx += 12) {
        const worldX = sx + cameraX;
        const slope = world.getWaveSlope(worldX, timeSec);
        if (slope < -0.42) {
          const waveY = Math.round(world.getWaveHeight(worldX, timeSec));
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(sx - 3, waveY - 4, 7, 5);
          ctx.fillStyle = '#E0F2FE';
          ctx.fillRect(sx, waveY - 2, 4, 4);
        }
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 7. GESTORE PRINCIPALE DI GIOCO (GAME ENGINE & CONTROLLI)
  // ----------------------------------------------------------------------------
  class SalentoSurfEngine {
    constructor() {
      this.canvas = null;
      this.renderer = null;
      this.world = null;
      this.surfer = null;
      this.particleSys = null;
      this.audio = null;

      this.gameState = 'READY'; // 'READY', 'PLAYING', 'GAMEOVER', 'PAUSED'
      this.cameraX = 0;
      this.timeSec = 0;
      this.highScore = 0;
      this.bestBarrelTime = 0;
      this.bestAirHeight = 0;
      this.bestDistance = 0;
      this.animationFrameId = null;
      this.lastTimestamp = 0;

      this.selectedSkinId = 'pietro';
      this.loadSavedRecords();
    }

    loadSavedRecords() {
      try {
        const saved = localStorage.getItem('salento_surf_records_v1');
        if (saved) {
          const data = JSON.parse(saved);
          this.highScore = data.highScore || 0;
          this.bestBarrelTime = data.bestBarrelTime || 0;
          this.bestAirHeight = data.bestAirHeight || 0;
          this.bestDistance = data.bestDistance || 0;
          this.selectedSkinId = data.selectedSkinId || 'pietro';
        }
      } catch (e) {
        console.warn('Impossibile caricare record:', e);
      }
    }

    saveRecords() {
      try {
        const isNewRecord = this.surfer.score > this.highScore;
        if (isNewRecord) {
          this.highScore = this.surfer.score;
        }
        if (this.surfer.barrelTimer > this.bestBarrelTime) {
          this.bestBarrelTime = Number(this.surfer.barrelTimer.toFixed(1));
        }
        if (this.surfer.maxAirHeight > this.bestAirHeight) {
          this.bestAirHeight = this.surfer.maxAirHeight;
        }
        if (this.surfer.distance > this.bestDistance) {
          this.bestDistance = this.surfer.distance;
        }

        const data = {
          highScore: this.highScore,
          bestBarrelTime: this.bestBarrelTime,
          bestAirHeight: this.bestAirHeight,
          bestDistance: this.bestDistance,
          selectedSkinId: this.selectedSkinId
        };
        localStorage.setItem('salento_surf_records_v1', JSON.stringify(data));
        return isNewRecord;
      } catch (e) {
        return false;
      }
    }

    init(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
      this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;

      this.renderer = new SalentoSurfRenderer(this.canvas);
      this.world = new SalentoWaveWorld();
      this.surfer = new SalentoSurfer(this.selectedSkinId);
      this.particleSys = new PixelParticleSystem();
      this.audio = new RetroAudioSynth();

      this.bindControls();
      this.updateRecordsUI();

      // Render iniziale preview
      this.renderer.render(this.world, this.surfer, this.particleSys, 0, 0);
    }

    setSurferSkin(skinId) {
      this.selectedSkinId = skinId;
      if (this.surfer) {
        this.surfer.setSkin(skinId);
      }
      this.saveRecords();
    }

    bindControls() {
      if (!this.canvas) return;

      // Touch Controls per Smartphone
      const handleTouchStart = (e) => {
        e.preventDefault();
        this.audio.init();
        this.audio.resume();

        if (this.gameState === 'READY') {
          this.startGame();
          return;
        }
        if (this.gameState === 'GAMEOVER') {
          this.restartGame();
          return;
        }
        if (this.gameState === 'PLAYING') {
          this.surfer.startPump();
        }
      };

      const handleTouchEnd = (e) => {
        e.preventDefault();
        if (this.gameState === 'PLAYING') {
          this.surfer.releasePump();
        }
      };

      this.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      this.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      this.canvas.addEventListener('mousedown', handleTouchStart);
      this.canvas.addEventListener('mouseup', handleTouchEnd);

      // Keyboard Controls (Barra spaziatrice / Frecce)
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyW') {
          if (this.isModalActive()) {
            e.preventDefault();
            this.audio.init();
            this.audio.resume();

            if (this.gameState === 'READY') {
              this.startGame();
            } else if (this.gameState === 'GAMEOVER') {
              this.restartGame();
            } else if (this.gameState === 'PLAYING') {
              this.surfer.startPump();
            }
          }
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyW') {
          if (this.gameState === 'PLAYING') {
            this.surfer.releasePump();
          }
        }
      });
    }

    isModalActive() {
      const modal = document.getElementById('surfGameModalOverlay');
      return modal && modal.classList.contains('active');
    }

    startGame() {
      this.gameState = 'PLAYING';
      this.timeSec = 0;
      this.world.initWorldElements();
      this.surfer.reset();
      this.particleSys.clear();
      this.audio.init();
      this.audio.resume();

      const startPrompt = document.getElementById('surfStartPrompt');
      if (startPrompt) startPrompt.style.display = 'none';

      this.hideOverlayModals();
      this.lastTimestamp = performance.now();

      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.loop(this.lastTimestamp);
    }

    restartGame() {
      this.startGame();
    }

    loop(timestamp) {
      if (this.gameState !== 'PLAYING') return;

      const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = timestamp;
      this.timeSec += dt;

      // Aggiorna Mondo e Fisica
      this.world.update(this.timeSec);
      this.surfer.update(this.world, this.particleSys, this.audio, this.timeSec);
      this.particleSys.update();

      // Camera morbida che segue il surfer
      const targetCamX = this.surfer.x - 110;
      this.cameraX += (targetCamX - this.cameraX) * 0.15;

      // Render scena
      this.renderer.render(this.world, this.surfer, this.particleSys, this.cameraX, this.timeSec);

      // Aggiorna HUD in tempo reale
      this.updateHUD();

      this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }

    updateHUD() {
      const scoreEl = document.getElementById('surfLiveScore');
      const comboEl = document.getElementById('surfLiveCombo');
      const distEl = document.getElementById('surfLiveDist');
      const shellsEl = document.getElementById('surfLiveShells');

      if (scoreEl) scoreEl.textContent = this.surfer.score.toLocaleString();
      if (distEl) distEl.textContent = `${this.surfer.distance}m`;
      if (shellsEl) shellsEl.textContent = this.surfer.shellsCollected;

      if (comboEl) {
        if (this.surfer.comboCount > 1) {
          comboEl.textContent = `x${this.surfer.comboCount} COMBO!`;
          comboEl.style.display = 'inline-block';
        } else {
          comboEl.style.display = 'none';
        }
      }
    }

    endGame() {
      this.gameState = 'GAMEOVER';
      const isNew = this.saveRecords();
      this.updateRecordsUI();

      if (isNew) {
        this.audio.playNewRecord();
      }

      // Mostra GameOver Modal
      const modal = document.getElementById('surfGameOverModal');
      const finalScoreEl = document.getElementById('surfFinalScore');
      const finalDistEl = document.getElementById('surfFinalDist');
      const finalBarrelEl = document.getElementById('surfFinalBarrel');
      const newRecordBadge = document.getElementById('surfNewRecordBadge');

      if (finalScoreEl) finalScoreEl.textContent = this.surfer.score.toLocaleString();
      if (finalDistEl) finalDistEl.textContent = `${this.surfer.distance}m`;
      if (finalBarrelEl) finalBarrelEl.textContent = `${this.surfer.barrelTimer.toFixed(1)}s`;
      if (newRecordBadge) newRecordBadge.style.display = isNew ? 'inline-block' : 'none';

      if (modal) modal.classList.add('active');
    }

    hideOverlayModals() {
      const goModal = document.getElementById('surfGameOverModal');
      if (goModal) goModal.classList.remove('active');
    }

    updateRecordsUI() {
      const highEl = document.getElementById('surfRecordScore');
      const bestBarrelEl = document.getElementById('surfRecordBarrel');
      const bestDistEl = document.getElementById('surfRecordDist');

      if (highEl) highEl.textContent = this.highScore.toLocaleString();
      if (bestBarrelEl) bestBarrelEl.textContent = `${this.bestBarrelTime}s`;
      if (bestDistEl) bestDistEl.textContent = `${this.bestDistance}m`;
    }

    toggleAudioMute() {
      if (!this.audio) return false;
      const isMuted = this.audio.toggleMute();
      const muteBtn = document.getElementById('btnSurfMute');
      if (muteBtn) {
        muteBtn.textContent = isMuted ? '🔇 Audio Off' : '🔊 Audio On';
      }
      return isMuted;
    }
  }

  // Istanza globale del gioco
  window.SalentoSurf = new SalentoSurfEngine();

})(window);
