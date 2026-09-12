const GRID_SIZE = 50;

const BUILDING_TYPES = {
  HEADQUARTERS: { id: 'HEADQUARTERS', name: 'Command Center', width: 150, height: 150, color: '#4299e1', cost: { steel: 400, oil: 0 }, caps: { worker: 5, soldier: 5, medic: 0 } },
  BARRACKS: { id: 'BARRACKS', name: 'Barracks', width: 100, height: 100, color: '#e53e3e', cost: { steel: 150, oil: 0 }, caps: { soldier: 10 } },
  SUPPLY_DEPOT: { id: 'SUPPLY_DEPOT', name: 'Supply Depot', width: 50, height: 50, color: '#48bb78', cost: { steel: 100, oil: 0 } },
  GUNSHIP: { id: 'GUNSHIP', name: 'Gunship Pad', width: 120, height: 120, color: '#4a5568', cost: { steel: 400, oil: 0 } },
  TURRET: { id: 'TURRET', name: 'Defense Turret', width: 50, height: 50, color: '#ecc94b', cost: { steel: 100, oil: 0 } },
  WORKER_HUT: { id: 'WORKER_HUT', name: 'Worker Hut', width: 80, height: 80, color: '#ed8936', cost: { steel: 70, oil: 0 }, caps: {} }, // caps: { worker: 8 } replaced by global builder mechanic
  MEDIC_STATION: { id: 'MEDIC_STATION', name: 'Medic Station', width: 80, height: 80, color: '#fc8181', cost: { steel: 100, oil: 50 }, caps: { medic: 5 } },
  
  STEEL_MINE: { id: 'STEEL_MINE', name: 'Steel Mine', width: 60, height: 60, color: '#a0aec0', cost: { steel: 70, oil: 0 }, generates: 'steel', baseTime: 10 },
  OIL_PUMP: { id: 'OIL_PUMP', name: 'Oil Pump', width: 50, height: 50, color: '#63b3ed', cost: { steel: 50, oil: 0 }, generates: 'oil', baseTime: 10 }
};

// Add baseTime to all building types
for (const key in BUILDING_TYPES) {
  if (!BUILDING_TYPES[key].baseTime) BUILDING_TYPES[key].baseTime = 15; // default 15s
}
BUILDING_TYPES.HEADQUARTERS.baseTime = 30;

const MAX_BUILDINGS_PER_HQ_LEVEL = {
  HEADQUARTERS:  [1, 1, 1, 1, 1],
  WORKER_HUT:    [2, 3, 4, 5, 6],
  STEEL_MINE:    [2, 3, 4, 5, 6],
  OIL_PUMP:      [1, 2, 3, 4, 5],
  SUPPLY_DEPOT:  [1, 2, 3, 4, 5],
  BARRACKS:      [1, 2, 3, 3, 4],
  TURRET:        [2, 4, 6, 8, 10],
  MEDIC_STATION: [1, 1, 2, 2, 3],
  GUNSHIP:       [1, 1, 1, 2, 2]
};


class Structure {
  constructor(typeId, x, y) {
    this.type = BUILDING_TYPES[typeId];
    this.x = x;
    this.y = y;
    this.level = 1;
    
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
      steelGained: 0, oilGained: 0,
      lastNetSteel: 0, lastNetOil: 0
    };

    this.resources = { steel: 500, oil: 500 };
    this.updateResourceUI();

