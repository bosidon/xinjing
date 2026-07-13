// 扩展题目数据 - 将每个测评扩展到完整版
const database = require('./db');

async function expandQuestions() {
    console.log('=== 扩展题目数量 ===\n');
    
    await database.connect();
    
    // 先清空现有的题目和答案数据
    await database.run('DELETE FROM answers');
    await database.run('DELETE FROM assessment_results');
    await database.run('DELETE FROM questions');
    
    console.log('已清空旧数据\n');
    
    // MBTI 性格类型测试 - 12题
    const mbtiQuestions = [
        { text: '在社交场合中，你通常：', type: 'single_choice', options: '{"A":"主动与他人交谈，认识新朋友","B":"等待他人主动与你交谈","C":"更喜欢独自一人或与熟悉的人在一起"}', order: 1 },
        { text: '做决定时，你主要依据：', type: 'single_choice', options: '{"A":"逻辑分析和客观事实","B":"个人价值观和情感","C":"他人的意见和建议"}', order: 2 },
        { text: '当学习新知识时，你更倾向于：', type: 'single_choice', options: '{"A":"通过实践和体验来学习","B":"阅读书籍和理论来学习","C":"与他人讨论和交流来学习"}', order: 3 },
        { text: '周末你更喜欢做什么？', type: 'single_choice', options: '{"A":"参加聚会或户外活动","B":"在家看书或看电影","C":"学习新技能或做手工"}', order: 4 },
        { text: '在工作中，你更喜欢：', type: 'single_choice', options: '{"A":"有明确规则和流程的任务","B":"灵活自由、需要创造力的任务","C":"需要团队协作的任务"}', order: 5 },
        { text: '面对压力时，你通常：', type: 'single_choice', options: '{"A":"制定详细计划来应对","B":"顺其自然，随机应变","C":"找人倾诉或寻求支持"}', order: 6 },
        { text: '你更注重事情的：', type: 'single_choice', options: '{"A":"具体细节和实际效果","B":"整体概念和未来可能性","C":"对人际关系的影响"}', order: 7 },
        { text: '在团队中，你通常扮演：', type: 'single_choice', options: '{"A":"领导者或组织者","B":"创意提供者","C":"协调者和调解者"}', order: 8 },
        { text: '你喜欢什么样的工作环境？', type: 'single_choice', options: '{"A":"安静、有序、独立的空间","B":"活跃、开放、有变化的环境","C":"温馨、友好、团队氛围好"}', order: 9 },
        { text: '你如何处理突发事件？', type: 'single_choice', options: '{"A":"立即行动，快速解决","B":"先分析原因，再制定方案","C":"寻求他人帮助和建议"}', order: 10 },
        { text: '你更擅长：', type: 'single_choice', options: '{"A":"执行具体任务和完成计划","B":"构思创意和规划未来","C":"沟通协调和团队建设"}', order: 11 },
        { text: '你如何看待规则和制度？', type: 'single_choice', options: '{"A":"应该严格遵守","B":"可以根据情况灵活变通","C":"关注规则对人际关系的影响"}', order: 12 }
    ];
    
    // PHQ-9 抑郁症筛查量表 - 9题
    const phq9Questions = [
        { text: '做事时提不起劲或没有兴趣', type: 'scale', options: '{"0":"完全不会","1":"几天","2":"一半以上的天数","3":"几乎每天"}', order: 1 },
        { text: '感到心情低落、沮丧或绝望', type: 'scale', options: '{"0":"完全不会","1":"几天","2":"一半以上的天数","3":"几乎每天"}', order: 2 },
        { text: '入睡困难、睡不安稳或睡眠过多', type: 'scale', options: '{"0":"完全不会","1":"几天","2":"一半以上的天数","3":"几乎每天"}', order: 3 },
        { text: '感觉疲倦或没有活力', type: 'scale', options: '{"0":"完全不会","1":"几天","2":"一半以上的天数","3":"几乎每天"}', order: 4 },
        { text: '食欲不振或吃太多', type: 'scale', options: '{"0":"完全不会","1":"几天","2":"一半以上的天数","3":"几乎每天"}', order: 5 },
        { text: '觉得自己很糟或觉得自己很失败', type: 'scale', options: '{"0":"完全不会","1":"几天","2":"一半以上的天数","3":"几乎每天"}', order: 6 },
        { text: '对事物专注有困难', type: 'scale', options: '{"0":"完全不会","1":"几天","2":"一半以上的天数","3":"几乎每天"}', order: 7 },
        { text: '动作或说话速度缓慢，或相反地烦躁不安', type: 'scale', options: '{"0":"完全不会","1":"几天","2":"一半以上的天数","3":"几乎每天"}', order: 8 },
        { text: '有不如死掉或用某种方式伤害自己的念头', type: 'scale', options: '{"0":"完全不会","1":"几天","2":"一半以上的天数","3":"几乎每天"}', order: 9 }
    ];
    
    // 霍兰德职业兴趣测试 - 6题
    const hollandQuestions = [
        { text: '你喜欢帮助他人解决问题吗？', type: 'single_choice', options: '{"A":"非常喜欢","B":"比较喜欢","C":"一般","D":"不太喜欢"}', order: 1 },
        { text: '你喜欢研究事物的工作原理吗？', type: 'single_choice', options: '{"A":"非常喜欢","B":"比较喜欢","C":"一般","D":"不太喜欢"}', order: 2 },
        { text: '你喜欢动手修理或制作物品吗？', type: 'single_choice', options: '{"A":"非常喜欢","B":"比较喜欢","C":"一般","D":"不太喜欢"}', order: 3 },
        { text: '你喜欢组织和管理活动吗？', type: 'single_choice', options: '{"A":"非常喜欢","B":"比较喜欢","C":"一般","D":"不太喜欢"}', order: 4 },
        { text: '你喜欢艺术创作或表达自己吗？', type: 'single_choice', options: '{"A":"非常喜欢","B":"比较喜欢","C":"一般","D":"不太喜欢"}', order: 5 },
        { text: '你喜欢按照规则和流程工作吗？', type: 'single_choice', options: '{"A":"非常喜欢","B":"比较喜欢","C":"一般","D":"不太喜欢"}', order: 6 }
    ];
    
    const assessments = [
        { id: 1, name: 'MBTI性格类型测试', questions: mbtiQuestions, count: mbtiQuestions.length },
        { id: 2, name: 'PHQ-9抑郁症筛查量表', questions: phq9Questions, count: phq9Questions.length },
        { id: 3, name: '霍兰德职业兴趣测试', questions: hollandQuestions, count: hollandQuestions.length }
    ];
    
    for (const assessment of assessments) {
        // 更新题目数量
        await database.run('UPDATE assessments SET questions_count = ? WHERE id = ?', [assessment.count, assessment.id]);
        
        // 插入题目
        for (const q of assessment.questions) {
            await database.run(
                'INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index) VALUES (?, ?, ?, ?, 1, ?)',
                [assessment.id, q.text, q.type, q.options, q.order]
            );
        }
        
        console.log(`✅ ${assessment.name}: ${assessment.count}题`);
    }
    
    console.log('\n=== 题目扩展完成 ===\n');
    
    // 验证
    console.log('验证数据:');
    const result = await database.all(`
        SELECT a.name, COUNT(q.id) as count 
        FROM assessments a 
        LEFT JOIN questions q ON a.id = q.assessment_id 
        GROUP BY a.id
    `);
    
    for (const r of result) {
        console.log(`  ${r.name}: ${r.count}题`);
    }
}

expandQuestions().catch(console.error);