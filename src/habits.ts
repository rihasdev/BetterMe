export type Habit={id:string;category:string;title:string;target:number;unit:string;from?:string;archived?:string};
export const categories=['Deen','Character','Strength','Mobility','Health','Mind','Communication','Relationships','Career','Business','Discipline'];
const check=(id:string,category:string,title:string):Habit=>({id,category,title,target:1,unit:'check'});
const quantity=(id:string,category:string,title:string,target:number,unit:string):Habit=>({id,category,title,target,unit});
export const defaults:Habit[]=[
 ...['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(p=>check(p.toLowerCase(),'Deen',p)),
 quantity('quran','Deen','Quran with meaning',10,'min'),check('adhkar-am','Deen','Morning adhkar'),check('adhkar-pm','Deen','Evening adhkar'),check('dua','Deen','Dua & istighfar'),
 check('kindness','Character','An act of kindness'),check('speech','Character','Practise truthful, gentle speech'),check('patience','Character','Practise patience'),
 check('training','Strength','Training or active recovery'),quantity('walk','Strength','Walking / movement',20,'min'),quantity('mobility','Mobility','Mobility / stretching',10,'min'),
 quantity('water','Health','Water',2,'L'),quantity('sleep','Health','Sleep',8,'h'),quantity('daylight','Health','Outdoor daylight',10,'min'),check('nutrition','Health','Nutritious meals'),
 check('hard-task','Mind','Complete one challenging task'),quantity('journal','Mind','Reflection / journaling',5,'min'),
 quantity('speaking','Communication','Speaking practice',5,'min'),check('listen','Communication','Listen attentively'),
 check('family','Relationships','Quality time with family'),check('connect','Relationships','Meaningful conversation'),
 quantity('career','Career','Professional learning',45,'min'),quantity('business','Business','Side business',30,'min'),
 quantity('reading','Discipline','Reading',10,'pages'),check('focus','Discipline','Limit unnecessary scrolling')
];
