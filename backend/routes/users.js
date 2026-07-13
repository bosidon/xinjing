const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// 获取用户测评历史
router.get('/history', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const history = await db.query(`
            SELECT 
                ar.id as result_id,
                ar.assessment_id,
                a.name as assessment_name,
                a.code as assessment_code,
                ar.start_time,
                ar.end_time,
                ar.total_score,
                ar.result_summary,
                ar.is_completed
            FROM assessment_results ar
            JOIN assessments a ON ar.assessment_id = a.id
            WHERE ar.user_id = ?
            ORDER BY ar.start_time DESC
            LIMIT 50
        `, [userId]);
        
        res.json({
            success: true,
            data: history,
            count: history.length
        });
    } catch (error) {
        next(error);
    }
});

// 获取用户信息
router.get('/me', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const user = await db.get(`
            SELECT 
                id, username, email, full_name, gender, age, 
                created_at, updated_at
            FROM users 
            WHERE id = ?
        `, [userId]);
        
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

// 更新用户信息
router.patch('/me', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { full_name, gender, age } = req.body;
        
        // 构建更新字段
        const updates = [];
        const params = [];
        
        if (full_name !== undefined) {
            updates.push('full_name = ?');
            params.push(full_name);
        }
        
        if (gender !== undefined) {
            updates.push('gender = ?');
            params.push(gender);
        }
        
        if (age !== undefined) {
            updates.push('age = ?');
            params.push(age);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: '没有提供更新字段'
            });
        }
        
        // 添加更新时间
        updates.push('updated_at = CURRENT_TIMESTAMP');
        
        // 添加用户ID参数
        params.push(userId);
        
        const sql = `
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE id = ?
        `;
        
        await db.run(sql, params);
        
        // 获取更新后的用户信息
        const updatedUser = await db.get(`
            SELECT id, username, email, full_name, gender, age, 
                   created_at, updated_at
            FROM users 
            WHERE id = ?
        `, [userId]);
        
        res.json({
            success: true,
            data: updatedUser,
            message: '用户信息更新成功'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;