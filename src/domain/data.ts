import { z } from 'zod';
import Decimal from 'decimal.js';
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export const D = (n: Decimal.Value) => new Decimal(n);
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value;
}
export function today() { return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
const date = z.string().refine(validDate,'실제 날짜가 아닙니다.');
const id = z.string().min(1);
const decimal = z.union([z.number().finite(),z.string().regex(/^-?\d+(\.\d+)?$/)]).transform(v=>D(v).toString());
const nonnegative = decimal.refine(v=>D(v).gte(0),'음수는 허용되지 않습니다.');
const positive = decimal.refine(v=>D(v).gt(0),'0보다 커야 합니다.');
const integer = nonnegative.refine(v=>D(v).isInteger(),'정수여야 합니다.');
const unit = z.enum(['g','ml','개']);
export const saleSchema = z.object({sale_id:id,date,menu_id:id,channel:z.enum(['매장','포장']),quantity:positive.refine(v=>D(v).isInteger()),unit_price:integer,discount_amount:integer,net_sales:integer,payment_fee:integer,recipe_version:id,unit_food_cost_snapshot:nonnegative,unit_packaging_cost_snapshot:nonnegative,fee_numerator:integer.optional(),fee_denominator:positive.refine(v=>D(v).isInteger()).optional()});
export const datasetSchema = z.object({
  meta:z.object({dataset_id:z.literal('prep-cafe-operations'),version:z.literal('3.1.0'),data_class:z.string(),store_name:z.string(),start_date:date,as_of:date,currency:z.literal('KRW'),amount_basis:z.string(),source:z.string(),seed:z.number()}).passthrough(),
  suppliers:z.array(z.object({supplier_id:id,name:id,data_class:z.string()})),
  materials:z.array(z.object({material_id:id,name:id,unit,pack_quantity:positive,base_pack_price:nonnegative,lead_days:z.number().int().nonnegative(),safety_days:z.number().int().nonnegative(),supplier_id:id})),
  menus:z.array(z.object({menu_id:id,name:id,price:integer,category:z.enum(['음료','디저트']),recipe_version:id})),
  recipes:z.array(z.object({recipe_version:id,menu_id:id,material_id:id,quantity:positive,unit,channel_only:z.enum(['매장','포장']).nullish()})),
  price_history:z.array(z.object({material_id:id,effective_date:date,pack_price:nonnegative,pack_quantity:positive})),
  calendar:z.array(z.object({date,is_open:z.boolean(),record_complete:z.boolean(),weather:z.string(),note:z.string()})),
  sales:z.array(saleSchema),
  opening_inventory:z.array(z.object({material_id:id,date,quantity:nonnegative,unit})),
  inventory_events:z.array(z.object({event_id:id,date,material_id:id,event_type:z.enum(['입고','폐기','실사조정']),quantity:decimal,unit,reason:z.string(),unit_cost:nonnegative.nullish(),supplier_id:id.nullish(),counted_quantity:nonnegative.nullish(),sequence:z.number().int().nonnegative().optional()})),
  monthly_expense_plan:z.array(z.object({month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),category:id,amount:nonnegative})),
  expenses:z.array(z.object({expense_id:id,date,category:id,amount:positive,recognition:z.string()})),
  settings:z.record(z.string(),z.unknown())
});
export type Dataset = z.output<typeof datasetSchema>;
export type Sale = Dataset['sales'][number];
export type Menu = Dataset['menus'][number];
export type Material = Dataset['materials'][number];
export type Recipe = Dataset['recipes'][number];
export type InventoryEvent = Dataset['inventory_events'][number];
export type Expense = Dataset['expenses'][number];
export const COST_CATEGORIES = ['임차료','인건비','사업주 부담 보험료','관리비','수도광열비','통신·소프트웨어','광고비','소모품·청소비'] as const;
export function parseDataset(raw:unknown):Dataset {
  const result=datasetSchema.safeParse(raw);
  if (!result.success) { const e=result.error.issues[0]; throw new Error(`자료 검사 오류: ${e.path.join('.')} — ${e.message}`); }
  validateReferences(result.data); return result.data;
}
export function validateReferences(data:Dataset) {
  const fail=(s:string):never=>{throw new Error(`자료 연결 오류: ${s}`);};
  function unique<T>(rows:T[],key:(r:T)=>string,label:string) { const keys=new Set<string>(); for(const r of rows){const k=key(r);if(keys.has(k))fail(`${label} 중복 ${k}`);keys.add(k);} }
  unique(data.suppliers,r=>r.supplier_id,'공급사'); unique(data.materials,r=>r.material_id,'재료'); unique(data.menus,r=>r.menu_id,'메뉴');
  unique(data.recipes,r=>[r.recipe_version,r.menu_id,r.material_id,r.channel_only??''].join('|'),'레시피');
  unique(data.price_history,r=>r.material_id+'|'+r.effective_date,'가격'); unique(data.calendar,r=>r.date,'달력');
  unique(data.sales,r=>r.sale_id,'판매ID'); unique(data.sales,r=>[r.date,r.menu_id,r.channel].join('|'),'판매 조합');
  unique(data.opening_inventory,r=>r.material_id+'|'+r.date,'초기재고'); unique(data.inventory_events,r=>r.event_id,'재고ID');
  unique(data.expenses,r=>r.expense_id,'비용ID'); unique(data.expenses,r=>r.date+'|'+r.category,'비용 조합');
  unique(data.monthly_expense_plan,r=>r.month+'|'+r.category,'월계획');
  const materials=new Map(data.materials.map(m=>[m.material_id,m])); const menus=new Map(data.menus.map(m=>[m.menu_id,m])); const suppliers=new Set(data.suppliers.map(s=>s.supplier_id));
  for(const m of data.materials) if(!suppliers.has(m.supplier_id))fail(`${m.material_id} 공급사 없음`);
  const groups=new Set(data.recipes.map(r=>r.recipe_version+'|'+r.menu_id));
  for(const m of data.menus) if(!groups.has(m.recipe_version+'|'+m.menu_id))fail(`${m.menu_id} 레시피 없음`);
  for(const r of data.recipes) if(!menus.has(r.menu_id)||materials.get(r.material_id)?.unit!==r.unit)fail(`레시피 ${r.menu_id}/${r.material_id} 연결·단위`);
  for(const p of data.price_history) if(!materials.has(p.material_id))fail(`${p.material_id} 가격 재료 없음`);
  for(const m of data.materials) if(!data.opening_inventory.some(r=>r.material_id===m.material_id&&r.date===data.meta.start_date))fail(`${m.material_id} 초기재고 없음`);
  for(const r of [...data.opening_inventory,...data.inventory_events]) {
    if(materials.get(r.material_id)?.unit!==r.unit)fail(`${r.material_id} 재고 단위`);
    if(r.unit==='개'&&!D(r.quantity).isInteger())fail(`${r.material_id} 개 수량은 정수`);
    if(r.date<data.meta.start_date)fail(`${r.material_id} 시작일 이전 기록`);
  }
  for(const e of data.inventory_events){if(e.supplier_id&&!suppliers.has(e.supplier_id))fail(`${e.event_id} 공급사`);if(e.event_type==='입고'&&!D(e.quantity).gt(0))fail(`${e.event_id} 입고 수량`);if(e.event_type==='폐기'&&!D(e.quantity).lt(0))fail(`${e.event_id} 폐기 수량`);if(e.event_type==='실사조정'&&(e.counted_quantity==null||(e.unit==='개'&&!D(e.counted_quantity).isInteger())))fail(`${e.event_id} 실제 수량`);}
  for(const s of data.sales){
    if(!menus.has(s.menu_id)||!groups.has(s.recipe_version+'|'+s.menu_id))fail(`${s.sale_id} 메뉴·레시피`);
    if(s.date<data.meta.start_date||D(s.quantity).mul(s.unit_price).minus(s.discount_amount).lt(0))fail(`${s.sale_id} 날짜·할인`);
    if((s.fee_numerator==null)!==(s.fee_denominator==null))fail(`${s.sale_id} 수수료 기준 누락`);
  }
}
export function periodRange(mode:'day'|'month',value:string) {
  if(mode==='day'){if(!validDate(value)||value<'2025-07-01'||value>today())throw new Error('조회 날짜를 2025-07-01부터 오늘까지 선택하세요.');return{start:value,end:value};}
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)||value<'2025-07'||value>today().slice(0,7))throw new Error('조회 월을 2025-07부터 이번 달까지 선택하세요.');
  const [y,m]=value.split('-').map(Number);return{start:value+'-01',end:value+'-'+new Date(Date.UTC(y,m,0)).getUTCDate()};
}
export function money(n:Decimal.Value) { return D(n).toDecimalPlaces(0).toNumber().toLocaleString('ko-KR'); }
export function number(n:Decimal.Value) { return D(n).toNumber().toLocaleString('ko-KR',{maximumFractionDigits:3}); }
export function ratio(n:Decimal.Value,d:Decimal.Value) { return D(d).eq(0)?'해당 없음':D(n).div(d).mul(100).toFixed(1)+'%'; }
