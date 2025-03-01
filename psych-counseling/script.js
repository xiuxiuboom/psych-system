//处理用户交互并与后端通信
//@charset"UTF-8";
// 登录逻辑
document.getElementById('loginForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    // TODO: 发送登录请求到后端（例如使用 fetch）
    console.log('登录:', username, password);
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const response = await fetch('/api/register', {
        method: 'POST',
        body: formData
    });
    const result = await response.json();
    if (result.success) {
        alert('注册成功！');
        window.location.href = 'login.htm';
    } else {
        alert('注册失败: ' + result.error);
    }
});

// 聊天室逻辑
const ws = new WebSocket('ws://localhost:8080');
ws.onopen = () => console.log('WebSocket 连接成功');
ws.onmessage = (event) => {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.innerHTML += `<p>${event.data}</p >`;
    chatWindow.scrollTop = chatWindow.scrollHeight; // 自动滚动到底部
};
document.getElementById('sendButton')?.addEventListener('click', function () {
    const message = document.getElementById('messageInput').value;
    ws.send(message);
    document.getElementById('messageInput').value = ''; // 清空输入框
});

// 文章列表逻辑
const articleList = document.getElementById('articleList');
if (articleList) {
    // 模拟数据，实际开发中需要从后端获取
    const articles = ['文章1', '文章2', '文章3'];
    articles.forEach(article => {
        const li = document.createElement('li');
        li.textContent = article;
        articleList.appendChild(li);
    });
}