const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// 获取所有测评列表
router.get('/', async (req, res, next) => {
  try {
    const assessments = await db.query(`
      SELECT id, code, name, description, category, estimated_time, questions_count, scoring_method
      FROM assessments 
      WHERE is_active = 1
      ORDER BY category, name
    `);
    
    res.json({
      success: true,
      data: assessments,
      count: assessments.length
    });
  } catch (error) {
    next(error);
  }
});

// 获取单个测评详情
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const assessment = await db.get(`
      SELECT * FROM assessments WHERE id = ? AND is_active = 1
    `, [id]);
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: '测评不存在'
      });
    }
    
    // 获取测评的所有题目
    const questions = await db.query(`
      SELECT id, question_number, question_text, question_type, options, dimension
      FROM questions 
      WHERE assessment_id = ?
      ORDER BY question_number
    `, [id]);
    
    res.json({
      success: true,
      data: {
        ...assessment,
        questions
      }
    });
  } catch (error) {
    next(error);
  }
});

// 开始一个新的测评
router.post('/:id/start', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // 检查测评是否存在
    const assessment = await db.get(`
      SELECT id FROM assessments WHERE id = ? AND is_active = 1
    `, [id]);
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: '测评不存在'
      });
    }
    
    // 创建新的测评结果记录
    const result = await db.run(`
      INSERT INTO assessment_results (user_id, assessment_id, start_time)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [userId, id]);
    
    res.status(201).json({
      success: true,
      data: {
        resultId: result.lastID,
        message: '测评已开始'
      }
    });
  } catch (error) {
    next(error);
  }
});

// 提交测评答案
router.post('/:id/submit', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { resultId, answers } = req.body;
    
    if (!resultId || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: '参数错误'
      });
    }
    
    // 验证测评结果记录
    const result = await db.get(`
      SELECT * FROM assessment_results 
      WHERE id = ? AND user_id = ? AND assessment_id = ? AND is_completed = 0
    `, [resultId, userId, id]);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '测评记录不存在或已完成'
      });
    }
    
    // 开始事务
    await db.transaction(async (transactionDb) => {
      let totalScore = 0;
      
      // 保存每个答案并计算得分
      for (const answer of answers) {
        const { questionId, answerValue } = answer;
        
        // 这里应该根据测评的评分方法来计算得分
        // 简化处理：对于量表题，答案值就是得分
        let score = 0;
        if (typeof answerValue === 'number') {
          score = answerValue;
        }
        
        await transactionDb.run(`
          INSERT INTO user_answers (result_id, question_id, answer_value, score)
          VALUES (?, ?, ?, ?)
        `, [resultId, questionId, answerValue.toString(), score]);
        
        totalScore += score;
      }
      
      // 更新测评结果
      await transactionDb.run(`
        UPDATE assessment_results 
        SET end_time = CURRENT_TIMESTAMP, 
            total_score = ?,
            raw_data = ?,
            is_completed = 1
        WHERE id = ?
      `, [totalScore, JSON.stringify(answers), resultId]);
      
      // 根据测评类型生成结果摘要
      const assessment = await transactionDb.get(`
        SELECT code, name FROM assessments WHERE id = ?
      `, [id]);
      
      let resultSummary = '';
      if (assessment.code === 'MBTI') {
        // MBTI评分逻辑
        resultSummary = '您的MBTI性格类型分析已完成';
      } else if (assessment.code === 'PHQ-9') {
        // PHQ-9评分逻辑
        if (totalScore <= 4) {
          resultSummary = '无抑郁症状';
        } else if (totalScore <= 9) {
          resultSummary = '轻度抑郁';
        } else if (totalScore <= 14) {
          resultSummary = '中度抑郁';
        } else if (totalScore <= 19) {
          resultSummary = '中重度抑郁';
        } else {
          resultSummary = '重度抑郁';
        }
      }
      
      await transactionDb.run(`
        UPDATE assessment_results 
        SET result_summary = ?
        WHERE id = ?
      `, [resultSummary, resultId]);
    });
    
    res.json({
      success: true,
      data: {
        resultId,
        message: '测评提交成功',
        summary: '测评结果已生成，请查看详细报告'
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取测评结果
router.get('/:id/results/:resultId', authenticateToken, async (req, res, next) => {
  try {
    const { id, resultId } = req.params;
    const userId = req.user.id;
    
    const result = await db.get(`
      SELECT ar.*, a.name as assessment_name, a.code as assessment_code
      FROM assessment_results ar
      JOIN assessments a ON ar.assessment_id = a.id
      WHERE ar.id = ? AND ar.user_id = ? AND ar.assessment_id = ?
    `, [resultId, userId, id]);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '测评结果不存在'
      });
    }
    
    // 获取答题详情
    const answers = await db.query(`
      SELECT ua.*, q.question_text, q.question_number
      FROM user_answers ua
      JOIN questions q ON ua.question_id = q.id
      WHERE ua.result_id = ?
      ORDER BY q.question_number
    `, [resultId]);
    
    // 生成详细报告
    const report = generateDetailedReport(result, answers);
    
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

// 生成详细报告的函数
function generateDetailedReport(result, answers) {
  const { assessment_code, total_score } = result;
  
  let report = {
    summary: result.result_summary || '',
    details: {},
    recommendations: []
  };
  
  switch (assessment_code) {
    case 'MBTI':
      report.details = {
        score: total_score,
        interpretation: '基于您的回答，系统分析了您的性格偏好'
      };
      report.recommendations = [
        '了解自己的性格优势',
        '探索适合的职业方向',
        '改善人际关系沟通'
      ];
      break;
      
    case 'PHQ-9':
      report.details = {
        score: total_score,
        severity: getDepressionSeverity(total_score),
        interpretation: '该分数仅供参考，如需专业帮助请咨询心理医生'
      };
      report.recommendations = [
        '保持规律作息',
        '适当进行体育锻炼',
        '与亲友保持联系',
        '如症状持续，建议寻求专业帮助'
      ];
      break;
      
    default:
      report.details = {
        score: total_score,
        interpretation: '测评已完成，感谢您的参与'
      };
  }
  
  return report;
}

function getDepressionSeverity(score) {
  if (score <= 4) return '无抑郁症状';
  if (score <= 9) return '轻度抑郁';
  if (score <= 14) return '中度抑郁';
  if (score <= 19) return '中重度抑郁';
  return '重度抑郁';
}

module.exports = router;