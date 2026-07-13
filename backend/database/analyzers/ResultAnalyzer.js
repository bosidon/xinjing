// 测评结果分析模块
const path = require('path');
const database = require(path.join(__dirname, '..', 'db'));

class ResultAnalyzer {
    // 分析测评结果
    static async analyzeResult(resultId, assessmentId) {
        await database.connect();
        
        const result = await database.get(
            'SELECT * FROM assessment_results WHERE id = ?',
            [resultId]
        );
        
        const assessment = await database.get(
            'SELECT * FROM assessments WHERE id = ?',
            [assessmentId]
        );
        
        const answers = await database.all(`
            SELECT q.question_text, q.question_type, q.options, q.order_index, q.weight,
                   a.answer_value, a.score
            FROM answers a
            JOIN questions q ON a.question_id = q.id
            WHERE a.result_id = ?
            ORDER BY q.order_index
        `, [resultId]);
        
        switch (assessmentId) {
            case 1: return await this.analyzeMBTI(result, assessment, answers);
            case 2: return await this.analyzePHQ9(result, assessment, answers);
            case 3: return await this.analyzeHolland(result, assessment, answers);
            case 4: return await this.analyzeSAS(result, assessment, answers);
            case 5: return await this.analyzeGAD7(result, assessment, answers);
            case 6: return await this.analyzeBigFive(result, assessment, answers);
            case 7: return await this.analyzeEQ(result, assessment, answers);
            case 8: return await this.analyzeAbundance(result, assessment, answers);
            case 9: return await this.analyzeSelfLove(result, assessment, answers);
            case 10: return await this.analyzeSAD(result, assessment, answers);
            case 11: return await this.analyzeITS(result, assessment, answers);
            case 12: return await this.analyzeIRI(result, assessment, answers);
            case 13: return await this.analyzeSSI(result, assessment, answers);
            case 14: return await this.analyzeSIAS(result, assessment, answers);
            case 15: return await this.analyzeSDS(result, assessment, answers);
            case 16: return await this.analyzeParentChild(result, assessment, answers);
            case 17: return await this.analyzeMarriage(result, assessment, answers);
            case 18: return await this.analyzeSexuality(result, assessment, answers);
            default: return this.genericAnalysis(result, assessment, answers);
        }
    }

    // MBTI分析
    static async analyzeMBTI(result, assessment, answers) {
        const dimensions = {
            E_I: { E: 0, I: 0 },  // 外向-内向
            S_N: { S: 0, N: 0 },  // 实感-直觉
            T_F: { T: 0, F: 0 },  // 思考-情感
            J_P: { J: 0, P: 0 }   // 判断-感知
        };
        
        // 每题对应维度映射 (24题)
        // 先保留原有12题的映射（向后兼容），再添加12个新题的映射
        // 新题分组：Q13-15 → E/I, Q16-18 → S/N, Q19-22 → T/F, Q23-24 → J/P
        const dimensionMap = [
            { dim: 'E_I', a: 'E', b: 'I', c: 'I' },     // 1.社交场合 (原)
            { dim: 'T_F', a: 'T', b: 'F', c: 'F' },     // 2.做决定 (原)
            { dim: 'S_N', a: 'S', b: 'N', c: 'N' },     // 3.学习方式 (原)
            { dim: 'E_I', a: 'E', b: 'I', c: 'I' },     // 4.周末活动 (原)
            { dim: 'J_P', a: 'J', b: 'P', c: 'P' },     // 5.工作偏好 (原)
            { dim: 'J_P', a: 'J', b: 'P', c: 'F' },     // 6.面对压力 (原)
            { dim: 'S_N', a: 'S', b: 'N', c: 'F' },     // 7.注重方面 (原)
            { dim: 'E_I', a: 'E', b: 'N', c: 'E' },     // 8.团队角色 (原)
            { dim: 'S_N', a: 'S', b: 'N', c: 'F' },     // 9.工作环境 (原)
            { dim: 'J_P', a: 'J', b: 'P', c: 'P' },     // 10.突发事件 (原)
            { dim: 'T_F', a: 'T', b: 'N', c: 'F' },     // 11.擅长 (原)
            { dim: 'J_P', a: 'J', b: 'P', c: 'F' },     // 12.规则制度 (原)
            // ---- 新增12题 (25-36) ----
            { dim: 'E_I', a: 'E', b: 'I', c: 'I' },     // 25.恢复精力 (A=约朋友, B=独处, C=做手工)
            { dim: 'E_I', a: 'E', b: 'I', c: 'I' },     // 26.陌生场合 (A=融入, B=观察, C=安静)
            { dim: 'E_I', a: 'E', b: 'I', c: 'I' },     // 27.空闲时间 (A=约人, B=独处, C=均可)
            { dim: 'S_N', a: 'S', b: 'N', c: 'N' },     // 28.相信信息 (A=亲历事实, B=直觉, C=权威判断)
            { dim: 'S_N', a: 'S', b: 'N', c: 'N' },     // 29.聊天话题 (A=具体人事, B=未来可能, C=感受评价)
            { dim: 'S_N', a: 'S', b: 'N', c: 'N' },     // 30.电影偏好 (A=真实改编, B=天马行空, C=情感细腻)
            { dim: 'T_F', a: 'T', b: 'F', c: 'F' },     // 31.朋友困难 (A=分析出主意, B=陪伴安慰, C=先问需求)
            { dim: 'T_F', a: 'T', b: 'F', c: 'F' },     // 32.选择工作 (A=薪资前景, B=氛围关系, C=意义价值)
            { dim: 'T_F', a: 'T', b: 'F', c: 'F' },     // 33.面对分歧 (A=讲道理, B=照顾感受, C=看态度)
            { dim: 'J_P', a: 'J', b: 'P', c: 'P' },     // 34.桌面整洁 (A=整洁有序, B=乱中有序, C=随意)
            { dim: 'J_P', a: 'J', b: 'P', c: 'P' },     // 35.旅行风格 (A=详细攻略, B=大致方向, C=随性)
            { dim: 'J_P', a: 'J', b: 'P', c: 'P' }      // 36.截止日期 (A=提前完成, B=卡点完成, C=常延期)
        ];
        
        for (let i = 0; i < answers.length && i < dimensionMap.length; i++) {
            const map = dimensionMap[i];
            const val = answers[i].answer_value;
            if (val && dimensions[map.dim][map[val.toLowerCase()]] !== undefined) {
                dimensions[map.dim][map[val.toLowerCase()]]++;
            }
        }
        
        // 计算MBTI类型
        const type = [
            dimensions.E_I.E >= dimensions.E_I.I ? 'E' : 'I',
            dimensions.S_N.S >= dimensions.S_N.N ? 'S' : 'N',
            dimensions.T_F.T >= dimensions.T_F.F ? 'T' : 'F',
            dimensions.J_P.J >= dimensions.J_P.P ? 'J' : 'P'
        ].join('');
        
        const types = {
            'ISTJ': { title: '物流师', desc: '实际、事实-driven，可靠且负责。喜欢有条理、有计划地完成工作。' },
            'ISFJ': { title: '守护者', desc: '安静、友好、负责任且认真。致力于履行义务，关注他人需求。' },
            'INFJ': { title: '提倡者', desc: '寻求意义和联系，有强烈的理想主义。善于洞察他人，富有创造力。' },
            'INTJ': { title: '建筑师', desc: '独立、有远见，具有战略思维。对自己的想法和行动有很高的标准。' },
            'ISTP': { title: '鉴赏家', desc: '灵活、实际，善于动手。喜欢探索事物的工作原理，擅长解决具体问题。' },
            'ISFP': { title: '探险家', desc: '安静、友善、敏感且温和。享受当下，喜欢自己的空间和时间。' },
            'INFP': { title: '调停者', desc: '理想主义，忠于自己的价值观。富有创造力和想象力，追求意义和真实性。' },
            'INTP': { title: '逻辑学家', desc: '寻求逻辑解释，喜欢理论和抽象概念。安静、内省，对知识充满好奇。' },
            'ESTP': { title: '企业家', desc: '精力充沛，善于交际。喜欢行动和冒险，擅长随机应变和说服他人。' },
            'ESFP': { title: '表演者', desc: '外向、友好且充满活力。喜欢与他人互动，享受生活带来的乐趣。' },
            'ENFP': { title: '竞选者', desc: '热情、有创造力且善于社交。善于发现他人的潜力，充满好奇心和灵感。' },
            'ENTP': { title: '辩论家', desc: '聪明、好奇，喜欢挑战和辩论。善于看到问题的不同角度，富有创意。' },
            'ESTJ': { title: '总经理', desc: '实际、现实且果断。善于组织和管理，重视效率和结果。' },
            'ESFJ': { title: '执政官', desc: '热心、有责任心且善于合作。注重和谐，乐于帮助他人。' },
            'ENFJ': { title: '主人公', desc: '有魅力、有说服力且富有同理心。善于激励他人，关注他人的成长。' },
            'ENTJ': { title: '指挥官', desc: '大胆、有远见且意志坚定。天生的领导者，善于制定战略和实现目标。' }
        };
        
        const profile = types[type] || { title: '综合型', desc: '你具有多种性格类型的特征，是一个全面发展的个体。' };
        
        const details = {
            type: type,
            profile: profile,
            dimensions: {
                E_I: { E: dimensions.E_I.E, I: dimensions.E_I.I, result: dimensions.E_I.E >= dimensions.E_I.I ? '外向(E)' : '内向(I)' },
                S_N: { S: dimensions.S_N.S, N: dimensions.S_N.N, result: dimensions.S_N.S >= dimensions.S_N.N ? '实感(S)' : '直觉(N)' },
                T_F: { T: dimensions.T_F.T, F: dimensions.T_F.F, result: dimensions.T_F.T >= dimensions.T_F.F ? '思考(T)' : '情感(F)' },
                J_P: { J: dimensions.J_P.J, P: dimensions.J_P.P, result: dimensions.J_P.J >= dimensions.J_P.P ? '判断(J)' : '感知(P)' }
            }
        };
        
        return {
            analysisType: 'MBTI',
            personalityType: type,
            personalityTitle: profile.title,
            dimensions: details.dimensions,
            summary: `你的MBTI性格类型是 ${type}（${profile.title}）。${profile.desc}`,
            details: JSON.stringify(details),
            score: null
        };
    }

    // PHQ-9分析
    static async analyzePHQ9(result, assessment, answers) {
        let totalScore = 0;
        for (const answer of answers) {
            totalScore += parseInt(answer.answer_value) || 0;
        }
        
        let severity, recommendation;
        if (totalScore <= 4) {
            severity = '无抑郁症状';
            recommendation = '你的心理健康状况良好，建议继续保持积极的生活方式。';
        } else if (totalScore <= 9) {
            severity = '轻度抑郁';
            recommendation = '你可能有一些轻微的情绪困扰，建议多与朋友家人交流，保持规律的作息和运动。';
        } else if (totalScore <= 14) {
            severity = '中度抑郁';
            recommendation = '你可能有中度抑郁症状，建议寻求专业的心理咨询帮助，同时注意自我调节。';
        } else if (totalScore <= 19) {
            severity = '中重度抑郁';
            recommendation = '你可能有中重度抑郁症状，强烈建议立即寻求专业心理医生的帮助。';
        } else {
            severity = '重度抑郁';
            recommendation = '你可能有重度抑郁症状，请立即寻求专业心理医生的帮助。如有紧急情况，请拨打心理援助热线。';
        }
        
        const details = {
            totalScore: totalScore,
            severity: severity,
            recommendation: recommendation,
            symptoms: answers.map(a => ({
                question: a.question_text,
                score: parseInt(a.answer_value) || 0
            }))
        };
        
        return {
            analysisType: 'PHQ-9',
            severity: severity,
            score: totalScore,
            summary: `你的PHQ-9评分为 ${totalScore} 分，属于${severity}。${recommendation}`,
            details: JSON.stringify(details),
        };
    }

