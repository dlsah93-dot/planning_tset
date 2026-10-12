import { D, type Dataset, type Sale, type Recipe, type InventoryEvent } from './data';
import type Decimal from 'decimal.js';
export function recipeRows(data:Dataset,menuId:string,version:string,channel:string):Recipe[]{
  const all=data.recipes.filter(r=>r.menu_id===menuId&&r.recipe_version===version);
  if(!all.length)throw new Error(`${menuId}: 레시피 ${version} 없음`);
  return all.filter(r=>!r.channel_only||r.channel_only===channel);
}
export function unitCosts(data:Dataset,menuId:string,version:string,channel:string,date:string){
  let food=D(0),packaging=D(0);
  const usage: {material_id:string;quantity:string;unit:string}[]=[];
  for(const r of recipeRows(data,menuId,version,channel)){
    const material=data.materials.find(m=>m.material_id===r.material_id);
    const price=data.price_history.filter(p=>p.material_id===r.material_id&&p.effective_date<=date).sort((a,b)=>b.effective_date.localeCompare(a.effective_date))[0];
    if(!material||material.unit!==r.unit||!price||D(price.pack_quantity).lte(0))throw new Error(`${r.material_id}: ${date} 원가·단위 자료를 확인하세요.`);
    const value=D(r.quantity).mul(price.pack_price).div(price.pack_quantity);
    if(['I10','I11'].includes(r.material_id))packaging=packaging.plus(value);else food=food.plus(value);
    usage.push({material_id:r.material_id,quantity:r.quantity,unit:r.unit});
  }
  return{food,packaging,usage};
}
export function amounts(s:Sale){
  const food=D(s.quantity).mul(s.unit_food_cost_snapshot),packaging=D(s.quantity).mul(s.unit_packaging_cost_snapshot),net=D(s.net_sales),fee=D(s.payment_fee);
  return{gross:D(s.quantity).mul(s.unit_price),discount:D(s.discount_amount),net,fee,food,packaging,profit:net.minus(food).minus(packaging).minus(fee),quantity:D(s.quantity)};
}
export type Totals=ReturnType<typeof amounts>;
export function totals(sales:Sale[]):Totals{
  const sum:Totals={gross:D(0),discount:D(0),net:D(0),fee:D(0),food:D(0),packaging:D(0),profit:D(0),quantity:D(0)};
  for(const s of sales){const a=amounts(s);for(const key of Object.keys(sum) as (keyof Totals)[])sum[key]=sum[key].plus(a[key]);}return sum;
}
export function profitability(data:Dataset,sales:Sale[]){const byMenu=new Map<string,Sale[]>();for(const s of sales){const rows=byMenu.get(s.menu_id)??[];rows.push(s);byMenu.set(s.menu_id,rows);}return data.menus.map(menu=>({menu,...totals(byMenu.get(menu.menu_id)??[])}));}
export interface History {date:string;id:string;type:string;quantity:string;reason:string;counted?:string;originalDifference?:string;recalculatedDifference?:string;ending?:string}
export interface Stock {material_id:string;balance:string;receipts:string;usage:string;waste:string;lastAudit?:InventoryEvent;history:History[];error?:string}
export function inventory(data:Dataset,asOf:string,from=data.meta.start_date):Stock[]{
  const flows=new Map<string,Map<string,{receipt:Decimal;usage:Decimal;waste:Decimal;events:InventoryEvent[];audits:InventoryEvent[];saleCount:number}>>();
  const get=(mid:string,date:string)=>{let days=flows.get(mid);if(!days){days=new Map();flows.set(mid,days);}let item=days.get(date);if(!item){item={receipt:D(0),usage:D(0),waste:D(0),events:[],audits:[],saleCount:0};days.set(date,item);}return item;};
  const recipeCache=new Map<string,Recipe[]>(); let globalError:string|undefined;
  for(const sale of data.sales){if(sale.date>asOf)continue;const key=[sale.menu_id,sale.recipe_version,sale.channel].join('|');try{let rows=recipeCache.get(key);if(!rows){rows=recipeRows(data,sale.menu_id,sale.recipe_version,sale.channel);recipeCache.set(key,rows);}for(const r of rows){const f=get(r.material_id,sale.date);f.usage=f.usage.plus(D(sale.quantity).mul(r.quantity));f.saleCount++;}}catch(e){globalError=(e as Error).message;}}
  data.inventory_events.forEach(e=>{if(e.date>asOf)return;const f=get(e.material_id,e.date);if(e.event_type==='실사조정')f.audits.push(e);else{f.events.push(e);if(e.event_type==='입고')f.receipt=f.receipt.plus(e.quantity);else f.waste=f.waste.plus(D(e.quantity).abs());}});
  return data.materials.map(material=>{
    const opening=data.opening_inventory.find(r=>r.material_id===material.material_id&&r.date===data.meta.start_date);
    let balance=D(opening?.quantity??0),receipts=D(0),usage=D(0),waste=D(0),lastAudit:InventoryEvent|undefined,error=globalError;
    if(!opening||opening.unit!==material.unit)error='초기재고·단위 자료 없음';
    const history:History[]=opening?[{date:opening.date,id:'초기재고',type:'초기재고',quantity:opening.quantity,reason:'첫날 영업 시작 전',ending:opening.quantity}]:[];
    const days=flows.get(material.material_id)??new Map<string,ReturnType<typeof get>>();
    for(const [date,f] of [...days.entries()].sort(([a],[b])=>a.localeCompare(b))){
      balance=balance.plus(f.receipt).minus(f.usage).minus(f.waste);
      if(date>=from){receipts=receipts.plus(f.receipt);usage=usage.plus(f.usage);waste=waste.plus(f.waste);}
      for(const event of f.events)history.push({date,id:event.event_id,type:event.event_type,quantity:event.quantity,reason:event.reason});
      if(!f.usage.eq(0))history.push({date,id:`판매-${date}`,type:'판매 사용',quantity:f.usage.neg().toString(),reason:`해당 날짜 판매 집계 ${f.saleCount}개 기록의 레시피 사용량`});
      const audits=f.audits.sort((a,b)=>(a.sequence??0)-(b.sequence??0));
      for(let i=0;i<audits.length;i++){const audit=audits[i];if(audit.counted_quantity==null){error=`${audit.event_id} 실제 확인량 없음`;continue;}const diff=D(audit.counted_quantity).minus(balance);history.push({date,id:audit.event_id,type:'실사조정',quantity:diff.toString(),counted:audit.counted_quantity,originalDifference:audit.quantity,recalculatedDifference:diff.toString(),reason:audit.reason+(i<audits.length-1?' · 같은 날 이전 확인':' · 당일 최종 기준'),ending:i===audits.length-1?audit.counted_quantity:undefined});}
      if(audits.length){lastAudit=audits.at(-1);if(lastAudit?.counted_quantity!=null)balance=D(lastAudit.counted_quantity);}
    }
    return{material_id:material.material_id,balance:balance.toString(),receipts:receipts.toString(),usage:usage.toString(),waste:waste.toString(),lastAudit,history:history.filter(h=>h.date>=from).reverse(),error};
  });
}
