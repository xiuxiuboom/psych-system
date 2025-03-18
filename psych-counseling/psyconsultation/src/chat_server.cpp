#include "chat_server.hpp"
#include "chat_session.hpp"
#include <boost/asio.hpp>
#include <iostream>

ChatServer::ChatServer(boost::asio::io_context& ioc, unsigned short port)
    : acceptor_(ioc, boost::asio::ip::tcp::endpoint(boost::asio::ip::tcp::v4(), port))
{
    do_accept();
}
//ʵ�� ChatServer �ĳ�Ա�����������ж�ÿ�������Ӵ���һ�� ChatSession�����������Ự������
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
            // ����������һ������
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
    // ����Ϣ���͸��������߻Ự
    for (auto& session : sessions_) {
        session->do_write(message);
    }
}
