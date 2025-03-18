#ifndef CHAT_SESSION_HPP
#define CHAT_SESSION_HPP

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio.hpp>
#include <memory>
#include <string>

class ChatServer; // 前向声明

//定义 ChatSession 类，处理单个 WebSocket 连接，包括接收和发送消息。这里使用 Boost.Beast 来支持 WebSocket 协议
class ChatSession : public std::enable_shared_from_this<ChatSession> {
public:
    // 构造函数，接管 socket，并关联服务器引用
    ChatSession(boost::asio::ip::tcp::socket socket, ChatServer& server);

    // 开始 WebSocket 握手并接收消息
    void start();

    // 读取消息
    void do_read();
    // 发送消息
    void do_write(const std::string& message);

private:
    // 使用 Boost.Beast 的 WebSocket 流封装 socket
    boost::beast::websocket::stream<boost::asio::ip::tcp::socket> ws_;
    ChatServer& server_;
    boost::beast::flat_buffer buffer_;
};

#endif
