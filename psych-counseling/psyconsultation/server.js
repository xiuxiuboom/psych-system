// JavaScript source code
const express = require('express');
const mysql = require('mysql2');
const socketIo = require('socket.io');
const http = require('http');
const bcrypt = require('bcrypt');  // ���ڼ��ܺͱȽ�����

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ���ӵ� MySQL ���ݿ�
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       // ��� MySQL �û���
    password: '123456',       // ��� MySQL ����
    database: 'psyconsultation'  // ������ݿ���
});

db.connect((err) => {
    if (err) throw err;
    console.log('���ݿ����ӳɹ�');
});
// ���þ�̬�ļ��У��ṩǰ���ļ�
app.use(express.static('public'));

// ���ý��� POST ����� JSON ���ݣ������ý��մ�С����
app.use(express.json({ limit: '10mb' }));

// ��ҳ·�ɣ���ᷢ�� HTML �ļ���Content-Type ���Զ�����Ϊ text/html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// ��� /api ·��������Ӧͷ��ȷ������ API ��Ӧ��ʹ�� UTF-8 ����
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});


// ��¼�ӿ�
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // ��ѯ���ݿ��ȡ�û����ͼ��ܺ������
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('���ݿ��ѯ����:', err);
            return res.status(500).json({ error: '���ݿ��ѯʧ��' });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: '�û���������' });
        }

        const user = results[0];

        // ʹ�� bcrypt �ȶ�����
        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                console.error('����ȶ�ʧ��:', err);
                return res.status(500).json({ error: '����ȶ�ʧ��' });
            }
            if (result) {
                res.json({ success: true, user: user });
            } else {
                res.status(400).json({ error: '�������' });
            }
        });
    });
});

// �û�ע��ӿ�
app.post('/api/register', (req, res) => {
    const { username, password, email } = req.body;

    // ��������
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ error: '�������ʧ��' });
        }

        // �����ܺ������������ݿ�
        db.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
            [username, hashedPassword, email], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: 'ע��ʧ��' });
                }
                return res.json({ success: true });
            });
    });
});

// ģ��������¼����
const quotes = [
    "ÿ�춼���µĿ�ʼ�����ֻ����������ֹۣ�",
    "�����е�ÿ����ս����һ�γɳ��Ļ��ᡣ",
    "�����Լ������Ŭ��������ı䡣",
    "��ҪΪ��������Ѹе����٣�δ������ϣ����",
    "��������̬�ǳɹ���һ�롣",
];

// ��ȡÿ���������¼,���һ���µ�·�ɣ�����һ�������������¼��
app.get('/api/quote', (req, res) => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    res.json({ quote: randomQuote });
});

// ��������ǽ
let messages = [];  // �洢���Ե�����

// �ϲ� WebSocket ���Ӵ����߼�
io.on('connection', (socket) => {
    console.log('�û�����');

    // ������ʷ��Ϣ�������ӵ��û�
    socket.emit('previousMessages', messages);

    // �����û����͵�����
    socket.on('sendMessage', (message) => {
        messages.push(message);
        io.emit('newMessage', message);  // �㲥�������û�
    });

    // ԭ�е�ʵʱ�����߼�
    socket.on('message', (msg) => {
        io.emit('message', msg);  // �㲥��Ϣ���������ӵ��û�
    });
});

// ģ�����������
const articles = [
    { title: "��α���������", content: "������������������Ҫ��һ����..." },
    { title: "ѹ��������", content: "ѧϰ��ι���ѹ���ܰ����㱣���侲..." },
    { title: "������̬����Ҫ��", content: "������̬�ܹ�������������..." },
];

// ��ȡ�����б�
app.get('/api/articles', (req, res) => {
    res.json(articles);
});

// ����������
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`��������������������ַ��http://localhost:${PORT}`);
});