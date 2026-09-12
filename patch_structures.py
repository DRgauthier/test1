import re

with open('structures.js', 'r') as f:
    code = f.read()

# 1. Remove Deconstruct button from build menu
code = code.replace(
    'html += `<button class="danger" onclick="structureManager.startDeconstructing()">Deconstruct (75% Refund)</button>`;',
    ''
)

# 2. Update constructor
code = code.replace(
    'this.isDeconstructing = false;',
    'this.isMoving = false;\n    this.movingBuilding = null;\n    this.originalMoveX = 0;\n    this.originalMoveY = 0;'
)

# 3. Modify refundCost
code = code.replace(
    '''  refundCost(costObj) {
    const max = this.getMaxCapacity();
    for (const [res, amount] of Object.entries(costObj)) {
      const refundAmt = Math.floor(amount * 0.75);
      this.resources[res] = Math.min(max, this.resources[res] + refundAmt);
    }
  }''',
    '''  refundCost(costObj) {
    const max = this.getMaxCapacity();
    for (const [res, amount] of Object.entries(costObj)) {
      this.resources[res] = Math.min(max, this.resources[res] + amount);
    }
  }'''
)

# 4. Insert getTotalInvestedCost and getRefundAmount before getUpgradeCost
code = code.replace(
    '  getUpgradeCost(building) {',
    '''  getTotalInvestedCost(building) {
    const totalCost = { steel: 0, oil: 0 };

    // Sum up costs for all levels up to the current level
    for (let lvl = 1; lvl <= building.level; lvl++) {
      let lvlCost = { steel: 0, oil: 0 };

      if (building.type.id === 'HEADQUARTERS') {
        const hqCosts = [
          { steel: 400, oil: 0 },      // Base (L1)
          { steel: 1000, oil: 200 },   // to L2
          { steel: 3000, oil: 800 },   // to L3
          { steel: 8000, oil: 2500 },  // to L4
          { steel: 20000, oil: 8000 }  // to L5
        ];
        if (lvl - 1 < hqCosts.length) {
          lvlCost = hqCosts[lvl - 1];
        }
      } else {
        const multiplier = Math.pow(2, lvl - 1);
        lvlCost = { ...building.type.cost };
        for (const key in lvlCost) {
          lvlCost[key] *= multiplier;
        }
      }

      for (const key in lvlCost) {
        totalCost[key] += lvlCost[key] || 0;
      }
    }

    return totalCost;
  }

  getRefundAmount(building) {
    const invested = this.getTotalInvestedCost(building);
    const refund = {};
    for (const key in invested) {
      refund[key] = Math.floor(invested[key] * 0.75);
    }
    return refund;
  }

  getUpgradeCost(building) {'''
)

# 5. Modify validateGhostPlacement
code = code.replace(
    'this.pendingBuildingType.width, this.pendingBuildingType.height\n    );',
    'this.pendingBuildingType.width, this.pendingBuildingType.height,\n      this.movingBuilding\n    );'
)
code = code.replace(
    'const canAfford = this.canAfford(this.pendingBuildingType.cost);',
    'const canAfford = this.isMoving ? true : this.canAfford(this.pendingBuildingType.cost);'
)
code = code.replace(
    'const hasBuilder = this.getAvailableBuilders() > 0;',
    'const hasBuilder = this.isMoving ? true : this.getAvailableBuilders() > 0;'
)
code = code.replace(
    'const hqCenterX = hq.x + hq.type.width / 2;',
    'const hqCenterX = (this.isMoving && this.movingBuilding === hq) ? this.ghostX + hq.type.width / 2 : hq.x + hq.type.width / 2;'
)
code = code.replace(
    'const hqCenterY = hq.y + hq.type.height / 2;',
    'const hqCenterY = (this.isMoving && this.movingBuilding === hq) ? this.ghostY + hq.type.height / 2 : hq.y + hq.type.height / 2;'
)

