// 亲子关系测评迁移 — 6维度30题
const path = require('path');
const projectRoot = path.join(__dirname, '..', '..');
const database = require(path.join(projectRoot, 'database', 'db'));

const OPTIONS = JSON.stringify({
  '1': '完全不符合',
  '2': '比较不符合',
  '3': '有时符合',
  '4': '比较符合',
  '5': '完全符合'
});

// 6维度 × 5题 = 30题，正反混排
const QUESTIONS = [
  // === 1. 看见需要 ===
  { text: '我能觉察到孩子行为背后隐藏的真实需求', weight: 1, dim: '看见需要' },
  { text: '当孩子闹情绪时，我会试着理解他想表达什么', weight: 1, dim: '看见需要' },
  { text: '我了解孩子在不同成长阶段的需求变化', weight: 1, dim: '看见需要' },
  { text: '我只关注孩子的行为对错，很少去想他为什么这样做', weight: -1, dim: '看见需要' },
  { text: '孩子的需求经常被我忽略', weight: -1, dim: '看见需要' },
  // === 2. 克制投射 ===
  { text: '我尊重孩子有自己的想法，即使和我不一样', weight: 1, dim: '克制投射' },
  { text: '在教育孩子时，我会区分他需要的和我觉得好的', weight: 1, dim: '克制投射' },
  { text: '我不会把自己的期望强加给孩子', weight: 1, dim: '克制投射' },
  { text: '我认为孩子应该按照我设定的路线成长', weight: -1, dim: '克制投射' },
  { text: '当孩子不听话时，我觉得他在挑战我的权威', weight: -1, dim: '克制投射' },
  // === 3. 情感回应 ===
  { text: '当孩子感到害怕或难过时，我能给他安全感和安慰', weight: 1, dim: '情感回应' },
  { text: '孩子愿意主动和我分享他的感受', weight: 1, dim: '情感回应' },
  { text: '我会认真回应孩子的情感需求，不敷衍', weight: 1, dim: '情感回应' },
  { text: '我经常对孩子的情绪问题说"这没什么大不了的"', weight: -1, dim: '情感回应' },
  { text: '当孩子需要我时，我常常因为忙而忽略他', weight: -1, dim: '情感回应' },
  // === 4. 信任放手 ===
  { text: '我信任孩子有能力处理自己能做的事情', weight: 1, dim: '信任放手' },
  { text: '我会给孩子空间去尝试和犯错', weight: 1, dim: '信任放手' },
  { text: '我相信孩子能从失败中学到东西', weight: 1, dim: '信任放手' },
  { text: '我总是替孩子做决定，不放心让他自己来', weight: -1, dim: '信任放手' },
  { text: '我经常过度保护孩子，怕他受一点伤', weight: -1, dim: '信任放手' },
  // === 5. 陪伴质量 ===
  { text: '和孩子在一起时，我会全身心投入而不是心不在焉', weight: 1, dim: '陪伴质量' },
  { text: '我和孩子有共同的愉快时光和回忆', weight: 1, dim: '陪伴质量' },
  { text: '孩子觉得和我在一起很开心', weight: 1, dim: '陪伴质量' },
  { text: '我和孩子在一起时经常各做各的，很少真正互动', weight: -1, dim: '陪伴质量' },
  { text: '我陪伴孩子更多是出于责任，而不是发自内心地想陪他', weight: -1, dim: '陪伴质量' },
  // === 6. 教育自觉 ===
  { text: '我经常反思自己的教育方式是否合适', weight: 1, dim: '教育自觉' },
  { text: '当我意识到自己的教育方法有问题时，我愿意调整', weight: 1, dim: '教育自觉' },
  { text: '我会主动学习育儿知识来提升自己', weight: 1, dim: '教育自觉' },
  { text: '我觉得自己的教育方式不需要改变', weight: -1, dim: '教育自觉' },
  { text: '孩子出现问题，我首先想到的是他的不对而不是我的教育方式', weight: -1, dim: '教育自觉' }
];

async function runMigration() {
  console.log('🚀 注入亲子关系测评…');
  try {
    await database.connect();

    const result = await database.run(`
      INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [
      '亲子关系能力测评',
      '爱的智慧，在于给予对方需要的，而不是自己认为正确的。本测评从看见需要、克制投射、情感回应、信任放手、陪伴质量、教育自觉六个维度，帮助你评估亲子关系的真实质量。',
      '人际关系',
      12,
      QUESTIONS.length
    ]);

    const aid = result.lastID;
    console.log(`✅ 亲子关系测评创建完成，ID: ${aid}`);

    for (let i = 0; i < QUESTIONS.length; i++) {
      const q = QUESTIONS[i];
      await database.run(`
        INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
        VALUES (?, ?, 'scale', ?, ?, ?)
      `, [aid, q.text, OPTIONS, q.weight, i + 1]);
    }

    // 验证
    const cnt = await database.get(
      'SELECT COUNT(*) as c FROM questions WHERE assessment_id = ?', [aid]
    );
    const rev = await database.get(
      'SELECT COUNT(*) as c FROM questions WHERE assessment_id = ? AND weight = -1', [aid]
    );
    console.log(`✅ 题目: ${cnt.c} 题（反向 ${rev.c} 题）`);
    console.log('🎉 亲子关系测评迁移完成！');
  } catch (e) {
    console.error('❌ 失败:', e.message);
    throw e;
  } finally {
    await database.close();
  }
}

if (require.main === module) runMigration().catch(e => { console.error(e); process.exit(1); });
module.exports = runMigration;
