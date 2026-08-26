'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {FreezerSlot} from '../db/contracts';
import {SupabaseInventoryRepository} from '../db/inventory-repository';
import {isSupabaseConfigured} from '../db/supabase';

export function useFreezerSlots(){
 const repo=useMemo(()=>isSupabaseConfigured()?new SupabaseInventoryRepository():null,[]);
 const [slots,setSlots]=useState<FreezerSlot[]>([]); const [error,setError]=useState('');
 const refresh=useCallback(async()=>{if(!repo){setSlots([]);return}try{setError('');setSlots(await repo.getFreezerSlots())}catch(e){setError(e instanceof Error?e.message:'Could not load freezer slots.')}},[repo]);
 useEffect(()=>{void refresh()},[refresh]);
 return {slots,error,refresh};
}
