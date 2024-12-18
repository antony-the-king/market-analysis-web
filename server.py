import http.server
import socketserver
import os
import mimetypes

# Add MIME type for JavaScript modules
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # Add necessary headers for ES modules
        if self.path.endswith('.js'):
            self.send_header('Content-Type', 'application/javascript')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

PORT = 8000

# Get the directory containing server.py
current_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(current_dir)  # Change to this directory

print(f"Starting server at http://localhost:{PORT}")
print(f"Serving files from: {current_dir}")

with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.server_close()
