export default function handler(req, res) {
  if (req.url === '/api/webhook') {
    return res.status(404).send("Not Found");
  }
  res.status(200).send("OK");
}
