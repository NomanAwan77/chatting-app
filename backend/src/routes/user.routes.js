const express = require("express");
const { register, login } = require("../controller/auth.controllere");
const { getAllUsers } = require("../controller/user.controller");
const authMiddleware = require("../middleware/auth.middleware");
const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/get-users", authMiddleware, getAllUsers);
module.exports = router;
