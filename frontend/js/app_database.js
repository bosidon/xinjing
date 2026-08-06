// 心镜·心理测评 - 数据库版本前端
// 连接到数据库版本API (端口3003)

class PsychologicalAssessmentApp {
    constructor() {
        // 使用数据库版本API
        this.apiBaseUrl = '/api';
        this.currentUser = null;
        this.currentAssessment = null;
        this.currentTest = null;
        this.currentResult = null;
        this.currentAnswers = [];
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        
        this.init();
    }

    init() {
        console.log('心镜·心理测评初始化 (数据库版本)...');
        console.log('API地址:', this.apiBaseUrl);
        
        // 检查用户登录状态 (使用统一认证，已包含 onAuthChange 监听)
        this.checkAuthStatus();
        
        // 绑定事件监听器
        this.bindEvents();
        
        // 加载测评列表
        this.loadAssessments();
        
        // 显示首页
        this.showSection('home');
    }

    // 检查认证状态 (使用统一认证)
    async checkAuthStatus() {
        console.log('检查认证状态 (XianbaoAuth)...');
        
        // 等待 XianbaoAuth 初始化（最多1秒）
        for (let i = 0; i < 20; i++) {
            if (typeof XianbaoAuth !== 'undefined' && XianbaoAuth.isLoggedIn !== undefined) break;
            await new Promise(r => setTimeout(r, 50));
        }
        
        if (typeof XianbaoAuth !== 'undefined') {
            // 监听认证状态变化
            XianbaoAuth.onAuthChange((state) => {
                if (state.loggedIn && state.user) {
                    this.currentUser = {
                        id: state.user.id,
                        username: state.user.nickname || state.user.username,
                        email: state.user.email,
                        role: state.user.role || 'user'
                    };
                    this.updateAuthUI(true);
                    console.log('用户已登录:', this.currentUser.username);
                    this.loadUserResults();
                    // 如果当前在测评详情页，自动开始测评
                    const stBtn = document.getElementById('startTest');
                    if (stBtn && this.currentAssessment && this.currentAssessment.id) {
                        console.log('登录后自动开始测评:', this.currentAssessment.id);
                        this.startAssessment(this.currentAssessment.id);
                    }
                } else {
                    this.currentUser = null;
                    this.updateAuthUI(false);
                    console.log('用户未登录');
                }
            });
            
            // 立即检查当前状态
            const authState = await XianbaoAuth.checkAuth();
            if (authState.loggedIn && authState.user) {
                this.currentUser = {
                    id: authState.user.id,
                    username: authState.user.nickname || authState.user.username,
                    email: authState.user.email,
                    role: authState.user.role || 'user'
                };
                this.updateAuthUI(true);
                console.log('用户已登录:', this.currentUser.username);
                this.loadUserResults();
            } else {
                this.currentUser = null;
                this.updateAuthUI(false);
                console.log('用户未登录');
            }
        } else {
            console.warn('XianbaoAuth 未加载，使用备用方案');
            this.currentUser = null;
            this.updateAuthUI(false);
        }
    }

    // 更新认证UI (统一认证由topbar处理，这里只控制应用内元素)
    updateAuthUI(isLoggedIn) {
        console.log('更新认证UI，登录状态:', isLoggedIn);
        
        if (isLoggedIn && this.currentUser) {
            // 显示记录导航链接
            const navRecords = document.getElementById('navRecords');
            if (navRecords) navRecords.style.display = 'inline-block';
            
            // 管理员tab
            const adminTab = document.getElementById('adminRecordsTab');
            if (adminTab) adminTab.style.display = this.currentUser.role === 'admin' ? 'inline-block' : 'none';
        } else {
            // 隐藏记录导航链接
            const navRecords = document.getElementById('navRecords');
            if (navRecords) navRecords.style.display = 'none';
            
            // 隐藏管理员tab
            const adminTab = document.getElementById('adminRecordsTab');
            if (adminTab) adminTab.style.display = 'none';
        }
    }