    setInterval(() => this.syncPlayerState(), 15000);
  }



  renderBuildMenu() {
    const menuContent = document.getElementById('build-menu-content');
    if (!menuContent) return;

    let html = '';

    const addGroup = (types) => {
      types.forEach(typeId => {
        const typeInfo = BUILDING_TYPES[typeId];
        if (!typeInfo) return;

        const currentCount = this.getBuildingCount(typeId);
        const maxCount = this.getMaxBuildings(typeId);

        let costStr = `St:${typeInfo.cost.steel}`;
        if (typeInfo.cost.oil > 0) costStr += ` Oil:${typeInfo.cost.oil}`;

        let buttonText = typeInfo.name;
        // HQ special name replacement based on previous HTML
        if (typeId === 'HEADQUARTERS') buttonText = 'HQ';
        if (typeId === 'GUNSHIP') buttonText = 'Gunship Pad';

        buttonText += ` (${costStr}) (${currentCount}/${maxCount})`;

        const isDisabled = currentCount >= maxCount;
        const disabledAttr = isDisabled ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';

        html += `<button onclick="structureManager.startBuilding('${typeId}')" ${disabledAttr}>${buttonText}</button>`;
      });
    };

    // First group
    addGroup([
      'HEADQUARTERS',
      'BARRACKS',
      'GUNSHIP',
      'SUPPLY_DEPOT',
      'TURRET',
      'WORKER_HUT',
      'MEDIC_STATION'
    ]);

    html += `<hr style="border-color: #4a5568; width: 100%;" />`;

    // Second group
    addGroup([
      'STEEL_MINE',
      'OIL_PUMP'
    ]);

    html += `<hr style="border-color: #4a5568; width: 100%;" />`;

    // Action buttons
    html += `<button class="danger" onclick="structureManager.startDeconstructing()">Deconstruct (75% Refund)</button>`;
    html += `<button class="cancel" onclick="structureManager.cancelAction()">Cancel Action</button>`;

    menuContent.innerHTML = html;
  }

  getHQLevel() {
    const hq = this.buildings.find(b => b.type.id === 'HEADQUARTERS');
    return hq ? hq.level : 0;
  }

  getBuildingCount(typeId) {
    return this.buildings.filter(b => b.type.id === typeId).length;
  }

  getMaxBuildings(typeId) {
    const hqLevel = this.getHQLevel();
    // Use index = level - 1. If HQ level is 0, they can still build the HQ to level 1.
    const index = Math.max(0, Math.min(hqLevel - 1, 4));

    if (MAX_BUILDINGS_PER_HQ_LEVEL[typeId]) {
      // Exception: If no HQ is built, they can only build an HQ (and nothing else)
      if (hqLevel === 0 && typeId !== 'HEADQUARTERS') return 0;

      return MAX_BUILDINGS_PER_HQ_LEVEL[typeId][index];
    }
    return 0; // Default if not in config
  }

  async syncPlayerState() {
    if (window.supabaseClient && window.currentUser) {
      console.log('[DEBUG] syncPlayerState: syncing resources to DB. Steel:', this.resources.steel, 'Oil:', this.resources.oil);
      await window.supabaseClient
        .from('players')
        .update({
          steel: this.resources.steel,
          oil: this.resources.oil
        })
        .eq('id', window.currentUser.id);
    }
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

    // Resource generation loop every 60 ticks (~1 second)
    if (this.tick % 60 === 0) {
      for (const b of this.buildings) {
        if (b.type.generates && !this.isBuildingUnderConstruction(b)) {
          this.addResource(b.type.generates, 2, b);
        }
      }
      this.updateResourceUI();
    }

    if (this.tick >= this.dayLength) {
      this.dailyStats.lastNetSteel = this.dailyStats.steelGained;
      this.dailyStats.lastNetOil = this.dailyStats.oilGained;
      
      this.dailyStats.steelGained = 0;
      this.dailyStats.oilGained = 0;
      
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

  addResource(type, amount, building = null) {
    const max = this.getMaxCapacity();
    let finalAmount = amount;

    if (building && building.level) {
      finalAmount *= Math.pow(1.5, building.level - 1);
    }

    const actualGain = Math.min(max - (this.resources[type] || 0), finalAmount);
    
    this.resources[type] += actualGain;

    if (type === 'steel') this.dailyStats.steelGained += actualGain;
    if (type === 'oil') this.dailyStats.oilGained += actualGain;

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
    let caps = { soldier: 0, medic: 0 };
    for (const b of this.buildings) {
      if (b.type.caps && !this.isBuildingUnderConstruction(b)) {
        if (b.type.caps.soldier) caps.soldier += b.type.caps.soldier;
        if (b.type.caps.medic) caps.medic += b.type.caps.medic;
      }
    }
    return caps;
  }

  getTotalBuilders() {
    let count = 1; // 1 base from HQ
    for (const b of this.buildings) {
      if (b.type.id === 'WORKER_HUT' && !this.isBuildingUnderConstruction(b)) {
        count += 1;
      }
    }
    return count;
  }

  getBusyBuilders() {
    let count = 0;
    for (const b of this.buildings) {
      if (this.isBuildingUnderConstruction(b)) {
        count += 1;
      }
    }
    return count;
  }

  getAvailableBuilders() {
    return this.getTotalBuilders() - this.getBusyBuilders();
  }

  isBuildingUnderConstruction(building) {
    if (!building.construction_started_at) return false;

    // For now we assume base construction/upgrade time based on type and level
    // We'll define standard timers in the next step, for now just use a placeholder 30s
    // Real implementation will calculate exact time difference from construction_started_at
    const timerStr = building.construction_started_at;
    const startTime = new Date(timerStr).getTime();
    const now = Date.now();

    const timeMs = this.getConstructionTimeMs(building);

    if (now - startTime < timeMs) {
      return true;
    }

    return false;
  }

  getConstructionTimeMs(building) {
    if (building.type.id === 'HEADQUARTERS') {
      const times = [0, 30, 120, 600, 1800]; // L1 to L5 times in seconds (L1 is instantly built at start, so L2 is index 1 = 30s)
      const targetLevel = building.level;
      if (targetLevel > 1 && targetLevel <= times.length) {
        return times[targetLevel - 1] * 1000;
      }
      return 30 * 1000; // default 30s for HQ if something goes wrong
    }

    // For other buildings: baseTime * (2^(level-1))
    // Example: L1 -> baseTime. L2 -> baseTime * 2. L3 -> baseTime * 4.
    const multiplier = Math.pow(2, building.level - 1);
    return building.type.baseTime * multiplier * 1000;
  }

  getUpgradeCost(building) {
    if (building.type.id === 'HEADQUARTERS') {
      const hqCosts = [
        { steel: 400, oil: 0 },      // Base (L1)
        { steel: 1000, oil: 200 },   // to L2
        { steel: 3000, oil: 800 },   // to L3
        { steel: 8000, oil: 2500 },  // to L4
        { steel: 20000, oil: 8000 }  // to L5
      ];
      if (building.level < hqCosts.length) {
        return hqCosts[building.level];
      }
      return { steel: Infinity, oil: Infinity }; // Max level reached
    }

    const cost = { ...building.type.cost };
    const multiplier = Math.pow(2, building.level); // L1->L2 = 2x base. L2->L3 = 4x base.

    for (const key in cost) {
      cost[key] *= multiplier;
    }
    return cost;
  }

  updateResourceUI() {
    const display = document.getElementById('resource-display');
    if (display) {
      const cap = this.getMaxCapacity();
      
      const st = Math.floor(this.resources.steel);
      const oil = Math.floor(this.resources.oil);

      const netSt = Math.floor(this.dailyStats.lastNetSteel);
      const netOil = Math.floor(this.dailyStats.lastNetOil);

      const stColor = netSt >= 0 ? '#48bb78' : '#fc8181';
      const oilColor = netOil >= 0 ? '#48bb78' : '#fc8181';
      const stSign = netSt >= 0 ? '+' : '';
      const oilSign = netOil >= 0 ? '+' : '';

      const totalBuilders = this.getTotalBuilders();
      const availBuilders = this.getAvailableBuilders();

      display.innerHTML = `
        <div>Steel: ${st} | Oil: ${oil} | Cap: ${cap} | Builders: ${availBuilders}/${totalBuilders}</div>
        <div style="font-size: 13px; font-weight: normal; color: #cbd5e0; margin-top: 4px;">
          Past 10s Rate &raquo;
          <span style="color: ${stColor}">Steel: ${stSign}${netSt}</span> |
          <span style="color: ${oilColor}">Oil: ${oilSign}${netOil}</span>
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
    const hasBuilder = this.getAvailableBuilders() > 0;

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

    this.isValidPlacement = !hasCollision && canAfford && isWithinAOE && hasBuilder;

    // Update UI
    const confirmBtn = document.getElementById('build-confirm-btn');
    if (confirmBtn) {
      confirmBtn.disabled = !this.isValidPlacement;

      // Update text to indicate missing builder if needed
      if (!hasBuilder && !hasCollision && canAfford && isWithinAOE) {
        confirmBtn.innerText = "No Builders available";
      } else if (!this.isValidPlacement) {
        confirmBtn.innerText = "Cannot build here";
      } else {
        confirmBtn.innerText = "Confirm Placement";
      }
    }
  }

  async upgradeBuilding() {
    if (!this.selectedBuilding) return;
    const building = this.selectedBuilding;

    // Validate again just to be safe
    if (this.isBuildingUnderConstruction(building)) return;
    if (this.getAvailableBuilders() <= 0) return;

    const cost = this.getUpgradeCost(building);
    if (!this.canAfford(cost)) return;

    // HQ bottleneck check
    if (building.type.id !== 'HEADQUARTERS') {
      const hq = this.buildings.find(b => b.type.id === 'HEADQUARTERS');
      const hqLevel = hq ? hq.level : 0;
      if (hqLevel < building.level + 1) {
         return; // HQ level too low
      }
    }

    this.deductCost(cost);
    this.updateResourceUI();

    building.level += 1;
    this.renderBuildMenu();
    building.construction_started_at = new Date().toISOString();

    // Optimistic UI update
    document.getElementById('upgrade-menu').style.display = 'none';
    this.selectedBuilding = null;

    if (window.supabaseClient && building.dbId) {
      await window.supabaseClient
        .from('buildings')
        .update({
          level: building.level,
          construction_started_at: building.construction_started_at
        })
        .eq('id', building.dbId);
    }
  }

  openUpgradeMenu(building) {
    if (this.isDeconstructing || this.isBuilding) return;
    this.selectedBuilding = building;

    const menu = document.getElementById('upgrade-menu');
    const title = document.getElementById('upgrade-title');
    const info = document.getElementById('upgrade-info');
    const btn = document.getElementById('upgrade-btn');

    if (!menu || !title || !info || !btn) return;

    title.innerText = `${building.type.name} (Lv. ${building.level})`;

    if (this.isBuildingUnderConstruction(building)) {
      info.innerHTML = `<span style="color: #ecc94b;">Currently under construction...</span>`;
      btn.disabled = true;
      btn.innerText = 'Upgrading...';
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      menu.style.display = 'block';
      return;
    }

    const cost = this.getUpgradeCost(building);
    const timeS = this.getConstructionTimeMs({ ...building, level: building.level + 1 }) / 1000;

    // Format cost string
    let costHtml = '';
    if (cost.steel === Infinity) {
       costHtml = `<span style="color: #a0aec0;">Max Level Reached</span>`;
       btn.disabled = true;
       btn.innerText = 'Max Level';
       btn.style.opacity = '0.5';
       btn.style.cursor = 'not-allowed';
    } else {
       costHtml = `
         <strong>Next Level Cost:</strong><br>
         Steel: ${cost.steel} <br>
         Oil: ${cost.oil} <br>
         Time: ${timeS}s
       `;

       let canUpgrade = true;
       let blockReason = '';

       if (!this.canAfford(cost)) {
         canUpgrade = false;
         blockReason = 'Not enough resources';
       } else if (this.getAvailableBuilders() <= 0) {
         canUpgrade = false;
         blockReason = 'No Builders available';
       } else if (building.type.id !== 'HEADQUARTERS') {
         const hq = this.buildings.find(b => b.type.id === 'HEADQUARTERS');
         const hqLevel = hq ? hq.level : 0;
         if (hqLevel < building.level + 1) {
           canUpgrade = false;
           blockReason = `Requires Level ${building.level + 1} Headquarters`;
         }
       }

       if (canUpgrade) {
         btn.disabled = false;
         btn.innerText = 'Upgrade';
         btn.style.opacity = '1.0';
         btn.style.cursor = 'pointer';
         // Remove old listeners
         btn.onclick = () => this.upgradeBuilding();
       } else {
         btn.disabled = true;
         btn.innerText = blockReason;
         btn.style.opacity = '0.5';
         btn.style.cursor = 'not-allowed';
         btn.onclick = null;
       }
    }

    info.innerHTML = costHtml;
    menu.style.display = 'block';
  }

  startBuilding(typeId) {
    if (!BUILDING_TYPES[typeId]) return;

    // Add validation check to prevent building beyond limits
    const currentCount = this.getBuildingCount(typeId);
    const maxCount = this.getMaxBuildings(typeId);
    if (currentCount >= maxCount) {
        console.warn(`Cannot build ${typeId}: Limit reached (${currentCount}/${maxCount})`);
        return;
    }

    this.pendingBuildingType = BUILDING_TYPES[typeId];
    this.isBuilding = true;
    this.isDeconstructing = false;

    if (window.getCameraCenter) {
      const center = window.getCameraCenter();
      this.ghostX = Math.round(center.x / GRID_SIZE) * GRID_SIZE;
      this.ghostY = Math.round(center.y / GRID_SIZE) * GRID_SIZE;
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
    // Align the center of the dragged building roughly to the cursor to avoid instant jumping
    // to top-left when dragging larger buildings.
    this.ghostX = Math.floor((worldX - this.pendingBuildingType.width / 2) / gridSize) * gridSize;
    this.ghostY = Math.floor((worldY - this.pendingBuildingType.height / 2) / gridSize) * gridSize;
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

  async placeBuilding() {
    if (!this.isBuilding || !this.pendingBuildingType || !this.isValidPlacement) return;

    this.deductCost(this.pendingBuildingType.cost);
    this.updateResourceUI();

    const newBuilding = new Structure(this.pendingBuildingType.id, this.ghostX, this.ghostY);
    // New buildings start at level 1 and use construction timer
    newBuilding.construction_started_at = new Date().toISOString();
    this.buildings.push(newBuilding);
    this.renderBuildMenu();
    
    if (window.supabaseClient && window.currentUser) {
      const { data, error } = await window.supabaseClient
        .from('buildings')
        .insert({
          player_id: window.currentUser.id,
          type_id: newBuilding.type.id,
          level: newBuilding.level,
          x: newBuilding.x,
          y: newBuilding.y,
          health: newBuilding.health,
          construction_started_at: newBuilding.construction_started_at
        })
        .select()
        .single();

      if (data) {
        console.log('[DEBUG] placeBuilding: Successfully inserted building into DB:', data);
        newBuilding.dbId = data.id;
        newBuilding.construction_started_at = data.construction_started_at;
      } else {
        console.error('[DEBUG] placeBuilding: Failed to insert building into DB. Error:', error);
      }
      this.syncPlayerState();
    }

    this.cancelAction();

    const confirmUI = document.getElementById('build-confirm-ui');
    if (confirmUI) confirmUI.style.display = 'none';
  }

  async deconstructBuilding() {
    if (!this.isDeconstructing || !this.hoveredBuilding) return;

    const buildingToRemove = this.hoveredBuilding;
    this.buildings = this.buildings.filter(b => b !== buildingToRemove);
    this.renderBuildMenu();
    this.refundCost(buildingToRemove.type.cost);
    this.updateResourceUI();
    
    if (window.supabaseClient && buildingToRemove.dbId) {
      await window.supabaseClient
        .from('buildings')
        .delete()
        .eq('id', buildingToRemove.dbId);
      this.syncPlayerState();
    }

    this.hoveredBuilding = null;
  }

  draw(ctx) {
    const now = Date.now();
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
      const isUnderConstruction = this.isBuildingUnderConstruction(building);

      if (isUnderConstruction) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        building.draw(ctx);
        ctx.globalAlpha = 1.0;

        // Draw progress bar
        const startTime = new Date(building.construction_started_at).getTime();
        const duration = this.getConstructionTimeMs(building);
        const elapsed = now - startTime;
        let progress = Math.max(0, Math.min(1, elapsed / duration));

        const barW = building.type.width * 0.8;
        const barH = 6;
        const barX = building.x + (building.type.width - barW) / 2;
        const barY = building.y + building.type.height / 2 - barH / 2;

        ctx.fillStyle = '#2d3748';
        ctx.fillRect(barX, barY, barW, barH);

        ctx.fillStyle = '#ecc94b'; // Construction yellow
        ctx.fillRect(barX, barY, barW * progress, barH);

        ctx.strokeStyle = '#1a202c';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        ctx.restore();
      } else {
        building.draw(ctx);
      }
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