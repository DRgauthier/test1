import re

with open('worldMap.js', 'r') as f:
    content = f.read()

# I see a lingering syntax error `  });` from my regex replace
content = re.sub(r'  \}\);\n\n    console\.log\(`Recalling troops from.*?closeDeployMenu\(\);\n  \}\n\}', '}\n', content, flags=re.DOTALL)

with open('worldMap.js', 'w') as f:
    f.write(content)
