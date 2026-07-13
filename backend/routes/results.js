const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// 获取用户的所有测评结果
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const results = await db.query(`
            SELECT 
                ar.*,
                a.name as assessment_name,
                a.code as assessment_code,
                a.category as assessment_category
            FROM assessment_results ar
            JOIN assessments a ON ar.assessment_id = a.id
            WHERE ar.user_id = ?
            ORDER BY ar.created_at DESC
            LIMIT 100
        `, [userId]);
        
        res.json({
            success: true,
            data: results,
            count: results.length
        });
    } catch (error) {
        next(error);
    }
});

// 获取单个测评结果的详细信息
router.get('/:resultId', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { resultId } = req.params;
        
        const result = await db.get(`
            SELECT 
                ar.*,
                a.name as assessment_name,
                a.code as assessment_code,
                a.category as assessment_category,
                a.description as assessment_description
            FROM assessment_results ar
            JOIN assessments a ON ar.assessment_id = a.id
            WHERE ar.id = ? AND ar.user_id = ?
        `, [resultId, userId]);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                error: '测评结果不存在'
            });
        }
        
        // 获取答题详情
        const answers = await db.query(`
            SELECT 
                ua.*,
                q.question_text,
                q.question_number,
                q.question_type,
                q.dimension
            FROM user_answers ua
            JOIN questions q ON ua.question_id = q.id
            WHERE ua.result_id = ?
            ORDER BY q.question_number
        `, [resultId]);
        
        // 生成详细报告
        const report = generateReport(result, answers);
        
        res.json({
            success: true,
            data: {
                ...result,
                answers,
                report
            }
        });
    } catch (error) {
        next(error);
    }
});

// 删除测评结果
router.delete('/:resultId', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { resultId } = req.params;
        
        // 验证结果所有权
        const result = await db.get(`
            SELECT id FROM assessment_results 
            WHERE id = ? AND user_id = ?
        `, [resultId, userId]);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                error: '测评结果不存在或无权访问'
            });
        }
        
        // 开始事务
        await db.transaction(async (transactionDb) => {
            // 删除相关答案
            await transactionDb.run(`
                DELETE FROM user_answers 
                WHERE result_id = ?
            `, [resultId]);
            
            // 删除结果
            await transactionDb.run(`
                DELETE FROM assessment_results 
                WHERE id = ?
            `, [resultId]);
        });
        
        res.json({
            success: true,
            data: {
                message: '测评结果已删除'
            }
        });
    } catch (error) {
        next(error);
    }
});

