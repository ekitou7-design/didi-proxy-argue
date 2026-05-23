export const dedicatedPersonaQuizQuestions = [
  {
    id: 1,
    title: "吵起来的第一反应，你更像哪一种？",
    options: [
      { value: "A", label: "先解释清楚，我不是无理取闹" },
      { value: "B", label: "先把对方的逻辑漏洞点出来" },
      { value: "C", label: "先冷下来，短句挡回去" },
      { value: "D", label: "先反问，让对方别装听不懂" }
    ]
  },
  {
    id: 2,
    title: "被误解时，你更想怎么说？",
    options: [
      { value: "A", label: "我不是这个意思，你先听我把话说完" },
      { value: "B", label: "你现在是在偷换概念" },
      { value: "C", label: "你可以这么理解，但我不接受这个说法" },
      { value: "D", label: "行，那你继续把问题推给我" }
    ]
  },
  {
    id: 3,
    title: "对方阴阳怪气时，你通常会？",
    options: [
      { value: "A", label: "装没听见，继续讲重点" },
      { value: "B", label: "直接拆穿：你不用这样说话" },
      { value: "C", label: "冷脸收口，不陪对方演" },
      { value: "D", label: "阴阳回去，但不骂脏话" }
    ]
  },
  {
    id: 4,
    title: "你更喜欢哪种输出长度？",
    options: [
      { value: "A", label: "中等偏长，把前因后果讲完整" },
      { value: "B", label: "分层讲清楚，像把账算明白" },
      { value: "C", label: "短句压住，不给对方继续绕" },
      { value: "D", label: "看情况，情绪上来会连续输出" }
    ]
  },
  {
    id: 5,
    title: "你能接受嘴替使用粗口吗？",
    options: [
      { value: "A", label: "不能，我想有边界但不难听" },
      { value: "B", label: "尽量不用，靠逻辑压住就行" },
      { value: "C", label: "完全不用，冷一点就够了" },
      { value: "D", label: "可以轻微尖锐，但不要失控" }
    ]
  },
  {
    id: 6,
    title: "你希望嘴替更像本人，还是比本人更强？",
    options: [
      { value: "A", label: "像本人，帮我把话说顺" },
      { value: "B", label: "比本人更清楚，更会抓重点" },
      { value: "C", label: "比本人更冷静，更有边界" },
      { value: "D", label: "比本人更敢说，但别越线" }
    ]
  },
  {
    id: 7,
    title: "这场对话里你更在意什么？",
    options: [
      { value: "A", label: "让对方理解我的感受" },
      { value: "B", label: "让对方承认逻辑和责任" },
      { value: "C", label: "停止消耗，守住边界" },
      { value: "D", label: "别让对方继续占上风" }
    ]
  },
  {
    id: 8,
    title: "你最常用的表达方式是？",
    options: [
      { value: "A", label: "委屈说明：我不是要吵，我只是觉得" },
      { value: "B", label: "逻辑归纳：问题不是 A，而是 B" },
      { value: "C", label: "冷脸反问：所以你现在是不打算回应？" },
      { value: "D", label: "阴阳拆台：你这个解释听起来挺省事的" }
    ]
  }
];

