import re

with open('camera.js', 'r') as f:
    content = f.read()

content = re.sub(r'    if \(window\.missionManager\) window\.missionManager\.update\(\);\n', '', content)

with open('camera.js', 'w') as f:
    f.write(content)
