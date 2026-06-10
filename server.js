export default function handler(req, res) {
  console.log("收到請求:", req.method, req.url);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end("OK");
}
