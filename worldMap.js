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
          color: this.colors[Math.floor(Math.random() * this.colors.length)]
        });
      }
    }
  }

  drawHex(ctx, x, y, radius, color, isActive) {
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

    if (isActive) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#e53e3e';
      // Optional: add a slight red overlay
      ctx.fillStyle = 'rgba(229, 62, 62, 0.3)';
      ctx.fill();
    } else {
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#cbd5e0';
    }

    ctx.stroke();
  }

  draw(ctx) {
    // Collect active deployment hexes to make lookup faster
    const activeHexes = new Set();
    if (window.missionManager && window.missionManager.activeDeployments) {
      window.missionManager.activeDeployments.forEach(d => {
        if (d.hex) activeHexes.add(d.hex);
      });
    }

    for (const hex of this.hexes) {
      const isActive = activeHexes.has(hex);
      this.drawHex(ctx, hex.x, hex.y, this.hexRadius, hex.color, isActive);
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

    // Generate a mission for this hex if it doesn't have one
    if (!hex.mission) {
      // Temporarily use missionManager to generate 1 mission
      window.missionManager.generateMissions(1);
      hex.mission = window.missionManager.missions.pop();
    }

    const deployMenu = document.getElementById('deploy-menu-stub');
    if (deployMenu) {
      deployMenu.style.display = 'block';

      const coordsInfo = document.getElementById('deploy-coords');
      if (coordsInfo) {
        coordsInfo.innerText = `Hex Location: (${hex.q}, ${hex.r})`;
      }

      // Update UI with mission details
      const m = hex.mission;
      document.getElementById('deploy-mission-name').innerText = m.name;
      document.getElementById('deploy-mission-diff').innerText = '★'.repeat(m.difficulty) + '☆'.repeat(5 - m.difficulty);
      const durationMins = Math.round(m.duration / 3600);
      document.getElementById('deploy-mission-time').innerText = `${durationMins} min${durationMins > 1 ? 's' : ''}`;
      document.getElementById('deploy-mission-reqs').innerText = `${m.minSoldiers} Soldiers, ${m.minMedics} Medics`;

      // Update available troops and input maxes
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
    }
  }

  closeDeployMenu() {
    this.selectedHex = null;
    const deployMenu = document.getElementById('deploy-menu-stub');
    if (deployMenu) {
      deployMenu.style.display = 'none';
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

    // Add to active deployments
    window.missionManager.activeDeployments.push({
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
}
