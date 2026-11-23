import {createContext,useContext} from "react";
import type {CloudRecord,CloudSession} from "../game/cloudSession";
import type {LevelId} from "../game/types";
export const CloudContext=createContext<{records:CloudRecord[];loading:boolean;error:string;refresh:()=>void;begin:(level:LevelId)=>Promise<CloudSession>;markClear:(level:LevelId)=>void}>({records:[],loading:false,error:"",refresh:()=>{},begin:async()=>{throw Error("Sign in to save progress");},markClear:()=>{}});
export const useCloudProgress=()=>useContext(CloudContext);
