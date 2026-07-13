// 扩展测评数据迁移 - 添加SAS、GAD-7、大五人格、情商测试
const path = require('path');
const projectRoot = path.join(__dirname, '..', '..');
const database = require(path.join(projectRoot, 'database', 'db'));

async function runMigration() {
    console.log('🚀 开始数据库迁移: 扩展测评数据');
    
    try {
        await database.connect();
        
        // 检查测评是否已存在
        const existingAssessments = await database.all('SELECT id, name FROM assessments WHERE id IN (4,5,6,7)');
        const existingIds = existingAssessments.map(a => a.id);
        console.log('📊 已存在的测评ID:', existingIds);
        
        // =========================================================
        // 4. SAS焦虑自评量表 (20题, scale 1-4)
        // =========================================================
        if (!existingIds.includes(4)) {
            console.log('📋 创建SAS焦虑自评量表...');
            const sasResult = await database.run(`
                INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [
                'SAS焦虑自评量表',
                '焦虑自评量表(Self-Rating Anxiety Scale, SAS)是广泛应用于焦虑症状评估的自评工具，包含20个项目，反映焦虑的主观感受。',
                '心理健康',
                20,
                20
            ]);
            const sasId = sasResult.lastID;
            console.log(`✅ SAS测评创建完成，ID: ${sasId}`);

            const sasQuestions = [
                { text: '我觉得比平常容易紧张和着急（焦虑）', reverse: false },
                { text: '我无缘无故地感到害怕（害怕）', reverse: false },
                { text: '我容易心里烦乱或觉得惊恐（惊恐）', reverse: false },
                { text: '我觉得我可能将要发疯（发疯感）', reverse: false },
                { text: '我觉得一切都很好，也不会发生什么不幸（不幸预感）', reverse: true },
                { text: '我手脚发抖打颤（手足颤抖）', reverse: false },
                { text: '我因为头痛、颈痛和背痛而苦恼（躯体疼痛）', reverse: false },
                { text: '我感觉容易衰弱和疲乏（乏力）', reverse: false },
                { text: '我觉得心平气和，并且容易安静坐着（静坐不能）', reverse: true },
                { text: '我觉得心跳很快（心悸）', reverse: false },
                { text: '我因为一阵阵头晕而苦恼（头昏）', reverse: false },
                { text: '我有晕倒发作或觉得要晕倒似的（晕厥感）', reverse: false },
                { text: '我吸气呼气都感到很容易（呼吸困难）', reverse: true },
                { text: '我手脚麻木和刺痛（手足刺痛）', reverse: false },
                { text: '我因为胃痛和消化不良而苦恼（胃痛或消化不良）', reverse: false },
                { text: '我常常要小便（尿意尿频）', reverse: false },
                { text: '我的手常常是干燥温暖的（多汗）', reverse: true },
                { text: '我脸红发热（面部潮红）', reverse: false },
                { text: '我容易入睡并且一夜睡得很好（睡眠障碍）', reverse: true },
                { text: '我做噩梦（噩梦）', reverse: false }
            ];

            const sasOptions = JSON.stringify({
                '1': '没有或很少',
                '2': '有时',
                '3': '大部分时间',
                '4': '几乎总是'
            });

            for (let i = 0; i < sasQuestions.length; i++) {
                const q = sasQuestions[i];
                await database.run(`
                    INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [sasId, q.text, 'scale', sasOptions, q.reverse ? -1 : 1, i + 1]);
            }
            console.log(`✅ SAS题目播种完成: ${sasQuestions.length} 题`);
        } else {
            console.log('📊 SAS测评已存在，跳过');
        }

        // =========================================================
        // 5. GAD-7广泛性焦虑障碍量表 (7题, scale 0-3)
        // =========================================================
        if (!existingIds.includes(5)) {
            console.log('📋 创建GAD-7广泛性焦虑障碍量表...');
            const gad7Result = await database.run(`
                INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [
                'GAD-7广泛性焦虑障碍量表',
                '广泛性焦虑障碍量表(Generalized Anxiety Disorder-7)是一种用于筛查广泛性焦虑障碍的评估工具，评估过去两周内焦虑症状的频率。',
                '心理健康',
                10,
                7
            ]);
            const gad7Id = gad7Result.lastID;
            console.log(`✅ GAD-7测评创建完成，ID: ${gad7Id}`);

            const gad7Questions = [
                '感觉紧张、焦虑或急切',
                '不能停止或控制担忧',
                '对各种各样的事情担忧过多',
                '很难放松下来',
                '由于不安而无法静坐',
                '变得容易烦恼或急躁',
                '感到似乎将有可怕的事情发生而害怕'
            ];

            const gad7Options = JSON.stringify({
                '0': '完全没有',
                '1': '有几天',
                '2': '一半以上天数',
                '3': '几乎每天'
            });

            for (let i = 0; i < gad7Questions.length; i++) {
                await database.run(`
                    INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [gad7Id, gad7Questions[i], 'scale', gad7Options, 1, i + 1]);
            }
            console.log(`✅ GAD-7题目播种完成: ${gad7Questions.length} 题`);
        } else {
            console.log('📊 GAD-7测评已存在，跳过');
        }

        // =========================================================
        // 6. 大五人格测试 (mini-IPIP, 10题, scale 1-5)
        // =========================================================
        if (!existingIds.includes(6)) {
            console.log('📋 创建大五人格测试...');
            const big5Result = await database.run(`
                INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [
                '大五人格测试(OCEAN)',
                    '基于大五人格模型(OCEAN)的性格测试，评估外倾性、宜人性、尽责性、神经质和开放性五个维度。采用mini-IPIP量表精简版。',
                '性格测试',
                10,
                10
            ]);
            const big5Id = big5Result.lastID;
            console.log(`✅ 大五人格测试创建完成，ID: ${big5Id}`);

            // mini-IPIP: 2 questions per dimension (one positively worded, one negatively worded)
            // Extraversion: Q1 positive, Q6 reverse
            // Agreeableness: Q2 positive, Q7 reverse
            // Conscientiousness: Q3 positive, Q8 reverse
            // Neuroticism: Q4 reverse, Q9 positive
            // Openness: Q5 positive, Q10 reverse
            const big5Questions = [
                { text: '我是聚会的灵魂人物（喜欢与人交往）', dim: 'E', reverse: false },
                { text: '我对他人的感受感同身受（同情他人）', dim: 'A', reverse: false },
                { text: '我做事井井有条（有条理）', dim: 'C', reverse: false },
                { text: '我经常情绪低落（容易忧虑）', dim: 'N', reverse: false },
                { text: '我有丰富的想象力（想象力丰富）', dim: 'O', reverse: false },
                { text: '我不太爱说话（沉默寡言）', dim: 'E', reverse: true },
                { text: '我对他人不感兴趣（对他人淡漠）', dim: 'A', reverse: true },
                { text: '我经常把事情搞得一团糟（粗心大意）', dim: 'C', reverse: true },
                { text: '我大部分时间情绪平稳（情绪稳定）', dim: 'N', reverse: true },
                { text: '我对抽象概念不感兴趣（不喜抽象思维）', dim: 'O', reverse: true }
            ];

            const big5Options = JSON.stringify({
                '1': '非常不同意',
                '2': '不同意',
                '3': '中立',
                '4': '同意',
                '5': '非常同意'
            });

            for (let i = 0; i < big5Questions.length; i++) {
                const q = big5Questions[i];
                await database.run(`
                    INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [big5Id, q.text, 'scale', big5Options, q.reverse ? -1 : 1, i + 1]);
            }
            console.log(`✅ 大五人格题目播种完成: ${big5Questions.length} 题`);
        } else {
            console.log('📊 大五人格测试已存在，跳过');
        }

        // =========================================================
        // 7. 情商(EQ)测试 (10题, scale 1-5)
        // =========================================================
        if (!existingIds.includes(7)) {
            console.log('📋 创建情商(EQ)测试...');
            const eqResult = await database.run(`
                INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [
                '情商(EQ)测试',
                '情绪智力(情商)测试评估自我认知、同理心、情绪调节、社交技能和自我激励五个维度的情绪管理能力。',
                '性格测试',
                15,
                10
            ]);
            const eqId = eqResult.lastID;
            console.log(`✅ 情商测试创建完成，ID: ${eqId}`);

            // 10 questions covering 5 dimensions (2 per dimension)
            const eqQuestions = [
                { text: '我能清楚地识别自己当下的情绪状态', dim: 'self_awareness' },
                { text: '我了解自己的优点和缺点', dim: 'self_awareness' },
                { text: '我能感受到他人的情绪变化', dim: 'empathy' },
                { text: '我能理解他人的立场和观点', dim: 'empathy' },
                { text: '当我生气时，我能控制自己的言行', dim: 'emotional_regulation' },
                { text: '面对挫折时，我能很快调整心态', dim: 'emotional_regulation' },
                { text: '我在社交场合中能轻松与他人建立联系', dim: 'social_skills' },
                { text: '我能有效解决人际冲突', dim: 'social_skills' },
                { text: '我为自己设定目标并努力实现', dim: 'motivation' },
                { text: '面对困难时，我能保持积极心态', dim: 'motivation' }
            ];

            const eqOptions = JSON.stringify({
                '1': '完全不符合',
                '2': '基本不符合',
                '3': '有时符合',
                '4': '基本符合',
                '5': '完全符合'
            });

            for (let i = 0; i < eqQuestions.length; i++) {
                const q = eqQuestions[i];
                await database.run(`
                    INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [eqId, q.text, 'scale', eqOptions, 1, i + 1]);
            }
            console.log(`✅ 情商测试题目播种完成: ${eqQuestions.length} 题`);
        } else {
            console.log('📊 情商测试已存在，跳过');
        }

        // =========================================================
        // 更新测评题数
        // =========================================================
        console.log('🔄 更新测评题目数量...');
        await database.run(`
            UPDATE assessments 
            SET questions_count = (
                SELECT COUNT(*) FROM questions 
                WHERE questions.assessment_id = assessments.id
            )
            WHERE id IN (4,5,6,7)
        `);
        
        console.log('✅ 测评题目数量更新完成');

        // =========================================================
        // 显示结果
        // =========================================================
        console.log('\n📊 迁移结果统计:');
        const assessments = await database.all(`
            SELECT a.id, a.name, a.category, a.questions_count,
                   COUNT(q.id) as actual_questions
            FROM assessments a
            LEFT JOIN questions q ON a.id = q.assessment_id
            WHERE a.id IN (4,5,6,7)
            GROUP BY a.id
            ORDER BY a.id
        `);
        
        assessments.forEach(assessment => {
            console.log(`   ${assessment.id}. ${assessment.name}`);
            console.log(`      分类: ${assessment.category}`);
            console.log(`      题目数: ${assessment.actual_questions}/${assessment.questions_count}`);
        });
        
        console.log('\n🎉 扩展测评数据迁移完成！');
        
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
