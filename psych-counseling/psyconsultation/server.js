// JavaScript source code
const express = require('express');
const mysql = require('mysql2');
const socketIo = require('socket.io');
const http = require('http');
const bcrypt = require('bcrypt');  // 用于加密和比较密码

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
// 用于保存已开放聊天室的医生ID，结构为 { doctorId1: true, doctorId2: true, ... }
const activeChatrooms = {};
// 用于记录各个医生的聊天室是否已开启（简单的内存存储，生产环境建议持久化）
const openChats = {};




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

app.get('/api/quotes', (req, res) => {
    db.query('SELECT * FROM quotes ORDER BY created_at DESC', (err, results) => {
        if (err) {
            console.error('查询心理语录列表错误:', err);
            return res.status(500).json({ error: '无法获取心理语录列表' });
        }
        res.json(results);
    });
});

app.get('/api/quote', (req, res) => {
    if (req.query.id) {
        // 如果传入 id 参数，则查询对应语录的完整记录
        const id = parseInt(req.query.id);
        db.query('SELECT * FROM quotes WHERE id = ?', [id], (err, results) => {
            if (err) {
                console.error('查询语录详情错误:', err);
                return res.status(500).json({ error: '查询语录失败' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: '语录未找到' });
            }
            res.json(results[0]);
        });
    } else {
        // 如果没有传入 id，则返回随机语录（仅返回内容）
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
    }
});

//添加心理语录
app.post('/api/quote', (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: '语录内容不能为空' });
    }
    db.query('INSERT INTO quotes (content) VALUES (?)', [content], (err, results) => {
        if (err) {
            console.error('添加心理语录失败:', err);
            return res.status(500).json({ error: '添加心理语录失败' });
        }
        res.json({ success: true, quoteId: results.insertId });
    });
});

//修改心理语录
app.put('/api/quote', (req, res) => {
    const { id, content } = req.body;
    if (!id || !content) {
        return res.status(400).json({ error: '语录ID和内容不能为空' });
    }
    db.query('UPDATE quotes SET content = ? WHERE id = ?', [content, id], (err, results) => {
        if (err) {
            console.error('更新心理语录失败:', err);
            return res.status(500).json({ error: '更新心理语录失败' });
        }
        res.json({ success: true });
    });
});

//删除心理语录
app.delete('/api/quote', (req, res) => {
    const id = parseInt(req.query.id);
    if (!id) {
        return res.status(400).json({ error: '语录ID不能为空' });
    }
    db.query('DELETE FROM quotes WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('删除心理语录失败:', err);
            return res.status(500).json({ error: '删除心理语录失败' });
        }
        res.json({ success: true });
    });
});

// 匿名留言墙
let messages = [];  // 存储留言的数组

// 合并 WebSocket 连接处理逻辑
io.on('connection', (socket) => {
    console.log('用户连接');

    // 从数据库中查询留言记录，并发送给新连接的用户
    db.query('SELECT * FROM messages ORDER BY created_at ASC', (err, results) => {
        if (err) {
            console.error('查询留言失败:', err);
        } else {
            socket.emit('previousMessages', results);
        }
    });

    // 监听用户发送的留言
    socket.on('sendMessage', (message) => {
        // 将留言插入到数据库
        db.query('INSERT INTO messages (content) VALUES (?)', [message], (err, results) => {
            if (err) {
                console.error('保存留言失败:', err);
            } else {
                // 查询刚插入的留言记录（包含生成的 id 和 created_at）
                db.query('SELECT * FROM messages WHERE id = ?', [results.insertId], (err, results2) => {
                    if (err) {
                        console.error('查询新留言失败:', err);
                    } else {
                        const newMessage = results2[0];
                        // 广播这条新留言给所有客户端
                        io.emit('newMessage', newMessage);
                    }
                });
            }
        });
    });
});

