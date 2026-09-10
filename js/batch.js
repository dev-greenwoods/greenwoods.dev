let requests = []; // [{id, customId, turns:[{role,content}]}]
function uid() { return Date.now() + Math.random(); }
function approxTok(s) { return Math.round((s||'').length/4); }

const modelSel    = document.getElementById('modelSel');
const maxTok      = document.getElementById('maxTok');
const tempIn      = document.getElementById('tempIn');
const systemPrompt= document.getElementById('systemPrompt');
const reqList     = document.getElementById('reqList');
const batchOutput = document.getElementById('batchOutput');
const batchStats  = document.getElementById('batchStats');
const batchMeta   = document.getElementById('batchMeta');

function addRequest(turns=[]) {
  const n = requests.length + 1;
  requests.push({ id: uid(), customId: `req-${String(n).padStart(3,'0')}`, turns: turns.length ? turns : [{role:'user',content:'',id:uid()}] });
  renderRequests(); render();
}

function removeRequest(id) { requests=requests.filter(r=>r.id!==id); renderRequests(); render(); }

function addTurn(reqId, role) {
  const r = requests.find(r=>r.id===reqId);
  if(r){r.turns.push({role,content:'',id:uid()}); renderRequests(); render();}
}

function removeTurn(reqId, turnId) {
  const r = requests.find(r=>r.id===reqId);
  if(r){r.turns=r.turns.filter(t=>t.id!==turnId); renderRequests(); render();}
}

function updateTurn(reqId, turnId, val) {
  const r=requests.find(r=>r.id===reqId); if(!r) return;
  const t=r.turns.find(t=>t.id===turnId); if(t){t.content=val; render();}
}

function updateCustomId(reqId, val) {
  const r=requests.find(r=>r.id===reqId); if(r){r.customId=val; render();}
}

function renderRequests() {
  if(!requests.length){
    reqList.innerHTML=`<div class="empty-state" style="min-height:80px;flex:0"><div class="empty-icon" style="font-size:1.2rem">📦</div><div>Add requests to build your batch file</div></div>`;
    return;
  }
  reqList.innerHTML='';
  requests.forEach((req,idx) => {
    const card=document.createElement('div'); card.className='req-card';
    card.innerHTML=`
      <div class="req-hd">
        <span class="req-id">
          <input type="text" value="${escHtml(req.customId)}" data-customid="${req.id}"
            style="background:transparent;border:none;outline:none;font-family:inherit;font-size:inherit;color:inherit;width:80px"/>
        </span>
        <button class="rm-btn" data-rm="${req.id}">remove</button>
      </div>
      <div class="req-body" id="rb-${req.id}">
        ${req.turns.map(t=>`
          <div class="req-turn">
            <span class="req-role ${t.role}">${t.role}</span>
            <textarea rows="2" data-exid="${req.id}" data-tid="${t.id}" placeholder="${t.role} message…">${escHtml(t.content)}</textarea>
            <button class="rm-btn" style="margin:7px 7px 0 0;align-self:flex-start" data-rmturn="${t.id}" data-rid="${req.id}">✕</button>
          </div>`).join('')}
      </div>
      <div class="req-add-turn">
        <button class="turn-btn user" data-role="user" data-rid="${req.id}">+ user</button>
        <button class="turn-btn assistant" data-role="assistant" data-rid="${req.id}">+ assistant</button>
      </div>`;
    reqList.appendChild(card);
    card.querySelector('[data-rm]').addEventListener('click',()=>removeRequest(req.id));
    card.querySelectorAll('[data-rmturn]').forEach(b=>b.addEventListener('click',()=>removeTurn(req.id,parseFloat(b.dataset.rmturn))));
    card.querySelectorAll('textarea[data-tid]').forEach(ta=>ta.addEventListener('input',()=>updateTurn(req.id,parseFloat(ta.dataset.tid),ta.value)));
    card.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>addTurn(req.id,b.dataset.role)));
    const cidIn=card.querySelector('[data-customid]'); cidIn.addEventListener('input',()=>updateCustomId(req.id,cidIn.value));
  });
}

function render() {
  const model = modelSel.value;
  const maxT  = parseInt(maxTok.value)||1024;
  const temp  = parseFloat(tempIn.value)||0.7;
  const sys   = systemPrompt.value.trim();

  const lines = requests.map(req => {
    const messages = [];
    if(sys) messages.push({role:'system',content:sys});
    req.turns.filter(t=>t.content.trim()).forEach(t=>messages.push({role:t.role,content:t.content}));
    if(!messages.length) return null;
    return JSON.stringify({
      custom_id: req.customId,
      method: 'POST',
      url: '/v1/chat/completions',
      body: { model, messages, max_tokens: maxT, temperature: temp }
    });
  }).filter(Boolean);

  batchOutput.textContent = lines.join('\n') || '// requests will appear here';

  const totalTok = requests.reduce((s,r)=>s+r.turns.reduce((ss,t)=>ss+approxTok(t.content),0),0) + (sys ? approxTok(sys)*requests.length : 0);
  batchStats.textContent = `${requests.length} request${requests.length!==1?'s':''} · ~${totalTok.toLocaleString()} tokens`;
  batchMeta.textContent = lines.length ? `${lines.length} line${lines.length!==1?'s':''} ready for Batch API` : '';
}

function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

document.getElementById('btnAddReq').addEventListener('click',()=>addRequest());
[modelSel,maxTok,tempIn,systemPrompt].forEach(el=>el.addEventListener('input',render));
document.getElementById('btnCopy').addEventListener('click',function(){
  navigator.clipboard.writeText(batchOutput.textContent);
  this.textContent='copied!'; setTimeout(()=>this.textContent='copy',1500);
});
document.getElementById('btnDownload').addEventListener('click',()=>{
  const blob=new Blob([batchOutput.textContent],{type:'application/jsonl'});
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:'batch_requests.jsonl'});
  a.click();
});

document.getElementById('btnSample').addEventListener('click',()=>{
  systemPrompt.value='Classify the sentiment of the given text as positive, negative, or neutral. Reply with one word only.';
  requests=[];
  addRequest([{role:'user',content:'I absolutely love this product! Best purchase I\'ve made all year.',id:uid()}]);
  addRequest([{role:'user',content:'The delivery was late and the packaging was damaged.',id:uid()}]);
  addRequest([{role:'user',content:'It works as described. Nothing special, nothing bad.',id:uid()}]);
  addRequest([{role:'user',content:'Incredible quality, would highly recommend to everyone!',id:uid()}]);
  addRequest([{role:'user',content:'Very disappointed. Expected much better for the price.',id:uid()}]);
});

renderRequests(); render();
