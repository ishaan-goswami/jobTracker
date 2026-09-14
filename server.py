import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import urllib.request
import urllib.error

# Load .env file if present
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

GEMINI_PROMPT_TEMPLATE = """You are analyzing a job posting to extract resume-relevant keywords.

Extract ONLY:
- Hard skills, tools, technologies, frameworks, languages, platforms
- Certifications or specific qualifications
- Concrete responsibilities/domain expertise specific to this role

Explicitly EXCLUDE:
- Legal/compliance/EEO/ADA boilerplate (equal opportunity, accommodations, disability status, etc.)
- Generic soft-language and company-culture filler (e.g. "collaborative", "supportive environment", "grow", "whether you're...")
- Common English function words, verbs, or sentence fragments that aren't actual skills/requirements
- Benefits, perks, or HR process language (interview steps, how to apply, contact emails)

Return ONLY valid JSON in this exact format, no preamble or markdown:
{
  "keywords": [
    {"term": "string", "category": "hard_skill|tool|certification|domain_expertise", "importance": "high|medium"}
  ]
}

Job posting:
"""

class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="docs", **kwargs)

    def do_POST(self):
        if self.path == "/api/extract-keywords":
            content_len = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_len).decode("utf-8")
            try:
                data = json.loads(post_body)
            except Exception:
                data = {}

            job_desc = data.get("jobDescription", "")
            api_key = os.environ.get("GEMINI_API_KEY", "").strip()

            if not api_key:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "GEMINI_API_KEY environment variable is not configured on server."}).encode("utf-8"))
                return

            if not job_desc.strip():
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "jobDescription parameter is required."}).encode("utf-8"))
                return

            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            prompt = GEMINI_PROMPT_TEMPLATE + job_desc

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }

            req = urllib.request.Request(
                gemini_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )

            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    text_content = ""
                    candidates = resp_data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            text_content = parts[0].get("text", "")

                    parsed_json = json.loads(text_content) if text_content else {"keywords": []}
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps(parsed_json).encode("utf-8"))
            except urllib.error.HTTPError as err:
                self.send_response(err.code)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Gemini API request failed with status {err.code}"}).encode("utf-8"))
            except Exception as exc:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(exc)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

class ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True

def run_server(port=None):
    if port is None:
        port = int(os.environ.get("PORT", "8080"))
    server_address = ("", port)
    try:
        httpd = ReusableHTTPServer(server_address, AppHandler)
        print(f"🚀 Serving 2027 SWE Radar with API support at http://localhost:{port}")
        httpd.serve_forever()
    except OSError as err:
        if err.errno == 48:
            print(f"⚠️ Port {port} is already in use by another running server instance.")
            print(f"👉 You can access the live dashboard right now at http://localhost:{port}")
            print(f"👉 Or run on a different port: PORT=8081 python server.py")
        else:
            raise

if __name__ == "__main__":
    run_server()