    // 霍兰德分析
    static async analyzeHolland(result, assessment, answers) {
        const scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
        
        // 每题对应维度 (12题)
        const qMap = [
            { type: 'S', a: 'A', b: 'B', c: 'C', d: 'D' },  // 1.帮助他人
            { type: 'I', a: 'A', b: 'B', c: 'C', d: 'D' },  // 2.研究原理
            { type: 'R', a: 'A', b: 'B', c: 'C', d: 'D' },  // 3.动手制作
            { type: 'E', a: 'A', b: 'B', c: 'C', d: 'D' },  // 4.组织管理
            { type: 'A', a: 'A', b: 'B', c: 'C', d: 'D' },  // 5.艺术创作
            { type: 'C', a: 'A', b: 'B', c: 'C', d: 'D' },  // 6.规则流程
            // ---- 新增6题 (同上六种类型) ----
            { type: 'R', a: 'A', b: 'B', c: 'C', d: 'D' },  // 7.使用工具
            { type: 'I', a: 'A', b: 'B', c: 'C', d: 'D' },  // 8.分析数据
            { type: 'A', a: 'A', b: 'B', c: 'C', d: 'D' },  // 9.艺术表达
            { type: 'S', a: 'A', b: 'B', c: 'C', d: 'D' },  // 10.帮助学习
            { type: 'E', a: 'A', b: 'B', c: 'C', d: 'D' },  // 11.推销产品
            { type: 'C', a: 'A', b: 'B', c: 'C', d: 'D' },  // 12.整理分类
            // ---- 新增12题 (13-24) ----
            { type: 'R', a: 'A', b: 'B', c: 'C', d: 'D' },  // 13.户外体力劳动
            { type: 'R', a: 'A', b: 'B', c: 'C', d: 'D' },  // 14.组装拆卸物品
            { type: 'I', a: 'A', b: 'B', c: 'C', d: 'D' },  // 15.解决逻辑谜题
            { type: 'I', a: 'A', b: 'B', c: 'C', d: 'D' },  // 16.阅读学术文章
            { type: 'A', a: 'A', b: 'B', c: 'C', d: 'D' },  // 17.参观艺术展
            { type: 'A', a: 'A', b: 'B', c: 'C', d: 'D' },  // 18.设计装饰
            { type: 'S', a: 'A', b: 'B', c: 'C', d: 'D' },  // 19.志愿服务
            { type: 'S', a: 'A', b: 'B', c: 'C', d: 'D' },  // 20.调解矛盾
            { type: 'E', a: 'A', b: 'B', c: 'C', d: 'D' },  // 21.主导项目
            { type: 'E', a: 'A', b: 'B', c: 'C', d: 'D' },  // 22.公开演讲
            { type: 'C', a: 'A', b: 'B', c: 'C', d: 'D' },  // 23.核对数据
            { type: 'C', a: 'A', b: 'B', c: 'C', d: 'D' }   // 24.维护表格
        ];
        
        for (let i = 0; i < answers.length && i < qMap.length; i++) {
            const map = qMap[i];
            const val = answers[i].answer_value;
            if (val === 'A') scores[map.type] += 4;
            else if (val === 'B') scores[map.type] += 3;
            else if (val === 'C') scores[map.type] += 2;
            else if (val === 'D') scores[map.type] += 1;
        }
        
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const top3 = sorted.slice(0, 3).map(s => s[0]);
        const code = top3.join('');
        
        const types = {
            'R': { name: '现实型', desc: '喜欢动手操作，偏好具体任务，适合技术性工作' },
            'I': { name: '研究型', desc: '喜欢思考分析，偏好理论探索，适合科研工作' },
            'A': { name: '艺术型', desc: '喜欢创意表达，偏好自由环境，适合创意工作' },
            'S': { name: '社会型', desc: '喜欢帮助他人，偏好人际交往，适合服务性工作' },
            'E': { name: '企业型', desc: '喜欢领导管理，偏好商业活动，适合管理类工作' },
            'C': { name: '常规型', desc: '喜欢条理有序，偏好规范流程，适合行政类工作' }
        };
        
        const careerSuggestions = {
            'R': ['工程师', '技术员', '建筑师', '机械师', '程序员'],
            'I': ['科学家', '研究员', '医生', '分析师', '教授'],
            'A': ['设计师', '作家', '艺术家', '音乐家', '策划师'],
            'S': ['教师', '咨询师', '护士', '社工', '人力资源'],
            'E': ['经理', '企业家', '销售总监', '项目经理', '顾问'],
            'C': ['会计', '审计师', '行政主管', '数据分析师', '档案管理员']
        };
        
        const careers = top3.flatMap(t => careerSuggestions[t] || []).slice(0, 6);
        
        const details = {
            code: code,
            scores: scores,
            topTypes: sorted.map(s => ({
                code: s[0],
                name: types[s[0]].name,
                desc: types[s[0]].desc,
                score: s[1]
            })),
            recommendedCareers: careers
        };
        
        return {
            analysisType: '霍兰德',
            hollandCode: code,
            topTypes: top3.map(t => types[t].name).join('-'),
            scores: details.scores,
            summary: `你的霍兰德职业兴趣代码是 ${code}（${top3.map(t => types[t].name).join('-')}）。推荐职业方向：${careers.slice(0, 3).join('、')}等。`,
            details: JSON.stringify(details),
            score: null
        };
    }

    // =========================================================
    // SAS焦虑自评量表分析
    // 20题，每題1-4分，其中5题(5,9,13,17,19)为反向计分
    // 粗分 = 各项得分之和(20-80)
    // 标准分 = 粗分 × 1.25 (取整数部分)
    // 标准分 < 50 正常，50-59 轻度焦虑，60-69 中度焦虑，≥70 重度焦虑
    // =========================================================
    static async analyzeSAS(result, assessment, answers) {
        // SAS反向计分题 (原始value 1-4, 反向 = 5-原始值)
        const reverseIndices = [4, 8, 12, 16, 18]; // 0-based: questions 5,9,13,17,19
        let rawScore = 0;

        for (let i = 0; i < answers.length; i++) {
            const val = parseInt(answers[i].answer_value) || 1;
            if (reverseIndices.includes(i)) {
                rawScore += (5 - val); // reverse score: 1->4, 2->3, 3->2, 4->1
            } else {
                rawScore += val;
            }
        }

        const standardScore = Math.floor(rawScore * 1.25);
        
        let severity, recommendation;
        if (standardScore < 50) {
            severity = '正常';
            recommendation = '你的焦虑水平在正常范围内，请继续保持良好的心态和生活方式。';
        } else if (standardScore < 60) {
            severity = '轻度焦虑';
            recommendation = '你可能有轻度焦虑倾向，建议适当放松、规律作息，通过运动或冥想缓解压力。';
        } else if (standardScore < 70) {
            severity = '中度焦虑';
            recommendation = '你可能有中度焦虑症状，建议寻求专业心理咨询帮助。同时注意调整生活方式，减少压力源。';
        } else {
            severity = '重度焦虑';
            recommendation = '你可能有重度焦虑症状，请立即寻求专业心理医生的帮助。如有紧急情况，请拨打心理援助热线。';
        }

        const details = {
            rawScore: rawScore,
            standardScore: standardScore,
            severity: severity,
            recommendation: recommendation,
            reverseItems: [5, 9, 13, 17, 19],
            items: answers.map((a, i) => ({
                question: a.question_text,
                rawValue: parseInt(a.answer_value) || 1,
                reversed: reverseIndices.includes(i),
                adjustedScore: reverseIndices.includes(i) ? (5 - (parseInt(a.answer_value) || 1)) : (parseInt(a.answer_value) || 1)
            }))
        };

        return {
            analysisType: 'SAS',
            severity: severity,
            score: standardScore,
            rawScore: rawScore,
            summary: `你的SAS焦虑量表粗分为 ${rawScore} 分，标准分为 ${standardScore} 分，属于${severity}。${recommendation}`,
            details: JSON.stringify(details),
        };
    }

    // =========================================================
    // GAD-7广泛性焦虑障碍量表分析
    // 7题，每題0-3分
    // 0-4 无焦虑  5-9 轻度  10-14 中度  15+ 重度
    // =========================================================
    static async analyzeGAD7(result, assessment, answers) {
        let totalScore = 0;
        for (const answer of answers) {
            totalScore += parseInt(answer.answer_value) || 0;
        }

        let severity, recommendation;
        if (totalScore <= 4) {
            severity = '无焦虑症状';
            recommendation = '你的焦虑水平在正常范围内，建议继续保持良好的生活习惯。';
        } else if (totalScore <= 9) {
            severity = '轻度焦虑';
            recommendation = '你可能有轻度焦虑症状，建议关注自己的心理状态，多与亲友交流，保持规律的运动和作息。';
        } else if (totalScore <= 14) {
            severity = '中度焦虑';
            recommendation = '你可能有中度焦虑症状，建议寻求专业心理咨询帮助，学习放松技巧和压力管理方法。';
        } else {
            severity = '重度焦虑';
            recommendation = '你可能有重度焦虑症状，强烈建议立即寻求专业心理医生的帮助，接受进一步评估和治疗。';
        }

        const details = {
            totalScore: totalScore,
            severity: severity,
            recommendation: recommendation,
            severityLevels: {
                none: { range: '0-4', label: '无焦虑' },
                mild: { range: '5-9', label: '轻度焦虑' },
                moderate: { range: '10-14', label: '中度焦虑' },
                severe: { range: '15-21', label: '重度焦虑' }
            },
            symptoms: answers.map(a => ({
                question: a.question_text,
                score: parseInt(a.answer_value) || 0
            }))
        };

        return {
            analysisType: 'GAD-7',
            severity: severity,
            score: totalScore,
            summary: `你的GAD-7评分为 ${totalScore} 分，属于${severity}。${recommendation}`,
            details: JSON.stringify(details),
        };
    }

