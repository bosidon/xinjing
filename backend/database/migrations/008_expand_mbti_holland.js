// 扩展MBTI至36题、霍兰德至24题
const path = require('path');
const database = require(path.join(__dirname, '..', 'db'));

async function migrate() {
    await database.connect();

    // 获取当前最大问题ID和order_index
    const maxQ = await database.get('SELECT MAX(order_index) as maxIdx FROM questions WHERE assessment_id = 1');
    const mbtiStart = (maxQ?.maxIdx || 24) + 1;

    const maxH = await database.get('SELECT MAX(order_index) as maxIdx FROM questions WHERE assessment_id = 3');
    const hollandStart = (maxH?.maxIdx || 12) + 1;

    // ========== MBTI 新增12题 (25-36) ==========
    const mbtiNew = [
        // E/I 维度 (3题)
        {
            question_text: '休息日你更倾向如何恢复精力？',
            options: JSON.stringify({
                'A': '约朋友出去玩、参加活动',
                'B': '在家看书、看电影、独处',
                'C': '做点手工或运动'
            }),
            dim: 'E_I', a: 'E', b: 'I', c: 'I'
        },
        {
            question_text: '在一个陌生场合，你通常：',
            options: JSON.stringify({
                'A': '很快就能融入大家',
                'B': '需要一段时间观察才加入',
                'C': '保持安静，等别人来找你'
            }),
            dim: 'E_I', a: 'E', b: 'I', c: 'I'
        },
        {
            question_text: '你如何处理空闲时间？',
            options: JSON.stringify({
                'A': '约人一起做点什么',
                'B': '一个人安静地待着',
                'C': '看心情，都可以'
            }),
            dim: 'E_I', a: 'E', b: 'I', c: 'I'
        },
        // S/N 维度 (3题)
        {
            question_text: '你更相信哪种信息？',
            options: JSON.stringify({
                'A': '亲身经历和亲眼所见的事实',
                'B': '直觉和第六感的提示',
                'C': '权威人士的分析和判断'
            }),
            dim: 'S_N', a: 'S', b: 'N', c: 'N'
        },
        {
            question_text: '聊天时你更常谈论：',
            options: JSON.stringify({
                'A': '今天发生的事、具体的人和物',
                'B': '未来的可能性、想法和感悟',
                'C': '对人对事的感受和评价'
            }),
            dim: 'S_N', a: 'S', b: 'N', c: 'N'
        },
        {
            question_text: '你更喜欢哪种类型的电影/故事？',
            options: JSON.stringify({
                'A': '基于真实事件改编的',
                'B': '天马行空、充满想象力的',
                'C': '情感细腻、描写深刻的'
            }),
            dim: 'S_N', a: 'S', b: 'N', c: 'N'
        },
        // T/F 维度 (3题)
        {
            question_text: '朋友遇到困难时，你首先会：',
            options: JSON.stringify({
                'A': '帮他分析原因、出主意',
                'B': '陪伴他、安慰他的情绪',
                'C': '问他想怎么处理再决定'
            }),
            dim: 'T_F', a: 'T', b: 'F', c: 'F'
        },
        {
            question_text: '选择工作时，你更看重：',
            options: JSON.stringify({
                'A': '薪资待遇和职业发展前景',
                'B': '工作氛围和同事关系',
                'C': '工作的意义和价值'
            }),
            dim: 'T_F', a: 'T', b: 'F', c: 'F'
        },
        {
            question_text: '面对分歧时，你通常：',
            options: JSON.stringify({
                'A': '摆事实讲道理，说服对方',
                'B': '照顾对方感受，求同存异',
                'C': '看对方态度决定争论程度'
            }),
            dim: 'T_F', a: 'T', b: 'F', c: 'F'
        },
        // J/P 维度 (3题)
        {
            question_text: '你的桌面或房间通常是：',
            options: JSON.stringify({
                'A': '整洁有序，每样东西都有固定位置',
                'B': '看似有点乱但自己找得到东西',
                'C': '比较随意，想到了才整理'
            }),
            dim: 'J_P', a: 'J', b: 'P', c: 'P'
        },
        {
            question_text: '出门旅行你更喜欢：',
            options: JSON.stringify({
                'A': '做好详细攻略，按计划走',
                'B': '定好大致方向，随性探索',
                'C': '到了再说，看心情决定'
            }),
            dim: 'J_P', a: 'J', b: 'P', c: 'P'
        },
        {
            question_text: '你如何看待截止日期？',
            options: JSON.stringify({
                'A': '提前完成才安心',
                'B': '卡在截止前完成效率最高',
                'C': '经常需要延期或调整'
            }),
            dim: 'J_P', a: 'J', b: 'P', c: 'P'
        },
    ];

    // ========== 霍兰德 新增12题 (13-24) ==========
    const hollandNew = [
        // R 现实型 (2题)
        {
            question_text: '你愿意到户外进行体力劳动吗？',
            options: JSON.stringify({ 'A': '非常喜欢', 'B': '比较喜欢', 'C': '一般', 'D': '不太喜欢' }),
            type: 'R'
        },
        {
            question_text: '你喜欢组装或拆卸物品吗？',
            options: JSON.stringify({ 'A': '非常喜欢', 'B': '比较喜欢', 'C': '一般', 'D': '不太喜欢' }),
            type: 'R'
        },
        // I 研究型 (2题)
        {
            question_text: '你喜欢解决复杂的逻辑谜题吗？',
            options: JSON.stringify({ 'A': '非常喜欢', 'B': '比较喜欢', 'C': '一般', 'D': '不太喜欢' }),
            type: 'I'
        },
        {
            question_text: '你喜欢阅读科学或学术类文章吗？',
            options: JSON.stringify({ 'A': '非常喜欢', 'B': '比较喜欢', 'C': '一般', 'D': '不太喜欢' }),
            type: 'I'
        },
        // A 艺术型 (2题)
        {
            question_text: '你喜欢参观美术馆或听音乐会吗？',
            options: JSON.stringify({ 'A': '非常喜欢', 'B': '比较喜欢', 'C': '一般', 'D': '不太喜欢' }),
            type: 'A'
        },
        {
            question_text: '你喜欢设计或装饰空间吗？',
            options: JSON.stringify({ 'A': '非常喜欢', 'B': '比较喜欢', 'C': '一般', 'D': '不太喜欢' }),
            type: 'A'
        },
        // S 社会型 (2题)
        {
            question_text: '你愿意做志愿者服务他人吗？',
            options: JSON.stringify({ 'A': '非常喜欢', 'B': '比较喜欢', 'C': '一般', 'D': '不太喜欢' }),
            type: 'S'
        },
        {
            question_text: '你喜欢调解朋友之间的矛盾吗？',
            options: JSON.stringify({ 'A': '非常喜欢', 'B': '比较喜欢', 'C': '一般', 'D': '不太喜欢' }),
            type: 'S'
        },
        // E 企业型 (2题)
        {
            question_text: '你喜欢主导和推动一个项目吗？',
            options: JSON.stringify({ 'A': '非常喜欢', 'B': '比较喜欢', 'C': '一般', 'D': '不太喜欢' }),
            type: 'E'
        },
        {
            question_text: '你喜欢在公开场合演讲或发言吗？',
            options: JSON.stringify({ 'A': '非常喜欢', 'B': '比较喜欢', 'C': '一般', 'D': '不太喜欢' }),
            type: 'E'
        },
        // C 常规型 (2题)
        {
            question_text: '你喜欢核对数据和检查错误吗？',
            options: JSON.stringify({ 'A': '非常喜欢', 'B': '比较喜欢', 'C': '一般', 'D': '不太喜欢' }),
            type: 'C'
        },
        {
            question_text: '你喜欢建立和维护各种表格或清单吗？',
            options: JSON.stringify({ 'A': '非常喜欢', 'B': '比较喜欢', 'C': '一般', 'D': '不太喜欢' }),
            type: 'C'
        },
    ];

    // 插入MBTI新题
    for (let i = 0; i < mbtiNew.length; i++) {
        const q = mbtiNew[i];
        const idx = mbtiStart + i;
        await database.run(
            `INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
             VALUES (1, ?, 'single_choice', ?, 1, ?)`,
            [q.question_text, q.options, idx]
        );
        console.log(`  ✅ MBTI Q${idx}: ${q.question_text.slice(0, 20)}... [${q.dim}]`);
    }

    // 插入霍兰德新题
    for (let i = 0; i < hollandNew.length; i++) {
        const q = hollandNew[i];
        const idx = hollandStart + i;
        await database.run(
            `INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
             VALUES (3, ?, 'single_choice', ?, 1, ?)`,
            [q.question_text, q.options, idx]
        );
        console.log(`  ✅ 霍兰德 Q${idx}: ${q.question_text.slice(0, 20)}... [${q.type}]`);
    }

    // 更新assessments表的questions_count
    await database.run(`UPDATE assessments SET questions_count = 36 WHERE id = 1`);
    await database.run(`UPDATE assessments SET questions_count = 24 WHERE id = 3`);
    console.log('  ✅ 更新assessments计数: MBTI=36题, 霍兰德=24题');

    console.log('\n🎉 迁移完成!');
    await database.close();
}

migrate().catch(err => {
    console.error('❌ 迁移失败:', err.message);
    process.exit(1);
});
