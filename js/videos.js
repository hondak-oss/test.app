// 動画と部位のデータ。
// 動画を増やすときは VIDEOS に1件足すだけでOK（main/sub には MUSCLES の id を書く）。

export const MUSCLES = {
  rectus: {
    name: '腹直筋', nick: 'お腹の前側', side: 'front',
    desc: '体を丸めるときに使う筋肉。いわゆる「シックスパック」',
  },
  lowerabs: {
    name: '腹直筋下部', nick: '下腹', side: 'front',
    desc: '脚を持ち上げるときに使う。ぽっこりお腹の引き締めに',
  },
  obliques: {
    name: '腹斜筋', nick: 'わき腹', side: 'front',
    desc: '体をひねる・横に倒すときに使う。くびれづくりに',
  },
  erector: {
    name: '脊柱起立筋', nick: '背中（背骨まわり）', side: 'back',
    desc: '背筋を伸ばす筋肉。姿勢を良くする',
  },
  glutes: {
    name: '大臀筋', nick: 'お尻', side: 'back',
    desc: '脚を後ろに振る・立ち上がるときに使う大きな筋肉',
  },
  triceps: {
    name: '上腕三頭筋', nick: '二の腕の裏', side: 'back',
    desc: '腕を伸ばすときに使う。引き締まると二の腕がスッキリ',
  },
  biceps: {
    name: '上腕二頭筋', nick: '力こぶ', side: 'front',
    desc: '腕を曲げるときに使う',
  },
  forearm: {
    name: '前腕', nick: '腕の肘から先', side: 'front',
    desc: '物を握る・手首を動かすときに使う',
  },
  pecs: {
    name: '大胸筋', nick: '胸', side: 'front',
    desc: '腕を前に押し出すときに使う',
  },
  delts: {
    name: '三角筋', nick: '肩', side: 'both',
    desc: '腕を上げるときに使う',
  },
};

const CALISLIFE = 'CALISLIFE自重トレ';

export const VIDEOS = [
  {
    id: 'core5', youtubeId: 'xFciL_Jg-zQ', channel: CALISLIFE, durationLabel: '5分',
    title: '【超初心者向け】5分間4種目の体幹トレーニング！',
    main: ['rectus', 'obliques'], sub: ['erector', 'glutes'],
  },
  {
    id: 'lowerabs3', youtubeId: 'BqMRfUXgVF4', channel: CALISLIFE, durationLabel: '3分',
    title: '【初心者向け】3分間6種目の下腹トレーニング！',
    main: ['lowerabs'], sub: ['obliques'],
  },
  {
    id: 'triceps4', youtubeId: 'atVAhqOq8ws', channel: CALISLIFE, durationLabel: '3分',
    title: '【初心者向け】3分間4種目の上腕三頭筋トレーニング！',
    main: ['triceps'], sub: ['pecs', 'delts'],
  },
  {
    id: 'triceps3', youtubeId: 'WhLZtZGlfbQ', channel: CALISLIFE, durationLabel: '3分',
    title: '【超初心者向け】上腕三頭筋トレーニング！誰でもできる3分間3種目！',
    main: ['triceps'], sub: ['delts'],
  },
  {
    id: 'biceps-towel', youtubeId: 'UHn8wAbY0L0', channel: CALISLIFE, durationLabel: '3分',
    title: '【3分間1種目】タオルを使った上腕二頭筋トレーニング！',
    main: ['biceps'], sub: ['forearm'],
  },
  {
    id: 'abs7', youtubeId: 'u-wS8jABqQI', channel: 'ザ・きんにくTV', durationLabel: '3分30秒',
    title: '【腹筋】最速で腹筋を割る方法＆3分半で追い込む7種類の腹筋メニュー',
    main: ['rectus'], sub: ['obliques'],
  },
];

export function getVideo(id) {
  return VIDEOS.find((v) => v.id === id);
}
