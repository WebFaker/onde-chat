"""Run explicitly against a deployment; creates two QA accounts and one QA channel.
No credentials, cookies or sessions are printed or written to disk.
"""
import urllib.request,urllib.error,http.cookiejar,json,secrets,time,os
base=os.environ.get('ONDE_TEST_URL','https://onde-chat.vercel.app').rstrip('/')
run=str(int(time.time()))[-8:]
checks=[]
def client():
 jar=http.cookiejar.CookieJar();return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar)),jar
def request(c,path,data=None,origin=None):
 req=urllib.request.Request(base+'/api/'+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json','Origin':origin or base})
 try:r=c.open(req,timeout=30)
 except urllib.error.HTTPError as e:r=e
 raw=r.read().decode()
 try:body=json.loads(raw)
 except:raise AssertionError(f'{path}: HTTP {r.code}, non-JSON: {raw[:160]}')
 return r.code,body
def expect(label,value):
 if not value:raise AssertionError(label)
 checks.append(label);print('PASS '+label,flush=True)
a,ja=client();b,jb=client();anon,_=client();pw=secrets.token_urlsafe(28)
expect('Anonymous messages rejected',request(anon,'messages?channel=1')[0]==401)
users=[]
for suffix,c in [('A',a),('B',b)]:
 user={'name':'QA_'+run+suffix,'email':'onde-qa-'+run+suffix.lower()+'@example.com','password':pw}
 code,body=request(c,'auth/sign-up/email',user)
 expect('Signup '+suffix,code==200)
 code,me=request(c,'me');expect('Session '+suffix,code==200 and me['name']==user['name']);user['id']=me['id'];users.append(user)
expect('Secure HttpOnly session cookie',any(cookie.secure and cookie.has_nonstandard_attr('HttpOnly') for cookie in ja))
expect('Existing e-mail rejected',request(anon,'auth/sign-up/email',{k:v for k,v in users[0].items() if k!='id'})[0]>=400)
code,body=request(anon,'auth/sign-in/email',{'email':users[0]['email'],'password':'wrong-password-123'})
expect('Wrong password rejected',code==401)
expect('Invalid e-mail rejected',request(anon,'auth/sign-in/email',{'email':'not-an-email','password':pw})[0]==400)
expect('Invalid signup name rejected',request(anon,'auth/sign-up/email',{'name':'bad name !','email':'invalid-name-'+run+'@example.com','password':pw})[0]>=400)
channel='qa-'+run
expect('Create QA channel',request(a,'channels',{'name':channel})[0]==201)
code,channels=request(b,'channels');cid=next(c['id'] for c in channels if c['name']==channel)
expect('Other account sees channel',code==200)
expect('Duplicate channel rejected',request(a,'channels',{'name':channel})[0]==409)
expect('Empty message rejected',request(a,'messages?channel='+str(cid),{'text':' '})[0]==400)
expect('Oversized message rejected',request(a,'messages?channel='+str(cid),{'text':'x'*2001})[0]==400)
expect('Foreign origin rejected',request(a,'messages?channel='+str(cid),{'text':'blocked'},origin='https://evil.example')[0]==403)
text='Validation automatique du chat — caractères : é, 漢字, <script>texte</script>'
expect('Send message',request(a,'messages?channel='+str(cid),{'text':text,'user_id':users[1]['id']})[0]==201)
code,msgs=request(b,'messages?channel='+str(cid))
expect('Other account receives exact text',code==200 and msgs[-1]['body']==text)
expect('Author cannot be forged',msgs[-1]['user_id']==users[0]['id'] and msgs[-1]['name']==users[0]['name'])
expect('Reply',request(b,'messages?channel='+str(cid),{'text':'Réponse du second compte de validation.'})[0]==201)
expect('Conversation persists',len(request(a,'messages?channel='+str(cid))[1])==2)
expect('Logout',request(a,'auth/sign-out',{})[0]==200)
expect('Session revoked',request(a,'me')[0]==401)
expect('Messages inaccessible after logout',request(a,'messages?channel='+str(cid))[0]==401)
expect('Login again',request(a,'auth/sign-in/email',{'email':users[0]['email'],'password':pw})[0]==200)
expect('Stable profile after login',request(a,'me')[1]['id']==users[0]['id'])
expect('Messages persist after login',len(request(a,'messages?channel='+str(cid))[1])==2)
for c in [a,b]:request(c,'auth/sign-out',{})
print(json.dumps({'checks':len(checks),'qa_channel':channel,'qa_accounts':[u['name'] for u in users]},ensure_ascii=False))