    // =========================================================
    // 大五人格测试分析 (mini-IPIP)
    // 20题，每題1-5分，每个维度4题
    // 维度: 外倾性(E), 宜人性(A), 尽责性(C), 神经质(N), 开放性(O)
    //
    // 原有10题 (Q1-Q10)：每维度2题，1正1反
    //   E: Q1 (正), Q6 (反)
    //   A: Q2 (正), Q7 (反)
    //   C: Q3 (正), Q8 (反)
    //   N: Q4 (正), Q9 (反)
    //   O: Q5 (正), Q10 (反)
    //
    // 新增10题 (Q11-Q20)：每维度补2题
    //   E: Q11 (正), Q12 (正)
    //   A: Q13 (正), Q14 (正)
    //   C: Q15 (正), Q16 (反)
    //   N: Q17 (正), Q18 (正)
    //   O: Q19 (正), Q20 (反)
    //
    // 返回计分题 (7题)：Q6, Q7, Q8, Q9, Q10, Q16, Q20
    // =========================================================
    static async analyzeBigFive(result, assessment, answers) {
        // Dimension mapping: index (0-based) -> {dim, reverse}
        // 保持原有10题映射不变（向后兼容），新增10题按维度分组
        const dimensionMap = [
            // ==== 原有10题（保持原映射）====
            { dim: 'E', reverse: false },  // Q1  聚会的灵魂人物 (E)
            { dim: 'A', reverse: false },  // Q2  感同身受 (A)
            { dim: 'C', reverse: false },  // Q3  做事井井有条 (C)
            { dim: 'N', reverse: false },  // Q4  情绪低落 (N)
            { dim: 'O', reverse: false },  // Q5  想象力丰富 (O)
            { dim: 'E', reverse: true },   // Q6  不太爱说话 (E, 反)
            { dim: 'A', reverse: true },   // Q7  对他人不感兴趣 (A, 反)
            { dim: 'C', reverse: true },   // Q8  经常搞糟 (C, 反)
            { dim: 'N', reverse: true },   // Q9  情绪平稳 (N, 反)
            { dim: 'O', reverse: true },   // Q10 不喜抽象思维 (O, 反)
            // ==== 新增10题 ====
            { dim: 'E', reverse: false },  // Q11 喜欢成为焦点 (E)
            { dim: 'E', reverse: false },  // Q12 喜欢热闹社交 (E)
            { dim: 'A', reverse: false },  // Q13 相信他人善意 (A)
            { dim: 'A', reverse: false },  // Q14 主动帮助他人 (A)
            { dim: 'C', reverse: false },  // Q15 按时完成任务 (C)
            { dim: 'C', reverse: true },   // Q16 做事粗心忽略细节 (C, 反)
            { dim: 'N', reverse: false },  // Q17 容易紧张焦虑 (N)
            { dim: 'N', reverse: false },  // Q18 面对压力难放松 (N)
            { dim: 'O', reverse: false },  // Q19 探索新地方 (O)
            { dim: 'O', reverse: true }    // Q20 对艺术活动不感兴趣 (O, 反)
        ];

        const dimScores = { E: 0, A: 0, C: 0, N: 0, O: 0 };
        const dimCounts = { E: 0, A: 0, C: 0, N: 0, O: 0 };

        for (let i = 0; i < answers.length && i < dimensionMap.length; i++) {
            const rawVal = parseInt(answers[i].answer_value) || 3;
            const map = dimensionMap[i];
            // For 1-5 scale, reverse = 6 - rawVal
            const adjustedVal = map.reverse ? (6 - rawVal) : rawVal;
            dimScores[map.dim] += adjustedVal;
            dimCounts[map.dim]++;
        }

        // Calculate average per dimension (1-5 scale)
        const dimAverages = {};
        for (const dim of ['E', 'A', 'C', 'N', 'O']) {
            dimAverages[dim] = dimCounts[dim] > 0 ? (dimScores[dim] / dimCounts[dim]) : 3;
        }

        const dimNames = {
            'E': { name: '外倾性(Extraversion)', low: '内向', high: '外向' },
            'A': { name: '宜人性(Agreeableness)', low: '挑战型', high: '友善型' },
            'C': { name: '尽责性(Conscientiousness)', low: '灵活型', high: '严谨型' },
            'N': { name: '神经质(Neuroticism)', low: '情绪稳定', high: '情绪敏感' },
            'O': { name: '开放性(Openness)', low: '传统型', high: '探索型' }
        };

        const dimDescriptions = {
            'E': {
                high: '你喜欢与人交往，充满活力，在社交场合中感到自在。你善于表达自己，乐于成为关注的焦点。',
                low: '你倾向于安静和内敛，享受独处或小范围的深入交流。你精力恢复更多来自内在世界而非外部社交。'
            },
            'A': {
                high: '你富有同情心，乐于合作，重视和谐的人际关系。你信任他人，愿意帮助别人。',
                low: '你更倾向于独立和竞争，不轻易被他人影响。你重视自己的判断，有时会比较怀疑他人的动机。'
            },
            'C': {
                high: '你做事有条理、有责任感，追求成就和自律。你善于规划，注重细节，可靠且值得信赖。',
                low: '你比较随性和灵活，不太拘泥于计划和规则。你喜欢即兴发挥，适应能力强。'
            },
            'N': {
                high: '你对情绪体验比较敏感，容易感受到压力和负面情绪。你的情绪波动可能较为明显。',
                low: '你情绪稳定，心态平和，不易被外界压力影响。你能很好地应对挫折和压力。'
            },
            'O': {
                high: '你好奇心强，富有想象力，喜欢尝试新事物。你对艺术、抽象概念和新体验持开放态度。',
                low: '你偏好传统和熟悉的事物，喜欢实际和具体的信息。你倾向于保持现有的生活方式。'
            }
        };

        const dimensions = {};
        for (const dim of ['E', 'A', 'C', 'N', 'O']) {
            const avg = dimAverages[dim];
            const isLow = avg < 3;
            const dimInfo = dimNames[dim];
            const desc = isLow ? dimDescriptions[dim].low : dimDescriptions[dim].high;
            const trait = isLow ? dimInfo.low : dimInfo.high;
            dimensions[dim] = {
                score: Math.round(avg * 10) / 10,
                label: trait,
                description: desc,
                level: avg >= 4 ? '高' : avg >= 2.5 ? '中等' : '低'
            };
        }

        const details = {
            dimensions: dimensions,
            dimAverages: dimAverages,
            rawScores: dimScores
        };

        // Build summary
        const traits = [];
        for (const dim of ['E', 'A', 'C', 'N', 'O']) {
            traits.push(`${dim}: ${dimensions[dim].label}`);
        }
        const summary = `你的大五人格剖面：\n外倾性: ${dimensions.E.label} (${dimensions.E.score}/5)\n宜人性: ${dimensions.A.label} (${dimensions.A.score}/5)\n尽责性: ${dimensions.C.label} (${dimensions.C.score}/5)\n神经质: ${dimensions.N.label} (${dimensions.N.score}/5)\n开放性: ${dimensions.O.label} (${dimensions.O.score}/5)\n\n外向的人在社交中充满活力；友善的人重视合作；严谨的人可靠有序；情绪稳定的人抗压能力强；好奇的人乐于探索新事物。没有"最好"的性格，了解自己才能更好地发展。`;

        return {
            analysisType: '大五人格',
            dimensions: dimensions,
            score: Math.round(Object.values(dimAverages).reduce((a, b) => a + b, 0) / 5 * 10) / 10,
            summary: summary,
            details: JSON.stringify(details),
        };
    }

    // =========================================================
    // 情商(EQ)测试分析
    // 20题，每題1-5分，覆盖5个维度(每维度4题)
    // 维度: 自我认知, 同理心, 情绪调节, 社交技能, 自我激励
    // =========================================================
    static async analyzeEQ(result, assessment, answers) {
        // Dimension mapping (20 questions, 4 per dimension)
        const dimMap = [
            { dim: '自我认知' },      // Q1 识别情绪
            { dim: '自我认知' },      // Q2 了解优缺点
            { dim: '同理心' },        // Q3 感受他人变化
            { dim: '同理心' },        // Q4 理解他人立场
            { dim: '情绪调节' },      // Q5 控制言行
            { dim: '情绪调节' },      // Q6 快速调整
            { dim: '社交技能' },      // Q7 建立联系
            { dim: '社交技能' },      // Q8 解决冲突
            { dim: '自我激励' },      // Q9 设定目标
            { dim: '自我激励' },      // Q10 保持积极
            // ---- 新增10题 ----
            { dim: '自我认知' },      // Q11 识别变化及其原因
            { dim: '自我认知' },      // Q12 知道触发因素
            { dim: '同理心' },        // Q13 从语调察觉感受
            { dim: '同理心' },        // Q14 理解他人行为原因
            { dim: '情绪调节' },      // Q15 处理批评
            { dim: '情绪调节' },      // Q16 让自己平静
            { dim: '社交技能' },      // Q17 与陌生人建立印象
            { dim: '社交技能' },      // Q18 调整言行适应场合
            { dim: '自我激励' },      // Q19 坚持目标
            { dim: '自我激励' }       // Q20 主动学习
        ];

        const dimScores = {
            '自我认知': { total: 0, count: 0, items: [] },
            '同理心': { total: 0, count: 0, items: [] },
            '情绪调节': { total: 0, count: 0, items: [] },
            '社交技能': { total: 0, count: 0, items: [] },
            '自我激励': { total: 0, count: 0, items: [] }
        };

        for (let i = 0; i < answers.length && i < dimMap.length; i++) {
            const val = parseInt(answers[i].answer_value) || 3;
            const dim = dimMap[i].dim;
            dimScores[dim].total += val;
            dimScores[dim].count++;
            dimScores[dim].items.push({
                question: answers[i].question_text,
                score: val
            });
        }

        // Calculate averages per dimension
        const dimAverages = {};
        let totalEQScore = 0;
        let totalDimCount = 0;

        for (const [dim, data] of Object.entries(dimScores)) {
            const avg = data.count > 0 ? (data.total / data.count) : 3;
            dimAverages[dim] = Math.round(avg * 10) / 10;
            totalEQScore += data.total;
            totalDimCount += data.count;
        }

        const avgScore = totalDimCount > 0 ? Math.round((totalEQScore / totalDimCount) * 10) / 10 : 3;

        // Interpret each dimension
        const dimInterpretation = {
            '自我认知': {
                high: '你非常了解自己的情绪状态和优缺点，能够准确识别内心的感受。',
                low: '你可能对自身的情绪状态不够敏感，建议多花时间关注和反思自己的内心感受。'
            },
            '同理心': {
                high: '你善于感知和理解他人的情绪，能够站在他人的角度思考问题。',
                low: '你可能在理解他人感受方面有所欠缺，建议多倾听和观察他人的情绪表达。'
            },
            '情绪调节': {
                high: '你擅长管理自己的情绪，能够在压力下保持冷静，有效应对挫折。',
                low: '你在情绪管理方面可能需要加强，建议学习一些情绪调节的技巧，如深呼吸、正念冥想等。'
            },
            '社交技能': {
                high: '你拥有出色的社交能力，善于与人建立和维护关系，能有效处理人际冲突。',
                low: '你在社交方面可能需要多加练习，建议多参与社交活动，主动与人交流。'
            },
            '自我激励': {
                high: '你有很强的内在驱动力，能够为目标持续努力，面对困难保持积极心态。',
                low: '你的自我激励能力有待提升，建议设定明确的小目标，逐步建立成就感。'
            }
        };

        const dimensions = {};
        for (const [dim, avg] of Object.entries(dimAverages)) {
            const isHigh = avg >= 3.5;
            const interp = dimInterpretation[dim];
            dimensions[dim] = {
                score: avg,
                level: avg >= 4 ? '较强' : avg >= 3 ? '中等' : '有待提升',
                description: isHigh ? interp.high : interp.low
            };
        }

        // Overall interpretation
        let overallLevel, overallDesc;
        if (avgScore >= 4) {
            overallLevel = '较高情商';
            overallDesc = '你拥有较高的情绪智力，能够很好地管理自己和他人的情绪，在人际交往中表现出色。';
        } else if (avgScore >= 3) {
            overallLevel = '中等情商';
            overallDesc = '你的情绪智力处于中等水平，有一定的情绪管理能力，但在某些方面还有提升空间。';
        } else {
            overallLevel = '有待提升';
            overallDesc = '你的情绪智力有较大的提升空间，建议有意识地培养自我认知、同理心和情绪管理能力。';
        }

        const details = {
            totalScore: totalEQScore,
            averageScore: avgScore,
            overallLevel: overallLevel,
            dimensions: dimensions,
            dimScores: dimScores
        };

        const summary = `你的情商测评总分为 ${avgScore}/5 分（${overallLevel}）。${overallDesc}\n各维度评分：${Object.entries(dimAverages).map(([dim, score]) => `${dim}:${score}`).join('、')}`;

        return {
            analysisType: '情商(EQ)',
            overallLevel: overallLevel,
            dimensions: dimensions,
            score: avgScore,
            summary: summary,
            details: JSON.stringify(details),
        };
    }

