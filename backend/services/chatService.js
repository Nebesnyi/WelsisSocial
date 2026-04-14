const Chat = require('../models/Chat');
const Message = require('../models/Message');

class ChatService {
  static listUserChats(userId, limit, offset) {
    const chats = Chat.getByUserId(userId, limit, offset);
    const total = Chat.countByUserId(userId);
    return { chats, total };
  }

  static getChatForUser(chatId, userId) {
    const chat = Chat.getById(chatId);
    if (!chat) return null;
    const members = Chat.getMembers(chatId);
    const isMember = members.some(m => m.id === userId);
    if (!isMember) return null;
    Message.markAsRead(chatId, userId);
    return { ...chat, members };
  }
}

module.exports = ChatService;
