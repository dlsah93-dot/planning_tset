import { D, today, validDate, validateReferences, type Dataset, type Sale } from '../domain/data';
import { amounts, inventory, unitCosts } from '../domain/calculations';
import { db, readState, type CafeDB, type State, type Review } from '../storage/db';
export interface SaleInput {date:string;menu_id:string;channel:'매장'|'포장';quantity:string;unit_price:string;discount_amount:string;fee_percent:string;feeChanged:boolean}
export class InputError extends Error {constructor(public field:keyof SaleInput,message:string){super(message);}}
const fail=(field:keyof SaleInput,msg:string):never=>{throw new InputError(field,msg);};
export function inputFor(data:Dataset,original?:Sale):SaleInput {
  const fee=original?(D(original.net_sales).eq(0)?(D(original.payment_fee).eq(0)?'0':''):D(original.fee_numerator??original.payment_fee).div(original.fee_denominator??original.net_sales).mul(100).toFixed(2)):String(data.settings.defaultFeePercent??'1.5');
  return{date:original?.date??today(),menu_id:original?.menu_id??'',channel:original?.channel??'매장',quantity:original?.quantity??'',unit_price:original?.unit_price??'',discount_amount:original?.discount_amount??'0',fee_percent:fee,feeChanged:false};
}
export function prepareSale(data:Dataset,input:SaleInput,original?:Sale):Sale {
  if(!validDate(input.date)||input.date<'2025-07-01'||input.date>today())fail('date','판매일은 2025-07-01부터 오늘까지의 실제 날짜여야 합니다.');
  const menu=data.menus.find(m=>m.menu_id===input.menu_id);if(!menu)fail('menu_id','메뉴를 선택하세요.');
  if(!['매장','포장'].includes(input.channel))fail('channel','매장 또는 포장을 선택하세요.');
  const whole=(field:'quantity'|'unit_price'|'discount_amount',minimum:number)=>{const v=input[field];if(!/^\d+$/.test(v)||D(v).lt(minimum))fail(field,`${field==='quantity'?'판매수량':'금액'}은 ${minimum} 이상의 정수로 입력하세요.`);return D(v);};
  const quantity=whole('quantity',1),price=whole('unit_price',0),discount=whole('discount_amount',0);const net=quantity.mul(price).minus(discount);
  if(net.lt(0))fail('discount_amount','할인 총액이 총 판매금액보다 큽니다.');
  const initial=original?inputFor(data,original):undefined;
  const normalized={...input,quantity:quantity.toString(),unit_price:price.toString(),discount_amount:discount.toString()};
  const sameValues=original&&initial&&(['date','menu_id','channel','quantity','unit_price','discount_amount'] as const).every(k=>normalized[k]===initial[k]);
  if(sameValues&&!input.feeChanged)return original;
  let numerator:string,denominator:string;
  if(original&&!input.feeChanged){
    if(D(original.net_sales).eq(0)&&!D(original.payment_fee).eq(0))fail('fee_percent','기존 수수료 비율을 알 수 없습니다. 수수료율을 직접 입력하세요.');
    numerator=original.fee_numerator??original.payment_fee;denominator=original.fee_denominator??(D(original.net_sales).eq(0)?'1':original.net_sales);
  }else{
    if(!/^\d+(\.\d{1,2})?$/.test(input.fee_percent)||D(input.fee_percent).gt(100))fail('fee_percent','수수료율은 0~100%, 소수 둘째 자리까지 입력하세요.');
    numerator=D(input.fee_percent).mul(100).toString();denominator='10000';
  }
  const sameBasis=original&&original.date===input.date&&original.menu_id===input.menu_id&&original.channel===input.channel;
  const costs=sameBasis?{food:D(original.unit_food_cost_snapshot),packaging:D(original.unit_packaging_cost_snapshot)}:unitCosts(data,input.menu_id,menu!.recipe_version,input.channel,input.date);
  // Integer ratio rounding: avoids losing a half-won boundary to decimal division.
  const feeNumerator=BigInt(net.toFixed(0))*BigInt(D(numerator).toFixed(0)); const feeDenominator=BigInt(D(denominator).toFixed(0));
  const fee=(feeNumerator*2n+feeDenominator)/(feeDenominator*2n);
  return{sale_id:original?.sale_id??`S-${crypto.randomUUID()}`,date:input.date,menu_id:input.menu_id,channel:input.channel,quantity:quantity.toString(),unit_price:price.toString(),discount_amount:discount.toString(),net_sales:net.toString(),payment_fee:fee.toString(),recipe_version:sameBasis?original.recipe_version:menu!.recipe_version,unit_food_cost_snapshot:costs.food.toString(),unit_packaging_cost_snapshot:costs.packaging.toString(),fee_numerator:numerator,fee_denominator:denominator};
}
export async function mutateSale(state:State,input:SaleInput|null,original:Sale|undefined,database:CafeDB=db):Promise<{state:State;warnings:string[]}> {
  const current=original?state.data.sales.find(s=>s.sale_id===original.sale_id):undefined;
  if(original&&!current)throw new Error('대상 판매가 없습니다. 새로고침 후 확인하세요.');
  if(!input&&!current)throw new Error('삭제할 판매를 선택하세요.');
  const candidate=input?prepareSale(state.data,input,current):undefined;
  if(candidate===current)return{state,warnings:[]};
  if(candidate&&state.data.sales.some(s=>s.sale_id!==candidate.sale_id&&s.date===candidate.date&&s.menu_id===candidate.menu_id&&s.channel===candidate.channel))throw new Error('같은 날짜·메뉴·채널의 판매가 있습니다. 기존 기록을 수정하세요.');
  const sales=state.data.sales.filter(s=>s.sale_id!==current?.sale_id);if(candidate)sales.push(candidate);
  const nextData={...state.data,sales};validateReferences(nextData);for(const s of sales)amounts(s);
  const asOf=[...sales.map(s=>s.date),...nextData.inventory_events.map(e=>e.date),today()].sort().at(-1)!;
  const stocks=inventory(nextData,asOf);if(stocks.some(s=>s.error))throw new Error(stocks.find(s=>s.error)!.error);
  const reviewRows:Review[]=[];
  for(const date of new Set([current?.date,candidate?.date].filter((v):v is string=>!!v)))if(nextData.calendar.find(d=>d.date===date)?.record_complete)reviewRows.push({date,reason:'변경 후 확인 필요'});
  await database.transaction('rw',[database.records('sales'),database.metadata,database.reviewStatus],async()=>{
    if((await database.metadata.get('revision'))?.value!==state.revision)throw new Error('저장 자료가 다른 창에서 변경됐습니다. 새로고침 후 다시 시도하세요.');
    if(current&&!await database.records('sales').get(current.sale_id))throw new Error('대상 판매가 이미 삭제됐습니다.');
    if(candidate)await database.records('sales').put(candidate);else await database.records('sales').delete(current!.sale_id);
    await database.reviewStatus.bulkPut(reviewRows);
    await database.metadata.put({key:'revision',value:state.revision+1});
  });
  const reviews=new Map(state.reviews.map(r=>[r.date,r]));for(const r of reviewRows)reviews.set(r.date,r);
  const warnings=stocks.filter(s=>D(s.balance).lt(0)).map(s=>`${nextData.materials.find(m=>m.material_id===s.material_id)?.name}: 기록상 잔량 ${s.balance}. 입고·실제 재고를 확인하세요.`);
  return{state:{data:nextData,revision:state.revision+1,reviews:[...reviews.values()]},warnings};
}
export async function refresh(database:CafeDB=db){return readState(database);}