export const dedicatedPersonaPersonalities = {
  RESTRAINED: {
    typeName: "克制解释型嘴替",
    nickname: "先讲道理再反击",
    category: "解释类",
    emoji: "替",
    subtitle: "先解释，再指出问题，重视边界，不喜欢粗口。",
    tags: ["克制", "解释型", "重视边界", "先讲道理"],
    styleProfile: {
      tone: "克制、解释型、重视边界",
      emotionLevel: 3,
      logicStyle: "先澄清自己不是无理取闹，再指出对方行为的问题，最后提出边界",
      commonPhrases: ["我不是", "我只是", "问题不是", "你每次都"],
      avoidWords: ["粗口", "威胁", "过度网络热梗"],
      replyStrategy: "保留第一人称和解释路径，先讲清楚再反击。",
      profileSummary: "先解释，再指出问题，重视边界，不喜欢粗口。"
    }
  },
  COLD: {
    typeName: "冷脸反问型嘴替",
    nickname: "短句挡回去",
    category: "边界类",
    emoji: "冷",
    subtitle: "话不多，但每一句都把边界放在前面。",
    tags: ["冷静", "短句", "边界", "不内耗"],
    styleProfile: {
      tone: "冷静、疏离、边界感强",
      emotionLevel: 2,
      logicStyle: "少解释，直接反问对方是否愿意正面回应",
      commonPhrases: ["所以呢", "你现在是在回避", "这件事到这里"],
      avoidWords: ["长篇自证", "讨好式让步", "情绪化拉扯"],
      replyStrategy: "用短句收口，减少对方继续消耗的空间。",
      profileSummary: "短句反问，冷静设边界，不陪对方绕。"
    }
  },
  IRONIC: {
    typeName: "阴阳拆台型嘴替",
    nickname: "轻轻一戳就漏气",
    category: "拆台类",
    emoji: "阴",
    subtitle: "不大喊大叫，专门拆穿对方话里的小把戏。",
    tags: ["阴阳", "拆穿", "轻讽", "不脏"],
    styleProfile: {
      tone: "轻讽、聪明、带一点阴阳怪气",
      emotionLevel: 3,
      logicStyle: "先接住对方话术，再点破里面的逃避和甩锅",
      commonPhrases: ["听起来挺省事的", "这解释真方便", "你这不是回应"],
      avoidWords: ["低俗辱骂", "持续嘲笑", "现实威胁"],
      replyStrategy: "用轻讽拆台，但不升级成人身攻击。",
      profileSummary: "适合把对方的阴阳怪气原路拆回去。"
    }
  },
  LOGIC: {
    typeName: "逻辑压制型嘴替",
    nickname: "把账算明白",
    category: "逻辑类",
    emoji: "理",
    subtitle: "不靠音量赢，靠拆概念、拆责任、拆因果。",
    tags: ["逻辑", "归纳", "责任", "清楚"],
    styleProfile: {
      tone: "清醒、理性、有压迫感",
      emotionLevel: 2,
      logicStyle: "先定义问题，再拆对方偷换概念，最后要求具体回应",
      commonPhrases: ["问题不是", "这个因果不成立", "请正面回应"],
      avoidWords: ["无证据指控", "情绪宣泄", "跑题审判"],
      replyStrategy: "把混乱争吵压成事实、影响、责任和下一步。",
      profileSummary: "适合把一团乱话拆成对方必须回应的问题。"
    }
  },
  FIRE: {
    typeName: "发疯输出型嘴替",
    nickname: "有火但不越线",
    category: "释放类",
    emoji: "疯",
    subtitle: "情绪给足，但不威胁、不歧视、不爆隐私。",
    tags: ["爆发", "直接", "情绪浓", "不越线"],
    styleProfile: {
      tone: "直接、有冲击力、情绪浓度高",
      emotionLevel: 5,
      logicStyle: "先打断对方甩锅，再连续输出自己的不满和底线",
      commonPhrases: ["别装没事", "我真的受够了", "你每次都这样"],
      avoidWords: ["威胁", "歧视", "隐私曝光", "严重人身攻击"],
      replyStrategy: "释放情绪，但把火力压在行为和责任上。",
      profileSummary: "适合需要更有爆发力、但仍然安全的回应。"
    }
  },
  DECENT: {
    typeName: "体面反击型嘴替",
    nickname: "温柔但不让步",
    category: "体面类",
    emoji: "稳",
    subtitle: "话说得体面，但边界一点都不软。",
    tags: ["体面", "温柔", "坚定", "关系修复"],
    styleProfile: {
      tone: "温和、体面、坚定",
      emotionLevel: 2,
      logicStyle: "先表达关系和感受，再提出不可接受的点和具体期待",
      commonPhrases: ["我愿意好好说", "但我不能接受", "请你认真对待"],
      avoidWords: ["撕破脸", "粗口", "过度阴阳"],
      replyStrategy: "给关系留余地，但不把边界让出去。",
      profileSummary: "适合想修复关系，但不想继续委屈自己的场景。"
    }
  }
};

