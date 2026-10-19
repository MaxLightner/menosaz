/** Crop geometry for a square product photograph. Values are expressed in output pixels. */
export type ImageCrop={sourceWidth:number;sourceHeight:number;zoom:number;panX:number;panY:number;size?:number};
export function clampUnit(v:number){return Math.min(1,Math.max(-1,Number.isFinite(v)?v:0));}
export function cropGeometry({sourceWidth,sourceHeight,zoom,panX,panY,size=512}:ImageCrop){
 if(sourceWidth<=0||sourceHeight<=0||size<=0)throw Error('ابعاد عکس نامعتبر است.');
 const factor=Math.max(size/sourceWidth,size/sourceHeight)*Math.max(1,Math.min(4,zoom));
 const width=sourceWidth*factor,height=sourceHeight*factor;
 const maxX=Math.max(0,(width-size)/2),maxY=Math.max(0,(height-size)/2);
 return {x:(size-width)/2+maxX*clampUnit(panX),y:(size-height)/2+maxY*clampUnit(panY),width,height,maxX,maxY,size};
}
export function isSameImageChoice(oldUrl:string,newUrl:string){
 return oldUrl===newUrl;
}