    // 绑定事件 - 与修复版相同
    bindEvents() {
        console.log('绑定事件监听器...');
        
        // 导航菜单切换
        const navToggle = document.getElementById('navToggle');
        if (navToggle) {
            navToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const navMenu = document.querySelector('.nav-menu');
                navMenu.classList.toggle('active');
                // 切换汉堡/叉叉图标
                const icon = navToggle.querySelector('i');
                if (icon) {
                    icon.className = navMenu.classList.contains('active')
                        ? 'fas fa-times'
                        : 'fas fa-bars';
                }
            });
        }

        // 移动端：点击导航外部关闭菜单
        document.addEventListener('click', (e) => {
            const navMenu = document.querySelector('.nav-menu');
            const nav = document.querySelector('.navbar .container');
            if (navMenu && navMenu.classList.contains('active') &&
                nav && !nav.contains(e.target)) {
                navMenu.classList.remove('active');
                const icon = document.querySelector('.nav-toggle i');
                if (icon) icon.className = 'fas fa-bars';
            }
        });

        // 导航链接
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                this.showSection(targetId);
                
                // 更新活动状态
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // 移动端关闭菜单
                document.querySelector('.nav-menu').classList.remove('active');
                const icon = document.querySelector('.nav-toggle i');
                if (icon) icon.className = 'fas fa-bars';
            });
        });

        // 开始测评按钮（首页）
        const startBtn = document.getElementById('startAssessment');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.showSection('assessments');
            });
        }

        // 了解更多按钮
        const learnMoreBtn = document.getElementById('learnMore');
        if (learnMoreBtn) {
            learnMoreBtn.addEventListener('click', () => {
                document.getElementById('assessments').scrollIntoView({ behavior: 'smooth' });
            });
        }

        // 返回列表按钮
        const backBtn = document.getElementById('backToList');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.showSection('assessments');
            });
        }


        // 测试页面按钮
        const prevQuestion = document.getElementById('prevQuestion');
        if (prevQuestion) {
            prevQuestion.addEventListener('click', () => {
                this.prevQuestion();
            });
        }

        const nextQuestion = document.getElementById('nextQuestion');
        if (nextQuestion) {
            nextQuestion.addEventListener('click', () => {
                this.nextQuestion();
            });
        }

        const submitTest = document.getElementById('submitTest');
        if (submitTest) {
            console.log('找到提交按钮，绑定点击事件');
            submitTest.addEventListener('click', () => {
                console.log('提交按钮被点击');
                const total = this.currentQuestions.length;
                const answered = this.currentAnswers.length;
                if (answered < total) {
                    const missing = total - answered;
                    this.showMessage('还有 ' + missing + ' 题未答，请完成后再提交', 'info');
                    // 跳转到第一个未答题
                    const answeredIds = new Set(this.currentAnswers.map(a => a.questionId));
                    const firstMissing = this.currentQuestions.findIndex(q => !answeredIds.has(q.id));
                    if (firstMissing >= 0) {
                        this.currentQuestionIndex = firstMissing;
                        this.showCurrentQuestion();
                    }
                    return;
                }
                this.submitAssessment();
            });
        } else {
            console.error('未找到提交按钮 (ID: submitTest)');
        }

        // 下载PDF按钮
        const downloadPdfBtn = document.getElementById('downloadPdf');
        if (downloadPdfBtn) {
            downloadPdfBtn.addEventListener('click', () => {
                this.downloadPDF();
            });
        }

        // 新的测评按钮
        const newAssessment = document.getElementById('newAssessment');
        if (newAssessment) {
            newAssessment.addEventListener('click', () => {
                this.showSection('assessments');
            });
        }

        // 保存结果按钮 - 绑定下载功能
        const saveResultBtn = document.getElementById('saveResult');
        if (saveResultBtn) {
            console.log('绑定保存结果按钮');
            saveResultBtn.addEventListener('click', () => {
                this.showSaveFormatModal();
            });
        } else {
            console.error('未找到保存结果按钮 (ID: saveResult)');
        }
        
        // 页脚快速链接
        document.querySelectorAll('.footer-section a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                this.showSection(targetId);
            });
        });
        console.log('事件绑定完成');
    }

    // 显示/隐藏页面部分
    showSection(sectionId) {
        console.log('显示部分:', sectionId);
        // 隐藏所有部分
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });
        
        // 显示目标部分
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            
            // 滚动到顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // 如果是记录页面，加载数据
            if (sectionId === 'records') {
                this.loadMyRecords();
            }
        } else {
            console.error('未找到部分:', sectionId);
        }
    }

    // 显示登录弹窗 - 统一认证
    showAuthModal(type = 'login') {
        if (typeof XianbaoAuth !== 'undefined') {
            XianbaoAuth.showLogin();
        } else {
            this.showMessage('认证服务未加载，请刷新页面', 'error');
        }
    }

    // 隐藏登录弹窗（由 auth-widget 控制）
    hideAuthModal() {
        // auth-widget 自动管理，无需操作
    }

    // 用户登录 - 使用统一认证
    async login() {
        console.log('开始登录 (XianbaoAuth)...');
        
        if (typeof XianbaoAuth === 'undefined') {
            this.showMessage('认证服务未加载，请刷新页面', 'error');
            return;
        }
        
        XianbaoAuth.showLogin();
    }

    // 用户注册 - 使用统一认证
    async register() {
        console.log('开始注册 (XianbaoAuth)...');
        
        if (typeof XianbaoAuth === 'undefined') {
            this.showMessage('认证服务未加载，请刷新页面', 'error');
            return;
        }
        
        XianbaoAuth.showLogin();
    }

    // 用户退出 - 使用统一认证
    logout() {
        console.log('退出登录');
        
        if (typeof XianbaoAuth !== 'undefined') {
            XianbaoAuth.logout().then(() => {
                this.currentUser = null;
                this.updateAuthUI(false);
                this.showMessage('已退出登录', 'success');
                this.showSection('home');
            }).catch(() => {
                this.currentUser = null;
                this.updateAuthUI(false);
                this.showSection('home');
            });
        } else {
            this.currentUser = null;
            this.updateAuthUI(false);
            this.showMessage('已退出登录', 'success');
            this.showSection('home');
        }
    }

    // 加载测评列表 - 数据库版本
    async loadAssessments() {
        console.log('加载测评列表 (数据库版本)...');
        const grid = document.getElementById('assessmentGrid');
        if (!grid) {
            console.error('未找到测评网格容器');
            return;
        }
        
        grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>加载测评列表...</p></div>';
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/assessments`);
            const data = await response.json();
            console.log('测评列表响应:', data);
            
            if (data.success) {
                this.renderAssessments(data.data);
            } else {
                grid.innerHTML = '<div class="error">加载失败，请刷新页面</div>';
            }
        } catch (error) {
            console.error('加载测评列表失败:', error);
            grid.innerHTML = '<div class="error">网络错误，请检查连接</div>';
        }
    }

    // 渲染测评列表（按分类分组）
    renderAssessments(assessments) {
        console.log('渲染测评列表，数量:', assessments.length);
        const grid = document.getElementById('assessmentGrid');
        
        if (assessments.length === 0) {
            grid.innerHTML = '<div class="empty">暂无测评</div>';
            return;
        }

        // 按分类分组
        const categories = {};
        const categoryOrder = ['心理健康', '性格测试', '人际关系', '性心理', '个人成长', '职业规划'];
        for (const a of assessments) {
            const cat = a.category || '其他';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(a);
        }

        // 分类图标映射
        const catIcons = {
            '心理健康': 'fa-heart',
            '性格测试': 'fa-user',
            '人际关系': 'fa-users',
            '性心理': 'fa-gem',
            '个人成长': 'fa-seedling',
            '职业规划': 'fa-briefcase'
        };

        // 构建分类分组HTML
        let html = '';
        for (const cat of categoryOrder) {
            if (!categories[cat]) continue;
            const items = categories[cat];
            const icon = catIcons[cat] || 'fa-folder';
            html += `
                <div class="category-section">
                    <div class="category-header">
                        <i class="fas ${icon}"></i>
                        <h2>${cat}</h2>
                        <span class="category-count">${items.length}个测评</span>
                    </div>
                    <div class="category-grid">
                        ${(() => { const isList = document.body.classList.contains('layout-list'); return items.map(a => {
                            if (isList) { return `
                            <div class="assessment-card" data-id="${a.id}">
                                <div class="assessment-card-header">
                                    <h3>${a.name}</h3>
                                </div>
                                <div class="assessment-card-body">
                                    <p>${a.description}</p>
                                </div>
                                <div class="assessment-card-footer">
                                    <div class="assessment-meta">
                                        <span class="meta-item">
                                            <i class="fas fa-clock"></i>
                                            ${a.estimated_time}分钟
                                        </span>
                                        <span class="meta-item">
                                            <i class="fas fa-question-circle"></i>
                                            ${a.questions_count}题
                                        </span>
                                    </div>
                                    <button class="btn btn-primary btn-sm btn-view-assessment" data-id="${a.id}">查看</button>
                                </div>
                            </div>
                        `; } else { return `
                            <div class="assessment-card" data-id="${a.id}">
                                <div class="assessment-card-header">
                                    <h3>${a.name}</h3>
                                </div>
                                <div class="assessment-card-body">
                                    <p>${a.description}</p>
                                </div>
                                <div class="assessment-card-footer">
                                    <div class="assessment-meta">
                                        <span class="meta-item">
                                            <i class="fas fa-clock"></i>
                                            ${a.estimated_time}分钟
                                        </span>
                                        <span class="meta-item">
                                            <i class="fas fa-question-circle"></i>
                                            ${a.questions_count}题
                                        </span>
                                    </div>
                                    <button class="btn btn-primary btn-view-assessment" data-id="${a.id}">
                                        查看详情
                                    </button>
                                </div>
                            </div>
                        `; } }).join(''); })()}
                    </div>
                </div>`;
        }

        grid.innerHTML = html;
        
        // 绑定查看详情事件（使用data-id）
        document.querySelectorAll('.btn-view-assessment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.id);
                this.viewAssessmentDetails(id);
            });
        });
        
        console.log('测评列表渲染完成（按分类分组）');
    }

    // 查看测评详情 - 数据库版本
    async viewAssessmentDetails(assessmentId) {
        console.log('查看测评详情，ID:', assessmentId);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/assessments/${assessmentId}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentAssessment = data.data;
                console.log('加载测评详情成功:', this.currentAssessment.name);
                
                // 更新详情页面内容
                document.getElementById('assessmentTitle').textContent = this.currentAssessment.name;
                document.getElementById('assessmentTime').textContent = `${this.currentAssessment.estimated_time}分钟`;
                document.getElementById('assessmentQuestions').textContent = `${this.currentAssessment.questions.length}题`;
                document.getElementById('assessmentCategory').textContent = this.currentAssessment.category;
                document.getElementById('assessmentDesc').textContent = this.currentAssessment.description;
                
                // 获取开始测试按钮
                const startTestBtn = document.getElementById('startTest');
                if (startTestBtn) {
                    // 清除旧的事件监听器
                    startTestBtn.onclick = null;
                    
                    // 检查用户是否已登录
                    if (!this.currentUser) {
                        startTestBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 请先登录';
                        startTestBtn.onclick = () => {
                            this.showAuthModal('login');
                            this.showMessage('请先登录才能开始测评', 'info');
                        };
                    } else {
                        startTestBtn.innerHTML = '<i class="fas fa-play"></i> 开始测试';
                        startTestBtn.onclick = () => {
                            console.log('开始测试按钮被点击，测评ID:', this.currentAssessment.id);
                            this.startAssessment(this.currentAssessment.id);
                        };
                    }
                }
                
                // 显示详情页面
                this.showSection('assessmentDetail');
            } else {
                this.showMessage('加载测评详情失败: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('加载测评详情失败:', error);
            this.showMessage('网络错误，请稍后重试', 'error');
        }
    }

    // 开始测评 - 数据库版本
    async startAssessment(assessmentId) {
        console.log('=== 开始测评流程 (数据库版本) ===');
        console.log('测评ID:', assessmentId);
        console.log('当前用户:', this.currentUser);
        console.log('当前测评:', this.currentAssessment);
        
        if (!this.currentUser) {
            console.log('错误：用户未登录');
            this.showMessage('请先登录', 'error');
            this.showAuthModal('login');
            return;
        }
        
        try {
            console.log('发送开始测评请求...');
            const response = await fetch(`${this.apiBaseUrl}/assessments/${assessmentId}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            console.log('响应状态:', response.status);
            const data = await response.json();
            console.log('开始测评响应:', data);
            
            if (data.success) {
                console.log('开始测评成功');
                this.currentResult = {
                    assessmentId: assessmentId
                };
                this.currentAnswers = [];
                this.currentQuestionIndex = 0;
                


                console.log('当前结果:', this.currentResult);
                
                // 加载测评题目
                await this.loadAssessmentQuestions(assessmentId);
            } else {
                console.log('开始测评失败:', data.error);
                if (data.error === 'free_psych_test_limit') {
                    this.showSection('testPage');
                    const tc = document.querySelector('#testPage .test-content');
                    if (tc) this.showLimitCard(tc);
                } else {
                    this.showMessage('开始测评失败: ' + data.error, 'error');
                }
            }
        } catch (error) {
            console.error('开始测评失败:', error);
            this.showMessage('网络错误，请稍后重试', 'error');
        }
    }

    // 加载测评题目 - 数据库版本
    async loadAssessmentQuestions(assessmentId) {
        console.log('加载测评题目，ID:', assessmentId);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/assessments/${assessmentId}`);
            const data = await response.json();
            
            if (data.success && data.data.questions) {
                console.log('加载题目成功，数量:', data.data.questions.length);
                this.currentQuestions = data.data.questions;
                this.showSection('testPage');
                // 设置答题页顶部测评名称
                const testNameEl = document.getElementById('testAssessmentName');
                if (testNameEl && this.currentAssessment) {
                    testNameEl.textContent = this.currentAssessment.name;
                }
                this.showCurrentQuestion();
            } else {
                console.log('加载题目失败');
                this.showMessage('加载题目失败', 'error');
            }
        } catch (error) {
            console.error('加载题目失败:', error);
            this.showMessage('网络错误，请稍后重试', 'error');
        }
    }

    // 显示当前题目
    showCurrentQuestion() {
        console.log('显示当前题目，索引:', this.currentQuestionIndex);
        
        if (this.currentQuestions.length === 0) {
            console.error('没有题目数据');
            return;
        }
        
        const question = this.currentQuestions[this.currentQuestionIndex];
        const totalQuestions = this.currentQuestions.length;
        
        console.log('当前题目:', {
            id: question.id,
            text: question.question_text,
            type: question.question_type
        });
        
        // 确保顶部测评名称已设置
        const testNameEl2 = document.getElementById('testAssessmentName');
        if (testNameEl2 && this.currentAssessment && !testNameEl2.textContent) {
            testNameEl2.textContent = this.currentAssessment.name;
        }

        // 更新题目文本（含序号）
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.textContent = (this.currentQuestionIndex + 1) + '. ' + question.question_text;
        }
        


        // 更新题目全景指示器
        this.updateQuestionIndicators();
        
        // 渲染选项
        this.renderQuestionOptions(question);
        
        // 更新按钮状态
        this.updateNavigationButtons();
    }

    // 初始化题目全景指示器
    initQuestionIndicators() {
        const container = document.getElementById('questionIndicators');
        if (!container || !this.currentQuestions.length) return;
        container.innerHTML = '';
        const total = this.currentQuestions.length;
        for (let i = 0; i < total; i++) {
            const dot = document.createElement('span');
            dot.className = 'question-indicator';
            dot.title = '第' + (i + 1) + '题';
            dot.addEventListener('click', () => {
                this.currentQuestionIndex = i;
                this.showCurrentQuestion();
            });
            container.appendChild(dot);
        }
    }

    // 更新题目全景指示器状态
    updateQuestionIndicators() {
        const container = document.getElementById('questionIndicators');
        if (!container) return;
        // 如果圆点数量不对，重新初始化
        if (container.children.length !== this.currentQuestions.length) {
            this.initQuestionIndicators();
        }
        const answeredIds = new Set(this.currentAnswers.map(a => a.questionId));
        const dots = container.children;
        for (let i = 0; i < dots.length; i++) {
            const q = this.currentQuestions[i];
            dots[i].className = 'question-indicator' +
                (answeredIds.has(q.id) ? ' answered' : '') +
                (i === this.currentQuestionIndex ? ' current' : '');
        }
    }

    // 渲染题目选项
    renderQuestionOptions(question) {
        console.log('渲染题目选项:', question.id);
        const optionsContainer = document.getElementById('questionOptions');
        if (!optionsContainer) { console.error('未找到选项容器'); return; }
        optionsContainer.innerHTML = '';
        try {
            const options = question.options;
            const existingAnswer = this.currentAnswers.find(a => a.questionId === question.id);
            const selectedValue = existingAnswer ? existingAnswer.answerValue : null;
            for (const [key, value] of Object.entries(options)) {
                const isChecked = selectedValue !== null &&
                    (question.question_type === 'scale' ? selectedValue.toString() === key : selectedValue === key);
                const optionDiv = document.createElement('div');
                optionDiv.className = 'option-item' + (isChecked ? ' selected' : '');
                optionDiv.innerHTML = '<div class="option-radio"></div><span class="option-text">' + value + '</span>';
                optionDiv.addEventListener('click', () => {
                    optionsContainer.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
                    optionDiv.classList.add('selected');
                    this.recordAnswer(question.id, key);
                });
                optionsContainer.appendChild(optionDiv);
            }
        } catch (e) {
            console.error('渲染选项失败:', e);
            optionsContainer.innerHTML = '<div class="error">选项解析失败</div>';
        }
        console.log('选项渲染完成');
    }

    // 更新导航按钮状态
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevQuestion');
        const nextBtn = document.getElementById('nextQuestion');
        const submitBtn = document.getElementById('submitTest');
        const self = this;
        
        if (prevBtn) {
            prevBtn.disabled = this.currentQuestionIndex === 0;
        }
        
        const isLastQuestion = this.currentQuestionIndex === this.currentQuestions.length - 1;
        if (nextBtn) {
            nextBtn.disabled = isLastQuestion;
            nextBtn.style.display = 'inline-block';
        }
        
        const allAnswered = this.currentAnswers.length === this.currentQuestions.length;
        
        if (submitBtn) {
            submitBtn.style.display = 'inline-block';
            submitBtn.disabled = !allAnswered;
            if (allAnswered) {
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 提交测评';
                submitBtn.className = 'btn btn-success submit-ready';
            } else {
                submitBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> 已回答 ' + this.currentAnswers.length + '/' + this.currentQuestions.length;
                submitBtn.className = 'btn btn-outline';
                submitBtn.classList.remove('submit-ready');
            }
        }
        

    }

    // 上一题
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showCurrentQuestion();
        }
    }

    // 下一题
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            const qid = this.currentQuestions[this.currentQuestionIndex]?.id;
            const answered = this.currentAnswers.some(a => Number(a.questionId) === Number(qid));
            if (!answered) {
                this.showMessage('请先回答本题', 'info');
                return;
            }
            if (this.autoJumpTimer) { clearTimeout(this.autoJumpTimer); this.autoJumpTimer = null; }
            this.currentQuestionIndex++;
            this.showCurrentQuestion();
        }
    }

    // 记录答案
    recordAnswer(questionId, answerValue) {
        console.log('记录答案:', { questionId, answerValue });
        
        // 移除旧的答案记录
        this.currentAnswers = this.currentAnswers.filter(a => a.questionId !== questionId);
        
        // 添加新的答案记录
        this.currentAnswers.push({
            questionId,
            answerValue: typeof answerValue === 'string' && !isNaN(answerValue) ? parseInt(answerValue) : answerValue
        });
        
        console.log('当前答案:', this.currentAnswers);
        
        // 更新导航按钮状态
        this.updateNavigationButtons();
        
        // 自动跳转下一题
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            if (this.autoJumpTimer) clearTimeout(this.autoJumpTimer);
            const idx = this.currentQuestionIndex;
            this.autoJumpTimer = setTimeout(() => {
                this.autoJumpTimer = null;
                if (this.currentQuestionIndex === idx) {
                    this.currentQuestionIndex++;
                    this.showCurrentQuestion();
                }
            }, 400);
        }
    }

    // 提交测评 - 数据库版本
    async submitAssessment() {
        console.log('=== 提交测评流程开始 (数据库版本) ===');
        console.log('当前结果:', this.currentResult);
        console.log('当前测评:', this.currentAssessment);
        console.log('当前答案:', this.currentAnswers);
        console.log('当前题目:', this.currentQuestions);
        
        if (!this.currentResult || !this.currentAssessment) {
            console.error('错误：测评信息不完整');
            this.showMessage('测评信息不完整', 'error');
            return;
        }
        
        const totalQuestions = this.currentQuestions.length;
        console.log('总题目数:', totalQuestions);
        console.log('已回答数:', this.currentAnswers.length);
        
        if (this.currentAnswers.length !== totalQuestions) {
            console.error(`错误：未完成所有题目 (${this.currentAnswers.length}/${totalQuestions})`);
            this.showMessage(`请完成所有题目 (${this.currentAnswers.length}/${totalQuestions})`, 'error');
            return;
        }
        
        try {
            console.log('发送提交测评请求...');
            console.log('API地址:', `${this.apiBaseUrl}/assessments/${this.currentAssessment.id}/submit`);
            console.log('请求数据:', {

                answers: this.currentAnswers
            });
            
            const response = await fetch(`${this.apiBaseUrl}/assessments/${this.currentAssessment.id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
    
                    answers: this.currentAnswers
                })
            });
            
            console.log('响应状态:', response.status);
            const data = await response.json();
            console.log('提交测评响应:', data);
            
            if (data.success) {
                console.log('提交测评成功！');
                this.showMessage('测评提交成功！', 'success');
                
                // 显示结果
                this.showAssessmentResult(data.data);
            } else {
                console.error('提交测评失败:', data.error);
                                if (data.error === 'free_psych_test_limit') {
                    this.showSection('resultPage');
                    const rc = document.querySelector('#resultPage .result-content');
                    if (rc) this.showLimitCard(rc);
                } else {
                    this.showMessage('提交失败: ' + data.error, 'error');
                }
            }
        } catch (error) {
            console.error('提交测评失败:', error);
            this.showMessage('网络错误，请稍后重试', 'error');
        }
    }

    // 显示次数用尽卡片（与塔罗站风格一致）
    showLimitCard(targetEl) {
        const limitHtml =
            '<div style="text-align:center;padding:40px 20px;">' +
            '<div style="font-size:48px;margin-bottom:16px;">📊</div>' +
            '<h3 style="margin:0 0 12px;color:#a78bfa;">免费次数已用完</h3>' +
            '<p style="margin:0 0 20px;color:#888;font-size:14px;line-height:1.8;">' +
            '你的免费心理测评次数已用完。升级VIP后可无限使用<br>' +
            '心理测评 · 塔罗解读 · 玛雅天赋 · 灵修阅读等全部功能。</p>' +
            '<a href="' + (window.XB_MAIN || 'https://xianbao.online') + '/vip.html" target="_blank" ' +
            'style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#a78bfa,#f472b6);' +
            'color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">' +
            '✨ 了解VIP会员</a></div>';
        if (targetEl) {
            targetEl.innerHTML = limitHtml;
        }
    }

    // 显示测评结果 - 数据库版本
    showAssessmentResult(resultData) {
        console.log('=== 显示测评结果 (增强版) ===');
        console.log('结果数据:', resultData);
        
        // 保存分析数据供保存功能使用
        this.currentAnalysis = resultData.analysis || {};

        // 更新结果标题
        const resultTitle = document.getElementById('resultTitle');
        if (resultTitle && this.currentAssessment) {
            resultTitle.textContent = this.currentAssessment.name + ' · 测评结果';
        }

        // 更新基本结果
        const totalScore = document.getElementById('totalScore');
        const scoreDetails = document.getElementById('scoreDetails');
        const recommendations = document.getElementById('recommendations');
        
        if (totalScore) totalScore.textContent = resultData.totalScore || '--';
        
        const analysis = resultData.analysis || {};
        
        // 兜底：无分析数据时显示摘要
        if (!analysis.assessmentId && !analysis.personalityType && !analysis.severity) {
            if (scoreDetails) {
                scoreDetails.innerHTML = resultData.summary || resultData.resultSummary
                    ? '<p style="color:#94a3b8;line-height:1.6">' + (resultData.summary || resultData.resultSummary) + '</p>'
                    : '<p style="color:#64748b">暂无详细分析数据</p>';
            }
            if (recommendations) {
                recommendations.innerHTML = '<p style="color:#64748b">暂无建议数据</p>';
            }
            this.showSection('resultPage');
            return;
        }
        
        // 构建得分详情
        if (scoreDetails) {
            let detailHtml = '';
            if (analysis.assessmentId === 1) {
                const dims = analysis.dimensions || {};
                const dimNames = { 'E_I': '外向(E)-内向(I)', 'S_N': '实感(S)-直觉(N)', 'T_F': '思考(T)-情感(F)', 'J_P': '判断(J)-感知(P)' };
                Object.entries(dims).forEach(([key, val]) => {
                    const eScore = val.E || val.I || 1;
                    const iScore = val.I || val.E || 1;
                    const total = eScore + iScore;
                    const ePct = total > 0 ? Math.round(eScore / total * 100) : 50;
                    detailHtml += `
                        <div class="dimension-bar">
                            <div class="dim-label">${dimNames[key] || key}</div>
                            <div class="dim-bar-track">
                                <div class="dim-bar-fill" style="width:${ePct}%;background:linear-gradient(90deg,#4cc9f0,#4361ee)"></div>
                                <span class="dim-result">${val.result || ''}</span>
                            </div>
                        </div>`;
                });
                detailHtml += `<div class="dim-type"><strong>性格类型：${analysis.personalityType}（${analysis.personalityTitle}）</strong></div>`;
            } else if (analysis.assessmentId === 2) {
                const sevColors = { '无抑郁': '#4caf50', '轻度抑郁': '#8bc34a', '中度抑郁': '#ff9800', '中重度抑郁': '#f44336', '重度抑郁': '#b71c1c' };
                const sevColor = sevColors[analysis.severity] || '#ff9800';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${sevColor};width:${Math.min(resultData.totalScore || 0, 27)/27*100}%"></div>
                        <div class="severity-info">
                            <span>评分：${resultData.totalScore || 0}/27</span>
                            <span style="color:${sevColor};font-weight:bold">${analysis.severity || '未知'}</span>
                        </div>
                    </div>`;
                detailHtml += `<div class="severity-scale"><small>0-4 无抑郁 | 5-9 轻度 | 10-14 中度 | 15-19 中重度 | 20-27 重度</small></div>`;
            } else if (analysis.assessmentId === 3) {
                const hollandScores = analysis.scores || {};
                let hollandItems = [];
                const typeNames = { 'R':'现实型','I':'研究型','A':'艺术型','S':'社会型','E':'企业型','C':'常规型' };
                for (const [code, score] of Object.entries(hollandScores)) {
                    if (typeNames[code]) {
                        hollandItems.push({ code, name: typeNames[code], score });
                    }
                }
                if (hollandItems.length > 0) {
                    hollandItems.sort((a,b) => (b.score||0) - (a.score||0));
                    hollandItems.forEach(item => {
                        const pct = Math.min((item.score || 0) / 6 * 100, 100);
                        detailHtml += `
                            <div class="holland-bar">
                                <div class="dim-label">${item.code} ${item.name}</div>
                                <div class="dim-bar-track">
                                    <div class="dim-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,#a78bfa,#7c3aed)"></div>
                                    <span class="dim-result">${item.score}分</span>
                                </div>
                            </div>`;
                    });
                }
                detailHtml += `<div class="dim-type"><strong>职业代码：${analysis.hollandCode || ''}</strong></div>`;
            } else if (analysis.assessmentId === 9) {
                // 自爱能力测评 - 总分进度条
                const score = analysis.score || 0;
                const maxScore = analysis.maxScore || 130;
                const pct = Math.min(Math.round(score / maxScore * 100), 100);
                const sevColors = {
                    '自爱力明显不足': '#e74c3c',
                    '自爱力有待提升': '#f39c12',
                    '自爱力中等': '#3498db',
                    '自爱力良好': '#2ecc71'
                };
                const sevColor = sevColors[analysis.severity] || '#3498db';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${sevColor};width:${pct}%"></div>
                        <div class="severity-info">
                            <span>总分：${score}/${maxScore}</span>
                            <span style="color:${sevColor};font-weight:bold">${analysis.severity || '未知'}</span>
                        </div>
                    </div>
                    <div class="severity-scale"><small>26-52 自爱力明显不足 | 53-78 有待提升 | 79-104 中等 | 105-130 良好</small></div>`;

                // 6个维度进度条
                const dimInfo = {
                    '自我接纳': { icon: '💖', desc: '接纳自身不完美，不因犯错而过度自我批评' },
                    '自我关怀': { icon: '🤗', desc: '痛苦时温柔对待自己，像对朋友一样关怀自己' },
                    '边界意识': { icon: '🛡️', desc: '维护个人边界，对不合理要求说不' },
                    '内在肯定': { icon: '🌟', desc: '不需要外部认可，感受内在价值' },
                    '情绪接纳': { icon: '🌊', desc: '允许负面情绪存在，不压抑真实感受' },
                    '自我成长': { icon: '🌱', desc: '为自己投资成长，关注身心健康' }
                };
                const dims = analysis.dimensions || {};
                Object.entries(dims).forEach(([key, val]) => {
                    const avgScore = val.score || 0;
                    const dimPct = Math.min(Math.round(avgScore / 5 * 100), 100);
                    const dimColor = avgScore >= 4 ? '#2ecc71' : avgScore >= 3 ? '#f39c12' : '#e74c3c';
                    const info = dimInfo[key] || { icon: '📊', desc: '' };
                    const dimLevel = avgScore >= 4 ? '良好' : avgScore >= 3 ? '中等' : '需提升';
                    detailHtml += `
                        <div class="dimension-bar">
                            <div class="dim-label">${info.icon} ${key} <span class="dim-level">(${dimLevel})</span></div>
                            <div class="dim-bar-track">
                                <div class="dim-bar-fill" style="width:${dimPct}%;background:${dimColor}"></div>
                                <span class="dim-result">${avgScore}/5</span>
                            </div>
                            <div class="dim-desc">${info.desc}</div>
                        </div>`;
                });
            } else if (analysis.assessmentId === 8) {
                // 富足心态测评 - 总分进度条
                const score = analysis.score || 0;
                const maxScore = analysis.maxScore || 210;
                const pct = Math.min(Math.round(score / maxScore * 100), 100);
                const sevColors = {
                    '匮乏心态显著': '#e74c3c',
                    '混合心态': '#f39c12',
                    '富足倾向': '#3498db',
                    '富足心态显著': '#2ecc71'
                };
                const sevColor = sevColors[analysis.severity] || '#3498db';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${sevColor};width:${pct}%"></div>
                        <div class="severity-info">
                            <span>总分：${score}/${maxScore}</span>
                            <span style="color:${sevColor};font-weight:bold">${analysis.severity || '未知'}</span>
                        </div>
                    </div>
                    <div class="severity-scale"><small>42-84 匮乏心态显著 | 85-126 混合心态 | 127-168 富足倾向 | 169-210 富足心态显著</small></div>`;
                
                // 7个维度进度条
                const dimNames = {
                    '自我价值': { cn: '自我价值', icon: '💎' },
                    '给予与接收': { cn: '给予与接收', icon: '🤲' },
                    '内在指引': { cn: '内在指引', icon: '🧭' },
                    '成长心态': { cn: '成长心态', icon: '🌱' },
                    '合作共赢': { cn: '合作共赢', icon: '🤝' },
                    '使命与活力': { cn: '使命与活力', icon: '⚡' },
                    '积极聚焦': { cn: '积极聚焦', icon: '🔆' }
                };
                const dims = analysis.dimensions || {};
                Object.entries(dims).forEach(([key, val]) => {
                    const dimPct = Math.min(Math.round((val.score || 0) / 5 * 100), 100);
                    const dimColor = val.score >= 4 ? '#2ecc71' : val.score >= 3 ? '#f39c12' : '#e74c3c';
                    const info = dimNames[key] || { cn: key, icon: '📊' };
                    detailHtml += `
                        <div class="dimension-bar">
                            <div class="dim-label">${info.icon} ${info.cn}</div>
                            <div class="dim-bar-track">
                                <div class="dim-bar-fill" style="width:${dimPct}%;background:${dimColor}"></div>
                                <span class="dim-result">${val.score}/5</span>
                            </div>
                        </div>`;
                });
            } else if (analysis.assessmentId === 9) {
                // 自爱能力测评 - 总分进度条
                const slScore = analysis.score || 0;
                const slMax = analysis.maxScore || 130;
                const slPct = Math.min(Math.round(slScore / slMax * 100), 100);
                const slColors = {
                    '自爱力明显不足': '#e74c3c',
                    '自爱力有待提升': '#f39c12',
                    '自爱力中等': '#3498db',
                    '自爱力良好': '#2ecc71'
                };
                const slColor = slColors[analysis.severity] || '#3498db';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${slColor};width:${slPct}%"></div>
                        <div class="severity-info">
                            <span>总分：${slScore}/${slMax}</span>
                            <span style="color:${slColor};font-weight:bold">${analysis.severity || '未知'}</span>
                        </div>
                    </div>
                    <div class="severity-scale"><small>26-52 自爱力明显不足 | 53-78 有待提升 | 79-104 中等 | 105-130 良好</small></div>`;
                
                // 6个维度进度条
                const slDims = analysis.dimensions || {};
                Object.entries(slDims).forEach(([key, val]) => {
                    const dimPct = Math.min(Math.round((val.score || 0) / 5 * 100), 100);
                    const dimColor = val.score >= 4 ? '#2ecc71' : val.score >= 3 ? '#f39c12' : '#e74c3c';
                    detailHtml += `
                        <div class="dimension-bar">
                            <div class="dim-label">${key}</div>
                            <div class="dim-bar-track">
                                <div class="dim-bar-fill" style="width:${dimPct}%;background:${dimColor}"></div>
                                <span class="dim-result">${val.score}/5</span>
                            </div>
                        </div>`;
                });
            } else if (analysis.assessmentId === 4) {
                // SAS焦虑自评量表 - 标准分/100进度条
                const sasScore = resultData.totalScore || analysis.score || 0;
                const sasMax = 100;
                const sasPct = Math.min(Math.round(sasScore / sasMax * 100), 100);
                const sasColors = { '正常': '#4caf50', '轻度焦虑': '#ff9800', '中度焦虑': '#f44336', '重度焦虑': '#b71c1c' };
                const sasColor = sasColors[analysis.severity] || '#ff9800';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${sasColor};width:${sasPct}%"></div>
                        <div class="severity-info">
                            <span>标准分：${sasScore}/100</span>
                            <span style="color:${sasColor};font-weight:bold">${analysis.severity || '未知'}</span>
                        </div>
                    </div>
                    <div class="severity-scale"><small>＜50 正常 | 50-59 轻度焦虑 | 60-69 中度焦虑 | ≥70 重度焦虑</small></div>`;
            } else if (analysis.assessmentId === 5) {
                // GAD-7广泛性焦虑 - 总分/21进度条
                const g7Score = resultData.totalScore || analysis.score || 0;
                const g7Pct = Math.min(Math.round(g7Score / 21 * 100), 100);
                const g7Colors = { '无焦虑症状': '#4caf50', '轻度焦虑': '#8bc34a', '中度焦虑': '#ff9800', '重度焦虑': '#f44336' };
                const g7Color = g7Colors[analysis.severity] || '#ff9800';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${g7Color};width:${g7Pct}%"></div>
                        <div class="severity-info">
                            <span>评分：${g7Score}/21</span>
                            <span style="color:${g7Color};font-weight:bold">${analysis.severity || '未知'}</span>
                        </div>
                    </div>
                    <div class="severity-scale"><small>0-4 无焦虑 | 5-9 轻度 | 10-14 中度 | 15-21 重度</small></div>`;
            } else if (analysis.assessmentId === 6) {
                // 大五人格 - 5维度进度条
                const bfDims = analysis.dimensions || {};
                const bfDimInfo = {
                    'E': { name: '外倾性(E)', icon: '🗣️' },
                    'A': { name: '宜人性(A)', icon: '🤝' },
                    'C': { name: '尽责性(C)', icon: '📋' },
                    'N': { name: '神经质(N)', icon: '🌊' },
                    'O': { name: '开放性(O)', icon: '🔭' }
                };
                Object.entries(bfDims).forEach(([key, val]) => {
                    const dimPct = Math.min(Math.round((val.score || 3) / 5 * 100), 100);
                    const dimColor = val.score >= 4 ? '#2ecc71' : val.score >= 2.5 ? '#f39c12' : '#e74c3c';
                    const info = bfDimInfo[key] || { name: key, icon: '📊' };
                    detailHtml += `
                        <div class="dimension-bar">
                            <div class="dim-label">${info.icon} ${info.name} <span class="dim-level">(${val.label || val.level || ''})</span></div>
                            <div class="dim-bar-track">
                                <div class="dim-bar-fill" style="width:${dimPct}%;background:${dimColor}"></div>
                                <span class="dim-result">${val.score}/5</span>
                            </div>
                        </div>`;
                });
            } else if (analysis.assessmentId === 7) {
                // EQ情绪智力 - 综合评分 + 5维度进度条
                const eqScore = analysis.score || resultData.totalScore || 0;
                const eqPct = Math.min(Math.round(eqScore / 5 * 100), 100);
                const eqColors = { '较高情商': '#2ecc71', '中等情商': '#f39c12', '有待提升': '#e74c3c' };
                const eqColor = eqColors[analysis.overallLevel] || '#3498db';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${eqColor};width:${eqPct}%"></div>
                        <div class="severity-info">
                            <span>综合情商：${eqScore}/5</span>
                            <span style="color:${eqColor};font-weight:bold">${analysis.overallLevel || '未知'}</span>
                        </div>
                    </div>`;
                const eqDims = analysis.dimensions || {};
                const eqDimInfo = {
                    '自我认知': { icon: '🧠' }, '同理心': { icon: '💗' },
                    '情绪调节': { icon: '⚖️' }, '社交技能': { icon: '🤝' },
                    '自我激励': { icon: '🔥' }
                };
                Object.entries(eqDims).forEach(([key, val]) => {
                    const dimPct = Math.min(Math.round((val.score || 3) / 5 * 100), 100);
                    const dimColor = val.score >= 4 ? '#2ecc71' : val.score >= 3 ? '#f39c12' : '#e74c3c';
                    const icon = eqDimInfo[key]?.icon || '📊';
                    detailHtml += `
                        <div class="dimension-bar">
                            <div class="dim-label">${icon} ${key} <span class="dim-level">(${val.level || ''})</span></div>
                            <div class="dim-bar-track">
                                <div class="dim-bar-fill" style="width:${dimPct}%;background:${dimColor}"></div>
                                <span class="dim-result">${val.score}/5</span>
                            </div>
                        </div>`;
                });
            } else if (analysis.assessmentId === 11) {
                // 人际信任量表 - 总分/125进度条
                const itsScore = resultData.totalScore || analysis.score || 0;
                const itsPct = Math.min(Math.round(itsScore / 125 * 100), 100);
                const itsColors = { '信任倾向低': '#e74c3c', '信任倾向偏低': '#f39c12', '信任倾向中等': '#3498db', '信任倾向较高': '#2ecc71', '信任倾向很高': '#1abc9c' };
                const itsColor = itsColors[analysis.severity] || '#3498db';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${itsColor};width:${itsPct}%"></div>
                        <div class="severity-info">
                            <span>总分：${itsScore}/125</span>
                            <span style="color:${itsColor};font-weight:bold">${analysis.severity || '未知'}</span>
                        </div>
                    </div>
                    <div class="severity-scale"><small>25-59 信任低 | 60-74 偏低 | 75-99 中等 | 100-114 较高 | 115-125 很高</small></div>`;
            } else if (analysis.assessmentId === 12) {
                // 共情量表 - 综合评分 + 4维度
                const iriScore = analysis.score || 0;
                const iriPct = Math.min(Math.round(iriScore / 5 * 100), 100);
                const iriColors = { '较高共情力': '#2ecc71', '中等共情力': '#f39c12', '共情力有待提升': '#e74c3c' };
                const iriColor = iriColors[analysis.overallLevel] || '#3498db';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${iriColor};width:${iriPct}%"></div>
                        <div class="severity-info">
                            <span>综合共情力：${iriScore}/5</span>
                            <span style="color:${iriColor};font-weight:bold">${analysis.overallLevel || '未知'}</span>
                        </div>
                    </div>`;
                const iriDims = analysis.dimensions || {};
                const iriDimInfo = {
                    '观点采择(PT)': { icon: '👁️' }, '共情关心(EC)': { icon: '❤️' },
                    '想象力(FS)': { icon: '🌟' }, '个人痛苦(PD)': { icon: '💧' }
                };
                Object.entries(iriDims).forEach(([key, val]) => {
                    const dimPct = Math.min(Math.round((val.score || 3) / 5 * 100), 100);
                    const dimColor = val.score >= 4 ? '#2ecc71' : val.score >= 3 ? '#f39c12' : '#e74c3c';
                    const icon = iriDimInfo[key]?.icon || '📊';
                    detailHtml += `
                        <div class="dimension-bar">
                            <div class="dim-label">${icon} ${key} <span class="dim-level">(${val.level || ''})</span></div>
                            <div class="dim-bar-track">
                                <div class="dim-bar-fill" style="width:${dimPct}%;background:${dimColor}"></div>
                                <span class="dim-result">${val.score}/5</span>
                            </div>
                        </div>`;
                });
            } else if (analysis.assessmentId === 13) {
                // 社交技能量表 - 综合评分 + 5维度
                const ssiScore = analysis.score || 0;
                const ssiPct = Math.min(Math.round(ssiScore / 5 * 100), 100);
                const ssiColors = { '社交技能较强': '#2ecc71', '社交技能中等': '#f39c12', '社交技能有待提升': '#e74c3c' };
                const ssiColor = ssiColors[analysis.overallLevel] || '#3498db';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${ssiColor};width:${ssiPct}%"></div>
                        <div class="severity-info">
                            <span>综合社交技能：${ssiScore}/5</span>
                            <span style="color:${ssiColor};font-weight:bold">${analysis.overallLevel || '未知'}</span>
                        </div>
                    </div>`;
                const ssiDims = analysis.dimensions || {};
                const ssiDimInfo = {
                    '表达能力(EX)': { icon: '🎤' }, '社交敏锐(SE)': { icon: '🔍' },
                    '情绪调节(ER)': { icon: '🧘' }, '冲突处理(CF)': { icon: '🤲' },
                    '关系维护(RM)': { icon: '🤗' }
                };
                Object.entries(ssiDims).forEach(([key, val]) => {
                    const dimPct = Math.min(Math.round((val.score || 3) / 5 * 100), 100);
                    const dimColor = val.score >= 4 ? '#2ecc71' : val.score >= 3 ? '#f39c12' : '#e74c3c';
                    const icon = ssiDimInfo[key]?.icon || '📊';
                    detailHtml += `
                        <div class="dimension-bar">
                            <div class="dim-label">${icon} ${key} <span class="dim-level">(${val.level || ''})</span></div>
                            <div class="dim-bar-track">
                                <div class="dim-bar-fill" style="width:${dimPct}%;background:${dimColor}"></div>
                                <span class="dim-result">${val.score}/5</span>
                            </div>
                        </div>`;
                });
            } else if (analysis.assessmentId === 14) {
                // 社交互动焦虑 - 总分/95进度条
                const siasScore = resultData.totalScore || analysis.score || 0;
                const siasPct = Math.min(Math.round(siasScore / 95 * 100), 100);
                const siasColors = { '社交互动焦虑低': '#4caf50', '社交互动焦虑中等': '#ff9800', '社交互动焦虑偏高': '#f44336', '社交互动焦虑高': '#b71c1c' };
                const siasColor = siasColors[analysis.severity] || '#ff9800';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${siasColor};width:${siasPct}%"></div>
                        <div class="severity-info">
                            <span>总分：${siasScore}/95</span>
                            <span style="color:${siasColor};font-weight:bold">${analysis.severity || '未知'}</span>
                        </div>
                    </div>
                    <div class="severity-scale"><small>19-37 焦虑低 | 38-52 中等 | 53-67 偏高 | 68-95 焦虑高</small></div>`;
            } else if (analysis.assessmentId === 15) {
                // SDS抑郁自评 - 标准分/100进度条
                const sdsScore = analysis.rawScore || '--';
                const sdsStd = resultData.totalScore || analysis.score || 0;
                const sdsPct = Math.min(Math.round(sdsStd / 100 * 100), 100);
                const sdsColors = { '正常': '#4caf50', '轻度抑郁': '#8bc34a', '中度抑郁': '#ff9800', '重度抑郁': '#f44336' };
                const sdsColor = sdsColors[analysis.severity] || '#ff9800';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${sdsColor};width:${sdsPct}%"></div>
                        <div class="severity-info">
                            <span>粗分 ${sdsScore}/80 · 标准分 ${sdsStd}/100</span>
                            <span style="color:${sdsColor};font-weight:bold">${analysis.severity || '未知'}</span>
                        </div>
                    </div>
                    <div class="severity-scale"><small>＜50 正常 | 50-59 轻度 | 60-69 中度 | ≥70 重度</small></div>`;
            } else if (analysis.assessmentId === 10) {
                // 社交回避与苦恼量表 - 总分 + 进度条
                const sadScore = analysis.score || 0;
                const sadMax = analysis.maxScore || 140;
                const sadPct = Math.min(Math.round(sadScore / sadMax * 100), 100);
                const sadColors = { '正常或无': '#4caf50', '轻度': '#8bc34a', '中度': '#ff9800', '重度': '#e74c3c' };
                let sadColor = '#3498db';
                const sev = analysis.severity || '';
                if (sev.includes('重度') || sev.includes('显著')) sadColor = '#e74c3c';
                else if (sev.includes('中度') || sev.includes('偏高')) sadColor = '#ff9800';
                else if (sev.includes('轻度')) sadColor = '#8bc34a';
                else if (sev.includes('正常') || sev.includes('无') || sev.includes('低')) sadColor = '#4caf50';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${sadColor};width:${sadPct}%"></div>
                        <div class="severity-info">
                            <span>总分：${sadScore}${analysis.maxScore ? '/' + analysis.maxScore : ''}</span>
                            <span style="color:${sadColor};font-weight:bold">${sev || '未知'}</span>
                        </div>
                    </div>`;
            } else if (analysis.assessmentId === 16) {
                // 亲子关系能力 - 综合评分 + 6维度
                const pcScore = analysis.score || 0;
                const pcPct = Math.min(Math.round(pcScore / 5 * 100), 100);
                const pcColors = { '亲子关系质量优秀': '#2ecc71', '亲子关系质量良好': '#8bc34a', '亲子关系质量中等': '#f39c12', '亲子关系有待提升': '#e74c3c' };
                const pcColor = pcColors[analysis.overallLevel] || '#3498db';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${pcColor};width:${pcPct}%"></div>
                        <div class="severity-info">
                            <span>综合评分：${pcScore}/5</span>
                            <span style="color:${pcColor};font-weight:bold">${analysis.overallLevel || '未知'}</span>
                        </div>
                    </div>`;
                const pcDims = analysis.dimensions || {};
                const pcDimInfo = {
                    '看见需要': { icon: '👀' }, '克制投射': { icon: '🧘' },
                    '情感回应': { icon: '💞' }, '接纳与放手': { icon: '🤲' },
                    '陪伴质量': { icon: '🎯' }, '教育自觉': { icon: '🌱' }
                };
                Object.entries(pcDims).forEach(([key, val]) => {
                    const dimPct = Math.min(Math.round((val.score || 3) / 5 * 100), 100);
                    const dimColor = val.score >= 4 ? '#2ecc71' : val.score >= 3 ? '#f39c12' : '#e74c3c';
                    const icon = pcDimInfo[key]?.icon || '📊';
                    detailHtml += `
                        <div class="dimension-bar">
                            <div class="dim-label">${icon} ${key} <span class="dim-level">(${val.level || ''})</span></div>
                            <div class="dim-bar-track">
                                <div class="dim-bar-fill" style="width:${dimPct}%;background:${dimColor}"></div>
                                <span class="dim-result">${val.score}/5</span>
                            </div>
                        </div>`;
                });
            } else if (analysis.assessmentId === 17) {
                // 婚姻经营能力 - 综合评分 + 7维度
                const mrgScore = analysis.score || 0;
                const mrgPct = Math.min(Math.round(mrgScore / 5 * 100), 100);
                const mrgColors = { '婚姻智慧优秀': '#2ecc71', '婚姻智慧良好': '#8bc34a', '婚姻智慧中等': '#f39c12', '有待提升': '#e74c3c' };
                const mrgColor = mrgColors[analysis.overallLevel] || '#3498db';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${mrgColor};width:${mrgPct}%"></div>
                        <div class="severity-info">
                            <span>综合评分：${mrgScore}/5</span>
                            <span style="color:${mrgColor};font-weight:bold">${analysis.overallLevel || '未知'}</span>
                        </div>
                    </div>`;
                const mrgDims = analysis.dimensions || {};
                const mrgDimInfo = {
                    '接纳': { icon: '🫂' }, '尊重': { icon: '🙏' },
                    '允许': { icon: '🌊' }, '支持': { icon: '🤝' },
                    '信任': { icon: '🔐' }, '经济': { icon: '💰' },
                    '亲密': { icon: '💕' }
                };
                Object.entries(mrgDims).forEach(([key, val]) => {
                    const dimPct = Math.min(Math.round((val.score || 3) / 5 * 100), 100);
                    const dimColor = val.score >= 4 ? '#2ecc71' : val.score >= 3 ? '#f39c12' : '#e74c3c';
                    const icon = mrgDimInfo[key]?.icon || '📊';
                    detailHtml += `
                        <div class="dimension-bar">
                            <div class="dim-label">${icon} ${key} <span class="dim-level">(${val.level || ''})</span></div>
                            <div class="dim-bar-track">
                                <div class="dim-bar-fill" style="width:${dimPct}%;background:${dimColor}"></div>
                                <span class="dim-result">${val.score}/5</span>
                            </div>
                        </div>`;
                });
            } else if (analysis.assessmentId === 18) {
                // 性态度和认知测评 - 综合评分 + 6维度
                const sexScore = analysis.score || 0;
                const sexPct = Math.min(Math.round(sexScore / 5 * 100), 100);
                const sexColors = { '性态度健康成熟': '#2ecc71', '性态度良好': '#8bc34a', '性态度中等': '#f39c12', '有待探索': '#e74c3c' };
                const sexColor = sexColors[analysis.overallLevel] || '#3498db';
                detailHtml += `
                    <div class="severity-display">
                        <div class="severity-indicator" style="background:${sexColor};width:${sexPct}%"></div>
                        <div class="severity-info">
                            <span>综合评分：${sexScore}/5</span>
                            <span style="color:${sexColor};font-weight:bold">${analysis.overallLevel || '未知'}</span>
                        </div>
                    </div>`;
                const sexDims = analysis.dimensions || {};
                const sexDimInfo = {
                    '性态度': { icon: '🌈' }, '身体认知': { icon: '🪞' },
                    '性自主感': { icon: '🛡️' }, '自我认同': { icon: '💫' },
                    '性焦虑': { icon: '🌊' }, '性认知素养': { icon: '📖' }
                };
                Object.entries(sexDims).forEach(([key, val]) => {
                    const dimPct = Math.min(Math.round((val.score || 3) / 5 * 100), 100);
                    const dimColor = val.score >= 4 ? '#2ecc71' : val.score >= 3 ? '#f39c12' : '#e74c3c';
                    const icon = sexDimInfo[key]?.icon || '📊';
                    detailHtml += `
                        <div class="dimension-bar">
                            <div class="dim-label">${icon} ${key} <span class="dim-level">(${val.level || ''})</span></div>
                            <div class="dim-bar-track">
                                <div class="dim-bar-fill" style="width:${dimPct}%;background:${dimColor}"></div>
                                <span class="dim-result">${val.score}/5</span>
                            </div>
                        </div>`;
                });
            }
            scoreDetails.innerHTML = detailHtml || '<p>详细数据加载中...</p>';
        }
        
        
        // 构建建议与指导
        if (recommendations) {
            let recHtml = '<ul class="rec-list">';
            if (analysis.assessmentId === 1) {
                                recHtml += '<li>MBTI测试结果可作为自我认知的参考工具，但不应用于职业决策或人际关系判断。</li>';
                recHtml += '<li>建议结合其他测评工具和多角度反馈，全面了解自己的性格特点。</li>';
            } else if (analysis.assessmentId === 2) {
                if (resultData.totalScore >= 15) {
                    recHtml += '<li class="rec-urgent"><i class="fas fa-exclamation-triangle"></i> 你的评分较高，建议尽快咨询专业心理医生。</li>';
                    recHtml += '<li class="rec-urgent"><i class="fas fa-phone"></i> 全国心理援助热线：400-161-9995</li>';
                } else if (resultData.totalScore >= 10) {
                    recHtml += '<li>你的评分提示存在一定抑郁症状，建议关注自己的心理状态。</li>';
                    recHtml += '<li>可尝试与朋友倾诉，或预约心理咨询进行进一步评估。</li>';
                } else {
                    recHtml += '<li>你的评分在正常范围内，请继续保持良好的生活习惯。</li>';
                    recHtml += '<li>定期关注心理健康，保持积极的心态面对生活。</li>';
                }
                recHtml += '<li>PHQ-9为筛查工具，不能替代专业诊断。如有疑虑请咨询专业人士。</li>';
            } else if (analysis.assessmentId === 3) {
                                if (analysis.topTypes) recHtml += `<li>最突出的兴趣维度：<strong>${analysis.topTypes}</strong></li>`;
                recHtml += '<li>建议结合个人能力、价值观和市场需求，综合规划职业发展方向。</li>';
                recHtml += '<li>可尝试与相关领域的从业者交流，获取更多职业信息。</li>';
            } else if (analysis.assessmentId === 8) {
                                
                // 优先改善维度
                if (analysis.priorityDimensions && analysis.priorityDimensions.length > 0) {
                    recHtml += '<li><strong>优先改善维度：</strong><ul>';
                    analysis.priorityDimensions.forEach(d => {
                        recHtml += `<li>${d.name}（${d.score}/5分）— ${d.recommendation || '多加练习，逐步提升'}</li>`;
                    });
                    recHtml += '</ul></li>';
                }
                
                recHtml += '<li>培养富足心态的日常练习：每天写下3件感恩的事、关注自己的成长而非与他人比较、相信资源是充足的、为别人的成功感到高兴。</li>';
                recHtml += '<li>测评结果仅供参考，用于自我觉察和成长参考，而非绝对评判。</li>';
            } else if (analysis.assessmentId === 9) {
                
                // 优先改善维度
                if (analysis.priorityDimensions && analysis.priorityDimensions.length > 0) {
                    recHtml += '<li><strong>优先改善维度：</strong><ul>';
                    analysis.priorityDimensions.forEach(d => {
                        recHtml += `<li><strong>${d.name}</strong>（${d.score}/5分）— ${d.recommendation || '多加练习，逐步提升'}</li>`;
                    });
                    recHtml += '</ul></li>';
                }

                recHtml += '<li>提升自爱力的日常练习：每天对镜子里的自己说一句温暖的话；记录三件你为自己做的好事；在犯错时对自己说"人都会犯错，没关系"；定期安排只属于自己的时间。</li>';
                recHtml += '<li>测评结果仅供参考，用于自我觉察和成长参考，而非绝对评判。</li>';
            } else if (analysis.assessmentId === 4) {
                                if (resultData.totalScore >= 70) {
                    recHtml += '<li class="rec-urgent"><i class="fas fa-exclamation-triangle"></i> 你的评分较高，建议尽快咨询专业心理医生或精神科医生。</li>';
                    recHtml += '<li class="rec-urgent"><i class="fas fa-phone"></i> 全国心理援助热线：400-161-9995</li>';
                } else if (resultData.totalScore >= 60) {
                    recHtml += '<li>你的评分提示存在中度焦虑倾向，建议寻求专业心理咨询帮助。</li>';
                    recHtml += '<li>同时可通过规律运动、冥想、深呼吸等方式缓解焦虑。</li>';
                } else if (resultData.totalScore >= 50) {
                    recHtml += '<li>你有轻度焦虑倾向，建议关注压力管理，适当放松。</li>';
                    recHtml += '<li>良好的作息和运动习惯有助于缓解焦虑。</li>';
                } else {
                    recHtml += '<li>你的焦虑水平正常，请继续保持良好的心理状态。</li>';
                }
                recHtml += '<li>SAS为自评筛查工具，不能替代专业诊断。如有疑虑请咨询专业人士。</li>';
            } else if (analysis.assessmentId === 5) {
                                if (resultData.totalScore >= 15) {
                    recHtml += '<li class="rec-urgent"><i class="fas fa-exclamation-triangle"></i> 你的评分较高，建议尽快咨询专业心理医生进行进一步评估。</li>';
                } else if (resultData.totalScore >= 10) {
                    recHtml += '<li>你的评分提示存在中度焦虑，建议寻求专业心理咨询。</li>';
                    recHtml += '<li>学习放松技巧：腹式呼吸、渐进式肌肉放松、正念冥想。</li>';
                } else if (resultData.totalScore >= 5) {
                    recHtml += '<li>你有轻度焦虑，注意调节生活节奏，减少压力源。</li>';
                } else {
                    recHtml += '<li>你的焦虑水平正常，请继续保持健康的生活方式。</li>';
                }
                recHtml += '<li>GAD-7为筛查工具，不能替代专业诊断。</li>';
            } else if (analysis.assessmentId === 6) {
                recHtml += '<li>大五人格模型从五个维度描述你的性格特征。每种性格都有其独特的优势和挑战，没有"最好"的性格。</li>';
                recHtml += '<li>了解自己的性格特点有助于选择合适的环境和职业方向。</li>';
                recHtml += '<li>性格不是固定不变的——随着年龄和经历，性格也会有所发展。</li>';
                recHtml += '<li>建议结合生活和工作中的实际反馈，全面理解自己的性格特点。</li>';
            } else if (analysis.assessmentId === 7) {
                                recHtml += '<li>提升情商的核心练习：每天花10分钟觉察自己的情绪变化，练习命名自己的情绪状态。</li>';
                recHtml += '<li>多倾听他人——真正理解他人需要从放下自己的判断开始。</li>';
                recHtml += '<li>情绪调节方面：当情绪强烈时，先暂停6秒（深呼吸），再做出回应。</li>';
            } else if (analysis.assessmentId === 11) {
                                if (analysis.score < 75) {
                    recHtml += '<li>你的信任倾向较低。可以尝试从小处开始：在安全的环境中学习给予信任，观察信任带来的积极体验。</li>';
                } else if (analysis.score < 100) {
                    recHtml += '<li>你的信任水平适中。在保持合理警惕的同时，继续培养对值得信任之人的开放态度。</li>';
                } else {
                    recHtml += '<li>你的信任水平较高，这是建立良好人际关系的重要优势。同时注意保持理性判断。</li>';
                }
                recHtml += '<li>信任是一种需要智慧的能力——既不能盲目，也不应封闭。</li>';
            } else if (analysis.assessmentId === 12) {
                                recHtml += '<li>提升共情力的方法：多练习主动倾听，不急于评判先理解；阅读文学作品有助于培养对他人经历的感受力。</li>';
                recHtml += '<li>注意共情的平衡——过度共情可能导致情感耗竭，学会设立情感边界同样重要。</li>';
            } else if (analysis.assessmentId === 13) {
                                if (analysis.priorityDimensions && analysis.priorityDimensions.length > 0) {
                    recHtml += '<li><strong>优先提升维度：</strong><ul>';
                    analysis.priorityDimensions.forEach(d => {
                        recHtml += `<li>${d.name}（${d.score}/5分）— ${d.recommendation || '多加练习，逐步提升'}</li>`;
                    });
                    recHtml += '</ul></li>';
                }
                recHtml += '<li>社交技能的核心不是技巧，而是真诚的好奇心——对他人真正的兴趣是最有力的社交工具。</li>';
            } else if (analysis.assessmentId === 14) {
                                if (analysis.score >= 53) {
                    recHtml += '<li class="rec-urgent"><i class="fas fa-exclamation-triangle"></i> 你的社交焦虑水平较高，建议寻求专业心理咨询帮助。</li>';
                    recHtml += '<li>认知行为疗法(CBT)对社交焦虑有良好的治疗效果。</li>';
                } else {
                    recHtml += '<li>你的社交焦虑处于可控范围。可以从小的社交挑战开始，逐步扩大舒适区。</li>';
                }
                recHtml += '<li>练习：在安全的社交场合中主动发起一次对话，完成后给予自己肯定。</li>';
            } else if (analysis.assessmentId === 15) {
                                if (resultData.totalScore >= 70) {
                    recHtml += '<li class="rec-urgent"><i class="fas fa-exclamation-triangle"></i> 你的评分较高，请立即寻求专业心理医生的帮助。</li>';
                    recHtml += '<li class="rec-urgent"><i class="fas fa-phone"></i> 全国24小时心理援助热线：010-82951332</li>';
                } else if (resultData.totalScore >= 60) {
                    recHtml += '<li>你的评分提示存在中度抑郁倾向，建议尽快寻求专业心理咨询。</li>';
                    recHtml += '<li>同时注意保持规律作息，适当运动有助于改善情绪。</li>';
                } else if (resultData.totalScore >= 50) {
                    recHtml += '<li>你有轻度抑郁倾向，建议多与朋友家人交流，关注自己的情绪变化。</li>';
                } else {
                    recHtml += '<li>你的抑郁评分正常，请继续保持良好的心理状态。</li>';
                }
                recHtml += '<li>SDS为自评筛查工具，不能替代专业诊断。PHQ-9可作为快速复测参考。</li>';
            } else if (analysis.assessmentId === 16) {
                                if (analysis.priorityDimensions && analysis.priorityDimensions.length > 0) {
                    recHtml += '<li><strong>优先改善维度：</strong><ul>';
                    analysis.priorityDimensions.forEach(d => {
                        recHtml += `<li><strong>${d.name}</strong>（${d.score}/5分）— ${d.recommendation || '多加练习，逐步提升'}</li>`;
                    });
                    recHtml += '</ul></li>';
                }
                recHtml += '<li>觉察本身就是改变的开始。每一次反思，都是一次成长的契机。</li>';
                recHtml += '<li>孩子不是你的作品——他是独立的人，带着自己的使命来到这个世界。</li>';
            } else if (analysis.assessmentId === 17) {
                                if (analysis.priorityDimensions && analysis.priorityDimensions.length > 0) {
                    recHtml += '<li><strong>优先改善维度：</strong><ul>';
                    analysis.priorityDimensions.forEach(d => {
                        recHtml += `<li><strong>${d.name}</strong>（${d.score}/5分）— ${d.recommendation || '多加练习，逐步提升'}</li>`;
                    });
                    recHtml += '</ul></li>';
                }
                recHtml += '<li>婚姻不是1+1=2，而是0.5+0.5=1。各自放下一些自我，才能成就完整的我们。</li>';
                recHtml += '<li>爱的功课是一辈子的修行——每一次觉察和调整，都是在为关系注入新的生命力。</li>';
            } else if (analysis.assessmentId === 18) {
                recHtml += `<li>你的性态度和认知综合评分为 <strong>${analysis.score || 0}/5</strong>，属于<strong>${analysis.overallLevel || '未知'}</strong>水平。性与爱一样，都是需要被理解和接纳的生命面向。</li>`;
                if (analysis.priorityDimensions && analysis.priorityDimensions.length > 0) {
                    recHtml += '<li><strong>优先改善维度：</strong><ul>';
                    analysis.priorityDimensions.forEach(d => {
                        recHtml += `<li><strong>${d.name}</strong>（${d.score}/5分）— ${d.recommendation || '多加练习，逐步提升'}</li>`;
                    });
                    recHtml += '</ul></li>';
                }
                recHtml += '<li>性心理健康是整体心理健康的重要组成部分。了解自己、接纳自己，是一切健康关系的起点。</li>';
                recHtml += '<li>如果你在这些话题上感到困扰，可以寻求专业的性心理咨询帮助。你并不孤单。</li>';
            } else {
                recHtml += '<li>完成测评是了解自己的第一步，建议定期进行自我评估。</li>';
                recHtml += '<li>测评结果仅供参考，如有需要请咨询专业人士。</li>';
            }
            recHtml += '</ul>';
            recommendations.innerHTML = recHtml;
        }
        
        // 显示结果页面
        console.log('显示结果页面...');
        this.showSection('resultPage');
        
        // 重新加载用户测评历史
        this.loadUserResults();
    }

    // 加载用户测评历史 - 数据库版本
    async loadUserResults() {
        if (!this.currentUser) return;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/users/me/results`, {
                credentials: 'include'
            });
            
            const data = await response.json();
            if (data.success) {
                this.renderUserResults(data.data);
            }
        } catch (error) {
            console.error('加载测评历史失败:', error);
        }
    }

    // 渲染用户测评历史（增强版）
    renderUserResults(results) {
        const container = document.getElementById('userResults');
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = '<div class="empty-history">暂无测评记录</div>';
            return;
        }
        
        container.innerHTML = results.slice(0, 10).map(result => {
            const analysis = result.analysis || {};
            let badge = '';
            if (analysis.personalityType) badge = `<span class="badge badge-mbti">${analysis.personalityType}</span>`;
            else if (analysis.severity) {
                if (analysis.assessmentId === 8) {
                    const sevClass = analysis.severity.includes('显著') && analysis.severity.includes('匮乏') ? 'badge-severe' : analysis.severity.includes('显著') ? 'badge-holland' : analysis.severity.includes('倾向') ? 'badge-moderate' : 'badge-mild';
                    badge = `<span class="badge ${sevClass}">${analysis.severity}</span>`;
                } else if (analysis.assessmentId === 9) {
                    const sevClass = analysis.severity.includes('明显不足') ? 'badge-severe' : analysis.severity.includes('有待提升') ? 'badge-moderate' : 'badge-mild';
                    badge = `<span class="badge ${sevClass}">${analysis.severity}</span>`;
                } else {
                    const sevClass = analysis.severity.includes('重度') ? 'badge-severe' : analysis.severity.includes('中度') ? 'badge-moderate' : 'badge-mild';
                    badge = `<span class="badge ${sevClass}">${analysis.severity}</span>`;
                }
            }
            else if (analysis.hollandCode) badge = `<span class="badge badge-holland">${analysis.hollandCode}</span>`;
            
            return `
            <div class="result-item">
                <div class="result-header">
                    <h4>${result.assessmentName}</h4>
                    <span class="result-date">${result.startTime ? new Date(result.startTime).toLocaleDateString('zh-CN') : ''}</span>
                </div>
                <div class="result-body">
                    <p>${result.resultSummary ? result.resultSummary.slice(0, 80) + (result.resultSummary.length > 80 ? '...' : '') : '测评完成'}</p>
                    <div class="result-meta">
                        <span class="meta-item">
                            <i class="fas fa-star"></i>
                            得分: ${result.totalScore || '--'}
                        </span>
                        ${badge ? `<span class="meta-item">${badge}</span>` : ''}
                        <span class="meta-item">
                            <i class="fas fa-clock"></i>
                            ${result.startTime && result.endTime ? 
                                Math.round((new Date(result.endTime) - new Date(result.startTime)) / 1000 / 60) + '分钟' : 
                                ''}
                        </span>
                    </div>
                </div>
            </div>`;
        }).join('');
        
        if (results.length > 10) {
            container.innerHTML += '<div class="history-more">' + (results.length - 10) + ' 条更早记录...</div>';
        }
    }

    // =========================================================
    // 测评记录 - 标签切换
    // =========================================================
    switchRecordsTab(tab) {
        console.log('切换记录标签:', tab);
        
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            // 根据tab内容激活对应按钮
            if ((tab === 'my' && btn.textContent.includes('我的')) ||
                (tab === 'all' && btn.textContent.includes('所有'))) {
                btn.classList.add('active');
            }
        });
        
        // 显示/隐藏列表
        const myList = document.getElementById('myRecordsList');
        const allList = document.getElementById('allRecordsList');
        const filters = document.getElementById('recordsFilters');
        
        if (tab === 'my') {
            myList.style.display = 'block';
            if (allList) allList.style.display = 'none';
            if (filters) filters.style.display = 'none';
            this.loadMyRecords();
        } else if (tab === 'all') {
            myList.style.display = 'none';
            if (allList) allList.style.display = 'block';
            if (filters) filters.style.display = 'flex';
            this.loadAllRecords();
        }
    }

    // 加载我的记录（详细列表版）
    async loadMyRecords() {
        const list = document.getElementById('myRecordsList');
        if (!list) return;
        
        list.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>加载记录...</p></div>';
        
        if (!this.currentUser) {
            // 可能在等认证完成，轮询等待
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 200));
                if (this.currentUser) break;
            }
        }
        if (!this.currentUser) {
            list.innerHTML = '<div class="empty-history">请先登录</div>';
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/users/me/results`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                this.renderUserRecords(data.data, list);
            } else {
                list.innerHTML = '<div class="empty-history">加载失败</div>';
            }
        } catch (error) {
            console.error('加载记录失败:', error);
            list.innerHTML = '<div class="empty-history">网络错误</div>';
        }
    }

    // 加载所有记录（管理员专用）
    async loadAllRecords() {
        const list = document.getElementById('allRecordsList');
        if (!list) return;
        
        list.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>加载所有记录...</p></div>';
        
        if (!this.currentUser) {
            // 可能在等认证完成，轮询等待
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 200));
                if (this.currentUser) break;
            }
        }
        if (!this.currentUser) {
            list.innerHTML = '<div class="empty-history">请先登录</div>';
            return;
        }
        
        try {
            // 收集筛选参数
            const userId = document.getElementById('filterUserId')?.value || '';
            const assessmentId = document.getElementById('filterAssessmentId')?.value || '';
            const startDate = document.getElementById('filterStartDate')?.value || '';
            const endDate = document.getElementById('filterEndDate')?.value || '';
            
            let url = `${this.apiBaseUrl}/admin/records?page=1&limit=50`;
            if (userId) url += `&userId=${userId}`;
            if (assessmentId) url += `&assessmentId=${assessmentId}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;
            
            const response = await fetch(url, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                const records = data.data || [];
                this.renderUserRecords(records, list, true);
                
                // 同时更新用户和测评筛选下拉框（首次加载）
                if (records.length > 0 && !this._filtersLoaded) {
                    this.populateFilters(records);
                    this._filtersLoaded = true;
                }
            } else {
                list.innerHTML = '<div class="empty-history">加载失败</div>';
            }
        } catch (error) {
            console.error('加载所有记录失败:', error);
            list.innerHTML = '<div class="empty-history">网络错误</div>';
        }
    }

    // 填充管理员筛选下拉框
    populateFilters(records) {
        if (!records || records.length === 0) return;
        
        // 用户下拉
        const userSelect = document.getElementById('filterUserId');
        if (userSelect) {
            const users = [...new Map(records.map(r => [r.userId, { id: r.userId, name: r.username }])).values()];
            users.forEach(u => {
                if (u.id) {
                    const opt = document.createElement('option');
                    opt.value = u.id;
                    opt.textContent = u.name || `用户${u.id}`;
                    userSelect.appendChild(opt);
                }
            });
        }
        
        // 测评类型下拉
        const assessSelect = document.getElementById('filterAssessmentId');
        if (assessSelect) {
            const assessments = [...new Map(records.map(r => [r.assessmentId, { id: r.assessmentId, name: r.assessmentName }])).values()];
            assessments.forEach(a => {
                if (a.id) {
                    const opt = document.createElement('option');
                    opt.value = a.id;
                    opt.textContent = a.name;
                    assessSelect.appendChild(opt);
                }
            });
        }
    }

    // 渲染测评记录列表
    renderUserRecords(records, container, showUsername = false) {
        if (!container) return;
        
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-history">暂无测评记录</div>';
            return;
        }
        
        container.innerHTML = records.map(result => {
            const analysis = result.analysis || {};
            let badge = '';
            let typeInfo = '';
            
            if (analysis.personalityType) {
                badge = `<span class="badge badge-mbti">${analysis.personalityType}</span>`;
                typeInfo = 'MBTI性格';
            } else if (analysis.assessmentId === 8) {
                const sevClass = analysis.severity && analysis.severity.includes('显著') && analysis.severity.includes('匮乏') ? 'badge-severe' : 
                    analysis.severity && analysis.severity.includes('显著') ? 'badge-holland' : 
                    analysis.severity && analysis.severity.includes('倾向') ? 'badge-moderate' : 'badge-mild';
                badge = `<span class="badge ${sevClass}">${analysis.severity || ''}</span>`;
                typeInfo = '富足心态';
            } else if (analysis.assessmentId === 9) {
                const sevClass = analysis.severity && (analysis.severity.includes('明显不足')) ? 'badge-severe' :
                    analysis.severity && analysis.severity.includes('有待提升') ? 'badge-moderate' :
                    analysis.severity && analysis.severity.includes('中等') ? 'badge-mild' : 'badge-holland';
                badge = `<span class="badge ${sevClass}">${analysis.severity || ''}</span>`;
                typeInfo = '自爱能力';
            } else if (analysis.severity) {
                const sevClass = analysis.severity.includes('重度') ? 'badge-severe' : 
                    analysis.severity.includes('中度') ? 'badge-moderate' : 'badge-mild';
                badge = `<span class="badge ${sevClass}">${analysis.severity}</span>`;
                typeInfo = analysis.analysisType || '评估';
            } else if (analysis.hollandCode) {
                badge = `<span class="badge badge-holland">${analysis.hollandCode}</span>`;
                typeInfo = '职业兴趣';
            } else {
                typeInfo = '测评';
            }
            
            const dateStr = result.startTime ? new Date(result.startTime).toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            }) : '--';
            
            const scoreDisplay = result.totalScore != null ? 
                `<span class="meta-item"><i class="fas fa-star"></i> 得分: ${result.totalScore}</span>` : '';
            
            const userInfo = showUsername && result.username ? 
                `<span class="meta-item"><i class="fas fa-user"></i> ${result.username}</span>` : '';
            
            return `
                <div class="record-item" data-record-id="${result.id}">
                    <div class="record-item-header">
                        <div class="record-item-title">
                            <h4>${result.assessmentName}</h4>
                            <span class="record-type-badge">${typeInfo}</span>
                        </div>
                        <span class="record-date">${dateStr}</span>
                    </div>
                    <div class="record-item-body">
                        <p>${result.resultSummary ? result.resultSummary.slice(0, 100) + (result.resultSummary.length > 100 ? '...' : '') : '测评完成'}</p>
                        <div class="result-meta">
                            ${scoreDisplay}
                            ${userInfo}
                            ${badge ? `<span class="meta-item">${badge}</span>` : ''}
                        </div>
                    </div>
                    <div class="record-item-footer">
                        <button class="btn btn-sm btn-outline view-record-btn" data-record-id="${result.id}">
                            <i class="fas fa-eye"></i> 查看详情
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // 绑定查看详情事件
        container.querySelectorAll('.view-record-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = parseInt(e.currentTarget.getAttribute('data-record-id'));
                this.viewRecord(recordId);
            });
        });
    }

    // 查看单条记录详情
    async viewRecord(recordId) {
        console.log('查看记录详情:', recordId);
        
        // 使用统一认证 (cookie自动发送)
        try {
            // 从 /users/me/results 中找到这条记录
            const response = await fetch(`${this.apiBaseUrl}/users/me/results`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                const record = data.data.find(r => r.id === recordId);
                if (record) {
                    // 重建结果数据，用于 resultPage 显示
                    const resultData = {
                        id: record.id,
                        assessmentId: record.assessmentId,
                        assessmentName: record.assessmentName,
                        startTime: record.startTime,
                        endTime: record.endTime,
                        totalScore: record.totalScore,
                        summary: record.resultSummary || record.summary,
                        analysis: record.analysis || {}
                    };
                    
                    // 显示详细结果
                    this.showRecordDetail(resultData);
                } else {
                    this.showMessage('未找到该记录', 'error');
                }
            } else {
                this.showMessage('加载记录失败', 'error');
            }
        } catch (error) {
            console.error('查看记录详情失败:', error);
            this.showMessage('网络错误', 'error');
        }
    }

    // 显示记录详情（在resultPage中）
    showRecordDetail(resultData) {
        console.log('显示记录详情（复用showAssessmentResult）:', resultData);
        this.currentAnalysis = resultData.analysis || {};
        if (resultData.assessmentName) {
            this.currentAssessment = this.currentAssessment || {};
            this.currentAssessment.name = resultData.assessmentName;
            this.currentAssessment.id = resultData.assessmentId;
        }
        this.showAssessmentResult(resultData);
    }

    // =========================================================
    // 下载PDF报告
    async downloadPDF() {
        const btn = document.getElementById('downloadPdf');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...'; }
        try {
            const resultContent = document.querySelector('#resultPage .result-content');
            if (!resultContent) { this.showMessage('无结果内容', 'error'); return; }
            const name = this.currentAssessment ? this.currentAssessment.name : '心理测评';
            const username = (this.currentUser && this.currentUser.username) ? this.currentUser.username : '未登录';
            const now = new Date();
            const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            await XD.multiPDF(resultContent, { name: name + '_' + username + '_' + dateStr });
            this.showMessage('PDF下载成功', 'success');
        } catch (error) {
            console.error('PDF生成失败:', error);
            this.showMessage('PDF生成失败，请重试', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> 下载PDF'; }
        }
    }

    // 显示消息
    showMessage(message, type = 'info') {
        console.log(`显示消息 [${type}]:`, message);
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // 添加到页面
        document.body.appendChild(messageEl);
        
        // 显示动画
        setTimeout(() => {
            messageEl.classList.add('show');
        }, 10);
        
        // 3秒后移除
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(messageEl);
            }, 300);
        }, 3000);
    }
}

// 添加消息样式
const style = document.createElement('style');
style.textContent = '.message {' +
'    position: fixed;' +
'    top: 20px;' +
'    right: 20px;' +
'    padding: 1rem 1.5rem;' +
'    border-radius: 8px;' +
'    background: white;' +
'    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);' +
'    display: flex;' +
'    align-items: center;' +
'    gap: 0.75rem;' +
'    z-index: 3000;' +
'    transform: translateX(100%);' +
'    opacity: 0;' +
'    transition: all 0.3s ease;' +
'}' +
'' +
'.message.show {' +
'    transform: translateX(0);' +
'    opacity: 1;' +
'}' +
'' +
'.message-success {' +
'    border-left: 4px solid #4cc9f0;' +
'    color: #155724;' +
'}' +
'' +
'.message-error {' +
'    border-left: 4px solid #f94144;' +
'    color: #721c24;' +
'}' +
'' +
'.message-info {' +
'    border-left: 4px solid #2196f3;' +
'    color: #004085;' +
'}';

document.head.appendChild(style);

// 全局实例（同时挂到 window 供内联 onchange 调用）
window.psychApp = new PsychologicalAssessmentApp();
