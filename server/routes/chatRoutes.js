const express = require("express");

const router = express.Router();

router.post("/", (req, res) => {

  const userMessage = req.body.message;

  res.json({
    reply: `AI received: ${userMessage}`
  });

});

module.exports = router;