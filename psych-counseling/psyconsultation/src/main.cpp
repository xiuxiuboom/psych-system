#include <boost/asio.hpp>
#include <iostream>
#include "chat_server.hpp"

int main(int argc, char* argv[]) {
    try {
        boost::asio::io_context ioc;
        // 设置监听端口，比如9000
        unsigned short port = 9000;
        auto server = std::make_shared<ChatServer>(ioc, port);
        std::cout << "C++ Chat Server listening on port " << port << std::endl;
        ioc.run();
    }
    catch (std::exception const& e) {
        std::cerr << "Exception: " << e.what() << std::endl;
    }
    return 0;
}
