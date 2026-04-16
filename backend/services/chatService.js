const Chat = require('../models/Chat');
const Message = require('../models/Message');

class ChatService {
  static async listUserChats(userId, limit, offset) {
    const chats = await Chat.getByUserId(userId, limit, offset);
    const total = await Chat.countByUserId(userId);
    return { chats, total };
  }

  static async getChatForUser(chatId, userId) {
    const chat = await Chat.getById(chatId);
    if (!chat) return null;
    const members = await Chat.getMembers(chatId);
    const isMember = members.some(m => m.id === userId);
    if (!isMember) return null;
    await Message.markAsRead(chatId, userId);
    return { ...chat, members };
  }
}

module.exports = ChatService;
