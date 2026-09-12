import re

with open('index.html', 'r') as f:
    code = f.read()

replacement = """
    <button id="upgrade-btn" style="width: 100%; padding: 10px; background: #48bb78; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">Upgrade</button>
    <div style="display: flex; gap: 10px; margin-top: 10px;">
      <button id="move-btn" onclick="window.structureManager.startMoving()" style="flex: 1; padding: 10px; background: #3182ce; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Move</button>
      <button id="deconstruct-btn" onclick="window.structureManager.deconstructSelectedBuilding()" style="flex: 1; padding: 10px; background: #e53e3e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Deconstruct</button>
    </div>
"""

code = code.replace(
    '<button id="upgrade-btn" style="width: 100%; padding: 10px; background: #48bb78; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Upgrade</button>',
    replacement
)

with open('index.html', 'w') as f:
    f.write(code)