# 6. Update UI in validateGhostPlacement for moving
code = code.replace(
    '// Update UI\n    const confirmBtn = document.getElementById(\'build-confirm-btn\');',
    '''// Hide confirm UI during move
    const confirmUI = document.getElementById('build-confirm-ui');
    if (this.isMoving) {
      if (confirmUI) confirmUI.style.display = 'none';
      return;
    }

    // Update UI
    const confirmBtn = document.getElementById('build-confirm-btn');'''
)

# 7. Modify openUpgradeMenu
code = code.replace('if (this.isDeconstructing || this.isBuilding) return;', 'if (this.isBuilding) return;')

code = code.replace(
    '''if (this.isBuildingUnderConstruction(building)) {
      info.innerHTML = `<span style="color: #ecc94b;">Currently under construction...</span>`;
      btn.disabled = true;
      btn.innerText = 'Upgrading...';
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      menu.style.display = 'block';
      return;
    }''',
    '''if (this.isBuildingUnderConstruction(building)) {
      info.innerHTML = `<span style="color: #ecc94b;">Currently under construction...</span>`;
      btn.disabled = true;
      btn.innerText = 'Upgrading...';
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';

      const moveBtn = document.getElementById('move-btn');
      if (moveBtn) {
        moveBtn.disabled = true;
        moveBtn.style.opacity = '0.5';
        moveBtn.style.cursor = 'not-allowed';
      }

      const deconstructBtn = document.getElementById('deconstruct-btn');
      if (deconstructBtn) {
        const refund = this.getRefundAmount(building);
        let refundText = `Deconstruct (+${refund.steel} Steel`;
        if (refund.oil > 0) refundText += `, +${refund.oil} Oil`;
        refundText += `)`;
        deconstructBtn.innerText = refundText;
      }

      menu.style.display = 'block';
      return;
    }'''
)

code = code.replace(
    '''// Format cost string
    let costHtml = '';''',
    '''const moveBtn = document.getElementById('move-btn');
    const deconstructBtn = document.getElementById('deconstruct-btn');

    if (moveBtn) {
      moveBtn.disabled = false;
      moveBtn.style.opacity = '1.0';
      moveBtn.style.cursor = 'pointer';
    }

    if (deconstructBtn) {
      const refund = this.getRefundAmount(building);
      let refundText = `Deconstruct (+${refund.steel} Steel`;
      if (refund.oil > 0) refundText += `, +${refund.oil} Oil`;
      refundText += `)`;
      deconstructBtn.innerText = refundText;
    }

    // Format cost string
    let costHtml = '';'''
)

# 8. startBuilding
code = code.replace('this.isDeconstructing = false;\n\n    if (window.getCameraCenter) {', 'if (window.getCameraCenter) {')


# 9. Modify startDeconstructing and cancelAction, adding startMoving/confirmMove
code = code.replace(
    '''startDeconstructing() {
    this.isBuilding = false;
    this.isDeconstructing = true;
    this.pendingBuildingType = null;

    const confirmUI = document.getElementById('build-confirm-ui');
    if (confirmUI) confirmUI.style.display = 'none';
  }''',
    '''startMoving() {
    if (!this.selectedBuilding) return;
    if (this.isBuildingUnderConstruction(this.selectedBuilding)) return;

    this.movingBuilding = this.selectedBuilding;
    this.isMoving = true;
    this.pendingBuildingType = this.selectedBuilding.type;

    this.originalMoveX = this.selectedBuilding.x;
    this.originalMoveY = this.selectedBuilding.y;

    if (window.getCameraCenter) {
      const center = window.getCameraCenter();
      this.ghostX = Math.round(center.x / GRID_SIZE) * GRID_SIZE;
      this.ghostY = Math.round(center.y / GRID_SIZE) * GRID_SIZE;
    } else {
      this.ghostX = this.originalMoveX;
      this.ghostY = this.originalMoveY;
    }

    document.getElementById('upgrade-menu').style.display = 'none';
    this.selectedBuilding = null;

    this.validateGhostPlacement();
  }

  async confirmMove() {
    if (!this.isMoving || !this.movingBuilding || !this.isValidPlacement) return;

    this.movingBuilding.x = this.ghostX;
    this.movingBuilding.y = this.ghostY;

    const movedDbId = this.movingBuilding.dbId;

    this.isMoving = false;
    this.movingBuilding = null;
    this.pendingBuildingType = null;

    if (window.supabaseClient && movedDbId) {
      await window.supabaseClient
        .from('buildings')
        .update({
          x: this.ghostX,
          y: this.ghostY
        })
        .eq('id', movedDbId);
      this.syncPlayerState();
    }
  }'''
)