// 生成报告的函数
function generateReport(result, answers) {
    const { assessment_code, total_score } = result;
    
    let report = {
        summary: result.result_summary || '',
        details: {},
        recommendations: [],
        insights: []
    };
    
    switch (assessment_code) {
        case 'MBTI':
            // MBTI报告生成
            const dimensions = {
                'E/I': { E: 0, I: 0 },
                'S/N': { S: 0, N: 0 },
                'T/F': { T: 0, F: 0 },
                'J/P': { J: 0, P: 0 }
            };
            
            // 分析每个维度的得分
            answers.forEach(answer => {
                const dimension = answer.dimension;
                if (dimensions[dimension]) {
                    // 简化处理：假设A选项对应第一个字母，B选项对应第二个字母
                    if (answer.answer_value === '0') {
                        dimensions[dimension][dimension.split('/')[0]]++;
                    } else if (answer.answer_value === '1') {
                        dimensions[dimension][dimension.split('/')[1]]++;
                    }
                }
            });
            
            // 确定MBTI类型
            let mbtiType = '';
            Object.keys(dimensions).forEach(dim => {
                const [first, second] = dim.split('/');
                if (dimensions[dim][first] >= dimensions[dim][second]) {
                    mbtiType += first;
                } else {
                    mbtiType += second;
                }
            });
            
            report.details = {
                mbtiType,
                dimensions,
                score: total_score
            };
            
            report.recommendations = [
                '了解自己的性格优势，发挥长处',
                '探索适合' + mbtiType + '性格的职业方向',
                '学习与不同性格类型的人沟通',
                '定期进行性格发展评估'
            ];
            
            report.insights = [
                '您的性格类型表明您可能在某些方面有独特优势',
                '了解性格偏好有助于更好的人际关系',
                '性格类型不是限制，而是自我认知的工具'
            ];
            break;
            
        case 'PHQ-9':
            // PHQ-9报告生成
            const severity = getDepressionSeverity(total_score);
            
            report.details = {
                score: total_score,
                severity,
                interpretation: '该分数仅供参考，如需专业帮助请咨询心理医生或精神科医生'
            };
            
            report.recommendations = [
                '保持规律的作息时间',
                '每天进行适度的体育锻炼',
                '与亲友保持联系和沟通',
                '尝试放松技巧，如深呼吸、冥想',
                '如症状持续或加重，建议寻求专业帮助'
            ];
            
            if (total_score >= 10) {
                report.recommendations.push('考虑咨询专业心理咨询师');
                report.recommendations.push('如有自杀念头，请立即联系危机干预热线');
            }
            
            report.insights = [
                '抑郁症状是常见的心理健康问题',
                '早期识别和干预有助于恢复',
                '寻求帮助是勇敢和明智的选择'
            ];
            break;
            
        case 'Holland':
            // 霍兰德报告生成
            const hollandTypes = {
                'R': { name: '现实型', score: 0 },
                'I': { name: '研究型', score: 0 },
                'A': { name: '艺术型', score: 0 },
                'S': { name: '社会型', score: 0 },
                'E': { name: '企业型', score: 0 },
                'C': { name: '常规型', score: 0 }
            };
            
            // 计算各类型得分
            answers.forEach(answer => {
                const type = answer.dimension;
                if (hollandTypes[type]) {
                    // 将答案转换为分数（0-4）
                    const score = parseInt(answer.answer_value) || 0;
                    hollandTypes[type].score += score;
                }
            });
            
            // 找出得分最高的类型
            const sortedTypes = Object.entries(hollandTypes)
                .sort((a, b) => b[1].score - a[1].score);
            
            const primaryType = sortedTypes[0];
            const secondaryType = sortedTypes[1];
            
            report.details = {
                scores: hollandTypes,
                primaryType: {
                    code: primaryType[0],
                    name: primaryType[1].name,
                    score: primaryType[1].score
                },
                secondaryType: {
                    code: secondaryType[0],
                    name: secondaryType[1].name,
                    score: secondaryType[1].score
                },
                totalScore: total_score
            };
            
            report.recommendations = [
                `探索${primaryType[1].name}相关的职业领域`,
                `结合${secondaryType[1].name}的特点发展综合能力`,
                '参加职业兴趣工作坊或咨询',
                '实习或兼职体验相关职业'
            ];
            
            report.insights = [
                '职业兴趣会随着经历和成长而变化',
                '结合兴趣和能力选择职业更容易获得满足感',
                '多元化的兴趣有助于职业发展'
            ];
            break;
            
        default:
            report.details = {
                score: total_score,
                interpretation: '测评已完成，感谢您的参与'
            };
            report.recommendations = ['定期进行自我评估，了解自身变化'];
    }
    
    return report;
}

// 获取抑郁严重程度
function getDepressionSeverity(score) {
    if (score <= 4) return { level: '无抑郁症状', description: '您的抑郁症状在正常范围内' };
    if (score <= 9) return { level: '轻度抑郁', description: '可能有轻度抑郁症状' };
    if (score <= 14) return { level: '中度抑郁', description: '有明显抑郁症状' };
    if (score <= 19) return { level: '中重度抑郁', description: '有较严重抑郁症状' };
    return { level: '重度抑郁', description: '有严重抑郁症状，建议立即寻求专业帮助' };
}

module.exports = router;