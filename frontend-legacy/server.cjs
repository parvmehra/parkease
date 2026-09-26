const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
};

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const target = path.normalize(path.join(root, url.pathname === "/" ? "index.html" : url.pathname));
  if (!target.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(target, (err, body) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream" });
    res.end(body);
  });
}).listen(process.env.PORT || 5173, () => {
  console.log(`ParkEase frontend running on http://localhost:${process.env.PORT || 5173}`);
});