//管理员查看留言
app.get('/api/messages', (req, res) => {
    db.query('SELECT * FROM messages ORDER BY created_at ASC', (err, results) => {
        if (err) {
            console.error('查询留言列表错误:', err);
            return res.status(500).json({ error: '无法获取留言列表' });
        }
        res.json(results);
    });
});

//管理员删除留言
app.delete('/api/message', (req, res) => {
    const id = parseInt(req.query.id);
    if (!id) {
        return res.status(400).json({ error: '留言ID不能为空' });
    }
    db.query('DELETE FROM messages WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('删除留言失败:', err);
            return res.status(500).json({ error: '删除留言失败' });
        }
        res.json({ success: true });
    });
});

//返回所有用户的基本信息和身份（供管理员查看）。
app.get('/api/users', (req, res) => {
    db.query('SELECT id, username, email, role FROM users', (err, results) => {
        if (err) {
            console.error('查询用户列表错误:', err);
            return res.status(500).json({ error: '无法获取用户列表' });
        }
        res.json(results);
    });
});

app.put('/api/user', (req, res) => {
    const { id, role } = req.body;
    // 验证 role 合法性
    if (!['普通用户', '心理医生', '管理员'].includes(role)) {
        return res.status(400).json({ error: '无效的用户身份' });
    }
    db.query('UPDATE users SET role = ? WHERE id = ?', [role, id], (err, results) => {
        if (err) {
            console.error('更新用户身份失败:', err);
            return res.status(500).json({ error: '更新用户身份失败' });
        }
        res.json({ success: true });
    });
});

// 管理员登录接口
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    // 查询数据库中该用户名的用户信息
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('管理员登录查询错误:', err);
            return res.status(500).json({ error: '数据库查询失败' });
        }
        if (results.length === 0) {
            return res.status(400).json({ error: '用户名不存在' });
        }
        const user = results[0];
        // 使用 bcrypt 比对密码
        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                console.error('密码比对失败:', err);
                return res.status(500).json({ error: '密码比对失败' });
            }
            if (!match) {
                return res.status(400).json({ error: '密码错误' });
            }
            // 检查用户角色是否为管理员
            if (user.role !== '管理员') {
                return res.status(403).json({ error: '无管理员权限' });
            }
            res.json({ success: true, user });
        });
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

//管理员通过该接口添加文章
app.post('/api/article', (req, res) => {
    const { title, content, image_url } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: '文章标题和内容不能为空' });
    }
    db.query(
        'INSERT INTO articles (title, content, image_url) VALUES (?, ?, ?)',
        [title, content, image_url],
        (err, results) => {
            if (err) {
                console.error('添加文章失败:', err);
                return res.status(500).json({ error: '添加文章失败' });
            }
            res.json({ success: true, articleId: results.insertId });
        }
    );
});

//管理员通过该接口更新文章内容
app.put('/api/article', (req, res) => {
    const { id, title, content, image_url } = req.body;
    if (!id || !title || !content) {
        return res.status(400).json({ error: '文章ID、标题和内容不能为空' });
    }
    db.query(
        'UPDATE articles SET title = ?, content = ?, image_url = ? WHERE id = ?',
        [title, content, image_url, id],
        (err, results) => {
            if (err) {
                console.error('更新文章失败:', err);
                return res.status(500).json({ error: '更新文章失败' });
            }
            res.json({ success: true });
        }
    );
});

