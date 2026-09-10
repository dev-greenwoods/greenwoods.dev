const input=document.getElementById('cases'), mode=document.getElementById('mode'), summary=document.getElementById('summary'), results=document.getElementById('results'), errors=document.getElementById('errors');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function score(item,strategy){
  const actual=item.actual??item.output??'', expected=item.expected??'';
  if(strategy==='json'){try{JSON.parse(actual);return true}catch{return false}}
  const a=typeof actual==='string'?actual:JSON.stringify(actual), e=typeof expected==='string'?expected:JSON.stringify(expected);
  if(strategy==='contains')return a.includes(e); if(strategy==='regex'){try{return new RegExp(e).test(a)}catch{return false}} return a===e;
}
function run(){
  const lines=input.value.split(/\r?\n/).map((x,i)=>({x,i})).filter(o=>o.x.trim());
  const good=[], bad=[];
  lines.forEach(({x,i})=>{try{const obj=JSON.parse(x); const pass=score(obj,mode.value); good.push({obj,pass,n:i+1})}catch(e){bad.push(`Line ${i+1}: ${e.message}`)}});
  errors.innerHTML=bad.length?bad.map(esc).join('<br>'):'';
  if(!good.length){summary.className='summary empty';summary.textContent=bad.length?'No valid cases found.':'Run a case set to see scores.';results.innerHTML='<div class="empty-state"><div class="empty-icon">✓</div><div>Results will appear here</div></div>';return}
  const passed=good.filter(x=>x.pass).length; summary.className='summary'; summary.innerHTML=`<div class="metric"><strong>${passed}/${good.length}</strong><span>passed</span></div><div class="metric"><strong>${Math.round(passed/good.length*100)}%</strong><span>accuracy</span></div><div class="metric"><strong>${good.length}</strong><span>valid cases</span></div>`;
  results.innerHTML=good.map(({obj,pass,n})=>`<div class="case"><div class="case-head"><span>case ${n}</span><strong class="${pass?'case-pass':'case-fail'}">${pass?'PASS':'FAIL'}</strong></div><div class="case-detail"><b>expected:</b> ${esc(typeof obj.expected==='string'?obj.expected:JSON.stringify(obj.expected))}<br><b>actual:</b> ${esc(typeof (obj.actual??obj.output)==='string'?(obj.actual??obj.output):JSON.stringify(obj.actual??obj.output))}</div></div>`).join('');
}
input.addEventListener('input',run);mode.addEventListener('change',run);
document.getElementById('clear').onclick=()=>{input.value='';run()}; document.getElementById('sample').onclick=()=>{input.value='{"input":"2 + 2","expected":"4","actual":"4"}\n{"input":"capital of France","expected":"Paris","actual":"Paris is the capital of France"}\n{"input":"JSON","expected":"object","actual":"not json"}';mode.value='exact';run()};
document.getElementById('copy').onclick=()=>navigator.clipboard.writeText(results.innerText).then(()=>{document.getElementById('copy').textContent='copied!';setTimeout(()=>document.getElementById('copy').textContent='copy report',1200)});
run();