export const dedicatedPersonaPersonalityWeights = {
  1: { A: { RESTRAINED: 3, DECENT: 1 }, B: { LOGIC: 3 }, C: { COLD: 3 }, D: { IRONIC: 2, FIRE: 1 } },
  2: { A: { RESTRAINED: 3 }, B: { LOGIC: 3 }, C: { DECENT: 2, COLD: 1 }, D: { IRONIC: 2, FIRE: 1 } },
  3: { A: { DECENT: 2, RESTRAINED: 1 }, B: { LOGIC: 2, COLD: 1 }, C: { COLD: 3 }, D: { IRONIC: 3, FIRE: 1 } },
  4: { A: { RESTRAINED: 3 }, B: { LOGIC: 3 }, C: { COLD: 3 }, D: { FIRE: 2, IRONIC: 1 } },
  5: { A: { RESTRAINED: 2, DECENT: 2 }, B: { LOGIC: 2, DECENT: 1 }, C: { COLD: 2 }, D: { FIRE: 2, IRONIC: 1 } },
  6: { A: { RESTRAINED: 3 }, B: { LOGIC: 3 }, C: { COLD: 2, DECENT: 1 }, D: { FIRE: 2, IRONIC: 2 } },
  7: { A: { DECENT: 3, RESTRAINED: 1 }, B: { LOGIC: 3 }, C: { COLD: 3 }, D: { FIRE: 2, IRONIC: 2 } },
  8: { A: { RESTRAINED: 3 }, B: { LOGIC: 3 }, C: { COLD: 3 }, D: { IRONIC: 3, FIRE: 1 } }
};

