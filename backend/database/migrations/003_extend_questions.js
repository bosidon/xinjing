// 扩展题目数量迁移 - 增加MBTI、霍兰德、大五人格、情商测试的题目
const path = require('path');
const projectRoot = path.join(__dirname, '..', '..');
const database = require(path.join(projectRoot, 'database', 'db'));

async function runMigration() {
    console.log('🚀 开始数据库迁移: 扩展测评题目数量');
    
    try {
        await database.connect();

        const mbtiId = 1;
        const hollandId = 3;
        const big5Id = 6;
        const eqId = 7;

        // =========================================================
        // 1. MBTI性格类型测试: 12→24题 (+12)
        // =========================================================
        console.log('\n📋 扩展MBTI性格类型测试题目...');
        
        const mbtiTotal = await database.get(
            'SELECT COUNT(*) as count FROM questions WHERE assessment_id = ?',
            [mbtiId]
        );
        
        if (mbtiTotal.count < 24) {
            const mbtiMaxOrder = await database.get(
                'SELECT MAX(order_index) as maxOrder FROM questions WHERE assessment_id = ?',
                [mbtiId]
            );
            const mbtiStartOrder = (mbtiMaxOrder.maxOrder || 0) + 1;

            const mbtiNewQuestions = [
                // ===== 新增 E/I 维度 (3题) =====
                { text: '在聚会上，你更倾向于：', options: JSON.stringify({'A': '主动穿梭于各个圈子与人交谈', 'B': '与一两位熟人深入聊天', 'C': '找个安静的角落观察大家'}) },
                { text: '你更喜欢的交流方式是：', options: JSON.stringify({'A': '面谈或电话，实时互动', 'B': '文字消息，有思考时间', 'C': '看对方习惯，都可以'}) },
                { text: '团队讨论时，你通常是：', options: JSON.stringify({'A': '积极发表意见的人', 'B': '听完大家意见后再补充', 'C': '更习惯私下表达想法'}) },
                // ===== 新增 S/N 维度 (3题) =====
                { text: '阅读一本非虚构书籍时，你更关注：', options: JSON.stringify({'A': '具体案例和数据', 'B': '背后的原理和模式', 'C': '能引发思考的新观点'}) },
                { text: '你更擅长记忆：', options: JSON.stringify({'A': '发生过的事实和细节', 'B': '故事的情节和感受', 'C': '概念之间的联系'}) },
                { text: '描写一个场景时，你更倾向于：', options: JSON.stringify({'A': '准确描述事物本身', 'B': '加入自己的联想和想象', 'C': '关注当时的气氛和感受'}) },
                // ===== 新增 T/F 维度 (4题) =====
                { text: '收到批评时，你首先关注的是：', options: JSON.stringify({'A': '对方说的是否有道理', 'B': '对方的态度是否友善', 'C': '自己是否被理解了'}) },
                { text: '选择礼物时，你更看重：', options: JSON.stringify({'A': '礼物的实用性和价值', 'B': '礼物蕴含的情感和心意', 'C': '礼物是否让对方惊喜'}) },
                { text: '读书或看电影时，你更在意：', options: JSON.stringify({'A': '逻辑是否严谨，情节是否合理', 'B': '角色的情感和内心世界', 'C': '画面美感和氛围营造'}) },
                { text: '别人找你倾诉时，你通常：', options: JSON.stringify({'A': '帮忙分析问题所在', 'B': '先安慰情绪再说事情', 'C': '倾听为主，偶尔回应'}) },
                // ===== 新增 J/P 维度 (2题) =====
                { text: '你更喜欢哪种时间安排？', options: JSON.stringify({'A': '提前规划好每一天', 'B': '有大致计划但灵活调整', 'C': '随性安排，想到什么做什么'}) },
                { text: '你如何处理已完成的任务？', options: JSON.stringify({'A': '确认完成后立刻归档收尾', 'B': '完成了就放一边，有时候忘了归档', 'C': '一般同时开着好几个任务'}) }
            ];

            let insertCount = 0;
            for (let i = 0; i < mbtiNewQuestions.length; i++) {
                const q = mbtiNewQuestions[i];
                // Check by question text to ensure idempotency
                const existing = await database.get(
                    'SELECT id FROM questions WHERE assessment_id = ? AND question_text = ?',
                    [mbtiId, q.text]
                );
                if (!existing) {
                    await database.run(`
                        INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                        VALUES (?, ?, 'single_choice', ?, 1, ?)
                    `, [mbtiId, q.text, q.options, mbtiStartOrder + insertCount]);
                    insertCount++;
                }
            }
            console.log(`✅ MBTI新增题目完成: ${insertCount} 题`);
        } else {
            console.log('📊 MBTI题目已扩展，跳过');
        }

        // =========================================================
        // 3. 霍兰德职业兴趣测试: 6→12题 (+6)
        // =========================================================
        console.log('\n📋 扩展霍兰德职业兴趣测试题目...');
        
        const hollandTotal = await database.get(
            'SELECT COUNT(*) as count FROM questions WHERE assessment_id = ?',
            [hollandId]
        );
        
        if (hollandTotal.count < 12) {
            const hollandMaxOrder = await database.get(
                'SELECT MAX(order_index) as maxOrder FROM questions WHERE assessment_id = ?',
                [hollandId]
            );
            const hollandStartOrder = (hollandMaxOrder.maxOrder || 0) + 1;

            const hollandOptions = JSON.stringify({
                'A': '非常喜欢',
                'B': '比较喜欢',
                'C': '一般',
                'D': '不太喜欢'
            });

            const hollandNewQuestions = [
                { text: '你喜欢使用工具或操作机器来完成工作吗？' },
                { text: '你喜欢分析数据或寻找问题的答案吗？' },
                { text: '你喜欢通过绘画、写作或音乐表达情感吗？' },
                { text: '你喜欢帮助他人学习或成长吗？' },
                { text: '你喜欢推销产品或说服他人吗？' },
                { text: '你喜欢整理和分类信息或物品吗？' }
            ];

            let insertCount = 0;
            for (let i = 0; i < hollandNewQuestions.length; i++) {
                const q = hollandNewQuestions[i];
                const existing = await database.get(
                    'SELECT id FROM questions WHERE assessment_id = ? AND question_text = ?',
                    [hollandId, q.text]
                );
                if (!existing) {
                    await database.run(`
                        INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                        VALUES (?, ?, 'single_choice', ?, 1, ?)
                    `, [hollandId, q.text, hollandOptions, hollandStartOrder + insertCount]);
                    insertCount++;
                }
            }
            console.log(`✅ 霍兰德新增题目完成: ${insertCount} 题`);
        } else {
            console.log('📊 霍兰德题目已扩展，跳过');
        }

        // =========================================================
        // 6. 大五人格测试: 10→20题 (+10)
        // =========================================================
        console.log('\n📋 扩展大五人格测试题目...');
        
        const big5Total = await database.get(
            'SELECT COUNT(*) as count FROM questions WHERE assessment_id = ?',
            [big5Id]
        );
        
        if (big5Total.count < 20) {
            const big5MaxOrder = await database.get(
                'SELECT MAX(order_index) as maxOrder FROM questions WHERE assessment_id = ?',
                [big5Id]
            );
            const big5StartOrder = (big5MaxOrder.maxOrder || 0) + 1;

            const big5Options = JSON.stringify({
                '1': '非常不同意',
                '2': '不同意',
                '3': '中立',
                '4': '同意',
                '5': '非常同意'
            });

            const big5NewQuestions = [
                { text: '我乐于成为大家关注的焦点', weight: 1 },
                { text: '我喜欢参加热闹的社交活动', weight: 1 },
                { text: '我相信大部分人都是善意的', weight: 1 },
                { text: '我愿意主动帮助遇到困难的人', weight: 1 },
                { text: '我会按时完成分配给我的任务', weight: 1 },
                { text: '我做事粗心，经常忽略细节', weight: -1 },
                { text: '我很容易感到紧张和焦虑', weight: 1 },
                { text: '面对压力时我很难放松', weight: 1 },
                { text: '我喜欢探索新的地方和体验', weight: 1 },
                { text: '我对艺术性的活动不太感兴趣', weight: -1 }
            ];

            let insertCount = 0;
            for (let i = 0; i < big5NewQuestions.length; i++) {
                const q = big5NewQuestions[i];
                const existing = await database.get(
                    'SELECT id FROM questions WHERE assessment_id = ? AND question_text = ?',
                    [big5Id, q.text]
                );
                if (!existing) {
                    await database.run(`
                        INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                        VALUES (?, ?, 'scale', ?, ?, ?)
                    `, [big5Id, q.text, big5Options, q.weight, big5StartOrder + insertCount]);
                    insertCount++;
                }
            }
            console.log(`✅ 大五人格新增题目完成: ${insertCount} 题`);
        } else {
            console.log('📊 大五人格题目已扩展，跳过');
        }

        // =========================================================
        // 7. 情商(EQ)测试: 10→20题 (+10)
        // =========================================================
        console.log('\n📋 扩展情商(EQ)测试题目...');
        
        const eqTotal = await database.get(
            'SELECT COUNT(*) as count FROM questions WHERE assessment_id = ?',
            [eqId]
        );
        
        if (eqTotal.count < 20) {
            const eqMaxOrder = await database.get(
                'SELECT MAX(order_index) as maxOrder FROM questions WHERE assessment_id = ?',
                [eqId]
            );
            const eqStartOrder = (eqMaxOrder.maxOrder || 0) + 1;

            const eqOptions = JSON.stringify({
                '1': '完全不符合',
                '2': '基本不符合',
                '3': '有时符合',
                '4': '基本符合',
                '5': '完全符合'
            });

            const eqNewQuestions = [
                { text: '我能识别自己的情绪变化及其原因' },
                { text: '我知道什么事情会触发我的负面情绪' },
                { text: '我能从他人的语调中察觉他们的真实感受' },
                { text: '我能理解为什么他人会有某种行为或反应' },
                { text: '我能很好地处理批评和负面反馈' },
                { text: '情绪不好时我懂得如何让自己平静下来' },
                { text: '我能轻松地与陌生人建立良好的第一印象' },
                { text: '我能根据不同的社交场合调整自己的言行' },
                { text: '即使遇到挫折我也会坚持追求自己的目标' },
                { text: '我常常主动学习新知识来提升自己' }
            ];

            let insertCount = 0;
            for (let i = 0; i < eqNewQuestions.length; i++) {
                const q = eqNewQuestions[i];
                const existing = await database.get(
                    'SELECT id FROM questions WHERE assessment_id = ? AND question_text = ?',
                    [eqId, q.text]
                );
                if (!existing) {
                    await database.run(`
                        INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                        VALUES (?, ?, 'scale', ?, 1, ?)
                    `, [eqId, q.text, eqOptions, eqStartOrder + insertCount]);
                    insertCount++;
                }
            }
            console.log(`✅ 情商测试新增题目完成: ${insertCount} 题`);
        } else {
            console.log('📊 情商测试题目已扩展，跳过');
        }

        // =========================================================
        // 更新 assessment questions_count
        // =========================================================
        console.log('\n🔄 更新测评题目数量...');
        await database.run(`
            UPDATE assessments 
            SET questions_count = (
                SELECT COUNT(*) FROM questions 
                WHERE questions.assessment_id = assessments.id
            )
            WHERE id IN (1, 3, 6, 7)
        `);
        console.log('✅ 测评题目数量更新完成');

        // =========================================================
        // 显示结果
        // =========================================================
        console.log('\n📊 迁移结果统计:');
        const assessments = await database.all(`
            SELECT a.id, a.name, a.questions_count,
                   COUNT(q.id) as actual_questions
            FROM assessments a
            LEFT JOIN questions q ON a.id = q.assessment_id
            WHERE a.id IN (1, 3, 6, 7)
            GROUP BY a.id
            ORDER BY a.id
        `);
        
        assessments.forEach(assessment => {
            console.log(`   ${assessment.id}. ${assessment.name}`);
            console.log(`      题目数: ${assessment.actual_questions}/${assessment.questions_count}`);
        });
        
        console.log('\n🎉 扩展题目数量迁移完成！');
        
    } catch (error) {
        console.error('❌ 迁移失败:', error.message);
        throw error;
    } finally {
        await database.close();
    }
}

if (require.main === module) {
    runMigration().catch(error => {
        console.error('迁移脚本执行失败:', error);
        process.exit(1);
    });
}

module.exports = runMigration;
