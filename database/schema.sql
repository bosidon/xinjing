-- 心理测评系统数据库设计

-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    gender VARCHAR(10),
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 测评量表表
CREATE TABLE assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,  -- 测评代码，如MBTI, PHQ-9等
    name VARCHAR(100) NOT NULL,        -- 测评名称
    description TEXT,                  -- 测评描述
    category VARCHAR(50),              -- 分类：性格、情绪、职业等
    estimated_time INTEGER,            -- 预计完成时间（分钟）
    questions_count INTEGER,           -- 题目数量
    scoring_method VARCHAR(50),        -- 评分方法
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 测评题目表
CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id INTEGER NOT NULL,
    question_number INTEGER NOT NULL,  -- 题目序号
    question_text TEXT NOT NULL,       -- 题目内容
    question_type VARCHAR(20) NOT NULL, -- 题目类型：single_choice, multiple_choice, scale
    options JSON,                      -- 选项（JSON格式）
    weight DECIMAL(3,2) DEFAULT 1.0,   -- 题目权重
    dimension VARCHAR(50),             -- 所属维度
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- 测评结果表
CREATE TABLE assessment_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    assessment_id INTEGER NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    total_score DECIMAL(10,2),
    raw_data JSON,                     -- 原始答题数据
    result_summary TEXT,               -- 结果摘要
    result_details JSON,               -- 详细结果（JSON格式）
    is_completed BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- 用户答题记录表
CREATE TABLE user_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    result_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer_value TEXT NOT NULL,        -- 用户答案
    score DECIMAL(5,2),                -- 该题得分
    answer_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (result_id) REFERENCES assessment_results(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- 测评报告模板表
CREATE TABLE report_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id INTEGER NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    template_content TEXT NOT NULL,    -- 报告模板内容（支持变量替换）
    variables JSON,                    -- 可用变量定义
    is_default BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- 系统配置表
CREATE TABLE system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value TEXT,
    description VARCHAR(200),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_assessments_category ON assessments(category);
CREATE INDEX idx_questions_assessment ON questions(assessment_id);
CREATE INDEX idx_results_user ON assessment_results(user_id);
CREATE INDEX idx_results_assessment ON assessment_results(assessment_id);
CREATE INDEX idx_answers_result ON user_answers(result_id);

-- 插入初始数据：系统配置
INSERT INTO system_config (config_key, config_value, description) VALUES
('site_name', '心理测评系统', '网站名称'),
('site_description', '专业的在线心理测评平台', '网站描述'),
('default_language', 'zh-CN', '默认语言'),
('result_retention_days', '365', '测评结果保留天数');

-- 插入示例测评：MBTI性格测试
INSERT INTO assessments (code, name, description, category, estimated_time, questions_count, scoring_method) VALUES
('MBTI', 'MBTI性格类型测试', '基于荣格心理类型理论的性格测评工具，帮助了解个人性格偏好', '性格测评', 15, 60, 'dimension_scoring'),
('PHQ-9', '抑郁症筛查量表', '患者健康问卷抑郁量表，用于评估抑郁症状严重程度', '情绪测评', 5, 9, 'sum_scoring'),
('GAD-7', '广泛性焦虑障碍量表', '用于评估焦虑症状的严重程度', '情绪测评', 5, 7, 'sum_scoring'),
('Holland', '霍兰德职业兴趣测试', '评估个人职业兴趣类型，帮助职业规划', '职业测评', 10, 42, 'type_scoring');

-- 插入MBTI题目示例
INSERT INTO questions (assessment_id, question_number, question_text, question_type, options, dimension) VALUES
(1, 1, '在聚会中，你通常：', 'single_choice', '["A. 与很多人交流，包括陌生人", "B. 只与几个熟悉的人交谈"]', 'E/I'),
(1, 2, '你更倾向于：', 'single_choice', '["A. 通过实践学习", "B. 通过思考学习"]', 'S/N'),
(1, 3, '做决定时，你更注重：', 'single_choice', '["A. 逻辑和客观事实", "B. 情感和人际关系"]', 'T/F'),
(1, 4, '你的生活方式更偏向：', 'single_choice', '["A. 有计划、有组织", "B. 灵活、随性"]', 'J/P');

-- 插入PHQ-9题目示例
INSERT INTO questions (assessment_id, question_number, question_text, question_type, options, dimension) VALUES
(2, 1, '做事时提不起劲或没有兴趣', 'scale', '["0. 完全不会", "1. 几天", "2. 一半以上天数", "3. 几乎每天"]', 'depression'),
(2, 2, '感到心情低落、沮丧或绝望', 'scale', '["0. 完全不会", "1. 几天", "2. 一半以上天数", "3. 几乎每天"]', 'depression'),
(2, 3, '入睡困难、睡不安稳或睡眠过多', 'scale', '["0. 完全不会", "1. 几天", "2. 一半以上天数", "3. 几乎每天"]', 'depression');