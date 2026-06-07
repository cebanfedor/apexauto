const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const handler = require("./api/lot.js");
const bidAdviceHandler = require("./api/bid-advice.js");

const root = __dirname;
const port = Number(process.env.PORT || 8081);
const mime = {
  ".html":"text/html; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".js":"application/javascript; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".svg":"image/svg+xml",
  ".ico":"image/x-icon"
};

function send(res, status, body, type = "text/plain; charset=utf-8"){
  res.writeHead(status, {"content-type":type});
  res.end(body);
}

function jsonResponse(res){
  return {
    status(code){
      this.statusCode = code;
      return this;
    },
    json(payload){
      res.writeHead(this.statusCode || 200, {"content-type":"application/json; charset=utf-8"});
      res.end(JSON.stringify(payload));
    }
  };
}

function readBody(req){
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if(body.length > 1024 * 1024) reject(new Error("Request body too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);

  if(url.pathname === "/api/lot"){
    return handler(req, jsonResponse(res));
  }

  if(url.pathname === "/api/bid-advice"){
    return readBody(req)
      .then(body => {
        req.body = body;
        return bidAdviceHandler(req, jsonResponse(res));
      })
      .catch(() => send(res, 400, JSON.stringify({ok:false,error:"Bad request body"}), "application/json; charset=utf-8"));
  }

  const safePath = path.normalize(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.join(root, safePath);
  if(!filePath.startsWith(root)){
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if(error){
      send(res, 404, "Not found");
      return;
    }
    res.writeHead(200, {"content-type":mime[path.extname(filePath)] || "application/octet-stream"});
    res.end(data);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`APEX local API server: http://127.0.0.1:${port}`);
});
