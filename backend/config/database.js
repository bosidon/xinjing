const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, '../../database/psychological_assessment.db');
    this.initDatabase();
  }

  initDatabase() {
    // 确保数据库目录存在
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 连接数据库
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('数据库连接失败:', err.message);
      } else {
        console.log('成功连接到SQLite数据库');
        this.createTables();
      }
    });

    // 启用外键约束
    this.db.run('PRAGMA foreign_keys = ON');
  }

  createTables() {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // 分割SQL语句并执行
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      let completed = 0;
      statements.forEach((stmt, index) => {
        this.db.run(stmt + ';', (err) => {
          if (err) {
            console.error(`执行SQL语句 ${index + 1} 失败:`, err.message);
          }
          completed++;
          
          if (completed === statements.length) {
            console.log('数据库表创建完成');
            this.seedInitialData();
          }
        });
      });
    } else {
      console.error('数据库架构文件不存在:', schemaPath);
    }
  }

  seedInitialData() {
    // 检查是否已有数据
    this.db.get('SELECT COUNT(*) as count FROM assessments', (err, row) => {
      if (err) {
        console.error('检查数据失败:', err.message);
        return;
      }

      if (row.count === 0) {
        console.log('正在插入初始数据...');
        // 这里可以添加更多的初始数据
      }
    });
  }

  // 查询方法
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 获取单条记录
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 执行更新操作
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            lastID: this.lastID, 
            changes: this.changes 
          });
        }
      });
    });
  }

  // 关闭数据库连接
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // 事务处理
  transaction(callback) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        callback(this)
          .then(() => {
            this.db.run('COMMIT', (err) => {
              if (err) reject(err);
              else resolve();
            });
          })
          .catch((err) => {
            this.db.run('ROLLBACK', (rollbackErr) => {
              if (rollbackErr) {
                console.error('回滚失败:', rollbackErr);
              }
              reject(err);
            });
          });
      });
    });
  }
}

// 创建单例实例
const database = new Database();

module.exports = database;