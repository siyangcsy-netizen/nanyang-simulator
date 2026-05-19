// 下南洋模拟器 - 游戏核心逻辑
const game = {
  state: {
    gender: null,
    path: null,
    health: 100,
    money: 0,
    letters: 0,
    homesick: 0,
    currentScene: null,
    choices: [],
    startTime: null,
    muted: false
  },

  // 切换屏幕
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active');
      screen.classList.add('fade-in');
      window.scrollTo(0, 0);
    }
  },

  // 开始游戏
  start() {
    this.showScreen('gender-screen');
  },

  // 历史背景弹窗
  showHistory() {
    document.getElementById('history-modal').classList.add('active');
  },

  closeHistory() {
    document.getElementById('history-modal').classList.remove('active');
  },

  // 选择性别
  selectGender(gender) {
    this.state.gender = gender;
    this.state.startTime = Date.now();
    if (gender === 'male') {
      this.showScreen('male-ch1-screen');
    } else {
      this.showScreen('female-ch1-screen');
    }
  },

  // 选择路径
  selectPath(gender, path) {
    this.state.path = path;
    this.state.health = 100;
    this.state.money = 0;
    this.state.letters = 0;
    this.state.homesick = 0;
    this.state.choices = [];

    let sceneId;
    if (gender === 'male') {
      // 男性线：根据选择的路径进入对应的第一章
      const pathMap = { famine: 'male_ch1_famine', war: 'male_ch1_war', feud: 'male_ch1_feud' };
      sceneId = pathMap[path] || 'ch2_pigship';
    } else {
      // 女性线：根据选择的路径进入对应的第一章
      const pathMap = { majie: 'female_ch1_majie', hongtoujin: 'female_ch1_hongtoujin', liulang: 'female_ch1_liulang' };
      sceneId = pathMap[path];
    }
    this.loadScene(sceneId);
  },

  // 加载场景
  loadScene(sceneId) {
    this.state.currentScene = sceneId;
    const genderData = storyData[this.state.gender];
    const scene = genderData[sceneId];

    if (!scene) {
      // 检查是否是结局
      const ending = storyData.endings[sceneId];
      if (ending) {
        this.showEnding(sceneId, ending);
        return;
      }
      console.error('Scene not found:', sceneId);
      return;
    }

    this.showScreen('game-screen');

    // 更新年份和章节
    document.getElementById('year-display').textContent = scene.year || '';
    document.getElementById('chapter-display').textContent = (scene.chapter || '') + ' · ' + (scene.title || '');

    // 更新故事文本
    const storyText = document.getElementById('story-text');
    const paragraphs = scene.text.split('\n\n').filter(p => p.trim());
    let html = '';
    paragraphs.forEach(p => {
      if (p.startsWith('"') || p.startsWith('"')) {
        html += `<p class="quote">${p}</p>`;
      } else {
        html += `<p>${p}</p>`;
      }
    });

    // 如果有侨批，插入侨批内容
    if (scene.letter) {
      html += `<div class="letter-container" style="background:#FDF8F0;border:1px solid #D4C5A9;border-radius:8px;padding:20px;margin:16px 0;">
        <p style="text-align:center;font-weight:600;color:#8B7355;margin-bottom:12px;">✉️ ${scene.letter.title}</p>
        <pre style="white-space:pre-wrap;font-family:'Noto Serif SC',serif;font-size:0.95rem;line-height:2;color:#3D2914;">${scene.letter.content}</pre>
        <p style="font-size:0.85rem;color:#6B5344;margin-top:12px;font-style:italic;">${scene.letter.note}</p>
      </div>`;
    }

    storyText.innerHTML = html;

    // 更新史料胶囊
    const capsule = document.getElementById('history-capsule');
    const capsuleContent = document.getElementById('capsule-content');
    if (scene.history) {
      capsule.style.display = 'block';
      capsule.classList.remove('expanded');
      capsuleContent.textContent = scene.history;
    } else {
      capsule.style.display = 'none';
    }

    // 更新生活切片
    const slice = document.getElementById('life-slice');
    const sliceContent = document.getElementById('slice-content');
    if (scene.lifeSlice) {
      slice.style.display = 'block';
      slice.classList.remove('expanded');
      sliceContent.textContent = scene.lifeSlice;
    } else {
      slice.style.display = 'none';
    }

    // 渲染选择按钮
    const choicesContainer = document.getElementById('choices-container');
    choicesContainer.innerHTML = '';
    if (scene.choices) {
      scene.choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn slide-up';
        btn.style.animationDelay = (index * 0.1) + 's';

        let effectText = '';
        const e = choice.effects || {};
        if (e.health) effectText += (e.health > 0 ? '❤️+' : '❤️') + e.health + ' ';
        if (e.money) effectText += (e.money > 0 ? '💰+' : '💰') + e.money + ' ';
        if (e.letters) effectText += '📜+' + e.letters + ' ';
        if (e.homesick) effectText += '🏠+' + e.homesick;

        btn.innerHTML = `${choice.text}${effectText ? '<span class="choice-effect">' + effectText.trim() + '</span>' : ''}`;
        btn.onclick = () => this.makeChoice(choice);
        choicesContainer.appendChild(btn);
      });
    }

    // 更新状态栏
    this.updateStatusBar();
  },

  // 做出选择
  makeChoice(choice) {
    this.state.choices.push(choice.text);

    // 应用效果
    const effects = choice.effects || {};
    if (effects.health) this.state.health = Math.max(0, Math.min(100, this.state.health + effects.health));
    if (effects.money) this.state.money = Math.round((this.state.money + effects.money) * 10) / 10;
    if (effects.letters) this.state.letters += effects.letters;
    if (effects.homesick) this.state.homesick = Math.min(100, this.state.homesick + effects.homesick);

    // 检查是否死亡
    if (this.state.health <= 0) {
      const ending = storyData.endings[choice.next];
      if (ending) {
        this.showEnding(choice.next, ending);
        return;
      }
    }

    // 加载下一个场景
    this.loadScene(choice.next);
  },

  // 更新状态栏
  updateStatusBar() {
    const healthBar = document.getElementById('health-bar');
    const healthValue = document.getElementById('health-value');
    const moneyValue = document.getElementById('money-value');
    const lettersValue = document.getElementById('letters-value');
    const homesickBar = document.getElementById('homesick-bar');

    healthValue.textContent = Math.max(0, this.state.health);
    healthBar.style.width = Math.max(0, this.state.health) + '%';
    if (this.state.health > 60) healthBar.style.background = '#4CAF50';
    else if (this.state.health > 30) healthBar.style.background = '#FF9800';
    else healthBar.style.background = '#F44336';

    moneyValue.textContent = this.state.money;
    lettersValue.textContent = this.state.letters;
    homesickBar.style.width = Math.min(100, this.state.homesick) + '%';
  },

  // 显示结局
  showEnding(endingId, ending) {
    this.showScreen('ending-screen');

    document.getElementById('ending-title').textContent = ending.title;
    document.getElementById('ending-summary').textContent = ending.summary;
    document.getElementById('ending-story').innerHTML = `<p>${ending.text}</p>`;

    // 生成人生报告
    const genderName = this.state.gender === 'male' ? '阿福' : '阿月';
    const pathNames = {
      male: { famine: '闽南大旱', war: '躲兵灾', clan: '避宗族仇杀' },
      female: { majie: '妈姐', hongtoujin: '红头巾', liulang: '琉琅女' }
    };
    const pathName = pathNames[this.state.gender]?.[this.state.path] || '';

    document.getElementById('report-identity').textContent = `${genderName}（${pathName}）`;
    document.getElementById('report-years').textContent = ending.years || '未知';
    document.getElementById('report-letters').textContent = this.state.letters + '封';
    document.getElementById('report-ending').textContent = ending.title;

    // 保存已解锁的结局
    this.saveUnlockedEnding(endingId);
  },

  // 保存已解锁结局
  saveUnlockedEnding(endingId) {
    let unlocked = JSON.parse(localStorage.getItem('nanyang_unlocked') || '[]');
    if (!unlocked.includes(endingId)) {
      unlocked.push(endingId);
      localStorage.setItem('nanyang_unlocked', JSON.stringify(unlocked));
    }
  },

  // 切换史料胶囊
  toggleHistoryCapsule() {
    document.getElementById('history-capsule').classList.toggle('expanded');
  },

  // 切换生活切片
  toggleLifeSlice() {
    document.getElementById('life-slice').classList.toggle('expanded');
  },

  // 音效控制
  toggleMute() {
    this.state.muted = !this.state.muted;
    document.getElementById('audio-icon').textContent = this.state.muted ? '🔇' : '🔊';
  },

  // 分享功能
  share(platform) {
    const text = `"1928-1950，我走过千万华侨走过的路。\n一封侨批跨山海，半生血汗念故乡。\n我的南洋一生，是历史，也是家国。"\n\n#下南洋模拟器 #华侨历史 #侨批`;
    const url = window.location.href;

    if (platform === 'copy') {
      navigator.clipboard.writeText(text + '\n' + url).then(() => {
        alert('已复制到剪贴板，快去分享吧！');
      }).catch(() => {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text + '\n' + url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('已复制到剪贴板！');
      });
    } else if (platform === 'weibo') {
      window.open(`https://service.weibo.com/share/share.php?title=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else {
      alert('请截图分享给朋友！');
    }
  },

  // 重新开始
  restart() {
    this.state = {
      gender: null, path: null, health: 100, money: 0,
      letters: 0, homesick: 0, currentScene: null,
      choices: [], startTime: null, muted: this.state.muted
    };
    this.showScreen('intro-screen');
  },

  // 查看档案馆
  viewArchive() {
    const unlocked = JSON.parse(localStorage.getItem('nanyang_unlocked') || '[]');
    const grid = document.getElementById('archive-grid');
    grid.innerHTML = '';

    const allEndings = storyData.endings;
    Object.keys(allEndings).forEach(id => {
      const ending = allEndings[id];
      const isUnlocked = unlocked.includes(id);
      const item = document.createElement('div');
      item.className = 'archive-item' + (isUnlocked ? '' : ' locked');
      item.innerHTML = `
        <h4>${isUnlocked ? ending.title : '???'}</h4>
        <p>${isUnlocked ? ending.summary : '未解锁 — 通关对应路线后可查看'}</p>
        ${isUnlocked ? '<p style="margin-top:8px;font-size:0.85rem;">' + ending.text.substring(0, 60) + '...</p>' : ''}
      `;
      grid.appendChild(item);
    });

    this.showScreen('archive-screen');
  },

  // 返回主菜单
  backToMenu() {
    if (confirm('确定要返回主菜单吗？当前游戏进度将丢失。')) {
      // 重置游戏状态
      this.state.gender = null;
      this.state.path = null;
      this.state.health = 100;
      this.state.money = 0;
      this.state.letters = 0;
      this.state.homesick = 0;
      this.state.currentScene = null;
      this.state.choices = [];
      this.state.startTime = null;
      
      // 更新状态栏显示
      this.updateStatusBar();
      
      // 返回主菜单
      this.showScreen('intro-screen');
    }
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  // 点击弹窗外部关闭
  document.getElementById('history-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      game.closeHistory();
    }
  });
});// 下南洋模拟器 - 游戏核心逻辑
const game = {
  state: {
    gender: null,
    path: null,
    health: 100,
    money: 0,
    letters: 0,
    homesick: 0,
    currentScene: null,
    choices: [],
    startTime: null,
    muted: false
  },

  // 切换屏幕
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active');
      screen.classList.add('fade-in');
      window.scrollTo(0, 0);
    }
  },

  // 开始游戏
  start() {
    this.showScreen('gender-screen');
  },

  // 历史背景弹窗
  showHistory() {
    document.getElementById('history-modal').classList.add('active');
  },

  closeHistory() {
    document.getElementById('history-modal').classList.remove('active');
  },

  // 选择性别
  selectGender(gender) {
    this.state.gender = gender;
    this.state.startTime = Date.now();
    if (gender === 'male') {
      this.showScreen('male-ch1-screen');
    } else {
      this.showScreen('female-ch1-screen');
    }
  },

  // 选择路径
  selectPath(gender, path) {
    this.state.path = path;
    this.state.health = 100;
    this.state.money = 0;
    this.state.letters = 0;
    this.state.homesick = 0;
    this.state.choices = [];

    let sceneId;
    if (gender === 'male') {
      sceneId = 'ch2_pigship';
    } else {
      const pathMap = { majie: 'female_ch2_majie', hongtoujin: 'female_ch2_hongtoujin', liulang: 'female_ch2_liulang' };
      sceneId = pathMap[path];
    }
    this.loadScene(sceneId);
  },

  // 加载场景
  loadScene(sceneId) {
    this.state.currentScene = sceneId;
    const genderData = storyData[this.state.gender];
    const scene = genderData[sceneId];

    if (!scene) {
      // 检查是否是结局
      const ending = storyData.endings[sceneId];
      if (ending) {
        this.showEnding(sceneId, ending);
        return;
      }
      console.error('Scene not found:', sceneId);
      return;
    }

    this.showScreen('game-screen');

    // 更新年份和章节
    document.getElementById('year-display').textContent = scene.year || '';
    document.getElementById('chapter-display').textContent = (scene.chapter || '') + ' · ' + (scene.title || '');

    // 更新故事文本
    const storyText = document.getElementById('story-text');
    const paragraphs = scene.text.split('\n\n').filter(p => p.trim());
    let html = '';
    paragraphs.forEach(p => {
      if (p.startsWith('"') || p.startsWith('"')) {
        html += `<p class="quote">${p}</p>`;
      } else {
        html += `<p>${p}</p>`;
      }
    });

    // 如果有侨批，插入侨批内容
    if (scene.letter) {
      html += `<div class="letter-container" style="background:#FDF8F0;border:1px solid #D4C5A9;border-radius:8px;padding:20px;margin:16px 0;">
        <p style="text-align:center;font-weight:600;color:#8B7355;margin-bottom:12px;">✉️ ${scene.letter.title}</p>
        <pre style="white-space:pre-wrap;font-family:'Noto Serif SC',serif;font-size:0.95rem;line-height:2;color:#3D2914;">${scene.letter.content}</pre>
        <p style="font-size:0.85rem;color:#6B5344;margin-top:12px;font-style:italic;">${scene.letter.note}</p>
      </div>`;
    }

    storyText.innerHTML = html;

    // 更新史料胶囊
    const capsule = document.getElementById('history-capsule');
    const capsuleContent = document.getElementById('capsule-content');
    if (scene.history) {
      capsule.style.display = 'block';
      capsule.classList.remove('expanded');
      capsuleContent.textContent = scene.history;
    } else {
      capsule.style.display = 'none';
    }

    // 更新生活切片
    const slice = document.getElementById('life-slice');
    const sliceContent = document.getElementById('slice-content');
    if (scene.lifeSlice) {
      slice.style.display = 'block';
      slice.classList.remove('expanded');
      sliceContent.textContent = scene.lifeSlice;
    } else {
      slice.style.display = 'none';
    }

    // 渲染选择按钮
    const choicesContainer = document.getElementById('choices-container');
    choicesContainer.innerHTML = '';
    if (scene.choices) {
      scene.choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn slide-up';
        btn.style.animationDelay = (index * 0.1) + 's';

        let effectText = '';
        const e = choice.effects || {};
        if (e.health) effectText += (e.health > 0 ? '❤️+' : '❤️') + e.health + ' ';
        if (e.money) effectText += (e.money > 0 ? '💰+' : '💰') + e.money + ' ';
        if (e.letters) effectText += '📜+' + e.letters + ' ';
        if (e.homesick) effectText += '🏠+' + e.homesick;

        btn.innerHTML = `${choice.text}${effectText ? '<span class="choice-effect">' + effectText.trim() + '</span>' : ''}`;
        btn.onclick = () => this.makeChoice(choice);
        choicesContainer.appendChild(btn);
      });
    }

    // 更新状态栏
    this.updateStatusBar();
  },

  // 做出选择
  makeChoice(choice) {
    this.state.choices.push(choice.text);

    // 应用效果
    const effects = choice.effects || {};
    if (effects.health) this.state.health = Math.max(0, Math.min(100, this.state.health + effects.health));
    if (effects.money) this.state.money = Math.round((this.state.money + effects.money) * 10) / 10;
    if (effects.letters) this.state.letters += effects.letters;
    if (effects.homesick) this.state.homesick = Math.min(100, this.state.homesick + effects.homesick);

    // 检查是否死亡
    if (this.state.health <= 0) {
      const ending = storyData.endings[choice.next];
      if (ending) {
        this.showEnding(choice.next, ending);
        return;
      }
    }

    // 加载下一个场景
    this.loadScene(choice.next);
  },

  // 更新状态栏
  updateStatusBar() {
    const healthBar = document.getElementById('health-bar');
    const healthValue = document.getElementById('health-value');
    const moneyValue = document.getElementById('money-value');
    const lettersValue = document.getElementById('letters-value');
    const homesickBar = document.getElementById('homesick-bar');

    healthValue.textContent = Math.max(0, this.state.health);
    healthBar.style.width = Math.max(0, this.state.health) + '%';
    if (this.state.health > 60) healthBar.style.background = '#4CAF50';
    else if (this.state.health > 30) healthBar.style.background = '#FF9800';
    else healthBar.style.background = '#F44336';

    moneyValue.textContent = this.state.money;
    lettersValue.textContent = this.state.letters;
    homesickBar.style.width = Math.min(100, this.state.homesick) + '%';
  },

  // 显示结局
  showEnding(endingId, ending) {
    this.showScreen('ending-screen');

    document.getElementById('ending-title').textContent = ending.title;
    document.getElementById('ending-summary').textContent = ending.summary;
    document.getElementById('ending-story').innerHTML = `<p>${ending.text}</p>`;

    // 生成人生报告
    const genderName = this.state.gender === 'male' ? '阿福' : '阿月';
    const pathNames = {
      male: { famine: '闽南大旱', war: '躲兵灾', clan: '避宗族仇杀' },
      female: { majie: '妈姐', hongtoujin: '红头巾', liulang: '琉琅女' }
    };
    const pathName = pathNames[this.state.gender]?.[this.state.path] || '';

    document.getElementById('report-identity').textContent = `${genderName}（${pathName}）`;
    document.getElementById('report-years').textContent = ending.years || '未知';
    document.getElementById('report-letters').textContent = this.state.letters + '封';
    document.getElementById('report-ending').textContent = ending.title;

    // 保存已解锁的结局
    this.saveUnlockedEnding(endingId);
  },

  // 保存已解锁结局
  saveUnlockedEnding(endingId) {
    let unlocked = JSON.parse(localStorage.getItem('nanyang_unlocked') || '[]');
    if (!unlocked.includes(endingId)) {
      unlocked.push(endingId);
      localStorage.setItem('nanyang_unlocked', JSON.stringify(unlocked));
    }
  },

  // 切换史料胶囊
  toggleHistoryCapsule() {
    document.getElementById('history-capsule').classList.toggle('expanded');
  },

  // 切换生活切片
  toggleLifeSlice() {
    document.getElementById('life-slice').classList.toggle('expanded');
  },

  // 音效控制
  toggleMute() {
    this.state.muted = !this.state.muted;
    document.getElementById('audio-icon').textContent = this.state.muted ? '🔇' : '🔊';
  },

  // 分享功能
  share(platform) {
    const text = `"1928-1950，我走过千万华侨走过的路。\n一封侨批跨山海，半生血汗念故乡。\n我的南洋一生，是历史，也是家国。"\n\n#下南洋模拟器 #华侨历史 #侨批`;
    const url = window.location.href;

    if (platform === 'copy') {
      navigator.clipboard.writeText(text + '\n' + url).then(() => {
        alert('已复制到剪贴板，快去分享吧！');
      }).catch(() => {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text + '\n' + url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('已复制到剪贴板！');
      });
    } else if (platform === 'weibo') {
      window.open(`https://service.weibo.com/share/share.php?title=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else {
      alert('请截图分享给朋友！');
    }
  },

  // 重新开始
  restart() {
    this.state = {
      gender: null, path: null, health: 100, money: 0,
      letters: 0, homesick: 0, currentScene: null,
      choices: [], startTime: null, muted: this.state.muted
    };
    this.showScreen('intro-screen');
  },

  // 查看档案馆
  viewArchive() {
    const unlocked = JSON.parse(localStorage.getItem('nanyang_unlocked') || '[]');
    const grid = document.getElementById('archive-grid');
    grid.innerHTML = '';

    const allEndings = storyData.endings;
    Object.keys(allEndings).forEach(id => {
      const ending = allEndings[id];
      const isUnlocked = unlocked.includes(id);
      const item = document.createElement('div');
      item.className = 'archive-item' + (isUnlocked ? '' : ' locked');
      item.innerHTML = `
        <h4>${isUnlocked ? ending.title : '???'}</h4>
        <p>${isUnlocked ? ending.summary : '未解锁 — 通关对应路线后可查看'}</p>
        ${isUnlocked ? '<p style="margin-top:8px;font-size:0.85rem;">' + ending.text.substring(0, 60) + '...</p>' : ''}
      `;
      grid.appendChild(item);
    });

    this.showScreen('archive-screen');
  },

  // 返回主菜单
  backToMenu() {
    this.showScreen('intro-screen');
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  // 点击弹窗外部关闭
  document.getElementById('history-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      game.closeHistory();
    }
  });
});