    // =========================================================
    // 富足心态测评分析 (v2 - 2026-05-26)
    // 42题，混合正向/反向题
    // 正向题: 1-5分 (同意=富足)
    // 反向题: weight=-1, 计分翻转 (1→5, 5→1)
    // 总分范围: 42-210
    // 7个维度，每维度6题
    // =========================================================
    static async analyzeAbundance(result, assessment, answers) {
        // Dimension definitions: 每个维度6题, 按order_index排序 (0-indexed)
        // 维度1: 自我价值  - Q01-Q06 → [0,1,2,3,4,5]
        // 维度2: 给予与接收 - Q07-Q12 → [6,7,8,9,10,11]
        // 维度3: 内在指引  - Q13-Q18 → [12,13,14,15,16,17]
        // 维度4: 成长心态  - Q19-Q24 → [18,19,20,21,22,23]
        // 维度5: 合作共赢  - Q25-Q30 → [24,25,26,27,28,29]
        // 维度6: 使命与活力 - Q31-Q36 → [30,31,32,33,34,35]
        // 维度7: 积极聚焦  - Q37-Q42 → [36,37,38,39,40,41]
        //
        // 反向计分题(weight=-1): Q2,4,6,7,9,11,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42
        // 0-index: [1,3,5,6,8,10,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41]

        const dimConfig = {
            '自我价值': { questions: [0, 1, 2, 3, 4, 5], desc: '你对自己价值的认同和信任程度' },
            '给予与接收': { questions: [6, 7, 8, 9, 10, 11], desc: '你与他人之间给予和接收的平衡能力' },
            '内在指引': { questions: [12, 13, 14, 15, 16, 17], desc: '你倾听并遵循内在智慧的程度' },
            '成长心态': { questions: [18, 19, 20, 21, 22, 23], desc: '你面对挑战和成长的开放程度' },
            '合作共赢': { questions: [24, 25, 26, 27, 28, 29], desc: '你与他人合作并追求共赢的倾向' },
            '使命与活力': { questions: [30, 31, 32, 33, 34, 35], desc: '你追随使命和保持活力的程度' },
            '积极聚焦': { questions: [36, 37, 38, 39, 40, 41], desc: '你关注积极面和正面心态的能力' }
        };

        // 反向计分: weight=-1 的题目翻转分数
        function normalizeScore(answer) {
            const raw = parseInt(answer.answer_value) || 3;
            if (answer.weight === -1) {
                return 6 - raw;  // 1→5, 2→4, 3→3, 4→2, 5→1
            }
            return raw;
        }

        // Calculate total score with reverse scoring
        let totalScore = 0;
        const rawScores = [];
        for (const answer of answers) {
            const score = normalizeScore(answer);
            rawScores.push(score);
            totalScore += score;
        }

        // Calculate dimension scores
        const dimensions = {};
        for (const [dimName, config] of Object.entries(dimConfig)) {
            let dimTotal = 0;
            const items = [];
            for (const qIdx of config.questions) {
                if (qIdx < rawScores.length) {
                    const score = rawScores[qIdx];
                    dimTotal += score;
                    items.push({
                        question: answers[qIdx].question_text,
                        score: score,
                        isReverse: answers[qIdx].weight === -1
                    });
                }
            }
            const avg = items.length > 0 ? Math.round((dimTotal / items.length) * 10) / 10 : 3;
            dimensions[dimName] = {
                score: avg,
                description: config.desc,
                items: items
            };
        }

    // 确定严重程度
        let severity, severityLevel, summary;
        if (totalScore <= 84) {
            severity = '匮乏思维显著';
            severityLevel = 'strong_scarcity';
            summary = '你的财商指数评分为 ' + totalScore + ' 分（满分210分），属于「匮乏思维显著」水平。这表明你在许多方面倾向于匮乏思维模式，可能经常感到资源有限、害怕失去、难以信任自己和他人。这并不意味着你不够好——匮乏思维往往是成长环境和经历塑造的结果。建议你从觉察自己的思维模式开始，逐步培养丰盛思维。';
        } else if (totalScore <= 126) {
            severity = '混合思维';
            severityLevel = 'mixed';
            summary = '你的财商指数评分为 ' + totalScore + ' 分（满分210分），属于「混合思维」水平。这表明你在某些方面已经具备丰盛思维，但在其他方面仍受到匮乏思维的影响。这是一个很常见的状态——大部分人都处在这个区间。建议你关注得分较低的维度，有针对性地进行改善。';
        } else if (totalScore <= 168) {
            severity = '丰盛倾向';
            severityLevel = 'abundance_tendency';
            summary = '你的财商指数评分为 ' + totalScore + ' 分（满分210分），属于「丰盛倾向」水平。这表明你在大部分方面都表现出丰盛思维模式，能够信任自己和他人，乐于分享和合作。继续加强你已有的优势维度，同时留意那些仍有提升空间的方面。';
        } else {
            severity = '丰盛思维显著';
            severityLevel = 'strong_abundance';
            summary = '你的财商指数评分为 ' + totalScore + ' 分（满分210分），属于「丰盛思维显著」水平。这是一个非常高的分数！你展现出了强烈的丰盛思维模式：信任自己的价值、乐于给予和接收、关注成长和合作。请继续保持，同时也可以用自己的经验去影响和帮助他人。';
        }

        // Build dimension-level recommendations
        const dimAdvice = {
            '自我价值': {
                low: '关注并练习自我肯定，记录每天的小成就，学习拒绝不合理的要求。考虑进行个人成长方面的阅读或课程。',
                medium: '你的自我价值感处于中等水平。继续加强对自己的信任，练习在关系中设立健康的边界。',
                high: '你的自我价值感很强。继续保持对自己的信任，你可以尝试帮助他人发现自己的价值。'
            },
            '给予与接收': {
                low: '练习敞开心扉接受他人的帮助和馈赠，同时学会不求回报地给予。注意平衡「给」与「得」。',
                medium: '你在给予与接收方面有一定平衡，但仍有提升空间。尝试更自在地接受赞美和帮助。',
                high: '你在给予与接收方面做得很好。继续保持这种开放和平衡的态度。'
            },
            '内在指引': {
                low: '尝试每天花几分钟安静下来，关注内心的声音。可以通过冥想、写日记等方式加强与内在的联系。',
                medium: '你偶尔会倾听内在的指引。建议增加独处和自我反思的时间，信任自己的直觉。',
                high: '你很好地倾听和遵循内在指引。继续信任你的内在智慧。'
            },
            '成长心态': {
                low: '尝试将挑战视为成长的机会而非威胁。从小处开始，逐步扩大舒适区。记住：成长发生在舒适区之外。',
                medium: '你有一定的成长心态。鼓励自己更多地拥抱挑战，相信「还不够好」只是暂时的状态。',
                high: '你有着出色的成长心态。继续保持对挑战的开放态度，你的成长潜力是无限的。'
            },
            '合作共赢': {
                low: '练习关注「我们」而非「我」。寻找合作的机会，尝试为别人的成功感到真诚的高兴。',
                medium: '你在合作共赢方面有一定基础。继续培养对他人的信任，寻找更多双赢的机会。',
                high: '你非常善于合作和追求共赢。继续用自己的方式为团队和社区做出贡献。'
            },
            '使命与活力': {
                low: '思考什么活动让你感到充满活力？尝试做更多符合你内心使命的事情，而不是只为了金钱或义务而工作。',
                medium: '你有一定的使命感和活力感。继续探索什么真正让你感到有意义和充满能量。',
                high: '你很好地追随自己的使命和活力。继续保持这种热情和方向感。'
            },
            '积极聚焦': {
                low: '练习关注生活中美好的事物。每天写下三件感恩的事情，慢慢训练大脑更多地关注积极面。',
                medium: '你有一定的积极聚焦能力。继续练习感恩和正面思考，让积极思维成为习惯。',
                high: '你非常善于关注积极面。继续保持这种乐观态度，你的正能量也会感染身边的人。'
            }
        };

        // Build dimension details for output
        const dimensionDetails = {};
        for (const [dimName, config] of Object.entries(dimConfig)) {
            const dimScore = dimensions[dimName].score;
            let adviceLevel;
            if (dimScore < 3) adviceLevel = 'low';
            else if (dimScore < 4) adviceLevel = 'medium';
            else adviceLevel = 'high';

            dimensionDetails[dimName] = {
                score: dimScore,
                description: config.desc,
                recommendation: dimAdvice[dimName][adviceLevel],
                level: dimScore >= 4 ? '较强' : dimScore >= 3 ? '中等' : '有待提升'
            };
        }

        // Sort dimensions by score (lowest first for improvement priorities)
        const sortedDims = Object.entries(dimensionDetails)
            .sort(([, a], [, b]) => a.score - b.score);

        const priorityDims = sortedDims.slice(0, 3).map(([name, data]) => ({
            name,
            score: data.score,
            recommendation: data.recommendation
        }));

        const details = {
            analysisType: '富足',
            totalScore: totalScore,
            maxScore: 210,
            severity: severity,
            dimensions: dimensionDetails,
            priorityDimensions: priorityDims,
            severityLevels: {
                strong_scarcity: { range: '42-84', label: '匮乏思维显著' },
                mixed: { range: '85-126', label: '混合思维' },
                abundance_tendency: { range: '127-168', label: '丰盛倾向' },
                strong_abundance: { range: '169-210', label: '丰盛思维显著' }
            }
        };

        return {
            analysisType: '富足',
            severity: severity,
            severityLevel: severityLevel,
            score: totalScore,
            maxScore: 210,
            dimensions: dimensionDetails,
            summary: summary,
            details: JSON.stringify(details),
            priorityDimensions: priorityDims
        };
    }

    // =========================================================
    // 自爱能力测评分析
    // 26题，每題1-5分 (1=完全不符合, 5=完全符合)
    // 总分范围: 26-130
    // 6个维度:
    //   自我接纳(5题), 自我关怀(5题), 边界意识(4题),
    //   内在肯定(4题), 情绪接纳(4题), 自我成长(4题)
    // 维度分 = 该维度各题平均分 (1-5 scale)
    // =========================================================
    static async analyzeSelfLove(result, assessment, answers) {
        // Dimension definitions (0-based question indices)
        const dimConfig = {
            '自我接纳': { indices: [0, 1, 2, 3, 4], desc: '你接纳自身不完美和缺点，不因犯错而过度自我批评的能力', icon: '💖' },
            '自我关怀': { indices: [5, 6, 7, 8, 9], desc: '你在痛苦和低落时能够温柔对待自己、像对朋友一样关怀自己的能力', icon: '🤗' },
            '边界意识': { indices: [10, 11, 12, 13], desc: '你维护个人边界、对不合理要求说"不"、保护自己精力的能力', icon: '🛡️' },
            '内在肯定': { indices: [14, 15, 16, 17], desc: '你不需要依赖外部认可就能感受到自我价值、能够独处并充实的能力', icon: '🌟' },
            '情绪接纳': { indices: [18, 19, 20, 21], desc: '你允许并接纳负面情绪存在、不压抑真实感受的能力', icon: '🌊' },
            '自我成长': { indices: [22, 23, 24, 25], desc: '你愿意为自己投入资源成长、关注身心健康、为自己留出空间的能力', icon: '🌱' }
        };

        // Calculate total score
        let totalScore = 0;
        const rawScores = [];
        for (const answer of answers) {
            const score = parseInt(answer.answer_value) || 3;
            rawScores.push(score);
            totalScore += score;
        }

        // Calculate per-dimension averages
        const dimensionResults = {};
        for (const [dimName, config] of Object.entries(dimConfig)) {
            let dimTotal = 0;
            const items = [];
            for (const qIdx of config.indices) {
                if (qIdx < rawScores.length) {
                    const score = rawScores[qIdx];
                    dimTotal += score;
                    items.push({
                        question: answers[qIdx].question_text,
                        score: score
                    });
                }
            }
            const avg = items.length > 0 ? Math.round((dimTotal / items.length) * 10) / 10 : 3;
            dimensionResults[dimName] = {
                score: avg,
                items: items
            };
        }

    // 确定严重程度
        let severity, summary;
        if (totalScore <= 52) {
            severity = '自我关怀明显不足';
            summary = '你的自我关怀评分为 ' + totalScore + ' 分（满分130分），属于「自我关怀明显不足」水平。这表明你在自我关怀和自我接纳方面面临较大挑战，可能经常对自己苛责、难以设立边界或忽视自己的需求。这并不意味着你不够好——自我关怀是一种可以培养的能力。建议你从觉察自我对话开始，逐步练习对自己更温柔。';
        } else if (totalScore <= 78) {
            severity = '自我关怀有待提升';
            summary = '你的自我关怀评分为 ' + totalScore + ' 分（满分130分），属于「自我关怀有待提升」水平。这表明你已经具备一定的自我关怀意识，但在某些方面仍然容易忽略自己的感受和需求。通过有针对性的练习，你可以进一步巩固和提升自我关怀的能力。';
        } else if (totalScore <= 104) {
            severity = '自我关怀中等';
            summary = '你的自我关怀评分为 ' + totalScore + ' 分（满分130分），属于「自我关怀中等」水平。这表明你在多数方面具有一定程度的自我关怀能力，但在某些维度上仍有提升空间。继续保持你已经做得好的方面，同时关注得分较低的维度，有针对性地加强。';
        } else {
            severity = '自我关怀良好';
            summary = '你的自我关怀评分为 ' + totalScore + ' 分（满分130分），属于「自我关怀良好」水平。这表明你拥有较好的自我关怀和自我接纳能力，能够在面对困难时温柔对待自己，维护自己的边界和需求。请继续保持，同时也可以用你的经验去影响和帮助身边的人。';
        }

        // Dimension-level recommendations
        const dimAdvice = {
            '自我接纳': {
                low: '学习接纳自己的不完美。可以尝试：每天写下3件自己做得好的事；当犯错时，对自己说"人都会犯错，这很正常"；练习区分"行为"和"身份"——做错了不等于你这个人不好。',
                medium: '你在自我接纳方面有一定基础。继续练习：减少与他人的比较，关注自己的成长；尝试原谅自己的小错误，不要过度反刍。',
                high: '你在自我接纳方面做得很好。继续保持对自己的善意，也可以帮助他人培养自我接纳的态度。'
            },
            '自我关怀': {
                low: '学会像对待好朋友一样对待自己。可以尝试：当感到痛苦时，把手放在胸口对自己说温暖的话；写下如果你最好的朋友遇到同样的情况，你会怎么安慰TA。',
                medium: '你具备一定的自我关怀能力。继续练习：在情绪低落时有意识地安抚自己，允许自己有脆弱的时刻而不评判。',
                high: '你非常擅长关怀自己。继续保持这份对自己的温柔，你值得被善待。'
            },
            '边界意识': {
                low: '学会设立健康的边界。可以尝试：从小的"不"开始练习，比如拒绝一个不重要的请求；明确自己的底线在哪里，提前想好如何表达。',
                medium: '你在边界意识方面有一定基础。继续练习：在感到不舒服时及时表达，不要等到忍无可忍；记住维护边界不是自私，而是自爱。',
                high: '你有很强的边界意识。继续保护好自己的精力和时间，同时注意在必要时灵活调整。'
            },
            '内在肯定': {
                low: '培养内在的自我价值感。可以尝试：每天给自己一个肯定——"我本来就很好"；减少对他人的认可和评价的依赖；记录自己的进步。',
                medium: '你有一定的内在肯定能力。继续练习：在独处时享受自己的陪伴，减少对外界认可的渴求。',
                high: '你有很强的内在肯定能力。继续保持这份内心的笃定，你的价值不需要外部证明。'
            },
            '情绪接纳': {
                low: '学习接纳各种情绪。可以尝试：当负面情绪出现时，先深呼吸10秒，告诉自己"这是正常的"；用写日记的方式表达真实感受，不评判好坏。',
                medium: '你在情绪接纳方面有一定基础。继续练习：允许自己"不正能量"的时刻，相信真实的情绪流动比表面的积极更重要。',
                high: '你非常善于接纳自己的情绪。继续保持这种与情绪健康相处的能力。'
            },
            '自我成长': {
                low: '开始为自己投资。可以尝试：每周安排一段只属于自己的时间；报名一个感兴趣的课程；关注自己的身体健康，定期运动。',
                medium: '你在自我成长方面有一定意识。继续练习：把"为自己"列入优先级，定期做那些纯粹让自己开心的事。',
                high: '你很懂得为自己投资和成长。继续保持对自己的关注，你的成长潜力无限。'
            }
        };

        // Build dimension details for output
        const dimensionDetails = {};
        for (const [dimName, config] of Object.entries(dimConfig)) {
            const dimScore = dimensionResults[dimName].score;
            let adviceLevel;
            if (dimScore < 3) adviceLevel = 'low';
            else if (dimScore < 4) adviceLevel = 'medium';
            else adviceLevel = 'high';

            dimensionDetails[dimName] = {
                label: dimName,
                score: dimScore,
                max: 5,
                percent: Math.round(dimScore / 5 * 100),
                description: config.desc,
                recommendation: dimAdvice[dimName][adviceLevel],
                level: dimScore >= 4 ? '良好' : dimScore >= 3 ? '中等' : '有待提升'
            };
        }

        // Sort dimensions by score (lowest first for improvement priorities)
        const sortedDims = Object.entries(dimensionDetails)
            .sort(([, a], [, b]) => a.score - b.score);

        const priorityDimensions = sortedDims.slice(0, 3).map(([name, data]) => ({
            name,
            score: data.score,
            description: data.description,
            recommendation: data.recommendation
        }));

        const details = {
            analysisType: '自爱',
            totalScore: totalScore,
            maxScore: 130,
            severity: severity,
            dimensions: dimensionDetails,
            priorityDimensions: priorityDimensions,
            severityLevels: {
                low: { range: '26-52', label: '自我关怀明显不足' },
                below_average: { range: '53-78', label: '自我关怀有待提升' },
                average: { range: '79-104', label: '自我关怀中等' },
                good: { range: '105-130', label: '自我关怀良好' }
            }
        };

        return {
            analysisType: '自爱',
            severity: severity,
            score: totalScore,
            maxScore: 130,
            dimensions: dimensionDetails,
            priorityDimensions: priorityDimensions,
            summary: summary,
            details: JSON.stringify(details),
        };
    }

