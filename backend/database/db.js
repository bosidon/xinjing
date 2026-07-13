// 数据库连接模块
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '..', '..', 'data', 'psychological_assessment.db');
        this.initDir = path.join(__dirname, '..', '..', 'data');
    }

    // 初始化数据库目录
    initDirectory() {
        if (!fs.existsSync(this.initDir)) {
            fs.mkdirSync(this.initDir, { recursive: true });
            console.log(`✅ 创建数据库目录: ${this.initDir}`);
        }
    }

    // 连接数据库（单例模式）
    connect() {
        if (this.db) {
            return Promise.resolve(this.db);
        }
        return new Promise((resolve, reject) => {
            this.initDirectory();

            console.log(`📊 连接数据库: ${this.dbPath}`);
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ 数据库连接失败:', err.message);
                    reject(err);
                } else {
                    console.log('✅ 数据库连接成功');
                    resolve(this.db);
                }
            });
        });
    }

    // 关闭数据库连接
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('❌ 关闭数据库连接失败:', err.message);
                        reject(err);
                    } else {
                        console.log('✅ 数据库连接已关闭');
                        this.db = null;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // 执行SQL查询
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('❌ SQL执行失败:', err.message);
                    console.error('SQL:', sql);
                    console.error('参数:', params);
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // 执行SQL查询并返回单行
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('❌ SQL查询失败:', err.message);
                    console.error('SQL:', sql);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // 执行SQL查询并返回多行
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('❌ SQL查询失败:', err.message);
                    console.error('SQL:', sql);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 执行事务
    async transaction(callback) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.run('BEGIN TRANSACTION');
                const result = await callback(this);
                await this.run('COMMIT');
                resolve(result);
            } catch (error) {
                await this.run('ROLLBACK');
                reject(error);
            }
        });
    }

    // 检查表是否存在
    async tableExists(tableName) {
        try {
            const sql = `
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name=?
            `;
            const result = await this.get(sql, [tableName]);
            return !!result;
        } catch (error) {
            console.error('❌ 检查表存在失败:', error.message);
            return false;
        }
    }

    // 获取数据库信息
    async getDatabaseInfo() {
        try {
            const tables = await this.all(`
                SELECT name, sql FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `);
            
            const tableCounts = {};
            for (const table of tables) {
                const countResult = await this.get(`SELECT COUNT(*) as count FROM ${table.name}`);
                tableCounts[table.name] = countResult.count;
            }
            
            return {
                path: this.dbPath,
                tables: tables.map(t => t.name),
                tableCounts,
                totalSize: fs.existsSync(this.dbPath) ? 
                    (fs.statSync(this.dbPath).size / 1024).toFixed(2) + ' KB' : 'N/A'
            };
        } catch (error) {
            console.error('❌ 获取数据库信息失败:', error.message);
            return null;
        }
    }

    // 备份数据库
    async backup(backupPath = null) {
        if (!backupPath) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            backupPath = path.join(this.initDir, `backup_${timestamp}.db`);
        }
        
        return new Promise((resolve, reject) => {
            const backupDB = new sqlite3.Database(backupPath);
            this.db.backup(backupDB, {
                step: (remainingPages, totalPages) => {
                    const progress = ((totalPages - remainingPages) / totalPages * 100).toFixed(1);
                    console.log(`📦 备份进度: ${progress}%`);
                },
                complete: () => {
                    backupDB.close();
                    console.log(`✅ 数据库备份完成: ${backupPath}`);
                    resolve(backupPath);
                },
                error: (err) => {
                    backupDB.close();
                    console.error('❌ 数据库备份失败:', err.message);
                    reject(err);
                }
            });
        });
    }
}

// 创建单例实例
const database = new Database();

module.exports = database;