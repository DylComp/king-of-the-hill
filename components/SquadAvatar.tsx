"use client";
import {useState} from 'react';
export default function SquadAvatar({src,name,size=44}:{src:string|null;name:string;size?:number}){const [failed,setFailed]=useState(false);return <span className="squad-avatar" style={{width:size,height:size}}>{src&&!failed?<img src={src} alt={`${name} profile`} width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<span aria-label={`${name}: no image`}>{name.slice(0,2).toUpperCase()}</span>}</span>;}
