const express = require("express");
const messageRoutes = require("./routes/message.routes");
const cors = require("cors");
const userRoutes = require("./routes/user.routes");
const cookieParser = require("cookie-parser");
const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(cors());
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

module.exports = app;
