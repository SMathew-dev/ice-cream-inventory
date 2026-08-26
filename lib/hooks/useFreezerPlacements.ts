'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {FreezerPlacement} from '../db/contracts';
import {SupabaseInventoryRepository} from '../db/inventory-repository';
import {isSupabaseConfigured} from '../db/supabase';

export function useFreezerPlacements(){
 const repo=useMemo(()=>isSupabaseConfigured()?new SupabaseInventoryRepository():null,[]);
 const [placements,setPlacements]=useState<FreezerPlacement[]>([]); const [error,setError]=useState('');
 const refresh=useCallback(async()=>{if(!repo){setPlacements([]);return}try{setError('');setPlacements(await repo.getFreezerPlacements())}catch(e){setError(e instanceof Error?e.message:'Could not load freezer map.')}},[repo]);
 useEffect(()=>{void refresh()},[refresh]);
 return {placements,error,refresh};
}
