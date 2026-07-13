// 测评数据模型
const database = require('../db');

class Assessment {
    // 创建测评
    static async create(assessmentData) {
        const { name, description, category, estimated_time, questions_count } = assessmentData;
        
        // 验证输入
        if (!name) {
            throw new Error('测评名称为必填项');
        }
        
        const sql = `
            INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `;
        
        const result = await database.run(sql, [
            name,
            description || '',
            category || '通用',
            estimated_time || 10,
            questions_count || 0
        ]);
        
        return {
            id: result.lastID,
            name,
            description: description || '',
            category: category || '通用',
            estimated_time: estimated_time || 10,
            questions_count: questions_count || 0,
            created_at: new Date().toISOString()
        };
    }
    
    // 通过ID查找测评
    static async findById(id) {
        const sql = `
            SELECT 
                id, name, description, category, estimated_time, questions_count, created_at,
                (SELECT COUNT(*) FROM questions WHERE assessment_id = assessments.id) as actual_questions_count
            FROM assessments 
            WHERE id = ?
        `;
        
        const assessment = await database.get(sql, [id]);
        
        if (assessment) {
            return {
                ...assessment,
                created_at: assessment.created_at ? new Date(assessment.created_at).toISOString() : null,
                questions_count: assessment.actual_questions_count || assessment.questions_count
            };
        }
        return null;
    }
    
    // 获取所有测评
    static async getAll() {
        const sql = `
            SELECT 
                id, name, description, category, estimated_time, questions_count, created_at,
                (SELECT COUNT(*) FROM questions WHERE assessment_id = assessments.id) as actual_questions_count
            FROM assessments 
            ORDER BY created_at DESC
        `;
        
        const assessments = await database.all(sql);
        
        return assessments.map(assessment => ({
            ...assessment,
            created_at: assessment.created_at ? new Date(assessment.created_at).toISOString() : null,
            questions_count: assessment.actual_questions_count || assessment.questions_count
        }));
    }
    
    // 通过分类获取测评
    static async findByCategory(category) {
        const sql = `
            SELECT 
                id, name, description, category, estimated_time, questions_count, created_at,
                (SELECT COUNT(*) FROM questions WHERE assessment_id = assessments.id) as actual_questions_count
            FROM assessments 
            WHERE category = ?
            ORDER BY created_at DESC
        `;
        
        const assessments = await database.all(sql, [category]);
        
        return assessments.map(assessment => ({
            ...assessment,
            created_at: assessment.created_at ? new Date(assessment.created_at).toISOString() : null,
            questions_count: assessment.actual_questions_count || assessment.questions_count
        }));
    }
    
    // 搜索测评
    static async search(query) {
        const searchTerm = `%${query}%`;
        
        const sql = `
            SELECT 
                id, name, description, category, estimated_time, questions_count, created_at,
                (SELECT COUNT(*) FROM questions WHERE assessment_id = assessments.id) as actual_questions_count
            FROM assessments 
            WHERE name LIKE ? OR description LIKE ? OR category LIKE ?
            ORDER BY created_at DESC
        `;
        
        const assessments = await database.all(sql, [searchTerm, searchTerm, searchTerm]);
        
        return assessments.map(assessment => ({
            ...assessment,
            created_at: assessment.created_at ? new Date(assessment.created_at).toISOString() : null,
            questions_count: assessment.actual_questions_count || assessment.questions_count
        }));
    }
    
    // 更新测评
    static async update(id, updateData) {
        const allowedFields = ['name', 'description', 'category', 'estimated_time', 'questions_count'];
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
        
        // 添加ID到值列表
        values.push(id);
        
        const sql = `UPDATE assessments SET ${updates.join(', ')} WHERE id = ?`;
        
        await database.run(sql, values);
        return await this.findById(id);
    }
    
    // 删除测评
    static async delete(id) {
        // 开始事务
        return database.transaction(async (db) => {
            // 检查是否有测评结果
            const resultCount = await db.get(
                'SELECT COUNT(*) as count FROM assessment_results WHERE assessment_id = ?',
                [id]
            );
            
            if (resultCount.count > 0) {
                throw new Error('该测评已有测评结果，无法删除');
            }
            
            // 删除题目
            await db.run('DELETE FROM questions WHERE assessment_id = ?', [id]);
            
            // 删除测评
            const result = await db.run('DELETE FROM assessments WHERE id = ?', [id]);
            
            if (result.changes === 0) {
                throw new Error('测评不存在');
            }
            
            return { deleted: true, assessmentId: id };
        });
    }
    
    // 获取测评统计信息
    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_assessments,
                COUNT(DISTINCT category) as total_categories,
                SUM(questions_count) as total_questions,
                AVG(estimated_time) as avg_time
            FROM assessments
        `;
        
        return await database.get(sql);
    }
    
    // 获取分类列表
    static async getCategories() {
        const sql = `
            SELECT DISTINCT category, COUNT(*) as count
            FROM assessments
            GROUP BY category
            ORDER BY count DESC
        `;
        
        return await database.all(sql);
    }
    
    // 获取热门测评（按测评结果数量排序）
    static async getPopular(limit = 5) {
        const sql = `
            SELECT 
                a.id, a.name, a.description, a.category, a.estimated_time, a.questions_count,
                COUNT(ar.id) as result_count
            FROM assessments a
            LEFT JOIN assessment_results ar ON a.id = ar.assessment_id
            GROUP BY a.id
            ORDER BY result_count DESC, a.created_at DESC
            LIMIT ?
        `;
        
        const assessments = await database.all(sql, [limit]);
        
        return assessments.map(assessment => ({
            id: assessment.id,
            name: assessment.name,
            description: assessment.description,
            category: assessment.category,
            estimated_time: assessment.estimated_time,
            questions_count: assessment.questions_count,
            result_count: assessment.result_count
        }));
    }
    
    // 获取最新测评
    static async getLatest(limit = 5) {
        const sql = `
            SELECT 
                id, name, description, category, estimated_time, questions_count, created_at
            FROM assessments
            ORDER BY created_at DESC
            LIMIT ?
        `;
        
        const assessments = await database.all(sql, [limit]);
        
        return assessments.map(assessment => ({
            ...assessment,
            created_at: assessment.created_at ? new Date(assessment.created_at).toISOString() : null
        }));
    }
    
    // 批量创建测评
    static async bulkCreate(assessmentsData) {
        return database.transaction(async (db) => {
            const results = [];
            
            for (const assessmentData of assessmentsData) {
                const { name, description, category, estimated_time, questions_count } = assessmentData;
                
                if (!name) {
                    throw new Error('测评名称为必填项');
                }
                
                const sql = `
                    INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                `;
                
                const result = await db.run(sql, [
                    name,
                    description || '',
                    category || '通用',
                    estimated_time || 10,
                    questions_count || 0
                ]);
                
                results.push({
                    id: result.lastID,
                    name,
                    description: description || '',
                    category: category || '通用',
                    estimated_time: estimated_time || 10,
                    questions_count: questions_count || 0
                });
            }
            
            return results;
        });
    }
}

module.exports = Assessment;