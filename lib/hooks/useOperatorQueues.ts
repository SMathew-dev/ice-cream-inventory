'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {OpenOrder,PendingLot} from '../db/contracts';
import {isSupabaseConfigured} from '../db/supabase';
import {SupabaseInventoryRepository} from '../db/inventory-repository';

export function useOperatorQueues(){
 const configured=isSupabaseConfigured();
 const repo=useMemo(()=>configured?new SupabaseInventoryRepository():null,[configured]);
 const [pendingLots,setPendingLots]=useState<PendingLot[]>([]); const [openOrders,setOpenOrders]=useState<OpenOrder[]>([]); const [error,setError]=useState('');
 const refresh=useCallback(async()=>{if(!repo){setPendingLots([]);setOpenOrders([]);return}try{setError('');const [lots,orders]=await Promise.all([repo.getPendingLots(),repo.getOpenOrders()]);setPendingLots(lots);setOpenOrders(orders)}catch(e){setError(e instanceof Error?e.message:'Could not load operator queues.')}},[repo]);
 useEffect(()=>{void refresh()},[refresh]);
 return {pendingLots,openOrders,error,refresh};
}
