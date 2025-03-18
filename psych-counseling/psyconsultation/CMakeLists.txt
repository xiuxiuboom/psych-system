cmake_minimum_required(VERSION 3.10)
project(ChatServer)

set(CMAKE_CXX_STANDARD 17)

set(BOOST_ROOT "F:/edge/boost_1_87_0")
set(BOOST_INCLUDEDIR "F:/edge/boost_1_87_0")
set(BOOST_LIBRARYDIR "F:/edge/boost_1_87_0/stage/lib")
find_package(Boost REQUIRED COMPONENTS system thread)
include_directories(${Boost_INCLUDE_DIRS})

# 添加手动下载的 nlohmann/json 头文件所在目录
include_directories(${PROJECT_SOURCE_DIR}/nlohmann/json.hpp)

add_executable(ChatServer
    src/main.cpp
    src/chat_server.cpp
    src/chat_session.cpp
)

target_link_libraries(ChatServer ${Boost_LIBRARIES})

# 由于 nlohmann/json 是头文件库，这里不再需要链接库目标
# 移除 target_link_libraries(ChatServer PRIVATE nlohmann_json::nlohmann_json)


