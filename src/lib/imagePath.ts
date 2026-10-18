// Database paths for bundled images stay independent of the deployment subdirectory.
export function catalogImagePath(url:string,base=import.meta.env?.BASE_URL||'/'){
 const prefix=base.replace(/\/$/,'');
 let path=url;
 if(prefix&&path.startsWith(prefix+'/'))path=path.slice(prefix.length);
 path=path.replace(/^\/menosaz\/(?=(?:media|menu-assets)\/)/,'/');
 return /^\/(?:media|menu-assets)\//.test(path)?path:url;
}
export function displayImagePath(url:string,base=import.meta.env?.BASE_URL||'/'){
 const path=catalogImagePath(url,base);
 return /^\/(?:media|menu-assets)\//.test(path)?base.replace(/\/?$/,'/')+path.slice(1):url;
}
