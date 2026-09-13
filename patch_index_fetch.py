import re

with open('index.html', 'r') as f:
    content = f.read()

content = content.replace('window.worldMap.fetchOtherPlayers();', 'window.worldMap.fetchGameData();')

with open('index.html', 'w') as f:
    f.write(content)

print("index.html patched")