    // =========================================================
    // SAD 社交回避及苦恼量表分析
    // 28题，是/否二选 (single_choice)
    // 选项: {'0':'是', '1':'否'}
    // weight=1: 是(0)=1分, 否(1)=0分 (回避/苦恼)
    // weight=-1: 是(0)=0分, 否(1)=1分 (反向)
    // 总分范围: 0-28，越高回避/苦恼越严重
    // <14 社交回避倾向低 | 14-18 中等 | >18 社交回避倾向高
    // =========================================================
    static async analyzeSAD(result, assessment, answers) {
        let totalScore = 0;
        const itemScores = [];

        for (const answer of answers) {
            const raw = answer.answer_value === '0' ? 1 : 0; // 是=1, 否=0
            const adjusted = answer.weight === -1 ? (1 - raw) : raw;
            totalScore += adjusted;
            itemScores.push({
                question: answer.question_text,
                answer: raw === 1 ? '是' : '否',
                isReverse: answer.weight === -1,
                score: adjusted
            });
        }

        let severity, recommendation;
        if (totalScore <= 10) {
            severity = '社交回避倾向低';
            recommendation = '你在社交中感到自在，能够主动参与社交活动，不因社交情境而产生明显的不安或回避行为。你的社交适应能力良好。';
        } else if (totalScore <= 14) {
            severity = '社交回避倾向中等偏低';
            recommendation = '你在大多数社交场合中能够应对自如，但在某些情境下（如面对陌生人、公开演讲等）可能会有一定程度的紧张或回避。这是正常的反应。';
        } else if (totalScore <= 18) {
            severity = '社交回避倾向中等';
            recommendation = '你在社交中会出现一定程度的紧张和回避，特别是在不太熟悉或需要公开表现的场合。建议尝试逐步暴露于让你感到紧张的社交情境，从小步骤开始建立信心。';
        } else if (totalScore <= 22) {
            severity = '社交回避倾向较高';
            recommendation = '你有明显的社交回避和苦恼倾向，社交情境经常让你感到紧张和不安。建议寻求专业心理咨询的帮助，学习社交技能训练或认知行为疗法来改善社交焦虑。';
        } else {
            severity = '社交回避倾向很高';
            recommendation = '你的社交回避和苦恼水平较高，社交生活可能因此受到明显影响。强烈建议寻求专业心理医生的帮助，社交焦虑症是可以有效治疗的。';
        }

        const details = {
            totalScore: totalScore,
            maxScore: 28,
            severity: severity,
            recommendation: recommendation,
            items: itemScores
        };

        return {
            analysisType: 'SAD',
            severity: severity,
            score: totalScore,
            maxScore: 28,
            summary: `你的社交回避及苦恼(SAD)量表评分为 ${totalScore}/28 分，属于「${severity}」。${recommendation}`,
            details: JSON.stringify(details),
        };
    }

    // =========================================================
    // ITS 人际信任量表分析
    // 25题，Likert 5点 (scale)
    // 选项: {'1':'非常不同意','2':'不同意','3':'中立','4':'同意','5':'非常同意'}
    // weight=1: 正向(高分=高信任), weight=-1: 反向(高分=低信任)
    // 总分范围: 25-125，越高人际信任水平越高
    // <75 信任倾向低 | 75-100 中等 | >100 信任倾向高
    // =========================================================
    static async analyzeITS(result, assessment, answers) {
        let totalScore = 0;

        for (const answer of answers) {
            const raw = parseInt(answer.answer_value) || 3;
            const adjusted = answer.weight === -1 ? (6 - raw) : raw;
            totalScore += adjusted;
        }

        // 因子分析：对值得信任的人 vs 对一般人
        // 仅作为参考
        let severity, recommendation;
        if (totalScore < 60) {
            severity = '信任倾向低';
            recommendation = '你对他人的信任程度较低，倾向于保持警惕和怀疑。这种态度可能源于过往经历或当前环境的影响。适度的信任有助于建立和维系健康的人际关系，建议尝试在安全的环境中逐渐敞开心扉。';
        } else if (totalScore < 75) {
            severity = '信任倾向偏低';
            recommendation = '你对他人的信任程度略低于平均水平。你对人际交往持有一定程度的警惕，这可能让你避免了不可靠的关系，但也可能错失真诚的连接。建议在评估风险的基础上，尝试给予他人更多的信任。';
        } else if (totalScore < 100) {
            severity = '信任倾向中等';
            recommendation = '你的人际信任水平处于中等范围。你能够信任他人但也会保持合理的判断，这种平衡的态度通常有利于建立健康的人际关系。';
        } else if (totalScore < 115) {
            severity = '信任倾向较高';
            recommendation = '你倾向于相信大多数人都是诚实和善良的，这种开放和信任的态度有助于建立广泛的人际关系。但也要注意保持合理的判断力，避免因过度信任而受到伤害。';
        } else {
            severity = '信任倾向很高';
            recommendation = '你对他人有很高的信任水平，相信人性本善。这种心态为你带来了丰富的人际关系和支持网络。但在某些情境下，适当的分辨和评估也是必要的。';
        }

        const details = {
            totalScore: totalScore,
            maxScore: 125,
            severity: severity,
            recommendation: recommendation,
            severityLevels: {
                low: { range: '25-59', label: '信任倾向低' },
                below_avg: { range: '60-74', label: '信任倾向偏低' },
                average: { range: '75-99', label: '信任倾向中等' },
                above_avg: { range: '100-114', label: '信任倾向较高' },
                high: { range: '115-125', label: '信任倾向很高' }
            }
        };

        return {
            analysisType: 'ITS',
            severity: severity,
            score: totalScore,
            maxScore: 125,
            summary: `你的人人际信任(ITS)量表评分为 ${totalScore}/125 分，属于「${severity}」。${recommendation}`,
            details: JSON.stringify(details),
        };
    }

    // =========================================================
    // IRI 人际反应指数(共情)分析
    // 22题，Likert 5点 (scale)
    // 选项: {'1':'完全不符合','2':'比较不符合','3':'有时符合','4':'比较符合','5':'完全符合'}
    // 4个维度: 观点采择(PT-7题), 共情关心(EC-7题), 想象力(FS-5题), 个人痛苦(PD-3题)
    // 每个维度平均分: 1-5
    // =========================================================
    static async analyzeIRI(result, assessment, answers) {
        const dimConfig = {
            '观点采择(PT)': { indices: [0, 1, 2, 3, 4, 5, 6], desc: '你在日常生活中自发地采纳他人心理观点的倾向和能力' },
            '共情关心(EC)': { indices: [7, 8, 9, 10, 11, 12, 13], desc: '你对他人遭遇的情感反应，如同情、怜悯和关心' },
            '想象力(FS)': { indices: [14, 15, 16, 17, 18], desc: '你对虚构故事中角色感受和行为的想象代入能力' },
            '个人痛苦(PD)': { indices: [19, 20, 21], desc: '在紧张的人际情境中你体验到的不安和焦虑倾向' }
        };

        // Compute raw scores per dimension
        const rawValues = [];
        for (const answer of answers) {
            const raw = parseInt(answer.answer_value) || 3;
            const adjusted = answer.weight === -1 ? (6 - raw) : raw;
            rawValues.push(adjusted);
        }

        const dimensionResults = {};
        for (const [dimName, config] of Object.entries(dimConfig)) {
            let dimTotal = 0;
            const items = [];
            for (const qIdx of config.indices) {
                if (qIdx < rawValues.length) {
                    dimTotal += rawValues[qIdx];
                    items.push({
                        question: answers[qIdx].question_text,
                        score: rawValues[qIdx]
                    });
                }
            }
            const avg = items.length > 0 ? Math.round((dimTotal / items.length) * 10) / 10 : 3;
            dimensionResults[dimName] = { score: avg, items: items };
        }

        // Total empathy score (average across PT, EC, FS - PD is separate)
        const empathyScore = Math.round((
            (dimensionResults['观点采择(PT)'].score + dimensionResults['共情关心(EC)'].score + dimensionResults['想象力(FS)'].score) / 3
        ) * 10) / 10;

        // Interpret each dimension
        const dimInterpretation = {};
        for (const [dimName, config] of Object.entries(dimConfig)) {
            const score = dimensionResults[dimName].score;
            let level, description;
            if (score >= 4) {
                level = '较高';
                description = dimName === '个人痛苦(PD)'
                    ? '你在紧张人际情境中容易感到不安和焦虑。这是共情能力的另一面——敏感的人更容易被他人情绪所影响。'
                    : '你在此维度上表现出较高的共情能力。';
            } else if (score >= 3) {
                level = '中等';
                description = '处于中等水平，有提升空间。';
            } else {
                level = '较低';
                description = dimName === '个人痛苦(PD)'
                    ? '你在紧张人际情境中能够保持冷静，不容易被他人的负面情绪所淹没。'
                    : '在此维度上有较大的提升空间。';
            }
            dimInterpretation[dimName] = {
                score: score,
                level: level,
                description: config.desc,
                interpretation: description
            };
        }

        // Overall interpretation
        let overallLevel, overallDesc;
        if (empathyScore >= 4) {
            overallLevel = '较高共情力';
            overallDesc = '你具有较高的共情能力，能够很好地理解他人的感受和观点。这种能力让你在人际关系中表现出更多的理解和关怀，但也需要注意保持情感边界，避免过度卷入他人的情绪。';
        } else if (empathyScore >= 3) {
            overallLevel = '中等共情力';
            overallDesc = '你的共情能力处于中等水平。你在某些方面能够感受和理解他人，但仍有提升空间。可以尝试多倾听、多观察，培养自己的共情敏感度。';
        } else {
            overallLevel = '共情力有待提升';
            overallDesc = '你的共情能力有较大的提升空间。可以尝试多关注他人的情绪状态，练习换位思考，阅读文学作品或观看感人的影视作品也有助于培养共情能力。';
        }

        const details = {
            totalEmpathyScore: empathyScore,
            maxEmpathyScore: 5,
            overallLevel: overallLevel,
            dimensions: dimInterpretation,
            personalDistressScore: dimensionResults['个人痛苦(PD)'].score
        };

        return {
            analysisType: 'IRI',
            overallLevel: overallLevel,
            dimensions: dimInterpretation,
            score: empathyScore,
            summary: `你的综合共情能力评分为 ${empathyScore}/5 分（${overallLevel}）。${overallDesc}`,
            details: JSON.stringify(details),
        };
    }