//管理员删除文章
app.delete('/api/article', (req, res) => {
    const id = parseInt(req.query.id);
    if (!id) {
        return res.status(400).json({ error: '文章ID不能为空' });
    }
    db.query('DELETE FROM articles WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('删除文章失败:', err);
            return res.status(500).json({ error: '删除文章失败' });
        }
        res.json({ success: true });
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

// 医生开放聊天室接口
// 请求体应包含 { doctorId: "4" }
// 医生开启聊天室接口
app.post('/api/openChat', (req, res) => {
    const { doctorId } = req.body;
    if (!doctorId) {
        return res.status(400).json({ error: '缺少 doctorId 参数' });
    }
    const sql = 'UPDATE users SET chat_status = "open" WHERE id = ? AND role = "心理医生"';
    db.query(sql, [doctorId], (err, result) => {
        if (err) {
            console.error('开启聊天室失败:', err);
            return res.status(500).json({ error: '开启聊天室失败' });
        }
        if (result.affectedRows === 0) {
            return res.status(400).json({ error: '医生不存在或无权限' });
        }
        // 可打印日志
        console.log(`医生 ${doctorId} 开放了聊天室`);
        res.json({ success: true });
    });
});


// 检查指定医生聊天室是否已开放
// 请求参数：doctorId
app.get('/api/checkChatroom', (req, res) => {
    const { doctorId } = req.query;
    if (!doctorId) {
        return res.status(400).json({ error: '缺少 doctorId 参数' });
    }
    const chatroomOpen = activeChatrooms[doctorId] || false;
    return res.json({ chatroomOpen });
});

// 更新医生聊天室状态为 closed 的接口
// 更新医生聊天室状态为 closed 的接口
app.post('/api/closeChat', (req, res) => {
    const { doctorId } = req.body;
    if (!doctorId) {
        return res.status(400).json({ error: '缺少 doctorId 参数' });
    }
    const sql = 'UPDATE users SET chat_status = "closed" WHERE id = ?';
    db.query(sql, [doctorId], (err, result) => {
        if (err) {
            console.error('更新聊天室状态失败:', err);
            return res.status(500).json({ error: '更新聊天室状态失败' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '医生未找到' });
        }
        res.json({ success: true });
    });
});




// 获取所有医生信息（从 users 表中筛选角色为“心理医生”的记录）
app.get('/api/doctors', (req, res) => {
    if (req.query.id) {
        const sql = "SELECT id, username, title, expertise, working_years, review_count FROM users WHERE role = '心理医生' AND id = ?";
        db.query(sql, [req.query.id], (err, results) => {
            if (err) {
                console.error('查询医生详情错误:', err);
                return res.status(500).json({ error: '无法获取医生信息' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: '医生未找到' });
            }
            res.json(results[0]);
        });
    } else {
        const sql = "SELECT id, username, title, expertise, working_years, review_count FROM users WHERE role = '心理医生'";
        db.query(sql, (err, results) => {
            if (err) {
                console.error('查询医生列表错误:', err);
                return res.status(500).json({ error: '无法获取医生列表' });
            }
            res.json(results);
        });
    }
});


app.post('/api/appointments', (req, res) => {
    const { userId, doctorId, date, timeSlot, profile } = req.body;

    // 验证必填字段
    if (!userId || !doctorId || !date || !timeSlot || !profile) {
        return res.status(400).json({ error: '缺少必填参数' });
    }

    // 计算 end_time：假设 timeSlot 格式为 "HH:MM-HH:MM"
    let endTime = null;
    const parts = timeSlot.split('-');
    if (parts.length === 2) {
        endTime = parts[1].trim();
        // 如果时间格式只有小时和分钟，则补上秒数 ":00"
        if (endTime.split(':').length === 2) {
            endTime += ":00";
        }
    } else {
        return res.status(400).json({ error: '预约时段格式错误' });
    }

    // 1. 检查该医生在指定日期和时段的预约数量是否已满（>= 3）
    const checkDoctorSQL = 'SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = ? AND date = ? AND time_slot = ?';
    db.query(checkDoctorSQL, [doctorId, date, timeSlot], (err, doctorResult) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: '查询医生预约失败' });
        }
        if (doctorResult[0].count >= 3) {
            return res.status(400).json({ error: '该时段医生预约已满' });
        }

        // 2. 检查该用户在同一时段的预约数量是否达到上限（示例：同一时段最多 2 次预约）
        const checkUserSQL = 'SELECT COUNT(*) AS count FROM appointments WHERE user_id = ? AND date = ? AND time_slot = ?';
        db.query(checkUserSQL, [userId, date, timeSlot], (err, userResult) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: '查询用户预约失败' });
            }
            if (userResult[0].count >= 2) {
                return res.status(400).json({ error: '您在该时段预约次数已达上限' });
            }

            // 3. 检查用户24小时内预约总次数（示例：最多3次）
            const check24hSQL = 'SELECT COUNT(*) AS count FROM appointments WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)';
            db.query(check24hSQL, [userId], (err, countResult) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: '查询24小时预约失败' });
                }
                if (countResult[0].count >= 3) {
                    return res.status(400).json({ error: '您在24小时内预约次数已达上限' });
                }

                // 4. 所有校验通过，插入预约记录（包含 end_time 字段）
                const insertSQL = 'INSERT INTO appointments (user_id, doctor_id, date, time_slot, end_time) VALUES (?,?,?,?,?)';
                db.query(insertSQL, [userId, doctorId, date, timeSlot, endTime], (err, result) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: '预约插入失败' });
                    }

                    // 5. 保存或更新用户心理档案（使用 REPLACE INTO）
                    // 对 birthday 进行格式转换，只保留 "YYYY-MM-DD" 部分
                    const formattedBirthday = profile.birthday ? profile.birthday.split('T')[0] : null;

                    const profileValues = [
                        userId,
                        profile.name && profile.name.trim() ? profile.name.trim() : null,
                        profile.gender && profile.gender.trim() ? profile.gender.trim() : null,
                        formattedBirthday,  // 使用转换后的生日格式
                        profile.phone && profile.phone.trim() ? profile.phone.trim() : null,
                        profile.email && profile.email.trim() ? profile.email.trim() : null,
                        profile.consultHistory && profile.consultHistory.trim() ? profile.consultHistory.trim() : null,
                        profile.medicalHistory && profile.medicalHistory.trim() ? profile.medicalHistory.trim() : null
                    ];

                    const profileSQL = `REPLACE INTO user_profiles 
    (user_id, name, gender, birthday, phone, email, consult_history, medical_history)
    VALUES (?,?,?,?,?,?,?,?)`;
                    db.query(profileSQL, profileValues, (err, result2) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ error: '心理档案保存失败' });
                        }
                        return res.json({ success: true });
                    });
                });
            });
        });
    });
});


