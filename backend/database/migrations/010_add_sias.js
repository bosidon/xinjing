// SIAS社交互动焦虑量表迁移 - 替换SAD(ID=10)
const path = require('path');
const projectRoot = path.join(__dirname, '..', '..');
const database = require(path.join(projectRoot, 'database', 'db'));

const SIAS_OPTIONS = JSON.stringify({
  '1': '完全不符合',
  '2': '比较不符合',
  '3': '有时符合',
  '4': '比较符合',
  '5': '完全符合'
});

// SIAS 19题版本（排除原第14题，跨文化调整）
// 反向题: #5, #9, #11 (容易与他人交往的题目，weight=-1)
const SIAS_QUESTIONS = [
  { text: '如果必须与权威人士（如老师、领导）交谈，我会感到紧张', weight: 1 },
  { text: '我很难与别人进行眼神接触', weight: 1 },
  { text: '如果必须谈论自己或自己的感受，我会变得紧张', weight: 1 },
  { text: '我很难与同事或同学舒适地相处', weight: 1 },
  { text: '我很容易与同龄人交朋友', weight: -1 },
  { text: '如果在路上遇到认识的人，我会变得紧张', weight: 1 },
  { text: '在社交场合中，我感到不自在', weight: 1 },
  { text: '如果只和一个人独处，我会感到紧张', weight: 1 },
  { text: '在社交场合中与人见面时，我感到很自在', weight: -1 },
  { text: '我很难与别人交谈', weight: 1 },
  { text: '我很容易找到话题来聊', weight: -1 },
  { text: '我担心自己表达时看起来很笨拙', weight: 1 },
  { text: '我很难不同意别人的观点', weight: 1 },
  { text: '我担心自己在社交场合中不知道说什么', weight: 1 },
  { text: '和不熟悉的人交往时，我感到紧张', weight: 1 },
  { text: '我担心自己在谈话时会说出尴尬的话', weight: 1 },
  { text: '在群体中时，我担心自己会被冷落', weight: 1 },
  { text: '在群体中时，我感到紧张', weight: 1 },
  { text: '我不确定是否该问候只有一面之缘的人', weight: 1 }
];

async function runMigration() {
  console.log('🚀 注入SIAS社交互动焦虑量表…');
  try {
    await database.connect();

    // 创建测评
    const result = await database.run(`
      INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [
      '社交互动焦虑(SIAS)量表',
      '社交互动焦虑量表(Social Interaction Anxiety Scale, SIAS)由Mattick和Clarke于1998年编制，是评估社交互动焦虑的标准工具。19题Likert5点量表，评估在各种社交互动情境中的焦虑程度。分数越高，社交互动焦虑越明显。',
      '人际关系',
      12,
      SIAS_QUESTIONS.length
    ]);

    const siasId = result.lastID;
    console.log(`✅ SIAS测评创建完成，ID: ${siasId}`);

    for (let i = 0; i < SIAS_QUESTIONS.length; i++) {
      const q = SIAS_QUESTIONS[i];
      await database.run(`
        INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
        VALUES (?, ?, 'scale', ?, ?, ?)
      `, [siasId, q.text, SIAS_OPTIONS, q.weight, i + 1]);
    }
    console.log(`✅ SIAS题目播种完成: ${SIAS_QUESTIONS.length} 题`);

    // 验证
    const count = await database.get(
      'SELECT COUNT(*) as cnt FROM questions WHERE assessment_id = ?', [siasId]
    );
    console.log(`\n📊 验证: SIAS测评实际题目数 = ${count.cnt}`);

    const reverseCount = await database.get(
      'SELECT COUNT(*) as cnt FROM questions WHERE assessment_id = ? AND weight = -1',
      [siasId]
    );
    console.log(`📊 反向题数: ${reverseCount.cnt}`);

    console.log('\n🎉 SIAS迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    await database.close();
  }
}

if (require.main === module) {
  runMigration().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = runMigration;
