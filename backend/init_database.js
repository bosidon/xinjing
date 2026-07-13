// 数据库初始化脚本
console.log('🚀 开始初始化心理测评系统数据库...');
console.log('='.repeat(60));

const database = require('./database/db');
const runMigration = require('./database/migrations/001_initial_schema');
const seedData = require('./database/seeders/001_seed_data');

async function initDatabase() {
    try {
        console.log('\n📋 步骤1: 运行数据库迁移');
        console.log('-'.repeat(40));
        await runMigration();
        
        console.log('\n📋 步骤2: 播种初始数据');
        console.log('-'.repeat(40));
        await seedData();
        
        console.log('\n🎉 数据库初始化完成！');
        console.log('='.repeat(60));
        
        // 显示系统信息
        console.log('\n📊 系统信息:');
        console.log('   版本: 3.0.0 (数据库版本)');
        console.log('   数据库: SQLite');
        console.log('   认证: JWT + bcrypt密码加密');
        
        console.log('\n🔑 测试账号:');
        console.log('   邮箱: test1@example.com');
        console.log('   密码: password123');
        
        console.log('\n🌐 访问地址:');
        console.log('   主界面: http://localhost:8080');
        console.log('   数据库API: http://localhost:3003/api (即将启动)');
        console.log('   内存API: http://localhost:3002/api (当前运行)');
        
        console.log('\n🚀 启动命令:');
        console.log('   cd backend && node start_database.js');
        
        console.log('\n📋 管理命令:');
        console.log('   npm run db:init      # 初始化数据库');
        console.log('   npm run db:migrate   # 运行迁移');
        console.log('   npm run db:seed      # 播种数据');
        console.log('   npm run db:info      # 数据库信息');
        console.log('   npm run db:health    # 健康检查');
        
        console.log('\n✅ 初始化完成，可以启动数据库版本的服务了！');
        
    } catch (error) {
        console.error('\n❌ 数据库初始化失败:');
        console.error('   错误:', error.message);
        console.error('   堆栈:', error.stack);
        process.exit(1);
    }
}

// 执行初始化
initDatabase();