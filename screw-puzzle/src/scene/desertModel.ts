import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, Euler, ExtrudeGeometry, Shape, Matrix4, Quaternion, TubeGeometry, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLYPHS } from "../components/lettering.ts";
import type { DesertPartId, Screw } from "../game/types.ts";
import type { Piece, Vector } from "./houseModel.ts";

type Mount = Pick<Screw, "position" | "normal" | "solutionAfter"> & { attachedTo: DesertPartId };
const pieces: Piece[] = [], pivots: Record<DesertPartId, Vector> = {};
export const DESERT_MOUNTS: Mount[] = [];
const rounded = new RoundedBoxGeometry(1, 1, 1, 3, .12);
const cylinder = new CylinderGeometry(1, 1, 1, 24);
const cream = "#ffe4b0", pale = "#fff2d4", red = "#cc493e", redLight = "#e95f4c", teal = "#479b91", darkTeal = "#306c65";
const sand = "#f5c384", ochre = "#d38953", rust = "#bb654d", metal = "#6a7176", charcoal = "#3d4650", gold = "#ffc546";
function owner(name: string, pivot: Vector): DesertPartId { const id: DesertPartId = `desert-${name}`; pivots[id] = pivot; return id; }
function shape(part: DesertPartId, kind: Piece["kind"], position: Vector, size: Vector, color: string, rotation?: Vector) { pieces.push({part, kind, position, size, color, rotation}); }
function box(part: DesertPartId, position: Vector, size: Vector, color: string, rotation?: Vector) { pieces.push({part, kind:"box", geometry:rounded, position, size, color, rotation}); }
function ball(part: DesertPartId, position: Vector, size: Vector, color: string) { shape(part,"ico-detail",position,size,color); }
function tube(part: DesertPartId, position: Vector, radius: number, height: number, color: string, rotation?: Vector) { pieces.push({part,kind:"cylinder",geometry:cylinder,position,size:[radius,height,radius],color,rotation}); }
function beam(part: DesertPartId, a: Vector, b: Vector, radius: number, color: string) {
  const start=new Vector3(...a), end=new Vector3(...b), d=end.clone().sub(start);
  const q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),d.clone().normalize());
  tube(part,start.add(end).multiplyScalar(.5).toArray(),radius,d.length(),color,new Euler().setFromQuaternion(q).toArray().slice(0,3) as Vector);
}
function curve(part: DesertPartId, points: Vector[], radius: number, color: string) {
  pieces.push({part,kind:"box",position:[0,0,0],size:[1,1,1],color,geometry:new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),32,radius,8,false)});
}
function screw(part: DesertPartId, position: Vector, normal: Vector=[0,1,0], after?: DesertPartId[]) {
  DESERT_MOUNTS.push({attachedTo:part,position,normal:new Vector3(...normal).normalize().toArray(),solutionAfter:after});
}
// Original block lettering shares the game's title alphabet and needs no font download.
function text(part: DesertPartId, word: string, [x,y,z]: Vector, height: number, color=pale) {
  const unit=height/7, width=(word.length*6-1)*unit, blocks=[];
  for(let i=0;i<word.length;i++) for(let row=0;row<7;row++) for(let col=0;col<5;col++) {
    if(GLYPHS[word[i]]?.[row]?.[col]!=="1")continue;
    blocks.push(new BoxGeometry(unit*1.015,unit*1.015,.065).translate(x-width/2+(i*6+col+.5)*unit,y+(3-row)*unit,z));
  }
  const geometry=mergeGeometries(blocks); blocks.forEach(g=>g.dispose());
  if(geometry)pieces.push({part,kind:"box",position:[0,0,0],size:[1,1,1],color,geometry});
}
function star(part: DesertPartId, position: Vector, scale: number, color=gold) { shape(part,"star",position,[scale,scale,scale],color); }
function flame(part: DesertPartId, [x,y,z]: Vector, scale: number) {
  ball(part,[x,y,z],[scale*.42,scale*.57,.055],gold);
  shape(part,"cone",[x+.07*scale,y+.40*scale,z],[scale*.26,scale*.56,.055],gold,[0,0,-.24]);
  ball(part,[x-.04*scale,y-.10*scale,z+.025],[scale*.20,scale*.32,.035],"#ffed8d");
}
function rock(name: string, [x,y,z]: Vector, [w,h,d]: Vector, color: string, seed: number) {
  const part=owner(name,[x,y+h*.5,z]), points=[];
  for(const [layer,r] of [[0,.95],[.25,1],[.75,.82],[1,.65]]) for(let i=0;i<8;i++) {
    const angle=i*Math.PI/4, vary=1+.10*Math.sin(i*5+seed);
    points.push(new Vector3(Math.cos(angle)*w*.5*r*vary,layer*h,Math.sin(angle)*d*.5*r*vary));
  }
  pieces.push({part,kind:"box",geometry:new ConvexGeometry(points),position:[x,y,z],size:[1,1,1],color});
  return part;
}

