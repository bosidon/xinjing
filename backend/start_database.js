// 心理测评系统 - 数据库版本后端API
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cookieParser = require("cookie-parser");

const { authenticateToken, extractToken } = require("/var/www/auth-verify");
const AUTH_API = "http://localhost:3050";

// 数据库模型
const database = require('./database/db');
const User = require('./database/models/User');
const Assessment = require('./database/models/Assessment');
const ResultAnalyzer = require('./database/analyzers/ResultAnalyzer');

// 透传辅助：根据assessment_id推断analysisType并统一返回字段
const TYPE_MAP = {1:'MBTI',2:'PHQ-9',3:'霍兰德',4:'SAS',5:'GAD-7',6:'大五人格',7:'情商(EQ)',8:'富足',9:'自爱',10:'SAD',11:'ITS',12:'IRI',13:'SSI',14:'SIAS',15:'SDS',16:'亲子关系',17:'婚恋关系',18:'性心理'};
function buildAnalysisData(details, assessmentId) {
    const atype = TYPE_MAP[assessmentId] || '未知';
    return {
        ...details,
        analysisType: atype,
        assessmentId: assessmentId,
        personalityType: details.type || null,
        personalityTitle: details.profile?.title || null,
        hollandCode: details.code || null,
        severity: details.severity || details.overallLevel || null,
        overallLevel: details.overallLevel || details.severity || null,
        score: details.totalScore ?? details.overallScore ?? details.rawScore ?? details.standardScore ?? details.totalEmpathyScore ?? null,
        dimensions: details.dimensions || null,
        priorityDimensions: details.priorityDimensions || null,
        maxScore: details.maxScore || details.maxEmpathyScore || null,
        rawScore: details.rawScore || null,
        topTypes: details.topTypes || null,
        scores: details.scores || null
    };
}


// 配置
const PORT = process.env.PORT || 3003;

const ALLOWED_ORIGINS = ((process.env.ALLOWED_ORIGINS || 'http://localhost:8080,http://localhost:1313,http://127.0.0.1:8080') + ',https://xianbao.love').split(',');
const API_VERSION = '3.0.0';

// 创建Express应用
const app = express();

// 安全中间件
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: function (origin, callback) {
        // 允许无来源的请求（同源、CURL、Postman）
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`来源 ${origin} 不被允许`));
    },
    credentials: true
}));

// 请求频率限制
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15分钟
    max: 200,                    // 最多200次请求
    message: { success: false, error: '请求过于频繁，请稍后重试' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// 认证接口更严格限制
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, error: '登录尝试过于频繁，请15分钟后重试' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// 请求日志中间件
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// 健康检查端点
app.get('/api/health', async (req, res) => {
    try {
        await database.connect();
        const dbInfo = await database.getDatabaseInfo();
        
        res.json({
            success: true,
            data: {
                status: 'healthy',
                version: API_VERSION,
                database: {
                    path: dbInfo.path,
                    size: dbInfo.totalSize,
                    tables: dbInfo.tables.length,
                    tableCounts: dbInfo.tableCounts
                },
                message: '心理测评系统数据库版本API'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '数据库连接失败'
        });
    }
});

// 获取当前用户信息
app.get('/api/users/me', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user
        });
        
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({
            success: false,
            error: '获取用户信息失败'
        });
    }
});

// 获取测评列表
app.get('/api/assessments', async (req, res) => {
    try {
        await database.connect();
        
        const assessments = await database.all(`
            SELECT 
                id, name, description, category, estimated_time, questions_count, created_at
            FROM assessments 
            ORDER BY created_at DESC
        `);
        
        res.json({
            success: true,
            data: assessments.map(assessment => ({
                ...assessment,
                created_at: assessment.created_at ? new Date(assessment.created_at).toISOString() : null
            }))
        });
        
    } catch (error) {
        console.error('获取测评列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取测评列表失败'
        });
    }
});

// 获取测评详情
app.get('/api/assessments/:id', async (req, res) => {
    try {
        const assessmentId = parseInt(req.params.id);
        
        await database.connect();
        
        // 获取测评基本信息
        const assessment = await database.get(`
            SELECT 
                id, name, description, category, estimated_time, questions_count, created_at
            FROM assessments 
            WHERE id = ?
        `, [assessmentId]);
        
        if (!assessment) {
            return res.status(404).json({
                success: false,
                error: '测评不存在'
            });
        }
        
        // 获取测评题目
        const questions = await database.all(`
            SELECT 
                id, question_text, question_type, options, weight, order_index
            FROM questions 
            WHERE assessment_id = ?
            ORDER BY order_index
        `, [assessmentId]);
        
        // 解析选项JSON
        const parsedQuestions = questions.map(question => ({
            ...question,
            options: JSON.parse(question.options)
        }));
        
        res.json({
            success: true,
            data: {
                ...assessment,
                created_at: assessment.created_at ? new Date(assessment.created_at).toISOString() : null,
                questions: parsedQuestions
            }
        });
        
    } catch (error) {
        console.error('获取测评详情失败:', error);
        res.status(500).json({
            success: false,
            error: '获取测评详情失败'
        });
    }
});

