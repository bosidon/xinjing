// 用户数据模型
const database = require('../db');
const bcrypt = require('bcrypt');

class User {
    // 创建用户
    static async create(userData) {
        const { username, email, password } = userData;
        
        // 验证输入
        if (!username || !email || !password) {
            throw new Error('用户名、邮箱和密码为必填项');
        }
        
        if (password.length < 6) {
            throw new Error('密码至少需要6位');
        }
        
        // 检查用户是否已存在
        const existingUser = await this.findByEmail(email);
        if (existingUser) {
            throw new Error('邮箱已被注册');
        }
        
        const existingUsername = await this.findByUsername(username);
        if (existingUsername) {
            throw new Error('用户名已被使用');
        }
        
        // 加密密码
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // 插入用户
        const sql = `
            INSERT INTO users (username, email, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `;
        
        const result = await database.run(sql, [username, email, passwordHash]);
        
        return {
            id: result.lastID,
            username,
            email,
            created_at: new Date().toISOString()
        };
    }
    
    // 通过ID查找用户
    static async findById(id) {
        const sql = 'SELECT id, username, email, role, created_at FROM users WHERE id = ?';
        const user = await database.get(sql, [id]);
        
        if (user) {
            return {
                ...user,
                created_at: user.created_at ? new Date(user.created_at).toISOString() : null
            };
        }
        return null;
    }
    
    // 通过邮箱查找用户
    static async findByEmail(email) {
        const sql = 'SELECT id, username, email, password_hash, created_at FROM users WHERE email = ?';
        const user = await database.get(sql, [email]);
        
        if (user) {
            return {
                ...user,
                created_at: user.created_at ? new Date(user.created_at).toISOString() : null
            };
        }
        return null;
    }
    
    // 通过用户名查找用户
    static async findByUsername(username) {
        const sql = 'SELECT id, username, email, created_at FROM users WHERE username = ?';
        const user = await database.get(sql, [username]);
        
        if (user) {
            return {
                ...user,
                created_at: user.created_at ? new Date(user.created_at).toISOString() : null
            };
        }
        return null;
    }
    
    // 验证用户密码
    static async verifyPassword(email, password) {
        const user = await this.findByEmail(email);
        if (!user) {
            return null;
        }
        
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return null;
        }
        
        // 返回用户信息（不包含密码哈希）
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at
        };
    }
    
    // 更新用户信息
    static async update(id, updateData) {
        const allowedFields = ['username', 'email'];
        const updates = [];
        const values = [];
        
        // 构建更新语句
        for (const [field, value] of Object.entries(updateData)) {
            if (allowedFields.includes(field) && value !== undefined) {
                updates.push(`${field} = ?`);
                values.push(value);
            }
        }
        
        if (updates.length === 0) {
            throw new Error('没有可更新的字段');
        }
        
        // 添加更新时间
        updates.push('updated_at = datetime("now")');
        
        // 添加ID到值列表
        values.push(id);
        
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        
        try {
            await database.run(sql, values);
            return await this.findById(id);
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                if (error.message.includes('email')) {
                    throw new Error('邮箱已被使用');
                } else if (error.message.includes('username')) {
                    throw new Error('用户名已被使用');
                }
            }
            throw error;
        }
    }
    
    // 更新密码
    static async updatePassword(id, oldPassword, newPassword) {
        // 验证新密码
        if (!newPassword || newPassword.length < 6) {
            throw new Error('新密码至少需要6位');
        }
        
        // 获取用户
        const user = await database.get(
            'SELECT id, password_hash FROM users WHERE id = ?',
            [id]
        );
        
        if (!user) {
            throw new Error('用户不存在');
        }
        
        // 验证旧密码
        const isValid = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isValid) {
            throw new Error('旧密码不正确');
        }
        
        // 加密新密码
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        
        // 更新密码
        const sql = `
            UPDATE users 
            SET password_hash = ?, updated_at = datetime('now')
            WHERE id = ?
        `;
        
        await database.run(sql, [newPasswordHash, id]);
        return true;
    }
    
    // 删除用户
    static async delete(id) {
        // 开始事务
        return database.transaction(async (db) => {
            // 删除用户的测评结果
            await db.run('DELETE FROM assessment_results WHERE user_id = ?', [id]);
            
            // 删除用户
            const result = await db.run('DELETE FROM users WHERE id = ?', [id]);
            
            if (result.changes === 0) {
                throw new Error('用户不存在');
            }
            
            return { deleted: true, userId: id };
        });
    }
    
    // 获取所有用户（分页）
    static async getAll(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        
        const sql = `
            SELECT id, username, email, created_at 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        const countSql = 'SELECT COUNT(*) as total FROM users';
        
        const [users, countResult] = await Promise.all([
            database.all(sql, [limit, offset]),
            database.get(countSql)
        ]);
        
        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);
        
        return {
            users: users.map(user => ({
                ...user,
                created_at: user.created_at ? new Date(user.created_at).toISOString() : null
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }
    
    // 搜索用户
    static async search(query, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const searchTerm = `%${query}%`;
        
        const sql = `
            SELECT id, username, email, created_at 
            FROM users 
            WHERE username LIKE ? OR email LIKE ?
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        const countSql = `
            SELECT COUNT(*) as total 
            FROM users 
            WHERE username LIKE ? OR email LIKE ?
        `;
        
        const [users, countResult] = await Promise.all([
            database.all(sql, [searchTerm, searchTerm, limit, offset]),
            database.get(countSql, [searchTerm, searchTerm])
        ]);
        
        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);
        
        return {
            users: users.map(user => ({
                ...user,
                created_at: user.created_at ? new Date(user.created_at).toISOString() : null
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }
    
    // 获取用户统计信息
    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN DATE(created_at) = DATE('now') THEN 1 END) as today_new_users,
                COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-7 days') THEN 1 END) as weekly_new_users
            FROM users
        `;
        
        return await database.get(sql);
    }
}

module.exports = User;