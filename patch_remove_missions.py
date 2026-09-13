import re

with open('index.html', 'r') as f:
    content = f.read()

# Remove missions.js from script tags
content = re.sub(r'<script src="missions\.js"></script>\n?', '', content)

# Remove window.missionManager instantiations
content = re.sub(r'window\.missionManager = new MissionManager\(.*?\);\n?', '', content)
content = re.sub(r'window\.missionManager\.update\(\);\n?', '', content)

with open('index.html', 'w') as f:
    f.write(content)

# We also need to remove it from auth.js if it's initialized there
with open('auth.js', 'r') as f:
    auth_content = f.read()
    auth_content = re.sub(r'window\.missionManager = new MissionManager\(.*?\);\n?', '', auth_content)

with open('auth.js', 'w') as f:
    f.write(auth_content)

print("Missions references removed")
