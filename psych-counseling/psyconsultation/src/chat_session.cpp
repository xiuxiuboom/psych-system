#include "chat_session.hpp"
#include "chat_server.hpp"
#include <iostream>

ChatSession::ChatSession(boost::asio::ip::tcp::socket socket, ChatServer& server)
    : ws_(std::move(socket)), server_(server)
{}

//实现 ChatSession 成员函数，包括握手、读取消息并调用 ChatServer::deliver 广播，以及写入消息：
void ChatSession::start() {
    // 执行 WebSocket 握手
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
                // 将读取到的缓冲区数据转换为字符串
                std::string message = boost::beast::buffers_to_string(self->buffer_.data());
                // 广播消息到所有会话
                self->server_.deliver(message);
                // 清除缓冲区中已处理的数据
                self->buffer_.consume(bytes_transferred);
                // 继续读取下一个消息
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
    // 将消息复制到 shared_ptr 中，保证在异步操作期间其生命周期足够长
    auto msg_ptr = std::make_shared<std::string>(message);

    // 设置为文本模式
    ws_.text(ws_.got_text());

    ws_.async_write(
        boost::asio::buffer(*msg_ptr),
        [self = shared_from_this(), msg_ptr](boost::system::error_code ec, std::size_t /*bytes_transferred*/) {
            if (ec) {
                std::cerr << "Write error: " << ec.message() << std::endl;
                self->server_.leave(self);
            }
            // 当 lambda 结束时，msg_ptr 会自动释放
        }
    );
}