export const personaTestQuestions = [
  {
    id: 1,
    title: "期末周压力爆表时，你更像被哪种方式送出地球？",
    options: [
      { value: "A", label: "化成一串坐标，从天文台被发射出去" },
      { value: "B", label: "缩成小件快递，被顺手拎走" },
      { value: "C", label: "作为大件货物，被一车拉走" },
      { value: "D", label: "原地坐住，不逃不躲，硬扛到底" }
    ]
  },
  {
    id: 2,
    title: "连上一周早八后，如果重生，你会醒在哪里？",
    options: [
      { value: "A", label: "一只高贵海鲜的水箱里" },
      { value: "B", label: "食堂窗口那个熟悉的大铁盆里" },
      { value: "C", label: "下周一早八的教室里" },
      { value: "D", label: "下一节课的路上，继续慢慢晃" }
    ]
  },
  {
    id: 3,
    title: "校园逃亡游戏开局，你的坐骑更可能是？",
    options: [
      { value: "A", label: "准点但很有距离感的校园车" },
      { value: "B", label: "后山冲出来的野生野猪" },
      { value: "C", label: "看起来温顺但很有灵气的小鹿" },
      { value: "D", label: "教育超市旁边的神秘售货机" }
    ]
  },
  {
    id: 4,
    title: "别人故意问“南大是哪所大学”时，你会？",
    options: [
      { value: "A", label: "东南大学" },
      { value: "B", label: "南昌大学" },
      { value: "C", label: "南方的大学" },
      { value: "D", label: "南京大学" }
    ]
  },
  {
    id: 5,
    title: "要去上早八了，你最像哪种状态？",
    options: [
      { value: "A", label: "醒来失败，还在梦里谈判" },
      { value: "B", label: "边走边看风景，顺手记录生活" },
      { value: "C", label: "反复说就翘一次，然后突然想起会点名" },
      { value: "D", label: "慢慢晃过去，主打一个不被催熟" }
    ]
  },
  {
    id: 6,
    title: "小组作业分工时，你通常会变成？",
    options: [
      { value: "A", label: "没人说话，只好开口，然后莫名成了负责人" },
      { value: "B", label: "被任务冲碎，但嘴上还想维持可爱" },
      { value: "C", label: "沉默观察，一开口就指出漏洞" },
      { value: "D", label: "都行、可以、不错、那就这样" }
    ]
  },
  {
    id: 7,
    title: "路过校园里的猫猫，你的真实反应是？",
    options: [
      { value: "A", label: "心里尖叫，身体僵住，表面无事发生" },
      { value: "B", label: "直接贴近，拍照、投喂、开始社交" },
      { value: "C", label: "忽然严肃：为什么这里没有另一种毛茸茸" },
      { value: "D", label: "脑内弹幕乱飞，最后什么都忘了" }
    ]
  },
  {
    id: 8,
    title: "宿舍楼下遇到小情侣黏在一起，你会？",
    options: [
      { value: "A", label: "内心戏爆棚：我是加入这个家，不是拆散这个家" },
      { value: "B", label: "从全世界路过，假装自己没看见" },
      { value: "C", label: "脑子里冒出一句很不礼貌但很准确的话" },
      { value: "D", label: "嘴上嫌弃，心里祝福，情绪很复杂" }
    ]
  },
  {
    id: 9,
    title: "选课时，你最先考虑的是？",
    options: [
      { value: "A", label: "怎样把课表变得更空" },
      { value: "B", label: "先告诉我怎么抢到想要的课" },
      { value: "C", label: "离食堂和操场近不近" },
      { value: "D", label: "这门课听起来够不够正统" }
    ]
  },
  {
    id: 10,
    title: "论文里遇到看不懂的理论，你会？",
    options: [
      { value: "A", label: "先复制搜索，看看有没有人能救我" },
      { value: "B", label: "先感受它，好像也不是非懂不可" },
      { value: "C", label: "拉人讨论，至少一起把话说清楚" },
      { value: "D", label: "看不懂就先放过彼此" }
    ]
  },
  {
    id: 11,
    title: "如果校园里的风有性格，你觉得它更像？",
    options: [
      { value: "A", label: "冷静克制，只走最短路径" },
      { value: "B", label: "绕着树影打转，温柔但散漫" },
      { value: "C", label: "跟着人群流动，哪里热闹去哪里" },
      { value: "D", label: "躲在角落，安静得很有存在感" }
    ]
  },
  {
    id: 12,
    title: "课题组频繁开会，你心里最像哪句弹幕？",
    options: [
      { value: "A", label: "我需要一点独立空间" },
      { value: "B", label: "祝大家幸福，我先精神离席" },
      { value: "C", label: "这压迫感有点离谱，但我居然醒了" },
      { value: "D", label: "我更想要一个不太主动的安排" }
    ]
  },
  {
    id: 13,
    title: "如果一道题故意没有题目，你会觉得它在暗示？",
    options: [
      { value: "A", label: "还没开始咀嚼现实" },
      { value: "B", label: "正在咀嚼现实" },
      { value: "C", label: "已经嚼出一点味道" },
      { value: "D", label: "嚼完了，准备收工" }
    ]
  },
  {
    id: 14,
    title: "路上满天飞絮时，你的心态更像？",
    options: [
      { value: "A", label: "开始引用古诗，给混乱找个说法" },
      { value: "B", label: "世界打我一下，我还想唱两句" },
      { value: "C", label: "我没招谁，为什么先攻击我" },
      { value: "D", label: "人生很宽，先往前走" }
    ]
  },
  {
    id: 15,
    title: "论文 DDL 只剩 24 小时，你还没动。这里的“动”是？",
    options: [
      { value: "A", label: "精神上已经开始庄严启动" },
      { value: "B", label: "看似不动，其实也真的没动" },
      { value: "C", label: "开始给自己打节奏" },
      { value: "D", label: "动了，真的动了，虽然只动了一点点" }
    ]
  },
  {
    id: 16,
    title: "交学费时心跳加速，你更愿意解释为？",
    options: [
      { value: "A", label: "这件事背后一定有更复杂的结构" },
      { value: "B", label: "我在用诚意撬动世界" },
      { value: "C", label: "评价归评价，我先保持通透" },
      { value: "D", label: "至少这个瞬间很有氛围" }
    ]
  },
  {
    id: 17,
    title: "成绩比预期低很多时，你的第一声感叹更像？",
    options: [
      { value: "A", label: "我的天，这谁顶得住" },
      { value: "B", label: "我先震惊，再找原因" },
      { value: "C", label: "这事有点不对劲，我要看看细节" },
      { value: "D", label: "好，命运又来训练我了" }
    ]
  },
  {
    id: 18,
    title: "校内饮品大战，你更像支持哪种阵营？",
    options: [
      { value: "A", label: "效率第一，醒着就行" },
      { value: "B", label: "手作感和情绪价值很重要" },
      { value: "C", label: "甜一点，日子就能接着过" },
      { value: "D", label: "我要稳定、标准、可预期" }
    ]
  },
  {
    id: 19,
    title: "如果给你一片校园空地，你希望它变成？",
    options: [
      { value: "A", label: "干净规整、功能明确的广场" },
      { value: "B", label: "自然生长、不被修剪的小野地" },
      { value: "C", label: "大家可以坐下聊天的公共空间" },
      { value: "D", label: "什么都不放，保留一点空白" }
    ]
  },
  {
    id: 20,
    title: "别人问学校排名时，你更可能怎么接？",
    options: [
      { value: "A", label: "不知道，我只知道先把自己建设好" },
      { value: "B", label: "拿出历史旧账，让对方重新组织语言" },
      { value: "C", label: "直接给一个很有气势的答案" },
      { value: "D", label: "突然跑题，用冷门梗结束争论" }
    ]
  },
  {
    id: 21,
    title: "你心里真正的校园食堂是哪里？",
    options: [
      { value: "A", label: "校内食堂，朴素但稳定" },
      { value: "B", label: "校外小店，热闹才像生活" },
      { value: "C", label: "新一点、舒服一点的地方" },
      { value: "D", label: "偏远一点也行，安静最重要" }
    ]
  },
  {
    id: 22,
    title: "如果总结这几年，你会说自己过得？",
    options: [
      { value: "A", label: "还不错，我能接住很多事" },
      { value: "B", label: "挺好，至少有很多温柔瞬间" },
      { value: "C", label: "一般，但我还在场" },
      { value: "D", label: "很难，但难不代表我输了" }
    ]
  }
];

