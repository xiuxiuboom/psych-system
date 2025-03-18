#include "chat_server.hpp"
#include "chat_session.hpp"
#include <boost/asio.hpp>
#include <iostream>

ChatServer::ChatServer(boost::asio::io_context& ioc, unsigned short port)
    : acceptor_(ioc, boost::asio::ip::tcp::endpoint(boost::asio::ip::tcp::v4(), port))
{
    do_accept();
}
//实现 ChatServer 的成员函数。代码中对每个新连接创建一个 ChatSession，并将其加入会话集合中
void ChatServer::do_accept() {
    acceptor_.async_accept(
        [this](boost::system::error_code ec, boost::asio::ip::tcp::socket socket) {
            if (!ec) {
                auto session = std::make_shared<ChatSession>(std::move(socket), *this);
                join(session);
                session->start();
            }
            else {
                std::cerr << "Accept error: " << ec.message() << std::endl;
            }
            // 继续接受下一个连接
            do_accept();
        }
    );
}

void ChatServer::join(std::shared_ptr<ChatSession> session) {
    sessions_.insert(session);
}

void ChatServer::leave(std::shared_ptr<ChatSession> session) {
    sessions_.erase(session);
}

void ChatServer::deliver(const std::string& message) {
    // 将消息发送给所有在线会话
    for (auto& session : sessions_) {
        session->do_write(message);
    }
}
