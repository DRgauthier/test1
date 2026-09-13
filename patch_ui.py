import re

with open('index.html', 'r') as f:
    content = f.read()

# Completely replace the hex-panel content to match our new design
new_panel = """
  <div id="hex-panel" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(26, 32, 44, 0.98); color: white; padding: 20px; border-radius: 8px; font-family: sans-serif; width: 400px; border: 1px solid #4a5568; z-index: 100; box-shadow: 0 10px 25px rgba(0,0,0,0.8);">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #4a5568; padding-bottom: 10px; margin-bottom: 10px;">
      <h3 id="hex-panel-title" style="margin: 0;">Hex Details</h3>
      <button onclick="window.worldMap.closeDeployMenu()" style="background: #e53e3e; border: none; color: white; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-weight: bold;">X</button>
    </div>
    <p id="hex-coords" style="color: #a0aec0; font-size: 13px; margin: 0 0 10px 0; text-align: center;"></p>

    <!-- NPC Base Details (Attack Menu) -->
    <div id="hex-content-npc" style="display: none;">
      <div style="background: #2d3748; padding: 12px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #e53e3e;">
        <h4 style="margin: 0 0 5px 0; color: #fc8181; text-align: center;">Hostile NPC Base</h4>
        <div style="font-size: 13px; margin-bottom: 8px; line-height: 1.4; text-align: center;">
          Difficulty: <span id="deploy-npc-diff" style="color: #ecc94b; font-weight: bold;"></span><br>
          Est. Travel Time: <b id="deploy-npc-time"></b>
        </div>
      </div>

      <div style="margin-bottom: 15px; color: #63b3ed; font-size: 13px; text-align: center;">
        Available Base Troops: <b id="deploy-avail-s">0</b> Soldiers | <b id="deploy-avail-m">0</b> Medics
      </div>

      <div style="background: #1a202c; padding: 10px; border-radius: 6px; border: 1px solid #4a5568;">
        <h5 style="margin: 0 0 10px 0; color: #cbd5e0;">Physical Gunship Assault</h5>
        <div style="display: flex; justify-content: space-between; gap: 5px; align-items: center;">
          <label style="font-size: 11px; display: flex; flex-direction: column; gap: 2px;">
            Gunships: <input type="number" id="world-deploy-gunships" min="0" value="0" style="width: 40px; background: #2d3748; color: white; border: 1px solid #718096; padding: 4px; border-radius: 4px;">
          </label>
          <label style="font-size: 11px; display: flex; flex-direction: column; gap: 2px;">
            Soldiers: <input type="number" id="world-deploy-s" min="0" value="0" style="width: 40px; background: #2d3748; color: white; border: 1px solid #718096; padding: 4px; border-radius: 4px;">
          </label>
          <label style="font-size: 11px; display: flex; flex-direction: column; gap: 2px;">
            Medics: <input type="number" id="world-deploy-m" min="0" value="0" style="width: 40px; background: #2d3748; color: white; border: 1px solid #718096; padding: 4px; border-radius: 4px;">
          </label>
        </div>
      </div>

      <div style="background: #1a202c; padding: 10px; border-radius: 6px; border: 1px solid #4a5568; margin-top: 10px;">
        <h5 style="margin: 0 0 10px 0; color: #cbd5e0;">Ethereal Conscript Swarm</h5>
        <div style="font-size: 11px; margin-bottom: 5px; color: #a0aec0;">Total Available Conscripts: <span id="deploy-avail-conscripts">0</span></div>
        <div style="font-size: 11px; margin-bottom: 5px; color: #a0aec0;">Available Conscript Stacks: <span id="deploy-avail-stacks">0</span></div>
        <label style="font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
          Deploy Stacks:
          <input type="number" id="world-deploy-stacks" min="0" value="0" style="width: 50px; background: #2d3748; color: white; border: 1px solid #718096; padding: 4px; border-radius: 4px;">
        </label>
      </div>

      <p id="no-gunships-warning-empty" style="color: #fc8181; font-size: 13px; text-align: center; display: none; font-weight: bold; margin-top: 10px;">Not enough capacity.</p>
      <button id="send-gunship-btn" onclick="window.worldMap.deployAttack()" style="width: 100%; background: #e53e3e; color: white; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 15px; font-size: 15px;">Launch Attack</button>
    </div>

    <!-- Captured Base Details -->
    <div id="hex-content-captured" style="display: none; text-align: center;">
      <div style="background: #276749; padding: 15px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #48bb78;">
        <h4 style="margin: 0 0 10px 0; color: #9ae6b4;">Captured Territory</h4>
        <div style="font-size: 13px; margin-bottom: 10px; color: #cbd5e0;">
          Network Status: <span id="captured-network-status" style="font-weight: bold;"></span>
        </div>

        <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; margin-bottom: 10px;">
          <div style="font-size: 12px; color: #a0aec0;">Conscripts Generating</div>
          <div style="font-weight: bold; font-size: 18px; color: #f6e05e;">
            <span id="captured-conscripts">0</span> / <span id="captured-conscript-cap">0</span>
          </div>
          <div style="font-size: 11px; color: #a0aec0; margin-top: 4px;">
            Rate: +<span id="captured-conscript-rate">0</span> / hr
          </div>
        </div>

        <div style="font-size: 12px; color: #a0aec0; margin-bottom: 5px;">Defending Garrison:</div>
        <div style="font-weight: bold; font-size: 14px;">
          <span id="captured-s-count">0</span> Soldiers | <span id="captured-m-count">0</span> Medics
        </div>
      </div>
    </div>
  </div>

  <!-- Deployments Tracker -->
  <div id="deployments-panel" style="position: absolute; top: 100px; right: 20px; width: 280px; display: none;">
    <div style="background: rgba(26, 32, 44, 0.95); border: 1px solid #4a5568; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
      <div style="background: #2d3748; padding: 10px 15px; border-bottom: 1px solid #4a5568; display: flex; justify-content: space-between; align-items: center;">
        <h4 style="margin: 0; color: #e2e8f0; font-size: 14px;">Active Deployments</h4>
        <span id="deployments-count" style="background: #e53e3e; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">0</span>
      </div>
      <div id="deployments-list" style="padding: 10px; max-height: 300px; overflow-y: auto;">
        <!-- Injected via JS -->
      </div>
    </div>
  </div>
"""

pattern = re.compile(r'<div id="hex-panel".*?</div>\s*</div>\s*</div>', re.DOTALL)
new_content = pattern.sub(new_panel, content)

with open('index.html', 'w') as f:
    f.write(new_content)

print("UI Patched")
