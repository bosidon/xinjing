// 人际关系测评迁移 - 添加4个标准化量表
// SAD社交回避及苦恼(28题) + ITS人际信任(25题) + IRI共情指数(22题) + SSI社交技能(20题)
const path = require('path');
const projectRoot = path.join(__dirname, '..', '..');
const database = require(path.join(projectRoot, 'database', 'db'));

const SCALE_5 = JSON.stringify({
  '1': '完全不符合',
  '2': '比较不符合',
  '3': '有时符合',
  '4': '比较符合',
  '5': '完全符合'
});

const SCALE_5_AGREE = JSON.stringify({
  '1': '非常不同意',
  '2': '不同意',
  '3': '中立',
  '4': '同意',
  '5': '非常同意'
});

const YES_NO_REVERSE = JSON.stringify({
  '0': '是',
  '1': '否'
});
const YES_NO_FORWARD = JSON.stringify({
  '1': '是',
  '0': '否'
});

async function seedAssessment(name, description, category, estimatedTime, questions, options, questionType = 'scale') {
  // 检查是否已有同名测评
  const existing = await database.get(
    'SELECT id FROM assessments WHERE name = ?', [name]
  );
  if (existing) {
    console.log(`📊 ${name} 已存在(ID=${existing.id})，跳过创建`);
    return existing.id;
  }

  const result = await database.run(`
    INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `, [name, description, category, estimatedTime, questions.length]);

  const assessmentId = result.lastID;
  console.log(`✅ ${name} 创建完成，ID: ${assessmentId}`);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await database.run(`
      INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [assessmentId, q.text, questionType, q.options || options, q.weight || 1, i + 1]);
  }
  console.log(`   ${name} 题目播种完成: ${questions.length} 题`);

  return assessmentId;
}

async function runMigration() {
  console.log('🚀 开始数据库迁移: 添加人际关系测评');
  try {
    await database.connect();

    const assessments = [];

    // =========================================================
    // 1. SAD 社交回避及苦恼量表 (28题)
    // =========================================================
    assessments.push(await seedAssessment(
      '社交回避及苦恼(SAD)量表',
      '社交回避及苦恼量表(Social Avoidance and Distress, SAD)由Watson和Friend于1969年编制，是评价社交焦虑和回避行为的标准工具。包含社交回避和社交苦恼两个维度，评估人们在社交情境中的行为倾向和情绪体验。',
      '人际关系', 15, [
        { text: '即使在不熟悉的社交场合，我仍然感到放松', weight: -1 },
        { text: '我尽量避免与别人说话', weight: 1 },
        { text: '和陌生人在一起时，我很容易感到紧张', weight: 1 },
        { text: '我不太喜欢参加聚会和社交活动', weight: 1 },
        { text: '在社交场合，我通常能保持放松', weight: -1 },
        { text: '在人群中也经常感到紧张', weight: 1 },
        { text: '和别人交谈时，我通常很放松', weight: -1 },
        { text: '我经常回避那些需要与人交谈的场合', weight: 1 },
        { text: '我很容易与同学或同事建立关系', weight: -1 },
        { text: '和不太熟悉的人交谈时，我会感到紧张', weight: 1 },
        { text: '我通常能在人群中感到轻松自在', weight: -1 },
        { text: '我经常感到社交压力', weight: 1 },
        { text: '我通常回避参与各种社交活动', weight: 1 },
        { text: '和异性交谈时，我通常感到很放松', weight: -1 },
        { text: '我害怕在众人面前说话', weight: 1 },
        { text: '除非别人主动，我通常避免与人交谈', weight: 1 },
        { text: '参加聚会时，我通常能玩得很开心', weight: -1 },
        { text: '我经常回避与不熟悉的人交谈', weight: 1 },
        { text: '我很容易和陌生人交谈', weight: -1 },
        { text: '在社交场合，我经常感到紧张不安', weight: 1 },
        { text: '我通常喜欢参加社交活动', weight: -1 },
        { text: '和老师或上级交谈时，我容易感到紧张', weight: 1 },
        { text: '我需要有熟人在场才能感到自在', weight: 1 },
        { text: '即使是有趣的社交活动，我也常常回避', weight: 1 },
        { text: '在正式的社交场合，我通常能保持冷静', weight: -1 },
        { text: '我经常找借口不参加社交活动', weight: 1 },
        { text: '我通常在社交场合感到自在', weight: -1 },
        { text: '和一群陌生人在一起时，我会感到紧张', weight: 1 }
      ], YES_NO_REVERSE, 'single_choice'
    ));

    // =========================================================
    // 2. ITS 人际信任量表 (25题)
    // =========================================================
    assessments.push(await seedAssessment(
      '人际信任量表(ITS)',
      '人际信任量表(Interpersonal Trust Scale, ITS)由Rotter于1967年编制，用于评估个体对他人（包括家人、朋友、陌生人和社会角色）的信任程度。高信任者倾向于相信人性本善，低信任者则持怀疑态度。',
      '人际关系', 15, [
        { text: '在我们的社会中，虚伪的人越来越多', weight: -1 },
        { text: '与陌生人打交道时，最好保持警惕直到对方证明自己值得信任', weight: -1 },
        { text: '除非我们主动推动，否则大多数人会一事无成', weight: -1 },
        { text: '如果某件事出了差错，即使与家庭无关，父母仍倾向于责备孩子', weight: -1 },
        { text: '与人交往时，不必过于担心自己会被利用', weight: 1 },
        { text: '大多数专业人员（如医生、律师）对自己的工作能力是诚实的', weight: 1 },
        { text: '大多数情况下，人们会信守承诺', weight: 1 },
        { text: '大多数竞选者实际上是真诚地想为国家服务', weight: 1 },
        { text: '大多数人基本上都是诚实的', weight: 1 },
        { text: '大部分人都是善良和乐于助人的', weight: 1 },
        { text: '大多数人在借钱后会按约定归还', weight: 1 },
        { text: '大多数人会维护自己的利益，即使这意味着损害别人的利益', weight: -1 },
        { text: '大多数人都会承认自己做错的事情', weight: 1 },
        { text: '大多数人都会毫不犹豫地帮助陌生人', weight: 1 },
        { text: '在购买二手商品时，应该持怀疑态度', weight: -1 },
        { text: '大多数推销员的介绍是真实的', weight: 1 },
        { text: '在目前这个竞争激烈的社会，利己主义是常态', weight: -1 },
        { text: '多数情况下，人们会先为他人着想', weight: 1 },
        { text: '父母通常言而有信', weight: 1 },
        { text: '在这个世界上，大多数人都是可信赖的', weight: 1 },
        { text: '大多数人如果发现自己有欺骗行为，会感到内疚', weight: 1 },
        { text: '大多数人在退休后会得到公正的待遇', weight: 1 },
        { text: '大多数专家即使知道自己的知识有限，也会尽量提供帮助', weight: 1 },
        { text: '大多数人会按政府的要求纳税', weight: 1 },
        { text: '大多数人投票支持候选人是出于合理的选择', weight: 1 }
      ], SCALE_5_AGREE, 'scale'
    ));

    // =========================================================
    // 3. IRI 人际反应指数(共情量表) (22题)
    // =========================================================
    assessments.push(await seedAssessment(
      '共情量表(IRI)',
      '人际反应指数(Interpersonal Reactivity Index, IRI)由Davis于1980年编制，是测量共情能力的多维量表。包含观点采择、共情关心、想象力和个人痛苦四个维度，全面评估个体的共情倾向和能力。',
      '人际关系', 15, [
        // 观点采择 Perspective Taking (PT): 1,3,5,7,9,11,13 — 7题
        { text: '在做决定之前，我会尝试考虑每个人的不同意见', weight: 1, dimension: 'PT' },
        { text: '我有时会试着从朋友的角度想象事情，以更好地理解他们', weight: 1, dimension: 'PT' },
        { text: '我相信每个问题都有两面性，并尝试从两面来看', weight: 1, dimension: 'PT' },
        { text: '当我对他人生气时，我通常会尝试站在他们的立场想一下', weight: 1, dimension: 'PT' },
        { text: '在批评别人之前，我会想象如果自己处在他的位置会是什么感受', weight: 1, dimension: 'PT' },
        { text: '我有时会感到很难从他人的角度看问题', weight: -1, dimension: 'PT' },
        { text: '当确定某事的立场后，我很少会受他人观点的影响', weight: -1, dimension: 'PT' },
        // 共情关心 Empathic Concern (EC): 2,4,6,8,10,12,14 — 7题
        { text: '当看到有人被不公平对待时，我经常会感到同情', weight: 1, dimension: 'EC' },
        { text: '当看到有人受到伤害时，我经常会感到想要帮助', weight: 1, dimension: 'EC' },
        { text: '我经常被发生在他人身上的事情所感动', weight: 1, dimension: 'EC' },
        { text: '他人的不幸通常不会让我感到非常不安', weight: -1, dimension: 'EC' },
        { text: '看到有人被利用时，我会想要保护他们', weight: 1, dimension: 'EC' },
        { text: '其他人在我面前哭泣时，我通常不会感到难过', weight: -1, dimension: 'EC' },
        { text: '看到受伤的动物时，我经常会感到担忧和心疼', weight: 1, dimension: 'EC' },
        // 想象力 Fantasy (FS): 15,16,17,18,19 — 5题
        { text: '当我读有趣的故事或小说时，我会想象如果自己处于故事中会是什么感受', weight: 1, dimension: 'FS' },
        { text: '在观看感人的电影时，我经常感觉自己就是其中的角色', weight: 1, dimension: 'FS' },
        { text: '看完一部好电影后，我经常感觉自己仿佛经历了故事中的一切', weight: 1, dimension: 'FS' },
        { text: '我很少被书或电影中的情节完全吸引', weight: -1, dimension: 'FS' },
        { text: '当我读小说时，我能够完全沉浸在故事角色的感受中', weight: 1, dimension: 'FS' },
        // 个人痛苦 Personal Distress (PD): 20,21,22 — 3题 (标准22题量表)
        { text: '在紧急情况下，当我看到有人需要帮助时，我容易感到不知所措', weight: 1, dimension: 'PD' },
        { text: '看到有人在紧急情况下需要帮助时，我会感到紧张', weight: 1, dimension: 'PD' },
        { text: '在情绪紧张的情境中，我经常感到焦虑和不安', weight: 1, dimension: 'PD' }
      ], SCALE_5, 'scale'
    ));

    // =========================================================
    // 4. SSI 社交技能量表 (20题)
    // =========================================================
    assessments.push(await seedAssessment(
      '社交技能量表(SSI)',
      '社交技能量表(Social Skills Inventory)评估个体在人际交往中的核心技能，涵盖表达能力、社交敏锐度、情绪调节、冲突处理和关系维护五个维度，帮助识别社交能力优势与成长空间。',
      '人际关系', 15, [
        { text: '我能清晰地表达自己的观点和想法', weight: 1, dimension: 'EX' },
        { text: '在与人交谈时，我能准确理解对方的言外之意', weight: 1, dimension: 'SE' },
        { text: '当我感到生气时，我能够控制自己的情绪', weight: 1, dimension: 'ER' },
        { text: '与人发生分歧时，我能理性地沟通而不激化矛盾', weight: 1, dimension: 'CF' },
        { text: '我能主动维持与朋友的联系', weight: 1, dimension: 'RM' },
        { text: '在表达不同意见时，我经常感到困难', weight: -1, dimension: 'EX' },
        { text: '我经常误解他人的意图', weight: -1, dimension: 'SE' },
        { text: '当情绪激动时，我很难冷静下来', weight: -1, dimension: 'ER' },
        { text: '面对冲突时，我倾向于逃避而不是面对', weight: -1, dimension: 'CF' },
        { text: '我很难让新朋友持续交往下去', weight: -1, dimension: 'RM' },
        { text: '我能用恰当的语言表达自己的情感', weight: 1, dimension: 'EX' },
        { text: '我能从他人的表情和肢体语言中读懂他们的情绪', weight: 1, dimension: 'SE' },
        { text: '即使被人批评，我也不会反应过度', weight: 1, dimension: 'ER' },
        { text: '我善于在冲突中找到双方都能接受的解决方案', weight: 1, dimension: 'CF' },
        { text: '我经常主动约朋友见面或参加活动', weight: 1, dimension: 'RM' },
        { text: '在群体讨论中，我很少主动发言', weight: -1, dimension: 'EX' },
        { text: '别人说话时，我经常走神', weight: -1, dimension: 'SE' },
        { text: '面对压力时，我容易对身边的人发火', weight: -1, dimension: 'ER' },
        { text: '我害怕与人正面冲突，宁可自己吃亏', weight: -1, dimension: 'CF' },
        { text: '我不太擅长维系远距离的人际关系', weight: -1, dimension: 'RM' }
      ], SCALE_5, 'scale'
    ));

    // =========================================================
    // 更新所有测评的 questions_count
    // =========================================================
    console.log('\n🔄 更新测评题目数量...');
    for (const id of assessments) {
      await database.run(`
        UPDATE assessments SET questions_count = (
          SELECT COUNT(*) FROM questions WHERE questions.assessment_id = ?
        ) WHERE id = ?
      `, [id, id]);
    }
    console.log('✅ 测评题目数量更新完成');

    // =========================================================
    // 显示结果
    // =========================================================
    console.log('\n📊 迁移结果统计:');
    const result = await database.all(`
      SELECT a.id, a.name, a.category, a.estimated_time,
             COUNT(q.id) as actual_questions
      FROM assessments a
      LEFT JOIN questions q ON a.id = q.assessment_id
      WHERE a.id IN (${assessments.join(',')})
      GROUP BY a.id
      ORDER BY a.id
    `);

    result.forEach(a => {
      console.log(`   ${a.id}. ${a.name}`);
      console.log(`      分类: ${a.category} | 题数: ${a.actual_questions} | 预计: ${a.estimated_time}分钟`);
    });

    console.log('\n🎉 人际关系测评迁移完成！');
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
