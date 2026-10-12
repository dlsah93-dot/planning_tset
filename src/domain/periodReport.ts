import { D, type Dataset } from './data';
import { totals } from './calculations';
import type { Review } from '../storage/db';
export function dateStatus(data:Dataset,reviews:Review[],date:string){
  if(reviews.some(r=>r.date===date))return '변경 후 확인 필요';
  const cal=data.calendar.find(c=>c.date===date);
  if(!cal)return '마감 정보 없음';
  if(!cal.record_complete)return '미마감';
  return cal.is_open?'마감 영업일':'마감 휴무일';
}
export function periodReport(data:Dataset,reviews:Review[],start:string,end:string,mode:'day'|'month'){
  const selectedSales=data.sales.filter(s=>s.date>=start&&s.date<=end);
  const selectedExpenses=data.expenses.filter(e=>e.date>=start&&e.date<=end);
  const salesByDate=new Map<string,typeof selectedSales>(),expensesByDate=new Map<string,typeof selectedExpenses>();
  for(const s of selectedSales){const list=salesByDate.get(s.date)??[];list.push(s);salesByDate.set(s.date,list);}
  for(const e of selectedExpenses){const list=expensesByDate.get(e.date)??[];list.push(e);expensesByDate.set(e.date,list);}
  const calendar=new Map(data.calendar.map(c=>[c.date,c]));const reviewDates=new Set(reviews.map(r=>r.date));
  const days=[];
  for(let date=start;date<=end;){
    const cal=calendar.get(date);const sales=salesByDate.get(date)??[],expenses=expensesByDate.get(date)??[];const a=totals(sales);const cost=expenses.reduce((sum,e)=>sum.plus(e.amount),D(0));
    const confirmed=!!cal?.record_complete&&!reviewDates.has(date);
    const warnings:string[]=[];
    if(confirmed&&cal?.is_open&&!sales.length)warnings.push('판매 기록 확인 필요');
    if(sales.length&&!expenses.length)warnings.push('비용 기록 확인 필요');
    if(expenses.length&&!sales.length&&!(confirmed&&cal&&!cal.is_open))warnings.push('판매 기록 없음 · 실적 확인 필요');
    days.push({date,status:dateStatus(data,reviews,date),confirmed,isOpen:cal?.is_open,hasRecord:sales.length+expenses.length>0,hasSales:sales.length>0,hasExpenses:expenses.length>0,saleCount:sales.length,expenseCount:expenses.length,...a,cost,pl:a.profit.minus(cost),warnings});
    const next=new Date(date+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);date=next.toISOString().slice(0,10);
  }
  const sum=totals(selectedSales),cost=selectedExpenses.reduce((sum,e)=>sum.plus(e.amount),D(0));
  const confirmedDates=new Set(days.filter(d=>d.confirmed).map(d=>d.date));
  const confirmedSales=selectedSales.filter(s=>confirmedDates.has(s.date));const confirmedExpenses=selectedExpenses.filter(e=>confirmedDates.has(e.date));
  const confirmedTotal=totals(confirmedSales),confirmedCost=confirmedExpenses.reduce((sum,e)=>sum.plus(e.amount),D(0));
  const openDays=days.filter(d=>d.confirmed&&d.isOpen).length;
  const averageError=!openDays?'확정 영업일 없음':days.some(d=>d.confirmed&&d.warnings.length)?'판매·비용 기록 확인 필요':'';
  const recordedDates=days.filter(d=>d.hasRecord).map(d=>d.date);
  const stockDates=[...data.sales.map(s=>s.date),...data.inventory_events.map(e=>e.date),...data.opening_inventory.map(e=>e.date)].filter(d=>d>=start&&d<=end).sort();
  return{...sum,cost,pl:sum.profit.minus(cost),days,openDays,confirmedCost,confirmedTotal,confirmedPL:confirmedTotal.profit.minus(confirmedCost),unconfirmedTotal:totals(selectedSales.filter(s=>!confirmedDates.has(s.date))),unconfirmedCost:selectedExpenses.filter(e=>!confirmedDates.has(e.date)).reduce((sum,e)=>sum.plus(e.amount),D(0)),hasUnconfirmedRecords:days.some(d=>!d.confirmed&&d.hasRecord),confirmedRecordCount:days.filter(d=>d.confirmed&&d.hasRecord).length,unconfirmedRecordCount:days.filter(d=>!d.confirmed&&d.hasRecord).length,averageError,averageNet:averageError?null:days.filter(d=>d.confirmed&&d.isOpen).reduce((sum,d)=>sum.plus(d.net),D(0)).div(openDays),averagePL:averageError?null:confirmedTotal.profit.minus(confirmedCost).div(openDays),recordStart:recordedDates[0],recordEnd:recordedDates.at(-1),stockDate:mode==='day'?start:stockDates.at(-1)};
}
