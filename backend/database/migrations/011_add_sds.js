// SDS抑郁自评量表迁移
const path = require('path');
const projectRoot = path.join(__dirname, '..', '..');
const database = require(path.join(projectRoot, 'database', 'db'));

const SDS_OPTIONS = JSON.stringify({
  '1': '没有或很少',
  '2': '有时',
  '3': '大部分时间',
  '4': '几乎总是'
});

// SDS 20题，10正10反
// 反向题(R): 2,5,6,11,12,14,16,17,18,20 → weight=-1
const SDS_QUESTIONS = [
  { text: '我觉得闷闷不乐，情绪低沉', weight: 1 },
  { text: '我觉得一天之中早晨最好', weight: -1 },
  { text: '我一阵阵哭出来或觉得想哭', weight: 1 },
  { text: '我晚上睡眠不好', weight: 1 },
  { text: '我吃得跟平常一样多', weight: -1 },
  { text: '我与异性亲密接触时感觉愉快', weight: -1 },
  { text: '我发觉我的体重在下降', weight: 1 },
  { text: '我有便秘的苦恼', weight: 1 },
  { text: '我心跳比平时快', weight: 1 },
  { text: '我无缘无故地感到疲乏', weight: 1 },
  { text: '我的头脑跟平常一样清楚', weight: -1 },
  { text: '我觉得经常做的事情并不困难', weight: -1 },
  { text: '我觉得不安而平静不下来', weight: 1 },
  { text: '我对将来抱有希望', weight: -1 },
  { text: '我比平常容易生气激动', weight: 1 },
  { text: '我觉得做出决定是容易的', weight: -1 },
  { text: '我觉得自己是个有用的人，有人需要我', weight: -1 },
  { text: '我的生活过得很有意思', weight: -1 },
  { text: '我认为如果我死了别人会生活得好些', weight: 1 },
  { text: '平常感兴趣的事我仍然感兴趣', weight: -1 }
];

async function runMigration() {
  console.log('🚀 注入SDS抑郁自评量表…');
  try {
    await database.connect();

    const result = await database.run(`
      INSERT INTO assessments (name, description, category, estimated_time, questions_count, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [
      'SDS抑郁自评量表',
      '抑郁自评量表(Self-Rating Depression Scale, SDS)由Zung于1965年编制，是国际上最常用的抑郁程度评估工具之一。包含20个项目，覆盖抑郁的认知、情绪、行为和躯体症状，可反映抑郁的轻重程度。',
      '心理健康',
      12,
      SDS_QUESTIONS.length
    ]);

    const sdsId = result.lastID;
    console.log(`✅ SDS测评创建完成，ID: ${sdsId}`);

    for (let i = 0; i < SDS_QUESTIONS.length; i++) {
      const q = SDS_QUESTIONS[i];
      await database.run(`
        INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index)
        VALUES (?, ?, 'scale', ?, ?, ?)
      `, [sdsId, q.text, SDS_OPTIONS, q.weight, i + 1]);
    }
    console.log(`✅ SDS题目播种完成: ${SDS_QUESTIONS.length} 题`);

    // 验证
    const count = await database.get(
      'SELECT COUNT(*) as cnt FROM questions WHERE assessment_id = ?', [sdsId]
    );
    const revCount = await database.get(
      'SELECT COUNT(*) as cnt FROM questions WHERE assessment_id = ? AND weight = -1', [sdsId]
    );
    console.log(`\n📊 验证: SDS实际题数=${count.cnt}，反向题=${revCount.cnt}`);
    console.log('🎉 SDS迁移完成！');
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
