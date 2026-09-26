import base64

def load_icon(b64: str) -> bytes:
    return base64.b64decode(b64)
