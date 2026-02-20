const express = require("express");
const app = express();

app.use(express.json()); // to read JSON body

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
