// 初始数据种子脚本
const database = require('../db');
// 暂时不使用bcrypt，使用简单哈希
const crypto = require('crypto');

async function seedData() {
    console.log('🌱 开始播种初始数据...');
    
    try {
        await database.connect();
        
        // 1. 播种测试用户
        console.log('👤 播种测试用户...');
        
        // 检查是否已有用户
        const userCount = await database.get('SELECT COUNT(*) as count FROM users');
        if (userCount.count === 0) {
            // 创建测试用户
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash('password123', saltRounds);
            
            await database.run(`
                INSERT INTO users (username, email, password_hash, created_at, updated_at)
                VALUES (?, ?, ?, datetime('now'), datetime('now'))
            `, ['testuser', 'test1@example.com', passwordHash]);
            
            console.log('✅ 测试用户创建完成: test1@example.com / password123');
        } else {
            console.log(`📊 已有 ${userCount.count} 个用户，跳过用户播种`);
        }
        
        // 2. 播种测评数据
        console.log('📋 播种测评数据...');
        
        const assessmentCount = await database.get('SELECT COUNT(*) as count FROM assessments');
        if (assessmentCount.count === 0) {
            // MBTI性格类型测试
            const mbtiAssessment = await database.run(`
                INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [
                'MBTI性格类型测试',
                '基于迈尔斯-布里格斯类型指标的经典性格测试，帮助你了解自己的性格倾向和职业发展方向。',
                '性格测试',
                15,
                12
            ]);
            
            const mbtiId = mbtiAssessment.lastID;
            console.log(`✅ MBTI测评创建完成，ID: ${mbtiId}`);
            
            // PHQ-9抑郁症筛查
            const phqAssessment = await database.run(`
                INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [
                'PHQ-9抑郁症筛查量表',
                '国际通用的抑郁症筛查工具，帮助评估过去两周的情绪状态和抑郁症状。',
                '心理健康',
                10,
                9
            ]);
            
            const phqId = phqAssessment.lastID;
            console.log(`✅ PHQ-9测评创建完成，ID: ${phqId}`);
            
            // 霍兰德职业兴趣测试
            const hollandAssessment = await database.run(`
                INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [
                '霍兰德职业兴趣测试',
                '基于霍兰德职业兴趣理论的测试，帮助你发现适合的职业方向和工作环境。',
                '职业规划',
                12,
                6
            ]);
            
            const hollandId = hollandAssessment.lastID;
            console.log(`✅ 霍兰德测评创建完成，ID: ${hollandId}`);
            
            // 3. 播种题目数据
            console.log('❓ 播种题目数据...');
            
            // MBTI题目
            const mbtiQuestions = [
                {
                    question_text: '在社交场合中，你通常：',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '主动与他人交谈，认识新朋友',
                        'B': '等待他人主动与你交谈',
                        'C': '更喜欢独自一人或与熟悉的人在一起',
                        'D': '根据心情决定是否社交'
                    }),
                    order_index: 1
                },
                {
                    question_text: '当学习新知识时，你更倾向于：',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '通过实践和体验来学习',
                        'B': '阅读书籍和理论来学习',
                        'C': '与他人讨论和交流来学习',
                        'D': '观看视频和演示来学习'
                    }),
                    order_index: 2
                },
                {
                    question_text: '做决定时，你主要依据：',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '逻辑分析和客观事实',
                        'B': '个人价值观和情感',
                        'C': '他人的意见和建议',
                        'D': '直觉和灵感'
                    }),
                    order_index: 3
                },
                {
                    question_text: '你的生活节奏通常是：',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '有计划、有组织的',
                        'B': '灵活、随性的',
                        'C': '忙碌但有序的',
                        'D': '悠闲自在的'
                    }),
                    order_index: 4
                },
                {
                    question_text: '在团队中，你通常扮演的角色是：',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '领导者和决策者',
                        'B': '协调者和沟通者',
                        'C': '执行者和实干家',
                        'D': '思考者和建议者'
                    }),
                    order_index: 5
                },
                {
                    question_text: '面对压力时，你的反应是：',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '冷静分析问题并寻找解决方案',
                        'B': '情绪波动较大，需要时间调整',
                        'C': '寻求他人的支持和帮助',
                        'D': '通过独处和思考来缓解'
                    }),
                    order_index: 6
                },
                {
                    question_text: '你更喜欢的工作环境是：',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '结构清晰、目标明确的环境',
                        'B': '自由开放、充满创意的环境',
                        'C': '团队合作、人际互动的环境',
                        'D': '独立自主、不受干扰的环境'
                    }),
                    order_index: 7
                },
                {
                    question_text: '对于未来，你更关注：',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '具体的计划和目标',
                        'B': '可能的机会和变化',
                        'C': '人际关系和情感连接',
                        'D': '个人成长和内心感受'
                    }),
                    order_index: 8
                },
                {
                    question_text: '处理信息时，你更注重：',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '细节和具体事实',
                        'B': '整体概念和可能性',
                        'C': '对他人的影响和意义',
                        'D': '逻辑关系和因果关系'
                    }),
                    order_index: 9
                },
                {
                    question_text: '你的能量来源主要是：',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '独处和内心世界',
                        'B': '社交和外部互动',
                        'C': '成就和目标达成',
                        'D': '学习和知识获取'
                    }),
                    order_index: 10
                },
                {
                    question_text: '评价他人时，你更看重：',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '能力和成就',
                        'B': '人品和价值观',
                        'C': '合作和团队精神',
                        'D': '创新和独特性'
                    }),
                    order_index: 11
                },
                {
                    question_text: '空闲时间你更喜欢：',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '阅读、学习或思考',
                        'B': '社交、聚会或活动',
                        'C': '运动、旅行或冒险',
                        'D': '创作、艺术或音乐'
                    }),
                    order_index: 12
                }
            ];
            
            for (const question of mbtiQuestions) {
                await database.run(`
                    INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [mbtiId, question.question_text, question.question_type, question.options, 1, question.order_index]);
            }
            console.log(`✅ MBTI题目播种完成: ${mbtiQuestions.length} 题`);
            
            // PHQ-9题目
            const phqQuestions = [
                {
                    question_text: '做事时提不起劲或没有兴趣',
                    question_type: 'scale',
                    options: JSON.stringify({
                        '0': '完全不会',
                        '1': '几天',
                        '2': '一半以上的天数',
                        '3': '几乎每天'
                    }),
                    order_index: 1
                },
                {
                    question_text: '感到心情低落、沮丧或绝望',
                    question_type: 'scale',
                    options: JSON.stringify({
                        '0': '完全不会',
                        '1': '几天',
                        '2': '一半以上的天数',
                        '3': '几乎每天'
                    }),
                    order_index: 2
                },
                {
                    question_text: '入睡困难、睡不安稳或睡眠过多',
                    question_type: 'scale',
                    options: JSON.stringify({
                        '0': '完全不会',
                        '1': '几天',
                        '2': '一半以上的天数',
                        '3': '几乎每天'
                    }),
                    order_index: 3
                },
                {
                    question_text: '感觉疲倦或没有活力',
                    question_type: 'scale',
                    options: JSON.stringify({
                        '0': '完全不会',
                        '1': '几天',
                        '2': '一半以上的天数',
                        '3': '几乎每天'
                    }),
                    order_index: 4
                },
                {
                    question_text: '食欲不振或吃太多',
                    question_type: 'scale',
                    options: JSON.stringify({
                        '0': '完全不会',
                        '1': '几天',
                        '2': '一半以上的天数',
                        '3': '几乎每天'
                    }),
                    order_index: 5
                },
                {
                    question_text: '觉得自己很糟或觉得自己很失败，或让自己或家人失望',
                    question_type: 'scale',
                    options: JSON.stringify({
                        '0': '完全不会',
                        '1': '几天',
                        '2': '一半以上的天数',
                        '3': '几乎每天'
                    }),
                    order_index: 6
                },
                {
                    question_text: '对事物专注有困难，例如阅读报纸或看电视时',
                    question_type: 'scale',
                    options: JSON.stringify({
                        '0': '完全不会',
                        '1': '几天',
                        '2': '一半以上的天数',
                        '3': '几乎每天'
                    }),
                    order_index: 7
                },
                {
                    question_text: '动作或说话速度缓慢到别人已经觉察？或正好相反——烦躁或坐立不安、动来动去的情况更胜于平常',
                    question_type: 'scale',
                    options: JSON.stringify({
                        '0': '完全不会',
                        '1': '几天',
                        '2': '一半以上的天数',
                        '3': '几乎每天'
                    }),
                    order_index: 8
                },
                {
                    question_text: '有不如死掉或用某种方式伤害自己的念头',
                    question_type: 'scale',
                    options: JSON.stringify({
                        '0': '完全不会',
                        '1': '几天',
                        '2': '一半以上的天数',
                        '3': '几乎每天'
                    }),
                    order_index: 9
                }
            ];
            
            for (const question of phqQuestions) {
                await database.run(`
                    INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [phqId, question.question_text, question.question_type, question.options, 1, question.order_index]);
            }
            console.log(`✅ PHQ-9题目播种完成: ${phqQuestions.length} 题`);
            
            // 霍兰德题目
            const hollandQuestions = [
                {
                    question_text: '你喜欢动手修理或制作物品吗？',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '非常喜欢',
                        'B': '比较喜欢',
                        'C': '一般',
                        'D': '不太喜欢',
                        'E': '完全不喜欢'
                    }),
                    order_index: 1
                },
                {
                    question_text: '你喜欢研究事物的工作原理吗？',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '非常喜欢',
                        'B': '比较喜欢',
                        'C': '一般',
                        'D': '不太喜欢',
                        'E': '完全不喜欢'
                    }),
                    order_index: 2
                },
                {
                    question_text: '你喜欢帮助他人解决问题吗？',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '非常喜欢',
                        'B': '比较喜欢',
                        'C': '一般',
                        'D': '不太喜欢',
                        'E': '完全不喜欢'
                    }),
                    order_index: 3
                },
                {
                    question_text: '你喜欢有创意和艺术性的工作吗？',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '非常喜欢',
                        'B': '比较喜欢',
                        'C': '一般',
                        'D': '不太喜欢',
                        'E': '完全不喜欢'
                    }),
                    order_index: 4
                },
                {
                    question_text: '你喜欢领导和组织他人吗？',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '非常喜欢',
                        'B': '比较喜欢',
                        'C': '一般',
                        'D': '不太喜欢',
                        'E': '完全不喜欢'
                    }),
                    order_index: 5
                },
                {
                    question_text: '你喜欢有条理和细致的工作吗？',
                    question_type: 'single_choice',
                    options: JSON.stringify({
                        'A': '非常喜欢',
                        'B': '比较喜欢',
                        'C': '一般',
                        'D': '不太喜欢',
                        'E': '完全不喜欢'
                    }),
                    order_index: 6
                }
            ];
            
            for (const question of hollandQuestions) {
                await database.run(`
                    INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [hollandId, question.question_text, question.question_type, question.options, 1, question.order_index]);
            }
            console.log(`✅ 霍兰德题目播种完成: ${hollandQuestions.length} 题`);
            
            console.log('✅ 所有题目播种完成');
            
        } else {
            console.log(`📊 已有 ${assessmentCount.count} 个测评，跳过测评播种`);
        }
        
        // 4. 更新测评的实际题目数量
        console.log('🔄 更新测评题目数量...');
        await database.run(`
            UPDATE assessments 
            SET questions_count = (
                SELECT COUNT(*) FROM questions 
                WHERE questions.assessment_id = assessments.id
            )
            WHERE id IN (SELECT id FROM assessments)
        `);
        
        console.log('✅ 测评题目数量更新完成');
        
        // 5. 显示播种结果
        console.log('\n📊 播种结果统计:');
        
        const stats = await database.all(`
            SELECT 
                (SELECT COUNT(*) FROM users) as user_count,
                (SELECT COUNT(*) FROM assessments) as assessment_count,
                (SELECT COUNT(*) FROM questions) as question_count,
                (SELECT COUNT(*) FROM assessment_results) as result_count,
                (SELECT COUNT(*) FROM answers) as answer_count
        `);
        
        const statsRow = stats[0];
        console.log(`   用户数: ${statsRow.user_count}`);
        console.log(`   测评数: ${statsRow.assessment_count}`);
        console.log(`   题目数: ${statsRow.question_count}`);
        console.log(`   测评结果数: ${statsRow.result_count}`);
        console.log(`   答案数: ${statsRow.answer_count}`);
        
        // 显示测评详情
        const assessments = await database.all(`
            SELECT a.id, a.name, a.category, a.questions_count,
                   COUNT(q.id) as actual_questions
            FROM assessments a
            LEFT JOIN questions q ON a.id = q.assessment_id
            GROUP BY a.id
            ORDER BY a.id
        `);
        
        console.log('\n📋 测评详情:');
        assessments.forEach(assessment => {
            console.log(`   ${assessment.id}. ${assessment.name}`);
            console.log(`      分类: ${assessment.category}`);
            console.log(`      题目数: ${assessment.actual_questions}/${assessment.questions_count}`);
        });
        
        console.log('\n🎉 初始数据播种完成！');
        console.log('\n🔑 测试账号:');
        console.log('   邮箱: test1@example.com');
        console.log('   密码: password123');
        console.log('\n🌐 访问地址:');
        console.log('   主界面: http://localhost:8080');
        console.log('   API: http://localhost:3002/api');
        
    } catch (error) {
        console.error('❌ 数据播种失败:', error.message);
        throw error;
    } finally {
        await database.close();
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    seedData().catch(error => {
        console.error('播种脚本执行失败:', error);
        process.exit(1);
    });
}

module.exports = seedData;