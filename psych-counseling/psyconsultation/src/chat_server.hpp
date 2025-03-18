#ifndef CHAT_SERVER_HPP
#define CHAT_SERVER_HPP

#include <set>
#include <memory>
#include <string>
#include <boost/asio.hpp>

class ChatSession; // 前向声明

//定义 ChatServer 类，负责监听连接、管理所有会话以及消息的广播：
class ChatServer : public std::enable_shared_from_this<ChatServer> {
public:
    ChatServer(boost::asio::io_context& ioc, unsigned short port);

    // 开始接受新的连接
    void do_accept();

    // 管理会话的接口
    void join(std::shared_ptr<ChatSession> session);
    void leave(std::shared_ptr<ChatSession> session);
    // 将收到的消息广播给所有连接的会话
    void deliver(const std::string& message);

private:
    boost::asio::ip::tcp::acceptor acceptor_;
    std::set<std::shared_ptr<ChatSession>> sessions_;
};

#endif
