export type DictationWord = {
  en: string;
  zh?: string;
};

export type Dictation = {
  /** 第几次默书 */
  no: number;
  /** YYYY-MM-DD */
  date?: string;
  unit?: string;
  words: DictationWord[];
  sentences?: string[];
};

export type DictationTerm = {
  title: string;
  pendingNote: string;
  dictations: Dictation[];
};

/**
 * 学校发的默书表。只写单词和句子，不写孩子姓名、班级、学号。
 * 例：{ no: 1, date: '2026-09-18', unit: 'Unit 1 My School', words: [{ en: 'classroom', zh: '课室' }], sentences: ['This is my classroom.'] }
 */
export const DICTATION_TERM: DictationTerm = {
  title: 'P.2 上学期默书（2026–27）',
  pendingNote: '默书表待导入',
  dictations: [],
};

export type PrimaryResource = {
  name: string;
  description: string;
  url: string;
  extra?: { label: string; url: string };
};

export type PrimaryResourceGroup = {
  title: string;
  items: PrimaryResource[];
};

export const PRIMARY_RESOURCE_GROUPS: PrimaryResourceGroup[] = [
  {
    title: '自然拼读',
    items: [
      {
        name: 'Starfall',
        description: '字母发音、拼读小游戏和儿歌，部分内容免费。',
        url: 'https://www.starfall.com/h/',
      },
      {
        name: 'PhonicsPlay',
        description: '英国小学常用的自然拼读练习游戏，按阶段分级，部分免费。',
        url: 'https://www.phonicsplay.co.uk/',
      },
    ],
  },
  {
    title: '绘本阅读',
    items: [
      {
        name: 'Oxford Owl 免费电子书',
        description: '牛津大学出版社的分级拼读电子书，注册后免费在线阅读。',
        url: 'https://home.oxfordowl.co.uk/reading/free-ebooks/',
      },
      {
        name: 'Storyline Online',
        description: '演员朗读经典英文绘本的视频，适合睡前听故事。',
        url: 'https://storylineonline.net/',
      },
    ],
  },
  {
    title: '学校课程',
    items: [
      {
        name: '教育局 英国语文教育',
        description: '香港小学英文科课程框架与学与教资源。',
        url: 'https://www.edb.gov.hk/en/curriculum-development/kla/eng-edu/index.html',
      },
      {
        name: 'BBC Bitesize KS1 English',
        description: '英国 5–7 岁英文课程的短视频与小测验，覆盖拼读、拼写和语法。',
        url: 'https://www.bbc.co.uk/bitesize/subjects/zgkw2hv',
      },
    ],
  },
  {
    title: '剑桥少儿考试',
    items: [
      {
        name: 'Cambridge Pre A1 Starters',
        description: '剑桥少儿英语第一级，考试介绍、词汇范围与样题。',
        url: 'https://www.cambridgeenglish.org/exams-and-tests/starters/',
        extra: {
          label: '免费备考材料',
          url: 'https://www.cambridgeenglish.org/exams-and-tests/starters/preparation/',
        },
      },
      {
        name: 'Cambridge English 家长与孩子',
        description: '剑桥给家长的在家学英语建议和免费练习活动。',
        url: 'https://www.cambridgeenglish.org/learning-english/parents-and-children/',
      },
    ],
  },
];
