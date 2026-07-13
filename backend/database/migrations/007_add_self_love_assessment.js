// 添加自爱能力测评迁移
const path = require('path');
const projectRoot = path.join(__dirname, '..', '..');
const database = require(path.join(projectRoot, 'database', 'db'));

async function runMigration() {
    console.log('🚀 开始数据库迁移: 添加自爱能力测评');
    
    try {
        await database.connect();

        const SELF_LOVE_ID = 9;
        const QUESTION_COUNT = 26;

        // =========================================================
        // 检查测评是否已存在
        // =========================================================
        const existing = await database.get(
            'SELECT id FROM assessments WHERE id = ?',
            [SELF_LOVE_ID]
        );

        if (existing) {
            console.log(`📊 自爱能力测评(ID=${SELF_LOVE_ID})已存在，跳过创建`);
        } else {
            // =========================================================
            // 创建自爱能力测评
            // =========================================================
            console.log('\n📋 创建自爱能力测评...');
            await database.run(`
                INSERT INTO assessments (id, name, description, category, estimated_time, questions_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
                SELF_LOVE_ID,
                '自爱能力测评',
                '基于自我关怀(Self-Compassion)理论的自爱能力评估，帮助你了解自己在自我接纳、自我关怀、边界意识、内在肯定、情绪接纳和自我成长六个维度的自爱水平。',
                '心理健康',
                10,
                QUESTION_COUNT
            ]);
            console.log(`✅ 自爱能力测评创建完成，ID: ${SELF_LOVE_ID}`);
        }

        // =========================================================
        // 插入26道题目（6个维度）
        // =========================================================
        console.log('\n📋 添加自爱能力测评题目...');

        const selfLoveQuestions = [
            { dimension: '自我接纳', text: '我能坦然接受自己的缺点和不足' },
            { dimension: '自我接纳', text: '即使犯错，我也不会过度自我批评' },
            { dimension: '自我接纳', text: '我不需要用完美来证明自己的价值' },
            { dimension: '自我接纳', text: '我接受自己某些方面就是不如别人' },
            { dimension: '自我接纳', text: '失败时我会对自己说"没关系，下次继续努力"' },
            { dimension: '自我关怀', text: '当我感到痛苦时，我会温柔地对待自己' },
            { dimension: '自我关怀', text: '我像对待好朋友一样关心和安慰自己' },
            { dimension: '自我关怀', text: '情绪低落时我有能力安抚自己' },
            { dimension: '自我关怀', text: '我允许自己有脆弱和难过的时刻' },
            { dimension: '自我关怀', text: '我很少因为过去的错误而反复责备自己' },
            { dimension: '边界意识', text: '我能够对他人的无理要求说"不"' },
            { dimension: '边界意识', text: '即使对方不高兴，我也会坚持维护自己的边界' },
            { dimension: '边界意识', text: '我不会为了讨好他人而牺牲自己的需求' },
            { dimension: '边界意识', text: '我知道什么时候该保护自己的精力和时间' },
            { dimension: '内在肯定', text: '我不需要别人的认可也能觉得自己很好' },
            { dimension: '内在肯定', text: '我的自我价值不依赖于他人的评价' },
            { dimension: '内在肯定', text: '独处时我也能感受到自己内心的充实' },
            { dimension: '内在肯定', text: '我认可自己取得的每一个进步，不论大小' },
            { dimension: '情绪接纳', text: '我允许自己有负面情绪，不会因此否定自己' },
            { dimension: '情绪接纳', text: '当感到愤怒或嫉妒时，我首先接纳而不是压抑' },
            { dimension: '情绪接纳', text: '我理解负面情绪也是自我的一部分' },
            { dimension: '情绪接纳', text: '我不需要用"正能量"来掩盖真实的感受' },
            { dimension: '自我成长', text: '我愿意为自己投入时间和金钱来成长' },
            { dimension: '自我成长', text: '我定期做那些只为自己开心的事情' },
            { dimension: '自我成长', text: '我关注自己的身心健康' },
            { dimension: '自我成长', text: '我为自己的需求和感受留出空间' }
        ];

        // Scale options for 自爱能力测评 (1=完全不符合, 5=完全符合)
        const scaleOptions = JSON.stringify({
            '1': '完全不符合',
            '2': '基本不符合',
            '3': '有时符合',
            '4': '基本符合',
            '5': '完全符合'
        });

        let insertCount = 0;
        for (let i = 0; i < selfLoveQuestions.length; i++) {
            const q = selfLoveQuestions[i];
            // Check by question text for idempotency
            const existing = await database.get(
                'SELECT id FROM questions WHERE assessment_id = ? AND question_text = ?',
                [SELF_LOVE_ID, q.text]
            );
            if (!existing) {
                await database.run(`
                    INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                    VALUES (?, ?, 'scale', ?, 1, ?)
                `, [SELF_LOVE_ID, q.text, scaleOptions, i + 1]);
                insertCount++;
            }
        }
        console.log(`✅ 自爱能力测评新增题目完成: ${insertCount} 题`);

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
            WHERE id = ?
        `, [SELF_LOVE_ID]);
        console.log('✅ 测评题目数量更新完成');

        // =========================================================
        // 显示结果
        // =========================================================
        console.log('\n📊 迁移结果统计:');
        const assessment = await database.get(`
            SELECT a.id, a.name, a.questions_count,
                   (SELECT COUNT(*) FROM questions q WHERE q.assessment_id = a.id) as actual_questions
            FROM assessments a
            WHERE a.id = ?
        `, [SELF_LOVE_ID]);
        
        if (assessment) {
            console.log(`   ${assessment.id}. ${assessment.name}`);
            console.log(`      题目数: ${assessment.actual_questions}/${assessment.questions_count}`);
        }

        console.log('\n🎉 自爱能力测评迁移完成！');
        
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
