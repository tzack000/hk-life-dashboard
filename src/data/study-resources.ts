export type ExamSet = {
  book: number;
  note: string;
  audioPath: string;
  audioSize: string;
  pdfPath: string;
  pdfSize: string;
  detail?: string;
};

export const STUDY_SOURCE = 'https://www.frostyrhymes.com/cambridge-ielts-resources/';
export const STUDY_OFFICIAL = 'https://shop.cambridge.org/english/exam/ielts';
export const STUDY_CONTACT = 'mailto:contact@frostyrhymes.com';

export function examAssetUrl(path: string) {
  return `/cdn-audio/${path}`;
}

export const EXAM_SETS: ExamSet[] = [
  { book: 4, note: '经典入门，语速适中', audioPath: '2026/05/Cambridge-IELTS---Listening-04.zip', audioSize: '46 MB', pdfPath: '2026/01/Cambridge-IELTS-04.pdf', pdfSize: '1007 KB' },
  { book: 5, note: '题型基础稳定', audioPath: '2026/01/Cambridge-IELTS---Listening-05.zip', audioSize: '18 MB', pdfPath: '2026/01/Cambridge-IELTS-05.pdf', pdfSize: '13 MB' },
  { book: 6, note: '填空题为主，适合练拼写', audioPath: '2026/01/Cambridge-IELTS---Listening-06.zip', audioSize: '67 MB', pdfPath: '2026/01/Cambridge-IELTS-06.pdf', pdfSize: '21 MB' },
  { book: 7, note: '地图题增多，重点练方位词', audioPath: '2026/01/Cambridge-IELTS---Listening-07.zip', audioSize: '116 MB', pdfPath: '2026/01/Cambridge-IELTS-07.pdf', pdfSize: '16 MB' },
  { book: 8, note: '匹配题增多，注意同义替换', audioPath: '2026/01/Cambridge-IELTS---Listening-08.zip', audioSize: '43 MB', pdfPath: '2026/01/Cambridge-IELTS-08.pdf', pdfSize: '15 MB' },
  { book: 9, note: 'Section 4 学术场景更复杂', audioPath: '2026/01/Cambridge-IELTS---Listening-09.zip', audioSize: '116 MB', pdfPath: '2026/01/Cambridge-IELTS-09.pdf', pdfSize: '6 MB' },
  { book: 10, note: '综合难度适中，适合自测', audioPath: '2026/01/Cambridge-IELTS---Listening-10.zip', audioSize: '71 MB', pdfPath: '2026/01/Cambridge-IELTS-10.pdf', pdfSize: '39 MB' },
  { book: 11, note: '口音更多样，含印度、澳洲口音', audioPath: '2026/01/Cambridge-IELTS---Listening-11.zip', audioSize: '84 MB', pdfPath: '2026/05/Cambridge-IELTS-11.pdf', pdfSize: '26 MB' },
  { book: 12, note: '选择题变多，注意干扰项', audioPath: '2026/01/Cambridge-IELTS---Listening-12.zip', audioSize: '137 MB', pdfPath: '2026/01/Cambridge-IELTS-12.pdf', pdfSize: '35 MB' },
  { book: 13, note: '填空答案更学术', audioPath: '2026/01/Cambridge-IELTS---Listening-13.zip', audioSize: '56 MB', pdfPath: '2026/09/Cambridge-IELTS-13.pdf', pdfSize: '18 MB' },
  { book: 14, note: '语速加快，接近考试节奏', audioPath: '2026/01/Cambridge-IELTS---Listening-14.zip', audioSize: '58 MB', pdfPath: '2026/01/Cambridge-IELTS-14.pdf', pdfSize: '9 MB' },
  { book: 15, note: '题型全面，适合整套模考', audioPath: '2026/01/Cambridge-IELTS---Listening-15.zip', audioSize: '102 MB', pdfPath: '2026/01/Cambridge-IELTS-15.pdf', pdfSize: '28 MB' },
  { book: 16, note: '学术讲座更难，Section 4 是重点', audioPath: '2026/01/Cambridge-IELTS---Listening-16.zip', audioSize: '69 MB', pdfPath: '2026/01/Cambridge-IELTS-16.pdf', pdfSize: '35 MB' },
  { book: 17, note: '地图题和流程图增多', audioPath: '2026/01/Cambridge-IELTS---Listening-17.zip', audioSize: '79 MB', pdfPath: '2026/01/Cambridge-IELTS-17.pdf', pdfSize: '35 MB' },
  { book: 18, note: '适合留作考前模拟', audioPath: '2026/01/Cambridge-IELTS---Listening-18.zip', audioSize: '108 MB', pdfPath: '2026/01/Cambridge-IELTS-18.pdf', pdfSize: '10 MB' },
  { book: 19, note: '同义替换更隐蔽', audioPath: '2026/01/Cambridge-IELTS---Listening-19.zip', audioSize: '97 MB', pdfPath: '2026/01/Cambridge-IELTS-19.pdf', pdfSize: '27 MB' },
  { book: 20, note: '难度接近当前考试', audioPath: '2026/01/Cambridge-IELTS---Listening-20.zip', audioSize: '82 MB', pdfPath: '2026/09/Cambridge-IELTS-20.pdf', pdfSize: '3 MB' },
  {
    book: 21,
    note: '2026 年最新，目前最接近真实考试',
    audioPath: '2026/06/Cambridge-IELTS---Listening-21.zip',
    audioSize: '148 MB',
    pdfPath: '2026/06/Cambridge-IELTS-21.pdf',
    pdfSize: '42 MB',
    detail: '这一套听力把每个 Part 被拆开的上下段合并过，没有改单段时长。',
  },
];

export function findExamSet(book: number) {
  return EXAM_SETS.find((item) => item.book === book) ?? null;
}
