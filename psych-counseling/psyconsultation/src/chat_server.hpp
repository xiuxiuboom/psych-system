#ifndef CHAT_SERVER_HPP
#define CHAT_SERVER_HPP

#include <set>
#include <memory>
#include <string>
#include <boost/asio.hpp>

class ChatSession; // ǰ������

//���� ChatServer �࣬����������ӡ��������лỰ�Լ���Ϣ�Ĺ㲥��
class ChatServer : public std::enable_shared_from_this<ChatServer> {
public:
    ChatServer(boost::asio::io_context& ioc, unsigned short port);

    // ��ʼ�����µ�����
    void do_accept();

    // ����Ự�Ľӿ�
    void join(std::shared_ptr<ChatSession> session);
    void leave(std::shared_ptr<ChatSession> session);
    // ���յ�����Ϣ�㲥���������ӵĻỰ
    void deliver(const std::string& message);

private:
    boost::asio::ip::tcp::acceptor acceptor_;
    std::set<std::shared_ptr<ChatSession>> sessions_;
};

#endif