code = code.replace(
    '''cancelAction() {
    this.isBuilding = false;
    this.isDeconstructing = false;
    this.pendingBuildingType = null;
    this.hoveredBuilding = null;''',
    '''cancelAction() {
    if (this.isMoving) {
      this.isMoving = false;
      this.movingBuilding = null;
    }
    this.isBuilding = false;
    this.pendingBuildingType = null;'''
)

# 10. checkCollision update
code = code.replace(
    'checkCollision(x, y, width, height) {\n    for (const building of this.buildings) {',
    'checkCollision(x, y, width, height, ignoreBuilding = null) {\n    for (const building of this.buildings) {\n      if (building === ignoreBuilding) continue;'
)

# 11. isOverGhost and dragGhost
code = code.replace('if (!this.isBuilding || !this.pendingBuildingType) return false;', 'if ((!this.isBuilding && !this.isMoving) || !this.pendingBuildingType) return false;')
code = code.replace('if (!this.isBuilding || !this.pendingBuildingType) return;', 'if ((!this.isBuilding && !this.isMoving) || !this.pendingBuildingType) return;')

# 12. updateMousePosition - remove isDeconstructing
import re
code = re.sub(
    r'if \(this\.isDeconstructing\) \{.*?\break;\n        \}\n      \}\n    \}',
    '',
    code,
    flags=re.DOTALL
)

# 13. deconstructBuilding -> deconstructSelectedBuilding
code = code.replace(
    '''async deconstructBuilding() {
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
  }''',
    '''async deconstructSelectedBuilding() {
    if (!this.selectedBuilding) return;

    const buildingToRemove = this.selectedBuilding;
    const refund = this.getRefundAmount(buildingToRemove);

    this.buildings = this.buildings.filter(b => b !== buildingToRemove);
    this.renderBuildMenu();
    this.refundCost(refund);
    this.updateResourceUI();

    // Close upgrade menu
    document.getElementById('upgrade-menu').style.display = 'none';
    this.selectedBuilding = null;

    if (window.supabaseClient && buildingToRemove.dbId) {
      await window.supabaseClient
        .from('buildings')
        .delete()
        .eq('id', buildingToRemove.dbId);
      this.syncPlayerState();
    }
  }'''
)


# 14. draw modifications
code = code.replace(
    '''      if (isUnderConstruction) {
        ctx.save();
        ctx.globalAlpha = 0.6;''',
    '''      if (this.isMoving && building === this.movingBuilding) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        building.draw(ctx);
        ctx.restore();
        continue;
      }

      if (isUnderConstruction) {
        ctx.save();
        ctx.globalAlpha = 0.6;'''
)

code = code.replace(
    'if (this.isBuilding && this.pendingBuildingType) {',
    'if ((this.isBuilding || this.isMoving) && this.pendingBuildingType) {'
)

code = re.sub(
    r'if \(this\.isDeconstructing && this\.hoveredBuilding\) \{.*?ctx\.strokeRect\(this\.hoveredBuilding\.x, this\.hoveredBuilding\.y, this\.hoveredBuilding\.type\.width, this\.hoveredBuilding\.type\.height\);\n    \}',
    '',
    code,
    flags=re.DOTALL
)

with open('structures.js', 'w') as f:
    f.write(code)