// 开始测评
app.post('/api/assessments/:id/start', authenticateToken, async (req, res) => {
    try {
        const assessmentId = parseInt(req.params.id);
        const userId = req.user.id;
        
        // 用量前置检查 - 防止无限刷开始请求
        const tokenForUsage = extractToken(req);
        if (tokenForUsage) {
            try {
                const checkResp = await fetch('http://localhost:3050/api/usage/check?service=psych_test', {
                    headers: { 'Cookie': `xianbao_token=${tokenForUsage}` }
                });
                const usageData = await checkResp.json();
                if (usageData.success === false) {
                    console.error('开始测评-用量检查接口报错:', usageData.error);
                } else if (usageData.data && !usageData.data.allowed) {
                    return res.json({ success: false, error: 'free_psych_test_limit' });
                }
            } catch (checkErr) {
                console.error('开始测评-用量检查失败:', checkErr.message);
            }
        }
        
        await database.connect();
        
        // 检查测评是否存在
        const assessment = await database.get(
            'SELECT id, name FROM assessments WHERE id = ?',
            [assessmentId]
        );
        
        if (!assessment) {
            return res.status(404).json({
                success: false,
                error: '测评不存在'
            });
        }
        
        res.json({
            success: true,
            data: {
                assessment: {
                    id: assessment.id,
                    name: assessment.name
                },
                startTime: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('开始测评失败:', error);
        res.status(500).json({
            success: false,
            error: '开始测评失败'
        });
    }
});

// 提交测评答案
app.post('/api/assessments/:id/submit', authenticateToken, async (req, res) => {
    try {
        const assessmentId = parseInt(req.params.id);
        const { answers } = req.body;
        const userId = req.user.id;
        
        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({
                success: false,
                error: '参数不完整'
            });
        }

        // 用量检查 - 对统一认证用户进行用量校验
        const tokenForInc = extractToken(req);
        if (tokenForInc) {
            try {
                const resp = await fetch('http://localhost:3050/api/usage/increment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': `xianbao_token=${tokenForInc}`
                    },
                    body: JSON.stringify({ service: 'psych_test' })
                });
                const incData = await resp.json();
                if (incData.success === false) {
                    console.error('用量递增接口报错:', incData.error);
                }
            } catch (usageError) {
                console.error('用量递增失败:', usageError.message);
            }
        }
        
        await database.connect();
        
        // 验证测评是否存在
        const assessment = await database.get(
            'SELECT id, name FROM assessments WHERE id = ?',
            [assessmentId]
        );
        if (!assessment) {
            return res.status(404).json({ success: false, error: '测评不存在' });
        }
        
        // 创建新结果记录并保存答案（via auth API）
        let resultId;
        const ansBody = answers.map(a => ({ questionId: a.questionId, answerValue: a.answerValue }));
        const createResp = await fetch(AUTH_API + '/api/auth/psych/result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': 'xianbao_token=' + extractToken(req) },
            body: JSON.stringify({ assessment_id: assessmentId, total_score: answers.length * 10, result_summary: '测评完成，分析中...', answers: ansBody })
        });
        const createData = await createResp.json();
        if (!createData.success) throw new Error(createData.error || '创建结果失败');
        resultId = createData.data.resultId;
        
        // 使用结果分析器进行深度分析
        let analysisData = null;
        try {
            const analysis = await ResultAnalyzer.analyzeResult(resultId, assessmentId);
            
            await fetch(AUTH_API + '/api/auth/psych/result/' + resultId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Cookie': 'xianbao_token=' + extractToken(req) },
                body: JSON.stringify({ total_score: analysis.score || answers.length * 10, result_summary: analysis.summary, result_details: analysis.details })
            });
            
            const detailsObj = JSON.parse(analysis.details);
            analysisData = buildAnalysisData(detailsObj, assessmentId);
            
            console.log('深度分析完成:', analysis.analysisType);
        } catch (analysisError) {
            console.error('深度分析失败（使用基本结果）:', analysisError.message);
        }
        
        // 获取保存后的结果
        const savedResult = await database.get(`
            SELECT 
                ar.id, ar.assessment_id, ar.start_time, ar.end_time, ar.total_score, 
                ar.result_summary,
                a.name as assessment_name
            FROM assessment_results ar
            JOIN assessments a ON ar.assessment_id = a.id
            WHERE ar.id = ?
        `, [resultId]);
        
        res.json({
            success: true,
            data: {
                id: savedResult.id,
                assessmentId: assessmentId,
                assessmentName: savedResult.assessment_name,
                startTime: savedResult.start_time ? new Date(savedResult.start_time).toISOString() : null,
                endTime: savedResult.end_time ? new Date(savedResult.end_time).toISOString() : null,
                totalScore: savedResult.total_score,
                summary: savedResult.result_summary,
                answersCount: answers.length,
                analysis: analysisData
            }
        });
        
    } catch (error) {
        console.error('提交测评失败:', error);
        res.status(500).json({
            success: false,
            error: '提交测评失败'
        });
    }
});

