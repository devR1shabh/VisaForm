require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const chatRoutes = require("./routes/chatRoutes");

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("MongoDB Connected");
})
.catch((error) => {
  console.log("MongoDB Error:", error);
});

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => {
  res.send("Visa Assistant Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

