/**
 * ==============================================================================
 * SALENTO SURF SANDBOX - CASUAL SURF SIM & WAVE GENERATOR
 * ==============================================================================
 * Ispirato a "Surf Sandbox" (Steam indie casual surfing sim).
 * Caratteristiche:
 * - Simulazione fisica realistica dell'acqua a onde continue e fondali personalizzabili
 * - Catching the wave: Nuota (Paddle), aspetta il set, fai il Pop-Up al momento giusto!
 * - Vero Surf: Carving sulla parete, Bottom Turn, Snap, Air section e Tubi profondi (Barreled)
 * - Shorebreak & Wipeouts: Fatti travolgere dalla schiuma con fisica ragdoll/tumble
 * - Sandbox Spot Editor: Personalizza altezza onde, vento (Tramontana/Scirocco), marea e fondale
 * - Modalità Zen / Relax: Galleggia sulla tavola e goditi il rumore rilassante del mare
 * - Selezione Tavole: Shortboard, Longboard, Bodyboard, Bodysurf
 * - Audio sintetizzato Web Audio 8-bit con rumore reale delle onde e risonanza del tubo
 * - Controlli Touch per Smartphone (Joystick/Touch Drag + Pulsanti Azione) & Tastiera
 */

(function (window) {
  'use strict';

  // ----------------------------------------------------------------------------
  // 1. CONFIGURAZIONE E PRESET SPOT SALENTINI
  // ----------------------------------------------------------------------------
  const SANDBOX_CONFIG = {
    CANVAS_WIDTH: 440,
    CANVAS_HEIGHT: 250,
    PHYSICS_FPS: 60,
    NUM_WATER_POINTS: 110,
    SPRING_K: 0.024,
    DAMPING: 0.035,
    SPREAD: 0.24,
  };

  const SPOT_PRESETS = {
    baia_verde: {
      id: 'baia_verde',
      name: 'Baia Verde',
      tag: '🏖️ Onde Pulite & Divertenti',
      swellHeight: 32,
      waveSpeed: 3.8,
      tideDepth: 175,
      windChop: 0.15,
      windType: 'tramontana',
      seabedType: 'sand',
      desc: 'Onde regolari e perfette per carvare e rilassarsi al sole di Gallipoli.'
    },
    mare_cavalli: {
      id: 'mare_cavalli',
      name: 'Mare dei Cavalli',
      tag: '🌊 Tubi & Barriera Rocciosa',
      swellHeight: 46,
      waveSpeed: 4.5,
      tideDepth: 165,
      windChop: 0.22,
      windType: 'tramontana',
      seabedType: 'reef',
      desc: 'Fondale roccioso che crea tubi scavati e cavità profonde (Barrel paradise).'
    },
    scirocco_storm: {
      id: 'scirocco_storm',
      name: 'Scirocco Heavy Shorebreak',
      tag: '🌪️ Onde Alte & Heavy Lip',
      swellHeight: 62,
      waveSpeed: 5.4,
      tideDepth: 155,
      windChop: 0.45,
      windType: 'scirocco',
      seabedType: 'slab',
      desc: 'Mare grosso e onde potenti con rampe aeree e shorebreak pesante.'
    },
    tramontana_zen: {
      id: 'tramontana_zen',
      name: 'Tramontana Zen & Relax',
      tag: '🧘‍♂️ Onde Piatte & Relax',
      swellHeight: 18,
      waveSpeed: 2.8,
      tideDepth: 180,
      windChop: 0.05,
      windType: 'tramontana',
      seabedType: 'sand',
      desc: 'Acqua cristallina come una piscina, ideale per galleggiare e guardare il mare.'
    }
  };

  const SURF_BOARDS = {
    shortboard: {
      id: 'shortboard',
      name: 'Shortboard Thruster',
      icon: '🏄‍♂️',
      length: 28,
      width: 6,
      speedBonus: 1.25,
      carveAgility: 1.35,
      paddleSpeed: 3.2,
      airPotential: 1.4,
      desc: 'Veloce e reattiva per manovre radicali, snap e salti aerei.'
    },
    longboard: {
      id: 'longboard',
      name: 'Longboard 9’0 Classic',
      icon: '🛹',
      length: 42,
      width: 7.5,
      speedBonus: 0.95,
      carveAgility: 0.85,
      paddleSpeed: 4.2,
      airPotential: 0.6,
      desc: 'Galleggiamento superiore, ideale per partire presto e passeggiare sull’onda.'
    },
    bodyboard: {
      id: 'bodyboard',
      name: 'Bodyboard & Pinne',
      icon: '🌊',
      length: 22,
      width: 8,
      speedBonus: 1.1,
      carveAgility: 1.4,
      paddleSpeed: 3.6,
      airPotential: 1.2,
      desc: 'Massima aderenza dentro il tubo e tubi profondi a pelo d’acqua.'
    },
    bodysurf: {
      id: 'bodysurf',
      name: 'Bodysurf Puro (Senza Tavola)',
      icon: '🏊‍♂️',
      length: 16,
      width: 5,
      speedBonus: 0.85,
      carveAgility: 1.1,
      paddleSpeed: 2.8,
      airPotential: 0.3,
      desc: 'Il contatto più intimo con l’onda: solo tu, le pinne e l’energia dell’acqua.'
    }
  };

  const SURFER_SKINS = {
    pietro: {
      id: 'pietro',
      name: 'Pietro Superhost',
      emoji: '😎',
      hairColor: '#4A2E18',
      skinColor: '#FFCC99',
      trunksColor: '#FF385C',
      boardColor: '#FFFFFF',
      boardStripe: '#FF385C',
      glasses: true
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
      glasses: true
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
      glasses: true
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
      glasses: true
    }
  };

  // ----------------------------------------------------------------------------
  // 1b. MOTORE PARTICELLE PER SCHIUMA, SPRAY E SCIE D'ACQUA
  // ----------------------------------------------------------------------------
  class SurfParticleEngine {
    constructor() {
      this.particles = [];
    }

    add(x, y, vx, vy, color = '#FFFFFF', size = 3, life = 20, type = 'spray') {
      if (this.particles.length > 180) this.particles.shift();
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

    update() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.16;
        p.life--;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    draw(ctx) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const alpha = Math.max(0.1, p.life / p.maxLife);
        ctx.fillStyle = p.color === '#FFFFFF' ? `rgba(255, 255, 255, ${alpha})` : p.color;
        const s = Math.max(1, Math.round(p.size * (p.life / p.maxLife)));
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 2. SINTETIZZATORE AUDIO WEB AUDIO (SUONO REALISTICO OCEANO & TUBO)
  // ----------------------------------------------------------------------------
  class RealisticOceanAudio {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.waveNoise = null;
      this.waveFilter = null;
      this.waveGain = null;
      this.isInit = false;

      const savedMute = localStorage.getItem('salento_surf_muted');
      if (savedMute !== null) this.isMuted = savedMute === 'true';
    }

    init() {
      if (this.isInit) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.initAmbience();
        this.isInit = true;
      } catch (e) {}
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      localStorage.setItem('salento_surf_muted', this.isMuted);
      if (this.waveGain) {
        this.waveGain.gain.setValueAtTime(this.isMuted ? 0 : 0.045, this.ctx ? this.ctx.currentTime : 0);
      }
      return this.isMuted;
    }

    initAmbience() {
      if (!this.ctx) return;
      try {
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const out = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) out[i] = Math.random() * 2 - 1;

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        this.waveFilter = this.ctx.createBiquadFilter();
        this.waveFilter.type = 'lowpass';
        this.waveFilter.frequency.value = 420;

        this.waveGain = this.ctx.createGain();
        this.waveGain.gain.value = this.isMuted ? 0 : 0.04;

        whiteNoise.connect(this.waveFilter);
        this.waveFilter.connect(this.waveGain);
        this.waveGain.connect(this.ctx.destination);
        whiteNoise.start(0);
        this.waveNoise = whiteNoise;
      } catch (e) {}
    }

    setAmbience(inBarrel, waveBreakEnergy) {
      if (!this.ctx || !this.waveFilter || !this.waveGain || this.isMuted) return;
      const t = this.ctx.currentTime;
      if (inBarrel) {
        this.waveFilter.frequency.setTargetAtTime(1050, t, 0.06);
        this.waveGain.gain.setTargetAtTime(0.09, t, 0.06);
      } else {
        const freq = 360 + waveBreakEnergy * 420;
        this.waveFilter.frequency.setTargetAtTime(freq, t, 0.1);
        this.waveGain.gain.setTargetAtTime(0.04 + waveBreakEnergy * 0.03, t, 0.1);
      }
    }

    playPopUpSound() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(480, t + 0.12);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    }

    playSnapSpray() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.15);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
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
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.11);
      });
    }

    playWipeoutCrash() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.linearRampToValueAtTime(45, t + 0.45);
      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.48);
    }
  }

  // ----------------------------------------------------------------------------
  // 3. SIMULATORE IDRODINAMICO DELL'ACQUA (FLUID WAVE SPRING HEIGHTFIELD)
  // ----------------------------------------------------------------------------
  class RealisticWaterSimulation {
    constructor(preset) {
      this.preset = preset || SPOT_PRESETS.baia_verde;
      this.points = [];
      this.numPoints = SANDBOX_CONFIG.NUM_WATER_POINTS;
      this.baseY = this.preset.tideDepth;
      this.swellPhase = 0;
      this.lipCurlParticles = [];
      this.initPoints();
    }

    initPoints() {
      this.points = [];
      this.baseY = this.preset.tideDepth;
      const stepX = SANDBOX_CONFIG.CANVAS_WIDTH / (this.numPoints - 1);
      for (let i = 0; i < this.numPoints; i++) {
        this.points.push({
          x: i * stepX,
          y: this.baseY,
          targetY: this.baseY,
          speed: 0
        });
      }
    }

    setPreset(preset) {
      this.preset = preset;
      this.baseY = preset.tideDepth;
      for (let i = 0; i < this.points.length; i++) {
        this.points[i].targetY = this.baseY;
      }
    }

    update(timeSec) {
      this.swellPhase += 0.038 * (this.preset.waveSpeed / 4.0);
      const width = SANDBOX_CONFIG.CANVAS_WIDTH;
      const height = SANDBOX_CONFIG.CANVAS_HEIGHT;

      // 1. Genera lo swell oceanico principale che viaggia da sinistra verso riva
      for (let i = 0; i < this.points.length; i++) {
        const pt = this.points[i];
        const normX = pt.x / width;

        // Shoaling: mentre l'onda si avvicina al fondale (a destra o sinistra in base allo spot), cresce in altezza
        const shoalEffect = Math.sin(normX * Math.PI * 0.9);
        const primarySwell = Math.sin(normX * 4.5 - this.swellPhase) * this.preset.swellHeight * (0.6 + shoalEffect * 0.7);
        const secondaryChop = Math.sin(normX * 12.0 + this.swellPhase * 2.0) * (this.preset.windChop * 6);

        // Profilo dell'onda che si impenna e frange
        const steepness = Math.pow(Math.max(0, Math.sin(normX * 3.5 - this.swellPhase)), 2.2);
        const breakingRamp = steepness * (this.preset.swellHeight * 0.85);

        pt.targetY = this.baseY - primarySwell - secondaryChop - breakingRamp;

        // Fisica molle (Springs)
        const dy = pt.targetY - pt.y;
        pt.speed += SANDBOX_CONFIG.SPRING_K * dy - pt.speed * SANDBOX_CONFIG.DAMPING;
        pt.y += pt.speed;
      }

      // 2. Propagazione d'onda fra punti vicini (Wave dispersion)
      for (let j = 0; j < 4; j++) {
        for (let i = 0; i < this.points.length; i++) {
          if (i > 0) {
            const leftD = this.points[i].y - this.points[i - 1].y;
            this.points[i - 1].speed += leftD * SANDBOX_CONFIG.SPREAD;
            this.points[i - 1].y += leftD * SANDBOX_CONFIG.SPREAD;
          }
          if (i < this.points.length - 1) {
            const rightD = this.points[i].y - this.points[i + 1].y;
            this.points[i + 1].speed += rightD * SANDBOX_CONFIG.SPREAD;
            this.points[i + 1].y += rightD * SANDBOX_CONFIG.SPREAD;
          }
        }
      }

      // 3. Generazione particelle del Lip che scavalca e cade nel tubo
      this.updateLipCurl();
    }

    updateLipCurl() {
      // Trova la cresta più ripida dove l'onda si lancia in avanti (Curling Lip)
      for (let i = 2; i < this.points.length - 2; i++) {
        const pt = this.points[i];
        const prev = this.points[i - 1];
        const next = this.points[i + 1];

        const slope = (next.y - prev.y) / (next.x - prev.x);
        
        // Se la pendenza è ripida e l'onda è alta -> spara getti del barile
        if (slope < -0.45 && pt.y < this.baseY - 25) {
          if (Math.random() < 0.35) {
            this.lipCurlParticles.push({
              x: pt.x + (Math.random() * 8 - 4),
              y: pt.y - 2,
              vx: 1.8 + Math.random() * 2.2,
              vy: -1.0 - Math.random() * 1.5,
              life: 24,
              maxLife: 24,
              size: Math.random() > 0.5 ? 3 : 4
            });
          }
        }
      }

      // Aggiorna particelle del lip
      for (let i = this.lipCurlParticles.length - 1; i >= 0; i--) {
        const p = this.lipCurlParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravità caduta getto d'acqua
        p.life--;
        if (p.life <= 0) this.lipCurlParticles.splice(i, 1);
      }
    }

    getWaterHeightAt(x) {
      const width = SANDBOX_CONFIG.CANVAS_WIDTH;
      const clampedX = Math.max(0, Math.min(width, x));
      const stepX = width / (this.numPoints - 1);
      const index = Math.floor(clampedX / stepX);
      const nextIndex = Math.min(this.numPoints - 1, index + 1);

      if (index >= this.numPoints - 1) return this.points[this.numPoints - 1].y;

      const t = (clampedX - this.points[index].x) / stepX;
      return this.points[index].y * (1 - t) + this.points[nextIndex].y * t;
    }

    getWaterSlopeAt(x) {
      const delta = 4;
      const y1 = this.getWaterHeightAt(x - delta);
      const y2 = this.getWaterHeightAt(x + delta);
      return Math.atan2(y2 - y1, delta * 2);
    }

    splashAt(x, strength = 6) {
      const width = SANDBOX_CONFIG.CANVAS_WIDTH;
      const stepX = width / (this.numPoints - 1);
      const index = Math.max(0, Math.min(this.numPoints - 1, Math.floor(x / stepX)));
      if (this.points[index]) {
        this.points[index].speed += strength;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 4. FISICA DEL SURFISTA (PADDLE, CATCH WAVE, POP-UP, CARVE, BARREL, SLAMMED)
  // ----------------------------------------------------------------------------
  class SandboxSurfer {
    constructor(skinId = 'pietro', boardId = 'shortboard') {
      this.skin = SURFER_SKINS[skinId] || SURFER_SKINS.pietro;
      this.board = SURF_BOARDS[boardId] || SURF_BOARDS.shortboard;
      this.reset();
    }

    reset() {
      this.x = 140;
      this.y = 170;
      this.vx = 0;
      this.vy = 0;
      this.angle = 0;
      this.targetAngle = 0;
      this.speed = 0;

      // Stati:
      // 'PADDLING'      -> Sdraiato sulla tavola che rema
      // 'CATCHING'      -> Ha preso la spinta dell'onda
      // 'SURFING'       -> In piedi sulla tavola, in carving
      // 'BARRELED'      -> Nel tubo dell'onda
      // 'AIR'           -> Lanciato in aria dal lip
      // 'WIPEOUT'       -> Slammed / Caduto in acqua
      // 'RELAX_FLOAT'   -> Galleggia rilassato
      this.state = 'PADDLING';

      this.isPopUpReady = false;
      this.paddleTimer = 0;
      this.barrelTimer = 0;
      this.totalBarrelTime = 0;
      this.rideTime = 0;
      this.score = 0;
      this.comboCount = 1;
      this.wipeoutTimer = 0;
      this.wipeoutReason = '';

      this.actionMessage = '';
      this.actionMsgTimer = 0;
      this.actionColor = '#FFFFFF';

      this.inputX = 0; // -1 (dietro / frena / rema indietro), +1 (avanti / rema / pump)
      this.inputY = 0; // -1 (verso la cresta), +1 (verso il fondo)
      this.isStallActive = false;

      this.sprayTrail = [];
    }

    setSkin(skinId) {
      if (SURFER_SKINS[skinId]) this.skin = SURFER_SKINS[skinId];
    }

    setBoard(boardId) {
      if (SURF_BOARDS[boardId]) this.board = SURF_BOARDS[boardId];
    }

    popUp() {
      if (this.state === 'PADDLING' || this.state === 'CATCHING') {
        this.state = 'SURFING';
        this.speed = Math.max(5.0, this.speed * 1.3);
        this.showMessage('⚡ POP-UP! ON THE WAVE!', '#10B981');
        return true;
      }
      return false;
    }

    snap() {
      if (this.state === 'SURFING' && this.speed > 5.5) {
        this.speed *= 0.82;
        this.vy = 2.2;
        this.targetAngle = 0.75;
        this.comboCount++;
        const pts = 500 * this.comboCount;
        this.score += pts;
        this.showMessage(`💥 SNAP OFF THE LIP! +${pts}`, '#EC4899');
        return true;
      }
      return false;
    }

    update(waterSim, particles, audio, timeSec) {
      const waterY = waterSim.getWaterHeightAt(this.x);
      const waterSlope = waterSim.getWaterSlopeAt(this.x);

      // Scia della tavola
      if (this.state === 'SURFING' || this.state === 'BARRELED') {
        this.sprayTrail.push({ x: this.x, y: this.y, life: 14 });
        if (this.sprayTrail.length > 22) this.sprayTrail.shift();
      }
      for (let i = this.sprayTrail.length - 1; i >= 0; i--) {
        this.sprayTrail[i].life--;
        if (this.sprayTrail[i].life <= 0) this.sprayTrail.splice(i, 1);
      }

      // GESTIONE STATI

      // 1. STATO PADDLING / CATCHING WAVE
      if (this.state === 'PADDLING' || this.state === 'CATCHING') {
        this.targetAngle = waterSlope * 0.6;
        this.y = waterY - 2;

        // Nuotata
        const paddlePower = this.board.paddleSpeed;
        if (this.inputX > 0.2) {
          this.speed += 0.08 * paddlePower;
          this.x += 1.4;
          if (Math.random() < 0.25) {
            particles.add(this.x - 10, this.y + 2, -1.2, -0.4, '#FFFFFF', 2, 10, 'paddle');
          }
        } else if (this.inputX < -0.2) {
          this.speed = Math.max(0, this.speed - 0.1);
          this.x -= 1.0;
        } else {
          this.speed *= 0.94;
        }

        // L'onda che arriva da dietro solleva il surfer
        if (waterSlope < -0.22 && this.speed > 2.0) {
          this.state = 'CATCHING';
          this.speed += 0.18;
          this.x += 1.8;
          this.isPopUpReady = true;
          this.showMessage('🌊 CATCHING WAVE! Fai Pop-Up!', '#F59E0B');
        } else {
          this.isPopUpReady = false;
        }
      }

      // 2. STATO SURFING (IN PIEDI SULLA PARETE)
      else if (this.state === 'SURFING' || this.state === 'BARRELED') {
        this.rideTime += 1 / 60;
        this.y = waterY;

        // Controllo se è nel tubo (Barreled)
        const isUnderLip = waterSlope < -0.38 && this.x < 130;
        if (isUnderLip) {
          this.state = 'BARRELED';
          this.barrelTimer += 1 / 60;
          this.totalBarrelTime += 1 / 60;
          const pts = Math.floor(18 * this.comboCount);
          this.score += pts;
          particles.add(this.x - 6, this.y - 8, 1.5, -0.5, '#80DEEA', 2, 12, 'barrel');
          audio.setAmbience(true, 1.0);

          if (Math.random() < 0.12) {
            this.showMessage(`🌊 GETTING BARRELED! +${pts}`, '#38BDF8');
          }
        } else {
          if (this.state === 'BARRELED') {
            this.state = 'SURFING';
            if (this.barrelTimer > 1.5) {
              const spitPts = Math.floor(1000 * this.barrelTimer * this.comboCount);
              this.score += spitPts;
              this.showMessage(`💥 SPIT OUT! +${spitPts}`, '#FBBF24');
              audio.playTubeSpit();
              this.comboCount++;
            }
            this.barrelTimer = 0;
            audio.setAmbience(false, 0.5);
          }
        }

        // Carving verticale lungo la parete
        if (this.inputY > 0.2) {
          // Bottom turn (scende verso la base dell'onda e accelera con la gravità)
          this.speed = Math.min(10.5, this.speed + 0.15 * this.board.speedBonus);
          this.x += 1.2;
          this.targetAngle = 0.45;
          particles.add(this.x - 8, this.y + 4, -this.speed * 0.4, -1, '#FFFFFF', 2, 12, 'carve');
        } else if (this.inputY < -0.2) {
          // Risale verso la cresta (Drive to the lip)
          this.speed = Math.max(3.0, this.speed - 0.08);
          this.x -= 0.8;
          this.targetAngle = -0.55;

          // Se arriva in cima a tutta velocità -> Air Section!
          if (waterY < 100 && this.speed > 7.5 && this.board.airPotential > 1.0) {
            this.state = 'AIR';
            this.vy = -5.2;
            this.vx = 2.4;
            this.showMessage('🚀 AIR SECTION BOOST!', '#6366F1');
            return;
          }
        } else {
          this.targetAngle = waterSlope;
        }

        // Stall (Hand Drag nel tubo) o Pump (Spinta in avanti)
        if (this.isStallActive || this.inputX < -0.2) {
          this.speed = Math.max(2.0, this.speed - 0.28);
          this.x -= 2.2;
          particles.add(this.x - 6, this.y + 4, -2, -0.5, '#FFFFFF', 2, 10, 'spray');
        } else if (this.inputX > 0.2) {
          this.speed = Math.min(11.0, this.speed + 0.18);
          this.x += 1.6;
        }

        // Limiti schermo orizzontali
        if (this.x < 35) {
          // Troppo indietro: slammed by heavy shorebreak / crushed by lip!
          this.triggerWipeout('💥 SLAMMED BY HEAVY SHOREBREAK!', waterSim, particles, audio);
          return;
        }
        if (this.x > SANDBOX_CONFIG.CANVAS_WIDTH - 40) {
          // Troppo avanti: uscito dall'onda
          this.x = SANDBOX_CONFIG.CANVAS_WIDTH - 40;
          this.speed *= 0.9;
        }

        // Punti continui di surfing
        this.score += Math.floor(this.speed * 0.15);
      }

      // 3. STATO AIR (AERIAL SECTION)
      else if (this.state === 'AIR') {
        this.vy += 0.28; // gravità
        this.x += this.vx;
        this.y += this.vy;
        this.angle += 0.09;

        // Atterraggio sull'acqua
        if (this.y >= waterY - 4) {
          this.y = waterY;
          this.state = 'SURFING';
          this.vy = 0;
          this.speed = Math.min(10.0, this.speed + 2.0);
          this.comboCount++;
          const airPts = 800 * this.comboCount;
          this.score += airPts;
          this.showMessage(`✨ CLEAN AIR LANDING! +${airPts}`, '#10B981');
          waterSim.splashAt(this.x, 8);
          audio.playSnapSpray();
        }
      }

      // 4. STATO WIPEOUT / SLAMMED
      else if (this.state === 'WIPEOUT') {
        this.wipeoutTimer--;
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.22;
        this.angle += 0.16;

        if (this.y > waterY + 12) {
          this.y = waterY + 12;
          this.vx *= 0.85;
          this.vy = 0;
        }

        if (this.wipeoutTimer <= 0) {
          // Respawn tranquillo a remare
          this.state = 'PADDLING';
          this.x = 120;
          this.speed = 0;
          this.vy = 0;
          this.angle = 0;
        }
      }

      // Morbidezza rotazione tavola
      this.angle += (this.targetAngle - this.angle) * 0.2;

      // Timer testo azione
      if (this.actionMsgTimer > 0) this.actionMsgTimer--;
    }

    triggerWipeout(reason, waterSim, particles, audio) {
      this.state = 'WIPEOUT';
      this.wipeoutTimer = 85;
      this.comboCount = 1;
      this.barrelTimer = 0;
      this.vy = -3.8;
      this.vx = -1.6;
      this.wipeoutReason = reason;

      waterSim.splashAt(this.x, 14);
      for (let i = 0; i < 24; i++) {
        const ang = -Math.PI * 0.5 + (Math.random() * Math.PI - Math.PI * 0.5);
        const spd = 2.0 + Math.random() * 4.5;
        particles.add(this.x, this.y, Math.cos(ang) * spd, Math.sin(ang) * spd, '#FFFFFF', 3, 28, 'splash');
      }

      audio.playWipeoutCrash();
      this.showMessage(reason, '#EF4444');

      if (navigator.vibrate) {
        try { navigator.vibrate([70, 50, 110]); } catch (e) {}
      }
    }

    showMessage(text, color = '#FFFFFF') {
      this.actionMessage = text;
      this.actionColor = color;
      this.actionMsgTimer = 55;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(Math.round(this.x), Math.round(this.y));
      ctx.rotate(this.angle);

      if (this.state === 'PADDLING' || this.state === 'CATCHING' || this.state === 'RELAX_FLOAT') {
        this.drawPaddlingSurfer(ctx);
      } else {
        this.drawStandingSurfer(ctx);
      }

      ctx.restore();

      // Disegna Testo Azione
      if (this.actionMsgTimer > 0) {
        ctx.save();
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.actionColor || '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 5;
        const textY = Math.round(this.y) - 28 - (55 - this.actionMsgTimer) * 0.35;
        ctx.fillText(this.actionMessage, Math.round(this.x), textY);
        ctx.restore();
      }
    }

    drawPaddlingSurfer(ctx) {
      const s = this.skin;
      const b = this.board;

      // Tavola sotto al corpo
      ctx.fillStyle = s.boardColor || '#FFFFFF';
      ctx.fillRect(-b.length / 2, 2, b.length, b.width);
      ctx.fillStyle = s.boardStripe || '#FF385C';
      ctx.fillRect(-b.length / 2 + 4, 3, b.length - 8, 2);

      // Surfer sdraiato
      ctx.fillStyle = s.trunksColor;
      ctx.fillRect(-8, -2, 10, 4);

      ctx.fillStyle = s.skinColor;
      ctx.fillRect(0, -3, 8, 4); // Busto
      ctx.fillRect(6, -6, 6, 6); // Testa

      // Capelli
      ctx.fillStyle = s.hairColor;
      ctx.fillRect(5, -7, 7, 3);

      // Occhiali 😎
      if (s.glasses) {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(8, -5, 4, 2);
      }

      // Braccio che rema
      const paddleSwing = Math.sin(Date.now() * 0.012) * 5;
      ctx.fillStyle = s.skinColor;
      ctx.fillRect(2, -1 + paddleSwing, 3, 5);
    }

    drawStandingSurfer(ctx) {
      const s = this.skin;
      const b = this.board;
      const isLowStance = this.state === 'BARRELED' || this.isStallActive;

      // Tavola da surf
      ctx.fillStyle = s.boardColor || '#FFFFFF';
      ctx.fillRect(-b.length / 2, 3, b.length, 4);
      ctx.fillRect(-b.length / 2 + 2, 2, b.length - 4, 6);
      ctx.fillStyle = s.boardStripe || '#FF385C';
      ctx.fillRect(-b.length / 2 + 4, 4, b.length - 8, 2);

      const hipY = isLowStance ? -1 : -5;
      const headY = isLowStance ? -9 : -17;

      // Gambe
      ctx.fillStyle = s.skinColor;
      ctx.fillRect(-5, hipY + 4, 4, 4);
      ctx.fillRect(3, hipY + 4, 4, 4);

      // Costume
      ctx.fillStyle = s.trunksColor;
      ctx.fillRect(-6, hipY, 13, 5);

      // Busto
      ctx.fillStyle = s.skinColor;
      ctx.fillRect(-4, headY + 5, 9, 6);

      // Braccia
      if (this.state === 'BARRELED' || this.isStallActive) {
        // Hand Drag nel tubo
        ctx.fillRect(-9, headY + 8, 5, 3);
        ctx.fillRect(-11, headY + 11, 3, 3); // Mano nell'acqua
        ctx.fillRect(4, headY + 4, 6, 3);
      } else {
        ctx.fillRect(-8, headY + 6, 4, 3);
        ctx.fillRect(4, headY + 6, 5, 3);
      }

      // Testa
      ctx.fillStyle = s.skinColor;
      ctx.fillRect(-3, headY - 4, 8, 8);

      // Capelli
      ctx.fillStyle = s.hairColor;
      ctx.fillRect(-4, headY - 6, 9, 4);

      // Occhiali 😎
      if (s.glasses) {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, headY - 2, 5, 3);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(2, headY - 2, 1, 1);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 5. RENDERER SANDBOX COMPLETO CON ACQUA MULTISTRATO & FONDALI
  // ----------------------------------------------------------------------------
  class SandboxRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
    }

    render(waterSim, surfer, particles, timeSec) {
      const ctx = this.ctx;
      const width = SANDBOX_CONFIG.CANVAS_WIDTH;
      const height = SANDBOX_CONFIG.CANVAS_HEIGHT;

      ctx.clearRect(0, 0, width, height);

      // 1. Cielo e Atmosfera Salentina (Tramontana / Scirocco mood)
      this.drawSkyAndHorizon(ctx, waterSim.preset, timeSec);

      // 2. Costa in lontananza (Gallipoli, Torre del Pizzo)
      this.drawDistantCoast(ctx);

      // 3. Fondale marino dinamico (Sabbia, Scogli o Slab)
      this.drawSeabed(ctx, waterSim.preset);

      // 4. Simulazione Acqua a strati (Pixel Water Body)
      this.drawFluidWater(ctx, waterSim);

      // 5. Particelle, Scia e Schiuma
      this.drawSprayTrails(ctx, surfer);
      particles.draw(ctx);

      // 6. Getti d'acqua del Lip che curva (Curling Wave Lip)
      this.drawCurlingLip(ctx, waterSim);

      // 7. Surfer
      surfer.draw(ctx);
    }

    drawSkyAndHorizon(ctx, preset, timeSec) {
      const width = SANDBOX_CONFIG.CANVAS_WIDTH;
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 160);

      if (preset.windType === 'scirocco') {
        // Cielo caldo e mosso da Scirocco
        skyGrad.addColorStop(0, '#38BDF8');
        skyGrad.addColorStop(0.6, '#FDE68A');
        skyGrad.addColorStop(1, '#F59E0B');
      } else {
        // Cielo limpido e azzurro da Tramontana
        skyGrad.addColorStop(0, '#7FD1F7');
        skyGrad.addColorStop(0.65, '#BAE6FD');
        skyGrad.addColorStop(1, '#FEF08A');
      }

      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, 180);

      // Sole luminoso
      const sunX = width - 55;
      const sunY = 32;
      ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FDE047';
      ctx.fillRect(sunX - 9, sunY - 9, 18, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sunX - 4, sunY - 4, 8, 8);

      // Nuvole in movimento
      ctx.fillStyle = '#FFFFFF';
      const c1 = (40 + timeSec * 5) % (width + 60) - 30;
      ctx.fillRect(c1, 22, 32, 8);
      ctx.fillRect(c1 + 4, 18, 22, 12);
    }

    drawDistantCoast(ctx) {
      const baseY = 100;
      ctx.fillStyle = '#64748B'; // Faraglioni e pini marittimi
      ctx.fillRect(180, baseY - 14, 50, 14);
      ctx.fillRect(190, baseY - 20, 24, 6);
      ctx.fillRect(280, baseY - 10, 70, 10);

      // Linea di mare calmo all'orizzonte
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(0, baseY, SANDBOX_CONFIG.CANVAS_WIDTH, 14);
    }

    drawSeabed(ctx, preset) {
      const width = SANDBOX_CONFIG.CANVAS_WIDTH;
      const height = SANDBOX_CONFIG.CANVAS_HEIGHT;
      const seabedY = preset.tideDepth + 32;

      if (preset.seabedType === 'reef' || preset.seabedType === 'slab') {
        // Scogli e rocce del Salento
        ctx.fillStyle = '#78350F';
        ctx.fillRect(0, seabedY, width, height - seabedY);
        ctx.fillStyle = '#451A03';
        for (let x = 0; x < width; x += 18) {
          ctx.fillRect(x, seabedY - 4 + (x % 7), 12, 6);
        }
      } else {
        // Sabbia dorata di Baia Verde
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(0, seabedY, width, 8);
        ctx.fillStyle = '#B45309';
        ctx.fillRect(0, seabedY + 8, width, height - (seabedY + 8));
      }
    }

    drawFluidWater(ctx, waterSim) {
      const pts = waterSim.points;
      const height = SANDBOX_CONFIG.CANVAS_HEIGHT;
      const width = SANDBOX_CONFIG.CANVAS_WIDTH;

      // 1. Corpo d'acqua profondo (#0369A1)
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y + 24);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = '#0369A1';
      ctx.fill();

      // 2. Strato intermedio turchese cyan (#0284C7)
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y + 10);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = '#0284C7';
      ctx.fill();

      // 3. Superficie d'acqua e cresta (#22D3EE)
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = '#22D3EE';
      ctx.fill();

      // 4. Schiuma bianca sulla cresta superiore
      ctx.fillStyle = '#FFFFFF';
      for (let i = 1; i < pts.length - 1; i++) {
        const pt = pts[i];
        if (pt.y < waterSim.baseY - 10) {
          ctx.fillRect(Math.round(pt.x) - 2, Math.round(pt.y) - 1, 4, 3);
        }
      }
    }

    drawCurlingLip(ctx, waterSim) {
      const parts = waterSim.lipCurlParticles;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
    }

    drawSprayTrails(ctx, surfer) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (let i = 0; i < surfer.sprayTrail.length; i++) {
        const p = surfer.sprayTrail[i];
        const sz = Math.max(1, Math.floor(p.life / 3.5));
        ctx.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 6. GESTORE DEL GIOCO SANDBOX & CONTROLLI (TOUCH JOYSTICK + SANDBOX SLIDERS)
  // ----------------------------------------------------------------------------
  class SalentoSurfSandboxEngine {
    constructor() {
      this.canvas = null;
      this.renderer = null;
      this.waterSim = null;
      this.surfer = null;
      this.particles = null;
      this.audio = null;

      this.currentPresetId = 'baia_verde';
      this.currentBoardId = 'shortboard';
      this.currentSkinId = 'pietro';

      this.gameState = 'PLAYING';
      this.timeSec = 0;
      this.highScore = 0;
      this.bestBarrelTime = 0;
      this.bestRideTime = 0;
      this.animationFrameId = null;
      this.lastTimestamp = 0;

      this.touchStartX = 0;
      this.touchStartY = 0;
      this.isTouchActive = false;

      this.loadSavedRecords();
    }

    loadSavedRecords() {
      try {
        const saved = localStorage.getItem('salento_surf_sandbox_v1');
        if (saved) {
          const d = JSON.parse(saved);
          this.highScore = d.highScore || 0;
          this.bestBarrelTime = d.bestBarrelTime || 0;
          this.bestRideTime = d.bestRideTime || 0;
          this.currentSkinId = d.skinId || 'pietro';
          this.currentBoardId = d.boardId || 'shortboard';
          this.currentPresetId = d.presetId || 'baia_verde';
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
          this.bestRideTime = Number(this.surfer.rideTime.toFixed(0));
        }

        const data = {
          highScore: this.highScore,
          bestBarrelTime: this.bestBarrelTime,
          bestRideTime: this.bestRideTime,
          skinId: this.currentSkinId,
          boardId: this.currentBoardId,
          presetId: this.currentPresetId
        };
        localStorage.setItem('salento_surf_sandbox_v1', JSON.stringify(data));
        return isNew;
      } catch (e) {
        return false;
      }
    }

    init(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      this.canvas.width = SANDBOX_CONFIG.CANVAS_WIDTH;
      this.canvas.height = SANDBOX_CONFIG.CANVAS_HEIGHT;

      const preset = SPOT_PRESETS[this.currentPresetId] || SPOT_PRESETS.baia_verde;
      this.waterSim = new RealisticWaterSimulation(preset);
      this.renderer = new SandboxRenderer(this.canvas);
      this.surfer = new SandboxSurfer(this.currentSkinId, this.currentBoardId);
      this.particles = new SurfParticleEngine();
      this.audio = new RealisticOceanAudio();

      this.bindControls();
      this.updateRecordsUI();

      // Render iniziale
      this.renderer.render(this.waterSim, this.surfer, this.particles, 0);

      // Avvia loop continuo (Sandbox è sempre vivo e rilassante!)
      this.startGame();
    }

    setSpotPreset(presetId) {
      if (SPOT_PRESETS[presetId]) {
        this.currentPresetId = presetId;
        this.waterSim.setPreset(SPOT_PRESETS[presetId]);
        this.surfer.showMessage(`📍 Spot: ${SPOT_PRESETS[presetId].name}`, '#38BDF8');
        this.saveRecords();
        this.updateSandboxUI();
      }
    }

    setBoardType(boardId) {
      if (SURF_BOARDS[boardId]) {
        this.currentBoardId = boardId;
        this.surfer.setBoard(boardId);
        this.surfer.showMessage(`🏄 Tavola: ${SURF_BOARDS[boardId].name}`, '#F59E0B');
        this.saveRecords();
        this.updateSandboxUI();
      }
    }

    setSurferSkin(skinId) {
      if (SURFER_SKINS[skinId]) {
        this.currentSkinId = skinId;
        this.surfer.setSkin(skinId);
        this.saveRecords();
      }
    }

    // SLIDER SANDBOX IN TEMPO REALE
    setCustomWaveHeight(val) {
      this.waterSim.preset.swellHeight = Number(val);
    }
    setCustomWaveSpeed(val) {
      this.waterSim.preset.waveSpeed = Number(val);
    }
    setCustomWind(val) {
      this.waterSim.preset.windChop = Number(val);
    }

    triggerBigSetWave() {
      // Spinge un mega set di onde
      this.waterSim.preset.swellHeight += 18;
      this.surfer.showMessage('🌊 SET IN ARRIVO! ONDA GIGANTE!', '#EC4899');
      this.audio.playPopUpSound();
      setTimeout(() => {
        const p = SPOT_PRESETS[this.currentPresetId] || SPOT_PRESETS.baia_verde;
        this.waterSim.preset.swellHeight = p.swellHeight;
      }, 7000);
    }

    bindControls() {
      if (!this.canvas) return;

      const handleTouchStart = (e) => {
        e.preventDefault();
        this.audio.init();
        this.audio.resume();

        const touch = e.touches ? e.touches[0] : e;
        const rect = this.canvas.getBoundingClientRect();
        this.touchStartX = touch.clientX - rect.left;
        this.touchStartY = touch.clientY - rect.top;
        this.isTouchActive = true;

        this.processTouch(this.touchStartX, this.touchStartY, rect);
      };

      const handleTouchMove = (e) => {
        if (!this.isTouchActive) return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const rect = this.canvas.getBoundingClientRect();
        const curX = touch.clientX - rect.left;
        const curY = touch.clientY - rect.top;

        const dx = curX - this.touchStartX;
        const dy = curY - this.touchStartY;

        let steerX = 0;
        let steerY = 0;
        if (Math.abs(dx) > 6) steerX = dx > 0 ? 1 : -1;
        if (Math.abs(dy) > 6) steerY = dy > 0 ? 1 : -1;

        const isStall = dx < -14;
        this.surfer.inputX = steerX;
        this.surfer.inputY = steerY;
        this.surfer.isStallActive = isStall;
      };

      const handleTouchEnd = (e) => {
        e.preventDefault();
        this.isTouchActive = false;
        if (this.surfer) {
          this.surfer.inputX = 0;
          this.surfer.inputY = 0;
          this.surfer.isStallActive = false;
        }
      };

      this.processTouch = (x, y, rect) => {
        const normX = x / rect.width;
        const normY = y / rect.height;

        let steerX = 0;
        let steerY = 0;
        let isStall = false;

        if (normY < 0.4) steerY = -1; // Sali alla cresta
        else if (normY > 0.6) steerY = 1; // Scendi al fondo

        if (normX < 0.35) {
          steerX = -1;
          isStall = true;
        } else if (normX > 0.65) {
          steerX = 1;
        }

        this.surfer.inputX = steerX;
        this.surfer.inputY = steerY;
        this.surfer.isStallActive = isStall;
      };

      this.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      this.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      this.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      this.canvas.addEventListener('mousedown', handleTouchStart);
      window.addEventListener('mouseup', handleTouchEnd);

      // TASTIERA
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
          this.audio.init();
          this.audio.resume();

          if (e.code === 'Space') {
            if (!this.surfer.popUp()) {
              this.surfer.snap();
            }
          }
          if (e.code === 'ArrowUp' || e.code === 'KeyW') this.surfer.inputY = -1;
          if (e.code === 'ArrowDown' || e.code === 'KeyS') this.surfer.inputY = 1;
          if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            this.surfer.inputX = -1;
            this.surfer.isStallActive = true;
          }
          if (e.code === 'ArrowRight' || e.code === 'KeyD') this.surfer.inputX = 1;
        }
      });

      window.addEventListener('keyup', (e) => {
        if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) this.surfer.inputY = 0;
        if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
          this.surfer.inputX = 0;
          this.surfer.isStallActive = false;
        }
      });
    }

    startGame() {
      this.gameState = 'PLAYING';
      this.timeSec = 0;
      this.lastTimestamp = performance.now();
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.loop(this.lastTimestamp);
    }

    loop(timestamp) {
      const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = timestamp;
      this.timeSec += dt;

      // Aggiorna Simulazione Idrodinamica & Surfer
      this.waterSim.update(this.timeSec);
      this.surfer.update(this.waterSim, this.particles, this.audio, this.timeSec);
      this.particles.update();

      // Render scena
      this.renderer.render(this.waterSim, this.surfer, this.particles, this.timeSec);

      // Aggiorna HUD
      this.updateHUD();
      this.saveRecords();

      this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }

    updateHUD() {
      const scoreEl = document.getElementById('surfLiveScore');
      const comboEl = document.getElementById('surfLiveCombo');
      const distEl = document.getElementById('surfLiveDist');
      const shellsEl = document.getElementById('surfLiveShells');
      const btnPopUp = document.getElementById('btnMobilePopUp');

      if (scoreEl) scoreEl.textContent = this.surfer.score.toLocaleString();
      if (distEl) distEl.textContent = `${this.surfer.rideTime.toFixed(0)}s`;
      if (shellsEl) shellsEl.textContent = `${this.surfer.totalBarrelTime.toFixed(1)}s Tubo`;

      // Mostra / Lampeggia pulsante Pop-up quando l'onda è pronta
      if (btnPopUp) {
        if (this.surfer.state === 'PADDLING' || this.surfer.state === 'CATCHING') {
          btnPopUp.textContent = this.surfer.isPopUpReady ? '⚡ POP-UP ORA!' : '🏊 Rema';
          btnPopUp.style.background = this.surfer.isPopUpReady ? '#10B981' : 'rgba(255,255,255,0.2)';
        } else {
          btnPopUp.textContent = '💥 Snap / Air';
          btnPopUp.style.background = '#EC4899';
        }
      }

      if (comboEl) {
        if (this.surfer.comboCount > 1) {
          comboEl.textContent = `x${this.surfer.comboCount} COMBO!`;
          comboEl.style.display = 'inline-block';
        } else {
          comboEl.style.display = 'none';
        }
      }
    }

    updateRecordsUI() {
      const highEl = document.getElementById('surfRecordScore');
      const bestBarrelEl = document.getElementById('surfRecordBarrel');
      const bestDistEl = document.getElementById('surfRecordDist');

      if (highEl) highEl.textContent = this.highScore.toLocaleString();
      if (bestBarrelEl) bestBarrelEl.textContent = `${this.bestBarrelTime}s`;
      if (bestDistEl) bestDistEl.textContent = `${this.bestRideTime}s`;
    }

    updateSandboxUI() {
      // Aggiorna pillole attive per preset e tavole
      document.querySelectorAll('.spot-preset-pill').forEach(p => p.classList.remove('active'));
      const spotEl = document.getElementById(`spotPill_${this.currentPresetId}`);
      if (spotEl) spotEl.classList.add('active');

      document.querySelectorAll('.board-type-pill').forEach(p => p.classList.remove('active'));
      const boardEl = document.getElementById(`boardPill_${this.currentBoardId}`);
      if (boardEl) boardEl.classList.add('active');
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

  // Istanza globale del simulatore
  window.SalentoSurf = new SalentoSurfSandboxEngine();

})(window);
