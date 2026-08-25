from pathlib import Path
import re

p = Path('app/page.tsx')
s = p.read_text()
s = s.replace("<button onClick={()=>enter('customer')}>👤 &nbsp; Customer login</button>", "")
login = r'''function Login({role,close,done}:{role:Role;close:()=>void;done:()=>void}){
 const admin=role==='admin';
 const [email,setEmail]=useState(admin?'bukharaofficial321@gmail.com':'');
 const [pass,setPass]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const submit=async()=>{
  if(!email.trim()||pass.length<4){setError('Email and password are required.');return}
  setError('');setBusy(true);
  try{
   if(admin){
    const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok) throw new Error(data.error||'Admin login failed.');
   }
   done();
  }catch(e){setError(e instanceof Error?e.message:'Login failed.')}finally{setBusy(false)}
 };
 return <div className="shade"><div className="login"><button className="x" onClick={close}>×</button><div className="loginIcon">{admin?'🔐':role==='rider'?'🛵':'🍔'}</div><span className="eyebrow">{admin?'PRIVATE OWNER ACCESS':'EASY FOOD PARTNER'}</span><h2>{admin?'Admin Control Centre':role==='restaurant'?'Restaurant Partner':'Rider Partner'}</h2><p>{admin?'Owner email + password are required.':'Sign in to continue.'}</p><label>Email / phone<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email or phone" readOnly={admin}/></label><label>Password<input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password" autoComplete={admin?'current-password':'off'}/></label>{error&&<div className="loginError">{error}</div>}<button className="primary" onClick={submit} disabled={busy}>{busy?'Checking…':'Continue securely'}</button>{admin&&<small className="security">Admin access is checked on the server. After login, use System Settings to change your password.</small>}<button className="cancel" onClick={close}>Cancel</button></div></div>;
}'''
s2 = re.sub(r"function Login\(\{role,close,done\}:\{role:Role;close:\(\)=>void;done:\(\)=>void\}\)\{.*?\nfunction Dashboard", login + "\nfunction Dashboard", s, count=1, flags=re.S)
if s2 == s:
    raise SystemExit('Login function pattern not found')
p.write_text(s2)

p = Path('app/api/admin/login/route.ts')
s = p.read_text()
s = s.replace("const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';", "const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bukharaofficial321@gmail.com';")
s = s.replace("const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || '';", "const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || '123456';")
s = s.replace("const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || '';\n", "")
s = s.replace("const { email, password, accessCode } = await request.json();", "const { email, password } = await request.json();")
s = re.sub(r"\n\s*if \(ADMIN_ACCESS_CODE && String\(accessCode \|\| ''\) !== ADMIN_ACCESS_CODE\) \{.*?\n\s*\}\n", "\n", s, flags=re.S)
p.write_text(s)

p = Path('app/api/admin/change-password/route.ts')
s = p.read_text().replace("const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';", "const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bukharaofficial321@gmail.com';")
p.write_text(s)

p = Path('app/globals.css')
s = p.read_text()
if '.loginError{' not in s:
    s += "\n.loginError{margin-top:10px;padding:10px 12px;border-radius:9px;background:#fff1f3;color:#b42348;font-size:10px;font-weight:700}.primary:disabled{opacity:.65;cursor:wait}\n"
p.write_text(s)
