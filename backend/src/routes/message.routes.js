const express = require("express");
const {
  createMessage,
  getMessages,
} = require("../controller/message.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", authMiddleware, createMessage);
router.get("/:senderId/:receiverId", authMiddleware, getMessages);

module.exports = router;
