#ifndef CHAT_SESSION_HPP
#define CHAT_SESSION_HPP

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio.hpp>
#include <memory>
#include <string>

class ChatServer; // ǰ������

//���� ChatSession �࣬������ WebSocket ���ӣ��������պͷ�����Ϣ������ʹ�� Boost.Beast ��֧�� WebSocket Э��
class ChatSession : public std::enable_shared_from_this<ChatSession> {
public:
    // ���캯�����ӹ� socket������������������
    ChatSession(boost::asio::ip::tcp::socket socket, ChatServer& server);

    // ��ʼ WebSocket ���ֲ�������Ϣ
    void start();

    // ��ȡ��Ϣ
    void do_read();
    // ������Ϣ
    void do_write(const std::string& message);

private:
    // ʹ�� Boost.Beast �� WebSocket ����װ socket
    boost::beast::websocket::stream<boost::asio::ip::tcp::socket> ws_;
    ChatServer& server_;
    boost::beast::flat_buffer buffer_;
};

#endif
