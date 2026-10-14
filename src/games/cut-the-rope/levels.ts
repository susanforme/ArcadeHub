export const WIDTH = 600;
export const HEIGHT = 800;
export interface Point {
  x: number;
  y: number;
}
export interface Level {
  candy: Point;
  anchors: Point[];
  monster: Point;
  stars: [Point, Point, Point];
  hint: 'cut' | 'order' | 'swing' | 'bubble' | 'air' | 'spikes' | 'combine';
  bubbles?: Point[];
  spikes?: { x: number; y: number; width: number }[];
  air?: { x: number; y: number; direction: 1 | -1 }[];
}
const p = (x: number, y: number): Point => ({ x, y });
// Layouts inspired by the original Cardboard / Fabric / Foil box mechanics.
export const LEVELS: Level[] = [
  {
    candy: p(300, 250),
    anchors: [p(300, 150)],
    monster: p(300, 610),
    stars: [p(300, 350), p(300, 445), p(300, 535)],
    hint: 'cut',
  },
  {
    candy: p(300, 300),
    anchors: [p(160, 160), p(440, 160)],
    monster: p(440, 610),
    stars: [p(350, 335), p(415, 395), p(440, 515)],
    hint: 'order',
  },
  {
    candy: p(300, 300),
    anchors: [p(160, 160), p(440, 160)],
    monster: p(160, 610),
    stars: [p(250, 335), p(185, 395), p(160, 515)],
    spikes: [{ x: 300, y: 545, width: 100 }],
    hint: 'order',
  },
  {
    candy: p(145, 300),
    anchors: [p(300, 150)],
    monster: p(430, 610),
    stars: [p(245, 360), p(370, 365), p(430, 515)],
    hint: 'swing',
  },
  {
    candy: p(300, 410),
    anchors: [p(300, 285)],
    monster: p(300, 630),
    stars: [p(300, 360), p(300, 265), p(300, 175)],
    bubbles: [p(300, 475)],
    hint: 'bubble',
  },
  {
    candy: p(300, 410),
    anchors: [p(190, 300), p(410, 300)],
    monster: p(300, 630),
    stars: [p(300, 370), p(300, 280), p(300, 190)],
    bubbles: [p(300, 475)],
    spikes: [
      { x: 130, y: 570, width: 90 },
      { x: 470, y: 570, width: 90 },
    ],
    hint: 'bubble',
  },
  {
    candy: p(230, 310),
    anchors: [p(230, 165)],
    monster: p(380, 610),
    stars: [p(270, 355), p(320, 435), p(360, 535)],
    air: [{ x: 105, y: 340, direction: 1 }],
    hint: 'air',
  },
  {
    candy: p(370, 310),
    anchors: [p(370, 165)],
    monster: p(220, 610),
    stars: [p(330, 355), p(280, 435), p(240, 535)],
    air: [{ x: 495, y: 340, direction: -1 }],
    spikes: [{ x: 400, y: 560, width: 130 }],
    hint: 'air',
  },
  {
    candy: p(155, 305),
    anchors: [p(300, 150)],
    monster: p(435, 620),
    stars: [p(250, 365), p(370, 370), p(435, 520)],
    spikes: [{ x: 250, y: 540, width: 150 }],
    hint: 'spikes',
  },
  {
    candy: p(300, 430),
    anchors: [p(300, 300)],
    monster: p(420, 630),
    stars: [p(300, 360), p(300, 260), p(390, 515)],
    bubbles: [p(300, 495)],
    air: [{ x: 155, y: 245, direction: 1 }],
    spikes: [{ x: 280, y: 575, width: 120 }],
    hint: 'combine',
  },
  {
    candy: p(300, 430),
    anchors: [p(300, 300)],
    monster: p(180, 630),
    stars: [p(300, 355), p(300, 260), p(210, 515)],
    bubbles: [p(300, 495)],
    air: [{ x: 445, y: 245, direction: -1 }],
    spikes: [{ x: 320, y: 575, width: 120 }],
    hint: 'combine',
  },
  {
    candy: p(300, 430),
    anchors: [p(190, 300), p(410, 300)],
    monster: p(420, 630),
    stars: [p(300, 350), p(300, 230), p(390, 505)],
    bubbles: [p(300, 495)],
    air: [{ x: 155, y: 225, direction: 1 }],
    spikes: [{ x: 280, y: 570, width: 140 }],
    hint: 'combine',
  },
];