// 获取用户测评历史
app.get('/api/users/me/results', authenticateToken, async (req, res) => {
    try {
        const r = await fetch(AUTH_API + '/api/auth/psych/results', {
            headers: { 'Cookie': 'xianbao_token=' + extractToken(req) }
        });
        const d = await r.json();
        if (!d.success) return res.json(d);
        // Enrich with assessment info from local DB
        await database.connect();
        const enriched = [];
        for (const row of d.data) {
            const a = await database.get('SELECT name, category FROM assessments WHERE id = ?', [row.assessment_id]);
            let analysisData = null;
            if (row.result_details) {
                try { analysisData = buildAnalysisData(JSON.parse(row.result_details), row.assessment_id); } catch(e) {}
            }
            enriched.push({
                id: row.id, assessmentId: row.assessment_id,
                assessmentName: a ? a.name : '', category: a ? a.category : '',
                startTime: row.start_time ? new Date(row.start_time).toISOString() : null,
                endTime: row.end_time ? new Date(row.end_time).toISOString() : null,
                totalScore: row.total_score, resultSummary: row.result_summary, analysis: analysisData
            });
        }
        res.json({ success: true, data: enriched });
        
    } catch (error) {
        console.error('获取测评历史失败:', error);
        res.status(500).json({
            success: false,
            error: '获取测评历史失败'
        });
    }
});

// =========================================================
// 管理员API端点
// =========================================================

// 管理员认证中间件（从JWT读取role）
const requireAdmin = async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: '需要管理员权限'
        });
    }
    next();
};

// 获取用户列表（从统一认证中心）
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const resp = await fetch('http://localhost:3050/api/users/', {
            headers: { 'Cookie': req.headers['cookie'] || '' }
        });
        const data = resp.data;
        if (data.success) {
            res.json({ success: true, data: data.data.users });
        } else {
            res.status(500).json({ success: false, error: '获取用户列表失败' });
        }
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取用户列表失败'
        });
    }
});

