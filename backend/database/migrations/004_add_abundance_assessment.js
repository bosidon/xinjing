// 添加富足心态测评迁移
const path = require('path');
const projectRoot = path.join(__dirname, '..', '..');
const database = require(path.join(projectRoot, 'database', 'db'));

async function runMigration() {
    console.log('🚀 开始数据库迁移: 添加富足心态测评');
    
    try {
        await database.connect();

        const ABUNDANCE_ID = 8;
        const QUESTION_COUNT = 42;

        // =========================================================
        // 检查测评是否已存在
        // =========================================================
        const existing = await database.get(
            'SELECT id FROM assessments WHERE id = ?',
            [ABUNDANCE_ID]
        );

        if (existing) {
            console.log(`📊 富足心态测评(ID=${ABUNDANCE_ID})已存在，跳过创建`);
        } else {
            // =========================================================
            // 创建富足心态测评
            // =========================================================
            console.log('\n📋 创建富足心态测评...');
            await database.run(`
                INSERT INTO assessments (id, name, description, category, estimated_time, questions_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
                ABUNDANCE_ID,
                '富足心态测评',
                '基于42个维度的富足心态评估，帮助你了解自己在价值认同、给予与接收、自我信念等方面的富足程度。',
                '心理健康',
                15,
                QUESTION_COUNT
            ]);
            console.log(`✅ 富足心态测评创建完成，ID: ${ABUNDANCE_ID}`);
        }

        // =========================================================
        // 插入42道题目
        // =========================================================
        console.log('\n📋 添加富足心态测评题目...');

        const abundanceQuestions = [
            { text: '尊重你的价值和时间', positive: '尊重你的价值和时间', negative: '不尊重你的价值和时间' },
            { text: '自由地给予和接收', positive: '自由地给予和接收', negative: '不给予或敞开地接收' },
            { text: '敞开你的心扉', positive: '敞开你的心扉', negative: '关闭你的心扉' },
            { text: '期待最好的发生', positive: '期待最好的发生', negative: '担心最坏的发生' },
            { text: '发自你的内心', positive: '发自你的内心', negative: '陷入权力斗争' },
            { text: '尽力做得最好', positive: '尽力做得最好', negative: '凑合、将就' },
            { text: '希望每个人都成功，合作共赢', positive: '希望每个人都成功，合作共赢', negative: '竞争' },
            { text: '关注于你如何能为他人服务', positive: '关注于你如何能为他人服务', negative: '只想别人会给你什么' },
            { text: '告诉你自己你为什么能成功', positive: '告诉你自己你为什么能成功', negative: '告诉你自己你为什么不能成功' },
            { text: '出自你的完整性', positive: '出自你的完整性', negative: '折衷你的价值观和理想' },
            { text: '觉察和关注', positive: '觉察和关注', negative: '机械化地运作' },
            { text: '为别人的成功喝彩', positive: '为别人的成功喝彩', negative: '感到别人的成功是种威胁' },
            { text: '拥抱你的挑战', positive: '拥抱你的挑战', negative: '选择安全和舒适超过成长' },
            { text: '让事物自由地离去', positive: '让事物自由地离去', negative: '抓住过去不放' },
            { text: '相信永远也不嫌晚，按照梦想行动', positive: '相信永远也不嫌晚，按照梦想行动', negative: '认为已经太晚了而放弃' },
            { text: '容许自己成为你想成为的', positive: '容许自己成为你想成为的', negative: '等待他人来给你帮助' },
            { text: '相信你的道路是重要的', positive: '相信你的道路是重要的', negative: '不相信你的道路' },
            { text: '做增强你活力的事', positive: '做增强你活力的事', negative: '只为金钱工作' },
            { text: '超然而又投身于你更高的利益', positive: '超然而又投身于你更高的利益', negative: '感到需要或者你必须得到什么' },
            { text: '促成别人富足地给予', positive: '促成别人富足地给予', negative: '依照别人需要来给予别人' },
            { text: '首先做符合你更高目标的事', positive: '首先做符合你更高目标的事', negative: '拖延更高目标的事' },
            { text: '自己是你富足的源泉', positive: '自己是你富足的源泉', negative: '把别人看作富足的依靠' },
            { text: '信仰富足', positive: '信仰富足', negative: '信仰贫乏' },
            { text: '确信自己、自信、自爱', positive: '确信自己、自信、自爱', negative: '担心、害怕、怀疑、自责' },
            { text: '清晰明了的意愿和意志', positive: '清晰明了的意愿和意志', negative: '含糊不明的目标' },
            { text: '追随你的快乐', positive: '追随你的快乐', negative: '强迫自己，"不得不"和"应该"' },
            { text: '用反映你活力的事物围绕自己', positive: '用反映你活力的事物围绕自己', negative: '保留那些不反映你活力的事物' },
            { text: '表示感激和感谢', positive: '表示感激和感谢', negative: '感到这个世界欠你什么' },
            { text: '相信你创造富足的能力', positive: '相信你创造富足的能力', negative: '为财政状况担忧' },
            { text: '遵循你内在的指引', positive: '遵循你内在的指引', negative: '忽略你内在的指引' },
            { text: '寻找大家都成为赢家', positive: '寻找大家都成为赢家', negative: '不关心别人是否也获胜' },
            { text: '成为你自己的权威', positive: '成为你自己的权威', negative: '不相信你内在的智慧' },
            { text: '按照达成目标和幸福来衡量富足', positive: '按照达成目标和幸福来衡量富足', negative: '只以财富来衡量富足' },
            { text: '与享受达到目标一样享受过程', positive: '与享受达到目标一样享受过程', negative: '只做达到目标的事' },
            { text: '明确的协议和目标', positive: '明确的协议和目标', negative: '不表达的或含糊的期待' },
            { text: '关注已经取得多大进展', positive: '关注已经取得多大进展', negative: '关注于你还有多远得走' },
            { text: '谈论富足', positive: '谈论富足', negative: '说困难和缺乏' },
            { text: '记得过去的成功', positive: '记得过去的成功', negative: '记得过去的失败' },
            { text: '发散的无拘束的思维', positive: '发散的无拘束的思维', negative: '有限地思维' },
            { text: '想你将如何创造财富', positive: '想你将如何创造财富', negative: '关注于你如何需要财富' },
            { text: '关注你喜爱和想要的', positive: '关注你喜爱和想要的', negative: '关注你不想要的' },
            { text: '允许你自己拥有', positive: '允许你自己拥有', negative: '感到你不配' }
        ];

        // Scale options for 富足心态测评 (1=完全符合负面, 5=完全符合正面)
        const scaleOptions = JSON.stringify({
            '1': '完全符合负面',
            '2': '部分符合负面',
            '3': '不确定',
            '4': '部分符合正面',
            '5': '完全符合正面'
        });

        let insertCount = 0;
        for (let i = 0; i < abundanceQuestions.length; i++) {
            const q = abundanceQuestions[i];
            // Check by question text for idempotency
            const existing = await database.get(
                'SELECT id FROM questions WHERE assessment_id = ? AND question_text = ?',
                [ABUNDANCE_ID, q.text]
            );
            if (!existing) {
                await database.run(`
                    INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                    VALUES (?, ?, 'scale', ?, 1, ?)
                `, [ABUNDANCE_ID, q.text, scaleOptions, i + 1]);
                insertCount++;
            }
        }
        console.log(`✅ 富足心态测评新增题目完成: ${insertCount} 题`);

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
        `, [ABUNDANCE_ID]);
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
        `, [ABUNDANCE_ID]);
        
        if (assessment) {
            console.log(`   ${assessment.id}. ${assessment.name}`);
            console.log(`      题目数: ${assessment.actual_questions}/${assessment.questions_count}`);
        }

        console.log('\n🎉 富足心态测评迁移完成！');
        
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
