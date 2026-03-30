const MessageModel = require("../models/message.model");

const createMessage = async (req, res) => {
  const { senderId, receiverId, message } = req.body;
  const newMessage = await MessageModel.create({
    senderId,
    receiverId,
    message,
  });
  res.status(201).json(newMessage);
};

const getMessages = async (req, res) => {
  const { senderId, receiverId } = req.params;
  try {
    const messages = await MessageModel.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });
    console.log("Messages:", messages);
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createMessage, getMessages };