// 获取所有用户的测评记录（管理员专用）
app.get('/api/admin/records', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await database.connect();

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const userId = req.query.userId ? parseInt(req.query.userId) : null;
        const assessmentId = req.query.assessmentId ? parseInt(req.query.assessmentId) : null;
        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;
        const severity = req.query.severity || null;

        let whereClause = "WHERE 1=1 AND ar.result_summary IS NOT NULL";
        const params = [];

        if (userId) {
            whereClause += ' AND ar.user_id = ?';
            params.push(userId);
        }
        if (assessmentId) {
            whereClause += ' AND ar.assessment_id = ?';
            params.push(assessmentId);
        }
        if (startDate) {
            whereClause += ' AND ar.start_time >= ?';
            params.push(startDate);
        }
        if (endDate) {
            whereClause += ' AND ar.start_time <= ?';
            params.push(endDate);
        }

        // 先获取总数
        const countResult = await database.get(`
            SELECT COUNT(*) as total
            FROM assessment_results ar
            ${whereClause}
        `, params);

        // 获取分页数据
        const results = await database.all(`
            SELECT 
                ar.id, ar.assessment_id, ar.user_id, ar.start_time, ar.end_time,
                ar.total_score, ar.result_summary, ar.result_details,
                a.name as assessment_name, a.category,
                u.username, u.email
            FROM assessment_results ar
            JOIN assessments a ON ar.assessment_id = a.id
            JOIN users u ON ar.user_id = u.id
            ${whereClause}
            ORDER BY ar.start_time DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // 解析结果详情
        const parsedResults = results.map(result => {
            let analysisData = null;
            if (result.result_details) {
                try {
                    const details = JSON.parse(result.result_details);
                    analysisData = buildAnalysisData(details, result.assessment_id);
                } catch (e) {}
            }
            return {
                id: result.id,
                assessmentId: result.assessment_id,
                assessmentName: result.assessment_name,
                category: result.category,
                userId: result.user_id,
                username: result.username,
                startTime: result.start_time ? new Date(result.start_time).toISOString() : null,
                endTime: result.end_time ? new Date(result.end_time).toISOString() : null,
                totalScore: result.total_score,
                resultSummary: result.result_summary,
                analysis: analysisData
            };
        });

        res.json({
            success: true,
            data: parsedResults,
            pagination: {
                total: countResult.total,
                page: page,
                limit: limit,
                totalPages: Math.ceil(countResult.total / limit)
            }
        });

    } catch (error) {
        console.error('获取管理员记录失败:', error);
        res.status(500).json({
            success: false,
            error: '获取记录失败'
        });
    }
});

// 获取指定用户的测评记录
app.get('/api/users/:userId/results', authenticateToken, async (req, res) => {
    try {
        const targetUserId = parseInt(req.params.userId);
        const currentUserId = req.user.id;

        // 检查权限：只能查看自己的记录，除非是管理员
        if (targetUserId !== currentUserId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: '无权查看其他用户的记录'
            });
        }

        await database.connect();

        const results = await database.all(`
            SELECT 
                ar.id, ar.assessment_id, ar.start_time, ar.end_time,
                ar.total_score, ar.result_summary, ar.result_details,
                a.name as assessment_name, a.category
            FROM assessment_results ar
            JOIN assessments a ON ar.assessment_id = a.id
            WHERE ar.user_id = ? AND ar.result_summary IS NOT NULL
            ORDER BY ar.start_time DESC
        `, [targetUserId]);

        res.json({
            success: true,
            data: results.map(result => {
                let analysisData = null;
                if (result.result_details) {
                    try {
                        const details = JSON.parse(result.result_details);
                        analysisData = buildAnalysisData(details, result.assessment_id);
                    } catch (e) {}
                }
                return {
                    id: result.id,
                    assessmentId: result.assessment_id,
                    assessmentName: result.assessment_name,
                    category: result.category,
                    startTime: result.start_time ? new Date(result.start_time).toISOString() : null,
                    endTime: result.end_time ? new Date(result.end_time).toISOString() : null,
                    totalScore: result.total_score,
                    resultSummary: result.result_summary,
                    analysis: analysisData
                };
            })
        });

    } catch (error) {
        console.error('获取用户测评历史失败:', error);
        res.status(500).json({
            success: false,
            error: '获取测评历史失败'
        });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        error: '服务器内部错误'
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在'
    });
});

// 启动服务器
(async () => {
    try {
        // 启动时连接数据库（单例）
        await database.connect();
        console.log('✅ 数据库就绪');

        app.listen(PORT, () => {
            console.log('='.repeat(60));
            console.log('🚀 心理测评系统 - 数据库版本后端API');
            console.log('='.repeat(60));
            console.log(`📊 版本: ${API_VERSION}`);
            console.log(`🌐 地址: http://localhost:${PORT}`);
            console.log(`📁 数据库: psychological_assessment.db`);
            console.log(`🔑 JWT密钥: 已配置`);
            console.log(`🛡️  CORS: 已限制 (${ALLOWED_ORIGINS.length}个来源)`);
            console.log(`🚦 速率限制: API 200次/15分钟, 登录 20次/15分钟`);
            console.log('='.repeat(60));
    console.log('\n📋 可用端点:');
    console.log('  GET  /api/health           # 健康检查');
    console.log('  (已迁移至统一认证)');
    console.log('  (已迁移至统一认证)');
    console.log('  GET  /api/users/me         # 当前用户信息');
    console.log('  GET  /api/assessments      # 测评列表');
    console.log('  GET  /api/assessments/:id  # 测评详情');
    console.log('  POST /api/assessments/:id/start  # 开始测评');
    console.log('  POST /api/assessments/:id/submit # 提交测评');
    console.log('  GET  /api/users/me/results # 用户测评历史');
    console.log('  ---- 管理员端点 ----');
    console.log('  GET  /api/admin/users       # 用户列表');
    console.log('  GET  /api/admin/records     # 所有记录');
    console.log('  GET  /api/users/:id/results # 指定用户记录');
    console.log('='.repeat(60));
    console.log('\n🔑 测试账号:');
    console.log('   邮箱: test1@example.com');
    console.log('   密码: password123');
    console.log('='.repeat(60));
    console.log('✅ 服务器已启动，等待请求...');
        });
    } catch (error) {
        console.error('❌ 服务器启动失败:', error.message);
        process.exit(1);
    }
})();

// 优雅关闭
process.on('SIGINT', async () => {
    console.log('\n⚠️  收到关闭信号，正在清理...');
    await database.close();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n⚠️  收到终止信号，正在清理...');
    await database.close();
    process.exit(0);
});