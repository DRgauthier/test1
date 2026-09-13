import re

with open('worldMap.js', 'r') as f:
    content = f.read()

# Fix 1: Throttle updateDeploymentsUI so it doesn't rebuild DOM 60fps
content = re.sub(
    r'  updateDeploymentsUI\(\) \{',
    r'  updateDeploymentsUI() {\n    if (this._lastUiUpdate && Date.now() - this._lastUiUpdate < 1000) return;\n    this._lastUiUpdate = Date.now();',
    content
)

# Fix 2: Sync hex state when conscripts are consumed
content = content.replace(
    '''          ct.conscript_count -= deduction;
          conscriptsToDeduct -= deduction;''',
    '''          ct.conscript_count -= deduction;
          conscriptsToDeduct -= deduction;

          const hexRef = this.hexes.find(h => h.q === ct.hex_q && h.r === ct.hex_r);
          if (hexRef) {
              hexRef.conscript_count = ct.conscript_count;
          }'''
)

# Fix 3: Calculate proper available gunships by subtracting active physical fleets
content = content.replace(
    "document.getElementById('world-deploy-gunships').max = window.structureManager.buildings.filter(b => b.type.id === 'GUNSHIP').length;",
    "const totalGunships = window.structureManager.buildings.filter(b => b.type.id === 'GUNSHIP').length;\n      const activePhysicalFleets = this.activeDeployments.reduce((sum, dep) => sum + (dep.payload.gunships || 0), 0);\n      document.getElementById('world-deploy-gunships').max = Math.max(0, totalGunships - activePhysicalFleets);"
)


with open('worldMap.js', 'w') as f:
    f.write(content)
