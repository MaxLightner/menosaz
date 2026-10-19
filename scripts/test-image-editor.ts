import assert from 'node:assert/strict';
import {clampUnit,cropGeometry} from '../src/lib/imageCrop';
import {readFileSync} from 'node:fs';
let tests=0;
assert.equal(clampUnit(-2),-1);assert.equal(clampUnit(2),1);assert.equal(clampUnit(Number.NaN),0);tests++;
let g=cropGeometry({sourceWidth:512,sourceHeight:512,zoom:1,panX:0,panY:0});
assert.deepEqual({x:g.x,y:g.y,width:g.width,height:g.height},{x:0,y:0,width:512,height:512});tests++;
g=cropGeometry({sourceWidth:1600,sourceHeight:900,zoom:1,panX:0,panY:0});
assert.equal(g.height,512);assert.equal(g.x,(512-g.width)/2);assert.equal(g.y,0);tests++;
const atLeft=cropGeometry({sourceWidth:1600,sourceHeight:900,zoom:1,panX:1,panY:0});
const atRight=cropGeometry({sourceWidth:1600,sourceHeight:900,zoom:1,panX:-1,panY:0});
assert.equal(atLeft.x,0);assert.equal(atRight.x,512-atRight.width);tests++;
const gZoom=cropGeometry({sourceWidth:512,sourceHeight:512,zoom:2,panX:1,panY:-1});
assert.equal(gZoom.width,1024);assert.equal(gZoom.x,0);assert.equal(gZoom.y,-512);tests++;
for(const bad of [{sourceWidth:0,sourceHeight:400},{sourceWidth:400,sourceHeight:0}]){
 assert.throws(()=>cropGeometry({...bad,zoom:1,panX:0,panY:0}));tests++;
}
const mobile=readFileSync('src/components/dashboard/MobileDashboard.tsx','utf8');
const desktop=readFileSync('src/components/dashboard/DesktopDashboard.tsx','utf8');
assert(mobile.includes('<ProductPhotoButton')&&desktop.includes('<ProductPhotoButton'));tests++;
assert(!mobile.includes('manager-photo-edit')&&!desktop.includes('manager-photo-edit'));tests++;
assert(mobile.includes('mizato-mobile-product-footer')&&mobile.includes('mizato-mobile-product-head'));tests++;
const server=readFileSync('supabase/functions/menu-api/index.ts','utf8');
assert(server.includes("path==='/product-gallery'&&req.method==='GET'"));
assert(server.includes(".eq('business_id',bid).eq('purpose','product').eq('custom',true)"));tests++;
const modal=readFileSync('src/components/modals/EditProductImage.tsx','utf8');
for(const required of ["'restaurant'","'shared'","'device'","exportCrop()","cropGeometry(","onPointerMove={movePointer}"])assert(modal.includes(required));tests++;
console.log(`PASS: ${tests} photo crop, UI layout, tenant gallery and upload regression checks`);
