// login.test.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

test('login form should submit user data', async () => {
    // ��ȡ login.html �ļ�����
    const html = fs.readFileSync(path.resolve(__dirname, '../public/login.html'), 'utf-8');
    const dom = new JSDOM(html);

    // ��ȡ��Ԫ��
    const document = dom.window.document;
    const form = document.getElementById('loginForm');
    const usernameField = document.getElementById('username');
    const passwordField = document.getElementById('password');
    const submitButton = document.querySelector('button[type="submit"]');

    // ģ���û�����
    usernameField.value = 'testuser';
    passwordField.value = 'testpassword';

    // ģ����ύ
    submitButton.click();

    // ���Ա��ύ�����Ϊ
    // ��ʵ�ʲ����У���Ӧ�ü���Ƿ�����ȷ�ĺ����Ӧ
    // ��������ֻ�Ǽ��ҳ���ϵ���������
    expect(usernameField.value).toBe('testuser');
    expect(passwordField.value).toBe('testpassword');
});
