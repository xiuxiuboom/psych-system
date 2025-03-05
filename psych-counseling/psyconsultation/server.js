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

// 针对 .html 文件设置 Content-Type 为 text/html; charset=UTF-8
app.use((req, res, next) => {
    if (req.url.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    }
    next();
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

app.get('/api/quote', (req, res) => {
    db.query('SELECT content FROM quotes ORDER BY RAND() LIMIT 1', (err, results) => {
        if (err) {
            console.error('查询语录失败:', err);
            return res.status(500).json({ error: '查询语录失败' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '暂无语录' });
        }
        res.json({ quote: results[0].content });
    });
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

// 精选文章
app.get('/api/articles', (req, res) => {
    let query = 'SELECT id, title, image_url FROM articles ORDER BY created_at DESC';
    // 如果请求中提供了 limit 参数，则添加 LIMIT 子句
    if (req.query.limit) {
        const limit = parseInt(req.query.limit);
        if (!isNaN(limit) && limit > 0) {
            query += ' LIMIT ' + limit;
        }
    }
    db.query(query, (err, results) => {
        if (err) {
            console.error('查询文章列表错误:', err);
            return res.status(500).json({ error: '无法获取文章列表' });
        }
        res.json(results);
    });
});




// 获取单个文章详情
app.get('/api/article', (req, res) => {
    const id = parseInt(req.query.id);
    db.query('SELECT id, title, content, image_url FROM articles WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('查询文章详情错误:', err);
            return res.status(500).json({ error: '查询文章失败' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '文章未找到' });
        }
        res.json(results[0]);
    });
});

app.get('/api/announcements', (req, res) => {
    db.query('SELECT * FROM announcements ORDER BY created_at DESC', (err, results) => {
        if (err) {
            console.error('查询公告列表错误:', err);
            return res.status(500).json({ error: '无法获取公告列表' });
        }
        res.json(results);
    });
});

app.get('/api/announcement', (req, res) => {
    const id = parseInt(req.query.id);
    db.query('SELECT * FROM announcements WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('查询公告详情错误:', err);
            return res.status(500).json({ error: '查询公告失败' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '公告未找到' });
        }
        res.json(results[0]);
    });
});

// 启动服务器
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`服务器已启动，访问网址：http://localhost:${PORT}`);
});