// GET /api/doctorAppointments?doctorId=xxx&date=yyyy-mm-dd
// 用于预约页面查询某天该医生的预约记录
app.get('/api/doctorAppointmentsByDate', (req, res) => {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
        return res.status(400).json({ error: '缺少 doctorId 或 date 参数' });
    }
    const sql = 'SELECT time_slot FROM appointments WHERE doctor_id = ? AND date = ?';
    db.query(sql, [doctorId, date], (err, results) => {
        if (err) {
            console.error('查询预约记录失败:', err);
            return res.status(500).json({ error: '查询预约记录失败' });
        }
        res.json(results);
    });
});

// 获取当前用户的预约记录，并更新已过期的记录状态（精确到小时和分钟）
app.get('/api/appointments', (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: '缺少 userId 参数' });
    }

    // 更新已过期的预约状态：如果当前时间大于预约日期和结束时间组合，且状态为“待处理”，则更新为“已过期”
    const updateSql = `
    UPDATE appointments 
    SET status = "已过期" 
    WHERE CONCAT(date, ' ', end_time) < NOW() 
      AND status = "待处理" 
      AND user_id = ?
  `;
    db.query(updateSql, [userId], (updateErr, updateResult) => {
        if (updateErr) {
            console.error('更新预约状态失败:', updateErr);
            // 这里可以选择继续查询预约记录，或直接返回错误
            // 为了不影响查询，我们先记录错误，然后继续执行查询
        }

        // 查询当前用户的预约记录，并关联医生姓名
        const sql = `
      SELECT a.*, u.username AS doctorName 
      FROM appointments a
      LEFT JOIN users u ON a.doctor_id = u.id
      WHERE a.user_id = ?
      ORDER BY a.date DESC, end_time DESC
    `;
        db.query(sql, [userId], (err, results) => {
            if (err) {
                console.error('查询预约记录失败:', err);
                return res.status(500).json({ error: '查询预约记录失败' });
            }
            // 返回结果应该为数组
            res.json(results);
        });
    });
});

