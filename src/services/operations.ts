import { COST_CATEGORIES, D, today, validDate, validateReferences, type Dataset, type Expense, type InventoryEvent } from '../domain/data';
import { inventory } from '../domain/calculations';
import { db, type CafeDB, type State, type Review } from '../storage/db';
export class OperationInputError extends Error{constructor(public field:string,message:string){super(message);}}
const fail=(field:string,message:string):never=>{throw new OperationInputError(field,message);};
function checkDate(date:string){if(!validDate(date)||date<'2025-07-01'||date>today())fail('date','기록일은 2025-07-01부터 오늘까지의 실제 날짜여야 합니다.');}
export interface ExpenseInput {date:string;category:string;amount:string}
export function expenseInput(original?:Expense):ExpenseInput{return{date:original?.date??today(),category:original?.category??'',amount:original?.amount??''};}
export function parseExpenseAmount(value:string){
  if(!/^\d+$/.test(value)&&!/^\d{1,3}(,\d{3})+$/.test(value))fail('amount','금액은 0보다 큰 정수로 입력하세요. 쉼표는 10,000처럼 입력하세요.');
  const amount=D(value.replaceAll(',',''));if(amount.lte(0))fail('amount','금액은 0보다 커야 합니다.');return amount.toFixed();
}
export function prepareExpense(input:ExpenseInput,original?:Expense):Expense{
  checkDate(input.date);if(!COST_CATEGORIES.some(c=>c===input.category))fail('category','제공된 8개 비용항목 중 하나를 선택하세요.');const amount=parseExpenseAmount(input.amount);
  if(original&&input.date===original.date&&input.category===original.category&&amount===original.amount)return original;
  return{expense_id:original?.expense_id??`X-${crypto.randomUUID()}`,date:input.date,category:input.category,amount,recognition:original?.recognition??'직접 입력'};
}
async function commit(state:State,data:Dataset,key:'expenses'|'inventory_events',id:string,candidate:Expense|InventoryEvent|undefined,dates:string[],originalExists:boolean,database:CafeDB){
  validateReferences(data);
  const reviewRows:Review[]=dates.filter(date=>data.calendar.find(c=>c.date===date)?.record_complete).map(date=>({date,reason:'변경 후 확인 필요'}));
  await database.transaction('rw',[database.records(key),database.metadata,database.reviewStatus],async()=>{
    if((await database.metadata.get('revision'))?.value!==state.revision)throw new Error('저장 자료가 다른 창에서 변경됐습니다. 새로고침 후 다시 시도하세요.');
    if(originalExists&&!await database.records(key).get(id))throw new Error('대상 기록이 이미 삭제됐습니다.');
    if(candidate)await database.records(key).put(candidate);else await database.records(key).delete(id);
    await database.reviewStatus.bulkPut(reviewRows);await database.metadata.put({key:'revision',value:state.revision+1});
  });
  const reviews=new Map(state.reviews.map(r=>[r.date,r]));for(const r of reviewRows)reviews.set(r.date,r);
  return{data,revision:state.revision+1,reviews:[...reviews.values()]};
}
export async function mutateExpense(state:State,input:ExpenseInput|null,original?:Expense,database:CafeDB=db):Promise<State>{
  const current=original?state.data.expenses.find(e=>e.expense_id===original.expense_id):undefined;
  if(original&&!current)throw new Error('대상 비용이 없습니다. 새로고침 후 확인하세요.');if(!input&&!current)throw new Error('삭제할 비용을 선택하세요.');
  const candidate=input?prepareExpense(input,current):undefined;if(candidate===current)return state;
  if(candidate&&state.data.expenses.some(e=>e.expense_id!==candidate.expense_id&&e.date===candidate.date&&e.category===candidate.category))fail('category','같은 귀속일·항목의 비용이 있습니다. 기존 합계를 수정하세요.');
  const expenses=state.data.expenses.filter(e=>e.expense_id!==current?.expense_id);if(candidate)expenses.push(candidate);
  return commit(state,{...state.data,expenses},'expenses',candidate?.expense_id??current!.expense_id,candidate,[...new Set([current?.date,candidate?.date].filter((d):d is string=>!!d))],!!current,database);
}
export interface InventoryInput {event_id:string;date:string;material_id:string;event_type:'입고'|'폐기';quantity:string;reason:string}
export function inventoryInput():InventoryInput{return{event_id:`E-${crypto.randomUUID()}`,date:today(),material_id:'',event_type:'입고',quantity:'',reason:''};}
export function prepareInventory(data:Dataset,input:InventoryInput):InventoryEvent{
  checkDate(input.date);if(!['입고','폐기'].includes(input.event_type))fail('event_type','입고 또는 폐기를 선택하세요.');const material=data.materials.find(m=>m.material_id===input.material_id);if(!material)fail('material_id','재료를 선택하세요.');
  if(!/^\d+(\.\d{1,3})?$/.test(input.quantity)||D(input.quantity).lte(0))fail('quantity','수량은 0보다 커야 하며 g/ml는 소수 셋째 자리까지 입력하세요.');if(material!.unit==='개'&&!D(input.quantity).isInteger())fail('quantity','개 단위 수량은 정수로 입력하세요.');
  if(!input.reason.trim())fail('reason','입고 또는 폐기 사유를 입력하세요.');
  const sequence=Math.max(-1,...data.inventory_events.map(e=>e.sequence??-1))+1;
  return{event_id:input.event_id,date:input.date,material_id:input.material_id,event_type:input.event_type,quantity:D(input.quantity).mul(input.event_type==='폐기'?-1:1).toFixed(),unit:material!.unit,reason:input.reason.trim(),supplier_id:input.event_type==='입고'?material!.supplier_id:undefined,sequence};
}
export function inventoryPreview(state:State,input:InventoryInput){
  const event=prepareInventory(state.data,input);if(state.data.inventory_events.some(e=>e.event_id===event.event_id))throw new Error('이 기록은 이미 저장됐습니다. 새 기록 창을 다시 열어 주세요.');
  const data={...state.data,inventory_events:[...state.data.inventory_events,event]};validateReferences(data);
  const before=inventory(state.data,event.date).find(s=>s.material_id===event.material_id)!;
  const after=inventory(data,event.date).find(s=>s.material_id===event.material_id)!;
  const latestDate=[event.date,...data.sales.map(s=>s.date),...data.inventory_events.map(e=>e.date)].sort().at(-1)!;
  const latest=latestDate===event.date?after:inventory(data,latestDate).find(s=>s.material_id===event.material_id)!;
  if(before.error||after.error||latest.error)throw new Error(before.error??after.error??latest.error);
  return{event,data,before,after,latest,latestDate,needsConfirmation:event.event_type==='폐기'&&(D(after.balance).lt(0)||D(latest.balance).lt(0))};
}
export class NegativeStockError extends Error{}
export async function addInventory(state:State,input:InventoryInput,negativeConfirmed=false,database:CafeDB=db):Promise<State>{
  const preview=inventoryPreview(state,input);
  if(preview.needsConfirmation&&!negativeConfirmed)throw new NegativeStockError('폐기로 기록상 잔량이 음수가 됩니다. 수량·입고 기록을 확인하고 명시적으로 승인하세요.');
  return commit(state,preview.data,'inventory_events',preview.event.event_id,preview.event,[preview.event.date],false,database);
}
