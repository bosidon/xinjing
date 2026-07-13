// 添加管理员角色迁移
const path = require('path');
const projectRoot = path.join(__dirname, '..', '..');
const database = require(path.join(projectRoot, 'database', 'db'));

async function runMigration() {
    console.log('🚀 开始数据库迁移: 添加管理员角色');
    
    try {
        await database.connect();

        // =========================================================
        // 1. 检查 role 列是否已存在
        // =========================================================
        const tableInfo = await database.all('PRAGMA table_info(users)');
        const hasRoleColumn = tableInfo.some(col => col.name === 'role');
        
        if (hasRoleColumn) {
            console.log('📊 role 列已存在，跳过添加列操作');
        } else {
            console.log('📋 添加 role 列到 users 表...');
            await database.run(`
                ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
            `);
            console.log('✅ role 列添加成功');
        }

        // =========================================================
        // 2. 设置 id=1 的用户为 admin
        // =========================================================
        const user1 = await database.get('SELECT id, username, email FROM users WHERE id = 1');
        if (user1) {
            if (user1.role !== 'admin') {
                await database.run('UPDATE users SET role = ? WHERE id = 1', ['admin']);
                console.log(`✅ 设置用户 id=1 (${user1.username}) 为管理员`);
            } else {
                console.log(`⏭️ 用户 id=1 (${user1.username}) 已经是管理员`);
            }
        } else {
            console.log('⏭️ 未找到 id=1 的用户');
        }

        // =========================================================
        // 3. 设置 email=10212643@qq.com 的用户为 admin
        // =========================================================
        const userXie = await database.get('SELECT id, username, email FROM users WHERE email = ?', ['10212643@qq.com']);
        if (userXie) {
            if (userXie.role !== 'admin') {
                await database.run('UPDATE users SET role = ? WHERE email = ?', ['admin', '10212643@qq.com']);
                console.log(`✅ 设置用户 ${userXie.username} (${userXie.email}) 为管理员`);
            } else {
                console.log(`⏭️ 用户 ${userXie.username} (${userXie.email}) 已经是管理员`);
            }
        } else {
            console.log('⏭️ 未找到邮箱为 10212643@qq.com 的用户');
        }

        // =========================================================
        // 4. 验证结果
        // =========================================================
        console.log('\n📊 管理员列表:');
        const admins = await database.all("SELECT id, username, email, role FROM users WHERE role = 'admin'");
        if (admins.length > 0) {
            admins.forEach(a => console.log(`   - ${a.username} (${a.email}) [id=${a.id}]`));
        } else {
            console.log('   (无)');
        }

        const allUsers = await database.all('SELECT id, username, email, role FROM users ORDER BY id');
        console.log(`\n📊 所有用户 (${allUsers.length} 人):`);
        allUsers.forEach(u => console.log(`   [${u.role}] ${u.username} (${u.email})`));

        console.log('\n✅ 迁移完成: 管理员角色已添加');
        
    } catch (error) {
        console.error('❌ 迁移失败:', error.message);
        process.exit(1);
    } finally {
        await database.close();
        process.exit(0);
    }
}

runMigration();
