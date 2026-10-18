import React from 'react';
import {AllQRAccessModal} from './AllQRAccessModal';
export function TableQRModal({isOpen,onClose,initialTable}:{isOpen:boolean;onClose:()=>void;initialTable?:number}){return <AllQRAccessModal isOpen={isOpen} onClose={onClose} initialTable={initialTable}/>;}
