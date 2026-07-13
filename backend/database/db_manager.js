// 数据库管理工具
const database = require('./db');
const runMigration = require('./migrations/001_initial_schema');
const seedData = require('./seeders/001_seed_data');

class DatabaseManager {
    constructor() {
        this.commands = {
            'init': this.initDatabase.bind(this),
            'migrate': this.runMigration.bind(this),
            'seed': this.seedData.bind(this),
            'reset': this.resetDatabase.bind(this),
            'backup': this.backupDatabase.bind(this),
            'restore': this.restoreDatabase.bind(this),
            'info': this.getDatabaseInfo.bind(this),
            'health': this.checkHealth.bind(this),
            'help': this.showHelp.bind(this)
        };
    }
    
    // 初始化数据库（迁移 + 播种）
    async initDatabase() {
        console.log('🚀 开始初始化数据库...');
        console.log('='.repeat(50));
        
        try {
            // 1. 运行迁移
            console.log('\n📋 步骤1: 运行数据库迁移');
            await runMigration();
            
            // 2. 播种数据
            console.log('\n📋 步骤2: 播种初始数据');
            await seedData();
            
            console.log('\n🎉 数据库初始化完成！');
            return true;
        } catch (error) {
            console.error('❌ 数据库初始化失败:', error.message);
            return false;
        }
    }
    
    // 运行迁移
    async runMigration() {
        console.log('🚀 运行数据库迁移...');
        try {
            await runMigration();
            console.log('✅ 数据库迁移完成');
            return true;
        } catch (error) {
            console.error('❌ 数据库迁移失败:', error.message);
            return false;
        }
    }
    
    // 播种数据
    async seedData() {
        console.log('🌱 播种初始数据...');
        try {
            await seedData();
            console.log('✅ 数据播种完成');
            return true;
        } catch (error) {
            console.error('❌ 数据播种失败:', error.message);
            return false;
        }
    }
    
    // 重置数据库（危险操作）
    async resetDatabase(confirm = false) {
        if (!confirm) {
            console.warn('⚠️  警告：重置数据库将删除所有数据！');
            console.warn('   请确认后再执行此操作。');
            console.warn('   使用 --confirm 参数确认重置。');
            return false;
        }
        
        console.log('🔄 开始重置数据库...');
        
        try {
            await database.connect();
            
            // 获取数据库信息
            const dbInfo = await database.getDatabaseInfo();
            console.log(`📊 当前数据库信息:`);
            console.log(`   路径: ${dbInfo.path}`);
            console.log(`   大小: ${dbInfo.totalSize}`);
            console.log(`   表数量: ${dbInfo.tables.length}`);
            
            // 备份当前数据库
            console.log('📦 备份当前数据库...');
            const backupPath = await database.backup();
            console.log(`✅ 数据库已备份到: ${backupPath}`);
            
            // 删除所有表
            console.log('🗑️  删除所有表...');
            const tables = dbInfo.tables;
            
            for (const table of tables) {
                console.log(`   删除表: ${table}`);
                await database.run(`DROP TABLE IF EXISTS ${table}`);
            }
            
            console.log('✅ 所有表已删除');
            
            // 重新初始化
            console.log('🔄 重新初始化数据库...');
            await this.initDatabase();
            
            console.log('🎉 数据库重置完成！');
            console.log(`📦 原数据库备份在: ${backupPath}`);
            
            return true;
        } catch (error) {
            console.error('❌ 数据库重置失败:', error.message);
            return false;
        } finally {
            await database.close();
        }
    }
    
    // 备份数据库
    async backupDatabase(backupPath = null) {
        console.log('📦 开始备份数据库...');
        
        try {
            await database.connect();
            const resultPath = await database.backup(backupPath);
            console.log(`✅ 数据库备份完成: ${resultPath}`);
            return resultPath;
        } catch (error) {
            console.error('❌ 数据库备份失败:', error.message);
            return null;
        } finally {
            await database.close();
        }
    }
    
