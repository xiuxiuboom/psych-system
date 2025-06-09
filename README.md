
# 心理咨询在线平台（Psychological Counseling Platform）

> 一个基于 WebSocket 的在线心理咨询系统，集成用户注册登录、图文文章浏览、匿名留言墙、预约管理、实时聊天、医生评价和管理员后台等功能。  

---

## 📋 功能概览

- **用户端（普通用户）**  
  - 注册 / 登录 / 修改密码  
  - 图文文章浏览与详情阅读  
  - “今日心理语录”随机推送  
  - 匿名留言墙（弹幕形式）  
  - 预约服务：选择心理医生、填写心理档案、挑选日期与时段  
  - 实时聊天：WebSocket + C++ 中转 + Node.js 转发  
  - 咨询结束后评价医生（文字 + 1～10 分）  

- **医生端（心理医生）**  
  - 医生工作台：查看待处理预约  
  - 开启 / 关闭聊天室  
  - 与用户实时双向沟通  

- **管理员后台**  
  - 用户管理（修改身份）  
  - 文章管理（增删改查）  
  - 心理语录管理（增删改查）  
  - 留言墙管理  
  - 医生申请审核  
  - 系统公告管理  

---

## 🛠️ 技术选型

| 层   | 技术 / 框架                   | 说明                                                                 |
| ---- | ----------------------------- | -------------------------------------------------------------------- |
| 前端 | HTML5, CSS3, JavaScript       | Bootstrap (Bootswatch Cosmo) 实现响应式界面                          |
| 后端 | Node.js + Express             | RESTful API, 用户／文章／预约／评价等接口                             |
| 实时 | C++ + Boost.Asio + Beast      | 高性能 WebSocket 服务，负责消息收发                                 |
| DB   | MySQL                         | 存储：users, articles, quotes, announcements, appointments, reviews… |
| 安全 | bcrypt                        | 密码哈希存储                                                         |

---

## 🚀 本地开发 & 运行指南

1. **克隆仓库**  
 ```bash
 git clone https://github.com/yourname/psych-counseling.git
 cd psych-counseling
   
````

2. **数据库准备**

   * 安装并启动 MySQL。
   * 创建数据库并执行 `schema.sql`（包含所有建表语句）：

     ```sql
     CREATE DATABASE psych_counseling;
     USE psych_counseling;
     SOURCE ./db/schema.sql;
     ```
   * 在 `.env.example` 里设置数据库连接凭据，另存为 `.env`。

3. **启动后端 Node.js 服务**

   ```bash
   cd server
   npm install
   npm run dev
   ```

   > 默认监听 `http://localhost:3000`

4. **编译 & 启动 C++ WebSocket 中转服务**

   ```bash
   cd chat-cpp
   mkdir build && cd build
   cmake ..
   make
   ./chat_server    # 默认监听 9000
   ```

5. **前端静态文件**

   * 所有 HTML + JS + CSS 已打包在 `public/` 下，Node.js 启动后自动提供。
   * 直接浏览器打开 `http://localhost:3000` 即可。

---

## ⚙️ 环境变量

在项目根目录新建 `.env`，至少配置：

```dotenv
# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=psych_counseling

# Node.js 服务端口
PORT=3000

# C++ WebSocket 服务地址
WS_HOST=127.0.0.1
WS_PORT=9000
```

---

## 📝 目录结构

```
├── chat-cpp/               # C++ WebSocket 服务
│   ├── CMakeLists.txt
│   ├── chat_server.cpp
│   └── chat_session.cpp
├── public/                 # 前端静态资源（HTML/CSS/JS）
│   ├── index.html
│   ├── doctorList.html
│   ├── chat.html
│   └── admin*.html
├── server/                 # Node.js 后端
│   ├── api/                # 各模块路由
│   ├── db/                 # 数据库初始化 / migrations
│   ├── middleware/
│   ├── server.js
│   └── package.json
├── db/
│   └── schema.sql          # 所有建表语句
├── .env.example
└── README.md
```

---

## 📖 常用接口（示例）

* **用户注册**
  `POST /api/register`
  `{ username, password, email }`

* **获取医生列表**
  `GET /api/doctors`

* **检查咨询流程**
  `GET /api/checkConsultFlow?userId=…&doctorId=…`

* **加入聊天**
  `POST /api/joinChat`
  `{ userId, doctorId }`

* **提交评价**
  `POST /api/reviews`
  `{ userId, doctorId, appointmentId, content, rating }`

* **获取公告**
  `GET /api/announcements`



---
