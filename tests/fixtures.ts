import fs from 'node:fs';
import { parseDataset, type Dataset, type Sale } from '../src/domain/data';
export const rawSeed=()=>JSON.parse(fs.readFileSync('public/seed/prep-cafe-operations-v3.1.0.json','utf8'));
export const seed=()=>parseDataset(rawSeed());
export function small():Dataset {const d=seed();return{...d,menus:d.menus.slice(0,1),materials:d.materials.filter(m=>['I01','I10'].includes(m.material_id)),recipes:d.recipes.filter(r=>r.menu_id==='M01'),price_history:d.price_history.filter(p=>['I01','I10'].includes(p.material_id)),sales:[],opening_inventory:d.opening_inventory.filter(r=>['I01','I10'].includes(r.material_id)).map(r=>({...r,quantity:r.material_id==='I01'?'1000':'100'})),inventory_events:[],expenses:[],monthly_expense_plan:[]};}
export function sale(overrides:Partial<Sale>={}):Sale{return{sale_id:'TEST',date:'2025-07-01',menu_id:'M01',channel:'매장',quantity:'10',unit_price:'4000',discount_amount:'2000',net_sales:'38000',payment_fee:'570',recipe_version:'R1',unit_food_cost_snapshot:'460',unit_packaging_cost_snapshot:'0',...overrides};}