export const personaPersonalities = {
  VEGE: {
    typeName: "菜根",
    nickname: "慢火反击锅",
    category: "接纳类",
    emoji: "🥬",
    subtitle: "你不抢话，但每一句都能把问题炖回主线。",
    tags: ["稳", "耐磨", "主线", "不自证"],
    styleProfile: {
      tone: "冷静、朴素、有韧劲",
      emotionLevel: 2,
      logicStyle: "先承认事实存在，再把对方拉回具体责任",
      commonPhrases: ["我说的是这件事本身", "先别把问题绕开", "我们回到具体影响"],
      avoidWords: ["过度讨好", "自我贬低", "反复解释"],
      replyStrategy: "不急着赢场面，持续压住事实和责任。",
      profileSummary: "适合生成稳、准、有后劲的回怼。"
    }
  },
  PKU: {
    typeName: "浦口冷处理师",
    nickname: "淡淡门禁",
    category: "安抚类",
    emoji: "🏛️",
    subtitle: "你看起来不争，其实很会把别人挡在边界外。",
    tags: ["疏离", "边界", "省力", "降噪"],
    styleProfile: {
      tone: "平静疏离，不被带节奏",
      emotionLevel: 2,
      logicStyle: "少解释，直接确认边界和下一步",
      commonPhrases: ["这件事我不继续消耗", "你可以不同意，但不能越界", "我只接受具体处理"],
      avoidWords: ["情绪化拉扯", "讨好式让步"],
      replyStrategy: "用短句降噪，减少对方继续纠缠的空间。",
      profileSummary: "适合生成清冷、克制、边界感强的回应。"
    }
  },
  BABYMONSTER: {
    typeName: "后山野生炮台",
    nickname: "秩序闯入者",
    category: "释放类",
    emoji: "🔥",
    subtitle: "你不太负责维持体面，你负责让对方别装没事。",
    tags: ["爆发", "直接", "不服", "压制"],
    styleProfile: {
      tone: "直接、有火力、不绕弯",
      emotionLevel: 5,
      logicStyle: "先拆对方姿态，再强压核心问题",
      commonPhrases: ["别装听不懂", "你这不是解释，是甩锅", "话别说一半"],
      avoidWords: ["脏话", "现实威胁", "人身攻击"],
      replyStrategy: "用强势短句打断甩锅，但保留底线。",
      profileSummary: "适合生成高压、直接、有冲击力的回怼。"
    }
  },
  SPEAKER: {
    typeName: "街头演讲嘴替",
    nickname: "话筒控场王",
    category: "释放类",
    emoji: "🎤",
    subtitle: "你一开口就像拿到了话筒，重点会被你重新宣布。",
    tags: ["控场", "铺陈", "气势", "公开处刑"],
    styleProfile: {
      tone: "有气势、像公开陈述",
      emotionLevel: 4,
      logicStyle: "先下判断，再列理由，最后收束边界",
      commonPhrases: ["我把话说明白", "这件事的重点只有一个", "你现在回避不了"],
      avoidWords: ["长篇说教", "跑题铺垫"],
      replyStrategy: "用有节奏的表达压住场面，让对方必须正面回应。",
      profileSummary: "适合生成有气场、适合发出去镇场的回应。"
    }
  },
  CRAB: {
    typeName: "帝王蟹出场型",
    nickname: "存在感横着走",
    category: "释放类",
    emoji: "🦀",
    subtitle: "你不一定先动手，但你一出现，对话就很难忽视你。",
    tags: ["锋芒", "自信", "破局", "压迫"],
    styleProfile: {
      tone: "自信、锋利、有压迫感",
      emotionLevel: 4,
      logicStyle: "不自证，要求对方拿证据和方案",
      commonPhrases: ["你有依据就说依据", "别用猜测装事实", "这句话你要负责"],
      avoidWords: ["服软求和", "含糊认错"],
      replyStrategy: "把举证责任推回对方，拒绝被审判。",
      profileSummary: "适合生成硬气、醒目、不让对方占便宜的回应。"
    }
  },
  REST: {
    typeName: "食堂自洽派",
    nickname: "乱中有汤",
    category: "安抚类",
    emoji: "🍽️",
    subtitle: "你能接住混乱，但不代表你要替别人收拾烂摊子。",
    tags: ["自洽", "温和", "讲理", "不背锅"],
    styleProfile: {
      tone: "温和但不软",
      emotionLevel: 2,
      logicStyle: "先把情绪放稳，再说明责任归属",
      commonPhrases: ["我可以好好说，但不代表我接受", "这不是我一个人的问题", "请给具体方案"],
      avoidWords: ["过激讽刺", "撕破脸"],
      replyStrategy: "用温和语气把责任边界讲清楚。",
      profileSummary: "适合生成不吵大、但能争取权益的回应。"
    }
  },
  WHALE: {
    typeName: "小蓝鲸定海派",
    nickname: "温柔压舱石",
    category: "疗愈类",
    emoji: "🐋",
    subtitle: "你不靠吼赢，你靠稳定让对方的歪理沉下去。",
    tags: ["温和", "稳定", "格局", "边界"],
    styleProfile: {
      tone: "温柔、稳定、有边界",
      emotionLevel: 2,
      logicStyle: "先表达影响，再提出清楚请求",
      commonPhrases: ["我不是要吵大", "但这件事确实影响到我", "我希望你正面处理"],
      avoidWords: ["攻击人格", "阴阳过度"],
      replyStrategy: "用稳定表达争取尊重，不被对方情绪带偏。",
      profileSummary: "适合生成体面、清楚、有分量的回应。"
    }
  },
  GLUE: {
    typeName: "鼓楼厚重审判",
    nickname: "旧账归档员",
    category: "接纳类",
    emoji: "🏛️",
    subtitle: "你记得脉络，也能把对方的反复问题钉回时间线。",
    tags: ["复盘", "证据", "厚重", "归档"],
    styleProfile: {
      tone: "沉稳、严肃、带审视感",
      emotionLevel: 3,
      logicStyle: "按时间线复盘事实，指出重复模式",
      commonPhrases: ["这不是第一次", "我们按时间线说", "问题一直是同一个"],
      avoidWords: ["翻无关旧账", "扩大攻击范围"],
      replyStrategy: "只翻与当前问题有关的模式，让对方不能装偶然。",
      profileSummary: "适合生成复盘型、有证据感的回怼。"
    }
  },
  SHINING: {
    typeName: "仙林远程控场",
    nickname: "通勤级耐心",
    category: "疗愈类",
    emoji: "✨",
    subtitle: "你习惯路很远，所以更懂得什么话值得继续说。",
    tags: ["耐心", "控场", "现实", "推进"],
    styleProfile: {
      tone: "耐心但不无限续杯",
      emotionLevel: 3,
      logicStyle: "先给一次解释机会，再明确推进节点",
      commonPhrases: ["我可以再说一遍", "但这次请你正面回答", "下一步怎么处理"],
      avoidWords: ["无限解释", "被动等待"],
      replyStrategy: "给对方一次回应空间，同时设置截止线。",
      profileSummary: "适合生成耐心、实际、推动解决的回应。"
    }
  },
  NANCY: {
    typeName: "南苏温柔刀",
    nickname: "轻声封喉",
    category: "安抚类",
    emoji: "🌸",
    subtitle: "你说话不重，但每个字都有边界。",
    tags: ["温柔", "坚定", "优雅", "扎心"],
    styleProfile: {
      tone: "温柔坚定，轻但有刺",
      emotionLevel: 3,
      logicStyle: "先礼貌接住，再精准指出问题",
      commonPhrases: ["我听见了，但我不接受", "这句话听起来很轻，但问题不小", "请你尊重我的边界"],
      avoidWords: ["脏话", "粗暴羞辱"],
      replyStrategy: "用温柔语气完成明确拒绝和反击。",
      profileSummary: "适合生成优雅、克制、但很有杀伤力的回应。"
    }
  },
  PAPER: {
    typeName: "论文冷静拆解",
    nickname: "逻辑页码器",
    category: "疗愈类",
    emoji: "📄",
    subtitle: "你不是在吵，你是在给对方的逻辑做退稿意见。",
    tags: ["逻辑", "拆解", "清醒", "证据"],
    styleProfile: {
      tone: "冷静、理性、像审稿意见",
      emotionLevel: 2,
      logicStyle: "拆定义、拆因果、拆责任",
      commonPhrases: ["这个因果不成立", "请不要偷换概念", "你的结论缺少依据"],
      avoidWords: ["情绪宣泄", "无证据指控"],
      replyStrategy: "用逻辑漏洞压制对方话术。",
      profileSummary: "适合生成理性、精准、让对方难以反驳的回应。"
    }
  },
  NONE: {
    typeName: "通识课隐身反杀",
    nickname: "缺席即边界",
    category: "接纳类",
    emoji: "📚",
    subtitle: "你不一定参与所有拉扯，但一开口就能结束无意义消耗。",
    tags: ["抽离", "收口", "自由", "反内耗"],
    styleProfile: {
      tone: "抽离、冷淡、快速收口",
      emotionLevel: 2,
      logicStyle: "判断无效沟通后直接边界收口",
      commonPhrases: ["这个话题到这里", "我不继续陪你绕", "有具体方案再说"],
      avoidWords: ["反复解释", "被迫证明"],
      replyStrategy: "识别无效拉扯，直接结束对话或设条件继续。",
      profileSummary: "适合生成短、冷、很省力的终止型回应。"
    }
  }
};