    // =========================================================
    // SSI 社交技能量表分析
    // 20题，Likert 5点 (scale)
    // 选项: {'1':'完全不符合','2':'比较不符合','3':'有时符合','4':'比较符合','5':'完全符合'}
    // 5个维度: 表达能力(EX-4题), 社交敏锐(SE-4题), 情绪调节(ER-4题), 冲突处理(CF-4题), 关系维护(RM-4题)
    // 维度平均分: 1-5
    // =========================================================
    static async analyzeSSI(result, assessment, answers) {
        const dimConfig = {
            '表达能力(EX)': { indices: [0, 5, 10, 15], desc: '你清晰表达自己想法和情感的能力' },
            '社交敏锐(SE)': { indices: [1, 6, 11, 16], desc: '你感知和理解他人意图及情绪的能力' },
            '情绪调节(ER)': { indices: [2, 7, 12, 17], desc: '你在人际交往中管理自身情绪的能力' },
            '冲突处理(CF)': { indices: [3, 8, 13, 18], desc: '你应对和解决人际冲突的能力' },
            '关系维护(RM)': { indices: [4, 9, 14, 19], desc: '你建立和维护长期人际关系的能力' }
        };

        // Compute adjusted scores
        const rawValues = [];
        for (const answer of answers) {
            const raw = parseInt(answer.answer_value) || 3;
            const adjusted = answer.weight === -1 ? (6 - raw) : raw;
            rawValues.push(adjusted);
        }

        const dimensionResults = {};
        for (const [dimName, config] of Object.entries(dimConfig)) {
            let dimTotal = 0;
            const items = [];
            for (const qIdx of config.indices) {
                if (qIdx < rawValues.length) {
                    dimTotal += rawValues[qIdx];
                    items.push({
                        question: answers[qIdx].question_text,
                        score: rawValues[qIdx]
                    });
                }
            }
            const avg = items.length > 0 ? Math.round((dimTotal / items.length) * 10) / 10 : 3;
            dimensionResults[dimName] = { score: avg, items: items };
        }

        // Overall social skills score (average across all 5 dimensions)
        const overallScore = Math.round(
            (Object.values(dimensionResults).reduce((sum, d) => sum + d.score, 0) / 5) * 10
        ) / 10;

        // Interpret each dimension
        const dimInterpretation = {};
        const dimAdvice = {
            '表达能力(EX)': {
                high: '你能清晰地表达自己的想法和感受，在群体讨论中能够主动发言。这种能力让你在团队合作和社交中占有优势。',
                medium: '你的表达能力处于中等水平。在某些场合你能够较好地表达自己，但在面对权威或陌生环境时可能有所保留。可以尝试多参与讨论，训练即兴表达能力。',
                low: '你在表达自己的想法和感受方面存在困难。建议从写下要说的话开始练习，逐渐过渡到在小范围人群中表达，逐步建立自信。'
            },
            '社交敏锐(SE)': {
                high: '你善于观察和理解他人的情绪变化，能够从语气、表情和肢体语言中读懂别人的真实感受。这是社交中的宝贵能力。',
                medium: '你的社交敏锐度处于中等水平。你能够察觉到明显的情绪信号，但在微妙的人际互动中可能需要更仔细的观察。建议多练习主动倾听。',
                low: '你在感知和理解他人意图方面需要加强。可以尝试在与人交谈时多关注对方的表情和语气，通过练习提升社交敏锐度。'
            },
            '情绪调节(ER)': {
                high: '你能够在压力下保持冷静，不易被情绪左右。即使面对批评或冲突，你也能理性应对，这是成熟的社交能力。',
                medium: '你的情绪调节能力处于中等水平。在大多数情况下你能够控制情绪，但在压力较大或意外情况下可能会反应过度。建议学习深呼吸、正念等情绪管理技巧。',
                low: '你在情绪管理方面面临挑战。情绪容易影响你的判断和行为。建议学习压力管理和情绪调节技巧，必要时可以寻求专业帮助。'
            },
            '冲突处理(CF)': {
                high: '你善于处理人际冲突，能够在分歧中找到双方都能接受的解决方案。你不回避冲突，而是将其视为沟通和成长的机会。',
                medium: '你的冲突处理能力处于中等水平。你有一定的解决分歧的能力，但在面对强烈的立场冲突时可能感到困难。可以尝试学习非暴力沟通技巧。',
                low: '你倾向于回避冲突，或者在冲突中容易感到不知所措。建议从小的分歧开始练习表达自己的立场，学习如何在不伤害关系的前提下维护自己的权益。'
            },
            '关系维护(RM)': {
                high: '你擅长维护和维系人际关系，能够主动与朋友保持联系，建立深厚的社交网络。这是重要的社交资本。',
                medium: '你的人际关系维护能力处于中等水平。你能维持现有的关系，但在扩展和加深关系方面有提升空间。建议定期与朋友联系，主动组织活动。',
                low: '你在维护人际关系方面面临挑战，可能经常失去联系或难以维持长期关系。建议设定固定的社交时间，使用提醒工具帮助自己记得与朋友保持联系。'
            }
        };

        for (const [dimName, config] of Object.entries(dimConfig)) {
            const score = dimensionResults[dimName].score;
            let level, advice;
            if (score >= 4) {
                level = '较强';
                advice = dimAdvice[dimName].high;
            } else if (score >= 3) {
                level = '中等';
                advice = dimAdvice[dimName].medium;
            } else {
                level = '有待提升';
                advice = dimAdvice[dimName].low;
            }
            dimInterpretation[dimName] = {
                score: score,
                level: level,
                description: config.desc,
                recommendation: advice
            };
        }

        // Overall interpretation
        let overallLevel, overallDesc;
        if (overallScore >= 4) {
            overallLevel = '社交技能较强';
            overallDesc = '你拥有出色的社交技能，在各个维度上都表现出较高水平。你能够自如地表达、感知、调节和应对人际互动中的各种情况。继续保持并善用你的社交优势。';
        } else if (overallScore >= 3) {
            overallLevel = '社交技能中等';
            overallDesc = '你的社交技能处于中等水平。你在某些方面做得不错，但仍有提升空间。关注得分较低的维度，有针对性地练习和改进。';
        } else {
            overallLevel = '社交技能有待提升';
            overallDesc = '你的社交技能有较大的提升空间。社交技能是可以通过练习和学习来提高的，建议从你最有动力的一个方面开始，逐步提升各项社交能力。';
        }

        // Priority improvement areas
        const sortedDims = Object.entries(dimInterpretation)
            .sort(([, a], [, b]) => a.score - b.score);
        const priorityDims = sortedDims.slice(0, 2).map(([name, data]) => ({
            name,
            score: data.score,
            recommendation: data.recommendation
        }));

        const details = {
            overallScore: overallScore,
            maxScore: 5,
            overallLevel: overallLevel,
            dimensions: dimInterpretation,
            priorityDimensions: priorityDims
        };

        return {
            analysisType: 'SSI',
            overallLevel: overallLevel,
            dimensions: dimInterpretation,
            score: overallScore,
            summary: `你的社交技能(SSI)综合评分为 ${overallScore}/5 分（${overallLevel}）。${overallDesc}`,
            details: JSON.stringify(details),
            priorityDimensions: priorityDims
        };
    }

    // =========================================================
    // SIAS 社交互动焦虑量表分析
    // 19题，Likert 5点 (scale)
    // 选项: {'1':'完全不符合','2':'比较不符合','3':'有时符合','4':'比较符合','5':'完全符合'}
    // 反向题(weight=-1): #5, #9, #11 (社交轻松类题目)
    // 总分范围: 19-95，越高社交互动焦虑越严重
    // <38 焦虑低 | 38-52 中等 | 53-67 偏高 | >67 焦虑高
    // =========================================================
    static async analyzeSIAS(result, assessment, answers) {
        let totalScore = 0;
        const itemScores = [];

        for (const answer of answers) {
            const raw = parseInt(answer.answer_value) || 3;
            const adjusted = answer.weight === -1 ? (6 - raw) : raw;
            totalScore += adjusted;
            itemScores.push({
                question: answer.question_text,
                rawValue: raw,
                adjustedScore: adjusted,
                isReverse: answer.weight === -1
            });
        }

        let severity, recommendation;
        if (totalScore <= 37) {
            severity = '社交互动焦虑低';
            recommendation = '你在社交互动中感到轻松自在，能够主动与他人交流和互动，不因社交情境而产生明显的焦虑或紧张。你的社交适应性良好。';
        } else if (totalScore <= 52) {
            severity = '社交互动焦虑中等';
            recommendation = '你在日常社交中能够应对大多数情境，但在某些情况下（如与陌生人交谈、公开表达观点等）可能会感到一定程度的紧张。这是正常的社交焦虑反应，可以通过适当的练习和暴露来减轻。';
        } else if (totalScore <= 67) {
            severity = '社交互动焦虑偏高';
            recommendation = '你在社交互动中有较明显的焦虑倾向，许多社交情境会让你感到紧张和不安。这种焦虑可能影响了你的社交生活和人际关系。建议尝试认知行为疗法或社交技能训练，逐步减轻社交焦虑。';
        } else {
            severity = '社交互动焦虑高';
            recommendation = '你的社交互动焦虑水平较高，社交行为可能因此受到明显限制。强烈建议寻求专业心理咨询或治疗帮助。社交焦虑症是可以通过认知行为疗法、暴露疗法等专业方法有效治疗的。';
        }

        const details = {
            totalScore: totalScore,
            maxScore: 95,
            severity: severity,
            recommendation: recommendation,
            reverseItems: ['与同龄人交友', '社交场合自在', '容易找话题'],
            severityLevels: {
                low: { range: '19-37', label: '社交互动焦虑低' },
                moderate: { range: '38-52', label: '社交互动焦虑中等' },
                elevated: { range: '53-67', label: '社交互动焦虑偏高' },
                high: { range: '68-95', label: '社交互动焦虑高' }
            },
            items: itemScores
        };

        return {
            analysisType: 'SIAS',
            severity: severity,
            score: totalScore,
            maxScore: 95,
            summary: `你的社交互动焦虑(SIAS)量表评分为 ${totalScore}/95 分，属于「${severity}」。${recommendation}`,
            details: JSON.stringify(details),
        };
    }

