const BUILDING_TYPES = {
  HEADQUARTERS: { id: 'HEADQUARTERS', name: 'Command Center', width: 150, height: 150, color: '#4299e1', cost: { steel: 200, wood: 200, food: 0, water: 0 }, caps: { worker: 5, soldier: 5, medic: 0 } },
  BARRACKS: { id: 'BARRACKS', name: 'Barracks', width: 100, height: 100, color: '#e53e3e', cost: { steel: 100, wood: 50, food: 0, water: 0 }, caps: { soldier: 10 } },
  SUPPLY_DEPOT: { id: 'SUPPLY_DEPOT', name: 'Supply Depot', width: 50, height: 50, color: '#48bb78', cost: { steel: 50, wood: 50, food: 0, water: 0 } },
  GUNSHIP: { id: 'GUNSHIP', name: 'Gunship Pad', width: 120, height: 120, color: '#4a5568', cost: { steel: 300, wood: 100, food: 0, water: 0 } },
  TURRET: { id: 'TURRET', name: 'Defense Turret', width: 50, height: 50, color: '#ecc94b', cost: { steel: 100, wood: 0, food: 0, water: 0 } },
  WORKER_HUT: { id: 'WORKER_HUT', name: 'Worker Hut', width: 80, height: 80, color: '#ed8936', cost: { steel: 20, wood: 50, food: 0, water: 0 }, caps: { worker: 8 } },
  MEDIC_STATION: { id: 'MEDIC_STATION', name: 'Medic Station', width: 80, height: 80, color: '#fc8181', cost: { steel: 50, wood: 50, food: 0, water: 50 }, caps: { medic: 5 } },
  
  STEEL_MINE: { id: 'STEEL_MINE', name: 'Steel Mine', width: 60, height: 60, color: '#a0aec0', cost: { steel: 0, wood: 50, food: 20, water: 0 }, generates: 'steel' },
  LUMBER_MILL: { id: 'LUMBER_MILL', name: 'Lumber Mill', width: 60, height: 60, color: '#975a16', cost: { steel: 20, wood: 0, food: 20, water: 0 }, generates: 'wood' },
  FARM: { id: 'FARM', name: 'Farm', width: 80, height: 80, color: '#f6e05e', cost: { steel: 10, wood: 40, food: 0, water: 20 }, generates: 'food' },
  WATER_PUMP: { id: 'WATER_PUMP', name: 'Water Pump', width: 50, height: 50, color: '#63b3ed', cost: { steel: 40, wood: 10, food: 0, water: 0 }, generates: 'water' }
};

class Structure {
  constructor(typeId, x, y) {
    this.type = BUILDING_TYPES[typeId];
    this.x = x;
    this.y = y;
    
    this.maxHealth = 100;
    this.health = this.maxHealth;
  }

  draw(ctx) {
    ctx.fillStyle = this.type.color;
    ctx.fillRect(this.x, this.y, this.type.width, this.type.height);
    
    ctx.save();
    ctx.translate(this.x, this.y); 
    
    const w = this.type.width;
    const h = this.type.height;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;

    switch (this.type.id) {
      case 'HEADQUARTERS':
        ctx.beginPath();
        ctx.arc(w/2, h/2, w/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w/2, h/2, w/6, 0, Math.PI * 2);
        ctx.stroke();
        break;
        
      case 'BARRACKS':
        for(let i = 15; i < w; i += 15) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, h);
          ctx.stroke();
        }
        break;
        
