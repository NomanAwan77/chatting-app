require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/db/db");

const server = http.createServer(app);
const { initSocket } = require("./src/socket/socket");

initSocket(server);

connectDB();
PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