    // =========================================================
    // SDS 抑郁自评量表分析 (Zung)
    // 20题，Likert 4点 (scale)
    // 选项: {'1':'没有或很少','2':'有时','3':'大部分时间','4':'几乎总是'}
    // 10题正向(weight=1)，10题反向(weight=-1)
    // 粗分范围: 20-80
    // 标准分 = 粗分 × 1.25 (取整)
    // <50 正常 | 50-59 轻度抑郁 | 60-69 中度抑郁 | ≥70 重度抑郁
    // =========================================================
    static async analyzeSDS(result, assessment, answers) {
        let rawScore = 0;
        const itemScores = [];

        for (const answer of answers) {
            const raw = parseInt(answer.answer_value) || 2;
            // 4点量表反向: 5 - raw (1→4, 2→3, 3→2, 4→1)
            const adjusted = answer.weight === -1 ? (5 - raw) : raw;
            rawScore += adjusted;
            itemScores.push({
                question: answer.question_text,
                rawValue: raw,
                adjustedScore: adjusted,
                isReverse: answer.weight === -1
            });
        }

        const standardScore = Math.round(rawScore * 1.25);

        let severity, recommendation;
        if (standardScore < 50) {
            severity = '正常';
            recommendation = '你的抑郁自评得分在正常范围内，情绪状态良好。建议继续保持积极的生活方式、规律的作息和适度的运动。';
        } else if (standardScore < 60) {
            severity = '轻度抑郁';
            recommendation = '你可能存在轻度抑郁情绪，建议关注自己的心理状态，多与朋友家人交流，保持规律作息和运动。可以尝试正念冥想或写情绪日记来调节心情。如症状持续，建议寻求专业心理咨询。';
        } else if (standardScore < 70) {
            severity = '中度抑郁';
            recommendation = '你可能有中度抑郁症状，建议尽快寻求专业心理咨询或心理医生的帮助。同时注意调整生活习惯，减少压力源，适当运动有助于改善情绪。';
        } else {
            severity = '重度抑郁';
            recommendation = '你可能有重度抑郁症状，请立即寻求专业心理医生的帮助。如有紧急情况，请拨打心理援助热线（如：全国24小时心理援助热线 010-82951332）。请记住，抑郁症是可以治疗的，尽早求助非常重要。';
        }

        const details = {
            rawScore: rawScore,
            standardScore: standardScore,
            maxRawScore: 80,
            maxStandardScore: 100,
            severity: severity,
            recommendation: recommendation,
            severityLevels: {
                normal: { range: '<50', label: '正常' },
                mild: { range: '50-59', label: '轻度抑郁' },
                moderate: { range: '60-69', label: '中度抑郁' },
                severe: { range: '≥70', label: '重度抑郁' }
            },
            items: itemScores
        };

        return {
            analysisType: 'SDS',
            severity: severity,
            score: standardScore,
            rawScore: rawScore,
            maxScore: 100,
            summary: `你的SDS抑郁自评粗分为 ${rawScore}/80，标准分为 ${standardScore}/100，属于「${severity}」。${recommendation}`,
            details: JSON.stringify(details),
        };
    }

    // =========================================================
    // 亲子关系能力测评
    // 30题，5点Likert
    // 6维度 × 5题（3正2反）
    // 维度平均分: 1-5
    // 爱的智慧 = 给予对方需要的，而不是自己认为正确的
    // =========================================================
    static async analyzeParentChild(result, assessment, answers) {
        const dimConfig = {
            '看见需要': { indices: [0, 1, 2, 3, 4], desc: '能否真正觉察孩子的需求，而非只看表面行为' },
            '克制投射': { indices: [5, 6, 7, 8, 9], desc: '能否放下"我是对的"——不对比、不恐吓、不将自己的期望强加给孩子' },
            '情感回应': { indices: [10, 11, 12, 13, 14], desc: '孩子需要时能否给予温暖、安全的回应' },
            '接纳与放手': { indices: [15, 16, 17, 18, 19], desc: '能否接纳孩子的不完美，并给他信任和成长的空间' },
            '陪伴质量': { indices: [20, 21, 22, 23, 24], desc: '陪伴是否真正触及孩子的内心，而非只是形式' },
            '教育自觉': { indices: [25, 26, 27, 28, 29], desc: '是否通过自身成长来引导孩子，而非固守旧模式' }
        };

        const rawValues = [];
        for (const answer of answers) {
            const raw = parseInt(answer.answer_value) || 3;
            const adjusted = answer.weight === -1 ? (6 - raw) : raw;
            rawValues.push(adjusted);
        }

        const dimensionResults = {};
        for (const [dim, config] of Object.entries(dimConfig)) {
            let total = 0;
            for (const idx of config.indices) {
                total += rawValues[idx] || 3;
            }
            const avg = Math.round((total / config.indices.length) * 10) / 10;
            dimensionResults[dim] = { score: avg };
        }

        const overallScore = Math.round(
            Object.values(dimensionResults).reduce((s, d) => s + d.score, 0) / 6 * 10
        ) / 10;

        const dimAdvice = {
            '看见需要': {
                high: '你善于觉察孩子的真实需求，能看到行为背后的原因。这是爱的智慧的第一步。',
                medium: '你在觉察孩子需求方面有一定能力，但有时可能停留在表面行为。建议多问"为什么"，尝试理解孩子的内在感受。',
                low: '你可能更多关注孩子的行为对错，而忽略了背后的需求。试着在孩子出现问题行为时，先问问他"你发生了什么"。'
            },
            '克制投射': {
                high: '你能够尊重孩子的独特性，不拿他与别人比较、不用恐吓控制、不将自己的期望强加给他。这是对孩子最大的尊重。',
                medium: '你在克制自我投射方面有一定意识，但有时仍会不自觉地拿孩子比较或把自己的期望加给他。提醒自己：每个孩子都是独一无二的。',
                low: '你可能经常拿孩子和别人比较、用恐吓的方式管教、或希望他实现你的梦想。试着问问自己：我是否真正看见了孩子本身，而不是我想象中的他？'
            },
            '情感回应': {
                high: '你能够给孩子温暖安全的情感回应，孩子在你这里感到被接纳和理解。',
                medium: '你有一定的情感回应能力，但有时可能因忙碌而疏忽。孩子的情感需求需要被认真对待。',
                low: '你可能忽略了孩子的情感需求，或习惯用"这没什么"来否定他的感受。请记住：孩子的情绪需要被看见和接纳。'
            },
            '接纳与放手': {
                high: '你能接纳孩子的不完美，不要求他为了"将来"牺牲"现在"，信任他并给他成长的空间。这是深厚的爱。',
                medium: '你在接纳和放手方面有一定意识，但有时仍会因孩子的不足而失望，或觉得"现在吃苦是为了将来好"。试着接受孩子本来的样子。',
                low: '你可能难以接受孩子的不完美，或常用"现在吃苦将来好"来要求孩子。真正的爱不是让孩子为未来牺牲现在，而是陪伴他过好每一个当下。'
            },
            '陪伴质量': {
                high: '你的陪伴是高质量的，孩子能感受到你的用心和投入。',
                medium: '你愿意陪伴孩子，但有时可能"人在心不在"。试着放下手机，全身心投入。',
                low: '你在陪伴孩子方面可能更多是形式上的，缺乏真正的互动。哪怕每天15分钟的全心投入，也比几小时的敷衍更有价值。'
            },
            '教育自觉': {
                high: '你懂得通过自己的成长来影响孩子，身教重于言传。你是孩子最好的榜样。',
                medium: '你偶尔会反思自己的教育方式，但可能更习惯于说教而非身教。孩子更多是从你的行为中学习，而非你的言语。',
                low: '你可能对自己的教育方式比较自信，较少反思和成长。孩子是父母的镜子——你的成长，就是最好的教育。'
            }
        };

        let overallLevel, overallDesc;
        if (overallScore >= 4) {
            overallLevel = '亲子关系质量优秀';
            overallDesc = '你在亲子关系中展现出较高的"爱的智慧"——你能够看见孩子的真实需求，给予他需要的回应和空间。请继续保持这份觉知和温暖。';
        } else if (overallScore >= 3.5) {
            overallLevel = '亲子关系质量良好';
            overallDesc = '你的亲子关系质量总体不错，在大多数维度上表现良好。关注得分较低的维度，那里正是你成长的方向。';
        } else if (overallScore >= 2.5) {
            overallLevel = '亲子关系质量中等';
            overallDesc = '你的亲子关系有基础，但在多个维度上有较大的提升空间。爱的智慧不是天生的，而是在觉察和实践中增长的。';
        } else {
            overallLevel = '亲子关系有待提升';
            overallDesc = '觉察本身就是改变的开始。建议从倾听孩子的声音开始，逐步调整自己的方式。';
        }

        const dimensionDetails = {};
        for (const [dim, config] of Object.entries(dimConfig)) {
            const score = dimensionResults[dim].score;
            let level, advice;
            if (score >= 4) { level = '较好'; advice = dimAdvice[dim].high; }
            else if (score >= 3) { level = '中等'; advice = dimAdvice[dim].medium; }
            else { level = '有待提升'; advice = dimAdvice[dim].low; }
            dimensionDetails[dim] = { score, level, description: config.desc, recommendation: advice };
        }

        const sortedDims = Object.entries(dimensionDetails).sort(([, a], [, b]) => a.score - b.score);
        const priorityDims = sortedDims.slice(0, 2).map(([n, d]) => ({ name: n, score: d.score, recommendation: d.recommendation }));

        const details = {
            overallScore, maxScore: 5, overallLevel, dimensions: dimensionDetails,
            priorityDimensions: priorityDims,
            coreIdea: '爱的智慧，在于给予对方需要的，而不是自己认为正确的。'
        };

        return {
            analysisType: '亲子关系',
            overallLevel,
            dimensions: dimensionDetails,
            score: overallScore,
            summary: `你的亲子关系能力综合评分为 ${overallScore}/5 分（${overallLevel}）。${overallDesc}`,
            details: JSON.stringify(details),
            priorityDimensions: priorityDims
        };
    }

