"""
Optional dev server for the frontend (Python standard library only).

  python serve.py                 -> http://localhost:5173, proxies POST /predict to Flask
  python serve.py --port 8080 --backend http://127.0.0.1:5000

Because the browser only talks to this server (same origin), no CORS setup is
needed. To use it, set API_BASE_URL = "" in src/config.js.
It forwards requests untouched; it contains no prediction logic.
"""
import argparse
import functools
import json
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent


class Handler(SimpleHTTPRequestHandler):
    backend = "http://127.0.0.1:5000"

    def do_POST(self):
        if self.path != "/predict":
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        req = urllib.request.Request(
            self.backend + "/predict", data=body, method="POST",
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                status, payload = resp.status, resp.read()
        except urllib.error.HTTPError as err:
            status, payload = err.code, err.read()
        except Exception as err:  # backend down / unreachable
            status = 502
            payload = json.dumps({"error": f"Cannot reach Flask at {self.backend}: {err}"}).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # always fresh while developing
        super().end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5173)
    parser.add_argument("--backend", default="http://127.0.0.1:5000")
    args = parser.parse_args()
    Handler.backend = args.backend.rstrip("/")
    handler = functools.partial(Handler, directory=str(ROOT))
    print(f"Frontend: http://localhost:{args.port}   (proxying /predict -> {Handler.backend})")
    ThreadingHTTPServer(("127.0.0.1", args.port), handler).serve_forever()
