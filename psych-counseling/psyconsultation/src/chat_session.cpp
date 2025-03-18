#include "chat_session.hpp"
#include "chat_server.hpp"
#include <iostream>

ChatSession::ChatSession(boost::asio::ip::tcp::socket socket, ChatServer& server)
    : ws_(std::move(socket)), server_(server)
{}

//ʵ�� ChatSession ��Ա�������������֡���ȡ��Ϣ������ ChatServer::deliver �㲥���Լ�д����Ϣ��
void ChatSession::start() {
    // ִ�� WebSocket ����
    ws_.async_accept(
        [self = shared_from_this()](boost::system::error_code ec) {
            if (!ec) {
                self->do_read();
            }
            else {
                std::cerr << "WebSocket accept error: " << ec.message() << std::endl;
            }
        }
    );
}

void ChatSession::do_read() {
    ws_.async_read(
        buffer_,
        [self = shared_from_this()](boost::system::error_code ec, std::size_t bytes_transferred) {
            if (!ec) {
                // ����ȡ���Ļ���������ת��Ϊ�ַ���
                std::string message = boost::beast::buffers_to_string(self->buffer_.data());
                // �㲥��Ϣ�����лỰ
                self->server_.deliver(message);
                // ������������Ѵ��������
                self->buffer_.consume(bytes_transferred);
                // ������ȡ��һ����Ϣ
                self->do_read();
            }
            else {
                std::cerr << "Read error: " << ec.message() << std::endl;
                self->server_.leave(self);
            }
        }
    );
}

void ChatSession::do_write(const std::string& message) {
    // ����Ϣ���Ƶ� shared_ptr �У���֤���첽�����ڼ������������㹻��
    auto msg_ptr = std::make_shared<std::string>(message);

    // ����Ϊ�ı�ģʽ
    ws_.text(ws_.got_text());

    ws_.async_write(
        boost::asio::buffer(*msg_ptr),
        [self = shared_from_this(), msg_ptr](boost::system::error_code ec, std::size_t /*bytes_transferred*/) {
            if (ec) {
                std::cerr << "Write error: " << ec.message() << std::endl;
                self->server_.leave(self);
            }
            // �� lambda ����ʱ��msg_ptr ���Զ��ͷ�
        }
    );
}