    // =========================================================
    // 婚姻经营能力测评分析
    // 28题，5点Likert，7维度×4题（含反向题）
    // 维度: 接纳, 尊重, 允许, 支持, 信任, 经济, 亲密
    // =========================================================
    static async analyzeMarriage(result, assessment, answers) {
        // Dimension config: 每个维度4题，按order_index (0-indexed)
        const dimConfig = {
            '接纳': { indices: [0, 1, 2, 3], desc: '接纳对方的不完美，不试图改造对方' },
            '尊重': { indices: [4, 5, 6, 7], desc: '尊重对方的独立人格和选择，维护对方尊严' },
            '允许': { indices: [8, 9, 10, 11], desc: '允许对方做自己，给予空间和自由' },
            '支持': { indices: [12, 13, 14, 15], desc: '支持对方的梦想和成长，做坚实的后盾' },
            '信任': { indices: [16, 17, 18, 19], desc: '信任对方的人品和判断，不无端猜疑' },
            '经济': { indices: [20, 21, 22, 23], desc: '财务共识、消费观念协调、经济信任' },
            '亲密': { indices: [24, 25, 26, 27], desc: '性亲密、身体接触、情感温度与浪漫感' }
        };

        // Compute adjusted scores
        const rawValues = [];
        for (const answer of answers) {
            const raw = parseInt(answer.answer_value) || 3;
            const adjusted = answer.weight === -1 ? (6 - raw) : raw;
            rawValues.push(adjusted);
        }

        // Compute dimension averages
        const dimensionResults = {};
        for (const [dimName, config] of Object.entries(dimConfig)) {
            let dimTotal = 0;
            const items = [];
            for (const qIdx of config.indices) {
                if (qIdx < rawValues.length) {
                    const score = rawValues[qIdx];
                    dimTotal += score;
                    items.push({ question: answers[qIdx].question_text, score });
                }
            }
            const avg = items.length > 0 ? Math.round((dimTotal / items.length) * 10) / 10 : 3;
            dimensionResults[dimName] = { score: avg, items };
        }

        // Overall score
        const overallScore = Math.round(
            Object.values(dimensionResults).reduce((s, d) => s + d.score, 0) / 7 * 10
        ) / 10;

        // Dimension advice
        const dimAdvice = {
            '接纳': {
                high: '你能够真心接纳伴侣的不完美，不试图改变他/她。这种接纳是爱最深沉的表现。',
                medium: '你在接纳方面有一定意识，但有时仍会对伴侣的某些特质感到不满。试着问自己：如果对方永远不变，我还能爱他/她吗？',
                low: '你可能经常希望伴侣改变。真正的爱不是改造，而是在差异中学习共处。试着从接纳一个小习惯开始。'
            },
            '尊重': {
                high: '你懂得尊重伴侣的独立人格和选择，维护他/她的尊严。这是婚姻中宝贵的品质。',
                medium: '你在尊重方面做得不错，但有时可能不自觉地忽视伴侣的意见。试着在做决定前，先问问他/她的想法。',
                low: '你可能习惯于以自己的标准评判伴侣。每个人都是独立的个体，尊重不是同意，而是承认对方有权和自己不一样。'
            },
            '允许': {
                high: '你能够给予伴侣足够的空间和自由，允许他/她做自己。这是成熟的爱的标志。',
                medium: '你在给予空间方面有一定意识，但有时仍会因不安全感而过度介入。信任是给予空间的底气。',
                low: '你可能对伴侣的控制欲较强，希望一切都在自己的掌控中。爱不是占有，而是给对方自由生长的空间。'
            },
            '支持': {
                high: '你是伴侣坚实的后盾，真心为他/她的成长感到高兴。这种支持是婚姻中最温暖的力量。',
                medium: '你愿意支持伴侣，但当对方投入过多在自己身上时，你可能会感到失落。真正的支持是不求回报的。',
                low: '你可能更多关注自己的需求，而忽略了伴侣的成长。试着把伴侣的梦想当作两个人的事来共同经营。'
            },
            '信任': {
                high: '你对伴侣有深厚的信任，这是婚姻最牢固的基石。珍惜这份信任，它来之不易。',
                medium: '你的信任需要更多安全感来支撑。试着分辨是对方真的不值得信任，还是自己的不安在作祟。',
                low: '猜疑是婚姻的毒药。如果不信任源于对方的实际行为，需要坦诚沟通；如果源于自己的不安，需要自我成长。'
            },
            '经济': {
                high: '你和伴侣在财务上有良好的共识和信任，这是婚姻稳定的重要保障。',
                medium: '你们在金钱观念上有一定分歧，但尚可协调。建议定期进行财务沟通，建立共同认可的理财方案。',
                low: '金钱冲突是婚姻中常见的矛盾源。建议坦诚交流各自的消费观念和财务期待，寻找中间地带，而非争夺主导权。'
            },
            '亲密': {
                high: '你重视并维护婚姻中的亲密关系，包括情感和身体的连接。这是婚姻活力的源泉。',
                medium: '你在亲密关系方面有一定意识，但可能因生活忙碌而疏于经营。试着每周安排专属的二人时光。',
                low: '亲密关系可能是你婚姻中被忽略的部分。身体和情感的连接需要用心经营，不要让生活的琐碎消磨了爱的温度。'
            }
        };

        // Build dimension details
        const dimensionDetails = {};
        for (const [dimName, config] of Object.entries(dimConfig)) {
            const score = dimensionResults[dimName].score;
            let level, advice;
            if (score >= 4) { level = '较好'; advice = dimAdvice[dimName].high; }
            else if (score >= 3) { level = '中等'; advice = dimAdvice[dimName].medium; }
            else { level = '有待提升'; advice = dimAdvice[dimName].low; }
            dimensionDetails[dimName] = { score, level, description: config.desc, recommendation: advice };
        }

        // Overall interpretation
        let overallLevel, overallDesc;
        if (overallScore >= 4) {
            overallLevel = '婚姻智慧优秀';
            overallDesc = '你在婚姻中展现出成熟的爱的智慧——你懂得接纳、尊重、允许、支持、信任，在经济和亲密上也找到了平衡。你的婚姻关系拥有健康的根基。请继续保持这份觉知和用心，爱是需要一辈子修炼的功课。';
        } else if (overallScore >= 3.5) {
            overallLevel = '婚姻智慧良好';
            overallDesc = '你在大多数维度上表现不错，有良好的婚姻经营意识。关注得分较低的维度，那里正是你成长的方向。婚姻不是1+1=2，而是0.5+0.5=1——各自放下一些自我，才能成就完整的我们。';
        } else if (overallScore >= 2.5) {
            overallLevel = '婚姻智慧中等';
            overallDesc = '你的婚姻关系有基础，但在多个维度上有较大的提升空间。爱的智慧不是天生的，而是在觉察、学习和实践中增长的。每一个反思的时刻，都是改善关系的契机。';
        } else {
            overallLevel = '有待提升';
            overallDesc = '觉察本身就是改变的开始。婚姻经营是一场修行，需要双方的共同努力。建议从最需要改善的一个维度开始，逐步调整自己的认知和行为。如有需要，可以考虑婚姻咨询。';
        }

        // Priority dimensions (lowest 2-3)
        const sortedDims = Object.entries(dimensionDetails).sort(([, a], [, b]) => a.score - b.score);
        const priorityDims = sortedDims.slice(0, 3).map(([n, d]) => ({
            name: n, score: d.score, recommendation: d.recommendation
        }));

        const details = {
            overallScore, maxScore: 5, overallLevel, dimensions: dimensionDetails,
            priorityDimensions: priorityDims,
            coreIdea: '爱的智慧，不是把对方变成你想要的样子，而是如其所是地看见并深爱。'
        };

        return {
            analysisType: '婚姻经营',
            overallLevel,
            dimensions: dimensionDetails,
            score: overallScore,
            summary: `你的婚姻经营能力综合评分为 ${overallScore}/5 分（${overallLevel}）。${overallDesc}`,
            details: JSON.stringify(details),
            priorityDimensions: priorityDims
        };
    }

    // =========================================================
    // 性态度和认知测评分析
    // 30题，5点Likert，6维度×5题（含反向题）
    // 维度: 性态度, 身体认知, 性自主感, 自我认同, 性焦虑, 性认知素养
    // =========================================================
    static async analyzeSexuality(result, assessment, answers) {
        const dimConfig = {
            '性态度': { indices: [0, 1, 2, 3, 4], desc: '对性的整体看法——开放与否，有无羞耻感' },
            '身体认知': { indices: [5, 6, 7, 8, 9], desc: '对自己身体的感受和接纳程度，能否觉察身体需求' },
            '性自主感': { indices: [10, 11, 12, 13, 14], desc: '亲密关系中的边界意识、拒绝能力和不愧疚感' },
            '自我认同': { indices: [15, 16, 17, 18, 19], desc: '对自己性感受、性特质的接纳与认同' },
            '性焦虑': { indices: [20, 21, 22, 23, 24], desc: '对性相关情境的紧张、回避和不安倾向' },
            '性认知素养': { indices: [25, 26, 27, 28, 29], desc: '对性健康和性心理的知识储备与认知自信' }
        };

        // Compute adjusted scores
        const rawValues = [];
        for (const answer of answers) {
            const raw = parseInt(answer.answer_value) || 3;
            const adjusted = answer.weight === -1 ? (6 - raw) : raw;
            rawValues.push(adjusted);
        }

        // Compute dimension averages
        const dimensionResults = {};
        for (const [dimName, config] of Object.entries(dimConfig)) {
            let dimTotal = 0;
            const items = [];
            for (const qIdx of config.indices) {
                if (qIdx < rawValues.length) {
                    const score = rawValues[qIdx];
                    dimTotal += score;
                    items.push({ question: answers[qIdx].question_text, score });
                }
            }
            const avg = items.length > 0 ? Math.round((dimTotal / items.length) * 10) / 10 : 3;
            dimensionResults[dimName] = { score: avg, items };
        }

        // Overall score
        const overallScore = Math.round(
            Object.values(dimensionResults).reduce((s, d) => s + d.score, 0) / 6 * 10
        ) / 10;

        // Dimension advice
        const dimAdvice = {
            '性态度': {
                high: '你对性的态度开放而自然，能够坦然看待与性相关的话题。这种健康的态度是性心理健康的基础。',
                medium: '你对性的态度总体积极，但在某些方面仍可能受到传统观念或成长环境的影响。试着觉察这些观念来自哪里，是否仍然适合现在的你。',
                low: '你对性的态度偏向保守或负面，可能会因此感到困扰或压抑。这些观念往往来自成长环境，觉察本身就是松动的开始。'
            },
            '身体认知': {
                high: '你对自己的身体有良好的觉察和接纳，能够关注并回应身体的需求。这是与自己建立健康关系的重要能力。',
                medium: '你在身体认知方面有一定基础，但有时可能会忽略身体的信号。试着多关注身体的感觉，与自己的身体建立更友好的关系。',
                low: '你与自己的身体可能有些疏离，或对身体感到不满。身体是你最亲密的伙伴——试着从关注它的感受开始，而不是评判它的样子。'
            },
            '性自主感': {
                high: '你有清晰的边界意识，能够为自己发声，不愧疚地守护自己的底线。这是性健康中非常重要的能力。',
                medium: '你在边界方面有一定意识，但有时会为了照顾对方而委屈自己。记住：照顾好自己，才能更好地爱别人。',
                low: '你可能在亲密关系中难以设立或维护自己的边界。试着从小事开始练习说"不"，你的身体和感受值得被尊重。'
            },
            '自我认同': {
                high: '你对自己的性感受和性特质有很好的接纳，不因他人的标准而否定自己。这种自我认同是内心力量的体现。',
                medium: '你在自我认同方面有一定基础，但偶尔仍会因自己的感受而产生怀疑。每个人都有自己独特的性特质，没有"正常"与否的标准。',
                low: '你可能经常因自己的性感受或想法而感到羞耻或不安。请记住：你的感受是真实的、正常的，不需要为此否定自己。'
            },
            '性焦虑': {
                high: '你在亲密关系和性相关情境中能够感到放松和安全，没有明显的紧张或回避倾向。',
                medium: '你偶尔会在面对性相关话题或情境时感到紧张。适度的紧张是正常的，但如果影响到生活质量，可以试着了解更多、慢慢建立安全感。',
                low: '性相关的话题或情境可能会让你感到明显的紧张或不安。这些感受往往与过去的经历或教育有关。如有需要，可以寻求专业的性心理咨询。'
            },
            '性认知素养': {
                high: '你对性健康和性心理有较好的认知，知道如何获取可靠的信息。知识是力量，也是你性健康的重要保障。',
                medium: '你有一定的性知识基础，但可能在某些方面仍有盲区。性教育是一生的功课，随时补充知识都是有益的。',
                low: '你可能在性健康方面的知识有所欠缺。这很正常——很多人在成长过程中都没有获得充分的性教育。现在开始了解，永远不晚。'
            }
        };

        // Build dimension details
        const dimensionDetails = {};
        for (const [dimName, config] of Object.entries(dimConfig)) {
            const score = dimensionResults[dimName].score;
            let level, advice;
            if (score >= 4) { level = '较好'; advice = dimAdvice[dimName].high; }
            else if (score >= 3) { level = '中等'; advice = dimAdvice[dimName].medium; }
            else { level = '有待提升'; advice = dimAdvice[dimName].low; }
            dimensionDetails[dimName] = { score, level, description: config.desc, recommendation: advice };
        }

        // Overall interpretation
        let overallLevel, overallDesc;
        if (overallScore >= 4) {
            overallLevel = '性态度健康成熟';
            overallDesc = '你对性的态度是开放、健康且成熟的——你接纳自己、尊重边界、不羞耻、不焦虑。这种健康的心态不仅让你在亲密关系中更自在，也是整体心理健康的重要组成部分。';
        } else if (overallScore >= 3.5) {
            overallLevel = '性态度良好';
            overallDesc = '你在大多数维度上表现不错，有良好的性态度和认知基础。关注得分较低的维度，那里正是你成长的方向。性健康和身体接纳是一生的功课。';
        } else if (overallScore >= 2.5) {
            overallLevel = '性态度中等';
            overallDesc = '你在性态度和认知方面有基础，但在多个维度上有提升空间。成长环境和文化背景可能对你产生了影响——觉察本身就是改变的起点。';
        } else {
            overallLevel = '有待探索';
            overallDesc = '你与性的关系可能有些紧张或疏离。这很可能与成长经历或教育有关。请温柔地对待自己——学习和了解是一个渐进的过程，每一步觉察都值得肯定。';
        }

        // Priority dimensions (lowest 3)
        const sortedDims = Object.entries(dimensionDetails).sort(([, a], [, b]) => a.score - b.score);
        const priorityDims = sortedDims.slice(0, 3).map(([n, d]) => ({
            name: n, score: d.score, recommendation: d.recommendation
        }));

        const details = {
            overallScore, maxScore: 5, overallLevel, dimensions: dimensionDetails,
            priorityDimensions: priorityDims,
            coreIdea: '性与爱一样，都是需要被理解和接纳的生命面向。'
        };

        return {
            analysisType: '性态度',
            overallLevel,
            dimensions: dimensionDetails,
            score: overallScore,
            summary: `你的性态度和认知综合评分为 ${overallScore}/5 分（${overallLevel}）。${overallDesc}`,
            details: JSON.stringify(details),
            priorityDimensions: priorityDims
        };
    }

    static genericAnalysis(result, assessment, answers) {
        let totalScore = 0;
        for (const answer of answers) {
            totalScore += answer.score || 0;
        }
        
        return {
            type: assessment.name,
            summary: `测评完成！共完成 ${answers.length} 题，总分 ${totalScore} 分。`,
            details: JSON.stringify({ totalScore, answersCount: answers.length }),
            score: totalScore
        };
    }
}

module.exports = ResultAnalyzer;