    // 恢复数据库（需要备份文件路径）
    async restoreDatabase(backupPath) {
        if (!backupPath) {
            console.error('❌ 请提供备份文件路径');
            return false;
        }
        
        console.log(`🔄 开始从备份恢复数据库: ${backupPath}`);
        
        try {
            const fs = require('fs');
            const path = require('path');
            
            // 检查备份文件是否存在
            if (!fs.existsSync(backupPath)) {
                console.error(`❌ 备份文件不存在: ${backupPath}`);
                return false;
            }
            
            // 备份当前数据库
            console.log('📦 备份当前数据库...');
            const currentBackup = await this.backupDatabase();
            
            // 关闭当前数据库连接
            await database.close();
            
            // 复制备份文件到数据库位置
            console.log('🔄 恢复数据库文件...');
            const dbPath = database.dbPath;
            const dbDir = path.dirname(dbPath);
            
            // 确保目录存在
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            // 复制文件
            fs.copyFileSync(backupPath, dbPath);
            console.log(`✅ 数据库文件已恢复: ${dbPath}`);
            
            // 验证恢复的数据库
            console.log('🔍 验证恢复的数据库...');
            await database.connect();
            const dbInfo = await database.getDatabaseInfo();
            
            console.log('📊 恢复后的数据库信息:');
            console.log(`   路径: ${dbInfo.path}`);
            console.log(`   大小: ${dbInfo.totalSize}`);
            console.log(`   表数量: ${dbInfo.tables.length}`);
            console.log('   表记录数:');
            for (const [tableName, count] of Object.entries(dbInfo.tableCounts)) {
                console.log(`     ${tableName}: ${count} 条记录`);
            }
            
            console.log('🎉 数据库恢复完成！');
            console.log(`📦 原数据库备份在: ${currentBackup}`);
            
            return true;
        } catch (error) {
            console.error('❌ 数据库恢复失败:', error.message);
            return false;
        } finally {
            await database.close();
        }
    }
    
    // 获取数据库信息
    async getDatabaseInfo() {
        console.log('📊 获取数据库信息...');
        
        try {
            await database.connect();
            const dbInfo = await database.getDatabaseInfo();
            
            console.log('📋 数据库信息:');
            console.log(`   路径: ${dbInfo.path}`);
            console.log(`   大小: ${dbInfo.totalSize}`);
            console.log(`   表数量: ${dbInfo.tables.length}`);
            console.log('   表记录数:');
            for (const [tableName, count] of Object.entries(dbInfo.tableCounts)) {
                console.log(`     ${tableName}: ${count} 条记录`);
            }
            
            // 显示表结构
            console.log('\n📋 表结构:');
            for (const table of dbInfo.tables) {
                const createSQL = await database.get(
                    "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
                    [table]
                );
                console.log(`   ${table}:`);
                console.log(`     ${createSQL.sql}`);
            }
            
            return dbInfo;
        } catch (error) {
            console.error('❌ 获取数据库信息失败:', error.message);
            return null;
        } finally {
            await database.close();
        }
    }
    
