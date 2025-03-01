//�����û�����������ͨ��
//@charset"UTF-8";
// ��¼�߼�
document.getElementById('loginForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    // TODO: ���͵�¼���󵽺�ˣ�����ʹ�� fetch��
    console.log('��¼:', username, password);
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
        alert('ע��ɹ���');
        window.location.href = 'login.htm';
    } else {
        alert('ע��ʧ��: ' + result.error);
    }
});

// �������߼�
const ws = new WebSocket('ws://localhost:8080');
ws.onopen = () => console.log('WebSocket ���ӳɹ�');
ws.onmessage = (event) => {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.innerHTML += `<p>${event.data}</p >`;
    chatWindow.scrollTop = chatWindow.scrollHeight; // �Զ��������ײ�
};
document.getElementById('sendButton')?.addEventListener('click', function () {
    const message = document.getElementById('messageInput').value;
    ws.send(message);
    document.getElementById('messageInput').value = ''; // ��������
});

// �����б��߼�
const articleList = document.getElementById('articleList');
if (articleList) {
    // ģ�����ݣ�ʵ�ʿ�������Ҫ�Ӻ�˻�ȡ
    const articles = ['����1', '����2', '����3'];
    articles.forEach(article => {
        const li = document.createElement('li');
        li.textContent = article;
        articleList.appendChild(li);
    });
}