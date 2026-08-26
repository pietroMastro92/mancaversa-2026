/**
 * ==============================================================================
 * SALENTO SURF SANDBOX - TRUE CASUAL SURF SIMULATOR & FLUID WAVE PHYSICS
 * ==============================================================================
 * Fedele a "Surf Sandbox" (Steam indie):
 * 1. Fisica idrodinamica 2D reale con profilo di sezione dell'oceano
 * 2. Fondale marino interattivo & sculptabile (Sabbia, Reef, Scogliere)
 * 3. Onde reali che frangono per shoaling: si impennano, creano la parete verticale,
 *    la cresta si lancia in avanti formando un vero TUBO/BARREL scavato in 2D
 * 4. Tavola con fisica di galleggiamento (Archimede), planata idrodinamica, gravità e drag
 * 5. Controllo reale del trim/inclinazione della tavola, paddle, pop-up, carving, tubi e aerials
 * 6. Fauna marina interattiva (tartarughe marine, banchi di pesci, posidonia)
 * 7. Pennello Sandbox per scavare/alzare il fondale con un dito o mouse in tempo reale!
 */

(function (window) {
  'use strict';

  // ----------------------------------------------------------------------------
  // 1. CONFIGURAZIONE SIMULAZIONE FISICA
  // ----------------------------------------------------------------------------
  const CONFIG = {
    WIDTH: 520,
    HEIGHT: 300,
    GRAVITY: 9.81 * 0.05,
    DENSITY: 1.0,
    WATER_DRAG: 0.965,
    AIR_DRAG: 0.995,
    SEABED_POINTS: 130, // Risoluzione orizzontale fondale
  };

  // Spot pre-configurati del Salento con profili fondale reali
  const SALENTO_SPOTS = {
    baia_verde: {
      id: 'baia_verde',
      name: 'Baia Verde (Gallipoli)',
      tag: '🏖️ Sabbia Dorata · Onde Pulite',
      swellHeight: 34,
      swellSpeed: 3.6,
      tide: 195,
      wind: 0.12,
      seabedType: 'sand',
      // Generatore profilo fondale: pendenza graduale verso la riva a destra
      generateSeabed: (num, w, h) => {
        const arr = [];
        for (let i = 0; i < num; i++) {
          const x = (i / (num - 1)) * w;
          // Profondo a sinistra (260px), banco di sabbia al centro (170px), riva a destra (140px)
          const depth = 265 - Math.sin((i / num) * Math.PI * 0.9) * 85 - (i / num) * 55;
          arr.push(depth);
        }
        return arr;
      }
    },
    mare_cavalli: {
      id: 'mare_cavalli',
      name: 'Mare dei Cavalli (Mancaversa)',
      tag: '🌊 Reef Basso · Hollow Barrel',
      swellHeight: 48,
      swellSpeed: 4.4,
      tide: 185,
      wind: 0.18,
      seabedType: 'reef',
      // Barriera rocciosa a gradino che forza l'onda a creare un tubo profondo
      generateSeabed: (num, w, h) => {
        const arr = [];
        for (let i = 0; i < num; i++) {
          const norm = i / (num - 1);
          let depth = 270;
          if (norm > 0.35 && norm < 0.65) {
            // Scalino di roccia secca
            depth = 155 - Math.sin((norm - 0.35) / 0.3 * Math.PI) * 45;
          } else if (norm >= 0.65) {
            depth = 175 - (norm - 0.65) * 60;
          }
          arr.push(depth);
        }
        return arr;
      }
    },
    scirocco_storm: {
      id: 'scirocco_storm',
      name: 'Scirocco Heavy Shorebreak',
      tag: '🌪️ Onde Giganti & Shorebreak',
      swellHeight: 65,
      swellSpeed: 5.5,
      tide: 175,
      wind: 0.45,
      seabedType: 'slab',
      // Muro di scoglio ripido sotto costa
      generateSeabed: (num, w, h) => {
        const arr = [];
        for (let i = 0; i < num; i++) {
          const norm = i / (num - 1);
          const depth = 275 - Math.pow(norm, 2.2) * 165;
          arr.push(depth);
        }
        return arr;
      }
    },
    tramontana_zen: {
      id: 'tramontana_zen',
      name: 'Tramontana Zen (Relax)',
      tag: '🧘‍♂️ Mare Piatto Cristallino',
      swellHeight: 18,
      swellSpeed: 2.5,
      tide: 205,
      wind: 0.04,
      seabedType: 'sand',
      generateSeabed: (num, w, h) => {
        const arr = [];
        for (let i = 0; i < num; i++) {
          arr.push(265 - (i / num) * 50);
        }
        return arr;
      }
    }
  };

  // Tipologie di tavole/craft
  const CRAFT_TYPES = {
    shortboard: {
      id: 'shortboard',
      name: 'Shortboard Thruster',
      icon: '🏄‍♂️',
      length: 30,
      thickness: 6,
      mass: 4.5,
      buoyancyCoeff: 1.45,
      liftCoeff: 1.8,
      agility: 1.35,
      maxSpeed: 12.0
    },
    longboard: {
      id: 'longboard',
      name: 'Longboard 9’0 Classic',
      icon: '🛹',
      length: 44,
      thickness: 8,
      mass: 8.0,
      buoyancyCoeff: 2.1,
      liftCoeff: 1.3,
      agility: 0.85,
      maxSpeed: 9.5
    },
    bodyboard: {
      id: 'bodyboard',
      name: 'Bodyboard & Pinne',
      icon: '🌊',
      length: 22,
      thickness: 7,
      mass: 3.2,
      buoyancyCoeff: 1.6,
      liftCoeff: 1.5,
      agility: 1.5,
      maxSpeed: 10.5
    },
    bodysurf: {
      id: 'bodysurf',
      name: 'Bodysurf Puro',
      icon: '🏊‍♂️',
      length: 16,
      thickness: 5,
      mass: 2.0,
      buoyancyCoeff: 1.1,
      liftCoeff: 0.9,
      agility: 1.2,
      maxSpeed: 7.5
    }
  };

  // ----------------------------------------------------------------------------
  // 2. SINTETIZZATORE AUDIO WEB AUDIO PER RUMORE REALISTICO MARE & TUBO
  // ----------------------------------------------------------------------------
  class RealisticOceanAudio {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.waveNoise = null;
      this.filter = null;
      this.gain = null;
      this.isInit = false;

      const saved = localStorage.getItem('salento_surf_muted');
      if (saved !== null) this.isMuted = saved === 'true';
    }

    init() {
      if (this.isInit) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        // Genera rumore bianco costante per il frangersi dell'onda
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const out = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) out[i] = Math.random() * 2 - 1;

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 380;

        this.gain = this.ctx.createGain();
        this.gain.gain.value = this.isMuted ? 0 : 0.045;

        whiteNoise.connect(this.filter);
        this.filter.connect(this.gain);
        this.gain.connect(this.ctx.destination);
        whiteNoise.start(0);

        this.isInit = true;
      } catch (e) {}
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      localStorage.setItem('salento_surf_muted', this.isMuted);
      if (this.gain && this.ctx) {
        this.gain.gain.setValueAtTime(this.isMuted ? 0 : 0.045, this.ctx.currentTime);
      }
      return this.isMuted;
    }

    setDynamicAcoustics(inBarrel, speedNorm) {
      if (!this.ctx || !this.filter || !this.gain || this.isMuted) return;
      const t = this.ctx.currentTime;
      if (inBarrel) {
        // Dentro il tubo: risonanza profonda e riverbero
        this.filter.frequency.setTargetAtTime(950, t, 0.08);
        this.gain.gain.setTargetAtTime(0.085, t, 0.08);
      } else {
        const freq = 340 + speedNorm * 480;
        this.filter.frequency.setTargetAtTime(freq, t, 0.12);
        this.gain.gain.setTargetAtTime(0.04 + speedNorm * 0.035, t, 0.12);
      }
    }

    playSpray() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(460, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    }

    playTubeChime() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const t = this.ctx.currentTime + idx * 0.04;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.11);
      });
    }

    playWipeout() {
      if (!this.ctx || this.isMuted) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.linearRampToValueAtTime(40, t + 0.4);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.42);
    }
  }

  // ----------------------------------------------------------------------------
  // 3. SIMULATORE 2D ONDE IDRODINAMICHE & FONDALE SCULPTABILE
  // ----------------------------------------------------------------------------
  class FluidOceanSimulator {
    constructor(spotConfig) {
      this.spot = spotConfig || SALENTO_SPOTS.baia_verde;
      this.numPoints = CONFIG.SEABED_POINTS;
      this.width = CONFIG.WIDTH;
      this.height = CONFIG.HEIGHT;

      this.seabed = this.spot.generateSeabed(this.numPoints, this.width, this.height);
      this.waterSurface = new Float32Array(this.numPoints);
      this.waterVelocityY = new Float32Array(this.numPoints);
      this.waterVelocityX = new Float32Array(this.numPoints);

      this.swellTime = 0;
      this.swellHeight = this.spot.swellHeight;
      this.swellSpeed = this.spot.swellSpeed;
      this.wind = this.spot.wind;
      this.baseTide = this.spot.tide;

      // Particelle d'acqua e schiuma
      this.foamParticles = [];
      this.curlingLipParts = [];

      // Fauna marina
      this.seaCreatures = [
        { type: 'turtle', x: 220, y: 220, vx: 0.4, vy: 0, size: 14, anim: 0 },
        { type: 'fish', x: 120, y: 240, vx: 0.8, vy: 0, size: 8, anim: 0 },
        { type: 'fish', x: 135, y: 245, vx: 0.8, vy: 0, size: 7, anim: 0.5 },
        { type: 'fish', x: 380, y: 200, vx: -0.6, vy: 0, size: 8, anim: 0 }
      ];

      this.initWater();
    }

    setSpot(spotKey) {
      if (SALENTO_SPOTS[spotKey]) {
        this.spot = SALENTO_SPOTS[spotKey];
        this.swellHeight = this.spot.swellHeight;
        this.swellSpeed = this.spot.swellSpeed;
        this.wind = this.spot.wind;
        this.baseTide = this.spot.tide;
        this.seabed = this.spot.generateSeabed(this.numPoints, this.width, this.height);
        this.initWater();
      }
    }

    initWater() {
      for (let i = 0; i < this.numPoints; i++) {
        this.waterSurface[i] = this.baseTide;
        this.waterVelocityY[i] = 0;
        this.waterVelocityX[i] = 0;
      }
    }

    // SCULPT TOOL: Alza o scava il fondale con il tocco/mouse
    sculptSeabed(canvasX, deltaDepth) {
      const stepX = this.width / (this.numPoints - 1);
      const centerIdx = Math.round(canvasX / stepX);
      const radius = 6;

      for (let i = -radius; i <= radius; i++) {
        const idx = centerIdx + i;
        if (idx >= 0 && idx < this.numPoints) {
          const falloff = Math.cos((i / radius) * (Math.PI / 2));
          this.seabed[idx] = Math.max(70, Math.min(this.height - 15, this.seabed[idx] + deltaDepth * falloff));
        }
      }
    }

    update(dt) {
      this.swellTime += dt * (this.swellSpeed * 0.95);
      const stepX = this.width / (this.numPoints - 1);

      // 1. ONDA DA SWELL OCEANICO CHE SI PROPAGA DA SINISTRA A DESTRA
      for (let i = 0; i < this.numPoints; i++) {
        const x = i * stepX;
        const normX = x / this.width;
        const seabedDepth = this.seabed[i];
        const waterDepth = Math.max(10, seabedDepth - this.baseTide);

        // Shoaling: mentre l'acqua diventa più bassa sopra il reef/sabbia,
        // l'altezza dell'onda cresce vertiginosamente e la lunghezza d'onda si accorcia!
        const shoalingFactor = Math.pow(160 / waterDepth, 0.65);
        const wavePhase = normX * 4.2 - this.swellTime;

        // Profilo non-lineare dell'onda (trochoid / solitary wave profile)
        const primaryWave = Math.sin(wavePhase);
        const steepCrest = Math.pow(Math.max(0, primaryWave), 2.8) * 1.8; // cresta affilata
        const trough = Math.min(0, primaryWave) * 0.6; // cavo piatto

        const waveElev = (steepCrest + trough) * this.swellHeight * shoalingFactor * 0.45;
        const windChop = Math.sin(normX * 16.0 + this.swellTime * 2.5) * (this.wind * 8);

        const targetY = this.baseTide - waveElev + windChop;

        // Dinamica della superficie dell'acqua (Molle con smorzamento)
        const dy = targetY - this.waterSurface[i];
        this.waterVelocityY[i] += dy * 0.08 - this.waterVelocityY[i] * 0.05;
        this.waterSurface[i] += this.waterVelocityY[i];

        // Calcolo velocità orizzontale dell'acqua (corrente orbitale)
        this.waterVelocityX[i] = Math.cos(wavePhase) * (this.swellSpeed * 1.1) * shoalingFactor;
      }

      // 2. DISPERSIONE ORIZZONTALE & SMORZAMENTO
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 1; i < this.numPoints - 1; i++) {
          const avg = (this.waterSurface[i - 1] + this.waterSurface[i + 1]) * 0.5;
          this.waterSurface[i] += (avg - this.waterSurface[i]) * 0.12;
        }
      }

      // 3. FRANGIMENTO DELL'ONDA & CREAZIONE VERO TUBO (BARREL LIP CURLING)
      this.updateBarrelLip(stepX);

      // 4. AGGIORNA PARTICELLE DI SCHIUMA E FAUNA MARINA
      this.updateFoamAndSeaLife(dt);
    }

    updateBarrelLip(stepX) {
      for (let i = 2; i < this.numPoints - 2; i++) {
        const x = i * stepX;
        const y = this.waterSurface[i];
        const prevY = this.waterSurface[i - 1];
        const nextY = this.waterSurface[i + 1];

        // Pendenza della parete
        const slope = (nextY - prevY) / (stepX * 2);

        // Se la pendenza è ripida e l'onda è in cima -> il lip si lancia in avanti creando il tubo!
        if (slope < -0.42 && y < this.baseTide - 28) {
          if (Math.random() < 0.45) {
            this.curlingLipParts.push({
              x: x + 2,
              y: y - 2,
              vx: 2.8 + Math.random() * 2.2,
              vy: -1.2 - Math.random() * 1.8,
              life: 28,
              maxLife: 28,
              size: Math.random() > 0.5 ? 4 : 3
            });
          }
        }
      }

      // Aggiorna particelle getto del barile
      for (let i = this.curlingLipParts.length - 1; i >= 0; i--) {
        const p = this.curlingLipParts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += CONFIG.GRAVITY * 1.4; // gravità caduta del getto d'acqua
        p.life--;

        // Quando il lip tocca l'acqua sotto -> impatto con spruzzi di schiuma bianca
        const waterY = this.getWaterHeight(p.x);
        if (p.y >= waterY) {
          for (let k = 0; k < 2; k++) {
            this.foamParticles.push({
              x: p.x + (Math.random() * 6 - 3),
              y: waterY + (Math.random() * 4 - 2),
              vx: p.vx * 0.4 + (Math.random() * 2 - 1),
              vy: -Math.random() * 1.5,
              life: 30,
              maxLife: 30,
              size: 3
            });
          }
          this.curlingLipParts.splice(i, 1);
        } else if (p.life <= 0) {
          this.curlingLipParts.splice(i, 1);
        }
      }
    }

    updateFoamAndSeaLife(dt) {
      // Particelle schiuma
      for (let i = this.foamParticles.length - 1; i >= 0; i--) {
        const f = this.foamParticles[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vx *= 0.94;
        f.vy *= 0.94;
        f.life--;
        if (f.life <= 0) this.foamParticles.splice(i, 1);
      }

      // Fauna marina (Tartaruga e pesciolini)
      for (let i = 0; i < this.seaCreatures.length; i++) {
        const c = this.seaCreatures[i];
        c.x += c.vx;
        c.anim += dt * 3.5;
        c.y += Math.sin(c.anim) * 0.35;

        // Limiti mondo
        if (c.x > this.width + 30) c.x = -30;
        if (c.x < -30) c.x = this.width + 30;

        // Mantieni i pesci sotto il pelo dell'acqua e sopra il fondale
        const surfY = this.getWaterHeight(c.x);
        const bedY = this.getSeabedHeight(c.x);
        c.y = Math.max(surfY + 20, Math.min(bedY - 15, c.y));
      }
    }

    getWaterHeight(x) {
      const clampedX = Math.max(0, Math.min(this.width, x));
      const stepX = this.width / (this.numPoints - 1);
      const idx = Math.floor(clampedX / stepX);
      const nextIdx = Math.min(this.numPoints - 1, idx + 1);
      const t = (clampedX - idx * stepX) / stepX;

      return this.waterSurface[idx] * (1 - t) + this.waterSurface[nextIdx] * t;
    }

    getWaterSlope(x) {
      const d = 6;
      const y1 = this.getWaterHeight(x - d);
      const y2 = this.getWaterHeight(x + d);
      return Math.atan2(y2 - y1, d * 2);
    }

    getSeabedHeight(x) {
      const clampedX = Math.max(0, Math.min(this.width, x));
      const stepX = this.width / (this.numPoints - 1);
      const idx = Math.floor(clampedX / stepX);
      const nextIdx = Math.min(this.numPoints - 1, idx + 1);
      const t = (clampedX - idx * stepX) / stepX;

      return this.seabed[idx] * (1 - t) + this.seabed[nextIdx] * t;
    }

    getWaterVelocityAt(x, y) {
      const stepX = this.width / (this.numPoints - 1);
      const idx = Math.max(0, Math.min(this.numPoints - 1, Math.floor(x / stepX)));
      return {
        vx: this.waterVelocityX[idx] || 0,
        vy: this.waterVelocityY[idx] || 0
      };
    }
  }

  // ----------------------------------------------------------------------------
  // 4. FISICA CORPO RIGIDO DEL SURFISTA (IDRODINAMICA & CONTROLLO REALE)
  // ----------------------------------------------------------------------------
  class RealisticSurferBody {
    constructor(craftKey = 'shortboard') {
      this.craft = CRAFT_TYPES[craftKey] || CRAFT_TYPES.shortboard;
      this.reset();
    }

    reset() {
      this.x = 110;
      this.y = 180;
      this.vx = 0;
      this.vy = 0;
      this.angle = 0; // radianti inclinazione tavola
      this.angularVelocity = 0;

      // STATI:
      // 'PADDLING'      -> Sdraiato a remare
      // 'SURFING'       -> In piedi in planata sulla parete
      // 'BARRELED'      -> Nel tubo dell'onda
      // 'AIR'           -> In volo sopra la cresta
      // 'WIPEOUT'       -> Slammed / Caduto in acqua con rotolamento
      this.state = 'PADDLING';

      this.score = 0;
      this.rideTime = 0;
      this.barrelTime = 0;
      this.totalBarrelTime = 0;
      this.comboMultiplier = 1;

      this.isStallActive = false;
      this.inputSteer = 0; // -1 (nose up / climb), +1 (nose down / drop)
      this.inputThrust = 0; // +1 (paddle forward / pump)

      this.actionText = '';
      this.actionTimer = 0;
      this.actionColor = '#FFFFFF';

      this.sprayTrail = [];
    }

    setCraft(craftKey) {
      if (CRAFT_TYPES[craftKey]) this.craft = CRAFT_TYPES[craftKey];
    }

    popUp() {
      if (this.state === 'PADDLING') {
        this.state = 'SURFING';
        this.vx = Math.max(4.5, this.vx * 1.3);
        this.showMessage('⚡ POP-UP! ON THE WAVE!', '#10B981');
        return true;
      }
      if (this.state === 'SURFING') {
        // Snap radicale se già in piedi
        return this.snap();
      }
      return false;
    }

    snap() {
      if (this.state === 'SURFING' && Math.abs(this.vx) > 4.0) {
        this.vx *= 0.85;
        this.angularVelocity = 0.35;
        this.comboMultiplier++;
        const pts = 600 * this.comboMultiplier;
        this.score += pts;
        this.showMessage(`💥 RADICAL SNAP! +${pts}`, '#EC4899');
        return true;
      }
      return false;
    }

    showMessage(text, color = '#FFFFFF') {
      this.actionText = text;
      this.actionColor = color;
      this.actionTimer = 60;
    }

    update(ocean, audio, dt) {
      const waterY = ocean.getWaterHeight(this.x);
      const waterSlope = ocean.getWaterSlope(this.x);
      const seabedY = ocean.getSeabedHeight(this.x);
      const waterVel = ocean.getWaterVelocityAt(this.x, this.y);

      // Scia e spray
      if (this.state === 'SURFING' || this.state === 'BARRELED') {
        this.sprayTrail.push({ x: this.x, y: this.y, life: 16 });
        if (this.sprayTrail.length > 25) this.sprayTrail.shift();
      }
      for (let i = this.sprayTrail.length - 1; i >= 0; i--) {
        this.sprayTrail[i].life--;
        if (this.sprayTrail[i].life <= 0) this.sprayTrail.splice(i, 1);
      }

      // Profondità di immersione
      const immersion = Math.max(0, (this.y + this.craft.thickness * 0.5) - waterY);
      const isSubmerged = immersion > 0;

      // 1. FORZA DI GRAVITÀ
      this.vy += CONFIG.GRAVITY;

      // 2. FORZA DI GALLEGGIAMENTO (ARCHIMEDE) & PLANATA IDRODINAMICA
      if (isSubmerged) {
        // Spinta idrostatica verso l'alto
        const buoyancyForce = immersion * 0.18 * this.craft.buoyancyCoeff;
        this.vy -= buoyancyForce;

        // Trascina la tavola con la corrente dell'onda
        this.vx += (waterVel.vx - this.vx) * 0.08;

        // Lift idrodinamico (la tavola scivola lungo la pendenza dell'onda)
        if (this.state === 'SURFING' || this.state === 'BARRELED') {
          const speed = Math.hypot(this.vx, this.vy);
          const attackAngle = this.angle - waterSlope;
          const lift = Math.sin(attackAngle) * speed * 0.15 * this.craft.liftCoeff;

          this.vy -= lift;
          this.vx += Math.cos(waterSlope) * 0.22; // spinta lungo la parete
        }

        // Attrito viscoso dell'acqua
        this.vx *= CONFIG.WATER_DRAG;
        this.vy *= CONFIG.WATER_DRAG;
      } else {
        // In aria
        this.vx *= CONFIG.AIR_DRAG;
        this.vy *= CONFIG.AIR_DRAG;
      }

      // 3. STATO PADDLING & CATCH WAVE
      if (this.state === 'PADDLING') {
        this.angle += (waterSlope - this.angle) * 0.2;

        if (this.inputThrust > 0.1) {
          // Remata in avanti
          this.vx += 0.22;
          if (Math.random() < 0.2) audio.playSpray();
        }

        // L'onda che arriva dietro crea una forte pendenza: se hai velocità sufficiente parti!
        if (waterSlope < -0.26 && this.vx > 2.2) {
          this.showMessage('🌊 ONDA PRESA! Tocca POP-UP!', '#F59E0B');
        }
      }

      // 4. STATO SURFING (IN PIEDI SULLA PARETE)
      else if (this.state === 'SURFING' || this.state === 'BARRELED') {
        this.rideTime += dt;

        // Controllo orientamento tramite input
        if (this.inputSteer < -0.1) {
          // Gira verso la cresta (Carve Up / Bottom Turn Drive)
          this.angularVelocity = -0.06 * this.craft.agility;
          this.vx -= 0.08;
          this.vy -= 0.28;
        } else if (this.inputSteer > 0.1) {
          // Gira verso la base (Drop / Accelerate down the face)
          this.angularVelocity = 0.06 * this.craft.agility;
          this.vx += 0.25;
          this.vy += 0.15;
        } else {
          // Tendenza ad allinearsi alla pendenza dell'acqua
          this.angularVelocity += (waterSlope - this.angle) * 0.08;
          this.angularVelocity *= 0.82;
        }
        this.angle += this.angularVelocity;

        // Stall (frenata con la mano nell'acqua per farsi inglobare nel barile)
        if (this.isStallActive) {
          this.vx = Math.max(1.5, this.vx * 0.92);
          if (Math.random() < 0.25) audio.playSpray();
        }

        // Controllo se è nel tubo (Barreled)
        const isUnderLip = (waterSlope < -0.42 || Math.abs(waterY - this.y) < 12) && (this.x > 80 && this.x < 240);
        if (isUnderLip && this.y < waterY + 8) {
          if (this.state !== 'BARRELED') {
            this.state = 'BARRELED';
            audio.playTubeChime();
          }
          this.barrelTime += dt;
          this.totalBarrelTime += dt;
          const barrelPts = Math.floor(25 * this.comboMultiplier);
          this.score += barrelPts;
          this.showMessage(`🌊 IN THE BARREL! +${barrelPts}`, '#38BDF8');
        } else {
          if (this.state === 'BARRELED') {
            this.state = 'SURFING';
            if (this.barrelTime > 1.2) {
              const spitPts = Math.floor(1200 * this.barrelTime * this.comboMultiplier);
              this.score += spitPts;
              this.showMessage(`💥 TUBE SPIT OUT! +${spitPts}`, '#FBBF24');
              audio.playTubeChime();
              this.comboMultiplier++;
            }
            this.barrelTime = 0;
          }
        }

        // Air Section: decollo dalla cresta dell'onda a tutta velocità!
        if (this.y < waterY - 8 && this.vy < -2.5 && Math.abs(this.vx) > 5.5) {
          this.state = 'AIR';
          this.showMessage('🚀 AIR LAUNCH OFF THE LIP!', '#6366F1');
        }

        // Collisione con il fondale o schiacciato dalla cresta -> WIPEOUT
        if (this.y >= seabedY - 6) {
          this.triggerWipeout('💥 SLAMMED ON THE REEF!', ocean, audio);
          return;
        }

        // Punti continui per la surfata
        this.score += Math.floor(Math.abs(this.vx) * 0.2);
        audio.setDynamicAcoustics(this.state === 'BARRELED', Math.min(1.0, this.vx / 10));
      }

      // 5. STATO AIR (AERIAL IN VOLO)
      else if (this.state === 'AIR') {
        this.angle += this.angularVelocity;
        if (this.y >= waterY - 2) {
          // Atterraggio
          if (Math.abs(this.angle - waterSlope) < 0.75) {
            this.state = 'SURFING';
            this.comboMultiplier++;
            const pts = 800 * this.comboMultiplier;
            this.score += pts;
            this.showMessage(`✨ CLEAN AIR RE-ENTRY! +${pts}`, '#10B981');
            audio.playSpray();
          } else {
            this.triggerWipeout('💥 HARD AIR CRASH!', ocean, audio);
            return;
          }
        }
      }

      // 6. STATO WIPEOUT (ROTOLAMENTO SOTT'ACQUA)
      else if (this.state === 'WIPEOUT') {
        this.angle += 0.2;
        this.angularVelocity *= 0.95;
        this.vx *= 0.92;
        this.vy *= 0.92;

        if (this.y < waterY + 10) this.y += 0.5;

        this.wipeoutTimer--;
        if (this.wipeoutTimer <= 0) {
          this.state = 'PADDLING';
          this.vx = 0;
          this.vy = 0;
          this.angle = 0;
        }
      }

      // Integrazione velocità -> posizione
      this.x += this.vx;
      this.y += this.vy;

      // Limiti laterali dello schermo
      if (this.x < 25) {
        this.x = 25;
        this.vx = Math.max(0, this.vx);
      }
      if (this.x > CONFIG.WIDTH - 30) {
        this.x = CONFIG.WIDTH - 30;
        this.vx = Math.min(0, this.vx);
      }

      if (this.actionTimer > 0) this.actionTimer--;
    }

    triggerWipeout(reason, ocean, audio) {
      this.state = 'WIPEOUT';
      this.wipeoutTimer = 75;
      this.comboMultiplier = 1;
      this.barrelTime = 0;
      this.vx = -1.8;
      this.vy = 1.2;
      this.showMessage(reason, '#EF4444');
      audio.playWipeout();

      if (navigator.vibrate) {
        try { navigator.vibrate([80, 40, 120]); } catch (e) {}
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(Math.round(this.x), Math.round(this.y));
      ctx.rotate(this.angle);

      const b = this.craft;
      const isLying = this.state === 'PADDLING' || this.state === 'WIPEOUT';

      // 1. Tavola da surf
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-b.length / 2, 2, b.length, b.thickness);
      ctx.fillStyle = '#FF385C'; // Strip centrale rossa
      ctx.fillRect(-b.length / 2 + 4, 3, b.length - 8, 2);

      // Pinne sotto la tavola
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(-b.length / 2 + 2, 2 + b.thickness, 4, 3);

      // 2. Surfer in pixel art
      if (isLying) {
        // Sdraiato a remare
        ctx.fillStyle = '#FF385C'; // costume
        ctx.fillRect(-8, -2, 10, 4);
        ctx.fillStyle = '#FFCC99'; // pelle
        ctx.fillRect(0, -3, 8, 4);
        ctx.fillRect(6, -6, 6, 6); // testa
        ctx.fillStyle = '#4A2E18'; // capelli
        ctx.fillRect(5, -7, 7, 3);

        // Occhiali 😎
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(8, -5, 4, 2);

        // Braccio che rema
        const paddleSwing = Math.sin(Date.now() * 0.014) * 4;
        ctx.fillStyle = '#FFCC99';
        ctx.fillRect(2, -1 + paddleSwing, 3, 5);
      } else {
        // In piedi sulla tavola
        const hipY = this.state === 'BARRELED' || this.isStallActive ? -2 : -6;
        const headY = this.state === 'BARRELED' || this.isStallActive ? -10 : -18;

        // Gambe
        ctx.fillStyle = '#FFCC99';
        ctx.fillRect(-5, hipY + 4, 4, 4);
        ctx.fillRect(3, hipY + 4, 4, 4);

        // Costume
        ctx.fillStyle = '#FF385C';
        ctx.fillRect(-6, hipY, 13, 5);

        // Busto
        ctx.fillStyle = '#FFCC99';
        ctx.fillRect(-4, headY + 5, 9, 6);

        // Braccia / Hand drag nel tubo
        if (this.state === 'BARRELED' || this.isStallActive) {
          ctx.fillRect(-9, headY + 8, 5, 3);
          ctx.fillRect(-11, headY + 11, 3, 3); // mano nell'acqua
          ctx.fillRect(4, headY + 4, 6, 3);
        } else {
          ctx.fillRect(-8, headY + 6, 4, 3);
          ctx.fillRect(4, headY + 6, 5, 3);
        }

        // Testa
        ctx.fillStyle = '#FFCC99';
        ctx.fillRect(-3, headY - 4, 8, 8);

        // Capelli
        ctx.fillStyle = '#4A2E18';
        ctx.fillRect(-4, headY - 6, 9, 4);

        // Occhiali 😎
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, headY - 2, 5, 3);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(2, headY - 2, 1, 1);
      }

      ctx.restore();

      // Testo azione a schermo
      if (this.actionTimer > 0) {
        ctx.save();
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.actionColor || '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 5;
        const textY = Math.round(this.y) - 26 - (60 - this.actionTimer) * 0.3;
        ctx.fillText(this.actionText, Math.round(this.x), textY);
        ctx.restore();
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 5. RENDERER 2.5D DELL'OCEANO, FONDALI & GETTI D'ACQUA DEL TUBO
  // ----------------------------------------------------------------------------
  class RealisticOceanRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
    }

    render(ocean, surfer, timeSec) {
      const ctx = this.ctx;
      const w = CONFIG.WIDTH;
      const h = CONFIG.HEIGHT;

      ctx.clearRect(0, 0, w, h);

      // 1. Cielo Salentino e Sole
      this.drawSky(ctx, ocean.spot, timeSec);

      // 2. Costa in lontananza
      this.drawCoast(ctx);

      // 3. Fondale Marino (Sabbia o Reef con vegetazione marina)
      this.drawSeabed(ctx, ocean);

      // 4. Fauna marina (Tartarughe e pesci)
      this.drawSeaLife(ctx, ocean);

      // 5. Massa d'acqua multistrato con trasparenza
      this.drawWaterBody(ctx, ocean);

      // 6. Getti d'acqua del lip che curva (Tube Barrel) & Schiuma
      this.drawCurlingLipAndFoam(ctx, ocean);

      // 7. Scia del Surfer
      this.drawSurferTrail(ctx, surfer);

      // 8. Surfer
      surfer.draw(ctx);
    }

    drawSky(ctx, spot, timeSec) {
      const w = CONFIG.WIDTH;
      const grad = ctx.createLinearGradient(0, 0, 0, 180);

      if (spot.seabedType === 'slab') {
        grad.addColorStop(0, '#0284C7');
        grad.addColorStop(0.6, '#FDE68A');
        grad.addColorStop(1, '#F59E0B');
      } else {
        grad.addColorStop(0, '#38BDF8');
        grad.addColorStop(0.65, '#BAE6FD');
        grad.addColorStop(1, '#FEF08A');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, 180);

      // Sole
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(w - 55, 26, 20, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(w - 50, 31, 10, 10);
    }

    drawCoast(ctx) {
      const baseY = 110;
      ctx.fillStyle = '#64748B'; // Scogliera Gallipoli / Mancaversa
      ctx.fillRect(220, baseY - 12, 60, 12);
      ctx.fillRect(320, baseY - 8, 90, 8);
    }

    drawSeabed(ctx, ocean) {
      const w = CONFIG.WIDTH;
      const h = CONFIG.HEIGHT;
      const stepX = w / (ocean.numPoints - 1);

      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < ocean.numPoints; i++) {
        ctx.lineTo(i * stepX, ocean.seabed[i]);
      }
      ctx.lineTo(w, h);
      ctx.closePath();

      if (ocean.spot.seabedType === 'reef' || ocean.spot.seabedType === 'slab') {
        ctx.fillStyle = '#78350F';
        ctx.fill();
        ctx.fillStyle = '#451A03';
        for (let i = 0; i < ocean.numPoints; i += 3) {
          ctx.fillRect(i * stepX, ocean.seabed[i], 8, 6);
        }
      } else {
        ctx.fillStyle = '#F59E0B';
        ctx.fill();
        ctx.fillStyle = '#D97706';
        ctx.fillRect(0, h - 14, w, 14);
      }

      // Posidonia oceanica / Alghe verdi
      ctx.fillStyle = '#15803D';
      for (let i = 8; i < ocean.numPoints - 8; i += 7) {
        const x = i * stepX;
        const y = ocean.seabed[i];
        const sway = Math.sin(Date.now() * 0.004 + i) * 4;
        ctx.fillRect(x + sway, y - 8, 3, 8);
        ctx.fillRect(x + 3 + sway * 0.7, y - 6, 2, 6);
      }
    }

    drawSeaLife(ctx, ocean) {
      for (let i = 0; i < ocean.seaCreatures.length; i++) {
        const c = ocean.seaCreatures[i];
        if (c.type === 'turtle') {
          // Tartaruga marina Carretta Carretta
          ctx.fillStyle = '#166534';
          ctx.fillRect(Math.round(c.x), Math.round(c.y), 14, 8);
          ctx.fillStyle = '#15803D';
          ctx.fillRect(Math.round(c.x) + 3, Math.round(c.y) - 2, 8, 12);
          ctx.fillStyle = '#22C55E';
          ctx.fillRect(Math.round(c.x) + (c.vx > 0 ? 12 : -3), Math.round(c.y) + 2, 4, 4);
        } else {
          // Pesciolino
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(Math.round(c.x), Math.round(c.y), 7, 3);
          ctx.fillStyle = '#F43F5E';
          ctx.fillRect(Math.round(c.x) + (c.vx > 0 ? -2 : 7), Math.round(c.y) + 1, 2, 2);
        }
      }
    }

    drawWaterBody(ctx, ocean) {
      const w = CONFIG.WIDTH;
      const h = CONFIG.HEIGHT;
      const stepX = w / (ocean.numPoints - 1);

      // 1. Corpo d'acqua profondo (#0369A1)
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < ocean.numPoints; i++) {
        ctx.lineTo(i * stepX, ocean.waterSurface[i] + 16);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(3, 105, 161, 0.85)';
      ctx.fill();

      // 2. Strato intermedio turchese cyan (#0284C7)
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < ocean.numPoints; i++) {
        ctx.lineTo(i * stepX, ocean.waterSurface[i] + 6);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(2, 132, 199, 0.75)';
      ctx.fill();

      // 3. Superficie d'acqua cristallina (#22D3EE)
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < ocean.numPoints; i++) {
        ctx.lineTo(i * stepX, ocean.waterSurface[i]);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.fill();

      // 4. Cresta bianca schiumosa
      ctx.fillStyle = '#FFFFFF';
      for (let i = 1; i < ocean.numPoints - 1; i++) {
        const y = ocean.waterSurface[i];
        if (y < ocean.baseTide - 10) {
          ctx.fillRect(Math.round(i * stepX) - 2, Math.round(y) - 1, 4, 3);
        }
      }
    }

    drawCurlingLipAndFoam(ctx, ocean) {
      // Getti d'acqua del tubo
      for (let i = 0; i < ocean.curlingLipParts.length; i++) {
        const p = ocean.curlingLipParts[i];
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }

      // Schiuma di impatto
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      for (let i = 0; i < ocean.foamParticles.length; i++) {
        const f = ocean.foamParticles[i];
        ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size);
      }
    }

    drawSurferTrail(ctx, surfer) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < surfer.sprayTrail.length; i++) {
        const p = surfer.sprayTrail[i];
        const s = Math.max(1, Math.floor(p.life / 4));
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 6. GESTORE GIOCO SANDBOX COMPLETO & CONTROLLI (TOUCH, JOYSTICK, SCULPT)
  // ----------------------------------------------------------------------------
  class SalentoSurfSandboxEngine {
    constructor() {
      this.canvas = null;
      this.renderer = null;
      this.ocean = null;
      this.surfer = null;
      this.audio = null;

      this.currentSpotKey = 'baia_verde';
      this.currentCraftKey = 'shortboard';
      this.isSculptMode = false; // Se attivo, toccare il canvas scava/alza il fondale!

      this.highScore = 0;
      this.bestBarrelTime = 0;
      this.bestRideTime = 0;

      this.lastTimestamp = 0;
      this.animId = null;

      this.touchStartX = 0;
      this.touchStartY = 0;
      this.isPointerDown = false;

      this.loadRecords();
    }

    loadRecords() {
      try {
        const saved = localStorage.getItem('salento_surf_real_sim_v1');
        if (saved) {
          const d = JSON.parse(saved);
          this.highScore = d.highScore || 0;
          this.bestBarrelTime = d.bestBarrelTime || 0;
          this.bestRideTime = d.bestRideTime || 0;
          this.currentSpotKey = d.spotKey || 'baia_verde';
          this.currentCraftKey = d.craftKey || 'shortboard';
        }
      } catch (e) {}
    }

    saveRecords() {
      try {
        if (this.surfer.score > this.highScore) this.highScore = this.surfer.score;
        if (this.surfer.totalBarrelTime > this.bestBarrelTime) {
          this.bestBarrelTime = Number(this.surfer.totalBarrelTime.toFixed(1));
        }
        if (this.surfer.rideTime > this.bestRideTime) {
          this.bestRideTime = Number(this.surfer.rideTime.toFixed(0));
        }

        const d = {
          highScore: this.highScore,
          bestBarrelTime: this.bestBarrelTime,
          bestRideTime: this.bestRideTime,
          spotKey: this.currentSpotKey,
          craftKey: this.currentCraftKey
        };
        localStorage.setItem('salento_surf_real_sim_v1', JSON.stringify(d));
      } catch (e) {}
    }

    init(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      this.canvas.width = CONFIG.WIDTH;
      this.canvas.height = CONFIG.HEIGHT;

      const spot = SALENTO_SPOTS[this.currentSpotKey] || SALENTO_SPOTS.baia_verde;
      this.ocean = new FluidOceanSimulator(spot);
      this.renderer = new RealisticOceanRenderer(this.canvas);
      this.surfer = new RealisticSurferBody(this.currentCraftKey);
      this.audio = new RealisticOceanAudio();

      this.bindInputs();
      this.updateRecordsUI();

      // Avvia simulazione continua in tempo reale
      this.lastTimestamp = performance.now();
      if (this.animId) cancelAnimationFrame(this.animId);
      this.loop(this.lastTimestamp);
    }

    setSpotPreset(spotKey) {
      if (SALENTO_SPOTS[spotKey]) {
        this.currentSpotKey = spotKey;
        this.ocean.setSpot(spotKey);
        this.surfer.showMessage(`📍 Spot: ${SALENTO_SPOTS[spotKey].name}`, '#38BDF8');
        this.saveRecords();
        this.updateSandboxUI();
      }
    }

    setBoardType(craftKey) {
      if (CRAFT_TYPES[craftKey]) {
        this.currentCraftKey = craftKey;
        this.surfer.setCraft(craftKey);
        this.surfer.showMessage(`🏄 Tavola: ${CRAFT_TYPES[craftKey].name}`, '#F59E0B');
        this.saveRecords();
        this.updateSandboxUI();
      }
    }

    setCustomWaveHeight(val) {
      if (this.ocean) this.ocean.swellHeight = Number(val);
    }
    setCustomWaveSpeed(val) {
      if (this.ocean) this.ocean.swellSpeed = Number(val);
    }
    setCustomWind(val) {
      if (this.ocean) this.ocean.wind = Number(val);
    }

    triggerBigSetWave() {
      if (!this.ocean) return;
      this.ocean.swellHeight += 20;
      this.surfer.showMessage('🌊 SET GIGANTE IN ARRIVO!', '#EC4899');
      this.audio.playTubeChime();
      setTimeout(() => {
        const spot = SALENTO_SPOTS[this.currentSpotKey] || SALENTO_SPOTS.baia_verde;
        if (this.ocean) this.ocean.swellHeight = spot.swellHeight;
      }, 8000);
    }

    toggleSculptMode() {
      this.isSculptMode = !this.isSculptMode;
      this.surfer.showMessage(this.isSculptMode ? '🖌️ SCULPT MODE: Trascina per scavare/alzare il fondale!' : '🏄 SURF MODE ATTIVO', '#10B981');
      return this.isSculptMode;
    }

    bindInputs() {
      if (!this.canvas) return;

      const handlePointerDown = (e) => {
        e.preventDefault();
        this.audio.init();
        this.audio.resume();

        const touch = e.touches ? e.touches[0] : e;
        const rect = this.canvas.getBoundingClientRect();
        this.touchStartX = ((touch.clientX - rect.left) / rect.width) * CONFIG.WIDTH;
        this.touchStartY = ((touch.clientY - rect.top) / rect.height) * CONFIG.HEIGHT;
        this.isPointerDown = true;

        if (this.isSculptMode) {
          // Modalità pennello fondale: scava o alza in base all'altezza del tocco
          const delta = this.touchStartY < 150 ? -12 : 12;
          this.ocean.sculptSeabed(this.touchStartX, delta);
        } else {
          this.processSurferTouch(this.touchStartX, this.touchStartY);
        }
      };

      const handlePointerMove = (e) => {
        if (!this.isPointerDown) return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const rect = this.canvas.getBoundingClientRect();
        const curX = ((touch.clientX - rect.left) / rect.width) * CONFIG.WIDTH;
        const curY = ((touch.clientY - rect.top) / rect.height) * CONFIG.HEIGHT;

        if (this.isSculptMode) {
          const delta = curY < 150 ? -8 : 8;
          this.ocean.sculptSeabed(curX, delta);
        } else {
          const dy = curY - this.touchStartY;
          const dx = curX - this.touchStartX;

          // Su / Giù -> Trim e Carving
          if (dy < -8) this.surfer.inputSteer = -1; // Sali alla cresta
          else if (dy > 8) this.surfer.inputSteer = 1; // Scendi al fondo
          else this.surfer.inputSteer = 0;

          // Sinistra -> Stall / Hand drag nel tubo
          this.surfer.isStallActive = dx < -14;
          // Destra -> Paddle / Spinta in avanti
          this.surfer.inputThrust = dx > 10 ? 1 : 0;
        }
      };

      const handlePointerUp = (e) => {
        e.preventDefault();
        this.isPointerDown = false;
        if (this.surfer) {
          this.surfer.inputSteer = 0;
          this.surfer.inputThrust = 0;
          this.surfer.isStallActive = false;
        }
      };

      this.processSurferTouch = (x, y) => {
        if (y < 120) this.surfer.inputSteer = -1;
        else if (y > 180) this.surfer.inputSteer = 1;

        if (x < CONFIG.WIDTH * 0.35) this.surfer.isStallActive = true;
        else if (x > CONFIG.WIDTH * 0.65) this.surfer.inputThrust = 1;
      };

      this.canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
      this.canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
      this.canvas.addEventListener('touchend', handlePointerUp, { passive: false });
      this.canvas.addEventListener('mousedown', handlePointerDown);
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);

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
          if (e.code === 'ArrowUp' || e.code === 'KeyW') this.surfer.inputSteer = -1;
          if (e.code === 'ArrowDown' || e.code === 'KeyS') this.surfer.inputSteer = 1;
          if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.surfer.isStallActive = true;
          if (e.code === 'ArrowRight' || e.code === 'KeyD') this.surfer.inputThrust = 1;
        }
      });

      window.addEventListener('keyup', (e) => {
        if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) this.surfer.inputSteer = 0;
        if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
          this.surfer.isStallActive = false;
          this.surfer.inputThrust = 0;
        }
      });
    }

    loop(timestamp) {
      const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.08);
      this.lastTimestamp = timestamp;

      // Aggiorna Simulatore
      this.ocean.update(dt);
      this.surfer.update(this.ocean, this.audio, dt);

      // Render scena
      this.renderer.render(this.ocean, this.surfer, timestamp * 0.001);

      // Aggiorna HUD
      this.updateHUD();
      this.saveRecords();

      this.animId = requestAnimationFrame((t) => this.loop(t));
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

      if (btnPopUp) {
        if (this.surfer.state === 'PADDLING') {
          btnPopUp.textContent = '⚡ POP-UP';
          btnPopUp.style.background = '#10B981';
        } else {
          btnPopUp.textContent = '💥 SNAP';
          btnPopUp.style.background = '#EC4899';
        }
      }

      if (comboEl) {
        if (this.surfer.comboMultiplier > 1) {
          comboEl.textContent = `x${this.surfer.comboMultiplier} COMBO!`;
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
      document.querySelectorAll('.spot-preset-pill').forEach(p => p.classList.remove('active'));
      const spotEl = document.getElementById(`spotPill_${this.currentSpotKey}`);
      if (spotEl) spotEl.classList.add('active');

      document.querySelectorAll('.board-type-pill').forEach(p => p.classList.remove('active'));
      const boardEl = document.getElementById(`boardPill_${this.currentCraftKey}`);
      if (boardEl) boardEl.classList.add('active');
    }

    toggleAudioMute() {
      if (!this.audio) return false;
      const isMuted = this.audio.toggleMute();
      const muteBtn = document.getElementById('btnSurfMute');
      if (muteBtn) muteBtn.textContent = isMuted ? '🔇 Audio Off' : '🔊 Audio On';
      return isMuted;
    }
  }

  // Istanza globale
  window.SalentoSurf = new SalentoSurfSandboxEngine();

})(window);