// Layered sandstone plinth and sandy surface tiles; all scenery has an owner.
const ground: {part:DesertPartId; base:DesertPartId; x:number; z:number}[]=[];
for(let row=0;row<3;row++)for(let col=0;col<3;col++) {
  const x=(col-1)*3.32,z=(row-1)*3.32;
  const base=owner(`bedrock-${row}-${col}`,[x,-.62,z]), top=owner(`sand-${row}-${col}`,[x,-.10,z]);
  box(base,[x,-.62,z],[3.30,.90,3.30],(row+col)%2?rust:"#cd7957");
  box(base,[x,-.28,z],[3.31,.20,3.31],"#e6a46b");
  box(top,[x,-.075,z],[3.31,.29,3.31],sand);
  screw(base,[x-.65,-.155,z],[0,1,0]); screw(base,[x+.65,-.155,z+.35],[0,1,0]);
  ground.push({part:top,base,x,z});
  for(let i=0;i<8;i++){const dx=Math.sin(i*6+col)*1.35,dz=Math.cos(i*9+row)*1.35;ball(top,[x+dx,.085,z+dz],[.04,.025,.035],i%2?"#e4a872":"#ffdda1");}
}
const roadParts:DesertPartId[]=[];
for(let i=0;i<3;i++) {
  const x=(i-1)*3.31, part=owner(`road-${i}`,[x,.10,2.45]);roadParts.push(part);
  box(part,[x,.105,2.45],[3.30,.14,2.38],"#505360");
  for(const z of [1.30,3.60])box(part,[x,.182,z],[3.27,.012,.045],"#d7c9aa");
  for(const dx of [-1.13,-.10,.93])box(part,[x+dx,.182,2.45],[.46,.014,.095],gold);
  screw(part,[i===0?-2.4:i===1?-.5:1.80,.19,i===2?3.43:2.55]);screw(part,[i===0?-2.1:i===1?.4:2.95,.19,i===2?3.43:2.60]);
}
// A tiled sidewalk raises the service station above the road.
const paving:DesertPartId[]=[];
for(let i=0;i<4;i++) {
  const x=-2.8+i*1.7,part=owner(`sidewalk-${i}`,[x,.20,.45]);paving.push(part);
  box(part,[x,.20,.45],[1.68,.25,1.48],"#d6c9b3");
  for(const dx of [-.55,0,.55])box(part,[x+dx,.33,.45],[.012,.012,1.43],"#b7aa9d");
  screw(part,[x-.4,.335,.45]);screw(part,[x+.4,.335,.45]);
}
// Hollow shop: independent roof sections, window, door, interior shelves and walls.
const roofs:DesertPartId[]=[];
for(let i=0;i<3;i++) {
  const x=-2.94+i*1.55,part=owner(`shop-roof-${i}`,[x,2.68,-1.85]);roofs.push(part);
  box(part,[x,2.68,-1.85],[1.54,.20,3.72],"#e3c8af");
  for(const z of [-3.65,-.05])box(part,[x,2.82,z],[1.55,.16,.12],cream);
  for(const z of [-3.18,-2.58,-1.98,-1.38,-.78])box(part,[x,2.788,z],[1.50,.012,.012],"#ba9d8c");
  screw(part,[x,2.68,-.005],[0,0,1]);screw(part,[x,2.795,-2.6]);
}
const floors:DesertPartId[]=[];
for(let i=0;i<2;i++){
 const x=-2.55+i*2.2,part=owner(`shop-floor-${i}`,[x,.30,-1.85]);floors.push(part);
 box(part,[x,.29,-1.85],[2.18,.19,3.36],"#d5b88f");
 for(const z of [-3,-2.4,-1.8,-1.2,-.6])box(part,[x,.391,z],[2.1,.012,.02],"#b89779");
 screw(part,[x-.4,.40,-1.1]);screw(part,[x+.4,.40,-2.5]);
}
const walls:DesertPartId[]=[];
for(const side of [-1,1])for(let bay=0;bay<2;bay++) {
 const x=side<0?-3.72:.92,z=-2.65+bay*1.68,part=owner(`shop-wall-${side}-${bay}`,[x,1.48,z]);walls.push(part);
 box(part,[x,1.48,z],[.16,2.25,1.66],cream);
 for(const y of [.65,1.05,1.45,1.85,2.25])box(part,[x+side*.085,y,z],[.014,.024,1.62],"#dfbd94");
 screw(part,[x-side*.10,1.90,z+.3],[-side,0,0],roofs);screw(part,[x-side*.10,.72,z-.3],[-side,0,0],roofs);
}
for(let i=0;i<3;i++){
 const x=-2.94+i*1.55,part=owner(`shop-back-${i}`,[x,1.48,-3.58]);walls.push(part);
 box(part,[x,1.48,-3.58],[1.53,2.25,.16],cream);
 for(const y of [.65,1.05,1.45,1.85,2.25])box(part,[x,y,-3.67],[1.50,.025,.018],"#dfbd94");
 screw(part,[x+.25,1.98,-3.475],[0,0,1],roofs);screw(part,[x-.25,.75,-3.475],[0,0,1],roofs);
}
const facade=owner('shop-facade',[-1.4,1.48,-.16]);walls.push(facade);
for(const [x,w] of [[-3.55,.32],[-1.54,.29],[.75,.34]])box(facade,[x,1.48,-.16],[w,2.25,.17],cream);
box(facade,[-1.24,1.48,-.16],[.32,2.25,.17],cream);box(facade,[.33,1.48,-.16],[.51,2.25,.17],cream);
box(facade,[-1.4,2.43,-.16],[4.62,.36,.17],cream);box(facade,[-2.60,.55,-.16],[1.70,.39,.17],cream);
box(facade,[-1.4,2.24,-.05],[4.68,.10,.17],teal);
screw(facade,[-1.52,1.8,-.27],[0,0,-1],roofs);screw(facade,[-3.56,.8,-.27],[0,0,-1],roofs);
const window=owner('shop-window',[-2.57,1.44,-.06]);
box(window,[-2.57,1.44,-.06],[1.78,1.34,.14],darkTeal);
for(const x of [-3.02,-2.13])for(const y of [1.14,1.76])box(window,[x,y,.02],[.79,.53,.05],"#f9b948");
box(window,[-2.57,1.44,.065],[.065,1.34,.05],teal);box(window,[-2.57,1.44,.065],[1.77,.065,.05],teal);
for(let i=0;i<8;i++){const x=-3.25+(i%4)*.44,y=.93+Math.floor(i/4)*.64;box(window,[x,y,.065],[.13,.25,.025],"#df8c32");tube(window,[x,y+.16,.068],.035,.09,"#df8c32",[Math.PI/2,0,0]);}
screw(window,[-3.38,.86,.03],[0,0,1]);
const door=owner('shop-door',[-.50,1.34,-.045]);
box(door,[-.50,1.32,-.045],[1.17,1.98,.16],darkTeal);box(door,[-.50,1.70,.05],[.85,.91,.05],"#83b8aa");box(door,[-.50,.81,.05],[.85,.57,.055],"#37796d");ball(door,[-.88,1.17,.12],[.055,.055,.05],gold);
const open=owner('open-sign',[-.50,1.70,.11]);box(open,[-.50,1.70,.11],[.69,.37,.055],gold);text(open,'OPEN',[-.50,1.70,.15],.18,red);
screw(open,[-.50,1.70,.16],[0,0,1]);screw(door,[-.50,1.70,.084],[0,0,1]);screw(door,[-.90,.58,.057],[0,0,1]);
const awning=owner('striped-awning',[-2.57,2.10,.32]);
for(let i=0;i<6;i++){const x=-3.42+i*.34;box(awning,[x,2.13,.32],[.337,.12,.92],i%2?cream:redLight,[-.35,0,0]);box(awning,[x,1.97,.73],[.337,.25,.08],i%2?cream:redLight);}
screw(awning,[-2.74,2.03,.79],[0,0,1]);screw(awning,[-3.54,2.12,.32],[-1,0,0]);
// Interior merchandise is beneath removable shelves, cupboard doors and countertop.
for(let bay=0;bay<3;bay++){
 const x=-3.06+bay*1.4,part=owner(`store-shelf-${bay}`,[x,1.3,-3.1]);
 box(part,[x,1.35,-3.27],[1.12,1.68,.12],teal);
 for(const y of [.61,1.12,1.67,2.13])box(part,[x,y,-2.99],[1.18,.08,.64],ochre);
 for(let j=0;j<4;j++)for(const y of [.82,1.35,1.88]){const bx=x-.40+j*.27;box(part,[bx,y,-2.98],[.17,.27,.28],["#f0b44e",redLight,"#8ca382",cream][j]);box(part,[bx,y,-2.827],[.11,.08,.012],pale);}
 screw(part,[x,1.5,-3.195],[0,0,1],roofs);screw(part,[x-.40,2.18,-2.97],[0,1,0],roofs);
}
const counter=owner('counter',[-2.50,.78,-1.12]), counterTop=owner('countertop',[-2.50,1.17,-1.12]);
box(counter,[-2.50,.77,-1.12],[1.61,.77,.65],teal);box(counterTop,[-2.50,1.18,-1.12],[1.73,.12,.77],cream);
screw(counterTop,[-2.50,1.18,-.72],[0,0,1],roofs);screw(counter,[-2.5,1.164,-1.12],[0,1,0]);screw(counter,[-1.68,.65,-1.12],[1,0,0],roofs);
const till=owner('cash-register',[-2.70,1.40,-1.20]);box(till,[-2.70,1.34,-1.20],[.39,.22,.35],metal);box(till,[-2.70,1.51,-1.26],[.32,.19,.16],cream);box(till,[-2.70,1.51,-1.17],[.23,.10,.02],darkTeal);screw(till,[-2.90,1.34,-1.20],[-1,0,0],roofs);
for(let i=0;i<2;i++){
 const x=-.60+i*.65,body=owner(`cooler-${i}`,[x,1,-2.12]),lid=owner(`cooler-door-${i}`,[x,1.2,-1.83]);
 box(body,[x,1.18,-2.12],[.59,1.59,.58],cream);box(lid,[x,1.20,-1.805],[.54,1.48,.08],teal);box(lid,[x,1.40,-1.75],[.40,.84,.035],"#80b9b3");box(lid,[x+.17,.94,-1.72],[.04,.25,.035],metal);
 screw(lid,[x-.17,.66,-1.74],[0,0,1],roofs);screw(body,[x,1.5,-1.815],[0,0,1],roofs);
}
// Rooftop service equipment. The case and fan guard conceal separate roof heads.
const ac=owner('air-conditioner',[-2.94,3.10,-2.60]),fan=owner('fan-guard',[-2.94,3.15,-2.14]);
box(ac,[-2.94,3.10,-2.60],[1.02,.66,.85],pale);
for(let i=0;i<7;i++)box(ac,[-3.46,2.88+i*.065,-2.62],[.02,.032,.62],metal);
tube(ac,[-2.94,3.15,-2.155],.27,.055,charcoal,[Math.PI/2,0,0]);
shape(fan,"ring",[-2.94,3.15,-2.10],[.29,.29,.29],metal,[Math.PI/2,0,0]);
for(let i=0;i<5;i++){const a=i*Math.PI*2/5;box(fan,[-2.94+Math.cos(a)*.12,3.15+Math.sin(a)*.12,-2.09],[.28,.09,.035],"#b9b5ac",[0,0,a+.4]);}
screw(fan,[-2.94,3.15,-2.055],[0,0,1]);screw(ac,[-2.94,3.15,-2.108],[0,0,1]);screw(ac,[-3.46,3.0,-2.5],[-1,0,0]);
const dish=owner('satellite-dish',[-3.15,3.10,-.86]);beam(dish,[-3.15,2.79,-.86],[-3.15,3.22,-.86],.05,metal);
ball(dish,[-3.15,3.28,-.86],[.41,.36,.08],pale);beam(dish,[-3.15,3.24,-.80],[-2.95,3.44,-.45],.026,metal);ball(dish,[-2.95,3.44,-.45],[.05,.05,.06],metal);screw(dish,[-3.15,2.86,-.75],[0,0,1]);
const tower=owner('radio-tower',[-1.50,3.48,-2.98]),beacon=owner('beacon',[-1.50,4.47,-2.98]);
for(const side of [-1,1])for(const z of [-1,1])beam(tower,[-1.5+side*.29,2.8,-2.98+z*.24],[-1.5+side*.08,4.4,-2.98+z*.08],.032,metal);
for(let i=0;i<4;i++){const y=2.91+i*.34,r=.27-i*.043;for(const z of [-1,1]){beam(tower,[-1.5-r,y,-2.98+z*r],[-1.5+r*.8,y+.31,-2.98+z*r*.8],.018,metal);beam(tower,[-1.5+r,y,-2.98+z*r],[-1.5-r*.8,y+.31,-2.98+z*r*.8],.018,metal);}}
box(beacon,[-1.50,4.42,-2.98],[.29,.12,.29],ochre);ball(beacon,[-1.50,4.57,-2.98],[.105,.17,.105],redLight);
screw(beacon,[-1.50,4.42,-2.82],[0,0,1]);screw(tower,[-1.50,4.42,-2.98],[0,1,0]);screw(tower,[-1.79,2.83,-2.74],[-1,0,0]);
// Two rounded canopy halves, cream perimeter trim, warm inset lamps and red fascia.
const canopy:DesertPartId[]=[];
for(let i=0;i<2;i++){
 const x=.35+i*2.36,part=owner(`canopy-${i}`,[x,2.79,-.10]);canopy.push(part);
 box(part,[x,2.79,-.10],[2.35,.32,2.47],red);
 box(part,[x,2.97,-.10],[2.37,.09,2.50],pale);box(part,[x,3.035,-1.27],[2.37,.12,.09],pale);box(part,[x,3.035,1.08],[2.37,.12,.09],pale);
 box(part,[x,2.81,1.155],[1.5,.055,.04],gold);
 for(const dx of [-.66,.66])ball(part,[x+dx,2.60,.55],[.23,.055,.23],gold);
 screw(part,[x,2.985,-.35]);screw(part,[x,2.79,1.168],[0,0,1]);
}
for(const x of [-.47,3.48]){
 const part=owner(`column-${x}`,[x,1.42,.70]);tube(part,[x,1.42,.70],.17,2.31,pale);tube(part,[x,.45,.70],.19,.25,red);
 tube(part,[x,2.52,.70],.24,.13,cream);tube(part,[x,.34,.70],.25,.11,cream);
 screw(part,[x,2.43,.886],[0,0,1],canopy);screw(part,[x-.19,.45,.70],[-1,0,0]);
}
const gas=owner('gas-sign',[1.25,3.40,.15]),badge=owner('gas-badge',[1.25,4.01,.16]);
box(gas,[1.25,3.40,.15],[2.68,.75,.25],cream);box(gas,[1.25,3.40,.30],[2.55,.63,.10],red);text(gas,'GAS',[1.25,3.40,.382],.48);
for(const side of [-1,1])for(const dy of [-.18,0,.18])box(gas,[1.25+side*1.44,3.4+dy,.14],[.32,.09,.16],red);
tube(badge,[1.25,4.01,.16],.46,.22,cream,[Math.PI/2,0,0]);tube(badge,[1.25,4.01,.30],.40,.08,red,[Math.PI/2,0,0]);flame(badge,[1.25,3.98,.36],.51);
screw(badge,[1.25,3.72,.36],[0,0,1]);screw(gas,[1.25,3.72,.29],[0,0,1]);screw(gas,[.04,3.40,.37],[0,0,1]);
// Separate pump face plates and round globe toppers conceal their bodies' screws.
for(let i=0;i<2;i++){
 const x=.75+i*1.50,z=.60,body=owner(`pump-${i}`,[x,1.0,z]),face=owner(`pump-face-${i}`,[x,1.16,z+.30]),globe=owner(`pump-globe-${i}`,[x,1.99,z]);
 box(body,[x,.37,z],[.79,.16,.69],darkTeal);box(body,[x,.97,z],[.66,1.09,.53],redLight);box(body,[x,1.53,z],[.68,.13,.55],red);
 box(face,[x,1.10,z+.295],[.49,.84,.07],cream);box(face,[x,1.27,z+.338],[.34,.26,.02],darkTeal);
 for(let d=0;d<3;d++){box(face,[x-.10+d*.10,1.28,z+.352],[.055,.14,.013],pale);box(face,[x-.10+d*.10,1.28,z+.365],[.035,.02,.012],metal);}
 box(face,[x,.85,z+.34],[.30,.23,.025],gold);star(face,[x,.85,z+.37],.22,cream);
 tube(globe,[x,1.95,z],.30,.16,cream,[Math.PI/2,0,0]);tube(globe,[x,1.95,z+.10],.255,.07,redLight,[Math.PI/2,0,0]);star(globe,[x,1.95,z+.155],.40);
 curve(body,[[x-.32,1.44,z],[x-.52,1.18,z+.03],[x-.50,.52,z+.03],[x-.35,.47,z+.04],[x-.32,1.00,z+.05]],.034,charcoal);
 box(body,[x-.34,1.04,z+.05],[.10,.25,.08],metal,[0,0,-.25]);
 screw(globe,[x,1.95,z+.19],[0,0,1]);screw(face,[x,1.41,z+.35],[0,0,1]);screw(body,[x,1.40,z+.283],[0,0,1]);screw(body,[x,1.62,z],[0,1,0]);
}
for(let i=0;i<4;i++){
 const x=-.12+i*1.12,z=1.05,part=owner(`bollard-${i}`,[x,.58,z]);tube(part,[x,.57,z],.095,.59,gold);tube(part,[x,.64,z],.102,.11,cream);ball(part,[x,.87,z],[.095,.095,.095],gold);screw(part,[x,.55,z+.108],[0,0,1]);
}
// Bench, wall lamp, meter cabinet and an independently removable stack of tires.
const bench=owner('bench',[-2.60,.58,.47]);
for(let i=0;i<3;i++)box(bench,[-2.6,.60,.23+i*.17],[1.65,.09,.15],"#db9d4c");
for(const y of [.85,1.05])box(bench,[-2.6,y,.18],[1.65,.13,.10],"#db9d4c");
for(const x of [-3.23,-1.97]){box(bench,[x,.46,.45],[.09,.38,.58],teal);box(bench,[x,.85,.13],[.09,.63,.08],teal);}
screw(bench,[-3.23,.60,.76],[0,0,1]);screw(bench,[-1.97,.60,.76],[0,0,1]);
const lamp=owner('wall-lamp',[-3.55,1.85,.08]);curve(lamp,[[-3.55,1.85,-.04],[-3.55,2.1,.08],[-3.55,2.1,.25],[-3.55,1.95,.33]],.035,charcoal);tube(lamp,[-3.55,1.93,.33],.17,.07,charcoal);ball(lamp,[-3.55,1.83,.33],[.085,.12,.085],gold);screw(lamp,[-3.55,1.87,.0],[0,0,1]);
const meter=owner('meter-box',[-3.85,.95,-.80]);box(meter,[-3.85,.95,-.80],[.36,.73,.52],"#aaa599");box(meter,[-4.045,.95,-.80],[.035,.55,.38],cream);beam(meter,[-3.83,1.3,-.80],[-3.83,2.0,-.80],.035,metal);screw(meter,[-4.07,1.05,-.80],[-1,0,0]);
for(let i=0;i<3;i++){
 const x=-3.94+(i===2?.27:0),y=.23+i*.20,z=.35,part=owner(`spare-tire-${i}`,[x,y,z]);shape(part,"ring",[x,y,z],[.34,.34,.34],charcoal);
 for(let t=0;t<16;t++){const a=t*Math.PI/8;box(part,[x+Math.cos(a)*.335,y,z+Math.sin(a)*.335],[.08,.11,.10],"#53555a",[0,-a,0]);}
 screw(part,[x+.34,y+.065,z],[0,1,0]);
}
// Teal-and-cream vintage car. Panels expose seats, engine and chassis fasteners.
const cx=-.95,cz=2.60;
const chassis=owner('car-chassis',[cx,.57,cz]);box(chassis,[cx,.57,cz],[3.54,.29,1.44],teal);
const hood=owner('car-hood',[cx-1.20,1.02,cz]),trunk=owner('car-trunk',[cx+1.27,1.01,cz]),roof=owner('car-roof',[cx,1.66,cz]);
box(hood,[cx-1.20,.98,cz],[1.12,.48,1.45],teal);box(hood,[cx-1.38,1.24,cz],[.60,.08,1.38],"#68b5aa");
box(trunk,[cx+1.26,.94,cz],[.99,.42,1.43],teal);box(trunk,[cx+1.31,1.18,cz],[.88,.11,1.42],"#6bb5ab");
box(roof,[cx,1.72,cz],[1.74,.16,1.38],cream);
for(const x of [cx-.77,cx+.77])for(const side of [-1,1])beam(roof,[x,1.22,cz+side*.68],[cx+(x-cx)*.85,1.68,cz+side*.57],.034,cream);
// Glazing is split into panes with solid cream pillars, and falls with the roof.
for(const side of [-1,1])for(const dx of [-.40,.40])box(roof,[cx+dx,1.49,cz+side*.605],[.65,.34,.032],"#719da5");
for(const side of [-1,1])box(roof,[cx+side*.735,1.49,cz],[.035,.35,1.12],"#719da5",[0,0,side*.35]);
for(const side of [-1,1]){
 const part=owner(`car-door-${side}`,[cx,.99,cz+side*.70]);box(part,[cx,1.01,cz+side*.72],[1.73,.49,.10],teal);
 box(part,[cx,.89,cz+side*.779],[1.63,.035,.025],cream);box(part,[cx+.48,1.14,cz+side*.782],[.16,.035,.03],metal);
 ball(part,[cx-.76,1.25,cz+side*.82],[.10,.065,.07],cream);
 screw(part,[cx-.47,1.20,cz+side*.655],[0,0,-side]);screw(part,[cx+.44,.87,cz+side*.655],[0,0,-side]);
}
const grille=owner('car-grille',[cx-1.80,.83,cz]);box(grille,[cx-1.80,.84,cz],[.10,.43,1.18],cream);
for(let i=0;i<7;i++)box(grille,[cx-1.86,.84,cz-.40+i*.135],[.025,.25,.035],metal);
box(grille,[cx-1.88,.64,cz],[.12,.12,1.37],metal);
for(const side of [-1,1]){tube(grille,[cx-1.87,1.04,cz+side*.50],.17,.06,cream,[0,0,Math.PI/2]);ball(grille,[cx-1.91,1.04,cz+side*.50],[.045,.13,.13],gold);}
screw(grille,[cx-1.943,.82,cz],[-1,0,0]);screw(hood,[cx-1.78,1.01,cz],[-1,0,0]);screw(trunk,[cx+1.77,1.02,cz],[1,0,0]);
const luggage=owner('car-luggage',[cx,1.99,cz]);box(luggage,[cx,1.96,cz],[1.09,.34,.75],"#a46a39");
for(const dx of [-.35,.35]){box(luggage,[cx+dx,1.97,cz],[.09,.38,.79],"#654d39");box(luggage,[cx+dx,1.99,cz+.407],[.11,.12,.03],gold);}
box(luggage,[cx,2.17,cz],[.25,.06,.06],ochre);screw(luggage,[cx,1.99,cz+.40],[0,0,1]);screw(roof,[cx,1.815,cz]);
const engine=owner('car-engine',[cx-1.14,.79,cz]);box(engine,[cx-1.14,.77,cz],[.60,.27,.72],metal);for(let i=0;i<5;i++)tube(engine,[cx-1.3+i*.08,.94,cz],.023,.42,charcoal,[Math.PI/2,0,0]);screw(engine,[cx-1.14,.93,cz]);
for(let i=0;i<2;i++){
 const x=cx-.34+i*.72,part=owner(`car-seat-${i}`,[x,.94,cz]);box(part,[x,.83,cz],[.55,.16,1.03],"#c7895e");box(part,[x+.15,1.10,cz],[.14,.55,1.03],"#c7895e");screw(part,[x,.92,cz]);
}
screw(chassis,[cx,.73,cz-.36]);screw(chassis,[cx-.98,.73,cz+.30]);screw(chassis,[cx+1.02,.73,cz-.30]);
for(const dx of [-1.10,1.12])for(const side of [-1,1]){
 const x=cx+dx,z=cz+side*.77,part=owner(`car-wheel-${dx}-${side}`,[x,.53,z]);
 tube(part,[x,.53,z],.36,.19,charcoal,[Math.PI/2,0,0]);tube(part,[x,.53,z+side*.105],.27,.03,cream,[Math.PI/2,0,0]);tube(part,[x,.53,z+side*.13],.17,.04,metal,[Math.PI/2,0,0]);ball(part,[x,.53,z+side*.16],[.10,.10,.03],red);
 for(let j=0;j<18;j++){const a=j*Math.PI/9;box(part,[x+Math.cos(a)*.352,.53+Math.sin(a)*.352,z],[.08,.06,.18],"#4d5157",[0,0,a]);}
 screw(part,[x,.53,z-side*.12],[0,0,-side]);
}
// Motel sign with starburst, bulbs, directional arrow and a separate bed plaque.
const signX=3.88,signZ=-2.18;
for(const side of [-1,1]){
 const x=signX+side*.34,part=owner(`motel-post-${side}`,[x,1.62,signZ]);box(part,[x,1.62,signZ],[.17,3.05,.18],darkTeal);
 screw(part,[x,2.6,signZ+.11],[0,0,1]);screw(part,[x,.52,signZ+.11],[0,0,1]);
}
const motel=owner('motel-sign',[signX,3.33,signZ+.06]),motelStar=owner('motel-star',[signX-.50,4.08,signZ+.18]),arrow=owner('motel-arrow',[signX,2.72,signZ+.12]),bed=owner('bed-sign',[signX,2.02,signZ+.09]);
box(motel,[signX,3.33,signZ+.06],[2.14,.93,.25],teal);box(motel,[signX,3.33,signZ+.22],[2.02,.82,.11],red);text(motel,'MOTEL',[signX,3.33,signZ+.32],.40);
for(let i=0;i<7;i++)for(const side of [-1,1])ball(motel,[signX-.88+i*.295,3.33+side*.35,signZ+.31],[.043,.043,.027],gold);
star(motelStar,[signX-.50,4.08,signZ+.18],1.17);star(motelStar,[signX-.50,4.08,signZ+.27],.72,pale);
box(arrow,[signX,2.72,signZ+.12],[1.88,.34,.22],gold);shape(arrow,"cone",[signX-1.03,2.72,signZ+.12],[.31,.65,.10],gold,[0,0,Math.PI/2]);for(let i=0;i<6;i++)ball(arrow,[signX-.80+i*.3,2.72,signZ+.25],[.045,.045,.025],pale);
box(bed,[signX,2.04,signZ+.09],[1.57,.65,.18],cream);for(const side of [-1,1])box(bed,[signX+side*.55,2.04,signZ+.20],[.07,.31,.035],"#966343");box(bed,[signX,2.02,signZ+.20],[1.04,.16,.035],"#966343");ball(bed,[signX-.35,2.18,signZ+.20],[.12,.10,.035],"#966343");
screw(motelStar,[signX-.5,4.08,signZ+.36],[0,0,1]);screw(motel,[signX-.50,3.72,signZ+.31],[0,0,1]);screw(motel,[signX+.85,3.33,signZ+.33],[0,0,1]);screw(arrow,[signX-.65,2.72,signZ+.28],[0,0,1]);screw(bed,[signX+.57,2.24,signZ+.20],[0,0,1]);
// Terraced red mesa, with naturally hidden fixings between rock layers.
for(let tier=0;tier<3;tier++)for(let j=0;j<3-tier;j++){
 const x=1.2+j*1.13+tier*.33,z=-3.38+(j%2)*.18,y=.08+tier*1.10;
 const part=rock(`mesa-${tier}-${j}`,[x,y,z],[1.70-tier*.15,1.42,1.67], ["#cc7958","#d98962","#df9570"][tier],tier*7+j);
 screw(part,[x,y+1.445,z]);screw(part,[x+.20,y+.36,z-.78],[0,0,-1]);
}
// Telegraph poles and three independently removable, sagging cables.
const poles:DesertPartId[]=[];
for(const side of [-1,1]){
 const x=side*4.47,z=-3.65,part=owner(`utility-pole-${side}`,[x,2,z]);poles.push(part);
 box(part,[x,2,z],[.19,3.91,.22],"#9c633c");box(part,[x,3.82,z],[1.25,.20,.24],"#ae7345");
 for(const dx of [-.48,0,.48]){tube(part,[x+dx,4.02,z],.065,.17,pale);tube(part,[x+dx,4.11,z],.043,.035,charcoal);}
 for(const dx of [-.42,.42])beam(part,[x,3.28,z],[x+dx,3.74,z],.04,ochre);
 screw(part,[x,3.82,z+.14],[0,0,1]);screw(part,[x,1.26,z+.13],[0,0,1]);
}
for(let i=0;i<3;i++){
 const z=-3.65+(i-1)*.10,part=owner(`power-line-${i}`,[0,3.65,z]);curve(part,[[-4.47+(i-1)*.48,4.11,z],[-2.0,3.52,z],[1.9,3.52,z],[4.47+(i-1)*.48,4.11,z]],.018,charcoal);
 // A small terminal clamp is part of each cable, with its own real fixing.
 box(part,[-4.47+(i-1)*.48,4.13,z],[.15,.10,.13],ochre);screw(part,[-4.47+(i-1)*.48,4.19,z]);
}
// Flowering cacti, rock clusters and desert succulents frame the complete scene.
const cactusRoots:Vector[]=[[-4.42,.08,-1.72],[-4.53,.08,1.03],[4.52,.08,-.45],[4.40,.08,1.08],[2.93,.08,-.97],[4.13,.08,3.97]];
for(const [i,[x,y,z]] of cactusRoots.entries()){
 const h=i%2?1.05:1.62,r=i%2?.16:.20,part=owner(`cactus-${i}`,[x,y+h*.5,z]);
 tube(part,[x,y+h*.5,z],r,h,"#779d3f");ball(part,[x,y+h,z],[r,r*.7,r],"#8caf4d");
 for(const side of [-1,1]){beam(part,[x+side*r*.8,y+h*.40,z],[x+side*r*2.2,y+h*.45,z],r*.60,"#779d3f");tube(part,[x+side*r*2.2,y+h*.59,z],r*.6,h*.30,"#779d3f");ball(part,[x+side*r*2.2,y+h*.74,z],[r*.6,r*.6,r*.6],"#8caf4d");}
 for(let ridge=0;ridge<9;ridge++){const a=ridge*Math.PI*2/9,dx=Math.cos(a)*r*.97,dz=Math.sin(a)*r*.97;beam(part,[x+dx,y+.10,z+dz],[x+dx,y+h-.07,z+dz],.009,"#b3bf68");for(const cy of [.25,.52,.78])ball(part,[x+dx*1.07,y+h*cy,z+dz*1.07],[.018,.018,.018],"#536537");}
 for(let p=0;p<5;p++){const a=p*Math.PI*2/5;ball(part,[x+Math.cos(a)*.07,y+h+.08,z+Math.sin(a)*.07],[.065,.045,.055],"#f28ab3");}
 screw(part,[x,y+h*.40,z-r-.015],[0,0,-1]);
}
const smallRocks:Vector[]=[[-4.20,.08,3.95],[-3.50,.08,4.25],[3.25,.08,4.12],[-4.38,.08,-.45],[3.94,.08,2.97]];
for(const [i,p] of smallRocks.entries()){
 const a=rock(`boulder-${i}`,p,[.95,.58,.83],i%2?"#d57e60":"#c96e56",i+8);
 screw(a,[p[0],p[1]+.60,p[2]]);
 for(let j=0;j<3;j++)ball(a,[p[0]+Math.sin(j*4)*.42,p[1]+.08,p[2]+Math.cos(j*4)*.42],[.12,.08,.11],ochre);
}
for(const [i,p] of [[-3.3,.08,3.97],[3.3,.08,3.77],[4.23,.08,2.60],[-4.2,.08,2.8]].entries()){
 const [x,y,z]=p,part=owner(`agave-${i}`,[x,y+.18,z]);
 for(let j=0;j<9;j++){const a=j*2.4;shape(part,"cone",[x+Math.cos(a)*.14,y+.20,z+Math.sin(a)*.14],[.075,.55,.08],j%2?"#9bab55":"#7f9849",[Math.sin(a)*.7,0,Math.cos(a)*.7]);}
 screw(part,[x,y+.035,z],[0,1,0]);
}
// Roadside barrels, supply crate, repair barrier, cone and timber fence.
for(let i=0;i<2;i++){
 const x=3.15+i*.73,z=.65+(i%2)*.33,part=owner(`barrel-${i}`,[x,.63,z]),lid=owner(`barrel-lid-${i}`,[x,1.19,z]);
 tube(part,[x,.64,z],.34,1.04,i?"#44869c":redLight);
 for(const y of [.22,.64,1.05])shape(part,"ring",[x,y,z],[.342,.342,.342],i?"#83b6c5":"#ef9475");
 tube(lid,[x,1.18,z],.35,.06,i?"#73a8b8":"#e8765c");flame(part,[x,.65,z+.35],.28);
 screw(lid,[x,1.22,z]);screw(part,[x,1.17,z]);
}
const crate=owner('supply-crate',[4.25,.48,2.15]),crateLid=owner('crate-lid',[4.25,.90,2.15]);box(crate,[4.25,.49,2.15],[.82,.77,.76],"#b67941");box(crateLid,[4.25,.91,2.15],[.89,.09,.83],"#d39b55");
for(const side of [-1,1])for(const x of [3.92,4.58])box(crate,[x,.49,2.15+side*.39],[.075,.73,.045],"#e1ac6b");
for(const side of [-1,1])box(crate,[4.25,.49,2.15+side*.40],[.065,.86,.05],"#e1ac6b",[0,0,side*.73]);screw(crateLid,[4.25,.975,2.15]);screw(crate,[4.25,.89,2.15]);screw(crate,[4.67,.49,2.15],[1,0,0]);
const barrier=owner('road-barrier',[2.3,.68,3.91]);
for(const x of [1.65,2.95])for(const s of [-1,1])box(barrier,[x,.46,3.91+s*.13],[.17,.82,.17],"#817561",[s*.20,0,0]);box(barrier,[2.3,.90,3.91],[1.85,.38,.13],pale);
for(let i=0;i<5;i++)box(barrier,[1.54+i*.35,.90,3.99],[.15,.42,.025],redLight,[0,0,-.55]);
for(const x of [1.67,2.93]){tube(barrier,[x,1.22,3.91],.15,.08,ochre,[Math.PI/2,0,0]);ball(barrier,[x,1.22,3.98],[.12,.12,.045],gold);}
screw(barrier,[1.65,.77,4.0],[0,0,1]);screw(barrier,[2.95,.77,3.82],[0,0,-1]);
const cone=owner('traffic-cone',[.90,.39,4.10]);box(cone,[.90,.16,4.10],[.52,.12,.52],red);shape(cone,"cone",[.90,.49,4.10],[.19,.63,.19],"#f49c38");tube(cone,[.90,.47,4.10],.14,.11,pale);screw(cone,[.90,.18,4.38],[0,0,1]);
for(let i=0;i<3;i++){
 const x=-1.20+i*.95,part=owner(`fence-${i}`,[x,.45,4.53]);box(part,[x,.45,4.53],[.18,.78,.18],"#9d653c");
 if(i<2){box(part,[x+.47,.46,4.53],[.86,.16,.10],"#b7824f");box(part,[x+.47,.69,4.53],[.86,.12,.10],"#c5915c");}
 screw(part,[x,.63,4.64],[0,0,1]);
}
const route=owner('route-sign',[-3.13,.98,3.87]);box(route,[-3.13,.79,3.87],[.14,1.40,.16],"#94613c");
box(route,[-3.13,1.49,3.87],[.89,.96,.15],cream);box(route,[-3.13,1.77,3.96],[.84,.31,.035],red);text(route,'ROUTE',[-3.13,1.77,3.995],.16);
// Two original extruded sixes built from rings and stems.
for(const x of [-3.32,-2.96]){shape(route,"ring",[x,1.30,3.98],[.13,.13,.13],charcoal,[Math.PI/2,0,0]);box(route,[x-.10,1.45,3.98],[.055,.28,.04],charcoal);box(route,[x,1.58,3.98],[.19,.05,.04],charcoal);}
screw(route,[-3.13,.40,3.97],[0,0,1]);
// Terrain fixings sit beneath actual props; avoid turning the broad sand into an opening sweep.
const groundCovers:Vector[]=[[-3.94,.08,.35],[-2.6,.08,.45],[-2.94,.08,-2.6],[-.5,.08,-2.12],[.75,.08,.60],[2.25,.08,.60],...[...cactusRoots,...smallRocks].map(([x,,z])=>[x,.08,z] as Vector),[4.25,.08,2.15],[.90,.08,4.10],[-1.2,.08,4.53],[-3.13,.08,3.87]];
for(const tile of ground){
 const covers=groundCovers.filter(([x,,z])=>Math.abs(x-tile.x)<1.49&&Math.abs(z-tile.z)<1.49);
 for(const [index,point] of covers.slice(0,3).entries())screw(tile.part,[point[0]+(index%2)*.09,.084,point[2]]);
 if(!covers.length)screw(tile.part,[tile.x,.084,tile.z]);
}
// Spend the remaining fasteners on structural surfaces, never extra exposed trinkets.
for(const part of walls){const first=DESERT_MOUNTS.find(m=>m.attachedTo===part)!;screw(part,[first.position[0],first.position[1]-.42,first.position[2]],first.normal,roofs);}
for(const [i,part] of roofs.entries())screw(part,[-2.94+i*1.55,2.795,-1.15]);
for(const [i,part] of canopy.entries())screw(part,[-.84+i*2.36,2.82,.75],[-1,0,0]);
for(const [i,part] of floors.entries())for(const dx of [-.7,0,.7])screw(part,[-2.55+i*2.2+dx,.40,-2.98]);
for(const [i,part] of paving.entries())screw(part,[-2.8+i*1.7,.20,-.31],[0,0,-1]);
for(const [i,part] of roadParts.entries())screw(part,[(i-1)*3.31,.19,2.60]);
for(const tile of ground.slice(0,5))screw(tile.base,[tile.x,-.155,tile.z-.75]);
// Natural covers and inward/underside mounts define the opening difficulty.
const seen=new Map<DesertPartId,number>();
for(const mount of DESERT_MOUNTS){
 const part=mount.attachedTo,index=seen.get(part)??0;seen.set(part,index+1);
 if(part.startsWith("desert-shop-roof-")){
  const bay=Number(part.at(-1));
  mount.position=bay===0?[-3.15+index*.20,2.795,-2.60]:bay===1?[-1.7+index*.18,2.795,-2.98]:[.16+index*.15,2.795,-.85+index*.23];mount.normal=[0,1,0];
 }
 if(part.startsWith("desert-canopy-")){
  const bay=Number(part.at(-1));mount.position=[bay===0?.3+index*.33:1.85+index*.25,2.985,.15];mount.normal=[0,1,0];
 }
 if(part.startsWith("desert-sidewalk-")&&index<2){const bay=Number(part.at(-1));mount.position=[bay===0?(index?-1.99:-3.23):bay===1?-.50+index*.10:bay===2?.65+index*.20:2.15+index*.20,.335,bay===0?.45:.60];mount.normal=[0,1,0];}
 if(part==="desert-radio-tower"&&index===1){mount.position=[-1.65,2.88,-2.98];mount.normal=[0,1,0];}
 if(part==="desert-air-conditioner"&&index===0)mount.position=[-2.94,3.15,-2.18];
 if(part.startsWith("desert-pump-")&&!part.includes("face")&&!part.includes("globe")&&index===0)mount.position[2]-=.045;
 if(part.startsWith("desert-barrel-")&&!part.includes("lid"))mount.position[1]=1.12;
 if(part==="desert-supply-crate"&&index===0)mount.position[1]=.84;
 if(part==="desert-supply-crate"&&index===1){mount.position=[4.25,.085,2.15];mount.normal=[0,-1,0];}
 if(/^desert-(cactus-[1-5]|boulder-[1-4]|fence-|traffic-cone)/.test(part)){
  const pivot=pivots[part];mount.position=[pivot[0],part.includes("fence")?.045:part.includes("cone")?.085:.07,pivot[2]];mount.normal=[0,-1,0];
 }
 if(part.startsWith("desert-utility-pole-")){
  const pivot=pivots[part];mount.position=index===0?[pivot[0],4.075,pivot[2]]:[pivot[0],.030,pivot[2]];mount.normal=index===0?[0,1,0]:[0,-1,0];
 }
 if(part.startsWith("desert-motel-post-")){
  const pivot=pivots[part];mount.position=index===0?[pivot[0],2.04,pivot[2]+.105]:[pivot[0],.085,pivot[2]];mount.normal=index===0?[0,0,1]:[0,-1,0];
 }
 if(part.startsWith("desert-shop-wall-")&&part.endsWith("-1")&&part.includes("wall-1")){mount.position[2]=-1.63;}
}
// Small trim tabs attach the pump face to the neck beneath its globe.
for(let i=0;i<2;i++)box(`desert-pump-face-${i}`,[.75+i*1.5,1.53,.60],[.17,.10,.65],cream);
for(const p of pieces.filter(p=>p.part==="desert-road-barrier"))p.position[2]-=.60;
pivots["desert-road-barrier"][2]-=.60;
for(const m of DESERT_MOUNTS.filter(m=>m.attachedTo==="desert-road-barrier"))m.position[2]-=.60;
for(const part of ["desert-road-2","desert-road-0"] as const){
 const heads=DESERT_MOUNTS.filter(m=>m.attachedTo===part);
 if(part==="desert-road-2")heads.forEach((m,i)=>m.position=[i===1?2.95:1.70,.19,i===2?3.18:3.44]);
 else heads[2].position=[-2.7,.19,2.60];
}
for(const m of DESERT_MOUNTS.filter(m=>m.attachedTo==="desert-sidewalk-3").slice(2)){m.position=[2.25,.335,.40];m.normal=[0,1,0];}
const slots=new Map<DesertPartId,number>();
for(const m of DESERT_MOUNTS){const part=m.attachedTo,i=slots.get(part)??0;slots.set(part,i+1);
 if(part.startsWith("desert-column-")){const p=pivots[part];m.position=[p[0]-.09+i*.18,2.60,.70];m.normal=[0,1,0];}
 if(part.startsWith("desert-pump-face-")){m.position=[pivots[part][0],1.59,.60];m.normal=[0,1,0];}
 if(part==="desert-air-conditioner"){m.position=[-3.05+i*.16,3.15,-2.18];m.normal=[0,0,1];}
 if(part==="desert-shop-door"){m.position=[-.66+i*.32,1.70,.045];m.normal=[0,0,1];}
 if(part==="desert-gas-sign"){m.position=[1.12+i*.26,3.79,.15];m.normal=[0,1,0];}
 if(part==="desert-motel-sign"){m.position=i===0?[signX-.5,3.81,signZ+.13]:[signX+.5,2.85,signZ+.12];m.normal=i===0?[0,1,0]:[0,-1,0];}
 if(part==="desert-road-barrier"){m.position=i===0?[1.8,.90,3.43]:[2.80,.90,3.22];m.normal=i===0?[0,0,1]:[0,0,-1];}
 if(part.startsWith("desert-agave-")){const p=pivots[part];m.position=[p[0],.01,p[2]];m.normal=[0,-1,0];}
 if(part==="desert-striped-awning"){m.position=[i===0?-3.30:-1.80,2.30,-.095];m.normal=[0,0,-1];}
 if(part==="desert-meter-box"){m.position=[-3.66,.95,-.80];m.normal=[1,0,0];m.solutionAfter=roofs;}
 if(part==="desert-wall-lamp"){m.position=[-3.55,1.85,-.09];m.normal=[0,0,-1];}
 if(part==="desert-power-line-0"||part==="desert-power-line-2"){m.position=[m.position[0],4.065,-3.65];m.normal=[0,-1,0];}
 if(part==="desert-bed-sign"){m.position=[signX,2.38,signZ+.09];m.normal=[0,1,0];}
 if(part.startsWith("desert-car-seat-")){const p=pivots[part];m.position=[p[0]+.15,1.39,p[2]];m.normal=[0,1,0];}
 if(part.startsWith("desert-mesa-")){
  const tier=Number(part.split("-")[2]),j=Number(part.split("-")[3]),p=pivots[part];
  const x=tier===0&&j===2?3.1:tier===1&&j===1?2.42:p[0];
  m.position=[x+(i?-.10:.10),p[1]+.725,p[2]];m.normal=[0,1,0];
 }
}
// Place ground fixings beneath early-removable props: otherwise an underside-mounted cactus
// and the sand beneath it would incorrectly hold one another in place.
for(const tile of ground){
 const heads=DESERT_MOUNTS.filter(m=>m.attachedTo===tile.part);
 const targets:Vector[]=tile.z<0?(tile.x<0?[[-2.9,.084,-2.6],[-2.5,.084,-2.5]]:tile.x===0?[[-.5,.084,-2.12],[.2,.084,-2.12]]:[[2.3,.084,-3.4],[3.0,.084,-3.4]]):
  tile.z===0?(tile.x<0?[[-3.23,.084,.45],[-2.6,.084,.45],[-3.94,.084,.35]]:tile.x===0?[[.75,.084,.60],[-.50,.084,.60],[.85,.084,.60]]:[[2.25,.084,.60],[3.15,.084,.65],[3.88,.084,.98]]):
  tile.x<0?[[-2.4,.084,2.55],[-2.1,.084,2.6]]:tile.x===0?[[-.5,.084,2.55],[.4,.084,2.60]]:[[2.95,.084,3.43],[3.31,.084,2.6]];
 for(const [i,head] of heads.entries()){head.position=[...targets[i%targets.length]];if(i>=targets.length)head.position[0]+=.18;}
}
for(const x of [-3.30,-1.80])box(awning,[x,2.25,-.005],[.16,.42,.15],cream);
box("desert-power-line-1",[4.47,4.13,-3.65],[.15,.10,.13],ochre);
for(const p of pieces.filter(p=>(p.part==="desert-power-line-0"||p.part==="desert-power-line-2")&&p.geometry===rounded))p.size[2]=.25;
// A low plinth fixes the tower to its roof panel.
box(tower,[-1.5,2.825,-2.98],[.85,.08,.78],"#bdb4a7");
// Fixings under furniture/decor, rather than unrelated logical dependencies.
// All transforms are shared by drawing, mesh rays and Rapier convex hulls.
box(tower,[-1.5,4.365,-2.98],[.27,.08,.27],metal);
tube(fan,[-2.94,3.15,-2.07],.065,.07,metal,[Math.PI/2,0,0]);
// Lift the roadside sign clear of the canopy; keep its posts planted in the sand.
for(const p of pieces){
 if(/^desert-motel-(star|sign|arrow)$/.test(p.part)||p.part==="desert-bed-sign")p.position[1]+=.35;
 if(p.part.startsWith("desert-motel-post-")){p.position[1]+=.175;p.size[1]+=.35;}
 if(p.part==="desert-route-sign")p.position[0]-=1.10;
}
for(const [part,pivot] of Object.entries(pivots)){
 if(/^desert-motel-(star|sign|arrow)$/.test(part)||part==="desert-bed-sign")pivot[1]+=.35;
 if(part.startsWith("desert-motel-post-"))pivot[1]+=.175;
 if(part==="desert-route-sign")pivot[0]-=1.10;
}
for(const m of DESERT_MOUNTS){
 if(/^desert-motel-(star|sign|arrow)$/.test(m.attachedTo)||m.attachedTo==="desert-bed-sign")m.position[1]+=.35;
 if(m.attachedTo.startsWith("desert-motel-post-")&&m.normal[1]===0)m.position[1]+=.35;
 if(m.attachedTo==="desert-route-sign")m.position[0]-=1.10;
}
DESERT_MOUNTS.find(m=>m.attachedTo==="desert-boulder-0")!.position[0]-=.27;
// The motel's eight-ray neon-style starburst mirrors the reference silhouette.
const burstShape=new Shape();
for(let i=0;i<16;i++){const a=Math.PI/2+i*Math.PI/8,r=i%2?.14:.40;if(i===0)burstShape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else burstShape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}burstShape.closePath();
const burst=new ExtrudeGeometry(burstShape,{depth:.14,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2}).translate(0,0,-.07);
for(const p of pieces.filter(p=>p.part===motelStar))p.geometry=burst;
const matrix=new Matrix4(), euler=new Euler();
for(const p of pieces){if(!p.rotation)continue;const source=p.geometry??(p.kind==="cylinder"?cylinder:null);if(!source)continue;
 matrix.makeRotationFromEuler(euler.set(...p.rotation)).scale(new Vector3(...p.size));p.geometry=source.clone().applyMatrix4(matrix);p.size=[1,1,1];p.rotation=undefined;}
export const DESERT_MODEL={pieces,pivots,parts:Object.keys(pivots) as DesertPartId[]};
if(import.meta.hot)import.meta.hot.dispose(()=>{const geometries=new Set(pieces.flatMap(p=>p.geometry?[p.geometry]:[]));geometries.add(rounded);geometries.add(cylinder);geometries.forEach(g=>g.dispose());});
