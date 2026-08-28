// 初始数据库架构迁移
const database = require('../db');

async function runMigration() {
    console.log('🚀 开始数据库迁移: 初始架构创建');
    
    try {
        await database.connect();
        
        // 1. 创建用户表
        
        
        // 创建用户表索引
        
        
        
        
        // 2. 创建测评表
        console.log('📋 创建测评表...');
        await database.run(`
            CREATE TABLE IF NOT EXISTS assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT,
                estimated_time INTEGER,
                questions_count INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ 测评表创建完成');
        
        // 3. 创建题目表
        console.log('📋 创建题目表...');
        await database.run(`
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assessment_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                question_type TEXT NOT NULL,
                options TEXT NOT NULL,
                weight INTEGER DEFAULT 1,
                order_index INTEGER,
                FOREIGN KEY (assessment_id) REFERENCES assessments(id)
            )
        `);
        console.log('✅ 题目表创建完成');
        
        // 4. 创建测评结果表
        
        
        // 创建测评结果表索引
        
        
        
        
        
        // 5. 创建答案表
        
        
        // 创建答案表索引
        
        
        
        
        // 6. 创建系统配置表（可选）
        console.log('📋 创建系统配置表...');
        await database.run(`
            CREATE TABLE IF NOT EXISTS system_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                config_key TEXT NOT NULL UNIQUE,
                config_value TEXT,
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 插入默认配置
        await database.run(`
            INSERT OR IGNORE INTO system_config (config_key, config_value, description)
            VALUES 
                ('system_version', '3.0.0', '系统版本'),
                ('database_version', '1.0.0', '数据库版本'),
                ('maintenance_mode', 'false', '维护模式')
        `);
        console.log('✅ 系统配置表创建完成');
        
        // 7. 验证表创建
        console.log('📊 验证数据库架构...');
        const tables = await database.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `);
        
        console.log('✅ 数据库架构创建完成');
        console.log('📋 已创建的表:');
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });
        
        // 8. 获取数据库信息
        const dbInfo = await database.getDatabaseInfo();
        console.log('📊 数据库信息:');
        console.log(`   路径: ${dbInfo.path}`);
        console.log(`   大小: ${dbInfo.totalSize}`);
        console.log(`   表数量: ${dbInfo.tables.length}`);
        console.log('   表记录数:');
        for (const [tableName, count] of Object.entries(dbInfo.tableCounts)) {
            console.log(`     ${tableName}: ${count} 条记录`);
        }
        
        console.log('🎉 数据库迁移完成！');
        
    } catch (error) {
        console.error('❌ 数据库迁移失败:', error.message);
        throw error;
    } finally {
        await database.close();
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    runMigration().catch(error => {
        console.error('迁移脚本执行失败:', error);
        process.exit(1);
    });
}

module.exports = runMigration;