      case 'SUPPLY_DEPOT':
        const pad = 6;
        const cw = w/2 - pad*1.5;
        const ch = h/2 - pad*1.5;
        const positions = [
          [pad, pad], [w/2 + pad/2, pad], 
          [pad, h/2 + pad/2], [w/2 + pad/2, h/2 + pad/2]
        ];
        positions.forEach(([cx, cy]) => {
          ctx.fillRect(cx, cy, cw, ch);
          ctx.strokeRect(cx, cy, cw, ch);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + cw, cy + ch);
          ctx.stroke();
        });
        break;
        
      case 'GUNSHIP':
        ctx.beginPath();
        ctx.arc(w/2, h/2, w/2 - 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(w/3, h/3); ctx.lineTo(w/3, h - h/3); 
        ctx.moveTo(w - w/3, h/3); ctx.lineTo(w - w/3, h - h/3); 
        ctx.moveTo(w/3, h/2); ctx.lineTo(w - w/3, h/2); 
        ctx.stroke();
        break;
        
      case 'TURRET':
        ctx.beginPath();
        ctx.arc(w/2, h/2, w/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(w/2, h/2 - 4, w/2 + 5, 8); 
        ctx.strokeRect(w/2, h/2 - 4, w/2 + 5, 8);
        break;
        
      case 'WORKER_HUT':
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(w/2, h/2); ctx.lineTo(w, 0);
        ctx.moveTo(0, h); ctx.lineTo(w/2, h/2); ctx.lineTo(w, h);
        ctx.stroke();
        break;
        
      case 'MEDIC_STATION':
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const crossW = w/4;
        const crossH = h/1.6;
        ctx.fillRect(w/2 - crossW/2, h/2 - crossH/2, crossW, crossH);
        ctx.fillRect(w/2 - crossH/2, h/2 - crossW/2, crossH, crossW);
        break;
        
      case 'STEEL_MINE':
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(w/2, h/2, w/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(w/2 - 6, h/2); ctx.lineTo(w/2 - 6, h);
        ctx.moveTo(w/2 + 6, h/2); ctx.lineTo(w/2 + 6, h);
        ctx.stroke();
        for(let ty = h/2 + 5; ty < h; ty += 8) {
          ctx.moveTo(w/2 - 10, ty); ctx.lineTo(w/2 + 10, ty);
        }
        ctx.stroke();
        break;
        
      case 'LUMBER_MILL':
        ctx.fillStyle = '#744210';
        ctx.fillRect(10, h/2 - 10, w - 20, 20);
        ctx.strokeRect(10, h/2 - 10, w - 20, 20);
        ctx.fillStyle = '#cbd5e0';
        ctx.beginPath();
        ctx.arc(w/2, h/2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1a202c';
        ctx.beginPath();
        ctx.arc(w/2, h/2, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'FARM':
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 5;
        for(let i = 15; i < w; i += 15) {
          ctx.beginPath();
          ctx.moveTo(i, 5);
          ctx.lineTo(i, h - 5);
          ctx.stroke();
        }
        break;
        
      case 'WATER_PUMP':
        ctx.fillStyle = '#2b6cb0';
        ctx.beginPath();
        ctx.arc(w/2, h/2, w/2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#718096';
        ctx.fillRect(w/2 - 6, h/4, 12, h/2);
        ctx.strokeRect(w/2 - 6, h/4, 12, h/2);
        break;
    }
    ctx.restore();

    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.type.width, this.type.height);

    if (this.health < this.maxHealth && this.health > 0) {
      const barHeight = 8;
      const barSpacing = 12; 
      const barY = this.y - barSpacing;
      const healthPercentage = this.health / this.maxHealth;

      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(this.x, barY, this.type.width, barHeight);
      ctx.fillStyle = '#48bb78';
      ctx.fillRect(this.x, barY, this.type.width * healthPercentage, barHeight);
      ctx.strokeStyle = '#1a202c';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x, barY, this.type.width, barHeight);
    }
  }
}

class StructureManager {
  constructor() {
    this.buildings = [];
    
    this.isBuilding = false;
    this.isDeconstructing = false;
    this.pendingBuildingType = null;
    
    this.ghostX = 0;
    this.ghostY = 0;
    this.isValidPlacement = false;
    this.hoveredBuilding = null;

    this.devMode = false;
    
    this.tick = 0;
    this.dayLength = 600; 
    this.dailyStats = {
      foodGained: 0, waterGained: 0,
      foodConsumed: 0, waterConsumed: 0,
      lastNetFood: 0, lastNetWater: 0
    };

    this.initStarterBase();
    this.updateResourceUI();
  }

  initStarterBase() {
    this.resources = { steel: 500, wood: 500, food: 500, water: 500 };

    this.buildings.push(new Structure('HEADQUARTERS', -75, -75)); 
    this.buildings.push(new Structure('SUPPLY_DEPOT', 120, -75));
    this.buildings.push(new Structure('WORKER_HUT', -200, -50));
    
    this.buildings.push(new Structure('FARM', -200, 100));
    this.buildings.push(new Structure('WATER_PUMP', -50, 150));
    this.buildings.push(new Structure('LUMBER_MILL', 100, 120));
    this.buildings.push(new Structure('STEEL_MINE', 200, 20));
  }

  getAOERadius() {
    const hq = this.buildings.find(b => b.type.id === 'HEADQUARTERS');
    if (!hq) return 600;

    const hqCenterX = hq.x + hq.type.width / 2;
    const hqCenterY = hq.y + hq.type.height / 2;
    
    let maxDist = 0;
    for (const b of this.buildings) {
      const bCenterX = b.x + b.type.width / 2;
      const bCenterY = b.y + b.type.height / 2;
      const dist = Math.hypot(bCenterX - hqCenterX, bCenterY - hqCenterY);
      if (dist > maxDist) {
        maxDist = dist;
      }
    }
    
    return Math.max(600, maxDist + 400); // 400px expansion buffer past furthest structure
  }

  update(npcCount) {
    this.tick++;

    if (this.tick % 60 === 0) {
      const consumeRate = npcCount * 0.15; 
      
      const actualFoodEaten = Math.min(this.resources.food, consumeRate);
      const actualWaterDrank = Math.min(this.resources.water, consumeRate);

      this.resources.food -= actualFoodEaten;
      this.resources.water -= actualWaterDrank;

      this.dailyStats.foodConsumed += actualFoodEaten;
      this.dailyStats.waterConsumed += actualWaterDrank;

      this.updateResourceUI();
    }

    if (this.tick >= this.dayLength) {
      this.dailyStats.lastNetFood = this.dailyStats.foodGained - this.dailyStats.foodConsumed;
      this.dailyStats.lastNetWater = this.dailyStats.waterGained - this.dailyStats.waterConsumed;
      
      this.dailyStats.foodGained = 0;
      this.dailyStats.waterGained = 0;
      this.dailyStats.foodConsumed = 0;
      this.dailyStats.waterConsumed = 0;
      
      this.tick = 0;
      this.updateResourceUI();
    }
  }

  getMaxCapacity() {
    let cap = 500; 
    for (const b of this.buildings) {
      if (b.type.id === 'SUPPLY_DEPOT') {
        cap += 500;
      }
    }
    return cap;
  }

  canAfford(costObj) {
    if (this.devMode) return true;
    for (const [res, amount] of Object.entries(costObj)) {
      if ((this.resources[res] || 0) < amount) return false;
    }
    return true;
  }

  deductCost(costObj) {
    if (this.devMode) return;
    for (const [res, amount] of Object.entries(costObj)) {
      this.resources[res] -= amount;
    }
  }

  refundCost(costObj) {
    const max = this.getMaxCapacity();
    for (const [res, amount] of Object.entries(costObj)) {
      const refundAmt = Math.floor(amount * 0.75);
      this.resources[res] = Math.min(max, this.resources[res] + refundAmt);
    }
  }

  addResource(type, amount) {
    const max = this.getMaxCapacity();
    const actualGain = Math.min(max - (this.resources[type] || 0), amount);
    
    this.resources[type] += actualGain;

    if (type === 'food') this.dailyStats.foodGained += actualGain;
    if (type === 'water') this.dailyStats.waterGained += actualGain;

    this.updateResourceUI();
  }

  getNearestDepot(x, y) {
    let nearest = null;
    let minDist = Infinity;
    
    for (const b of this.buildings) {
      if (b.type.id === 'SUPPLY_DEPOT' || b.type.id === 'HEADQUARTERS') {
        const bx = b.x + b.type.width / 2;
        const by = b.y + b.type.height / 2;
        const dist = Math.hypot(bx - x, by - y);
        if (dist < minDist) {
          minDist = dist;
          nearest = b;
        }
      }
    }
    return nearest;
  }

  getCapacities() {
    let caps = { worker: 0, soldier: 0, medic: 0 };
    for (const b of this.buildings) {
      if (b.type.caps) {
        if (b.type.caps.worker) caps.worker += b.type.caps.worker;
        if (b.type.caps.soldier) caps.soldier += b.type.caps.soldier;
        if (b.type.caps.medic) caps.medic += b.type.caps.medic;
      }
    }
    return caps;
  }

  updateResourceUI() {
    const display = document.getElementById('resource-display');
    if (display) {
      const cap = this.getMaxCapacity();
      
      const st = Math.floor(this.resources.steel);
      const wd = Math.floor(this.resources.wood);
      const fd = Math.floor(this.resources.food);
      const wt = Math.floor(this.resources.water);

      const netFd = Math.floor(this.dailyStats.lastNetFood);
      const netWt = Math.floor(this.dailyStats.lastNetWater);

      const fdColor = netFd >= 0 ? '#48bb78' : '#fc8181';
      const wtColor = netWt >= 0 ? '#48bb78' : '#fc8181';
      const fdSign = netFd >= 0 ? '+' : '';
      const wtSign = netWt >= 0 ? '+' : '';

      display.innerHTML = `
        <div>St: ${st} | Wd: ${wd} | Fd: ${fd} | Wt: ${wt} | Cap: ${cap}</div>
        <div style="font-size: 13px; font-weight: normal; color: #cbd5e0; margin-top: 4px;">
          Past 10s Net Rate &raquo; 
          <span style="color: ${fdColor}">Food: ${fdSign}${netFd}</span> | 
          <span style="color: ${wtColor}">Water: ${wtSign}${netWt}</span>
        </div>
      `;
    }
    if (window.npcManager) window.npcManager.updateUI();
  }

  toggleDevMode() {
    this.devMode = !this.devMode;
    return this.devMode;
  }

  validateGhostPlacement() {
    if (!this.pendingBuildingType) return;

    const hasCollision = this.checkCollision(
      this.ghostX, this.ghostY,
      this.pendingBuildingType.width, this.pendingBuildingType.height
    );

    const canAfford = this.canAfford(this.pendingBuildingType.cost);

    let isWithinAOE = false;
    const hq = this.buildings.find(b => b.type.id === 'HEADQUARTERS');

    if (hq) {
      const hqCenterX = hq.x + hq.type.width / 2;
      const hqCenterY = hq.y + hq.type.height / 2;
      const radius = this.getAOERadius();

      const ghostCenterX = this.ghostX + this.pendingBuildingType.width / 2;
      const ghostCenterY = this.ghostY + this.pendingBuildingType.height / 2;

      const dist = Math.hypot(ghostCenterX - hqCenterX, ghostCenterY - hqCenterY);
      if (dist <= radius) {
        isWithinAOE = true;
      }
    }

    if (!hq && this.pendingBuildingType.id === 'HEADQUARTERS') {
      isWithinAOE = true;
    }

    this.isValidPlacement = !hasCollision && canAfford && isWithinAOE;

    // Update UI
    const confirmBtn = document.getElementById('build-confirm-btn');
    if (confirmBtn) {
      confirmBtn.disabled = !this.isValidPlacement;
    }
  }

  startBuilding(typeId) {
    if (!BUILDING_TYPES[typeId]) return;
    this.pendingBuildingType = BUILDING_TYPES[typeId];
    this.isBuilding = true;
    this.isDeconstructing = false;

    if (window.getCameraCenter) {
      const center = window.getCameraCenter();
      const gridSize = 50;
      this.ghostX = Math.floor(center.x / gridSize) * gridSize;
      this.ghostY = Math.floor(center.y / gridSize) * gridSize;
    } else {
      this.ghostX = 0;
      this.ghostY = 0;
    }

    this.validateGhostPlacement();

    const confirmUI = document.getElementById('build-confirm-ui');
    if (confirmUI) confirmUI.style.display = 'flex';
  }

  startDeconstructing() {
    this.isBuilding = false;
    this.isDeconstructing = true;
    this.pendingBuildingType = null;

    const confirmUI = document.getElementById('build-confirm-ui');
    if (confirmUI) confirmUI.style.display = 'none';
  }

  cancelAction() {
    this.isBuilding = false;
    this.isDeconstructing = false;
    this.pendingBuildingType = null;
    this.hoveredBuilding = null;

    const confirmUI = document.getElementById('build-confirm-ui');
    if (confirmUI) confirmUI.style.display = 'none';
  }

  checkCollision(x, y, width, height) {
    for (const building of this.buildings) {
      if (
        x < building.x + building.type.width &&
        x + width > building.x &&
        y < building.y + building.type.height &&
        y + height > building.y
      ) {
        return true;
      }
    }
    return false;
  }

  isOverGhost(worldX, worldY) {
    if (!this.isBuilding || !this.pendingBuildingType) return false;
    return (
      worldX >= this.ghostX &&
      worldX <= this.ghostX + this.pendingBuildingType.width &&
      worldY >= this.ghostY &&
      worldY <= this.ghostY + this.pendingBuildingType.height
    );
  }

  dragGhost(worldX, worldY) {
    if (!this.isBuilding || !this.pendingBuildingType) return;
    const gridSize = 50;
    this.ghostX = Math.floor(worldX / gridSize) * gridSize;
    this.ghostY = Math.floor(worldY / gridSize) * gridSize;
    this.validateGhostPlacement();
  }

  updateMousePosition(mouseX, mouseY, cameraX, cameraY, zoom, canvasWidth, canvasHeight) {
    const worldX = (mouseX - canvasWidth / 2) / zoom + cameraX;
    const worldY = (mouseY - canvasHeight / 2) / zoom + cameraY;

    if (this.isDeconstructing) {
      this.hoveredBuilding = null;
      for (let i = this.buildings.length - 1; i >= 0; i--) {
        const b = this.buildings[i];
        if (
          worldX >= b.x && worldX < b.x + b.type.width &&
          worldY >= b.y && worldY < b.y + b.type.height
        ) {
          this.hoveredBuilding = b;
          break;
        }
      }
    }
  }

  placeBuilding() {
    if (!this.isBuilding || !this.pendingBuildingType || !this.isValidPlacement) return;

    this.deductCost(this.pendingBuildingType.cost);
    this.updateResourceUI();

    const newBuilding = new Structure(this.pendingBuildingType.id, this.ghostX, this.ghostY);
    this.buildings.push(newBuilding);
    
    this.cancelAction();
  }

  deconstructBuilding() {
    if (!this.isDeconstructing || !this.hoveredBuilding) return;

    this.buildings = this.buildings.filter(b => b !== this.hoveredBuilding);
    this.refundCost(this.hoveredBuilding.type.cost);
    this.updateResourceUI();
    
    this.hoveredBuilding = null;
  }

  draw(ctx) {
    const hq = this.buildings.find(b => b.type.id === 'HEADQUARTERS');
    if (hq) {
      const radius = this.getAOERadius();
      ctx.beginPath();
      ctx.arc(hq.x + hq.type.width / 2, hq.y + hq.type.height / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(66, 153, 225, 0.05)'; 
      ctx.fill();
      ctx.strokeStyle = 'rgba(66, 153, 225, 0.2)'; 
      ctx.setLineDash([5, 15]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]); 
    }

    for (const building of this.buildings) {
      building.draw(ctx);
    }

    if (this.isBuilding && this.pendingBuildingType) {
      ctx.globalAlpha = 0.5;
      // Use green for valid, red for invalid, unless the color itself is green then keep it green.
      // But user requested "green for valid, red for invalid", so let's override the color for ghost
      ctx.fillStyle = this.isValidPlacement ? '#48bb78' : '#f56565';
      ctx.fillRect(this.ghostX, this.ghostY, this.pendingBuildingType.width, this.pendingBuildingType.height);
      
      ctx.strokeStyle = this.isValidPlacement ? '#ffffff' : '#9b2c2c';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.ghostX, this.ghostY, this.pendingBuildingType.width, this.pendingBuildingType.height);
      
      ctx.globalAlpha = 1.0;
    }

    if (this.isDeconstructing && this.hoveredBuilding) {
      ctx.fillStyle = 'rgba(245, 101, 101, 0.5)';
      ctx.fillRect(this.hoveredBuilding.x, this.hoveredBuilding.y, this.hoveredBuilding.type.width, this.hoveredBuilding.type.height);
      
      ctx.strokeStyle = '#c53030';
      ctx.lineWidth = 3;
      ctx.strokeRect(this.hoveredBuilding.x, this.hoveredBuilding.y, this.hoveredBuilding.type.width, this.hoveredBuilding.type.height);
    }
  }
}