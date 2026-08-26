/**
 * ==============================================================================
 * SALENTO PIXEL SURF - AUTHENTIC RETRO SURFING ENGINE
 * ==============================================================================
 * Un vero simulatore di surf arcade in pixel art per PietroBnB.
 * Fisica realistica di surfing su onda dinamica:
 * - Trimming e Pumping su e giù lungo la parete dell'onda
 * - Bottom Turn dal fondo per risalire a tutta velocità
 * - Snap & Off-the-Lip sulla cresta con spruzzi d'acqua
 * - Cutback per ritornare nella tasca (pocket)
 * - Hand Drag & Stall per farsi inglobare nel Tubo / Barrel
 * - Floater sulla cresta che frange
 * - Aerial sopra il lip con atterraggio sulla parete
 * - Sistema audio 8-bit Web Audio con eco del tubo
 * - Controlli touch per smartphone (gesti drag/swipe fluidi + D-Pad virtuale)
 */

(function (window) {
  'use strict';

  // ----------------------------------------------------------------------------
  // 1. COSTANTI E CONFIGURAZIONE DEL MONDO D'ONDA
  // ----------------------------------------------------------------------------
  const SURF_CONFIG = {
    CANVAS_WIDTH: 420,
    CANVAS_HEIGHT: 240,
    
    // Geometria dell'onda
    LIP_TOP_Y: 72,         // Altezza cresta / lip
    TROUGH_BOTTOM_Y: 195,  // Altezza fondo / base dell'onda
    BARREL_X_BASE: 80,     // Posizione orizzontale del tubo
    SHOULDER_X_MAX: 380,   // Fine della spalla dell'onda
    
    // Fisica di surf
    GRAVITY: 0.32,
    BOTTOM_TURN_BOOST: 1.45,
    PUMP_ACCEL: 0.22,
    STALL_DRAG: 0.35,
    SURFACE_FRICTION: 0.985,
    MAX_SURF_SPEED: 11.5,
    MIN_SURF_SPEED: 2.2,
  };

  // Skin Surfer
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
      name: 'Scirocco Gold',
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
  // 2. SINTETIZZATORE AUDIO WEB AUDIO 8-BIT & TUBO
  // ----------------------------------------------------------------------------
  class RetroSurfAudio {
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
        this.initOceanAmbience();
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

    initOceanAmbience() {
      if (!this.ctx) return;
      try {
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
        this.waveFilterNode.frequency.value = 450;

        this.waveGainNode = this.ctx.createGain();
        this.waveGainNode.gain.value = this.isMuted ? 0 : 0.035;

        whiteNoise.connect(this.waveFilterNode);
        this.waveFilterNode.connect(this.waveGainNode);
        this.waveGainNode.connect(this.ctx.destination);
        whiteNoise.start(0);
        this.waveNoiseNode = whiteNoise;
      } catch (e) {}
    }

    setOceanMood(inBarrel, speed) {
      if (!this.ctx || !this.waveFilterNode || !this.waveGainNode || this.isMuted) return;
      const t = this.ctx.currentTime;
      if (inBarrel) {
        // Eco sordo e risonante dentro il tubo
        this.waveFilterNode.frequency.setTargetAtTime(950, t, 0.08);
        this.waveGainNode.gain.setTargetAtTime(0.08, t, 0.08);
      } else {
        const freq = 380 + speed * 45;
        this.waveFilterNode.frequency.setTargetAtTime(freq, t, 0.1);
        this.waveGainNode.gain.setTargetAtTime(0.038, t, 0.1);
      }
    }

    playSnapSpray() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.14);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    }

    playCutbackCarve() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    }

    playTubeSpit() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        const t = this.ctx.currentTime + i * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.13);
      });
    }

    playAirLaunch() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(740, t + 0.18);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    }

    playWipeout() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(50, t + 0.4);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.42);
    }

    playScoreChime() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t); // B5
      osc.frequency.setValueAtTime(1318.51, t + 0.07); // E6

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    }

    playNewRecord() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((freq, i) => {
        const t = this.ctx.currentTime + i * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      });
    }
  }

  // ----------------------------------------------------------------------------
  // 3. MOTORE PARTICELLE & SPRUZZI D'ACQUA (CARVING SPRAY & FOAM)
  // ----------------------------------------------------------------------------
  class SurfParticleEngine {
    constructor() {
      this.particles = [];
      this.maxParticles = 160;
    }

    add(x, y, vx, vy, color, size = 2, life = 24, type = 'spray') {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }
      this.particles.push({
        x, y, vx, vy, color, size, life, maxLife: life, type
      });
    }

    createCarveSpray(x, y, angle, speed) {
      const sprayCount = 4 + Math.floor(speed * 0.6);
      for (let i = 0; i < sprayCount; i++) {
        // Spruzzo scagliato all'indietro rispetto all'angolo di carving
        const sprayAngle = angle + Math.PI + (Math.random() * 0.8 - 0.4);
        const spraySpeed = 2.0 + Math.random() * (speed * 0.6);
        const colors = ['#FFFFFF', '#E0F7FA', '#B2EBF2'];
        const col = colors[Math.floor(Math.random() * colors.length)];

        this.add(
          x - Math.cos(angle) * 8,
          y - Math.sin(angle) * 8,
          Math.cos(sprayAngle) * spraySpeed,
          Math.sin(sprayAngle) * spraySpeed - 1.2,
          col,
          Math.random() > 0.4 ? 2 : 3,
          18 + Math.floor(Math.random() * 12),
          'carve'
        );
      }
    }

    createSnapBurst(x, y) {
      for (let i = 0; i < 18; i++) {
        const sprayAngle = -Math.PI * 0.7 + (Math.random() * 0.9 - 0.45);
        const spraySpeed = 3.5 + Math.random() * 4.5;
        this.add(
          x,
          y,
          Math.cos(sprayAngle) * spraySpeed,
          Math.sin(sprayAngle) * spraySpeed,
          '#FFFFFF',
          Math.random() > 0.5 ? 3 : 4,
          26 + Math.floor(Math.random() * 12),
          'snap'
        );
      }
    }

    createTubeMist(barrelX, barrelY) {
      for (let i = 0; i < 3; i++) {
        const colors = ['#FFFFFF', '#E0F7FA', '#80DEEA', '#FFE082'];
        const col = colors[Math.floor(Math.random() * colors.length)];
        this.add(
          barrelX + (Math.random() * 30 - 15),
          barrelY + (Math.random() * 40 - 20),
          1.2 + Math.random() * 2.2,
          -0.5 + (Math.random() * 1.5 - 0.75),
          col,
          2,
          16 + Math.floor(Math.random() * 10),
          'mist'
        );
      }
    }

    createWipeoutSplash(x, y) {
      for (let i = 0; i < 28; i++) {
        const angle = -Math.PI * 0.5 + (Math.random() * Math.PI - Math.PI * 0.5);
        const speed = 2.0 + Math.random() * 5.0;
        this.add(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          '#FFFFFF',
          Math.random() > 0.5 ? 3 : 4,
          30 + Math.floor(Math.random() * 15),
          'splash'
        );
      }
    }

    update() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        // Gravità sulle gocce d'acqua
        p.vy += 0.16;

        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    draw(ctx) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
    }

    clear() {
      this.particles = [];
    }
  }

  // ----------------------------------------------------------------------------
  // 4. GENERATORE DELL'ONDA SALENTINA & BARREL DINAMICO
  // ----------------------------------------------------------------------------
  class SalentoWave {
    constructor() {
      this.barrelX = SURF_CONFIG.BARREL_X_BASE;
      this.lipPitchSpeed = 1.0;
      this.waveHeight = 110;
      this.curlPhase = 0;
      this.foamPuffs = [];
      this.initFoamPuffs();
    }

    initFoamPuffs() {
      this.foamPuffs = [];
      for (let i = 0; i < 16; i++) {
        this.foamPuffs.push({
          x: Math.random() * 120,
          y: SURF_CONFIG.TROUGH_BOTTOM_Y + Math.random() * 20,
          size: 4 + Math.random() * 8,
          speed: 1.2 + Math.random() * 1.5
        });
      }
    }

    update(timeSec) {
      this.curlPhase = (timeSec * 2.2) % (Math.PI * 2);
      
      // Il tubo avanza e retrocede leggermente come un'onda vera che pulsa
      this.barrelX = SURF_CONFIG.BARREL_X_BASE + Math.sin(timeSec * 0.8) * 18;

      // Aggiorna schiuma della spuma in basso a sinistra
      for (let i = 0; i < this.foamPuffs.length; i++) {
        const p = this.foamPuffs[i];
        p.x -= p.speed;
        if (p.x < -20) {
          p.x = this.barrelX + Math.random() * 60;
          p.y = SURF_CONFIG.TROUGH_BOTTOM_Y + Math.random() * 20;
        }
      }
    }

    // Calcola l'altezza Y della superficie dell'onda in base alla posizione X
    getSurfaceY(x) {
      // Profilo della parete dell'onda: dal fondo a destra risale fino alla cresta
      const normX = Math.max(0, Math.min(1, (x - this.barrelX) / (SURF_CONFIG.SHOULDER_X_MAX - this.barrelX)));
      
      // Curva di transizione naturale dell'onda (Sigmoide / Curva d'acqua concava)
      const heightFactor = Math.pow(1 - normX, 1.35);
      return SURF_CONFIG.TROUGH_BOTTOM_Y - (heightFactor * this.waveHeight);
    }

    // Calcola l'inclinazione dell'onda a una data X
    getSurfaceSlope(x) {
      const delta = 4;
      const y1 = this.getSurfaceY(x - delta);
      const y2 = this.getSurfaceY(x + delta);
      return Math.atan2(y2 - y1, delta * 2);
    }

    // Calcola se la coordinata X/Y è all'interno del barile / tubo dell'onda
    isInBarrel(x, y) {
      const lipY = SURF_CONFIG.LIP_TOP_Y;
      const isBehindLip = x <= this.barrelX + 45;
      const isUnderLip = y >= lipY + 8 && y <= SURF_CONFIG.TROUGH_BOTTOM_Y - 10;
      return isBehindLip && isUnderLip;
    }

    // Calcola se l'onda si sta chiudendo addosso al surfer (Wipeout da tubo troppo profondo)
    isCrushedByLip(x, y) {
      return x < this.barrelX - 25;
    }
  }

  // ----------------------------------------------------------------------------
  // 5. FISICA DEL VERO SURFISTA (CARVE, BOTTOM TURN, SNAP, CUTBACK, TUBE)
  // ----------------------------------------------------------------------------
  class TrueSurfer {
    constructor(skinId = 'pietro') {
      this.skin = SURFER_SKINS[skinId] || SURFER_SKINS.pietro;
      this.reset();
    }

    reset() {
      // Posizione iniziale sulla parete dell'onda
      this.x = 180;
      this.y = 140;
      this.vx = 4.5;
      this.vy = 0;
      this.angle = 0;
      this.targetAngle = 0;
      this.speed = 4.8;
      
      // Stati reali del surf:
      // 'TRIMMING', 'BOTTOM_TURN', 'TOP_TURN_SNAP', 'CUTBACK', 'IN_BARREL', 'FLOATER', 'AIR', 'WIPEOUT'
      this.state = 'TRIMMING';
      
      // Comandi attivi
      this.inputSteerY = 0; // -1 (up toward lip), +1 (down to trough)
      this.inputSteerX = 0; // -1 (stall / hand drag back), +1 (pump forward)
      this.isStalling = false;
      this.isPumping = false;
      this.isSnapRequested = false;

      // Metriche e combo
      this.score = 0;
      this.rideTime = 0;
      this.barrelTimer = 0;
      this.totalBarrelTime = 0;
      this.carveStreak = 0;
      this.comboMultiplier = 1;
      this.wipeoutTimer = 0;
      this.lastManeuver = '';
      this.maneuverTimer = 0;
      this.maneuverColor = '#FFFFFF';
      
      // Scia della tavola
      this.wakeTrail = [];
    }

    setSkin(skinId) {
      if (SURFER_SKINS[skinId]) {
        this.skin = SURFER_SKINS[skinId];
      }
    }

    setInput(steerX, steerY, isStall = false, isPump = false) {
      this.inputSteerX = steerX;
      this.inputSteerY = steerY;
      this.isStalling = isStall;
      this.isPumping = isPump;
    }

    triggerSnapAction() {
      if (this.state !== 'WIPEOUT') {
        this.isSnapRequested = true;
      }
    }

    update(wave, particles, audio, timeSec) {
      if (this.state === 'WIPEOUT') {
        this.updateWipeout(wave, particles);
        return;
      }

      this.rideTime += 1 / 60;

      // Scia della tavola d'acqua
      this.wakeTrail.push({ x: this.x, y: this.y, life: 14, angle: this.angle });
      if (this.wakeTrail.length > 20) this.wakeTrail.shift();
      for (let i = this.wakeTrail.length - 1; i >= 0; i--) {
        this.wakeTrail[i].life--;
        if (this.wakeTrail[i].life <= 0) this.wakeTrail.splice(i, 1);
      }

      // Altezza dell'onda nel punto attuale
      const waveSurfaceY = wave.getSurfaceY(this.x);
      const waveSlope = wave.getSurfaceSlope(this.x);

      // CONTROLLO TUBING (IN THE BARREL)
      const inBarrel = wave.isInBarrel(this.x, this.y);
      if (inBarrel && this.state !== 'AIR') {
        this.state = 'IN_BARREL';
        this.barrelTimer += 1 / 60;
        this.totalBarrelTime += 1 / 60;
        
        // Punti continui a raffica nel tubo!
        const pts = Math.floor(15 * this.comboMultiplier);
        this.score += pts;
        
        particles.createTubeMist(wave.barrelX + 15, this.y);
        audio.setOceanMood(true, this.speed);

        if (Math.random() < 0.15) {
          this.showManeuver(`🌊 DEEP IN THE BARREL! +${pts}`, '#38BDF8');
        }

        // Se sei stato nel tubo e poi esci a destra -> SPIT OUT BONUS!
        if (this.x > wave.barrelX + 50 && this.barrelTimer > 1.2) {
          const spitPts = Math.floor(1200 * this.barrelTimer * this.comboMultiplier);
          this.score += spitPts;
          this.showManeuver(`💥 SPIT OUT EXIT! +${spitPts}`, '#F59E0B');
          audio.playTubeSpit();
          this.barrelTimer = 0;
          this.comboMultiplier++;
        }

        // Controllo schiacciamento se troppo profondo
        if (wave.isCrushedByLip(this.x, this.y)) {
          this.triggerWipeout('💥 CRUSHED BY THE LIP!', particles, audio);
          return;
        }

      } else {
        if (this.state === 'IN_BARREL') {
          this.state = 'TRIMMING';
          this.barrelTimer = 0;
          audio.setOceanMood(false, this.speed);
        }
      }

      // FISICA IN ARIA (AERIAL)
      if (this.state === 'AIR') {
        this.vy += SURF_CONFIG.GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        // Rotazione aria
        this.angle += 0.08;

        // Atterraggio sull'onda
        if (this.y >= waveSurfaceY - 4) {
          this.y = waveSurfaceY;
          this.state = 'TRIMMING';
          this.vy = 0;
          this.speed = Math.min(SURF_CONFIG.MAX_SURF_SPEED, this.speed + 2.0);
          this.comboMultiplier++;
          const airPts = 850 * this.comboMultiplier;
          this.score += airPts;
          this.showManeuver(`🚀 AIR REVERSE LANDED! +${airPts}`, '#10B981');
          particles.createSnapBurst(this.x, this.y);
          audio.playSnapSpray();
        }
        return;
      }

      // FISICA REALE SULL'ONDA (SURFING SULLA PARETE)

      // 1. DINAMICA VERTICALE (UP / DOWN SULLA PARETE)
      if (this.inputSteerY > 0.2) {
        // Scendendo verso il fondo dell'onda (Bottom Turn Drop)
        // La gravità fa accelerare il surfer verso il basso
        this.vy += 0.45;
        this.speed = Math.min(SURF_CONFIG.MAX_SURF_SPEED, this.speed + 0.16);
        this.targetAngle = 0.45; // Prua inclinata verso il basso
        
        if (this.y > SURF_CONFIG.TROUGH_BOTTOM_Y - 20) {
          this.state = 'BOTTOM_TURN';
          // Bottom Turn energico: pronto per risalire
          if (Math.random() < 0.4) {
            particles.createCarveSpray(this.x, this.y, this.angle, this.speed);
          }
        }
      } else if (this.inputSteerY < -0.2) {
        // Risalendo la parete verso la cresta (Drive to the Lip)
        this.vy -= 0.55;
        this.targetAngle = -0.55; // Prua inclinata verso l'alto

        // Se si raggiunge la cresta con velocità -> Manovra radicale!
        if (this.y <= SURF_CONFIG.LIP_TOP_Y + 12) {
          if (this.speed > 7.5 && this.isSnapRequested) {
            // SNAP / OFF THE LIP!
            this.state = 'TOP_TURN_SNAP';
            this.speed = this.speed * 0.75;
            this.vy = 2.5; // Rimbalzo verso il basso
            this.targetAngle = 0.8;
            this.comboMultiplier++;
            const snapPts = 600 * this.comboMultiplier;
            this.score += snapPts;
            this.showManeuver(`⚡ RADICAL SNAP! +${snapPts}`, '#EC4899');
            particles.createSnapBurst(this.x, this.y);
            audio.playSnapSpray();
            this.isSnapRequested = false;
          } else if (this.speed > 8.5 && this.inputSteerY < -0.6) {
            // AERIAL LAUNCH FUORI DALL'ONDA!
            this.state = 'AIR';
            this.vy = -5.8;
            this.vx = 2.5;
            audio.playAirLaunch();
            this.showManeuver(`🌊 AIR LAUNCH!`, '#6366F1');
            return;
          } else {
            // FLOATER SULLA CRESTA
            this.state = 'FLOATER';
            this.y = SURF_CONFIG.LIP_TOP_Y + 5;
            this.targetAngle = 0.05;
            this.score += 12;
            if (Math.random() < 0.3) {
              particles.createCarveSpray(this.x, this.y, 0, this.speed);
            }
          }
        }
      } else {
        // Nessun input verticale: trim naturale lungo la pendenza
        this.vy *= 0.88;
        this.targetAngle = waveSlope;
        this.state = inBarrel ? 'IN_BARREL' : 'TRIMMING';
      }

      // 2. DINAMICA ORIZZONTALE (PUMP / STALL / CUTBACK)
      if (this.isStalling || this.inputSteerX < -0.2) {
        // HAND DRAG / STALL: Rallenta per farsi risucchiare nel tubo
        this.speed = Math.max(SURF_CONFIG.MIN_SURF_SPEED, this.speed - SURF_CONFIG.STALL_DRAG);
        this.x -= 2.2;
        particles.add(this.x - 4, this.y + 4, -1.8, -0.6, '#FFFFFF', 2, 10, 'spray');

        // Se eravamo lontani a destra e torniamo indietro -> CUTBACK!
        if (this.x > 240 && this.state !== 'CUTBACK') {
          this.state = 'CUTBACK';
          const cutPts = 450 * this.comboMultiplier;
          this.score += cutPts;
          this.showManeuver(`🔄 ROUNDHOUSE CUTBACK! +${cutPts}`, '#14B8A6');
          particles.createSnapBurst(this.x, this.y);
          audio.playCutbackCarve();
        }
      } else if (this.isPumping || this.inputSteerX > 0.2) {
        // PUMP DOWN THE LINE: Spinta in avanti per superare la sezione
        this.speed = Math.min(SURF_CONFIG.MAX_SURF_SPEED, this.speed + SURF_CONFIG.PUMP_ACCEL);
        this.x += 1.8;
      } else {
        // Velocità naturale di navigazione
        this.x += (190 - this.x) * 0.02;
        this.speed += (5.0 - this.speed) * 0.015;
      }

      // Aggiorna posizione Y
      this.y += this.vy;
      
      // Limiti di altezza sull'onda
      if (this.y > SURF_CONFIG.TROUGH_BOTTOM_Y) {
        this.y = SURF_CONFIG.TROUGH_BOTTOM_Y;
        this.vy = -this.vy * 0.4;
      }
      if (this.y < SURF_CONFIG.LIP_TOP_Y) {
        this.y = SURF_CONFIG.LIP_TOP_Y;
      }

      // Morbidezza rotazione tavola
      this.angle += (this.targetAngle - this.angle) * 0.2;

      // Punti continui di surf
      this.score += Math.floor(this.speed * 0.2);

      // Aggiorna audio continuo
      audio.setOceanMood(this.state === 'IN_BARREL', this.speed);

      // Timer testo manovra
      if (this.maneuverTimer > 0) {
        this.maneuverTimer--;
      }
    }

    triggerWipeout(reason, particles, audio) {
      this.state = 'WIPEOUT';
      this.wipeoutTimer = 80;
      this.comboMultiplier = 1;
      this.barrelTimer = 0;
      this.vy = -3.5;
      this.vx = -1.5;

      particles.createWipeoutSplash(this.x, this.y);
      audio.playWipeout();
      this.showManeuver(reason || '💥 WIPEOUT!', '#EF4444');

      if (navigator.vibrate) {
        try { navigator.vibrate([60, 50, 100]); } catch (e) {}
      }
    }

    updateWipeout(wave, particles) {
      this.wipeoutTimer--;
      this.x += this.vx;
      this.y += this.vy;
      this.vy += SURF_CONFIG.GRAVITY * 0.7;
      this.angle += 0.18;

      if (this.y > SURF_CONFIG.TROUGH_BOTTOM_Y + 10) {
        this.y = SURF_CONFIG.TROUGH_BOTTOM_Y + 10;
        this.vx *= 0.85;
        this.vy = 0;
      }

      if (this.wipeoutTimer <= 0) {
        // Respawn sulla parete dell'onda
        this.state = 'TRIMMING';
        this.x = 180;
        this.y = 140;
        this.speed = 4.8;
        this.vy = 0;
        this.angle = 0;
      }
    }

    showManeuver(text, color = '#FFFFFF') {
      this.lastManeuver = text;
      this.maneuverColor = color;
      this.maneuverTimer = 55;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(Math.round(this.x), Math.round(this.y));
      ctx.rotate(this.angle);

      // Disegna Tavola da Surf e Surfer autentico
      this.drawAuthenticSurfboard(ctx);
      this.drawAuthenticSurfer(ctx);

      ctx.restore();

      // Disegna Testo Manovra Eseguita
      if (this.maneuverTimer > 0) {
        ctx.save();
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.maneuverColor || '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 5;
        const textY = Math.round(this.y) - 26 - (55 - this.maneuverTimer) * 0.35;
        ctx.fillText(this.lastManeuver, Math.round(this.x), textY);
        ctx.restore();
      }
    }

    drawAuthenticSurfboard(ctx) {
      const s = this.skin;
      // Tavola da surf in prospettiva laterale / 3/4
      ctx.fillStyle = s.boardColor || '#FFFFFF';
      ctx.fillRect(-16, 4, 32, 4);
      ctx.fillRect(-14, 3, 28, 6);
      ctx.fillRect(-18, 5, 3, 2); // Nose rocker
      ctx.fillRect(15, 5, 2, 2);  // Tail

      // Pinna posteriore immersa nell'acqua
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(8, 7, 4, 3);

      // Riga / Stringer decorativo della tavola
      ctx.fillStyle = s.boardStripe || '#FF385C';
      ctx.fillRect(-13, 5, 26, 2);
    }

    drawAuthenticSurfer(ctx) {
      const s = this.skin;
      const isLowStance = this.state === 'IN_BARREL' || this.state === 'BOTTOM_TURN' || this.isStalling;

      const hipY = isLowStance ? 0 : -4;
      const headY = isLowStance ? -8 : -16;

      // Gambe flesse in stance da surf
      ctx.fillStyle = s.skinColor;
      ctx.fillRect(-6, hipY + 4, 4, 4); // Gamba posteriore
      ctx.fillRect(3, hipY + 4, 4, 4);  // Gamba anteriore

      // Costume da bagno
      ctx.fillStyle = s.trunksColor;
      ctx.fillRect(-7, hipY, 14, 5);

      // Busto
      ctx.fillStyle = s.skinColor;
      ctx.fillRect(-5, headY + 5, 10, 6);

      // Braccia in posizione da surf reale (balance & hand drag)
      if (this.state === 'IN_BARREL' || this.isStalling) {
        // Braccio posteriore che tocca l'onda (Hand Drag)
        ctx.fillRect(-10, headY + 8, 5, 3);
        ctx.fillRect(-12, headY + 11, 3, 3); // Mano nell'acqua
        // Braccio anteriore proteso in avanti
        ctx.fillRect(5, headY + 4, 6, 3);
      } else if (this.state === 'TOP_TURN_SNAP') {
        // Torsione radicale delle braccia
        ctx.fillRect(-8, headY + 2, 4, 4);
        ctx.fillRect(6, headY + 7, 5, 3);
      } else {
        // Braccia aperte in perfetto equilibrio
        ctx.fillRect(-9, headY + 6, 4, 3);
        ctx.fillRect(5, headY + 6, 5, 3);
      }

      // Testa
      ctx.fillStyle = s.skinColor;
      ctx.fillRect(-4, headY - 4, 8, 8);

      // Capelli
      ctx.fillStyle = s.hairColor;
      ctx.fillRect(-5, headY - 6, 10, 4);
      ctx.fillRect(-5, headY - 4, 3, 3);

      // Occhiali da sole 😎
      if (s.glasses) {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(-1, headY - 2, 6, 3);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(1, headY - 2, 1, 1);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 6. RENDERER GRAFICO RETRO DEL VERO MARE DEL SALENTO
  // ----------------------------------------------------------------------------
  class TrueSurfRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
    }

    render(wave, surfer, particles, timeSec) {
      const ctx = this.ctx;
      const width = SURF_CONFIG.CANVAS_WIDTH;
      const height = SURF_CONFIG.CANVAS_HEIGHT;

      ctx.clearRect(0, 0, width, height);

      // 1. Cielo Salentino Soleggiato
      const skyGrad = ctx.createLinearGradient(0, 0, 0, SURF_CONFIG.TROUGH_BOTTOM_Y);
      skyGrad.addColorStop(0, '#7FD1F7');
      skyGrad.addColorStop(0.55, '#BAE6FD');
      skyGrad.addColorStop(1, '#FEF08A');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Sole e Nuvole Pixel
      this.drawSunAndClouds(ctx, timeSec);

      // 3. Orizzonte Costa Salentina & Mare Calmo in lontananza
      this.drawCoastline(ctx);

      // 4. LA GRANDE ONDA CON TUBO E PARETE D'ACQUA (PIXEL WAVE ENGINE)
      this.drawBigCurlingWave(ctx, wave, timeSec);

      // 5. Scia della tavola & Particelle d'acqua
      this.drawWakeTrails(ctx, surfer);
      particles.draw(ctx);

      // 6. Surfer
      surfer.draw(ctx);

      // 7. Il Lip / Ricciolo del Barile in Primo Piano (Curling Foam Lip)
      this.drawCurlingLipForeground(ctx, wave, timeSec);

      // 8. Schiuma del Fondale e Spuma
      this.drawBottomFoam(ctx, wave);
    }

    drawSunAndClouds(ctx, timeSec) {
      // Sole
      const sunX = SURF_CONFIG.CANVAS_WIDTH - 60;
      const sunY = 32;
      ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FDE047';
      ctx.fillRect(sunX - 10, sunY - 10, 20, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sunX - 4, sunY - 4, 8, 8);

      // Nuvole lente
      ctx.fillStyle = '#FFFFFF';
      const cx1 = (30 + timeSec * 4) % (SURF_CONFIG.CANVAS_WIDTH + 60) - 30;
      ctx.fillRect(cx1, 24, 28, 7);
      ctx.fillRect(cx1 + 4, 20, 20, 11);

      const cx2 = (220 + timeSec * 3) % (SURF_CONFIG.CANVAS_WIDTH + 60) - 30;
      ctx.fillRect(cx2, 38, 36, 8);
      ctx.fillRect(cx2 + 6, 33, 24, 14);
    }

    drawCoastline(ctx) {
      const baseY = SURF_CONFIG.LIP_TOP_Y + 18;
      
      // Faraglioni / Costa verde di Gallipoli
      ctx.fillStyle = '#64748B';
      ctx.fillRect(160, baseY - 16, 45, 16);
      ctx.fillRect(170, baseY - 22, 25, 6);
      ctx.fillRect(260, baseY - 12, 60, 12);

      // Linea di mare calmo all'orizzonte
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(0, baseY, SURF_CONFIG.CANVAS_WIDTH, 12);
    }

    drawBigCurlingWave(ctx, wave, timeSec) {
      const width = SURF_CONFIG.CANVAS_WIDTH;
      const height = SURF_CONFIG.CANVAS_HEIGHT;
      const step = 2;

      // Disegna la parete dell'onda colonna per colonna con strati d'acqua
      for (let x = 0; x < width; x += step) {
        const surfaceY = Math.round(wave.getSurfaceY(x));
        const seabedY = SURF_CONFIG.TROUGH_BOTTOM_Y + 22;

        // Strato 1: Cresta / Superficie Turchese Chiaro (#22D3EE)
        ctx.fillStyle = '#22D3EE';
        ctx.fillRect(x, surfaceY, step, 12);

        // Strato 2: Corpo d'Acqua Salento Cyan (#0284C7)
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(x, surfaceY + 12, step, 26);

        // Strato 3: Ionio Profondo Blu Marino (#0369A1 / #075985)
        ctx.fillStyle = '#0369A1';
        ctx.fillRect(x, surfaceY + 38, step, Math.max(0, seabedY - (surfaceY + 38)));

        // Fondale Sabbioso Dorato
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(x, seabedY, step, 6);
        ctx.fillStyle = '#92400E';
        ctx.fillRect(x, seabedY + 6, step, height - (seabedY + 6));
      }

      // Profondità del Tubo / Cave del Barile (Oscurità translucida interna)
      const barrelX = Math.round(wave.barrelX);
      const tubeGrad = ctx.createRadialGradient(barrelX + 15, SURF_CONFIG.LIP_TOP_Y + 45, 10, barrelX + 15, SURF_CONFIG.LIP_TOP_Y + 45, 65);
      tubeGrad.addColorStop(0, 'rgba(3, 105, 161, 0.85)');
      tubeGrad.addColorStop(0.7, 'rgba(2, 132, 199, 0.45)');
      tubeGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');

      ctx.fillStyle = tubeGrad;
      ctx.beginPath();
      ctx.ellipse(barrelX + 15, SURF_CONFIG.LIP_TOP_Y + 45, 55, 42, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawCurlingLipForeground(ctx, wave, timeSec) {
      const barrelX = Math.round(wave.barrelX);
      const lipY = SURF_CONFIG.LIP_TOP_Y;

      // Il ricciolo che scavalca e si tuffa in avanti (Curling Lip in Pixel Art)
      ctx.fillStyle = '#22D3EE';
      ctx.fillRect(barrelX - 20, lipY - 6, 60, 14);
      ctx.fillRect(barrelX - 10, lipY + 8, 45, 12);
      ctx.fillRect(barrelX + 5, lipY + 20, 25, 14);

      // Schiuma bianca spumeggiante sul bordo del lip
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(barrelX - 24, lipY - 8, 68, 6);
      ctx.fillRect(barrelX - 6, lipY + 4, 38, 6);
      ctx.fillRect(barrelX + 10, lipY + 16, 22, 6);
      ctx.fillRect(barrelX + 18, lipY + 28, 14, 10); // Goccia che cade

      // Spruzzi d'aria dal barile
      if (Math.sin(timeSec * 6) > 0.2) {
        ctx.fillStyle = '#E0F2FE';
        ctx.fillRect(barrelX + 34, lipY + 24, 4, 4);
        ctx.fillRect(barrelX + 42, lipY + 18, 3, 3);
      }
    }

    drawWakeTrails(ctx, surfer) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < surfer.wakeTrail.length; i++) {
        const pt = surfer.wakeTrail[i];
        const sz = Math.max(1, Math.floor(pt.life / 3.5));
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), sz, sz);
      }
    }

    drawBottomFoam(ctx, wave) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      for (let i = 0; i < wave.foamPuffs.length; i++) {
        const p = wave.foamPuffs[i];
        ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.size), 3);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 7. GESTORE DI GIOCO & CONTROLLI TOUCH PER SMARTPHONE (DRAG & D-PAD)
  // ----------------------------------------------------------------------------
  class SalentoSurfEngine {
    constructor() {
      this.canvas = null;
      this.renderer = null;
      this.wave = null;
      this.surfer = null;
      this.particles = null;
      this.audio = null;

      this.gameState = 'READY'; // 'READY', 'PLAYING', 'GAMEOVER'
      this.timeSec = 0;
      this.highScore = 0;
      this.bestBarrelTime = 0;
      this.bestRideTime = 0;
      this.animationFrameId = null;
      this.lastTimestamp = 0;

      this.selectedSkinId = 'pietro';
      this.touchStartX = 0;
      this.touchStartY = 0;
      this.isTouchActive = false;

      this.loadSavedRecords();
    }

    loadSavedRecords() {
      try {
        const saved = localStorage.getItem('salento_surf_records_v2');
        if (saved) {
          const data = JSON.parse(saved);
          this.highScore = data.highScore || 0;
          this.bestBarrelTime = data.bestBarrelTime || 0;
          this.bestRideTime = data.bestRideTime || 0;
          this.selectedSkinId = data.selectedSkinId || 'pietro';
        }
      } catch (e) {}
    }

    saveRecords() {
      try {
        const isNew = this.surfer.score > this.highScore;
        if (isNew) this.highScore = this.surfer.score;
        if (this.surfer.totalBarrelTime > this.bestBarrelTime) {
          this.bestBarrelTime = Number(this.surfer.totalBarrelTime.toFixed(1));
        }
        if (this.surfer.rideTime > this.bestRideTime) {
          this.bestRideTime = Number(this.surfer.rideTime.toFixed(1));
        }

        const data = {
          highScore: this.highScore,
          bestBarrelTime: this.bestBarrelTime,
          bestRideTime: this.bestRideTime,
          selectedSkinId: this.selectedSkinId
        };
        localStorage.setItem('salento_surf_records_v2', JSON.stringify(data));
        return isNew;
      } catch (e) {
        return false;
      }
    }

    init(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      this.canvas.width = SURF_CONFIG.CANVAS_WIDTH;
      this.canvas.height = SURF_CONFIG.CANVAS_HEIGHT;

      this.renderer = new TrueSurfRenderer(this.canvas);
      this.wave = new SalentoWave();
      this.surfer = new TrueSurfer(this.selectedSkinId);
      this.particles = new SurfParticleEngine();
      this.audio = new RetroSurfAudio();

      this.bindControls();
      this.updateRecordsUI();

      // Render iniziale
      this.renderer.render(this.wave, this.surfer, this.particles, 0);
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

      // TOUCH GESTURES FLUIDI PER SMARTPHONE
      // Trascinamento / Pressione direzionale:
      // - Swipe SU: sali verso la cresta (Off-the-lip / Floater)
      // - Swipe GIÙ: scendi verso la base (Bottom Turn / Carving)
      // - Swipe SINISTRA (o tieni premuto lato sinistro): STALL / TUBE DRAG nel barile!
      // - Swipe DESTRA (o tieni premuto lato destro): PUMP / SPEED in avanti!
      // - Doppio Tap: SNAP RADICALE!

      let lastTapTime = 0;

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

        const touch = e.touches ? e.touches[0] : e;
        const rect = this.canvas.getBoundingClientRect();
        this.touchStartX = touch.clientX - rect.left;
        this.touchStartY = touch.clientY - rect.top;
        this.isTouchActive = true;

        // Check Double Tap per Snap
        const now = Date.now();
        if (now - lastTapTime < 280) {
          this.surfer.triggerSnapAction();
        }
        lastTapTime = now;

        this.processTouchPosition(this.touchStartX, this.touchStartY, rect);
      };

      const handleTouchMove = (e) => {
        if (!this.isTouchActive || this.gameState !== 'PLAYING') return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const rect = this.canvas.getBoundingClientRect();
        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;

        const deltaX = currentX - this.touchStartX;
        const deltaY = currentY - this.touchStartY;

        let steerX = 0;
        let steerY = 0;

        if (Math.abs(deltaY) > 8) {
          steerY = deltaY > 0 ? 1 : -1;
        }
        if (Math.abs(deltaX) > 8) {
          steerX = deltaX > 0 ? 1 : -1;
        }

        const isStall = deltaX < -15;
        const isPump = deltaX > 15;

        this.surfer.setInput(steerX, steerY, isStall, isPump);
      };

      const handleTouchEnd = (e) => {
        e.preventDefault();
        this.isTouchActive = false;
        if (this.surfer) {
          this.surfer.setInput(0, 0, false, false);
        }
      };

      this.processTouchPosition = (x, y, rect) => {
        // Se tocca a sinistra dello schermo -> Stall nel tubo
        // Se tocca a destra -> Pump in avanti
        // Se tocca in alto -> Sali alla cresta
        // Se tocca in basso -> Scendi per bottom turn
        const normX = x / rect.width;
        const normY = y / rect.height;

        let steerX = 0;
        let steerY = 0;
        let isStall = false;
        let isPump = false;

        if (normY < 0.38) steerY = -1; // Up
        else if (normY > 0.62) steerY = 1; // Down

        if (normX < 0.35) {
          steerX = -1;
          isStall = true;
        } else if (normX > 0.65) {
          steerX = 1;
          isPump = true;
        }

        this.surfer.setInput(steerX, steerY, isStall, isPump);
      };

      this.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      this.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      this.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      this.canvas.addEventListener('mousedown', handleTouchStart);
      window.addEventListener('mouseup', handleTouchEnd);

      // CONTROLLI TASTIERA DESKTOP
      const activeKeys = {};
      window.addEventListener('keydown', (e) => {
        activeKeys[e.code] = true;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
          if (this.isModalActive()) {
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

            if (e.code === 'Space') {
              this.surfer.triggerSnapAction();
            }

            this.updateKeyboardInput(activeKeys);
          }
        }
      });

      window.addEventListener('keyup', (e) => {
        activeKeys[e.code] = false;
        if (this.isModalActive()) {
          this.updateKeyboardInput(activeKeys);
        }
      });

      this.updateKeyboardInput = (keys) => {
        let steerX = 0;
        let steerY = 0;

        if (keys['ArrowUp'] || keys['KeyW']) steerY = -1;
        if (keys['ArrowDown'] || keys['KeyS']) steerY = 1;
        if (keys['ArrowLeft'] || keys['KeyA']) steerX = -1;
        if (keys['ArrowRight'] || keys['KeyD']) steerX = 1;

        const isStall = steerX < 0;
        const isPump = steerX > 0;

        if (this.surfer) {
          this.surfer.setInput(steerX, steerY, isStall, isPump);
        }
      };
    }

    isModalActive() {
      const modal = document.getElementById('surfGameModalOverlay');
      return modal && modal.classList.contains('active');
    }

    startGame() {
      this.gameState = 'PLAYING';
      this.timeSec = 0;
      this.surfer.reset();
      this.particles.clear();
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

      // Aggiorna Mondo & Fisica di Surf
      this.wave.update(this.timeSec);
      this.surfer.update(this.wave, this.particles, this.audio, this.timeSec);
      this.particles.update();

      // Render scena
      this.renderer.render(this.wave, this.surfer, this.particles, this.timeSec);

      // Aggiorna HUD
      this.updateHUD();

      this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }

    updateHUD() {
      const scoreEl = document.getElementById('surfLiveScore');
      const comboEl = document.getElementById('surfLiveCombo');
      const distEl = document.getElementById('surfLiveDist');
      const shellsEl = document.getElementById('surfLiveShells');

      if (scoreEl) scoreEl.textContent = this.surfer.score.toLocaleString();
      if (distEl) distEl.textContent = `${this.surfer.rideTime.toFixed(0)}s`;
      if (shellsEl) shellsEl.textContent = `${this.surfer.totalBarrelTime.toFixed(1)}s Tubo`;

      if (comboEl) {
        if (this.surfer.comboMultiplier > 1) {
          comboEl.textContent = `x${this.surfer.comboMultiplier} COMBO!`;
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

      const modal = document.getElementById('surfGameOverModal');
      const finalScoreEl = document.getElementById('surfFinalScore');
      const finalDistEl = document.getElementById('surfFinalDist');
      const finalBarrelEl = document.getElementById('surfFinalBarrel');
      const newRecordBadge = document.getElementById('surfNewRecordBadge');

      if (finalScoreEl) finalScoreEl.textContent = this.surfer.score.toLocaleString();
      if (finalDistEl) finalDistEl.textContent = `${this.surfer.rideTime.toFixed(0)}s`;
      if (finalBarrelEl) finalBarrelEl.textContent = `${this.surfer.totalBarrelTime.toFixed(1)}s`;
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
      if (bestDistEl) bestDistEl.textContent = `${this.bestRideTime}s`;
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