export const personaPersonalityWeights = {
  1: { A: { VEGE: 1, CRAB: 2 }, B: { REST: 1, PKU: 1 }, C: { VEGE: 2, GLUE: 1 }, D: { WHALE: 2, SHINING: 1 } },
  2: { A: { CRAB: 3 }, B: { REST: 2, VEGE: 1 }, C: { PAPER: 2, GLUE: 1 }, D: { WHALE: 1, SHINING: 2 } },
  3: { A: { SHINING: 2, NANCY: 1 }, B: { BABYMONSTER: 3 }, C: { WHALE: 2, NANCY: 1 }, D: { SPEAKER: 2, NONE: 1 } },
  4: { A: { NONE: 2 }, B: { PKU: 2 }, C: { GLUE: 2 }, D: { SHINING: 2, WHALE: 1 } },
  5: { A: { PAPER: 2, BABYMONSTER: 1 }, B: { NANCY: 2, WHALE: 1 }, C: { BABYMONSTER: 2, NONE: 1 }, D: { PKU: 2, SHINING: 1 } },
  6: { A: { GLUE: 2, VEGE: 1 }, B: { PAPER: 2, BABYMONSTER: 1 }, C: { BABYMONSTER: 2, PAPER: 1 }, D: { PKU: 2, WHALE: 1 } },
  7: { A: { WHALE: 2, NANCY: 1 }, B: { NANCY: 2, WHALE: 1 }, C: { BABYMONSTER: 2, SPEAKER: 1 }, D: { SPEAKER: 3 } },
  8: { A: { BABYMONSTER: 2, CRAB: 1 }, B: { WHALE: 2, NANCY: 1 }, C: { SPEAKER: 2, BABYMONSTER: 1 }, D: { PKU: 2, NANCY: 1 } },
  9: { A: { NONE: 3 }, B: { NONE: 2, PKU: 1 }, C: { REST: 2, NANCY: 1 }, D: { GLUE: 2, VEGE: 1 } },
  10: { A: { PAPER: 2, NONE: 1 }, B: { NANCY: 2, VEGE: 1 }, C: { WHALE: 2, NANCY: 1 }, D: { NONE: 2, PAPER: 1 } },
  11: { A: { GLUE: 2, VEGE: 1 }, B: { NANCY: 2, WHALE: 1 }, C: { SHINING: 2, WHALE: 1 }, D: { WHALE: 2, NANCY: 1 } },
  12: { A: { WHALE: 2, PKU: 1 }, B: { CRAB: 2, NANCY: 1 }, C: { BABYMONSTER: 2, CRAB: 1 }, D: { BABYMONSTER: 2, PAPER: 1 } },
  13: { A: { NONE: 2 }, B: { VEGE: 2, PKU: 1 }, C: { VEGE: 3 }, D: { GLUE: 2, WHALE: 1 } },
  14: { A: { NANCY: 2, VEGE: 1 }, B: { WHALE: 2, NANCY: 1 }, C: { PAPER: 2, BABYMONSTER: 1 }, D: { BABYMONSTER: 2, WHALE: 1 } },
  15: { A: { VEGE: 2, NANCY: 1 }, B: { WHALE: 2 }, C: { PAPER: 2, BABYMONSTER: 1 }, D: { BABYMONSTER: 2, WHALE: 1 } },
  16: { A: { GLUE: 2, WHALE: 1 }, B: { PKU: 2, VEGE: 1 }, C: { BABYMONSTER: 2, SPEAKER: 1 }, D: { PAPER: 2, BABYMONSTER: 1 } },
  17: { A: { PAPER: 2, GLUE: 1 }, B: { GLUE: 2, WHALE: 1 }, C: { PKU: 2, NANCY: 1 }, D: { REST: 2, PKU: 1 } },
  18: { A: { CRAB: 2, BABYMONSTER: 1 }, B: { BABYMONSTER: 2 }, C: { BABYMONSTER: 2, CRAB: 1 }, D: { BABYMONSTER: 2, NONE: 1 } },
  19: { A: { SHINING: 2 }, B: { NANCY: 2, WHALE: 1 }, C: { REST: 2, NANCY: 1 }, D: { GLUE: 2 } },
  20: { A: { SHINING: 2, VEGE: 1 }, B: { BABYMONSTER: 2, WHALE: 1 }, C: { NANCY: 2, WHALE: 1 }, D: { NONE: 2, PKU: 1 } },
  21: { A: { SHINING: 2, WHALE: 1 }, B: { GLUE: 2, CRAB: 1 }, C: { CRAB: 2, SHINING: 1 }, D: { SPEAKER: 2, BABYMONSTER: 1 } },
  22: { A: { REST: 2, VEGE: 1 }, B: { SPEAKER: 2, SHINING: 1 }, C: { PKU: 2, WHALE: 1 }, D: { PAPER: 2, BABYMONSTER: 1 } }
};