// 取消预约接口：删除指定预约记录
app.delete('/api/appointments/:id', (req, res) => {
    const appointmentId = req.params.id;
    if (!appointmentId) {
        return res.status(400).json({ error: '缺少预约ID' });
    }

    // 你可以在此处增加权限检查，例如判断当前用户是否有权取消该预约

    const sql = 'DELETE FROM appointments WHERE id = ?';
    db.query(sql, [appointmentId], (err, result) => {
        if (err) {
            console.error('删除预约失败:', err);
            return res.status(500).json({ error: '删除预约失败' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '未找到预约记录' });
        }
        res.json({ success: true });
    });
});

//医生端的处理预约
// 获取当前医生的待处理预约记录，按创建时间排序
app.get('/api/doctorAppointments', (req, res) => {
    const doctorId = req.query.doctorId;
    if (!doctorId) {
        return res.status(400).json({ error: '缺少 doctorId 参数' });
    }
    const sql = `
      SELECT 
        a.id, 
        a.user_id, 
        a.doctor_id, 
        DATE_FORMAT(a.date, '%Y-%m-%d') AS date, 
        a.time_slot, 
        a.end_time, 
        a.status, 
        a.created_at,
        u.username AS userName,
        MAX(p.name) AS profileName,
        MAX(p.gender) AS gender,
        DATE_FORMAT(MAX(p.birthday), '%Y-%m-%d') AS birthday,
        MAX(p.phone) AS phone,
        MAX(p.email) AS email,
        MAX(p.consult_history) AS consult_history,
        MAX(p.medical_history) AS medical_history
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN user_profiles p ON a.user_id = p.user_id
      WHERE a.doctor_id = ? AND a.status = '待处理'
      GROUP BY a.id, a.user_id, a.doctor_id, a.date, a.time_slot, a.end_time, a.status, a.created_at, u.username
      ORDER BY a.created_at ASC
    `;
    db.query(sql, [doctorId], (err, results) => {
        if (err) {
            console.error('查询医生预约记录失败:', err);
            return res.status(500).json({ error: '查询医生预约记录失败' });
        }
        res.json(results);
    });
});



//根据用户 ID 查询用户档案
//这样前端可以调用 /api/userProfile?userId=xxx 判断是否存在档案数据。
app.get('/api/userProfile', (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: '缺少 userId 参数' });
    }
    const sql = 'SELECT * FROM user_profiles WHERE user_id = ?';
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('查询用户档案失败:', err);
            return res.status(500).json({ error: '查询用户档案失败' });
        }
        if (results.length === 0) {
            // 没有档案记录返回空数组
            return res.json([]);
        }
        res.json(results[0]);
    });
});

// 医生端：开启聊天室（开始处理咨询申请）
// 请求方式：POST
// 请求体中必须包含：doctorId
app.post('/api/startChat', (req, res) => {
    const { doctorId } = req.body;
    if (!doctorId) {
        return res.status(400).json({ error: '缺少 doctorId 参数' });
    }
    // 更新用户表中该医生的 chat_status 字段
    const sql = 'UPDATE users SET chat_status = "open" WHERE id = ? AND role = "心理医生"';
    db.query(sql, [doctorId], (err, result) => {
        if (err) {
            console.error('开启聊天室失败:', err);
            return res.status(500).json({ error: '开启聊天室失败' });
        }
        if (result.affectedRows === 0) {
            return res.status(400).json({ error: '未找到医生记录或无权限' });
        }
        console.log(`医生 ${doctorId} 开放了聊天室`);
        res.json({ success: true });
    });
});

