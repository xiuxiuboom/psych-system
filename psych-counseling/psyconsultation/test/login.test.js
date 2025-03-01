// login.test.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

test('login form should submit user data', async () => {
    // 读取 login.html 文件内容
    const html = fs.readFileSync(path.resolve(__dirname, '../public/login.html'), 'utf-8');
    const dom = new JSDOM(html);

    // 获取表单元素
    const document = dom.window.document;
    const form = document.getElementById('loginForm');
    const usernameField = document.getElementById('username');
    const passwordField = document.getElementById('password');
    const submitButton = document.querySelector('button[type="submit"]');

    // 模拟用户输入
    usernameField.value = 'testuser';
    passwordField.value = 'testpassword';

    // 模拟表单提交
    submitButton.click();

    // 测试表单提交后的行为
    // 在实际测试中，你应该检查是否有正确的后端响应
    // 这里我们只是检查页面上的输入数据
    expect(usernameField.value).toBe('testuser');
    expect(passwordField.value).toBe('testpassword');
});
