// Simple seeded PRNG (Mulberry32)
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

class WorldMap {
  constructor(cols = 20, rows = 20, seed = '12345') {
    this.cols = cols;
    this.rows = rows;
    this.hexRadius = 40;
    this.hexWidth = Math.sqrt(3) * this.hexRadius;
    this.hexHeight = 2 * this.hexRadius;
    this.hexes = [];
    this.seed = parseInt(seed) || 12345;
    this.rng = mulberry32(this.seed);

    // Some placeholder colors for biomes
    this.colors = ['#2d3748', '#4a5568', '#276749', '#2f855a', '#744210'];

    this.generateMap();
  }

  generateMap() {
    for (let r = 0; r < this.rows; r++) {
      for (let q = 0; q < this.cols; q++) {
        // Offset coordinates to axial or directly to pixel
        const xOffset = (r % 2 === 0) ? 0 : this.hexWidth / 2;
        const x = q * this.hexWidth + xOffset;
        const y = r * this.hexHeight * 0.75;

        this.hexes.push({
          q: q,
          r: r,
          x: x,
          y: y,
          color: this.colors[Math.floor(this.rng() * this.colors.length)],
          state: 'EMPTY'
        });
      }
    }
  }

  drawHex(ctx, x, y, radius, color, hexState) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const hx = x + radius * Math.cos(angle);
      const hy = y + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(hx, hy);
      } else {
        ctx.lineTo(hx, hy);
      }
    }
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    if (hexState === 'ACTIVE') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#e53e3e';
      ctx.fillStyle = 'rgba(229, 62, 62, 0.3)';
      ctx.fill();
    } else if (hexState === 'RECALLING') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ecc94b';
      ctx.fillStyle = 'rgba(236, 201, 75, 0.3)';
      ctx.fill();
    } else if (hexState === 'HELD') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#48bb78';
      ctx.fillStyle = 'rgba(72, 187, 120, 0.3)';
      ctx.fill();
    } else {
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#cbd5e0';
    }

    ctx.stroke();
  }

  async fetchOtherPlayers() {
    if (!window.supabaseClient || !window.currentUser) return;

    const { data: players } = await window.supabaseClient
      .from('players')
      .select('*')
      .neq('id', window.currentUser.id);

    if (players) {
      this.otherPlayers = players;
    }
  }

  draw(ctx) {
    for (const hex of this.hexes) {
      this.drawHex(ctx, hex.x, hex.y, this.hexRadius, hex.color, hex.state);

      // Draw home base indicator for current player
      if (window.currentUser && hex.q === window.currentUser.hex_x && hex.r === window.currentUser.hex_y) {
        ctx.fillStyle = '#4299e1'; // Blue for home base
        ctx.beginPath();
        ctx.arc(hex.x, hex.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw indicators for other players
      if (this.otherPlayers) {
        for (const player of this.otherPlayers) {
          if (hex.q === player.hex_x && hex.r === player.hex_y) {
            ctx.fillStyle = '#e53e3e'; // Red for enemy bases
            ctx.beginPath();
            ctx.arc(hex.x, hex.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }
    }
  }

  getHexAt(worldX, worldY) {
    // Simple distance-based hit test for hexes
    let closestHex = null;
    let minDist = Infinity;

    for (const hex of this.hexes) {
      const dist = Math.hypot(hex.x - worldX, hex.y - worldY);
      if (dist < minDist) {
        minDist = dist;
        closestHex = hex;
      }
    }

    // Ensure we actually clicked *inside* the hex (roughly)
    if (minDist <= this.hexRadius) {
      return closestHex;
    }
    return null;
  }

  handleClick(worldX, worldY) {
    const clickedHex = this.getHexAt(worldX, worldY);
    if (clickedHex) {
      this.openDeployMenu(clickedHex);
    } else {
      this.closeDeployMenu();
    }
  }

  openDeployMenu(hex) {
    this.selectedHex = hex;

    const hexPanel = document.getElementById('hex-panel');
    if (!hexPanel) return;

    hexPanel.style.display = 'block';
    document.getElementById('hex-coords').innerText = `Hex Location: (${hex.q}, ${hex.r})`;

    // Hide all content sections first
    document.getElementById('hex-content-empty').style.display = 'none';
    document.getElementById('hex-content-held').style.display = 'none';
    document.getElementById('hex-content-active').style.display = 'none';

    // Calculate Gunship Capacity
    const gunshipCount = window.structureManager.buildings.filter(b => b.type.id === 'GUNSHIP').length;
    const activeDeploymentsCount = window.missionManager.activeDeployments.length;
    const hasAvailableGunship = gunshipCount > activeDeploymentsCount;

    if (hex.state === 'EMPTY') {
      document.getElementById('hex-content-empty').style.display = 'block';

      // Generate a mission for this hex if it doesn't have one
      if (!hex.mission) {
        window.missionManager.generateMissions(1);
        hex.mission = window.missionManager.missions.pop();
      }

      const m = hex.mission;
      document.getElementById('deploy-mission-name').innerText = m.name;
      document.getElementById('deploy-mission-diff').innerText = '★'.repeat(m.difficulty) + '☆'.repeat(5 - m.difficulty);
      const durationMins = Math.round(m.duration / 3600);
      document.getElementById('deploy-mission-time').innerText = `${durationMins} min${durationMins > 1 ? 's' : ''}`;

      let reqsString = `${m.minSoldiers} Soldiers, ${m.minMedics} Medics`;
      if (m.minJuggernauts) reqsString += `, ${m.minJuggernauts} Juggernauts`;
      document.getElementById('deploy-mission-reqs').innerText = reqsString;

      const availS = window.npcManager.counts.soldier;
      const availM = window.npcManager.counts.medic;
      const availJ = window.npcManager.counts.juggernaut || 0;

      document.getElementById('deploy-avail-s').innerText = availS;
      document.getElementById('deploy-avail-m').innerText = availM;
      if (document.getElementById('deploy-avail-j')) document.getElementById('deploy-avail-j').innerText = availJ;

      const sInput = document.getElementById('world-deploy-s');
      const mInput = document.getElementById('world-deploy-m');
      const jInput = document.getElementById('world-deploy-j');

      sInput.max = availS;
      mInput.max = availM;
      sInput.value = 0;
      mInput.value = 0;
      if (jInput) {
        jInput.max = availJ;
        jInput.value = 0;
      }

      const btn = document.getElementById('send-gunship-btn');
      const warning = document.getElementById('no-gunships-warning-empty');
      if (hasAvailableGunship) {
        btn.disabled = false;
        btn.style.opacity = 1;
        btn.style.cursor = 'pointer';
        warning.style.display = 'none';
      } else {
        btn.disabled = true;
        btn.style.opacity = 0.5;
        btn.style.cursor = 'not-allowed';
        warning.style.display = 'block';
      }
    } else if (hex.state === 'HELD') {
      document.getElementById('hex-content-held').style.display = 'block';
      document.getElementById('held-s-count').innerText = hex.garrison ? hex.garrison.soldiers : 0;
      document.getElementById('held-m-count').innerText = hex.garrison ? hex.garrison.medics : 0;

      const btn = document.getElementById('recall-troops-btn');
      const warning = document.getElementById('no-gunships-warning-held');
      if (hasAvailableGunship) {
        btn.disabled = false;
        btn.style.opacity = 1;
        btn.style.cursor = 'pointer';
        warning.style.display = 'none';
      } else {
        btn.disabled = true;
        btn.style.opacity = 0.5;
        btn.style.cursor = 'not-allowed';
        warning.style.display = 'block';
      }
    } else if (hex.state === 'ACTIVE' || hex.state === 'RECALLING') {
      document.getElementById('hex-content-active').style.display = 'block';
      document.getElementById('active-state-title').innerText = hex.state === 'ACTIVE' ? 'Deployment Active' : 'Recalling Troops';
      document.getElementById('active-state-title').style.color = hex.state === 'ACTIVE' ? '#fc8181' : '#ecc94b';

      // The actual timer update logic could go in a requestAnimationFrame loop, but for now we just show the initial remaining time.
      const deployment = window.missionManager.activeDeployments.find(d => d.hex === hex);
      if (deployment) {
        const remainingSecs = Math.ceil(deployment.timer / 60);
        const remMins = Math.floor(remainingSecs / 60);
        const remSecs = remainingSecs % 60;
        document.getElementById('hex-timer-display').innerText = `${remMins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
      }
    }
  }

  closeDeployMenu() {
    this.selectedHex = null;
    const hexPanel = document.getElementById('hex-panel');
    if (hexPanel) {
      hexPanel.style.display = 'none';
    }
  }

  getHighestAvailableGunshipCapacity() {
    let maxCap = 0;
    // We get the total number of built gunships
    const gunships = window.structureManager.buildings.filter(b => b.type.id === 'GUNSHIP' && !window.structureManager.isBuildingUnderConstruction(b));
    // Currently deployed gunships equal the number of active deployments + recalls
    // Active deployments represent an outgoing or returning gunship
    // For simplicity, we just check each gunship's theoretical max cap.
    // If we wanted to tie a specific gunship instance to a mission, we'd need to mark them 'in-use'.
    // For now, implicit rule: highest level gunship gives max cap.
    for (const b of gunships) {
      const cap = 20 + ((b.level - 1) * 10);
      if (cap > maxCap) {
        maxCap = cap;
      }
    }
    return maxCap;
  }

  deployGunship() {
    if (!this.selectedHex || !this.selectedHex.mission) return;

    const mission = this.selectedHex.mission;
    const sInput = document.getElementById('world-deploy-s');
    const mInput = document.getElementById('world-deploy-m');
    const jInput = document.getElementById('world-deploy-j');

    const sCount = parseInt(sInput.value) || 0;
    const mCount = parseInt(mInput.value) || 0;
    const jCount = jInput ? (parseInt(jInput.value) || 0) : 0;

    if (sCount < mission.minSoldiers || mCount < mission.minMedics || jCount < (mission.minJuggernauts || 0)) {
      return alert(`This mission requires at least ${mission.minSoldiers} Soldiers, ${mission.minMedics} Medics, and ${mission.minJuggernauts || 0} Juggernauts. You assigned ${sCount} Soldiers, ${mCount} Medics, and ${jCount} Juggernauts.`);
    }
    if (sCount > window.npcManager.counts.soldier || mCount > window.npcManager.counts.medic || jCount > (window.npcManager.counts.juggernaut || 0)) {
      return alert("You do not have enough troops available!");
    }

    // Determine max capacity of highest available gunship
    const maxGunshipCapacity = this.getHighestAvailableGunshipCapacity();
    if ((sCount + mCount + jCount) > maxGunshipCapacity) {
      return alert(`Your highest available gunship can only carry ${maxGunshipCapacity} troops. You attempted to deploy ${sCount + mCount + jCount}.`);
    }

    // Remove troops
    window.missionManager.removeTroops('SOLDIER', sCount);
    window.missionManager.removeTroops('MEDIC', mCount);
    if (jCount > 0) window.missionManager.removeTroops('JUGGERNAUT', jCount);

    // Update hex state
    this.selectedHex.state = 'ACTIVE';

    // Add to active deployments
    window.missionManager.activeDeployments.push({
      type: 'deploy',
      mission: mission,
      timer: mission.duration,
      duration: mission.duration,
      soldiers: sCount,
      medics: mCount,
      juggernauts: jCount,
      hex: this.selectedHex
    });

    console.log(`Gunship deployed to [${this.selectedHex.q}, ${this.selectedHex.r}]`);
    this.closeDeployMenu();
  }

  recallTroops() {
    if (!this.selectedHex || this.selectedHex.state !== 'HELD') return;

    // Update hex state
    this.selectedHex.state = 'RECALLING';

    // Original duration is attached to the mission if we kept it,
    // but in case we didn't store mission on HELD hex properly,
    // we can use a fixed base duration or the mission's duration.
    const recallDuration = this.selectedHex.mission ? Math.floor(this.selectedHex.mission.duration * 0.5) : 3600;

    window.missionManager.activeDeployments.push({
      type: 'recall',
      timer: recallDuration,
      duration: recallDuration,
      hex: this.selectedHex
    });

    console.log(`Recalling troops from [${this.selectedHex.q}, ${this.selectedHex.r}]`);
    this.closeDeployMenu();
  }
}
