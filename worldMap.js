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

  drawHex(ctx, x, y, radius, color) {
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
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#cbd5e0';
    ctx.stroke();
  }

  draw(ctx) {
    for (const hex of this.hexes) {
      this.drawHex(ctx, hex.x, hex.y, this.hexRadius, hex.color);
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
    }
  }

  openDeployMenu(hex) {
    this.selectedHex = hex;
    const deployMenu = document.getElementById('deploy-menu-stub');
    if (deployMenu) {
      deployMenu.style.display = 'block';
      const coordsInfo = document.getElementById('deploy-coords');
      if (coordsInfo) {
        coordsInfo.innerText = `Hex Location: (${hex.q}, ${hex.r})`;
      }
    }
  }

  closeDeployMenu() {
    this.selectedHex = null;
    const deployMenu = document.getElementById('deploy-menu-stub');
    if (deployMenu) {
      deployMenu.style.display = 'none';
    }
  }

  simulateDeploy() {
    if (this.selectedHex) {
      console.log(`Gunship deployed to [${this.selectedHex.q}, ${this.selectedHex.r}]`);
      this.closeDeployMenu();
    }
  }
}