// 普通用户或其他端：检查指定医生的聊天室状态
// 请求方式：GET
// 请求参数：doctorId
app.get('/api/checkChatStatus', (req, res) => {
    const { doctorId } = req.query;
    if (!doctorId) {
        return res.status(400).json({ error: '缺少 doctorId 参数' });
    }
    const sql = 'SELECT chat_status FROM users WHERE id = ? AND role = "心理医生"';
    db.query(sql, [doctorId], (err, results) => {
        if (err) {
            console.error('检查聊天室状态失败:', err);
            return res.status(500).json({ error: '检查聊天室状态失败' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '医生未找到' });
        }
        res.json({ chatStatus: results[0].chat_status });
    });
});

// 新增接口：医生开启聊天室
app.post('/api/openChat', (req, res) => {
    const { doctorId } = req.body;
    if (!doctorId) {
        return res.status(400).json({ error: '缺少 doctorId 参数' });
    }
    // 标记该医生的聊天室为已开启
    openChats[doctorId] = true;
    console.log(`医生 ${doctorId} 开放了聊天室`);
    return res.json({ success: true });
});

// 新增：关闭聊天室接口
app.post('/api/closeChat', (req, res) => {
    const { doctorId } = req.body;
    if (!doctorId) {
        return res.status(400).json({ error: '缺少 doctorId 参数' });
    }
    // 将该医生的聊天室状态设为 false 或删除记录
    openChats[doctorId] = false;
    console.log(`医生 ${doctorId} 关闭了聊天室`);
    return res.json({ success: true });
});

// 检查聊天室状态接口（供普通用户调用）
app.get('/api/checkChatStatus', (req, res) => {
    const doctorId = req.query.doctorId;
    if (!doctorId) {
        return res.status(400).json({ error: '缺少 doctorId 参数' });
    }
    const chatStatus = openChats[doctorId] ? "open" : "closed";
    res.json({ chatStatus });
});

// 获取医生聊天室状态接口
app.get('/api/getChatStatus', (req, res) => {
    const doctorId = req.query.doctorId;
    if (!doctorId) {
        return res.status(400).json({ error: '缺少 doctorId 参数' });
    }
    // 假设在 users 表中存储了聊天室状态，字段名为 chat_status
    const sql = 'SELECT chat_status FROM users WHERE id = ?';
    db.query(sql, [doctorId], (err, results) => {
        if (err) {
            console.error('查询聊天室状态失败:', err);
            return res.status(500).json({ error: '查询聊天室状态失败' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '医生未找到' });
        }
        res.json({ chat_status: results[0].chat_status });
    });
});

// 启动服务器
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`服务器已启动，访问网址：http://localhost:${PORT}`);
});


const WebSocket = require('ws');

// 连接 C++ 聊天服务（确保端口和地址正确）
//确保端口号 9000 与 C++ 聊天服务监听的端口一致，并且网络配置（如防火墙）允许通过该端口通信。
const cppWs = new WebSocket('ws://127.0.0.1:9000');
// 建立 Node.js 自己的 WebSocket 服务器供前端连接
const wss = new WebSocket.Server({ port: 8080 });

cppWs.on('open', () => {
    console.log('已连接 C++ 聊天服务');
});

// 当从 C++ 服务收到消息，转发给所有连接 Node.js 的客户端
cppWs.on('message', (data) => {
    // 将 data 转换为字符串
    const textMessage = data.toString();
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(textMessage);
        }
    });
});


// 当前端发来消息，通过 Node.js 中转发送到 C++ 服务
wss.on('connection', (client) => {
    client.on('message', (message) => {
        cppWs.send(message);
    });
});

console.log("Node.js WebSocket 中转服务器已启动，监听端口 8080");