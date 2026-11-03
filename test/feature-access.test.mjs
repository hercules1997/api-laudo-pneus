import test from 'node:test';
import assert from 'node:assert/strict';
import {accessFeatures,normalizeFeatureAccess,validateFeatureAccess,canUseFeature,canAccessDocument} from '../src/auth/featureAccess.mjs';
const consultant={id:'c',role:'consultor'};
test('Legacy accounts keep all modules and reader never gains write from feature grants',()=>{
 for(const feature of accessFeatures)assert(canUseFeature(consultant,feature.key));
 assert(canUseFeature(consultant,'propostas','write'));
 assert(!canUseFeature({...consultant,role:'leitor'},'propostas','write'));
 assert(!canUseFeature(null,'propostas'));
 assert(!canUseFeature({...consultant,active:false},'propostas'));
});
test('Explicit policy defaults omitted resources to denied and distinguishes view/write',()=>{
 const featureAccess=validateFeatureAccess({propostas:{view:true,write:false}});
 const user={...consultant,featureAccess};
 assert(canUseFeature(user,'propostas'));assert(!canUseFeature(user,'propostas','write'));
 assert(!canAccessDocument(user,{type:'laudo-completo'}));
 assert(!canAccessDocument(user,{tipo:'descarte'}));
 assert(canAccessDocument(user,{remote:{type:'proposta'}}));
 assert(canUseFeature({...user,role:'admin'},'laudoFoto','write'));
 assert(!canUseFeature(user,'inventado'));
});
test('Malformed grants cannot promote write, create unknown actions, or expand analysis',()=>{
 for(const policy of [null,[],{unknown:{view:true,write:true}},{propostas:{view:false,write:true}},{propostas:{view:'true',write:false}},{propostas:{view:true,write:false,approve:true}},{analiseSucata:{view:true,write:true}}])assert.throws(()=>validateFeatureAccess(policy),{status:400});
 assert.deepEqual(normalizeFeatureAccess(null).propostas,{view:false,write:false});
});
