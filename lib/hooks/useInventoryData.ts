'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InventorySnapshot } from '../db/contracts';
import { isSupabaseConfigured } from '../db/supabase';
import { SupabaseInventoryRepository } from '../db/inventory-repository';

const demoInventory: InventorySnapshot[] = [
  { productId:'demo-van-3',flavor:'Vanilla',packageSize:'3_GALLON',onHand:34,reserved:4,available:30,labHold:12,storefront:3 },
  { productId:'demo-van-48',flavor:'Vanilla',packageSize:'48_OZ',onHand:52,reserved:6,available:46,labHold:24,storefront:5 },
  { productId:'demo-cho-3',flavor:'Chocolate',packageSize:'3_GALLON',onHand:21,reserved:2,available:19,labHold:0,storefront:1 },
  { productId:'demo-cho-48',flavor:'Chocolate',packageSize:'48_OZ',onHand:36,reserved:0,available:36,labHold:12,storefront:2 },
  { productId:'demo-str-3',flavor:'Strawberry',packageSize:'3_GALLON',onHand:11,reserved:1,available:10,labHold:8,storefront:2 },
  { productId:'demo-str-48',flavor:'Strawberry',packageSize:'48_OZ',onHand:20,reserved:4,available:16,labHold:0,storefront:1 }
];

export type InventoryDataMode = 'demo'|'live'|'error';

export function useInventoryData(){
  const configured = isSupabaseConfigured();
  const repo = useMemo(()=>configured ? new SupabaseInventoryRepository() : null,[configured]);
  const [inventory,setInventory] = useState<InventorySnapshot[]>(configured?[]:demoInventory);
  const [mode,setMode] = useState<InventoryDataMode>(configured?'live':'demo');
  const [loading,setLoading] = useState(configured);
  const [error,setError] = useState('');

  const refresh = useCallback(async()=>{
    if(!repo){setInventory(demoInventory);setMode('demo');setLoading(false);return;}
    try{
      setLoading(true);setError('');
      const rows=await repo.getInventory();
      setInventory(rows);setMode('live');
    }catch(e){
      setMode('error');setError(e instanceof Error?e.message:'Could not load inventory.');
    }finally{setLoading(false)}
  },[repo]);

  useEffect(()=>{void refresh()},[refresh]);
  return {inventory,mode,loading,error,refresh};
}
