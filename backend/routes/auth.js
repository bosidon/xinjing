const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 用户注册
router.post('/register', async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        
        // 验证输入
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: '请提供用户名、邮箱和密码'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: '密码至少需要6位'
            });
        }
        
        // 检查用户是否已存在
        const existingUser = await db.get(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: '用户名或邮箱已存在'
            });
        }
        
        // 加密密码
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        // 创建用户
        const result = await db.run(
            'INSERT INTO users (username, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [username, email, passwordHash]
        );
        
        res.status(201).json({
            success: true,
            data: {
                message: '注册成功',
                userId: result.lastID
            }
        });
    } catch (error) {
        next(error);
    }
});

// 用户登录
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        // 验证输入
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: '请提供邮箱和密码'
            });
        }
        
        // 查找用户
        const user = await db.get(
            'SELECT id, username, email, password_hash FROM users WHERE email = ?',
            [email]
        );
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: '邮箱或密码错误'
            });
        }
        
        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: '邮箱或密码错误'
            });
        }
        
        // 生成JWT令牌
        const token = jwt.sign(
            { 
                id: user.id,
                username: user.username,
                email: user.email
            },
            process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            { expiresIn: '7d' }
        );
        
        // 移除密码哈希
        delete user.password_hash;
        
        res.json({
            success: true,
            data: {
                token,
                user
            }
        });
    } catch (error) {
        next(error);
    }
});

// 获取当前用户信息
router.get('/me', async (req, res, next) => {
    try {
        // 从JWT中间件获取用户ID
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: '未认证'
            });
        }
        
        const user = await db.get(
            'SELECT id, username, email, full_name, gender, age, created_at FROM users WHERE id = ?',
            [userId]
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }
        
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;