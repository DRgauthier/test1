import re

with open('camera.js', 'r') as f:
    code = f.read()

code = code.replace(
    'if (!structureManager.isDeconstructing) {',
    'if (!structureManager.isMoving) {'
)

code = code.replace(
    'if (!structureManager.isBuilding && !structureManager.isDeconstructing) {',
    'if (!structureManager.isBuilding && !structureManager.isMoving) {'
)

code = code.replace(
    '''    if (sceneManager.currentScene === 'BASE') {
      if (structureManager.isBuilding) {
        // Place building is now triggered by UI button, no longer on click.
        // We will just do nothing here.
      } else if (structureManager.isDeconstructing) {
        structureManager.deconstructBuilding();
      } else {
        // --- Click Interaction Logic ---''',
    '''    if (sceneManager.currentScene === 'BASE') {
      if (structureManager.isBuilding) {
        // Place building is now triggered by UI button, no longer on click.
        // We will just do nothing here.
      } else if (structureManager.isMoving) {
        if (structureManager.isValidPlacement) {
          structureManager.confirmMove();
        }
      } else {
        // --- Click Interaction Logic ---'''
)

code = code.replace(
    '''window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (sceneManager.currentScene === 'BASE') {
      if (structureManager.isBuilding || structureManager.isDeconstructing) {
        structureManager.cancelAction();
      }

      const upgradeMenu = document.getElementById('upgrade-menu');''',
    '''window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (sceneManager.currentScene === 'BASE') {
      if (structureManager.isBuilding || structureManager.isMoving) {
        structureManager.cancelAction();
      }

      const upgradeMenu = document.getElementById('upgrade-menu');'''
)

code = code.replace(
    '''  // Handle right-click for canceling actions
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (sceneManager.currentScene === 'BASE') {
      if (structureManager.isBuilding || structureManager.isDeconstructing) {
        structureManager.cancelAction();
      } else {''',
    '''  // Handle right-click for canceling actions
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (sceneManager.currentScene === 'BASE') {
      if (structureManager.isBuilding || structureManager.isMoving) {
        structureManager.cancelAction();
      } else {'''
)

with open('camera.js', 'w') as f:
    f.write(code)
