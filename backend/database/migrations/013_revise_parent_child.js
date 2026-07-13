// 亲子关系测评迁移 v2 — 6维度30题（覆盖对比/恐吓/期望/接纳不足/牺牲现在/身教）
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

const QUESTIONS = [
  // === 1. 看见需要 (5题) ===
  { text: '我能觉察到孩子行为背后隐藏的真实需求', weight: 1, dim: '看见需要' },
  { text: '当孩子闹情绪时，我会试着理解他想表达什么', weight: 1, dim: '看见需要' },
  { text: '我了解孩子在不同成长阶段的需求变化', weight: 1, dim: '看见需要' },
  { text: '我只关注孩子的行为对错，很少去想他为什么这样做', weight: -1, dim: '看见需要' },
  { text: '孩子的需求经常被我忽略', weight: -1, dim: '看见需要' },

  // === 2. 克制投射 (5题) — 覆盖对比/恐吓/个人期望 ===
  { text: '我尊重孩子有自己的想法，即使和我不一样', weight: 1, dim: '克制投射' },
  { text: '在教育孩子时，我会区分他需要的和我觉得好的', weight: 1, dim: '克制投射' },
  { text: '我经常拿自己的孩子和别的孩子比较', weight: -1, dim: '克制投射' },       // ← 对比
  { text: '我有时会用"不要你了"之类的话来吓唬孩子', weight: -1, dim: '克制投射' }, // ← 恐吓式教育
  { text: '我希望孩子能实现我未完成的梦想', weight: -1, dim: '克制投射' },          // ← 个人期望

  // === 3. 情感回应 (5题) ===
  { text: '当孩子感到害怕或难过时，我能给他安全感和安慰', weight: 1, dim: '情感回应' },
  { text: '孩子愿意主动和我分享他的感受', weight: 1, dim: '情感回应' },
  { text: '我会认真回应孩子的情感需求，不敷衍', weight: 1, dim: '情感回应' },
  { text: '我经常对孩子的情绪问题说"这没什么大不了的"', weight: -1, dim: '情感回应' },
  { text: '当孩子需要我时，我常常因为忙而忽略他', weight: -1, dim: '情感回应' },

  // === 4. 接纳与放手 (5题) — 覆盖接纳不足/牺牲现在 ===
  { text: '我能接受孩子的不完美，不会因他达不到标准而失望', weight: 1, dim: '接纳与放手' },  // ← 接纳不足
  { text: '我信任孩子有能力处理自己能做的事情', weight: 1, dim: '接纳与放手' },
  { text: '我会给孩子空间去尝试和犯错', weight: 1, dim: '接纳与放手' },
  { text: '我经常对孩子说"现在吃苦是为了将来好"', weight: -1, dim: '接纳与放手' },          // ← 牺牲现在
  { text: '我总是替孩子做决定，不放心让他自己来', weight: -1, dim: '接纳与放手' },

  // === 5. 陪伴质量 (5题) ===
  { text: '和孩子在一起时，我会全身心投入而不是心不在焉', weight: 1, dim: '陪伴质量' },
  { text: '我和孩子有共同的愉快时光和回忆', weight: 1, dim: '陪伴质量' },
  { text: '孩子觉得和我在一起很开心', weight: 1, dim: '陪伴质量' },
  { text: '我和孩子在一起时经常各做各的，很少真正互动', weight: -1, dim: '陪伴质量' },
  { text: '我陪伴孩子更多是出于责任，而不是发自内心地想陪他', weight: -1, dim: '陪伴质量' },

  // === 6. 教育自觉 (5题) — 覆盖身教 ===
  { text: '我经常反思自己的教育方式是否合适', weight: 1, dim: '教育自觉' },
  { text: '当我意识到自己的教育方法有问题时，我愿意调整', weight: 1, dim: '教育自觉' },
  { text: '我通过自己的成长来影响孩子，而不是只靠说教', weight: 1, dim: '教育自觉' },  // ← 身教
  { text: '我觉得自己的教育方式不需要改变', weight: -1, dim: '教育自觉' },
  { text: '孩子出现问题，我首先想到的是他的不对而不是我的教育方式', weight: -1, dim: '教育自觉' }
];

async function runMigration() {
  console.log('🚀 重新注入亲子关系测评 v2…');
  try {
    await database.connect();

    // 先删旧数据
    await database.run('DELETE FROM questions WHERE assessment_id = 16');
    await database.run('DELETE FROM assessment_results WHERE assessment_id = 16');
    await database.run('DELETE FROM assessments WHERE id = 16');
    console.log('🗑️  已删除旧数据');

    // 重建
    const result = await database.run(`
      INSERT INTO assessments (id, name, description, category, estimated_time, questions_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      16,
      '亲子关系能力测评',
      '爱的智慧，在于给予对方需要的，而不是自己认为正确的。本测评从看见需要、克制投射、情感回应、接纳与放手、陪伴质量、教育自觉六个维度，帮助你评估亲子关系的真实质量。',
      '人际关系',
      12,
      QUESTIONS.length
    ]);
    console.log(`✅ 亲子关系测评重建完成，ID: 16`);

    for (let i = 0; i < QUESTIONS.length; i++) {
      const q = QUESTIONS[i];
      await database.run(`
        INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
        VALUES (?, ?, 'scale', ?, ?, ?)
      `, [16, q.text, OPTIONS, q.weight, i + 1]);
    }

    const cnt = await database.get('SELECT COUNT(*) as c FROM questions WHERE assessment_id = 16');
    const rev = await database.get('SELECT COUNT(*) as c FROM questions WHERE assessment_id = 16 AND weight = -1');
    console.log(`✅ 题目: ${cnt.c} 题（反向 ${rev.c} 题）`);

    // 打印题目预览
    const all = await database.all('SELECT order_index, question_text, weight FROM questions WHERE assessment_id = 16 ORDER BY order_index');
    console.log('\n📋 题目列表:');
    for (const q of all) {
      const tag = q.weight === -1 ? ' [反]' : '';
      console.log(`  ${String(q.order_index).padStart(2)}. ${q.question_text}${tag}`);
    }

    console.log('\n🎉 亲子关系测评 v2 迁移完成！');
  } catch (e) {
    console.error('❌ 失败:', e.message);
    throw e;
  } finally {
    await database.close();
  }
}

if (require.main === module) runMigration().catch(e => { console.error(e); process.exit(1); });
module.exports = runMigration;
