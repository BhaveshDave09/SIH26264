import sys
import os
import uvicorn

# Add current workspace directory to python path
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0" if os.getenv("PORT") else "127.0.0.1")
    reload = False if os.getenv("PORT") else True
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=reload)

