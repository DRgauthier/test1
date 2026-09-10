class WorldMap {
  constructor(cols = 20, rows = 20) {
    this.cols = cols;
    this.rows = rows;
    this.hexRadius = 40;
    this.hexWidth = Math.sqrt(3) * this.hexRadius;
    this.hexHeight = 2 * this.hexRadius;
    this.hexes = [];

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
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
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

  draw(ctx) {
    for (const hex of this.hexes) {
      this.drawHex(ctx, hex.x, hex.y, this.hexRadius, hex.color, hex.state);
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
      document.getElementById('deploy-mission-reqs').innerText = `${m.minSoldiers} Soldiers, ${m.minMedics} Medics`;

      const availS = window.npcManager.counts.soldier;
      const availM = window.npcManager.counts.medic;

      document.getElementById('deploy-avail-s').innerText = availS;
      document.getElementById('deploy-avail-m').innerText = availM;

      const sInput = document.getElementById('world-deploy-s');
      const mInput = document.getElementById('world-deploy-m');
      sInput.max = availS;
      mInput.max = availM;
      sInput.value = 0;
      mInput.value = 0;

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

  deployGunship() {
    if (!this.selectedHex || !this.selectedHex.mission) return;

    const mission = this.selectedHex.mission;
    const sInput = document.getElementById('world-deploy-s');
    const mInput = document.getElementById('world-deploy-m');
    const sCount = parseInt(sInput.value) || 0;
    const mCount = parseInt(mInput.value) || 0;

    if (sCount < mission.minSoldiers || mCount < mission.minMedics) {
      return alert(`This mission requires at least ${mission.minSoldiers} Soldiers and ${mission.minMedics} Medics. You assigned ${sCount} Soldiers and ${mCount} Medics.`);
    }
    if (sCount > window.npcManager.counts.soldier || mCount > window.npcManager.counts.medic) {
      return alert("You do not have enough troops available!");
    }

    // Remove troops
    window.missionManager.removeTroops('SOLDIER', sCount);
    window.missionManager.removeTroops('MEDIC', mCount);

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