    // 检查数据库健康状态
    async checkHealth() {
        console.log('🏥 检查数据库健康状态...');
        
        try {
            await database.connect();
            
            // 检查表是否存在
            const requiredTables = ['users', 'assessments', 'questions', 'assessment_results', 'answers'];
            const missingTables = [];
            const tableStatus = {};
            
            for (const table of requiredTables) {
                const exists = await database.tableExists(table);
                tableStatus[table] = exists ? '✅' : '❌';
                if (!exists) missingTables.push(table);
            }
            
            console.log('📋 表状态检查:');
            for (const [table, status] of Object.entries(tableStatus)) {
                console.log(`   ${status} ${table}`);
            }
            
            // 检查数据完整性
            console.log('\n📊 数据完整性检查:');
            const checks = [
                { name: '用户数据', sql: 'SELECT COUNT(*) as count FROM users' },
                { name: '测评数据', sql: 'SELECT COUNT(*) as count FROM assessments' },
                { name: '题目数据', sql: 'SELECT COUNT(*) as count FROM questions' }
            ];
            
            for (const check of checks) {
                const result = await database.get(check.sql);
                console.log(`   ${check.name}: ${result.count} 条记录`);
            }
            
            // 检查外键约束
            console.log('\n🔗 外键约束检查:');
            const foreignKeyChecks = [
                { 
                    name: '题目关联测评', 
                    sql: 'SELECT COUNT(*) as count FROM questions WHERE assessment_id NOT IN (SELECT id FROM assessments)' 
                },
                { 
                    name: '测评结果关联用户', 
                    sql: 'SELECT COUNT(*) as count FROM assessment_results WHERE user_id NOT IN (SELECT id FROM users)' 
                },
                { 
                    name: '测评结果关联测评', 
                    sql: 'SELECT COUNT(*) as count FROM assessment_results WHERE assessment_id NOT IN (SELECT id FROM assessments)' 
                },
                { 
                    name: '答案关联测评结果', 
                    sql: 'SELECT COUNT(*) as count FROM answers WHERE result_id NOT IN (SELECT id FROM assessment_results)' 
                },
                { 
                    name: '答案关联题目', 
                    sql: 'SELECT COUNT(*) as count FROM answers WHERE question_id NOT IN (SELECT id FROM questions)' 
                }
            ];
            
            let hasForeignKeyIssues = false;
            for (const check of foreignKeyChecks) {
                const result = await database.get(check.sql);
                const status = result.count === 0 ? '✅' : '❌';
                console.log(`   ${status} ${check.name}: ${result.count} 条无效关联`);
                if (result.count > 0) hasForeignKeyIssues = true;
            }
            
            // 总体健康状态
            console.log('\n📈 总体健康状态:');
            if (missingTables.length === 0 && !hasForeignKeyIssues) {
                console.log('   ✅ 数据库健康状态良好');
                return { healthy: true, issues: [] };
            } else {
                const issues = [];
                if (missingTables.length > 0) {
                    issues.push(`缺少表: ${missingTables.join(', ')}`);
                }
                if (hasForeignKeyIssues) {
                    issues.push('存在外键约束问题');
                }
                console.log('   ❌ 数据库存在以下问题:');
                issues.forEach(issue => console.log(`     - ${issue}`));
                return { healthy: false, issues };
            }
            
        } catch (error) {
            console.error('❌ 健康检查失败:', error.message);
            return { healthy: false, issues: [`检查失败: ${error.message}`] };
        } finally {
            await database.close();
        }
    }
    
    // 显示帮助信息
    showHelp() {
        console.log('📖 数据库管理工具使用说明');
        console.log('='.repeat(50));
        console.log('\n可用命令:');
        console.log('  init        初始化数据库（迁移 + 播种）');
        console.log('  migrate     运行数据库迁移');
        console.log('  seed        播种初始数据');
        console.log('  reset       重置数据库（危险操作）');
        console.log('  backup      备份数据库');
        console.log('  restore     从备份恢复数据库');
        console.log('  info        获取数据库信息');
        console.log('  health      检查数据库健康状态');
        console.log('  help        显示帮助信息');
        console.log('\n使用示例:');
        console.log('  node db_manager.js init');
        console.log('  node db_manager.js migrate');
        console.log('  node db_manager.js seed');
        console.log('  node db_manager.js reset --confirm');
        console.log('  node db_manager.js backup');
        console.log('  node db_manager.js restore /path/to/backup.db');
        console.log('  node db_manager.js info');
        console.log('  node db_manager.js health');
    }
    
    // 执行命令
    async execute(command, args = {}) {
        if (!this.commands[command]) {
            console.error(`❌ 未知命令: ${command}`);
            this.showHelp();
            return false;
        }
        
        return await this.commands[command](args);
    }
}

// 命令行接口
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const commandArgs = {};
    
    // 解析参数
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--confirm') {
            commandArgs.confirm = true;
        } else if (args[i] === '--backup-path' && args[i + 1]) {
            commandArgs.backupPath = args[i + 1];
            i++;
        } else if (!args[i].startsWith('--')) {
            commandArgs.backupPath = args[i];
        }
    }
    
    const manager = new DatabaseManager();
    manager.execute(command, commandArgs).then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('命令执行失败:', error);
        process.exit(1);
    });
}

module.exports = DatabaseManager;