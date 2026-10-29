import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://localhost:3000';
for(const path of ['/','/shop','/contribute','/impact','/legacy','/how-orders-work','/login','/manifest.webmanifest','/sw.js','/icons/icon-512.png']){const r=await fetch(base+path);assert.equal(r.status,200,path);console.log('PASS route',path);}
const login=await(await fetch(base+'/login')).text();
const form=[...login.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m=>m[1]).find(s=>s.includes('name="password"'));assert.ok(form,'Password login form exists');
const decode=s=>s.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>');
const payload=new FormData();for(const match of form.matchAll(/<input\b[^>]*>/g)){const name=match[0].match(/name="([^"]+)"/)?.[1];const value=match[0].match(/value="([^"]*)"/)?.[1]??'';if(name?.startsWith('$ACTION'))payload.append(decode(name),decode(value));}
const credentials=await readFile('output/admin-credentials.txt','utf8');const email=credentials.match(/^Email: (.+)$/m)?.[1];const password=credentials.match(/^Temporary password: (.+)$/m)?.[1];assert.ok(email&&password);payload.set('email',email);payload.set('password',password);
const result=await fetch(base+'/login',{method:'POST',headers:{Origin:base},body:payload,redirect:'manual'});
const cookie=result.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');assert.ok(cookie.includes('jg_session='),'Successful sign-in must create an HTTP-only session');
try{const dashboard=await(await fetch(base+'/dashboard',{headers:{Cookie:cookie}})).text();assert.ok(dashboard.includes('Platform')&&dashboard.includes('Your partner overview')||dashboard.includes('YOUR PARTNER OVERVIEW'),'Authenticated dashboard rendered');const admin=await(await fetch(base+'/admin',{headers:{Cookie:cookie},redirect:'manual'})).text();assert.ok(admin.includes('/dashboard/security'),'Staff must complete MFA before admin access');console.log('PASS authenticated dashboard and required MFA before admin access.');}finally{const logout=await fetch(base+'/api/auth/signout',{method:'POST',headers:{Cookie:cookie,Origin:base}});assert.equal(logout.status,200);console.log('Signed out the test session.');}
