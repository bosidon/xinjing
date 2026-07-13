#!/usr/bin/env node
/**
 * 富足心态测评 (ID=8) 题目改进迁移脚本
 * 
 * 改进要点：
 * 1. 去掉题目中的"正面：xxx / 负面：xxx"标签，改为中性提问
 * 2. 混合正向题和反向题（weight=-1），答题者无法无脑选"同意"
 * 3. 使用4种不同选项量表混排，增加混淆性
 */

const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'psychological_assessment.db');
const db = new Database(dbPath);

// ===== 4种选项量表 =====
const SCALE_A = JSON.stringify({1: '非常不同意', 2: '不同意', 3: '不确定', 4: '同意', 5: '非常同意'});
const SCALE_B = JSON.stringify({1: '从不', 2: '偶尔', 3: '有时', 4: '经常', 5: '总是'});
const SCALE_C = JSON.stringify({1: '完全不符合', 2: '不太符合', 3: '一般', 4: '比较符合', 5: '完全符合'});
const SCALE_D = JSON.stringify({1: '几乎没有', 2: '少数时候', 3: '约一半时间', 4: '多数时候', 5: '几乎总是'});

// 轮换用哪个量表
const scales = [SCALE_C, SCALE_A, SCALE_D, SCALE_B, SCALE_A, SCALE_C];

// ===== 42道新题 =====
// { text, scaleIndex, reverse }
// reverse=true → weight=-1 (反向计分), false → weight=1
const questions = [
  // ===== 维度1: 自我价值 (Q1-Q6) =====
  { text: '我清楚地知道自己的价值所在，不会因为别人的评价轻易动摇', scale: SCALE_C, reverse: false },
  { text: '当别人否定我时，我会长时间陷入自我怀疑', scale: SCALE_A, reverse: true },
  { text: '我敢于在重要场合表达自己真实的想法', scale: SCALE_D, reverse: false },
  { text: '我把自己的需求放在最后，优先照顾别人的感受', scale: SCALE_B, reverse: true },
  { text: '我对自己取得的成就感到自豪，不觉得只是运气', scale: SCALE_A, reverse: false },
  { text: '如果一件事没有做到完美，我就会觉得自己很失败', scale: SCALE_C, reverse: true },

  // ===== 维度2: 给予与接收 (Q7-Q12) =====
  { text: '接受别人的帮助会让我感到亏欠和不安', scale: SCALE_A, reverse: true },
  { text: '我愿意无偿分享自己的知识、时间和资源', scale: SCALE_D, reverse: false },
  { text: '收到礼物或赞美时，我的第一反应是推辞', scale: SCALE_B, reverse: true },
  { text: '我帮助别人时并不期待任何回报', scale: SCALE_C, reverse: false },
  { text: '即使真的需要帮助，我也很难开口向别人求助', scale: SCALE_A, reverse: true },
  { text: '付出之后，我觉得自己拥有的反而变得更充裕了', scale: SCALE_A, reverse: false },

  // ===== 维度3: 内在指引 (Q13-Q18) =====
  { text: '做重要决定时，我会参考内心的感觉而不仅靠理性分析', scale: SCALE_D, reverse: false },
  { text: '我觉得自己的直觉往往不太可靠', scale: SCALE_A, reverse: true },
  { text: '独处的时候，我能清晰地感受到内在的指引', scale: SCALE_B, reverse: false },
  { text: '面对选择时，我更相信专家的意见胜过自己的判断', scale: SCALE_C, reverse: true },
  { text: '即使外界一片反对，我依然能坚持内心认为对的事', scale: SCALE_A, reverse: false },
  { text: '我经常忽略内心隐约的提示，事后才后悔没听', scale: SCALE_D, reverse: true },

  // ===== 维度4: 成长心态 (Q19-Q24) =====
  { text: '对我来说，失败是最好的学习机会', scale: SCALE_A, reverse: false },
  { text: '如果一件事我做不好，我会本能地避开它', scale: SCALE_C, reverse: true },
  { text: '我主动寻找超出自己现有能力的挑战', scale: SCALE_D, reverse: false },
  { text: '收到批评时，我的第一反应是防御和辩解', scale: SCALE_B, reverse: true },
  { text: '我相信人的能力是可以培养的，不是天生固定的', scale: SCALE_A, reverse: false },
  { text: '我宁愿留在熟悉的地方，也不愿冒险尝试不确定的事', scale: SCALE_C, reverse: true },

  // ===== 维度5: 合作共赢 (Q25-Q30) =====
  { text: '看到身边的人取得成功，我会发自内心地为他们高兴', scale: SCALE_B, reverse: false },
  { text: '在竞争环境中，我担心别人的成功会减少我的机会', scale: SCALE_A, reverse: true },
  { text: '与人合作时，我习惯寻找让大家都受益的方案', scale: SCALE_C, reverse: false },
  { text: '认识新朋友时，我会下意识地评估对方是不是我的竞争者', scale: SCALE_D, reverse: true },
  { text: '我愿意主动把资源和机会分享给有需要的人', scale: SCALE_A, reverse: false },
  { text: '看到别人发光时，我感到自己的成就暗淡无光', scale: SCALE_B, reverse: true },

  // ===== 维度6: 使命与活力 (Q31-Q36) =====
  { text: '我现在做的事情让我感到充满能量和热情', scale: SCALE_C, reverse: false },
  { text: '我经常觉得生活只是在机械地重复，没什么意义', scale: SCALE_A, reverse: true },
  { text: '即使没有报酬，我也愿意做让我充满热情的事', scale: SCALE_D, reverse: false },
  { text: '选择方向时，我最主要考虑的是稳定和收入', scale: SCALE_B, reverse: true },
  { text: '每天早上醒来，我对新的一天有所期待', scale: SCALE_A, reverse: false },
  { text: '我常常拖延对自己长远重要的事，把精力花在琐碎上', scale: SCALE_D, reverse: true },

  // ===== 维度7: 积极聚焦 (Q37-Q42) =====
  { text: '即使在困难时期，我也能找到值得感恩的事', scale: SCALE_C, reverse: false },
  { text: '我常常不自觉地把注意力放在事物不好的一面', scale: SCALE_A, reverse: true },
  { text: '遇到问题时，我的自然反应是找办法解决而不是抱怨', scale: SCALE_B, reverse: false },
  { text: '我经常反复回想过去那些失败的经历', scale: SCALE_D, reverse: true },
  { text: '我相信未来会有更多好事发生在我身上', scale: SCALE_A, reverse: false },
  { text: '如果一件事可能有坏结果，我会提前反复担忧', scale: SCALE_C, reverse: true },
];

