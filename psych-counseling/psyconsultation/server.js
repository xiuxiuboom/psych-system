// JavaScript source code
const express = require('express');
const mysql = require('mysql2');
const socketIo = require('socket.io');
const http = require('http');
const bcrypt = require('bcrypt');  // 用于加密和比较密码

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 连接到 MySQL 数据库
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       // 你的 MySQL 用户名
    password: '123456',       // 你的 MySQL 密码
    database: 'psyconsultation'  // 你的数据库名
});

db.connect((err) => {
    if (err) throw err;
    console.log('数据库连接成功');
});
// 设置静态文件夹，提供前端文件
app.use(express.static('public'));

// 设置解析 POST 请求的 JSON 数据，并设置接收大小限制
app.use(express.json({ limit: '10mb' }));

// 主页路由：这会发送 HTML 文件，Content-Type 会自动设置为 text/html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// 针对 /api 路由设置响应头，确保所有 API 响应都使用 UTF-8 编码
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});


// 登录接口
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // 查询数据库获取用户名和加密后的密码
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('数据库查询错误:', err);
            return res.status(500).json({ error: '数据库查询失败' });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: '用户名不存在' });
        }

        const user = results[0];

        // 使用 bcrypt 比对密码
        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                console.error('密码比对失败:', err);
                return res.status(500).json({ error: '密码比对失败' });
            }
            if (result) {
                res.json({ success: true, user: user });
            } else {
                res.status(400).json({ error: '密码错误' });
            }
        });
    });
});

// 用户注册接口
app.post('/api/register', (req, res) => {
    const { username, password, email } = req.body;

    // 加密密码
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ error: '密码加密失败' });
        }

        // 将加密后的密码存入数据库
        db.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
            [username, hashedPassword, email], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: '注册失败' });
                }
                return res.json({ success: true });
            });
    });
});

// 模拟心理语录数据
const quotes = [
    "每天都是新的开始，保持积极，保持乐观！",
    "生活中的每个挑战都是一次成长的机会。",
    "相信自己，你的努力会带来改变。",
    "不要为今天的困难感到气馁，未来充满希望。",
    "积极的心态是成功的一半。",
];

// 获取每天的心理语录,添加一个新的路由，返回一个随机的心理语录。
app.get('/api/quote', (req, res) => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    res.json({ quote: randomQuote });
});

// 匿名留言墙
let messages = [];  // 存储留言的数组

// 合并 WebSocket 连接处理逻辑
io.on('connection', (socket) => {
    console.log('用户连接');

    // 发送历史消息给新连接的用户
    socket.emit('previousMessages', messages);

    // 监听用户发送的留言
    socket.on('sendMessage', (message) => {
        messages.push(message);
        io.emit('newMessage', message);  // 广播给所有用户
    });

    // 原有的实时聊天逻辑
    socket.on('message', (msg) => {
        io.emit('message', msg);  // 广播消息给所有连接的用户
    });
});

// 模拟的文章数据
const articles = [
    { title: "如何保持心理健康", content: "心理健康是生活中最重要的一部分..." },
    { title: "压力管理技巧", content: "学习如何管理压力能帮助你保持冷静..." },
    { title: "积极心态的重要性", content: "积极心态能够提升生活质量..." },
];

// 获取文章列表
app.get('/api/articles', (req, res) => {
    res.json(articles);
});

// 启动服务器
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`服务器已启动，访问网址：http://localhost:${PORT}`);
});