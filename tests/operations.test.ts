import 'fake-indexeddb/auto';
import { afterEach,it,expect,vi } from 'vitest';
import { D,money } from '../src/domain/data';
import { inventory,totals } from '../src/domain/calculations';
import { periodReport } from '../src/domain/periodReport';
import { prepareExpense,parseExpenseAmount,prepareInventory,inventoryPreview,mutateExpense,addInventory,NegativeStockError,type InventoryInput } from '../src/services/operations';
import { CafeDB,initialize,readState,type State } from '../src/storage/db';
import { small,sale,seed,rawSeed } from './fixtures';
const databases:CafeDB[]=[];
afterEach(async()=>{vi.restoreAllMocks();for(const db of databases.splice(0))await db.delete();});
async function saved(){const db=new CafeDB('epic2-'+crypto.randomUUID());databases.push(db);return{db,state:await initialize(db,async()=>rawSeed())};}
const entry=(overrides:Partial<InventoryInput>={}):InventoryInput=>({event_id:'E-test',date:'2026-10-01',material_id:'I01',event_type:'입고',quantity:'1000',reason:'정기 구매',...overrides});
it('정수 비용·쉼표와 항목·날짜를 검사하고 원본 배분기준을 유지한다',()=>{
  expect(parseExpenseAmount('10,000')).toBe('10000');expect(parseExpenseAmount('1000000000000000000000')).toBe('1000000000000000000000');for(const a of ['', '0','-1','1.2','10,00'])expect(()=>parseExpenseAmount(a)).toThrow();
  const old={expense_id:'X-old',date:'2025-07-01',category:'임차료',amount:'10000',recognition:'월비용 일할 배분'};
  expect(prepareExpense({...old,amount:'10,000'},old)).toBe(old);expect(prepareExpense({...old,amount:'20000'},old).recognition).toBe(old.recognition);
  expect(()=>prepareExpense({...old,category:'기타'})).toThrow();expect(()=>prepareExpense({...old,date:'2099-01-01'})).toThrow();expect(()=>prepareExpense({...old,date:'2026-02-30'})).toThrow();
});
it('실제 운영비만 한 번 차감하고 월 계획은 다시 차감하지 않는다',()=>{
  const d=small();d.sales=[sale({quantity:'250',discount_amount:'0',net_sales:'1000000',payment_fee:'0',unit_food_cost_snapshot:'0'})];d.expenses=[{expense_id:'X',date:'2025-07-01',category:'임차료',amount:'400000',recognition:'직접 입력'}];d.monthly_expense_plan=[{month:'2025-07',category:'임차료',amount:'600000'}];
  const r=periodReport(d,[],'2025-07-01','2025-07-01','day');expect(r.pl.toString()).toBe('600000');expect(r.cost.toString()).toBe('400000');
});
it('휴무일 비용은 확정 평균 분자에 넣고 변경일·미마감은 제외한다',()=>{
  const d=small();d.calendar=d.calendar.map(c=>({...c,is_open:c.date==='2025-07-01',record_complete:c.date<='2025-07-02'}));d.sales=[sale()];d.expenses=[{expense_id:'X1',date:'2025-07-01',category:'임차료',amount:'1000',recognition:'직접 입력'},{expense_id:'X2',date:'2025-07-02',category:'임차료',amount:'2000',recognition:'직접 입력'},{expense_id:'X3',date:'2025-07-03',category:'임차료',amount:'5000',recognition:'직접 입력'}];
  const r=periodReport(d,[],'2025-07-01','2025-07-03','month');expect(r.openDays).toBe(1);expect(r.averagePL?.toString()).toBe('29830');expect(r.pl.toString()).toBe('24830');expect(r.hasUnconfirmedRecords).toBe(true);
  const changed=periodReport(d,[{date:'2025-07-01',reason:'변경 후 확인 필요'}],'2025-07-01','2025-07-03','month');expect(changed.averagePL).toBeNull();expect(changed.averageError).toBe('확정 영업일 없음');
});
it('9월의 확정 16일과 미마감·기록 없는 날짜를 구분한다',()=>{
  const r=periodReport(seed(),[],'2026-09-01','2026-09-30','month');expect(r.openDays).toBe(16);expect(money(r.net)).toBe('13,968,930');expect(r.stockDate).toBe('2026-09-18');expect(r.days.find(d=>d.date==='2026-09-19')?.hasRecord).toBe(false);expect(r.days.find(d=>d.date==='2026-09-19')?.status).toBe('미마감');console.log('9월 운영비/손익',money(r.cost),money(r.pl));
  expect(periodReport(seed(),[],'2026-10-01','2026-10-31','month').stockDate).toBeUndefined();
});
it('비용 누락은 평균 계산을 막고 0원 확정처럼 보이지 않는다',()=>{const d=small();d.sales=[sale()];const r=periodReport(d,[],'2025-07-01','2025-07-01','day');expect(r.averageNet).toBeNull();expect(r.days[0].warnings).toContain('비용 기록 확인 필요');expect(r.pl.toString()).toBe('32830');});
it('입고·폐기는 단위·소수 자릿수·사유와 양수 입력을 검사한다',()=>{
  const d=small();const receipt=prepareInventory(d,entry({quantity:'1.125'}));expect(receipt.quantity).toBe('1.125');expect(receipt.supplier_id).toBe(d.materials[0].supplier_id);expect(prepareInventory(d,entry({event_type:'폐기',quantity:'20'})).quantity).toBe('-20');
  for(const override of [{quantity:'0'},{quantity:'-1'},{quantity:'1.1234'},{reason:' '},{material_id:'I10',quantity:'1.5'}])expect(()=>prepareInventory(d,entry(override))).toThrow();
});
it('과거 입고 정정은 실제 재고 원본을 보존하고 차이만 재계산한다',()=>{
  const d=seed();const state:State={data:d,revision:0,reviews:[]};const audit=d.inventory_events.find(e=>e.event_type==='실사조정'&&e.material_id==='I01')!;
  const p=inventoryPreview(state,entry({date:audit.date,quantity:'100'}));expect(p.after.balance).toBe(audit.counted_quantity);expect(p.latest.balance).toBe(inventory(d,p.latestDate)[0].balance);expect(p.data.inventory_events.find(e=>e.event_id===audit.event_id)).toEqual(audit);
});
it('비용 추가·수정·이동·삭제와 재접속을 실제 저장하며 메뉴·재고는 보존한다',async()=>{
  const {db,state}=await saved();const input={date:'2026-10-01',category:'광고비',amount:'10,000'};let s=await mutateExpense(state,input,undefined,db);let stored=await readState(db);let row=stored.data.expenses.find(e=>e.date===input.date)!;expect(row.amount).toBe('10000');expect(row.recognition).toBe('직접 입력');expect(inventory(stored.data,input.date)[0].balance).toBe(inventory(state.data,input.date)[0].balance);expect(totals(stored.data.sales).profit.toString()).toBe(totals(state.data.sales).profit.toString());
  await expect(mutateExpense(s,input,undefined,db)).rejects.toThrow('같은 귀속일');expect(await mutateExpense(s,{...input,amount:'10000'},row,db)).toBe(s);
  s=await mutateExpense(s,{...input,date:'2026-10-02',amount:'20000'},row,db);stored=await readState(db);row=stored.data.expenses.find(e=>e.expense_id===row.expense_id)!;expect(row.date).toBe('2026-10-02');expect(row.amount).toBe('20000');s=await mutateExpense(s,null,row,db);expect((await readState(db)).data.expenses).toHaveLength(state.data.expenses.length);expect(s.revision).toBe(3);
});
it('비용 저장 실패는 기록과 변경번호를 함께 보존한다',async()=>{
  const {db,state}=await saved();vi.spyOn(db.metadata,'put').mockRejectedValueOnce(new Error('저장 공간 부족'));await expect(mutateExpense(state,{date:'2026-10-01',category:'광고비',amount:'100'},undefined,db)).rejects.toThrow('저장 공간');vi.restoreAllMocks();const stored=await readState(db);expect(stored.revision).toBe(0);expect(stored.data.expenses).toEqual(state.data.expenses);
});
it('입고·폐기 반복 기록 저장과 음수 승인·중복 클릭·오래된 상태를 검사한다',async()=>{
  const {db,state}=await saved();const before=inventory(state.data,'2026-10-01')[0].balance;let s=await addInventory(state,entry(),false,db);expect(inventory(s.data,'2026-10-01')[0].balance).toBe(D(before).plus(1000).toString());await expect(addInventory(s,entry(),false,db)).rejects.toThrow('이미 저장');await expect(addInventory(state,entry({event_id:'E-stale'}),false,db)).rejects.toThrow('다른 창');
  s=await addInventory(s,entry({event_id:'E-repeat'}),false,db);const waste=entry({event_id:'E-waste',event_type:'폐기',quantity:'99999',reason:'폐기 확인'});await expect(addInventory(s,waste,false,db)).rejects.toBeInstanceOf(NegativeStockError);expect((await readState(db)).revision).toBe(2);s=await addInventory(s,waste,true,db);const stored=await readState(db);expect(inventory(stored.data,'2026-10-01')[0].balance).toBe(D(before).plus(2000).minus(99999).toString());expect(stored.data.expenses).toEqual(state.data.expenses);expect(stored.revision).toBe(3);
});
it('과거 비용·입고 변경은 마감 재확인을 남기고 저장 실패 때 모두 보존한다',async()=>{
  const {db,state}=await saved();const old=state.data.expenses[0];let s=await mutateExpense(state,{...old,amount:D(old.amount).plus(1).toString()},old,db);expect(s.reviews).toContainEqual({date:old.date,reason:'변경 후 확인 필요'});
  vi.spyOn(db.metadata,'put').mockRejectedValueOnce(new Error('실패'));await expect(addInventory(s,entry({date:'2025-07-02'}),false,db)).rejects.toThrow('실패');vi.restoreAllMocks();expect((await readState(db)).data.inventory_events).toEqual(state.data.inventory_events);
});