// ===== 执行迁移 =====
console.log('🗑️  删除旧题...');
const del = db.prepare('DELETE FROM questions WHERE assessment_id=8');
console.log(`   已删除 ${del.run().changes} 题`);

console.log('📝 插入新题...');
const insert = db.prepare(
  'INSERT INTO questions (assessment_id, question_text, question_type, options, weight, order_index) VALUES (?, ?, ?, ?, ?, ?)'
);

const insertMany = db.transaction((items) => {
  let count = 0;
  items.forEach((q, i) => {
    insert.run(8, q.text, 'scale', q.options, q.reverse ? -1 : 1, i + 1);
    count++;
  });
  return count;
});

const count = insertMany(questions);
console.log(`   已插入 ${count} 题`);

// 更新assessment统计
db.prepare('UPDATE assessments SET questions_count=? WHERE id=8').run(42);
console.log('📊 更新测评统计: questions_count=42');

// 打印预览
console.log('\n=== 新题预览 ===');
const newQs = db.prepare('SELECT order_index, question_text, options, weight FROM questions WHERE assessment_id=8 ORDER BY order_index').all();
newQs.forEach(q => {
  const opts = JSON.parse(q.options);
  const dir = q.weight === -1 ? '🔄反向' : '正向';
  console.log(`  Q${q.order_index.toString().padStart(2,'0')} [${dir}] ${q.question_text.substring(0, 50)}`);
  console.log(`      选项: ${Object.values(opts).join(' | ')}`);
});

db.close();
console.log('\n✅ 迁移完成');
