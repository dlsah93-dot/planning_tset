import Dexie, { type Table } from 'dexie';
import { parseDataset, type Dataset } from '../domain/data';
export const businessTables = { suppliers:'suppliers',materials:'materials',menus:'menus',recipes:'recipes',price_history:'priceHistory',calendar:'calendar',sales:'sales',opening_inventory:'openingInventory',inventory_events:'inventoryEvents',monthly_expense_plan:'monthlyExpensePlan',expenses:'expenses' } as const;
export type BusinessKey=keyof typeof businessTables;
export interface Metadata {key:string;value:unknown}
export interface Review {date:string;reason:string}
export interface State {data:Dataset;revision:number;reviews:Review[]}
export class CafeDB extends Dexie {
  metadata!:Table<Metadata,string>;
  settings!:Table<Metadata,string>;
  reviewStatus!:Table<Review,string>;
  constructor(name='prep-cafe-operations'){
    super(name);this.version(1).stores({suppliers:'supplier_id',materials:'material_id,supplier_id',menus:'menu_id',recipes:'_key,menu_id',priceHistory:'_key,material_id',calendar:'date',sales:'sale_id,date,&[date+menu_id+channel]',openingInventory:'_key,material_id',inventoryEvents:'event_id,date,[material_id+date]',monthlyExpensePlan:'_key',expenses:'expense_id,date,&[date+category]',metadata:'key',settings:'key',reviewStatus:'date'});
  }
  records(key:BusinessKey):Table<Record<string,unknown>,string>{return this.table(businessTables[key]);}
}
export const db=new CafeDB();
const entries=Object.keys(businessTables) as BusinessKey[];
function storedRows(key:BusinessKey,rows:Dataset[BusinessKey]):Record<string,unknown>[] {
  return rows.map((row,index)=>{
    const r={...row} as Record<string,unknown>;
    if(key==='recipes')r._key=[r.recipe_version,r.menu_id,r.material_id,r.channel_only??''].join('|');
    if(key==='price_history')r._key=r.material_id+'|'+r.effective_date;
    if(key==='opening_inventory')r._key=r.material_id+'|'+r.date;
    if(key==='monthly_expense_plan')r._key=r.month+'|'+r.category;
    if(key==='inventory_events'&&r.sequence==null)r.sequence=index;
    return r;
  });
}
export async function initialize(database:CafeDB=db,loader:()=>Promise<unknown>=async()=>{
  const res=await fetch('/seed/prep-cafe-operations-v3.1.0.json');if(!res.ok)throw new Error('초기 자료를 읽지 못했습니다.');return res.json();
}){
  const existing=await database.metadata.get('initialized');
  if(existing?.value===true)return readState(database);
  const sizes=await Promise.all(database.tables.map(t=>t.count()));
  if(sizes.some(n=>n>0))throw new Error('초기 준비 표시가 없지만 저장 자료가 있습니다. 자동 초기화하지 않습니다. 기존 자료를 보존하고 지원 또는 백업 복원을 확인하세요.');
  const data=parseDataset(await loader());
  const expected:Record<BusinessKey,number>={suppliers:3,materials:11,menus:8,recipes:22,price_history:33,calendar:457,sales:6112,opening_inventory:11,inventory_events:1515,monthly_expense_plan:120,expenses:3560};
  for(const key of entries)if(data[key].length!==expected[key])throw new Error(`초기 자료 ${key}: ${expected[key]}개가 필요합니다.`);
  await database.transaction('rw',database.tables,async()=>{
    if((await database.metadata.get('initialized'))?.value===true)return;
    for(const t of database.tables)if(await t.count())throw new Error('자료가 변경되어 초기 준비를 중단했습니다.');
    for(const key of entries)await database.records(key).bulkPut(storedRows(key,data[key]));
    await database.metadata.bulkPut([{key:'initialized',value:true},{key:'meta',value:data.meta},{key:'revision',value:0},{key:'schemaVersion',value:1},{key:'calculationVersion',value:1},{key:'storeId',value:'prep-cafe'}]);
    await database.settings.bulkPut([{key:'defaultFeePercent',value:'1.5'},{key:'timezone',value:'Asia/Seoul'}]);
  });return readState(database);
}
export async function readState(database:CafeDB=db):Promise<State>{
  const raw:Record<string,unknown>={};let revision=0;let reviews:Review[]=[];
  await database.transaction('r',database.tables,async()=>{
    if((await database.metadata.get('initialized'))?.value!==true)throw new Error('자료 준비 완료 표시가 없습니다.');
    if((await database.metadata.get('schemaVersion'))?.value!==1||(await database.metadata.get('calculationVersion'))?.value!==1||(await database.metadata.get('storeId'))?.value!=='prep-cafe')throw new Error('지원하지 않는 저장 구조 또는 매장입니다. 자료를 변경하지 않습니다.');
    raw.meta=(await database.metadata.get('meta'))?.value;
    const storedRevision=(await database.metadata.get('revision'))?.value;
    if(typeof storedRevision!=='number'||!Number.isSafeInteger(storedRevision)||storedRevision<0)throw new Error('자료 변경번호가 손상되었습니다.');revision=storedRevision;
    for(const key of entries)raw[key]=(await database.records(key).toArray()).map(row=>{const r={...row};delete r._key;return r;});
    raw.settings=Object.fromEntries((await database.settings.toArray()).map(r=>[r.key,r.value]));reviews=await database.reviewStatus.toArray();
  });
  if((raw.settings as Record<string,unknown>).defaultFeePercent==null||(raw.settings as Record<string,unknown>).timezone!=='Asia/Seoul')throw new Error('저장 설정이 손상되었습니다.');
  return{data:parseDataset(raw),revision,reviews};
}
